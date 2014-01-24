'use strict';

var _ = require('mol-proto');

module.exports = Promise;


/**
 * Promise object to manage delayed data delivery
 *
 * @return {Promise}
 */
function Promise() {
	this.data = undefined;
	this.dataError = undefined
	this._onQueue = [];
	this._errorQueue = [];
}


_.extendProto(Promise, {
	on: Promise$on,
	then: Promise$on,
	error: Promise$error,
	setData: Promise$setData
});


/**
 * Promise instance method
 * Calls callback when data arrives if there is no error (or immediately if data had arrived before)
 *
 * @param {Function} callback
 */
function Promise$on(callback) {
	if (! this.dataError) {
		if (this.data)
			callback(null, this.data);
		else
			this._onQueue.push(callback);
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
		callback(this.dataError, this.data);
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

	var queue = error ? this._errorQueue : this._onQueue;

	queue.forEach(function(callback) {
		callback(error, data);
	});

	queue.length = 0;
}
