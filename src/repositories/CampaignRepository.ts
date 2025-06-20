/**
 * @author Daksh Pratap Singh
 * @email daksh204singh@gmail.com
 * @desc Campaign repository.
 */

import { injectable } from 'tsyringe';
import { Campaign, ICampaign, ICampaignDocument } from '../models/Campaign'; // Assuming your model is in this path
import { MongoServerError } from 'mongodb';
import { MONGO_ERROR_CODES } from '../libs/errors/MongoErrorCodes';
import { AppError } from '../libs/errors/AppError';
import { ErrorCode } from '../libs/errors/ErrorCode';

/**
 * Repository for managing Campaign data in MongoDB Atlas using Mongoose.
 */
@injectable()
export class CampaignRepository {
  /**
   * Creates a new campaign document.
   * @param campaignData The data for the new campaign.
   * @returns The created campaign document.
   * @throws Error if a campaign with the same name already exists.
   */
  public async createCampaign(campaignData: ICampaign): Promise<ICampaignDocument> {
    try {
      const newCampaign = new Campaign(campaignData);
      const createdCampaign = await newCampaign.save();
      return createdCampaign;
    } catch (err: unknown) {
      if (err instanceof MongoServerError && err.code === MONGO_ERROR_CODES.DUPLICATE_KEY) {
        console.warn(
          `CampaignRepository :: Campaign with name "${campaignData.name}" already exists.`,
        );
        throw new AppError(
          ErrorCode.DUPLICATE_CAMPAIGN,
          `Campaign with name "${campaignData.name}" already exists.`,
        );
      }
      console.error(`CampaignRepository :: Error creating campaign "${campaignData.name}":`, err);
      throw err;
    }
  }

  /**
   * Retrieves a campaign by its unique name.
   * @param name The unique name of the campaign.
   * @returns The campaign document, or null if not found.
   */
  public async getCampaignByName(name: string): Promise<ICampaignDocument | null> {
    try {
      const campaign = await Campaign.findOne({ name: name }).exec();
      return campaign;
    } catch (error) {
      console.error(`CampaignRepository :: Error getting campaign by name "${name}":`, error);
      throw error;
    }
  }
}
