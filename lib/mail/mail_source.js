'use strict';

var MessageSource = require('../messenger/m_source')
	, domEventsConstructors = require('../components/c_message_sources/dom_events_constructors')
	, MailMessageSourceError = require('../util/error').MailMessageSource
	, _ = require('mol-proto')
	, check = require('../util/check')
	, Match = check.Match;


var MailMessageSource = _.createSubclass(MessageSource, 'MailMessageSource', true);


_.extendProto(MailMessageSource, {
	// implementing MessageSource interface
 	addSourceSubscriber: addSourceSubscriber,
 	removeSourceSubscriber: removeSourceSubscriber,

 	// class specific methods
 	_windowSubscriberMethod: _windowSubscriberMethod,
 	handleEvent: handleEvent,  // event dispatcher - as defined by Event DOM API
});


module.exports = MailMessageSource;


function addSourceSubscriber(sourceMessage) {
	if (isReadyStateChange(sourceMessage)) {
		if (document.readyState == 'loading')
			document.addEventListener('readystatechange', this, false);
		else {
			var domEvent = EventConstructor('readystatechange', { target: document });
			this.dispatchMessage('readystatechange', domEvent);
		}
	} else
		this._windowSubscriberMethod('addEventListener', sourceMessage);
}


function removeSourceSubscriber(sourceMessage) {
	if (isReadyStateChange(sourceMessage))
		document.removeEventListener('readystatechange', this, false);
	else 
		this._windowSubscriberMethod('removeEventListener', sourceMessage);
}


function isReadyStateChange(sourceMessage) {
	return sourceMessage == 'readystatechange' && typeof document == 'object';
}

function _windowSubscriberMethod(method, sourceMessage) {
	if (sourceMessage == 'message' && typeof window == 'object')
		window[method]('message', this, false);
}


// event dispatcher - as defined by Event DOM API
function handleEvent(event) {
	this.dispatchMessage(event.type, event);
}
