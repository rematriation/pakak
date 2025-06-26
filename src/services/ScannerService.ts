import { inject, injectable } from 'tsyringe';
import { IAppConfig, IAppConfigToken } from '../configs/AppConfig';
import { IS3Service, IS3ServiceToken } from '../infrastructure/S3Service';
import { IS3ObjectData } from '../models/s3/S3ObjectData';
import { IScanResult } from '../models/IScanResult';
import { IClamAVClientToken, IClamAVClient } from '../infrastructure/ClamAVClient';
import { VirusScanStatus } from '../constants/VirusScanResult';
import {
  ISubmissionRepositoryProvider,
  ISubmissionRepositoryProviderToken,
} from '../repositories/CampaignSubmissionRepositoryProvider';
import { IMedia } from '../models/Media';
import { ICampaignSubmissionRepository } from '../repositories/ICampaignSubmissionRepository';
import { IOutgoingMessage } from '../models/OutgoingMessage';
import { OutgoingMessageBuilder } from '../libs/builders/OutgoingMessageBuilder';

@injectable()
export class ScannerService {
  constructor(
    @inject(IAppConfigToken) private appConfig: IAppConfig,
    @inject(IS3ServiceToken) private s3Service: IS3Service,
    @inject(IClamAVClientToken) private clamAVClient: IClamAVClient,
    @inject(ISubmissionRepositoryProviderToken)
    @inject(ISubmissionRepositoryProviderToken)
    private repositoryProvider: ISubmissionRepositoryProvider,
  ) {}

  async scan(s3FileObject: IS3ObjectData): Promise<IScanResult> {
    try {
      console.debug(`ScannerService.scan :: received to scan `, s3FileObject);
      if (!s3FileObject.tags) {
        console.error(
          `ScannerService.scan :: no tags exist for this file. Unable to identify which campaign/submissionId it belongs to. Key: ${s3FileObject.key}, bucket: ${s3FileObject.bucket}`,
        );
        throw new Error(
          `S3: No tags found. Key: ${s3FileObject.key}, Bucket: ${s3FileObject.bucket}`,
        );
      }
      const { campaignId, submissionId } = s3FileObject.tags;
      const repository: ICampaignSubmissionRepository =
        this.repositoryProvider.getSubmissionRepository(
          campaignId,
        ) as ICampaignSubmissionRepository;
      let bucket: string;
      const [virusScanStatus, message] = await this.clamAVClient.scanStream(s3FileObject.body);
      if (virusScanStatus === VirusScanStatus.CLEAN) {
        bucket = this.appConfig.cleanBucketName;
        console.info(
          `ScannerService.scan :: ${message} for ${s3FileObject.key} in ${s3FileObject.bucket}. Moving to ${bucket} from ${s3FileObject.bucket}`,
        );
      } else {
        bucket = this.appConfig.quarantineBucketName;
        console.warn(
          `ScannerService.scan :: ${message} detected while scanning ${s3FileObject.key} in ${s3FileObject.bucket}. Moving to ${bucket} from ${s3FileObject.bucket}`,
        );
      }

      const url = await this.s3Service.moveFile(
        s3FileObject.bucket,
        s3FileObject.key,
        bucket,
        s3FileObject.key,
      );
      console.debug(
        `ScannerService.scan :: ${url} for ${s3FileObject.key} in ${bucket} associated with submissionId: ${submissionId} and campaignId: ${campaignId}`,
      );

      const media: IMedia = {
        bucket: bucket,
        key: s3FileObject.key,
        url: url,
        mime_type: s3FileObject.contentType,
        virus_scan: {
          checkedAt: new Date(),
          result: virusScanStatus,
        },
      };

      await repository.addOrUpdateMediaToSubmission(submissionId, media);
      const outgoingMessage: IOutgoingMessage = new OutgoingMessageBuilder(
        s3FileObject.tags.msgSid,
        this.appConfig.adminPhone,
        this.appConfig.twilioNumber,
      )
        .setBody(
          `Virus scan status: ${submissionId}, result: ${message}, key: ${s3FileObject.key}, bucket: ${bucket}`,
        )
        .build();
      console.debug(`ScannerService.scan :: outgoing message constructed.`, outgoingMessage);
      return {
        virusScanStatus: virusScanStatus,
        outgoingMessage: outgoingMessage,
      };
    } catch (error: unknown) {
      console.error('ScannerService.scan :: Scan failed. Please check error logs.', error);
      throw error;
    }
  }
}
