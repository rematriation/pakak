import { ExpectedResponseType } from '../constants/ExpectedResponseType';
import { RoutingRule } from './RoutingRule';

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
  runFlow?: string;
  mapping?: Record<string, string>;
  routingRules?: RoutingRule[];
}
