/**
 * @author Daksh Pratap Singh
 * @email daksh204singh@gmail.com
 * @desc Text response handler. Includes numbers as well.
 */
import { IInputHandlerContext, IInputHandlerResult, IInputHandler } from './InputHandler';
import { ISubmissionRepositoryProvider } from '../../repositories/CampaignSubmissionRepositoryProvider';
import { ISubmissionRepository } from '../../repositories/ICampaignSubmissionRepository';
import { CampaignId } from '../../constants/CampaignId';

export class MappingInputHandler implements IInputHandler {
  constructor(private repositoryProvider: ISubmissionRepositoryProvider) {}

  async process(context: IInputHandlerContext): Promise<IInputHandlerResult> {
    const { campaignId, step, submissionId, message } = context;
    const messageTxt: string = message.messageText || '';
    const repository: ISubmissionRepository =
      this.repositoryProvider.getSubmissionRepository(campaignId);
    if (!step.mapping) {
      console.error(
        `MappingInputHandler.process :: Incorrect step ${context.step.stepId} definition in ${context.campaignId} campaign. Mapping definition doesn't exist for mapping step.`,
      );
      throw new Error(`Incorrect campaign definition :: ${campaignId}.`);
    }

    if (step.mapping[messageTxt]) {
      if (step.fieldName) {
        await repository.addTextResponse(submissionId, step.fieldName, step.mapping[messageTxt]);
        return {
          status: true,
          nextStepId: step.nextStepId,
          flowId: step.runFlow ? (step.runFlow as CampaignId) : campaignId,
        } as IInputHandlerResult;
      } else {
        console.error(
          `TextInputHandler.process :: ${message.phoneNumber}, ${message.messageSid} :: Incorrect Campaign definition :: ${step.stepId}'s field property doesn't exist.`,
        );
        throw Error(
          `Incorrect Campaign definition. ${step.stepId}'s field property doesn't exist.`,
        );
      }
    }

    return {
      status: false,
      nextStepId: undefined,
      flowId: campaignId,
    };
  }
}
