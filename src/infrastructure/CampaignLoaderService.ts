/**
 * @author Daksh Pratap Singh
 * @email daksh204singh@gmail.com
 * @desc Campaign loader.
 */

import { injectable } from 'tsyringe';
import { ICampaignDefinition } from '../models/Campaign';
import campaignsJson from '../../campaigns/campaigns.json';

let cachedCampaignDefinitions: Map<string, ICampaignDefinition> | null = null;

/**
 * Interface for the Campaign Loader Service.
 */
export interface ICampaignLoaderService {
  initializeCampaigns(): Promise<void>;
  getCampaignDefinition(campaignId: string): Promise<ICampaignDefinition | null>;
}

/**
 * A unique token for injecting the ICampaignLoaderService.
 */
export const ICampaignLoaderServiceToken = Symbol('ICampaignLoaderService');

@injectable()
export class CampaignLoaderService implements ICampaignLoaderService {
  constructor() {}

  /**
   * Initializes all required campaign definitions by loading them from the local JSON file
   * into memory during cold start.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  public async initializeCampaigns(): Promise<void> {
    if (cachedCampaignDefinitions) {
      console.log('CampaignLoaderService :: All campaign definitions already loaded (warm start).');
      return;
    }

    console.log(
      'CampaignLoaderService :: Loading campaign definitions from local JSON file (cold start).',
    );
    cachedCampaignDefinitions = new Map<string, ICampaignDefinition>();

    const campaignsArray = campaignsJson as ICampaignDefinition[];

    for (const campaignData of campaignsArray) {
      if (
        campaignData._id &&
        typeof campaignData.name === 'string' &&
        Array.isArray(campaignData.steps)
      ) {
        if (campaignData.isActive) {
          cachedCampaignDefinitions.set(campaignData._id, campaignData);
          console.info(`CampaignLoaderService :: Campaign '${campaignData._id}' loaded from JSON.`);
        } else {
          console.info(
            `CampaignLoaderService :: Inactive campaign '${campaignData._id}' found in JSON. Skipping.`,
          );
        }
      } else {
        console.warn(
          `CampaignLoaderService :: Invalid JSON structure for campaign ID: ${campaignData._id}. Skipping. Data:`,
          JSON.stringify(campaignData),
        );
      }
    }

    if (cachedCampaignDefinitions.size === 0) {
      console.error(
        'CampaignLoaderService :: No active campaign definitions loaded from JSON file. This might be a configuration error.',
      );
      throw new Error('No campaign definitions loaded.');
    }
    console.info(
      `CampaignLoaderService :: Total ${cachedCampaignDefinitions.size} active campaigns loaded from JSON file.`,
    );
  }

  /**
   * Retrieves a specific campaign definition by its ID from memory (or DB on cold start).
   * @param campaignId The ID of the campaign to retrieve.
   * @returns The Campaign definition, or null if not found/active.
   */
  public async getCampaignDefinition(campaignId: string): Promise<ICampaignDefinition | null> {
    if (!cachedCampaignDefinitions) {
      await this.initializeCampaigns();
    }
    return cachedCampaignDefinitions?.get(campaignId) || null;
  }
}
