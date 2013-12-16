'use strict';

var pathUtils = require('./path_utils')
	, Messenger = require('../messenger')
	, ModelError = require('../util/error').Model
	, Mixin = require('../abstract/mixin')
	, doT = require('dot')
	, _ = require('mol-proto')
	, check = require('../util/check')
	, Match = check.Match
	, fs = require('fs');

module.exports = Model;


function Model(scope, schema, name, data) {
	// modelPath should return a ModelPath object with "compiled" methods
	// to get/set model properties, to subscribe to property changes, etc.
	// "it" parameter is the object which properties can be referenced in path.
	// These references will be evaluated at run rather than at compile time
	var model = function modelPath(path, it) {
		return new ModelPath(model, path, it);
	}
	model.__proto__ = Model.prototype;

	var messenger = new Messenger(model, Messenger.defaultMethods);

	_.defineProperties(model, {
		scope: scope,
		name: name,
		_schema: schema,
		_messenger: messenger,
		__pathsCache: {}
	});

	model._wrapMessengerMethods();

	model._data = data;

	return model;
}

Model.prototype.__proto__ = Model.__proto__;


// cache of compiled ModelPath methods
var __synthesizedPathsMethods = {};

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
	get: get,
	set: synthesizeMethod(modelSetterSynthesizer, '', []),
	proxyMessenger: proxyMessenger,
	_wrapMessengerMethods: _wrapMessengerMethods
});

function get() {
	return this._data;
}


function proxyMessenger(modelHostObject) {
	Mixin.prototype._createProxyMethods.call(this._messenger, Messenger.defaultMethods, modelHostObject);
}


// TODO allow for multiple messages in a string
var modelMethodsToWrap = ['on', 'off', 'onMessages', 'offMessages'];
function _wrapMessengerMethods() {
	modelMethodsToWrap.forEach(function(methodName) {
		var origMethod = this[methodName];
		// replacing message subsribe/unsubscribe/etc. to convert "*" message patterns to regexps
		this[methodName] = function(path, subscriber) {
			var regexPath = pathUtils.createRegexPath(path);
			origMethod.call(this, regexPath, subscriber);
		};
	}, this);
}


_.extend(Model, {
	Path: ModelPath
});

function ModelPath(model, path, it) {
	check(model, Model);
	check(path, String);
	check(it, Match.Optional(Object));

	_.defineProperties(this, {
		_model: model,
		_path: path,
		_it: it
	});

	// compiling getter and setter
	var methods = synthesizePathMethods(path);

	// adding methods to model path
	_.defineProperties(this, methods);

	Object.freeze(this);
}


// adding messaging methods to ModelPath prototype
var modelPathMethodsMap = {};

modelMethodsToWrap.forEach(function(methodName) {
	// creating subscribe/unsubscribe/etc. methods for ModelPath class
	modelPathMethodsMap[methodName] = function(path, subscriber) {
		this._model[methodName](this._path + path, subscriber);
	};
})

_.extendProto(ModelPath, modelPathMethodsMap);


function synthesizePathMethods(path) {
	if (__synthesizedPathsMethods.hasOwnProperty(path))
		return __synthesizedPathsMethods[path];

	var parsedPath = pathUtils.parseAccessPath(path);

	var methods = {
		get: synthesizeMethod(getterSynthesizer, path, parsedPath),
		set: synthesizeMethod(setterSynthesizer, path, parsedPath)
	};

	__synthesizedPathsMethods[path] = methods;

	return methods;
}


function synthesizeMethod(synthesizer, path, parsedPath) {
	var method
		, methodCode = synthesizer({ parsedPath: parsedPath });

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
