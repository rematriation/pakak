# Wireless Carriers &amp; Texting Campaigns

## Reputation Metrics for Sending Phone Numbers

Wireless carriers develop reputation metrics that measure the reputation of your phone numbers. While this information is unfortunately not public, there are a few wknown and shared factors that determine your sending number reputation:

- **Number registration** – is the sending number registered as a short code, toll-free or 10DLC?
- **Area code match** – does the sender/recipient area code match?
- **Opt-out rate** – what is the sending number’s opt-out rate?
- **Sending Volume** – what is the average sending volume?
- **Reply/engagement rate** – what is the positive reply rate (excluding opt-outs) of the messages sent?
- **Not-deliverable** – how many messages are non-deliverable (invalid numbers, land lines, etc.)?
- **Content filtering** – has the content been filtered for S.H.A.F.T. content or other violations?
- **Embedded URLs** – are the embedded URLs using public URL shorteners?
- **Content at URL** – what type of content is hosted at the URL?
- **Embedded number** – is a number embedded in the message that is different than the sending number?
- **Image content** – was filtered content found through optical character recognition of an image?

## How to "Warm Up" Your Sending Phone Numbers

Consider some of the following strategies to help warm up your sending phone numbers and build a positive reputation score.

### Target less than 60 messages/minute for long codes

As per the CTIA, 10DLCs should stay under 15 to 60 messages per minute and under 200 unique recipients a day.

### Including URLs can decrease delivery rates

URLs can negatively impact delivery and increase the likelihood of getting flagged as a carrier violation. But, there are some ways to avoid getting flagged:

- **Avoid public URL shorteners**. Public URL shorteners, such as “bit.ly”, “tinyurl.com”, since carriers do not know what content the recipient may be redirected to.
  - *Recommendation*: Use your own domain for URL shortening. Avoid public URL shorteners like https://bit.ly
- **Use replies in your sending number warm-up campaign**. Replies, other than those used to opt-out, are a positive signal for your sending reputation, so encourage a reply in the first message sent from a new number. This practice will help wireless carriers interpret your content as expected and welcomed by the recipient.
- **Don’t use flag words and avoid carrier violations**. Aggressive language, repetitive content, hyperbole (exaggeration), too many CAPITALIZED words and even certain keywords can violate a carrier’s rules.
  - *Example*: The word “gift” with a "$" symbol looks like spam to the content-checking programs carriers use.

## Reasons a text message won’t deliver

- Carrier has blocked your message (carrier violation)
- Mobile number is undeliverable, not MMS capable, or outside your approved sending geography
- Message contains SPAM
- Recipient has previously blocked your message

## Indications you may be carrier blocked

You may see messages like this in your logs:

- “your message content was flagged as going against carrier guidelines”
- “phone carrier has blocked this message”
- “your user or phone number has been blocked from sending messages”
