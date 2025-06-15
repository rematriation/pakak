/**
 * @author Daksh Pratap Singh
 * @email daksh204singh@gmail.com
 * @desc Dispatcher lambda handler
 */

import 'reflect-metadata';
import { container } from 'tsyringe';
import { UserRepository } from '../../repositories/UserRepository';
import { SQSEvent } from 'aws-lambda';
import { AppConfig, IAppConfigToken } from '../../configs/AppConfig';
import { IOutgoingMessage } from '../../models/OutgoingMessage';
import { DispatcherService } from '../../services/DispatcherService';
import { TwilioClient } from '../../infrastructure/twilio';

container.register(IAppConfigToken, { useClass: AppConfig });

container.register(UserRepository, { useClass: UserRepository });
container.resolve(UserRepository);

container.register(DispatcherService, { useClass: DispatcherService });
const dispatcherService: DispatcherService = container.resolve(DispatcherService);

container.register(TwilioClient, { useClass: TwilioClient });
container.resolve(TwilioClient);

export const handler = async (event: SQSEvent): Promise<void> => {
  console.debug('Dispatcher Lambda :: Received SQS event:', JSON.stringify(event, null, 2));
  for (const record of event.Records) {
    const message = JSON.parse(record.body) as IOutgoingMessage;
    try {
      console.info(
        `Dispatcher Handler :: Dispatching message to: ${message.to}, sending from: ${message.from}`,
      );
      await dispatcherService.dispatch(message);
    } catch (err: unknown) {
      console.error(
        `Worker Lambda :: error encountered while trying to process the message: ${record.body}. error :: `,
        err,
      );
      throw err;
    }
  }
};
