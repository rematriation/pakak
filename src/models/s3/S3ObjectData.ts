/**
 * @author Daksh Pratap Singh
 * @email daksh204singh@gmail.com
 * @desc S3 Object data
 */

import { Readable } from 'stream';
import { IS3ObjectMetadata } from './S3ObjectMetadata';
import { IS3ObjectTags } from './S3ObjectTags';

/**
 * Defines the structure of an S3 object's data and associated properties retrieved from S3.
 */
export interface IS3ObjectData {
  bucket: string;
  key: string;
  body: Readable;
  contentType: string;
  metadata?: IS3ObjectMetadata;
  tags?: IS3ObjectTags;
}
