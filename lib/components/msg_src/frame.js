'use strict';

// <a name="components-source-iframe"></a>
// ###component iframe source

// TODO: This message source needs to be completely refactored

var MessageSource = require('../../messenger/m_source')
	, Component = require('../c_class')
	, _ = require('mol-proto')
	, check = require('../../util/check')
	, Match = check.Match
	, FrameMessageSourceError = require('../../util/error').FrameMessageSource;

var FrameMessageSource = _.createSubclass(MessageSource, 'FrameMessageSource', true);


_.extendProto(FrameMessageSource, {
	// implementing MessageSource interface
	init: init,
 	addSourceSubscriber: addSourceSubscriber,
 	removeSourceSubscriber: removeSourceSubscriber,
 	trigger: trigger,

 	//class specific methods
 	frameWindow: frameWindow,
 	handleEvent: handleEvent  // event dispatcher - as defined by Event DOM API
});

module.exports = FrameMessageSource;


function init(hostObject, proxyMethods, messengerAPIOrClass, component) {
	check(component, Component);
	this.component = component;

	if (component.el.tagName.toLowerCase() != 'iframe')
		throw new FrameMessageSourceError('component for FrameMessageSource can only be attached to iframe element');

	MessageSource.prototype.init.apply(this, arguments);
}


function frameWindow() {
	return this.component.el.contentWindow;
}


// addIFrameMessageListener
function addSourceSubscriber(sourceMessage) {
	this.frameWindow().addEventListener('message', this, false);
}


// removeIFrameMessageListener
function removeSourceSubscriber(sourceMessage) {
	this.frameWindow().removeEventListener('message', this, false);
}


function trigger(msgType, data) {
	data = data || {};
	data.type = msgType;

	this.frameWindow().postMessage(data, '*');
}


// TODO maybe refactor to FrameMsgAPI?
function handleEvent(event) {
	this.dispatchMessage(event.data.type, event);
}
