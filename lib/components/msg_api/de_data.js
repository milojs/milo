'use strict';


var _ = require('mol-proto');


/**
 * Returns data access methods and events for given DOM element.
 * Used by [Data](../c_facets/Data.js.html) facet and by [DataMsgAPI](./data.js.html)
 *
 * @param {Element} el
 * @return {Object}
 */
var getElementDataAccess = function(el) {
	var tagName = el.tagName.toLowerCase()
		, elData = domElementsDataAccess[tagName];
	return elData || domElementsDataAccess.unknown;
}

module.exports = getElementDataAccess;


/**
 * Data access methods and events for DOM elements.
 */
var domElementsDataAccess = {
	unknown: {
 		property: 'value',
 		event: 'input'
	},
	'div': {
 		property: 'value', // hack, should be innerHTML? to make work with Editable facet
 		event: 'input'
	},
	'span': {
 		property: 'innerHTML', // hack,  to make work with Editable facet
 		event: 'input'
	},
 	'input': {
 		property: inputDataProperty,
 		event: inputChangeEvent
 	},
 	'textarea': {
 		property: 'value',
 		event: 'input'
 	},
 	'select': {
 		property: 'value',
 		event: 'change'
 	},
 	'img': {
 		property: 'src'
 	}
};


// convert strings to functions and create getset methods
_.eachKey(domElementsDataAccess, function(tagInfo, tagName) {
	var property = tagInfo.property
		, event = tagInfo.event;
	if (typeof property != 'function')
		tagInfo.property = function() { return property; };
	var propFunc = tagInfo.property;
	if (typeof event != 'function')
		tagInfo.event = function() { return event; };
	if (! tagInfo.get)
		tagInfo.get = function(el) { return el[propFunc(el)]; }
	if (! tagInfo.set)
		tagInfo.set = function(el, value) { el[propFunc(el)] = value; }
});


/**
 * Types of input elements
 */
var inputElementTypes = {
	'checkbox': {
		property: 'checked',
		event: 'change'
	},
	'radio': {
		property: 'checked',
		event: 'change'
	},
	'text': {
		property: 'value',
		event: 'input'
	}
}


/**
 * Return property of input element to get/set its data
 *
 * @param {Element} el
 * @return {String}
 */
function inputDataProperty(el) {
	var inputType = inputElementTypes[el.type];
	return inputType
			? inputType.property
			: 'value';
}


/**
 * Returns DOM event type to listen to to react to input element change
 *
 * @param {Element} el
 * @return {String}
 */
function inputChangeEvent(el) {
	var inputType = inputElementTypes[el.type];
	return inputType
			? inputType.event
			: 'input';
}
