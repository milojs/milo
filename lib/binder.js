'use strict';

var miloMail = require('./mail')
	, componentsRegistry = require('./components/c_registry')
	, facetsRegistry = require('./components/c_facets/cf_registry')
	, Component = componentsRegistry.get('Component')
	, Scope = require('./components/scope')
	, BindAttribute = require('./attribute/a_bind')
	, BinderError = require('./util/error').Binder
	, _ = require('mol-proto')
	, check = require('./util/check')
	, Match =  check.Match;


binder.scan = scanDomForBindAttribute;
binder.create = createBoundComponents;
binder.twoPass = binderTwoPass;


module.exports = binder;


function binder(scopeEl) {
	return createBinderScope(scopeEl, function(scope, el, attr) {
		var info = new ComponentInfo(scope, el, attr);
		return Component.create(info);
	});
}


function binderTwoPass(scopeEl) {
	var scopeEl = scopeEl || document.body;
	var scanScope = binder.scan(scopeEl);
	return binder.create(scanScope);
}


function scanDomForBindAttribute(scopeEl) {
	return createBinderScope(scopeEl, function(scope, el, attr) {
		return new ComponentInfo(scope, el, attr);
	});
}


function createBoundComponents(scanScope) {
	var scope = new Scope;

	if (scanScope)
		scanScope._each(function(compInfo) {
			var aComponent = Component.create(compInfo);

			scope._add(aComponent, aComponent.name);
			if (aComponent.container)
				aComponent.container.scope = createBoundComponents(compInfo.container.scope);
		});

	return scope;
}


function createBinderScope(scopeEl, scopeObjectFactory) {
	var scopeEl = scopeEl || document.body
		, scope = new Scope;

	createScopeForElement(scope, scopeEl);
	return scope;


	function createScopeForElement(scope, el) {
		// get element's binding attribute (ml-bind by default)
		var attr = new BindAttribute(el);

		if (attr.node)
			var scopeObject = scopeObjectFactory(scope, el, attr);

		if (el.children && el.children.length) {
			var innerScope = createScopeForChildren(el);

			if (innerScope._length()) {
				// attach inner attributes to the current one (create a new scope) ...
				if (typeof scopeObject != 'undefined' && scopeObject.container)
					scopeObject.container.scope = innerScope;
				else // or keep them in the current scope
					scope._copy(innerScope);;
			}
		}

		if (scopeObject)
			scope._add(scopeObject, attr.compName);
	}


	function createScopeForChildren(containerEl) {
		var scope = new Scope;
		Array.prototype.forEach.call(containerEl.children, function(el) {
			createScopeForElement(scope, el)
		});
		return scope;
	}
}


// class used to hold information about component
function ComponentInfo(scope, el, attr) {
	attr.parse().validate();

	this.scope = scope;
	this.name = attr.compName;
	this.el = el;
	this.ComponentClass = getComponentClass(attr);
	this.extraFacetsClasses = getComponentExtraFacets(this.ComponentClass, attr);

	if (hasContainerFacet(this.ComponentClass, attr))
		this.container = {};

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

	function hasContainerFacet(ComponentClass, attr) {
		return (ComponentClass.hasFacet('container')
			|| (Array.isArray(attr.compFacets) && attr.compFacets.indexOf('Container') >= 0));
	}
}
