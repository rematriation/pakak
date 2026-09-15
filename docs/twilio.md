# Pakak's Twilio Config &amp; Important Details

- **Brand**: Charity NPO via Aqqaluk Trust
- **A2P Messaging Plan**: Standard.
  - T-Mobile daily limits: 200,000
  - Trust Score: 75/100
  - Customer type: Nonprofit
- **Charity Campaign Message throughputs**:
  - AT&T: 40 MPS (message per second)
  - T-Mobile: 2k-200k daily caps, but depends on our brand Trust Score
- **Charity Pricing Fees**:
  - Campaign Registration Fees: $3/month
  - AT&T SMS Carrier Fees (Outbound): $0.00
  - AT&T MMS Carrier Fees (Outbound): $0.00
  - T-Mobile SMS Carrier Fees (In/Outbound): $0.00
  - T-Mobile MMS Carrier Fees (In/Outbound): $0.00
- **Messaging service**: nalukataq

## Why use Twilio?

- Useful APIs (Application Programming Interfaces) that makes developing and maintaining the application much easier.
- Work as a laison between us and mobile service carriers by creating a trust profile to avoid carriers' flagging and blocking of our text messages.

## Twilio terms &amp; acronyms

- **A2P**: Application-to-Person. When a software *application* sends SMS/MMS messages to *people*.
- **Twilio *Brand***: Twilio requires you to create a brand that represents you/your organization. They use th
- **Twilio *Campaign***: Twilio requires you to create campaigns that represent each of your use cases for their services.
- **10 DLC**: Ten-*D*igit *L*ong *C*ode numbers, .e.g, +1-800-555-5555
- Customer Profile: In addition to your brand, you can create a customer profile under Twilio's Trust Hub

## Twilio Setup Procedure

### 1. Create &amp; verify a Twilio brand

