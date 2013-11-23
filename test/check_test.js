'use strict';

var _ = require('proto')
	, assert = require('assert')
	, check = require('../lib/check')
	, Match = check.Match;

describe('check module', function() {
	it('should have ObjectHash pattern', function() {
		var objPass = { prop1: function() {}, prop2: function() {} };
		var objFail = { prop1: function() {}, prop2: 'test' };

		assert.doesNotThrow(function() {
			check(objPass, Match.ObjectHash(Function));
		}, 'should NOT throw if all properties of object are Functions');

		assert.throws(function() {
			check(objFail, Match.ObjectHash(Function));
		}, 'should fail if one property is a string');
	});

	var notDefined
		, nullVar = null
		, obj = {prop: 'test'}
		, arr = [1, 2, 3]
		, func = function(){};

	var toTest = [
		[func, Function, 'function'],
		['test', String, 'string'],
		[8, Number, 'number'],
		[obj, Object, 'object'],
		[false, Boolean, 'boolean'],
		[notDefined, undefined, 'undefined'],
		[nullVar, null, 'null'],
		[arr, Array, 'Array']
	];

	it('should match.test for primitives and other native data types', function() {
		for (var i = 0; i < toTest.length; i++) {
			assert(Match.test(toTest[i][0], toTest[i][1]), 'match.test ' + toTest[i][2]);
			assert(Match.test(toTest[i][0], Match.Any), 'match.test ' + toTest[i][2] + 'with Match.Any');
		}
	});

	it('should throw errors or not on check test against primitives and other native data types', function() {
		for (var i = 0; i < toTest.length; i++) {
			assert.doesNotThrow(function() {
				check(toTest[i][0], toTest[i][1]);
			}, 'check ' + toTest[i][2]);
		}
	});

});
