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


binder.scan = scan;

module.exports = binder;


function binder(scopeEl) {
	var scopeEl = scopeEl || document.body
		, scope = new Scope;

	bindElement(scope, scopeEl);
	return scope;


	function bindElement(scope, el){
		var attr = new BindAttribute(el);

		if (attr.node)
			var aComponent = createComponent(scope, el, attr);

		// bind inner elements to components
		if (el.children && el.children.length) {
			var innerScope = bindChildren(el);

			if (innerScope._length()) {
				// attach inner components to the current one (create a new scope) ...
				if (typeof aComponent != 'undefined' && aComponent.container)
					aComponent.container.scope = innerScope;
				else // or keep them in the current scope
					scope._copy(innerScope);;
			}
		}

		if (aComponent)
			scope._add(aComponent, attr.compName);
	}


	function bindChildren(containerEl) {
		var scope = new Scope;
		Array.prototype.forEach.call(containerEl.children, function(el) {
			bindElement(scope, el)
		});
		return scope;
	}


	function createComponent(scope, el, attr) {
		// element will be bound to a component
		attr.parse().validate();

		// get component class from registry and validate
		var ComponentClass = componentsRegistry.get(attr.compClass);
		if (! ComponentClass)
			throw new BinderError('class ' + attr.compClass + ' is not registered');
		check(ComponentClass, Match.Subclass(Component, true));

		// create new component
		var aComponent = new ComponentClass(scope, el, attr.compName);

		// add extra facets
		var facets = attr.compFacets;
		if (facets)
			facets.forEach(function(fct) {
				aComponent.addFacet(fct);
			});

		return aComponent;
	}
}


function scan(scopeEl) {
	var scopeEl = scopeEl || document.body
		, scope = new Scope;

	scanElement(scope, scopeEl);
	return scope;


	function scanElement(scope, el){
		// get element's binding attribute (ml-bind by default)
		var attr = new BindAttribute(el);

		if (attr.node)
			var aComponentInfo = new ComponentInfo(scope, el, attr);

		if (el.children && el.children.length) {
			var innerScope = scanChildren(el);

			if (innerScope._length()) {
				// attach inner attributes to the current one (create a new scope) ...
				if (typeof aComponentInfo != 'undefined' && aComponentInfo.container)
					aComponentInfo.container.scope = innerScope;
				else // or keep them in the current scope
					scope._copy(innerScope);;
			}
		}

		if (aComponentInfo)
			scope._add(aComponentInfo, attr.compName);
	}

	function scanChildren(containerEl) {
		var scope = new Scope;
		Array.prototype.forEach.call(containerEl.children, function(el) {
			scanElement(scope, el)
		});
		return scope;
	}
}


// private class used to hold information about component
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
			|| (Array.isArray(attr.compFacets) && attr.compFacets.indexOf('Container') >= 1));
	}
}
