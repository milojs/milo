'use strict';

var _ = require('mol-proto');


module.exports = MessengerAPI;


/**
 * 
 *
 */
function MessengerAPI() {
	if (this.init)
		this.init.apply(this, arguments);
}


/**
 * MessengerAPI instance methods
 *
 * - [filterSourceMessage](#filterSourceMessage) - filters source message based on the data of the message and the corresponding internal message that is about to be sent on Messenger
 * - [translateToSourceMessage](#translateToSourceMessage) - converts internal message type to external message type
 */
_.extendProto(MessengerAPI, {
	init: init,
	addInternalMessage: addInternalMessage,
	removeInternalMessage: removeInternalMessage,
	filterInternalMessages: filterInternalMessages,
	getInternalMessages: getInternalMessages,

	// should be redefined by subclass
	translateToSourceMessage: translateToSourceMessage,
	createInternalData: createInternalData,
	filterSourceMessage: filterSourceMessage
});


function init() {
	_.defineProperty(this, '_internalMessages', {});
}


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
function getInternalMessages(sourceMessage) {
	return this._internalMessages[sourceMessage];
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


/**
 * MessengerAPI instance method
 */


function translateToSourceMessage(message) {
	return message
}


function createInternalData(sourceMessage, message, data) {
	return data;
}


function filterSourceMessage() {
	return true;
}
