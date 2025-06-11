/**
 * @author Daksh Pratap Singh
 * @email daksh204singh@gmail.com
 * @desc User Profile document management functions.
 */

import { injectable } from 'tsyringe';
import UserProfileModel, { IUserProfile } from '../models/UserProfile';
import { MongoServerError } from 'mongodb';
import { MONGO_ERROR_CODES } from '../libs/errors/MongoErrorCodes';
import { ErrorCode } from '../libs/errors/ErrorCode';
import { AppError } from '../libs/errors/AppError';
import mongoose from 'mongoose';

/**
 * Repository for managing UserProfile data in MongoDB Atlas using Mongoose.
 */
@injectable()
export class UserProfileRepository {
  /**
   * Retrieves a user profile by their phone number.
   * Assumes the Mongoose connection is already established.
   * @param phoneNumber The user's phone number (which is the _id in MongoDB).
   * @returns The user profile document, or null if not found.
   */
  public async getUserProfile(phoneNumber: string): Promise<IUserProfile | null> {
    try {
      // Use findById since _id is the phone number in our schema
      const userProfile = await UserProfileModel.findById(phoneNumber).exec();
      return userProfile;
    } catch (error) {
      console.error(
        `UserProfileRepository :: Error getting user profile for ${phoneNumber}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Creates a new user profile document.
   * Assumes the Mongoose connection is already established.
   * @param profileData The data for the new user profile (excluding createdAt, updatedAt as they are managed).
   * @returns The created user profile document.
   * @throws Error if creation fails
   */
  public async createUserProfile(
    profileData: Omit<IUserProfile, 'createdAt' | 'updatedAt'>,
  ): Promise<IUserProfile> {
    try {
      const newUserProfile = new UserProfileModel(profileData);
      const createdProfile = await newUserProfile.save();
      return createdProfile;
    } catch (err: unknown) {
      if (err instanceof MongoServerError && err.code === MONGO_ERROR_CODES.DUPLICATE_KEY) {
        console.warn(
          `UserProfileRepository :: User profile with phone ${profileData._id} already exists.`,
        );
        throw new AppError(
          ErrorCode.DUPLICATE_USER_PROFILE,
          `User profile with phone ${profileData._id} already exists.`,
        );
      }
      console.error(
        `UserProfileRepository :: Error creating user profile for ${profileData._id}:`,
        err,
      );
      throw err;
    }
  }

  /**
   * Updates an existing user profile.
   * Assumes the Mongoose connection is already established.
   * @param phoneNumber The user's phone number (_id).
   * @param updates The partial profile data to update.
   * @returns The updated user profile document, or null if not found.
   */
  public async updateUserProfile(
    phoneNumber: string,
    updates: Partial<Omit<IUserProfile, '_id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<IUserProfile | null> {
    try {
      const updatedProfile = await UserProfileModel.findByIdAndUpdate(
        phoneNumber,
        { $set: updates },
        { new: true, runValidators: true },
      ).exec();
      return updatedProfile;
    } catch (error) {
      console.error(
        `UserProfileRepository :: Error updating user profile for ${phoneNumber}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Updates the user's name.
   * @param phoneNumber The user's phone number.
   * @param name The new name.
   * @returns The updated user profile, or null if not found.
   */
  public async updateUserName(phoneNumber: string, name: string): Promise<IUserProfile | null> {
    return this.#_updateProfileField(phoneNumber, { name });
  }

  /**
   * Updates the user's preferred name.
   * @param phoneNumber The user's phone number.
   * @param preferredName The new preferred name.
   * @returns The updated user profile, or null if not found.
   */
  public async updatePreferredName(
    phoneNumber: string,
    preferredName: string,
  ): Promise<IUserProfile | null> {
    return this.#_updateProfileField(phoneNumber, { preferredName });
  }

  /**
   * Updates the user's village.
   * @param phoneNumber The user's phone number.
   * @param village The new village.
   * @returns The updated user profile, or null if not found.
   */
  public async updateVillage(phoneNumber: string, village: string): Promise<IUserProfile | null> {
    return this.#_updateProfileField(phoneNumber, { village });
  }

  /**
   * Updates the user's zip code.
   * @param phoneNumber The user's phone number.
   * @param zipCode The new zip code.
   * @returns The updated user profile, or null if not found.
   */
  public async updateZipCode(phoneNumber: string, zipCode: string): Promise<IUserProfile | null> {
    return this.#_updateProfileField(phoneNumber, { zipCode });
  }

  /**
   * Adds a campaign ID to the user's list of associated campaigns (if not already present).
   * @param phoneNumber The user's phone number.
   * @param campaignId The campaign ID to add.
   * @returns The updated user profile, or null if not found.
   */
  public async addCampaignId(
    phoneNumber: string,
    campaignId: string,
  ): Promise<IUserProfile | null> {
    try {
      const updatedProfile = await UserProfileModel.findByIdAndUpdate(
        phoneNumber,
        { $addToSet: { campaignIds: campaignId } },
        { new: true, runValidators: true },
      ).exec();
      return updatedProfile;
    } catch (error) {
      console.error(
        `UserProfileRepository :: Error adding campaign ID ${campaignId} for ${phoneNumber}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Deletes a user profile by phone number.
   * Assumes the Mongoose connection is already established.
   * @param phoneNumber The user's phone number (_id).
   * @returns The deleted user profile document, or null if not found.
   */
  public async deleteUserProfile(phoneNumber: string): Promise<IUserProfile | null> {
    try {
      const deletedProfile = await UserProfileModel.findByIdAndDelete(phoneNumber).exec();
      return deletedProfile;
    } catch (error) {
      console.error(
        `UserProfileRepository :: Error deleting user profile for ${phoneNumber}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Internal helper to perform a generic findByIdAndUpdate operation with common options.
   * @param phoneNumber The user's phone number.
   * @param updateObject The update object (e.g., { name: 'New Name' }.
   * @returns The updated user profile, or null if not found.
   */
  async #_updateProfileField(
    phoneNumber: string,
    updateObject: mongoose.UpdateQuery<IUserProfile>,
  ): Promise<IUserProfile | null> {
    try {
      const updatedProfile = await UserProfileModel.findByIdAndUpdate(phoneNumber, updateObject, {
        new: true,
        runValidators: true,
      }).exec();
      return updatedProfile;
    } catch (error) {
      console.error(
        `UserProfileRepository :: Error updating profile for ${phoneNumber} with ${JSON.stringify(updateObject)}:`,
        error,
      );
      throw error;
    }
  }
}
