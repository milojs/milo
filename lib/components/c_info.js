'use strict';

var componentsRegistry = require('./c_registry')
	, facetsRegistry = require('./c_facets/cf_registry')
	, BinderError = require('../util/error').Binder;


module.exports = ComponentInfo;

/**
 * Simple class to hold information allowing to create/copy component using [`Component.create`](./c_class.js.html#create) and [`Component.copy`](./c_class.js.html#copy).
 *
 * @constructor
 * @param {Scope} scope scope object the component belogs to, usually either top level scope that will be returned by [milo.binder](../binder.js.html) or `scope` property of [Container](./c_facets/Container.js.html) facet of containing component
 * @param {Element} el DOM element the component is attached to
 * @param {BindAttribute} attr BindAttribute instance that the component was created with
 * @return {ComponentInfo}
 */
function ComponentInfo(scope, el, attr) {
	attr.parse().validate();

	this.scope = scope;
	this.el = el;
	this.attr = attr;
	this.name = attr.compName;
	this.ComponentClass = getComponentClass(attr);
	this.extraFacetsClasses = getComponentExtraFacets(this.ComponentClass, attr);

	if (hasContainerFacet(this.ComponentClass, this.extraFacetsClasses))
		this.container = {};
}

function getComponentClass(attr) {
	var ComponentClass = componentsRegistry.get(attr.compClass);
	if (! ComponentClass)
		throw new BinderError('class ' + attr.compClass + ' is not registered');
	return ComponentClass;
}

function getComponentExtraFacets(ComponentClass, attr) {
	var facets = attr.compFacets
		, extraFacetsClasses = {};

	if (Array.isArray(facets))
		facets.forEach(function(fctName) {
			if (ComponentClass.hasFacet(fctName))
				throw new BinderError('class ' + ComponentClass.name
									  + ' already has facet ' + fctName);
			if (extraFacetsClasses[fctName])
				throw new BinderError('component ' + attr.compName
									  + ' already has facet ' + fctName);
			var FacetClass = facetsRegistry.get(fctName);
			extraFacetsClasses[fctName] = FacetClass;
		});

	return extraFacetsClasses;
}

function hasContainerFacet(ComponentClass, extraFacetsClasses) {
	return (ComponentClass.hasFacet('container')
		|| 'Container' in extraFacetsClasses 
		|| _.someKey(extraFacetsClasses, function (FacetClass) {
				return FacetClass.requiresFacet('container');
			}));
}
