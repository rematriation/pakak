/**
 * @author Daksh Pratap Singh
 * @email daksh204singh@gmail.com
 * @desc Worker lambda handler.
 */

import 'reflect-metadata';
import { container } from 'tsyringe';
import { UserRepository } from '../../repositories/UserRepository';
import { SQSEvent } from 'aws-lambda';
import { AppError } from '../../libs/errors/AppError';
import { RESPONSE } from '../../constants/StaticResponses';
import { SQSService, ISQSServiceToken, ISQSService } from '../../infrastructure/SQSService';
import { AppConfig, IAppConfigToken } from '../../configs/AppConfig';
import { IIncomingMessage } from '../../models/IncomingMessage';
import { UserProfileRepository } from '../../repositories/UserProfileRepository';
import { IOutgoingMessage } from '../../models/OutgoingMessage';
import { WorkerService } from '../../services/WorkerService';
import {
  CampaignLoaderService,
  ICampaignLoaderServiceToken,
} from '../../infrastructure/CampaignLoaderService';
import { MongooseConnectionService } from '../../infrastructure/mongoose';
import { CampaignSubmissionRepository } from '../../repositories/CampaignSubmissionRepository';
import {
  ISubmissionRepositoryProviderToken,
  SubmissionRepositoryProvider,
} from '../../repositories/CampaignSubmissionRepositoryProvider';
import { IS3ServiceToken, S3Service } from '../../infrastructure/S3Service';
import { TwilioClient } from '../../infrastructure/twilio';
import { InputHandlerProvider } from '../../services/input-helpers/InputHandlerProvider';

container.register(IAppConfigToken, { useClass: AppConfig });
const appConfig: AppConfig = container.resolve(IAppConfigToken);

container.register(MongooseConnectionService, { useClass: MongooseConnectionService });
const mongooseConnectionService: MongooseConnectionService =
  container.resolve(MongooseConnectionService);

container.register(UserRepository, { useClass: UserRepository });
container.resolve(UserRepository);

container.register(ISQSServiceToken, { useClass: SQSService });
const sqsService: ISQSService = container.resolve(ISQSServiceToken);

container.register(UserProfileRepository, { useClass: UserProfileRepository });
container.resolve(UserProfileRepository);

container.register(CampaignSubmissionRepository, { useClass: CampaignSubmissionRepository });
container.resolve(CampaignSubmissionRepository);

container.register(ICampaignLoaderServiceToken, { useClass: CampaignLoaderService });
container.resolve(CampaignLoaderService);

container.register(ISubmissionRepositoryProviderToken, {
  useClass: SubmissionRepositoryProvider,
});
container.resolve(ISubmissionRepositoryProviderToken);

container.register(IS3ServiceToken, { useClass: S3Service });
container.resolve(IS3ServiceToken);

container.register(TwilioClient, { useClass: TwilioClient });
container.resolve(TwilioClient);

container.registerSingleton(InputHandlerProvider);
container.resolve(InputHandlerProvider);

container.register(WorkerService, { useClass: WorkerService });
const workerService: WorkerService = container.resolve(WorkerService);

export const handler = async (event: SQSEvent): Promise<void> => {
  let outgoingMsg: IOutgoingMessage | null = null;
  await mongooseConnectionService.connect();
  console.debug('Worker Handler :: Received SQS event:', JSON.stringify(event, null, 2));
  for (const record of event.Records) {
    let incommingMessage: IIncomingMessage;
    try {
      incommingMessage = JSON.parse(record.body) as IIncomingMessage;
      try {
        console.info(
          `Worker Handler :: Processing message for: ${incommingMessage.phoneNumber}, SID: ${incommingMessage.messageSid}`,
        );
        outgoingMsg = await workerService.processMessage(incommingMessage);
      } catch (err: unknown) {
        if (err instanceof AppError) {
          console.warn(
            `Worker Handler :: Couldn't process the message: ${record.body} :: error: `,
            err,
          );
          outgoingMsg = {
            replyForMsgSid: incommingMessage.messageSid,
            to: incommingMessage.phoneNumber,
            from: appConfig.twilioNumber,
            body: RESPONSE.GENERIC_USER_ERROR,
          };
        } else {
          // unknown error. rethrow to let outer catch handle.
          throw err;
        }
      } finally {
        if (!outgoingMsg) {
          outgoingMsg = {
            replyForMsgSid: incommingMessage.messageSid,
            to: incommingMessage.phoneNumber,
            from: appConfig.twilioNumber,
            body: RESPONSE.GENERIC_ERROR,
          };
        }
        console.info(`Worker Handler :: Pushing reply to outgoing queue :: msg: `, outgoingMsg);
        await sqsService.sendMessage(appConfig.outgoingSqsQueueUrl, outgoingMsg, outgoingMsg.to);
      }
    } catch (err: unknown) {
      console.error(
        `Worker Handler :: error encountered while trying to process the message: ${record.body}. error :: `,
        err,
      );
      throw err;
    }
  }
};
