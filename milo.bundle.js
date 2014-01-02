;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var _ = require('mol-proto')
	, check = require('../util/check')
	, Match = check.Match
	, MixinError = require('../util/error').Mixin;


module.exports = Mixin;

/**
 * `milo.classes.Mixin` - an abstract Mixin class.
 * Can be subclassed using:
 * ```
 * var MyMixin = _.createSubclass(milo.classes.Mixin, 'MyMixin');
 * ```
 *
 * Mixin pattern is also used, but Mixin in milo is implemented as a separate object that is stored on the property of the host object and can create proxy methods on the host object if required.
 * Classes [Messenger](../messenger/index.js.html) and [MessageSource](../messenger/message_source.js.html) are subclasses of Mixin abstract class. `this` in proxy methods refers to Mixin instance, the reference to the host object is `this._hostObject`.
 *
 * @param {Object} hostObject Optional object where a Mixin instance will be stored on. It is used to proxy methods and also to find the reference when it is needed for host object implementation.
 * @param {Object} proxyMethods Optional map of proxy method names as keys and Mixin methods names as values, so proxied methods can be renamed to avoid name-space conflicts if two different Mixin instances with the same method names are put on the object
 * @param {List} arguments all constructor arguments will be passed to init method of Mixin subclass together with hostObject and proxyMethods
 * @return {Mixin}
 */
function Mixin(hostObject, proxyMethods) { // , other args - passed to init method
	check(hostObject, Match.Optional(Match.OneOf(Object, Function)));
	check(proxyMethods, Match.Optional(Match.ObjectHash(String)));

	// store hostObject
	_.defineProperty(this, '_hostObject', hostObject);

	// proxy methods to hostObject
	if (proxyMethods)
		this._createProxyMethods(proxyMethods);

	// calling init if it is defined in the class
	if (this.init)
		this.init.apply(this, arguments);
}


/**
 * ####Mixin instance methods####
 * These methods are called by constructor, they are not to be called from subclasses.
 *
 * - [_createProxyMethod](#_createProxyMethod)
 * - [_createProxyMethods](#_createProxyMethods)
 */
_.extendProto(Mixin, {
	_createProxyMethod: _createProxyMethod,
	_createProxyMethods: _createProxyMethods
});


/**
 * Creates a proxied method of Mixin subclass on host object.
 *
 * @param {String} mixinMethodName name of method in Mixin subclass
 * @param {String} proxyMethodName name of created proxy method on host object
 * @param {Object} hostObject Optional reference to the host object; if not specified the host object passed to constructor wil be used. It allows to use the same instance of Mixin on two host objects.
 */
function _createProxyMethod(proxyMethodName, mixinMethodName, hostObject) {
	hostObject = hostObject || this._hostObject;

	// Mixin class does not allow shadowing methods that exist on the host object
	if (hostObject[proxyMethodName])
		throw new MixinError('method ' + proxyMethodName +
								 ' already defined in host object');

	check(this[mixinMethodName], Function);

	// Bind proxied Mixin's method to Mixin instance
	var boundMethod = this[mixinMethodName].bind(this);

	Object.defineProperty(hostObject, proxyMethodName,
		{ value: boundMethod, writable: true });
}


/**
 * Creates proxied methods of Mixin subclass on host object.
 *
 * @param {Hash[String]} proxyMethods map of names of methods, key - proxy method, value - mixin method.
 * @param {Object} hostObject an optional reference to the host object; if not specified the host object passed to constructor wil be used. It allows to use the same instance of Mixin on two host objects.
 */
