import { Schema } from 'mongoose';

/**
 * Interface describing the structure of the embedded media object.
 */

export interface IMedia {
  bucket: string;
  key: string;
  mime_type: string;
  size_kb: number;
  sha256?: string;
  virus_scan?: {
    checkedAt: Date;
    engine: string;
    result: string;
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
    mime_type: {
      type: String,
      required: true,
    },
    size_kb: {
      type: Number,
      required: true,
    },
    sha256: {
      type: String,
    },
    virus_scan: {
      checkedAt: { type: Date },
      engine: { type: String },
      result: { type: String },
    },
  },
  { _id: false },
);
