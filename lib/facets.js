require('proto');

function Facet(owner) {
	this.owner = owner;
	this.init.apply(this, arguments);
}

Facet.extendProto({
	init: function() {}
});

function FacetedObject(facets) {
	for (var fct in facets) {
		var facet = facets[fct]
			, facetClass = facet.cls
			, facetOptions = facet.options;
		this[fct] = new facetClass(facetOptions);
	}
}

// factory that creates classes from the list of facets
function FacetedClass(facetClasses) {
	var subclass = function() {
		FacetedObject.apply(this, arguments);
	}
	subclass.prototype = Object.create(FacetedObject.prototype);
	subclass.prototype.constructor = subclass;
}

module.exports = {

	Facet: Facet
}
