/**
 * @author Daksh Pratap Singh
 * @email daksh204singh@gmail.com
 * @desc Text response handler. Includes numbers as well.
 */
import { IAppConfig } from '../../configs/AppConfig';
import { CampaignId } from '../../constants/CampaignId';
import { FileScanStatus } from '../../constants/FileScanStatus';
import { VirusScanStatus } from '../../constants/VirusScanResult';
import { S3Service } from '../../infrastructure/S3Service';
import { TwilioClient } from '../../infrastructure/twilio';
import { validateWithRegex } from '../../libs/messageHelper';
import { IMedia } from '../../models/Media';
import { IS3ObjectMetadata } from '../../models/s3/S3ObjectMetadata';
import { IS3ObjectTags } from '../../models/s3/S3ObjectTags';
import { ISubmissionRepositoryProvider } from '../../repositories/CampaignSubmissionRepositoryProvider';
import { ISubmissionRepository } from '../../repositories/ICampaignSubmissionRepository';
import { IInputHandlerContext, IInputHandlerResult, IInputHandler } from './InputHandler';

export class MediaInputHandler implements IInputHandler {
  constructor(
    private repositoryProvider: ISubmissionRepositoryProvider,
    private twilioClient: TwilioClient,
    private s3Service: S3Service,
    private appConfig: IAppConfig,
  ) {}

  async process(context: IInputHandlerContext): Promise<IInputHandlerResult> {
    const { campaignId, step, submissionId, message } = context;
    const { phoneNumber, messageSid, numMedia, mediaUrls, mediaContentTypes } = message;

    console.info(
      `MediaInputHandler.#processor :: Processing user's media response for ${message.phoneNumber} with message SID: ${message.messageSid}`,
    );
    const repository: ISubmissionRepository =
      this.repositoryProvider.getSubmissionRepository(campaignId);

    if (!step.validationRegex) {
      console.error(
        `MediaInputHandler.process :: Invalid step: ${step.stepId} defnition for campaign: ${campaignId}`,
      );
      throw new Error(`Invalid campaign definition: ${campaignId}, step: ${step.stepId}`);
    }
    if (!numMedia || !mediaUrls || !mediaContentTypes) {
      console.warn(
        `MediaInputHandler :: ${numMedia}, ${mediaUrls?.toString()}, ${mediaContentTypes?.toString()} for ${messageSid} from ${phoneNumber}`,
      );
      return {
        status: false,
        nextStepId: undefined,
        flowId: step.runFlow ? (step.runFlow as CampaignId) : campaignId,
      };
    }
    const idx = mediaContentTypes.findIndex((contentType) =>
      validateWithRegex(contentType, new RegExp(step.validationRegex as string)),
    );
    if (!mediaUrls[idx]) {
      console.warn(
        `MediaInputHandler :: No media uploaded by ${phoneNumber} with ${messageSid} for campaign: ${campaignId} and step: ${step.stepId}.`,
      );
      return {
        status: false,
        nextStepId: undefined,
        flowId: campaignId,
      };
    }
    try {
      const media: IMedia = await this.#uploadCampaignMedia(
        campaignId,
        phoneNumber,
        submissionId,
        mediaUrls[idx],
        mediaContentTypes[idx],
        messageSid,
      );
      console.debug(
        `MediaInputHandler.process :: Media uploaded successfully for ${phoneNumber} with MsgSid: ${messageSid} :: `,
        media,
      );
      if (repository && typeof repository.addOrUpdateMediaToSubmission === 'function') {
        await repository.addOrUpdateMediaToSubmission(submissionId, media);
      } else {
        console.error(
          `Worker Service :: Submission repository or addOrUpdateMediaToSubmission method is undefined for ${campaignId}.`,
        );
        throw new Error(
          `Submission repository or addOrUpdateMediaToSubmission method is undefined for ${campaignId}.`,
        );
      }
    } catch (error: unknown) {
      console.error(
        `Worker Service :: Upload failed for ${messageSid} from ${phoneNumber} with url: ${mediaUrls[idx]} :: error`,
        error,
      );
      throw new Error(`Couldn't upload file media file to media bucket.`);
    }
    return {
      status: true,
      nextStepId: step.nextStepId,
      flowId: step.runFlow ? (step.runFlow as CampaignId) : campaignId,
    };
  }

  async #uploadCampaignMedia(
    campaignId: CampaignId,
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
      scanStatus: FileScanStatus.PENDING,
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
      virus_scan: { checkedAt: new Date(), result: VirusScanStatus.NOT_AVAILABLE },
    };
  }
}
