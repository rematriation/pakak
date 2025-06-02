import { APIGatewayProxyHandlerV2, APIGatewayProxyResultV2 } from 'aws-lambda';

export const handler: APIGatewayProxyHandlerV2 = () => {
  const response: APIGatewayProxyResultV2 = {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'OK' }),
  };

  return Promise.resolve(response);
};