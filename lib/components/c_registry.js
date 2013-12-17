// <a name="components-registry"></a>
// ###component registry class

// An instance of ClassRegistry class that is used by milo to register and find components.

'use strict';

var ClassRegistry = require('../abstract/registry')
	, Component = require('./c_class');

var componentsRegistry = new ClassRegistry(Component);

componentsRegistry.add(Component);

module.exports = componentsRegistry;
