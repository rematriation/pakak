/**
 * @author Daksh Pratap Singh
 * @email daksh204singh@gmail.com
 * @desc Outgoing message payload; Produced by worker/scanner; Consumed by dispatcher.
 */

/**
 * Defines the structure of a message payload sent to the Outgoing SQS Queue.
 * This is the contract between Worker/Scanner (producer) and Dispatcher (consumer).
 * Contains "from" field for scalability, even though the app uses only a single phone number.
 */
export interface IOutgoingMessage {
  readonly forSid: string;
  readonly to: string;
  readonly from: string;
  readonly body?: string;
  readonly mediaUrl?: string[];
  readonly statusCallback?: string;
}
