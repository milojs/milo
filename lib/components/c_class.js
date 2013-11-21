'use strict';

var facet = require('../facets/f_class')
	, FacetedObject = require('../facets/object')
	, componentsRegistry = require('./c_registry')
	, _ = require('proto');

var Component = module.exports = _.createSubclass(FacetedObject, 'Component', true)
delete Component.createFacetedClass;

Component.createComponentClass = function(name, facetsClasses) {
	var component = FacetedObject.createFacetedClass(name, facetsClasses);

	// re-wire prototype chain to make components classes descendants of
	// Component class rather than descendants of FacetedObject class
	var constructor = component.prototype.constructor;
	component.prototype = Object.create(Component.prototype);
	component.prototype.constructor = constructor;
}

componentsRegistry.setClass(Component);
componentsRegistry.add(Component);


// TODO fix