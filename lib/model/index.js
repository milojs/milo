'use strict';

var pathUtils = require('./path_utils')
	, Messenger = require('../messenger')
	, ModelError = require('../util/error').Model
	, Mixin = require('../abstract/mixin')
	, doT = require('dot')
	, _ = require('mol-proto')
	, check = require('../util/check')
	, Match = check.Match
	, fs = require('fs')
	, logger = require('../util/logger');

module.exports = Model;


/**
 * `milo.Model`
 * Model class instantiates objects that allow deep data access with __safe getters__ that return undefined (rather than throwing exception) when properties/items of unexisting objects/arrays are requested and __safe setters__ that create object trees when properties/items of unexisting objects/arrays are set and also post messages to allow subscription on changes and enable data reactivity.
 * Reactivity is implememnted via [Connector](./connector.js.html) that can be instantiated either directly or with more convenient interface of [milo.minder](../minder.js.html). At the moment model can be connected to [Data facet](../components/c_facets/Data.js.html) or to another model or [ModelPath](#ModelPath.js.html).
 * Model constructor returns objects that are functions at the same time; when called they return ModelPath objects that allow get/set access to any point in model data. See [ModelData](#ModelData) below.
 *
 * You can subscribe to model changes with `on` method by passing model access path in place of message, pattern or string with any number of stars to subscribe to a certain depth in model (e.g., `'***'` to subscribe to three levels).
 * 
 * @constructor
 * @param {Object|Array} data optional initial array data. If it is planned to connect model to view it is usually better to instantiate an empty Model (`var m = new Model`), connect it to [Component](../components/c_class.js.html)'s [Data facet](../components/c_facets/Data.js.html) (e.g., `milo.minder(m, '<<->>', c.data);`) and then set the model with `m.set(data)` - the view will be automatically updated.
 * @param {Object} hostObject optional object that hosts model on one of its properties. Can be used when model itself is the context of the message subscriber and you need to travers to this object (although it is possible to set any context). Can also be used to proxy model's methods to the host like [Model facet](../components/c_facets/ModelFacet.js.html) is doing.
 * @return {Model}
 */
function Model(data, hostObject) {
	// `model` will be returned by constructor instead of `this`. `model`
	// (`modelPath` function) should return a ModelPath object with "synthesized" methods
	// to get/set model properties, to subscribe to property changes, etc.
	// Additional arguments of modelPath can be used in the path using interpolation - see ModelPath below.
	var model = function modelPath(accessPath) { // , ... arguments that will be interpolated
		return model.path.apply(model, arguments);
	};
	model.__proto__ = Model.prototype;

	_.defineProperties(model, {
		_hostObject: hostObject,
		_messenger: new Messenger(model, Messenger.defaultMethods)
	});

	// enables "stars" subscription to Model
	pathUtils.wrapMessengerMethods.call(model);

	if (data) model._data = data;

	return model;
}

Model.prototype.__proto__ = Model.__proto__;


/**
 * Templates to synthesize model getters and setters
 */
var getterTemplate = fs.readFileSync(__dirname + '/getter_template.js')
	, setterTemplate = fs.readFileSync(__dirname + '/setter_template.js');

var dotDef = {
	modelAccessPrefix: 'this._model._data',
	modelPostMessageCode: 'this._model.postMessage',
	getPathNodeKey: pathUtils.getPathNodeKey
};

var modelSetterDotDef = {
	modelAccessPrefix: 'this._data',
	modelPostMessageCode: 'this.postMessage',
	getPathNodeKey: pathUtils.getPathNodeKey
};

doT.templateSettings.strip = false;

var getterSynthesizer = doT.compile(getterTemplate, dotDef)
	, setterSynthesizer = doT.compile(setterTemplate, dotDef)
	, modelSetterSynthesizer = doT.compile(setterTemplate, modelSetterDotDef);


/** 
 * ####Model instance methods####
 *
 * - [get](#Model$get) - get model data
 * - set - set model data, synthesized
 * - [path](#path) - returns ModelPath object that allows access to any point in Model
 * - [push](#ModelPath$push) - add item to the array (or pseudo-array) in model
 * - [proxyMessenger](#proxyMessenger) - proxy model's Messenger methods to host object
 * - [proxyMethods](#proxyMethods) - proxy model methods to host object
 */
