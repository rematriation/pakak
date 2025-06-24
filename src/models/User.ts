import { ValueType } from 'dynamoose/dist/Schema';
import dynamoose from '../infrastructure/dynamoose';
import { ConversationState } from '../constants/ConversationState';
import { ICampaignContext } from './CampaignContext';

/**
 * IUser describes the attribute shape in DynamoDB.
 * - phone:                     Partition key in E.164 format (e.g. "+15551234567")
 * - subscriptionStatus:        true = opt-in, false = STOP
 * - isProcessingMessage:       true if message is being processed.
 * - rateLimitCounter:          messages sent in current window
 * - rateLimitWindowExpiresAt?: ISO timestamp when the window ends
 * - awaitingDeletion:          0 or 1 (flag for background purge)
 * - createdAt?:                ISO-8601 (auto-populated)
 * - updatedAt?:                ISO-8601 (auto-populated)
 */
export interface IUser {
  phone: string;
  subscriptionStatus: boolean;
  isProcessingMessage?: number | null;
  rateLimitCounter?: number | null;
  rateLimitWindowExpiresAt?: string;
  awaitingDeletion: number;
  conversationState?: ConversationState;
  campaignContext?: ICampaignContext;
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
      default: false,
    },
    isProcessingMessage: {
      type: Number,
      required: false,
    },
    rateLimitCounter: {
      type: Number,
      required: false,
      default: 0,
      validate: (v: ValueType) => {
        if (typeof v !== 'number') return false;
        return v >= 0;
      },
    },
    rateLimitWindowExpiresAt: {
      type: String,
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
    conversationState: {
      type: String,
      enum: Object.values(ConversationState),
      required: false,
      default: ConversationState.IDLE,
    },
    campaignContext: {
      type: Object,
      schema: {
        submissionId: {
          type: String,
          default: '',
        },
        flowId: {
          type: String,
          default: 'NONE',
        },
        currentStepId: {
          type: String,
          default: 'NONE',
        },
      },
      default: {},
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
  process.env.DYNAMODB_TABLE || 'PakakUsers-dev',
  userSchema,
);
