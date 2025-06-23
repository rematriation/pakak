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
import { OutgoingMessageBuilder } from '../libs/builders/OutgoingMessageBuilder';
import { RESPONSE } from '../constants/StaticResponses';
import { ICampaignSubmissionRepository } from '../repositories/ICampaignSubmissionRepository';
import {
  ICampaignSubmissionRepositoryProvider,
  ICampaignSubmissionRepositoryProviderToken,
} from '../repositories/CampaignSubmissionRepositoryProvider';
import { Types } from 'mongoose';
import { IS3Service, IS3ServiceToken } from '../infrastructure/S3Service';
import { IMedia } from '../models/Media';
import { IS3ObjectMetadata } from '../models/s3/S3ObjectMetadata';
import { ScanStatus } from '../constants/ScanStatus';
import { IS3ObjectTags } from '../models/s3/S3ObjectTags';
import { VirusScanResult } from '../constants/VirusScanResult';
import { error } from 'console';
import { ExpectedResponseType } from '../constants/ExpectedResponseType';
import { TwilioClient } from '../infrastructure/twilio';

@injectable()
export class WorkerService {
  constructor(
    private userRepository: UserRepository,
    private userProfileRepository: UserProfileRepository,
    private twilioClient: TwilioClient,
    @inject(IAppConfigToken) private appConfig: IAppConfig,
    @inject(ICampaignLoaderServiceToken) private campaignLoaderService: ICampaignLoaderService,
    @inject(ICampaignSubmissionRepositoryProviderToken)
    private repositoryProvider: ICampaignSubmissionRepositoryProvider,
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

  // async #campaignRunner(
  //   msg: IIncomingMessage,
  //   state: ConversationState,
  //   context: ICampaignContext,
  // ): Promise<IOutgoingMessage> {
  //   let repository: ICampaignSubmissionRepository = this.repositoryProvider.getSubmissionRepository(
  //     context.flowId as CampaignId,
  //   );

  //   const imageProcessor = async (): Promise<boolean> => {
  //     let status: boolean = false;
  //     console.info(
  //       `Worker Service :: Processing user's image response for ${msg.phoneNumber} with message SID: ${msg.messageSid}`,
  //     );
  //     if (!msg.mediaUrls || !msg.mediaContentTypes) {
  //       return status;
  //     }
  //     const idx = msg.mediaContentTypes.findIndex((contentType) =>
  //       validateWithRegex(contentType, new RegExp(questionStep.validationRegex as RegExp)),
  //     );
  //     if (!msg.mediaUrls[idx]) {
  //       console.warn(
  //         `Worker Service :: No image uploaded by ${msg.phoneNumber} with ${msg.messageSid} for campaign: ${flowId} and step: ${stepId}.`,
  //       );
  //       return status;
  //     }
  //     try {
  //       const media: IMedia = await this.#uploadCampaignMedia(
  //         flowId,
  //         msg.phoneNumber,
  //         submissionId,
  //         msg.mediaUrls[idx],
  //         msg.mediaContentTypes[idx],
  //         msg.messageSid,
  //       );
  //       if (repository && typeof repository.addOrUpdateMediaToSubmission === 'function') {
  //         await repository.addOrUpdateMediaToSubmission(submissionId, media);
  //       } else {
  //         console.error(
  //           `Worker Service :: Submission repository or addOrUpdateMediaToSubmission method is undefined for ${flowId}.`,
  //           error,
  //         );
  //         throw new Error(
  //           `Submission repository or addOrUpdateMediaToSubmission method is undefined for ${flowId}.`,
  //         );
  //       }

  //       status = true;
  //     } catch (error: unknown) {
  //       console.error(
  //         `Worker Service :: Upload failed for ${msg.messageSid} from ${msg.phoneNumber} with url: ${msg.mediaUrls[idx]} :: error`,
  //         error,
  //       );
  //       throw new Error(`Couldn't upload file media file to media bucket.`);
  //     }
  //     return status;
  //   };

  //   let flowId: string = context.flowId;
  //   let stepId: string = context.currentStepId;
  //   let submissionId: string = context.submissionId;
  //   let conversationState: ConversationState = state;
  //   let stateChange: boolean = false;

  //   let questionStep: IQuestionStep = await this.campaignLoaderService.getQuestionStep(
  //     flowId,
  //     stepId,
  //   );
  //   const outgoingMsgBuilder: OutgoingMessageBuilder = new OutgoingMessageBuilder(
  //     msg.messageSid,
  //     msg.phoneNumber,
  //     this.appConfig.twilioNumber,
  //   );
  //   const response: Array<string> = [];

  //   if (state === ConversationState.IDLE) {
  //     console.info(`Worker Service :: Running campaign ${context.flowId}`);
  //     // response.push(questionStep.prompt);
  //     conversationState = ConversationState.AWAITING_REPLY;
  //     stateChange = true;
  //   } else if (state === ConversationState.AWAITING_REPLY) {
  //     stateChange = await textProcessor();
  //     if (stateChange) {
  //       response.push(RESPONSE.GENERIC_ACK);
  //     }
  //   } else if (state === ConversationState.AWAITING_IMAGE_UPLOAD) {
  //     stateChange = await imageProcessor();
  //     if (stateChange) {
  //       response.push(RESPONSE.IMAGE_SUBMISSION_SUCCESS);
  //     }
  //   } else {
  //     console.error(
  //       `Worker Service :: State ${state as string} not recognized. Campaign in undefined state. Campaign: ${flowId}, stepId: ${stepId}`,
  //     );
  //     throw new Error(`Campaign in invalid state.`);
  //   }

  //   if (stateChange || state === ConversationState.IDLE) {
  //     console.debug(
  //       `Worker Service :: Updating conversation context in User table for ${msg.phoneNumber}, flowId: ${flowId}, stepId: ${stepId}`,
  //     );
  //     if (questionStep.runFlow) {
  //       flowId = questionStep.runFlow;
  //       stepId = (await this.campaignLoaderService.getCampaignDefinition(questionStep.runFlow))
  //         .steps[0].stepId;
  //       repository = this.repositoryProvider.getSubmissionRepository(flowId as CampaignId);
  //       if (repository && typeof repository.createSubmission === 'function') {
  //         submissionId = (
  //           (await repository.createSubmission(flowId, msg.phoneNumber))._id as Types.ObjectId
  //         ).toString();
  //       } else {
  //         throw new Error(
  //           `Worker Service :: Submission repository or createSubmission method is undefined for ${flowId}.`,
  //         );
  //       }
  //     } else if (state != ConversationState.IDLE) {
  //       stepId = questionStep.nextStepId || '';
  //     }
  //     questionStep = await this.campaignLoaderService.getQuestionStep(flowId, stepId);
  //     if (questionStep.expectedResponseType === ExpectedResponseType.IMAGE) {
  //       conversationState = ConversationState.AWAITING_IMAGE_UPLOAD;
  //     } else {
  //       conversationState = ConversationState.AWAITING_REPLY;
  //     }
  //     await this.userRepository.updateConversation(
  //       msg.phoneNumber,
  //       conversationState,
  //       submissionId,
  //       flowId,
  //       stepId,
  //     );
  //     if (stepId) {
  //       response.push(questionStep.prompt);
  //     }
  //   } else {
  //     console.info(
  //       `Worker Service :: incorrect response by ${msg.phoneNumber} with message SID: ${msg.messageSid}. Sending fallback message`,
  //     );
  //   }
  //   outgoingMsgBuilder.setBody(response.join('\n'));
  //   return outgoingMsgBuilder.build();
  // }

  async #campaignRunner(
    msg: IIncomingMessage,
    state: ConversationState,
    context: ICampaignContext,
  ): Promise<IOutgoingMessage> {
    const responseStrs: Array<string> = [];
    const outgoingMsgBuilder: OutgoingMessageBuilder = new OutgoingMessageBuilder(
      msg.messageSid,
      msg.phoneNumber,
      this.appConfig.twilioNumber,
    );
    let questionStep: IQuestionStep = await this.campaignLoaderService.getQuestionStep(
      context.flowId,
      context.currentStepId,
    );
    let flowId: string = context.flowId;
    let stepId: string = context.currentStepId;
    let submissionId: string = context.submissionId;
    let conversationStateChange: boolean = false;

    if (state === ConversationState.IDLE) {
      // kickoff campaign
      state = ConversationState.AWAITING_REPLY;
      responseStrs.push(questionStep.prompt);
      conversationStateChange = true;
    } else {
      // campaign already running. need to process user input.
      if (state === ConversationState.AWAITING_REPLY) {
        // we expect a text reply. Process expected text response.
        if (msg.messageText) {
          conversationStateChange = await this.#textProcessor(
            msg.phoneNumber,
            submissionId,
            msg.messageSid,
            flowId,
            stepId,
            msg.messageText,
          );
        }
      } else if (state === ConversationState.AWAITING_IMAGE_UPLOAD) {
        // we expect an image upload. Process expected response type.
        if (msg.mediaUrls && msg.mediaContentTypes) {
          conversationStateChange = await this.#mediaProcessor(
            msg.phoneNumber,
            submissionId,
            flowId,
            stepId,
            msg.messageSid,
            msg.mediaUrls,
            msg.mediaContentTypes,
          );
        }
      } else {
        console.error(
          `WorkerService.campaignRunner :: State ${state as string} not recognized. Campaign in undefined state. Campaign: ${flowId}, stepId: ${stepId} for ${msg.phoneNumber}, MsgSid: ${msg.messageSid}`,
        );
        throw new Error(`Campaign in invalid state.`);
      }

