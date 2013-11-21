'use strict';

var Facet = require('./f_class')
	, _ = require('proto')
	, check = require('../check')
	, Match = check.Match;

module.exports = FacetedObject;

// abstract class for faceted object
function FacetedObject(facetsOptions) {

	// TODO instantiate facets if configuration isn't passed
	// write a test to check it


	var thisClass = this.constructor
		, facets = {};

	if (! thisClass.prototype.facets)
		throw new Error('FacetedObject is an abstract class');

	for (var fct in facetsOptions) {
		var facetClass = thisClass.prototype.facets[fct]
			, facetOptions = facetsOptions[fct];

		check(facetClass, Function);

		facets[fct] = {
			enumerable: false,
			value: new facetClass(this, facetOptions)
		}
	}

	Object.defineProperties(this, facets);
}


// factory that creates classes (constructors) from the map of facets
// these classes inherit from FacetedObject
FacetedObject.createFacetedClass = function (name, facetsClasses) {
	check(name, String);
	check(facetsClasses, Match.ObjectHash(Function));

	var subclass = _.createSubclass(FacetedObject, name, true);

	_.extendProto(subclass, {
		facets: facetsClasses
	});
	return subclass;
};

