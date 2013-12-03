'use strict';

var _ = require('mol-proto')
	, check = require('../util/check')
	, Match = check.Match
	, ScopeError = require('../util/error').Scope;


// Scope class
function Scope(parent) {
	check(parent, Match.Optional(Scope));

	Object.defineProperties(this, {
		_parent: { value: parent }
	})
};

_.extendProto(Scope, {
	_add: _addToScope,
	_copy: _copyFromScope,
	_each: _each,
	_uniqueName: _uniqueName,
	_length: _getScopeLength,
});

module.exports = Scope;


var allowedNamePattern = /^[A-Za-z][A-Za-z0-9\_\$]*$/;

function _addToScope(object, name) {
	if (this[name])
		throw new ScopeError('duplicate object name: ' + name);

	checkName(name);

	this[name] = object;
}


function _copyFromScope(aScope) {
	check(aScope, Scope);

	aScope._each(_addToScope, this);
}


function _each(callback, thisArg) {
	_.eachKey(this, callback, thisArg || this, true); // enumerates enumerable properties only
}


function checkName(name) {
	if (! allowedNamePattern.test(name))
		throw new ScopeError('name should start from letter, this name is not allowed: ' + name);
}


function _uniqueName(prefix) {
	var prefixes = uniqueName.prefixes || (uniqueName.prefixes = {})
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


function _getScopeLength() {
	return Object.keys(this).length;
}
