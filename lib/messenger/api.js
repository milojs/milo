'use strict';

var toBeImplemented = require('../util/error').toBeImplemented
	, _ = require('mol-proto');


module.exports = MessengerAPI;


/**
 * 
 */
function MessengerAPI() {
	_.defineProperty(this, '_internalMessages', {});
	if (this.init)
		this.init.apply(this, arguments);
}


/**
 * MessengerAPI instance methods
 */
_.extendProto(MessengerAPI, {
	// init method can be implemented by subclass, it will be called by constructor
	addInternalMessage: addInternalMessage,
	removeInternalMessage: removeInternalMessage,
	filterInternalMessages: filterInternalMessages,
	translateToSourceMessage: toBeImplemented,
	filterSourceMessage: toBeImplemented
});


/**
 * MessengerAPI instance method
 */
function addInternalMessage(message) {
	var internalMsgs
		, sourceMessage = this.translateToSourceMessage(message);

	if (! sourceMessage) return;

	if (this._internalMessages.hasOwnProperty(sourceMessage)) {
		internalMsgs = this._internalMessages[sourceMessage];
		if (internalMsgs.indexOf(message) == -1)
			internalMsgs.push(message);
		else
			logger.warn('Duplicate addInternalMessage call for internal message ' + message);
	} else {
		internalMsgs = this._internalMessages[sourceMessage] = [];
		internalMsgs.push(message);
		return sourceMessage;
	}
}


/**
 * MessengerAPI instance method
 */
function removeInternalMessage(message) {
	var sourceMessage = this.translateToSourceMessage(message);

	if (! sourceMessage) return;

	var internalMsgs = this._internalMessages[sourceMessage];

	if (internalMsgs && internalMsgs.length) {
		messageIndex = internalMsgs.indexOf(message);
		if (messageIndex >= 0) {
			internalMsgs.splice(messageIndex, 1);
			if (internalMsgs.length == 0) {
				delete this._internalMessages[sourceMessage];
				return sourceMessage;
			}
		} else
			unexpectedNotificationWarning();
	} else
		unexpectedNotificationWarning();


	function unexpectedNotificationWarning() {
		logger.warn('notification received: un-subscribe from internal message ' + message
					 + ' without previous subscription notification');
	}
}


/**
 * MessengerAPI instance method
 */
function filterInternalMessages(sourceMessage, data) {
	var internalMsgs = this._internalMessages[sourceMessage];

	if (internalMsgs && internalMsgs.length) {
		var filteredMessages = internalMsgs.filter(function(message) {
			return ! this.filterSourceMessage
					|| this.filterSourceMessage(sourceMessage, message, data);
		}, this);
		return filteredMessages;
	} else
		logger.warn('source message received for which there is no mapped internal message');	
}
