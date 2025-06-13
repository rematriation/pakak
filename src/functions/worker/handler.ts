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
import { TWI_ML_RESPONSE } from '../../constants/TwiMLResponse';
import { SQSService, ISQSServiceToken, ISQSService } from '../../libs/SQSService';
import { AppConfig, IAppConfigToken } from '../../configs/AppConfig';
import { IIncomingMessage } from '../../models/IncomingMessage';
import { UserProfileRepository } from '../../repositories/UserProfileRepository';
import { IOutgoingMessage } from '../../models/OutgoingMessage';
import { WorkerService } from '../../services/WorkerService';

container.register(IAppConfigToken, { useClass: AppConfig });
const appConfig: AppConfig = container.resolve(IAppConfigToken);
container.resolve(UserRepository);
container.register(ISQSServiceToken, { useClass: SQSService });
const sqsService: ISQSService = container.resolve(ISQSServiceToken);
container.resolve(UserProfileRepository);

const workerService: WorkerService = container.resolve(WorkerService);

export const handler = async (event: SQSEvent): Promise<void> => {
  console.log('Worker Handler :: Received SQS event:', JSON.stringify(event, null, 2));
  for (const record of event.Records) {
    let incommingMessage: IIncomingMessage;
    try {
      incommingMessage = JSON.parse(record.body) as IIncomingMessage;
      try {
        console.info(
          `Worker Handler :: Processing message for: ${incommingMessage.phoneNumber}, SID: ${incommingMessage.messageSid}`,
        );
        await workerService.processMessage(incommingMessage);
      } catch (err: unknown) {
        if (err instanceof AppError) {
          console.warn(
            `Worker Lambda :: Couldn't process the message: ${record.body} :: error: `,
            err,
          );
          const outgoingMessage: IOutgoingMessage = {
            to: incommingMessage.phoneNumber,
            from: appConfig.twilioNumber,
            body: TWI_ML_RESPONSE.GENERIC_ERROR,
          };
          console.info(
            `Worker Lambda :: Pushing generic error message to outgoing queue :: msg: `,
            outgoingMessage,
          );
          await sqsService.sendMessage(
            appConfig.outgoingSqsQueueUrl,
            JSON.stringify(outgoingMessage),
            outgoingMessage.to,
          );
        } else {
          // unknown error. rethrow to let outer catch handle.
          throw err;
        }
      }
    } catch (err: unknown) {
      console.error(
        `Worker Lambda :: error encountered while trying to process the message: ${record.body}. error :: `,
        err,
      );
      throw err;
    }
  }
};
