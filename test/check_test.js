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
});
