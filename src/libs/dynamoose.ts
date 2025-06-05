import dynamoose from 'dynamoose';
import { DynamoDB } from '@aws-sdk/client-dynamodb';

const ddbClient = new DynamoDB({
  region: process.env.AWS_REGION || 'us-east-1',
});

dynamoose.aws.ddb.set(ddbClient);

dynamoose.Table.defaults.set({
  create: false,
});

export default dynamoose;
