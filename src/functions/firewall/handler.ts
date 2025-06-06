import 'reflect-metadata';
import { container } from 'tsyringe';
// import { FirewallService } from '../../services/FirewallService';
import { UserRepository } from '../../repositories/UserRepository';
import { APIGatewayProxyHandler, APIGatewayProxyResult, APIGatewayProxyEvent } from 'aws-lambda';
import { AppError } from '../../libs/errors/AppError';
import { ErrorCode } from '../../libs/errors/ErrorCode';
import { IUser } from '../../models/User';
import { TWI_ML_RESPONSES } from '../../constants/twimlResponses';
import {
  validateHttpMethod,
  parseAndValidatePostBody,
  validatePhoneNumber,
} from '../..//libs/requestValidator';

const userRepository: UserRepository = container.resolve(UserRepository);
// const firewallService = container.resolve(FirewallService);
const TTL_FOR_PROCESSING_LOCK = 60;

export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const methodError = validateHttpMethod(event.httpMethod);
  if (methodError) {
    return Promise.resolve(methodError as APIGatewayProxyResult);
  }

  if (event.httpMethod === 'GET') {
    return handleGet();
  }

  return handlePost(event);
};

async function handleGet(): Promise<APIGatewayProxyResult> {
  console.debug(`Handler :: GET call received.`);
  return Promise.resolve({
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'OK' }),
  });
}

async function handlePost(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  let phoneNumber: string | null = null;
  try {
    const twilioParsedParams = parseAndValidatePostBody(event);
    phoneNumber = validatePhoneNumber(twilioParsedParams);

    let user: IUser | null = await userRepository.getUser(phoneNumber);

    if (!user) {
      console.log(`Handler :: User ${phoneNumber} does not exist. Attempting to create.`);
      user = await userRepository.createUser({
        phone: phoneNumber,
        subscriptionStatus: false,
        awaitingDeletion: 0,
        rateLimitCounter: 0,
      });

      if (!user) {
        console.warn(
          `Handler :: Concurrent creation for ${phoneNumber}. Another process is handling.`,
        );
        return Promise.resolve({
          statusCode: 200,
          headers: { 'Content-Type': 'text/xml' },
          body: '<Response></Response>',
        });
      }
    }

    const lockAcquired = await userRepository.acquireProcessingLock(
      phoneNumber,
      TTL_FOR_PROCESSING_LOCK,
    );

    if (!lockAcquired) {
      console.log(`Handler :: Concurrent request for ${phoneNumber}. Lock already held.`);
      return Promise.resolve({
        statusCode: 200,
        headers: { 'Content-Type': 'text/xml' },
        body: TWI_ML_RESPONSES.PROCESSING_REQUEST,
      });
    }

    return Promise.resolve({
      statusCode: 200,
      headers: { 'Content-Type': 'text/xml' },
      body: TWI_ML_RESPONSES.THANK_YOU,
    });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      console.warn({ code: err.code, message: err.message }, 'Handler :: Application-level error.');
      return Promise.resolve({
        statusCode: 400,
        body: JSON.stringify({
          code: err.code,
          message: err.message,
        }),
      });
    } else if (err instanceof Error) {
      console.error(
        { errorName: err.name, errorMessage: err.message },
        'Handler :: Standard Error caught.',
      );
      return Promise.resolve({
        statusCode: 500,
        body: JSON.stringify({
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          message: err.message || TWI_ML_RESPONSES.GENERIC_ERROR,
        }),
      });
    } else {
      console.error({ err }, 'Handler :: Unhandled non-Error type exception.');
      return Promise.resolve({
        statusCode: 500,
        body: JSON.stringify({
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          message: TWI_ML_RESPONSES.GENERIC_ERROR,
        }),
      });
    }
  } finally {
    if (phoneNumber) {
      await userRepository.releaseProcessingLock(phoneNumber);
    }
  }
}
