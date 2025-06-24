/**
 * @author Daksh Pratap Singh
 * @email daksh204singh@gmail.com
 * @desc [description]
 */

import { CampaignId } from '../../constants/CampaignId';
import { IIncomingMessage } from '../../models/IncomingMessage';
import { IQuestionStep } from '../../models/QuestionStep';

export interface IInputHandlerContext {
  readonly campaignId: CampaignId;
  readonly step: IQuestionStep;
  readonly submissionId: string;
  readonly message: IIncomingMessage;
}

export interface IInputHandlerResult {
  status: boolean;
  nextStepId: string | undefined;
}

export interface IInputHandler {
  process(context: IInputHandlerContext): Promise<IInputHandlerResult>;
}
