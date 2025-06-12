import { inject, injectable } from 'tsyringe';
import { UserRepository } from '../repositories/UserRepository';
import { IUser } from '../models/User';
import { twilioResponse } from '../libs/responseHelpers';
import { APIGatewayProxyResult } from 'aws-lambda';
import { extractCommandKeyword, sanitizeTxtMessage } from '../libs/messageHelper';
import { Command } from '../constants/Command';
import { TWI_ML_RESPONSE } from '../constants/TwiMLResponse';
import { ISQSService, ISQSServiceToken } from '../libs/SQSService';
import { IAppConfig, IAppConfigToken } from '../configs/AppConfig';

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
    parsedTwilioParams: Record<string, string | undefined>,
  ): Promise<APIGatewayProxyResult> {
    const msgBody = sanitizeTxtMessage(parsedTwilioParams.Body);
    parsedTwilioParams.Body = msgBody;
    const cmd = extractCommandKeyword(msgBody);

    if (user.awaitingDeletion) {
      return this.#handleUserAwaitingDeletion(phoneNumber);
    }

    if (!user.subscriptionStatus && cmd != Command.START) {
      return this.#handleUnsubscribedUser(phoneNumber);
    }

    switch (cmd) {
      case Command.START:
        return this.#subscribeUser(phoneNumber, user.subscriptionStatus);
      case Command.DELETE:
        return this.#deleteUserData(phoneNumber);
      case Command.HELP:
        return this.#returnHelpMessage(phoneNumber);
      case Command.INU:
        return this.#returnInupiatValues(phoneNumber);
      case Command.STOP:
        return this.#unsubscribeUser(phoneNumber);
    }

    console.debug(
      `FirewallService :: Pushing message to ${this.appConfig.incomingSqsQueueUrl} with msg :: `,
    );
    void this.sqsService.sendMessage(
      this.appConfig.incomingSqsQueueUrl,
      JSON.stringify(parsedTwilioParams),
      phoneNumber,
    );

    await this.userRepository.releaseProcessingLock(phoneNumber);
    return twilioResponse(TWI_ML_RESPONSE.THANK_YOU);
  }

  async #handleUserAwaitingDeletion(phoneNumber: string): Promise<APIGatewayProxyResult> {
    console.debug(`FirewallService :: User ${phoneNumber} is awaiting deletion and unsubscribed.`);
    await this.userRepository.releaseProcessingLock(phoneNumber);
    return twilioResponse(TWI_ML_RESPONSE.TRY_AGAIN_NEXT_DAY_AFTER_DELETION);
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
    await this.userRepository.setAwaitingDeletion(phoneNumber, 1);
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
    await this.userRepository.releaseProcessingLock(phoneNumber);
    return twilioResponse(TWI_ML_RESPONSE.INUPIAT_VALUES_MESSAGE);
  }

  /**
   *
   * @param phoneNumber phone number of user requesting.
   * @returns
   */
  async #returnHelpMessage(phoneNumber: string): Promise<APIGatewayProxyResult> {
    console.debug(
      `FirewallService :: User ${phoneNumber} requested for HELP. Twilio will send the message.`,
    );
    await this.userRepository.releaseProcessingLock(phoneNumber);
    return twilioResponse(TWI_ML_RESPONSE.EMPTY_MESSAGE);
  }

  async #subscribeUser(
    phoneNumber: string,
    subscriptionStatus: boolean,
  ): Promise<APIGatewayProxyResult> {
    if (!subscriptionStatus) {
      console.debug(`FirewallService :: Subscribing ${phoneNumber}. Twilio will send the message.`);
      await this.userRepository.setSubscription(phoneNumber, true);
    } else {
      console.debug(
        `FirewallService :: User ${phoneNumber} already susbcribed. Twilio will send the message.`,
      );
      await this.userRepository.releaseProcessingLock(phoneNumber);
    }

    return twilioResponse(TWI_ML_RESPONSE.EMPTY_MESSAGE);
  }
}
