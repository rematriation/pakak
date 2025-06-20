/**
 * @author Daksh Pratap Singh
 * @email daksh204singh@gmail.com
 * @desc Campaign Submission model.
 */

import mongoose, { Schema, Document } from 'mongoose';
import { IUserProfileDocument } from './UserProfile';
import { ICampaignDocument } from './Campaign';
import { IMedia, MediaSchema } from './Media';
import { SubmissionStatus } from '../constants/SubmissionStatus';

/**
 * Interface for the Submission data object.
 */
export interface ICampaignSubmission {
  user: IUserProfileDocument['_id'];
  campaign: ICampaignDocument['_id'];
  status: SubmissionStatus;
  submission_data?: Record<string, string>;
  media_data?: Map<string, IMedia>;
}

export interface ICampaignSubmissionDocument extends ICampaignSubmission, Document {}

const CampaignSubmissionSchema: Schema = new Schema(
  {
    phone: { type: String, required: true, index: true },
    campaign: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: Object.values(SubmissionStatus),
      required: true,
      default: SubmissionStatus.IN_PROGRESS,
    },
    submission_data: { type: Map, of: Schema.Types.Mixed, default: {} },
    media_data: {
      type: Map,
      of: MediaSchema,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: 'CampaignSubmissions',
  },
);

export const CampaignSubmissionModel = mongoose.model<ICampaignSubmission>(
  'CampaignSubmission',
  CampaignSubmissionSchema,
);
