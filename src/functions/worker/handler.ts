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
import { TWI_ML_RESPONSE } from '../../constants/StaticResponses';
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

container.register(ICampaignLoaderServiceToken, { useClass: CampaignLoaderService });
container.resolve(CampaignLoaderService);

container.register(WorkerService, { useClass: WorkerService });
const workerService: WorkerService = container.resolve(WorkerService);

export const handler = async (event: SQSEvent): Promise<void> => {
  await mongooseConnectionService.connect();
  console.debug('Worker Handler :: Received SQS event:', JSON.stringify(event, null, 2));
  for (const record of event.Records) {
    let incommingMessage: IIncomingMessage;
    try {
      incommingMessage = JSON.parse(record.body) as IIncomingMessage;
      let outgoingMsg: IOutgoingMessage;
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
        } else {
          // unknown error. rethrow to let outer catch handle.
          throw err;
        }
      } finally {
        outgoingMsg = {
          replyForMsgSid: incommingMessage.messageSid,
          to: incommingMessage.phoneNumber,
          from: appConfig.twilioNumber,
          body: TWI_ML_RESPONSE.GENERIC_ERROR,
        };
        console.info(`Worker Handler :: Pushing reply to outgoing queue :: msg: `, outgoingMsg);
        await sqsService.sendMessage(
          appConfig.outgoingSqsQueueUrl,
          JSON.stringify(outgoingMsg),
          outgoingMsg.to,
        );
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
