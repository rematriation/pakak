# **Amazon Web Services**

Documenting AWS configuration information and other important details.

## **1\. Broader Design Rationale**

The architecture is designed as a serverless, event-driven system to process a high volume of incoming SMS/MMS messages from users via Twilio. The primary goal is to create a system that is scalable, resilient, secure, and cost-effective, leveraging managed AWS services to minimize operational overhead.

* **Event-Driven & Decoupled:** The system is fundamentally asynchronous. An API Gateway endpoint ingests messages, which are then placed into an SQS queue. This decouples the initial message intake from the core processing logic, allowing the system to absorb sudden spikes in traffic without failing. Downstream services (Lambda functions) process messages from the queue at their own pace.  
* **Scalability and Elasticity:** By using AWS Lambda, SQS, and DynamoDB, the architecture can automatically scale based on the incoming message volume. Lambda functions will scale their concurrent executions, and SQS/DynamoDB can handle virtually any throughput, ensuring the application remains responsive under heavy load without manual intervention.  
* **Security by Design:** The design incorporates security at multiple layers.  
  * **Network Isolation:** All Lambda functions operate within a private VPC, meaning they are not directly accessible from the public internet. Outbound traffic is routed through a NAT Gateway, providing a stable egress IP that can be whitelisted by external services like MongoDB Atlas.  
  * **Initial Validation:** The "Firewall" Lambda acts as a gatekeeper, performing critical initial validation like signature verification and rate limiting.  
  * **Malware Scanning:** Media files are processed in an isolated "raw" bucket before being scanned for malware using a ClamAV layer in the scanner Lambda. Files are then moved to a "clean" or "quarantine" location, preventing malicious content from propagating through the system.  
* **Resilience and Fault Tolerance:** The use of SQS queues with Dead-Letter Queues (DLQs) ensures that messages are not lost if a processing function fails. Failed messages are automatically moved to a DLQ for later inspection and reprocessing, which prevents a single bad message from halting the entire pipeline. The scanner function is also configured with an onError destination to handle specific scanning failures.

## **Why use AWS?**

* **Cost-Effectiveness (Pay-Per-Use):** The serverless model is extremely cost-efficient for this workload. We only pay for the compute time we consume, the number of messages in SQS, and the data stored in DynamoDB/S3. There are no costs for idle resources, which is a significant advantage over provisioned servers.  
* **Managed Services & Reduced Operational Overhead:** AWS manages the underlying infrastructure for Lambda, API Gateway, SQS, S3, DynamoDB, and the VPC components. This eliminates the need for server patching, OS maintenance, and other traditional operational tasks, allowing the development team to focus on application logic.  
* **High Availability and Durability:** AWS services are designed for high availability and are deployed across multiple Availability Zones (AZs) by default. This provides built-in fault tolerance. S3, in particular, offers industry-leading durability for stored media files.

## DynamoDB Data Model
### `PakakUsers` Table
This table stores user-specific information, including their subscription status, rate-limiting data, and processing locks. It is designed for fast, key-value lookups, which is essential for the synchronous checks performed by the `firewall` Lambda. The partition key is the user's phone number in E.164 format. A Global Secondary Index on the `awaitingDeletion` attribute allows the `cleaner` Lambda to efficiently find and process users flagged for deletion.

| Attribute                  | Type    | Description                                                                 |
| -------------------------- | ------- | --------------------------------------------------------------------------- |
| `phone` (Partition Key)    | String  | The user's phone number in E.164 format (e.g., "+15551234567").              |
| `subscriptionStatus`       | Boolean | User's opt-in status. `true` for subscribed, `false` for opted-out (STOP).    |
| `isProcessingMessage`      | Number  | A timestamp lock to prevent concurrent message processing for the same user.  |
| `rateLimitCounter`         | Number  | The number of messages the user has sent within the current time window.      |
| `rateLimitWindowExpiresAt` | String  | An ISO 8601 timestamp indicating when the current rate-limit window expires.  |
| `awaitingDeletion`         | Number  | A flag (0 or 1) used by the `cleaner` Lambda to identify users for data purge. |
| `createdAt`                | String  | An ISO 8601 timestamp for when the user record was created.                 |
| `updatedAt`                | String  | An ISO 8601 timestamp for when the user record was last updated.              |

## **AWS Setup Procedure \- Serverless**

The entire infrastructure is defined as code using the Serverless Framework, which translates the serverless.yml configuration into an AWS CloudFormation stack.

### **1\. Core Infrastructure Deployment**

