'use strict';

/**
 * `milo.mail`
 * It is an application level messenger that is an instance of Messenger class.
 *
 * At the moment, in addition to application messages that you define, you can subscribe to __domready__ message that is guaranteed to fire once,
 * even if DOM was ready at the time of the subscription.
 *
 * Messaging between frames is available via milo.mail. See [Frame facet](../components/c_facets/Frame.js.html).
 *
 * See [Messenger](../messenger/index.js.html).
 * 
**/


var Messenger = require('../../messenger')
    , MailMsgAPI = require('./mail_api')
    , MailMessageSource = require('./mail_source')
    , _ = require('mol-proto');


var miloMail = new Messenger;

var mailMsgSource = new MailMessageSource(miloMail, { trigger: 'trigger' }, new MailMsgAPI);

miloMail._setMessageSource(mailMsgSource);


module.exports = miloMail;
