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
 * Model class instantiates objects that allow deep data access with __safe getters__ that return undefined (rather than throwing exception) when properties/items on unexisting objects/arrays are requested and __safe setters__ that create object trees when properties/items on unexisting objects/arrays are set and also post messages to allow subscription on changes and enable data reactivity.
 * Reactivity is implememnted via [Connector](./connector.js.html) that can be instantiated either directly or with more convenient interface of [milo.minder](../minder.js.html). At the moment model can be connected to [Data facet](../components/c_facets/Data.js.html) or to another model.
 * Model constructor returns objects that are functions at the same time; when called they return ModelPath objects that allow get/set access to any point in model data. See [ModelData](#ModelData) below.
 * 
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

	var messenger = new Messenger(model, Messenger.defaultMethods);

	_.defineProperties(model, {
		hostObject: hostObject,
		_messenger: messenger
	});

	pathUtils.wrapMessengerMethods.call(model);

	if (data) model._data = data;

	return model;
}

Model.prototype.__proto__ = Model.__proto__;


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

var getterTemplate = fs.readFileSync(__dirname + '/getter_template.js')
	, setterTemplate = fs.readFileSync(__dirname + '/setter_template.js');

doT.templateSettings.strip = false;

var getterSynthesizer = doT.compile(getterTemplate, dotDef)
	, setterSynthesizer = doT.compile(setterTemplate, dotDef)
	, modelSetterSynthesizer = doT.compile(setterTemplate, modelSetterDotDef);


_.extendProto(Model, {
	get: Model$get,
	set: synthesizeMethod(modelSetterSynthesizer, '', []),
	path: Model$path,
	push: ModelPath$push,
	proxyMessenger: proxyMessenger
});

function Model$get() {
	return this._data;
}

// returns ModelPath object
function Model$path(accessPath) {  // , ... arguments that will be interpolated
	// "null" is context to pass to ModelPath, first parameter of bind
	// "this" (model) is added in front of all arguments
	_.splice(arguments, 0, 0, null, this);

	// calling ModelPath constructor with new and the list of arguments: this (model), accessPath, ...
	return new (Function.prototype.bind.apply(ModelPath, arguments));
}


function proxyMessenger(modelHostObject) {
	Mixin.prototype._createProxyMethods.call(this._messenger, Messenger.defaultMethods, modelHostObject);
}


_.extend(Model, {
	Path: ModelPath
});

function ModelPath(model, path) { // ,... - additional arguments for interpolation
	check(model, Model);
	check(path, String);
	// check(it, Match.Optional(Object));

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

			subscriber.call(this, msgPath, data);
		});
	};
})

_.extendProto(ModelPath, modelPathMessengerMethods);

_.extendProto(ModelPath, {
	path: ModelPath$path,
	push: ModelPath$push
})


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


function ModelPath$push(value) {
	var data = this.get()
		, length = data && data.length || 0;
	this.path('[$1]', length).set(value);
}


var synthesizePathMethods = _.memoize(_synthesizePathMethods);

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
