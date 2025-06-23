/**
 * @author Daksh Pratap Singh
 * @email daksh204singh@gmail.com
 * @desc S3 Object Metadata.
 */

import { IS3ObjectContext } from './S3ObjectContext';

/**
 * Defines the structure for S3 Object Metadata (x-amz-meta- headers).
 * Make it an interface if you want new fields added to it.
 */
export type IS3ObjectMetadata = IS3ObjectContext;
