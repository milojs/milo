'use strict';

var DOMEventsSource = require('./dom_events_source')
	, Component = require('./components/c_class')
	, ComponentDataSourceError = require('./error').ComponentDataSource
	, _ = require('mol-proto')
	, check = require('./check')
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
 	value: getDomElementData,
 	handleEvent: handleEvent,
 	trigger: triggerDataMessage // redefines method of superclass DOMEventsSource
});

module.exports = ComponentDataSource;


function initComponentDataSource() {
	DOMEventsSource.prototype.init.apply(this, arguments);
	this._value = this.value();
}


// TODO: should return value dependent on element tag
function getDomElementData() { // value method
	return this.component.el.value;
}


// TODO: this function should return relevant DOM event dependent on element tag
// Can also implement beforedatachanged event to allow preventing the change
function translateToDomEvent(message) {
	if (message == 'datachanged')
		return 'input';
	else
		throw new ComponentDataSourceError('unknown component data event');
}


function addDomEventListener(eventType) {
	this.dom().addEventListener(eventType, this, false); // no capturing
}


function removeDomEventListener(eventType) {
	this.dom().removeEventListener(eventType, this, false); // no capturing
}


function filterDataMessage(eventType, message, data) {
	return data.newValue != data.oldValue;
};


function handleEvent(event) {
	this.dispatchMessage(event.type, {
		oldValue: this._value,
		newValue: this.value()
	});

	this._value = this.value();
}


function triggerDataMessage(message, data) {
	// TODO - opposite translation + event trigger 
}
