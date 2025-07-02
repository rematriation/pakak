import { inject, injectable } from 'tsyringe';
import { UserRepository } from '../repositories/UserRepository';
import { IUser } from '../models/User';
import { twilioResponse } from '../libs/responseHelpers';
import { APIGatewayProxyResult } from 'aws-lambda';
import { extractCommandKeyword, sanitizeTxtMessage } from '../libs/messageHelper';
import { Command } from '../constants/Command';
import { TWI_ML_RESPONSE } from '../constants/StaticResponses';
import { ISQSService, ISQSServiceToken } from '../infrastructure/SQSService';
import { IAppConfig, IAppConfigToken } from '../configs/AppConfig';
import { IIncomingMessage } from '../models/IncomingMessage';
import { DeletionStatus } from '../constants/DeletionStatus';
import { asTwimlXmlString, TwimlXmlString } from '../libs/types';
import Profanity from 'no-profanity';

@injectable()
export class FirewallService {
  constructor(
    private userRepository: UserRepository,
    @inject(ISQSServiceToken) private sqsService: ISQSService,
    @inject(IAppConfigToken) private appConfig: IAppConfig,
  ) {}

  async processMessage(
    phoneNumber: string,
    user: IUser,
    incomingMsg: IIncomingMessage,
  ): Promise<APIGatewayProxyResult> {
    const msgBody = sanitizeTxtMessage(incomingMsg.messageText);
    incomingMsg.messageText = msgBody;
    if (Profanity.isProfane(incomingMsg.messageText)) {
      return this.#handleProfanity(phoneNumber);
    }
    const cmd: Command | null = extractCommandKeyword(msgBody);

    if (user.deletionStatus) {
      return this.#handleUserAwaitingDeletion(phoneNumber);
    }

    if (!user.subscriptionStatus && cmd != Command.START) {
      return this.#handleUnsubscribedUser(phoneNumber);
    }

    let response: APIGatewayProxyResult = twilioResponse(TWI_ML_RESPONSE.EMPTY_MESSAGE);
    switch (cmd) {
      case Command.START:
        response = await this.#subscribeUser(phoneNumber, user.subscriptionStatus);
        break;
      case Command.DELETE:
        return this.#deleteUserData(phoneNumber);
      case Command.HELP:
        response = this.#returnHelpMessage(phoneNumber);
        break;
      case Command.INU:
        return this.#returnInupiatValues(phoneNumber);
      case Command.STOP:
        return this.#unsubscribeUser(phoneNumber);
    }

    console.debug(
      `FirewallService :: Pushing message to ${this.appConfig.incomingSqsQueueUrl} with msg :: `,
    );
    await this.sqsService.sendMessage(this.appConfig.incomingSqsQueueUrl, incomingMsg, phoneNumber);
    return response;
  }

