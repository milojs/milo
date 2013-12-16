'use strict';

var ComponentFacet = require('../c_facet')
	, facetsRegistry = require('./cf_registry')

	, Messenger = require('../../messenger')
	, ComponentDataSource = require('../c_message_sources/component_data_source')
	, pathUtils = require('../../model/path_utils')

	, _ = require('mol-proto')
	, logger = require('../../util/logger');


// data model connection facet
var Data = _.createSubclass(ComponentFacet, 'Data');

_.extendProto(Data, {
	init: init,
	get: get,
	set: set,
	path: path,
	_setScalarValue: _setScalarValue
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


// Set components DOM value
function set(value) {
	if (typeof value == 'object') {
		if (Array.isArray(value))
			value.forEach(function(item, index) {
				var childDataFacet = this.path('[' + index + ']', true); // true will create item in list
				if (childDataFacet)
					childDataFacet.set(item);
				else
					logger.warn('attempt to set data on path that does not exist: ' + '[' + index + ']');
			}, this);
		else
			_.eachKey(value, function(item, key) {
				var childDataFacet = this.path('.' + key);
				if (childDataFacet)
					childDataFacet.set(item);
				else
					logger.warn('attempt to set data on path that does not exist: ' + '.' + key);
			}, this);
	} else
		this._setScalarValue(value);
}


function _setScalarValue(value) {
	tags[this.owner.el.tagName](this.owner.el, value);
}


// get structured data from scope hierarchy
function get() {
	var comp = this.owner
		, scopeData;

	if (comp.list) {
		scopeData = [];
		comp.list.each(function(listItem, index) {
			scopeData[index] = listItem.data.get();
		});

		if (comp.container)
			comp.container.scope._each(function(scopeItem, name) {
				if (! comp.list.contains(scopeItem))
					scopeData[name] = scopeItem.data.get();
			});
	} else if (comp.container) {
		scopeData = {};
		comp.container.scope._each(function(scopeItem, name) {
			scopeData[name] = scopeItem.data.get();
		});
	} else
		return _getScalarValue(value);

	return scopeData;
}


function _getScalarValue(value) {
	// tags[this.owner.el.tagName](this.owner.el); ???
}


// returns data facet of a child component (by scopes) corresponding to the path
function path(accessPath, createItem) {
	var parsedPath = pathUtils.parseAccessPath(accessPath)
		, currentComponent = this.owner;

	for (var i = 0, len = parsedPath.length; i < len; i++) {
		var pathNode = parsedPath[i]
			, nodeKey = pathUtils.getPathNodeKey(pathNode);
		if (pathNode.syntax == 'array' && currentComponent.list) {
			var itemComponent = currentComponent.list.item(nodeKey);
			if (! itemComponent && createItem)
				itemComponent = currentComponent.list.addItem(nodeKey);
			if (itemComponent)
				currentComponent = itemComponent;
		} else if (currentComponent.container)
			currentComponent = currentComponent.container.scope[nodeKey];

		if (! currentComponent || ! currentComponent.data)
			break;
	}

	return currentComponent && currentComponent.data;
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
