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

  /**
   * Downloads a media file from a protected Twilio media URL using fetch.
   *
   * @param mediaUrl The full URL of the media file provided by a Twilio webhook.
   * @returns A Promise that resolves to a Buffer containing the binary data of the media file.
   * @throws Will throw an error if the download fails.
   */
  public async downloadMedia(mediaUrl: string): Promise<Buffer> {
    console.debug(
      `TwilioClient.downloadMedia :: Attempting to download media from ${mediaUrl} using fetch...`,
    );
    try {
      const credentials: string = `${this.client.username}:${this.client.password}`;
      const base64Credentials: string = Buffer.from(credentials).toString('base64');
      const authHeader: string = `Basic ${base64Credentials}`;
      const response: Response = await fetch(mediaUrl, {
        method: 'GET',
        headers: {
          Authorization: authHeader,
        },
      });
      if (!response.ok) {
        throw new Error(`Download failed with status: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer: ArrayBuffer = await response.arrayBuffer();
      const buffer: Buffer = Buffer.from(arrayBuffer);
      console.debug(`TwilioClient :: Successfully downloaded ${buffer.length} bytes.`);

      return buffer;
    } catch (error) {
      console.error(`TwilioClient.downloadMedia :: Failed to download media from ${mediaUrl}.`);
      throw error;
    }
  }
}
