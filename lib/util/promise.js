'use strict';

var _ = require('mol-proto');

module.exports = Promise;


/**
 * Promise object to manage delayed data delivery
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


_.extendProto(Promise, {
	then: Promise$then,
	error: Promise$error,
	setData: Promise$setData,
	transform: Promise$transform
});


/**
 * Promise instance method
 * Calls callback when data arrives if there is no error (or immediately if data had arrived before)
 *
 * @param {Function} callback
 */
function Promise$then(callback) {
	if (! this.dataError) {
		if (this.data)
			callback(null, this.data, this.request);
		else
			this._thenQueue.push(callback);
	}
}


/**
 * Promise instance method
 * Calls callback if there is data error (or immediately if error had happened before)
 *
 * @param {Function} callback
 */
function Promise$error(callback) {
	if (this.dataError)
		callback(this.dataError, this.data, this.request);
	else if (! this.data)
		this._errorQueue.push(callback);
}


/**
 * Sets promise data and error and iterates registered callbacks queues
 *
 * @param {Any} error data error
 * @param {Any} data data
 */
function Promise$setData(error, data) {
	this.data = data;
	this.dataError = error;

	var queue = error ? this._errorQueue : this._thenQueue;

	queue.forEach(function(callback) {
		callback(error, data, this.request);
	}, this);

	queue.length = 0;
}


/**
 * Returns another promise that would call its callbacks with transformed data
 *
 * @param {Function} transformDataFunc data transformation function
 * @return {Promise}
 */
function Promise$transform(transformDataFunc) {
	var promise = new Promise(this);
	this.then(function(error, data) {
		try {
			var transformedData = transformDataFunc(data);
			promise.setData(error, transformedData);
		} catch (e) {
			promise.setData(e, transformedData);
		}
	});
	return promise;
}