_.extendProto(Model, {
	get: Model$get,
	set: synthesizeMethod(modelSetterSynthesizer, '', []),
	path: Model$path,
	push: ModelPath$push,
	proxyMessenger: proxyMessenger,
	proxyMethods: proxyMethods
});


/**
 * Model instance method.
 * Get model data.
 *
 * @return {Any}
 */
function Model$get() {
	return this._data;
}


/**
 * Model instance method.
 * Returns ModelPath object that implements the same API as model but allows access to any point inside model as defined by `accessPath`.
 * See [ModelPath](#ModelPath) class below for more information.
 * 
 * @param {String} accessPath string that defines path to access model.
 *  Path string consists of parts to define either property access (`".name"` to access property name) or array item access (`"[1]"` to access item with index 1).
 *  Access path can contain as many parts as necessary (e.g. `".list[0].name"` to access property `name` in the first element of array stored in property `list`.
 * @param {List} arguments additional arguments of this method can be used to create interpolated paths.
 *  E.g. `m.path("[$1].$2", id, prop)` returns ModelPath to access property with name `prop` in array item with index `id`. Although this ModelPath object will work exactly as `m("[" + id + "]." + prop)`, the interpolated is much more efficient as ModelPath with interpolation will not synthesize new getters and setters, while ModelPath with computed access path will synthesize new getters and setters for each pair of values of `id` and `prop`.
 * @return {ModelPath}
 */
function Model$path(accessPath) {  // , ... arguments that will be interpolated
	// "null" is context to pass to ModelPath, first parameter of bind
	// "this" (model) is added in front of all arguments
	_.splice(arguments, 0, 0, null, this);

	// calling ModelPath constructor with new and the list of arguments: this (model), accessPath, ...
	return new (Function.prototype.bind.apply(ModelPath, arguments));
}


/**
 * Model instance method.
 * Proxy model's Messenger methods to host object.
 *
 * @param {Object} modelHostObject optional host object. If not passed, hostObject passed to Model constructor will be used.
 */
function proxyMessenger(modelHostObject) {
	modelHostObject = modelHostObject || this._hostObject;
	Mixin.prototype._createProxyMethods.call(this, messengerMethodsToProxy, modelHostObject);
}
var messengerMethodsToProxy = ['on', 'off', 'getSubscribers'];


/**
 * Model instance method.
 * Proxy model methods to host object.
 *
 * @param {Object} modelHostObject optional host object. If not passed, hostObject passed to Model constructor will be used.
 */
function proxyMethods(modelHostObject) {
	modelHostObject = modelHostObject || this._hostObject;
	Mixin.prototype._createProxyMethods.call(this, modelMethodsToProxy, modelHostObject);
}
var modelMethodsToProxy = ['get', 'set', 'path', 'push'];


/**
 * Export ModelPath object as `milo.Model.Path`.
 */
_.extend(Model, {
	Path: ModelPath
});


/**
 * 'milo.Model.Path'
 * ModelPath object that allows access to any point inside model as defined by `accessPath`
 *
 * @constructor
 * @param {String} accessPath string that defines path to access model.
 *  Path string consists of parts to define either property access (`".name"` to access property name) or array item access (`"[1]"` to access item with index 1).
 *  Access path can contain as many parts as necessary (e.g. `".list[0].name"` to access property `name` in the first element of array stored in property `list`.
 * @param {List} arguments additional arguments of this method can be used to create interpolated paths.
 *  E.g. `m.path("[$1].$2", id, prop)` returns ModelPath to access property with name `prop` in array item with index `id`. Although this ModelPath object will work exactly as `m("[" + id + "]." + prop)`, the interpolated is much more efficient as ModelPath with interpolation will not synthesize new getters and setters, while ModelPath with computed access path will synthesize new getters and setters for each pair of values of `id` and `prop`.
 * @return {ModelPath}
 */
function ModelPath(model, path) { // ,... - additional arguments for interpolation
	check(model, Model);
	check(path, String);

	_.defineProperties(this, {
		_model: model,
		_path: path,
		_args: _.slice(arguments, 1)
	});

	// compiling getter and setter
	var methods = synthesizePathMethods(path);

	// adding methods to model path
	_.defineProperties(this, methods);

	Object.freeze(this);
}


