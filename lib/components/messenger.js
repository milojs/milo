'use strict';

var _ = require('proto')
	, check = require('../check')
	, Match = check.Match;

var messengerMixin =  {
	initMessenger: initMessenger,
	onMessage: registerSubscriber,
	offMessage: removeSubscriber,
	onMessages: registerSubscribers,
	offMessages: removeSubscribers,
	postMessage: postMessage,
	broadcastMessage: broadcastMessage,
	getMessageSubscribers: getMessageSubscribers,
	_chooseSubscribersHash: _chooseSubscribersHash
};

module.exports = messengerMixin;


function initMessenger(subscribersProperty, methodNamesToBind) {
	check(subscribersProperty, String);
	check(methodsToBind, Match.Optional([String]));

	// initialize subscribers maps on a passed property
	var subscribers = this[subscribersProperty] = {};
	subscribers._messageSubscribers = {};
	subscribers._patternMessageSubscribers = {};

	// create partials bound to the current instance to use passed subscribersProperty
	if (methodNamesToBind)
		methodNamesToBind.forEach(function(method) {
			Object.defineProperty(this, method, {
				enumerable: false,
				value: this[method].bind(this, subscribersProperty)
			});
		}, this);
}


function registerSubscriber(subscribersProperty, message, subscriber) {
	check(message, Match.OneOf(String, RegExp));
	check(subscriber, Function); 

	var subscribersHash = this._chooseSubscribersHash(subscribersProperty, message);
	var msgSubscribers = subscribersHash[message] = subscribersHash[message] || [];
	var notYetRegistered = msgSubscribers.indexOf(subscriber) == -1;

	if (notYetRegistered)
		msgSubscribers.push(subscriber);

	return notYetRegistered;
}


function registerSubscribers(subscribersProperty, messageSubscribers) {
	check(messageSubscribers, Match.Object);

	var notYetRegisteredMap = _.mapKeys(messageSubscribers, function(subscriber, message) {
		return this.registerSubscriber(subscribersProperty, message, subscriber)
	}, this);

	return notYetRegisteredMap;
}


// removes all subscribers for the message if subscriber isn't supplied
function removeSubscriber(subscribersProperty, message, subscriber) {
	check(message, Match.OneOf(String, RegExp));
	check(subscriber, Match.Optional(Function)); 

	var subscribersHash = this._chooseSubscribersHash(subscribersProperty, message);
	var msgSubscribers = subscribersHash[message];
	if (! msgSubscribers || ! msgSubscribers.length) return false;

	if (subscriber) {
		subscriberIndex = msgSubscribers.indexOf(subscriber);
		if (subscriberIndex == -1) return false;
		msgSubscribers.splice(subscriberIndex, 1);
	} else
		delete subscribersHash[message];

	return true; // subscriber(s) removed
}


function removeSubscribers(subscribersProperty, messageSubscribers) {
	check(messageSubscribers, Match.Object);

	var subscriberRemovedMap = _.mapKeys(messageSubscribers, function(subscriber, message) {
		return this.registerSubscriber(subscribersProperty, message, subscriber)
	}, this);

	return subscriberRemovedMap;	
}


function postMessage(subscribersProperty, message, data) {
	check(message, Match.OneOf(String, RegExp));

	var subscribersHash = this._chooseSubscribersHash(subscribersProperty, message);
	var msgSubscribers = subscribersHash[message];

	callSubscribers(msgSubscribers);

	if (message instanceof String) {
		_.eachKey(this[subscribersProperty]._patternMessageSubscribers, 
			function(patternSubscribers, pattern) {
				if (pattern.test(message))
					callSubscribers(patternSubscribers);
			}
		);
	}

	function callSubscribers(msgSubscribers) {
		msgSubscribers.forEach(function(subscriber) {
			subscriber(message, data);
		});
	}
}


function broadcastMessage(subscribersProperty, message, data) {
	throw new MessengerError('message broadcasting isn\'t implemented in class ' + this.constructor.name);
}


function getMessageSubscribers(subscribersProperty, message, includePatternSubscribers) {
	check(message, Match.OneOf(String, RegExp));

	var subscribersHash = this._chooseSubscribersHash(subscribersProperty, message);
	var msgSubscribers = msgSubscribers
							? _.clone(subscribersHash[message])
							: [];

	// pattern subscribers are incuded by default
	if (includePatternSubscribers != false && message instanceof String) {
		_.eachKey(this[subscribersProperty]._patternMessageSubscribers, 
			function(patternSubscribers, pattern) {
				if (pattern.test(message))
					_.appendArray(msgSubscribers, patternSubscribers);
			}
		);
	}

	return msgSubscribers
}


function _chooseSubscribersHash(subscribersProperty, message) {
	return message instanceof RegExp
				? this[subscribersProperty]._patternMessageSubscribers
				: this[subscribersProperty]._messageSubscribers;
}
