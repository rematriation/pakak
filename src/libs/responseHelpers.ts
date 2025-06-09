import { APIGatewayProxyResult } from 'aws-lambda';
import { TwimlXmlString } from './types';

/**
 * Standard API Gateway Twilio (TwiML) response.
 *
 * @param twimlBody The TwiML XML string to send in the response body.
 * @param statusCode The HTTP status code for the response (default: 200).
 * @returns An APIGatewayProxyResult object ready to be returned by a Lambda.
 */
export function twilioResponse(
  twimlBody: TwimlXmlString,
  statusCode: number = 200,
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: { 'Content-Type': 'text/xml' },
    body: twimlBody,
  };
}
