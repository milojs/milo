'use strict';


var MessengerAPI = require('../../messenger/m_api')
	, getElementDataAccess = require('./de_data')
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
 	value: value,
});

module.exports = DataMsgAPI;


function init(component) {
	MessengerAPI.prototype.init.apply(this, arguments);

	this.component = component;
	this.elData = getElementDataAccess(component.el);

	this.value(); // stores current component data value in this._value
}


// getDomElementDataValue
function value() { // value method
	var newValue = this.elData.get(this.component.el);
	_.defineProperty(this, '_value', newValue, _.CONF);
	return newValue;
}


// TODO: this function should return relevant DOM event dependent on element tag
// Can also implement beforedatachanged event to allow preventing the change
// translateToDomEvent
function translateToSourceMessage(message) {
	var event = this.elData.event(this.component.el);
	if (message == '' && event)
		return event;  // this.tagEvent;
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
