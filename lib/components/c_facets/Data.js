// <a name="components-facets-data"></a>
// ###data facet

'use strict';

var Mixin = require('../../abstract/mixin')
	, ComponentFacet = require('../c_facet')
	, facetsRegistry = require('./cf_registry')

	, Messenger = require('../../messenger')
	, DOMEventsSource = require('../msg_src/dom_events')
	, DataMsgAPI = require('../msg_api/data')
	, pathUtils = require('../../model/path_utils')

	, _ = require('mol-proto')
	, logger = require('../../util/logger');


// data model connection facet
var Data = _.createSubclass(ComponentFacet, 'Data');

_.extendProto(Data, {
	start: Data$start,
	get: Data$get,
	set: Data$set,
	path: Data$path,
	_setScalarValue: Data$_setScalarValue,
	_getScalarValue: Data$_getScalarValue,
	_postDataChanged: Data$_postDataChanged,
	_prepareMessageSource: _prepareMessageSource
});

facetsRegistry.add(Data);

module.exports = Data;


// these methods will be wrapped to support "*" pattern subscriptions
var proxyDataSourceMethods = {
		// value: 'value',
		trigger: 'trigger'
	};


// start Data facet
function Data$start() {
	ComponentFacet.prototype.start.apply(this, arguments);

	this._prepareMessageSource();

	// store facet data path
	this._path = '.' + this.owner.name;

	// change messenger methods to work with "*" subscriptions (like Model class)
	pathUtils.wrapMessengerMethods.call(this);

	// subscribe to DOM event
	this.on('', onDataChange);

	// subscribe to changes in scope children with Data facet
	this.on('childdata', onChildData);
}


function _prepareMessageSource() {
	// TODO instead of this.owner should pass model? Where it is set?
	var dataAPI = new DataMsgAPI(this.owner)
		, dataEventsSource = new DOMEventsSource(this, proxyDataSourceMethods, dataAPI, this.owner);
	this._setMessageSource(dataEventsSource);

	_.defineProperty(this, '_dataEventsSource', dataEventsSource);

	// make value method of DataMsgAPI available on Data facet
	// this is a private method, get() should be used to get data.
	Mixin.prototype._createProxyMethod.call(dataAPI, 'value', 'value', this);
}


function onDataChange(msgType, data) {
	this._postDataChanged(data);
}

function onChildData(msgType, data) {
	this.postMessage(data.path, data);
	this._postDataChanged(data);
}


// Set component DOM value
function Data$set(value) {
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
	this.postMessage('', { path: '', type: 'changed',
							newValue: valueSet, oldValue: oldValue });
	
	return valueSet;
}


function Data$_setScalarValue(value) {
	var el = this.owner.el
		, setter = tags[el.tagName.toLowerCase()];
	return setter
			? setter(el, value)
			: (el.innerHTML = value);
}


function Data$_postDataChanged(message) {
	// TODO compare with old value
	// this.postMessage(message.path, message);

	var thisComp = this.owner
		, parentContainer = thisComp.scope._hostObject
		, parentData = parentContainer && parentContainer.owner.data;
	
	if (parentData) {
		var parentMsg = _.clone(message);
		parentMsg.path = (this._path || ('.' + thisComp.name))  + parentMsg.path;
		parentData.postMessage('childdata', parentMsg);
	}
}


// get structured data from scope hierarchy
function Data$get() {
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


function Data$_getScalarValue() {
	var el = this.owner.el
		, getter = tags[el.tagName.toLowerCase()];
	return getter
			 ? getter(el)
			 : el.innerHTML;
}


// returns data facet of a child component (by scopes) corresponding to the path
function Data$path(accessPath, createItem) {
	// hack
	createItem = true;

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
	'input': inputValue,
	'select': inputValue
}


// Set and get value of input
function inputValue(el, value) {
	if (value)
		return (el.value = value);
	else
		return el.value;
}
