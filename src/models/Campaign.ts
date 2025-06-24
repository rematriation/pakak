/**
 * @author Daksh Pratap Singh
 * @email daksh204singh@gmail.com
 * @desc Campaign Model
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface ICampaign {
  _id: string;
  name?: string;
  description?: string;
}

export interface ICampaignDocument extends ICampaign, Document {
  _id: string;
}

const CampaignSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: false,
    },
    description: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
    collection: 'Campaigns',
  },
);

export const Campaign = mongoose.model<ICampaign>('Campaign', CampaignSchema);
