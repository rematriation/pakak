/**
 * @author Daksh Pratap Singh
 * @email daksh204singh@gmail.com
 * @desc Worker Service.
 */

import { inject, injectable } from 'tsyringe';
import { UserRepository } from '../repositories/UserRepository';
import { ISQSService, ISQSServiceToken } from '../infrastructure/SQSService';
import { IAppConfig, IAppConfigToken } from '../configs/AppConfig';
import { IIncomingMessage } from '../models/IncomingMessage';
import {
  ICampaignLoaderService,
  ICampaignLoaderServiceToken,
} from '../infrastructure/CampaignLoaderService';
import { extractCommandKeyword } from '../libs/messageHelper';
import { Command } from '../constants/Command';
import { IUserProfileDocument } from '../models/UserProfile';
import { UserProfileRepository } from '../repositories/UserProfileRepository';
import { CampaignId } from '../constants/CampaignId';
import { ICampaignDefinition } from '../models/Campaign';
import { ConversationState } from '../constants/ConversationState';
import { IUser } from '../models/User';
import { ICampaignContext } from '../models/CampaignContext';
import { IOutgoingMessage } from '../models/OutgoingMessage';

@injectable()
export class WorkerService {
  constructor(
    private userRepository: UserRepository,
    private userProfileRepository: UserProfileRepository,
    @inject(ISQSServiceToken) private sqsService: ISQSService,
    @inject(IAppConfigToken) private appConfig: IAppConfig,
    @inject(ICampaignLoaderServiceToken) private campaignLoaderService: ICampaignLoaderService,
  ) {}

  async processMessage(incomingMessage: IIncomingMessage): Promise<void> {
    console.debug(`WorkerService :: processing messaage :: `, incomingMessage);
    // check if user profile has to be created
    if (
      incomingMessage.messageText &&
      extractCommandKeyword(incomingMessage.messageText) === Command.START
    ) {
      const userProfile: IUserProfileDocument | null =
        await this.userProfileRepository.getUserProfile(incomingMessage.phoneNumber);
      if (!userProfile) {
        await this.#setUserProfileCreationFlow(
          incomingMessage.phoneNumber,
          incomingMessage.messageSid,
        );
      }
    }
    const user: IUser = (await this.userRepository.getUser(incomingMessage.phoneNumber)) as IUser;
    await this.#campaignRunner(
      incomingMessage,
      user.conversationState as ConversationState,
      user.campaignContext as ICampaignContext,
    );
  }

  async #setUserProfileCreationFlow(phoneNumber: string, messageSID: string) {
    console.info(
      `Worker Service :: User Profile not created. Update conversation to trigger ${CampaignId.USER_PROFILE_ONBOARDING}`,
    );
    const userProfileFlow: ICampaignDefinition | null =
      await this.campaignLoaderService.getCampaignDefinition(CampaignId.USER_PROFILE_ONBOARDING);
    if (!userProfileFlow) {
      const errorMsg: string = `Campaign ${CampaignId.USER_PROFILE_ONBOARDING} doesn't exist.`;
      console.error(
        `Worker Service :: Phone No: ${phoneNumber}, Msg ID: ${messageSID}, error: ${errorMsg}`,
      );
      // Not throwing AppError. Allow it to be pushed to DLQ. Needs team's attention to fix the bug/config.
      throw Error(errorMsg);
    }

    await this.userProfileRepository.createUserProfile({
      _id: phoneNumber,
    });

    await this.userRepository.updateConversation(
      phoneNumber,
      ConversationState.IDLE, // IDLE to indicate bot has to act.
      userProfileFlow._id,
      userProfileFlow.steps[0].stepId,
    );
  }

  async #campaignRunner(
    // campaignDefinition: ICampaignDefinition,
    // campaignName: string,
    msg: IIncomingMessage,
    state: ConversationState,
    context: ICampaignContext,
    // repository: ICampaignSubmissionRepository,
  ): Promise<void> {
    if (state === ConversationState.IDLE) {
      console.info(`Worker Service :: Running campaign ${context.flowId}`);
      const outgoingMsg: IOutgoingMessage = {
        forSid: msg.messageSid,
        to: msg.phoneNumber,
        from: this.appConfig.twilioNumber,
        body: 'Hello from dispatcher',
      };
      console.debug(`Worker Service :: pushing message to outgoing queue`, outgoingMsg);
      await this.sqsService.sendMessage(
        this.appConfig.outgoingSqsQueueUrl,
        JSON.stringify(outgoingMsg),
        msg.phoneNumber,
      );
      console.debug(
        `Worker Service :: Updating conversation context in User table for ${msg.phoneNumber}`,
      );
      await this.userRepository.updateConversation(
        msg.phoneNumber,
        ConversationState.IDLE,
        context.flowId,
        context.currentStepId,
      );
    }
  }
}
