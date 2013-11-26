'use strict';

var MessageSource = require('./message_source')
	, _ = require('mol-proto');

var DOMEventsSource = _.createSubclass(MessageSource, 'DOMMessageSource', true);


_.extendProto(DOMEventsSource, {
	init: initDomEventsSource,
	translateToSourceMessage: translateToDomEvent,
 	addSourceListener: addDomEventListener,
 	removeSourceListener: removeDomEventListener,
 	dispatchMessage: dispatchDomEvent,
 	handleEvent: handleEvent  // event dispatcher - as defined by Event DOM API
});

module.exports = DOMEventsSource;


var useCapturePattern = /__capture$/;


function initDomEventsSource(hostObject, proxyMethods, component) {
	check(component, Match.Subclass(Component, true));

	this.el = component.el;

	// TODO -receive notifications on element change
	// var self = this;
	// component.on('el:change', function(data) {
	// 	self.el = data.newEl;
	// });
}


function translateToDomEvent(message) {
	if (useCapturePattern.test(message))
		message = message.replace(useCapturePattern, '');
	return message;
}


function addDomEventListener(eventType) {
	this.el.addEventListener(eventType, this, true);
}


function removeDomEventListener(eventType) {
	this.el.removeEventListener(eventType, this, true);
}
