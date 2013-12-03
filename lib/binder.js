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


	function bindChildren(ownerEl) {
		var scope = new Scope;
		Array.prototype.forEach.call(ownerEl.children, function(el) {
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
	var scope = new Scope;

	var attr = new BindAttribute(scopeEl);

	attr.parse().validate();

	// get component class from registry and validate
	var ComponentClass = miloFacetsRegistry.get(attr.compClass);
	if (! ComponentClass)
		throw new BinderError('class ' + attr.compClass + ' is not registered');
	check(ComponentClass, Match.Subclass(Component, true));
	attr.ComponentClass = ComponentClass;

	// add extra facets
	var facets = attr.compFacets;
	if (facets && facets.length) {
		var facetsClasses = [];
		facets.forEach(function(fct) {
			var FacetClass = 
			aComponent.addFacet(fct);
		});
	}
}
