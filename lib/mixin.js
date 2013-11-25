'use strict';

var _ = require('mol-proto')
	, check = require('./check')
	, Match = check.Match;


module.exports = Mixin;

// an abstract class for mixin pattern - adding proxy methods to host objects
function Mixin(hostObject, proxyMethods) {
	// TODO - moce checks from Messenger here
	check(proxyMethods, Match.ObjectHash(String));

	Object.defineProperty(this, '_hostObject', { value: hostObject });
	if (proxyMethods)
		this._createProxyMethods(proxyMethods);

	// calling init if it is defined in the class
	if (this.init)
		this.init.apply(this, arguments);
}

_.extendProto(Mixin, {
	_createProxyMethod: _createProxyMethod,
	_createProxyMethods: _createProxyMethods
});


function _createProxyMethod(mixinMethodName, proxyMethodName) {
	if (this._hostObject[proxyMethodName])
		throw new MessengerError('method ' + proxyMethodName +
								 ' already defined in host object');

	Object.defineProperty(this._hostObject, proxyMethodName,
		{ value: this[mixinMethodName].bind(this) });
}


function _createProxyMethods(proxyMethods) {
	// creating and binding proxy methods on the host object
	_.eachKey(proxyMethods, _createProxyMethod, this);
}
