/**
 * @author Daksh Pratap Singh
 * @email daksh204singh@gmail.com
 * @desc Campaign Repository interface.
 */

/**
 * Defines the contract for a repository that manages campaign submissions.
 * This interface outlines methods for creating a new submission record
 * and adding individual responses to it.
 */
export interface ICampaignSubmissionRepository {
  /**
   * Creates a new campaign submission record for a user.
   * @param campaignId The ID of the campaign (e.g., 'user_profile_onboarding_v1').
   * @param phoneNumber The user's phone number.
   * @returns A Promise that resolves when the submission is created.
   */
  createSubmission(campaignId: string, phoneNumber: string): Promise<void>;

  /**
   * Adds or updates a specific response field within an existing campaign submission.
   * @param submissionId The ID of the submission record (e.g., the user's phone number).
   * @param fieldName The name of the field to add/update (e.g., 'name', 'village').
   * @param value The value of the response.
   * @returns A Promise that resolves when the response is added.
   */
  addResponse(submissionId: string, fieldName: string, value: string): Promise<void>;
}