      if (conversationStateChange) {
        // User input processed. Add general acknowledgement.
        responseStrs.push(RESPONSE.GENERIC_ACK);

        // Find next prompt and append.
        if (questionStep.nextStepId) {
          // go to the next step referenced.
          stepId = questionStep.nextStepId;
          questionStep = await this.campaignLoaderService.getQuestionStep(flowId, stepId);
          responseStrs.push(questionStep.prompt);
          if (questionStep.runFlow) {
            // jump to the flow referenced.
            flowId = questionStep.runFlow;
            questionStep = (await this.campaignLoaderService.getCampaignDefinition(flowId))
              .steps[0];
            stepId = questionStep.stepId;
            responseStrs.push(questionStep.prompt);

            // create a submission entry since we're running a new campaign/flow which would need its own submission entry.
            submissionId = await this.#createSubmissionEntryForCampaign(msg.phoneNumber, flowId);
          }
          if (questionStep.expectedResponseType === ExpectedResponseType.IMAGE) {
            state = ConversationState.AWAITING_IMAGE_UPLOAD;
          } else {
            state = ConversationState.AWAITING_REPLY;
          }
        } else {
          // otherwise set conversation state IDLE
          state = ConversationState.IDLE;
          stepId = '';
        }
      } else {
        // push fallback message
        responseStrs.push(questionStep.fallbackMessage || RESPONSE.GENERIC_FALLBACK_MESSAGE);
      }
    }

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
    const outgoingMsg: IOutgoingMessage = outgoingMsgBuilder
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

  async #uploadCampaignMedia(
    campaignId: string,
    phoneNumber: string,
    submissionId: string,
    mediaUrl: string,
    mediaContentType: string,
    msgSid: string,
  ): Promise<IMedia> {
    const bucketName = this.appConfig.rawBucketName;
    const fileExtension = mediaContentType.split('/')[1] || 'bin';
    const key = `${campaignId}/${phoneNumber}/${submissionId}_${msgSid}.${fileExtension}`;
    const buffer = await this.twilioClient.downloadMedia(mediaUrl);
    const metadata: IS3ObjectMetadata = {
      campaignId: campaignId,
      phoneNumber: phoneNumber,
      submissionId: submissionId,
      msgSid: msgSid,
      scanStatus: ScanStatus.PENDING,
    };
    const tags: IS3ObjectTags = metadata;
    const s3Url: string = await this.s3Service.uploadFile(
      bucketName,
      key,
      buffer,
      mediaContentType,
      metadata,
      tags,
    );

    return {
      bucket: bucketName,
      key: key,
      url: s3Url,
      mime_type: mediaContentType,
      size_kb: Math.round(buffer.length / 1024),
      sha256: undefined,
      virus_scan: { checkedAt: new Date(), engine: 'N/A', result: VirusScanResult.NOT_AVAILABLE },
    };
  }

  async #textProcessor(
    phoneNumber: string,
    submissionId: string,
    messageSid: string,
    flowId: string,
    stepId: string,
    messageText: string,
  ): Promise<boolean> {
    console.info(
      `WorkerService.#textProcessor :: Processing user's text response for ${phoneNumber} with Message SID: ${messageSid}`,
    );
    let status: boolean = false;
    const questionStep: IQuestionStep = await this.campaignLoaderService.getQuestionStep(
      flowId,
      stepId,
    );
    const repository: ICampaignSubmissionRepository =
      this.repositoryProvider.getSubmissionRepository(flowId as CampaignId);
    if (validateWithRegex(messageText, new RegExp(questionStep.validationRegex as string))) {
      if (questionStep.fieldName) {
        await repository.addTextResponse(submissionId, questionStep.fieldName, messageText || '');
        status = true;
      } else {
        throw Error(
          `WorkerService.#textProcessor :: ${phoneNumber}, ${messageSid} :: Incorrect Campaign definition :: ${questionStep.stepId}'s field property doesn't exist.`,
        );
      }
    }
    return status;
  }

  async #mediaProcessor(
    phoneNumber: string,
    submissionId: string,
    flowId: string,
    stepId: string,
    messageSid: string,
    mediaUrls: string[],
    mediaContentTypes: string[],
  ): Promise<boolean> {
    console.info(
      `WorkerService.#mediaProcessor :: Processing user's media response for ${phoneNumber} with message SID: ${messageSid}`,
    );
    let status: boolean = false;
    const questionStep: IQuestionStep = await this.campaignLoaderService.getQuestionStep(
      flowId,
      stepId,
    );
    const repository: ICampaignSubmissionRepository =
      this.repositoryProvider.getSubmissionRepository(flowId as CampaignId);

    const idx = mediaContentTypes.findIndex((contentType) =>
      validateWithRegex(contentType, new RegExp(questionStep.validationRegex as string)),
    );
    if (!mediaUrls[idx]) {
      console.warn(
        `Worker Service :: No media uploaded by ${phoneNumber} with ${messageSid} for campaign: ${flowId} and step: ${stepId}.`,
      );
      return false;
    }
    try {
      const media: IMedia = await this.#uploadCampaignMedia(
        flowId,
        phoneNumber,
        submissionId,
        mediaUrls[idx],
        mediaContentTypes[idx],
        messageSid,
      );
      console.debug(
        `WorkerService.mediaProcessor :: Media uploaded successfully for ${phoneNumber} with MsgSid: ${messageSid} :: `,
        media,
      );
      if (repository && typeof repository.addOrUpdateMediaToSubmission === 'function') {
        await repository.addOrUpdateMediaToSubmission(submissionId, media);
        status = true;
      } else {
        console.error(
          `Worker Service :: Submission repository or addOrUpdateMediaToSubmission method is undefined for ${flowId}.`,
          error,
        );
        throw new Error(
          `Submission repository or addOrUpdateMediaToSubmission method is undefined for ${flowId}.`,
        );
      }
    } catch (error: unknown) {
      console.error(
        `Worker Service :: Upload failed for ${messageSid} from ${phoneNumber} with url: ${mediaUrls[idx]} :: error`,
        error,
      );
      throw new Error(`Couldn't upload file media file to media bucket.`);
    }
    return status;
  }
}
