/**
 * @author Daksh Pratap Singh
 * @email daksh204singh@gmail.com
 * @desc Text response handler. Includes numbers as well.
 */
import { validateWithRegex } from '../../libs/messageHelper';
import { ICampaignSubmissionRepositoryProvider } from '../../repositories/CampaignSubmissionRepositoryProvider';
import { ICampaignSubmissionRepository } from '../../repositories/ICampaignSubmissionRepository';
import { IInputHandlerContext, IInputHandlerResult, IInputHandler } from './InputHandler';

export class TextInputHandler implements IInputHandler {
  constructor(private repositoryProvider: ICampaignSubmissionRepositoryProvider) {}

  async process(context: IInputHandlerContext): Promise<IInputHandlerResult> {
    const msg = context.message;
    const messageTxt = msg.messageText;
    const questionStep = context.step;
    const campaignId = context.campaignId;
    console.info(
      `TextInputHandler.process :: Processing user's text response for ${msg.phoneNumber} with Message SID: ${msg.messageSid}`,
    );
    const repository: ICampaignSubmissionRepository =
      this.repositoryProvider.getSubmissionRepository(campaignId);
    if (validateWithRegex(messageTxt, new RegExp(questionStep.validationRegex as string))) {
      if (questionStep.fieldName) {
        await repository.addTextResponse(
          context.submissionId,
          questionStep.fieldName,
          messageTxt || '',
        );
        return {
          status: true,
          nextStepId: questionStep.nextStepId,
        };
      } else {
        console.error(
          `TextInputHandler.process :: ${msg.phoneNumber}, ${msg.messageSid} :: Incorrect Campaign definition :: ${questionStep.stepId}'s field property doesn't exist.`,
        );
        throw Error(
          `Incorrect Campaign definition. ${questionStep.stepId}'s field property doesn't exist.`,
        );
      }
    }
    return {
      status: false,
      nextStepId: undefined,
    };
  }
}
