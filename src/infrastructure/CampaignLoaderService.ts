/**
 * @author Daksh Pratap Singh
 * @email daksh204singh@gmail.com
 * @desc Campaign loader.
 */

import { injectable } from 'tsyringe';
import { ICampaignDefinition, IQuestionStep } from '../models/Campaign';
import campaignsJson from '../../campaigns/campaigns.json';

/**
 * Interface for the Campaign Loader Service.
 */
export interface ICampaignLoaderService {
  initializeCampaigns(): Promise<void>;
  getCampaignDefinition(campaignId: string): Promise<ICampaignDefinition | null>;
  getQuestionStep(campaignId: string, stepId: string): IQuestionStep | undefined;
}

/**
 * A unique token for injecting the ICampaignLoaderService.
 */
export const ICampaignLoaderServiceToken = Symbol('ICampaignLoaderService');

@injectable()
export class CampaignLoaderService implements ICampaignLoaderService {
  #cachedCampaignDefinitions: Map<string, ICampaignDefinition> | null = null;
  #cachedCampaignStepsById: Map<string, Map<string, IQuestionStep>> | null = null;

  constructor() {}

  /**
   * Initializes all required campaign definitions by loading them from the local JSON file
   * into memory during cold start.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  public async initializeCampaigns(): Promise<void> {
    if (this.#cachedCampaignDefinitions) {
      console.log('CampaignLoaderService :: All campaign definitions already loaded (warm start).');
      return;
    }

    console.log(
      'CampaignLoaderService :: Loading campaign definitions from local JSON file (cold start).',
    );
    this.#cachedCampaignDefinitions = new Map<string, ICampaignDefinition>();
    this.#cachedCampaignStepsById = new Map<string, Map<string, IQuestionStep>>();

    const campaignsArray = campaignsJson as ICampaignDefinition[];

    for (const campaignData of campaignsArray) {
      if (
        campaignData._id &&
        typeof campaignData.name === 'string' &&
        Array.isArray(campaignData.steps)
      ) {
        if (campaignData.isActive) {
          this.#cachedCampaignDefinitions.set(campaignData._id, campaignData);
          console.info(`CampaignLoaderService :: Campaign '${campaignData._id}' loaded from JSON.`);
          const stepsMap = new Map<string, IQuestionStep>();
          for (const step of campaignData.steps) {
            stepsMap.set(step.stepId, step);
          }
          this.#cachedCampaignStepsById.set(campaignData._id, stepsMap);
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

    if (this.#cachedCampaignDefinitions.size === 0) {
      console.error(
        'CampaignLoaderService :: No active campaign definitions loaded from JSON file. This might be a configuration error.',
      );
      throw new Error('No campaign definitions loaded.');
    }
    console.info(
      `CampaignLoaderService :: Total ${this.#cachedCampaignDefinitions.size} active campaigns loaded from JSON file.`,
    );
  }

  /**
   * Retrieves a specific campaign definition by its ID from memory (or DB on cold start).
   * @param campaignId The ID of the campaign to retrieve.
   * @returns The Campaign definition, or null if not found/active.
   */
  public async getCampaignDefinition(campaignId: string): Promise<ICampaignDefinition | null> {
    if (!this.#cachedCampaignDefinitions) {
      await this.initializeCampaigns();
    }
    return this.#cachedCampaignDefinitions?.get(campaignId) || null;
  }

  /**
   * Retrieves a specific question step from a loaded campaign definition by ID.
   * Uses an in-memory map for fast lookup.
   * @param campaignId The ID of the campaign the step belongs to.
   * @param stepId The ID of the question step to retrieve.
   * @returns The question step, or undefined if not found.
   */
  public getQuestionStep(campaignId: string, stepId: string): IQuestionStep | undefined {
    if (!this.#cachedCampaignStepsById) {
      console.warn(
        'CampaignLoaderService :: getQuestionStep called before campaigns were initialized. Attempting initialization.',
      );
      return undefined;
    }
    return this.#cachedCampaignStepsById.get(campaignId)?.get(stepId);
  }
}
