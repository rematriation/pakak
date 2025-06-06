import { APIGatewayProxyEvent } from 'aws-lambda';
import { AppError } from './errors/AppError';
import { ErrorCode } from './errors/ErrorCode';
import { decodeAndParseBody } from './twilioParser';

export function validateHttpMethod(
  method: string | undefined | null,
): { statusCode: number; headers: Record<string, string>; body: string } | null {
  if (!method) {
    console.warn(`Handler :: No HTTP method provided.`);
    return {
      statusCode: 405,
      headers: { Allow: 'GET, POST' },
      body: JSON.stringify({ error: `No HTTP method provided.` }),
    };
  }

  const upper = method.toUpperCase();
  if (upper !== 'GET' && upper !== 'POST') {
    console.warn(`Handler :: Only GET and POST allowed. Received: ${method}.`);
    return {
      statusCode: 405,
      headers: { Allow: 'GET, POST' },
      body: JSON.stringify({ error: `Method ${method} not allowed.` }),
    };
  }

  return null;
}

/**
 * Parses and validates the request body for POST requests.
 * Throws AppError for known parsing issues, or other errors for unexpected issues.
 * @param event The API Gateway event.
 * @returns Parsed body parameters.
 */
export function parseAndValidatePostBody(
  event: APIGatewayProxyEvent,
): Record<string, string | undefined> {
  if (!event.body) {
    console.warn('RequestValidator :: Missing request body. event::', event);
    throw new AppError(ErrorCode.MISSING_BODY, 'Missing request body.');
  }

  try {
    const params: Record<string, string | undefined> = decodeAndParseBody(
      event.body,
      event.isBase64Encoded,
    );
    return params;
  } catch (err: unknown) {
    if (err instanceof AppError) {
      console.warn(
        { code: err.code, message: err.message },
        "RequestValidator :: Couldn't parse request body.",
      );
      throw err; // Re-throw AppError to be handled upstream
    }
    console.error({ err }, 'RequestValidator :: Unhandled exception during body parsing.');
    throw new AppError(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'An unexpected error occurred during request parsing.',
    );
  }
}

/**
 * Validates the presence and format of the phone number in parsed Twilio parameters.
 * Assumes phone numbers should be in E.164 format (e.g., "+15551234567").
 *
 * @param params The parsed Twilio parameters.
 * @returns The validated phone number string.
 * @throws AppError if the phone number is missing or has an invalid format.
 */
export function validatePhoneNumber(params: Record<string, string | undefined>): string {
  const phoneNumber = params.From; // Assuming 'From' is the phone number field

  if (!phoneNumber) {
    console.warn('RequestValidator :: Missing phone number in Twilio params.');
    throw new AppError(
      ErrorCode.MISSING_TWILIO_FIELD,
      'Missing phone number in Twilio parameters.',
    );
  }

  const e164Regex = /^\+[1-9]\d{1,14}$/;

  if (!e164Regex.test(phoneNumber)) {
    console.warn(`RequestValidator :: Invalid phone number format: ${phoneNumber}. Must be E.164.`);
    throw new AppError(
      ErrorCode.INVALID_PHONE_NUMBER_FORMAT,
      'Invalid phone number format. Must be in E.164 format (e.g., +15551234567).',
    );
  }

  return phoneNumber;
}
