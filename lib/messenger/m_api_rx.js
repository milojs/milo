'use strict';

var MessengerAPI = require('./m_api')
	, _ = require('mol-proto');


/**
 * A generic subsclass of [MessengerAPI](./m_api.js.html) that supports pattern subscriptions to source.
 * Can be useful if the source is another Messenger.
 */
 var MessengerRegexpAPI = _.createSubclass(MessengerAPI, 'MessengerRegexpAPI');

 module.exports = MessengerRegexpAPI;


_.extendProto(MessengerRegexpAPI, {
	init: init,
	addInternalMessage: addInternalMessage,
	getInternalMessages: getInternalMessages
});


/**
 * MessengerRegexpAPI instance method
 * Called by MessengerRegexpAPI constructor.
 */
function init() {
	MessengerAPI.prototype.init.apply(this, arguments);
	_.defineProperty(this, '_patternInternalMessages', {});
}


/**
 * MessengerRegexpAPI instance method
 * Augments MessengerAPI method by storing regexp
 * Returns source message if it is used first time (so that `MessageSource` subcribes to this source message) or `undefined`.
 *
 * @param {String} message internal message to be translated and added
 * @return {String|RegExp|undefined}
 */
function addInternalMessage(message) {
	var sourceMessage = MessengerAPI.prototype.addInternalMessage.apply(this, arguments);
	
	// store regexp itself if sourceMessage is regexp
	if (sourceMessage && sourceMessage instanceof RegExp) {
		this._internalMessages[sourceMessage].pattern = sourceMessage;
		this._patternInternalMessages[sourceMessage] = this._internalMessages[sourceMessage];
	}

	return sourceMessage;
}


/**
 * MessengerAPI instance method
 * Augments MessengerAPI method by returning messages subscribed with regexp
 * This method is used by `MessageSource` to dispatch source message on the `Mesenger`.
 *
 * @param {String|RegExp} sourceMessage source message
 * @return {Array[String]}
 */
function getInternalMessages(sourceMessage) {
	var internalMessages = MessengerAPI.prototype.getInternalMessages.apply(this, arguments);

	// add internal messages for regexp source subscriptions
	if (typeof sourceMessage == 'string') {
		internalMessages = internalMessages || [];
		var internalMessagesHash = _.object(internalMessages, true);
		_.eachKey(this._patternInternalMessages, function(patternMessages) {
			var sourcePattern = patternMessages.pattern;
			if (sourcePattern.test(sourceMessage))
				patternMessages.forEach(function(message) {
					if (internalMessagesHash[message]) return;
					internalMessages.push(message);
					internalMessagesHash[message] = true;
				});
		});
	}

	return internalMessages;
}
