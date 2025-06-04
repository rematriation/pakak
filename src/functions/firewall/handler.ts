import { APIGatewayProxyHandlerV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { decodeAndParseBody } from '../../libs/twilioParser';
import { AppError } from '../../libs/errors/AppError';
import { logger } from '../../libs/logger';
import { ErrorCode } from '../../libs/errors/ErrorCode';

export const handler: APIGatewayProxyHandlerV2 = async (
  event,
  context,
): Promise<APIGatewayProxyResultV2> => {
  const log = logger.child({
    functionName: context.functionName,
    requestId: context.awsRequestId,
  });

  let response: APIGatewayProxyResultV2;
  if (!event.body) {
    log.warn('Missing request body.');
    response = {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing request body.' }),
    };
  } else {
    try {
      log.debug({ event }, 'Received event.');
      const params: Record<string, string | undefined> = decodeAndParseBody(
        event.body,
        event.isBase64Encoded,
      );
      const messageBody = params.Body;
      log.debug({ messageBody }, 'Twilio Message Body');
    } catch (err) {
      if (err instanceof AppError) {
        log.warn({ code: err.code, message: err.message }, "Couldn't parse request body.");
        return {
          statusCode: 400,
          body: JSON.stringify({
            code: err.code,
            message: err.message,
          }),
        };
      }
      log.error({ err }, 'Unhandled exception');
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
  return Promise.resolve(response);
};
