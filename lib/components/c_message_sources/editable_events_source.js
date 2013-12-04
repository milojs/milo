'use strict';

var DOMEventsSource = require('./dom_events_source')
	, Component = require('../c_class')
	, EditableEventsSourceError = require('../../util/error').EditableEventsSource
	, _ = require('mol-proto')
	, check = require('../../util/check')
	, Match = check.Match;


// class to handle subscribtions to changes in DOM for UI (maybe also content editable) elements
var EditableEventsSource = _.createSubclass(DOMEventsSource, 'EditableEventsSource', true);


_.extendProto(EditableEventsSource, {
	// implementing MessageSource interface
	init: initEditableEventsSource,
	translateToSourceMessage: translateToDomEvent,
 	addSourceListener: addDomEventListener,
 	removeSourceListener: removeDomEventListener,
 	filterSourceMessage: filterEditableMessage,

 	// class specific methods
 	// dom: implemented in DOMEventsSource
 	handleEvent: handleEvent,  // event dispatcher - as defined by Event DOM API
 	trigger: triggerEditableEvent // redefines method of superclass DOMEventsSource
});

module.exports = EditableEventsSource;


function initEditableEventsSource(hostObject, proxyMethods, component, options) {
	DOMEventsSource.prototype.init.apply(this, arguments);
	this.options = options;
}


var editableEventsMap = {
	'enterkey': 'keypress',
	'editstart': 'mousedown',
	'editend': 'blur'
};

// TODO: this function should return relevant DOM event dependent on element tag
// Can also implement beforedatachanged event to allow preventing the change
function translateToDomEvent(message) {
	if (editableEventsMap.hasOwnProperty(message))
		return editableEventsMap[message];
	else
		return DOMEventsSource.prototype.translateToSourceMessage.call(this, message);
}


function addDomEventListener(eventType) {
	this.dom().addEventListener(eventType, this, false); // no capturing
}


function removeDomEventListener(eventType) {
	this.dom().removeEventListener(eventType, this, false); // no capturing
}


function filterEditableMessage(eventType, message, data) {
	if (message == 'enterkey' && data.keyCode != 13)
		return false;

	return (this.options.editableOnClick || (message != 'editstart' && message != 'editend'))
};


 // event dispatcher - as defined by Event DOM API
function handleEvent(event) {
	this.dispatchMessage(event.type, event);
}


function triggerEditableEvent(message, data) {
	// TODO - opposite translation + event trigger 
}
