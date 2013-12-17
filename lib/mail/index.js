// <a name="mail"></a>
// milo.mail
// -----------

// It is an application level messenger that is an instance of Messenger class.

// At the moment, in addition to application messages that you define, you can subscribe to __domready__ message that is guaranteed to fire once,
// even if DOM was ready at the time of the subscription.

// Messaging between frames is likely to be exposed via milo.mail.

// See Messenger.

'use strict';

var Messenger = require('../messenger')
	, MailMessageSource = require('./mail_source');


var mailMsgSource = new MailMessageSource();

var miloMail = new Messenger(undefined, undefined, mailMsgSource);

module.exports = miloMail;
