/**
 * @author Daksh Pratap Singh
 * @email daksh204singh@gmail.com
 * @desc Parent interface for common S3 object metadata and tags.
 */

import { CampaignId } from '../../constants/CampaignId';
import { ScanStatus } from '../../constants/ScanStatus';

/**
 * Defines common context fields for S3 objects that link them to application data.
 */
export interface IS3ObjectContext {
  submissionId: string;
  phoneNumber: string;
  campaignId: CampaignId;
  msgSid: string;
  scanStatus?: ScanStatus;
}
