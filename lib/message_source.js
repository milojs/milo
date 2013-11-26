'use strict';

var Mixin = require('./mixin')
	, logger = require('./logger')
	, AbsctractClassError = require('./error').AbsctractClass
	, _ = require('mol-proto');

// an abstract class for dispatching external to internal events
var MessageSource = _.createSubclass(Mixin, 'MessageSource', true);


_.extendProto(MessageSource, {
	// initializes messageSource - called by Mixin superclass
	init: initMessageSource,

	// called by Messenger to notify when the first subscriber for an internal message was added
	onSubscriberAdded: onSubscriberAdded,

	// called by Messenger to notify when the last subscriber for an internal message was removed
 	onSubscriberRemoved: onSubscriberRemoved, 


 	// Methods below should be implemented in subclass
 	
	// converts internal message type to external message type - should be implemented in subclass
	translateToSourceMessage: toBeImplemented,

 	// adds listener to external message - should be implemented by subclass
 	addExternalListener: toBeImplemented,

 	// removes listener from external message - should be implemented by subclass
 	removeExternalListener: toBeImplemented,

 	// dispatches external message - should be implemented by subclass
 	dispatchMessage: toBeImplemented,
});


function initMessageSource() {
	Object.defineProperty(this, '_internalMessages', { value: {} });
}


function onSubscriberAdded(message) {
	var sourceMessage = this.translateToSourceMessage(message);

	if (! this._internalMessages.hasOwnProperty(sourceMessage)) {
		this.addExternalListener(sourceMessage);
		this._internalMessages[sourceMessage] = [];
	}
	var internalMsgs = this._internalMessages[sourceMessage];

	if (internalMsgs.indexOf(message) == -1)
		internalMsgs.push(message);
	else
		logger.warn('Duplicate notification received: for subscribe to internal message ' + message);
}


function onSubscriberRemoved(message) {
	var sourceMessage = this.translateToSourceMessage(message);

	var internalMsgs = this._internalMessages[sourceMessage];

	if (internalMsgs) {
		messageIndex = internalMsgs.indexOf(message);
		if (messageIndex >= 0) {
			internalMsgs.splice(messageIndex, 1);
			this.removeExternalListener(sourceMessage);
		} else
			unexpectedNotificationWarning();
	} else
		unexpectedNotificationWarning();


	function unexpectedNotificationWarning() {
		logger.warn('notification received: un-subscribe from internal message ' + message
					 + ' without previous subscription notification');
	}
}


function toBeImplemented() {
	throw new AbsctractClassError('calling the method of an absctract class MessageSource');
}
