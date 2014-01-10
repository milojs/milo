'use strict';


var MessengerAPI = require('../../messenger/m_api')
	, _ = require('mol-proto')
	, check = require('../../util/check')
	, Match = check.Match;


// class to handle subscribtions to changes in DOM for UI (maybe also content editable) elements

/**
 * A class
 */
var DataMsgAPI = _.createSubclass(MessengerAPI, 'DataMsgAPI', true);


_.extendProto(DataMsgAPI, {
	// implementing MessageSource interface
	init: init,
	translateToSourceMessage: translateToSourceMessage,
 	filterSourceMessage: filterSourceMessage,
 	createInternalData: createInternalData,

 	// class specific methods
 	// dom: implemented in DOMEventsSource
 	value: value,
 	// handleEvent: handleEvent,  // event dispatcher - as defined by Event DOM API
});

module.exports = DataMsgAPI;


var _tagEvents = {
	'div': 'input',
	'span': 'input',
	'textarea': 'input',
	'input': function(el) { return el && el.type == 'checkbox' ? 'change' : 'input'; },
	'select': 'change'
};

var _tagValueProperties = {
	'div': 'value', // 'innerHTML',  - hack
	'span': 'innerHTML', // hack
	'textarea': 'value',
	'input': function(el) { return el && el.type == 'checkbox' ? el.checked : el.value; },
	'select': 'value',
	'img': 'src'
};


function init(component) {
	MessengerAPI.prototype.init.apply(this, arguments);

	this.component = component;
	this.value(); // stores current component data value in this._value
	this.tagName = this.component.el.tagName.toLowerCase();
	this.tagEvent = _tagEvents[this.tagName];
	if (typeof this.tagEvent == 'function')
		this.tagEvent = this.tagEvent(component.el);
	this.tagValueProperty = _tagValueProperties[this.tagName] || 'value';	
}


// getDomElementDataValue
function value() { // value method
	var newValue = typeof this.tagValueProperty == 'function'
					? this.tagValueProperty(this.component.el)
					: this.component.el[this.tagValueProperty];

	_.defineProperty(this, '_value', newValue, _.CONF);

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
function filterSourceMessage(sourceMessage, message, data) {
	return data.newValue != data.oldValue;
};


function createInternalData(sourceMessage, message, data) {
	var oldValue = this._value;
	var internalData = { 
		path: '',
		type: 'changed',
		oldValue: oldValue,
		newValue: this.value()
	};
	return internalData;
};
