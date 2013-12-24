'use strict';

// <a name="components"></a>
// component class
// --------------

// Basic component class.

// It's constructor accepts DOM element and component name as paramenters.

// You do not need to use its constructor directly as binder module creates
// components when it scans DOM tree.

// You should use Component.createComponentClass method when you want to create
// a new component class from facets and their configuration.

var FacetedObject = require('../facets/f_object')
	, facetsRegistry = require('./c_facets/cf_registry')
	, ComponentFacet = facetsRegistry.get('ComponentFacet')
	, componentUtils = require('./c_utils')
	, Messenger = require('../messenger')
	, _ = require('mol-proto')
	, check = require('../util/check')
	, Match = check.Match
	, config = require('../config')
	, miloCount = require('../util/count');


var Component = _.createSubclass(FacetedObject, 'Component', true);

module.exports = Component;


Component.createComponentClass = createComponentClass;
delete Component.createFacetedClass;


// class methods
_.extend(Component, {
	create: create,
	copy: copy,
	isComponent: componentUtils.isComponent,
	getComponent: componentUtils.getComponent,
	getContainingComponent: componentUtils.getContainingComponent,
	_getScopeParent: _getScopeParent
});

// instance methods
_.extendProto(Component, {
	init: init,
	initElement: initElement,
	addFacet: addFacet,
	allFacets: allFacets,
	remove: remove,
	getScopeParent: getScopeParent
});


//
// class methods
//

// create component from ComponentInfo
function create(info) {
	var ComponentClass = info.ComponentClass;
	var aComponent = new ComponentClass(info.scope, info.el, info.name, info);

	if (info.extraFacetsClasses)
		_.eachKey(info.extraFacetsClasses, function(FacetClass) {
			aComponent.addFacet(FacetClass);
		});

	return aComponent;
}


// creates a new instance with the same state but different element
function copy(component, deepCopyDOM) {
	var ComponentClass = component.constructor
		, newName = 'milo_' + miloCount()
		, newEl = component.dom 
					? component.dom.copy(deepCopyDOM)
					: component.el.cloneNode(deepCopyDOM)
		, newInfo = _.clone(component.componentInfo)
		, attr = _.clone(newInfo.attr);

	_.extend(attr, {
		el: newEl,
		compName: newName
	});

	attr.decorate();

	_.extend(newInfo, {
		el: newEl,
		name: newName,
		attr: attr
	});

	var aComponent = Component.create(newInfo);
	component.scope._add(aComponent, aComponent.name);

	return aComponent;
}


function createComponentClass(name, facetsConfig) {
	var facetsClasses = {};

	if (Array.isArray(facetsConfig)) {
		var configMap = {};
		facetsConfig.forEach(function(fct) {
			var fctName = _.firstLowerCase(fct);
			configMap[fctName] = {};
		});
		facetsConfig = configMap;
	}

	_.eachKey(facetsConfig, function(fctConfig, fct) {
		var fctName = _.firstLowerCase(fct);
		var fctClassName = _.firstUpperCase(fct);
		facetsClasses[fctName] = facetsRegistry.get(fctClassName);
	});

	var ComponentClass = FacetedObject.createFacetedClass.call(this, name, facetsClasses, facetsConfig);
	
	return ComponentClass;
};


//
// instance methods
//

// initializes component
// Automatically called by inherited constructor of FacetedObject
// Subclasses should call inherited init methods:
// Component.prototype.init.apply(this, arguments)
function init(scope, element, name, componentInfo) {
	this.el = element || this.initElement();

	if (this.el)
		this.el[config.componentRef] = this;

	_.defineProperties(this, {
		name: name,
		scope: scope,
		componentInfo: componentInfo
	}, true);

	var messenger = new Messenger(this, Messenger.defaultMethods, undefined /* no messageSource */);

	_.defineProperty(this, '_messenger', messenger);

	// start all facets
	this.allFacets('check');
	this.allFacets('start');
}

/**
 * Initializes the element which this component is bound to
 *
 * This method is called when a component is instantiated outside the dom and
 * will generate a new element for the component.
 * 
 * @return {Element}
 */
function initElement() {
	if (typeof document === 'undefined') {
		return;
	}

	if (this.dom)
		this.dom.newElement();
	else
		this.el = document.createElement('DIV');
}

function addFacet(facetNameOrClass, facetOpts, facetName) {
	check(facetNameOrClass, Match.OneOf(String, Match.Subclass(ComponentFacet)));
	check(facetOpts, Match.Optional(Object));
	check(facetName, Match.Optional(String));

	if (typeof facetNameOrClass == 'string') {
		var facetClassName = _.firstUpperCase(facetNameOrClass);
		var FacetClass = facetsRegistry.get(facetClassName);
	} else 
		FacetClass = facetNameOrClass;

	facetName = facetName || _.firstLowerCase(FacetClass.name);

	var newFacet = FacetedObject.prototype.addFacet.call(this, FacetClass, facetOpts, facetName);

	// start facet
	newFacet.check && newFacet.check();
	newFacet.start && newFacet.start();
}

// envoke given method with optional parameters on all facets
function allFacets(method /* , ... */) {
	var args = _.slice(arguments, 1);

	_.eachKey(this.facets, function(facet, fctName) {
		if (facet && typeof facet[method] == 'function')
			facet[method].apply(facet, args);
	});
}

// remove component from it's scope
function remove() {
	if (this.scope)
		delete this.scope[this.name];
}


/**
 * getScopeParent
 *
 * Instance method of Component. Returns the scope parent of a component.
 * If `withFacet` parameter is not specified, an immediate parent
 * will be returned, otherwise the closest ancestor with a specified facet.
 *
 * @param {String} withFacet optional string name of the facet, the case of the first letter is ignored, so both facet name and class name can be used
 * @return {Component|undefined}
 */
function getScopeParent(withFacet) {
	check(withFacet, Match.Optional(String));
	withFacet = _.firstLowerCase(withFacet);
	this._getScopeParent(withFacet);	
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
