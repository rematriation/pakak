import { IUser, UserModel } from '../models/User';
import { Condition } from 'dynamoose/dist/Condition';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { checkErrorisConditionalCheckFailedException } from '../infrastructure/dynamoose';
import { injectable } from 'tsyringe';
import { ConversationState } from '../constants/ConversationState';
import { DeletionStatus } from '../constants/DeletionStatus';

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
    await UserModel.update(
      { phone },
      {
        subscriptionStatus: optIn,
        isProcessingMessage: 0,
        conversationState: ConversationState.IDLE,
      },
    );
  }

  async setDeletionStatus(phone: string, flag: DeletionStatus): Promise<void> {
    await UserModel.update(
      { phone },
      { deletionStatus: flag, subscriptionStatus: false, isProcessingMessage: 0 },
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

  /**
   * Updates a user's conversation state and campaign context data in a single atomic operation.
   *
   * @param phone The user's phone number.
   * @param conversationState The new state of the conversation.
   * @param flowId The current flow ID.
   * @param currentStepId The current step ID within the flow.
   */
  async updateConversation(
    phone: string,
    conversationState: ConversationState,
    submissionId: string,
    flowId: string,
    currentStepId: string,
  ): Promise<void> {
    const updatesLog = {
      conversationState,
      campaignContext: { submissionId, flowId, currentStepId },
    };
    try {
      await UserModel.update(
        { phone },
        {
          conversationState: conversationState,
          campaignContext: {
            submissionId: submissionId,
            flowId: flowId,
            currentStepId: currentStepId,
          },
        },
      );
      console.debug(
        `UserRepository.updateConversation :: Updated conversation context for ${phone} with ${JSON.stringify(updatesLog)}`,
      );
    } catch (error) {
      console.error(
        `UserRepository.updateConversation :: Error updating conversation context for ${phone}:`,
        error,
        ` :: updates:  `,
        updatesLog,
      );
      throw error;
    }
  }

  async clearConversationState(phone: string): Promise<void> {
    console.debug(`UserRepository :: Clear conversation state for ${phone}`);
    await UserModel.update(
      { phone },
      {
        conversationState: ConversationState.IDLE,
        conversationContextData: {},
        isProcessingMessage: 0,
      },
    );
  }

  /**
   * Retrieves users from DynamoDB based on their awaitingDeletion flag.
   * This queries the 'DeletionStatusIndex'.
   * @param flag The awaitingDeletion flag value (0 or 1).
   * @returns A Promise resolving to an array of IUser (DynamoDB User) objects.
   * @throws Error if the query fails.
   */
  public async getUsersByDeletionFlag(flag: DeletionStatus): Promise<IUser[]> {
    try {
      const users = await UserModel.query({
        deletionStatus: {
          eq: flag,
        },
      })
        .using('DeletionStatusIndex')
        .exec();
      return users as unknown as IUser[];
    } catch (error) {
      console.error(`UserRepository :: Error querying users by deletion flag ${flag}:`, error);
      throw error;
    }
  }

  public async incrementRateLimitCounter(phone: string): Promise<void> {
    await UserModel.update({ phone }, { $ADD: { rateLimitCounter: 1 } });
  }

  /**
   * Resets the user's rate limit counter to 1 and sets a new expiration timestamp (number) for the window.
   * This is called when the previous rate limit window has expired.
   *
   * @param phone The user's phone number.
   * @param expiresAt The Unix timestamp (in seconds, as a number) when the new window expires.
   * @returns A Promise that resolves when the update is complete.
   * @throws Error if the update fails.
   */
  public async resetRateLimit(phone: string, expiresAt: number): Promise<void> {
    try {
      await UserModel.update(
        { phone },
        {
          rateLimitCounter: 1,
          rateLimitWindowExpiresAt: expiresAt,
        },
      );
      const expiresAtDate: Date = new Date(expiresAt * 1000);
      console.log(
        `UserRepository :: Rate limit reset for ${phone}. Counter: 1, Expires: ${expiresAtDate.toUTCString()}.`,
      );
    } catch (error) {
      console.error(`UserRepository :: Error resetting rate limit for ${phone}:`, error);
      throw error;
    }
  }
}
