'use strict';

var componentsRegistry = require('./c_registry')
	, facetsRegistry = require('./c_facets/cf_registry')
	, BinderError = require('../util/error').Binder
	, logger = require('../util/logger')
	, _ = require('mol-proto');


module.exports = ComponentInfo;


/**
 * Simple class to hold information allowing to create/copy component using [`Component.create`](./c_class.js.html#create) and [`Component.copy`](./c_class.js.html#copy).
 *
 * @constructor
 * @param {Scope} scope scope object the component belogs to, usually either top level scope that will be returned by [milo.binder](../binder.js.html) or `scope` property of [Container](./c_facets/Container.js.html) facet of containing component
 * @param {Element} el DOM element the component is attached to
 * @param {BindAttribute} attr BindAttribute instance that the component was created with
 * @param {Boolean} throwOnErrors If set to false, then errors will only be logged to console. True by default.
 * @return {ComponentInfo}
 */
function ComponentInfo(scope, el, attr, throwOnErrors) {
	attr.parse().validate();

	this.scope = scope;
	this.el = el;
	this.attr = attr;
	this.name = attr.compName;
	this.ComponentClass = getComponentClass(attr, throwOnErrors);
	this.extraFacetsClasses = getComponentExtraFacets(this.ComponentClass, attr, throwOnErrors);

	if (this.ComponentClass
			&& hasContainerFacet(this.ComponentClass, this.extraFacetsClasses)) {
		this.container = {};
	}
}


function getComponentClass(attr, throwOnErrors) {
	var ComponentClass = componentsRegistry.get(attr.compClass);
	if (! ComponentClass)
		reportBinderError(throwOnErrors, 'class ' + attr.compClass + ' is not registered');
	return ComponentClass;
}


function getComponentExtraFacets(ComponentClass, attr, throwOnErrors) {
	var facets = attr.compFacets
		, extraFacetsClasses = {};

	if (Array.isArray(facets))
		facets.forEach(function(fctName) {
			fctName = _.firstUpperCase(fctName);
			if (ComponentClass.hasFacet(fctName))
				reportBinderError(throwOnErrors, 'class ' + ComponentClass.name
									  + ' already has facet ' + fctName);
			if (extraFacetsClasses[fctName])
				reportBinderError(throwOnErrors, 'component ' + attr.compName
									  + ' already has facet ' + fctName);
			var FacetClass = facetsRegistry.get(fctName);
			extraFacetsClasses[fctName] = FacetClass;
		});

	return extraFacetsClasses;
}


function reportBinderError(throwOnErrors, message) {
	if (throwOnErrors === false)
		logger.error('ComponentInfo binder error:', message);
	else
		throw new BinderError(message);
};


function hasContainerFacet(ComponentClass, extraFacetsClasses) {
	return (ComponentClass.hasFacet('container')
		|| 'Container' in extraFacetsClasses
		|| _.someKey(extraFacetsClasses, facetRequiresContainer)
		|| classHasFacetThatRequiresContainer());

	function classHasFacetThatRequiresContainer() {
		return (ComponentClass.prototype.facetsClasses
			&& _.someKey(ComponentClass.prototype.facetsClasses, facetRequiresContainer))
	}

	function facetRequiresContainer(FacetClass) {
		return FacetClass.requiresFacet('container');
	}
}
