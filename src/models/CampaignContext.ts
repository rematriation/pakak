/**
 * @author Daksh Pratap Singh
 * @email daksh204singh@gmail.com
 * @desc Conversation Context
 */

export interface ICampaignContext {
  readonly submissionId: string;
  readonly flowId: string;
  readonly currentStepId: string;
}
