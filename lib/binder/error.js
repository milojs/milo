'use strict';

var _ = require('mol-proto');

function BindError(msg) {
	this.message = msg;
}

_.makeSubclass(BindError, Error);

module.exports = BindError;
