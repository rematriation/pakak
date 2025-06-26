import 'reflect-metadata';
import { S3Event } from 'aws-lambda';
import { VirusScanStatus } from '../../constants/VirusScanResult';
import { IScanResult } from '../../models/IScanResult';
import { ScannerService } from '../../services/ScannerService';
import { container } from 'tsyringe';
import { ISQSService, ISQSServiceToken, SQSService } from '../../infrastructure/SQSService';
import { AppConfig, IAppConfigToken } from '../../configs/AppConfig';
import { IS3ObjectData } from '../../models/s3/S3ObjectData';
import { IS3Service, IS3ServiceToken, S3Service } from '../../infrastructure/S3Service';
import { IOutgoingMessage } from '../../models/OutgoingMessage';
import { ClamAVClient, IClamAVClientToken } from '../../infrastructure/ClamAVClient';
import {
  ISubmissionRepositoryProviderToken,
  SubmissionRepositoryProvider,
} from '../../repositories/CampaignSubmissionRepositoryProvider';
import { MongooseConnectionService } from '../../infrastructure/mongoose';

container.registerSingleton(IAppConfigToken, AppConfig);
const appConfig: AppConfig = container.resolve(IAppConfigToken);

container.registerSingleton(MongooseConnectionService);
const mongooseConnectionService: MongooseConnectionService =
  container.resolve(MongooseConnectionService);

container.registerSingleton(ISQSServiceToken, SQSService);
const sqsService: ISQSService = container.resolve(ISQSServiceToken);

container.registerSingleton(IS3ServiceToken, S3Service);
const s3Service: IS3Service = container.resolve(IS3ServiceToken);

container.registerSingleton(IClamAVClientToken, ClamAVClient);
container.resolve(IClamAVClientToken);

container.registerSingleton(ISubmissionRepositoryProviderToken, SubmissionRepositoryProvider);
container.resolve(ISubmissionRepositoryProviderToken);

container.registerSingleton(ScannerService);
const scannerService: ScannerService = container.resolve(ScannerService);

export const handler = async (event: S3Event): Promise<void> => {
  await mongooseConnectionService.connect();
  for (const record of event.Records) {
    const sourceBucket = record.s3.bucket.name;
    const sourceKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
    console.log(`ScannerHandler :: New file detected in ${sourceBucket}: ${sourceKey}`);
    try {
      const s3FileObject: IS3ObjectData = await s3Service.getFile(sourceBucket, sourceKey);
      const scanResult: IScanResult = await scannerService.scan(s3FileObject);
      if (scanResult.virusScanStatus != VirusScanStatus.CLEAN) {
        console.warn(
          `Scanner.handler :: ${scanResult.virusScanStatus} for ${sourceKey} from bucket ${sourceBucket}. Pushing message to admin phone...`,
        );
        await sqsService.sendMessage(
          appConfig.outgoingSqsQueueUrl,
          scanResult.outgoingMessage as IOutgoingMessage,
          appConfig.adminPhone,
        );
      }
    } catch (error) {
      console.error(
        `Scanner.handler :: FAILED to process file ${sourceKey} from bucket ${sourceBucket}.`,
        error,
      );
      throw error;
    }
  }
};
