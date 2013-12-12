'use strict';

var Messenger = require('../messenger')
	, ModelMessageSource = require('./m_message_source')
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

	// var messageSource = new ModelMessageSource(model);
	var messenger = new Messenger(model, Messenger.defaultMethods); //, messageSource);

	_.defineProperties(model, {
		scope: scope,
		name: name,
		_schema: schema,
		_data: data || {},
		_messenger: messenger,
		// _messageSource: messageSource,
		__pathsCache: {}
	});

	return model;
}

Model.prototype.__proto__ = Model.__proto__;

_.extendProto(Model, {
	value: value,
	proxyMessenger: proxyMessenger
});


function value() {
	return this._data;
}


function proxyMessenger(modelHostObject) {
	Mixin.prototype._createProxyMethods.call(this._messenger, Messenger.defaultMethods, modelHostObject);
}


Model.Path = ModelPath;

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
_.extendProto(ModelPath, {
	on: registerModelPathSubscriber,
	// off: offModelPath,
});

var subscriptionDepthPattern = /^\*{0,4}$/;
function registerModelPathSubscriber(depth, subscriber) {
	if (! subscriptionDepthPattern.test(depth))
		throw new ModelError('incorrect subscription depth: ' + depth);

	this._model.on(this._path, subscriber);
}


// cache of compiled ModelPath methods
var __synthesizedPathsMethods = {};


function synthesizePathMethods(path) {
	if (__synthesizedPathsMethods.hasOwnProperty(path))
		return __synthesizedPathsMethods[path];

	var parsedPath = parseModelPath(path);

	var methods = {
		value: synthesizeMethod(getterSynthesizer, path, parsedPath),
		setValue: synthesizeMethod(setterSynthesizer, path, parsedPath)
	};

	__synthesizedPathsMethods[path] = methods;

	return methods;
}


// TODO parse array syntax for paths
var pathParsePattern = /\.[A-Za-z][A-Za-z0-9_]*|\[[0-9]+\]/g
	, modelPostMessageCode = 'this._model.postMessage('
	, modelAccessPrefix = 'this._model._data';

function parseModelPath(path) {
	var parsedPath = [];
	var unparsed = path.replace(pathParsePattern, function(nodeStr) {
		parsedPath.push({
			property: nodeStr,
			empty: nodeStr[0] == '.' ? '{}' : '[]'
		});
		return '';
	});
	if (unparsed)
		throw new ModelError('incorrect model path: ' + path);

	return parsedPath;
}


var dotDef = {
	modelAccessPrefix: 'this._model._data',
	modelPostMessageCode: 'this._model.postMessage'
};

var getterTemplate = fs.readFileSync(__dirname + '/getter_template.js')
	, setterTemplate = fs.readFileSync(__dirname + '/setter_template.js');

doT.templateSettings.strip = false;

var getterSynthesizer = doT.compile(getterTemplate, dotDef)
	, setterSynthesizer = doT.compile(setterTemplate, dotDef);


function synthesizeMethod(synthesizer, path, parsedPath) {
	var method
		, methodCode = synthesizer({ parsedPath: parsedPath });

	try {
		eval(methodCode);
	} catch (e) {
		throw ModelError('ModelPath method compilation error; path: ' + path + ', code: ' + methodCode);
	}

	return method;
}
