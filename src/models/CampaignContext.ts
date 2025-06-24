/**
 * @author Daksh Pratap Singh
 * @email daksh204singh@gmail.com
 * @desc Conversation Context
 */

import { CampaignId } from '../constants/CampaignId';

export interface ICampaignContext {
  readonly submissionId: string;
  readonly flowId: CampaignId;
  readonly currentStepId: string;
}
