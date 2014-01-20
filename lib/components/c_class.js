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
	, miloComponentName = require('../util/component_name')
	, logger = require('../util/logger')
	, domUtils = require('../util/dom')
	, ComponentError = require('../util/error').Component
	, BindAttribute = require('../attributes/a_bind')
	, Scope = require('./scope');


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
	createComponentClass: Component$$createComponentClass,
	create: Component$$create,
	copy: Component$$copy,
	createOnElement: Component$$createOnElement,
	isComponent: componentUtils.isComponent,
	getComponent: componentUtils.getComponent,
	getContainingComponent: componentUtils.getContainingComponent,
	getState: Component$$getState,
	getTransferState: Component$$getTransferState,
	createFromState: Component$$createFromState,
	createFromDataTransfer: createFromDataTransfer
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
	_getState: Component$_getState,
	_setState: Component$_setState,
	getScopeParent: getScopeParent,
	_getScopeParent: _getScopeParent
});

var COMPONENT_DATA_TYPE_PREFIX = 'x-application/milo-component';
var COMPONENT_DATA_TYPE_REGEX = /x-application\/milo-component\/([a-z_$][0-9a-z_$]*)(?:\/())/i;

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
function Component$$createComponentClass(name, facetsConfig) {
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
function Component$$create(info) {
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
 * @param {Boolean} deepCopy optional `true` to make deep copy of DOM element, otherwise only element without children is copied
 * @return {Component}
 */
function Component$$copy(component, deepCopy) {
	var ComponentClass = component.constructor;

	// get unique component name
	var newName = miloComponentName();

	// copy DOM element, using Dom facet if it is available
	var newEl = component.dom 
					? component.dom.copy(deepCopy)
					: component.el.cloneNode(deepCopy);

	// clone componenInfo and bind attribute
	var newInfo = _.clone(component.componentInfo);
	var attr = _.clone(newInfo.attr);

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

	// bind inner components
	// if (deepCopy && component.container)
	// 	component.container.binder();

	return aComponent;
}


/**
 * Component class method
 * Creates an instance of component atached to element. All subclasses of component inherit this method.
 * Returns the component of the class this method is used with (thecontext of the method call).
 *
 * @param {Element} el optional element to attach component to. If element is not passed, it will be created
 * @param {String} innerHTML optional inner html to insert in element before binding.
 * @param {Scope} rootScope optional scope to put component in. If not passed, component will be attached to the scope that contains the element. If such scope does not exist, new scope will be created.
 * @return {Subclass(Component)}
 */
function Component$$createOnElement(el, innerHTML, rootScope) {
	// should required here to resolve circular dependency
	var miloBinder = require('../binder')

	// create element if it wasn't passed
	if (! el) {
		var domFacetConfig = this.prototype.facetsConfig.dom
			, tagName = domFacetConfig && domFacetConfig.tagName || 'div';
		el = document.createElement(tagName);
	}

	// find scope to attach component to
	if (! rootScope) {
		var parentComponent = Component.getContainingComponent(el, false, 'Container');
		if (parentComponent)
			rootScope = parentComponent.container.scope;
		else
			rootScope = new Scope(el);
	}

	// add bind attribute to element
	var attr = new BindAttribute(el);
	// "this" refers to the class of component here, as this is a class method
	attr.compClass = this.name;
	attr.decorate();

	// insert HTML
	if (innerHTML)
		el.innerHTML = innerHTML;

	miloBinder(el, rootScope);

	return rootScope[attr.compName];
}


/**
 * Component class method
 * Retrieves all component state, including information about its class, extra facets, facets data and all scope children.
 * This information is used to save/load, copy/paste and drag/drop component 
 * Returns component state
 *
 * @param {Component} component component which state will be saved
 * @return {Object}
 */
function Component$$getState(component) {
	var state = component._getState();
	state.outerHTML = component.el.outerHTML;
	return state;
}


/**
 * Component class method
 * Retrieves all component state, including information about its class, extra facets, facets data and all scope children.
 * This information is used to save/load, copy/paste and drag/drop component 
 * If component has [Transfer](./c_facets/Transfer.js.html) facet on it, this method retrieves state from this facet
 * Returns component state
 *
 * @param {Component} component component which state will be saved
 * @return {Object}
 */
function Component$$getTransferState(component) {
	return component.transfer
			? component.transfer.getState()
			: Component.getState(component);
}


/**
 * Component class method
 * Creates component from component state, that includes information about its class, extra facets, facets data and all scope children.
 * This is used to save/load, copy/paste and drag/drop component
 *
 * @param {Object} state state from which component will be created
 * @param {Scope} rootScope scope to which component will be added
 * @param {Boolean} newUniqueName optional `true` to create component with the name different from the original one. `False` by default.
 * @return {Component} component
 */
function Component$$createFromState(state, rootScope, newUniqueName) {
	check(state, Match.ObjectIncluding({
		compName: Match.Optional(String),
		compClass: Match.Optional(String),
		extraFacets: Match.Optional([String]),
		facetsStates: Match.Optional(Object),
		outerHTML: String
	}));

	// create wrapper element optionally renaming component
	var wrapEl = _createComponentWrapElement(state, newUniqueName);

	// instantiate all components from HTML
	var scope = milo.binder(wrapEl);

	// as there should only be one component, call to _any will return it
	var component = scope._any();

	// set component's scope
	if (rootScope) {
		component.scope = rootScope;
		rootScope._add(component);
	}

	// restor component state
	component._setState(state);

	return component;	
}


// used by Component$$createFromState
function _createComponentWrapElement(state, newUniqueName) {
	var wrapEl = document.createElement('div');
	wrapEl.innerHTML = state.outerHTML;

	var children = domUtils.children(wrapEl);
	if (children.length != 1)
		throw new ComponentError('cannot create component: incorrect HTML, elements number: ' + children.length + ' (should be 1)');
	var compEl = children[0];
	var attr = new BindAttribute(compEl);
	attr.compName = newUniqueName ? miloComponentName() : state.compName;
	attr.compClass = state.compClass;
	attr.compFacets = state.extraFacets;
	attr.decorate();

	return wrapEl;
}

/**
 * Creates a component from a DataTransfer object (if possible)
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer
 * @param {DataTransfer} dataTransfer Data transfer
 */
function createFromDataTransfer(dataTransfer) {
	var dataType = _.find(dataTransfer.types, function (type) {
		return COMPONENT_DATA_TYPE_REGEX.test(type);
	});

	if (!dataType) return;

	var state = milo.util.jsonParse(dataTransfer.getData(dataType));

	if (!state) return;

	return Component.createFromState(state, undefined, true);
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
	if (this.el) {
		// check that element does not have a component already atached
		// var elComp = this.el[config.componentRef];
		// if (elComp)
		// 	logger.error('component ' + name + ' attached to element that already has component ' + elComp.name);

		this.el[config.componentRef] = this;
	}

	_.defineProperties(this, {
		componentInfo: componentInfo,
		extraFacets: []
	}, _.ENUM);

	this.name = name;
	this.scope = scope;

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

	this.extraFacets.push(facetName);

	// add facet using method of FacetedObject
	var newFacet = FacetedObject.prototype.addFacet.call(this, FacetClass, facetConfig, facetName);

	// check depenedencies and start facet
	newFacet.check && newFacet.check();
	newFacet.start && newFacet.start();
}


/**
 * Component instance method.
 * Envoke given method with optional parameters on all facets.
 * Returns the map of values returned by all facets. If the facet doesn't have the method it is simply not called and the value in the map will be undefined.
 *
 * @param {String} method method name to envoke on the facet
 * @return {Object}
 */
function allFacets(method) { // ,... arguments
	var args = _.slice(arguments, 1);

	return _.mapKeys(this.facets, function(facet, fctName) {
		if (facet && typeof facet[method] == 'function')
			return facet[method].apply(facet, args);
	});
}


/**
 * Component instance method.
 * Removes component from its scope.
 */
function remove() {
	if (this.scope)
		this.scope._remove(this.name);
}


/**
 * Component instance method
 * Returns the state of component
 * Used by class method `Component.getState` and by [Container](./c_facets/Container.js.html) facet.
 *
 * @private
 * @return {Object}
 */
function Component$_getState(){
	var facetsStates = this.allFacets('getState');
	facetsStates = _.filterKeys(facetsStates, function(fctState) {
		return !! fctState;
	});

	return {
		compName: this.name,
		compClass: this.constructor.name,
		extraFacets: this.extraFacets,
		facetsStates: facetsStates
	};
}


/**
 * Component instance method
 * Sets the state of component.
 * Used by class method `Component.createFromState` and by [Container](./c_facets/Container.js.html) facet.
 *
 * @private
 * @param {Object} state state to set the component
 */
function Component$_setState(state) {
	if (state.facetsStates)
		_.eachKey(state.facetsStates, function(fctState, fctName) {
			var facet = this[fctName];
			if (facet && typeof facet.setState == 'function')
				facet.setState(fctState);
		}, this);
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
