/**
 * @author Daksh Pratap Singh
 * @email daksh204singh@gmail.com
 * @desc Virus Scan notification to admin.
 */

import { VirusScanStatus } from '../constants/VirusScanResult';
import { IOutgoingMessage } from './OutgoingMessage';

export interface IScanResult {
  virusScanStatus: VirusScanStatus;
  outgoingMessage?: IOutgoingMessage;
}
