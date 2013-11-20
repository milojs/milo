'use strict';

var check = require('../check')
	, Match = check.Match;

var registry = module.exports = {
	add: registerComponentClass,
	get: getComponentClass,
	remove: unregisterComponentClass,
	clean: unregisterAllComponents
};

var _components = {};


function registerComponentClass(componentClass, name) {
	name = name || componentClass.name;

	check(name, String, 'component class name must be string');
	check(name, Match.Where(function() {
		return typeof name == 'string' && name != '';
	}), 'component class name must be string');
	check(componentClass, Function, 'component class must be function');

	if (_components[name])
		throw new TypeError('component is already registered');

	_components[name] = componentClass;
};


function getComponentClass(name) {
	check(name, String, 'component class name must be string');
	return _components[name];
};


function unregisterComponentClass(nameOrClass) {
	check(nameOrClass, Match.OneOf(String, Function), 'component class or name must be supplied');

	var name = typeof nameOrClass == 'string'
						? nameOrClass
						: nameOrClass.name;
						
	if (! _components[name])
		throw new TypeError('component is not registered');

	delete _components[name];
};


function unregisterAllComponents() {
	_components = {};
};
