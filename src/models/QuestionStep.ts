import { ExpectedResponseType } from '../constants/ExpectedResponseType';

/**
 * Defines a single step/question within a campaign flow.
 */

export interface IQuestionStep {
  stepId: string;
  prompt: string;
  expectedResponseType: ExpectedResponseType;
  fallbackMessage?: string;
  validationRegex?: RegExp;
  nextStepId?: string;
  fieldName?: string;
  runFlow?: string;
}
