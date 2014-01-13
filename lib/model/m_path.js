'use strict';

var synthesize = require('./synthesize')
	, pathUtils = require('./path_utils')
	, Messenger = require('../messenger')
	, ModelPathMsgAPI = require('./path_msg_api')
	, MessengerMessageSource = require('../messenger/msngr_source')
	, _ = require('mol-proto')
	, check = require('../util/check')
	, Match = check.Match;


module.exports = ModelPath;


/**
 * `milo.Model.Path`
 * ModelPath object that allows access to any point inside [Model](./index.js.html) as defined by `accessPath`
 *
 * @constructor
 * @param {Model} model Model instance that ModelPath gives access to.
 * @param {String} accessPath string that defines path to access model.
 *  Path string consists of parts to define either property access (`".name"` to access property name) or array item access (`"[1]"` to access item with index 1).
 *  Access path can contain as many parts as necessary (e.g. `".list[0].name"` to access property `name` in the first element of array stored in property `list`.
 * @param {List} arguments additional arguments of this method can be used to create interpolated paths.
 *  E.g. `m.path("[$1].$2", id, prop)` returns ModelPath to access property with name `prop` in array item with index `id`. Although this ModelPath object will work exactly as `m("[" + id + "]." + prop)`, the interpolated is much more efficient as ModelPath with interpolation will not synthesize new getters and setters, while ModelPath with computed access path will synthesize new getters and setters for each pair of values of `id` and `prop`.
 * @return {ModelPath}
 */
function ModelPath(model, path) { // ,... - additional arguments for interpolation
	// check(model, Model);
	check(path, String);

	_.defineProperties(this, {
		_model: model,
		_path: path,
		_args: _.slice(arguments, 1), // path will be the first element of this array
		_changesQueue: []
	});

	// parse access path
	var parsedPath = pathUtils.parseAccessPath(path);

	// compute access path string
	_.defineProperty(this, '_accessPath', interpolateAccessPath(parsedPath, this._args));

	// messenger fails on "*" subscriptions
	this._prepareMessenger();

	// compiling getter and setter
	var methods = synthesize(path, parsedPath);

	// adding methods to model path
	_.defineProperties(this, methods);

	// subscribe to "changedata" message to enable reactive connections
	this.on('changedata', _onChangeData);

	Object.freeze(this);
}


/**
 * Interpolates path elements to compute real path
 *
 * @param {Array} parsedPath parsed path - array of path nodes
 * @param {Array} args path interpolation arguments, args[0] is path itself
 * @return {String}
 */
function interpolateAccessPath(parsedPath, args) {
	return parsedPath.reduce(function(accessPathStr, currNode, index) {
		var interpolate = currNode.interpolate;
		return accessPathStr + 
				(interpolate
					? (currNode.syntax == 'array'
						? '[' + args[interpolate] + ']'
						: '.' + args[interpolate])
					: currNode.property);
	}, '');
}


/**
 * ####ModelPath instance methods####
 * 
 * - [path](#ModelPath$path) - gives access to path inside ModelPath
 * - get - synthesized
 * - set - synthesized
 * - splice - splice model data (as array or pseudo-array), synthesized
 * - [len](#ModelPath$len) - returns length of array (or pseudo-array) in safe way, 0 if no length is set
 * - [push](#ModelPath$push) - add items to the end of array (or pseudo-array) in ModelPath
 * - [pop](#ModelPath$pop) - remove item from the end of array (or pseudo-array) in ModelPath
 * - [unshift](#ModelPath$unshift) - add items to the beginning of array (or pseudo-array) in ModelPath
 * - [shift](#ModelPath$shift) - remove item from the beginning of array (or pseudo-array) in ModelPath
 */
_.extendProto(ModelPath, {
	path: ModelPath$path,
	len: ModelPath$len,
	push: ModelPath$push,
	pop: ModelPath$pop,
	unshift: ModelPath$unshift,
	shift: ModelPath$shift,
	_prepareMessenger: _prepareMessenger,
	_onChangeData: _onChangeData,
	_processChanges: _processChanges
})


/**
 * ModelPath instance method
 * Gives access to path inside ModelPath. Method works similarly to [path method](#Model$path) of model, using relative paths.
 * 
 * @param {String} accessPath string that defines path to access model.
 *  Path string consists of parts to define either property access (`".name"` to access property name) or array item access (`"[1]"` to access item with index 1).
 *  Access path can contain as many parts as necessary (e.g. `".list[0].name"` to access property `name` in the first element of array stored in property `list`.
 * @param {List} arguments additional arguments of this method can be used to create interpolated paths.
 *  E.g. `m.path("[$1].$2", id, prop)` returns ModelPath to access property with name `prop` in array item with index `id`. Although this ModelPath object will work exactly as `m("[" + id + "]." + prop)`, the interpolated is much more efficient as ModelPath with interpolation will not synthesize new getters and setters, while ModelPath with computed access path will synthesize new getters and setters for each pair of values of `id` and `prop`.
 * @return {ModelPath}
 */
