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
    let pushToSqs: boolean = false;
    let response: APIGatewayProxyResult = twilioResponse(TWI_ML_RESPONSE.EMPTY_MESSAGE);
    if (!user.subscriptionStatus && cmd != Command.START) {
      response = this.#handleUnsubscribedUser(phoneNumber);
    } else {
      switch (cmd) {
        case Command.START:
          response = this.#subscribeUser(
            phoneNumber,
            user.subscriptionStatus,
            user.awaitingDeletion,
          );
          break;
        case Command.DELETE:
          response = this.#deleteUserData(phoneNumber);
          break;
        case Command.HELP:
          response = this.#returnHelpMessage(phoneNumber);
          break;
        case Command.INU:
          response = this.#returnInupiatValues(phoneNumber);
          break;
        default:
          pushToSqs = true;
      }

      if (pushToSqs) {
        console.debug(
          `FirewallService :: Pushing message to ${this.appConfig.incomingSqsQueueUrl} with msg :: `,
        );
        void this.sqsService.sendMessage(
          this.appConfig.incomingSqsQueueUrl,
          JSON.stringify(parsedTwilioParams),
          phoneNumber,
        );
        // need to comment the below line once worker implementation starts
        void this.userRepository.releaseProcessingLock(phoneNumber);
      } else {
        // added redundancy
        void this.userRepository.releaseProcessingLock(phoneNumber);
      }
    }

    return Promise.resolve(response);
  }

  /**
   * Requests user to send START message.
   *
   * @param phoneNumber phone number of user
   * @returns APIGatewayProxyResult
   */
  #handleUnsubscribedUser(phoneNumber: string): APIGatewayProxyResult {
    console.debug(
      `FirewallService :: User ${phoneNumber} is unsubscribed. Returning subscribe message.`,
    );
    return twilioResponse(TWI_ML_RESPONSE.PROMPT_START_MESSAGE);
  }

  /**
   * Marks user for deletion and releases lock.
   *
   * @param phoneNumber phone number of user
   * @returns APIGatewayProxyResult object containing TwiML with deletion confirmation message.
   */
  #deleteUserData(phoneNumber: string): APIGatewayProxyResult {
    console.debug(`FirewallService :: User ${phoneNumber} requested to delete their data.`);
    void this.userRepository.setAwaitingDeletion(phoneNumber, 1);
    return twilioResponse(TWI_ML_RESPONSE.DELETE_CONFIRMATION_MESSAGE);
  }

  /**
   * Returns response with Inupiat Values message.
   *
   * @param phoneNumber phone number of user requesting Inupiat values
   * @returns APIGatewayProxyResult object containing Inupiat values message.
   */
  #returnInupiatValues(phoneNumber: string): APIGatewayProxyResult {
    console.debug(`FirewallService :: User ${phoneNumber} requested for Inupiat values.`);
    return twilioResponse(TWI_ML_RESPONSE.INUPIAT_VALUES_MESSAGE);
  }

  /**
   * Returns help message for user.
   *
   * @param phoneNumber phone number of user requesting.
   * @returns APIGatewayProxyResult object containing help message.
   */
  #returnHelpMessage(phoneNumber: string): APIGatewayProxyResult {
    console.debug(`FirewallService :: User ${phoneNumber} requested for HELP.`);
    return twilioResponse(TWI_ML_RESPONSE.HELP_MESSAGE);
  }

  /**
   * Subscribes user to the service if user isn't subscribed and didn't request deletion prior.
   * Releases processes lock as well.
   *
   * @param phoneNumber phone number of user requesting to subscribe.
   * @param subscriptionStatus current subscription status of user.
   * @param awaitingDeletion if user has previously requested to delete.
   * @returns APIGatewayProxyResult with TwiML response.
   */
  #subscribeUser(
    phoneNumber: string,
    subscriptionStatus: boolean,
    awaitingDeletion: number,
  ): APIGatewayProxyResult {
    let response: APIGatewayProxyResult;

    if (awaitingDeletion) {
      console.debug(`FirewallService :: User tried to subscribed after requesting deletion.`);
      response = twilioResponse(TWI_ML_RESPONSE.TRY_AGAIN_NEXT_DAY_AFTER_DELETION);
    } else if (!subscriptionStatus) {
      console.debug(`FirewallService :: Subscribing ${phoneNumber}.`);
      void this.userRepository.setSubscription(phoneNumber, true);
      response = twilioResponse(TWI_ML_RESPONSE.SUBSCRIPTION_CONFIRMATION);
    } else {
      console.debug(`FirewallService :: User ${phoneNumber} already susbcribed.`);
      response = twilioResponse(TWI_ML_RESPONSE.ALREADY_SUBSCRIBED);
    }

    return response;
  }
}
