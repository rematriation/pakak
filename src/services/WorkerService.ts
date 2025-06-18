/**
 * @author Daksh Pratap Singh
 * @email daksh204singh@gmail.com
 * @desc Worker Service.
 */

import { inject, injectable } from 'tsyringe';
import { UserRepository } from '../repositories/UserRepository';
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
import { ICampaignDefinition, IQuestionStep } from '../models/Campaign';
import { ConversationState } from '../constants/ConversationState';
import { IUser } from '../models/User';
import { ICampaignContext } from '../models/CampaignContext';
import { IOutgoingMessage } from '../models/OutgoingMessage';
import { ICampaignSubmissionRepository } from '../repositories/CampaignEntryRepository';
import { OutgoingMessageBuilder } from '../libs/builders/OutgoingMessageBuilder';

@injectable()
export class WorkerService {
  constructor(
    private userRepository: UserRepository,
    private userProfileRepository: UserProfileRepository,
    @inject(IAppConfigToken) private appConfig: IAppConfig,
    @inject(ICampaignLoaderServiceToken) private campaignLoaderService: ICampaignLoaderService,
  ) {}

  async processMessage(incomingMessage: IIncomingMessage): Promise<IOutgoingMessage> {
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
    return await this.#campaignRunner(
      incomingMessage,
      user.conversationState as ConversationState,
      user.campaignContext as ICampaignContext,
      this.userProfileRepository,
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
    repository: ICampaignSubmissionRepository,
  ): Promise<IOutgoingMessage> {
    const flowId: string = context.flowId;
    let stepId: string = context.currentStepId;
    let conversationState: ConversationState = state;
    let stateChange: boolean = true;

    const questionStep: IQuestionStep = await this.campaignLoaderService.getQuestionStep(
      flowId,
      stepId,
    );
    const outgoingMsgBuilder: OutgoingMessageBuilder = new OutgoingMessageBuilder(
      msg.messageSid,
      msg.phoneNumber,
      this.appConfig.twilioNumber,
    );

    if (state === ConversationState.IDLE) {
      console.info(`Worker Service :: Running campaign ${context.flowId}`);
      outgoingMsgBuilder.setBody(questionStep.prompt);
      conversationState = ConversationState.AWAITING_REPLY;
    } else if (state == ConversationState.AWAITING_REPLY) {
      console.info(
        `Worker Service :: Processing user response for ${msg.phoneNumber} with Message SID: ${msg.messageSid}`,
      );
      if (new RegExp(questionStep.validationRegex || '').test(msg.messageText || '')) {
        await repository.addResponse(
          msg.phoneNumber,
          questionStep.fieldName as string,
          msg.messageText as string,
        );
        const nextStepId: string | undefined = questionStep.nextStepId;
        let nextQuestionStep: IQuestionStep | undefined = undefined;
        if (nextStepId) {
          nextQuestionStep = await this.campaignLoaderService.getQuestionStep(
            context.flowId,
            nextStepId,
          );
        }
        outgoingMsgBuilder.setBody(`Thank you! ${nextQuestionStep?.prompt}`);
        stepId = nextStepId || 'NONE';
      } else {
        console.info(
          `Worker Service :: incorrect response by ${msg.phoneNumber} with message SID: ${msg.messageSid}. Sending fallback message`,
        );
        outgoingMsgBuilder.setBody(questionStep.fallbackMessage as string);
        stateChange = false;
      }
    }
    if (stateChange) {
      console.debug(
        `Worker Service :: Updating conversation context in User table for ${msg.phoneNumber}, flowId: ${flowId}, stepId: ${stepId}`,
      );
      await this.userRepository.updateConversation(
        msg.phoneNumber,
        conversationState,
        flowId,
        stepId,
      );
    }
    return outgoingMsgBuilder.build();
  }
}
