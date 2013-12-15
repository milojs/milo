'use strict';

var ComponentFacet = require('../c_facet')
	, facetsRegistry = require('./cf_registry')

	, Messenger = require('../../messenger')
	, ComponentDataSource = require('../c_message_sources/component_data_source')

	, _ = require('mol-proto');


// data model connection facet
var Data = _.createSubclass(ComponentFacet, 'Data');

_.extendProto(Data, {
	init: init,
	set: set
});

facetsRegistry.add(Data);

module.exports = Data;


// Initialize Data Facet
function init() {
	ComponentFacet.prototype.init.apply(this, arguments);

	var proxyCompDataSourceMethods = {
		value: 'value',
		trigger: 'trigger'
	};

	// instead of this.owner should pass model? Where it is set?
	var compDataSource = new ComponentDataSource(this, proxyCompDataSourceMethods, this.owner);
	this._setMessageSource(compDataSource);

	Object.defineProperties(this, {
		_compDataSource: { value: compDataSource }
	});
}


// Set components dom value
function set(value) {
	tags[this.owner.el.tagName](this.owner.el, value);
}


// Set value rules
var tags = {
	'P': 		innerHtml,
	'H1': 		innerHtml,
	'H2': 		innerHtml,
	'H3': 		innerHtml,
	'H4': 		innerHtml,
	'H5': 		innerHtml,
	'H6': 		innerHtml,
	'LI': 		innerHtml,
	'SPAN': 	innerHtml,
	'DIV': 		innerHtml,
	'STRONG': 	innerHtml,
	'EM': 		innerHtml,
	'INPUT': 	inputValue
}


// Set value with innerHTML
function innerHtml(el, value) {
	el.innerHTML = value;
}


// Set value of input
function inputValue(el, value) {
	el.value = value;
}
