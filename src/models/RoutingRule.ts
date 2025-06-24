/**
 * @author Daksh Pratap Singh
 * @email daksh204singh@gmail.com
 * @desc Routing rule definition.
 */

/**
 * Defines a single routing rule within a step.
 */
export interface RoutingRule {
  conditionRegex: string;
  nextStepId?: string;
  setFields?: Record<string, string>;
}
