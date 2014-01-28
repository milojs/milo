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

var _makeComponentConditionFunc = componentUtils._makeComponentConditionFunc;


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
 * - [createOnElement](#createOnElement)
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
	createFromState: Component$$createFromState,
	createFromDataTransfer: createFromDataTransfer
});
delete Component.createFacetedClass;


/**
 * ####Component instance methods####
 *
 * - [init](#Component$init)
 * - [initElement](#Component$initElement)
 * - [addFacet](#Component$addFacet)
 * - [allFacets](#Component$allFacets)
 * - [remove](#Component$remove)
 * - [getScopeParent](#Component$getScopeParent)
 */
_.extendProto(Component, {
	init: Component$init,
	initElement: Component$initElement,
	hasFacet: Component$hasFacet,
	addFacet: Component$addFacet,
	allFacets: Component$allFacets,
	remove: Component$remove,
	getState: Component$getState,
	getTransferState: Component$getTransferState,
	_getState: Component$_getState,
	setState: Component$setState,
	getScopeParent: Component$getScopeParent,
	getTopScopeParent: Component$getTopScopeParent,
	getScopeParentWithClass: Component$getScopeParentWithClass,
	getTopScopeParentWithClass: Component$getTopScopeParentWithClass,
    walkScopeTree: Component$walkScopeTree
});

var COMPONENT_DATA_TYPE_PREFIX = 'x-application/milo-component';
var COMPONENT_DATA_TYPE_REGEX = /x-application\/milo-component\/([a-z_$][0-9a-z_$]*)(?:\/())/i;

/**
 * Component class method
 * Creates a subclass of component from the map of configured facets.
 * This method wraps and replaces [`createFacetedClass`](../abstract/faceted_object.js.html#createFacetedClass) class method of FacetedObject.
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
			if (! aComponent.hasFacet(FacetClass))
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
	check(component, Component);
	check(deepCopy, Match.Optional(Boolean));

	if (deepCopy && !component.container) 
		throw new ComponentError('Cannot deep copy component without container facet');

	// copy DOM element, using Dom facet if it is available
	var newEl = component.dom 
					? component.dom.copy(deepCopy)
					: component.el.cloneNode(deepCopy);

	var ComponentClass = component.constructor;

	// create component of the same class on the element
	var aComponent = ComponentClass.createOnElement(newEl, undefined, component.scope, component.extraFacets);

	aComponent.setState(component._getState(deepCopy || false));

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
 * @param {Array[String]} extraFacets list of extra facet to add to component
 * @return {Subclass(Component)}
 */
