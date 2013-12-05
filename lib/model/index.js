'use strict';

var Messenger = require('../messenger')
	, ModelMessageSource = require('./m_message_source')
	, ModelError = require('../util/error').Model
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

	var messageSource = new ModelMessageSource(model);
	var messenger = new Messenger(this, Messenger.defaultMethods, messageSource);

	_.defineProperties(model, {
		_schema: schema,
		_data: data || {},
		_messenger: messenger,
		_messageSource: messageSource,
		__pathsCache: {}
	});

	return model;
}

Model.prototype.__proto__ = Model.__proto__;

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
	var methods = compilePathMethods(path);

	// adding methods to model path
	_.defineProperties(this, methods);

	Object.freeze(this);
}


// adding messaging methods to ModelPath prototype
_.extendProto(ModelPath, {
	on: registerModelPathSubscriber,
	// off: offModelPath,
});

function registerModelPathSubscriber(messages, subscriber) {
	check(messages, Match.OneOf(String, [String])); // RegExp is not allowed

	if (typeof messages == 'string')
		messages = messages.split(Messenger.messagesSplitRegExp);

	if (Array.isArray(messages))
		messages.forEach(function(msg, i) {
			messages[i] = this._path + ':' + msg;
		}, this);

	this._model.on(messages, subscriber);
}


// cache of compiled ModelPath methods
var __compiledPathsMethods = {};


function compilePathMethods(path) {
	if (__compiledPathsMethods.hasOwnProperty(path))
		return __compiledPathsMethods[path];

	var parsedPath = parseModelPath(path);

	var methods = {
		value: compileModelGetter(path, parsedPath),
		setValue: compileModelSetter(path, parsedPath)
	};

	__compiledPathsMethods[path] = methods;

	return methods;
}


// TODO parse array syntax for paths
var pathParsePattern = /\.[^\.]+/g
	, modelAccessPrefix = 'this._model._data';

function parseModelPath(path) {
	var parsedPath = [];
	var unparsed = path.replace(pathParsePattern, function(nodeStr) {
		parsedPath.push({ str: nodeStr });
		return '';
	});
	if (unparsed)
		throw new ModelError('incorrect model path: ' + path);

	return parsedPath;
}


function compileModelGetter(path, parsedPath) {
	var getter 
		, getterCode = 'getter = function value() {\n var m = ' + modelAccessPrefix + ';\n return '
		, modelDataProperty = 'm';

	for (var i = 0, count = parsedPath.length - 1; i < count; i++) {
		modelDataProperty += parsedPath[i].str;
		getterCode += modelDataProperty + ' && ';
	}

	getterCode += modelDataProperty + parsedPath[count].str + ';\n };';

	try {
		eval(getterCode);
	} catch (e) {
		throw ModelError('ModelPath getter compilation error; path: ' + path + ', code: ' + getterCode);
	}

	return getter;
}


function compileModelSetter(path, parsedPath) {
	var setter
		, setterCode = 'setter = function setValue(value) {\n var m = ' + modelAccessPrefix + ';\n'
		, modelDataProperty = 'm' + parsedPath[0].str;

	for (var i = 1, len = parsedPath.length; i < len; i++) {
		var createPropertyCode = ' if (! ' + modelDataProperty + ') ' + modelDataProperty + ' = {};\n';
		setterCode += createPropertyCode;
		modelDataProperty += parsedPath[i].str;
	}

	setterCode += modelDataProperty + ' = value;\n };';

	try {
		eval(setterCode);
	} catch (e) {
		throw ModelError('ModelPath setter compilation error; path: ' + path + ', code: ' + setterCode);
	}

	return setter;
}
