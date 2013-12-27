'use strict';

var Mixin = require('../abstract/mixin')
	, MessengerAPI = require('./m_api')
	, logger = require('../util/logger')
	, toBeImplemented = require('../util/error').toBeImplemented
	, _ = require('mol-proto')
	, check = require('../util/check')
	, Match = check.Match;


/**
 * `milo.classes.MessageSource`
 * An abstract class (subclass of [Mixin](../abstract/mixin.js.html)) for connecting [Messenger](./index.js.html) to external sources of messages (like DOM events) and defining higher level messages.
 * An instance of MessageSource can either be passed to Messenger constructor or later using `_setMessageSource` method of Messenger. Once set, MessageSource of Messenger cannot be changed.
 */
var MessageSource = _.createSubclass(Mixin, 'MessageSource', true);

module.exports = MessageSource;


/**
 * MessageSource instance methods
 *
 * - [init](#init) - initializes messageSource - called by Mixin superclass
 * - [setMessenger](#setMessenger) - connects Messenger to MessageSource, is called from `init` or `_setMessageSource` methods of [Messenger](./index.js.html).
 * - [onSubscriberAdded](#onSubscriberAdded) - called by Messenger to notify when the first subscriber for an internal message was added, so MessageSource can subscribe to source
 * - [onSubscriberRemoved](#onSubscriberRemoved) - called by Messenger to notify when the last subscriber for an internal message was removed, so MessageSource can unsubscribe from source
 * - [dispatchMessage](#dispatchMessage) - dispatches source message. MessageSource subclass should implement mechanism when on actual source message this method is called.
 *
 * Methods below must be implemented in subclass:
 *
 * - [trigger](#trigger) - triggers messages on the source
 * - [filterSourceMessage](#filterSourceMessage) - filters source message based on the data of the message and the corresponding internal message that is about to besent on Messenger
 * - [translateToSourceMessage](#translateToSourceMessage) - converts internal message type to external message type
 * - [addSourceListener](#addSourceListener) - adds listener/subscriber to external message
 * - [removeSourceListener](#removeSourceListener) - removes listener/subscriber from external message
 */
_.extendProto(MessageSource, {
	init: init,
	setMessenger: setMessenger,
	onSubscriberAdded: onSubscriberAdded,
 	onSubscriberRemoved: onSubscriberRemoved, 
 	dispatchMessage: dispatchMessage,
	_prepareMessengerAPI: _prepareMessengerAPI,

 	// Methods below must be implemented in subclass
 	trigger: toBeImplemented,
 	addSourceSubscriber: toBeImplemented,
 	removeSourceSubscriber: toBeImplemented
});


/**
 * MessageSource instance method.
 * Called by Mixin constructor.
 * Initializes map of internal messages, where keys are external source messages, values - internal Messenger messages.
 */
function init(hostObject, proxyMethods, messengerAPIOrClass) {
	this._prepareMessengerAPI(messengerAPIOrClass);
	_.defineProperty(this, '_internalMessages', {});
}


/**
 * MessageSource instance method.
 * Sets reference to Messenger instance.
 *
 * @param {Messenger} messenger reference to Messenger instance linked to this MessageSource
 */
function setMessenger(messenger) {
	_.defineProperty(this, 'messenger', messenger);
}


function _prepareMessengerAPI(messengerAPIOrClass) {
	check(messengerAPIOrClass, Match.Optional(Match.OneOf(MessengerAPI, Match.Subclass(MessengerAPI, true))));

	if (messengerAPIOrClass) {
		var messengerAPI = messengerAPIOrClass instanceof MessengerAPI
							? messengerAPIOrClass
							: new messengerAPIOrClass;
		_.defineProperty(this, 'messengerAPI', messengerAPI);
	}

	// proxy methods from messengerAPI
	if (this.messengerAPI)
		this.messengerAPI._proxyMethods(this, 'api_');

	// define methods in case there is no MesengerAPI or it does not define a method
	this.api_createInternalData =
		this.api_createInternalData || useSourceData;
	this.api_filterSourceMessage =
		this.api_filterSourceMessage || doNotFilter;
}
function doNotFilter() { return true; }
function useSourceData(sourceMessage, message, data) { return data; }


/**
 * MessageSource instance method.
 */
function onSubscriberAdded(message) {
	var newSourceMessage = this.messengerAPI
							? this.messengerAPI.addInternalMessage(message)
							: message;

	if (newSourceMessage)
		this.addSourceSubscriber(newSourceMessage);
}


/**
 * MessageSource instance method.
 */
function onSubscriberRemoved(message) {
	var removedSourceMessage = this.messengerAPI
								? this.messengerAPI.removeInternalMessage(message)
								: message;

	if (removedSourceMessage)
		this.removeSourceSubscriber(sourceMessage);
}


/**
 * MessageSource instance method.
 */
function dispatchMessage(sourceMessage, data) {
	var internalMessages = this.messengerAPI
							? this.messengerAPI.getInternalMessages(sourceMessage)
							: [sourceMessage];

	if (internalMessages) {
		internalMessages.forEach(function(message) {
			var internalData = this.api_createInternalData(sourceMessage, message, data);
			if (this.api_filterSourceMessage(sourceMessage, message, internalData))
				this.messenger.postMessage(message, internalData);
		}, this);
	}
}
