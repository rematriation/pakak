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
import { ICampaignDefinition } from '../models/CampaignDefinition';
import { ConversationState } from '../constants/ConversationState';
import { IUser } from '../models/User';
import { ICampaignContext } from '../models/CampaignContext';
import { IOutgoingMessage } from '../models/OutgoingMessage';
import { OutgoingMessageBuilder } from '../libs/builders/OutgoingMessageBuilder';
import { RESPONSE } from '../constants/StaticResponses';
import {
  ISubmissionRepositoryProvider,
  ISubmissionRepositoryProviderToken,
} from '../repositories/CampaignSubmissionRepositoryProvider';
import { Types } from 'mongoose';
import { IS3Service, IS3ServiceToken } from '../infrastructure/S3Service';
import { InputHandlerProvider } from './input-helpers/InputHandlerProvider';
import { IInputHandlerResult } from './input-helpers/InputHandler';

@injectable()
export class WorkerService {
  constructor(
    private userRepository: UserRepository,
    private userProfileRepository: UserProfileRepository,
    private inputHandlerProvider: InputHandlerProvider,
    @inject(IAppConfigToken) private appConfig: IAppConfig,
    @inject(ICampaignLoaderServiceToken) private campaignLoaderService: ICampaignLoaderService,
    @inject(ISubmissionRepositoryProviderToken)
    private repositoryProvider: ISubmissionRepositoryProvider,
    @inject(IS3ServiceToken) private s3Service: IS3Service,
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
    );
  }

  async #setUserProfileCreationFlow(phoneNumber: string, messageSID: string): Promise<void> {
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
    msg: IIncomingMessage,
    state: ConversationState,
    context: ICampaignContext,
  ): Promise<IOutgoingMessage> {
    let questionStep = await this.campaignLoaderService.getQuestionStep(
      context.flowId,
      context.currentStepId,
    );
    const responseStrs: Array<string> = [];
    let conversationStateChange: boolean = false;
    let flowId: CampaignId = context.flowId;
    let stepId: string = context.currentStepId;
    let submissionId: string = context.submissionId;

    if (state === ConversationState.IDLE) {
      state = ConversationState.AWAITING_REPLY;
      responseStrs.push(questionStep.prompt);
      conversationStateChange = true;
    } else {
      const result: IInputHandlerResult = await this.inputHandlerProvider
        .getHandler(questionStep.expectedResponseType)
        .process({
          campaignId: flowId,
          step: questionStep,
          submissionId: context.submissionId,
          message: msg,
        });
      if (result.status) {
        conversationStateChange = true;
        responseStrs.push(RESPONSE.GENERIC_ACK);
        if (result.nextStepId) {
          questionStep = await this.campaignLoaderService.getQuestionStep(
            flowId,
            result.nextStepId,
          );
          responseStrs.push(questionStep.prompt);
        }
        stepId = result.nextStepId || '';
      } else {
        responseStrs.push(questionStep.fallbackMessage || RESPONSE.GENERIC_FALLBACK_MESSAGE);
      }
    }

    if (questionStep.runFlow) {
      // jump to the flow referenced.
      flowId = questionStep.runFlow as CampaignId;
      questionStep = (await this.campaignLoaderService.getCampaignDefinition(flowId)).steps[0];
      stepId = questionStep.stepId;
      responseStrs.push(questionStep.prompt);

      // create a submission entry since we're running a new campaign/flow which would need its own submission entry.
      submissionId = await this.#createSubmissionEntryForCampaign(msg.phoneNumber, flowId);
    }

    state = stepId ? ConversationState.AWAITING_REPLY : ConversationState.IDLE;
    if (conversationStateChange) {
      console.debug(
        `WorkerService.campaignRunner :: Updating conversation context in User table for ${msg.phoneNumber}, flowId: ${flowId}, stepId: ${stepId}`,
      );
      await this.userRepository.updateConversation(
        msg.phoneNumber,
        state,
        submissionId,
        flowId,
        stepId,
      );
    }
    const outgoingMsg: IOutgoingMessage = new OutgoingMessageBuilder(
      msg.messageSid,
      msg.phoneNumber,
      this.appConfig.twilioNumber,
    )
      .setBody(responseStrs.join('\n'))
      .build();
    console.debug(
      `WorkerService.campaignRunner :: Constructed response for ${msg.phoneNumber} with MsgSid: ${msg.messageSid} :: `,
      outgoingMsg,
    );
    return outgoingMsg;
  }

  async #createSubmissionEntryForCampaign(phoneNumber: string, flowId: string): Promise<string> {
    const repository = this.repositoryProvider.getSubmissionRepository(flowId as CampaignId);
    if (repository && typeof repository.createSubmission === 'function') {
      return (
        (await repository.createSubmission(flowId, phoneNumber))._id as Types.ObjectId
      ).toString();
    } else {
      throw new Error(
        `WorkerService.#createSubmissionEntryForCampaign :: Submission repository or createSubmission method is undefined for ${flowId}.`,
      );
    }
  }
}
