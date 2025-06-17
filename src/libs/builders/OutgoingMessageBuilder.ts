/**
 * @author Daksh Pratap Singh
 * @email daksh204singh@gmail.com
 * @desc Builder class for constructing Outgoing Message.
 */

import { IOutgoingMessage } from '../../models/OutgoingMessage';

/**
 * Builder class for constructing IOutgoingMessage.
 */
export class OutgoingMessageBuilder {
  #replyForMsgSid: string;
  #to: string;
  #from: string;
  #body?: string;
  #mediaUrl?: string[];
  #statusCallback?: string;

  /**
   * Initializes the builder with required parameters for the outgoing message.
   * @param replyForMsgSid The MessageSid of the original incoming message (for tracing/logging).
   * @param to The recipient's phone number (E.164 format).
   * @param from The sender's (your Twilio) phone number (E.164 format).
   */
  constructor(replyForMsgSid: string, to: string, from: string) {
    this.#replyForMsgSid = replyForMsgSid;
    this.#to = to;
    this.#from = from;
  }

  /**
   * Sets the text body of the outgoing message.
   * @param body The text content.
   * @returns The builder instance for chaining.
   */
  setBody(body: string): OutgoingMessageBuilder {
    this.#body = body;
    return this;
  }

  /**
   * Sets the media URLs for an MMS message.
   * @param mediaUrl An array of public URLs to media files.
   * @returns The builder instance for chaining.
   */
  setMediaUrl(mediaUrl: string[]): OutgoingMessageBuilder {
    this.#mediaUrl = mediaUrl;
    return this;
  }

  /**
   * Sets the status callback URL for delivery receipts.
   * @param statusCallback The URL Twilio will hit with delivery status updates.
   * @returns The builder instance for chaining.
   */
  setStatusCallback(statusCallback: string): OutgoingMessageBuilder {
    this.#statusCallback = statusCallback;
    return this;
  }

  /**
   * Builds the final IOutgoingMessage object.
   * @returns The immutable IOutgoingMessage object.
   * @throws Error if the message has neither body nor media URLs.
   */
  build(): IOutgoingMessage {
    if (!this.#body && (!this.#mediaUrl || this.#mediaUrl.length === 0)) {
      throw new Error('Outgoing message must have either a body or at least one media URL.');
    }

    return {
      replyForMsgSid: this.#replyForMsgSid,
      to: this.#to,
      from: this.#from,
      body: this.#body,
      mediaUrl: this.#mediaUrl,
      statusCallback: this.#statusCallback,
    };
  }
}
