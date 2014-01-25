'use strict';

var Promise = require('../../lib/util/promise')
	, assert = require('assert');


describe('Promise', function(){
	it('should call data callbacks immediately if promise has data or error', function() {
		var p = new Promise;
		p.setData(null, { test: 1 });

		p
		.then(function(error, data) {
			assert.equal(error, null);
			assert.deepEqual(data, { test: 1 });
		})
		.error(function(error, data) {
			throw new Error('should not be executed');
		});


		var p = new Promise;
		p.setData(404, { test: 2 });

		p
		.then(function(error, data) {
			throw new Error('should not be executed');
		})
		.error(function(error, data) {
			assert.equal(error, 404);
			assert.deepEqual(data, { test: 2 });
		});
	});

	it('should call data callbacks when data arrives', function(done) {
		var p1 = new Promise;

		var test1aPassed, test1bPassed, test2aPassed, test2bPassed;

		p1
		.then(function(error, data) {
			assert.equal(error, null);
			assert.deepEqual(data, { test: 3 });
			test1aPassed = true;
		})
		.then(function(error, data) {
			assert.equal(error, null);
			assert.deepEqual(data, { test: 3 });
			test1bPassed = true;
		})
		.error(function(error, data) {
			throw new Error('should not be executed');
		});


		var p2 = new Promise;

		p2
		.then(function(error, data) {
			throw new Error('should not be executed');
		})
		.error(function(error, data) {
			assert.equal(error, 404);
			assert.deepEqual(data, { test: 4 });
			test2aPassed = true;
		})
		.error(function(error, data) {
			assert.equal(error, 404);
			assert.deepEqual(data, { test: 4 });
			test2bPassed = true;
		});

		setTimeout(function() {
			p1.setData(null, { test: 3 });
			p2.setData(404, { test: 4 });
		}, 0);

		setTimeout(function() {
			if (test1aPassed && test1bPassed && test2aPassed && test2bPassed)
				done();
			else
				throw new Error('some test failed');
		}, 10);
	});

	it('should define "tranform" method that creates a new promise with transformed data', function(done) {
		var p = new Promise
			, transformedPromise = p.transform(transfromData);

		function transfromData(data) {
			var data2 = {};
			for (var prop in data)
				data2[prop] = data[prop] * 10;
			return data2;
		}

		var testPassed;

		transformedPromise.then(function(error, data) {
			assert.equal(error, null);
			assert.deepEqual(data, { a: 10, b: 20 });
			done();
		});

		setTimeout(function() {
			p.setData(null, { a: 1, b: 2 })
		}, 0);
	});
});
