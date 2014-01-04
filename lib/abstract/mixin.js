'use strict';

var _ = require('mol-proto')
	, check = require('../util/check')
	, Match = check.Match
	, MixinError = require('../util/error').Mixin;


module.exports = Mixin;

/**
 * `milo.classes.Mixin` - an abstract Mixin class.
 * Can be subclassed using:
 * ```
 * var MyMixin = _.createSubclass(milo.classes.Mixin, 'MyMixin');
 * ```
 *
 * Mixin pattern is also used, but Mixin in milo is implemented as a separate object that is stored on the property of the host object and can create proxy methods on the host object if required.
 * Classes [Messenger](../messenger/index.js.html) and [MessageSource](../messenger/message_source.js.html) are subclasses of Mixin abstract class. `this` in proxy methods refers to Mixin instance, the reference to the host object is `this._hostObject`.
 *
 * @param {Object} hostObject Optional object where a Mixin instance will be stored on. It is used to proxy methods and also to find the reference when it is needed for host object implementation.
 * @param {Object} proxyMethods Optional map of proxy method names as keys and Mixin methods names as values, so proxied methods can be renamed to avoid name-space conflicts if two different Mixin instances with the same method names are put on the object
 * @param {List} arguments all constructor arguments will be passed to init method of Mixin subclass together with hostObject and proxyMethods
 * @return {Mixin}
 */
function Mixin(hostObject, proxyMethods) { // , other args - passed to init method
	check(hostObject, Match.Optional(Match.OneOf(Object, Function)));

	// store hostObject
	_.defineProperty(this, '_hostObject', hostObject);

	// proxy methods to hostObject
	if (proxyMethods)
		this._createProxyMethods(proxyMethods);

	// calling init if it is defined in the class
	if (this.init)
		this.init.apply(this, arguments);
}


/**
 * ####Mixin instance methods####
 * These methods are called by constructor, they are not to be called from subclasses.
 *
 * - [_createProxyMethod](#_createProxyMethod)
 * - [_createProxyMethods](#_createProxyMethods)
 */
_.extendProto(Mixin, {
	_createProxyMethod: _createProxyMethod,
	_createProxyMethods: _createProxyMethods
});


/**
 * Creates a proxied method of Mixin subclass on host object.
 *
 * @param {String} mixinMethodName name of method in Mixin subclass
 * @param {String} proxyMethodName name of created proxy method on host object
 * @param {Object} hostObject Optional reference to the host object; if not specified the host object passed to constructor wil be used. It allows to use the same instance of Mixin on two host objects.
 */
function _createProxyMethod(proxyMethodName, mixinMethodName, hostObject) {
	hostObject = hostObject || this._hostObject;

	// Mixin class does not allow shadowing methods that exist on the host object
	if (hostObject[proxyMethodName])
		throw new MixinError('method ' + proxyMethodName +
								 ' already defined in host object');

	check(this[mixinMethodName], Function);

	// Bind proxied Mixin's method to Mixin instance
	var boundMethod = this[mixinMethodName].bind(this);

	_.defineProperty(hostObject, proxyMethodName, boundMethod, _.WRIT);
}


/**
 * Creates proxied methods of Mixin subclass on host object.
 *
 * @param {Hash[String]} proxyMethods map of names of methods, key - proxy method, value - mixin method.
 * @param {Object} hostObject an optional reference to the host object; if not specified the host object passed to constructor wil be used. It allows to use the same instance of Mixin on two host objects.
 */
function _createProxyMethods(proxyMethods, hostObject) {
	check(proxyMethods, Match.Optional(Match.OneOf([String], Match.ObjectHash(String))));

	// creating and binding proxy methods on the host object
	if (Array.isArray(proxyMethods))
		proxyMethods.forEach(function(methodName) {
			// method called this way to allow using _createProxyMethods with objects that are not inheriting from Mixin
			_createProxyMethod.call(this, methodName, methodName, hostObject);
		}, this);
	else
		_.eachKey(proxyMethods, function(mixinMethodName, proxyMethodName) {

			// method called this way to allow using _createProxyMethods with objects that are not inheriting from Mixin
			_createProxyMethod.call(this, proxyMethodName, mixinMethodName, hostObject);
		}, this);
}
