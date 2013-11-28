'use strict';

var MessageSource = require('../../messenger/message_source')
	, _ = require('mol-proto')
	, check = require('../../util/check')
	, Match = check.Match;

var iFrameMessageSource = _.createSubclass(MessageSource, 'iFrameMessageSource', true);


_.extendProto(iFrameMessageSource, {
	// implementing MessageSource interface
	init: initIFrameMessageSource,
	translateToSourceMessage: translateToIFrameMessage,
 	addSourceListener: addIFrameMessageListener,
 	removeSourceListener: removeIFrameMessageListener,
 	filterSourceMessage: filterRecievedIFrameMessage,

 	//class specific methods
 	post: postToOtherWindow,
 	handleEvent: handleEvent  // event dispatcher - as defined by Event DOM API
});

module.exports = iFrameMessageSource;


function initIFrameMessageSource(hostObject, proxyMethods) {
	check(hostObject, Object);
	MessageSource.prototype.init.apply(this, arguments);

	if (hostObject.owner.el.nodeName == 'IFRAME')
		this._postTo = hostObject.owner.el.contentWindow;
	else
		this._postTo = window.parent;

	this._listenTo = window;
}


function translateToIFrameMessage(message) {
	return message;
}


function addIFrameMessageListener(eventType) {
	this._listenTo.addEventListener('message', this, false);
}


function removeIFrameMessageListener(eventType) {
	this._listenTo.removeEventListener('message', this, false);
}


function filterRecievedIFrameMessage(eventType, message, event) {
	return true;
}

function postToOtherWindow(eventType, message) {
	message.type = eventType;
	this._postTo.postMessage(message, '*');
}

function handleEvent(event) {
	this.dispatchMessage('loadarticle', event);
}
