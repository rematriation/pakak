/**
 * @author Daksh Pratap Singh
 * @email daksh204singh@gmail.com
 * @desc Cleaner Service.
 */

import { inject, injectable } from 'tsyringe';
import { IUser } from '../models/User';
import { UserRepository } from '../repositories/UserRepository';
import {
  ISubmissionRepositoryProvider,
  ISubmissionRepositoryProviderToken,
} from '../repositories/CampaignSubmissionRepositoryProvider';
import { IS3Service, IS3ServiceToken } from '../infrastructure/S3Service';
import { CampaignId } from '../constants/CampaignId';
import { ICampaignSubmissionRepository } from '../repositories/ICampaignSubmissionRepository';
import { ICampaignSubmission, ICampaignSubmissionDocument } from '../models/CampaignSubmission';
import { IUserProfileDocument } from '../models/UserProfile';
import { UserProfileRepository } from '../repositories/UserProfileRepository';
import { DeletionStatus } from '../constants/DeletionStatus';

@injectable()
export class CleanerService {
  constructor(
    private userRepository: UserRepository,
    private userProfileRepository: UserProfileRepository,
    @inject(ISubmissionRepositoryProviderToken)
    private repositoryProvider: ISubmissionRepositoryProvider,
    @inject(IS3ServiceToken) private s3Service: IS3Service,
  ) {}

  public async processUserDataDeletion(user: IUser): Promise<void> {
    console.log(
      `CleanerService.processUserDataDeletion :: Initiating data deletion for user: ${user.phone}`,
    );

    try {
      await this.userRepository.setDeletionStatus(user.phone, DeletionStatus.PROCESSING);
      const userProfile: IUserProfileDocument | null =
        await this.userProfileRepository.getUserProfile(user.phone);
      if (userProfile) {
        const campaigns: CampaignId[] = (userProfile.campaignIds as CampaignId[]) || [];
        for (const campaign of campaigns) {
          await this.deleteUserSubmissionsByCampaign(user.phone, campaign);
        }
        await userProfile.deleteOne();
      } else {
        console.debug(
          `CleanerService.processUserDataDeletion :: No user profile exists for ${user.phone}`,
        );
      }
      await this.userRepository.clearConversationState(user.phone);
      // reset
      await this.userRepository.setDeletionStatus(user.phone, DeletionStatus.NOT_REQUESTED);
    } catch (error: unknown) {
      console.error(
        `CleanerService.processUserDataDeletion :: ERROR during data deletion for ${user.phone}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Retrieves users from DynamoDB who are flagged for deletion.
   * @returns A Promise resolving to an array of IUser (DynamoDB User) objects.
   * @throws Error if the query fails.
   */
  public async getUsersAwaitingDeletion(): Promise<IUser[]> {
    try {
      const users = await this.userRepository.getUsersByDeletionFlag(DeletionStatus.REQUESTED);
      return users;
    } catch (error) {
      console.error(
        'CleanerService.getUsersAwaitingDeletion :: Error getting users awaiting deletion:',
        error,
      );
      throw error;
    }
  }

  /**
   * Helper method to find and delete submissions and their associated S3 media.
   * @param phoneNumber The user's phone number.
   */
  private async deleteUserSubmissionsByCampaign(
    phoneNumber: string,
    campaignId: CampaignId,
  ): Promise<void> {
    const repository: ICampaignSubmissionRepository =
      this.repositoryProvider.getSubmissionRepository(campaignId) as ICampaignSubmissionRepository;
    const submissions: ICampaignSubmissionDocument[] =
      await repository.getSubmissionsByUser(phoneNumber);
    if (!submissions || submissions.length === 0) {
      console.log(
        `CleanerService.deleteUserSubmissionsByCampaign :: No campaign submissions found for ${phoneNumber} in campaign: ${campaignId}.`,
      );
      return;
    }

    const s3DeletePromises: Promise<boolean | void>[] = [];
    const mongoDeletePromises: Promise<ICampaignSubmission | void | null>[] = [];

    for (const submission of submissions) {
      if (submission.media_data) {
        const media = submission.media_data;
        console.log(
          `CleanerService.deleteUserSubmissionsByCampaign :: Deleting S3 object s3://${media.bucket}/${media.key} for submission ${String(submission._id)} in campaign: ${campaignId}.`,
        );
        s3DeletePromises.push(
          this.s3Service
            .deleteFile(media.bucket, media.key)
            .catch((err) =>
              console.error(
                `CleanerService.deleteUserSubmissionsByCampaign :: Failed to delete S3 object ${media.key} from ${media.bucket}:`,
                err,
              ),
            ),
        );
      }

      mongoDeletePromises.push(
        repository
          .deleteSubmission(String(submission._id))
          .catch((err) =>
            console.error(
              `CleanerService.deleteUserSubmissionsByCampaign :: Failed to delete MongoDB submission ${String(submission._id)}:`,
              err,
            ),
          ),
      );
    }

    await Promise.all([...s3DeletePromises, ...mongoDeletePromises]);
  }
}
