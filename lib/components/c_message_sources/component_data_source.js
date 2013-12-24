// <a name="components-source-data"></a>
// ###component data source

'use strict';

var DOMEventsSource = require('./dom_events_source')
	, Component = require('../c_class')
	, ComponentDataSourceError = require('../../util/error').ComponentDataSource
	, _ = require('mol-proto')
	, check = require('../../util/check')
	, Match = check.Match;


// class to handle subscribtions to changes in DOM for UI (maybe also content editable) elements
var ComponentDataSource = _.createSubclass(DOMEventsSource, 'ComponentDataSource', true);


_.extendProto(ComponentDataSource, {
	// implementing MessageSource interface
	init: initComponentDataSource,
	translateToSourceMessage: translateToDomEvent,
 	addSourceListener: addDomEventListener,
 	removeSourceListener: removeDomEventListener,
 	filterSourceMessage: filterDataMessage,

 	// class specific methods
 	// dom: implemented in DOMEventsSource
 	value: getDomElementDataValue,
 	handleEvent: handleEvent,  // event dispatcher - as defined by Event DOM API
 	trigger: triggerDataMessage // redefines method of superclass DOMEventsSource
});

module.exports = ComponentDataSource;


var _tagEvents = {
	'input': 'input',
	'select': 'change'
};

function initComponentDataSource() {
	DOMEventsSource.prototype.init.apply(this, arguments);

	this.value(); // stores current component data value in this._value
	this.tagName = this.component.el.tagName.toLowerCase();
	this.tagEvent = _tagEvents[this.tagName];
}


// TODO: should return value dependent on element tag
function getDomElementDataValue() { // value method
	var newValue = this.component.el.value;

	Object.defineProperty(this, '_value', {
		configurable: true,
		value: newValue
	});

	return newValue;
}


// TODO: this function should return relevant DOM event dependent on element tag
// Can also implement beforedatachanged event to allow preventing the change
function translateToDomEvent(message) {
	if (message == '' && this.tagEvent)
		return this.tagEvent;
	else
		return '';
}


function addDomEventListener(eventType) {
	if (eventType)
		this.dom().addEventListener(eventType, this, false); // no capturing
}


function removeDomEventListener(eventType) {
	if (eventType)
		this.dom().removeEventListener(eventType, this, false); // no capturing
}


function filterDataMessage(eventType, message, data) {
	return data.newValue != data.oldValue;
};


 // event dispatcher - as defined by Event DOM API
function handleEvent(event) {
	var oldValue = this._value;

	// this is a hack
	var message = { path: '', type: 'changed',
					oldValue: oldValue, newValue: this.value() };

	// we assume _hostObject is a Data facet
	// and filter here as normal MessageSource dispatch flow is bypassed
	// to ensure bubbling of data change messages up the scope
	if (message.oldValue != message.newValue)
		this._hostObject._postDataChanged(message);

	// this.dispatchMessage(event.type, message);
}


function triggerDataMessage(message, data) {
	// TODO - opposite translation + event trigger 
}
