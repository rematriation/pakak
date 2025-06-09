import { APIGatewayProxyHandler, APIGatewayProxyResult, APIGatewayProxyEvent } from 'aws-lambda';
import { decodeAndParseBody } from '../../libs/twilioParser';
import { AppError } from '../../libs/errors/AppError';
import { ErrorCode } from '../../libs/errors/ErrorCode';

export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const method = event.httpMethod;
  let response: APIGatewayProxyResult;
  // Allow only GET and POST
  if (!method || (method.toUpperCase() != 'GET' && method.toUpperCase() != 'POST')) {
    console.warn(`Only GET and POST calls allowed. Received: ${method}.`);
    response = {
      statusCode: 405,
      headers: { Allow: 'GET, POST' },
      body: JSON.stringify({ error: `Method ${method} not allowed.` }),
    };
  } else if (method == 'GET') {
    console.debug('GET call received. event::', event);
    response = {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'OK' }),
    };
  } else {
    // POST call
    if (!event.body) {
      console.warn('Missing request body. event::', event);
      response = {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing request body.' }),
      };
    } else {
      try {
        console.debug({ event }, 'Received event.');
        const params: Record<string, string | undefined> = decodeAndParseBody(
          event.body,
          event.isBase64Encoded,
        );
        const messageBody = params.Body;
        console.debug({ messageBody }, 'Twilio Message Body');
      } catch (err) {
        if (err instanceof AppError) {
          console.warn({ code: err.code, message: err.message }, "Couldn't parse request body.");
          return {
            statusCode: 400,
            body: JSON.stringify({
              code: err.code,
              message: err.message,
            }),
          };
        }
        console.error({ err }, 'Unhandled exception');
        response = {
          statusCode: 500,
          body: JSON.stringify({
            code: ErrorCode.INTERNAL_SERVER_ERROR,
            message: 'An unexpected error occurred.',
          }),
        };
      }

      response = {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Received' }),
      };
    }
  }
  return Promise.resolve(response);
};
