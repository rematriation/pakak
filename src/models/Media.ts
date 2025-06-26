import { Schema } from 'mongoose';
import { VirusScanStatus } from '../constants/VirusScanResult';

/**
 * Interface describing the structure of the embedded media object.
 */

export interface IMedia {
  bucket: string;
  key: string;
  url: string;
  mime_type: string;
  virus_scan?: {
    checkedAt: Date;
    result: VirusScanStatus;
  };
}
/**
 * Defines the Mongoose Schema for the embedded media metadata.
 * This is a sub-document and will not have its own collection.
 */
export const MediaSchema: Schema = new Schema(
  {
    bucket: {
      type: String,
      required: true,
    },
    key: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    mime_type: {
      type: String,
      required: true,
    },
    virus_scan: {
      checkedAt: { type: Date },
      engine: { type: String },
      result: { type: String, enum: Object.values(VirusScanStatus) },
    },
  },
  { _id: false },
);
