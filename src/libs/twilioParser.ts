import { parse } from 'querystring';
import { AppError } from './errors/AppError';
import { ErrorCode } from './errors/ErrorCode';

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
): Record<string, string | undefined> {
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

  const params: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(rawParams)) {
    if (Array.isArray(value)) {
      params[key] = value[0];
    } else {
      params[key] = value;
    }
  }

  return params;
}