This phase provisions the foundational AWS resources. The deployment is executed by running: 
```npx serverless deploy --stage <your_stage_name>```

The procedure is as follows:

1. **Install and Configure Serverless Framework:** Ensure you have the Serverless Framework CLI installed and configured with AWS credentials that have permissions to create the necessary resources.  
2. **Deploy the Stack:** Navigate to the project root directory and execute 
"npx serverless deploy \--stage \<your\_stage\_name\>." This command will automatically provision the following resources as defined in serverless.yml:  
   * **VPC and Networking:** A complete virtual private cloud is created for network isolation, including:  
     * A VPC with public and private subnets across two Availability Zones.  
     * An Internet Gateway for public subnet access and a NAT Gateway with an Elastic IP to provide stable outbound internet access for resources in the private subnets.  
     * Route tables to manage traffic flow.  
     * A LambdaSecurityGroup that allows all outbound traffic from the Lambda functions.  
   * **IAM Roles:** An execution role for all Lambda functions, granting specific permissions to interact with the VPC, DynamoDB, SQS, S3, and SSM.  
   * **DynamoDB Table:** The PakakUsers table is created with a phone hash key and a Global Secondary Index for querying users pending deletion. The billing mode is set to PAY\_PER\_REQUEST.  
   * **S3 Buckets:** Four S3 buckets are created: pakak-raw, pakak-clean, pakak-quarantine, and a pakak-static-assets bucket for public-facing assets.  
   * **SQS Queues:** Three primary queues and their corresponding Dead-Letter Queues (DLQs) are provisioned:  
     * pakak-incoming.fifo & pakak-incoming-dlq.fifo: For messages awaiting processing.  
     * pakak-outgoing.fifo & pakak-outgoing-dlq.fifo: For bot replies awaiting delivery.  
     * pakak-scanner-dlq: A standard DLQ for the scanner Lambda's onError destination.

### **2\. Lambda Function and API Gateway Deployment**

The same serverless deploy command also deploys the application code and connects the triggers.

1. **Lambda Functions:** The framework packages the Node.js code and deploys five Lambda functions, all configured to run within the private subnets of the VPC:  
   * firewall: Triggered by an HTTP event from API Gateway.  
   * worker: Triggered by messages on the IncomingQueue.  
   * scanner: An arm64 function triggered by S3 object creation in the raw bucket. It includes a Lambda Layer for the ClamAV virus scanner and sends failures to the ScannerDLQ.  
   * dispatcher: Triggered by messages on the OutgoingQueue, with a maximum concurrency of 4 to manage the outbound message rate.  
   * cleaner: Triggered by a daily cron(0 12 \* \* ? \*) schedule via EventBridge.  
2. **API Gateway Endpoint:** An API Gateway REST API is created with a /webhook endpoint (GET and POST) that routes to the firewall Lambda.  
3. **Output API URL:** After a successful deployment, the Serverless Framework will output the invoke URL for the API Gateway endpoint.

### **3\. External Service Configuration (Twilio & SSM)**

Final configuration steps involve connecting the deployed AWS infrastructure to external services.

1. **Configure Twilio Webhook:**  
   * Copy the API Gateway URL from the serverless deploy output.  
   * In your Twilio account, navigate to your phone number's messaging settings.  
   * Paste the API Gateway URL into the "A MESSAGE COMES IN" webhook field and set the method to HTTP POST.  
2. **Populate SSM Parameter Store:** The application's secrets are stored securely in AWS Systems Manager (SSM) Parameter Store.  
   * Navigate to the SSM Parameter Store in the AWS Console.  
   * Create the following SecureString parameters for each stage (e.g., /pakak/dev/TWILIO\_TOKEN):  
     * MONGODB\_URI  
     * TWILIO\_NUMBER  
     * TWILIO\_ACCOUNT\_SID  
     * TWILIO\_TOKEN  
     * ADMIN\_PHONE  
     * TTL\_FOR\_PROCESSING\_LOCK  
     * MAX\_MESSAGES\_PER\_WINDOW  
     * RATE\_LIMIT\_WINDOW\_SECONDS
3. **Upload Static Assets:** The application relies on an image asset being present in the static S3 bucket.

   * Navigate to the S3 service in the AWS Console.
   * Locate the bucket named `pakak-<your_stage_name>-static-assets`.
   * Upload the `Inupiat_Ilitqusiat_Values.jpg` image to the root of this bucket. The bucket policy is configured for public read access, so no additional steps are needed to make it visible.

Once these steps are complete, the application is fully deployed. Incoming messages will trigger the entire workflow within the secure VPC environment.