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
});

module.exports = iFrameMessageSource;


function initIFrameMessageSource(hostObject, proxyMethods) {
	check(hostObject, Object);
	MessageSource.prototype.init.apply(this, arguments);
}


function translateToIFrameMessage(message) {
	return message;
}


function addIFrameMessageListener(eventType) {
	
	// this.dom().addEventListener(eventType, this, true);
}


function removeIFrameMessageListener(eventType) {
	// this.dom().removeEventListener(eventType, this, true);
}


function filterRecievedIFrameMessage(eventType, message, event) {
	// var isCapturePhase;
	// if (typeof window != 'undefined')
	// 	isCapturePhase = event.eventPhase == window.Event.CAPTURING_PHASE;

	// return (! isCapturePhase || (isCapturePhase && useCapturePattern.test(message)));
}
