/**
 * @author Daksh Pratap Singh
 * @email daksh204singh@gmail.com
 * @desc Campaign related data models.
 */

import mongoose, { Schema, Document } from 'mongoose';
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
export interface ICampaignDefinition extends Document {
  _id: string;
  name: string;
  description?: string;
  initialMessage?: string;
  fallbackMessage?: string;
  timeoutMessage?: string;
  steps: IQuestionStep[];
  isActive: boolean;
}

const CampaignDefinitionSchema: Schema = new Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, required: false },
    initialMessage: { type: String, required: false },
    fallbackMessage: { type: String, required: false },
    timeoutMessage: { type: String, required: false },
    steps: [
      {
        stepId: { type: String, required: true },
        prompt: { type: String, required: true },
        expectedResponseType: {
          type: String,
          required: true,
          enum: Object.values(ExpectedResponseType),
        },
        validationRegex: { type: String, required: false },
        nextStepId: { type: String, required: false },
        fieldName: { type: String, required: false },
        fallbackMessage: { type: String, required: false },
        _id: false,
      },
    ],
    isActive: { type: Boolean, required: true, default: true },
  },
  {
    timestamps: true,
    collection: 'CampaignDefinitions',
  },
);

const CampaignDefinitionModel = mongoose.model<ICampaignDefinition>(
  'CampaignDefinition',
  CampaignDefinitionSchema,
);
export default CampaignDefinitionModel;
