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


/**
 * `milo.registry.facets.get('Data')`
 * Facet to give access to DOM data
 */
var Data = _.createSubclass(ComponentFacet, 'Data');


/**
 * Data facet instance methods
 *
 * - [start](Data$start) - start Data facet
 * - [get](Data$get) - get DOM data from DOM tree
 * - [set](Data$set) - set DOM data to DOM tree
 * - [path](Data$path) - get reference to Data facet by path
 */
_.extendProto(Data, {
	start: Data$start,
	get: Data$get,
	set: Data$set,
	del: Data$del,
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


/**
 * Data facet instance method
 * Starts Data facet
 * Called by component after component is initialized.
 */
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


/**
 * Data facet instance method
 * Initializes DOMEventsSource and connects it to Data facet messenger
 *
 * @private
 */
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


/**
 * Subscriber to data change event
 *
 * @private
 * @param {String} msgType in this instance will be ''
 * @param {Object} data data change information
 */
function onDataChange(msgType, data) {
	this._postDataChanged(data);
}


/**
 * Subscriber to data change event in child Data facet
 *
 * @private
 * @param {String} msgType
 * @param {Obejct} data data change information
 */
function onChildData(msgType, data) {
	this.postMessage(data.path, data);
	this._postDataChanged(data);
}


/**
 * Data facet instance method
 * Sets data in DOM hierarchy recursively.
 * Returns the object with the data actually set (can be different, if components matching some properties are missing).
 *
 * @param {Object|String|Number} value value to be set. If the value if scalar, it will be set on component's element, if the value is object - on DOM tree inside component 
 * @return {Object|String|Number}
 */
 function Data$set(value) {
	if (value == this._value)
		return value;

	var valueSet;
	if (typeof value == 'object') {
		if (Array.isArray(value)) {
			valueSet = [];
			value.forEach(function(childValue, index) {
				setChildData.call(this, valueSet, childValue, index, '[$$]');
			}, this);
		} else {
			valueSet = {};
			_.eachKey(value, function(childValue, key) {
				setChildData.call(this, valueSet, childValue, key, '.$$');
			}, this);
		}

		var listFacet = this.owner.list
			, listCount = listFacet && listFacet.count()
			, removeCount = listCount - value.length;

		while (removeCount-- > 0)
			listFacet.removeItem(value.length, true);
	} else
		valueSet = this._setScalarValue(value);

	var oldValue = this._value;
	this._value = valueSet;

	// this message triggers onDataChange, as well as actuall DOM change
	// so the parent gets notified
	this.postMessage('', { path: '', type: 'changed',
							newValue: valueSet, oldValue: oldValue });
	
	return valueSet;


	function setChildData(valueSet, childValue, key, pathSyntax) {
		var childPath = pathSyntax.replace('$$', key);
		var childDataFacet = this.path(childPath, true);
		if (childDataFacet)
			valueSet[key] = childDataFacet.set(childValue);
		else
			logger.warn('attempt to set data on path that does not exist: ' + childPath);
	}
}


/**
 * Data facet instance method
 * Deletes component from view and scope, only in case it has Item facet on it
 *
 * @param {String|Number} value value to set to DOM element
 */
function Data$del() {
	console.log('Data$del');

	var itemFacet = this.owner.item;
	if (itemFacet)
		itemFacet.removeItem();
}


/**
 * Data facet instance method
 * Sets scalar value to DOM element
 *
 * @private
 * @param {String|Number} value value to set to DOM element
 */
function Data$_setScalarValue(value) {
	var el = this.owner.el
		, setter = tags[el.tagName.toLowerCase()];
	return setter
			? setter(el, value)
			: (el.innerHTML = value);
}


/**
 * Data facet instance method
 * Sends data `message` to DOM parent
 *
 * @private
 * @param {Object} msgData data change message
 */
function Data$_postDataChanged(msgData) {
	if (msgData.oldValue == msgData.newValue)
		return;

	var parentData = this.scopeParent();
	
	if (parentData) {
		var parentMsg = _.clone(msgData);
		parentMsg.path = (this._path || ('.' + thisComp.name))  + parentMsg.path;
		parentData.postMessage('childdata', parentMsg);
	}
}


/**
 * Data facet instance method
 * Get structured data from DOM hierarchy recursively
 * Returns DOM data
 *
 * @return {Object}
 */
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


/**
 * Data facet instance method
 * Gets scalar data from DOM element
 *
 * @private
 */
function Data$_getScalarValue() {
	var el = this.owner.el
		, getter = tags[el.tagName.toLowerCase()];
	return getter
			 ? getter(el)
			 : el.innerHTML;
}


/**
 * Data facet instance method
 * Returns data facet of a child component (by scopes) corresponding to the path
 * @param {String} accessPath data access path
 */
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

		var currentDataFacet = currentComponent && currentComponent.data;
		if (! currentDataFacet)
			break;
	}

	return currentDataFacet;
}


// Set value rules
var tags = {
	'input': inputValue,
	'select': inputValue,
	'img': imgValue
}


// Set and get value of input
function inputValue(el, value) {
	if (value)
		return (el.value = value);
	else
		return el.value;
}


// Set and get value of img tag
function imgValue(el, value) {
	if (value)
		return (el.src = value);
	else
		return el.src;
}
