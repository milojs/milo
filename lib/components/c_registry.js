'use strict';

var ClassRegistry = require('../abstract/registry')
	, Component = require('./c_class');

/**
 * `milo.registry.components`
 * An instance of [ClassRegistry](../abstract/registry.js.html) class that is used by milo to register and find components.
 */
var componentsRegistry = new ClassRegistry(Component);

// add common ancestor to all components to the registry.
componentsRegistry.add(Component);

module.exports = componentsRegistry;
