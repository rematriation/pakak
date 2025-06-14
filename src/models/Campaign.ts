/**
 * @author Daksh Pratap Singh
 * @email daksh204singh@gmail.com
 * @desc Campaign related data models.
 */

import { ExpectedResponseType } from '../constants/ExpectedResponseType';

/**
 * Defines a single step/question within a campaign flow.
 */
export interface IQuestionStep {
  stepId: string;
  prompt: string;
  expectedResponseType: ExpectedResponseType;
  fallbackMessage?: string;
  validationRegex?: string;
  nextStepId?: string;
  fieldName?: string;
}

/**
 * Defines the structure of a Campaign Definition document stored in MongoDB.
 * This represents a conversational flow.
 */
export interface ICampaignDefinition {
  _id: string;
  name: string;
  description?: string;
  initialMessage?: string;
  fallbackMessage?: string;
  timeoutMessage?: string;
  steps: IQuestionStep[];
  isActive: boolean;
}
