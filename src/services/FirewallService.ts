import { inject, injectable } from 'tsyringe';
import { UserRepository } from '../repositories/UserRepository';
import { IUser } from '../models/User';
import { twilioResponse } from '../libs/responseHelpers';
import { APIGatewayProxyResult } from 'aws-lambda';
import { extractCommandKeyword, sanitizeTxtMessage } from '../libs/messageHelper';
import { Command } from '../constants/Command';
import { TWI_ML_RESPONSE } from '../constants/TwiMLResponse';
import { ISQSService, ISQSServiceToken } from '../infrastructure/SQSService';
import { IAppConfig, IAppConfigToken } from '../configs/AppConfig';
import { IIncomingMessage } from '../models/IncomingMessage';

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
    const cmd: Command | null = extractCommandKeyword(msgBody);

    if (user.awaitingDeletion) {
      return this.#handleUserAwaitingDeletion(phoneNumber);
    }

    if (!user.subscriptionStatus && cmd != Command.START) {
      return this.#handleUnsubscribedUser(phoneNumber);
    }

    switch (cmd) {
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
    await this.sqsService.sendMessage(
      this.appConfig.incomingSqsQueueUrl,
      JSON.stringify(incomingMsg),
      phoneNumber,
    );
    if (cmd === Command.START) {
      return this.#subscribeUser(phoneNumber, user.subscriptionStatus);
    }
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
    let response: APIGatewayProxyResult;
    if (!subscriptionStatus) {
      console.debug(`FirewallService :: Subscribing ${phoneNumber}.`);
      await this.userRepository.setSubscription(phoneNumber, true);
      response = twilioResponse(TWI_ML_RESPONSE.SUBSCRIPTION_CONFIRMATION);
    } else {
      console.debug(`FirewallService :: User ${phoneNumber} already susbcribed.`);
      await this.userRepository.releaseProcessingLock(phoneNumber);
      response = twilioResponse(TWI_ML_RESPONSE.ALREADY_SUBSCRIBED);
    }

    return response;
  }
}
