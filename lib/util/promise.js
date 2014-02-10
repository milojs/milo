'use strict';

var _ = require('mol-proto');

module.exports = Promise;


/**
 * Simple Promise object to manage asynchronous data delivery
 * Can't be chained like Q promises (here, [then](#Promise$then) and [error](#Promise$error) always simply return original promise), but can be transformed to another promise using [transform](Promise$transform) method with data transformation function.
 * Another differences with Q:
 *
 * - `then` accepts only success callback
 * - all callbacks are passed three parameters: error, data and dataSource (argument passed to Promise constructor)
 *
 * @return {Promise}
 */
function Promise(dataSource) {
	this.data = undefined;
	this.dataError = undefined;
	this.dataSource = dataSource;
	this._thenQueue = [];
	this._errorQueue = [];
}


/**
 * Promise class methods
 * 
 * - [processData](#processData)
 */
_.extend(Promise, {
	transformData: Promise$$transformData,
	thenData: Promise$$thenData
});


/**
 * Promise instance methods
 * 
 * - [then](#Promise$then) - register callback to be called when promise data is set
 * - [error](#Promise$error) - register callback to be called when promise dataError is set
 * - [setData](#Promise$setData) - set data and dataError of the promise
 * - [transform](#Promise$transform) - create a new promise with data transformation
 */
_.extendProto(Promise, {
	then: Promise$then,
	error: Promise$error,
	setData: Promise$setData,
	transform: Promise$transform
});


/**
 * Passes data to function; if promise does it when promise gets resolved
 * Returns transformed promise if promise was passed, processed data otherwise
 * 
 * @param {Promise|Any} data data to be passed
 * @param {Function} transformFunc
 * @return {Promise|Any}
 */
function Promise$$transformData(data, transformFunc) {
	if (data instanceof Promise)
		return data.transform(transformFunc);
	else
		return transformFunc(data);
}


/**
 * If promise is passed, resolves it, simply calls funciton with data otherwise
 * 
 * @param {Promise|Any} data data to be passed
 * @param {Function} thenFunc
 * @return {Promise|Any}
 */
function Promise$$thenData(data, thenFunc) {
	if (data instanceof Promise)
		return data.then(thenFunc);
	else
		return thenFunc(null, data);
}


/**
 * Promise instance method
 * Calls callback when data arrives if there is no error (or on next tick if data had arrived before)
 *
 * @param {Function} callback
 */
function Promise$then(callback) {
	if (! this.dataError) {
		if (this.data)
			_.defer(callback, null, this.data, this.dataSource);
		else
			this._thenQueue.push(callback);
	}

	return this;
}


/**
 * Promise instance method
 * Calls callback if there is data error (or on next tick if error had happened before)
 *
 * @param {Function} callback
 */
function Promise$error(callback) {
	if (this.dataError)
		_.defer(callback, this.dataError, this.data, this.dataSource);
	else if (! this.data)
		this._errorQueue.push(callback);

	return this;
}


/**
 * Sets promise data and error and iterates registered callbacks queues
 *
 * @param {Any} error data error
 * @param {Any} data data
 */
function Promise$setData(error, data) {
	this.dataError = error;
	this.data = data;

	var queue = error ? this._errorQueue : this._thenQueue;

	var self = this;
	_.defer(function() {
		queue.forEach(function(callback) {
			callback(error, data, self.request);
		});
		self._errorQueue.length = 0;
		self._thenQueue.length = 0;
	});
}


/**
 * Returns another promise that would call its callbacks with transformed data
 *
 * @param {Function} transformDataFunc data transformation function
 * @return {Promise}
 */
function Promise$transform(transformDataFunc) {
	var promise = new Promise(this);
	this
	.then(function(error, data) {
		try {
			var transformedData = transformDataFunc(data);
			promise.setData(error, transformedData);
		} catch (e) {
			promise.setData(e);
		}
	})
	.error(function(error, data) {
		promise.setData(error, data);
	});
	return promise;
}
