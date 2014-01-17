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
	getState: Data$getState,
	setState: Data$setState,

	get: Data$get,
	set: Data$set,
	del: Data$del,
	path: Data$path,
	_setScalarValue: Data$_setScalarValue,
	_getScalarValue: Data$_getScalarValue,
	_postDataChanged: Data$_postDataChanged,
	_prepareMessageSource: _prepareMessageSource,
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

	// queue of "changedata" messages
	_.defineProperty(this, '_changesQueue', []);

	this._prepareMessageSource();

	// store facet data path
	this._path = '.' + this.owner.name;

	// change messenger methods to work with "*" subscriptions (like Model class)
	pathUtils.wrapMessengerMethods.call(this);

	// prepare internal and external messengers
	// this._prepareMessengers();

	// if (this.config.subscribeToComponent)
	// 	var subscribeObj = this.owner;
	// else
	// 	var subscribeObj = this;

	// subscribe to DOM event
	this.on('', onDataChange);

	// subscribe to changes in scope children with Data facet
	this.on('childdata', onChildData);

	// subscribe to "changedata" event to enable reactive connections
	this.on('changedata', onChangeDataMessage)
}


/**
 * Data facet instance method
 * Create and connect internal and external messengers of Data facet.
 * External messenger's methods are proxied on the Data facet and they allows "*" subscriptions.
 */
function _prepareMessengers() {
	// model will post all its changes on internal messenger
	var internalMessenger = new Messenger(this);

	// message source to connect internal messenger to external
	var internalMessengerSource = new MessengerMessageSource(this, undefined, new ModelMsgAPI, internalMessenger);

	// external messenger to which all model users will subscribe,
	// that will allow "*" subscriptions and support "changedata" message api.
	var externalMessenger = new Messenger(this, Messenger.defaultMethods, internalMessengerSource);

	_.defineProperties(this, {
		_messenger: externalMessenger,
		_internalMessenger: internalMessenger
	});
}

/**
 * Data facet instance method
 * Initializes DOMEventsSource and connects it to Data facet messenger
 *
 * @private
 */
function _prepareMessageSource() {
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
 * subscriber to "changedata" event to enable reactive connections
 *
 * @private
 * @param {String} msg should be "changedata" here
 * @param {Object} data data change desciption object}
 * @param {Function} callback callback to call when the data is processed
 */
function onChangeDataMessage(msg, data, callback) {
	if (! this._changesQueue.length)
		// setTimeout(_.partial(_processChanges.call.bind(_processChanges), this), 1);
		_.defer(processChangesFunc, this, callback)

	this._changesQueue.push(data);
}


var processChangesFunc = Function.prototype.call.bind(_processChanges);
/**
 * Processes queued "changedata" messages
 *
 * @private
 */
function _processChanges(callback) {
	callback && callback(null, false);

	this._changesQueue.forEach(function(data) {
		var modelPath = this.path(data.path); // same as this._model(data.fullPath)

		if (! modelPath) return;

		// set the new data
		if (data.type == 'splice') {
			var index = data.index
				, howMany = data.removed.length
				, spliceArgs = [index, howMany];

			spliceArgs = spliceArgs.concat(data.newValue.slice(index, index + data.addedCount));
			modelPath.splice.apply(modelPath, spliceArgs);
		} else {
			var methodName = changeTypeToMethodMap[data.type];
			if (methodName)
				modelPath[methodName](data.newValue);
			else
				logger.error('unknown data change type');
		}
	}, this);

	this._changesQueue.length = 0;

	callback && callback(null, true);
}

var changeTypeToMethodMap = {
	'added': 'set',
	'changed': 'set',
	'deleted': 'del',
	'removed': 'del'
};


/**
 * Data facet instance method
 * Sets data in DOM hierarchy recursively.
 * Returns the object with the data actually set (can be different, if components matching some properties are missing).
 *
 * @param {Object|String|Number} value value to be set. If the value if scalar, it will be set on component's element, if the value is object - on DOM tree inside component 
 * @return {Object|String|Number}
 */
 function Data$set(value) {
 	if (typeof this.config.set == 'function') {
 		this.config.set.call(this.owner, value);
 		return;
 	}

	if (value == this._value)
		return value;

	var valueSet;
	if (typeof value == 'object') {
		if (Array.isArray(value)) {
			var listFacet = this.owner.list;
			if (listFacet){
				var newItemsCount = value.length - listFacet.count();
			 	if (newItemsCount >= 3)
					listFacet.addItems(newItemsCount);
			}
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
		// else
		// 	logger.warn('attempt to set data on path that does not exist: ' + childPath);
	}
}


/**
 * Data facet instance method
 * Deletes component from view and scope, only in case it has Item facet on it
 *
 * @param {String|Number} value value to set to DOM element
 */
function Data$del() {
	if (typeof this.config.del == 'function') {
 		this.config.del.call(this.owner);
 		return;
 	}
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
			: (el.innerHTML = typeof value == 'undefined' ? '' : value);
}


/**
 * Data facet instance method
 * Sends data `message` to DOM parent
 *
 * @private
 * @param {Object} msgData data change message
 */
function Data$_postDataChanged(msgData) {
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
	if (typeof this.config.get == 'function')
 		return this.config.get.call(this.owner);

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
			if (scopeItem.data)
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


/**
 * Data facet instance method
 * Called by `Component.prototype.getState` to get facet's state
 * Returns DOM data
 *
 * @return {Object}
 */
function Data$getState() {
	return { state: this.get() };
}


/**
 * Data facet instance method
 * Called by `Component.prototype.setState` to set facet's state
 * Simply sets model data
 *
 * @param {Object} state data to set on facet's model
 */
function Data$setState(state) {
	return this.set(state.state);
}


// Set value rules
var tags = {
	'input': inputValue,
	'select': inputValue,
	'textarea': inputValue,
	'img': imgValue
}


// Set and get value of input
function inputValue(el, value) {
	if (value)
		return (el.value = typeof value == 'undefined' ? '' : value);
	else
		return el.value;
}


// Set and get value of img tag
function imgValue(el, value) {
	if (value)
		return (el.src = typeof value == 'undefined' ? '' : value);
	else
		return el.src;
}
