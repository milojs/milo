require('proto');
var check = require('./check')
	, Match = check.Match;

function Facet(owner, options) {
	this.owner = owner;
	this.options = options;
	this.init();
}

Facet.extendProto({
	init: function() {}
});

Facet.createFacetClass


// abstract class for faceted object
function FacetedObject(facetsOptions) {
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
function createFacetedObjectClass(name, facetsClasses) {
	check(name, String);
	check(facetsClasses, Match.ObjectHash(Function));

	var subclass;
	eval('subclass = function ' + name + '() { \
		FacetedObject.apply(this, arguments); \
	}');
	subclass.prototype = Object.create(FacetedObject.prototype);
	subclass.prototype.constructor = subclass;
	subclass.extendProto({
		facets: facetsClasses
	});
	return subclass;
}

module.exports = {
	Facet: Facet,
	Object: FacetedObject,
	createFacetedObjectClass: createFacetedObjectClass
};
