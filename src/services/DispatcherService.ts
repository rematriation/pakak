/**
 * @author Daksh Pratap Singh
 * @email daksh204singh@gmail.com
 * @desc Dispatcher Service
 */

import { injectable, inject } from 'tsyringe';
import { UserRepository } from '../repositories/UserRepository';
import { IAppConfig, IAppConfigToken } from '../configs/AppConfig';
import { IOutgoingMessage } from '../models/OutgoingMessage';
import { TwilioClient } from '../infrastructure/twilio';

/**
 * Service responsible for dispatching outgoing messages to Twilio and managing final lock release.
 */
@injectable()
export class DispatcherService {
  constructor(
    private userRepository: UserRepository,
    @inject(IAppConfigToken) private appConfig: IAppConfig,
    private twilioClient: TwilioClient,
  ) {}

  /**
   * Processes an outgoing message from the SQS queue, sends it via Twilio,
   * logs it, and releases the user's processing lock.
   * @param payload The message payload from the Outgoing SQS Queue.
   * @throws Error if essential data is missing or Twilio send fails.
   */
  public async dispatch(message: IOutgoingMessage): Promise<void> {
    await this.twilioClient.client.messages
      .create({
        from: message.from,
        to: message.to,
        body: message.body,
      })
      .then((ack_msg) => {
        console.info(
          `Dispatcher Service :: Message sent to ${message.to} using ${message.from} :: `,
          ack_msg.sid,
        );
      });
    await this.userRepository.releaseProcessingLock(message.to);
  }
}
