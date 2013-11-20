'use strict';

var facet = require('../facets')
	, FacetedObject = ('../facets/object');

var Component = module.exports =
		FacetedObject.createSubclass('Component', true)

Component.create = function(name, facetsClasses) {
	var component = FacetedObject.createFacetedClass(name, facetsClasses);

	// re-wire prototype chain to make components classes descendants of
	// Component class rather than descendants of FacetedObject class
	var constructor = component.prototype.constructor;
	component.prototype = Object.create(Component.prototype);
	component.prototype.constructor = constructor;
}
