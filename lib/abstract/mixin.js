'use strict';

var _ = require('mol-proto')
	, check = require('../util/check')
	, Match = check.Match
	, MixinError = require('../util/error').Mixin;


module.exports = Mixin;

/**
 * An abstract Mixin class.
 *
 * We also use mixin pattern, but Mixin in milo is implemented as a separate object
 * that is stored on the property of the host object and can create proxy methods on
 * the host object if required. Classes [`Messenger`](../messenger/index.js.html), MessageSource and DataSource are
 * subclasses of Mixin abstract class. `this` in proxy methods refers to Mixin instance.
 *
 * @param {Object} hostObject an object where a Mixin instance will be stored on. It is used to proxy methods and also to find the reference when it is needed for host object implementation
 * @param {Object} proxyMethods a map of proxy method names as keys and Mixin methods names as values, so proxied methods can be renamed to avoid name-space conflicts if two different Mixin instances with the same method names are put on the object
 * @param {List} arguments all constructor arguments will be passed to init method of Mixin subclass together with hostObject and proxyMethods
 * @return {Mixin} when used with new, the instance of Mixin class
 */


function Mixin(hostObject, proxyMethods) { // , other args - passed to init method

	// TODO - moce checks from Messenger here
	check(hostObject, Match.Optional(Match.OneOf(Object, Function)));
	check(proxyMethods, Match.Optional(Match.ObjectHash(String)));

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


/**
 * _createProxyMethod
 * Creates a proxied method of Mixin subclass on host object
 * @param {String} mixinMethodName name of Mixin subclass
 * @param {String} proxyMethodName name of created proxy method on host object
 * @param {Object} hostObject an optional reference to the host object; if not specified the host object passed to constructor wil be used. It allows to use the same instance of Mixin on two host objects.
 */
function _createProxyMethod(mixinMethodName, proxyMethodName, hostObject) {
	hostObject = hostObject || this._hostObject;

	if (hostObject[proxyMethodName])
		throw new MixinError('method ' + proxyMethodName +
								 ' already defined in host object');

	check(this[mixinMethodName], Function);

	// Bind proxied messenger's method to messenger
	var boundMethod = this[mixinMethodName].bind(this);

	Object.defineProperty(hostObject, proxyMethodName,
		{ value: boundMethod, writable: true });
}


function _createProxyMethods(proxyMethods, hostObject) {
	// creating and binding proxy methods on the host object
	_.eachKey(proxyMethods, function(mixinMethodName, proxyMethodName) {
		this._createProxyMethod(mixinMethodName, proxyMethodName, hostObject);
	}, this);
}
