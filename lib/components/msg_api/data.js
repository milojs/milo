'use strict';

// <a name="components-source-data"></a>
// ###component data source


var MessengerAPI = require('../../messenger/api')
	, _ = require('mol-proto')
	, check = require('../../util/check')
	, Match = check.Match;


// class to handle subscribtions to changes in DOM for UI (maybe also content editable) elements
var DataMsgAPI = _.createSubclass(MessengerAPI, 'DataMsgAPI', true);


_.extendProto(ComponentDataSource, {
	// implementing MessageSource interface
	init: init,
	translateToSourceMessage: translateToSourceMessage,
 	filterSourceMessage: filterSourceMessage,

 	// class specific methods
 	// dom: implemented in DOMEventsSource
 	value: value,
 	handleEvent: handleEvent,  // event dispatcher - as defined by Event DOM API
 	trigger: triggerDataMessage // redefines method of superclass DOMEventsSource
});

module.exports = ComponentDataSource;


var _tagEvents = {
	'input': 'input',
	'select': 'change'
};

function init(component) {
	this.component = component;
	this.value(); // stores current component data value in this._value
	this.tagName = this.component.el.tagName.toLowerCase();
	this.tagEvent = _tagEvents[this.tagName];
}


// TODO: should return value dependent on element tag
// getDomElementDataValue
function value() { // value method
	var newValue = this.component.el.value;

	Object.defineProperty(this, '_value', {
		configurable: true,
		value: newValue
	});

	return newValue;
}


// TODO: this function should return relevant DOM event dependent on element tag
// Can also implement beforedatachanged event to allow preventing the change
// translateToDomEvent
function translateToSourceMessage(message) {
	if (message == '' && this.tagEvent)
		return this.tagEvent;
	else
		return '';
}


// filterDataMessage
function filterSourceMessage(eventType, message, data) {
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
