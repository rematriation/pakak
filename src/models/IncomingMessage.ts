/**
 * @author Daksh Pratap Singh
 * @email daksh204singh@gmail.com
 * @desc Incoming message payload; Produced by firewall; Consumed by worker.
 */

/**
 * Defines the structure of a message payload sent to the Incoming SQS Queue.
 * This is the contract between FirewallService (producer) and Worker Lambda (consumer).
 */
export interface IIncomingMessage {
  readonly messageSid: string;

  // Sender information
  readonly phoneNumber: string;
  readonly fromCity?: string;
  readonly fromState?: string;
  readonly fromZip?: string;

  // Message content
  messageText?: string;
  readonly numMedia: number;
  readonly mediaUrls?: string[];
  readonly mediaContentTypes?: string[];
}
