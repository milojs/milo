'use strict';


var Facet = require('./facet')
	, _ = require('mol-proto')
	, check = require('../util/check')
	, Match = check.Match
	, FacetError = require('../util/error').Facet;

module.exports = FacetedObject;


/**
 * `milo.classes.FacetedObject`
 * Component class is based on an abstract ```FacetedObject``` class. This class can be used in any situation where objects can be represented via collection of facets (a facet is an object of a certain class, it holds its own configuration, data and methods).
 * In a way, "facets pattern" is an inversion of "adapter pattern" - while the latter allows finding a class/methods that has specific functionality, faceted object is simply constructed to have these functionalities.
 * With this architecture it is possible to create a virtually unlimited number of component classes with a very limited number of building blocks without having any hierarchy of classes - all components inherit directly from Component class.
 *
 * This constructor should be called by all subclasses constructor (it will happen automatically if a subclass is created with `_.createSubclass`).
 *
 * @return {FacetedObject}
 */
function FacetedObject() {
	// this.facetsConfig and this.facetsClasses were stored on a specific class prototype
	// when the class was created by FacetedObject.createFacetedClass
	var facetsConfig = this.facetsConfig || {};

	var facetsDescriptors = {}
		, facets = {};

	// FacetedObject class itself is not meant to be instantiated - it has no facets
	// It may change, as adding facets is possible to instances
	if (this.constructor == FacetedObject)		
		throw new FacetError('FacetedObject is an abstract class, can\'t be instantiated');

	// instantiate class facets
	if (this.facetsClasses)
		_.eachKey(this.facetsClasses, instantiateFacet, this, true);

	// add facets to the class as properties under their own name
	Object.defineProperties(this, facetsDescriptors);

	// store all facets on `facets` property so that they can be enumerated
	Object.defineProperty(this, 'facets', { value: facets });	

	// call `init`method if it is defined in subclass
	if (this.init)
		this.init.apply(this, arguments);

	// instantiate facet with a given class (FacetClass) and name (facetName)
	function instantiateFacet(FacetClass, facetName) {
		// get facet configuration
		var fctConfig = facetsConfig[facetName];

		// instatiate facets
		facets[facetName] = new FacetClass(this, fctConfig);

		// add facet to property descriptors
		facetsDescriptors[facetName] = {
			enumerable: true,
			value: facets[facetName]
		};
	}
}


/**
 * ####FacetedObject instance methods####
 *
 * - [addFacet](#addFacet)
 */
_.extendProto(FacetedObject, {
	addFacet: addFacet
});


/**
 * FacetedObject instance method.
 * Adds a facet to the instance of FacetedObject subclass.
 * Returns an instance of the facet that was created.
 *
 * @param {Function} FacetClass facet class constructor
 * @param {Object} facetConfig optional facet configuration
 * @param {String} facetName optional facet name, FacetClass.name will be used if facetName is not passed.
 * @return {Facet}
 */
function addFacet(FacetClass, facetConfig, facetName) {
	check(FacetClass, Function);
	check(facetName, Match.Optional(String));

	// first letter of facet name should be lowercase
	facetName = _.firstLowerCase(facetName || FacetClass.name);

	// get facets defined in class
	var protoFacets = this.constructor.prototype.facetsClasses;

	// check that this facetName was not already used in the class
	if (protoFacets && protoFacets[facetName])
		throw new FacetError('facet ' + facetName + ' is already part of the class ' + this.constructor.name);

	// check that this faceName does not already exist on the faceted object
	if (this[facetName])
		throw new FacetError('facet ' + facetName + ' is already present in object');

	// instantiate the facet
	var newFacet = this.facets[facetName] = new FacetClass(this, facetConfig);

	// add facet to faceted object
	Object.defineProperty(this, facetName, {
		enumerable: true,
		value: newFacet
	});

	return newFacet;
}


/**
 * FacetedObject class method
 * Returns reference to the facet class if the facet with `facetName` is part of the class, `undefined` otherwise. If subclass is created using _.createSubclass (as it should be) it will also have this method.
 * 
 * @param {Subclass(FacetedObject)} this this in this method refers to FacetedObject (or its subclass) that calls this method
 * @param {String} facetName
 * @return {Subclass(Facet)|undefined} 
 */
FacetedObject.hasFacet = function hasFacet(facetName) {
	var protoFacets = this.prototype.facetsClasses;
	return protoFacets && protoFacets[facetName];
}


/**
 * FacetedObject class method
 * Class factory that creates classes (constructor functions) from the maps of facets and their configurations.
 * Created class will be subclass of `FacetedObject`.
 *
 * @param {Subclass(FacetedObject)} this this in this method refers to FacetedObject (or its subclass) that calls this method
 * @param {String} name class name (will be function name of class constructor function)
 * @param {Object[Subclass(Facet)]} facetsClasses map of classes of facets that will constitute the created class
 * @param {Object[Object]} facetsConfig map of facets configuration, should have the same keys as the map of classes. Some facets may not have configuration, but the configuration for a facet that is not included in facetsClasses will throw an exception
 * @return {Subclass(FacetedObject)}
 */
FacetedObject.createFacetedClass = function createFacetedClass(name, facetsClasses, facetsConfig) {
	check(name, String);
	check(facetsClasses, Match.ObjectHash(Match.Subclass(Facet, true)));
	check(facetsConfig, Match.Optional(Object));

	// throw exception if config passed for facet for which there is no class
	if (facetsConfig)
		_.eachKey(facetsConfig, function(fctConfig, fctName) {
			if (! facetsClasses.hasOwnProperty(fctName))
				throw new FacetError('configuration for facet (' + fctName + ') passed that is not in class');
		});

	// create subclass of the current class (this refers to the class that calls this method)
	var FacetedClass = _.createSubclass(this, name, true);

	// store facets classes and configurations of class prototype
	_.extendProto(FacetedClass, {
		facetsClasses: facetsClasses,
		facetsConfig: facetsConfig
	});

	return FacetedClass;
};
