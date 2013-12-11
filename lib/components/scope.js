'use strict';

var _ = require('mol-proto')
	, check = require('../util/check')
	, Match = check.Match
	, ScopeError = require('../util/error').Scope;


// Scope class
function Scope(rootEl) {
	Object.defineProperties(this, {
		_rootEl: { value: rootEl }
	})
};

_.extendProto(Scope, {
	_add: _add,
	_copy: _copy,
	_each: _each,
	_addNew: _addNew,
	_merge: _merge,
	_uniqueName: _uniqueName,
	_length: _length
});

module.exports = Scope;


var allowedNamePattern = /^[A-Za-z][A-Za-z0-9\_\$]*$/;


// adds object to scope throwing if name is notyunique
function _add(object, name) {
	if (this[name])
		throw new ScopeError('duplicate object name: ' + name);

	checkName(name);

	this[name] = object;
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
// TODO
}


function _each(callback, thisArg) {
	_.eachKey(this, callback, thisArg || this, true); // enumerates enumerable properties only
}


function checkName(name) {
	if (! allowedNamePattern.test(name))
		throw new ScopeError('name should start from letter, this name is not allowed: ' + name);
}


var prefixPattern = /^([^_]*)_/;
function _uniqueName(prefix) {
	var prefixes = _uniqueName.prefixes || (_uniqueName.prefixes = {})
		, prefixStr = prefix + '_';
	
	if (prefixes[prefix])
		return prefixStr + prefixes[prefix]++;

	var uniqueNum = 0
		, prefixLen = prefixStr.length;

	_.eachKey(this, function(obj, name) {
		if (name.indexOf(prefixStr) == -1) return;
		var num = name.slice(prefixLen);
		if (num == uniqueNum) uniqueNum++ ;
	});
}


// returns the number of objects in scope
function _length() {
	return Object.keys(this).length;
}
