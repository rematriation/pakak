/**
 * @author Daksh Pratap Singh
 * @email daksh204singh@gmail.com
 * @desc S3 Service for uploading files to S3 bucket.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  GetObjectTaggingCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import { injectable, inject } from 'tsyringe';
import { IAppConfig, IAppConfigToken } from '../configs/AppConfig'; // Assuming AppConfig provides AWS region
import { IS3ObjectMetadata } from '../models/s3/S3ObjectMetadata';
import { IS3ObjectTags } from '../models/s3/S3ObjectTags';
import { IS3ObjectData } from '../models/s3/S3ObjectData';
import { FileScanStatus } from '../constants/FileScanStatus';
import { CampaignId } from '../constants/CampaignId';
import { Readable } from 'stream';

/**
 * Interface for the S3 Service.
 * Defines the contract for uploading files to S3.
 */
export interface IS3Service {
  /**
   * @returns S3Client object for custom operations not related to application logic.
   */
  getClient(): S3Client;

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

  /**
   * Retrieves an file (object) from S3.
   * @param bucketName The name of the S3 bucket.
   * @param key The object key.
   * @returns A Promise resolving to IS3ObjectData.
   */
  getFile(bucketName: string, key: string): Promise<IS3ObjectData>;

  /**
   * Deletes a file (object) from a specified S3 bucket.
   * @param bucketName The name of the S3 bucket.
   * @param key The key of the object to delete.
   * @returns A Promise that resolves to `true` if the deletion was successful.
   * @throws Will re-throw any unexpected errors from the S3 service.
   */
  deleteFile(bucketName: string, key: string): Promise<boolean>;

  /**
   * Moves a file (object) from a source location to a destination location in S3.
   * @param sourceBucket The name of the source S3 bucket.
   * @param sourceKey The key of the object in the source bucket.
   * @param destBucket The name of the destination S3 bucket.
   * @param destKey The key for the object in the destination bucket.
   * @returns A Promise that resolves when the move is complete.
   */
  moveFile(
    sourceBucket: string,
    sourceKey: string,
    destBucket: string,
    destKey: string,
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
      const url = this.constructUrl(bucketName, key);
      console.log(
        `S3Service :: File uploaded successfully to s3://${bucketName}/${key}. URL: ${url}`,
      );
      return url;
    } catch (error) {
      console.error(`S3Service :: Failed to upload file to s3://${bucketName}/${key}:`, error);
      throw error;
    }
  }

  private constructUrl(bucketName: string, key: string) {
    return `https://${bucketName}.s3.${this.awsRegion}.amazonaws.com/${key}`;
  }

  public async getFile(bucketName: string, key: string): Promise<IS3ObjectData> {
    try {
      const getObjectCommand = new GetObjectCommand({ Bucket: bucketName, Key: key });
      const getObjectResponse = await this.s3Client.send(getObjectCommand);

      const getTagsCommand = new GetObjectTaggingCommand({ Bucket: bucketName, Key: key });
      const getTagsResponse = await this.s3Client.send(getTagsCommand);

      const tagsRecord: Record<string, string> = {};
      if (getTagsResponse.TagSet) {
        getTagsResponse.TagSet.forEach((tag) => {
          if (tag.Key && tag.Value) tagsRecord[tag.Key] = tag.Value;
        });
      }

      const filteredMetadata: Record<string, string> = {};
      if (getObjectResponse.Metadata) {
        for (const [k, v] of Object.entries(getObjectResponse.Metadata)) {
          if (v !== undefined && v !== null) {
            filteredMetadata[k] = v;
          }
        }
      }

      const metadata: IS3ObjectMetadata = {
        submissionId: filteredMetadata['submissionId'],
        phoneNumber: filteredMetadata['phoneNumber'],
        campaignId: filteredMetadata['campaignId'] as CampaignId,
        msgSid: filteredMetadata['msgSid'],
        scanStatus: filteredMetadata['scanStatus'] as FileScanStatus,
      };

      const tags: IS3ObjectTags = {
        submissionId: tagsRecord['submissionId'],
        phoneNumber: tagsRecord['phoneNumber'],
        campaignId: tagsRecord['campaignId'] as CampaignId,
        msgSid: tagsRecord['msgSid'],
        scanStatus: tagsRecord['scanStatus'] as FileScanStatus,
      };

      if (!getObjectResponse.Body || !getObjectResponse.ContentType) {
        console.error(`S3Service.getObject :: Not a media file. Missing body or content type.`);
        throw new Error('S3 Object body/content-type misisng.');
      }

      if (!(getObjectResponse.Body instanceof Readable)) {
        throw new Error(`S3 object body is not a valid Node.js Readable stream.`);
      }

      return {
        bucket: bucketName,
        key: key,
        body: getObjectResponse.Body,
        contentType: getObjectResponse.ContentType,
        metadata: metadata,
        tags: tags,
      };
    } catch (err: unknown) {
      console.error(`S3Service :: Failed to get object s3://${bucketName}/${key}:`, err);
      throw err;
    }
  }

  /**
   * Deletes a file (object) from a specified S3 bucket.
   */
  public async deleteFile(bucketName: string, key: string): Promise<boolean> {
    console.log(`S3Service :: Attempting to delete s3://${bucketName}/${key}...`);

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    try {
      await this.s3Client.send(command);
      console.log(`S3Service :: Successfully deleted s3://${bucketName}/${key}`);
      return true;
    } catch (err: unknown) {
      console.error(`S3Service :: An error occurred while deleting ${key}:`, err);
      throw err;
    }
  }

  /**
   * Moves a file (object) from a source location to a destination location in S3.
   * @returns url of the object.
   */
  public async moveFile(
    sourceBucket: string,
    sourceKey: string,
    destBucket: string,
    destKey: string,
  ): Promise<string> {
    console.log(
      `S3Service.moveFile :: Attempting to move s3://${sourceBucket}/${sourceKey} to s3://${destBucket}/${destKey}...`,
    );
    const copySource = `${sourceBucket}/${encodeURIComponent(sourceKey)}`;
    try {
      const copyCommand = new CopyObjectCommand({
        Bucket: destBucket,
        CopySource: copySource,
        Key: destKey,
        MetadataDirective: 'COPY',
        TaggingDirective: 'COPY',
      });
      await this.s3Client.send(copyCommand);
      console.log(
        `S3Service :: Successfully copied to s3://${destBucket}/${destKey} with metadata and tags.`,
      );
      const url: string = this.constructUrl(destBucket, destKey);

      await this.deleteFile(sourceBucket, sourceKey);
      console.log(
        `S3Service.moveFile :: Move operation completed for ${sourceKey}. New URL: ${url}`,
      );
      return url;
    } catch (error) {
      console.error(
        `S3Service.moveFile :: An error occurred during move operation for ${sourceKey}:`,
        error,
      );
      throw error;
    }
  }

  public getClient(): S3Client {
    return this.s3Client;
  }
}
