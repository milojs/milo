// <a name="scope"></a>
// scope class
// -----------

'use strict';

var _ = require('mol-proto')
	, check = require('../util/check')
	, Match = check.Match
	, ScopeError = require('../util/error').Scope
	, logger = require('../util/logger');


// Scope class
function Scope(rootEl, hostObject) {
	_.defineProperties(this, {
		_rootEl: rootEl,
		_hostObject: hostObject
	}, _.WRIT); // writable
};

_.extendProto(Scope, {
	_add: _add,
	_copy: _copy,
	_each: _each,
	_addNew: _addNew,
	_merge: _merge,
	_length: _length,
	_any: _any,
	_remove: _remove,
	_clean: _clean
});

module.exports = Scope;


var allowedNamePattern = /^[A-Za-z][A-Za-z0-9\_\$]*$/;


// adds object to scope throwing if name is not unique
function _add(object, name) {
	if (typeof name === 'string') {
		object.name = name;
	}
	
	if (this[object.name])
		throw new ScopeError('duplicate object name: ' + name);

	checkName(object.name);

	this[object.name] = object;
}


// copies all objects from one scope to another,
// throwing if some object is not unique
function _copy(aScope) {
	check(aScope, Scope);

	aScope._each(_add, this);
}


function _addNew(object, name) {
// TODO
}


function _merge(scope) {
	scope._each(_add.bind(this));
}


function _each(callback, thisArg) {
	_.eachKey(this, callback, thisArg || this, true); // enumerates enumerable properties only
}

function _filter(callback, thisArg) {
	return _.filter(this, callback, thisArg || this, true);
}

function checkName(name) {
	if (! allowedNamePattern.test(name))
		throw new ScopeError('name should start from letter, this name is not allowed: ' + name);
}


// returns the number of objects in scope
function _length() {
	return Object.keys(this).length;
}

function _any() {
	var key = Object.keys(this)[0];
    return key && this[key];
}

function _remove(name) {
	if (! name in this)
		logger.warn('removing object that is not in scope');

	delete this[name];
}

function _clean() {
	this._each(function(object, name) {
		delete this[name];
	}, this);
}
