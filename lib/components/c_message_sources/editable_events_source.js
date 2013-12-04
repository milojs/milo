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
	'editend': 'blur',
	'nexteditable': 'keydown',
	'previouseditable': 'keydown',	
	'adjacenteditable': 'keydown',
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
	switch (message) {
		case 'enterkey':
		 	return data.keyCode == 13;
		case 'previouseditable':
			return this.options.moveToAdjacentEditable
				&& movedToPrevious(data);
		case 'nexteditable':
			return this.options.moveToAdjacentEditable
				&& movedToNext(data);
		case 'adjacenteditable':
			return this.options.moveToAdjacentEditable
				&& (movedToPrevious(data) || movedToNext(data));
		case 'editstart':
		case 'editend':
			return this.options.editableOnClick;
		default:
			return true;
	}

	function movedToPrevious(data) {
		return (data.keyCode == 37 || data.keyCode == 38) // up and left
			&& window.getSelection().anchorOffset == 0;
	}

	function movedToNext(data) {
		// console.log(window.getSelection().anchorOffset);
		
		return (data.keyCode == 39 || data.keyCode == 40) // down and right
			&& window.getSelection().anchorOffset == 0;
	}
}


 // event dispatcher - as defined by Event DOM API
function handleEvent(event) {
	this.dispatchMessage(event.type, event);
}


function triggerEditableEvent(message, data) {
	// TODO - opposite translation + event trigger 
}
