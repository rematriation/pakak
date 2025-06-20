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
import { extractCommandKeyword, validateWithRegex } from '../libs/messageHelper';
import { Command } from '../constants/Command';
import { IUserProfileDocument } from '../models/UserProfile';
import { UserProfileRepository } from '../repositories/UserProfileRepository';
import { CampaignId } from '../constants/CampaignId';
import { ICampaignDefinition } from '../models/CampaignDefinition';
import { IQuestionStep } from '../models/QuestionStep';
import { ConversationState } from '../constants/ConversationState';
import { IUser } from '../models/User';
import { ICampaignContext } from '../models/CampaignContext';
import { IOutgoingMessage } from '../models/OutgoingMessage';
import { ICampaignSubmissionRepository } from '../repositories/ICampaignSubmissionRepository';
import { OutgoingMessageBuilder } from '../libs/builders/OutgoingMessageBuilder';
import { RESPONSE } from '../constants/StaticResponses';

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
      phoneNumber, // submissionId - for user profile, it will be phone number
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
    async function textProcessor(): Promise<boolean> {
      let success: boolean = false;
      console.info(
        `Worker Service :: Processing user's text response for ${msg.phoneNumber} with Message SID: ${msg.messageSid}`,
      );
      if (validateWithRegex(msg.messageText, questionStep.validationRegex as RegExp)) {
        if (questionStep.fieldName) {
          await repository.addTextResponse(
            context.submissionId,
            questionStep.fieldName,
            msg.messageText || '',
          );
          success = true;
        } else {
          throw Error(
            `Worker Service :: ${msg.phoneNumber}, ${msg.messageSid} :: Incorrect Campaign definition :: ${questionStep.stepId}'s field property doesn't exist.`,
          );
        }
      }

      return success;
    }

    let flowId: string = context.flowId;
    let stepId: string = context.currentStepId;
    const submissionId: string = context.submissionId;
    let conversationState: ConversationState = state;
    let stateChange: boolean = false;

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
    }

    if (state == ConversationState.AWAITING_REPLY) {
      stateChange = await textProcessor();
    }

    let response: string = questionStep.fallbackMessage || RESPONSE.GENERIC_FALLBACK_MESSAGE;
    if (stateChange) {
      console.debug(
        `Worker Service :: Updating conversation context in User table for ${msg.phoneNumber}, flowId: ${flowId}, stepId: ${stepId}`,
      );
      if (questionStep.runFlow) {
        flowId = questionStep.runFlow;
        stepId = (await this.campaignLoaderService.getCampaignDefinition(questionStep.runFlow))
          .steps[0].stepId;
        // submissionId = createSubmission;
      } else {
        stepId = questionStep.nextStepId || '';
      }
      await this.userRepository.updateConversation(
        msg.phoneNumber,
        conversationState,
        submissionId,
        flowId,
        stepId,
      );
      response = RESPONSE.GENERIC_ACK;
      if (stepId) {
        response = (await this.campaignLoaderService.getQuestionStep(flowId, stepId)).prompt;
      }
    } else {
      console.info(
        `Worker Service :: incorrect response by ${msg.phoneNumber} with message SID: ${msg.messageSid}. Sending fallback message`,
      );
    }
    outgoingMsgBuilder.setBody(response);
    return outgoingMsgBuilder.build();
  }
}
