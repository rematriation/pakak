import 'reflect-metadata';
import { container } from 'tsyringe';
import { FirewallService } from '../../services/FirewallService';
import { UserRepository } from '../../repositories/UserRepository';
import { APIGatewayProxyHandler, APIGatewayProxyResult, APIGatewayProxyEvent } from 'aws-lambda';
import { AppError } from '../../libs/errors/AppError';
import { ErrorCode } from '../../libs/errors/ErrorCode';
import { IUser } from '../../models/User';
import { TWI_ML_RESPONSE } from '../../constants/TwiMLResponse';
import {
  validateHttpMethod,
  parseAndValidatePostBody,
  validatePhoneNumber,
} from '../../libs/requestValidator';
import { twilioResponse } from '../../libs/responseHelpers';
import { SQSService, ISQSServiceToken } from '../../libs/SQSService';
import { AppConfig, IAppConfigToken } from '../../configs/AppConfig';
import { IIncomingMessage } from '../../models/IncomingMessage';

container.register(IAppConfigToken, { useClass: AppConfig });
const userRepository: UserRepository = container.resolve(UserRepository);
container.register(ISQSServiceToken, { useClass: SQSService });
const firewallService = container.resolve(FirewallService);

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
  let lockAcquired: boolean = false;
  let errorRaised: boolean = false;
  let delegatedToService: boolean = false;
  try {
    const incomingMessage: IIncomingMessage = parseAndValidatePostBody(event);
    phoneNumber = incomingMessage.phoneNumber;
    validatePhoneNumber(phoneNumber);

    const user: IUser | null = await userRepository.getUser(phoneNumber);

    if (!user) {
      return createNewUser(phoneNumber);
    }

    lockAcquired = await userRepository.acquireProcessingLock(phoneNumber, TTL_FOR_PROCESSING_LOCK);
    if (!lockAcquired) {
      console.info(`Handler :: Concurrent request for ${phoneNumber}. Lock already held.`);
      return Promise.resolve({
        statusCode: 200,
        headers: { 'Content-Type': 'text/xml' },
        body: TWI_ML_RESPONSE.PROCESSING_REQUEST,
      });
    }

    delegatedToService = true;
    return firewallService.processMessage(phoneNumber, user, incomingMessage);
  } catch (err: unknown) {
    errorRaised = true;
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
          message: err.message || TWI_ML_RESPONSE.GENERIC_ERROR,
        }),
      });
    } else {
      console.error({ err }, 'Handler :: Unhandled non-Error type exception.');
      return Promise.resolve({
        statusCode: 500,
        body: JSON.stringify({
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          message: TWI_ML_RESPONSE.GENERIC_ERROR,
        }),
      });
    }
  } finally {
    if (phoneNumber && lockAcquired && (errorRaised || !delegatedToService)) {
      void userRepository.releaseProcessingLock(phoneNumber);
    }
  }
}

async function createNewUser(phoneNumber: string): Promise<APIGatewayProxyResult> {
  console.info(`Handler :: User ${phoneNumber} does not exist. Attempting to create.`);
  void userRepository.createUser({
    phone: phoneNumber,
    subscriptionStatus: false,
    awaitingDeletion: 0,
    rateLimitCounter: 0,
  });

  return Promise.resolve(twilioResponse(TWI_ML_RESPONSE.WELCOME_MESSAGE));
}
