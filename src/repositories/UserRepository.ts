import { IUser, UserModel } from '../models/User';
import { Condition } from 'dynamoose/dist/Condition';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { checkErrorisConditionalCheckFailedException } from '../libs/dynamoose';
import { injectable } from 'tsyringe';

@injectable()
export class UserRepository {
  async getUser(phone: string): Promise<IUser | null> {
    const raw = await UserModel.get(phone);
    return raw as unknown as IUser | null;
  }

  async createUser(data: Omit<IUser, 'createdAt' | 'updatedAt'>): Promise<void> {
    try {
      const created = await UserModel.create(data);
      console.info('UserRepository.createUser :: User created successfully. User: ', created);
    } catch (err: unknown) {
      if (checkErrorisConditionalCheckFailedException(err)) {
        // User creation duplicated
        console.warn('UserRepository.createUser :: User already exists.');
      }

      console.error('UserRepository.createUser :: user creation failed.');
      throw err;
    }
  }

  async setSubscription(phone: string, optIn: boolean): Promise<void> {
    await UserModel.update({ phone }, { subscriptionStatus: optIn, isProcessingMessage: 0 });
  }

  async setAwaitingDeletion(phone: string, flag: 0 | 1): Promise<void> {
    await UserModel.update(
      { phone },
      { awaitingDeletion: flag, subscriptionStatus: false, isProcessingMessage: 0 },
    );
  }

  /**
   * Attempts to acquire a processing lock for a user.
   * This method uses a conditional update to ensure only one process
   * can claim the lock at a time, or if a previous lock has expired via TTL.
   *
   * @param phone The user's phone number.
   * @param ttlSeconds The duration in seconds for which the lock should be valid.
   * @returns {Promise<boolean>} True if the lock was acquired, false if the lock is already held.
   * @throws {Error} Throws an error for unexpected DynamoDB issues.
   */
  async acquireProcessingLock(phone: string, ttlSeconds: number): Promise<boolean> {
    const expirationTime = Math.floor(Date.now() / 1000) + ttlSeconds;
    try {
      const condition = new Condition()
        .attribute('isProcessingMessage')
        .not()
        .exists()
        .or()
        .attribute('isProcessingMessage')
        .lt(Math.floor(Date.now() / 1000));
      await UserModel.update({ phone }, { isProcessingMessage: expirationTime }, { condition });
      return true;
    } catch (err: unknown) {
      const error = err as {
        name?: string;
        code?: string;
      };

      const isConditionalFail =
        error instanceof ConditionalCheckFailedException ||
        error.name === 'ConditionalCheckFailedException' ||
        error.code === 'ConditionalCheckFailedException' ||
        error.name === 'ConditionalCheckFailed' ||
        error.code === 'ConditionalCheckFailed';

      if (isConditionalFail) {
        console.warn('UserRepository.acquireProcessingLock :: Lock already taken.');
        return false;
      }
      throw err;
    }
  }

  /**
   * Releases the processing lock for a user.
   * This should be called once message processing for the user is complete.
   *
   * @param phone The user's phone number.
   */
  async releaseProcessingLock(phone: string): Promise<void> {
    try {
      await UserModel.update({ phone }, { isProcessingMessage: 0 });
      console.log(`UserRepository.releaseProcessingLock :: Processing lock released for ${phone}`);
    } catch (error) {
      /**
       * If the above try fails, the lock will expire by TTL if it was acquired.
       */
      console.error(
        `UserRepository,releaseProcessingLock :: Error releasing processing lock for ${phone}:`,
        error,
      );
    }
  }
}
