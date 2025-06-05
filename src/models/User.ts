import { ValueType } from 'dynamoose/dist/Schema';
import dynamoose from '../libs/dynamoose';

/**
 * IUser describes the attribute shape in DynamoDB.
 * - phone:                     Partition key in E.164 format (e.g. "+15551234567")
 * - subscriptionStatus:        true = opt-in, false = STOP
 * - awaitingResponse:          true if waiting on a reply
 * - rateLimitCounter:          messages sent in current window
 * - rateLimitWindowExpiresAt?: ISO timestamp when the window ends
 * - awaitingDeletion:          0 or 1 (flag for background purge)
 * - createdAt?:                ISO-8601 (auto-populated)
 * - updatedAt?:                ISO-8601 (auto-populated)
 */
export interface IUser {
  phone: string;
  subscriptionStatus: boolean;
  awaitingResponse: boolean;
  rateLimitCounter: number;
  rateLimitWindowExpiresAt?: string;
  awaitingDeletion: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Dynamoose schema.
 */
const userSchema = new dynamoose.Schema(
  {
    phone: {
      type: String,
      hashKey: true,
      required: true,
      validate: (v: ValueType) => {
        if (typeof v !== 'string') {
          throw new Error('Phone must be a string in E.164 format');
        }
        return /^\+[1-9]\d{1,14}$/.test(v);
      },
    },
    subscriptionStatus: {
      type: Boolean,
      required: true,
      default: true,
    },
    awaitingResponse: {
      type: Boolean,
      required: true,
      default: false,
    },
    rateLimitCounter: {
      type: Number,
      required: true,
      default: 0,
      validate: (v: ValueType) => {
        if (typeof v !== 'number') return false;
        return v >= 0;
      },
    },
    rateLimitWindowExpiresAt: {
      type: String, // ISO string when the throttle window ends
      required: false,
    },
    awaitingDeletion: {
      type: Number,
      required: true,
      default: 0,
      validate: (v: ValueType) => {
        if (typeof v !== 'number') return false;
        return v === 0 || v === 1;
      },
    },
    createdAt: {
      type: String,
      required: false,
    },
    updatedAt: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: {
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    },
  },
);

export const UserModel = dynamoose.model(
  process.env.DYNAMODB_TABLE || 'NalukataqUsers-dev',
  userSchema,
);