// adding messaging methods to ModelPath prototype
var modelPathMessengerMethods = _.mapToObject(['on', 'off'], function(methodName) {
	// creating subscribe/unsubscribe/etc. methods for ModelPath class
	// to dispatch messages with paths relative to access path of ModelPath
	return function(accessPath, subscriber) {
		check(accessPath, String);
		var self = this;
		this._model[methodName](this._path + accessPath, function(msgPath, data) {
			data.fullPath = msgPath;
			if (msgPath.indexOf(self._path) == 0) {
				msgPath = msgPath.replace(self._path, '');
				data.path = msgPath;
			} else
				logger.warn('ModelPath message dispatched with wrong root path');

			if (typeof subscriber == 'function')
				subscriber.call(this, msgPath, data);
			else
				subscriber.subscriber.call(subscriber.context, msgPath, data);
		});
	};
});

_.extendProto(ModelPath, modelPathMessengerMethods);


/**
 * ####ModelPath instance methods####
 * 
 * - get - synthesized
 * - set - synthesized
 * - [path](#ModelPath$path) - gives access to path inside ModelPath
 * - [push](ModelPath$push) - add item to array (or pseudo-array) in ModelPath
 */
_.extendProto(ModelPath, {
	path: ModelPath$path,
	push: ModelPath$push
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
 * Adds item to the end array (or pseudo-array). Returns new length.
 *
 * @param {Any} value item that will be added to array (pseudo array)
 * @return {Number}
 */
function ModelPath$push(value) {
	var lengthPath = this.path('.length')
		, length = lengthPath.get() || 0;
	this.path('[$1]', length).set(value);
	lengthPath.set(++length);
	return length;
}


/**
 * Function that synthesizes accessor methods.
 * Function is memoized so accessors are cached (up to 1000).
 *
 * @parivate
 * @param {String} path Model/ModelPath access path
 * @return {Object{get:Function, set:Function}}
 */
var synthesizePathMethods = _.memoize(_synthesizePathMethods, undefined, 1000);

function _synthesizePathMethods(path) {
	var parsedPath = pathUtils.parseAccessPath(path);

	var methods = {
		get: synthesizeMethod(getterSynthesizer, path, parsedPath),
		set: synthesizeMethod(setterSynthesizer, path, parsedPath)
	};

	return methods;
}


function synthesizeMethod(synthesizer, path, parsedPath) {
	var method
		, methodCode = synthesizer({
			parsedPath: parsedPath,
			getPathNodeKey: pathUtils.getPathNodeKey
		});

	try {
		eval(methodCode);
	} catch (e) {
		throw ModelError('ModelPath method compilation error; path: ' + path + ', code: ' + methodCode);
	}

	return method;


	// functions used by ModelPath setter (synthesized by template)
	function addChangeMessage(messages, messagesHash, msg) {
		messages.push(msg);
		messagesHash[msg.path] = msg;
	}

	function addTreeChangesMessages(messages, messagesHash, rootPath, oldValue, newValue) {
		var oldIsTree = valueIsTree(oldValue)
			, newIsTree = valueIsTree(newValue);

		if (newIsTree)
			addMessages(rootPath, newValue, 'added', 'newValue');
		
		if (oldIsTree)
			addMessages(rootPath, oldValue, 'removed', 'oldValue');


		function addMessages(rootPath, obj, msgType, valueProp) {
			if (Array.isArray(obj)) {
				var pathSyntax = rootPath + '[$$]';
				obj.forEach(function(value, index) {
					addMessage(value, index, pathSyntax);
				});
			} else {
				var pathSyntax = rootPath + '.$$';
				_.eachKey(obj, function(value, key) {
					addMessage(value, key, pathSyntax);
				});
			}


			function addMessage(value, key, pathSyntax) {
				var path = pathSyntax.replace('$$', key)
					, existingMsg = messagesHash[path];

				if (existingMsg) {
					if (existingMsg.type == msgType)
						logger.error('setter error: same message type posted on the same path')
					else {
						existingMsg.type = 'changed';
						existingMsg[valueProp] = value;
					}
				} else {
					var msg = { path: path, type: msgType };
					msg[valueProp] = value;
					addChangeMessage(messages, messagesHash, msg)
				}

				if (valueIsTree(value))
					addMessages(path, value, msgType, valueProp);
			}
		}
	}

	function valueIsTree(value) {
		return typeof value == "object" && Object.keys(value).length;
	}
}
