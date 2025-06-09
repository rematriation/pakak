# Nalukataq Design Stack Rationale

## Architecture and Message Flow

This document outlines the architecture and operational flow of the REMA messaging bot, detailing how user interactions are processed from message receipt to reply delivery, following the numbered steps in the provided architecture diagram.

![App architecture for the Nalukataq application.](./assets/images/app-architecture.png)

- Link to [Lucid Chart](https://lucid.app/lucidchart/19a2e694-94d3-413a-99d1-5037f1897103/edit?viewport_loc=-1878%2C-876%2C3326%2C1948%2C0_0&invitationId=inv_b8e0add7-bfe7-46a1-9808-01649569c164) version.

### Main Bot Flow (Steps 1-20 from Diagram)

1. **User Sends Message:**
    * A user sends an image or text message (SMS/MMS) from their device (1) to the designated Twilio number.
2. **Carrier Transmits to Twilio:**
    * The user's mobile carrier network transmits the message, which is received by Twilio (2).
3. **Twilio Webhook to API Gateway:**
    * Twilio forwards the incoming message as an HTTP POST request to a pre-configured AWS API Gateway endpoint (3). This endpoint serves as the secure entry point to the application's backend.
4. **API Gateway Triggers "Firewall" Lambda:**
    * The API Gateway (3) immediately invokes the "Firewall" Lambda function (4). This lightweight function acts as the first line of processing and defense.
5. **Firewall Lambda: Initial Processing & Checks (Corresponds to actions by Firewall Lambda (4) interacting with DynamoDB User Table)**
    * The Firewall Lambda (4) performs several critical tasks:
    * **Twilio Signature Verification:** Cryptographically verifies the signature of the incoming request to ensure it originated from Twilio.
    * **User Validation & DynamoDB Interaction:** Queries the **DynamoDB "User" table** (icon shown connected to Firewall Lambda) to:
    * Check if the user exists.
    * Retrieve user details.
    * Update user information such as subscription status and rate limit counters. Geolocation data may also be updated if needed.
    * **Text Content Scanning:** Scans the text content of the message for any malicious patterns or keywords.
    * **Rate Limit Enforcement:** Checks if the user has exceeded their message rate limits (details in "Rate Limiting Logic" section below).
6. **Firewall Lambda: Control Command Handling & Message Routing**
    * **(Implicit path from Firewall Lambda for synchronous replies \- aligns with original text 7.a):**
    * Handles control commands like START, STOP, or DELETE synchronously.
    * Responds instantly with appropriate TwiML (Twilio Markup Language) for these commands.
    * If malicious content is detected or rate limits are exceeded, it blocks the message and may send a warning reply via TwiML.
    * **(7.b in diagram) For Normal Content, Enqueue to Incoming SQS:** If the message is legitimate, not a control command, and passes all checks, the Firewall Lambda (4) drops a message onto the **Incoming FIFO SQS (Simple Queue Service) queue (7.b)**.
    * **Why FIFO?** This ensures messages from a specific user are processed in the order they are received, maintaining conversation context.
7. **Worker Lambdas Process Messages (8)**
    * Multiple "Worker" Lambda functions (8) concurrently pull messages from the Incoming FIFO SQS queue (7.b). This distributed approach allows for scalable message handling.
8. **Worker Lambda: Core Logic & Data Handling (Involves 9.a and 9.b)**
    * For each message, a Worker Lambda (8) performs the following:
    * **(Interaction with 9.b) Media Handling:** If an image/audio is attached, it downloads the media and stores it in the **S3 "Raw Media Storage" bucket (9.b)**.
    * **(Interaction with 9.a) Data Logging:** Writes the text content of the message, along with metadata (including a reference to the S3 location of any media), into **MongoDB Atlas, the "Data Store \- Text & Metadata" (9.a)**. MongoDB is used for its flexible schema and rich querying capabilities.
    * **Bot Logic Execution:** Determines the appropriate response the bot should say based on the message content and conversation history.
9. **Worker Lambda Enqueues Reply (10)**
    * The Worker Lambda (8) places the generated reply message onto the **Outgoing FIFO SQS queue (10)**.
    * **Why FIFO?** Ensures replies are sent in the order generated, crucial for conversational integrity and paced delivery.
10. **File Upload to Raw Bucket Triggers Scanner (Interaction between 9.b and 11\)**
    * When a file is uploaded by the Worker Lambda to the **S3 "Raw Media Storage" bucket (9.b)**, this event triggers the **Scanner Lambda (11)**.
11. **Scanner Lambda: Media File Scanning & Disposition (12.a, 12.b)**
    * The Scanner Lambda (11) scans the newly uploaded file from the raw bucket for viruses or other malicious content.
    * **(12.a) Clean File:** If the file is clean, it's moved to the **S3 "Clean Media Bucket" (12.a)**.
    * **(12.b) Infected/Quarantined File:** If the file is malicious or suspicious, it's moved to the **S3 "Quarantine Bucket" (12.b)**. (Manual checks are needed for this bucket).
12. **Scanner Lambda Updates Metadata in MongoDB (13)**
    * The Scanner Lambda (11) updates the metadata record for the image/file in **MongoDB Atlas (9.a via path labeled 13\)** with the scan status (e.g., "clean," "quarantined") and its final storage location (Clean or Quarantine bucket).
13. **Scanner Lambda Enqueues User Notification (14)**
    * If necessary (e.g., file was quarantined), the Scanner Lambda (11) enqueues an appropriate notification message for the user onto the **Outgoing FIFO SQS queue (10 via path labeled 14\)**. This message might inform the user about the problematic file and suggest resubmission.
14. **Dispatcher Lambda Pulls from Outgoing Queue (15)**
    * The "Dispatcher" Lambda function (15) polls the Outgoing FIFO SQS queue (10), retrieving messages to be sent. This Lambda typically has controlled concurrency to manage the outgoing message rate.
15. **Dispatcher Sends Message via Twilio (16)**
    * The Dispatcher Lambda (15) makes a REST API call to **Twilio (via path labeled 16\)** to send the message (either a bot reply or a scanner notification). It adheres to a fixed Messages Per Second (MPS) rate.
16. **Twilio Delivers the Reply (17)**
    * **Twilio (17)** queues the SMS/MMS and hands it off to the respective carrier networks for delivery to the user's device.
17. **Message Delivery and Acknowledgment (18.1, 18.2)**
    * **(18.1) Carrier Transmits to User:** The carrier network delivers the message to the **user's device (18.1)**.
    * **(18.2) Carrier Sends Acknowledgement to Twilio:** The user's carrier sends a delivery acknowledgment (ACK) or status update back to **Twilio (18.2)**.
18. **Dispatcher Receives Delivery Acknowledgment (19)**
    * Twilio forwards this delivery status update (e.g., "delivered," "failed") to the **Dispatcher Lambda (15 via path labeled 19\)**, typically through a status callback webhook.
19. **Dispatcher Closes Request/Response Loop (20)**
    * Upon receiving successful delivery confirmation from Twilio (19), the **Dispatcher Lambda (15)** closes the request/response loop for that specific interaction (action labeled 20). This signifies the end of that message cycle and allows users to send new messages without out-of-order conflicts for the completed interaction. This does not apply to system-initiated messages like reminders.

### **Additional System Components & Logic**

#### **Rate Limiting Logic**

To prevent abuse and ensure fair usage:

* **Counter:** A rateLimitCounter is maintained per phone number in the DynamoDB "User" table.
* **Increment:** Incremented for every inbound message by the Firewall Lambda.
* **TTL (Time-To-Live):** 60-minute TTL. If a user sends no messages for 60 minutes, their counter expires.
* **Threshold:** If the rateLimitCounter exceeds N (e.g., 30 messages/60 min), the Firewall Lambda replies "slow down" via TwiML and drops the message.

#### **Automated Cron Jobs & Reminder System**

* **Cleaner Crons (User Data Deletion):**
* **Schedule:** Runs daily at 12:00 AM UTC.
* **Process:**
    1. An AWS EventBridge Scheduler triggers a Lambda function.
    2. This Lambda queries the DynamoDB "User" table (and potentially S3 for opt-out requests or logs) for users who have opted out and requested data deletion.
    3. The Lambda proceeds to remove their data from DynamoDB, MongoDB Atlas, and associated S3 files, adhering to data retention policies.
        * **Diagram Reference:** The smaller diagram shows S3, EventBridge, DynamoDB, a Lambda, and an SQS queue, which could represent parts of this cleanup or a related scheduled task.
        * **Reminder System:**
        * **Trigger:** If a user needs a follow-up or forgets to continue a prompt, a DynamoDB Stream on the "User" table (or a dedicated reminders table) can trigger an AWS EventBridge scheduled event.
        * **Action:** EventBridge adds a reminder message directly to the **Outgoing FIFO SQS queue (10)**.
        * **Dispatch:** The Dispatcher Lambda (15) picks up and sends this reminder.
        * **Loop Status:** The Dispatcher **does not** close the request/response loop (20) for these system-initiated reminder messages.

#### **Data Storage Strategy**

* **DynamoDB ("User" Table):** For fast, key-value lookups: user profiles, subscription flags, rate-limit counters. Essential for the Firewall Lambda's synchronous checks.
* **MongoDB Atlas ("Data Store \- Text & Metadata" \- 9.a):** Flexible document store for message content, conversation history, and media metadata (including scan status and S3 locations). Enables rich querying.
* **Amazon S3 (9.b "Raw Media Storage", 12.a "Clean Media Bucket", 12.b "Quarantine Bucket"):** Durable, scalable, and cost-effective storage for media files (images, audio), organized into raw, clean, and quarantine buckets based on scan results.

#### **Key Considerations and Notes**

* **MMS Internet Requirement:** Users need an active internet/data connection for MMS.
* **SMS MPS:** Toll-free numbers have MPS limits (e.g., 3 MPS, increasable via Twilio). The Dispatcher (15) respects these.
* **Latency Message:** An initial message will inform users about potential response latency.
* **Dead Letter Queues (DLQs):** All SQS queues (7.b, 10\) should have DLQs to capture and isolate messages that fail processing repeatedly, allowing for debugging without blocking the queues.

#### **Monitoring and Alerts**

* **AWS CloudWatch:** Tracks Lambda errors, SQS queue depths, API Gateway metrics, and cost alarms.
* **MongoDB Atlas Alerts:** Monitors database performance (disk usage, slow queries, connections).
* **Notifications:** Alerts notify the team of deviations from normal operational parameters.

## Comparing Server vs. Serverless Stack Cases

- *Note: Always-on Server comes with server management overhead.*
- ***Overall: Serverless wins\!***

| Features | Serverless API GW \+ Firewall Λ \+ Bot Logic Λ \+ Dispatcher Λ \+ 2× SQS \+ CloudWatch Logs | Always-On Server EC2 t3.micro \+ 20 GB gp3 EBS \+ CloudWatch Logs |
| :---: | ----- | ----- |
| **Free-tier allowances** | **Lambda**: 1M invocations free/mo **HTTP API**: 1 M calls free/mo **SQS**: 1 M requests free/mo **Logs**: 5 GB ingestion free/mo | **EC2**: No long-term EC2 free beyond first year **EBS**: 30 GB-mo free first year **Logs**: 5 GB free/mo |
| **Expected monthly usage** | **Firewall Λ**: \~ 4600 invocations (one per inbound message) **Bot Logic Λ**: \~ 4600 invocations (one per inbound) **Dispatcher Λ**: \~ 4600 invocations (one per outbound) API Gateway calls: \~ 4600 **SQS requests**: \~ 9200 (4600 inbound \+ 4600 outbound) **Log ingestion**: \< 5 GB | **EC2**: 720 h **EBS**: 20 GB-month Logs: \< 5 GB |
| **Overage pricing** | **Lambda**: $0.20 per extra 1 M req **HTTP API**: $1.00 per extra 1 M calls **SQS**: $0.40 per extra 1 M req **Logs**: $0.50 per extra GB | **EC2 t3.micro**: $0.0104/hr \= $7.49/mo **EBS gp3**: $0.08/GB-mo= $1.60/mo **Logs**: covered by free tier |
| **Est. monthly AWS cost** | **$0.01($0.005 API GW \+ negligible overage risk)** | **$9.09** |
| **6-month cost** | **$0.06** | **$54.53** |
