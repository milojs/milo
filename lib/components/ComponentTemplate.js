'use strict';

var Component = require('../c_class')
	, componentsRegistry = require('../c_registry');


var MyComponent = Component.createComponentClass('MyComponent' /*, ['container'] */);

componentsRegistry.add(MyComponent);

module.exports = MyComponent;
