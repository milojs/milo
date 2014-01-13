'use strict';

var pathUtils = require('../path_utils')
	, fs = require('fs')
	, doT = require('dot')
	, _ = require('mol-proto');


/**
 * Templates to synthesize model getters and setters
 */
var templates = {
	get: fs.readFileSync(__dirname + '/getter.dot.js'),
	set: fs.readFileSync(__dirname + '/setter.dot.js'),
	del: fs.readFileSync(__dirname + '/delete.dot.js'),
	splice: fs.readFileSync(__dirname + '/splice.dot.js')
};

var include_defines = fs.readFileSync(__dirname + '/defines.dot.js')
	, include_create_tree = fs.readFileSync(__dirname + '/create_tree.dot.js')
	, include_traverse_tree = fs.readFileSync(__dirname + '/traverse_tree.dot.js');

var dotDef = {
	include_defines: include_defines,
	include_create_tree: include_create_tree,
	include_traverse_tree: include_traverse_tree,
	getPathNodeKey: pathUtils.getPathNodeKey,
	modelAccessPrefix: 'this._model._data',
	modelPostMessageCode: 'this._model._internalMessenger.postMessage'
};

var modelDotDef = _(dotDef).clone().extend({
	modelAccessPrefix: 'this._data',
	modelPostMessageCode: 'this._internalMessenger.postMessage',
})._();


var dotSettings = _.clone(doT.templateSettings)
dotSettings.strip = false;

var synthesizers = _.mapKeys(templates, function(tmpl) {
	return doT.template(tmpl, dotSettings, dotDef); 
});

var modelSetSynthesizer = doT.template(templates.set, dotSettings, modelDotDef)
	, modelSpliceSynthesizer = doT.template(templates.splice, dotSettings, modelDotDef);


/**
 * Function that synthesizes accessor methods.
 * Function is memoized so accessors are cached (up to 1000).
 *
 * @param {String} path Model/ModelPath access path
 * @param {Array} parsedPath array of path nodes
 * @return {Object[Function]}
 */
var synthesizePathMethods = _.memoize(_synthesizePathMethods, undefined, 1000);

function _synthesizePathMethods(path, parsedPath) {
	var methods = _.mapKeys(synthesizers, function(synthszr) {
		return _synthesize(synthszr, path, parsedPath)
	});
	return methods;
}


function _synthesize(synthesizer, path, parsedPath) {
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


	// functions used by methods `set`, `delete` and `splice` (synthesized by template)
	function addChangeMessage(messages, messagesHash, msg) {
		messages.push(msg);
		messagesHash[msg.path] = msg;
	}

	function addTreeChangesMessages(messages, messagesHash, rootPath, oldValue, newValue) {
		var oldIsTree = valueIsTree(oldValue)
			, newIsTree = valueIsTree(newValue);

		if (newIsTree)
			addMessages(messages, messagesHash, rootPath, newValue, 'added', 'newValue');
		
		if (oldIsTree)
			addMessages(messages, messagesHash, rootPath, oldValue, 'removed', 'oldValue');
	}

	function addMessages(messages, messagesHash, rootPath, obj, msgType, valueProp) {
		_addMessages(rootPath, obj);


		function _addMessages(rootPath, obj) {
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
				_addMessages(path, value);
		}
	}

	function valueIsTree(value) {
		return typeof value == "object" && Object.keys(value).length;
	}
}


/**
 * Exports `synthesize` function with the following:
 *
 * - .modelSet - `set` method for Model
 * - .modelSplice - `splice` method for Model
 */
module.exports = synthesizePathMethods;

_.extend(synthesizePathMethods, {
	modelSet: _synthesize(modelSetSynthesizer, '', []),
	modelSplice: _synthesize(modelSpliceSynthesizer, '', [])
});
