// <a name="components-facets-data"></a>
// ###data facet

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
	_setScalarValue: _setScalarValue,
	_getScalarValue: _getScalarValue,
	_postDataChanged: _postDataChanged,
	_wrapMessengerMethods: pathUtils.wrapMessengerMethods
});

facetsRegistry.add(Data);

module.exports = Data;


// these methods will be wrapped to support "*" pattern subscriptions
var dataFacetMethodsToWrap = ['on', 'off', 'onMessages', 'offMessages'];


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

	_.defineProperty(this, '_compDataSource', compDataSource);

	this._path = '.' + this.owner.name;

	this._wrapMessengerMethods(dataFacetMethodsToWrap);

	this.on('childdata', onChildData);

	// a hack to ensure message source subscription on all Data facets
	this.on('', function() {});
}


// Set component DOM value
function set(value) {
	if (value == this._value)
		return value;

	var valueSet;
	if (typeof value == 'object') {
		if (Array.isArray(value)) {
			valueSet = [];
			value.forEach(function(item, index) {
				var childDataFacet = this.path('[' + index + ']', true); // true will create item in list
				if (childDataFacet) {
					valueSet[index] = childDataFacet.set(item);
				} else
					logger.warn('attempt to set data on path that does not exist: ' + '[' + index + ']');
			}, this);
		} else {
			valueSet = {};
			_.eachKey(value, function(item, key) {
				var childDataFacet = this.path('.' + key);
				if (childDataFacet) {
					valueSet[key] = childDataFacet.set(item);
				} else
					logger.warn('attempt to set data on path that does not exist: ' + '.' + key);
			}, this);
		}
	} else
		valueSet = this._setScalarValue(value);

	var oldValue = this._value;
	this._value = valueSet;
	this._postDataChanged({ path: '', type: 'changed',
							newValue: valueSet, oldValue: oldValue });
	
	return valueSet;
}


function _setScalarValue(value) {
	var el = this.owner.el
		, setter = tags[el.tagName.toLowerCase()];
	return setter
			? setter(el, value)
			: (el.innerHTML = value);
}


function _postDataChanged(message) {
	// TODO compare with old value
	this.postMessage(message.path, message);

	var thisComp = this.owner
		, parentContainer = thisComp.scope._hostObject
		, parentData = parentContainer && parentContainer.owner.data;
	
	if (parentData) {
		var parentMsg = _.clone(message);
		parentMsg.path = (this._path || ('.' + thisComp.name))  + parentMsg.path;
		parentData.postMessage('childdata', parentMsg);
	}
}


function onChildData(msgType, message) {
	this._postDataChanged(message);
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
				if (! comp.list.contains(scopeItem) && scopeItem.data)
					scopeData[name] = scopeItem.data.get();
			});
	} else if (comp.container) {
		scopeData = {};
		comp.container.scope._each(function(scopeItem, name) {
			scopeData[name] = scopeItem.data.get();
		});
	} else
		return this._getScalarValue();

	return scopeData;
}


function _getScalarValue() {
	var el = this.owner.el
		, getter = tags[el.tagName.toLowerCase()];
	return getter
			 ? getter(el)
			 : el.innerHTML;
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
			if (! itemComponent && createItem) {
				itemComponent = currentComponent.list.addItem(nodeKey);
				itemComponent.data._path = pathNode.property;
			}
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
	'input': inputValue
}


// Set and get value of input
function inputValue(el, value) {
	if (value)
		return (el.value = value);
	else
		return el.value;
}