function _createProxyMethods(proxyMethods, hostObject) {
	// creating and binding proxy methods on the host object
	_.eachKey(proxyMethods, function(mixinMethodName, proxyMethodName) {
		this._createProxyMethod(proxyMethodName, mixinMethodName, hostObject);
	}, this);
}

},{"../util/check":58,"../util/error":62,"mol-proto":70}],2:[function(require,module,exports){
'use strict';


var _ = require('mol-proto');

module.exports = Facet;


/**
 * `milo.classes.Facet`
 * Base Facet class is an ancestor of [ComponentFacet](../components/c_facet.js.html) class, the main building block in milo.
 * 
 * @param {FacetedObject} owner an instance of FacetedObject subclass that stores the facet on its property  with the same name as `name` property of facet
 * @param {Object} config optional facet configuration, used in subclasses
 */
function Facet(owner, config) {
	this.name = _.firstLowerCase(this.constructor.name);
	this.owner = owner;
	this.config = config || {};
	this.init.apply(this, arguments);
}


/**
 * `init` method of subclass will be called by Facet constructor.
 */
_.extendProto(Facet, {
	init: function() {}
});

},{"mol-proto":70}],3:[function(require,module,exports){
'use strict';


var Facet = require('./facet')
	, _ = require('mol-proto')
	, check = require('../util/check')
	, Match = check.Match
	, FacetError = require('../util/error').Facet;

module.exports = FacetedObject;


/**
 * `milo.classes.FacetedObject`
 * Component class is based on an abstract ```FacetedObject``` class. This class can be used in any situation where objects can be represented via collection of facets (a facet is an object of a certain class, it holds its own configuration, data and methods).
 * In a way, "facets pattern" is an inversion of "adapter pattern" - while the latter allows finding a class/methods that has specific functionality, faceted object is simply constructed to have these functionalities.
 * With this architecture it is possible to create a virtually unlimited number of component classes with a very limited number of building blocks without having any hierarchy of classes - all components inherit directly from Component class.
 *
 * This constructor should be called by all subclasses constructor (it will happen automatically if a subclass is created with `_.createSubclass`).
 *
 * @return {FacetedObject}
 */
function FacetedObject() {
	// this.facetsConfig and this.facetsClasses were stored on a specific class prototype
	// when the class was created by FacetedObject.createFacetedClass
	var facetsConfig = this.facetsConfig || {};

	var facetsDescriptors = {}
		, facets = {};

	// FacetedObject class itself is not meant to be instantiated - it has no facets
	// It may change, as adding facets is possible to instances
	if (this.constructor == FacetedObject)		
		throw new FacetError('FacetedObject is an abstract class, can\'t be instantiated');

	// instantiate class facets
	if (this.facetsClasses)
		_.eachKey(this.facetsClasses, instantiateFacet, this, true);

	// add facets to the class as properties under their own name
	Object.defineProperties(this, facetsDescriptors);

	// store all facets on `facets` property so that they can be enumerated
	Object.defineProperty(this, 'facets', { value: facets });	

	// call `init`method if it is defined in subclass
	if (this.init)
		this.init.apply(this, arguments);

	// instantiate facet with a given class (FacetClass) and name (facetName)
	function instantiateFacet(FacetClass, facetName) {
		// get facet configuration
		var fctConfig = facetsConfig[facetName];

		// instatiate facets
		facets[facetName] = new FacetClass(this, fctConfig);

		// add facet to property descriptors
		facetsDescriptors[facetName] = {
			enumerable: true,
			value: facets[facetName]
		};
	}
}


/**
 * ####FacetedObject class methods####
 *
 * - [createFacetedClass](#createFacetedClass)
 * - [hasFacet](#hasFacet)
 */
_.extend(FacetedObject, {
	createFacetedClass: createFacetedClass,
	hasFacet: hasFacet
});


/**
 * ####FacetedObject instance methods####
 *
 * - [addFacet](#addFacet)
 */
_.extendProto(FacetedObject, {
	addFacet: addFacet
});


/**
 * FacetedObject instance method.
 * Adds a facet to the instance of FacetedObject subclass.
 * Returns an instance of the facet that was created.
 *
 * @param {Function} FacetClass facet class constructor
 * @param {Object} facetConfig optional facet configuration
 * @param {String} facetName optional facet name, FacetClass.name will be used if facetName is not passed.
 * @return {Facet}
 */
function addFacet(FacetClass, facetConfig, facetName) {
	check(FacetClass, Function);
	check(facetName, Match.Optional(String));

	// first letter of facet name should be lowercase
	facetName = _.firstLowerCase(facetName || FacetClass.name);

	// get facets defined in class
	var protoFacets = this.constructor.prototype.facetsClasses;

	// check that this facetName was not already used in the class
	if (protoFacets && protoFacets[facetName])
		throw new FacetError('facet ' + facetName + ' is already part of the class ' + this.constructor.name);

	// check that this faceName does not already exist on the faceted object
	if (this[facetName])
		throw new FacetError('facet ' + facetName + ' is already present in object');

	// instantiate the facet
	var newFacet = this.facets[facetName] = new FacetClass(this, facetConfig);

	// add facet to faceted object
	Object.defineProperty(this, facetName, {
		enumerable: true,
		value: newFacet
	});

	return newFacet;
}


/**
 * FacetedObject class method
 * Returns reference to the facet class if the facet with `facetName` is part of the class, `undefined` otherwise. If subclass is created using _.createSubclass (as it should be) it will also have this method.
 * 
 * @param {Subclass(FacetedObject)} this this in this method refers to FacetedObject (or its subclass) that calls this method
 * @param {String} facetName
 * @return {Subclass(Facet)|undefined} 
 */
function hasFacet(facetName) {
	// this refers to the FacetedObject class (or subclass), not instance
	var protoFacets = this.prototype.facetsClasses;
	return protoFacets && protoFacets[facetName];
}


/**
 * FacetedObject class method
 * Class factory that creates classes (constructor functions) from the maps of facets and their configurations.
 * Created class will be subclass of `FacetedObject`.
 *
 * @param {Subclass(FacetedObject)} this this in this method refers to FacetedObject (or its subclass) that calls this method
 * @param {String} name class name (will be function name of class constructor function)
 * @param {Object[Subclass(Facet)]} facetsClasses map of classes of facets that will constitute the created class
 * @param {Object[Object]} facetsConfig map of facets configuration, should have the same keys as the map of classes. Some facets may not have configuration, but the configuration for a facet that is not included in facetsClasses will throw an exception
 * @return {Subclass(FacetedObject)}
 */
function createFacetedClass(name, facetsClasses, facetsConfig) {
	check(name, String);
	check(facetsClasses, Match.ObjectHash(Match.Subclass(Facet, true)));
	check(facetsConfig, Match.Optional(Object));

	// throw exception if config passed for facet for which there is no class
	if (facetsConfig)
		_.eachKey(facetsConfig, function(fctConfig, fctName) {
			if (! facetsClasses.hasOwnProperty(fctName))
				throw new FacetError('configuration for facet (' + fctName + ') passed that is not in class');
		});

	// create subclass of the current class (this refers to the class that calls this method)
	var FacetedClass = _.createSubclass(this, name, true);

	// store facets classes and configurations of class prototype
	_.extendProto(FacetedClass, {
		facetsClasses: facetsClasses,
		facetsConfig: facetsConfig
	});

	return FacetedClass;
};

},{"../util/check":58,"../util/error":62,"./facet":2,"mol-proto":70}],4:[function(require,module,exports){
module.exports=require(1)
},{"../util/check":58,"../util/error":62,"mol-proto":70}],5:[function(require,module,exports){
'use strict';

var _ = require('mol-proto')
	, RegistryError = require('../util/error').Registry
	, check = require('../util/check')
	, Match = check.Match;

module.exports = ClassRegistry;


/**
 * `milo.classes.ClassRegistry` - the registry of classes class.
 * Components and Facets register themselves in registries. It allows to avoid requiring them from one module and prevents circular dependencies between modules.
 * 
 * @param {Function} FoundationClass All classes that are registered in the registry should be subclasses of the FoundationClass
 * @return {Object}
 */
function ClassRegistry (FoundationClass) {
	if (FoundationClass)
		this.setClass(FoundationClass);

	this.__registeredClasses = {};
}


/**
 * ####ClassRegistry instance methods####
 *
 * - [add](#add)
 * - [get](#get)
 * - [remove](#remove)
 * - [clean](#clean)
 * - [setClass](#setClass)
 */
_.extendProto(ClassRegistry, {
	add: add,
	get: get,
	remove: remove,
	clean: clean,
	setClass: setClass
});


/**
 * ClassRegistry instance method that registers a class in the registry.
 * The method will throw an exception if a class is registered under the same name as previously registered class.
 * The method allows registering the same class under a different name, so class aliases can be created.
 *
 * @param {Function} aClass class to register in the registry. Should be subclass of `this.FoundationClass`.
 * @param {String} name Optional class name. If class name is not specified, it will be taken from constructor function name. Class name should be a valid identifier and cannot be an empty string.
 */
function add(aClass, name) {
	name = name || aClass.name;

	check(name, Match.IdentifierString, 'class name must be identifier string');

	if (this.FoundationClass) {
		if (aClass != this.FoundationClass)
			check(aClass, Match.Subclass(this.FoundationClass), 'class must be a sub(class) of a foundation class');
	} else
		throw new RegistryError('foundation class must be set before adding classes to registry');

	if (this.__registeredClasses[name])
		throw new RegistryError('class "' + name + '" is already registered');

	this.__registeredClasses[name] = aClass;
};


/**
 * Gets class from registry by name
 *
 * @param {String} name Class name
 * @return {Function}
 */
function get(name) {
	check(name, String, 'class name must be string');
	return this.__registeredClasses[name];
};


/**
 * Remove class from registry by its name.
 * If class is not registered, this method will throw an exception.
 * 
 * @param {String|Function} nameOrClass Class name. If class constructor is supplied, its name will be used.
 */
function remove(nameOrClass) {
	check(nameOrClass, Match.OneOf(String, Function), 'class or name must be supplied');

	var name = typeof nameOrClass == 'string'
						? nameOrClass
						: nameOrClass.name;
						
	if (! this.__registeredClasses[name])
		throw new RegistryError('class is not registered');

	delete this.__registeredClasses[name];
};


/**
 * Removes all classes from registry.
 */
function clean() {
	this.__registeredClasses = {};
};


/**
 * Sets `FoundationClass` of the registry. It should be set before any class can be added.
 *
 * @param {Function} FoundationClass Any class that will be added to the registry should be a subclass of this class. FoundationClass itself can be added to the registry too.
 */
function setClass(FoundationClass) {
	check(FoundationClass, Function);
	Object.defineProperty(this, 'FoundationClass', {
		enumerable: true,
		value: FoundationClass
	});
}

},{"../util/check":58,"../util/error":62,"mol-proto":70}],6:[function(require,module,exports){
'use strict';

var Attribute = require('./a_class')
	, AttributeError = require('../util/error').Attribute
	, config = require('../config')
	, _ = require('mol-proto')
	, check = require('../util/check')
	, Match = check.Match;


var attrRegExp= /^([^\:\[\]]*)(?:\[([^\:\[\]]*)\])?\:?([^:]*)$/
	, facetsSplitRegExp = /\s*(?:\,|\s)\s*/
	, attrTemplate = '%compClass%compFacets:%compName';


/**
 * `milo.attributes.bind`
 * BindAttribute class parses/validates/etc. an attribute that binds DOM elements to milo components.
 * Possible attribute values are:
 *
 * - `:myView` - only component name
 * - `View:myView` - class and component name
 * - `[Events, Data]:myView` - facets and component name
 * - `View[Events]:myView` - class, facet(s) and component name
 *
 * See [binder](../binder.js.html) for more information.
 */
var BindAttribute = _.createSubclass(Attribute, 'BindAttribute', true);


/**
 * ####BindAttribute instance methods####
 *
 * - [attrName](#attrName)
 * - [parse](#parse)
 * - [validate](#validate)
 * - [render](#render)
 */
_.extendProto(BindAttribute, {
	attrName: attrName,
	parse: parse,
	validate: validate,
	render: render
});


module.exports = BindAttribute;


/**
 * BindAttribute instance method that returns attribute name, by default - `'ml-bind'`.
 * To configure bind attribute name use:
 * ```
 * milo.config({ attrs: { bind: 'cc-bind' } }); // will set bind attribute to 'cc-bind'
 * ```
 *
 * @return {String}
 */
function attrName() {
	return config.attrs.bind;
}


/**
 * BindAttribute instance method that parses bind attribute if it is present on the element.
 * It defines properties `compClass`, `compFacets` and `compName` on BindAttribute instance.
 * Returns the instance for method chaining.
 *
 * @return {BindAttribute}
 */
 function parse() {
	if (! this.node) return;

	var value = this.get();

	if (value)
		var bindTo = value.match(attrRegExp);

	if (! bindTo)
		throw new AttributeError('invalid bind attribute ' + value);

	this.compClass = bindTo[1] || 'Component';
	this.compFacets = (bindTo[2] && bindTo[2].split(facetsSplitRegExp)) || undefined;
	this.compName = bindTo[3] || undefined;

	return this;
}


/**
 * BindAttribute instance method that validates bind attribute, throws if it has an invalid value.
 * Returns the instance for method chaining.
 *
 * @return {BindAttribute}
 */
function validate() {
	check(this.compName, Match.IdentifierString);

	if (! this.compClass)
		throw new AttributeError('empty component class name ' + this.compClass);

	return this;
}


/**
 * BindAttribute instance method that returns the attribute value for given values of properties `compClass`, `compName` and `compFacets`.
 * If `this.compName` is not set it will be generated automatically.
 *
 * @return {String}
 */
function render() {
	this.compName = this.compName || milo.util.componentName();
	return attrTemplate
				.replace('%compClass', this.compClass || '')
				.replace('%compFacets', this.compFacets
											? '[' + this.compFacets.join(', ') + ']'
											: '')
				.replace('%compName', this.compName);
}

},{"../config":42,"../util/check":58,"../util/error":62,"./a_class":7,"mol-proto":70}],7:[function(require,module,exports){
'use strict';

var _ = require('mol-proto')
	, check = require('../util/check')
	, Match = check.Match
	, toBeImplemented = require('../util/error').toBeImplemented;


module.exports = Attribute;


/**
 * An absctract class for parsing and validation of element attributes.
 * Subclasses should define methods `attrName`, `parse`, `validate` and `render`.
 *
 * @param {Element} el DOM element where attribute is attached
 * @param {String} name Optional name of the attribute, usually supplied by subclass via `attrName` method
 */
function Attribute(el, name) {
	this.name = name || this.attrName();
	this.el = el;

	// attribute node
	this.node = el.attributes[this.name];
}


/**
 * ####Attribute instance methods####
 *
 * - [get](#get)
 * - [set](#set)
 * - [decorate](#decorate)
 *
 * The following instance methods should be defined by subclass
 *
 * - attrName - should return attribute name
 * - parse - should parse attribute value
 * - validate - should validate attribute value, throwing exception if it is incorrect 
 * - render - should return attribute value for a given attribute state (other properties, as defined in subclass)
 */
_.extendProto(Attribute, {
	get: get,
	set: set,
	decorate: decorate,

	// should be defined in subclass
	attrName: toBeImplemented,
	parse: toBeImplemented,
	validate: toBeImplemented,
	render: toBeImplemented
});


/**
 * Attribute instance method that returns attribute value as string.
 *
 * @return {String}
 */
function get() {
	return this.el.getAttribute(this.name);
}


/**
 * Attribute instance method that sets attribute value.
 *
 * @param {String} value
 */
function set(value) {
	this.el.setAttribute(this.name, value);
}


/**
 * Attribute instance method that decorates element with its rendered value.
 * Uses `render` method that should be defiend in subclass.
 */
function decorate() {
	this.set(this.render());
}

},{"../util/check":58,"../util/error":62,"mol-proto":70}],8:[function(require,module,exports){
'use strict';

var Attribute = require('./a_class')
	, AttributeError = require('../util/error').Attribute
	, config = require('../config')
	, _ = require('mol-proto');


/**
 * `milo.attributes.load`
 * LoadAttribute class parses/validates/etc. an attribute that loads sub-views into the page.
 * Attribute value should be URL of the file to load subview from.
 * See [loader](../loader.js.html) for more information.
 */
var LoadAttribute = _.createSubclass(Attribute, 'LoadAttribute', true);


/**
 * ####LoadAttribute instance methods####
 *
 * - [attrName](#attrName)
 * - [parse](#parse)
 * - [validate](#validate)
 * - [render](#render)
 */
_.extendProto(LoadAttribute, {
	attrName: attrName,
	parse: parse,
	validate: validate,
	render: render
});

module.exports = LoadAttribute;


/**
 * BindAttribute instance method that returns attribute name, by default - `'ml-load'`.
 * To configure load attribute name use:
 * ```
 * milo.config({ attrs: { load: 'cc-load' } }); // will set bind attribute to 'cc-load'
 * ```
 *
 * @return {String}
 */
function attrName() {
	return config.attrs.load;
}


/**
 * LoadAttribute instance method that parses load attribute if it is present on the element.
 * It defines property `loadUrl` on LoadAttribute instance.
 * Returns the instance for method chaining.
 *
 * @return {LoadAttribute}
 */
function parse() {
	if (! this.node) return;

	this.loadUrl = this.get();
	return this;
}


/**
 * LoadAttribute instance method that should validate load attribute and throw if it has an invalid value.
 * TODO - implement url validation.
 * Returns the instance for method chaining.
 *
 * @return {LoadAttribute}
 */
function validate() {
	// TODO url validation
	return this;
}


/**
 * LoadAttribute instance method - returns URL
 *
 * @return {String}
 */
function render() {
	return this.loadUrl;
}

},{"../config":42,"../util/error":62,"./a_class":7,"mol-proto":70}],9:[function(require,module,exports){
'use strict';

/**
 * Subclasses of [Attribute](./a_class.js.html) class
 *
 * - [BindAttribute](./a_bind.js.html)
 * - [LoadAttribute](./a_load.js.html)
 */
var attributes = module.exports = {
	bind: require('./a_bind'),
	load: require('./a_load')
};

},{"./a_bind":6,"./a_load":8}],10:[function(require,module,exports){
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
function create(scanScope) {
	var scope = new Scope(scanScope._rootEl);

	scanScope._each(function(compInfo) {
		var aComponent = Component.create(compInfo);

		scope._add(aComponent, aComponent.name);
		if (aComponent.container)
			aComponent.container.scope = create(compInfo.container.scope);
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

		if (attr.node) {
			var scopeObject = scopeObjectFactory(scope, el, attr)
				, isContainer = typeof scopeObject != 'undefined' && scopeObject.container;
		}

		if (el.childNodes && el.childNodes.length) {
			var innerScope = createScopeForChildren(el);

			if (innerScope._length()) {
				// attach inner attributes to the current one (create a new scope) ...
				if (isContainer) {
					scopeObject.container.scope = innerScope;
					innerScope._hostObject = scopeObject.container;
				} else // or keep them in the current scope
					scope._copy(innerScope);;
			}
		}

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


	function createScopeForChildren(containerEl) {
		var scope = new Scope(containerEl);
		_.forEach(utilDom.filterNodeListByType(containerEl.childNodes, 1), function(node) {
			createScopeForElement(scope, node);
		});
		return scope;
	}
}

},{"./attributes/a_bind":6,"./components/c_facets/cf_registry":27,"./components/c_info":28,"./components/c_registry":30,"./components/scope":37,"./mail":44,"./util/check":58,"./util/dom":61,"./util/error":62,"mol-proto":70}],11:[function(require,module,exports){
'use strict';

// <a name="classes"></a>
// milo.classes
// -----------

// This module contains foundation classes and class registries.

var classes = {
	Facet: require('./abstract/facet'),
	FacetedObject: require('./abstract/faceted_object'),
	ClassRegistry: require('./abstract/registry'),
	Mixin: require('./abstract/Mixin'),
	MessageSource: require('./messenger/m_source'),
	MessengerAPI: require('./messenger/m_api')
};

module.exports = classes;

},{"./abstract/Mixin":1,"./abstract/facet":2,"./abstract/faceted_object":3,"./abstract/registry":5,"./messenger/m_api":48,"./messenger/m_source":49}],12:[function(require,module,exports){
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
	}, true);

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

},{"../abstract/faceted_object":3,"../config":42,"../messenger":47,"../util/check":58,"../util/component_name":59,"./c_facets/cf_registry":27,"./c_utils":31,"mol-proto":70}],13:[function(require,module,exports){
'use strict';

// <a name="components-facet"></a>
// ###component facet class

// The class fot the facet of component. When a component is created, it
// creates all its facets.

// See Facets section on information about available facets and on 
// how to create new facets classes.

// - Component - basic compponent class
// - ComponentFacet - basic 


var Facet = require('../abstract/facet')
	, Messenger = require('../messenger')
	, FacetError = require('../util/error').Facet
	, componentUtils = require('./c_utils')
	, _ = require('mol-proto');

var ComponentFacet = _.createSubclass(Facet, 'ComponentFacet');

module.exports = ComponentFacet;


/**
 * postDomParent
 *
 * If facet has DOM parent facet (see `domParent` method), posts the message to this facet.
 *
 * @param {String} messageType
 * @param {Object} messageData
 */
var postDomParent = _.partial(_postParent, domParent);

/**
 * postScopeParent
 *
 * If facet has scope parent facet (see `scopeParent` method), posts the message to this facet.
 *
 * @param {String} messageType
 * @param {Object} messageData
 */
var postScopeParent = _.partial(_postParent, scopeParent);


_.extendProto(ComponentFacet, {
	init: initComponentFacet,
	start: startComponentFacet,
	check: checkDependencies,
	domParent: domParent,
	postDomParent: postDomParent,
	scopeParent: scopeParent,
	postScopeParent: postScopeParent,
	_createMessenger: _createMessenger,
	_setMessageSource: _setMessageSource,
	_createMessageSource: _createMessageSource,
	_createMessageSourceWithAPI: _createMessageSourceWithAPI
});


function initComponentFacet() {
	this._createMessenger();
}


function _createMessenger(){
	var messenger = new Messenger(this, Messenger.defaultMethods, undefined /* no messageSource */);

	_.defineProperties(this, {
		_messenger: messenger
	});
}


function startComponentFacet() {
	if (this.config.messages)
		this.onMessages(this.config.messages);
}


function checkDependencies() {
	if (this.require) {
		this.require.forEach(function(reqFacet) {
			var facetName = _.firstLowerCase(reqFacet);
			if (! (this.owner[facetName] instanceof ComponentFacet))
				throw new FacetError('facet ' + this.constructor.name + ' requires facet ' + reqFacet);
		}, this);
	}
}


/**
 * domParent
 * 
 * @return {ComponentFacet} reference to the facet of the same class of the closest parent DOM element, that has a component with the same facet class attached to it. If such element doesn't exist method will return undefined.
 */
function domParent() {
	var parentComponent = componentUtils.getContainingComponent(this.owner.el, false, this.name);
	return parentComponent && parentComponent[this.name];
}


/**
 * scopeParent
 * 
 * @return {ComponentFacet} reference to the facet of the same class as `this` facet of the closest scope parent (i.e., the component that has the scope of the current component in its container facet).
 */
function scopeParent() {
	var parentComponent = this.owner.getScopeParent(this.name);
	return parentComponent && parentComponent[this.name];
}


function _postParent(getParentMethod, messageType, messageData) {
	var parentFacet = getParentMethod.call(this);
	if (parentFacet)
		parentFacet.postMessage(messageType, messageData);
}


function _setMessageSource(messageSource) {
	this._messenger._setMessageSource(messageSource);
}


function _createMessageSource(MessageSourceClass, options) {
	var messageSource = new MessageSourceClass(this, undefined, this.owner, options);
	this._setMessageSource(messageSource)

	_.defineProperty(this, '_messageSource', messageSource);
}


function _createMessageSourceWithAPI(MessageSourceClass, messengerAPIOrClass, options) {
	var messageSource = new MessageSourceClass(this, undefined, messengerAPIOrClass, this.owner, options);
	this._setMessageSource(messageSource)

	_.defineProperty(this, '_messageSource', messageSource);
}

},{"../abstract/facet":2,"../messenger":47,"../util/error":62,"./c_utils":31,"mol-proto":70}],14:[function(require,module,exports){
// <a name="components-facets-container"></a>
// ###container facet

'use strict';

var ComponentFacet = require('../c_facet')
	, binder = require('../../binder')
	, _ = require('mol-proto')
	, facetsRegistry = require('./cf_registry');

// container facet
var Container = _.createSubclass(ComponentFacet, 'Container');

_.extendProto(Container, {
	init: initContainer,
	_bind: _bindComponents,
	// add: addChildComponents
});

facetsRegistry.add(Container);

module.exports = Container;


function initContainer() {
	ComponentFacet.prototype.init.apply(this, arguments);
	this.scope = {};
}


function _bindComponents() {
	// TODO
	// this function should re-bind rather than bind all internal elements
	this.scope = binder(this.owner.el);
}


function addChildComponents(childComponents) {
	// TODO
	// this function should intelligently re-bind existing components to
	// new elements (if they changed) and re-bind previously bound events to the same
	// event handlers
	// or maybe not, if this function is only used by binder to add new elements...
	_.extend(this.scope, childComponents);
}

},{"../../binder":10,"../c_facet":13,"./cf_registry":27,"mol-proto":70}],15:[function(require,module,exports){
// <a name="components-facets-data"></a>
// ###data facet

'use strict';

var Mixin = require('../../abstract/mixin')
	, ComponentFacet = require('../c_facet')
	, facetsRegistry = require('./cf_registry')

	, Messenger = require('../../messenger')
	, DOMEventsSource = require('../msg_src/dom_events')
	, DataMsgAPI = require('../msg_api/data')
	, pathUtils = require('../../model/path_utils')

	, _ = require('mol-proto')
	, logger = require('../../util/logger');


// data model connection facet
var Data = _.createSubclass(ComponentFacet, 'Data');

_.extendProto(Data, {
	start: Data$start,
	get: Data$get,
	set: Data$set,
	path: Data$path,
	_setScalarValue: Data$_setScalarValue,
	_getScalarValue: Data$_getScalarValue,
	_postDataChanged: Data$_postDataChanged,
	_prepareMessageSource: _prepareMessageSource
});

facetsRegistry.add(Data);

module.exports = Data;


// these methods will be wrapped to support "*" pattern subscriptions
var proxyDataSourceMethods = {
		// value: 'value',
		trigger: 'trigger'
	};


// start Data facet
function Data$start() {
	ComponentFacet.prototype.start.apply(this, arguments);

	this._prepareMessageSource();

	// store facet data path
	this._path = '.' + this.owner.name;

	// change messenger methods to work with "*" subscriptions (like Model class)
	pathUtils.wrapMessengerMethods.call(this);

	// subscribe to DOM event
	this.on('', onDataChange);

	// subscribe to changes in scope children with Data facet
	this.on('childdata', onChildData);
}


function _prepareMessageSource() {
	// TODO instead of this.owner should pass model? Where it is set?
	var dataAPI = new DataMsgAPI(this.owner)
		, dataEventsSource = new DOMEventsSource(this, proxyDataSourceMethods, dataAPI, this.owner);
	this._setMessageSource(dataEventsSource);

	_.defineProperty(this, '_dataEventsSource', dataEventsSource);

	// make value method of DataMsgAPI available on Data facet
	// this is a private method, get() should be used to get data.
	Mixin.prototype._createProxyMethod.call(dataAPI, 'value', 'value', this);
}


function onDataChange(msgType, data) {
	this._postDataChanged(data);
}

function onChildData(msgType, data) {
	this.postMessage(data.path, data);
	this._postDataChanged(data);
}


// Set component DOM value
function Data$set(value) {
	if (value == this._value)
		return value;

	var valueSet;
	if (typeof value == 'object') {
		if (Array.isArray(value)) {
			valueSet = [];
			value.forEach(function(item, index) {
				var childDataFacet = this.path('[' + index + ']', true); // true will create item in list
				if (childDataFacet) {
					valueSet[index] = childDataFacet.set(item);
				} else
					logger.warn('attempt to set data on path that does not exist: ' + '[' + index + ']');
			}, this);
		} else {
			valueSet = {};
			_.eachKey(value, function(item, key) {
				var childDataFacet = this.path('.' + key);
				if (childDataFacet) {
					valueSet[key] = childDataFacet.set(item);
				} else
					logger.warn('attempt to set data on path that does not exist: ' + '.' + key);
			}, this);
		}
	} else
		valueSet = this._setScalarValue(value);

	var oldValue = this._value;
	this._value = valueSet;
	this.postMessage('', { path: '', type: 'changed',
							newValue: valueSet, oldValue: oldValue });
	
	return valueSet;
}


function Data$_setScalarValue(value) {
	var el = this.owner.el
		, setter = tags[el.tagName.toLowerCase()];
	return setter
			? setter(el, value)
			: (el.innerHTML = value);
}


function Data$_postDataChanged(message) {
	// TODO compare with old value
	// this.postMessage(message.path, message);

	var thisComp = this.owner
		, parentContainer = thisComp.scope._hostObject
		, parentData = parentContainer && parentContainer.owner.data;
	
	if (parentData) {
		var parentMsg = _.clone(message);
		parentMsg.path = (this._path || ('.' + thisComp.name))  + parentMsg.path;
		parentData.postMessage('childdata', parentMsg);
	}
}


// get structured data from scope hierarchy
function Data$get() {
	var comp = this.owner
		, scopeData;

	if (comp.list) {
		scopeData = [];
		comp.list.each(function(listItem, index) {
			scopeData[index] = listItem.data.get();
		});

		if (comp.container)
			comp.container.scope._each(function(scopeItem, name) {
				if (! comp.list.contains(scopeItem) && scopeItem.data)
					scopeData[name] = scopeItem.data.get();
			});
	} else if (comp.container) {
		scopeData = {};
		comp.container.scope._each(function(scopeItem, name) {
			scopeData[name] = scopeItem.data.get();
		});
	} else
		return this._getScalarValue();

	return scopeData;
}


function Data$_getScalarValue() {
	var el = this.owner.el
		, getter = tags[el.tagName.toLowerCase()];
	return getter
			 ? getter(el)
			 : el.innerHTML;
}


// returns data facet of a child component (by scopes) corresponding to the path
function Data$path(accessPath, createItem) {
	var parsedPath = pathUtils.parseAccessPath(accessPath)
		, currentComponent = this.owner;

	for (var i = 0, len = parsedPath.length; i < len; i++) {
		var pathNode = parsedPath[i]
			, nodeKey = pathUtils.getPathNodeKey(pathNode);
		if (pathNode.syntax == 'array' && currentComponent.list) {
			var itemComponent = currentComponent.list.item(nodeKey);
			if (! itemComponent && createItem) {
				itemComponent = currentComponent.list.addItem(nodeKey);
				itemComponent.data._path = pathNode.property;
			}
			if (itemComponent)
				currentComponent = itemComponent;
		} else if (currentComponent.container)
			currentComponent = currentComponent.container.scope[nodeKey];

		if (! currentComponent || ! currentComponent.data)
			break;
	}

	return currentComponent && currentComponent.data;
}


// Set value rules
var tags = {
	'input': inputValue,
	'select': inputValue
}


// Set and get value of input
function inputValue(el, value) {
	if (value)
		return (el.value = value);
	else
		return el.value;
}

},{"../../abstract/mixin":4,"../../messenger":47,"../../model/path_utils":54,"../../util/logger":64,"../c_facet":13,"../msg_api/data":33,"../msg_src/dom_events":35,"./cf_registry":27,"mol-proto":70}],16:[function(require,module,exports){
// <a name="components-facets-dom"></a>
// ###dom facet

'use strict';

var ComponentFacet = require('../c_facet')
	, facetsRegistry = require('./cf_registry')	
	, _ = require('mol-proto')
	, check = require('../../util/check')
	, Match = check.Match
	, binder = require('../../binder')
	, BindAttribute = require('../../attributes/a_bind')
	, DomFacetError = require('../../util/error').DomFacet;


// data model connection facet
var Dom = _.createSubclass(ComponentFacet, 'Dom');

_.extendProto(Dom, {
	init: init,
	start: start,

	show: show,
	hide: hide,
	remove: remove,
	append: append,
	prepend: prepend,
	appendChildren: appendChildren,
	prependChildren: prependChildren,
	insertAfter: insertAfter,
	insertBefore: insertBefore,
	setStyle: setStyle,
	copy: copy,

	find: find,
	hasTextBeforeSelection: hasTextBeforeSelection
	// _reattach: _reattachEventsOnElementChange
});

facetsRegistry.add(Dom);

module.exports = Dom;


// initialize Dom facet
function init() {
	ComponentFacet.prototype.init.apply(this, arguments);
}

// start Dom facet
function start() {
	if (this.config.cls)
		this.owner.el.classList.add(this.config.cls);
}

// show HTML element of component
function show() {
	this.owner.el.style.display = 'block';
}

// hide HTML element of component
function hide() {
	this.owner.el.style.display = 'none';
}

function setStyle(property, value) {
	this.owner.el.style[property] = value;
}


// create a copy of DOM element using facet config if set
function copy(isDeep) {
	var tagName = this.config.tagName;
	if (! this.config.tagName)
		return this.owner.el.cloneNode(isDeep);

	var newEl = document.createElement(tagName);

	var attributes = this.config.attributes;
	if (attributes)
		_.eachKey(attributes, function(attrValue, attrName) {
			newEl.setAttribute(attrName, attrValue);
		});

	return newEl;
}


function newElement() {
	var tagName = this.config.tagName || 'DIV';
	var newEl = document.createElement(tagName);

	var attributes = this.config.attributes;
	if (attributes)
		_.eachKey(attributes, function(attrValue, attrName) {
			newEl.setAttribute(attrName, attrValue);
		});

	this.owner.el = newEl;

	return newEl;
}


// remove HTML element of component
function remove() {
	var thisEl = this.owner.el;
	thisEl.parentNode.removeChild(thisEl);
}

// append inside HTML element of component
function append(el) {
	this.owner.el.appendChild(el)
}

// prepend inside HTML element of component
function prepend(el) {
	var thisEl = this.owner.el
		, firstChild = thisEl.firstChild;
	if (firstChild)
		thisEl.insertBefore(el, firstChild);
	else
		thisEl.appendChild(el);
}

// appends children of element inside this component's element
function appendChildren(el) {
	while(el.childNodes.length)
		this.append(el.childNodes[0]);
}

// prepends children of element inside this component's element
function prependChildren(el) {
	while(el.childNodes.length)
		this.prepend(el.childNodes[el.childNodes.length - 1]);
}

function insertAfter(el) {
	var thisEl = this.owner.el
		, parent = thisEl.parentNode;
	parent.insertBefore(el, thisEl.nextSibling);
}

function insertBefore(el) {
	var thisEl = this.owner.el
		, parent = thisEl.parentNode;
	parent.insertBefore(el, thisEl);
}

var findDirections = {
	'up': 'previousNode',
	'down': 'nextNode'
};

// Finds component passing optional iterator's test
// in the same scope as the current component (this)
// by traversing DOM tree upwards (direction = "up")
// or downwards (direction = "down")
function find(direction, iterator) {
	if (! findDirections.hasOwnProperty(direction))
		throw new DomFacetError('incorrect find direction: ' + direction);

	var el = this.owner.el
		, scope = this.owner.scope
		, treeWalker = document.createTreeWalker(scope._rootEl, NodeFilter.SHOW_ELEMENT);

	treeWalker.currentNode = el;
	var nextNode = treeWalker[findDirections[direction]]()
		, componentsNames = Object.keys(scope)
		, found = false;

	while (nextNode) {
		var attr = new BindAttribute(nextNode);
		if (attr.node) {
			attr.parse().validate();
			if (scope.hasOwnProperty(attr.compName)) {
				var component = scope[attr.compName];
				if (! iterator || iterator(component)) {
					found = true;
					break;
				}
			}
		}
		treeWalker.currentNode = nextNode;
		nextNode = treeWalker[findDirections[direction]]();
	}

	if (found) return component;
}


// returns true if the element has text before selection
function hasTextBeforeSelection() {
	var selection = window.getSelection();
	if (! selection.isCollapsed) return true;
	if (selection.anchorOffset > 1) return true;

	// walk up the DOM tree to check if there are text nodes before cursor
	var treeWalker = document.createTreeWalker(this.owner.el, NodeFilter.SHOW_TEXT);
	return treeWalker.previousNode();
}


},{"../../attributes/a_bind":6,"../../binder":10,"../../util/check":58,"../../util/error":62,"../c_facet":13,"./cf_registry":27,"mol-proto":70}],17:[function(require,module,exports){
// <a name="components-facets-drag"></a>
// ###drag facet

'use strict';

var ComponentFacet = require('../c_facet')
	, facetsRegistry = require('./cf_registry')
	, DOMEventsSource = require('../msg_src/dom_events')

	, _ = require('mol-proto');


// generic drag handler, should be overridden
var Drag = _.createSubclass(ComponentFacet, 'Drag');

_.extendProto(Drag, {
	init: initDragFacet,
	start: startDragFacet,

	setHandle: setDragHandle,
	setDragData: setDragData
	// _reattach: _reattachEventsOnElementChange
});

facetsRegistry.add(Drag);

module.exports = Drag;


function initDragFacet() {
	ComponentFacet.prototype.init.apply(this, arguments);	
	this._createMessageSourceWithAPI(DOMEventsSource);
	this._dragData = {};
}


function setDragHandle(handleEl) {
	if (! this.owner.el.contains(handleEl))
		return logger.warn('drag handle should be inside element to be dragged')
	this._dragHandle = handleEl;
}

function setDragData(data) {
	this._dragData = data;
}


function startDragFacet() {
	ComponentFacet.prototype.start.apply(this, arguments);
	this.owner.el.setAttribute('draggable', true);

	this.on('mousedown', onMouseDown);
	this.on('mouseenter mouseleave mousemove', onMouseMovement);
	this.on('dragstart drag', onDragging);

	var self = this;

	function onMouseDown(eventType, event) {
		self._target = event.target;
		if (targetInDragHandle(event)) {
			window.getSelection().empty();
			event.stopPropagation();
		}
	}

	function onMouseMovement(eventType, event) {
		var shouldBeDraggable = targetInDragHandle(event);
		self.owner.el.setAttribute('draggable', shouldBeDraggable);
		event.stopPropagation();
	}

	function onDragging(eventType, event) {
		if (targetInDragHandle(event)) {
			var dt = event.dataTransfer;
			dt.setData('text/html', self.owner.el.outerHTML);
			dt.setData('x-application/milo-component', JSON.stringify(self._dragData));
		} else
			event.preventDefault();
	}

	function targetInDragHandle(event) {
		return ! self._dragHandle || self._dragHandle.contains(self._target);
	}
}

},{"../c_facet":13,"../msg_src/dom_events":35,"./cf_registry":27,"mol-proto":70}],18:[function(require,module,exports){
// <a name="components-facets-drop"></a>
// ###drop facet

'use strict';

var ComponentFacet = require('../c_facet')
	, facetsRegistry = require('./cf_registry')
	, DOMEventsSource = require('../msg_src/dom_events')

	, _ = require('mol-proto');


// generic drop handler, should be overridden
var Drop = _.createSubclass(ComponentFacet, 'Drop');

_.extendProto(Drop, {
	init: initDropFacet,
	start: startDropFacet
	// _reattach: _reattachEventsOnElementChange
});

facetsRegistry.add(Drop);

module.exports = Drop;


function initDropFacet() {
	ComponentFacet.prototype.init.apply(this, arguments);
	this._createMessageSourceWithAPI(DOMEventsSource);
}


function startDropFacet() {
	ComponentFacet.prototype.start.apply(this, arguments);
	this.on('dragenter dragover', onDragging);

	function onDragging(eventType, event) {
		var dt = event.dataTransfer
			, dataTypes = dt.types;
		if (dataTypes.indexOf('text/html') >= 0
				|| dataTypes.indexOf('x-application/milo-component') >= 0) {
			event.dataTransfer.dropEffect = 'move';
			event.preventDefault();
		}
	}
}

},{"../c_facet":13,"../msg_src/dom_events":35,"./cf_registry":27,"mol-proto":70}],19:[function(require,module,exports){
// <a name="components-facets-editable"></a>
// ###editable facet

'use strict';

var ComponentFacet = require('../c_facet')
	, Component = require('../c_class')
	, facetsRegistry = require('./cf_registry')
	, DOMEventsSource = require('../msg_src/dom_events')
	, EditableMsgAPI = require('../msg_api/editable')
	, logger = require('../../util/logger')
	, domUtils = require('../../util/dom')
	, _ = require('mol-proto')
	, check = require('../../util').check
	, Match = check.Match;


var Editable = _.createSubclass(ComponentFacet, 'Editable');

_.extendProto(Editable, {
	start: start,
	makeEditable: makeEditable

	// _reattach: _reattachEventsOnElementChange
});

facetsRegistry.add(Editable);

module.exports = Editable;


// init Editable facets
function makeEditable(editable) {
	this.owner.el.setAttribute('contenteditable', editable);
}


// start Editable facet
function start() {
	ComponentFacet.prototype.start.apply(this, arguments);
	
	var editableAPIoptions = {
		editableOnClick: this.config.editableOnClick,
		moveToAdjacentEditable: this.config.moveToAdjacentEditable,
		allowMerge: this.config.allowMerge,
		acceptMerge: this.config.acceptMerge
	};
	var editableAPI = new EditableMsgAPI(this.owner, editableAPIoptions);

	this._createMessageSourceWithAPI(DOMEventsSource, editableAPI);

	this._editable = typeof this.config.editable != 'undefined'
						? this.config.editable
						: true;

	if (this._editable) {
		this.makeEditable(true);
		this.postMessage('editstart');
	}

	if (this.config.showOutline === false)
		this.owner.el.style.outline = 'none';
	
	this.onMessages({
		'editstart': onEditStart,
		'editend': onEditEnd,
		// arrow keys events
		'previouseditable': makePreviousComponentEditable,
		'nexteditable': makeNextComponentEditable,
		// merge events
		'previousmerge': mergeToPreviousEditable,
		'nextmerge': mergeToNextEditable,
		'requestmerge': onRequestMerge,
		'mergeaccepted': onMergeAccepted,
		'performmerge': onPerformMerge,
		'mergeremove': onMergeRemove,
		// split events
		'enterkey': onEnterSplit
	});
}


function onEditStart(eventType, event) {
	this.makeEditable(true);
}


function onEditEnd(eventType, event) {
	this.makeEditable(false);
}

//
// Move caret to another editable
//
function makePreviousComponentEditable(eventType, event) {
	event.preventDefault();
	makeAdjacentComponentEditable(this.owner, 'up');
}

function makeNextComponentEditable(eventType, event) {
	event.preventDefault();
	makeAdjacentComponentEditable(this.owner, 'down');
}

function makeAdjacentComponentEditable(component, direction) {
	var adjacentComp = component.dom.find(direction, function(comp) {
		return comp.editable;
	});

	if (adjacentComp) {
		adjacentComp.editable.postMessage('editstart');
		adjacentComp.el.focus();
		
		var windowSelection = window.getSelection()
			, selectionRange = document.createRange();
		selectionRange.selectNodeContents(adjacentComp.el);
		if (direction == 'up')
			selectionRange.collapse(false);
		else
			selectionRange.collapse(true);
        windowSelection.removeAllRanges();
        windowSelection.addRange(selectionRange);
	}
}


//
// merge functionality
//
function mergeToPreviousEditable(eventType, event) {
	event.preventDefault();
	mergeToAdjacentEditable(this.owner, 'up');
}

function mergeToNextEditable(eventType, event) {
	mergeToAdjacentEditable(this.owner, 'down');
}

function mergeToAdjacentEditable(component, direction) {
	var adjacentComp = component.dom.find(direction, function(comp) {
		return comp.editable;
	});

	if (adjacentComp)
		adjacentComp.editable.postMessage('requestmerge', { sender: component });
}


// merge messages
function onRequestMerge(message, data) {
	check(data, Match.ObjectIncluding({ sender: Component }));

	var mergeComponent = data.sender;
	if (this.config.acceptMerge)
		mergeComponent.editable.postMessage('mergeaccepted', { sender: this.owner });
}

function onMergeAccepted(message, data) {
	check(data, Match.ObjectIncluding({ sender: Component }));

	var targetComponent = data.sender;

	this.owner.allFacets('clean');
	
	targetComponent.editable.postMessage('performmerge', { sender: this.owner });
}

function onPerformMerge(message, data) {
	check(data, Match.ObjectIncluding({ sender: Component }));
	if (! this.config.acceptMerge) {
		logger.error('performmerge message received by component that doesn\'t accept merge');
		return;
	}

	var mergeComponent = data.sender
		, windowSelection = window.getSelection()
		, selectionRange = document.createRange();

	// merge scopes
	this.owner.container.scope._merge(mergeComponent.container.scope);

	//Reference first element to be merged
	var firstMergeEl = mergeComponent.el.childNodes[0];

	// merge DOM
	this.owner.dom.appendChildren(mergeComponent.el);

	//Make the interface editable again like expected
	this.makeEditable(true);
	this.owner.el.focus();

	//Set the selection where it should be
	selectionRange.setStart(firstMergeEl);
	selectionRange.setEnd(firstMergeEl);
	windowSelection.removeAllRanges();
	windowSelection.addRange(selectionRange);

	// send remove message
	mergeComponent.editable.postMessage('mergeremove');
}


function onMergeRemove(message, data) {
	if (! this.config.allowMerge) {
		logger.error('mergeremove message received by component that doesn\'t allow merge');
		return;
	}

	this.owner.dom.remove();
	this.owner.remove();
}


function onEnterSplit(message, event) {
	var splitFacet = this.owner.split;
	if (splitFacet) {
		var newComp = splitFacet.make();
		event.preventDefault();
		newComp.editable.postMessage('editstart');
		newComp.el.focus();
	}
}

},{"../../util":63,"../../util/dom":61,"../../util/logger":64,"../c_class":12,"../c_facet":13,"../msg_api/editable":34,"../msg_src/dom_events":35,"./cf_registry":27,"mol-proto":70}],20:[function(require,module,exports){
// <a name="components-facets-events"></a>
// ###events facet

'use strict';

var ComponentFacet = require('../c_facet')
	, facetsRegistry = require('./cf_registry')

	, Messenger = require('../../messenger')
	, DOMEventsSource = require('../msg_src/dom_events')

	, _ = require('mol-proto');


// events facet
var Events = _.createSubclass(ComponentFacet, 'Events');

_.extendProto(Events, {
	init: init,

	// _reattach: _reattachEventsOnElementChange
});

facetsRegistry.add(Events);

module.exports = Events;


// init Events facet
function init() {
	ComponentFacet.prototype.init.apply(this, arguments);

	var domEventsSource = new DOMEventsSource(this, { trigger: 'trigger' }, undefined, this.owner);
	this._setMessageSource(domEventsSource);
	_.defineProperty(this, '_domEventsSource', domEventsSource);
}

},{"../../messenger":47,"../c_facet":13,"../msg_src/dom_events":35,"./cf_registry":27,"mol-proto":70}],21:[function(require,module,exports){
'use strict';

// <a name="components-facets-frame"></a>
// ###frame facet

// TODO: The message source for this facet needs to be completely refactored

var ComponentFacet = require('../c_facet')
	, facetsRegistry = require('./cf_registry')
	, Messenger = require('../../messenger')
	, FrameMessageSource = require('../msg_src/frame')
	, _ = require('mol-proto');


// data model connection facet
var Frame = _.createSubclass(ComponentFacet, 'Frame');

_.extendProto(Frame, {
	init: init

	// _reattach: _reattachEventsOnElementChange
});


facetsRegistry.add(Frame);

module.exports = Frame;


// initFrameFacet
function init() {
	ComponentFacet.prototype.init.apply(this, arguments);
	
	var messageSource = new FrameMessageSource(this, { trigger: 'trigger' }, undefined, this.owner);
	this._setMessageSource(messageSource);

	_.defineProperty(this, '_messageSource', messageSource);
}

},{"../../messenger":47,"../c_facet":13,"../msg_src/frame":36,"./cf_registry":27,"mol-proto":70}],22:[function(require,module,exports){
'use strict';


// <a name="components-facets-item"></a>
// ###item facet

var ComponentFacet = require('../c_facet')
    , facetsRegistry = require('./cf_registry')
    , Model = require('../../model')
    , _ = require('mol-proto')
    , miloMail = require('../../mail');


// data model connection facet
var ItemFacet = _.createSubclass(ComponentFacet, 'Item');

_.extendProto(ItemFacet, {
    require: ['Container', 'Dom', 'Data']
});

facetsRegistry.add(ItemFacet);

module.exports = ItemFacet;

},{"../../mail":44,"../../model":53,"../c_facet":13,"./cf_registry":27,"mol-proto":70}],23:[function(require,module,exports){
// <a name="components-facets-list"></a>
// ###list facet

'use strict';

var ComponentFacet = require('../c_facet')
    , Component = require('../c_class')
    , facetsRegistry = require('./cf_registry')
    , Model = require('../../model')
    , _ = require('mol-proto')
    , miloMail = require('../../mail')
    , binder = require('../../binder')
    , ListError = require('../../util/error').List
    , logger = require('../../util/logger');


// Data model connection facet
var List = _.createSubclass(ComponentFacet, 'List');

_.extendProto(List, {
    init: init,
    /* update: update, */
    require: ['Container', 'Dom', 'Data'],
    _itemPreviousComponent: _itemPreviousComponent,

    item: item,
    count: count,
    _setItem: _setItem,
    contains: contains,
    addItem: addItem,
    removeItem: removeItem,
    each: each
    /* _reattach: _reattachEventsOnElementChange */
});

facetsRegistry.add(List);

module.exports = List;


// Initialize List facet
function init() {
    ComponentFacet.prototype.init.apply(this, arguments);
    var model = new Model
        , self = this;

    _.defineProperties(this, {
        _listItems: [],
        _listItemsHash: {}
    });
    _.defineProperty(this, 'itemSample', null, false, false, true);

    // Fired by __binder__ when all children of component are bound
    this.owner.on('childrenbound', onChildrenBound);
}


function onChildrenBound() {
    var foundItem;

    // `this` is a component here, as the message was dispatched on a component
    this.container.scope._each(function(childComp, name) {
        if (childComp.item) {
            if (foundItem) throw new ListError('More than one child component has ListItem Facet')
            foundItem = childComp;
        }
    });
    
    // Component must have one and only one child with a List facet 
    if (! foundItem) throw new ListError('No child component has ListItem Facet');

    this.list.itemSample = foundItem;

    // After keeping a reference to the item sample, it must be hidden and removed from scope
    this.list.itemSample.dom.hide();
    this.list.itemSample.remove();
}

// Return a list item by it's index
function item(index) {
    return this._listItems[index];
}

// Get total number of list items
function count() {
    return this._listItems.length
}


function _setItem(index, component) {
    this._listItems[index] = component;
    this._listItemsHash[component.name] = component
}

// Does the list contain a particular list item component
function contains(component){
    return this._listItemsHash[component.name] == component;
}

// Add a new list item at a particular index
function addItem(index) {
    index = index || this.count();
    if (this.item(index))
        throw ListError('attempt to create item with ID of existing item');

    // Copy component
    var component = Component.copy(this.itemSample, true);

    var tempComp = binder(component.el)[component.name]
        , innerScope = tempComp.container.scope;

    // Set reference to component container facet on scope
    innerScope._hostObject = component.container;

    // Copy bound scope to component
    component.container.scope = innerScope;

    // Add it to the DOM
    this._itemPreviousComponent(index).dom.insertAfter(component.el)

    // Add to list items
    this._setItem(index, component);

    // Show the list item component
    component.dom.show();

    return component;
}

// Remove item from a particular index,
// `doSplice` determines if the empty space should be removed
function removeItem(index, doSplice) {
    var comp = this.item(index);

    if (! comp)
        logger.warn('attempt to remove list item with id that does not exist');

    this._listItems[index] = undefined;
    delete this._listItemsHash[comp.name];
    comp.dom.remove();
    comp.remove();

    if (doSplice)
        this._listItems.splice(index, 1);
}

// Returns the previous item component given an index
function _itemPreviousComponent(index) {
    while (index >= 0 && ! this._listItems[index])
        index--;

    return index >= 0
                ? this._listItems[index]
                : this.itemSample;
}

// Performs a callback on each list item
function each(callback, thisArg) {
    this._listItems.forEach(function(item) {
        if (item) callback.apply(this, arguments);
    }, thisArg || this);
}

},{"../../binder":10,"../../mail":44,"../../model":53,"../../util/error":62,"../../util/logger":64,"../c_class":12,"../c_facet":13,"./cf_registry":27,"mol-proto":70}],24:[function(require,module,exports){
'use strict';

// <a name="components-facets-model"></a>
// ###model facet

var ComponentFacet = require('../c_facet')
	, facetsRegistry = require('./cf_registry')
	, Model = require('../../model')

	, _ = require('mol-proto');


// generic drag handler, should be overridden
var ModelFacet = _.createSubclass(ComponentFacet, 'Model');

_.extendProto(ModelFacet, {
	init: initModelFacet,
	_createMessenger: _createMessenger
	// _reattach: _reattachEventsOnElementChange
});

facetsRegistry.add(ModelFacet);

module.exports = ModelFacet;


function initModelFacet() {
	this.m = new Model(undefined, this);

	ComponentFacet.prototype.init.apply(this, arguments);
}

function _createMessenger() { // Called by inherited init
	this.m.proxyMessenger(this); // Creates messenger's methods directly on facet
}

},{"../../model":53,"../c_facet":13,"./cf_registry":27,"mol-proto":70}],25:[function(require,module,exports){
'use strict';

var ComponentFacet = require('../c_facet')
	, Component = require('../c_class')
	, facetsRegistry = require('./cf_registry');

var Split = _.createSubclass(ComponentFacet, 'Split');

_.extendProto(Split, {
	init: init,
	make: make,

	isSplittable: isSplittable,
	_makeSplit: _makeSplit,

	require: ['Dom']

	// _reattach: _reattachEventsOnElementChange
});

facetsRegistry.add(Split);

module.exports = Split;


/**
 * init
 * Initializes Split facet
 * Called by inherited ComponentFacet class constructor
 */
function init() {
	ComponentFacet.prototype.init.apply(this, arguments);
	this._splitSender = undefined;
}


/**
 * make
 * Splits component this facet belongs to on the selection,
 * but only if the selection is empty and there is some text before selection.
 * Uses _makeSplit to do actual split.
 * @return {Component} new component created as a result of a split
 */
 function make() {
	if (! this.isSplittable())
		return;

	if (! this.owner.dom.hasTextBeforeSelection())
		return; // should simply create empty component before

	return this._makeSplit();
}


/**
 * _makeSplit
 * Splits component this facet belongs to on the selection.
 * This function is called recursively by `splitElement` to split inner components
 * @return {Component} new component created as a result of a split.
 */
function _makeSplit() {
	var thisComp = this.owner;

	// clone itself
	var newComp = Component.copy(thisComp);
	thisComp.dom.insertAfter(newComp.el);

	splitElement(thisComp.el, newComp.el);

	return newComp;
}


/**
 * splitElement
 * Splits DOM element on the selection point moving everything after it to
 * a new element. Recursively calls itself when it encounters DOM element or 
 * `_makeSplit` when it encounters elements with milo components
 * @param {Element} thisEl element to be split
 * @param {Element} newEl element where all new elements will be moved to.
 */
function splitElement(thisEl, newEl) {
	var selection = window.getSelection()
		, selNode = selection.anchorNode
		, selFound = false;

	_.forEach(thisEl.childNodes, function(childNode) {
		if (childNode.contains(selNode) || childNode == selNode) {
			var comp = Component.getComponent(childNode);
			if (comp)
				comp.split._makeSplit();
			else if (childNode.nodeType == Node.TEXT_NODE) {
				var selPos = selection.anchorOffset;
				var newText = childNode.splitText(selPos);
				if (newText.textContent)
					newEl.appendChild(newText);
				else
					newEl.innerHTML += '&nbsp;';
			} else {
				var newChildEl = childNode.cloneNode(false);
				newEl.appendChild(newChildEl);
				splitElement(childNode, newChildEl);
			}

			selFound = true;
		} else if (selFound)
			newEl.appendChild(childNode);
	});
}


/**
 * isSplittable
 * Checks if a component can be split on selection point
 * Component can only be split if all inner components containing
 * selection point can be split too.
 * @return {Boolean} true, if the component can be split
 */
function isSplittable() {
	var selection = window.getSelection()
		, el = selection.anchorNode;

	if (! this.owner.el.contains(el)) {
		logger.warn('selection is outside this component');
		return false;
	}

	while (el != this.owner.el) {
		var comp = Component.getComponent(el);
		if (comp && ! comp.split)
			return false;
		el = el.parentNode;
	}

	return true;
}

},{"../c_class":12,"../c_facet":13,"./cf_registry":27}],26:[function(require,module,exports){
// <a name="components-facets-template"></a>
// ###template facet

'use strict';

var ComponentFacet = require('../c_facet')
	, facetsRegistry = require('./cf_registry')	
	, _ = require('mol-proto')
	, check = require('../../util/check')
	, Match = check.Match
	, binder = require('../../binder');


// data model connection facet
var Template = _.createSubclass(ComponentFacet, 'Template');

_.extendProto(Template, {
	init: initTemplateFacet,
	set: setTemplate,
	render: renderTemplate,
	binder: bindInnerComponents,
	require: ['Container']

	// _reattach: _reattachEventsOnElementChange
});

facetsRegistry.add(Template);

module.exports = Template;


function initTemplateFacet() {
	ComponentFacet.prototype.init.apply(this, arguments);

	this._templateStr = this.config.template;
}


function setTemplate(templateStr, compile) {
	check(templateStr, String);
	check(compile, Match.Optional(Function));

	this._templateStr = templateStr;
	if (compile)
		this._compile = compile

	compile = compile || this._compile; // || milo.config.template.compile;

	if (compile)
		this._template = compile(templateStr);

	return this;
}


function renderTemplate(data) { // we need data only if use templating engine
	this.owner.el.innerHTML = this._template
								? this._template(data)
								: this._templateStr;

	return this;
}


function bindInnerComponents() {
	var thisScope = binder(this.owner.el);

	// TODO should be changed to reconcillation of existing children with new
	this.owner.container.scope = thisScope[this.owner.name].container.scope;
}

},{"../../binder":10,"../../util/check":58,"../c_facet":13,"./cf_registry":27,"mol-proto":70}],27:[function(require,module,exports){
'use strict';

var ClassRegistry = require('../../abstract/registry')
	, ComponentFacet = require('../c_facet');


/**
 * `milo.registry.facets`
 * Component facets registry. An instance of [ClassRegistry](../../abstract/registry.js.html) class that is used by milo to register and find facets.
 */
 var facetsRegistry = new ClassRegistry(ComponentFacet);


// Adds common ancestor to all facets of components to the registry.
facetsRegistry.add(ComponentFacet);

module.exports = facetsRegistry;

},{"../../abstract/registry":5,"../c_facet":13}],28:[function(require,module,exports){
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

	if (hasContainerFacet(this.ComponentClass, attr))
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

function hasContainerFacet(ComponentClass, attr) {
	return (ComponentClass.hasFacet('container')
		|| (Array.isArray(attr.compFacets) && attr.compFacets.indexOf('Container') >= 0));
}

},{"../util/error":62,"./c_facets/cf_registry":27,"./c_registry":30}],29:[function(require,module,exports){
// <a name="components-dom-constructors"></a>
// ###dom events constructors

'use strict';

var _ = require('mol-proto');


// https://developer.mozilla.org/en-US/docs/Web/Reference/Events

var eventTypes = {
	ClipboardEvent: ['copy', 'cut', 'paste', 'beforecopy', 'beforecut', 'beforepaste'],
	Event: ['input', 'readystatechange'],
	FocusEvent: ['focus', 'blur', 'focusin', 'focusout'],
	KeyboardEvent: ['keydown', 'keypress',  'keyup'],
	MouseEvent: ['click', 'contextmenu', 'dblclick', 'mousedown', 'mouseup',
				 'mouseenter', 'mouseleave', 'mousemove', 'mouseout', 'mouseover',
				 'show' /* context menu */],
	TouchEvent: ['touchstart', 'touchend', 'touchmove', 'touchenter', 'touchleave', 'touchcancel'],
};


// mock window and event constructors for testing
if (typeof window != 'undefined')
	var global = window;
else {
	global = {};
	_.eachKey(eventTypes, function(eTypes, eventConstructorName) {
		var eventConstructor = _.makeFunction(eventConstructorName, 'type', 'properties',
			'this.type = type; _.extend(this, properties);');
		global[eventConstructorName] = eventConstructor;
	});
}


var domEventsConstructors = {};

_.eachKey(eventTypes, function(eTypes, eventConstructorName) {
	eTypes.forEach(function(type) {
		if (Object.hasOwnProperty(domEventsConstructors, type))
			throw new Error('duplicate event type ' + type);

		domEventsConstructors[type] = global[eventConstructorName];
	});
});


module.exports = domEventsConstructors;

},{"mol-proto":70}],30:[function(require,module,exports){
'use strict';

var ClassRegistry = require('../abstract/registry')
	, Component = require('./c_class');

/**
 * `milo.registry.components`
 * An instance of [ClassRegistry](../abstract/registry.js.html) class that is used by milo to register and find components.
 */
var componentsRegistry = new ClassRegistry(Component);

// add common ancestor to all components to the registry.
componentsRegistry.add(Component);

module.exports = componentsRegistry;

},{"../abstract/registry":5,"./c_class":12}],31:[function(require,module,exports){
'use strict';

var config = require('../config')
	, check = require('../util/check')
	, Match = check.Match;


var componentUtils = module.exports = {
	isComponent: isComponent,
	getComponent: getComponent,
	getContainingComponent: getContainingComponent
};


/**
 * isComponent
 *
 * Checks if element has a component attached to it by
 * checking the presence of property difined in milo.config
 *
 * @param {Element} el DOM element
 * @return {Boolean} true, if it has milo component attached to it
 */
function isComponent(el) {
	return el.hasOwnProperty(config.componentRef);
}


/**
 * getComponent
 *
 * @param {Element} el DOM element
 * @return {Component} component attached to element
 */
function getComponent(el) {
	return el && el[config.componentRef];
}


/**
 * Returns the closest component which contains the specified element,
 * optionally, only component that passes `condition` test or contains specified facet
 *
 * Unless `returnCurrent` parameter is false, the function will return
 * the current component of the element (true by default).
 *
 * @param {Node} node DOM Element or text Node
 * @param {Boolean} returnCurrent optional boolean value indicating whether the component of the element can be returned. True by default, should be false to return only ancestors.
 * @param {Function|String} conditionOrFacet optional condition that component should pass (or facet name it should contain)
 * @return {Component} 
 */
function getContainingComponent(node, returnCurrent, conditionOrFacet) {
	// check(node, Node); - can't check tiype here as it is most likely coming from another frame
	check(returnCurrent, Match.Optional(Boolean));
	check(conditionOrFacet, Match.Optional(Match.OneOf(Function, String)));

	var _condition = typeof conditionOrFacet == 'string'
						? ( function (comp) {
						       return comp.hasOwnProperty(conditionOrFacet)
						    } )
						: conditionOrFacet;
	return _getContainingComponent(node, returnCurrent, _condition);
}


function _getContainingComponent(el, returnCurrent, condition) {
	// Where the current element is a component it should be returned
	// if returnCurrent is true or undefined
	if (returnCurrent !== false) {
		var comp = getComponent(el);
		if (comp && (! condition || condition(comp)))
			return comp;
	}

	// Where there is no parent element, this function will return undefined
	// The parent element is checked recursively
	if (el.parentNode)
		return _getContainingComponent(el.parentNode, true, condition);
}

},{"../config":42,"../util/check":58}],32:[function(require,module,exports){
'use strict';

var Component = require('../c_class')
	, componentsRegistry = require('../c_registry');


var View = Component.createComponentClass('View', ['container']);

componentsRegistry.add(View);

module.exports = View;

},{"../c_class":12,"../c_registry":30}],33:[function(require,module,exports){
'use strict';

// <a name="components-source-data"></a>
// ###component data source


var MessengerAPI = require('../../messenger/m_api')
	, _ = require('mol-proto')
	, check = require('../../util/check')
	, Match = check.Match;


// class to handle subscribtions to changes in DOM for UI (maybe also content editable) elements
var DataMsgAPI = _.createSubclass(MessengerAPI, 'DataMsgAPI', true);


_.extendProto(DataMsgAPI, {
	// implementing MessageSource interface
	init: init,
	translateToSourceMessage: translateToSourceMessage,
 	filterSourceMessage: filterSourceMessage,
 	createInternalData: createInternalData,

 	// class specific methods
 	// dom: implemented in DOMEventsSource
 	value: value,
 	// handleEvent: handleEvent,  // event dispatcher - as defined by Event DOM API
});

module.exports = DataMsgAPI;


var _tagEvents = {
	'input': 'input',
	'select': 'change'
};

function init(component) {
	MessengerAPI.prototype.init.apply(this, arguments);

	this.component = component;
	this.value(); // stores current component data value in this._value
	this.tagName = this.component.el.tagName.toLowerCase();
	this.tagEvent = _tagEvents[this.tagName];
}


// TODO: should return value dependent on element tag
// getDomElementDataValue
function value() { // value method
	var newValue = this.component.el.value;

	Object.defineProperty(this, '_value', {
		configurable: true,
		value: newValue
	});

	return newValue;
}


// TODO: this function should return relevant DOM event dependent on element tag
// Can also implement beforedatachanged event to allow preventing the change
// translateToDomEvent
function translateToSourceMessage(message) {
	if (message == '' && this.tagEvent)
		return this.tagEvent;
	else
		return '';
}


// filterDataMessage
function filterSourceMessage(sourceMessage, message, data) {
	return data.newValue != data.oldValue;
};


function createInternalData(sourceMessage, message, data) {
	var oldValue = this._value;
	var internalData = { 
		path: '',
		type: 'changed',
		oldValue: oldValue,
		newValue: this.value()
	};
	return internalData;
};

},{"../../messenger/m_api":48,"../../util/check":58,"mol-proto":70}],34:[function(require,module,exports){
'use strict';


var MessengerAPI = require('../../messenger/m_api')
	, _ = require('mol-proto')
	, check = require('../../util/check')
	, Match = check.Match;


// class to handle subscribtions to changes in DOM for UI (maybe also content editable) elements
var EditableMsgAPI = _.createSubclass(MessengerAPI, 'EditableMsgAPI', true);


_.extendProto(EditableMsgAPI, {
	// implementing MessageAPI interface
	init: init,
	translateToSourceMessage: translateToSourceMessage,
 	filterSourceMessage: filterSourceMessage,
});

module.exports = EditableMsgAPI;


function init(component, options) {
	MessengerAPI.prototype.init.apply(this, arguments);
	
	this.component = component;
	this.options = options;
}


var editableEventsMap = {
	'enterkey': 'keypress',
	'editstart': 'mousedown',
	'editend': 'blur',
	// move events
	'nexteditable': 'keydown',
	'previouseditable': 'keydown',	
	'adjacenteditable': 'keydown',
	// merge events
	'nextmerge': 'keydown',
	'previousmerge': 'keydown',
	'adjacentmerge': 'keydown',
};

// TODO: this function should return relevant DOM event dependent on element tag
// Can also implement beforedatachanged event to allow preventing the change
// translate to DOM event
function translateToSourceMessage(message) {
	if (editableEventsMap.hasOwnProperty(message))
		return editableEventsMap[message];
	else
		return message;
}


// filter editable message
function filterSourceMessage(eventType, message, data) {
	var self = this;

	switch (message) {
		case 'enterkey':
		 	return data.keyCode == 13;

		// move to adjacent editable events
		case 'previouseditable':
			return this.options.moveToAdjacentEditable
				&& movedToPrevious(data);
		case 'nexteditable':
			return this.options.moveToAdjacentEditable
				&& movedToNext(data);
		case 'adjacenteditable':
			return this.options.moveToAdjacentEditable
				&& (movedToPrevious(data) || movedToNext(data));

		// merge adjacent editable events
		case 'previousmerge': // merge current one into previous on backspace key
			return this.options.allowMerge && mergeToPrevious(data)
		case 'nextmerge': // merge current one into previous on backspace key
			return this.options.allowMerge && mergeToNext(data)
		case 'adjacentmerge':
			return this.options.allowMerge
				&& (mergeToPrevious(data) || mergeToNext(data));

		case 'editstart':
		case 'editend':
			return this.options.editableOnClick;
		default:
			return true;
	}

	function movedToPrevious(data) {
		return (data.keyCode == 37 || data.keyCode == 38) // up and left
			&& noTextBeforeSelection(self.component);
	}

	function movedToNext(data) {
		return (data.keyCode == 39 || data.keyCode == 40) // down and right
			&& noTextAfterSelection(self.component);
	} 

	function mergeToPrevious(data) {
		return data.keyCode == 8 // backspace
			&& noTextBeforeSelection(self.component);
	}

	function mergeToNext(data) {
		return data.keyCode == 46 // delete
			&& noTextAfterSelection(self.component);
	}

	function noTextBeforeSelection(component) {
		return ! component.dom.hasTextBeforeSelection();
	};

	function noTextAfterSelection(component) {
		var sel = window.getSelection();
		if (sel.anchorOffset == sel.anchorNode.length) {
			if (sel.anchorNode.nextSibling) {
				return false;
			} else {
				return true;
			}
		}
	}
}

},{"../../messenger/m_api":48,"../../util/check":58,"mol-proto":70}],35:[function(require,module,exports){
'use strict';

// <a name="components-source-dom"></a>
// ###component dom events source

var MessageSource = require('../../messenger/m_source')
	, Component = require('../c_class')
	, domEventsConstructors = require('../c_message_sources/dom_events_constructors') // TODO merge with DOMEventSource ??
	, _ = require('mol-proto')
	, check = require('../../util/check')
	, Match = check.Match;

var DOMEventsSource = _.createSubclass(MessageSource, 'DOMMessageSource', true);


_.extendProto(DOMEventsSource, {
	// implementing MessageSource interface
	init: init,
 	addSourceSubscriber: _.partial(sourceSubscriberMethod, 'addEventListener'),
 	removeSourceSubscriber: _.partial(sourceSubscriberMethod, 'removeEventListener'),
 	trigger: trigger,

 	// class specific methods
 	dom: dom,
 	handleEvent: handleEvent,  // event dispatcher - as defined by Event DOM API
});

module.exports = DOMEventsSource;


var useCapturePattern = /__capture$/
	, useCapturePostfix = '__capture';


// init DOM event source
function init(hostObject, proxyMethods, messengerAPIOrClass, component) {
	check(component, Component);
	this.component = component;
	MessageSource.prototype.init.apply(this, arguments);
}


// get DOM element of component
function dom() {
	return this.component.el;
}


function sourceSubscriberMethod(method, eventType) {
	if (! eventType) return;
	var capture = useCapturePattern.test(eventType);
	eventType = eventType.replace(useCapturePattern, '');
	this.dom()[method](eventType, this, capture);
}


// event dispatcher - as defined by Event DOM API
function handleEvent(event) {
	var isCapturePhase;
	if (typeof window != 'undefined')
		isCapturePhase = event.eventPhase == window.Event.CAPTURING_PHASE;

	if (isCapturePhase)
		event += useCapturePostfix;

	this.dispatchMessage(event.type, event);
}


function trigger(eventType, properties) {
	check(eventType, String);
	check(properties, Match.Optional(Object));

	eventType = eventType.replace(useCapturePattern, '');
	var EventConstructor = domEventsConstructors[eventType];

	if (typeof eventConstructor != 'function')
		throw new Error('unsupported event type');

	// check if it is correct
	if (typeof properties != 'undefined')
		properties.type = eventType;

	var domEvent = EventConstructor(eventType, properties);
	var notCancelled = this.dom().dispatchEvent(domEvent);
	return notCancelled;
}

},{"../../messenger/m_source":49,"../../util/check":58,"../c_class":12,"../c_message_sources/dom_events_constructors":29,"mol-proto":70}],36:[function(require,module,exports){
'use strict';

// <a name="components-source-iframe"></a>
// ###component iframe source

// TODO: This message source needs to be completely refactored

var MessageSource = require('../../messenger/m_source')
	, Component = require('../c_class')
	, _ = require('mol-proto')
	, check = require('../../util/check')
	, Match = check.Match
	, FrameMessageSourceError = require('../../util/error').FrameMessageSource;

var FrameMessageSource = _.createSubclass(MessageSource, 'FrameMessageSource', true);


_.extendProto(FrameMessageSource, {
	// implementing MessageSource interface
	init: init,
 	addSourceSubscriber: addSourceSubscriber,
 	removeSourceSubscriber: removeSourceSubscriber,
 	trigger: trigger,

 	//class specific methods
 	frameWindow: frameWindow,
 	handleEvent: handleEvent  // event dispatcher - as defined by Event DOM API
});

module.exports = FrameMessageSource;


function init(hostObject, proxyMethods, messengerAPIOrClass, component) {
	check(component, Component);
	this.component = component;

	if (component.el.tagName.toLowerCase() != 'iframe')
		throw new FrameMessageSourceError('component for FrameMessageSource can only be attached to iframe element');

	MessageSource.prototype.init.apply(this, arguments);
}


function frameWindow() {
	return this.component.el.contentWindow;
}


// addIFrameMessageListener
function addSourceSubscriber(sourceMessage) {
	this.frameWindow().addEventListener('message', this, false);
}


// removeIFrameMessageListener
function removeSourceSubscriber(sourceMessage) {
	this.frameWindow().removeEventListener('message', this, false);
}


function trigger(msgType, data) {
	data = data || {};
	data.type = msgType;

	this.frameWindow().postMessage(data, '*');
}


// TODO maybe refactor to FrameMsgAPI?
function handleEvent(event) {
	this.dispatchMessage(event.data.type, event);
}

},{"../../messenger/m_source":49,"../../util/check":58,"../../util/error":62,"../c_class":12,"mol-proto":70}],37:[function(require,module,exports){
// <a name="scope"></a>
// scope class
// -----------

'use strict';

var _ = require('mol-proto')
	, check = require('../util/check')
	, Match = check.Match
	, ScopeError = require('../util/error').Scope;


// Scope class
function Scope(rootEl, hostObject) {
	_.defineProperties(this, {
		_rootEl: rootEl,
		_hostObject: hostObject
	}, false, false, true); // writable
};

_.extendProto(Scope, {
	_add: _add,
	_copy: _copy,
	_each: _each,
	_addNew: _addNew,
	_merge: _merge,
	_length: _length
});

module.exports = Scope;


var allowedNamePattern = /^[A-Za-z][A-Za-z0-9\_\$]*$/;


// adds object to scope throwing if name is notyunique
function _add(object, name) {
	if (this[name])
		throw new ScopeError('duplicate object name: ' + name);

	checkName(name);

	this[name] = object;
}




// copies all objects from one scope to another,
// throwing if some object is not unique
function _copy(aScope) {
	check(aScope, Scope);

	aScope._each(_add, this);
}


function _addNew(object, name) {
// TODO
}


function _merge(scope) {
// TODO
}


function _each(callback, thisArg) {
	_.eachKey(this, callback, thisArg || this, true); // enumerates enumerable properties only
}


function checkName(name) {
	if (! allowedNamePattern.test(name))
		throw new ScopeError('name should start from letter, this name is not allowed: ' + name);
}


// returns the number of objects in scope
function _length() {
	return Object.keys(this).length;
}

},{"../util/check":58,"../util/error":62,"mol-proto":70}],38:[function(require,module,exports){
'use strict';

var Component = require('../c_class')
	, componentsRegistry = require('../c_registry');


var MLButton = Component.createComponentClass('MLButton', ['events']);

componentsRegistry.add(MLButton);

module.exports = MLButton;

},{"../c_class":12,"../c_registry":30}],39:[function(require,module,exports){
'use strict';

var Component = require('../c_class')
	, componentsRegistry = require('../c_registry');


var MLGroup = Component.createComponentClass('MLGroup', ['container', 'data', 'events']);

componentsRegistry.add(MLGroup);

module.exports = MLGroup;

},{"../c_class":12,"../c_registry":30}],40:[function(require,module,exports){
'use strict';

var Component = require('../c_class')
	, componentsRegistry = require('../c_registry');


var MLInput = Component.createComponentClass('MLInput', ['data', 'events']);

componentsRegistry.add(MLInput);

module.exports = MLInput;

},{"../c_class":12,"../c_registry":30}],41:[function(require,module,exports){
'use strict';

var Component = require('../c_class')
	, componentsRegistry = require('../c_registry')
	, doT = require('dot');


var MLSelect = Component.createComponentClass('MLSelect', {
	dom: undefined,
	data: undefined,
	events: undefined,
	model: {
		messages: {
			'***': onOptionsChange
		}
	}
});


componentsRegistry.add(MLSelect);

module.exports = MLSelect;


var optionsTemplateText = '\
	{{~ it.options :option }} \
		<option value="{{= option.value }}">{{= option.label }}</option> \
	{{~}} \
';

var optionsTemplate = doT.compile(optionsTemplateText);


function onOptionsChange(path, data) {
	var selectEl = this.scope.owner.el;
	selectEl.innerHTML = optionsTemplate(this.get());
}

},{"../c_class":12,"../c_registry":30,"dot":69}],42:[function(require,module,exports){
'use strict';
// <a name="config"></a>
// milo.config
// -----------

// It is the function that allows to change milo configurations and also
// access them on config's properties.

// ```javascript
// milo.config({
//     attrs: {
//         bind: 'ml-bind',
//         load: 'ml-load'
//     }
// });
// ```


var _ = require('mol-proto');


module.exports = config;

function config(options) {
	_.deepExtend(config, options);
}

config({
	attrs: {
		bind: 'ml-bind',
		load: 'ml-load'
	},
	componentRef: '___milo_component',
	componentPrefix: 'milo_'
});

},{"mol-proto":70}],43:[function(require,module,exports){
// <a name="loader"></a>
// milo.loader
// -----------

// milo.loader loads subviews into the page. It scans the document inside rootElement looking for ml-load attribute that should contain URL of HTML fragment that will be loaded inside the element with this attribute.

// milo.loader returns the map of references to elements with their IDs used as keys.

// ### Example

// html

// ```html
// <body>
//     <div id="view1" ml-load="view1.html"></div>
//     <div>
//         <div id="view2" ml-load="view3.html"></div>
//     </div>
// </body>
// ```

// javascript

// ```javascript
// var views = milo.loader(); // document.body is used by default
// log(views);
// // {
// //     view1: div with id="view1"
// //     view2: div with id="view2"
// // }
// ```

'use strict';

var miloMail = require('./mail')
	, request = require('./util/request')
	, logger = require('./util/logger')
	, utilDom = require('./util/dom')
	, config = require('./config')
	, LoadAttribute = require('./attributes/a_load')
	, LoaderError = require('./util/error').Loader;


module.exports = loader;


function loader(rootEl, callback) {	
	miloMail.onMessage('domready', function() {
		if (typeof rootEl == 'function') {
			callback = rootEl;
			rootEl = undefined;
		}

		rootEl = rootEl || document.body;

		miloMail.postMessage('loader', { state: 'started' });
		_loader(rootEl, function(views) {
			miloMail.postMessage('loader', { 
				state: 'finished',
				views: views
			});
			callback(views);
		});
	});
}


function _loader(rootEl, callback) {
	var loadElements = rootEl.querySelectorAll('[' + config.attrs.load + ']');

	var views = {}
		, totalCount = loadElements.length
		, loadedCount = 0;

	_.forEach(loadElements, function (el) {
		loadView(el, function(err) {
			views[el.id] = err || el;
			loadedCount++;
			if (loadedCount == totalCount)
				callback(views);
		});
	});
};


function loadView(el, callback) {
	if (utilDom.filterNodeListByType(el.childNodes, 1).length)
		throw new LoaderError('can\'t load html into element that is not empty');

	var attr = new LoadAttribute(el);

	attr.parse().validate();

	request.get(attr.loadUrl, function(err, html) {
		if (err) {
			err.message = err.message || 'can\'t load file ' + attr.loadUrl;
			// logger.error(err.message);
			callback(err);
			return;
		}

		el.innerHTML = html;
		callback(null);
	});
}

},{"./attributes/a_load":8,"./config":42,"./mail":44,"./util/dom":61,"./util/error":62,"./util/logger":64,"./util/request":66}],44:[function(require,module,exports){
'use strict';

// <a name="mail"></a>
// milo.mail
// -----------

// It is an application level messenger that is an instance of Messenger class.

// At the moment, in addition to application messages that you define, you can subscribe to __domready__ message that is guaranteed to fire once,
// even if DOM was ready at the time of the subscription.

// Messaging between frames is likely to be exposed via milo.mail.

// See Messenger.


var Messenger = require('../messenger')
	, MailMsgAPI = require('./mail_api')
	, MailMessageSource = require('./mail_source')
	, _ = require('mol-proto');


var miloMail = new Messenger;

var mailMsgSource = new MailMessageSource(miloMail, { trigger: 'trigger' }, new MailMsgAPI);

miloMail._setMessageSource(mailMsgSource);


_.extend(miloMail, {
	on: miloMail.onMessage,
	off: miloMail.offMessage
});


module.exports = miloMail;

},{"../messenger":47,"./mail_api":45,"./mail_source":46,"mol-proto":70}],45:[function(require,module,exports){
'use strict';

var MessengerAPI = require('../messenger/m_api')
	, _ = require('mol-proto')
	, check = require('../util/check')
	, Match = check.Match;


var MailMsgAPI = _.createSubclass(MessengerAPI, 'MailMsgAPI', true);


_.extendProto(MailMsgAPI, {
	translateToSourceMessage: translateToSourceMessage,
 	filterSourceMessage: filterSourceMessage
});

module.exports = MailMsgAPI;


// TODO: this function should return relevant DOM event dependent on element tag
// Can also implement beforedatachanged event to allow preventing the change
// translateToDomEvent
var windowMessageRegExp = /^message\:/
	, windowMessagePrefix = 'message:';

function translateToSourceMessage(message) {
	if (message == 'domready')
		return 'readystatechange';
	else if (windowMessageRegExp.test(message))
		return 'message';
	else
		return '';
}


// filterDataMessage
function filterSourceMessage(sourceMessage, msgType, msgData) {
	if (sourceMessage == 'readystatechange') {
		if (this._domReadyFired) return false;
		Object.defineProperty(this, '_domReadyFired', {
			writable: true,
			value: true
		});
		return true;
	} else if (sourceMessage == 'message')
		return windowMessagePrefix + msgData.data.type == msgType;
};

},{"../messenger/m_api":48,"../util/check":58,"mol-proto":70}],46:[function(require,module,exports){
'use strict';

var MessageSource = require('../messenger/m_source')
	, domEventsConstructors = require('../components/c_message_sources/dom_events_constructors')
	, MailMessageSourceError = require('../util/error').MailMessageSource
	, _ = require('mol-proto')
	, check = require('../util/check')
	, Match = check.Match;


var MailMessageSource = _.createSubclass(MessageSource, 'MailMessageSource', true);


_.extendProto(MailMessageSource, {
	// implementing MessageSource interface
 	addSourceSubscriber: addSourceSubscriber,
 	removeSourceSubscriber: removeSourceSubscriber,
 	trigger: trigger,

 	// class specific methods
 	_windowSubscriberMethod: _windowSubscriberMethod,
 	handleEvent: handleEvent,  // event dispatcher - as defined by Event DOM API
});


module.exports = MailMessageSource;


function addSourceSubscriber(sourceMessage) {
	if (isReadyStateChange(sourceMessage)) {
		if (document.readyState == 'loading')
			document.addEventListener('readystatechange', this, false);
		else {
			var domEvent = EventConstructor('readystatechange', { target: document });
			this.dispatchMessage('readystatechange', domEvent);
		}
	} else
		this._windowSubscriberMethod('addEventListener', sourceMessage);
}


function removeSourceSubscriber(sourceMessage) {
	if (isReadyStateChange(sourceMessage))
		document.removeEventListener('readystatechange', this, false);
	else 
		this._windowSubscriberMethod('removeEventListener', sourceMessage);
}


function isReadyStateChange(sourceMessage) {
	return sourceMessage == 'readystatechange' && typeof document == 'object';
}

function isWindowMessage(sourceMessage) {
	return sourceMessage == 'message' && typeof window == 'object';
}

function _windowSubscriberMethod(method, sourceMessage) {
	if (isWindowMessage(sourceMessage))
		window[method]('message', this, false);
}


// event dispatcher - as defined by Event DOM API
function handleEvent(event) {
	this.dispatchMessage(event.type, event);
}


function trigger(msgType, data) {
	data = data || {};
	data.type = 'message:' + msgType;
	
	if (typeof window == 'object')
		window.postMessage(data, '*')
}

},{"../components/c_message_sources/dom_events_constructors":29,"../messenger/m_source":49,"../util/check":58,"../util/error":62,"mol-proto":70}],47:[function(require,module,exports){
'use strict';

var Mixin = require('../abstract/mixin')
	// , MessageSource = require('./message_source')
	, MessageSource = require('./m_source')
	, _ = require('mol-proto')
	, check = require('../util/check')
	, Match = check.Match
	, MessengerError = require('../util/error').Messenger;


/**
 * `milo.Messenger`
 * A generic Messenger class that is used for all kinds of messaging in milo. It is subclassed from [Mixin](../abstract/mixin.js.html) and it proxies its methods to the host object for convenience.
 * All facets and components have messenger attached to them. Messenger class interoperates with [MessageSource](./message_source.js.html) class that both connects the messenger to some external source of messages (e.g., DOM events) and allows to define higher level messages that exist on the source.
 * Messenger class is used internally in milo and can be used together with any objects/classes in the application.
 * milo also defines a global messenger [milo.mail](../mail/index.js.html) that dispatches `domready` event and can be used for any application wide messaging.
 * To initialize your app after DOM is ready use:
 * ```
 * milo.mail.on('domready', function() {
 *     // application starts	
 * });
 * ```
 * or the following shorter form of the same:
 * ```
 * milo(function() {
 *     // application starts	
 * });
 * ```
 * TODO consider refactoring MessageSource to two classes - MessageSource and MessageAPI.
 */
var Messenger = _.createSubclass(Mixin, 'Messenger');

var messagesSplitRegExp = Messenger.messagesSplitRegExp = /\s*(?:\,|\s)\s*/;


/**
 * ####Messenger instance methods####
 *
 * - [init](#init)
 * - [onMessage](#onMessage)
 * - [offMessage](#offMessage)
 * - [onMessages](#onMessages)
 * - [offMessages](#offMessages)
 * - [postMessage](#postMessage)
 * - [getSubscribers](#getSubscribers)
 *
 * "Private" methods
 *
 * - [_chooseSubscribersHash](#_chooseSubscribersHash)
 * - [_registerSubscriber](#_registerSubscriber)
 * - [_removeSubscriber](#_removeSubscriber)
 * - [_removeAllSubscribers](#_removeAllSubscribers)
 * - [_callPatternSubscribers](#_callPatternSubscribers)
 * - [_callSubscribers](#_callSubscribers)
 * - [_setMessageSource](#_setMessageSource)
 */
_.extendProto(Messenger, {
	init: init, // called by Mixin (superclass)
	onMessage: onMessage,
	offMessage: offMessage,
	onMessages: onMessages,
	offMessages: offMessages,
	postMessage: postMessage,
	getSubscribers: getSubscribers,
	_chooseSubscribersHash: _chooseSubscribersHash,
	_registerSubscriber: _registerSubscriber,
	_removeSubscriber: _removeSubscriber,
	_removeAllSubscribers: _removeAllSubscribers,
	_callPatternSubscribers: _callPatternSubscribers,
	_callSubscribers: _callSubscribers,
	_setMessageSource: _setMessageSource
});


/**
 * A default map of proxy methods used by ComponentFacet and Component classes to pass to Messenger when it is instantiated.
 * This map is for convenience only, it is NOT used internally by Messenger, a host class should pass it for methods to be proxied this way.
 * `onMessage` and `offMessage` are proxied as `on` and `off` if this map is used.
 */
Messenger.defaultMethods = {
	on: 'onMessage',
	off: 'offMessage',
	onMessages: 'onMessages',
	offMessages: 'offMessages',
	postMessage: 'postMessage',
	getSubscribers: 'getSubscribers'
};


module.exports = Messenger;


/**
 * Messenger instance method
 * Initializes Messenger. Method is called by Mixin class constructor.
 * See [onMessage](#onMessage) method, [Messenger](#Messenger) class above and [MessageSource](./message_source.js.html) class.
 *
 * @param {Object} hostObject Optional object that stores the messenger on one of its properties. It is used to proxy methods of messenger and also as a context for subscribers when they are called by the Messenger. See onMessage method.
 * @param {Object} proxyMethods Optional map of method names; key - proxy method name, value - messenger's method name.
 * @param {MessageSource} messageSource Optional messageSource linked to the messenger. If messageSource is supplied, the reference to the messenger will stored on its 'messenger' property
 */
function init(hostObject, proxyMethods, messageSource) {
	// hostObject and proxyMethods are used in Mixin and checked there
	if (messageSource)
		this._setMessageSource(messageSource);

 	// messenger data
 	_.defineProperties(this, {
 		_messageSubscribers: {},
 		_patternMessageSubscribers: {},
 	});
}


/**
 * Messenger instance method.
 * Registers a subscriber function for a certain message(s).
 * This method returns `true` if the subscription was successful. It can be unsuccessful if the passed subscriber has already been subscribed to this message type - double subscription never happens and it is safe to subscribe again - no error or warning is thrown or logged.
 * Subscriber is passed two parameters: `message` (string) and `data` (object). Data object is supplied when message is dispatched, Messenger itself adds nothing to it. For example, [events facet](../components/c_facets/Events.js.html) sends actual DOM event when it posts message.
 * Usage:
 * ```
 * // subscribes onMouseUpDown to two DOM events on component via events facet.
 * myComp.events.on('mousedown mouseup', onMouseUpDown);
 * function onMouseUpDown(eventType, event) {
 *     // ...
 * }
 *
 * myComp.data.on(/.+/, function(msg, data) {
 *     logger.debug(msg, data);
 * }); // subscribes anonymous function to all non-empty messages on data facet
 * // it will not be possible to unsubscribe anonymous subscriber separately,
 * // but myComp.data.off(/.+/) will unsubscribe it
 * ```
 * If messenger has [MessageSource](./message_source.js.html) attached to it, MessageSource will be notified when the first subscriber for a given message is added, so it can subscribe to the source.
 * [Components](../components/c_class.js.html) and [facets](../components/c_facet.js.html) change this method name to `on` when they proxy it.
 * See [postMessage](#postMessage).
 * 
 * @param {String|Array[String]|RegExp} messages Message types that should envoke the subscriber.
 *  If string is passed, it can be a sigle message or multiple message types separated by whitespace with optional commas.
 *  If an array of strings is passed, each string is a message type to subscribe for.
 *  If a RegExp is passed, the subscriber will be envoked when the message dispatched on the messenger matches the pattern (or IS the RegExp with identical pattern).
 *  Pattern subscriber does NOT cause any subscription to MessageSource, it only captures messages that are already subscribed to with precise message types.
 * @param {Function} subscriber Message subscriber - a function that will be called when the message is dispatched on the messenger (usually via proxied postMessage method of host object).
 *  If hostObject was supplied to Messenger constructor, hostObject will be the context (the value of this) for the subscriber envocation.
 * @return {Boolean}
 */
function onMessage(messages, subscriber) {
	check(messages, Match.OneOf(String, [String], RegExp));
	check(subscriber, Function); 

	if (typeof messages == 'string')
		messages = messages.split(messagesSplitRegExp);

	var subscribersHash = this._chooseSubscribersHash(messages);

	if (messages instanceof RegExp)
		return this._registerSubscriber(subscribersHash, messages, subscriber);

	else {
		var wasRegistered = false;

		messages.forEach(function(message) {
			var notYetRegistered = this._registerSubscriber(subscribersHash, message, subscriber);			
			wasRegistered = wasRegistered || notYetRegistered;			
		}, this);

		return wasRegistered;
	}
}


/**
 * "Private" Messenger instance method
 * It is called by [onMessage](#onMessage) to register subscriber for one message type.
 * Returns `true` if this subscriber is not yet registered for this type of message.
 * If messenger has [MessageSource](./message_source.js.html) attached to it, MessageSource will be notified when the first subscriber for a given message is added.
 *
 * @private
 * @param {Object} subscribersHash The map of subscribers determined by [onMessage](#onMessage) based on Message type, can be `this._patternMessageSubscribers` or `this._messageSubscribers`
 * @param {String} message Message type
 * @param {Function} subscriber Subscriber function to be removed
 * @return {Boolean}
 */
function _registerSubscriber(subscribersHash, message, subscriber) {
	if (! (subscribersHash[message] && subscribersHash[message].length)) {
		subscribersHash[message] = [];
		if (message instanceof RegExp)
			subscribersHash[message].pattern = message;
		else if (this._messageSource)
			this._messageSource.onSubscriberAdded(message);
		var noSubscribers = true;
	}

	var msgSubscribers = subscribersHash[message];
	var notYetRegistered = noSubscribers || msgSubscribers.indexOf(subscriber) == -1;

	if (notYetRegistered)
		msgSubscribers.push(subscriber);

	return notYetRegistered;
}


/**
 * Messenger instance method.
 * Subscribes to multiple messages passed as map together with subscribers.
 * Usage:
 * ```
 * myComp.events.onMessages({
 *     'mousedown': onMouseDown,
 *     'mouseup': onMouseUp
 * });
 * function onMouseDown(eventType, event) {}
 * function onMouseUp(eventType, event) {}
 * ```
 * Returns map with the same keys (message types) and boolean values indicating whether particular subscriber was added.
 * It is NOT possible to add pattern subscriber using this method, as although you can use RegExp as the key, JavaScript will automatically convert it to string.
 *
 * @param {Object[Function]} messageSubscribers Map of message subscribers to be added
 * @return {Object[Boolean]}
 */
function onMessages(messageSubscribers) {
	check(messageSubscribers, Match.ObjectHash(Function));

	var notYetRegisteredMap = _.mapKeys(messageSubscribers, function(subscriber, messages) {
		return this.onMessage(messages, subscriber);
	}, this);

	return notYetRegisteredMap;
}


/**
 * Messenger instance method.
 * Removes a subscriber for message(s). Removes all subscribers for the message if subscriber isn't passed.
 * This method returns `true` if the subscriber was registered. No error or warning is thrown or logged if you remove subscriber that was not registered.
 * [Components](../components/c_class.js.html) and [facets](../components/c_facet.js.html) change this method name to `off` when they proxy it.
 * Usage:
 * ```
 * // unsubscribes onMouseUpDown from two DOM events.
 * myComp.events.off('mousedown mouseup', onMouseUpDown);
 * ```
 * If messenger has [MessageSource](./message_source.js.html) attached to it, MessageSource will be notified when the last subscriber for a given message is removed and there is no more subscribers for this message.
 *
 * @param {String|Array[String]|RegExp} messages Message types that a subscriber should be removed for.
 *  If string is passed, it can be a sigle message or multiple message types separated by whitespace with optional commas.
 *  If an array of strings is passed, each string is a message type to remove a subscriber for.
 *  If a RegExp is passed, the pattern subscriber will be removed.
 *  RegExp subscriber does NOT cause any subscription to MessageSource, it only captures messages that are already subscribed to with precise message types.
 * @param {Function} subscriber Message subscriber - Optional function that will be removed from the list of subscribers for the message(s). If subscriber is not supplied, all subscribers will be removed from this message(s).
 * @return {Boolean}
 */
function offMessage(messages, subscriber) {
	check(messages, Match.OneOf(String, [String], RegExp));
	check(subscriber, Match.Optional(Function)); 

	if (typeof messages == 'string')
		messages = messages.split(messagesSplitRegExp);

	var subscribersHash = this._chooseSubscribersHash(messages);

	if (messages instanceof RegExp)
		return this._removeSubscriber(subscribersHash, messages, subscriber);

	else {
		var wasRemoved = false;

		messages.forEach(function(message) {
			var subscriberRemoved = this._removeSubscriber(subscribersHash, message, subscriber);			
			wasRemoved = wasRemoved || subscriberRemoved;			
		}, this);

		return wasRemoved;
	}
}


/**
 * "Private" Messenger instance method
 * It is called by [offMessage](#offMessage) to remove subscriber for one message type.
 * Returns `true` if this subscriber was registered for this type of message.
 * If messenger has [MessageSource](./message_source.js.html) attached to it, MessageSource will be notified when the last subscriber for a given message is removed and there is no more subscribers for this message.
 *
 * @private
 * @param {Object} subscribersHash The map of subscribers determined by [offMessage](#offMessage) based on message type, can be `this._patternMessageSubscribers` or `this._messageSubscribers`
 * @param {String} message Message type
 * @param {Function} subscriber Subscriber function to be removed
 * @return {Boolean}
 */
function _removeSubscriber(subscribersHash, message, subscriber) {
	var msgSubscribers = subscribersHash[message];
	if (! msgSubscribers || ! msgSubscribers.length)
		return false; // nothing removed

	if (subscriber) {
		var subscriberIndex = msgSubscribers.indexOf(subscriber);
		if (subscriberIndex == -1) 
			return false; // nothing removed
		msgSubscribers.splice(subscriberIndex, 1);
		if (! msgSubscribers.length)
			this._removeAllSubscribers(subscribersHash, message);

	} else 
		this._removeAllSubscribers(subscribersHash, message);

	return true; // subscriber(s) removed
}


/**
 * "Private" Messenger instance method
 * It is called by [_removeSubscriber](#_removeSubscriber) to remove all subscribers for one message type.
 * If messenger has [MessageSource](./message_source.js.html) attached to it, MessageSource will be notified that all message subscribers were removed so it can unsubscribe from the source.
 *
 * @private
 * @param {Object} subscribersHash The map of subscribers determined by [offMessage](#offMessage) based on message type, can be `this._patternMessageSubscribers` or `this._messageSubscribers`
 * @param {String} message Message type
 */
function _removeAllSubscribers(subscribersHash, message) {
	delete subscribersHash[message];
	if (this._messageSource && typeof message == 'string')
		this._messageSource.onSubscriberRemoved(message);
}


/**
 * Messenger instance method.
 * Unsubscribes from multiple messages passed as map together with subscribers.
 * Returns map with the same keys (message types) and boolean values indicating whether particular subscriber was removed.
 * If a subscriber for one of the messages is not supplied, all subscribers for this message will be removed.
 * Usage:
 * ```
 * myComp.events.offMessages({
 *     'mousedown': onMouseDown,
 *     'mouseup': onMouseUp,
 *     'click': undefined // all subscribers to this message will be removed
 * });
 * ```
 * It is NOT possible to remove pattern subscriber(s) using this method, as although you can use RegExp as the key, JavaScript will automatically convert it to string.
 *
 * @param {Object[Function]} messageSubscribers Map of message subscribers to be removed
 * @return {Object[Boolean]}
 */
function offMessages(messageSubscribers) {
	check(messageSubscribers, Match.ObjectHash(Function));

	var subscriberRemovedMap = _.mapKeys(messageSubscribers, function(subscriber, messages) {
		return this.offMessage(messages, subscriber);
	}, this);

	return subscriberRemovedMap;	
}


// TODO - send event to messageSource


/**
 * Messenger instance method.
 * Dispatches the message calling all subscribers registered for this message and, if the message is a string, calling all pattern subscribers when message matches the pattern.
 * Each subscriber is passed the same parameters that are passed to theis method.
 * The context of the subscriber envocation is set to the host object (`this._hostObject`) that was passed to the messenger constructor.
 *
 * @param {String|RegExp} message message to be dispatched
 *  If the message is a string, the subscribers registered with exactly this message will be called and also pattern subscribers registered with the pattern that matches the dispatched message.
 *  If the message is RegExp, only the subscribers registered with exactly this pattern will be called.
 * @param {Any} data data that will be passed to the subscriber as the second parameter. Messenger does not modify this data in any way.
 */
function postMessage(message, data) {
	check(message, Match.OneOf(String, RegExp));

	var subscribersHash = this._chooseSubscribersHash(message);
	var msgSubscribers = subscribersHash[message];

	this._callSubscribers(message, data, msgSubscribers);

	if (typeof message == 'string')
		this._callPatternSubscribers(message, data);
}


/**
 * "Private" Messenger instance method
 * Envokes pattern subscribers with the pattern that matches the message.
 * The method is called by [postMessage](#postMessage) - see more information there.
 *
 * @private
 * @param {String} message message to be dispatched. Pattern subscribers registered with the pattern that matches the dispatched message will be called.
 * @param {Any} data data that will be passed to the subscriber as the second parameter. Messenger does not modify this data in any way.
 */
function _callPatternSubscribers(message, data) {
	_.eachKey(this._patternMessageSubscribers, 
		function(patternSubscribers) {
			var pattern = patternSubscribers.pattern;
			if (pattern.test(message))
				this._callSubscribers(message, data, patternSubscribers);
		}
	, this);
}


/**
 * "Private" Messenger instance method
 * Envokes subscribers from the passed list.
 * The method is called by [postMessage](#postMessage) and [_callPatternSubscribers](#_callPatternSubscribers).
 *
 * @private
 * @param {String} message message to be dispatched, passed to subscribers as the first parameter.
 * @param {Any} data data that will be passed to the subscriber as the second parameter. Messenger does not modify this data in any way.
 * @param {Array[Function]} msgSubscribers the array of message subscribers to be called. Each subscriber is called with the host object (see Messenger constructor) as the context.
 */
function _callSubscribers(message, data, msgSubscribers) {
	if (msgSubscribers && msgSubscribers.length)
		msgSubscribers.forEach(function(subscriber) {
			subscriber.call(this._hostObject, message, data);
		}, this);
}


/**
 * Messenger instance method.
 * Returns the array of subscribers that would be called if the message were dispatched.
 * If `includePatternSubscribers === false`, pattern subscribers with matching patters will not be included (by default they are included).
 * If there are no subscribers to the message, `undefined` will be returned, not an empty array, so it is safe to use the result in boolean tests.
 *
 * @param {String|RegExp} message Message to get subscribers for.
 *  If the message is RegExp, only pattern subscribers registered with exactly this pattern will be returned.
 *  If the message is String, subscribers registered with the string messages and pattern subscribers registered with matching pattern will be returned (unless the second parameter is false).
 * @param {Boolean} includePatternSubscribers Optional false to prevent inclusion of patter subscribers, by default they are included.
 * @return {Array|undefined}
 */
function getSubscribers(message, includePatternSubscribers) {
	check(message, Match.OneOf(String, RegExp));

	var subscribersHash = this._chooseSubscribersHash(message);
	var msgSubscribers = subscribersHash[message]
							? [].concat(subscribersHash[message])
							: [];

	// pattern subscribers are incuded by default
	if (includePatternSubscribers !== false && typeof message == 'string') {
		_.eachKey(this._patternMessageSubscribers, 
			function(patternSubscribers) {
				var pattern = patternSubscribers.pattern;
				if (patternSubscribers && patternSubscribers.length
						&& pattern.test(message))
					_.appendArray(msgSubscribers, patternSubscribers);
			}
		);
	}

	// return undefined if there are no subscribers
	return msgSubscribers.length
				? msgSubscribers
				: undefined;
}


/**
 * "Private" Messenger instance method
 * Returns the map of subscribers for a given message type.
 *
 * @private
 * @param {String|RegExp} message Message to choose the map of subscribers for
 * @return {Object[Function]} 
 */
function _chooseSubscribersHash(message) {
	return message instanceof RegExp
				? this._patternMessageSubscribers
				: this._messageSubscribers;
}


/**
 * Messenger instance method
 * Sets [MessageSource](./message_source.js.html) for the messenger also setting the reference to the messenger in the MessageSource.
 * MessageSource can be passed to message constructor; this method allows to set it at a later time. For example, the subclasses of [ComponentFacet](../components/c_facet.js.html) use this method to set different MessageSource'es in the messenger that is created by ComponentFacet.
 * Currently the method is implemented in such way that it can be called only once - MessageSource cannot be changed after this method is called.
 *
 * @param {MessageSource} messageSource an instance of MessageSource class to attach to this messenger (and to have this messenger attached to it too)
 */
function _setMessageSource(messageSource) {
	check(messageSource, MessageSource);

 	_.defineProperty(this, '_messageSource', messageSource);
 	messageSource.messenger = this;
}

},{"../abstract/mixin":4,"../util/check":58,"../util/error":62,"./m_source":49,"mol-proto":70}],48:[function(require,module,exports){
'use strict';

var _ = require('mol-proto');


module.exports = MessengerAPI;


/**
 * `milo.classes.MessengerAPI`
 * Base class, subclasses of which can supplement the functionality of [MessageSource](./m_source.js.html) by implementing three methods:
 *
 * - `translateToSourceMessage` to translate source messages (recieved from external source via `MessageSOurce`) to internal messages (that are dispatched on Messenger), allowing to make internal messages more detailed than source messages. For example, [Editable facet](../components/c_facets/Editable.js.html) uses [EditableMsgAPI](../components/msg_api/editable.js.html) to define several internal messages related to the change of state in contenteditable DOM element.
 * - `createInternalData` to modify message data received from source to some more meaningful or more detailed message data that will be dispatched on Messenger. For example, [Data facet](../components/c_facets/Data.js.html) uses [DataMsgAPI](../components/msg_api/data.js.html) (subclass of MessengerAPI) to translate DOM messages to data change messages.
 * - `filterSourceMessage` to enable/disable message dispatch based on some conditions in data.
 *
 * If `MessageSource` constructor is not passed an instance of some subclass of `MessengerAPI`, it automatically creates an instance of MessengerAPI that defines all 3 of those methods in a trivial way. See these methods below for their signatures.
 *
 * @constructor
 * @this {MessengerAPI}
 * @return {MessengerAPI}
 */
function MessengerAPI() {
	if (this.init)
		this.init.apply(this, arguments);
}


/**
 * ####MessengerAPI instance methods####
 *
 * - [init](#init) - initializes MessengerAPI
 * - [addInternalMessage](#addInternalMessage) - adds internal message
 * - [removeInternalMessage](#removeInternalMessage) - removes internal message
 * - [getInternalMessages](#getInternalMessages) - returns the list of internal messages for given source message
 *
 * These methods should be redefined by subclass:
 *
 * - [translateToSourceMessage](#translateToSourceMessage) - converts internal message type to source (external) message type
 * - [createInternalData](#createInternalData) - converts source message data received via MessageSource to internal message data
 * - [filterSourceMessage](#filterSourceMessage) - filters source message based on the data of the message and the corresponding internal message that is about to be sent on Messenger
 */
_.extendProto(MessengerAPI, {
	init: init,
	addInternalMessage: addInternalMessage,
	removeInternalMessage: removeInternalMessage,
	getInternalMessages: getInternalMessages,

	// should be redefined by subclass
	translateToSourceMessage: translateToSourceMessage,
	createInternalData: createInternalData,
	filterSourceMessage: filterSourceMessage
});


/**
 * MessengerAPI instance method
 * Called by MessengerAPI constructor. Subclasses that re-implement `init` method should call this method using: `MessengerAPI.prototype.init.apply(this, arguments)`
 */
function init() {
	_.defineProperty(this, '_internalMessages', {});
}


/**
 * MessengerAPI instance method
 * Translates internal `message` to source message, adds internal `message` to the list, making sure the same `message` wasn't passed before (it would indicate Messenger error).
 * Returns source message if it is used first time (so that `MessageSource` subcribes to this source message) or `undefined`.
 *
 * @param {String} message internal message to be translated and added
 * @return {String|undefined}
 */
function addInternalMessage(message) {
	var internalMsgs
		, sourceMessage = this.translateToSourceMessage(message);

	if (! sourceMessage) return;

	if (this._internalMessages.hasOwnProperty(sourceMessage)) {
		internalMsgs = this._internalMessages[sourceMessage];
		if (internalMsgs.indexOf(message) == -1)
			internalMsgs.push(message);
		else
			logger.warn('Duplicate addInternalMessage call for internal message ' + message);
	} else {
		internalMsgs = this._internalMessages[sourceMessage] = [];
		internalMsgs.push(message);
		return sourceMessage;
	}
}


/**
 * MessengerAPI instance method
 * Removes internal `message` from the list connected to corresponding source message (`translateToSourceMessage` is used for translation).
 * Returns source message, if the last internal message was removed (so that `MessageSource` can unsubscribe from this source message), or `undefined`.
 *
 * @param {String} message internal message to be translated and removed
 * @return {String|undefined}
 */
function removeInternalMessage(message) {
	var sourceMessage = this.translateToSourceMessage(message);

	if (! sourceMessage) return;

	var internalMsgs = this._internalMessages[sourceMessage];

	if (internalMsgs && internalMsgs.length) {
		var messageIndex = internalMsgs.indexOf(message);
		if (messageIndex >= 0) {
			internalMsgs.splice(messageIndex, 1);
			if (internalMsgs.length == 0) {
				delete this._internalMessages[sourceMessage];
				return sourceMessage;
			}
		} else
			unexpectedNotificationWarning();
	} else
		unexpectedNotificationWarning();


	function unexpectedNotificationWarning() {
		logger.warn('notification received: un-subscribe from internal message ' + message
					 + ' without previous subscription notification');
	}
}


/**
 * MessengerAPI instance method
 * Returns the array of internal messages that were translated to given `sourceMessage`.
 * This method is used by `MessageSource` to dispatch source message on the `Mesenger`.
 *
 * @param {String} sourceMessage source message
 * @return {Array[String]}
 */
function getInternalMessages(sourceMessage) {
	return this._internalMessages[sourceMessage];
}


/**
 * MessengerAPI instance method
 * Subclasses should re-implement this method to define the rule for translation of internal `message` to source message. This class simply returns the same `message`.
 *
 * @param {String} message internal message to be translated
 * @return {String}
 */
function translateToSourceMessage(message) {
	return message
}


/**
 * MessengerAPI instance method
 * Subclasses should re-implement this method to define the rule for translation of source message data to internal message data. This class simply returns the same `sourceData`.
 * This method is used in [dispatchMessage](./m_source.js.html#dispatchMessage) method of `MessageSource`.
 *
 * @param {String} sourceMessage source message, can be used in translation rule
 * @param {String} message internal message, can be used in translation rule
 * @param {Object} sourceData data received from source that has to be translated to data that will be sent to internal Messenger subscriber
 * @return {Object}
 */
function createInternalData(sourceMessage, message, sourceData) {
	return sourceData;
}


/**
 * MessengerAPI instance method
 * Subclasses should re-implement this method to define the dispatch filter for internal messages. This method should return `true` to allow and `false` to prevent internal message dispatch. This class always returns `true`.
 * This method is used in [dispatchMessage](./m_source.js.html#dispatchMessage) method of `MessageSource`.
 *
 * @param {String} sourceMessage source message, can be used in filter rule
 * @param {String} message internal message, can be used in filter rule
 * @param {Object} internalData data translated by `createInternalData` method from source data, can be used in filter rule
 * @return {Boolean}
 */
function filterSourceMessage(sourceMessage, message, internalData) {
	return true;
}

},{"mol-proto":70}],49:[function(require,module,exports){
'use strict';

var Mixin = require('../abstract/mixin')
	, MessengerAPI = require('./m_api')
	, logger = require('../util/logger')
	, toBeImplemented = require('../util/error').toBeImplemented
	, _ = require('mol-proto')
	, check = require('../util/check')
	, Match = check.Match;


/**
 * `milo.classes.MessageSource`
 * An abstract class (subclass of [Mixin](../abstract/mixin.js.html)) for connecting [Messenger](./index.js.html) to external sources of messages (like DOM events) and defining higher level messages.
 * An instance of MessageSource can either be passed to Messenger constructor or later using `_setMessageSource` method of Messenger. Once set, MessageSource of Messenger cannot be changed.
 */
var MessageSource = _.createSubclass(Mixin, 'MessageSource', true);

module.exports = MessageSource;


/**
 * ####MessageSource instance methods####
 *
 * - [init](#init) - initializes messageSource - called by Mixin superclass
 * - [setMessenger](#setMessenger) - connects Messenger to MessageSource, is called from `init` or `_setMessageSource` methods of [Messenger](./index.js.html).
 * - [onSubscriberAdded](#onSubscriberAdded) - called by Messenger to notify when the first subscriber for an internal message was added, so MessageSource can subscribe to source
 * - [onSubscriberRemoved](#onSubscriberRemoved) - called by Messenger to notify when the last subscriber for an internal message was removed, so MessageSource can unsubscribe from source
 * - [dispatchMessage](#dispatchMessage) - dispatches source message. MessageSource subclass should implement mechanism when on actual source message this method is called.
 *
 * Methods below should be implemented in subclass:
 *
 * - [trigger](#trigger) - triggers messages on the source (an optional method)
 * - [addSourceListener](#addSourceListener) - adds listener/subscriber to external message
 * - [removeSourceListener](#removeSourceListener) - removes listener/subscriber from external message
 */
_.extendProto(MessageSource, {
	init: init,
	setMessenger: setMessenger,
	onSubscriberAdded: onSubscriberAdded,
 	onSubscriberRemoved: onSubscriberRemoved, 
 	dispatchMessage: dispatchMessage,
	_prepareMessengerAPI: _prepareMessengerAPI,

 	// Methods below must be implemented in subclass
 	trigger: toBeImplemented,
 	addSourceSubscriber: toBeImplemented,
 	removeSourceSubscriber: toBeImplemented
});


/**
 * MessageSource instance method.
 * Called by Mixin constructor.
 * MessageSource constructor should be passed the same parameters as this method signature.
 * If an instance of [MessengerAPI](./m_api.js.html) is passed as the third parameter, it extends MessageSource functionality to allow it to define new messages, to filter messages based on their data and to change message data. See [MessengerAPI](./m_api.js/html).
 *
 * @param {Object} hostObject Optional object that stores the MessageSource on one of its properties. It is used to proxy methods of MessageSource.
 * @param {Object[String]} proxyMethods Optional map of method names; key - proxy method name, value - MessageSource's method name.
 * @param {MessengerAPI} messengerAPI Optional instance of MessengerAPI.
 */
function init(hostObject, proxyMethods, messengerAPI) {
	this._prepareMessengerAPI(messengerAPI);
	_.defineProperty(this, '_internalMessages', {});
}


/**
 * MessageSource instance method.
 * Sets reference to Messenger instance.
 *
 * @param {Messenger} messenger reference to Messenger instance linked to this MessageSource
 */
function setMessenger(messenger) {
	_.defineProperty(this, 'messenger', messenger);
}


/**
 * MessageSource instance method.
 * Prepares [MessengerAPI](./m_api.js.html) passed to constructor by proxying its methods to itself or if MessengerAPI wasn't passed defines two methods to avoid checking their availability every time the message is dispatched.
 *
 * @param {MessengerAPI} messengerAPI Optional instance of MessengerAPI
 */
function _prepareMessengerAPI(messengerAPI) {
	check(messengerAPI, Match.Optional(MessengerAPI));

	if (! messengerAPI)
		messengerAPI = new MessengerAPI;

	_.defineProperty(this, 'messengerAPI', messengerAPI);
}


/**
 * MessageSource instance method.
 * Subscribes to external source using `addSourceSubscriber` method that should be implemented in subclass.
 * This method is called by [Messenger](./index.js.html) when the first subscriber to the `message` is added.
 * Delegates to supplied or default [MessengerAPI](./m_api.js) for translation of `message` to `sourceMessage`. `MessageAPI.prototype.addInternalMessage` will return undefined if this `sourceMessage` was already subscribed to to prevent duplicate subscription.
 *
 * @param {String} message internal Messenger message that has to be subscribed to at the external source of messages.
 */
function onSubscriberAdded(message) {
	var newSourceMessage = this.messengerAPI.addInternalMessage(message);
	if (newSourceMessage)
		this.addSourceSubscriber(newSourceMessage);
}


/**
 * MessageSource instance method.
 * Unsubscribes from external source using `removeSourceSubscriber` method that should be implemented in subclass.
 * This method is called by [Messenger](./index.js.html) when the last subscriber to the `message` is removed.
 * Delegates to supplied or default [MessengerAPI](./m_api.js) for translation of `message` to `sourceMessage`. `MessageAPI.prototype.removeInternalMessage` will return undefined if this `sourceMessage` was not yet subscribed to to prevent unsubscription without previous subscription.
 *
 * @param {String} message internal Messenger message that has to be unsubscribed from at the external source of messages.
 */
function onSubscriberRemoved(message) {
	var removedSourceMessage = this.messengerAPI.removeInternalMessage(message);
	if (removedSourceMessage)
		this.removeSourceSubscriber(removedSourceMessage);
}


/**
 * MessageSource instance method.
 * Dispatches sourceMessage to Messenger.
 * Mechanism that calls this method when the source message is received should be implemented by subclass (see [DOMEventsSource](../components/msg_src/dom_events) for example).
 * Delegates to supplied or default [MessengerAPI](./m_api.js) to create internal message data (`createInternalData`) and to filter the message based on its data and/or message (`filterSourceMessage`).
 * Base MessengerAPI class implements these two methods in a trivial way (`createInternalData` simply returns external data, `filterSourceMessage` returns `true`), they are meant to be implemented by subclass.
 *
 * @param {String} sourceMessage source message received from external source
 * @param {Object} sourceData data received from external source
 */
function dispatchMessage(sourceMessage, sourceData) {
	var api = this.messengerAPI
		, internalMessages = api.getInternalMessages(sourceMessage);
							
	if (internalMessages) {
		internalMessages.forEach(function(message) {
			var internalData = api.createInternalData(sourceMessage, message, sourceData);
			if (api.filterSourceMessage(sourceMessage, message, internalData))
				this.messenger.postMessage(message, internalData);
		}, this);
	}
}

},{"../abstract/mixin":4,"../util/check":58,"../util/error":62,"../util/logger":64,"./m_api":48,"mol-proto":70}],50:[function(require,module,exports){
'use strict';

var _ = require('mol-proto');

/**
 * `milo`
 *
 * A minimalist browser framework that binds DOM elements to JS components and components to models.
 *
 * `milo` is available as global object in the browser.
 * At the moment it is not possiible to require it with browserify to have it bundled with the app because of the way [brfs](https://github.com/substack/brfs) browserify plugin is implemented.
 * It is possible though to require `milo` with node to use universal parts of the framework (abstract classes, Messenger, Model, etc.):
 * ```
 * var milo = require('mol-milo');
 * ```
 * 
 * `milo` itself is a function that in the browser can be used to delay execution until DOM is ready.
 */
function milo(func) {
	milo.mail.on('domready', func);
}


/**
 * ####Milo packages####
 *
 * - [loader](./loader.js.html) - loading subviews into page
 * - [binder](./binder.js.html) - components instantiation and binding of DOM elements to them
 * - [minder](./minder.js.html) - data reactivity, one or two way, shallow or deep, as you like it
 * - [mail](./mail/index.js.html) - applicaiton level messenger, also connects to messages from other windows dispatched with `window.postMessage`.
 * - [config](./config.js.html) - milo configuration
 * - [util](./util/index.js.html) - logger, request, dom, check, error, etc.
 * - [classes](./classes.js.html) - abstract and base classes
 * - [attributes](./attributes/index.js.html) - classes that wrap DOM elements attributes recognized by milo
 * - [ComponentFacet](./components/c_facet.js.html) - base class of Component facet
 * - [Component](./components/c_class.js.html) - base Component class
 * - [Messenger](./messenger/index.js.html) - generic Messenger used in most other milo classes, can be mixed into app classes too.
 * - [Model](./model/index.js.html) - Model class that emits messages on changes to any depth without timer based watching
 * - [registry](./registry.js.html) - registries of fasets and components classes
 */
_.extend(milo, {
	loader: require('./loader'),
	binder: require('./binder'),
	minder: require('./minder'),
	mail: require('./mail'),
	config: require('./config'),
	util: require('./util'),
	classes: require('./classes'),
	attributes: require('./attributes'),
	ComponentFacet: require('./components/c_facet'),
	Component: require('./components/c_class'),
	Messenger: require('./messenger'),
	Model: require('./model'),
	registry: require('./registry')
});


// register included facets
require('./use_facets');

// register included components
require('./use_components');


// export for node/browserify
if (typeof module == 'object' && module.exports)	
	module.exports = milo;

// global milo for browser
if (typeof window == 'object')
	window.milo = milo;

},{"./attributes":9,"./binder":10,"./classes":11,"./components/c_class":12,"./components/c_facet":13,"./config":42,"./loader":43,"./mail":44,"./messenger":47,"./minder":51,"./model":53,"./registry":55,"./use_components":56,"./use_facets":57,"./util":63,"mol-proto":70}],51:[function(require,module,exports){
'use strict';

var Connector = require('./model/connector');


module.exports = minder;


/**
 * minder
 * This function creates one or many Connector objects that
 * create live reactive connection between objects implementing
 * dataSource interface:
 * Objects should emit messages when any part of their data changes,
 * methods `on` and `off` should be implemented to subscribe/unsubscribe
 * to change notification messages, methods `set` and `get` should be implemented to get/set data
 * on path objects, pointing to particular parts of the object, method `path`
 * should return path object for a given path string (see path utils for path string syntax).
 * Both Model and Data facet are such data sources, they can be linked by Connector object.
 *
 * @param {Object} ds1 the first data source. Instead of the first data source an array can be passed with arrays of Connection objects parameters in each array element.
 * @param {String} mode the connection mode that defines the direction and the depth of connection. Possible values are '->', '<<-', '<<<->>>', etc.
 * @param {Object} ds2 the second data source
 * @param {Object} options not implemented yet
 */
function minder(ds1, mode, ds2, options) {
	if (Array.isArray(ds1)) {
		var connDescriptions = ds1;
		var connectors = connDescriptions.map(function(descr) {
			return new Connector(descr[0], descr[1], descr[2], descr[3]);
		});
		return connectors;
	} else
		return new Connector(ds1, mode, ds2, options);
}

},{"./model/connector":52}],52:[function(require,module,exports){
'use strict';

var ConnectorError = require('../util/error').Connector
	, _ = require('mol-proto')
	, logger = require('../util/logger');


module.exports = Connector;


var modePattern = /^(\<*)\-+(\>*)$/;


/**
 * Connector
 * Class that creates connector object for data connection between
 * two data-sources
 * Data-sources should implement the following API:
 * get() - get value from datasource or its path
 * set(value) - set value to datasource or to its path
 * on(path, subscriber) - subscription to data changes with "*" support
 * off(path, subscriber)
 * path(accessPath) - to return the object that gives reference to some part of datasource
 * and complies with that api too.
 * @param {Object} ds1 the first data source.
 * @param {String} mode the connection mode that defines the direction and the depth of connection. Possible values are '->', '<<-', '<<<->>>', etc.
 * @param {Object} ds2 the second data source
 * @param {Object} options not implemented yet
 * @return {Connector} when called with `new`, creates a Connector object.
 */
function Connector(ds1, mode, ds2, options) {
	var parsedMode = mode.match(modePattern);

	if (! parsedMode)
		modeParseError();

	var depth1 = parsedMode[1].length
		, depth2 = parsedMode[2].length;

	if (depth1 && depth2 && depth1 != depth2)
		modeParseError();

	if (! depth1 && ! depth2)
		modeParseError();

	_.extend(this, {
		ds1: ds1,
		ds2: ds2,
		mode: mode,
		depth1: depth1,
		depth2: depth2,
		isOn: false	
	});

	this.on();

	function modeParseError() {
		throw new ConnectorError('invalid Connector mode: ' + mode);
	}
}


_.extendProto(Connector, {
	on: on,
	off: off
});


/**
 * on
 * Method of Connector that enables connection (if it was previously disabled)
 */
function on() {
	if (this.isOn)
		return logger.warn('data sources are already connected');

	var subscriptionPath = this._subscriptionPath =
		new Array(this.depth1 || this.depth2).join('*');

	var self = this;
	if (this.depth1)
		linkDataSource('_link1', '_link2', this.ds1, this.ds2, subscriptionPath);
	if (this.depth2)
		linkDataSource('_link2', '_link1',  this.ds2, this.ds1, subscriptionPath);

	this.isOn = true;


	function linkDataSource(linkName, stopLink, linkToDS, linkedDS, subscriptionPath) {
		var onData = function onData(path, data) {
			var dsPath = linkToDS.path(path);
			if (dsPath) {
				// turn off subscriber to prevent endless message loop for bi-directional connections
				linkToDS.off(subscriptionPath, self[stopLink]);
				// set the new data
				dsPath.set(data.newValue);
				// turn subscriber back off
				linkToDS.on(subscriptionPath, self[stopLink]);
			}
		};

		linkedDS.on(subscriptionPath, onData);

		self[linkName] = onData;
		return onData;
	}
}


/**
 * off
 * Method of Connector that disables connection (if it was previously enabled)
 */
function off() {
	if (! this.isOn)
		return logger.warn('data sources are already disconnected');

	var self = this;
	unlinkDataSource(this.ds1, '_link2');
	unlinkDataSource(this.ds2, '_link1');

	this.isOn = false;


	function unlinkDataSource(linkedDS, linkName) {
		if (self[linkName]) {
			linkedDS.off(self._subscriptionPath, self[linkName]);
			delete self[linkName];
		}
	}
}

},{"../util/error":62,"../util/logger":64,"mol-proto":70}],53:[function(require,module,exports){
'use strict';

var pathUtils = require('./path_utils')
	, Messenger = require('../messenger')
	, ModelError = require('../util/error').Model
	, Mixin = require('../abstract/mixin')
	, doT = require('dot')
	, _ = require('mol-proto')
	, check = require('../util/check')
	, Match = check.Match
	, fs = require('fs')
	, logger = require('../util/logger');

module.exports = Model;


/**
 * `milo.Model`
 * Model class instantiates objects that allow deep data access with __safe getters__ that return undefined (rather than throwing exception) when properties/items on unexisting objects/arrays are requested and __safe setters__ that create object trees when properties/items on unexisting objects/arrays are set and also post messages to allow subscription on changes and enable data reactivity.
 * Reactivity is implememnted via [Connector](./connector.js.html) that can be instantiated either directly or with more convenient interface of [milo.minder](../minder.js.html). At the moment model can be connected to [Data facet](../components/c_facets/Data.js.html) or to another model.
 * Model constructor returns objects that are functions at the same time; when called they return ModelPath objects that allow get/set access to any point in model data. See [ModelData](#ModelData) below.
 * 
 */
function Model(data, hostObject) {
	// `model` will be returned by constructor instead of `this`. `model`
	// (`modelPath` function) should return a ModelPath object with "synthesized" methods
	// to get/set model properties, to subscribe to property changes, etc.
	// Additional arguments of modelPath can be used in the path using interpolation - see ModelPath below.
	var model = function modelPath(accessPath) { // , ... arguments that will be interpolated
		return model.path.apply(model, arguments);
	};
	model.__proto__ = Model.prototype;

	var messenger = new Messenger(model, Messenger.defaultMethods);

	_.defineProperties(model, {
		hostObject: hostObject,
		_messenger: messenger
	});

	pathUtils.wrapMessengerMethods.call(model);

	if (data) model._data = data;

	return model;
}

Model.prototype.__proto__ = Model.__proto__;


var dotDef = {
	modelAccessPrefix: 'this._model._data',
	modelPostMessageCode: 'this._model.postMessage',
	getPathNodeKey: pathUtils.getPathNodeKey
};

var modelSetterDotDef = {
	modelAccessPrefix: 'this._data',
	modelPostMessageCode: 'this.postMessage',
	getPathNodeKey: pathUtils.getPathNodeKey
};

var getterTemplate = "'use strict';\n/* Only use this style of comments, not \"//\" */\nmethod = function get() {\n\tvar m = {{# def.modelAccessPrefix }};\n\treturn m {{~ it.parsedPath :pathNode }}\n\t\t{{? pathNode.interpolate}}\n\t\t\t&& (m = m[this._args[ {{= pathNode.interpolate }} ]])\n\t\t{{??}}\n\t\t\t&& (m = m{{= pathNode.property }})\n\t\t{{?}} {{~}};\n};\n"
	, setterTemplate = "'use strict';\n/* Only use this style of comments, not \"//\" */\n\n{{## def.addMsg: addChangeMessage(messages, messagesHash, { path: #}}\n\n{{## def.currProp:{{? currNode.interpolate }}[this._args[ {{= currNode.interpolate }} ]]{{??}}{{= currProp }}{{?}} #}}\n\n{{## def.wasDefined: m.hasOwnProperty(\n\t{{? currNode.interpolate }}\n\t\tthis._args[ {{= currNode.interpolate }} ]\n\t{{??}}\n\t\t'{{= it.getPathNodeKey(currNode) }}'\n\t{{?}}\n) #}}\n\n{{## def.changeAccessPath:\n\taccessPath += {{? currNode.interpolate }}\n\t\t{{? currNode.syntax == 'array' }}\n\t\t\t'[' + this._args[ {{= currNode.interpolate }} ] + ']';\n\t\t{{??}}\n\t\t\t'.' + this._args[ {{= currNode.interpolate }} ];\n\t\t{{?}}\n\t{{??}}\n\t\t'{{= currProp }}';\n\t{{?}}\n#}}\n\nmethod = function set(value) {\n\tvar m = {{# def.modelAccessPrefix }};\n\tvar messages = [], messagesHash = {};\n\tvar wasDef = true;\n\tvar old = m;\n\n\tif (! m) {\n\t\t{{ var emptyProp = it.parsedPath[0] && it.parsedPath[0].empty; }}\n\t\tm = {{# def.modelAccessPrefix }} = {{= emptyProp || 'value' }};\n\t\twasDef = false;\n\n\t\t{{? emptyProp }}\n\t\t\t{{# def.addMsg }} '', type: 'added',\n\t\t\t\t  newValue: m });\n\t\t{{?}}\n\t}\n\n\tvar accessPath = '';\n\t{{  var modelDataProperty = '';\n\t\tvar nextNode = it.parsedPath[0];\n\t\tfor (var i = 0, count = it.parsedPath.length - 1; i < count; i++) {\n\t\t\tvar currNode = nextNode;\n\t\t\tvar currProp = currNode.property;\n\t\t\tnextNode = it.parsedPath[i + 1];\n\t\t\tvar emptyProp = nextNode && nextNode.empty;\n\t}}\n\n\t\t\t{{# def.changeAccessPath }}\n\n\t\t\tif (! {{# def.wasDefined}}) { \n\n\t\t\t\tm = m{{# def.currProp }} = {{= emptyProp }};\n\n\t\t\t\t{{# def.addMsg }} accessPath, type: 'added', \n\t\t\t\t\t  newValue: m });\n\n\t\t\t} else if (typeof m{{# def.currProp }} != 'object') {\n\t\t\t\tvar old = m{{# def.currProp }};\n\t\t\t\tm = m{{# def.currProp }} = {{= emptyProp }};\n\n\t\t\t\t{{# def.addMsg }} accessPath, type: 'changed', \n\t\t\t\t\t  oldValue: old, newValue: m });\n\n\t\t\t} else\n\t\t\t\tm = m{{# def.currProp }};\n\n\t{{  } /* for loop */\n\t\tcurrNode = nextNode;\n\t\tcurrProp = currNode && currNode.property;\n\t}}\n\n\t{{? currProp }}\n\t\twasDef = {{# def.wasDefined}};\n\t\t{{# def.changeAccessPath }}\n\n\t\tvar old = m{{# def.currProp }};\n\t\tm{{# def.currProp }} = value;\n\t{{?}}\n\n\tif (! wasDef)\n\t\t{{# def.addMsg }} accessPath, type: 'added',\n\t\t\t  newValue: value });\n\telse if (old != value)\n\t\t{{# def.addMsg }} accessPath, type: 'changed',\n\t\t\t  oldValue: old, newValue: value });\n\n\tif (! wasDef || old != value)\t\n\t\taddTreeChangesMessages(messages, messagesHash,\n\t\t\taccessPath, old, value); /* defined in the function that synthesizes ModelPath setter */\n\n\tmessages.forEach(function(msg) {\n\t\t{{# def.modelPostMessageCode }}(msg.path, msg);\n\t}, this);\n};\n";

doT.templateSettings.strip = false;

var getterSynthesizer = doT.compile(getterTemplate, dotDef)
	, setterSynthesizer = doT.compile(setterTemplate, dotDef)
	, modelSetterSynthesizer = doT.compile(setterTemplate, modelSetterDotDef);


_.extendProto(Model, {
	get: Model$get,
	set: synthesizeMethod(modelSetterSynthesizer, '', []),
	path: Model$path,
	push: ModelPath$push,
	proxyMessenger: proxyMessenger
});

function Model$get() {
	return this._data;
}

// returns ModelPath object
function Model$path(accessPath) {  // , ... arguments that will be interpolated
	// "null" is context to pass to ModelPath, first parameter of bind
	// "this" (model) is added in front of all arguments
	_.splice(arguments, 0, 0, null, this);

	// calling ModelPath constructor with new and the list of arguments: this (model), accessPath, ...
	return new (Function.prototype.bind.apply(ModelPath, arguments));
}


function proxyMessenger(modelHostObject) {
	Mixin.prototype._createProxyMethods.call(this._messenger, Messenger.defaultMethods, modelHostObject);
}


_.extend(Model, {
	Path: ModelPath
});

function ModelPath(model, path) { // ,... - additional arguments for interpolation
	check(model, Model);
	check(path, String);
	// check(it, Match.Optional(Object));

	_.defineProperties(this, {
		_model: model,
		_path: path,
		_args: _.slice(arguments, 1)
	});

	// compiling getter and setter
	var methods = synthesizePathMethods(path);

	// adding methods to model path
	_.defineProperties(this, methods);

	Object.freeze(this);
}


// adding messaging methods to ModelPath prototype
var modelPathMessengerMethods = _.mapToObject(['on', 'off'], function(methodName) {
	// creating subscribe/unsubscribe/etc. methods for ModelPath class
	// to dispatch messages with paths relative to access path of ModelPath
	return function(accessPath, subscriber) {
		check(accessPath, String);
		var self = this;
		this._model[methodName](this._path + accessPath, function(msgPath, data) {
			data.fullPath = msgPath;
			if (msgPath.indexOf(self._path) == 0) {
				msgPath = msgPath.replace(self._path, '');
				data.path = msgPath;
			} else
				logger.warn('ModelPath message dispatched with wrong root path');

			subscriber.call(this, msgPath, data);
		});
	};
})

_.extendProto(ModelPath, modelPathMessengerMethods);

_.extendProto(ModelPath, {
	path: ModelPath$path,
	push: ModelPath$push
})


function ModelPath$path(accessPath) {  // , ... arguments that will be interpolated
	var thisPathArgsCount = this._args.length - 1;

	if (thisPathArgsCount > 0) {// this path has interpolated arguments too
		accessPath = accessPath.replace(/\$[1-9][0-9]*/g, function(str){
			return '$' + (+str.slice(1) + thisPathArgsCount);
		});
	}

	var newPath = this._path + accessPath;

	// "null" is context to pass to ModelPath, first parameter of bind
	// this._model is added in front of all arguments as the first parameter
	// of ModelPath constructor
	var bindArgs = [null, this._model, newPath]
						.concat(this._args.slice(1)) // remove old path from _args, as it is 1 based
						.concat(_.slice(arguments, 1)); // add new interpolation arguments

	// calling ModelPath constructor with new and the list of arguments: this (model), accessPath, ...
	return new (Function.prototype.bind.apply(ModelPath, bindArgs));
}


function ModelPath$push(value) {
	var data = this.get()
		, length = data && data.length || 0;
	this.path('[$1]', length).set(value);
}


var synthesizePathMethods = _.memoize(_synthesizePathMethods);

function _synthesizePathMethods(path) {
	var parsedPath = pathUtils.parseAccessPath(path);

	var methods = {
		get: synthesizeMethod(getterSynthesizer, path, parsedPath),
		set: synthesizeMethod(setterSynthesizer, path, parsedPath)
	};

	return methods;
}


function synthesizeMethod(synthesizer, path, parsedPath) {
	var method
		, methodCode = synthesizer({
			parsedPath: parsedPath,
			getPathNodeKey: pathUtils.getPathNodeKey
		});

	try {
		eval(methodCode);
	} catch (e) {
		throw ModelError('ModelPath method compilation error; path: ' + path + ', code: ' + methodCode);
	}

	return method;


	// functions used by ModelPath setter (synthesized by template)
	function addChangeMessage(messages, messagesHash, msg) {
		messages.push(msg);
		messagesHash[msg.path] = msg;
	}

	function addTreeChangesMessages(messages, messagesHash, rootPath, oldValue, newValue) {
		var oldIsTree = valueIsTree(oldValue)
			, newIsTree = valueIsTree(newValue);

		if (newIsTree)
			addMessages(rootPath, newValue, 'added', 'newValue');
		
		if (oldIsTree)
			addMessages(rootPath, oldValue, 'removed', 'oldValue');


		function addMessages(rootPath, obj, msgType, valueProp) {
			if (Array.isArray(obj)) {
				var pathSyntax = rootPath + '[$$]';
				obj.forEach(function(value, index) {
					addMessage(value, index, pathSyntax);
				});
			} else {
				var pathSyntax = rootPath + '.$$';
				_.eachKey(obj, function(value, key) {
					addMessage(value, key, pathSyntax);
				});
			}


			function addMessage(value, key, pathSyntax) {
				var path = pathSyntax.replace('$$', key)
					, existingMsg = messagesHash[path];

				if (existingMsg) {
					if (existingMsg.type == msgType)
						logger.error('setter error: same message type posted on the same path')
					else {
						existingMsg.type = 'changed';
						existingMsg[valueProp] = value;
					}
				} else {
					var msg = { path: path, type: msgType };
					msg[valueProp] = value;
					addChangeMessage(messages, messagesHash, msg)
				}

				if (valueIsTree(value))
					addMessages(path, value, msgType, valueProp);
			}
		}
	}

	function valueIsTree(value) {
		return typeof value == "object" && Object.keys(value).length;
	}
}

},{"../abstract/mixin":4,"../messenger":47,"../util/check":58,"../util/error":62,"../util/logger":64,"./path_utils":54,"dot":69,"fs":67,"mol-proto":70}],54:[function(require,module,exports){
'use strict';

// <a name="model-path"></a>
// ### model path utils

var check = require('../util/check')
	, Match = check.Match
	, _ = require('mol-proto');

var pathUtils = module.exports = {
	parseAccessPath: parseAccessPath,
	createRegexPath: createRegexPath,
	getPathNodeKey: getPathNodeKey,
	wrapMessengerMethods: wrapMessengerMethods
};


var propertyPathSyntax = '\\.[A-Za-z][A-Za-z0-9_]*'
	, arrayPathSyntax = '\\[[0-9]+\\]'
	, interpolationSyntax = '\\$[1-9][0-9]*'
	, propertyInterpolateSyntax = '\\.' + interpolationSyntax
	, arrayInterpolateSyntax = '\\[' + interpolationSyntax + '\\]'

	, propertyStarSyntax = '\\.\\*'
	, arrayStarSyntax = '\\[\\*\\]'
	, starSyntax = '\\*'

	, pathParseSyntax = [
							propertyPathSyntax,
							arrayPathSyntax,
							propertyInterpolateSyntax,
							arrayInterpolateSyntax
						].join('|')
	, pathParsePattern = new RegExp(pathParseSyntax, 'g')

	, patternPathParseSyntax =  [
									pathParseSyntax,
									propertyStarSyntax,
									arrayStarSyntax,
									starSyntax
								].join('|')
	, patternPathParsePattern = new RegExp(patternPathParseSyntax, 'g')

	//, targetPathParsePattern = /\.[A-Za-z][A-Za-z0-9_]*|\[[0-9]+\]|\.\$[1-9][0-9]*|\[\$[1-9][0-9]*\]|\$[1-9][0-9]/g
	, pathNodeTypes = {
		'.': { syntax: 'object', empty: '{}' },
		'[': { syntax: 'array', empty: '[]'},
		'*': { syntax: 'match', empty: '{}'},
	};

function parseAccessPath(path, nodeParsePattern) {
	nodeParsePattern = nodeParsePattern || pathParsePattern;

	var parsedPath = [];

	if (! path)
		return parsedPath;

	var unparsed = path.replace(nodeParsePattern, function(nodeStr) {
		var pathNode = { property: nodeStr };
		_.extend(pathNode, pathNodeTypes[nodeStr[0]]);
		if (nodeStr[1] == '$')
			pathNode.interpolate = getPathNodeKey(pathNode, true);

		parsedPath.push(pathNode);
		return '';
	});
	if (unparsed)
		throw new ModelError('incorrect model path: ' + path);

	return parsedPath;
}


var nodeRegex = {
	'.*': propertyPathSyntax,
	'[*]': arrayPathSyntax
};
nodeRegex['*'] = nodeRegex['.*'] + '|' + nodeRegex['[*]'];

function createRegexPath(path) {
	check(path, Match.OneOf(String, RegExp));

	if (path instanceof RegExp || path.indexOf('*') == -1)
		return path;

	var parsedPath = pathUtils.parseAccessPath(path, patternPathParsePattern)
		, regexStr = '^'
		, regexStrEnd = ''
		, patternsStarted = false;

	parsedPath.forEach(function(pathNode) {
		var prop = pathNode.property
			, regex = nodeRegex[prop];
		
		if (regex) {
			// regexStr += '(' + regex;
			// regexStrEnd += '|)';
			regexStr += '(' + regex + '|)';
			// regexStrEnd += '|)';
			patternsStarted = true;
		} else {
			// if (patternsStarted)
			// 	throw new ModelError('"*" path segment cannot be in the middle of the path: ' + path);
			regexStr += prop.replace(/(\.|\[|\])/g, '\\$1');
		}
	});

	regexStr += /* regexStrEnd + */ '$';

	try {
		return new RegExp(regexStr);
	} catch (e) {
		throw new ModelError('can\'t construct regex for path pattern: ' + path);
	}
}


function getPathNodeKey(pathNode, interpolated) {
	var prop = pathNode.property
		, startIndex = interpolated ? 2 : 1;
	return pathNode.syntax == 'array'
		? prop.slice(startIndex, prop.length - 1)
		: prop.slice(startIndex);
}


// TODO allow for multiple messages in a string
function wrapMessengerMethods(methodsNames) {
	methodsNames = methodsNames || ['on', 'off'];
	_.defineProperties(this, _.mapToObject(methodsNames, function(methodName) {
		var origMethod = this[methodName];
		// replacing message subsribe/unsubscribe/etc. to convert "*" message patterns to regexps
		return function(path, subscriber) {
			var regexPath = createRegexPath(path);
			origMethod.call(this, regexPath, subscriber);
		};
	}, this));
}

},{"../util/check":58,"mol-proto":70}],55:[function(require,module,exports){
'use strict';

/**
 * Registries of facets and of components
 *
 * - [facets](./components/c_facets/cf_registry.js.html)
 * - [components](./components/c_registry.js.html)
 */
var registry = module.exports = {
	facets: require('./components/c_facets/cf_registry'),
	components: require('./components/c_registry')
};

},{"./components/c_facets/cf_registry":27,"./components/c_registry":30}],56:[function(require,module,exports){
'use strict';

require('./components/classes/View');
require('./components/ui/Group');
require('./components/ui/Select');
require('./components/ui/Input');
require('./components/ui/Button');

},{"./components/classes/View":32,"./components/ui/Button":38,"./components/ui/Group":39,"./components/ui/Input":40,"./components/ui/Select":41}],57:[function(require,module,exports){
'use strict';

// ['Dom'
//  'Data'
//  'Frame'
//  'Events'
//  'Template'
//  'Container'
//  'ModelFacet'
//  'Drag'
//  'Drop'
//  'Editable'
//  'Split'
//  'List'
//  'Item'].

require('./components/c_facets/Dom');
require('./components/c_facets/Data');
require('./components/c_facets/Frame');
require('./components/c_facets/Events');
require('./components/c_facets/Template');
require('./components/c_facets/Container');
require('./components/c_facets/ModelFacet');
require('./components/c_facets/Drag');
require('./components/c_facets/Drop');
require('./components/c_facets/Editable');
require('./components/c_facets/Split');
require('./components/c_facets/List');
require('./components/c_facets/Item');

},{"./components/c_facets/Container":14,"./components/c_facets/Data":15,"./components/c_facets/Dom":16,"./components/c_facets/Drag":17,"./components/c_facets/Drop":18,"./components/c_facets/Editable":19,"./components/c_facets/Events":20,"./components/c_facets/Frame":21,"./components/c_facets/Item":22,"./components/c_facets/List":23,"./components/c_facets/ModelFacet":24,"./components/c_facets/Split":25,"./components/c_facets/Template":26}],58:[function(require,module,exports){
// <a name="utils-check"></a>
// milo.utils.check
// -----------

// Check is a module for parameters checking extracted from Meteor framework.

// It allows to both document and to check parameter types in your function
// making code both readable and stable.


// ### Usage

//     var check = milo.check
//         , Match = check.Match;

//     function My(name, obj, cb) {
//         // if any of checks fail an error will be thrown
//         check(name, String);
//         check(obj, Match.ObjectIncluding({ options: Object }));
//         check(cb, Function);

//         // ... your code
//     }

// See [Meteor docs](http://docs.meteor.com/#match) to see how it works


// ### Patterns

// All patterns and functions described in Meteor docs work.

// Unlike in Meteor, Object pattern matches instance of any class,
// not only plain object.

// In addition to patterns described in Meteor docs the following patterns are implemented

// * Match.__ObjectHash__(_pattern_)

//   Matches an object where all properties match a given pattern

// * Match.__Subclass__(_constructor_ [, _matchThisClassToo_])

//   Matches a class that is a subclass of a given class. If the second parameter
//   is true, it will also match the class itself.

//   Without this pattern to check if _MySubclass_ is a subclass of _MyClass_
//   you would have to use

//       check(MySubclass, Match.Where(function() {
//           return MySubclass.prototype instanceof MyClass;
//       });

'use strict';

// Things we explicitly do NOT support:
//    - heterogenous arrays
var _ = require('mol-proto');

var check = function (value, pattern) {
  // Record that check got called, if somebody cared.
  try {
    checkSubtree(value, pattern);
  } catch (err) {
    if ((err instanceof Match.Error) && err.path)
      err.message += " in field " + err.path;
    throw err;
  }
};
module.exports = check;

var Match = check.Match = {
  Optional: function (pattern) {
    return new Optional(pattern);
  },
  OneOf: function (/*arguments*/) {
    return new OneOf(arguments);
  },
  Any: ['__any__'],
  Where: function (condition) {
    return new Where(condition);
  },
  ObjectIncluding: function (pattern) {
    return new ObjectIncluding(pattern);
  },
  // Matches only signed 32-bit integers
  Integer: ['__integer__'],

  // Matches string that is a valid identifier, will not allow javascript reserved words
  IdentifierString: /^[a-z_$][0-9a-z_$]*$/i, 

  // Matches hash (object) with values matching pattern
  ObjectHash: function(pattern) {
    return new ObjectHash(pattern);
  },

  Subclass: function(Superclass, matchSuperclassToo) {
    return new Subclass(Superclass, matchSuperclassToo);
  },

  // XXX matchers should know how to describe themselves for errors
  Error: TypeError,

  // Meteor.makeErrorType("Match.Error", function (msg) {
    // this.message = "Match error: " + msg;
    // The path of the value that failed to match. Initially empty, this gets
    // populated by catching and rethrowing the exception as it goes back up the
    // stack.
    // E.g.: "vals[3].entity.created"
    // this.path = "";
    // If this gets sent over DDP, don't give full internal details but at least
    // provide something better than 500 Internal server error.
  //   this.sanitizedError = new Meteor.Error(400, "Match failed");
  // }),

  // Tests to see if value matches pattern. Unlike check, it merely returns true
  // or false (unless an error other than Match.Error was thrown).
  test: function (value, pattern) {
    try {
      checkSubtree(value, pattern);
      return true;
    } catch (e) {
      if (e instanceof Match.Error)
        return false;
      // Rethrow other errors.
      throw e;
    }
  }
};

function Optional(pattern) {
  this.pattern = pattern;
};

function OneOf(choices) {
  if (choices.length == 0)
    throw new Error("Must provide at least one choice to Match.OneOf");
  this.choices = choices;
};

function Where(condition) {
  this.condition = condition;
};

function ObjectIncluding(pattern) {
  this.pattern = pattern;
};

function ObjectHash(pattern) {
  this.pattern = pattern;
};

function Subclass(Superclass, matchSuperclassToo) {
  this.Superclass = Superclass;
  this.matchSuperclass = matchSuperclassToo;
};

var typeofChecks = [
  [String, "string"],
  [Number, "number"],
  [Boolean, "boolean"],
  // While we don't allow undefined in JSON, this is good for optional
  // arguments with OneOf.
  [undefined, "undefined"]
];

function checkSubtree(value, pattern) {
  // Match anything!
  if (pattern === Match.Any)
    return;

  // Basic atomic types.
  // Do not match boxed objects (e.g. String, Boolean)
  for (var i = 0; i < typeofChecks.length; ++i) {
    if (pattern === typeofChecks[i][0]) {
      if (typeof value === typeofChecks[i][1])
        return;
      throw new Match.Error("Expected " + typeofChecks[i][1] + ", got " +
                            typeof value);
    }
  }
  if (pattern === null) {
    if (value === null)
      return;
    throw new Match.Error("Expected null, got " + JSON.stringify(value));
  }

  // Match.Integer is special type encoded with array
  if (pattern === Match.Integer) {
    // There is no consistent and reliable way to check if variable is a 64-bit
    // integer. One of the popular solutions is to get reminder of division by 1
    // but this method fails on really large floats with big precision.
    // E.g.: 1.348192308491824e+23 % 1 === 0 in V8
    // Bitwise operators work consistantly but always cast variable to 32-bit
    // signed integer according to JavaScript specs.
    if (typeof value === 'number' && (value | 0) === value)
      return
    throw new Match.Error('Expected Integer, got '
                + (value instanceof Object ? JSON.stringify(value) : value));
  }

  if (pattern === Match.IdentifierString) {
    if (typeof value === 'string' && Match.IdentifierString.test(value)
        && _jsKeywords.indexOf(key) == -1)
      return;
    throw new Match.Error('Expected identifier string, got '
                + (value instanceof Object ? JSON.stringify(value) : value));
  }

  // "Object" is shorthand for Match.ObjectIncluding({});
  if (pattern === Object)
    pattern = Match.ObjectIncluding({});

  // Array (checked AFTER Any, which is implemented as an Array).
  if (pattern instanceof Array) {
    if (pattern.length !== 1)
      throw Error("Bad pattern: arrays must have one type element" +
                  JSON.stringify(pattern));
    if (!Array.isArray(value)) {
      throw new Match.Error("Expected array, got " + JSON.stringify(value));
    }

    value.forEach(function (valueElement, index) {
      try {
        checkSubtree(valueElement, pattern[0]);
      } catch (err) {
        if (err instanceof Match.Error) {
          err.path = _prependPath(index, err.path);
        }
        throw err;
      }
    });
    return;
  }

  // Arbitrary validation checks. The condition can return false or throw a
  // Match.Error (ie, it can internally use check()) to fail.
  if (pattern instanceof Where) {
    if (pattern.condition(value))
      return;
    // XXX this error is terrible
    throw new Match.Error("Failed Match.Where validation");
  }


  if (pattern instanceof Optional)
    pattern = Match.OneOf(undefined, pattern.pattern);

  if (pattern instanceof OneOf) {
    for (var i = 0; i < pattern.choices.length; ++i) {
      try {
        checkSubtree(value, pattern.choices[i]);
        // No error? Yay, return.
        return;
      } catch (err) {
        // Other errors should be thrown. Match errors just mean try another
        // choice.
        if (!(err instanceof Match.Error))
          throw err;
      }
    }
    // XXX this error is terrible
    throw new Match.Error("Failed Match.OneOf or Match.Optional validation");
  }

  // A function that isn't something we special-case is assumed to be a
  // constructor.
  if (pattern instanceof Function) {
    if (value instanceof pattern)
      return;
    // XXX what if .name isn't defined
    throw new Match.Error("Expected " + pattern.constructor.name);
  }

  var unknownKeysAllowed = false;
  if (pattern instanceof ObjectIncluding) {
    unknownKeysAllowed = true;
    pattern = pattern.pattern;
  }

  if (pattern instanceof ObjectHash) {
    var keyPattern = pattern.pattern;
    var emptyHash = true;
    for (var key in value) {
      emptyHash = false;
      check(value[key], keyPattern);
    }
    if (emptyHash)
      throw new Match.Error("Expected " + pattern.constructor.name);
    return;
  }

  if (pattern instanceof Subclass) {
    var Superclass = pattern.Superclass;
    if (pattern.matchSuperclass && value == Superclass) 
      return;
    if (! (value.prototype instanceof Superclass))
      throw new Match.Error("Expected " + pattern.constructor.name + " of " + Superclass.name);
    return;
  }

  if (typeof pattern !== "object")
    throw Error("Bad pattern: unknown pattern type");

  // An object, with required and optional keys. Note that this does NOT do
  // structural matches against objects of special types that happen to match
  // the pattern: this really needs to be a plain old {Object}!
  if (typeof value !== 'object')
    throw new Match.Error("Expected object, got " + typeof value);
  if (value === null)
    throw new Match.Error("Expected object, got null");

  var requiredPatterns = {};
  var optionalPatterns = {};

  _.eachKey(pattern, function(subPattern, key) {
    if (pattern[key] instanceof Optional)
      optionalPatterns[key] = pattern[key].pattern;
    else
      requiredPatterns[key] = pattern[key];
  }, this, true);

  _.eachKey(value, function(subValue, key) {
    var subValue = value[key];
    try {
      if (requiredPatterns.hasOwnProperty(key)) {
        checkSubtree(subValue, requiredPatterns[key]);
        delete requiredPatterns[key];
      } else if (optionalPatterns.hasOwnProperty(key)) {
        checkSubtree(subValue, optionalPatterns[key]);
      } else {
        if (!unknownKeysAllowed)
          throw new Match.Error("Unknown key");
      }
    } catch (err) {
      if (err instanceof Match.Error)
        err.path = _prependPath(key, err.path);
      throw err;
    }
  }, this, true);

  _.eachKey(requiredPatterns, function(value, key) {
    throw new Match.Error("Missing key '" + key + "'");
  }, this, true);
};


var _jsKeywords = ["do", "if", "in", "for", "let", "new", "try", "var", "case",
  "else", "enum", "eval", "false", "null", "this", "true", "void", "with",
  "break", "catch", "class", "const", "super", "throw", "while", "yield",
  "delete", "export", "import", "public", "return", "static", "switch",
  "typeof", "default", "extends", "finally", "package", "private", "continue",
  "debugger", "function", "arguments", "interface", "protected", "implements",
  "instanceof"];

// Assumes the base of path is already escaped properly
// returns key + base
function _prependPath(key, base) {
  if ((typeof key) === "number" || key.match(/^[0-9]+$/))
    key = "[" + key + "]";
  else if (!key.match(Match.IdentifierString) || _jsKeywords.indexOf(key) != -1)
    key = JSON.stringify([key]);

  if (base && base[0] !== "[")
    return key + '.' + base;
  return key + base;
};


},{"mol-proto":70}],59:[function(require,module,exports){
'use strict';

var count = require('./count')
	, config = require('../config')
	, prefix = config.componentPrefix;


module.exports = componentName;

function componentName() {
	return prefix + count();
}

},{"../config":42,"./count":60}],60:[function(require,module,exports){
// <a name="utils-count"></a>
// milo.utils.count
// ----------------

'use strict';

var count = 0;

function componentCount() {
	count++;
	return count;
}

componentCount.get = function() {
	return count;
}

module.exports = componentCount;

},{}],61:[function(require,module,exports){
'use strict';


module.exports = {
	filterNodeListByType: filterNodeListByType,
	selectElementContents: selectElementContents,
	getElementOffset: getElementOffset
};

/**
 * filterNodeListByType
 * Filters the list of nodes by type
 * @param {NodeList} nodeList the list of nodes, for example childNodes property of DOM element
 * @param {Integer} nodeType an integer constant [defined by DOM API](https://developer.mozilla.org/en-US/docs/Web/API/Node.nodeType), e.g. `Node.ELEMENT_NODE` or `Node.TEXT_NODE`
 */
function filterNodeListByType(nodeList, nodeType) {
	return _.filter(nodeList, function (node) {
		return node.nodeType == nodeType;
	});
}


/**
 * selectElementContents
 * Selects inner contents of DOM element
 * @param {Element} el DOM element
 */
function selectElementContents(el) {
    var range = document.createRange();
    range.selectNodeContents(el);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
}


/**
 * getElementOffset
 * Calculates an element's total top and left offset from the document edge.
 * @param {Element} el the element for which position needs to be returned
 * @return {Object} vector object with properties topOffset and leftOffset
 */
function getElementOffset(el) {
	var yPos, xPos;		

    yPos = el.offsetTop;
    xPos = el.offsetLeft;
    el = el.offsetParent;

    while (el != null) {
    	yPos += el.offsetTop;
    	xPos += el.offsetLeft;
        el = el.offsetParent;
    }  

    return { topOffset: yPos, leftOffset: xPos };
}

},{}],62:[function(require,module,exports){
// <a name="utils-error"></a>
// milo.utils.error
// -----------

'use strict';

var _ = require('mol-proto');


// module exports error classes for all names defined in this array
var errorClassNames = ['AbstractClass', 'Mixin', 'Messenger',
					   'Attribute', 'Binder', 'Loader', 'MailMessageSource', 'Facet',
					   'Scope', 'Model', 'DomFacet', 'EditableFacet',
					   'List', 'Connector', 'Registry', 'FrameMessageSource'];

var error = {
	toBeImplemented: error$toBeImplemented,
	createClass: error$createClass
};

errorClassNames.forEach(function(name) {
	error[name] = error$createClass(name + 'Error');
});

module.exports = error;


function error$createClass(errorClassName) {
	var ErrorClass = _.makeFunction(errorClassName, 'message',
			'this.name = "' + errorClassName + '"; \
			this.message = message || "There was an  error";');
	_.makeSubclass(ErrorClass, Error);

	return ErrorClass;
}


function error$toBeImplemented() {
	throw new error.AbstractClass('calling the method of an absctract class');
}

},{"mol-proto":70}],63:[function(require,module,exports){
// <a name="utils"></a>
// milo.utils
// -----------

'use strict';

var util = {
	logger: require('./logger'),
	request: require('./request'),
	check: require('./check'),
	error: require('./error'),
	count: require('./count'),
	componentName: require('./component_name'),
	dom: require('./dom')
};

module.exports = util;

},{"./check":58,"./component_name":59,"./count":60,"./dom":61,"./error":62,"./logger":64,"./request":66}],64:[function(require,module,exports){
// <a name="utils-logger"></a>
// milo.utils.logger
// -----------

// Application logger that has error, warn, info and debug
// methods, that can be suppressed by setting log level.

'use strict';

var Logger = require('./logger_class');

var logger = new Logger({ level: 3 });

module.exports = logger;

},{"./logger_class":65}],65:[function(require,module,exports){
// ### Logger Class

// Properties:

// - level

//   - 0 - error
//   - 1 - warn
//   - 2 - info
//   - 3 - debug (default)

// - enabled

//   true by default. Set to false to disable all logging in browser console.

'use strict';

var _ = require('mol-proto');


/**
 * Log levels.
 */

var levels = [
    'error',
    'warn',
    'info',
    'debug'
];

var maxLevelLength = Math.max.apply(Math, levels.map(function(level) { return level.length; }));

/**
 * Colors for log levels.
 */

var colors = [
    31,
    33,
    36,
    90
];

/**
 * Pads the nice output to the longest log level.
 */

function pad (str) {
    if (str.length < maxLevelLength)
        return str + new Array(maxLevelLength - str.length + 1).join(' ');

    return str;
};

/**
 * Logger (console).
 *
 * @api public
 */

var Logger = function (opts) {
    opts = opts || {}
    this.colors = opts.colors;
    this.level = opts.level || 3;
    this.enabled = opts.enabled || true;
    this.logPrefix = opts.logPrefix || '';
    this.logPrefixColor = opts.logPrefixColor;
};


/**
 * Log method.
 *
 * @api public
 */

Logger.prototype.log = function (type) {
    var index = levels.indexOf(type);

    if (index > this.level || ! this.enabled)
        return this;

    console.log.apply(
          console
        , [this.logPrefixColor
             ? '   \x1B[' + this.logPrefixColor + 'm' + this.logPrefix + '  -\x1B[39m'
             : this.logPrefix
          ,this.colors
             ? ' \x1B[' + colors[index] + 'm' + pad(type) + ' -\x1B[39m'
             : type + ':'
          ].concat(_.toArray(arguments).slice(1))
    );

    return this;
};

/**
 * Generate methods.
 */

levels.forEach(function (name) {
    Logger.prototype[name] = function () {
        this.log.apply(this, [name].concat(_.toArray(arguments)));
    };
});


module.exports = Logger;

},{"mol-proto":70}],66:[function(require,module,exports){
// <a name="utils-request"></a>
// milo.utils.request
// -----------

// example

// ```javascript
// var request = milo.utils.request
//     , opts: { method: 'GET' };

// request(url, opts, function(err, data) {
//     log(data);
// });

// request.get(url, function(err, data) {
//     log(data);
// });
// ```

'use strict';

var _ = require('mol-proto');

module.exports = request;


// TODO add error statuses
var okStatuses = ['200', '304'];


function request(url, opts, callback) {
	var req = new XMLHttpRequest();
	req.open(opts.method, url, true); // what true means?
	req.onreadystatechange = function () {
		if (req.readyState == 4 && req.statusText.toUpperCase() == 'OK' )
			callback(null, req.responseText, req);
		// else
		// 	callback(req.status, req.responseText, req);
	};
	req.send(null);
}

_.extend(request, {
	get: get
});


function get(url, callback) {
	request(url, { method: 'GET' }, callback);
}

},{"mol-proto":70}],67:[function(require,module,exports){

// not implemented
// The reason for having an empty file and not throwing is to allow
// untraditional implementation of this module.

},{}],68:[function(require,module,exports){
// doT.js
// 2011, Laura Doktorova, https://github.com/olado/doT
// Licensed under the MIT license.

(function() {
	"use strict";

	var doT = {
		version: '1.0.1',
		templateSettings: {
			evaluate:    /\{\{([\s\S]+?(\}?)+)\}\}/g,
			interpolate: /\{\{=([\s\S]+?)\}\}/g,
			encode:      /\{\{!([\s\S]+?)\}\}/g,
			use:         /\{\{#([\s\S]+?)\}\}/g,
			useParams:   /(^|[^\w$])def(?:\.|\[[\'\"])([\w$\.]+)(?:[\'\"]\])?\s*\:\s*([\w$\.]+|\"[^\"]+\"|\'[^\']+\'|\{[^\}]+\})/g,
			define:      /\{\{##\s*([\w\.$]+)\s*(\:|=)([\s\S]+?)#\}\}/g,
			defineParams:/^\s*([\w$]+):([\s\S]+)/,
			conditional: /\{\{\?(\?)?\s*([\s\S]*?)\s*\}\}/g,
			iterate:     /\{\{~\s*(?:\}\}|([\s\S]+?)\s*\:\s*([\w$]+)\s*(?:\:\s*([\w$]+))?\s*\}\})/g,
			varname:	'it',
			strip:		true,
			append:		true,
			selfcontained: false
		},
		template: undefined, //fn, compile template
		compile:  undefined  //fn, for express
	};

	if (typeof module !== 'undefined' && module.exports) {
		module.exports = doT;
	} else if (typeof define === 'function' && define.amd) {
		define(function(){return doT;});
	} else {
		(function(){ return this || (0,eval)('this'); }()).doT = doT;
	}

	function encodeHTMLSource() {
		var encodeHTMLRules = { "&": "&#38;", "<": "&#60;", ">": "&#62;", '"': '&#34;', "'": '&#39;', "/": '&#47;' },
			matchHTML = /&(?!#?\w+;)|<|>|"|'|\//g;
		return function() {
			return this ? this.replace(matchHTML, function(m) {return encodeHTMLRules[m] || m;}) : this;
		};
	}
	String.prototype.encodeHTML = encodeHTMLSource();

	var startend = {
		append: { start: "'+(",      end: ")+'",      endencode: "||'').toString().encodeHTML()+'" },
		split:  { start: "';out+=(", end: ");out+='", endencode: "||'').toString().encodeHTML();out+='"}
	}, skip = /$^/;

	function resolveDefs(c, block, def) {
		return ((typeof block === 'string') ? block : block.toString())
		.replace(c.define || skip, function(m, code, assign, value) {
			if (code.indexOf('def.') === 0) {
				code = code.substring(4);
			}
			if (!(code in def)) {
				if (assign === ':') {
					if (c.defineParams) value.replace(c.defineParams, function(m, param, v) {
						def[code] = {arg: param, text: v};
					});
					if (!(code in def)) def[code]= value;
				} else {
					new Function("def", "def['"+code+"']=" + value)(def);
				}
			}
			return '';
		})
		.replace(c.use || skip, function(m, code) {
			if (c.useParams) code = code.replace(c.useParams, function(m, s, d, param) {
				if (def[d] && def[d].arg && param) {
					var rw = (d+":"+param).replace(/'|\\/g, '_');
					def.__exp = def.__exp || {};
					def.__exp[rw] = def[d].text.replace(new RegExp("(^|[^\\w$])" + def[d].arg + "([^\\w$])", "g"), "$1" + param + "$2");
					return s + "def.__exp['"+rw+"']";
				}
			});
			var v = new Function("def", "return " + code)(def);
			return v ? resolveDefs(c, v, def) : v;
		});
	}

	function unescape(code) {
		return code.replace(/\\('|\\)/g, "$1").replace(/[\r\t\n]/g, ' ');
	}

	doT.template = function(tmpl, c, def) {
		c = c || doT.templateSettings;
		var cse = c.append ? startend.append : startend.split, needhtmlencode, sid = 0, indv,
			str  = (c.use || c.define) ? resolveDefs(c, tmpl, def || {}) : tmpl;

		str = ("var out='" + (c.strip ? str.replace(/(^|\r|\n)\t* +| +\t*(\r|\n|$)/g,' ')
					.replace(/\r|\n|\t|\/\*[\s\S]*?\*\//g,''): str)
			.replace(/'|\\/g, '\\$&')
			.replace(c.interpolate || skip, function(m, code) {
				return cse.start + unescape(code) + cse.end;
			})
			.replace(c.encode || skip, function(m, code) {
				needhtmlencode = true;
				return cse.start + unescape(code) + cse.endencode;
			})
			.replace(c.conditional || skip, function(m, elsecase, code) {
				return elsecase ?
					(code ? "';}else if(" + unescape(code) + "){out+='" : "';}else{out+='") :
					(code ? "';if(" + unescape(code) + "){out+='" : "';}out+='");
			})
			.replace(c.iterate || skip, function(m, iterate, vname, iname) {
				if (!iterate) return "';} } out+='";
				sid+=1; indv=iname || "i"+sid; iterate=unescape(iterate);
				return "';var arr"+sid+"="+iterate+";if(arr"+sid+"){var "+vname+","+indv+"=-1,l"+sid+"=arr"+sid+".length-1;while("+indv+"<l"+sid+"){"
					+vname+"=arr"+sid+"["+indv+"+=1];out+='";
			})
			.replace(c.evaluate || skip, function(m, code) {
				return "';" + unescape(code) + "out+='";
			})
			+ "';return out;")
			.replace(/\n/g, '\\n').replace(/\t/g, '\\t').replace(/\r/g, '\\r')
			.replace(/(\s|;|\}|^|\{)out\+='';/g, '$1').replace(/\+''/g, '')
			.replace(/(\s|;|\}|^|\{)out\+=''\+/g,'$1out+=');

		if (needhtmlencode && c.selfcontained) {
			str = "String.prototype.encodeHTML=(" + encodeHTMLSource.toString() + "());" + str;
		}
		try {
			return new Function(c.varname, str);
		} catch (e) {
			if (typeof console !== 'undefined') console.log("Could not create a template function: " + str);
			throw e;
		}
	};

	doT.compile = function(tmpl, def) {
		return doT.template(tmpl, null, def);
	};
}());

},{}],69:[function(require,module,exports){
/* doT + auto-compilation of doT templates
 *
 * 2012, Laura Doktorova, https://github.com/olado/doT
 * Licensed under the MIT license
 *
 * Compiles .def, .dot, .jst files found under the specified path.
 * It ignores sub-directories.
 * Template files can have multiple extensions at the same time.
 * Files with .def extension can be included in other files via {{#def.name}}
 * Files with .dot extension are compiled into functions with the same name and
 * can be accessed as renderer.filename
 * Files with .jst extension are compiled into .js files. Produced .js file can be
 * loaded as a commonJS, AMD module, or just installed into a global variable
 * (default is set to window.render).
 * All inline defines defined in the .jst file are
 * compiled into separate functions and are available via _render.filename.definename
 *
 * Basic usage:
 * var dots = require("dot").process({path: "./views"});
 * dots.mytemplate({foo:"hello world"});
 *
 * The above snippet will:
 * 1. Compile all templates in views folder (.dot, .def, .jst)
 * 2. Place .js files compiled from .jst templates into the same folder.
 *    These files can be used with require, i.e. require("./views/mytemplate").
 * 3. Return an object with functions compiled from .dot templates as its properties.
 * 4. Render mytemplate template.
 */

var fs = require("fs"),
	doT = module.exports = require("./doT");

doT.process = function(options) {
	//path, destination, global, rendermodule, templateSettings
	return new InstallDots(options).compileAll();
};

function InstallDots(o) {
	this.__path 		= o.path || "./";
	if (this.__path[this.__path.length-1] !== '/') this.__path += '/';
	this.__destination	= o.destination || this.__path;
	if (this.__destination[this.__destination.length-1] !== '/') this.__destination += '/';
	this.__global		= o.global || "window.render";
	this.__rendermodule	= o.rendermodule || {};
	this.__settings 	= o.templateSettings ? copy(o.templateSettings, copy(doT.templateSettings)) : undefined;
	this.__includes		= {};
}

InstallDots.prototype.compileToFile = function(path, template, def) {
	def = def || {};
	var modulename = path.substring(path.lastIndexOf("/")+1, path.lastIndexOf("."))
		, defs = copy(this.__includes, copy(def))
		, settings = this.__settings || doT.templateSettings
		, compileoptions = copy(settings)
		, defaultcompiled = doT.template(template, settings, defs)
		, exports = []
		, compiled = ""
		, fn;

	for (var property in defs) {
		if (defs[property] !== def[property] && defs[property] !== this.__includes[property]) {
			fn = undefined;
			if (typeof defs[property] === 'string') {
				fn = doT.template(defs[property], settings, defs);
			} else if (typeof defs[property] === 'function') {
				fn = defs[property];
			} else if (defs[property].arg) {
				compileoptions.varname = defs[property].arg;
				fn = doT.template(defs[property].text, compileoptions, defs);
			}
			if (fn) {
				compiled += fn.toString().replace('anonymous', property);
				exports.push(property);
			}
		}
	}
	compiled += defaultcompiled.toString().replace('anonymous', modulename);
	fs.writeFileSync(path, "(function(){" + compiled
		+ "var itself=" + modulename + ";"
		+ addexports(exports)
		+ "if(typeof module!=='undefined' && module.exports) module.exports=itself;else if(typeof define==='function')define(function(){return itself;});else {"
		+ this.__global + "=" + this.__global + "||{};" + this.__global + "['" + modulename + "']=itself;}}());");
};

function addexports(exports) {
	for (var ret ='', i=0; i< exports.length; i++) {
		ret += "itself." + exports[i]+ "=" + exports[i]+";";
	}
	return ret;
}

function copy(o, to) {
	to = to || {};
	for (var property in o) {
		to[property] = o[property];
	}
	return to;
}

function readdata(path) {
	var data = fs.readFileSync(path);
	if (data) return data.toString();
	console.log("problems with " + path);
}

InstallDots.prototype.compilePath = function(path) {
	var data = readdata(path);
	if (data) {
		return doT.template(data,
					this.__settings || doT.templateSettings,
					copy(this.__includes));
	}
};

InstallDots.prototype.compileAll = function() {
	console.log("Compiling all doT templates...");

	var defFolder = this.__path,
		sources = fs.readdirSync(defFolder),
		k, l, name;

	for( k = 0, l = sources.length; k < l; k++) {
		name = sources[k];
		if (/\.def(\.dot|\.jst)?$/.test(name)) {
			console.log("Loaded def " + name);
			this.__includes[name.substring(0, name.indexOf('.'))] = readdata(defFolder + name);
		}
	}

	for( k = 0, l = sources.length; k < l; k++) {
		name = sources[k];
		if (/\.dot(\.def|\.jst)?$/.test(name)) {
			console.log("Compiling " + name + " to function");
			this.__rendermodule[name.substring(0, name.indexOf('.'))] = this.compilePath(defFolder + name);
		}
		if (/\.jst(\.dot|\.def)?$/.test(name)) {
			console.log("Compiling " + name + " to file");
			this.compileToFile(this.__destination + name.substring(0, name.indexOf('.')) + '.js',
					readdata(defFolder + name));
		}
	}
	return this.__rendermodule;
};

},{"./doT":68,"fs":67}],70:[function(require,module,exports){
'use strict';

var utils = require('./utils');


/**
 * [__Prototype functions__](proto_prototype.js.html)
 *
 * - [extendProto](proto_prototype.js.html#extendProto)
 * - [createSubclass](proto_prototype.js.html#createSubclass)
 * - [makeSubclass](proto_prototype.js.html#makeSubclass)
 */
var	prototypeMethods = require('./proto_prototype');


/**
 * [__Object functions__](proto_object.js.html)
 *
 * - [extend](proto_object.js.html#extend)
 * - [clone](proto_object.js.html#clone)
 * - [defineProperty](proto_object.js.html#defineProperty)
 * - [defineProperties](proto_object.js.html#defineProperties)
 * - [deepExtend](proto_object.js.html#deepExtend)
 * - [allKeys](proto_object.js.html#allKeys)
 * - [keyOf](proto_object.js.html#keyOf)
 * - [allKeysOf](proto_object.js.html#allKeysOf)
 * - [eachKey](proto_object.js.html#eachKey)
 * - [mapKeys](proto_object.js.html#mapKeys)
 * - [reduceKeys](proto_object.js.html#reduceKeys)
 * - [filterKeys](proto_object.js.html#filterKeys)
 * - [someKey](proto_object.js.html#someKey)
 * - [everyKey](proto_object.js.html#everyKey)
 * - [findValue](proto_object.js.html#findValue)
 * - [findKey](proto_object.js.html#findKey)
 */
var	objectMethods = require('./proto_object');


/**
 * [__Array functions__](proto_array.js.html)
 *
 * - [find](proto_array.js.html#find)
 * - [findIndex](proto_array.js.html#findIndex)
 * - [appendArray](proto_array.js.html#appendArray)
 * - [prependArray](proto_array.js.html#prependArray)
 * - [toArray](proto_array.js.html#toArray)
 * - [object](proto_array.js.html#object)
 * - [mapToObject](proto_array.js.html#mapToObject)
 *
 * Functions that Array [implements natively](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/prototype#Methods) are also added - they can be used with array-like objects and for chaining (native functions are always called).
 */
var	arrayMethods = require('./proto_array');


/**
 * [__Function functions__](proto_function.js.html)
 *
 * - [makeFunction](proto_function.js.html#makeFunction)
 * - [partial](proto_function.js.html#partial)
 * - [partialRight](proto_function.js.html#partialRight)
 * - [memoize](proto_function.js.html#memoize)
 */
var	functionMethods = require('./proto_function');


/**
 * [__String functions__](proto_string.js.html)
 *
 * - [firstUpperCase](proto_string.js.html#firstUpperCase)
 * - [firstLowerCase](proto_string.js.html#firstLowerCase)
 */
var	stringMethods = require('./proto_string');


/**
 * Chaining
 * ========
 *
 * `_` can be used to create a wrapped value (object, function, array, etc.) to allow chaining of Proto functions.
 * To unwrap, `_` method of a wrapped value should be used.
 * Usage:
 * ```
 * var arr = _({ 0: 3, 1: 4, 2: 5, length: 3})
 *				.toArray()
 *				.prependArray([1, 2])
 *				.appendArray([6, 7, 8])
 *				._();
 * ```
 * A wrapped object is an instance of `_` (`Proto` class).
 *
 * Chaining is implemented for development convenience, but it has performance overhead, not only to wrap and unwrap values but in each function call.
 * Although all Proto functions are implemented as methods operating on this and the overhead to redefine them as functions is very small, the overhead to redefine them as methods of wrapped value is slightly higher - chaining is 15-25% slower than using functions (properties of _ that take the first parameter).
 * In cases when performance is critical, you may want to avoid using chaining.
 *
 * @param {Any} self A value to be wrapped
 * @return {Proto}
 */
function Proto(self) {
	// wrap passed parameter in _ object
	var wrapped = Object.create(Proto.prototype);
	wrapped.self = self;
	return wrapped;
};

var _ = Proto;


// store raw methods from different modules in __ object (double "_")
var __ = objectMethods.clone.call(objectMethods);
__.extend.call(__, prototypeMethods);
__.extend.call(__, arrayMethods);
__.extend.call(__, stringMethods);
__.extend.call(__, functionMethods);

// add __ as property of Proto, so they can be used as mixins in other classes
__.defineProperty(Proto, '__', __);


// add _ method to unwrap wrapped value (Proto instance)
function unwrapProto() { return this.self; }
__.extendProto.call(Proto, { _: unwrapProto });


// add functions that take first parameter instead of "this" to Proto
var protoFuncs = __.mapKeys.call(__, utils.makeProtoFunction);
__.extend.call(Proto, protoFuncs);

// add Proto wrapped value instance methods to Proto prototype
var protoInstanceMethods = __.mapKeys.call(__, utils.makeProtoInstanceMethod);
__.extendProto.call(Proto, protoInstanceMethods);


/**
 * In windows environment, a global `_` value is preserved in `_.underscore`
 */
if (typeof window == 'object') {
	// preserve existing _ object
	if (window._)
		Proto.underscore = window._

	// expose global _
	window._ = Proto;
}

if (typeof module == 'object' && module.exports)
	// export for node/browserify
	module.exports = Proto;

},{"./proto_array":71,"./proto_function":72,"./proto_object":73,"./proto_prototype":74,"./proto_string":75,"./utils":76}],71:[function(require,module,exports){
'use strict';

var __ = require('./proto_object')
	, utils = require('./utils');


/**
 * - [find](#find)
 * - [findIndex](#findIndex)
 * - [appendArray](#appendArray)
 * - [prependArray](#prependArray)
 * - [toArray](#toArray)
 * - [object](#object)
 * - [mapToObject](#mapToObject)
 *
 * These methods can be [chained](proto.js.html#Proto).
 */
var arrayMethods = module.exports = {
	appendArray: appendArray,
	prependArray: prependArray,
	toArray: toArray,
	object: object,
	mapToObject: mapToObject,
};


/**
 * Functions that Array [implements natively](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/prototype#Methods) are also included for convenience - they can be used with array-like objects and for chaining (native functions are always called)
 * These methods can be [chained](proto.js.html#Proto) too.
 */
var nativeArrayMethodsNames = [ 'join', 'pop', 'push', 'concat',
	'reverse', 'shift', 'unshift', 'slice', 'splice',
	'sort', 'filter', 'forEach', 'some', 'every',
	'map', 'indexOf', 'lastIndexOf', 'reduce', 'reduceRight'];

var nativeArrayMethods = mapToObject.call(nativeArrayMethodsNames,
		function(methodName) {
			return Array.prototype[methodName];
		});

__.extend.call(arrayMethods, nativeArrayMethods);


/**
 * Implementation of ES6 [Array __find__ method](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find) (native method is used if available).
 * Returns array element that passes callback test.
 *
 * @param {Array} self array to search in
 * @param {Function} callback should return `true` for item to pass the test, passed `value`, `index` and `self` as parameters
 * @param {Object} thisArg optional context (`this`) of callback call
 * @return {Any}
 */
arrayMethods.find = Array.prototype.find
	|| utils.makeFindMethod(arrayMethods.forEach, 'value');


/**
 * Implementation of ES6 [Array __findIndex__ method](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex) (native method is used if available).
 * Returns the index of array element that passes callback test.
 *
 * @param {Array} self array to search in
 * @param {Function} callback should return `true` for item to pass the test, passed `value`, `index` and `self` as parameters
 * @param {Object} thisArg optional context (`this`) of callback call
 * @return {Integer}
 */
arrayMethods.findIndex = Array.prototype.findIndex
	|| utils.makeFindMethod(arrayMethods.forEach, 'index');


/**
 * Appends `arrayToAppend` to the end of array `self` in place (can be an instance of Array or array-like object).
 * Changes the value of `self` (it uses `Array.prototype.splice`) and returns `self`.
 *
 * @param {Array} self An array that will be modified
 * @param {Array|Array-like} arrayToAppend An array that will be appended
 * @return {Array}
 */
function appendArray(arrayToAppend) {
	if (! arrayToAppend.length) return this;

    var args = [this.length, 0].concat(arrayToAppend);
    arrayMethods.splice.apply(this, args);

    return this;
}


/**
 * Prepends `arrayToPrepend` to the beginnig of array `self` in place (can be an instance of Array or array-like object).
 * Changes the value of `self` (it uses `Array.prototype.splice`) and returns `self`.
 *
 * @param {Array} self An array that will be modified
 * @param {Array|Array-like} arrayToAppend An array that will be prepended
 * @return {Array}
 */
function prependArray(arrayToPrepend) {
	if (! arrayToPrepend.length) return this;

    var args = [0, 0].concat(arrayToPrepend);
    arrayMethods.splice.apply(this, args);

    return this;
}


/**
 * Returns new array created from array-like object (e.g., `arguments` pseudo-array).
 *
 * @param {Array-like} self Object with numeric property length
 * @return {Array}
 */
function toArray() {
	return arrayMethods.slice.call(this);
}


/**
 * Returns an object created from the array of `keys` and optional array of `values`.
 *
 * @param {Array} self Array of keys
 * @param {Array|any} values Optional array of values or the value to be assigned to each property.
 * @return {Object}
 */
function object(values) {
	var obj = {}
		, valuesIsArray = Array.isArray(values);
	arrayMethods.forEach.call(this, function(key, index) {
		obj[key] = valuesIsArray ? values[index] : values;
	});

	return obj;
}


/**
 * Maps array to object.
 * Array elements become keys, value are taken from `callback`.
 * 
 * @param {Array} self An object which values will become keys of the result
 * @param {Function} callback Callback is passed `value`, `index` and `self` and should return value that will be included in the result.
 * @param {Object} thisArg An optional context of iteration (the valueof `this`), will be undefined if this parameter is not passed.
 * @return {Object}
 */
function mapToObject(callback, thisArg) {
	var result = {};
	Array.prototype.forEach.call(this, function(value, index) {
		result[value] = callback.call(thisArg, value, index, this);
	}, this);
	return result;
}

},{"./proto_object":73,"./utils":76}],72:[function(require,module,exports){
'use strict';

/**
 * - [makeFunction](#makeFunction)
 * - [partial](#partial)
 * - [partialRight](#partialRight)
 * - [memoize](#memoize)
 *
 * These methods can be [chained](proto.js.html#Proto)
 */
var functionMethods = module.exports = {
	makeFunction: makeFunction,
	partial: partial,
	partialRight: partialRight,
	memoize: memoize
};


var slice = Array.prototype.slice;


/**
 * Similarly to Function constructor creates a function from code.
 * Unlike Function constructor, the first argument is a function name
 *
 * @param {String} name new function name
 * @param {String} arg1, arg2, ... the names of function parameters
 * @param {String} funcBody function body
 * @return {Function}
 */
function makeFunction(arg1, arg2, funcBody) {
	var name = this
		, count = arguments.length - 1
		, funcBody = arguments[count]
		, func
		, code = '';
	for (var i = 0; i < count; i++)
		code += ', ' + arguments[i];
	code = ['func = function ', name, '(', code.slice(2), ') {\n'
				, funcBody, '\n}'].join('');
	eval(code);
	return func;
}


/**
 * Creates a function as a result of partial function application with the passed parameters.
 *
 * @param {Function} func Function to be applied
 * @param {List} arguments Arguments after self will be prepended to the original function call when the partial function is called.
 * @return {Function}
 */
function partial() { // , ... arguments
	var func = this;
	var args = slice.call(arguments);
	return function() {
		return func.apply(this, args.concat(slice.call(arguments)));
	}
}


/**
 * Creates a function as a result of partial function application with the passed parameters, but parameters are appended on the right.
 *
 * @param {Function} func Function to be applied
 * @param {List} arguments Arguments after self will be appended on the right to the original function call when the partial function is called.
 * @return {Function}
 */
function partialRight() { // , ... arguments
	var func = this;
	var args = slice.call(arguments);
	return function() {
		return func.apply(this, slice.call(arguments).concat(args));
	}
}


/**
 * Creates a memoized version of the function using supplied hash function as key. If the hash is not supplied, uses its first parameter as the hash.
 * 
 * @param {Function} func function to be memoized
 * @param {Function} hashFunc optional hash function that is passed all function arguments and should return cache key.
 * @param {Integer} limit optional maximum number of results to be stored in the cache. 1000 by default.
 * @return {Function} memoized function
 */
function memoize(hashFunc, limit) {
	var func = this;
	var cache = {}, keysList = [];
	limit = limit || 1000;

	return function() {
		var key = hashFunc ? hashFunc.apply(this, arguments) : arguments[0];
		if (cache.hasOwnProperty(key))
			return cache[key];

		var result = cache[key] = func.apply(this, arguments);
		keysList.push(key);

		if (keysList.length > limit)
			delete cache[keysList.shift()];

		return result;
	};
}

},{}],73:[function(require,module,exports){
'use strict';


var utils = require('./utils');


/**
 * - [extend](#extend)
 * - [clone](#clone)
 * - [defineProperty](#defineProperty)
 * - [defineProperties](#defineProperties)
 * - [deepExtend](#deepExtend)
 * - [allKeys](#allKeys)
 * - [keyOf](#keyOf)
 * - [allKeysOf](#allKeysOf)
 * - [eachKey](#eachKey)
 * - [mapKeys](#mapKeys)
 * - [reduceKeys](#reduceKeys)
 * - [filterKeys](#filterKeys)
 * - [someKey](#someKey)
 * - [everyKey](#everyKey)
 * - [findValue](#findValue)
 * - [findKey](#findKey)
 *
 * All these methods can be [chained](proto.js.html#Proto)
 */
var objectMethods = module.exports = {
	extend: extend,
	clone: clone,
	defineProperty: defineProperty,
	defineProperties: defineProperties,
	deepExtend: deepExtend,
	allKeys: allKeys,
	keyOf: keyOf,
	allKeysOf: allKeysOf,
	eachKey: eachKey,
	mapKeys: mapKeys,
	reduceKeys: reduceKeys,
	filterKeys: filterKeys,
	someKey: someKey,
	everyKey: everyKey
};


/**
 * Analogue of ES6 [Array __find__ method](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find).
 * Returns the value of object property that passes callback test.
 *
 * @param {Object} self object to search in
 * @param {Function} callback should return `true` for item to pass the test, passed `value`, `key` and `self` as parameters
 * @param {Object} thisArg optional context (`this`) of callback call
 * @return {Any}
 */
objectMethods.findValue = utils.makeFindMethod(eachKey, 'value');


/**
 * Analogue of ES6 [Array __findIndex__ method](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex).
 * Returns the key of object property that passes callback test.
 *
 * @param {Object} self object to search in
 * @param {Function} callback should return `true` for item to pass the test, passed `value`, `key` and `self` as parameters
 * @param {Object} thisArg optional context (`this`) of callback call
 * @return {Integer}
 */
objectMethods.findKey = utils.makeFindMethod(eachKey, 'key');


/**
 * Extends object `self` with the properties of the object `obj` copying all own properties (not those inherited via prototype chain), including non-enumerable properties (unless `onlyEnumerable` is truthy).
 * Created properties will have the same descriptors as the propertis of `obj`.
 * Returns `self` to allow chaining with other functions.
 * Can be used with functions, to copy class methods, e.g.
 *
 * @param {Object} self An object to be extended
 * @param {Object} obj An object which properties will be copied to self
 * @param {Boolean} onlyEnumerable Optional flag to prevent copying non-enumerable properties, `false` by default
 * @return {Object}
 */
function extend(obj, onlyEnumerable) {
	var descriptors = {};

	eachKey.call(obj, function(value, prop) {
		descriptors[prop] = Object.getOwnPropertyDescriptor(obj, prop);
	}, this, onlyEnumerable);

	Object.defineProperties(this, descriptors);

	return this;
}


/**
 * Makes a shallow clone of object `obj` creating an instance of the same class; the properties will have the same descriptors.
 * To clone an array use
 * ```
 * var clonedArray = [].concat(arr);
 * ```
 * This function should not be used to clone an array, both because it is inefficient and because the result will look very much like an array, it will not be a real array.
 *
 * @param {Object} self An object to be cloned
 * @return {Object}
 */
function clone() {
	var clonedObject = Object.create(this.constructor.prototype);
	extend.call(clonedObject, this);
	return clonedObject;
}


/**
 * Syntax sugar to shorten usage of `Object.defineProperty`.
 * The simplest usage (to add non-enumerable, non-configurable, non-writable property):
 * ```
 * _.defineProperty(obj, 'key', value);
 * ```
 * Returns `self`.
 *
 * @param {Object} self An object to add a property to
 * @param {String} propertyName the name of the property that will be added
 * @param {Any} value the value of added property
 * @param {Boolean} enumerable Optional `true` value to make property enumerable, `false` by default
 * @param {Boolean} configurable Optional `true` value to make property configurable, `false` by default
 * @param {Boolean} writable Optional `true` value to make property writable, `false` by default
 * @return {Object}
 */
function defineProperty(propertyName, value, enumerable, configurable, writable) {
	Object.defineProperty(this, propertyName, {
		enumerable: enumerable,
		configurable: configurable,
		writable: writable,
		value: value
	});
	return this;
}


/**
 * Syntax sugar to shorten usage of `Object.defineProperties`.
 * The simplest usage (to add non-enumerable, non-configurable, non-writable properties):
 * ```
 * _.defineProperties(obj, {
 *     key1: value1,
 *     key2: value2	
 * });
 * ```
 * Returns `self`.
 *
 * @param {Object} self An object to add a property to
 * @param {Object} propertyValues A map of keys and values of properties thatwill be added. The descriptors of properties will be defined by the following parameters.
 * @param {Boolean} enumerable Optional `true` value to make property enumerable, `false` by default
 * @param {Boolean} configurable Optional `true` value to make property configurable, `false` by default
 * @param {Boolean} writable Optional `true` value to make property writable, `false` by default
 * @return {Object}
 */
function defineProperties(propertyValues, enumerable, configurable, writable) {
	var descriptors = mapKeys.call(propertyValues, function(value) {
		return {
			enumerable: enumerable,
			configurable: configurable,
			writable: writable,
			value: value
		};		
	});
	Object.defineProperties(this, descriptors);
	return this;
}


/**
 * Extends object `self` with properties of `obj` to any depth, without overwrtiting existing object properties of `self` with object properties of `obj`.
 * Scalar properties of `obj` will overwrite properties of `self`. Scalar porperties of `self` will also be overwritten.
 * Correctly works with recursive objects.
 * Usage:
 * ```
 * var obj = {
 *     inner: {
 *         a: 1
 *     }
 * };
 *
 * _.deepExtend(obj, {
 *     inner: {
 *         b: 2
 *     }
 * });
 *
 * assert.deepEqual(obj, {
 *     inner: {
 *         a: 1,
 *         b: 2
 *     }
 * }); // assert passes
 * ```
 * Returns `self`.
 *
 * @param {Object} self An object to be extended
 * @param {Object} obj An object with properties to copy to 
 * @param {Boolean} onlyEnumerable Optional `true` to use only enumerable properties
 * @return {Object}
 */
function deepExtend(obj, onlyEnumerable) {
	return _extendTree(this, obj, onlyEnumerable, []);
}


function _extendTree(selfNode, objNode, onlyEnumerable, objTraversed) {
	if (objTraversed.indexOf(objNode) >= 0) return; // node already traversed, obj has recursion

	// store node to recognise recursion
	objTraversed.push(objNode);

	eachKey.call(objNode, function(value, prop) {
		var descriptor = Object.getOwnPropertyDescriptor(objNode, prop);
		if (typeof value == 'object') {
			if (! (selfNode.hasOwnProperty(prop) && typeof selfNode[prop] == 'object'))
				selfNode[prop] = {};
			_extendTree(selfNode[prop], value, onlyEnumerable, objTraversed);
		} else
			Object.defineProperty(selfNode, prop, descriptor);
	}, this, onlyEnumerable);

	return selfNode;
}


/**
 * Returns array of all property names of an object `self` (including non-enumerbale).
 * To get only enumerable properties, use `Object.keys()`.
 *
 * @param {Object} self An object to get all properties of.
 * @return {Array}
 */
 function allKeys() {
 	return Object.getOwnPropertyNames(this);
 }


/**
 * An analogue of `indexOf` method of Array prototype.
 * Returns the `key` of `searchElement` in the object `self`. 
 * As object keys are unsorted, if there are several keys that hold `searchElement` any of them can be returned. Use `allKeysOf` to return all keys.
 * All own properties are searched (not those inherited via prototype chain), including non-enumerable properties (unless `onlyEnumerable` is truthy).
 *
 * @param {Object} self An object to search a value in
 * @param {Any} searchElement An element that will be searched. An exact equality is tested, so `0` is not the same as `'0'`.
 * @param {Boolean} onlyEnumerable An optional true to search among enumerable properties only.
 * @return {String} 
 */
function keyOf(searchElement, onlyEnumerable) {
	var properties = onlyEnumerable 
						? Object.keys(this)
						: allKeys.call(this);

	for (var i = 0; i < properties.length; i++)
		if (searchElement === this[properties[i]])
			return properties[i];
	
	return undefined;
}


/**
 * Works similarly to the previous function, but returns the array of keys holding `searchElement` as their value.
 *
 * @param {Object} self An object to search a value in
 * @param {Any} searchElement An element that will be searched. An exact equality is tested, so `0` is not the same as `'0'`.
 * @param {Boolean} onlyEnumerable An optional true to search among enumerable properties only.
 * @return {Array[String]} 
 */
function allKeysOf(searchElement, onlyEnumerable) {
	var properties = onlyEnumerable 
						? Object.keys(this)
						: allKeys.call(this);

	var keys = properties.filter(function(prop) {
		return searchElement === this[prop];
	}, this);

	return keys;
}


/**
 * An analogue of [forEach](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach) method of Array prototype.
 * Iterates all own properties of `self` (or only enumerable own properties if `onlyEnumerable` is truthy) calling callback for each key.
 * This method should not be used with arrays, it will include `length` property in iteration.
 * To iterate array-like objects (e.g., `arguments` pseudo-array) use:
 * ```
 * _.forEach(arguments, callback, thisArg);
 * ```
 * Function returns `self` to allow [chaining](proto.js.html)
 *
 * @param {Object} self An object which properties will be iterated
 * @param {Function} callback Callback is passed `value`, `key` and `self`, its return value is not used.
 * @param {Object} thisArg An optional context of iteration (the valueof `this`), will be undefined if this parameter is not passed.
 * @param {Boolean} onlyEnumerable An optional `true` to iterate enumerable properties only.
 */
function eachKey(callback, thisArg, onlyEnumerable) {
	var properties = onlyEnumerable 
						? Object.keys(this)
						: allKeys.call(this);

	properties.forEach(function(prop) {
		callback.call(thisArg, this[prop], prop, this);
	}, this);

	return this;
}


/**
 * An analogue of [map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map) method of Array prototype.
 * Returns the object that is the result of the application of callback to values in all own properties of `self` (or only enumerable own properties if `onlyEnumerable` is truthy).
 * The returned object will be the instance of the same class as `self`.
 * Property descriptors of the returned object will have the same `enumerable`, `configurable` and `writable` settings as the properties of `self`.
 * This method should not be used with arrays, it will include `length` property in iteration.
 * To map array-like objects use:
 * ```
 * var result = _.map(arguments, callback, thisArg);
 * ```
 * 
 * @param {Object} self An object which properties will be iterated
 * @param {Function} callback Callback is passed `value`, `key` and `self` and should return value that will be included in the map.
 * @param {Object} thisArg An optional context of iteration (the valueof `this`), will be undefined if this parameter is not passed.
 * @param {Boolean} onlyEnumerable An optional `true` to iterate enumerable properties only.
 * @return {Object}
 */
function mapKeys(callback, thisArg, onlyEnumerable) {
	var descriptors = {};
	eachKey.call(this, mapProperty, thisArg, onlyEnumerable);
	return Object.create(this.constructor.prototype, descriptors);

	function mapProperty(value, key, self) {
		descriptors[key] = Object.getOwnPropertyDescriptor(self, key);
		descriptors[key].value = callback.call(this, value, key, self);
	}
}


/**
 * An analogue of [reduce](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/Reduce) method of Array prototype.
 * This method reduces the object to a single value. Iteration order is impossible to control with object.
 * This method should not be used with arrays, it will include `length` property in iteration.
 * To reduce array-like objects use:
 * ```
 * var result = _.reduce(arguments, callback, initialValue, thisArg);
 * ```
 * 
 * @param {Object} self An object which properties will be iterated
 * @param {Function} callback Callback is passed `previousValue`, `value`, `key` and `self` and should return value that will be used as the `previousValue` for the next `callback` call.
 * @param {Any} initialValue The initial value passed to callback as the first parameter on the first call.
 * @param {Object} thisArg An optional context of iteration (the valueof `this`), will be undefined if this parameter is not passed.
 * @param {Boolean} onlyEnumerable An optional `true` to iterate enumerable properties only.
 * @return {Any}
 */
function reduceKeys(callback, initialValue, thisArg, onlyEnumerable) {
	var properties = onlyEnumerable 
						? Object.keys(this)
						: allKeys.call(this);

	var memo = initialValue;

	properties.forEach(function(prop) {
		memo = callback.call(thisArg, memo, this[prop], prop, this);
	}, this);

	return memo;
}


/**
 * An analogue of [filter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter) method of Array prototype.
 * Returns the new object with keys for which callback returns true.
 * Property descriptors of the returned object will have the same `enumerable`, `configurable` and `writable` settings as the properties of `self`. 
 * To filter array-like objects use:
 * ```
 * var result = _.filter(arguments, callback, thisArg);
 * ```
 *
 * @param {Object} self An object which properties will be iterated
 * @param {Function} callback Callback is passed `value`, `key` and `self`. If it returns truthy value, the key/value will be included in the resulting object.
 * @param {Object} thisArg An optional context of iteration (the valueof `this`), will be undefined if this parameter is not passed.
 * @param {Boolean} onlyEnumerable An optional `true` to iterate enumerable properties only.
 * @return {Object}
 */
function filterKeys(callback, thisArg, onlyEnumerable) {
	var descriptors = {};
	eachKey.call(this, filterProperty, thisArg, onlyEnumerable);
	return Object.create(this.constructor.prototype, descriptors);;

	function filterProperty(value, key, self) {
		if (callback.call(this, value, key, self))
			descriptors[key] = Object.getOwnPropertyDescriptor(self, key);
	}
}


var _passed = {}
	, _didNotPass = {};

/**
 * An analogue of [some](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/some) method of Array prototype.
 *
 * @param {Object} self An object which properties will be iterated
 * @param {Function} callback Callback is passed `value`, `key` and `self`. If it returns truthy value, the function immeaditely returns `true`.
 * @param {Object} thisArg An optional context of iteration (the valueof `this`), will be undefined if this parameter is not passed.
 * @param {Boolean} onlyEnumerable An optional `true` to iterate enumerable properties only.
 * @return {Boolean}
 */
function someKey(callback, thisArg, onlyEnumerable) {
	try {
		eachKey.call(this, testProperty, thisArg, onlyEnumerable);
	} catch (test) {
		if (test === _passed) return true;
		else throw test;
	}
	return false;

	function testProperty(value, key, self) {
		if (callback.call(this, value, key, self))
			throw _passed;
	}
}


/**
 * An analogue of [every](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/every) method of Array prototype.
 *
 * @param {Object} self An object which properties will be iterated
 * @param {Function} callback Callback is passed `value`, `key` and `self`. If it returns falsy value, the function immeaditely returns `false`.
 * @param {Object} thisArg An optional context of iteration (the valueof `this`), will be undefined if this parameter is not passed.
 * @param {Boolean} onlyEnumerable An optional `true` to iterate enumerable properties only.
 * @return {Boolean}
 */
function everyKey(callback, thisArg, onlyEnumerable) {
	try {
		eachKey.call(this, testProperty, thisArg, onlyEnumerable);
	} catch (test) {
		if (test === _didNotPass) return false;
		else throw test;
	}
	return true;

	function testProperty(value, key, self) {
		if (! callback.call(this, value, key, self))
			throw _didNotPass;
	}
}

},{"./utils":76}],74:[function(require,module,exports){
'use strict';

/**
 * - [extendProto](#extendProto)
 * - [createSubclass](#createSubclass)
 * - [makeSubclass](#makeSubclass)
 *
 * These methods can be [chained](proto.js.html#Proto)
 */
var prototypeMethods = module.exports = {
	extendProto: extendProto,
	createSubclass: createSubclass,
	makeSubclass: makeSubclass
};


var __ = require('./proto_object');

__.extend.call(__, require('./proto_function'));


/**
 * Adds non-enumerable, non-configurable and non-writable properties to the prototype of constructor function.
 * Usage:
 * ```
 * function MyClass() {}
 * _.extendProto(MyClass, {
 *     method1: function() {},
 *     method2: function() {}
 * });
 * ```
 * To extend class via object:
 * ```
 * _.extendProto(obj.constructor, methods);
 * ```
 * Returns passed constructor, so functions _.extendProto, [_.extend](object.js.html#extend) and _.makeSubclass can be [chained](proto.js.html). 
 *
 * @param {Function} self constructor function
 * @param {Object} methods a map of functions, keys will be instance methods (properties of the constructor prototype)
 * @return {Function}
 */
function extendProto(methods) {
	var propDescriptors = {};

	__.eachKey.call(methods, function(method, name) {
		propDescriptors[name] = {
			enumerable: false,
			configurable: false,
			writable: false,
			value: method
		};
	});

	Object.defineProperties(this.prototype, propDescriptors);
	return this;
}


/**
 * Makes a subclass of class `thisClass`.
 * The returned function will have specified `name` if supplied.
 * The constructor of superclass will be called in subclass constructor by default unless `applyConstructor === false` (not just falsy).
 * Copies `thisClass` class methods to created subclass. For them to work correctly they should use `this` to refer to the class rather than explicit superclass name.
 *
 * @param {Function} thisClass A class to make subclass of
 * @param {String} name Optional name of subclass constructor function
 * @param {Boolean} applyConstructor Optional false value (not falsy) to prevent call of inherited constructor in the constructor of subclass
 * @return {Function}
 */
function createSubclass(name, applyConstructor) {
	var thisClass = this;
	var subclass;

	// name is optional
	name = name || '';

	// apply superclass constructor
	var constructorCode = applyConstructor === false
			? ''
			: 'thisClass.apply(this, arguments);';

	eval('subclass = function ' + name + '(){ ' + constructorCode + ' }');

	makeSubclass.call(subclass, thisClass);

	// copy class methods
	// - for them to work correctly they should not explictly use superclass name
	// and use "this" instead
	__.extend.call(subclass, thisClass, true);

	return subclass;
}


/**
 * Sets up prototype chain to change `thisClass` (a constructor function) so that it becomes a subclass of `Superclass`.
 * Returns `thisClass` so it can be [chained](proto.js.html) with _.extendProto and [_.extend](object.js.html#extend).
 *
 * @param {Function} thisClass A class that will become a subclass of Superclass
 * @param {Function} Superclass A class that will become a superclass of thisClass
 * @return {Function}
 */
function makeSubclass(Superclass) {
	// prototype chain
	this.prototype = Object.create(Superclass.prototype);
	
	// subclass identity
	extendProto.call(this, {
		constructor: this
	});
	return this;
}

},{"./proto_function":72,"./proto_object":73}],75:[function(require,module,exports){
'use strict';

/**
 * - [firstUpperCase](#firstUpperCase)
 * - [firstLowerCase](#firstLowerCase)
 */
 var stringMethods = module.exports = {
	firstUpperCase: firstUpperCase,
	firstLowerCase: firstLowerCase
};


/**
 * Returns string with the first character changed to upper case.
 *
 * @param {String} self A string that will have its first character replaced
 */
function firstUpperCase() {
	return this[0].toUpperCase() + this.slice(1);
}


/**
 * Returns string with the first character changed to lower case.
 *
 * @param {String} self A string that will have its first character replaced
 */
function firstLowerCase() {
	return this[0].toLowerCase() + this.slice(1);
}

},{}],76:[function(require,module,exports){
'use strict';

var utils = module.exports = {
	makeProtoInstanceMethod: makeProtoInstanceMethod,
	makeProtoFunction: makeProtoFunction,
	makeFindMethod: makeFindMethod
}


function makeProtoInstanceMethod(method) {
	return function() {
		this.self = method.apply(this.self, arguments);
		return this;
	};
}


function makeProtoFunction(method) {
	return function() {
		// when the method is executed, the value of "this" will be arguments[0],
		// other arguments starting from #1 will passed to method as parameters.
		return method.call.apply(method, arguments);
	};
}


var _error = new Error;

/**
 * Returns `find` or `findIndex` method, depending on parameter
 *
 * @param {Function} eachMethod - method to use for iteration (forEach for array or eachKey for object)
 * @param {String} findWhat 'value' - returns find method of Array (implemented in ES6) or findValue method of Object, anything else = returns findIndex/findKey methods.
 * @return {Function}
 */
function makeFindMethod(eachMethod, findWhat) {
	var argIndex = findWhat == 'value' ? 0 : 1;

	return function findValueOrIndex(callback, thisArg) {
		var caughtError;
		try {
			eachMethod.call(this, testItem, thisArg);
		} catch (found) {
			if (found === _error) throw caughtError;
			else return found;
		}

		function testItem(value, index, self) {
			var test;
			try {
				test = callback.call(this, value, index, self);
			} catch(err) {
				caughtError = err;
				throw _error;
			}
			if (test)
				throw arguments[argIndex];
		}
	}
}

},{}]},{},[50])
;