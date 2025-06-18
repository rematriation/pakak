/**
 * @author Daksh Pratap Singh
 * @email daksh204singh@gmail.com
 * @create date 2025-06-09 01:58:14
 * @modify date 2025-06-09 01:58:14
 * @desc FIFO SQS interface and injectable implementation.
 */

import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { injectable } from 'tsyringe';

/**
 * Interface defining the contract for an SQS messaging service.
 */
export interface ISQSService {
  sendMessage(queueURL: string, messageBody: string, messageGroupId: string): Promise<void>;
}

/**
 * A unique token to identify the ISQSService interface for tsyringe injection.
 */
export const ISQSServiceToken = Symbol('ISQSService');

/**
 * Concrete implementation of ISQSService for interacting with AWS SQS.
 * This class is injectable and will be bound to the ISQSServiceToken.
 */
@injectable()
export class SQSService implements ISQSService {
  private sqsClient: SQSClient;

  constructor() {
    this.sqsClient = new SQSClient({ region: process.env.AWS_REGION || 'us-east-1' });
  }

  /**
   * Sends a message to an SQS queue.
   * Requiring a messageGroupId for FIFO behavior.
   *
   * @param queueUrl The URL of the SQS queue.
   * @param messageBody The body of the message.
   * @param messageGroupId The message group ID.
   * @returns A Promise that resolves when the message has been successfully sent.
   */
  async sendMessage(queueUrl: string, messageBody: string, messageGroupId: string): Promise<void> {
    const cmd = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: messageBody,
      MessageGroupId: messageGroupId,
    });
    console.debug(`SQSService :: Pushing message to ${queueUrl} :: `, cmd);
    await this.sqsClient.send(cmd);
  }
}
