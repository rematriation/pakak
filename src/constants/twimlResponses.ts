export const TWI_ML_RESPONSES = {
  UNSUBSCRIBE_SUCCESS:
    '<Response><Message>You have been unsubscribed. Reply START to resubscribe.</Message></Response>',
  RATE_LIMIT_EXCEEDED:
    '<Response><Message>Too many requests. Please slow down.</Message></Response>',
  GENERIC_ERROR:
    '<Response><Message>An unexpected error occurred. Please try again later.</Message></Response>',
  UNKNOWN_COMMAND:
    "<Response><Message>Sorry, I don't understand that command. Try START or STOP.</Message></Response>",
  PROCESSING_REQUEST:
    '<Response><Message>We are currently processing another request for you. Please wait a moment.</Message></Response>',
  WELCOME_MESSAGE:
    '<Response><Message>Hi from us at Aqqaluk Trust! Welcome to our special Sivu Summer archiving activity.\nReply "START" to subscribe, continue receiving msgs from us, and complete the Sivu Summer activity.\nMsg &amp; data rates may apply. Reply STOP to unsubscribe at anytime.</Message></Response>',
  THANK_YOU: '<Response><Message>Thank you!</Message></Response>',
};
