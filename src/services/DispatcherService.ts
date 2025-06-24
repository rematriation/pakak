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
import { MessageInstance, MessageStatus } from 'twilio/lib/rest/api/v2010/account/message';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
    let messageSid: string;
    try {
      const ack = await this.twilioClient.client.messages.create({
        from: message.from,
        to: message.to,
        body: message.body,
      });
      messageSid = ack.sid;
      console.log(
        `DispatcherService.dispatch :: Message dispatched to ${message.to} with SID: ${messageSid}`,
      );
    } catch (error) {
      console.error(
        `DispatcherService.dispatch :: Failed to send message via Twilio for user ${message.to}. Releasing lock.`,
        error,
      );
      throw error;
    }

    const maxPolls: number = 3;
    let finalStatus: string = '';
    for (let i = 0; i < maxPolls; i++) {
      await sleep(1500);
      console.debug(
        `DispatcherService.dispatch :: [Poll ${i + 1}/${maxPolls}] Checking status for SID: ${messageSid}`,
      );

      try {
        const currentMessage: MessageInstance = await this.twilioClient.client
          .messages(messageSid)
          .fetch();
        const status: MessageStatus = currentMessage.status;
        console.debug(`DispatcherService.dispatch :: Current status for ${messageSid}: ${status}`);

        if (['delivered', 'failed', 'undelivered', 'canceled'].includes(status)) {
          console.info(
            `DispatcherService.dispatch :: Final status "${status}" reached for SID: ${messageSid}.`,
          );
          finalStatus = status;
          break;
        }
      } catch (pollError) {
        console.error(
          `DispatcherService.dispatch :: Error while polling for SID ${messageSid}.`,
          pollError,
        );
        break;
      }
    }

    if (['failed', 'undelivered'].includes(finalStatus)) {
      console.error(
        `DispatcherService.dispatch :: Message ${messageSid} delivery failed. Status: ${finalStatus}`,
      );
      throw new Error(`Message delivery failed ${messageSid}, status: ${finalStatus}`);
    }
    if (!message.keepLockActive) {
      await this.userRepository.releaseProcessingLock(message.to);
    }
  }
}
