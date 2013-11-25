'use strict';

var _ = require('mol-proto')
	, assert = require('assert')
	, check = require('../lib/check')
	, Match = check.Match;

describe('check module', function() {
	var notDefined
		, nullVar = null
		, obj = {prop: 'test'}
		, arr = [1, 2, 3]
		, func = function(){}
		, myDate = new Date();

	var toTest = [
		[func, Function, 'function'],
		[myDate, Date, 'constructor'],
		['test', String, 'string'],
		[8.5, Number, 'number'],
		[NaN, Number, 'NaN number'],
		[Infinity, Number, 'Infinity number'],
		[obj, Object, 'object'],
		[false, Boolean, 'boolean'],
		[4, Match.Integer, 'Match.Integet'],
		[notDefined, undefined, 'undefined'],
		[nullVar, null, 'null'],
		[arr, Array, 'Array']
	];

	it('should match.test for different data types', function() {
		toTest.forEach(function(val) {
			assert(Match.test(val[0], val[1]), 'match.test ' + val[2]);
		});
	});

	it('should check test for different data types', function() {
		toTest.forEach(function(val) {
			assert.doesNotThrow(function() {
				check(val[0], val[1]);
			}, 'check ' + val[2]);
		});
	});

	it('should match.test and check using Match.Any pattern', function() {
		toTest.forEach(function(val) {
			assert(Match.test(val[0], Match.Any), 
				'match.test ' + val[2] + ' with Match.Any');
			assert.doesNotThrow(
				function() {check(val[0], Match.Any)}, 
				'check ' + val[2] + ' with Match.Any'
			);
		});
	});

	it('should match.test and check using Match.Optional pattern', function() {
		toTest.forEach(function(val) {
			assert(Match.test(val[0], Match.Optional(val[1])), 
				'match.test ' + val[2] + ' with Match.Optional');
			assert(Match.test(notDefined, Match.Optional(String)), 
				'match.test ' + val[2] + ' with Match.Optional');
			assert.equal(Match.test(34, Match.Optional(String)), false,
				'match.test ' + val[2] + ' with Match.Optional');

			assert.doesNotThrow(
				function() { check(val[0], Match.Optional(val[1])); }, 
				'check ' + val[2] + ' with Match.Optional'
			);
			assert.doesNotThrow(
				function() { check(notDefined, Match.Optional(String)); },
				'check an undefined against a string'
			);
			assert.throws(
				function() { check(34, Match.Optional(String)); },
				'check a number against a string'
			);
		});
	});

	it('should match.test and check using Array [pattern]', function() {
		assert(Match.test(['test1', 'test2', 'test3'], [String]), 
			'match.test array of strings with Array [pattern]');
		assert.doesNotThrow(
			function() { check(['test1', 'test2', 'test3'], [String]); }, 
			'check array of strings with Array [pattern]'
		);
		assert.equal(Match.test(['test1', 'test2', 34], [String]), false,
			'match.test array of strings with Array [pattern] fails');
		assert.throws(
			function() { check(['test1', 'test2', 34], [String]); }, 
			'check array of strings with Array [pattern] throws'
		);
	});

	it.skip('should match.test and check using Match.OneOf', function() {
		assert(Match.test('test', Match.OneOf(null, Number, String)),
			'match string against number of types');
		assert.equal(Match.test([], Match.OneOf(null, Number, String)), false,
			'match string against number of types');
	});

	it('should match.test and check with ObjectHash pattern', function() {
		var objPass = { prop1: function() {}, prop2: function() {} };
		var objFail = { prop1: function() {}, prop2: 'test' };

		assert.doesNotThrow(function() {
			check(objPass, Match.ObjectHash(Function));
		}, 'should NOT throw if all properties of object are Functions');

		assert.throws(function() {
			check(objFail, Match.ObjectHash(Function));
		}, 'should fail if one property is a string');
	});

});
