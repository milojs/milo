'use strict';

var Promise = require('../../lib/util/promise')
	, assert = require('assert');


describe('Promise', function(){
	it('should call data callbacks immediately if promise has data or error', function() {
		var p = new Promise;
		p.setData(null, { test: 1 });

		p.on(function(error, data) {
			assert.equal(error, null);
			assert.deepEqual(data, { test: 1 });
		});

		p.error(function(error, data) {
			throw new Error('should not be executed');
		});


		var p = new Promise;
		p.setData(404, { test: 2 });

		p.on(function(error, data) {
			throw new Error('should not be executed');
		});

		p.error(function(error, data) {
			assert.equal(error, 404);
			assert.deepEqual(data, { test: 2 });
		});
	});

	it('should call data callbacks when data arrives', function(done) {
		var p1 = new Promise;

		var test1aPassed, test1bPassed, test2aPassed, test2bPassed;

		p1.on(function(error, data) {
			assert.equal(error, null);
			assert.deepEqual(data, { test: 3 });
			test1aPassed = true;
		});

		p1.on(function(error, data) {
			assert.equal(error, null);
			assert.deepEqual(data, { test: 3 });
			test1bPassed = true;
		});

		p1.error(function(error, data) {
			throw new Error('should not be executed');
		});


		var p2 = new Promise;

		p2.on(function(error, data) {
			throw new Error('should not be executed');
		});

		p2.error(function(error, data) {
			assert.equal(error, 404);
			assert.deepEqual(data, { test: 4 });
			test2aPassed = true;
		});

		p2.error(function(error, data) {
			assert.equal(error, 404);
			assert.deepEqual(data, { test: 4 });
			test2bPassed = true;
		});

		setTimeout(function() {
			p1.setData(null, { test: 3 });
			p2.setData(404, { test: 4 });
		}, 1);

		setTimeout(function() {
			if (test1aPassed && test1bPassed && test2aPassed && test2bPassed)
				done();
			else
				throw new Error('some test failed');
		}, 50);
	});
});
