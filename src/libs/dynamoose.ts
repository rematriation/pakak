import dynamoose from 'dynamoose';
import { ConditionalCheckFailedException, DynamoDB } from '@aws-sdk/client-dynamodb';

const ddbClient = new DynamoDB({
  region: process.env.AWS_REGION || 'us-east-1',
});

dynamoose.aws.ddb.set(ddbClient);

dynamoose.Table.defaults.set({
  create: false,
});

export default dynamoose;

export function checkErrorisConditionalCheckFailedException(err: unknown): boolean {
  const error = err as {
    name?: string;
    code?: string;
  };

  return (
    error instanceof ConditionalCheckFailedException ||
    error.name === 'ConditionalCheckFailedException' ||
    error.code === 'ConditionalCheckFailedException' ||
    error.name === 'ConditionalCheckFailed' ||
    error.code === 'ConditionalCheckFailed'
  );
}