- See Twilio Help: [Programmable Messaging and A2P 10DLC](https://www.twilio.com/docs/messaging/compliance/a2p-10dlc)

Twilio requires you to create and verify a brand that represents you/your organization. They use your brand profile to develop trust scores to relay to mobile carriers. This profile can help the application communicate to carriers that any message sent to us and received by us is legit and not spam. In our case, we are working with the 501(c)3, Aqqaluk Trust, so we also will receive the following advantages:

1. Discounts per SMS/MMS sent and received
2. Discounts per campaign
3. Higher message throughputs

Verification is required before sending/receiving SMS/MMS, and it ensures compliance with mobile carrier network regulations.

#### Twilio Brand-Types &amp; Constraints

<table data-paste-element="TABLE" data-paste-core-version="21.0.1" class="css-1yrg7uf"><thead data-paste-element="THEAD" data-paste-core-version="21.0.1" class="css-c08gur"><tr data-paste-element="TR" data-paste-core-version="21.0.1" class="css-1e22c8r"><th data-paste-element="TH" data-paste-core-version="21.0.1" class="css-kczchh"></th><th data-paste-element="TH" data-paste-core-version="21.0.1" class="css-kczchh"><strong>Sole Proprietor Brand</strong></th><th data-paste-element="TH" data-paste-core-version="21.0.1" class="css-kczchh"><strong>Low Volume Standard Brand</strong></th><th data-paste-element="TH" data-paste-core-version="21.0.1" class="css-kczchh"><strong>Standard Brand</strong></th></tr></thead><tbody data-paste-element="TBODY" data-paste-core-version="21.0.1" class="css-1u05hs8"><tr data-paste-element="TR" data-paste-core-version="21.0.1" class="css-1e22c8r"><td data-paste-element="TD" data-paste-core-version="21.0.1" class="css-4rjmal">Campaigns per Brand</td><td data-paste-element="TD" data-paste-core-version="21.0.1" class="css-4rjmal">One Campaign per Brand</td><td data-paste-element="TD" data-paste-core-version="21.0.1" class="css-4rjmal">Each Brand may register up to five Campaigns, unless a clear and valid business reason is provided for exceeding this limit</td><td data-paste-element="TD" data-paste-core-version="21.0.1" class="css-4rjmal">Each Brand may register up to five Campaigns, unless a clear and valid business reason is provided for exceeding this limit</td></tr><tr data-paste-element="TR" data-paste-core-version="21.0.1" class="css-1e22c8r"><td data-paste-element="TD" data-paste-core-version="21.0.1" class="css-4rjmal">Daily message volume</td><td data-paste-element="TD" data-paste-core-version="21.0.1" class="css-4rjmal">1,000 SMS segments and MMS per day to T-Mobile (approximately 3,000 SMS segments and MMS per day across US carriers)</td><td data-paste-element="TD" data-paste-core-version="21.0.1" class="css-4rjmal">Up to 2,000 SMS segments and MMS per day to T-Mobile (approximately 6,000 SMS segments and MMS per day across US carriers), with the exception of companies in the Russell 3000 Index, who will be able to send 200,000 SMS segments and MMS per day to T-Mobile</td><td data-paste-element="TD" data-paste-core-version="21.0.1" class="css-4rjmal">From 2,000 and up to unlimited SMS segments and MMS per day to T-Mobile, depending on your <a data-paste-element="ANCHOR" data-paste-core-version="21.0.1" href="https://help.twilio.com/hc/en-us/articles/1260804800549-T-Mobile-daily-message-limits-for-long-code-messaging-with-A2P-10DLC" rel="noreferrer noopener" target="_blank" title="Trust Score" class="css-lpeit6"><span data-paste-element="BOX" data-paste-core-version="21.0.1" class="css-roynbj">Trust Score<span data-paste-element="BOX" data-paste-core-version="21.0.1" class="css-1ezs782"><span data-paste-element="ICON" data-paste-core-version="21.0.1" class="css-pe4vrq"></span></span></span></a></td></tr></tbody></table>

### 2. Buy and register a phone number

- Twilio Help: [Toll-Free Verification Console Onboarding Guide](https://www.twilio.com/docs/messaging/compliance/toll-free/console-onboarding)
- Twilio Help: [Toll-Free message verification for US/Canada](https://help.twilio.com/articles/5377174717595-Toll-Free-Message-Verification-for-US-Canada)
- Twilio Blog: [New industry-wide requirements for toll-free messaging](https://www.twilio.com/en-us/blog/new-industry-wide-requirements-for-toll-free-messaging)

You can buy phone numbers through Twilio directly. There are 3 types:

1. 10 DLC (Ten digit long code)
    - *Throughput*: 1 SMS segments per second by default
2. Toll free
    - *Throughput*: 3 SMS segments per second by default, but can be increased. Note that MMS is currently not regulated in the same way, but Twilio suggests that this will most likely change in the future.
3. Shortcode

We recommend and used a toll-free number, since regular DLCs have slower throughputs and shortcodes are more expensive. Unless you have substantial funding, toll free is worth the investment.

Be sure to verify the number too. Twilio says one should allow approximately 3-5 business days for this process.

#### Per-sender vs. Per-account or Campaign Queuing

<table data-paste-element="TABLE" data-paste-core-version="21.0.0" data-testid="renderer-table" data-number-column="false" data-table-width="760" class="css-1yrg7uf"><tbody data-paste-element="TBODY" data-paste-core-version="21.0.0" class="css-1u05hs8"><tr data-paste-element="TR" data-paste-core-version="21.0.0" class="css-1e22c8r"><td data-paste-element="TD" data-paste-core-version="21.0.0" class="css-4rjmal">
<p data-paste-element="PARAGRAPH" data-paste-core-version="21.0.0" data-renderer-start-pos="1579" class="css-tcah8o"><span class="wysiwyg-color-black"><strong style="box-sizing: border-box;" data-renderer-mark="true">From</strong></span></p>
</td><td data-paste-element="TD" data-paste-core-version="21.0.0" class="css-4rjmal">
<p data-paste-element="PARAGRAPH" data-paste-core-version="21.0.0" data-renderer-start-pos="1587" class="css-tcah8o"><span class="wysiwyg-color-black"><strong style="box-sizing: border-box;" data-renderer-mark="true">To</strong></span></p>
</td><td data-paste-element="TD" data-paste-core-version="21.0.0" class="css-4rjmal">
<p data-paste-element="PARAGRAPH" data-paste-core-version="21.0.0" data-renderer-start-pos="1593" class="css-tcah8o"><span class="wysiwyg-color-black"><strong style="box-sizing: border-box;" data-renderer-mark="true">Message Segments per Second (MPS)</strong></span></p>
</td><td data-paste-element="TD" data-paste-core-version="21.0.0" class="css-4rjmal">
<p data-paste-element="PARAGRAPH" data-paste-core-version="21.0.0" data-renderer-start-pos="1630" class="css-tcah8o"><span class="wysiwyg-color-black"><strong style="box-sizing: border-box;" data-renderer-mark="true">Maximum Queue Length (Message Segments)</strong></span></p>
</td></tr>
<tr data-paste-element="TR" data-paste-core-version="21.0.0" class="css-1e22c8r"><td data-paste-element="TD" data-paste-core-version="21.0.0" class="css-4rjmal">
<p data-paste-element="PARAGRAPH" data-paste-core-version="21.0.0" data-renderer-start-pos="1759" class="css-tcah8o"><span class="wysiwyg-color-black">Twilio US &amp; CA Toll Free number</span></p>
</td><td data-paste-element="TD" data-paste-core-version="21.0.0" class="css-4rjmal">
<p data-paste-element="PARAGRAPH" data-paste-core-version="21.0.0" data-renderer-start-pos="1794" class="css-tcah8o"><span class="wysiwyg-color-black">US and Canada</span></p>
</td><td data-paste-element="TD" data-paste-core-version="21.0.0" class="css-4rjmal">
<p data-paste-element="PARAGRAPH" data-paste-core-version="21.0.0" data-renderer-start-pos="1811" class="css-tcah8o"><span class="wysiwyg-color-black">3<strong style="box-sizing: border-box;" data-renderer-mark="true">**</strong></span></p>
</td><td data-paste-element="TD" data-paste-core-version="21.0.0" class="css-4rjmal">
<p data-paste-element="PARAGRAPH" data-paste-core-version="21.0.0" data-renderer-start-pos="1818" class="css-tcah8o"><span class="wysiwyg-color-black">108,000<strong style="box-sizing: border-box;" data-renderer-mark="true">**</strong></span></p>
</td></tr>
<tr data-paste-element="TR" data-paste-core-version="21.0.0" class="css-1e22c8r"><td data-paste-element="TD" data-paste-core-version="21.0.0" class="css-4rjmal">
<p data-paste-element="PARAGRAPH" data-paste-core-version="21.0.0" data-renderer-start-pos="1944" class="css-tcah8o"><span class="wysiwyg-color-black">Registered A2P 10DLC Campaign*</span></p>
</td><td data-paste-element="TD" data-paste-core-version="21.0.0" class="css-4rjmal">
<p data-paste-element="PARAGRAPH" data-paste-core-version="21.0.0" data-renderer-start-pos="1978" class="css-tcah8o"><span class="wysiwyg-color-black">US mobile users</span></p>
</td><td data-paste-element="TD" data-paste-core-version="21.0.0" class="css-4rjmal">
<p data-paste-element="PARAGRAPH" data-paste-core-version="21.0.0" data-renderer-start-pos="1997" class="css-tcah8o"><span class="wysiwyg-color-black"><a data-paste-element="ANCHOR" data-paste-core-version="21.0.0" href="https://help.twilio.com/articles/1260803225669-Message-throughput-MPS-and-Trust-Scores-for-A2P-10DLC-in-the-US" rel="noreferrer noopener" target="_blank" title="https://help.twilio.com/articles/1260803225669-Message-throughput-MPS-and-Trust-Scores-for-A2P-10DLC-in-the-US" data-testid="link-with-safety" data-renderer-mark="true" class="css-lpeit6"><u style="box-sizing: border-box;" data-renderer-mark="true">Varies</u></a></span></p>
</td><td data-paste-element="TD" data-paste-core-version="21.0.0" class="css-4rjmal">
<p data-paste-element="PARAGRAPH" data-paste-core-version="21.0.0" data-renderer-start-pos="2007" class="css-tcah8o"><span class="wysiwyg-color-black">Campaign MPS * 10 hours (example: 40 MPS * 10 hours = 1,440,000)</span></p>
</td></tr><tr data-paste-element="TR" data-paste-core-version="21.0.0" class="css-1e22c8r"><td data-paste-element="TD" data-paste-core-version="21.0.0" class="css-4rjmal">
<p data-paste-element="PARAGRAPH" data-paste-core-version="21.0.0" data-renderer-start-pos="2077" class="css-tcah8o"><span class="wysiwyg-color-black">Registered A2P 10DLC Special* Campaign with per-number throughput (e.g. Agents/Franchise)</span></p>
</td><td data-paste-element="TD" data-paste-core-version="21.0.0" class="css-4rjmal">
<p data-paste-element="PARAGRAPH" data-paste-core-version="21.0.0" data-renderer-start-pos="2170" class="css-tcah8o"><span class="wysiwyg-color-black">US mobile users</span></p>
</td><td data-paste-element="TD" data-paste-core-version="21.0.0" class="css-4rjmal">
<p data-paste-element="PARAGRAPH" data-paste-core-version="21.0.0" data-renderer-start-pos="2189" class="css-tcah8o"><span class="wysiwyg-color-black"><a data-paste-element="ANCHOR" data-paste-core-version="21.0.0" href="https://help.twilio.com/articles/1260803225669-Message-throughput-MPS-and-Trust-Scores-for-A2P-10DLC-in-the-US" rel="noreferrer noopener" target="_blank" title="https://help.twilio.com/articles/1260803225669-Message-throughput-MPS-and-Trust-Scores-for-A2P-10DLC-in-the-US" data-testid="link-with-safety" data-renderer-mark="true" class="css-lpeit6"><u style="box-sizing: border-box;" data-renderer-mark="true">Varies</u></a></span></p>
</td><td data-paste-element="TD" data-paste-core-version="21.0.0" class="css-4rjmal">
<p data-paste-element="PARAGRAPH" data-paste-core-version="21.0.0" data-renderer-start-pos="2199" class="css-tcah8o"><span class="wysiwyg-color-black">Campaign per-number MPS * number of phone numbers * 10 hours</span></p>
</td></tr>
</tbody></table>

#### Twilio Message Request Processing - MMS

<table data-paste-element="TABLE" data-paste-core-version="21.0.0" class="css-1yrg7uf"><tbody data-paste-element="TBODY" data-paste-core-version="21.0.0" class="css-1u05hs8"><tr data-paste-element="TR" data-paste-core-version="21.0.0" class="css-1e22c8r"><td data-paste-element="TD" data-paste-core-version="21.0.0" class="css-4rjmal"><strong>Sender type</strong></td><td data-paste-element="TD" data-paste-core-version="21.0.0" class="css-4rjmal"><strong>MMS MPS Limit</strong></td><td data-paste-element="TD" data-paste-core-version="21.0.0" class="css-4rjmal"><strong>Notes</strong></td></tr><tr data-paste-element="TR" data-paste-core-version="21.0.0" class="css-1e22c8r"><td data-paste-element="TD" data-paste-core-version="21.0.0" class="css-4rjmal">Long code (10DLC)</td><td data-paste-element="TD" data-paste-core-version="21.0.0" class="css-4rjmal">1 MPS per number; 50 MMS/sec per Twilio Parent Account</td><td data-paste-element="TD" data-paste-core-version="21.0.0" class="css-4rjmal">This limit is fixed and cannot be increased. The per-number limit of 1 MPS may change with the upcoming <a data-paste-element="ANCHOR" data-paste-core-version="21.0.0" href="/articles/1260800720410-What-is-A2P-10DLC-" class="css-lpeit6">A2P 10DLC</a> system from US carriers.</td></tr><tr data-paste-element="TR" data-paste-core-version="21.0.0" class="css-1e22c8r"><td data-paste-element="TD" data-paste-core-version="21.0.0" class="css-4rjmal">Toll-Free</td><td data-paste-element="TD" data-paste-core-version="21.0.0" class="css-4rjmal">25 MMS/sec per Twilio Parent Account</td><td data-paste-element="TD" data-paste-core-version="21.0.0" class="css-4rjmal">Separate account-level limit from long code MMS. Cannot be increased.</td></tr><tr data-paste-element="TR" data-paste-core-version="21.0.0" class="css-1e22c8r"><td data-paste-element="TD" data-paste-core-version="21.0.0" class="css-4rjmal">Short code</td><td data-paste-element="TD" data-paste-core-version="21.0.0" class="css-4rjmal">40 MMS/second</td><td data-paste-element="TD" data-paste-core-version="21.0.0" class="css-4rjmal">Cannot be increased.</td></tr></tbody></table>

### 3. Create &amp; verify a Twilio campaign

In Twilio, you must create and verify new campaigns for every use case. In other words, if you have a new goal with a new script and set of actions, then you must create a campaign and submit it to Twilio for verification.

The verification, like verifying brands, is meant to ensure compliance with mobile carrier network regulations.

### 4. Regulatory Compliance Actions

Must provide the following information:

1. Campaign Description
2. Campaign use case: For Aqqaluk Trust, it is a "Charity" option.
3. Sample Messages
4. Sending messages with:
    1. Emmbedded links
    2. Embedded phone numbers
    3. Age-gated content
    4. Content related to direct lending or other loan arrangement

#### Campaign description

This campaign by the charity (501(c)3) Aqqaluk Trust (AT) asks people in the communities they serve in the Northwest Arctic Borough in Alaska to complete an "archiving" activity through one of their summer community programs called Sivu Summer (see example excerpt from booklet: https://www.aqqaluktrust.com/wp-content/uploads/2025/06/SIVU-Summer-Pakak-Archiving.pdf) through our Twilio serverless app called "Pakak". AT will notify community members about Pakak by sending them a printed activity booklet with directions about how they can choose to participate in the activity. If a community member chooses to subscribe to Pakak, they can text our campaigns number "PAKAK" to start the opt-in process. If they opt-in, the activity asks them to find an image for AT to archive by taking a picture of it and sending it to Pakak. The app, Pakak, then guides users through a series of questions about When the picture was taken, Where it was taken, and what community value they think the picture best represents. The user's phone number, basic profile information, submitted image, and information about the image are stored and maintained by AT, but users retain all ownership rights to their data and can opt-out at any time. Users can also request all of their data be deleted by contacting us. All of this information is provided to them via our Terms of Service (https://www.aqqaluktrust.com/pakak-tos/) and Privacy Policy (https://www.aqqaluktrust.com/pakak-privacy/).

#### Campaign use case

Charity

#### Sample messages

From the prototype Pakak app. Must show the process of opting in and out.

> Hi from Aqqaluk Trust. Welcome to our Sivu Summer archiving activity with our app called Pakak. Reply START to agree to receive about 8-10 messages from Aqqaluk Trust for each submission. Review Pakak's Terms of Services (www.aqqaluktrust.com/pakak-tos/) and Privacy Policy (www.aqqaluktrust.com/pakak-privacy/). Msg & data rates may apply. Reply STOP to opt-out.

> Aqqaluk Trust: Taikuu! You've opted into receiving and submitting msgs. Msg and data rates may apply. Reply STOP to opt-out or HELP for options.

> Aqqaluk Trust: You replied "STOP" which blocks all texts sent from this number. Text UNSTOP or START to receive msgs again. Msg and data rates may apply.

> Assuming the user is subscribed and sends our number an image as instructed in the Sivu Summer activity booklet: “Do you know about WHEN this picture was taken? Reply YES or NO. Msg & data rates may apply. Reply STOP to opt-out or HELP for options.”

> Assuming the user is subscribed and responds to sample msg #4: “About what year or decade was the original picture taken? Reply with 4 numbers like '1990' or '2002'. Msg & data rates may apply. Reply STOP to opt-out or HELP for options.”

#### Sending messages with ...?

- embedded links? *Yes*
- embedded phone numbers? *No*
- age-gated content? *No*
- content about direct lending or other loan arrangements? *No*

### Opt-Out Management

Standard Opt-Out Keywords: All of your recipients will get these opt-out responses unless you create responses for their specific spoken language or country code.

Opt-Out
Keywords: cancel, end, optout, quit, revoke, stop, stopall, unsubscribe
Message: Aqqaluk Trust: You replied STOP which blocks all texts sent from this number. Text UNSTOP or START to receive msgs again.
Opt-In
Keywords: start, unstop
Message: Aqqaluk Trust: Subscribed.
Help
Keywords: help
Message: Aqqaluk Trust: Reply STOP to unsubscribe, START to subscribe, INU for Inupiat Ilitqusiat values, PROMPT to retrieve last question, or HELP to see these options again.

### Content Settings

Configure your Messaging Services to include logic for content formatting and message-type fallback. Using these features can help you avoid encoding failures, formatting issues, and other delivery issues.
ON - Smart Encoding SMS

Smart encoding detects Unicode characters that are easy to miss and replaces them with similar GSM encoded characters. This substitution helps ensure that your messages are segmented properly at 160 characters.
ON - MMS Converter SMS

If a carrier can’t receive MMS, Twilio will automatically deliver your message as an SMS text message and include a shortened URL to the image you tried to send as an MMS.

### Integration

Manage how your Messaging Service integrates with your application.

**Incoming Messages**: Select how your Messaging Service handles inbound messages

- Select **Defer to sender’s webhook**: Invoke the sender’s HTTP webhook (if it is defined) for incoming messages.

**Delivery Status Callback**: Provide a URL for Twilio to call via webhook to let you know the delivery status of your message.

- **Callback URL**: No value; keep blank.

**Validity Period**: After the Validity Period has elapsed, any unsent messages will not be sent.

- **Twilio Queue time limit (seconds)**: 14400
    - This only affects messages that are in queue on Twilio and have not yet been sent to the carrier. Learn more about Twilio message queues and rate limits here.
    - Twilio Queue time limit can be maximum of 36000 Seconds (10 hours)

### Sender Pool

A Sender represents a channel, number type, or messaging type that can receive and send messages using the Twilio Messaging API. Messaging Services come with built-in features to help you select the best Sender for your use case and scale your application.

**Sender Selection Settings**
- `ON` - Sticky Sender SMS: Sticky Sender ensures consistency for message recipients by selecting the same From phone number you previously used in conversation with a given customer.
- `ON` - Area Code Geomatch SMS: Use local phone numbers with area codes that match or overlay your recipient's phone number when sending messages to the US and Canada.

### 5. Apply for Twilio's Impact Access Program credits ($100)

If you have just created a new account, check to see if you are eligible for any free credits. Twilio currently has an Impact Access program for NGO/NPO entities for $100.
