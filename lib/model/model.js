'use strict';

var Messenger = require('../messenger')
	, ObjectObserveSource = require('./object_observe_source')
	, _ = require('mol-proto')
	, check = require('../check')
	, Match = check.Match;

function Model(schema) {
	check(schema, Match.OneOf(Object, Array, undefined));

	schema = schema || {};
	Object.defineProperty(this, '_schema', { value: schema });

	this.init.apply(this, arguments);
}

_.extendProto(Model, {
	init: initModelValue,
	value: getModelValue,
	setValue: setModelValue,
});


module.exports = Model;


function initModelValue() {

}

function getModelValue(modelPath, evalContext) {

}

function setModelValue(modelPath, value, evalContext) {

}

function _findModelPath(modelPath) {
	var modelPathArray = this _parseModelPath(modelPath)
		, pointer = this.data;

	modelPathArray.forEach(function(propertyName) {
		if (pointer && pointer.hasOwnProperty(propertyName)) {
			nextPointer = pointer[propertyName];
			if (nextPointer) 
		}
	});

	return {
		object: Reference,
		property: propertyName
	}
}