  async #handleUserAwaitingDeletion(phoneNumber: string): Promise<APIGatewayProxyResult> {
    console.debug(`FirewallService :: User ${phoneNumber} is awaiting deletion and unsubscribed.`);
    await this.userRepository.releaseProcessingLock(phoneNumber);
    return twilioResponse(TWI_ML_RESPONSE.TRY_AGAIN_NEXT_DAY_AFTER_DELETION);
  }

  async #handleProfanity(phoneNumber: string): Promise<APIGatewayProxyResult> {
    console.debug(`FirewallService :: User ${phoneNumber} is sent profanity.`);
    await this.userRepository.releaseProcessingLock(phoneNumber);
    return twilioResponse(TWI_ML_RESPONSE.GENERIC_FALLBACK_MESSAGE);
  }

  async #unsubscribeUser(phoneNumber: string): Promise<APIGatewayProxyResult> {
    console.debug(`FirewallService :: Unsubscribing ${phoneNumber}.`);
    await this.userRepository.setSubscription(phoneNumber, false);
    return twilioResponse(TWI_ML_RESPONSE.EMPTY_MESSAGE);
  }

  async #handleUnsubscribedUser(phoneNumber: string): Promise<APIGatewayProxyResult> {
    console.debug(
      `FirewallService :: User ${phoneNumber} is unsubscribed. Returning subscribe message.`,
    );
    await this.userRepository.releaseProcessingLock(phoneNumber);
    return twilioResponse(TWI_ML_RESPONSE.PROMPT_START_MESSAGE);
  }

  /**
   * Marks user for deletion and releases lock.
   *
   * @param phoneNumber phone number of user
   * @returns APIGatewayProxyResult object containing TwiML with deletion confirmation message.
   */
  async #deleteUserData(phoneNumber: string): Promise<APIGatewayProxyResult> {
    console.debug(`FirewallService :: User ${phoneNumber} requested to delete their data.`);
    await this.userRepository.setDeletionStatus(phoneNumber, DeletionStatus.REQUESTED);
    return twilioResponse(TWI_ML_RESPONSE.DELETE_CONFIRMATION_MESSAGE);
  }

  /**
   * Returns response with Inupiat Values message.
   *
   * @param phoneNumber phone number of user requesting Inupiat values
   * @returns APIGatewayProxyResult object containing Inupiat values message.
   */
  async #returnInupiatValues(phoneNumber: string): Promise<APIGatewayProxyResult> {
    console.debug(`FirewallService :: User ${phoneNumber} requested for Inupiat values.`);
    await this.userRepository.setConversationStateIDLE(phoneNumber);
    return twilioResponse(TWI_ML_RESPONSE.INUPIAT_VALUES_MESSAGE);
  }

  /**
   *
   * @param phoneNumber phone number of user requesting.
   * @returns
   */
  #returnHelpMessage(phoneNumber: string): APIGatewayProxyResult {
    console.debug(
      `FirewallService :: User ${phoneNumber} requested for HELP. Twilio will handle it.`,
    );
    return twilioResponse(TWI_ML_RESPONSE.EMPTY_MESSAGE);
  }

  async #subscribeUser(
    phoneNumber: string,
    subscriptionStatus: boolean,
  ): Promise<APIGatewayProxyResult> {
    let response: APIGatewayProxyResult;
    if (!subscriptionStatus) {
      console.debug(`FirewallService :: Subscribing ${phoneNumber}.`);
      await this.userRepository.setSubscription(phoneNumber, true);
      response = twilioResponse(TWI_ML_RESPONSE.SUBSCRIPTION_CONFIRMATION);
    } else {
      console.debug(`FirewallService :: User ${phoneNumber} already susbcribed.`);
      response = twilioResponse(TWI_ML_RESPONSE.ALREADY_SUBSCRIBED);
    }

    return response;
  }

  /**
   * Enforce rate limits for a user.
   * @param phoneNumber The user's phone number.
   * @param user The user's DynamoDB profile (containing rate limit counters).
   * @returns A Promise resolving to APIGatewayProxyResult if rate-limited, otherwise null.
   */
  public async isRateLimited(user: IUser): Promise<APIGatewayProxyResult | null> {
    const now = Math.floor(Date.now() / 1000);
    let currentCounter = user.rateLimitCounter || 0;
    const windowExpiresAt = user.rateLimitWindowExpiresAt ?? 0;

    if (windowExpiresAt === 0 || now >= windowExpiresAt) {
      const newWindowExpiresAt = now + this.appConfig.rateLimitWindowSeconds;
      await this.userRepository.resetRateLimit(user.phone, newWindowExpiresAt);
      currentCounter = 1;
      console.log(
        `FirewallService. :: Rate limit window reset for ${user.phone}. New expiry: ${new Date(newWindowExpiresAt * 1000).toUTCString()}.`,
      );
    } else {
      await this.userRepository.incrementRateLimitCounter(user.phone);
      currentCounter++;
      console.log(
        `FirewallService.isRateLimited :: Rate limit counter for ${user.phone}: ${currentCounter}. Expires: ${new Date(windowExpiresAt * 1000).toUTCString()}.`,
      );
    }

    if (currentCounter > this.appConfig.maxMessagesPerWindow) {
      console.warn(
        `FirewallService :: User ${user.phone} exceeded rate limit (${currentCounter}/${this.appConfig.maxMessagesPerWindow}). Blocking message.`,
      );

      const remainingSeconds = windowExpiresAt - now;
      let returnTimeString: string;

      if (remainingSeconds <= 0) {
        returnTimeString = 'a moment';
      } else if (remainingSeconds < 60) {
        returnTimeString = `${remainingSeconds} second${remainingSeconds === 1 ? '' : 's'}`;
      } else {
        const minutes = Math.ceil(remainingSeconds / 60);
        returnTimeString = `${minutes} minute${minutes === 1 ? '' : 's'}`;
      }

      const rateLimitMessage: TwimlXmlString = asTwimlXmlString(
        TWI_ML_RESPONSE.RATE_LIMIT_EXCEEDED.replace('{{RETURN_TIME}}', returnTimeString),
      );

      await this.userRepository.setConversationStateIDLE(user.phone);
      return twilioResponse(rateLimitMessage);
    }

    return null;
  }
}
