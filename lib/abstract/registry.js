'use strict';

var _ = require('mol-proto')
	, RegistryError = require('../util/error').Registry
	, check = require('../util/check')
	, Match = check.Match;

module.exports = ClassRegistry;


/**
 * `milo.classes.ClassRegistry` - the registry of classes class.
 * Components and Facets register themselves in registries. It allows to avoid requiring them from one module and prevents circular dependencies between modules.
 * 
 * @param {Function} FoundationClass All classes that are registered in the registry should be subclasses of the FoundationClass
 * @return {Object}
 */
function ClassRegistry (FoundationClass) {
	if (FoundationClass)
		this.setClass(FoundationClass);

	this.__registeredClasses = {};
}


/**
 * ClassRegistry instance methods
 *
 * - [add](#add)
 * - [get](#get)
 * - [remove](#remove)
 * - [clean](#clean)
 * - [setClass](#setClass)
 */
_.extendProto(ClassRegistry, {
	add: add,
	get: get,
	remove: remove,
	clean: clean,
	setClass: setClass
});


/**
 * ClassRegistry instance method that registers a class in the registry.
 *
 * @param {Function} aClass class to register in the registry. Should be subclass of `this.FoundationClass`.
 * @param {String} name Optional class name. If class name is not specified, it will be taken from constructor function name. Class name should be a valid identifier and cannot be an empty string.
 */
function add(aClass, name) {
	name = name || aClass.name;

	check(name, Match.IdentifierString, 'class name must be identifier string');

	if (this.FoundationClass) {
		if (aClass != this.FoundationClass)
			check(aClass, Match.Subclass(this.FoundationClass), 'class must be a sub(class) of a foundation class');
	} else
		throw new RegistryError('foundation class must be set before adding classes to registry');

	if (this.__registeredClasses[name])
		throw new RegistryError('class "' + name + '" is already registered');

	this.__registeredClasses[name] = aClass;
};


/**
 * Gets class from registry by name
 *
 * @param {String} name Class name
 * @return {Function}
 */
function get(name) {
	check(name, String, 'class name must be string');
	return this.__registeredClasses[name];
};


/**
 * Remove class from registry by its name.
 * If class is not registered, this method will throw an exception.
 * 
 * @param {String|Function} nameOrClass Class name. If class constructor is supplied, its name will be used.
 */
function remove(nameOrClass) {
	check(nameOrClass, Match.OneOf(String, Function), 'class or name must be supplied');

	var name = typeof nameOrClass == 'string'
						? nameOrClass
						: nameOrClass.name;
						
	if (! this.__registeredClasses[name])
		throw new RegistryError('class is not registered');

	delete this.__registeredClasses[name];
};


/**
 * Removes all classes from registry.
 */
function clean() {
	this.__registeredClasses = {};
};


/**
 * Sets `FoundationClass` of the registry. It should be set before any class can be added.
 *
 * @param {Function} FoundationClass Any class that will be added to the registry should be a subclass of this class. FoundationClass itself can be added to the registry too.
 */
function setClass(FoundationClass) {
	check(FoundationClass, Function);
	Object.defineProperty(this, 'FoundationClass', {
		enumerable: true,
		value: FoundationClass
	});
}
