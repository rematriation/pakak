/**
 * @author Daksh Pratap Singh
 * @email daksh204singh@gmail.com
 * @desc Conversation Context
 */

export interface IConversationContext {
  flowId: string;
  currentStepId: string;
  collectedData: Record<string, string>;
}