function Component$$createOnElement(el, innerHTML, rootScope, extraFacets) {
	check(innerHTML, Match.Optional(String));
	check(rootScope, Match.Optional(Scope));
	check(extraFacets, Match.Optional([String]));

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
	attr.compFacets = extraFacets;
	attr.decorate();

	// insert HTML
	if (innerHTML)
		el.innerHTML = innerHTML;

	miloBinder(el, rootScope);

	return rootScope[attr.compName];
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

	var miloBinder = require('../binder');

	// create wrapper element optionally renaming component
	var wrapEl = _createComponentWrapElement(state, newUniqueName);

	// instantiate all components from HTML
	var scope = miloBinder(wrapEl);

	// as there should only be one component, call to _any will return it
	var component = scope._any();

	// set component's scope
	if (rootScope) {
		component.scope = rootScope;
		rootScope._add(component);
	}

	// restore component state
	component.setState(state);

    component.walkScopeTree(function(comp) {
        comp.postMessage('stateready');
    });

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
function Component$init(scope, element, name, componentInfo) {
	// create DOM element if it wasn't passed to Constructor
	this.el = element || this.initElement();

	// store reference to component on DOM element
	if (this.el) {
		// check that element does not have a component already atached
		var elComp = this.el[config.componentRef];
		if (elComp)
		 	logger.warn('component ' + name + ' attached to element that already has component ' + elComp.name);

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
function Component$initElement() {
	if (typeof document == 'undefined')
		return;

	if (this.dom)
		this.dom.newElement();
	else
		this.el = document.createElement('DIV');

	return this.el;
}


/**
 * Component instance method
 * Returns true if component has facet
 *
 * @param {Function|String} facetNameOrClass
 * @return {Boolean}
 */
function Component$hasFacet(facetNameOrClass) {
	var facetName = _.firstLowerCase(typeof facetNameOrClass == 'function'
										? facetNameOrClass.name
										: facetNameOrClass);

	var facet = this[facetName];
	if (! facet instanceof ComponentFacet)
	 	logger.warn('expected facet', facetName, 'but this property name is used for something else');

	return !! facet;
}


/**
 * Component instance method.
 * Adds facet with given name or class to the instance of Component (or its subclass).
 * 
 * @param {String|Subclass(Component)} facetNameOrClass name of facet class or the class itself. If name is passed, the class will be retireved from facetsRegistry
 * @param {Object} facetConfig optional facet configuration
 * @param {String} facetName optional facet name. Allows to add facet under a name different from the class name supplied.
 */
function Component$addFacet(facetNameOrClass, facetConfig, facetName) {
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
function Component$allFacets(method) { // ,... arguments
	var args = _.slice(arguments, 1);

	return _.mapKeys(this.facets, function(facet, fctName) {
		if (facet && typeof facet[method] == 'function')
			return facet[method].apply(facet, args);
	});
}


/**
 * Component instance method.
 * Removes component from its scope.
 *
 * @param {Boolean} preserveScopeProperty true not to delete scope property of component
 */
function Component$remove(preserveScopeProperty) {
	if (this.scope)
		this.scope._remove(this.name, preserveScopeProperty);
}


/**
 * Component instance method
 * Retrieves all component state, including information about its class, extra facets, facets data and all scope children.
 * This information is used to save/load, copy/paste and drag/drop component 
 * Returns component state
 *
 * @this {Component} component which state will be saved
 * @return {Object}
 */
function Component$getState() {
	var state = this._getState(true);
	state.outerHTML = this.el.outerHTML;
	return state;
}


/**
 * Component instance method
 * Retrieves all component state, including information about its class, extra facets, facets data and all scope children.
 * This information is used to save/load, copy/paste and drag/drop component 
 * If component has [Transfer](./c_facets/Transfer.js.html) facet on it, this method retrieves state from this facet
 * Returns component state
 *
 * @this {Component} component which state will be saved
 * @return {Object}
 */
function Component$getTransferState() {
	return this.transfer
			? this.transfer.getState()
			: this.getState();
}


/**
 * Component instance method
 * Returns the state of component
 * Used by class method `Component.getState` and by [Container](./c_facets/Container.js.html) facet.
 *
 * @private
 * @param {Boolean} deepState false to get shallow state from all facets (true by default)
 * @return {Object}
 */
function Component$_getState(deepState){
	var facetsStates = this.allFacets('getState', deepState === false ? false : true);
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
function Component$setState(state) {
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
 * If `conditionOrFacet` parameter is not specified, an immediate parent will be returned, otherwise the closest ancestor with a specified facet or passing condition test.
 *
 * @param {Function|String} conditionOrFacet optional condition that component should pass (or facet name it should contain)
 * @return {Component|undefined}
 */
function Component$getScopeParent(conditionOrFacet) {
	check(conditionOrFacet, Match.Optional(Match.OneOf(Function, String)));
	var conditionFunc = _makeComponentConditionFunc(conditionOrFacet);
	return _getScopeParent.call(this, conditionFunc);	
}

function _getScopeParent(conditionFunc) {
	var parentContainer = this.scope && this.scope._hostObject
		, parent = parentContainer && parentContainer.owner;

	// Where there is no parent, this function will return undefined
	// The parent component is checked recursively
	if (parent) {
		if (! conditionFunc || conditionFunc(parent) )
			return parent;
		else
			return _getScopeParent.call(parent, conditionFunc);
	}
}


/**
 * Component instance method
 * Returns scope parent with a given class, with same class if not specified
 *
 * @param {[Function]} ComponentClass component class that the parent should have, same class by default
 * @return {Component}
 */
function Component$getScopeParentWithClass(ComponentClass) {
	ComponentClass = ComponentClass || this.constructor;
	return _getScopeParent.call(this, function(comp) {
		return comp instanceof ComponentClass;
	})
}


/**
 * Component instance method.
 * Returns the topmost scope parent of a component.
 * If `conditionOrFacet` parameter is not specified, the topmost scope parent will be returned, otherwise the topmost ancestor with a specified facet or passing condition test.
 *
 * @param {Function|String} conditionOrFacet optional condition that component should pass (or facet name it should contain)
 * @return {Component|undefined}
 */
function Component$getTopScopeParent(conditionOrFacet) {
	check(conditionOrFacet, Match.Optional(Match.OneOf(Function, String)));
	var conditionFunc = _makeComponentConditionFunc(conditionOrFacet);
	return _getTopScopeParent.call(this, conditionFunc);	
}

function _getTopScopeParent(conditionFunc) {
	var topParent
		parent = this;
	do {
		var parent = _getScopeParent.call(parent, conditionFunc);
		if (parent)
			topParent = parent;
	} while (parent);

	return topParent;
}


/**
 * Component instance method
 * Returns scope parent with a given class, with same class if not specified
 *
 * @param {[Function]} ComponentClass component class that the parent should have, same class by default
 * @return {Component}
 */
function Component$getTopScopeParentWithClass(ComponentClass) {
	ComponentClass = ComponentClass || this.constructor;
	return _getTopScopeParent.call(this, function(comp) {
		return comp instanceof ComponentClass;
	})
}


/**
 * Walks component tree, calling provided callback on each component
 *
 *
 * @param callback
 * @param thisArg
 */
function Component$walkScopeTree(callback, thisArg) {
    callback.call(thisArg, this);
    if (!this.container) return;
    this.container.scope._each(function(component) {
        component.walkScopeTree(callback, thisArg);
    });
}
