'use strict';


var FacetedObject = require('../abstract/faceted_object')
	, facetsRegistry = require('./c_facets/cf_registry')
	, ComponentFacet = facetsRegistry.get('ComponentFacet')
	, componentUtils = require('./c_utils')
	, Messenger = require('../messenger')
	, _ = require('mol-proto')
	, check = require('../util/check')
	, Match = check.Match
	, config = require('../config')
	, miloComponentName = require('../util/component_name');


/**
 * `milo.Component`
 * Base Component class.
 * Its constructor passes its parameters, including its [scope](./scope.js.html), DOM element and name to [`init`](#init) method.
 * The constructor of Component class rarely needs to be used directly, as [milo.binder](../binder.js.html) creates components when it scans DOM tree.
 * [`Component.createComponentClass`](#createComponentClass) should be used to create a subclass of Component class with configured facets.
 *
 * @param {Scope} scope scope to which component will belong. It is usually a top level scope object returned by `milo.binder` or `scope` property of Container facet.
 * @param {Element} element DOM element that component is attached to
 * @param {String} name component name, should be unique in the scope of component
 * @param {ComponentInfo} componentInfo instance of ComponentInfo class that can be used to create a copy of component
 *  TODO try removing it
 * @return {Component}
 */
var Component = _.createSubclass(FacetedObject, 'Component', true);

module.exports = Component;


/**
 * ####Component class methods####
 *
 * - [createComponentClass](#createComponentClass)
 * - [create](#create)
 * - [copy](#copy)
 * - [isComponent](c_utils.js.html#isComponent)
 * - [getComponent](c_utils.js.html#getComponent)
 * - [getContainingComponent](c_utils.js.html#getContainingComponent)
 */
_.extend(Component, {
	createComponentClass: createComponentClass,
	create: create,
	copy: copy,
	isComponent: componentUtils.isComponent,
	getComponent: componentUtils.getComponent,
	getContainingComponent: componentUtils.getContainingComponent,
});
delete Component.createFacetedClass;


/**
 * ####Component instance methods####
 * - [init](#init)
 * - [initElement](#initElement)
 * - [addFacet](#addFacet)
 * - [allFacets](#allFacets)
 * - [remove](#remove)
 * - [getScopeParent](#getScopeParent)
 * - [_getScopeParent](#_getScopeParent)
 */
_.extendProto(Component, {
	init: init,
	initElement: initElement,
	addFacet: addFacet,
	allFacets: allFacets,
	remove: remove,
	getScopeParent: getScopeParent,
	_getScopeParent: _getScopeParent
});


/**
 * Component class method
 * Creates a subclass of component from the map of configured facets.
 * This method wraps and replaces [`createFacetedClass`](./abstract/faceted_object.js.html#createFacetedClass) class method of FacetedObject.
 * Unlike createFacetedClass, this method take facet classes from registry by their name, so only map of facets configuration needs to be passed. All facets classes should be subclasses of [ComponentFacet](./c_facet.js.html)
 *
 * @param {String} name class name
 * @param {Object[Object] | Array[String]} facetsConfig map of facets configuration.
 *  If some facet does not require configuration, `undefined` should be passed as the configuration for the facet.
 *  If no facet requires configuration, the array of facets names can be passed.
 * @return {Subclass(Component)}
 */
function createComponentClass(name, facetsConfig) {
	var facetsClasses = {};

	// convert array of facet names to map of empty facets configurations
	if (Array.isArray(facetsConfig)) {
		var configMap = {};
		facetsConfig.forEach(function(fct) {
			var fctName = _.firstLowerCase(fct);
			configMap[fctName] = {};
		});
		facetsConfig = configMap;
	}

	// construct map of facets classes from facetRegistry
	_.eachKey(facetsConfig, function(fctConfig, fct) {
		var fctName = _.firstLowerCase(fct);
		var fctClassName = _.firstUpperCase(fct);
		facetsClasses[fctName] = facetsRegistry.get(fctClassName);
	});

	// create subclass of Component using method of FacetedObject
	var ComponentClass = FacetedObject.createFacetedClass.call(this, name, facetsClasses, facetsConfig);
	
	return ComponentClass;
};


/**
 * Component class method
 * Creates component from [ComponentInfo](./c_info.js.html) (used by [milo.binder](../binder.js.html) and to copy component)
 * Component of any registered class (see [componentsRegistry](./c_registry.js.html)) with any additional registered facets (see [facetsRegistry](./c_facets/cf_registry.js.html)) can be created using this method.
 *
 * @param {ComponentInfo} info
 @ @return {Component}
 */
function create(info) {
	var ComponentClass = info.ComponentClass;
	var aComponent = new ComponentClass(info.scope, info.el, info.name, info);

	if (info.extraFacetsClasses)
		_.eachKey(info.extraFacetsClasses, function(FacetClass) {
			aComponent.addFacet(FacetClass);
		});

	return aComponent;
}


/**
 * Component class method
 * Create a copy of component, including a copy of DOM element. Returns a copy of `component` (of the same class) with new DOM element (not inserted into page).
 * Component is added to the same scope as the original component.
 *
 * @param {Component} component an instance of Component class or subclass
 * @param {Boolean} deepCopyDOM optional `true` to make deep copy of DOM element, otherwise only element without children is copied
 * @return {Component}
 */
