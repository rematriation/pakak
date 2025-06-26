import { validateWithRegex } from '../../libs/messageHelper';
import { ISubmissionRepositoryProvider } from '../../repositories/CampaignSubmissionRepositoryProvider';
import { ISubmissionRepository } from '../../repositories/ICampaignSubmissionRepository';
/**
 * @author Daksh Pratap Singh
 * @email daksh204singh@gmail.com
 * @desc Text response handler. Includes numbers as well.
 */
import { IInputHandlerContext, IInputHandlerResult, IInputHandler } from './InputHandler';

export class ChoiceInputHandler implements IInputHandler {
  constructor(private repositoryProvider: ISubmissionRepositoryProvider) {}

  async process(context: IInputHandlerContext): Promise<IInputHandlerResult> {
    const msg = context.message;
    const messageTxt = msg.messageText;
    const questionStep = context.step;
    const campaignId = context.campaignId;
    console.info(
      `ChoiceInputHandler.process :: Processing user's text response for ${msg.phoneNumber} with Message SID: ${msg.messageSid}`,
    );
    const repository: ISubmissionRepository =
      this.repositoryProvider.getSubmissionRepository(campaignId);
    if (!questionStep.routingRules) {
      console.error(
        `ChoiceInputHandler.process :: Incorrect step ${context.step.stepId} definition in ${context.campaignId} campaign. Routing rule doesn't exist for choice step.`,
      );
      throw new Error(`Incorrect campaign definition :: ${campaignId}.`);
    }
    for (const rule of questionStep.routingRules) {
      if (validateWithRegex(messageTxt, new RegExp(rule.conditionRegex))) {
        console.debug(
          `ChoiceInputHandler.process :: Rule matched. nextStepId: ${questionStep.nextStepId}.`,
        );
        if (rule.setFields) {
          await repository.addTextResponses(context.submissionId, rule.setFields);
        }
        const result: IInputHandlerResult = {
          status: true,
          nextStepId: rule.nextStepId,
        };
        return result;
      }
    }

    return { status: false, nextStepId: undefined };
  }
}
