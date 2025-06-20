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
    '<Response><Message>Sorry, I don&apos;t understand that command. Try START or STOP.</Message></Response>',
  ),
  PROCESSING_REQUEST: asTwimlXmlString(
    '<Response><Message>We are currently processing another request for you. Please wait a moment.</Message></Response>',
  ),
  WELCOME_MESSAGE: asTwimlXmlString(
    '<Response><Message>Hi from us at Aqqaluk Trust! Welcome to our special Sivu Summer archiving activity.\nReply "START" to subscribe, continue receiving msgs from us, and complete the Sivu Summer activity.\nMsg &amp; data rates may apply. Reply STOP to unsubscribe at anytime.</Message></Response>',
  ),
  THANK_YOU: asTwimlXmlString(
    '<Response><Message>Thank you for your submission!</Message></Response>',
  ),
  SUBSCRIPTION_CONFIRMATION: asTwimlXmlString(
    `<Response>
      <Message>
        Aqqaluk Trust: Taikuu! You've opted into receiving and submitting msgs. Msg &amp; data rates may apply. Reply STOP to unsubscribe.
      </Message>
      <Message>
        <Media>
          ${process.env.STATIC_ASSETS_BASE_URL}/images/${process.env.INUPIAT_VALUES_IMAGE_NAME}
        </Media>
        Save this image of the Inupiat Ilitqusiat to your phone. It will come in handy later! Reply STOP to unsubscribe.
      </Message>
    </Response>`,
  ),
  ALREADY_SUBSCRIBED: asTwimlXmlString(
    '<Response><Message>You are subscribed. Reply DELETE to delete your data and unsubscribe. Reply STOP to just opt-out.</Message></Response>',
  ),
  PROMPT_START_MESSAGE: asTwimlXmlString(
    '<Response><Message>If you would like to subscribe, reply "START". Msg &amp; data rates may apply.</Message></Response>',
  ),
  EMPTY_MESSAGE: asTwimlXmlString('<Response></Response>'),
  HELP_MESSAGE: asTwimlXmlString(
    '<Response><Message>Aqqaluk Trust: Reply STOP to unsubscribe,\nSTART to subscribe,\nINU for Inupiat Ilitqusiat values, or\nHELP to see these options again.</Message></Response>',
  ),
  INUPIAT_VALUES_MESSAGE: asTwimlXmlString(
    `<Response>
      <Message>
        <Media>
          ${process.env.STATIC_ASSETS_BASE_URL}/images/${process.env.INUPIAT_VALUES_IMAGE_NAME}
        </Media>
        Save this image of the Inupiat Ilitqusiat to your phone. It will come in handy later!
      </Message>
    </Response>`,
  ),
  DELETE_CONFIRMATION_MESSAGE: asTwimlXmlString(
    '<Response><Message>Your data deletion request has been received. This will also unsubscribe you from messages. It will be processed shortly.</Message></Response>',
  ),
  TRY_AGAIN_NEXT_DAY_AFTER_DELETION: asTwimlXmlString(
    '<Response><Message>You have requested data deletion and have been unsubscribed. Please try to resubscribe again tomorrow.</Message></Response>',
  ),
};

export const RESPONSE = {
  GENERIC_FALLBACK_MESSAGE: "I'm sorry, I didn't understand that.",
  GENERIC_ACK: 'Thank you!',
};
