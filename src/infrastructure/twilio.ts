/**
 * @author Daksh Pratap Singh
 * @email daksh204singh@gmail.com
 * @desc Twilio client.
 */

import { injectable, inject } from 'tsyringe';
import { IAppConfig, IAppConfigToken } from '../configs/AppConfig';
import { Twilio } from 'twilio';

@injectable()
export class TwilioClient {
  public client: Twilio;
  constructor(@inject(IAppConfigToken) private appConfig: IAppConfig) {
    this.client = new Twilio(appConfig.twilioAccountSid, appConfig.twilioAuthToken);
  }
}
