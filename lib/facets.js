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

function FacetedObject(facetsOptions) {
	var thisClass = this.constructor
		, facets = {};
	for (var fct in facetsOptions) {
		var facetClass = thisClass.facets[fct]
			, facetOptions = facetsOptions[fct];
		facets[fct] = {
			enumerable: false,
			value: new facetClass(facetOptions);
		}
	}
	Object.defineProperties(facets);
}

// factory that creates classes (constructors) from the map of facets
// these classes inherit from FacetedObject
function createFacetedClass(name, facetsClasses) {
	// TODO check parameters
	var subclass;
	eval('subclass = function ' + name + '() { \
		FacetedObject.apply(this, arguments); \
	}');
	subclass.prototype = Object.create(FacetedObject.prototype);
	subclass.prototype.constructor = subclass;
	subclass.facets = facetsClasses;
	return subclass;
}

module.exports = {
	Facet: Facet,
	Object: FacetedObject
};
