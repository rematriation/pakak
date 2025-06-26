/**
 * @author Daksh Pratap Singh
 * @email daksh204singh@gmail.com
 * @desc Campaign Submission Repository provider class to supply repositories according to campaign types.
 */

import { injectable } from 'tsyringe';
import { CampaignId } from '../constants/CampaignId';
import { CampaignSubmissionRepository } from './CampaignSubmissionRepository';
import { UserProfileRepository } from './UserProfileRepository';
import { ISubmissionRepository } from './ICampaignSubmissionRepository';

/**
 * Interface for the Campaign Submission Repository Provider.
 * This class provides access to the CampaignSubmissionRepository instance
 * based on the context of a specific campaign.
 */
export interface ISubmissionRepositoryProvider {
  /**
   * Retrieves the ICampaignSubmissionRepository instance for the given CampaignId.
   *
   * @param campaignId The ID of the campaign.
   * @returns The CampaignSubmissionRepository instance for campaignId.
   * @throws Error when the repository doesn't exist for the campaign.
   */
  getSubmissionRepository(campaignId: CampaignId): ISubmissionRepository;
}

/**
 * A unique token for injecting the ICampaignSubmissionRepositoryProvider.
 */
export const ISubmissionRepositoryProviderToken = Symbol('ISubmissionRepositoryProvider');

/**
 * Concrete implementation of ICampaignSubmissionRepositoryProvider.
 */
@injectable()
export class SubmissionRepositoryProvider implements ISubmissionRepositoryProvider {
  #repositoryMap: Map<CampaignId, ISubmissionRepository>;

  constructor(
    private userProfileRepository: UserProfileRepository,
    private campaignSubmissionRepository: CampaignSubmissionRepository,
  ) {
    this.#repositoryMap = new Map<CampaignId, ISubmissionRepository>([
      [CampaignId.USER_PROFILE_ONBOARDING, userProfileRepository],
      [CampaignId.IMAGE_SUBMISSION_FLOW, campaignSubmissionRepository],
    ]);
  }

  public getSubmissionRepository(campaignId: CampaignId): ISubmissionRepository {
    const repository: ISubmissionRepository | undefined = this.#repositoryMap.get(campaignId);
    if (!repository) {
      console.error(
        `SubmissionRepositoryProvider :: Couldn't find repository for ${campaignId}. Potential bug since it's not expected to fail.`,
      );
      throw new Error(`Couldn't find repository for ${campaignId}.`);
    }
    return repository;
  }
}
