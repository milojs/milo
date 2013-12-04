'use strict';

var Facet = require('./f_class')
	, _ = require('mol-proto')
	, check = require('../util/check')
	, Match = check.Match
	, FacetError = require('../util/error').Facet;

module.exports = FacetedObject;


// abstract class for faceted object
function FacetedObject() {
	// TODO write a test to check that facets are created if configuration isn't passed
	var facetsConfig = this.facetsConfig || {};

	var facetsDescriptors = {}
		, facets = {};

	if (this.constructor == FacetedObject)		
		throw new FacetError('FacetedObject is an abstract class, can\'t be instantiated');

	if (this.facetsClasses)
		_.eachKey(this.facetsClasses, instantiateFacet, this, true);

	Object.defineProperties(this, facetsDescriptors);
	Object.defineProperty(this, 'facets', { value: facets });	

	// calling init if it is defined in the class
	if (this.init)
		this.init.apply(this, arguments);

	function instantiateFacet(FacetClass, fct) {
		var facetOpts = facetsConfig[fct];

		facets[fct] = new FacetClass(this, facetOpts);

		facetsDescriptors[fct] = {
			enumerable: true,
			value: facets[fct]
		};
	}
}

_.extendProto(FacetedObject, {
	addFacet: addFacet
});


function addFacet(FacetClass, facetOpts, facetName) {
	check(FacetClass, Function);
	check(facetName, Match.Optional(String));

	facetName = _.firstLowerCase(facetName || FacetClass.name);

	var protoFacets = this.constructor.prototype.facetsClasses;

	if (protoFacets && protoFacets[facetName])
		throw new FacetError('facet ' + facetName + ' is already part of the class ' + this.constructor.name);

	if (this[facetName])
		throw new FacetError('facet ' + facetName + ' is already present in object');

	var newFacet = this.facets[facetName] = new FacetClass(this, facetOpts);

	Object.defineProperty(this, facetName, {
		enumerable: true,
		value: newFacet
	});

	return newFacet;
}


FacetedObject.hasFacet = function hasFacet(facetName) {
	var protoFacets = this.prototype.facetsClasses;
	return protoFacets && protoFacets[facetName];
}



// factory that creates classes (constructors) from the map of facets
// these classes inherit from FacetedObject
FacetedObject.createFacetedClass = function (name, facetsClasses, facetsConfig) {
	check(name, String);
	check(facetsClasses, Match.ObjectHash(Match.Subclass(Facet, true)));
	check(facetsConfig, Match.Optional(Object));

	if (facetsConfig)
		_.eachKey(facetsConfig, function(fctConfig, fctName) {
			if (! facetsClasses.hasOwnProperty(fctName))
				throw new FacetError('configuration for facet (' + fctName + ') passed that is not in class');
		});

	var FacetedClass = _.createSubclass(this, name, true);

	_.extendProto(FacetedClass, {
		facetsClasses: facetsClasses,
		facetsConfig: facetsConfig
	});
	return FacetedClass;
};
