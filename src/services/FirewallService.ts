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

    if (!user.subscriptionStatus && cmd != Command.START) {
      return this.#handleUnsubscribedUser(phoneNumber);
    }

    switch (cmd) {
      case Command.START:
        return this.#subscribeUser(phoneNumber, user.subscriptionStatus);
      case Command.STOP: // TODO - IMPLEMENT UNSUBSCRIBE FUNCTIONALITY
        break;
      default:
        pushToSqs = true;
    }

    if (!pushToSqs) {
      void this.userRepository.releaseProcessingLock(phoneNumber);
    } else {
      console.debug(
        `FirewallService :: Pushing message to ${this.appConfig.incomingSqsQueueUrl} with msg :: `,
      );
      void this.sqsService.sendMessage(
        this.appConfig.incomingSqsQueueUrl,
        JSON.stringify(parsedTwilioParams),
        phoneNumber,
      );
      void this.userRepository.releaseProcessingLock(phoneNumber);
    }

    return Promise.resolve(twilioResponse(TWI_ML_RESPONSE.THANK_YOU));
  }

  async #handleUnsubscribedUser(phoneNumber: string): Promise<APIGatewayProxyResult> {
    console.debug(
      `FirewallService :: User ${phoneNumber} is unsubscribed. Returning subscribe message.`,
    );
    void this.userRepository.releaseProcessingLock(phoneNumber);
    return Promise.resolve(twilioResponse(TWI_ML_RESPONSE.PROMPT_START_MESSAGE));
  }

  async #subscribeUser(
    phoneNumber: string,
    subscriptionStatus: boolean,
  ): Promise<APIGatewayProxyResult> {
    let response: APIGatewayProxyResult;

    if (!subscriptionStatus) {
      console.debug(`FirewallService :: Subscribing ${phoneNumber}.`);
      void this.userRepository.setSubscription(phoneNumber, true);
      response = twilioResponse(TWI_ML_RESPONSE.SUBSCRIPTION_CONFIRMATION);
    } else {
      console.debug(`FirewallService :: User ${phoneNumber} already susbcribed.`);
      response = twilioResponse(TWI_ML_RESPONSE.ALREADY_SUBSCRIBED);
    }

    void this.userRepository.releaseProcessingLock(phoneNumber);
    return Promise.resolve(response);
  }
}
