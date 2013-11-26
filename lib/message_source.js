'use strict';

var Mixin = require('./mixin')
	, logger = require('./logger')
//	, AbsctractClassError = require('./error').AbsctractClass
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
	translateToExternalMessage: toBeImplemented,

	// converts external message type to internal message type - should be implemented in subclass
	translateToInternalMessage: toBeImplemented,

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
	var externalMessage = this.translateToExternalMessage(message);

	if (! this._internalMessages.hasOwnProperty(externalMessage)) {
		this.addExternalListener(externalMessage);
		this._internalMessages[externalMessage] = [];
	}
	var internalMsgs = this._internalMessages[externalMessage];

	if (internalMsgs.indexOf(message) == -1)
		internalMsgs.push(message);
	else
		logger.warn('Duplicate notification received: for subscribe to internal message ' + message);
}


function onSubscriberRemoved(message) {
	var externalMessage = this.translateToExternalMessage(message);

	var internalMsgs = this._internalMessages[externalMessage];

	if (internalMsgs) {
		messageIndex = internalMsgs.indexOf(message);
		if (messageIndex >= 0) {
			internalMsgs.splice(messageIndex, 1);
			this.removeExternalListener(externalMessage);
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
