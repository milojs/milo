'use strict';

var miloMail = require('./mail')
	, componentsRegistry = require('./components/c_registry')
	, facetsRegistry = require('./components/c_facets/cf_registry')
	, Component = componentsRegistry.get('Component')
	, ComponentInfo = require('./components/c_info')
	, Scope = require('./components/scope')
	, BindAttribute = require('./attributes/a_bind')
	, BinderError = require('./util/error').Binder
	, _ = require('mol-proto')
	, check = require('./util/check')
	, utilDom = require('./util/dom')
	, Match =  check.Match;


binder.scan = scan;
binder.create = create;
binder.twoPass = twoPass;


module.exports = binder;


/**
 * Recursively scans the document tree inside `scopeEl` (document.body
 * by default) looking for __ml-bind__ attribute that should contain
 * the class, additional facets and the name of the component that should
 * be created and bound to the element.
 *
 * Possible values of __ml-bind__ attribute:
 *
 * - `:myView` - only component name. An instance of Component class will be
 *   created without any facets.
 * - `View:myView` - class and component name. An instance of View class
 *   will be created.
 * - `[Events, Data]:myView` - facets and component name. An instance of
 *   Component class will be created with the addition of facets Events
 *   and Data.
 * - `View[Events, Data]:myView` - class, facet(s) and component name.
 *   An instance of View class will be created with the addition of facets
 *   Events and Data.
 *
 * Function an instance of [`Scope`](./components/scope.js.html) class containing all components created
 * as a result of scanning DOM.
 *
 * If the component has [`Container`](./components/c_facets/Container.js) facet, children of this element will be
 * stored on the Container facet of this element as properties of scope
 * property of Container facet. Names of components within the scope should be
 * unique, but they can be the same as the names of components in outer scope
 * (or some other scope).
 *
 * @param {Element} scopeEl root element inside which DOM will be scanned
 *  and bound
 * @return {Scope}
 */
function binder(scopeEl) {
	return createBinderScope(scopeEl, function(scope, el, attr) {
		var info = new ComponentInfo(scope, el, attr);
		return Component.create(info);
	});
}


// bind in two passes
function twoPass(scopeEl) {
	var scanScope = binder.scan(scopeEl);
	return binder.create(scanScope);
}


// scan DOM for BindAttribute
function scan(scopeEl) {
	return createBinderScope(scopeEl, function(scope, el, attr) {
		return new ComponentInfo(scope, el, attr);
	});
}


// create bound components
function create(scanScope, hostObject) {
	var scope = new Scope(scanScope._rootEl, hostObject);

	scanScope._each(function(compInfo) {
		// set correct component's scope
		var info = _.clone(compInfo)
		info.scope = scope;

		// create component
		var aComponent = Component.create(info);

		scope._add(aComponent, aComponent.name);
		if (aComponent.container)
			aComponent.container.scope = create(compInfo.container.scope, aComponent.container);
	});

	return scope;
}


function createBinderScope(scopeEl, scopeObjectFactory) {
	var scopeEl = scopeEl || document.body
		, scope = new Scope(scopeEl);

	createScopeForElement(scope, scopeEl);
	
	return scope;


	function createScopeForElement(scope, el) {
		// get element's binding attribute (ml-bind by default)
		var attr = new BindAttribute(el);

		// if eleent has bind attribute crate scope object (Component or ComponentInfo)
		if (attr.node) {
			var scopeObject = scopeObjectFactory(scope, el, attr)
				, isContainer = typeof scopeObject != 'undefined' && scopeObject.container;
		}

		// if there are childNodes add children to new scope if this element has component with Container facet
		// otherwise create a new scope
		if (el.childNodes && el.childNodes.length) {
			var innerScope = createScopeForChildren(el, isContainer ? undefined : scope);

			if (isContainer && innerScope._length()) {
				// store new scope on container facet and set back link on scope
				scopeObject.container.scope = innerScope;
				innerScope._hostObject = scopeObject.container;
			}
		}

		// if scope wasn't previously created on container facet, create empty scope anyway
		if (isContainer && ! scopeObject.container.scope)
			scopeObject.container.scope = new Scope(el);


		// TODO condition after && is a hack! change
		if (scopeObject && ! scope[attr.compName])
			scope._add(scopeObject, attr.compName);

		postChildrenBoundMessage(el);

		return scopeObject;


		function postChildrenBoundMessage(el) {
			var elComp = Component.getComponent(el);
			if (elComp)
				elComp.postMessage('childrenbound');
		}
	}


	function createScopeForChildren(containerEl, scope) {
		scope = scope || new Scope(containerEl);
		var children = utilDom.filterNodeListByType(containerEl.childNodes, Node.ELEMENT_NODE);

		_.forEach(children, function(node) {
			createScopeForElement(scope, node);
		});
		return scope;
	}
}
