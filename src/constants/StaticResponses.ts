import { asTwimlXmlString } from '../libs/types';

export const TWI_ML_RESPONSE = {
  UNSUBSCRIBE_SUCCESS: asTwimlXmlString(
    '<Response><Message>You have been unsubscribed. Reply START to resubscribe.</Message></Response>',
  ),
  RATE_LIMIT_EXCEEDED: asTwimlXmlString(
    '<Response><Message>Too many requests. Please slow down. You can send messages again after {{RETURN_TIME}}.</Message></Response>',
  ),
  GENERIC_ERROR: asTwimlXmlString(
    '<Response><Message>An unexpected error occurred. Please try again later.</Message></Response>',
  ),
  UNKNOWN_COMMAND: asTwimlXmlString(
    '<Response><Message>Sorry, I don&apos;t understand that command. Try START or STOP.</Message></Response>',
  ),
  PROCESSING_REQUEST: asTwimlXmlString(
    '<Response><Message>Please wait a moment...</Message></Response>',
  ),
  WELCOME_MESSAGE: asTwimlXmlString(
    "<Response><Message>Hi from Aqqaluk Trust.\nWelcome to our Sivu Summer archiving activity with our app called Pakak.\nReply START to agree to receive about 8-10 messages from Aqqaluk Trust for each submission.\nReview Pakak's Terms of Services (www.aqqaluktrust.com/pakak-tos/) and Privacy Policy (www.aqqaluktrust.com/pakak-privacy/). Msg &amp; data rates may apply.\nReply STOP to opt-out.</Message></Response>",
  ),
  THANK_YOU: asTwimlXmlString(
    '<Response><Message>Thank you for your submission!</Message></Response>',
  ),
  SUBSCRIPTION_CONFIRMATION: asTwimlXmlString(
    `<Response>
      <Message>
        Aqqaluk Trust: Taikuu! You've opted into receiving and submitting msgs. Reply INU to get the image of Inupiat Ilitqusiat to your phone. Msg &amp; data rates may apply. Reply STOP to unsubscribe.
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
  GENERIC_FALLBACK_MESSAGE: asTwimlXmlString(
    "<Response><Message>I'm sorry, I didn't understand that.</Message></Response>",
  ),
};

export const RESPONSE = {
  GENERIC_FALLBACK_MESSAGE: "I'm sorry, I didn't understand that.",
  GENERIC_ACK: 'Thank you!',
  IMAGE_SUBMISSION_SUCCESS:
    "Thank you for submitting the picture! We're processing it and will let you know if there's an issue with it. In the meantime, please answer the following questions.",
  GENERIC_USER_ERROR: 'An error occurred. Please send the message again.',
  GENERIC_ERROR: 'An unexpected error occurred. Please wait.',
};