function copy(component, deepCopyDOM) {
	var ComponentClass = component.constructor

		// get unique component name
		, newName = miloComponentName()

		// copy DOM element, using Dom facet if it is available
		, newEl = component.dom 
					? component.dom.copy(deepCopyDOM)
					: component.el.cloneNode(deepCopyDOM)

		// clone componenInfo and bind attribute
		, newInfo = _.clone(component.componentInfo)
		, attr = _.clone(newInfo.attr);

	// change bind attribute
	_.extend(attr, {
		el: newEl,
		compName: newName
	});

	// put bind attribute on the new element
	attr.decorate();

	// change componentInfo
	_.extend(newInfo, {
		el: newEl,
		name: newName,
		attr: attr
	});

	// create component copy
	var aComponent = Component.create(newInfo);

	// add new component to the same scope as the original one
	component.scope._add(aComponent, aComponent.name);

	return aComponent;
}


/**
 * Component instance method.
 * Initializes component. Automatically called by inherited constructor of FacetedObject.
 * Subclasses should call inherited init methods:
 * ```
 * Component.prototype.init.apply(this, arguments)
 * ```
 *
 * @param {Scope} scope scope to which component will belong. It is usually a top level scope object returned by `milo.binder` or `scope` property of Container facet.
 * @param {Element} element DOM element that component is attached to
 * @param {String} name component name, should be unique in the scope of component
 * @param {ComponentInfo} componentInfo instance of ComponentInfo class that can be used to create a copy of component
 *  TODO try removing it
 */
function init(scope, element, name, componentInfo) {
	// create DOM element if it wasn't passed to Constructor
	this.el = element || this.initElement();

	// store reference to component on DOM element
	if (this.el)
		this.el[config.componentRef] = this;

	_.defineProperties(this, {
		name: name,
		scope: scope,
		componentInfo: componentInfo
	}, _.ENUM);

	// create component messenger
	var messenger = new Messenger(this, Messenger.defaultMethods, undefined /* no messageSource */);

	_.defineProperty(this, '_messenger', messenger);

	// check all facets dependencies (required facets)
	this.allFacets('check');

	// start all facets
	this.allFacets('start');
}


/**
 * Component instance method.
 * Initializes the element which this component is bound to
 *
 * This method is called when a component is instantiated outside the DOM and
 * will generate a new element for the component.
 * 
 * @return {Element}
 */
function initElement() {
	if (typeof document == 'undefined')
		return;

	if (this.dom)
		this.dom.newElement();
	else
		this.el = document.createElement('DIV');

	return this.el;
}


/**
 * Component instance method.
 * Adds facet with given name or class to the instance of Component (or its subclass).
 * 
 * @param {String|Subclass(Component)} facetNameOrClass name of facet class or the class itself. If name is passed, the class will be retireved from facetsRegistry
 * @param {Object} facetConfig optional facet configuration
 * @param {String} facetName optional facet name. Allows to add facet under a name different from the class name supplied.
 */
function addFacet(facetNameOrClass, facetConfig, facetName) {
	check(facetNameOrClass, Match.OneOf(String, Match.Subclass(ComponentFacet)));
	check(facetConfig, Match.Optional(Object));
	check(facetName, Match.Optional(String));

	// if only name passed, retrieve facet class from registry
	if (typeof facetNameOrClass == 'string') {
		var facetClassName = _.firstUpperCase(facetNameOrClass);
		var FacetClass = facetsRegistry.get(facetClassName);
	} else 
		FacetClass = facetNameOrClass;

	facetName = facetName || _.firstLowerCase(FacetClass.name);

	// add facet using method of FacetedObject
	var newFacet = FacetedObject.prototype.addFacet.call(this, FacetClass, facetConfig, facetName);

	// check depenedencies and start facet
	newFacet.check && newFacet.check();
	newFacet.start && newFacet.start();
}


// envoke given method with optional parameters on all facets
/**
 * Component instance method.
 */
function allFacets(method /* , ... */) {
	var args = _.slice(arguments, 1);

	_.eachKey(this.facets, function(facet, fctName) {
		if (facet && typeof facet[method] == 'function')
			facet[method].apply(facet, args);
	});
}


/**
 * Component instance method.
 * Removes component from its scope.
 */
function remove() {
	if (this.scope)
		delete this.scope[this.name];
}


/**
 * Component instance method.
 * Returns the scope parent of a component.
 * If `withFacet` parameter is not specified, an immediate parent will be returned, otherwise the closest ancestor with a specified facet.
 *
 * @param {String} withFacet optional string name of the facet, the case of the first letter is ignored, so both facet name and class name can be used
 * @return {Component|undefined}
 */
function getScopeParent(withFacet) {
	check(withFacet, Match.Optional(String));
	withFacet = _.firstLowerCase(withFacet);
	return this._getScopeParent(withFacet);	
}

function _getScopeParent(withFacet) {
	var parentContainer = this.scope && this.scope._hostObject
		, parent = parentContainer && parentContainer.owner;

	// Where there is no parent, this function will return undefined
	// The parent component is checked recursively
	if (parent) {
		if (! withFacet || parent.hasOwnProperty(withFacet))
			return parent;
		else
			return parent._getScopeParent(withFacet);
	}
}
