'use strict';

var _ = require('mol-proto');


module.exports = {
	Messenger: MessengerError,
	Mixin: MixinError
};

function MessengerError(message) {
	this.name = 'MessengerError';
	this.message = message || 'There was an error';
}
_.makeSubclass(MessengerError, Error);

function MixinError(message) {
	this.name = 'MixinError';
	this.message = message || 'There was an error';
}
_.makeSubclass(MixinError, Error);
