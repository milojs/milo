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

	// var messageSource = new ModelMessageSource(model);
	var messenger = new Messenger(model, Messenger.defaultMethods); //, messageSource);

	_.defineProperties(model, {
		_schema: schema,
		_data: data || {},
		_messenger: messenger,
		// _messageSource: messageSource,
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
	check(messages, Match.OneOf(String, [String])); // RegExp is not allowed for ModelPath

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


function compileModelGetter(path, parsedPath) {
	var getter 
		, getterCode = 'getter = function value() {\n var m = ' + modelAccessPrefix + ';\n return '
		, modelDataProperty = 'm';

	for (var i = 0, count = parsedPath.length - 1; i < count; i++) {
		modelDataProperty += parsedPath[i].property;
		getterCode += modelDataProperty + ' && ';
	}

	getterCode += modelDataProperty + parsedPath[count].property + ';\n };';

	try {
		eval(getterCode);
	} catch (e) {
		throw ModelError('ModelPath getter compilation error; path: ' + path + ', code: ' + getterCode);
	}

	return getter;
}


function compileModelSetter(path, parsedPath) {
	var setter
		, setterCode = 'setter = function setValue(value) {\n var m = ' + modelAccessPrefix + ';\n '
		, modelDataProperty = '';

	for (var i = 0, count = parsedPath.length - 1; i < count; i++) {
		modelDataProperty += parsedPath[i].property						
		var emptyProp = parsedPath[i + 1].empty
									// if property does not exist
			, createPropertyCode = 'if (! m' + modelDataProperty + ') {\n  '
									// assign empty object or array to it
									+ 'm' + modelDataProperty + ' = ' + emptyProp + ';\n  '
									// postMessage 'added' on model for property path path
									+ modelPostMessageCode 
										+ '"' + modelDataProperty + '", { type: "added", newValue: ' + emptyProp + ' });\n }\n '
		
		setterCode += createPropertyCode;
	}

	var lastProperty = parsedPath[count].property;
	// check if property does not exists
	setterCode += 'if (! m' + modelDataProperty + '.hasOwnProperty("' + lastProperty.slice(1) + '"))\n  ';

	modelDataProperty += lastProperty;
	// post message after it was added
	setterCode += modelPostMessageCode + '"' + modelDataProperty + '", { type: "added", newValue: value });\n '
	// else check if the value has changed ...
				+ 'else {\n  var old = m' + modelDataProperty
				+ ';\n  if (old != value)\n   '
	// ... and post message if it did
				+ modelPostMessageCode + '"' + modelDataProperty + '", { type: "changed", oldValue: old, newValue: value});\n }\n '

	// set property to new value
	setterCode += 'm' + modelDataProperty + ' = value;\n};';

	try {
		eval(setterCode);
	} catch (e) {
		throw ModelError('ModelPath setter compilation error; path: ' + path + ', code: ' + setterCode);
	}

	return setter;
}
