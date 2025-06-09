import { asTwimlXmlString } from '../libs/types';

export const TWI_ML_RESPONSE = {
  UNSUBSCRIBE_SUCCESS: asTwimlXmlString(
    '<Response><Message>You have been unsubscribed. Reply START to resubscribe.</Message></Response>',
  ),
  RATE_LIMIT_EXCEEDED: asTwimlXmlString(
    '<Response><Message>Too many requests. Please slow down.</Message></Response>',
  ),
  GENERIC_ERROR: asTwimlXmlString(
    '<Response><Message>An unexpected error occurred. Please try again later.</Message></Response>',
  ),
  UNKNOWN_COMMAND: asTwimlXmlString(
    "<Response><Message>Sorry, I don't understand that command. Try START or STOP.</Message></Response>",
  ),
  PROCESSING_REQUEST: asTwimlXmlString(
    '<Response><Message>We are currently processing another request for you. Please wait a moment.</Message></Response>',
  ),
  WELCOME_MESSAGE: asTwimlXmlString(
    '<Response><Message>Hi from us at Aqqaluk Trust! Welcome to our special Sivu Summer archiving activity.\nReply "START" to subscribe, continue receiving msgs from us, and complete the Sivu Summer activity.\nMsg & data rates may apply. Reply STOP to unsubscribe at anytime.</Message></Response>',
  ),
  THANK_YOU: asTwimlXmlString(
    '<Response><Message>Thank you for your submission!</Message></Response>',
  ),
  SUBSCRIPTION_CONFIRMATION: asTwimlXmlString(
    "<Response><Message>Aqqaluk Trust: Taikuu! You've opted into receiving and submitting msgs. Msg & data rates may apply. Reply STOP to unsubscribe.</Message></Response>",
  ),
  ALREADY_SUBSCRIBED: asTwimlXmlString(
    '<Response><Message>You are already subscribed. No need to START again!</Message></Response>',
  ),
  PROMPT_START_MESSAGE: asTwimlXmlString(
    '<body><Response><Message>If you would like to subscribe, reply "START". Msg & data rates may apply.</Message></Response></body>',
  ),
  EMPTY_MESSAGE: asTwimlXmlString(''),
};
