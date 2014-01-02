'use strict';

// <a name="components-source-data"></a>
// ###component data source


var MessengerAPI = require('../../messenger/m_api')
	, _ = require('mol-proto')
	, check = require('../../util/check')
	, Match = check.Match;


// class to handle subscribtions to changes in DOM for UI (maybe also content editable) elements
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
	'input': 'input',
	'select': 'change'
};

function init(component) {
	MessengerAPI.prototype.init.apply(this, arguments);

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
