import { parse } from 'querystring';
import { AppError } from './errors/AppError';
import { ErrorCode } from './errors/ErrorCode';
import { IIncomingMessage } from '../models/IncomingMessage';

/**
 * Helper to safely get a string value from rawParams, handling arrays and undefined.
 * @param rawParams The raw parsed parameters.
 * @param key The key to retrieve.
 * @returns The string value or undefined.
 */
function getValue(
  rawParams: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const val = rawParams[key];
  return Array.isArray(val) ? val[0] : val;
}

/**
 * Validates a required string field from parsed parameters.
 * @param rawParams The parsed parameters.
 * @param key The key of the required field.
 * @param errorMessage The error message if the field is missing.
 * @returns The string value of the required field.
 * @throws AppError if the field is missing.
 */
function getRequiredString(
  rawParams: Record<string, string | string[] | undefined>,
  key: string,
  errorMessage: string,
): string {
  const value = getValue(rawParams, key);
  if (!value) {
    throw new AppError(ErrorCode.MISSING_TWILIO_FIELD, errorMessage);
  }
  return value;
}

/**
 * Extracts and validates media information from parsed Twilio parameters.
 * @param rawParams The parsed Twilio parameters.
 * @param messageSid The message SID for logging context.
 * @returns An object containing hasMedia, mediaUrls, and mediaContentTypes.
 * @throws AppError if mediaContentType and mediaUrl count do not match numMedia.
 */
function extractMediaInfo(
  rawParams: Record<string, string | string[] | undefined>,
  messageSid: string | undefined,
): {
  numMedia: number;
  mediaUrls: string[];
  mediaContentTypes: string[];
} {
  const numMedia = parseInt(getValue(rawParams, 'NumMedia') || '', 10) || 0;

  const mediaUrls: string[] = [];
  const mediaContentTypes: string[] = [];

  if (numMedia) {
    for (let i = 0; i < numMedia; i++) {
      const mediaUrl = getValue(rawParams, `MediaUrl${i}`);
      const mediaContentType = getValue(rawParams, `MediaContentType${i}`);

      if (mediaUrl) {
        mediaUrls.push(mediaUrl);
      } else {
        console.error(`decodeAndParseBody :: Missing MediaUrl${i} for messageSid ${messageSid}`);
        throw new AppError(
          ErrorCode.MISSING_TWILIO_FIELD,
          `Missing MediaUrl${i} for messageSid ${messageSid}`,
        );
      }
      if (mediaContentType) {
        mediaContentTypes.push(mediaContentType);
      } else {
        console.error(
          `decodeAndParseBody :: Missing MediaContentType${i} for messageSid ${messageSid}`,
        );
        throw new AppError(
          ErrorCode.MISSING_TWILIO_FIELD,
          `Missing MediaContentType${i} for messageSid ${messageSid}`,
        );
      }
    }
  }
  return { numMedia, mediaUrls, mediaContentTypes };
}

/**
 * Decode a potentially Base64‐encoded string and parse it as URL‐encoded form data.
 *
 * @param rawBody    The raw request body (may be a Base64 string or plain text).
 * @param isBase64   True if rawBody is Base64‐encoded; false if it’s already UTF-8 text.
 * @return           A flat Record<string, string> of parsed fields.
 * @throws AppError  With ErrorCode.MISSING_BODY if rawBody is null/undefined/empty.
 * @throws AppError  With ErrorCode.INVALID_BASE64 if Base64 decoding fails.
 * @throws AppError  With ErrorCode.MALFORMED_URLENCODED if URL-encoded parsing fails.
 */
export function decodeAndParseBody(
  rawBody: string | null | undefined,
  isBase64: boolean,
): IIncomingMessage {
  if (!rawBody) {
    throw new AppError(ErrorCode.MISSING_BODY, 'Missing request body.');
  }

  let decodedBody: string;
  if (isBase64) {
    try {
      decodedBody = Buffer.from(rawBody, 'base64').toString('utf-8');
    } catch {
      throw new AppError(ErrorCode.INVALID_BASE64, 'Invalid Base64 payload.');
    }
  } else {
    decodedBody = rawBody;
  }

  let rawParams: Record<string, string | string[] | undefined>;
  try {
    rawParams = parse(decodedBody);
  } catch {
    throw new AppError(ErrorCode.MALFORMED_URLENCODED, 'Malformed URL-encoded payload.');
  }

  const messageSid = getRequiredString(
    rawParams,
    'MessageSid',
    'Missing From phone number in Twilio parameters.',
  );
  const phoneNumber = getRequiredString(
    rawParams,
    'From',
    'Missing From phone number in Twilio parameters.',
  );
  const messageText = getValue(rawParams, 'Body') || '';

  const { numMedia, mediaUrls, mediaContentTypes } = extractMediaInfo(rawParams, messageSid);

  const incomingMessage: IIncomingMessage = {
    messageSid: messageSid,
    phoneNumber: phoneNumber,
    fromCity: getValue(rawParams, 'FromCity'),
    fromState: getValue(rawParams, 'FromState'),
    fromZip: getValue(rawParams, 'FromZip'),
    messageText: messageText,
    numMedia: numMedia,
    mediaUrls: mediaUrls,
    mediaContentTypes: mediaContentTypes,
  };

  console.debug('decodeAndParseParams :: incoming message object constructed :: ', incomingMessage);
  return incomingMessage;
}