function ModelPath$path(accessPath) {  // , ... arguments that will be interpolated
	var thisPathArgsCount = this._args.length - 1;

	if (thisPathArgsCount > 0) {// this path has interpolated arguments too
		accessPath = accessPath.replace(/\$[1-9][0-9]*/g, function(str){
			return '$' + (+str.slice(1) + thisPathArgsCount);
		});
	}

	var newPath = this._path + accessPath;

	// "null" is context to pass to ModelPath, first parameter of bind
	// this._model is added in front of all arguments as the first parameter
	// of ModelPath constructor
	var bindArgs = [null, this._model, newPath]
						.concat(this._args.slice(1)) // remove old path from _args, as it is 1 based
						.concat(_.slice(arguments, 1)); // add new interpolation arguments

	// calling ModelPath constructor with new and the list of arguments: this (model), accessPath, ...
	return new (Function.prototype.bind.apply(ModelPath, bindArgs));
}


/**
 * ModelPath and Model instance method
 * Returns length property and sets it to 0 if it wasn't set.
 *
 * @return {Any}
 */
function ModelPath$len() {
	return this.path('.length').get() || 0;
}


/**
 * ModelPath and Model instance method
 * Adds items to the end of array (or pseudo-array). Returns new length.
 *
 * @param {List} arguments list of items that will be added to array (pseudo array)
 * @return {Integer}
 */
function ModelPath$push() { // arguments
	var length = this.len();
	var newLength = length + arguments.length;

	_.splice(arguments, 0, 0, length, 0);
	this.splice.apply(this, arguments);

	return newLength;
}


/**
 * ModelPath and Model instance method
 * Removes item from the end of array (or pseudo-array). Returns this item.
 *
 * @return {Any}
 */
function ModelPath$pop() {
	return this.splice(this.len() - 1, 1)[0];
}


/**
 * ModelPath and Model instance method
 * Inserts items to the beginning of the array. Returns new length.
 *
 * @param {List} arguments items to be inserted in the beginning of array
 * @return {Integer}
 */
function ModelPath$unshift() { // arguments
	var length = this.len();
	length += arguments.length;

	_.splice(arguments, 0, 0, 0, 0);
	this.splice.apply(this, arguments);

	return length;
}


/**
 * ModelPath and Model instance method
 * Removes the item from the beginning of array (or pseudo-array). Returns this item.
 *
 * @return {Any}
 */
function ModelPath$shift() { // arguments
	return this.splice(0, 1)[0];
}


/**
 * ModelPath instance method
 * Initializes ModelPath mesenger with Model's messenger as its source ([MessengerMessageSource](../messenger/msngr_source.js.html)) and [ModelPathMsgAPI](./path_msg_api.js.html) as [MessengerAPI](../messenger/m_api.js.html)
 */
function _prepareMessenger() {
	var mPathAPI = new ModelPathMsgAPI(this._accessPath);

	// create MessengerMessageSource connected to Model's messenger
	var modelMessageSource = new MessengerMessageSource(this, undefined, mPathAPI, this._model);

	// create messenger with model passed as hostObject (default message dispatch context)
	// and without proxying methods (we don't want to proxy them to Model)
	var mPathMessenger = new Messenger(this, Messenger.defaultMethods, modelMessageSource);

	// store messenger on ModelPath instance
	_.defineProperty(this, '_messenger', mPathMessenger);
}


/**
 * ModelPath instance method
 * Handler of "changedata" event that is emitted by [Connector](./connector.js.html) object
 *
 * @private
 * @param {String} message "changedata"
 * @param {Object} data data change desciption object
 */
function _onChangeData(message, data) {
	if (! this._changesQueue.length)
		_.defer(processChangesFunc, this);

	this._changesQueue.push(data);
}


var processChangesFunc = Function.prototype.call.bind(_processChanges);
/**
 * ModelPath instance method
 * Processes queued "changedata" messages
 *
 * @private
 */
function _processChanges() {
	this.postMessage('changedatastarted');

	this._changesQueue.forEach(function(data) {
		var modelPath = this.path(data.path); // same as this._model(data.fullPath)

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

	this.postMessage('changedatafinished');
}

var changeTypeToMethodMap = {
	'added': 'set',
	'changed': 'set',
	'deleted': 'del',
	'removed': 'del'
};
