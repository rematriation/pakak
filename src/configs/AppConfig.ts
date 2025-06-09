/**
 * @author Daksh Pratap Singh
 * @email daksh204singh@gmail.com
 * @create date 2025-06-09 15:20:46
 * @modify date 2025-06-09 15:20:46
 * @desc AppConfig
 */

import { injectable } from 'tsyringe';
import { ErrorCode } from '../libs/errors/ErrorCode';
import { AppError } from '../libs/errors/AppError';

/**
 * Interface defining the application's configuration pulled from environment variables.
 */
export interface IAppConfig {
  appStage: string;
  nodeEnv: string;
  logLevel: string;
  dynamoDbTable: string;
  twilioNumber: string;
  incomingSqsQueueUrl: string;
  outgoingSqsQueueUrl: string;
  awsRegion: string;
}

/**
 * Token for injecting the application configuration.
 */
export const IAppConfigToken = Symbol('IAppConfig');

/**
 * Concrete implementation of IAppConfig that loads values from process.env.
 * Performs basic validation and throws errors if required variables are missing.
 */
@injectable()
export class AppConfig implements IAppConfig {
  public readonly appStage: string;
  public readonly nodeEnv: string;
  public readonly logLevel: string;
  public readonly dynamoDbTable: string;
  public readonly twilioNumber: string;
  public readonly incomingSqsQueueUrl: string;
  public readonly outgoingSqsQueueUrl: string;
  public readonly awsRegion: string;

  constructor() {
    this.appStage = this.getRequiredEnv('APP_STAGE');
    this.nodeEnv = this.getRequiredEnv('NODE_ENV');
    this.logLevel = this.getRequiredEnv('LOG_LEVEL');
    this.dynamoDbTable = this.getRequiredEnv('DYNAMODB_TABLE');
    this.twilioNumber = this.getRequiredEnv('TWILIO_NUMBER');
    this.incomingSqsQueueUrl = this.getRequiredEnv('INCOMING_SQS_QUEUE_URL');
    this.outgoingSqsQueueUrl = this.getRequiredEnv('OUTGOING_SQS_QUEUE_URL');
    this.awsRegion = process.env.AWS_REGION || 'us-east-1';
  }

  /**
   * Helper to get a required environment variable, throwing an error if missing.
   * @param key The name of the environment variable.
   * @returns The value of the environment variable.
   * @throws Error if the environment variable is not set.
   */
  private getRequiredEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new AppError(
        ErrorCode.MISSING_ENV_VARIABE,
        `Missing required environment variable: ${key}`,
      );
    }
    return value;
  }
}
