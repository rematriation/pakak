/**
 * @author Daksh Pratap Singh
 * @email daksh204singh@gmail.com
 * @desc User Profile model
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IUserProfile extends Document {
  _id: string; // Phone number in E.164 format
  name?: string;
  preferredName?: string;
  village?: string;
  zipCode?: string;
  campaignIds?: string[];
  tkLabels?: string[];
}

// Regex for E.164 phone number format
const E164_PHONE_REGEX = /^\+[1-9]\d{1,14}$/;

// Regex for US Zip Code format: 5 digits or 5 digits + 4 digits (e.g., 12345 or 12345-6789)
const US_ZIP_CODE_REGEX = /^\d{5}(?:-\d{4})?$/;

const UserProfileSchema: Schema = new Schema(
  {
    // Phone number as the document _id. Unique constraint enabled.
    _id: {
      type: String,
      required: true,
      trim: true,
      validate: { validator: (phone: string) => E164_PHONE_REGEX.test(phone) },
      message: (props: { value: string }) => `${props.value} is not a valid E.164 phone number!`,
    },
    name: {
      type: String,
      required: false,
      trim: true,
      validate: {
        validator: (name: string | null | undefined) =>
          name === undefined || name === null || name.trim().length > 0,
      },
      message: () => `Name cannot be an empty string`,
    },
    preferredName: {
      type: String,
      required: false,
      trim: true,
      validate: {
        validator: (prefName: string | null | undefined) =>
          prefName === undefined || prefName === null || prefName.trim().length > 0,
      },
      message: () => `Preferred name cannot be an empty string`,
    },
    village: {
      type: String,
      required: false,
      trim: true,
      validate: {
        validator: (village: string | null | undefined) =>
          village === undefined || village === null || village.trim().length > 0,
      },
      message: () => `Village cannot be an empty string`,
    },
    zipCode: {
      type: String,
      required: false,
      trim: true,
      validate: {
        validator: (zip: string | null | undefined) =>
          zip === undefined || zip === null || US_ZIP_CODE_REGEX.test(zip),
      },
      message: (props: { value: string }) => `${props.value} is not a valid US zip code`,
    },
    campaignIds: { type: [String], required: false, default: [] },
    tkLabels: { type: [String], required: false, default: [] },
  },
  {
    timestamps: true,
    collection: 'UserProfiles',
  },
);

const UserProfileModel = mongoose.model<IUserProfile>('UserProfile', UserProfileSchema);
export default UserProfileModel;
