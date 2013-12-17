// <a name="attribute"></a>
// attribute class
// ---------

'use strict';

var _ = require('mol-proto')
	, check = require('../util/check')
	, Match = check.Match
	, toBeImplemented = require('../util/error').toBeImplemented;


// an abstract attribute class for attribute parsing and validation

module.exports = Attribute;

function Attribute(el, name) {
	this.name = name || this.attrName();
	this.el = el;
	this.node = el.attributes[this.name];
}

_.extendProto(Attribute, {
	get: get,
	set: set,

	// should be defined in subclass
	attrName: toBeImplemented,
	parse: toBeImplemented,
	validate: toBeImplemented,
	render: toBeImplemented,
	decorate: decorate
});

// get attribute value
function get() {
	return this.el.getAttribute(this.name);
}

// set attribute value
function set(value) {
	this.el.setAttribute(this.name, value);
}

function decorate() {
	this.set(this.render());
}
