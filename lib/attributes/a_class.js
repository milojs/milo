'use strict';

var _ = require('mol-proto')
	, check = require('../util/check')
	, Match = check.Match
	, toBeImplemented = require('../util/error').toBeImplemented;


module.exports = Attribute;


/**
 * An absctract class for parsing and validation of element attributes.
 * Subclasses should define methods `attrName`, `parse`, `validate` and `render`.
 *
 * @param {Element} el DOM element where attribute is attached
 * @param {String} name Optional name of the attribute, usually supplied by subclass via `attrName` method
 */
function Attribute(el, name) {
	this.name = name || this.attrName();
	this.el = el;

	// attribute node
	this.node = el.attributes[this.name];
}


/**
 * Attribute instance methods
 *
 * - [get](#get)
 * - [set](#set)
 * - [decorate](#decorate)
 *
 * The following instance methods should be defined by subclass
 *
 * - attrName - should return attribute name
 * - parse - should parse attribute value
 * - validate - should validate attribute value, throwing exception if it is incorrect 
 * - render - should return attribute value for a given attribute state (other properties, as defined in subclass)
 */
_.extendProto(Attribute, {
	get: get,
	set: set,
	decorate: decorate,

	// should be defined in subclass
	attrName: toBeImplemented,
	parse: toBeImplemented,
	validate: toBeImplemented,
	render: toBeImplemented
});


/**
 * Attribute instance method that returns attribute value as string.
 *
 * @return {String}
 */
function get() {
	return this.el.getAttribute(this.name);
}


/**
 * Attribute instance method that sets attribute value.
 *
 * @param {String} value
 */
function set(value) {
	this.el.setAttribute(this.name, value);
}


/**
 * Attribute instance method that decorates element with its rendered value.
 * Uses `render` method that should be defiend in subclass.
 */
function decorate() {
	this.set(this.render());
}
