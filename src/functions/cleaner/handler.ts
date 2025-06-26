/**
 * @author Daksh Pratap Singh
 * @email daksh204singh@gmail.com
 * @desc Cleaner handler.
 */

import 'reflect-metadata';
import { container } from 'tsyringe';
import { IAppConfigToken, AppConfig } from '../../configs/AppConfig';
import { UserProfileRepository } from '../../repositories/UserProfileRepository';
import { CleanerService } from '../../services/CleanerService';
import { IUser } from '../../models/User';
import { MongooseConnectionService } from '../../infrastructure/mongoose';
import {
  ISubmissionRepositoryProviderToken,
  SubmissionRepositoryProvider,
} from '../../repositories/CampaignSubmissionRepositoryProvider';
import { IS3ServiceToken, S3Service } from '../../infrastructure/S3Service';

container.registerSingleton(IAppConfigToken, AppConfig);
container.registerSingleton(UserProfileRepository);
container.registerSingleton(CleanerService);
container.registerSingleton(MongooseConnectionService);
container.registerSingleton(ISubmissionRepositoryProviderToken, SubmissionRepositoryProvider);
container.registerSingleton(IS3ServiceToken, S3Service);

container.resolve(IAppConfigToken);
const cleanerService: CleanerService = container.resolve(CleanerService);
const mongooseConnectionService: MongooseConnectionService =
  container.resolve(MongooseConnectionService);
container.resolve(ISubmissionRepositoryProviderToken);
container.resolve(IS3ServiceToken);

export const handler = async (event: unknown): Promise<void> => {
  console.log('Cleaner Lambda :: Received cron event:', JSON.stringify(event, null, 2));
  await mongooseConnectionService.connect();
  try {
    const usersToDelete: IUser[] = await cleanerService.getUsersAwaitingDeletion();
    if (!usersToDelete || usersToDelete.length === 0) {
      console.log('Cleaner Lambda :: No users found awaiting deletion.');
      return;
    }

    const deletionPromises: Promise<void>[] = usersToDelete.map((user) =>
      cleanerService.processUserDataDeletion(user).catch((err) => {
        console.error(`Cleaner.handler :: Failed to delete data for user ${user.phone}:`, err);
      }),
    );

    await Promise.all(deletionPromises);
    console.log(
      `Cleaner.handler :: Completed processing for ${usersToDelete.length} users awaiting deletion.`,
    );
  } catch (err: unknown) {
    console.error('Cleaner.handler :: Critical error during cron execution:', err);
    throw err;
  }
};
