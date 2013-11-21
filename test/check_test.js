'use strict';

var _ = require('proto')
	, assert = require('assert')
	, check = require('../lib/check')
	, Match = check.Match;

describe('Check class', function() {
	it('should match ObjectHash values', function() {
		var objPass = { prop1: function() {}, prop2: function() {} };
		var objFail = { prop1: function() {}, prop2: 'test' };

		assert.doesNotThrow(function() {
			check(objPass, Match.ObjectHash(Function));
		}, 'should NOT throw if same all properties of object are Functions');

		assert.throws(function() {
			check(objFail, Match.ObjectHash(Function));
		}, 'should fail as one property is a string');
	});
});
