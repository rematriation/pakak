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
  messageSid: string;

  // Sender information
  phoneNumber: string;
  fromCity?: string;
  fromState?: string;
  fromZip?: string;

  // Message content
  messageText?: string;
  numMedia: number;
  mediaUrls?: string[];
  mediaContentTypes?: string[];
}
