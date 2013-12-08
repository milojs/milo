'use strict';

var Messenger = require('../messenger')
	, ModelMessageSource = require('./m_message_source')
	, ModelError = require('../util/error').Model
	, Mixin = require('../abstract/mixin')
	, dot = require('dot')
	, _ = require('mol-proto')
	, check = require('../util/check')
	, Match = check.Match;

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
	proxyMessenger: proxyMessenger
});


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
		value: synthesizeGetter(path, parsedPath),
		setValue: synthesizeSetter(path, parsedPath)
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

var getterTemplate = 'method = function value() { \
	var m = {{# def.modelAccessPrefix }}; \
	{{ var modelDataProperty = "m"; }} \
	return {{ \
		for (var i = 0, count = it.parsedPath.length - 1; i < count; i++) { \
			modelDataProperty += it.parsedPath[i].property; \
	}} {{= modelDataProperty }} && {{ \
		} \
	}} {{= modelDataProperty }}{{= it.parsedPath[count].property }} ; \
}';

var setterTemplate = 'method = function setValue(value) { \
	var m = {{# def.modelAccessPrefix }}; \
	{{  var modelDataProperty = ""; \
		for (var i = 0, count = it.parsedPath.length - 1; i < count; i++) { \
			modelDataProperty += it.parsedPath[i].property; \
			var emptyProp = it.parsedPath[i + 1].empty; \
	}} \
			if (! m{{= modelDataProperty }}) { \
				m{{= modelDataProperty }} = {{= emptyProp }}; \
				{{# def.modelPostMessageCode }}( "{{= modelDataProperty }}", \
					{ type: "added", newValue: {{= emptyProp }} } ); \
			} \n\
	{{  } \
		var lastProp = it.parsedPath[count].property; \
	}} \
	var wasDef = m{{= modelDataProperty }}.hasOwnProperty("{{= lastProp.slice(1) }}"); \
	{{ modelDataProperty += lastProp; }} \
	var old = m{{= modelDataProperty }}; \
	m{{= modelDataProperty }} = value; \n\
	if (! wasDef) \
		{{# def.modelPostMessageCode }}( "{{= modelDataProperty }}", \
			{ type: "added", newValue: value } ); \n\
	else if (old != value) \
		{{# def.modelPostMessageCode }}( "{{= modelDataProperty }}", \
			{ type: "changed", oldValue: old, newValue: value} ); \
}';

var getterSynthesizer = dot.compile(getterTemplate, dotDef)
	, setterSynthesizer = dot.compile(setterTemplate, dotDef);

function synthesizeGetter(path, parsedPath) {
	return synthesizeMethod(getterSynthesizer, path, parsedPath);
}

function synthesizeSetter(path, parsedPath) {
	return synthesizeMethod(setterSynthesizer, path, parsedPath);
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
}
