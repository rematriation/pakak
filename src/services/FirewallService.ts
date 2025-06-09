import { injectable } from 'tsyringe';
import { UserRepository } from '../repositories/UserRepository';
import { IUser } from '../models/User';
import { twilioResponse } from '../libs/responseHelpers';
import { APIGatewayProxyResult } from 'aws-lambda';
import { extractCommandKeyword, sanitizeTxtMessage } from '../libs/messageHelper';
import { Command } from '../constants/Command';
import { TWI_ML_RESPONSE } from '../constants/TwiMLResponse';

@injectable()
export class FirewallService {
  constructor(private userRepository: UserRepository) {}

  async processMessage(
    phoneNumber: string,
    user: IUser,
    parsedTwilioParams: Record<string, string | undefined>,
  ): Promise<APIGatewayProxyResult> {
    const msgBody = sanitizeTxtMessage(parsedTwilioParams.Body);
    const cmd = extractCommandKeyword(msgBody);

    if (!user.subscriptionStatus) {
      if (cmd != Command.START) {
        return this.#handleUnsubscribedUser(phoneNumber);
      }
      return this.#subscribeUser(phoneNumber);
    } else {
      switch (cmd) {
        case Command.START:
          return twilioResponse(TWI_ML_RESPONSE.ALREADY_SUBSCRIBED);
      }
    }

    return Promise.resolve(twilioResponse(TWI_ML_RESPONSE.THANK_YOU));
  }

  async #handleUnsubscribedUser(phoneNumber: string): Promise<APIGatewayProxyResult> {
    console.info(
      `FirewallService :: User ${phoneNumber} is unsubscribed. Returning subscribe message.`,
    );
    void this.userRepository.releaseProcessingLock(phoneNumber);
    return Promise.resolve(twilioResponse(TWI_ML_RESPONSE.PROMPT_START_MESSAGE));
  }

  async #subscribeUser(phoneNumber: string): Promise<APIGatewayProxyResult> {
    console.info(`FirewallService :: Subscribing ${phoneNumber}.`);
    void this.userRepository.setSubscription(phoneNumber, true);
    void this.userRepository.releaseProcessingLock(phoneNumber);
    return Promise.resolve(twilioResponse(TWI_ML_RESPONSE.SUBSCRIPTION_CONFIRMATION));
  }
}
