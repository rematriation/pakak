/**
 * @author Daksh Pratap Singh
 * @email daksh204singh@gmail.com
 * @desc S3 Service for uploading files to S3 bucket.
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { injectable, inject } from 'tsyringe';
import { IAppConfig, IAppConfigToken } from '../configs/AppConfig'; // Assuming AppConfig provides AWS region
import { IS3ObjectMetadata } from '../models/s3/S3ObjectMetadata';
import { IS3ObjectTags } from '../models/s3/S3ObjectTags';

/**
 * Interface for the S3 Service.
 * Defines the contract for uploading files to S3.
 */
export interface IS3Service {
  /**
   * Uploads a single file to an S3 bucket and returns its public URL.
   * Assumes the bucket is configured for public read access.
   *
   * @param bucketName The name of the S3 bucket (e.g., 'pakak-dev-raw').
   * @param key The object key (path/filename) for the file in S3 (e.g., 'user_phone/message_sid/image.jpg').
   * @param body The content of the file (e.g., Buffer, Readable stream, Blob, string).
   * @param contentType The MIME type of the file (e.g., 'image/jpeg', 'audio/mpeg').
   * @returns A Promise that resolves with the public URL of the uploaded file.
   */
  uploadFile(
    bucketName: string,
    key: string,
    body: Buffer | ReadableStream | Blob | string,
    contentType: string,
    metadata?: IS3ObjectMetadata,
    tags?: IS3ObjectTags,
  ): Promise<string>;
}

/**
 * A unique token for injecting the IS3Service.
 */
export const IS3ServiceToken = Symbol('IS3Service');

/**
 * Concrete implementation of IS3Service for interacting with AWS S3.
 * Manages the S3 client and provides file upload functionality.
 */
@injectable()
export class S3Service implements IS3Service {
  private s3Client: S3Client;
  private awsRegion: string;

  constructor(@inject(IAppConfigToken) appConfig: IAppConfig) {
    this.awsRegion = appConfig.awsRegion;
    this.s3Client = new S3Client({ region: this.awsRegion });
  }

  public async uploadFile(
    bucketName: string,
    key: string,
    body: Buffer | ReadableStream | Blob | string,
    contentType: string,
    metadata?: IS3ObjectMetadata,
    tags?: IS3ObjectTags,
  ): Promise<string> {
    const tagSet: string | undefined = tags
      ? Object.entries(tags)
          .filter(([, value]) => value !== undefined && value !== null)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v as string)}`)
          .join('&')
      : undefined;

    const metadataSet: Record<string, string> | undefined = metadata
      ? (Object.fromEntries(
          Object.entries(metadata)
            .filter(([, value]) => value !== undefined && value !== null)
            .map(([key, value]) => [key, value as string]),
        ) as Record<string, string>)
      : undefined;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
      Metadata: metadataSet,
      Tagging: tagSet,
    });

    try {
      await this.s3Client.send(command);
      const url = `https://${bucketName}.s3.${this.awsRegion}.amazonaws.com/${key}`;
      console.log(
        `S3Service :: File uploaded successfully to s3://${bucketName}/${key}. URL: ${url}`,
      );
      return url;
    } catch (error) {
      console.error(`S3Service :: Failed to upload file to s3://${bucketName}/${key}:`, error);
      throw error;
    }
  }
}
