;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var _ = require('mol-proto')
	, check = require('../util/check')
	, Match = check.Match
	, MixinError = require('../util/error').Mixin;


module.exports = Mixin;

// an abstract class for mixin pattern - adding proxy methods to host objects
function Mixin(hostObject, proxyMethods /*, other args - passed to init method */) {
	// TODO - moce checks from Messenger here
	check(hostObject, Match.Optional(Object));
	check(proxyMethods, Match.Optional(Match.ObjectHash(String)));

	Object.defineProperty(this, '_hostObject', { value: hostObject });
	if (proxyMethods)
		this._createProxyMethods(proxyMethods);

	// calling init if it is defined in the class
	if (this.init)
		this.init.apply(this, arguments);
}

_.extendProto(Mixin, {
	_createProxyMethod: _createProxyMethod,
	_createProxyMethods: _createProxyMethods
});


function _createProxyMethod(mixinMethodName, proxyMethodName) {
	if (this._hostObject[proxyMethodName])
		throw new MixinError('method ' + proxyMethodName +
								 ' already defined in host object');

	check(this[mixinMethodName], Function);

	var boundMethod = this[mixinMethodName].bind(this);

	Object.defineProperty(this._hostObject, proxyMethodName,
		{ value: boundMethod });
}


function _createProxyMethods(proxyMethods) {
	// creating and binding proxy methods on the host object
	_.eachKey(proxyMethods, _createProxyMethod, this);
}

},{"../util/check":27,"../util/error":28,"mol-proto":33}],2:[function(require,module,exports){
'use strict';

var _ = require('mol-proto')
	, check = require('../util/check')
	, Match = check.Match;

module.exports = ClassRegistry;

function ClassRegistry (FoundationClass) {
	if (FoundationClass)
		this.setClass(FoundationClass);

	// Object.defineProperty(this, '__registeredClasses', {
	// 		enumerable: false,
	// 		writable: true,
	// 		configurable: true,
	// 		value: {}
	// });

	this.__registeredClasses = {};
}

_.extendProto(ClassRegistry, {
	add: registerClass,
	get: getClass,
	remove: unregisterClass,
	clean: unregisterAllClasses,
	setClass: setFoundationClass
});


function setFoundationClass(FoundationClass) {
	check(FoundationClass, Function);
	Object.defineProperty(this, 'FoundationClass', {
		enumerable: true,
		value: FoundationClass
	});
}

function registerClass(aClass, name) {
	name = name || aClass.name;

	check(name, String, 'class name must be string');
	check(name, Match.Where(function() {
		return typeof name == 'string' && name != '';
	}), 'class name must be string');
	if (this.FoundationClass) {
		if (aClass != this.FoundationClass)
			check(aClass, Match.Subclass(this.FoundationClass), 'class must be a sub(class) of a foundation class');
	} else
		throw new TypeError('foundation class must be set before adding classes to registry');

	if (this.__registeredClasses[name])
		throw new TypeError('is already registered');

	this.__registeredClasses[name] = aClass;
};


function getClass(name) {
	check(name, String, 'class name must be string');
	return this.__registeredClasses[name];
};


function unregisterClass(nameOrClass) {
	check(nameOrClass, Match.OneOf(String, Function), 'class or name must be supplied');

	var name = typeof nameOrClass == 'string'
						? nameOrClass
						: nameOrClass.name;
						
	if (! this.__registeredClasses[name])
		throw new TypeError('class is not registered');

	delete this.__registeredClasses[name];
};


function unregisterAllClasses() {
	this.__registeredClasses = {};
};

},{"../util/check":27,"mol-proto":33}],3:[function(require,module,exports){
'use strict';

var Attribute = require('./index')
	, AttributeError = require('../util/error').Attribute
	, config = require('../config')
	, _ = require('mol-proto')
	, check = require('../util/check')
	, Match = check.Match;


// Matches;
// :myView - only component name
// View:myView - class and component name
// [Events, Data]:myView - facets and component name
// View[Events]:myView - class, facet(s) and component name

var attrRegExp= /^([^\:\[\]]*)(?:\[([^\:\[\]]*)\])?\:?([^:]*)$/
	, facetsSplitRegExp = /\s*(?:\,|\s)\s*/;


var BindAttribute = _.createSubclass(Attribute, 'BindAttribute', true);

_.extendProto(BindAttribute, {
	attrName: getAttributeName,
	parse: parseAttribute,
	validate: validateAttribute
});


module.exports = BindAttribute;


function getAttributeName() {
	return config.attrs['bind'];
}


function parseAttribute() {
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


function validateAttribute() {
	var compName = this.compName;
	check(compName, Match.Where(function() {
  		return typeof compName == 'string' && compName != '';
	}), 'empty component name');

	if (! this.compClass)
		throw new AttributeError('empty component class name ' + this.compClass);

	return this;
}

},{"../config":18,"../util/check":27,"../util/error":28,"./index":5,"mol-proto":33}],4:[function(require,module,exports){
'use strict';

var Attribute = require('./index')
	, AttributeError = require('../util/error').Attribute
	, config = require('../config')
	, _ = require('mol-proto');


var LoadAttribute = _.createSubclass(Attribute, 'LoadAttribute', true);

_.extendProto(LoadAttribute, {
	attrName: getAttributeName,
	parse: parseAttribute,
	validate: validateAttribute
});

module.exports = LoadAttribute;


function getAttributeName() {
	return config.attrs.load;
}


function parseAttribute() {
	if (! this.node) return;

	var value = this.get();

	this.loadUrl = value;

	return this;
}


function validateAttribute() {
	// TODO url validation

	return this;
}
},{"../config":18,"../util/error":28,"./index":5,"mol-proto":33}],5:[function(require,module,exports){
'use strict';

var _ = require('mol-proto')
	, check = require('../util/check')
	, Match = check.Match
	, toBeImplemented = require('../util/error').toBeImplemented;


// an abstract attribute class for attribute parsing and validation

module.exports = Attribute;

function Attribute(el, name) {
	this.name = name || this.attrName();
	this.el = el;
	this.node = el.attributes[this.name];
}

_.extendProto(Attribute, {
	get: getAttributeValue,
	set: setAttributeValue,

	// should be defined in subclass
	attrName: toBeImplemented,
	parse: toBeImplemented,
	validate: toBeImplemented,
});


function getAttributeValue() {
	return this.el.getAttribute(this.name);
}

function setAttributeValue(value) {
	this.el.setAttribute(this.name, value);
}

},{"../util/check":27,"../util/error":28,"mol-proto":33}],6:[function(require,module,exports){
'use strict';

var miloMail = require('./mail')
	, componentsRegistry = require('./components/c_registry')
	, Component = componentsRegistry.get('Component')
	, BindAttribute = require('./attribute/a_bind')
	, BinderError = require('./util/error').Binder
	, _ = require('mol-proto')
	, check = require('./util/check')
	, Match =  check.Match;


module.exports = binder;


function binder(scopeEl, callback) {
	var scopeEl = scopeEl || document.body
		, components = {};

	// iterate children of scopeEl
	Array.prototype.forEach.call(scopeEl.children, bindElement);

	callback(components);


	function bindElement(el){
		var attr = new BindAttribute(el);

		var aComponent = createComponent(el, attr);

		// bind inner elements to components
		if (el.children && el.children.length) {
			var innerComponents = binder(el);

			if (Object.keys(innerComponents).length) {
				// attach inner components to the current one (create a new scope) ...
				if (typeof aComponent != 'undefined' && aComponent.container)
					aComponent.container.add(innerComponents);
				else // or keep them in the current scope
					_.eachKey(innerComponents, storeComponent);
			}
		}

		if (aComponent)
			storeComponent(aComponent, attr.compName);
	}

	function createComponent(el, attr) {
		if (attr.node) { // element will be bound to a component
			attr.parse().validate();

			// get component class from registry and validate
			var ComponentClass = componentsRegistry.get(attr.compClass);

			if (! ComponentClass)
				throw new BinderError('class ' + attr.compClass + ' is not registered');

			check(ComponentClass, Match.Subclass(Component, true));
	
			// create new component
			var aComponent = new ComponentClass({}, el);

			// add extra facets
			var facets = attr.compFacets;
			if (facets)
				facets.forEach(function(fct) {
					aComponent.addFacet(fct);
				});

			return aComponent;
		}
	}


	function storeComponent(aComponent, name) {
		if (components[name])
			throw new BinderError('duplicate component name: ' + name);

		components[name] = aComponent;
	}
}


},{"./attribute/a_bind":3,"./components/c_registry":16,"./mail":22,"./util/check":27,"./util/error":28,"mol-proto":33}],7:[function(require,module,exports){
'use strict';

var FacetedObject = require('../facets/f_object')
	, facetsRegistry = require('./c_facets/cf_registry')
	, ComponentFacet = require('./c_facet')
	, Messenger = require('../messenger')
	, _ = require('mol-proto')
	, check = require('../util/check')
	, Match = check.Match;

var Component = _.createSubclass(FacetedObject, 'Component', true);

module.exports = Component;


Component.createComponentClass = function(name, facets) {
	var facetsClasses = {};

	facets.forEach(function(fct) {
		var fctName = _.firstLowerCase(fct);
		var fctClassName = _.firstUpperCase(fct);
		facetsClasses[fctName] = facetsRegistry.get(fctClassName)
	});

	return FacetedObject.createFacetedClass.call(this, name, facetsClasses);
};

delete Component.createFacetedClass;


_.extendProto(Component, {
	init: initComponent,
	addFacet: addFacet
});


function initComponent(facetsOptions, element) {
	this.el = element;

	var messenger = new Messenger(this, Messenger.defaultMethods, undefined /* no messageSource */);

	Object.defineProperties(this, {
		_messenger: { value: messenger },
	});	
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

	FacetedObject.prototype.addFacet.call(this, FacetClass, facetOpts, facetName);
}

},{"../facets/f_object":20,"../messenger":24,"../util/check":27,"./c_facet":8,"./c_facets/cf_registry":12,"mol-proto":33}],8:[function(require,module,exports){
'use strict';

var Facet = require('../facets/f_class')
	, Messenger = require('../messenger')
	, _ = require('mol-proto');

var ComponentFacet = _.createSubclass(Facet, 'ComponentFacet');

module.exports = ComponentFacet;


_.extendProto(ComponentFacet, {
	init: initComponentFacet,
});


function initComponentFacet() {
	// var messenger = new Messenger(this, Messenger.defaultMethods, undefined /* no messageSource */);

	// Object.defineProperties(this, {
	// 	_facetMessenger: { value: messenger },
	// });
}

},{"../facets/f_class":19,"../messenger":24,"mol-proto":33}],9:[function(require,module,exports){
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
	add: addChildComponents
});

facetsRegistry.add(Container);

module.exports = Container;


function initContainer() {
	ComponentFacet.prototype.init.apply(this, arguments);
	this.children = {};
}


function _bindComponents() {
	// TODO
	// this function should re-bind rather than bind all internal elements
	this.children = binder(this.owner.el);
}


function addChildComponents(childComponents) {
	// TODO
	// this function should intelligently re-bind existing components to
	// new elements (if they changed) and re-bind previously bound events to the same
	// event handlers
	// or maybe not, if this function is only used by binder to add new elements...
	_.extend(this.children, childComponents);
}

},{"../../binder":6,"../c_facet":8,"./cf_registry":12,"mol-proto":33}],10:[function(require,module,exports){
'use strict';

var ComponentFacet = require('../c_facet')
	, facetsRegistry = require('./cf_registry')

	, Messenger = require('../../messenger')
	, ComponentDataSource = require('../c_message_sources/component_data_source')

	, _ = require('mol-proto');


// data model connection facet
var Data = _.createSubclass(ComponentFacet, 'Data');

_.extendProto(Data, {
	init: initDataFacet,

	// _reattach: _reattachEventsOnElementChange
});

facetsRegistry.add(Data);

module.exports = Data;


function initDataFacet() {
	ComponentFacet.prototype.init.apply(this, arguments);

	var proxyCompDataSourceMethods = {
		value: 'value',
		trigger: 'trigger'
	};

	// instead of this.owner should pass model? Where it is set?
	var compDataSource = new ComponentDataSource(this, proxyCompDataSourceMethods, this.owner);

	var proxyMessengerMethods = {
		on: 'onMessage',
		off: 'offMessage',
		onMessages: 'onMessages',
		offMessages: 'offMessages',
		getSubscribers: 'getSubscribers'
	};

	var dataMessenger = new Messenger(this, proxyMessengerMethods, compDataSource);

	Object.defineProperties(this, {
		_dataMessenger: { value: dataMessenger },
		_compDataSource: { value: compDataSource }
	});
}

},{"../../messenger":24,"../c_facet":8,"../c_message_sources/component_data_source":13,"./cf_registry":12,"mol-proto":33}],11:[function(require,module,exports){
'use strict';

var ComponentFacet = require('../c_facet')
	, facetsRegistry = require('./cf_registry')

	, Messenger = require('../../messenger')
	, DOMEventsSource = require('../c_message_sources/dom_events_source')

	, _ = require('mol-proto');


// events facet
var Events = _.createSubclass(ComponentFacet, 'Events');

_.extendProto(Events, {
	init: initEventsFacet,

	// _reattach: _reattachEventsOnElementChange
});

facetsRegistry.add(Events);

module.exports = Events;


function initEventsFacet() {
	ComponentFacet.prototype.init.apply(this, arguments);

	var domEventsSource = new DOMEventsSource(this, { trigger: 'trigger' }, this.owner);

	var proxyMessengerMethods = {
		on: 'onMessage',
		off: 'offMessage',
		onEvents: 'onMessages',
		offEvents: 'offMessages',
		getListeners: 'getSubscribers'
	};

	var messenger = new Messenger(this, proxyMessengerMethods, domEventsSource);

	Object.defineProperties(this, {
		_eventsMessenger: { value: messenger },
		_domEventsSource: { value: domEventsSource }
	});
}

},{"../../messenger":24,"../c_facet":8,"../c_message_sources/dom_events_source":15,"./cf_registry":12,"mol-proto":33}],12:[function(require,module,exports){
'use strict';

var ClassRegistry = require('../../abstract/registry')
	, ComponentFacet = require('../c_facet');

var facetsRegistry = new ClassRegistry(ComponentFacet);

facetsRegistry.add(ComponentFacet);

module.exports = facetsRegistry;

// TODO - refactor components registry test into a function
// that tests a registry with a given foundation class
// Make test for this registry based on this function
},{"../../abstract/registry":2,"../c_facet":8}],13:[function(require,module,exports){
'use strict';

var DOMEventsSource = require('./dom_events_source')
	, Component = require('../c_class')
	, ComponentDataSourceError = require('../../util/error').ComponentDataSource
	, _ = require('mol-proto')
	, check = require('../../util/check')
	, Match = check.Match;


// class to handle subscribtions to changes in DOM for UI (maybe also content editable) elements
var ComponentDataSource = _.createSubclass(DOMEventsSource, 'ComponentDataSource', true);


_.extendProto(ComponentDataSource, {
	// implementing MessageSource interface
	init: initComponentDataSource,
	translateToSourceMessage: translateToDomEvent,
 	addSourceListener: addDomEventListener,
 	removeSourceListener: removeDomEventListener,
 	filterSourceMessage: filterDataMessage,

 	// class specific methods
 	// dom: implemented in DOMEventsSource
 	value: getDomElementDataValue,
 	handleEvent: handleEvent,  // event dispatcher - as defined by Event DOM API
 	trigger: triggerDataMessage // redefines method of superclass DOMEventsSource
});

module.exports = ComponentDataSource;


function initComponentDataSource() {
	DOMEventsSource.prototype.init.apply(this, arguments);

	this.value(); // stores current component data value in this._value
}


// TODO: should return value dependent on element tag
function getDomElementDataValue() { // value method
	var newValue = this.component.el.value;

	Object.defineProperty(this, '_value', {
		configurable: true,
		value: newValue
	});

	return newValue;
}


// TODO: this function should return relevant DOM event dependent on element tag
// Can also implement beforedatachanged event to allow preventing the change
function translateToDomEvent(message) {
	if (message == 'datachanged')
		return 'input';
	else
		throw new ComponentDataSourceError('unknown component data event');
}


function addDomEventListener(eventType) {
	this.dom().addEventListener(eventType, this, false); // no capturing
}


function removeDomEventListener(eventType) {
	this.dom().removeEventListener(eventType, this, false); // no capturing
}


function filterDataMessage(eventType, message, data) {
	return data.newValue != data.oldValue;
};


 // event dispatcher - as defined by Event DOM API
function handleEvent(event) {
	var oldValue = this._value;

	this.dispatchMessage(event.type, {
		oldValue: oldValue,
		newValue: this.value()
	});
}


function triggerDataMessage(message, data) {
	// TODO - opposite translation + event trigger 
}

},{"../../util/check":27,"../../util/error":28,"../c_class":7,"./dom_events_source":15,"mol-proto":33}],14:[function(require,module,exports){
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
		var eventsConstructor;
		eval(
			'eventsConstructor = function ' + eventConstructorName + '(type, properties) { \
				this.type = type; \
				_.extend(this, properties); \
			};'
		);
		global[eventConstructorName] = eventsConstructor;
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

},{"mol-proto":33}],15:[function(require,module,exports){
'use strict';

var MessageSource = require('../../messenger/message_source')
	, Component = require('../c_class')
	, domEventsConstructors = require('./dom_events_constructors') // TODO merge with DOMEventSource ??
	, _ = require('mol-proto')
	, check = require('../../util/check')
	, Match = check.Match;

var DOMEventsSource = _.createSubclass(MessageSource, 'DOMMessageSource', true);


_.extendProto(DOMEventsSource, {
	// implementing MessageSource interface
	init: initDomEventsSource,
	translateToSourceMessage: translateToDomEvent,
 	addSourceListener: addDomEventListener,
 	removeSourceListener: removeDomEventListener,
 	filterSourceMessage: filterCapturedDomEvent,

 	// class specific methods
 	dom: getDomElement,
 	handleEvent: handleEvent,  // event dispatcher - as defined by Event DOM API
 	trigger: triggerDomEvent
});

module.exports = DOMEventsSource;


var useCapturePattern = /__capture$/;


function initDomEventsSource(hostObject, proxyMethods, component) {
	check(component, Component);
	MessageSource.prototype.init.apply(this, arguments);

	this.component = component;

	// this.messenger is set by Messenger class
}


function getDomElement() {
	return this.component.el;
}


function translateToDomEvent(message) {
	if (useCapturePattern.test(message))
		message = message.replace(useCapturePattern, '');
	return message;
}


function addDomEventListener(eventType) {
	this.dom().addEventListener(eventType, this, true);
}


function removeDomEventListener(eventType) {
	this.dom().removeEventListener(eventType, this, true);
}


function filterCapturedDomEvent(eventType, message, event) {
	var isCapturePhase;
	if (typeof window != 'undefined')
		isCapturePhase = event.eventPhase == window.Event.CAPTURING_PHASE;

	return (! isCapturePhase || (isCapturePhase && useCapturePattern.test(message)));
}


// event dispatcher - as defined by Event DOM API
function handleEvent(event) {
	this.dispatchMessage(event.type, event);
}


// TODO make work with messages (with _capture)
function triggerDomEvent(eventType, properties) {
	check(eventType, String);
	check(properties, Match.Optional(Object));

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
},{"../../messenger/message_source":25,"../../util/check":27,"../c_class":7,"./dom_events_constructors":14,"mol-proto":33}],16:[function(require,module,exports){
'use strict';

var ClassRegistry = require('../abstract/registry')
	, Component = require('./c_class');

var componentsRegistry = new ClassRegistry(Component);

componentsRegistry.add(Component);

module.exports = componentsRegistry;

},{"../abstract/registry":2,"./c_class":7}],17:[function(require,module,exports){
'use strict';

var Component = require('../c_class')
	, componentsRegistry = require('../c_registry');


var View = Component.createComponentClass('View', ['container']);

componentsRegistry.add(View);

module.exports = View;

},{"../c_class":7,"../c_registry":16}],18:[function(require,module,exports){
'use strict';

var _ = require('mol-proto');


module.exports = config;

function config(options) {
	_.deepExtend(config, options);
}

config({
	attrs: {
		bind: 'ml-bind',
		load: 'ml-load'
	}
});

},{"mol-proto":33}],19:[function(require,module,exports){
'use strict';

var _ = require('mol-proto');

module.exports = Facet;

function Facet(owner, options) {
	this.owner = owner;
	this.options = options || {};
	this.init.apply(this, arguments);
}

_.extendProto(Facet, {
	init: function() {}
});

},{"mol-proto":33}],20:[function(require,module,exports){
'use strict';

var Facet = require('./f_class')
	, _ = require('mol-proto')
	, check = require('../util/check')
	, Match = check.Match;

module.exports = FacetedObject;

// abstract class for faceted object
function FacetedObject(facetsOptions /*, other args - passed to init method */) {
	// TODO instantiate facets if configuration isn't passed
	// write a test to check it
	facetsOptions = facetsOptions ? _.clone(facetsOptions) : {};

	var thisClass = this.constructor
		, facets = {};

	if (this.constructor == FacetedObject)		
		throw new Error('FacetedObject is an abstract class, can\'t be instantiated');
	//if (! thisClass.prototype.facets)
	//	throw new Error('No facets defined in class ' + this.constructor.name);
	
	// _.eachKey(facetsOptions, instantiateFacet, this, true);

	if (this.facets)
		_.eachKey(this.facets, instantiateFacet, this, true);

	var unusedFacetsNames = Object.keys(facetsOptions);
	if (unusedFacetsNames.length)
		throw new Error('Configuration for unknown facet(s) passed: ' + unusedFacetsNames.join(', '));

	Object.defineProperties(this, facets);

	// calling init if it is defined in the class
	if (this.init)
		this.init.apply(this, arguments);

	function instantiateFacet(/* facetOpts */ FacetClass, fct) {
		// var FacetClass = this.facets[fct];
		var facetOpts = facetsOptions[fct];
		delete facetsOptions[fct];

		facets[fct] = {
			enumerable: false,
			value: new FacetClass(this, facetOpts)
		};
	}
}


_.extendProto(FacetedObject, {
	addFacet: addFacet
});


function addFacet(FacetClass, facetOpts, facetName) {
	check(FacetClass, Function);
	check(facetName, Match.Optional(String));

	facetName = _.firstLowerCase(facetName || FacetClass.name);

	var protoFacets = this.constructor.prototype.facets;

	if (protoFacets && protoFacets[facetName])
		throw new Error('facet ' + facetName + ' is already part of the class ' + this.constructor.name);

	if (this[facetName])
		throw new Error('facet ' + facetName + ' is already present in object');

	Object.defineProperty(this, facetName, {
		enumerable: false,
		value: new FacetClass(this, facetOpts)
	});
}


// factory that creates classes (constructors) from the map of facets
// these classes inherit from FacetedObject
FacetedObject.createFacetedClass = function (name, facetsClasses) {
	check(name, String);
	check(facetsClasses, Match.ObjectHash(Function /* Match.Subclass(Facet, true) TODO - fix */));

	var FacetedClass = _.createSubclass(this, name, true);

	_.extendProto(FacetedClass, {
		facets: facetsClasses
	});
	return FacetedClass;
};


},{"../util/check":27,"./f_class":19,"mol-proto":33}],21:[function(require,module,exports){
'use strict';

var miloMail = require('./mail')
	, request = require('./util/request')
	, logger = require('./util/logger')
	, config = require('./config')
	, LoadAttribute = require('./attribute/a_load')
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

	// if (document.readyState == 'loading')
	// 	document.addEventListener('readystatechange', loadWhenReady);
	// else
	// 	loadWhenReady();

	// function loadWhenReady() {
	// 	document.removeEventListener('readystatechange', loadWhenReady);
	// 	_loader.call(null, rootEl, callback);
	// }
}


function _loader(rootEl, callback) {
	var loadElements = rootEl.querySelectorAll('[' + config.attrs.load + ']');

	var views = {}
		, totalCount = loadElements.length
		, loadedCount = 0;

	Array.prototype.forEach.call(loadElements, function (el) {
		loadView(el, function(err) {
			views[el.id] = err || el;
			loadedCount++;
			if (loadedCount == totalCount)
				callback(views);
		});
	});
};


function loadView(el, callback) {
	if (el.children.length)
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

},{"./attribute/a_load":4,"./config":18,"./mail":22,"./util/error":28,"./util/logger":30,"./util/request":32}],22:[function(require,module,exports){
'use strict';

var Messenger = require('../messenger')
	, MailMessageSource = require('./mail_source');


var mailMsgSource = new MailMessageSource();

var miloMail = new Messenger(undefined, undefined, mailMsgSource);

module.exports = miloMail;

},{"../messenger":24,"./mail_source":23}],23:[function(require,module,exports){
'use strict';

var MessageSource = require('../messenger/message_source')
	, domEventsConstructors = require('../components/c_message_sources/dom_events_constructors')
	, MailMessageSourceError = require('../util/error').MailMessageSource
	, _ = require('mol-proto')
	, check = require('../util/check')
	, Match = check.Match;


var MailMessageSource = _.createSubclass(MessageSource, 'MailMessageSource', true);


_.extendProto(MailMessageSource, {
	// implementing MessageSource interface
	// init: defined in MessageSource
	translateToSourceMessage: translateToDomEvent,
 	addSourceListener: addDomEventListener,
 	removeSourceListener: removeDomEventListener,
 	filterSourceMessage: filterDomEvent,

 	// class specific methods
 	handleEvent: handleEvent,  // event dispatcher - as defined by Event DOM API
});

module.exports = MailMessageSource;


// TODO: this function should return relevant DOM event dependent on element tag
// Can also implement beforedatachanged event to allow preventing the change
function translateToDomEvent(message) {
	if (message == 'domready')
		return 'readystatechange';
}


function addDomEventListener(eventType) {
	if (typeof document == 'object') {
		if (eventType == 'readystatechange') {
			if (document.readyState == 'loading')
				document.addEventListener(eventType, this, false); // no capturing
			else {
				var domEvent = EventConstructor(eventType, { target: document });
				this.dispatchMessage(eventType, event);
			}
		}
	}
}


function removeDomEventListener(eventType) {
	if (typeof document == 'object')
		document.removeEventListener(eventType, this, false); // no capturing
}


function filterDomEvent(eventType, message, event) {
	if (eventType == 'readystatechange') {
		if (this.domReadyFired) return false;
		this.domReadyFired = true;
		return true;
	}
};


 // event dispatcher - as defined by Event DOM API
function handleEvent(event) {
	this.dispatchMessage(event.type, event);
}

},{"../components/c_message_sources/dom_events_constructors":14,"../messenger/message_source":25,"../util/check":27,"../util/error":28,"mol-proto":33}],24:[function(require,module,exports){
'use strict';

var Mixin = require('../abstract/mixin')
	, MessageSource = require('./message_source')
	, _ = require('mol-proto')
	, check = require('../util/check')
	, Match = check.Match
	, MessengerError = require('../util/error').Messenger;


var eventsSplitRegExp = /\s*(?:\,|\s)\s*/;


var Messenger = _.createSubclass(Mixin, 'Messenger');

_.extendProto(Messenger, {
	init: initMessenger, // called by Mixin (superclass)
	onMessage: registerSubscriber,
	offMessage: removeSubscriber,
	onMessages: registerSubscribers,
	offMessages: removeSubscribers,
	postMessage: postMessage,
	getSubscribers: getMessageSubscribers,
	_chooseSubscribersHash: _chooseSubscribersHash,
	_registerSubscriber: _registerSubscriber,
	_removeSubscriber: _removeSubscriber,
	_removeAllSubscribers: _removeAllSubscribers,
	_callPatternSubscribers: _callPatternSubscribers,
	_callSubscribers: _callSubscribers
});


Messenger.defaultMethods = {
	onMessage: 'onMessage',
	offMessage: 'offMessage',
	onMessages: 'onMessages',
	offMessages: 'offMessages',
	postMessage: 'postMessage',
	getSubscribers: 'getSubscribers'
};


module.exports = Messenger;


function initMessenger(hostObject, proxyMethods, messageSource) {
	check(messageSource, Match.Optional(MessageSource));

	// hostObject and proxyMethods are used in Mixin
 	// messenger data
 	Object.defineProperties(this, {
 		_messageSubscribers: { value: {} },
 		_patternMessageSubscribers: { value: {} },
 		_messageSource: { value: messageSource }
 	});

 	if (messageSource)
 		messageSource.messenger = this;
}


function registerSubscriber(messages, subscriber) {
	check(messages, Match.OneOf(String, [String], RegExp));
	check(subscriber, Function); 

	if (typeof messages == 'string')
		messages = messages.split(eventsSplitRegExp);

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


function _registerSubscriber(subscribersHash, message, subscriber) {
	if (! (subscribersHash[message] && subscribersHash[message].length)) {
		subscribersHash[message] = [];
		var noSubscribers = true;
		if (this._messageSource)
			this._messageSource.onSubscriberAdded(message);
	}

	var msgSubscribers = subscribersHash[message];
	var notYetRegistered = noSubscribers || msgSubscribers.indexOf(subscriber) == -1;

	if (notYetRegistered)
		msgSubscribers.push(subscriber);

	return notYetRegistered;
}


function registerSubscribers(messageSubscribers) {
	check(messageSubscribers, Match.ObjectHash(Function));

	var notYetRegisteredMap = _.mapKeys(messageSubscribers, function(subscriber, messages) {
		return this.onMessage(messages, subscriber)
	}, this);

	return notYetRegisteredMap;
}


// removes all subscribers for the message if subscriber isn't supplied
function removeSubscriber(messages, subscriber) {
	check(messages, Match.OneOf(String, [String], RegExp));
	check(subscriber, Match.Optional(Function)); 

	if (typeof messages == 'string')
		messages = messages.split(eventsSplitRegExp);

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


function _removeAllSubscribers(subscribersHash, message) {
	delete subscribersHash[message];
	if (this._messageSource)
		this._messageSource.onSubscriberRemoved(message);
}


function removeSubscribers(messageSubscribers) {
	check(messageSubscribers, Match.ObjectHash(Function));

	var subscriberRemovedMap = _.mapKeys(messageSubscribers, function(subscriber, messages) {
		return this.offMessages(messages, subscriber)
	}, this);

	return subscriberRemovedMap;	
}


// TODO - send event to messageSource


function postMessage(message, data) {
	check(message, Match.OneOf(String, RegExp));

	var subscribersHash = this._chooseSubscribersHash(message);
	var msgSubscribers = subscribersHash[message];

	this._callSubscribers(message, data, msgSubscribers);

	if (typeof message == 'string')
		this._callPatternSubscribers(message, data);
}


function _callPatternSubscribers(message, data) {
	_.eachKey(this._patternMessageSubscribers, 
		function(patternSubscribers, pattern) {
			if (pattern.test(message))
				this._callSubscribers(message, data, patternSubscribers);
		}
	, this);
}


function _callSubscribers(message, data, msgSubscribers) {
	if (msgSubscribers && msgSubscribers.length)
		msgSubscribers.forEach(function(subscriber) {
			subscriber.call(this, message, data);
		}, this);
}


function getMessageSubscribers(message, includePatternSubscribers) {
	check(message, Match.OneOf(String, RegExp));

	var subscribersHash = this._chooseSubscribersHash(message);
	var msgSubscribers = subscribersHash[message]
							? [].concat(subscribersHash[message])
							: [];

	// pattern subscribers are incuded by default
	if (includePatternSubscribers !== false && typeof message == 'string') {
		_.eachKey(this._patternMessageSubscribers, 
			function(patternSubscribers, pattern) {
				if (patternSubscribers && patternSubscribers.length
						&& pattern.test(message))
					_.appendArray(msgSubscribers, patternSubscribers);
			}
		);
	}

	return msgSubscribers.length
				? msgSubscribers
				: undefined;
}


function _chooseSubscribersHash(message) {
	return message instanceof RegExp
				? this._patternMessageSubscribers
				: this._messageSubscribers;
}

},{"../abstract/mixin":1,"../util/check":27,"../util/error":28,"./message_source":25,"mol-proto":33}],25:[function(require,module,exports){
'use strict';

var Mixin = require('../abstract/mixin')
	, logger = require('../util/logger')
	, toBeImplemented = require('../util/error').toBeImplemented
	, _ = require('mol-proto');

// an abstract class for dispatching external to internal events
var MessageSource = _.createSubclass(Mixin, 'MessageSource', true);

module.exports = MessageSource;


_.extendProto(MessageSource, {
	// initializes messageSource - called by Mixin superclass
	init: initMessageSource,

	// called by Messenger to notify when the first subscriber for an internal message was added
	onSubscriberAdded: onSubscriberAdded,

	// called by Messenger to notify when the last subscriber for an internal message was removed
 	onSubscriberRemoved: onSubscriberRemoved, 

 	// dispatches source message
 	dispatchMessage: dispatchSourceMessage,

	// filters source message based on the data of the message - should be implemented in subclass
	filterSourceMessage: dispatchAllSourceMessages,

 	// ***
 	// Methods below must be implemented in subclass
 	
	// converts internal message type to external message type - should be implemented in subclass
	translateToSourceMessage: toBeImplemented,

 	// adds listener to external message - should be implemented by subclass
 	addSourceListener: toBeImplemented,

 	// removes listener from external message - should be implemented by subclass
 	removeSourceListener: toBeImplemented,
});


function initMessageSource() {
	Object.defineProperty(this, '_internalMessages', { value: {} });
}


function onSubscriberAdded(message) {
	var sourceMessage = this.translateToSourceMessage(message);

	if (! sourceMessage) return;

	if (! this._internalMessages.hasOwnProperty(sourceMessage)) {
		this.addSourceListener(sourceMessage);
		this._internalMessages[sourceMessage] = [];
	}
	var internalMsgs = this._internalMessages[sourceMessage];

	if (internalMsgs.indexOf(message) == -1)
		internalMsgs.push(message);
	else
		logger.warn('Duplicate notification received: for subscribe to internal message ' + message);
}


function onSubscriberRemoved(message) {
	var sourceMessage = this.translateToSourceMessage(message);

	if (! sourceMessage) return;

	var internalMsgs = this._internalMessages[sourceMessage];

	if (internalMsgs && internalMsgs.length) {
		messageIndex = internalMsgs.indexOf(message);
		if (messageIndex >= 0) {
			internalMsgs.splice(messageIndex, 1);
			if (internalMsgs.length == 0) {
				delete this._internalMessages[sourceMessage];
				this.removeSourceListener(sourceMessage);
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


function dispatchSourceMessage(sourceMessage, data) {
	var internalMsgs = this._internalMessages[sourceMessage];

	if (internalMsgs && internalMsgs.length)
		internalMsgs.forEach(function(message) {
			if (this.filterSourceMessage
					&& this.filterSourceMessage(sourceMessage, message, data))
				this.messenger.postMessage(message, data);
		}, this);
	else
		logger.warn('source message received for which there is no mapped internal message');
}


// can be overridden in subclass to implement filtering based on message data
function dispatchAllSourceMessages(sourceMessage, message, data) {
	return true;
}

},{"../abstract/mixin":1,"../util/error":28,"../util/logger":30,"mol-proto":33}],26:[function(require,module,exports){
'use strict';

var milo = {
	loader: require('./loader'),
	binder: require('./binder'),
	mail: require('./mail'),
	config: require('./config'),
	util: require('./util')
}


// used facets
require('./components/c_facets/Container');
require('./components/c_facets/Events');
require('./components/c_facets/Data');

// used components
require('./components/classes/View');


if (typeof module == 'object' && module.exports)
	// export for node/browserify
	module.exports = milo;

if (typeof window == 'object')
	window.milo = milo;

},{"./binder":6,"./components/c_facets/Container":9,"./components/c_facets/Data":10,"./components/c_facets/Events":11,"./components/classes/View":17,"./config":18,"./loader":21,"./mail":22,"./util":29}],27:[function(require,module,exports){
'use strict';

// XXX docs

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
    if (typeof value === "number" && (value | 0) === value)
      return
    throw new Match.Error("Expected Integer, got "
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
  else if (!key.match(/^[a-z_$][0-9a-z_$]*$/i) || _jsKeywords.indexOf(key) != -1)
    key = JSON.stringify([key]);

  if (base && base[0] !== "[")
    return key + '.' + base;
  return key + base;
};


},{"mol-proto":33}],28:[function(require,module,exports){
'use strict';

var _ = require('mol-proto');


// module exports error classes for all names defined in this array
var errorClassNames = ['AbstractClass', 'Mixin', 'Messenger', 'ComponentDataSource',
					   'Attribute', 'Binder', 'Loader', 'MailMessageSource'];

var error = {
	toBeImplemented: toBeImplemented,
	createClass: createErrorClass
};

errorClassNames.forEach(function(name) {
	error[name] = createErrorClass(name + 'Error');
});

module.exports = error;


function createErrorClass(errorClassName) {
	var ErrorClass;
	eval('ErrorClass = function ' + errorClassName + '(message) { \
			this.name = "' + errorClassName + '"; \
			this.message = message || "There was an error"; \
		}');
	_.makeSubclass(ErrorClass, Error);

	return ErrorClass;
}


function toBeImplemented() {
	throw new error.AbstractClass('calling the method of an absctract class MessageSource');
}

},{"mol-proto":33}],29:[function(require,module,exports){
'use strict';

var util = {
	logger: require('./logger'),
	request: require('./request'),
	check: require('./check'),
	error: require('./error')
};

module.exports = util;

},{"./check":27,"./error":28,"./logger":30,"./request":32}],30:[function(require,module,exports){
'use strict';

var Logger = require('./logger_class');

var logger = new Logger({ level: 3 });

module.exports = logger;

},{"./logger_class":31}],31:[function(require,module,exports){
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

},{"mol-proto":33}],32:[function(require,module,exports){
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

},{"mol-proto":33}],33:[function(require,module,exports){
'use strict';

var _;
var proto = _ = {
	extendProto: extendProto,
	createSubclass: createSubclass,
	makeSubclass: makeSubclass,
	extend: extend,
	clone: clone,
	deepExtend: deepExtend,
	allKeys: Object.getOwnPropertyNames.bind(Object),
	keyOf: keyOf,
	allKeysOf: allKeysOf,
	eachKey: eachKey,
	mapKeys: mapKeys,
	appendArray: appendArray,
	prependArray: prependArray,
	toArray: toArray,
	firstUpperCase: firstUpperCase,
	firstLowerCase: firstLowerCase
};


if (typeof window == 'object') {
	// preserve existing _ object
	if (window._)
		proto.underscore = window._

	// expose global _
	window._ = proto;
}

if (typeof module == 'object' && module.exports)
	// export for node/browserify
	module.exports = proto;
	

function extendProto(self, methods) {
	var propDescriptors = {};

	_.eachKey(methods, function(method, name) {
		propDescriptors[name] = {
			enumerable: false,
			configurable: false,
			writable: false,
			value: method
		};
	});

	Object.defineProperties(self.prototype, propDescriptors);
	return self;
}


function extend(self, obj, onlyEnumerable) {
	var propDescriptors = {};

	_.eachKey(obj, function(value, prop) {
		var descriptor = Object.getOwnPropertyDescriptor(obj, prop);
		propDescriptors[prop] = descriptor;
	}, this, onlyEnumerable);

	Object.defineProperties(self, propDescriptors);

	return self;
}


function deepExtend(self, obj, onlyEnumerable) {
	return _extendTree(self, obj, onlyEnumerable, []);
}


function _extendTree(selfNode, objNode, onlyEnumerable, objTraversed) {
	if (objTraversed.indexOf(objNode) >= 0) return; // node already traversed
	objTraversed.push(objNode);

	_.eachKey(objNode, function(value, prop) {
		var descriptor = Object.getOwnPropertyDescriptor(objNode, prop);
		if (typeof value == 'object') {
			if (selfNode.hasOwnProperty(prop) && typeof selfNode[prop] == 'object')
				_extendTree(selfNode[prop], value, onlyEnumerable, objTraversed)
			else
				Object.defineProperty(selfNode, prop, descriptor);
		} else
			Object.defineProperty(selfNode, prop, descriptor);
	}, this, onlyEnumerable);

	return selfNode;
}


function clone(obj) {
	var clonedObject = Object.create(obj.constructor.prototype);
	_.extend(clonedObject, obj);
	return clonedObject;
}


function createSubclass(thisClass, name, applyConstructor) {
	var subclass;

	// name is optional
	name = name || '';

	// apply superclass constructor
	var constructorCode = applyConstructor === false
			? ''
			: 'thisClass.apply(this, arguments);';

	eval('subclass = function ' + name + '(){ ' + constructorCode + ' }');

	_.makeSubclass(subclass, thisClass);

	// copy class methods
	// - for them to work correctly they should not explictly use superclass name
	// and use "this" instead
	_.extend(subclass, thisClass, true);

	return subclass;
}


function makeSubclass(thisClass, Superclass) {
	// prototype chain
	thisClass.prototype = Object.create(Superclass.prototype);
	
	// subclass identity
	_.extendProto(thisClass, {
		constructor: thisClass
	});
	return thisClass;
}


function keyOf(self, searchElement, onlyEnumerable) {
	var properties = onlyEnumerable 
						? Object.keys(self)
						: _.allKeys(self);

	for (var i = 0; i < properties.length; i++)
		if (searchElement === self[properties[i]])
			return properties[i];
	
	return undefined;
}


function allKeysOf(self, searchElement, onlyEnumerable) {
	var properties = onlyEnumerable 
						? Object.keys(self)
						: _.allKeys(self);

	var keys = properties.filter(function(prop) {
		return searchElement === self[prop];
	});

	return keys;
}


function eachKey(self, callback, thisArg, onlyEnumerable) {
	var properties = onlyEnumerable 
						? Object.keys(self)
						: _.allKeys(self);

	properties.forEach(function(prop) {
		callback.call(thisArg, self[prop], prop, self);
	});
}


function mapKeys(self, callback, thisArg, onlyEnumerable) {
	var mapResult = {};
	_.eachKey(self, mapProperty, thisArg, onlyEnumerable);
	return mapResult;

	function mapProperty(value, key) {
		var descriptor = Object.getOwnPropertyDescriptor(self, key);
		if (descriptor.enumerable || ! onlyEnumerable) {
			descriptor.value = callback.call(this, value, key, self);
			Object.defineProperty(mapResult, key, descriptor);
		}
	}
}


function appendArray(self, arrayToAppend) {
	if (! arrayToAppend.length) return self;

    var args = [self.length, 0].concat(arrayToAppend);
    Array.prototype.splice.apply(self, args);

    return self;
}


function prependArray(self, arrayToPrepend) {
	if (! arrayToPrepend.length) return self;

    var args = [0, 0].concat(arrayToPrepend);
    Array.prototype.splice.apply(self, args);

    return self;
}


function toArray(arrayLike) {
	var arr = [];
	Array.prototype.forEach.call(arrayLike, function(item) {
		arr.push(item)
	});

	return arr;
}


function firstUpperCase(str) {
	return str[0].toUpperCase() + str.slice(1);
}


function firstLowerCase(str) {
	return str[0].toLowerCase() + str.slice(1);
}

},{}],34:[function(require,module,exports){
'use strict';

describe('milo binder', function() {
    it('should bind components based on ml-bind attribute', function() {
    	var milo = require('../../lib/milo');

		expect({p: 1}).property('p', 1);

    	var ctrl = milo.binder();

    	ctrl.articleButton.events.on('click mouseenter', function(eType, evt) {
    		console.log('button', eType, evt);
    	});

        ctrl.main.events.on('click mouseenter input keypress', function(eType, evt) {
            console.log('div', eType, evt);
        });

    	ctrl.articleIdInput.data.on('datachanged', logData);

    	function logData(message, data) {
    		console.log(message, data);
    	}
    	
		console.log(ctrl);
    });
});

},{"../../lib/milo":26}]},{},[34])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2Fic3RyYWN0L21peGluLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9hYnN0cmFjdC9yZWdpc3RyeS5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvYXR0cmlidXRlL2FfYmluZC5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvYXR0cmlidXRlL2FfbG9hZC5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvYXR0cmlidXRlL2luZGV4LmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9iaW5kZXIuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19jbGFzcy5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX2ZhY2V0LmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfZmFjZXRzL0NvbnRhaW5lci5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX2ZhY2V0cy9EYXRhLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfZmFjZXRzL0V2ZW50cy5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX2ZhY2V0cy9jZl9yZWdpc3RyeS5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX21lc3NhZ2Vfc291cmNlcy9jb21wb25lbnRfZGF0YV9zb3VyY2UuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19tZXNzYWdlX3NvdXJjZXMvZG9tX2V2ZW50c19jb25zdHJ1Y3RvcnMuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19tZXNzYWdlX3NvdXJjZXMvZG9tX2V2ZW50c19zb3VyY2UuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19yZWdpc3RyeS5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jbGFzc2VzL1ZpZXcuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbmZpZy5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvZmFjZXRzL2ZfY2xhc3MuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2ZhY2V0cy9mX29iamVjdC5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvbG9hZGVyLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9tYWlsL2luZGV4LmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9tYWlsL21haWxfc291cmNlLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9tZXNzZW5nZXIvaW5kZXguanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL21lc3Nlbmdlci9tZXNzYWdlX3NvdXJjZS5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvbWlsby5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvdXRpbC9jaGVjay5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvdXRpbC9lcnJvci5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvdXRpbC9pbmRleC5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvdXRpbC9sb2dnZXIuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL3V0aWwvbG9nZ2VyX2NsYXNzLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi91dGlsL3JlcXVlc3QuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbm9kZV9tb2R1bGVzL21vbC1wcm90by9saWIvcHJvdG8uanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vdGVzdF9odG1sL2JpbmRfdGVzdC9iaW5kX3Rlc3QuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgnbW9sLXByb3RvJylcblx0LCBjaGVjayA9IHJlcXVpcmUoJy4uL3V0aWwvY2hlY2snKVxuXHQsIE1hdGNoID0gY2hlY2suTWF0Y2hcblx0LCBNaXhpbkVycm9yID0gcmVxdWlyZSgnLi4vdXRpbC9lcnJvcicpLk1peGluO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gTWl4aW47XG5cbi8vIGFuIGFic3RyYWN0IGNsYXNzIGZvciBtaXhpbiBwYXR0ZXJuIC0gYWRkaW5nIHByb3h5IG1ldGhvZHMgdG8gaG9zdCBvYmplY3RzXG5mdW5jdGlvbiBNaXhpbihob3N0T2JqZWN0LCBwcm94eU1ldGhvZHMgLyosIG90aGVyIGFyZ3MgLSBwYXNzZWQgdG8gaW5pdCBtZXRob2QgKi8pIHtcblx0Ly8gVE9ETyAtIG1vY2UgY2hlY2tzIGZyb20gTWVzc2VuZ2VyIGhlcmVcblx0Y2hlY2soaG9zdE9iamVjdCwgTWF0Y2guT3B0aW9uYWwoT2JqZWN0KSk7XG5cdGNoZWNrKHByb3h5TWV0aG9kcywgTWF0Y2guT3B0aW9uYWwoTWF0Y2guT2JqZWN0SGFzaChTdHJpbmcpKSk7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdfaG9zdE9iamVjdCcsIHsgdmFsdWU6IGhvc3RPYmplY3QgfSk7XG5cdGlmIChwcm94eU1ldGhvZHMpXG5cdFx0dGhpcy5fY3JlYXRlUHJveHlNZXRob2RzKHByb3h5TWV0aG9kcyk7XG5cblx0Ly8gY2FsbGluZyBpbml0IGlmIGl0IGlzIGRlZmluZWQgaW4gdGhlIGNsYXNzXG5cdGlmICh0aGlzLmluaXQpXG5cdFx0dGhpcy5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59XG5cbl8uZXh0ZW5kUHJvdG8oTWl4aW4sIHtcblx0X2NyZWF0ZVByb3h5TWV0aG9kOiBfY3JlYXRlUHJveHlNZXRob2QsXG5cdF9jcmVhdGVQcm94eU1ldGhvZHM6IF9jcmVhdGVQcm94eU1ldGhvZHNcbn0pO1xuXG5cbmZ1bmN0aW9uIF9jcmVhdGVQcm94eU1ldGhvZChtaXhpbk1ldGhvZE5hbWUsIHByb3h5TWV0aG9kTmFtZSkge1xuXHRpZiAodGhpcy5faG9zdE9iamVjdFtwcm94eU1ldGhvZE5hbWVdKVxuXHRcdHRocm93IG5ldyBNaXhpbkVycm9yKCdtZXRob2QgJyArIHByb3h5TWV0aG9kTmFtZSArXG5cdFx0XHRcdFx0XHRcdFx0ICcgYWxyZWFkeSBkZWZpbmVkIGluIGhvc3Qgb2JqZWN0Jyk7XG5cblx0Y2hlY2sodGhpc1ttaXhpbk1ldGhvZE5hbWVdLCBGdW5jdGlvbik7XG5cblx0dmFyIGJvdW5kTWV0aG9kID0gdGhpc1ttaXhpbk1ldGhvZE5hbWVdLmJpbmQodGhpcyk7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMuX2hvc3RPYmplY3QsIHByb3h5TWV0aG9kTmFtZSxcblx0XHR7IHZhbHVlOiBib3VuZE1ldGhvZCB9KTtcbn1cblxuXG5mdW5jdGlvbiBfY3JlYXRlUHJveHlNZXRob2RzKHByb3h5TWV0aG9kcykge1xuXHQvLyBjcmVhdGluZyBhbmQgYmluZGluZyBwcm94eSBtZXRob2RzIG9uIHRoZSBob3N0IG9iamVjdFxuXHRfLmVhY2hLZXkocHJveHlNZXRob2RzLCBfY3JlYXRlUHJveHlNZXRob2QsIHRoaXMpO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpXG5cdCwgY2hlY2sgPSByZXF1aXJlKCcuLi91dGlsL2NoZWNrJylcblx0LCBNYXRjaCA9IGNoZWNrLk1hdGNoO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENsYXNzUmVnaXN0cnk7XG5cbmZ1bmN0aW9uIENsYXNzUmVnaXN0cnkgKEZvdW5kYXRpb25DbGFzcykge1xuXHRpZiAoRm91bmRhdGlvbkNsYXNzKVxuXHRcdHRoaXMuc2V0Q2xhc3MoRm91bmRhdGlvbkNsYXNzKTtcblxuXHQvLyBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ19fcmVnaXN0ZXJlZENsYXNzZXMnLCB7XG5cdC8vIFx0XHRlbnVtZXJhYmxlOiBmYWxzZSxcblx0Ly8gXHRcdHdyaXRhYmxlOiB0cnVlLFxuXHQvLyBcdFx0Y29uZmlndXJhYmxlOiB0cnVlLFxuXHQvLyBcdFx0dmFsdWU6IHt9XG5cdC8vIH0pO1xuXG5cdHRoaXMuX19yZWdpc3RlcmVkQ2xhc3NlcyA9IHt9O1xufVxuXG5fLmV4dGVuZFByb3RvKENsYXNzUmVnaXN0cnksIHtcblx0YWRkOiByZWdpc3RlckNsYXNzLFxuXHRnZXQ6IGdldENsYXNzLFxuXHRyZW1vdmU6IHVucmVnaXN0ZXJDbGFzcyxcblx0Y2xlYW46IHVucmVnaXN0ZXJBbGxDbGFzc2VzLFxuXHRzZXRDbGFzczogc2V0Rm91bmRhdGlvbkNsYXNzXG59KTtcblxuXG5mdW5jdGlvbiBzZXRGb3VuZGF0aW9uQ2xhc3MoRm91bmRhdGlvbkNsYXNzKSB7XG5cdGNoZWNrKEZvdW5kYXRpb25DbGFzcywgRnVuY3Rpb24pO1xuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ0ZvdW5kYXRpb25DbGFzcycsIHtcblx0XHRlbnVtZXJhYmxlOiB0cnVlLFxuXHRcdHZhbHVlOiBGb3VuZGF0aW9uQ2xhc3Ncblx0fSk7XG59XG5cbmZ1bmN0aW9uIHJlZ2lzdGVyQ2xhc3MoYUNsYXNzLCBuYW1lKSB7XG5cdG5hbWUgPSBuYW1lIHx8IGFDbGFzcy5uYW1lO1xuXG5cdGNoZWNrKG5hbWUsIFN0cmluZywgJ2NsYXNzIG5hbWUgbXVzdCBiZSBzdHJpbmcnKTtcblx0Y2hlY2sobmFtZSwgTWF0Y2guV2hlcmUoZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHR5cGVvZiBuYW1lID09ICdzdHJpbmcnICYmIG5hbWUgIT0gJyc7XG5cdH0pLCAnY2xhc3MgbmFtZSBtdXN0IGJlIHN0cmluZycpO1xuXHRpZiAodGhpcy5Gb3VuZGF0aW9uQ2xhc3MpIHtcblx0XHRpZiAoYUNsYXNzICE9IHRoaXMuRm91bmRhdGlvbkNsYXNzKVxuXHRcdFx0Y2hlY2soYUNsYXNzLCBNYXRjaC5TdWJjbGFzcyh0aGlzLkZvdW5kYXRpb25DbGFzcyksICdjbGFzcyBtdXN0IGJlIGEgc3ViKGNsYXNzKSBvZiBhIGZvdW5kYXRpb24gY2xhc3MnKTtcblx0fSBlbHNlXG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignZm91bmRhdGlvbiBjbGFzcyBtdXN0IGJlIHNldCBiZWZvcmUgYWRkaW5nIGNsYXNzZXMgdG8gcmVnaXN0cnknKTtcblxuXHRpZiAodGhpcy5fX3JlZ2lzdGVyZWRDbGFzc2VzW25hbWVdKVxuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ2lzIGFscmVhZHkgcmVnaXN0ZXJlZCcpO1xuXG5cdHRoaXMuX19yZWdpc3RlcmVkQ2xhc3Nlc1tuYW1lXSA9IGFDbGFzcztcbn07XG5cblxuZnVuY3Rpb24gZ2V0Q2xhc3MobmFtZSkge1xuXHRjaGVjayhuYW1lLCBTdHJpbmcsICdjbGFzcyBuYW1lIG11c3QgYmUgc3RyaW5nJyk7XG5cdHJldHVybiB0aGlzLl9fcmVnaXN0ZXJlZENsYXNzZXNbbmFtZV07XG59O1xuXG5cbmZ1bmN0aW9uIHVucmVnaXN0ZXJDbGFzcyhuYW1lT3JDbGFzcykge1xuXHRjaGVjayhuYW1lT3JDbGFzcywgTWF0Y2guT25lT2YoU3RyaW5nLCBGdW5jdGlvbiksICdjbGFzcyBvciBuYW1lIG11c3QgYmUgc3VwcGxpZWQnKTtcblxuXHR2YXIgbmFtZSA9IHR5cGVvZiBuYW1lT3JDbGFzcyA9PSAnc3RyaW5nJ1xuXHRcdFx0XHRcdFx0PyBuYW1lT3JDbGFzc1xuXHRcdFx0XHRcdFx0OiBuYW1lT3JDbGFzcy5uYW1lO1xuXHRcdFx0XHRcdFx0XG5cdGlmICghIHRoaXMuX19yZWdpc3RlcmVkQ2xhc3Nlc1tuYW1lXSlcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdjbGFzcyBpcyBub3QgcmVnaXN0ZXJlZCcpO1xuXG5cdGRlbGV0ZSB0aGlzLl9fcmVnaXN0ZXJlZENsYXNzZXNbbmFtZV07XG59O1xuXG5cbmZ1bmN0aW9uIHVucmVnaXN0ZXJBbGxDbGFzc2VzKCkge1xuXHR0aGlzLl9fcmVnaXN0ZXJlZENsYXNzZXMgPSB7fTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBBdHRyaWJ1dGUgPSByZXF1aXJlKCcuL2luZGV4Jylcblx0LCBBdHRyaWJ1dGVFcnJvciA9IHJlcXVpcmUoJy4uL3V0aWwvZXJyb3InKS5BdHRyaWJ1dGVcblx0LCBjb25maWcgPSByZXF1aXJlKCcuLi9jb25maWcnKVxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vdXRpbC9jaGVjaycpXG5cdCwgTWF0Y2ggPSBjaGVjay5NYXRjaDtcblxuXG4vLyBNYXRjaGVzO1xuLy8gOm15VmlldyAtIG9ubHkgY29tcG9uZW50IG5hbWVcbi8vIFZpZXc6bXlWaWV3IC0gY2xhc3MgYW5kIGNvbXBvbmVudCBuYW1lXG4vLyBbRXZlbnRzLCBEYXRhXTpteVZpZXcgLSBmYWNldHMgYW5kIGNvbXBvbmVudCBuYW1lXG4vLyBWaWV3W0V2ZW50c106bXlWaWV3IC0gY2xhc3MsIGZhY2V0KHMpIGFuZCBjb21wb25lbnQgbmFtZVxuXG52YXIgYXR0clJlZ0V4cD0gL14oW15cXDpcXFtcXF1dKikoPzpcXFsoW15cXDpcXFtcXF1dKilcXF0pP1xcOj8oW146XSopJC9cblx0LCBmYWNldHNTcGxpdFJlZ0V4cCA9IC9cXHMqKD86XFwsfFxccylcXHMqLztcblxuXG52YXIgQmluZEF0dHJpYnV0ZSA9IF8uY3JlYXRlU3ViY2xhc3MoQXR0cmlidXRlLCAnQmluZEF0dHJpYnV0ZScsIHRydWUpO1xuXG5fLmV4dGVuZFByb3RvKEJpbmRBdHRyaWJ1dGUsIHtcblx0YXR0ck5hbWU6IGdldEF0dHJpYnV0ZU5hbWUsXG5cdHBhcnNlOiBwYXJzZUF0dHJpYnV0ZSxcblx0dmFsaWRhdGU6IHZhbGlkYXRlQXR0cmlidXRlXG59KTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IEJpbmRBdHRyaWJ1dGU7XG5cblxuZnVuY3Rpb24gZ2V0QXR0cmlidXRlTmFtZSgpIHtcblx0cmV0dXJuIGNvbmZpZy5hdHRyc1snYmluZCddO1xufVxuXG5cbmZ1bmN0aW9uIHBhcnNlQXR0cmlidXRlKCkge1xuXHRpZiAoISB0aGlzLm5vZGUpIHJldHVybjtcblxuXHR2YXIgdmFsdWUgPSB0aGlzLmdldCgpO1xuXG5cdGlmICh2YWx1ZSlcblx0XHR2YXIgYmluZFRvID0gdmFsdWUubWF0Y2goYXR0clJlZ0V4cCk7XG5cblx0aWYgKCEgYmluZFRvKVxuXHRcdHRocm93IG5ldyBBdHRyaWJ1dGVFcnJvcignaW52YWxpZCBiaW5kIGF0dHJpYnV0ZSAnICsgdmFsdWUpO1xuXG5cdHRoaXMuY29tcENsYXNzID0gYmluZFRvWzFdIHx8ICdDb21wb25lbnQnO1xuXHR0aGlzLmNvbXBGYWNldHMgPSAoYmluZFRvWzJdICYmIGJpbmRUb1syXS5zcGxpdChmYWNldHNTcGxpdFJlZ0V4cCkpIHx8IHVuZGVmaW5lZDtcblx0dGhpcy5jb21wTmFtZSA9IGJpbmRUb1szXSB8fCB1bmRlZmluZWQ7XG5cblx0cmV0dXJuIHRoaXM7XG59XG5cblxuZnVuY3Rpb24gdmFsaWRhdGVBdHRyaWJ1dGUoKSB7XG5cdHZhciBjb21wTmFtZSA9IHRoaXMuY29tcE5hbWU7XG5cdGNoZWNrKGNvbXBOYW1lLCBNYXRjaC5XaGVyZShmdW5jdGlvbigpIHtcbiAgXHRcdHJldHVybiB0eXBlb2YgY29tcE5hbWUgPT0gJ3N0cmluZycgJiYgY29tcE5hbWUgIT0gJyc7XG5cdH0pLCAnZW1wdHkgY29tcG9uZW50IG5hbWUnKTtcblxuXHRpZiAoISB0aGlzLmNvbXBDbGFzcylcblx0XHR0aHJvdyBuZXcgQXR0cmlidXRlRXJyb3IoJ2VtcHR5IGNvbXBvbmVudCBjbGFzcyBuYW1lICcgKyB0aGlzLmNvbXBDbGFzcyk7XG5cblx0cmV0dXJuIHRoaXM7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBBdHRyaWJ1dGUgPSByZXF1aXJlKCcuL2luZGV4Jylcblx0LCBBdHRyaWJ1dGVFcnJvciA9IHJlcXVpcmUoJy4uL3V0aWwvZXJyb3InKS5BdHRyaWJ1dGVcblx0LCBjb25maWcgPSByZXF1aXJlKCcuLi9jb25maWcnKVxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKTtcblxuXG52YXIgTG9hZEF0dHJpYnV0ZSA9IF8uY3JlYXRlU3ViY2xhc3MoQXR0cmlidXRlLCAnTG9hZEF0dHJpYnV0ZScsIHRydWUpO1xuXG5fLmV4dGVuZFByb3RvKExvYWRBdHRyaWJ1dGUsIHtcblx0YXR0ck5hbWU6IGdldEF0dHJpYnV0ZU5hbWUsXG5cdHBhcnNlOiBwYXJzZUF0dHJpYnV0ZSxcblx0dmFsaWRhdGU6IHZhbGlkYXRlQXR0cmlidXRlXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBMb2FkQXR0cmlidXRlO1xuXG5cbmZ1bmN0aW9uIGdldEF0dHJpYnV0ZU5hbWUoKSB7XG5cdHJldHVybiBjb25maWcuYXR0cnMubG9hZDtcbn1cblxuXG5mdW5jdGlvbiBwYXJzZUF0dHJpYnV0ZSgpIHtcblx0aWYgKCEgdGhpcy5ub2RlKSByZXR1cm47XG5cblx0dmFyIHZhbHVlID0gdGhpcy5nZXQoKTtcblxuXHR0aGlzLmxvYWRVcmwgPSB2YWx1ZTtcblxuXHRyZXR1cm4gdGhpcztcbn1cblxuXG5mdW5jdGlvbiB2YWxpZGF0ZUF0dHJpYnV0ZSgpIHtcblx0Ly8gVE9ETyB1cmwgdmFsaWRhdGlvblxuXG5cdHJldHVybiB0aGlzO1xufSIsIid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vdXRpbC9jaGVjaycpXG5cdCwgTWF0Y2ggPSBjaGVjay5NYXRjaFxuXHQsIHRvQmVJbXBsZW1lbnRlZCA9IHJlcXVpcmUoJy4uL3V0aWwvZXJyb3InKS50b0JlSW1wbGVtZW50ZWQ7XG5cblxuLy8gYW4gYWJzdHJhY3QgYXR0cmlidXRlIGNsYXNzIGZvciBhdHRyaWJ1dGUgcGFyc2luZyBhbmQgdmFsaWRhdGlvblxuXG5tb2R1bGUuZXhwb3J0cyA9IEF0dHJpYnV0ZTtcblxuZnVuY3Rpb24gQXR0cmlidXRlKGVsLCBuYW1lKSB7XG5cdHRoaXMubmFtZSA9IG5hbWUgfHwgdGhpcy5hdHRyTmFtZSgpO1xuXHR0aGlzLmVsID0gZWw7XG5cdHRoaXMubm9kZSA9IGVsLmF0dHJpYnV0ZXNbdGhpcy5uYW1lXTtcbn1cblxuXy5leHRlbmRQcm90byhBdHRyaWJ1dGUsIHtcblx0Z2V0OiBnZXRBdHRyaWJ1dGVWYWx1ZSxcblx0c2V0OiBzZXRBdHRyaWJ1dGVWYWx1ZSxcblxuXHQvLyBzaG91bGQgYmUgZGVmaW5lZCBpbiBzdWJjbGFzc1xuXHRhdHRyTmFtZTogdG9CZUltcGxlbWVudGVkLFxuXHRwYXJzZTogdG9CZUltcGxlbWVudGVkLFxuXHR2YWxpZGF0ZTogdG9CZUltcGxlbWVudGVkLFxufSk7XG5cblxuZnVuY3Rpb24gZ2V0QXR0cmlidXRlVmFsdWUoKSB7XG5cdHJldHVybiB0aGlzLmVsLmdldEF0dHJpYnV0ZSh0aGlzLm5hbWUpO1xufVxuXG5mdW5jdGlvbiBzZXRBdHRyaWJ1dGVWYWx1ZSh2YWx1ZSkge1xuXHR0aGlzLmVsLnNldEF0dHJpYnV0ZSh0aGlzLm5hbWUsIHZhbHVlKTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIG1pbG9NYWlsID0gcmVxdWlyZSgnLi9tYWlsJylcblx0LCBjb21wb25lbnRzUmVnaXN0cnkgPSByZXF1aXJlKCcuL2NvbXBvbmVudHMvY19yZWdpc3RyeScpXG5cdCwgQ29tcG9uZW50ID0gY29tcG9uZW50c1JlZ2lzdHJ5LmdldCgnQ29tcG9uZW50Jylcblx0LCBCaW5kQXR0cmlidXRlID0gcmVxdWlyZSgnLi9hdHRyaWJ1dGUvYV9iaW5kJylcblx0LCBCaW5kZXJFcnJvciA9IHJlcXVpcmUoJy4vdXRpbC9lcnJvcicpLkJpbmRlclxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi91dGlsL2NoZWNrJylcblx0LCBNYXRjaCA9ICBjaGVjay5NYXRjaDtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGJpbmRlcjtcblxuXG5mdW5jdGlvbiBiaW5kZXIoc2NvcGVFbCwgY2FsbGJhY2spIHtcblx0dmFyIHNjb3BlRWwgPSBzY29wZUVsIHx8IGRvY3VtZW50LmJvZHlcblx0XHQsIGNvbXBvbmVudHMgPSB7fTtcblxuXHQvLyBpdGVyYXRlIGNoaWxkcmVuIG9mIHNjb3BlRWxcblx0QXJyYXkucHJvdG90eXBlLmZvckVhY2guY2FsbChzY29wZUVsLmNoaWxkcmVuLCBiaW5kRWxlbWVudCk7XG5cblx0Y2FsbGJhY2soY29tcG9uZW50cyk7XG5cblxuXHRmdW5jdGlvbiBiaW5kRWxlbWVudChlbCl7XG5cdFx0dmFyIGF0dHIgPSBuZXcgQmluZEF0dHJpYnV0ZShlbCk7XG5cblx0XHR2YXIgYUNvbXBvbmVudCA9IGNyZWF0ZUNvbXBvbmVudChlbCwgYXR0cik7XG5cblx0XHQvLyBiaW5kIGlubmVyIGVsZW1lbnRzIHRvIGNvbXBvbmVudHNcblx0XHRpZiAoZWwuY2hpbGRyZW4gJiYgZWwuY2hpbGRyZW4ubGVuZ3RoKSB7XG5cdFx0XHR2YXIgaW5uZXJDb21wb25lbnRzID0gYmluZGVyKGVsKTtcblxuXHRcdFx0aWYgKE9iamVjdC5rZXlzKGlubmVyQ29tcG9uZW50cykubGVuZ3RoKSB7XG5cdFx0XHRcdC8vIGF0dGFjaCBpbm5lciBjb21wb25lbnRzIHRvIHRoZSBjdXJyZW50IG9uZSAoY3JlYXRlIGEgbmV3IHNjb3BlKSAuLi5cblx0XHRcdFx0aWYgKHR5cGVvZiBhQ29tcG9uZW50ICE9ICd1bmRlZmluZWQnICYmIGFDb21wb25lbnQuY29udGFpbmVyKVxuXHRcdFx0XHRcdGFDb21wb25lbnQuY29udGFpbmVyLmFkZChpbm5lckNvbXBvbmVudHMpO1xuXHRcdFx0XHRlbHNlIC8vIG9yIGtlZXAgdGhlbSBpbiB0aGUgY3VycmVudCBzY29wZVxuXHRcdFx0XHRcdF8uZWFjaEtleShpbm5lckNvbXBvbmVudHMsIHN0b3JlQ29tcG9uZW50KTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAoYUNvbXBvbmVudClcblx0XHRcdHN0b3JlQ29tcG9uZW50KGFDb21wb25lbnQsIGF0dHIuY29tcE5hbWUpO1xuXHR9XG5cblx0ZnVuY3Rpb24gY3JlYXRlQ29tcG9uZW50KGVsLCBhdHRyKSB7XG5cdFx0aWYgKGF0dHIubm9kZSkgeyAvLyBlbGVtZW50IHdpbGwgYmUgYm91bmQgdG8gYSBjb21wb25lbnRcblx0XHRcdGF0dHIucGFyc2UoKS52YWxpZGF0ZSgpO1xuXG5cdFx0XHQvLyBnZXQgY29tcG9uZW50IGNsYXNzIGZyb20gcmVnaXN0cnkgYW5kIHZhbGlkYXRlXG5cdFx0XHR2YXIgQ29tcG9uZW50Q2xhc3MgPSBjb21wb25lbnRzUmVnaXN0cnkuZ2V0KGF0dHIuY29tcENsYXNzKTtcblxuXHRcdFx0aWYgKCEgQ29tcG9uZW50Q2xhc3MpXG5cdFx0XHRcdHRocm93IG5ldyBCaW5kZXJFcnJvcignY2xhc3MgJyArIGF0dHIuY29tcENsYXNzICsgJyBpcyBub3QgcmVnaXN0ZXJlZCcpO1xuXG5cdFx0XHRjaGVjayhDb21wb25lbnRDbGFzcywgTWF0Y2guU3ViY2xhc3MoQ29tcG9uZW50LCB0cnVlKSk7XG5cdFxuXHRcdFx0Ly8gY3JlYXRlIG5ldyBjb21wb25lbnRcblx0XHRcdHZhciBhQ29tcG9uZW50ID0gbmV3IENvbXBvbmVudENsYXNzKHt9LCBlbCk7XG5cblx0XHRcdC8vIGFkZCBleHRyYSBmYWNldHNcblx0XHRcdHZhciBmYWNldHMgPSBhdHRyLmNvbXBGYWNldHM7XG5cdFx0XHRpZiAoZmFjZXRzKVxuXHRcdFx0XHRmYWNldHMuZm9yRWFjaChmdW5jdGlvbihmY3QpIHtcblx0XHRcdFx0XHRhQ29tcG9uZW50LmFkZEZhY2V0KGZjdCk7XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRyZXR1cm4gYUNvbXBvbmVudDtcblx0XHR9XG5cdH1cblxuXG5cdGZ1bmN0aW9uIHN0b3JlQ29tcG9uZW50KGFDb21wb25lbnQsIG5hbWUpIHtcblx0XHRpZiAoY29tcG9uZW50c1tuYW1lXSlcblx0XHRcdHRocm93IG5ldyBCaW5kZXJFcnJvcignZHVwbGljYXRlIGNvbXBvbmVudCBuYW1lOiAnICsgbmFtZSk7XG5cblx0XHRjb21wb25lbnRzW25hbWVdID0gYUNvbXBvbmVudDtcblx0fVxufVxuXG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBGYWNldGVkT2JqZWN0ID0gcmVxdWlyZSgnLi4vZmFjZXRzL2Zfb2JqZWN0Jylcblx0LCBmYWNldHNSZWdpc3RyeSA9IHJlcXVpcmUoJy4vY19mYWNldHMvY2ZfcmVnaXN0cnknKVxuXHQsIENvbXBvbmVudEZhY2V0ID0gcmVxdWlyZSgnLi9jX2ZhY2V0Jylcblx0LCBNZXNzZW5nZXIgPSByZXF1aXJlKCcuLi9tZXNzZW5nZXInKVxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vdXRpbC9jaGVjaycpXG5cdCwgTWF0Y2ggPSBjaGVjay5NYXRjaDtcblxudmFyIENvbXBvbmVudCA9IF8uY3JlYXRlU3ViY2xhc3MoRmFjZXRlZE9iamVjdCwgJ0NvbXBvbmVudCcsIHRydWUpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbXBvbmVudDtcblxuXG5Db21wb25lbnQuY3JlYXRlQ29tcG9uZW50Q2xhc3MgPSBmdW5jdGlvbihuYW1lLCBmYWNldHMpIHtcblx0dmFyIGZhY2V0c0NsYXNzZXMgPSB7fTtcblxuXHRmYWNldHMuZm9yRWFjaChmdW5jdGlvbihmY3QpIHtcblx0XHR2YXIgZmN0TmFtZSA9IF8uZmlyc3RMb3dlckNhc2UoZmN0KTtcblx0XHR2YXIgZmN0Q2xhc3NOYW1lID0gXy5maXJzdFVwcGVyQ2FzZShmY3QpO1xuXHRcdGZhY2V0c0NsYXNzZXNbZmN0TmFtZV0gPSBmYWNldHNSZWdpc3RyeS5nZXQoZmN0Q2xhc3NOYW1lKVxuXHR9KTtcblxuXHRyZXR1cm4gRmFjZXRlZE9iamVjdC5jcmVhdGVGYWNldGVkQ2xhc3MuY2FsbCh0aGlzLCBuYW1lLCBmYWNldHNDbGFzc2VzKTtcbn07XG5cbmRlbGV0ZSBDb21wb25lbnQuY3JlYXRlRmFjZXRlZENsYXNzO1xuXG5cbl8uZXh0ZW5kUHJvdG8oQ29tcG9uZW50LCB7XG5cdGluaXQ6IGluaXRDb21wb25lbnQsXG5cdGFkZEZhY2V0OiBhZGRGYWNldFxufSk7XG5cblxuZnVuY3Rpb24gaW5pdENvbXBvbmVudChmYWNldHNPcHRpb25zLCBlbGVtZW50KSB7XG5cdHRoaXMuZWwgPSBlbGVtZW50O1xuXG5cdHZhciBtZXNzZW5nZXIgPSBuZXcgTWVzc2VuZ2VyKHRoaXMsIE1lc3Nlbmdlci5kZWZhdWx0TWV0aG9kcywgdW5kZWZpbmVkIC8qIG5vIG1lc3NhZ2VTb3VyY2UgKi8pO1xuXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRoaXMsIHtcblx0XHRfbWVzc2VuZ2VyOiB7IHZhbHVlOiBtZXNzZW5nZXIgfSxcblx0fSk7XHRcbn1cblxuXG5mdW5jdGlvbiBhZGRGYWNldChmYWNldE5hbWVPckNsYXNzLCBmYWNldE9wdHMsIGZhY2V0TmFtZSkge1xuXHRjaGVjayhmYWNldE5hbWVPckNsYXNzLCBNYXRjaC5PbmVPZihTdHJpbmcsIE1hdGNoLlN1YmNsYXNzKENvbXBvbmVudEZhY2V0KSkpO1xuXHRjaGVjayhmYWNldE9wdHMsIE1hdGNoLk9wdGlvbmFsKE9iamVjdCkpO1xuXHRjaGVjayhmYWNldE5hbWUsIE1hdGNoLk9wdGlvbmFsKFN0cmluZykpO1xuXG5cdGlmICh0eXBlb2YgZmFjZXROYW1lT3JDbGFzcyA9PSAnc3RyaW5nJykge1xuXHRcdHZhciBmYWNldENsYXNzTmFtZSA9IF8uZmlyc3RVcHBlckNhc2UoZmFjZXROYW1lT3JDbGFzcyk7XG5cdFx0dmFyIEZhY2V0Q2xhc3MgPSBmYWNldHNSZWdpc3RyeS5nZXQoZmFjZXRDbGFzc05hbWUpO1xuXHR9IGVsc2UgXG5cdFx0RmFjZXRDbGFzcyA9IGZhY2V0TmFtZU9yQ2xhc3M7XG5cblx0ZmFjZXROYW1lID0gZmFjZXROYW1lIHx8IF8uZmlyc3RMb3dlckNhc2UoRmFjZXRDbGFzcy5uYW1lKTtcblxuXHRGYWNldGVkT2JqZWN0LnByb3RvdHlwZS5hZGRGYWNldC5jYWxsKHRoaXMsIEZhY2V0Q2xhc3MsIGZhY2V0T3B0cywgZmFjZXROYW1lKTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIEZhY2V0ID0gcmVxdWlyZSgnLi4vZmFjZXRzL2ZfY2xhc3MnKVxuXHQsIE1lc3NlbmdlciA9IHJlcXVpcmUoJy4uL21lc3NlbmdlcicpXG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpO1xuXG52YXIgQ29tcG9uZW50RmFjZXQgPSBfLmNyZWF0ZVN1YmNsYXNzKEZhY2V0LCAnQ29tcG9uZW50RmFjZXQnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb25lbnRGYWNldDtcblxuXG5fLmV4dGVuZFByb3RvKENvbXBvbmVudEZhY2V0LCB7XG5cdGluaXQ6IGluaXRDb21wb25lbnRGYWNldCxcbn0pO1xuXG5cbmZ1bmN0aW9uIGluaXRDb21wb25lbnRGYWNldCgpIHtcblx0Ly8gdmFyIG1lc3NlbmdlciA9IG5ldyBNZXNzZW5nZXIodGhpcywgTWVzc2VuZ2VyLmRlZmF1bHRNZXRob2RzLCB1bmRlZmluZWQgLyogbm8gbWVzc2FnZVNvdXJjZSAqLyk7XG5cblx0Ly8gT2JqZWN0LmRlZmluZVByb3BlcnRpZXModGhpcywge1xuXHQvLyBcdF9mYWNldE1lc3NlbmdlcjogeyB2YWx1ZTogbWVzc2VuZ2VyIH0sXG5cdC8vIH0pO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ29tcG9uZW50RmFjZXQgPSByZXF1aXJlKCcuLi9jX2ZhY2V0Jylcblx0LCBiaW5kZXIgPSByZXF1aXJlKCcuLi8uLi9iaW5kZXInKVxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKVxuXHQsIGZhY2V0c1JlZ2lzdHJ5ID0gcmVxdWlyZSgnLi9jZl9yZWdpc3RyeScpO1xuXG4vLyBjb250YWluZXIgZmFjZXRcbnZhciBDb250YWluZXIgPSBfLmNyZWF0ZVN1YmNsYXNzKENvbXBvbmVudEZhY2V0LCAnQ29udGFpbmVyJyk7XG5cbl8uZXh0ZW5kUHJvdG8oQ29udGFpbmVyLCB7XG5cdGluaXQ6IGluaXRDb250YWluZXIsXG5cdF9iaW5kOiBfYmluZENvbXBvbmVudHMsXG5cdGFkZDogYWRkQ2hpbGRDb21wb25lbnRzXG59KTtcblxuZmFjZXRzUmVnaXN0cnkuYWRkKENvbnRhaW5lcik7XG5cbm1vZHVsZS5leHBvcnRzID0gQ29udGFpbmVyO1xuXG5cbmZ1bmN0aW9uIGluaXRDb250YWluZXIoKSB7XG5cdENvbXBvbmVudEZhY2V0LnByb3RvdHlwZS5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cdHRoaXMuY2hpbGRyZW4gPSB7fTtcbn1cblxuXG5mdW5jdGlvbiBfYmluZENvbXBvbmVudHMoKSB7XG5cdC8vIFRPRE9cblx0Ly8gdGhpcyBmdW5jdGlvbiBzaG91bGQgcmUtYmluZCByYXRoZXIgdGhhbiBiaW5kIGFsbCBpbnRlcm5hbCBlbGVtZW50c1xuXHR0aGlzLmNoaWxkcmVuID0gYmluZGVyKHRoaXMub3duZXIuZWwpO1xufVxuXG5cbmZ1bmN0aW9uIGFkZENoaWxkQ29tcG9uZW50cyhjaGlsZENvbXBvbmVudHMpIHtcblx0Ly8gVE9ET1xuXHQvLyB0aGlzIGZ1bmN0aW9uIHNob3VsZCBpbnRlbGxpZ2VudGx5IHJlLWJpbmQgZXhpc3RpbmcgY29tcG9uZW50cyB0b1xuXHQvLyBuZXcgZWxlbWVudHMgKGlmIHRoZXkgY2hhbmdlZCkgYW5kIHJlLWJpbmQgcHJldmlvdXNseSBib3VuZCBldmVudHMgdG8gdGhlIHNhbWVcblx0Ly8gZXZlbnQgaGFuZGxlcnNcblx0Ly8gb3IgbWF5YmUgbm90LCBpZiB0aGlzIGZ1bmN0aW9uIGlzIG9ubHkgdXNlZCBieSBiaW5kZXIgdG8gYWRkIG5ldyBlbGVtZW50cy4uLlxuXHRfLmV4dGVuZCh0aGlzLmNoaWxkcmVuLCBjaGlsZENvbXBvbmVudHMpO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ29tcG9uZW50RmFjZXQgPSByZXF1aXJlKCcuLi9jX2ZhY2V0Jylcblx0LCBmYWNldHNSZWdpc3RyeSA9IHJlcXVpcmUoJy4vY2ZfcmVnaXN0cnknKVxuXG5cdCwgTWVzc2VuZ2VyID0gcmVxdWlyZSgnLi4vLi4vbWVzc2VuZ2VyJylcblx0LCBDb21wb25lbnREYXRhU291cmNlID0gcmVxdWlyZSgnLi4vY19tZXNzYWdlX3NvdXJjZXMvY29tcG9uZW50X2RhdGFfc291cmNlJylcblxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKTtcblxuXG4vLyBkYXRhIG1vZGVsIGNvbm5lY3Rpb24gZmFjZXRcbnZhciBEYXRhID0gXy5jcmVhdGVTdWJjbGFzcyhDb21wb25lbnRGYWNldCwgJ0RhdGEnKTtcblxuXy5leHRlbmRQcm90byhEYXRhLCB7XG5cdGluaXQ6IGluaXREYXRhRmFjZXQsXG5cblx0Ly8gX3JlYXR0YWNoOiBfcmVhdHRhY2hFdmVudHNPbkVsZW1lbnRDaGFuZ2Vcbn0pO1xuXG5mYWNldHNSZWdpc3RyeS5hZGQoRGF0YSk7XG5cbm1vZHVsZS5leHBvcnRzID0gRGF0YTtcblxuXG5mdW5jdGlvbiBpbml0RGF0YUZhY2V0KCkge1xuXHRDb21wb25lbnRGYWNldC5wcm90b3R5cGUuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG5cdHZhciBwcm94eUNvbXBEYXRhU291cmNlTWV0aG9kcyA9IHtcblx0XHR2YWx1ZTogJ3ZhbHVlJyxcblx0XHR0cmlnZ2VyOiAndHJpZ2dlcidcblx0fTtcblxuXHQvLyBpbnN0ZWFkIG9mIHRoaXMub3duZXIgc2hvdWxkIHBhc3MgbW9kZWw/IFdoZXJlIGl0IGlzIHNldD9cblx0dmFyIGNvbXBEYXRhU291cmNlID0gbmV3IENvbXBvbmVudERhdGFTb3VyY2UodGhpcywgcHJveHlDb21wRGF0YVNvdXJjZU1ldGhvZHMsIHRoaXMub3duZXIpO1xuXG5cdHZhciBwcm94eU1lc3Nlbmdlck1ldGhvZHMgPSB7XG5cdFx0b246ICdvbk1lc3NhZ2UnLFxuXHRcdG9mZjogJ29mZk1lc3NhZ2UnLFxuXHRcdG9uTWVzc2FnZXM6ICdvbk1lc3NhZ2VzJyxcblx0XHRvZmZNZXNzYWdlczogJ29mZk1lc3NhZ2VzJyxcblx0XHRnZXRTdWJzY3JpYmVyczogJ2dldFN1YnNjcmliZXJzJ1xuXHR9O1xuXG5cdHZhciBkYXRhTWVzc2VuZ2VyID0gbmV3IE1lc3Nlbmdlcih0aGlzLCBwcm94eU1lc3Nlbmdlck1ldGhvZHMsIGNvbXBEYXRhU291cmNlKTtcblxuXHRPYmplY3QuZGVmaW5lUHJvcGVydGllcyh0aGlzLCB7XG5cdFx0X2RhdGFNZXNzZW5nZXI6IHsgdmFsdWU6IGRhdGFNZXNzZW5nZXIgfSxcblx0XHRfY29tcERhdGFTb3VyY2U6IHsgdmFsdWU6IGNvbXBEYXRhU291cmNlIH1cblx0fSk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBDb21wb25lbnRGYWNldCA9IHJlcXVpcmUoJy4uL2NfZmFjZXQnKVxuXHQsIGZhY2V0c1JlZ2lzdHJ5ID0gcmVxdWlyZSgnLi9jZl9yZWdpc3RyeScpXG5cblx0LCBNZXNzZW5nZXIgPSByZXF1aXJlKCcuLi8uLi9tZXNzZW5nZXInKVxuXHQsIERPTUV2ZW50c1NvdXJjZSA9IHJlcXVpcmUoJy4uL2NfbWVzc2FnZV9zb3VyY2VzL2RvbV9ldmVudHNfc291cmNlJylcblxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKTtcblxuXG4vLyBldmVudHMgZmFjZXRcbnZhciBFdmVudHMgPSBfLmNyZWF0ZVN1YmNsYXNzKENvbXBvbmVudEZhY2V0LCAnRXZlbnRzJyk7XG5cbl8uZXh0ZW5kUHJvdG8oRXZlbnRzLCB7XG5cdGluaXQ6IGluaXRFdmVudHNGYWNldCxcblxuXHQvLyBfcmVhdHRhY2g6IF9yZWF0dGFjaEV2ZW50c09uRWxlbWVudENoYW5nZVxufSk7XG5cbmZhY2V0c1JlZ2lzdHJ5LmFkZChFdmVudHMpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50cztcblxuXG5mdW5jdGlvbiBpbml0RXZlbnRzRmFjZXQoKSB7XG5cdENvbXBvbmVudEZhY2V0LnByb3RvdHlwZS5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cblx0dmFyIGRvbUV2ZW50c1NvdXJjZSA9IG5ldyBET01FdmVudHNTb3VyY2UodGhpcywgeyB0cmlnZ2VyOiAndHJpZ2dlcicgfSwgdGhpcy5vd25lcik7XG5cblx0dmFyIHByb3h5TWVzc2VuZ2VyTWV0aG9kcyA9IHtcblx0XHRvbjogJ29uTWVzc2FnZScsXG5cdFx0b2ZmOiAnb2ZmTWVzc2FnZScsXG5cdFx0b25FdmVudHM6ICdvbk1lc3NhZ2VzJyxcblx0XHRvZmZFdmVudHM6ICdvZmZNZXNzYWdlcycsXG5cdFx0Z2V0TGlzdGVuZXJzOiAnZ2V0U3Vic2NyaWJlcnMnXG5cdH07XG5cblx0dmFyIG1lc3NlbmdlciA9IG5ldyBNZXNzZW5nZXIodGhpcywgcHJveHlNZXNzZW5nZXJNZXRob2RzLCBkb21FdmVudHNTb3VyY2UpO1xuXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRoaXMsIHtcblx0XHRfZXZlbnRzTWVzc2VuZ2VyOiB7IHZhbHVlOiBtZXNzZW5nZXIgfSxcblx0XHRfZG9tRXZlbnRzU291cmNlOiB7IHZhbHVlOiBkb21FdmVudHNTb3VyY2UgfVxuXHR9KTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIENsYXNzUmVnaXN0cnkgPSByZXF1aXJlKCcuLi8uLi9hYnN0cmFjdC9yZWdpc3RyeScpXG5cdCwgQ29tcG9uZW50RmFjZXQgPSByZXF1aXJlKCcuLi9jX2ZhY2V0Jyk7XG5cbnZhciBmYWNldHNSZWdpc3RyeSA9IG5ldyBDbGFzc1JlZ2lzdHJ5KENvbXBvbmVudEZhY2V0KTtcblxuZmFjZXRzUmVnaXN0cnkuYWRkKENvbXBvbmVudEZhY2V0KTtcblxubW9kdWxlLmV4cG9ydHMgPSBmYWNldHNSZWdpc3RyeTtcblxuLy8gVE9ETyAtIHJlZmFjdG9yIGNvbXBvbmVudHMgcmVnaXN0cnkgdGVzdCBpbnRvIGEgZnVuY3Rpb25cbi8vIHRoYXQgdGVzdHMgYSByZWdpc3RyeSB3aXRoIGEgZ2l2ZW4gZm91bmRhdGlvbiBjbGFzc1xuLy8gTWFrZSB0ZXN0IGZvciB0aGlzIHJlZ2lzdHJ5IGJhc2VkIG9uIHRoaXMgZnVuY3Rpb24iLCIndXNlIHN0cmljdCc7XG5cbnZhciBET01FdmVudHNTb3VyY2UgPSByZXF1aXJlKCcuL2RvbV9ldmVudHNfc291cmNlJylcblx0LCBDb21wb25lbnQgPSByZXF1aXJlKCcuLi9jX2NsYXNzJylcblx0LCBDb21wb25lbnREYXRhU291cmNlRXJyb3IgPSByZXF1aXJlKCcuLi8uLi91dGlsL2Vycm9yJykuQ29tcG9uZW50RGF0YVNvdXJjZVxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vLi4vdXRpbC9jaGVjaycpXG5cdCwgTWF0Y2ggPSBjaGVjay5NYXRjaDtcblxuXG4vLyBjbGFzcyB0byBoYW5kbGUgc3Vic2NyaWJ0aW9ucyB0byBjaGFuZ2VzIGluIERPTSBmb3IgVUkgKG1heWJlIGFsc28gY29udGVudCBlZGl0YWJsZSkgZWxlbWVudHNcbnZhciBDb21wb25lbnREYXRhU291cmNlID0gXy5jcmVhdGVTdWJjbGFzcyhET01FdmVudHNTb3VyY2UsICdDb21wb25lbnREYXRhU291cmNlJywgdHJ1ZSk7XG5cblxuXy5leHRlbmRQcm90byhDb21wb25lbnREYXRhU291cmNlLCB7XG5cdC8vIGltcGxlbWVudGluZyBNZXNzYWdlU291cmNlIGludGVyZmFjZVxuXHRpbml0OiBpbml0Q29tcG9uZW50RGF0YVNvdXJjZSxcblx0dHJhbnNsYXRlVG9Tb3VyY2VNZXNzYWdlOiB0cmFuc2xhdGVUb0RvbUV2ZW50LFxuIFx0YWRkU291cmNlTGlzdGVuZXI6IGFkZERvbUV2ZW50TGlzdGVuZXIsXG4gXHRyZW1vdmVTb3VyY2VMaXN0ZW5lcjogcmVtb3ZlRG9tRXZlbnRMaXN0ZW5lcixcbiBcdGZpbHRlclNvdXJjZU1lc3NhZ2U6IGZpbHRlckRhdGFNZXNzYWdlLFxuXG4gXHQvLyBjbGFzcyBzcGVjaWZpYyBtZXRob2RzXG4gXHQvLyBkb206IGltcGxlbWVudGVkIGluIERPTUV2ZW50c1NvdXJjZVxuIFx0dmFsdWU6IGdldERvbUVsZW1lbnREYXRhVmFsdWUsXG4gXHRoYW5kbGVFdmVudDogaGFuZGxlRXZlbnQsICAvLyBldmVudCBkaXNwYXRjaGVyIC0gYXMgZGVmaW5lZCBieSBFdmVudCBET00gQVBJXG4gXHR0cmlnZ2VyOiB0cmlnZ2VyRGF0YU1lc3NhZ2UgLy8gcmVkZWZpbmVzIG1ldGhvZCBvZiBzdXBlcmNsYXNzIERPTUV2ZW50c1NvdXJjZVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ29tcG9uZW50RGF0YVNvdXJjZTtcblxuXG5mdW5jdGlvbiBpbml0Q29tcG9uZW50RGF0YVNvdXJjZSgpIHtcblx0RE9NRXZlbnRzU291cmNlLnByb3RvdHlwZS5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cblx0dGhpcy52YWx1ZSgpOyAvLyBzdG9yZXMgY3VycmVudCBjb21wb25lbnQgZGF0YSB2YWx1ZSBpbiB0aGlzLl92YWx1ZVxufVxuXG5cbi8vIFRPRE86IHNob3VsZCByZXR1cm4gdmFsdWUgZGVwZW5kZW50IG9uIGVsZW1lbnQgdGFnXG5mdW5jdGlvbiBnZXREb21FbGVtZW50RGF0YVZhbHVlKCkgeyAvLyB2YWx1ZSBtZXRob2Rcblx0dmFyIG5ld1ZhbHVlID0gdGhpcy5jb21wb25lbnQuZWwudmFsdWU7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdfdmFsdWUnLCB7XG5cdFx0Y29uZmlndXJhYmxlOiB0cnVlLFxuXHRcdHZhbHVlOiBuZXdWYWx1ZVxuXHR9KTtcblxuXHRyZXR1cm4gbmV3VmFsdWU7XG59XG5cblxuLy8gVE9ETzogdGhpcyBmdW5jdGlvbiBzaG91bGQgcmV0dXJuIHJlbGV2YW50IERPTSBldmVudCBkZXBlbmRlbnQgb24gZWxlbWVudCB0YWdcbi8vIENhbiBhbHNvIGltcGxlbWVudCBiZWZvcmVkYXRhY2hhbmdlZCBldmVudCB0byBhbGxvdyBwcmV2ZW50aW5nIHRoZSBjaGFuZ2VcbmZ1bmN0aW9uIHRyYW5zbGF0ZVRvRG9tRXZlbnQobWVzc2FnZSkge1xuXHRpZiAobWVzc2FnZSA9PSAnZGF0YWNoYW5nZWQnKVxuXHRcdHJldHVybiAnaW5wdXQnO1xuXHRlbHNlXG5cdFx0dGhyb3cgbmV3IENvbXBvbmVudERhdGFTb3VyY2VFcnJvcigndW5rbm93biBjb21wb25lbnQgZGF0YSBldmVudCcpO1xufVxuXG5cbmZ1bmN0aW9uIGFkZERvbUV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlKSB7XG5cdHRoaXMuZG9tKCkuYWRkRXZlbnRMaXN0ZW5lcihldmVudFR5cGUsIHRoaXMsIGZhbHNlKTsgLy8gbm8gY2FwdHVyaW5nXG59XG5cblxuZnVuY3Rpb24gcmVtb3ZlRG9tRXZlbnRMaXN0ZW5lcihldmVudFR5cGUpIHtcblx0dGhpcy5kb20oKS5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50VHlwZSwgdGhpcywgZmFsc2UpOyAvLyBubyBjYXB0dXJpbmdcbn1cblxuXG5mdW5jdGlvbiBmaWx0ZXJEYXRhTWVzc2FnZShldmVudFR5cGUsIG1lc3NhZ2UsIGRhdGEpIHtcblx0cmV0dXJuIGRhdGEubmV3VmFsdWUgIT0gZGF0YS5vbGRWYWx1ZTtcbn07XG5cblxuIC8vIGV2ZW50IGRpc3BhdGNoZXIgLSBhcyBkZWZpbmVkIGJ5IEV2ZW50IERPTSBBUElcbmZ1bmN0aW9uIGhhbmRsZUV2ZW50KGV2ZW50KSB7XG5cdHZhciBvbGRWYWx1ZSA9IHRoaXMuX3ZhbHVlO1xuXG5cdHRoaXMuZGlzcGF0Y2hNZXNzYWdlKGV2ZW50LnR5cGUsIHtcblx0XHRvbGRWYWx1ZTogb2xkVmFsdWUsXG5cdFx0bmV3VmFsdWU6IHRoaXMudmFsdWUoKVxuXHR9KTtcbn1cblxuXG5mdW5jdGlvbiB0cmlnZ2VyRGF0YU1lc3NhZ2UobWVzc2FnZSwgZGF0YSkge1xuXHQvLyBUT0RPIC0gb3Bwb3NpdGUgdHJhbnNsYXRpb24gKyBldmVudCB0cmlnZ2VyIFxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpO1xuXG5cbi8vIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL1JlZmVyZW5jZS9FdmVudHNcblxudmFyIGV2ZW50VHlwZXMgPSB7XG5cdENsaXBib2FyZEV2ZW50OiBbJ2NvcHknLCAnY3V0JywgJ3Bhc3RlJywgJ2JlZm9yZWNvcHknLCAnYmVmb3JlY3V0JywgJ2JlZm9yZXBhc3RlJ10sXG5cdEV2ZW50OiBbJ2lucHV0JywgJ3JlYWR5c3RhdGVjaGFuZ2UnXSxcblx0Rm9jdXNFdmVudDogWydmb2N1cycsICdibHVyJywgJ2ZvY3VzaW4nLCAnZm9jdXNvdXQnXSxcblx0S2V5Ym9hcmRFdmVudDogWydrZXlkb3duJywgJ2tleXByZXNzJywgICdrZXl1cCddLFxuXHRNb3VzZUV2ZW50OiBbJ2NsaWNrJywgJ2NvbnRleHRtZW51JywgJ2RibGNsaWNrJywgJ21vdXNlZG93bicsICdtb3VzZXVwJyxcblx0XHRcdFx0ICdtb3VzZWVudGVyJywgJ21vdXNlbGVhdmUnLCAnbW91c2Vtb3ZlJywgJ21vdXNlb3V0JywgJ21vdXNlb3ZlcicsXG5cdFx0XHRcdCAnc2hvdycgLyogY29udGV4dCBtZW51ICovXSxcblx0VG91Y2hFdmVudDogWyd0b3VjaHN0YXJ0JywgJ3RvdWNoZW5kJywgJ3RvdWNobW92ZScsICd0b3VjaGVudGVyJywgJ3RvdWNobGVhdmUnLCAndG91Y2hjYW5jZWwnXSxcbn07XG5cblxuLy8gbW9jayB3aW5kb3cgYW5kIGV2ZW50IGNvbnN0cnVjdG9ycyBmb3IgdGVzdGluZ1xuaWYgKHR5cGVvZiB3aW5kb3cgIT0gJ3VuZGVmaW5lZCcpXG5cdHZhciBnbG9iYWwgPSB3aW5kb3c7XG5lbHNlIHtcblx0Z2xvYmFsID0ge307XG5cdF8uZWFjaEtleShldmVudFR5cGVzLCBmdW5jdGlvbihlVHlwZXMsIGV2ZW50Q29uc3RydWN0b3JOYW1lKSB7XG5cdFx0dmFyIGV2ZW50c0NvbnN0cnVjdG9yO1xuXHRcdGV2YWwoXG5cdFx0XHQnZXZlbnRzQ29uc3RydWN0b3IgPSBmdW5jdGlvbiAnICsgZXZlbnRDb25zdHJ1Y3Rvck5hbWUgKyAnKHR5cGUsIHByb3BlcnRpZXMpIHsgXFxcblx0XHRcdFx0dGhpcy50eXBlID0gdHlwZTsgXFxcblx0XHRcdFx0Xy5leHRlbmQodGhpcywgcHJvcGVydGllcyk7IFxcXG5cdFx0XHR9Oydcblx0XHQpO1xuXHRcdGdsb2JhbFtldmVudENvbnN0cnVjdG9yTmFtZV0gPSBldmVudHNDb25zdHJ1Y3Rvcjtcblx0fSk7XG59XG5cblxudmFyIGRvbUV2ZW50c0NvbnN0cnVjdG9ycyA9IHt9O1xuXG5fLmVhY2hLZXkoZXZlbnRUeXBlcywgZnVuY3Rpb24oZVR5cGVzLCBldmVudENvbnN0cnVjdG9yTmFtZSkge1xuXHRlVHlwZXMuZm9yRWFjaChmdW5jdGlvbih0eXBlKSB7XG5cdFx0aWYgKE9iamVjdC5oYXNPd25Qcm9wZXJ0eShkb21FdmVudHNDb25zdHJ1Y3RvcnMsIHR5cGUpKVxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdkdXBsaWNhdGUgZXZlbnQgdHlwZSAnICsgdHlwZSk7XG5cblx0XHRkb21FdmVudHNDb25zdHJ1Y3RvcnNbdHlwZV0gPSBnbG9iYWxbZXZlbnRDb25zdHJ1Y3Rvck5hbWVdO1xuXHR9KTtcbn0pO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gZG9tRXZlbnRzQ29uc3RydWN0b3JzO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgTWVzc2FnZVNvdXJjZSA9IHJlcXVpcmUoJy4uLy4uL21lc3Nlbmdlci9tZXNzYWdlX3NvdXJjZScpXG5cdCwgQ29tcG9uZW50ID0gcmVxdWlyZSgnLi4vY19jbGFzcycpXG5cdCwgZG9tRXZlbnRzQ29uc3RydWN0b3JzID0gcmVxdWlyZSgnLi9kb21fZXZlbnRzX2NvbnN0cnVjdG9ycycpIC8vIFRPRE8gbWVyZ2Ugd2l0aCBET01FdmVudFNvdXJjZSA/P1xuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vLi4vdXRpbC9jaGVjaycpXG5cdCwgTWF0Y2ggPSBjaGVjay5NYXRjaDtcblxudmFyIERPTUV2ZW50c1NvdXJjZSA9IF8uY3JlYXRlU3ViY2xhc3MoTWVzc2FnZVNvdXJjZSwgJ0RPTU1lc3NhZ2VTb3VyY2UnLCB0cnVlKTtcblxuXG5fLmV4dGVuZFByb3RvKERPTUV2ZW50c1NvdXJjZSwge1xuXHQvLyBpbXBsZW1lbnRpbmcgTWVzc2FnZVNvdXJjZSBpbnRlcmZhY2Vcblx0aW5pdDogaW5pdERvbUV2ZW50c1NvdXJjZSxcblx0dHJhbnNsYXRlVG9Tb3VyY2VNZXNzYWdlOiB0cmFuc2xhdGVUb0RvbUV2ZW50LFxuIFx0YWRkU291cmNlTGlzdGVuZXI6IGFkZERvbUV2ZW50TGlzdGVuZXIsXG4gXHRyZW1vdmVTb3VyY2VMaXN0ZW5lcjogcmVtb3ZlRG9tRXZlbnRMaXN0ZW5lcixcbiBcdGZpbHRlclNvdXJjZU1lc3NhZ2U6IGZpbHRlckNhcHR1cmVkRG9tRXZlbnQsXG5cbiBcdC8vIGNsYXNzIHNwZWNpZmljIG1ldGhvZHNcbiBcdGRvbTogZ2V0RG9tRWxlbWVudCxcbiBcdGhhbmRsZUV2ZW50OiBoYW5kbGVFdmVudCwgIC8vIGV2ZW50IGRpc3BhdGNoZXIgLSBhcyBkZWZpbmVkIGJ5IEV2ZW50IERPTSBBUElcbiBcdHRyaWdnZXI6IHRyaWdnZXJEb21FdmVudFxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gRE9NRXZlbnRzU291cmNlO1xuXG5cbnZhciB1c2VDYXB0dXJlUGF0dGVybiA9IC9fX2NhcHR1cmUkLztcblxuXG5mdW5jdGlvbiBpbml0RG9tRXZlbnRzU291cmNlKGhvc3RPYmplY3QsIHByb3h5TWV0aG9kcywgY29tcG9uZW50KSB7XG5cdGNoZWNrKGNvbXBvbmVudCwgQ29tcG9uZW50KTtcblx0TWVzc2FnZVNvdXJjZS5wcm90b3R5cGUuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG5cdHRoaXMuY29tcG9uZW50ID0gY29tcG9uZW50O1xuXG5cdC8vIHRoaXMubWVzc2VuZ2VyIGlzIHNldCBieSBNZXNzZW5nZXIgY2xhc3Ncbn1cblxuXG5mdW5jdGlvbiBnZXREb21FbGVtZW50KCkge1xuXHRyZXR1cm4gdGhpcy5jb21wb25lbnQuZWw7XG59XG5cblxuZnVuY3Rpb24gdHJhbnNsYXRlVG9Eb21FdmVudChtZXNzYWdlKSB7XG5cdGlmICh1c2VDYXB0dXJlUGF0dGVybi50ZXN0KG1lc3NhZ2UpKVxuXHRcdG1lc3NhZ2UgPSBtZXNzYWdlLnJlcGxhY2UodXNlQ2FwdHVyZVBhdHRlcm4sICcnKTtcblx0cmV0dXJuIG1lc3NhZ2U7XG59XG5cblxuZnVuY3Rpb24gYWRkRG9tRXZlbnRMaXN0ZW5lcihldmVudFR5cGUpIHtcblx0dGhpcy5kb20oKS5hZGRFdmVudExpc3RlbmVyKGV2ZW50VHlwZSwgdGhpcywgdHJ1ZSk7XG59XG5cblxuZnVuY3Rpb24gcmVtb3ZlRG9tRXZlbnRMaXN0ZW5lcihldmVudFR5cGUpIHtcblx0dGhpcy5kb20oKS5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50VHlwZSwgdGhpcywgdHJ1ZSk7XG59XG5cblxuZnVuY3Rpb24gZmlsdGVyQ2FwdHVyZWREb21FdmVudChldmVudFR5cGUsIG1lc3NhZ2UsIGV2ZW50KSB7XG5cdHZhciBpc0NhcHR1cmVQaGFzZTtcblx0aWYgKHR5cGVvZiB3aW5kb3cgIT0gJ3VuZGVmaW5lZCcpXG5cdFx0aXNDYXB0dXJlUGhhc2UgPSBldmVudC5ldmVudFBoYXNlID09IHdpbmRvdy5FdmVudC5DQVBUVVJJTkdfUEhBU0U7XG5cblx0cmV0dXJuICghIGlzQ2FwdHVyZVBoYXNlIHx8IChpc0NhcHR1cmVQaGFzZSAmJiB1c2VDYXB0dXJlUGF0dGVybi50ZXN0KG1lc3NhZ2UpKSk7XG59XG5cblxuLy8gZXZlbnQgZGlzcGF0Y2hlciAtIGFzIGRlZmluZWQgYnkgRXZlbnQgRE9NIEFQSVxuZnVuY3Rpb24gaGFuZGxlRXZlbnQoZXZlbnQpIHtcblx0dGhpcy5kaXNwYXRjaE1lc3NhZ2UoZXZlbnQudHlwZSwgZXZlbnQpO1xufVxuXG5cbi8vIFRPRE8gbWFrZSB3b3JrIHdpdGggbWVzc2FnZXMgKHdpdGggX2NhcHR1cmUpXG5mdW5jdGlvbiB0cmlnZ2VyRG9tRXZlbnQoZXZlbnRUeXBlLCBwcm9wZXJ0aWVzKSB7XG5cdGNoZWNrKGV2ZW50VHlwZSwgU3RyaW5nKTtcblx0Y2hlY2socHJvcGVydGllcywgTWF0Y2guT3B0aW9uYWwoT2JqZWN0KSk7XG5cblx0dmFyIEV2ZW50Q29uc3RydWN0b3IgPSBkb21FdmVudHNDb25zdHJ1Y3RvcnNbZXZlbnRUeXBlXTtcblxuXHRpZiAodHlwZW9mIGV2ZW50Q29uc3RydWN0b3IgIT0gJ2Z1bmN0aW9uJylcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ3Vuc3VwcG9ydGVkIGV2ZW50IHR5cGUnKTtcblxuXHQvLyBjaGVjayBpZiBpdCBpcyBjb3JyZWN0XG5cdGlmICh0eXBlb2YgcHJvcGVydGllcyAhPSAndW5kZWZpbmVkJylcblx0XHRwcm9wZXJ0aWVzLnR5cGUgPSBldmVudFR5cGU7XG5cblx0dmFyIGRvbUV2ZW50ID0gRXZlbnRDb25zdHJ1Y3RvcihldmVudFR5cGUsIHByb3BlcnRpZXMpO1xuXG5cdHZhciBub3RDYW5jZWxsZWQgPSB0aGlzLmRvbSgpLmRpc3BhdGNoRXZlbnQoZG9tRXZlbnQpO1xuXG5cdHJldHVybiBub3RDYW5jZWxsZWQ7XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ2xhc3NSZWdpc3RyeSA9IHJlcXVpcmUoJy4uL2Fic3RyYWN0L3JlZ2lzdHJ5Jylcblx0LCBDb21wb25lbnQgPSByZXF1aXJlKCcuL2NfY2xhc3MnKTtcblxudmFyIGNvbXBvbmVudHNSZWdpc3RyeSA9IG5ldyBDbGFzc1JlZ2lzdHJ5KENvbXBvbmVudCk7XG5cbmNvbXBvbmVudHNSZWdpc3RyeS5hZGQoQ29tcG9uZW50KTtcblxubW9kdWxlLmV4cG9ydHMgPSBjb21wb25lbnRzUmVnaXN0cnk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBDb21wb25lbnQgPSByZXF1aXJlKCcuLi9jX2NsYXNzJylcblx0LCBjb21wb25lbnRzUmVnaXN0cnkgPSByZXF1aXJlKCcuLi9jX3JlZ2lzdHJ5Jyk7XG5cblxudmFyIFZpZXcgPSBDb21wb25lbnQuY3JlYXRlQ29tcG9uZW50Q2xhc3MoJ1ZpZXcnLCBbJ2NvbnRhaW5lciddKTtcblxuY29tcG9uZW50c1JlZ2lzdHJ5LmFkZChWaWV3KTtcblxubW9kdWxlLmV4cG9ydHMgPSBWaWV3O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gY29uZmlnO1xuXG5mdW5jdGlvbiBjb25maWcob3B0aW9ucykge1xuXHRfLmRlZXBFeHRlbmQoY29uZmlnLCBvcHRpb25zKTtcbn1cblxuY29uZmlnKHtcblx0YXR0cnM6IHtcblx0XHRiaW5kOiAnbWwtYmluZCcsXG5cdFx0bG9hZDogJ21sLWxvYWQnXG5cdH1cbn0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEZhY2V0O1xuXG5mdW5jdGlvbiBGYWNldChvd25lciwgb3B0aW9ucykge1xuXHR0aGlzLm93bmVyID0gb3duZXI7XG5cdHRoaXMub3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cdHRoaXMuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufVxuXG5fLmV4dGVuZFByb3RvKEZhY2V0LCB7XG5cdGluaXQ6IGZ1bmN0aW9uKCkge31cbn0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgRmFjZXQgPSByZXF1aXJlKCcuL2ZfY2xhc3MnKVxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vdXRpbC9jaGVjaycpXG5cdCwgTWF0Y2ggPSBjaGVjay5NYXRjaDtcblxubW9kdWxlLmV4cG9ydHMgPSBGYWNldGVkT2JqZWN0O1xuXG4vLyBhYnN0cmFjdCBjbGFzcyBmb3IgZmFjZXRlZCBvYmplY3RcbmZ1bmN0aW9uIEZhY2V0ZWRPYmplY3QoZmFjZXRzT3B0aW9ucyAvKiwgb3RoZXIgYXJncyAtIHBhc3NlZCB0byBpbml0IG1ldGhvZCAqLykge1xuXHQvLyBUT0RPIGluc3RhbnRpYXRlIGZhY2V0cyBpZiBjb25maWd1cmF0aW9uIGlzbid0IHBhc3NlZFxuXHQvLyB3cml0ZSBhIHRlc3QgdG8gY2hlY2sgaXRcblx0ZmFjZXRzT3B0aW9ucyA9IGZhY2V0c09wdGlvbnMgPyBfLmNsb25lKGZhY2V0c09wdGlvbnMpIDoge307XG5cblx0dmFyIHRoaXNDbGFzcyA9IHRoaXMuY29uc3RydWN0b3Jcblx0XHQsIGZhY2V0cyA9IHt9O1xuXG5cdGlmICh0aGlzLmNvbnN0cnVjdG9yID09IEZhY2V0ZWRPYmplY3QpXHRcdFxuXHRcdHRocm93IG5ldyBFcnJvcignRmFjZXRlZE9iamVjdCBpcyBhbiBhYnN0cmFjdCBjbGFzcywgY2FuXFwndCBiZSBpbnN0YW50aWF0ZWQnKTtcblx0Ly9pZiAoISB0aGlzQ2xhc3MucHJvdG90eXBlLmZhY2V0cylcblx0Ly9cdHRocm93IG5ldyBFcnJvcignTm8gZmFjZXRzIGRlZmluZWQgaW4gY2xhc3MgJyArIHRoaXMuY29uc3RydWN0b3IubmFtZSk7XG5cdFxuXHQvLyBfLmVhY2hLZXkoZmFjZXRzT3B0aW9ucywgaW5zdGFudGlhdGVGYWNldCwgdGhpcywgdHJ1ZSk7XG5cblx0aWYgKHRoaXMuZmFjZXRzKVxuXHRcdF8uZWFjaEtleSh0aGlzLmZhY2V0cywgaW5zdGFudGlhdGVGYWNldCwgdGhpcywgdHJ1ZSk7XG5cblx0dmFyIHVudXNlZEZhY2V0c05hbWVzID0gT2JqZWN0LmtleXMoZmFjZXRzT3B0aW9ucyk7XG5cdGlmICh1bnVzZWRGYWNldHNOYW1lcy5sZW5ndGgpXG5cdFx0dGhyb3cgbmV3IEVycm9yKCdDb25maWd1cmF0aW9uIGZvciB1bmtub3duIGZhY2V0KHMpIHBhc3NlZDogJyArIHVudXNlZEZhY2V0c05hbWVzLmpvaW4oJywgJykpO1xuXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRoaXMsIGZhY2V0cyk7XG5cblx0Ly8gY2FsbGluZyBpbml0IGlmIGl0IGlzIGRlZmluZWQgaW4gdGhlIGNsYXNzXG5cdGlmICh0aGlzLmluaXQpXG5cdFx0dGhpcy5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cblx0ZnVuY3Rpb24gaW5zdGFudGlhdGVGYWNldCgvKiBmYWNldE9wdHMgKi8gRmFjZXRDbGFzcywgZmN0KSB7XG5cdFx0Ly8gdmFyIEZhY2V0Q2xhc3MgPSB0aGlzLmZhY2V0c1tmY3RdO1xuXHRcdHZhciBmYWNldE9wdHMgPSBmYWNldHNPcHRpb25zW2ZjdF07XG5cdFx0ZGVsZXRlIGZhY2V0c09wdGlvbnNbZmN0XTtcblxuXHRcdGZhY2V0c1tmY3RdID0ge1xuXHRcdFx0ZW51bWVyYWJsZTogZmFsc2UsXG5cdFx0XHR2YWx1ZTogbmV3IEZhY2V0Q2xhc3ModGhpcywgZmFjZXRPcHRzKVxuXHRcdH07XG5cdH1cbn1cblxuXG5fLmV4dGVuZFByb3RvKEZhY2V0ZWRPYmplY3QsIHtcblx0YWRkRmFjZXQ6IGFkZEZhY2V0XG59KTtcblxuXG5mdW5jdGlvbiBhZGRGYWNldChGYWNldENsYXNzLCBmYWNldE9wdHMsIGZhY2V0TmFtZSkge1xuXHRjaGVjayhGYWNldENsYXNzLCBGdW5jdGlvbik7XG5cdGNoZWNrKGZhY2V0TmFtZSwgTWF0Y2guT3B0aW9uYWwoU3RyaW5nKSk7XG5cblx0ZmFjZXROYW1lID0gXy5maXJzdExvd2VyQ2FzZShmYWNldE5hbWUgfHwgRmFjZXRDbGFzcy5uYW1lKTtcblxuXHR2YXIgcHJvdG9GYWNldHMgPSB0aGlzLmNvbnN0cnVjdG9yLnByb3RvdHlwZS5mYWNldHM7XG5cblx0aWYgKHByb3RvRmFjZXRzICYmIHByb3RvRmFjZXRzW2ZhY2V0TmFtZV0pXG5cdFx0dGhyb3cgbmV3IEVycm9yKCdmYWNldCAnICsgZmFjZXROYW1lICsgJyBpcyBhbHJlYWR5IHBhcnQgb2YgdGhlIGNsYXNzICcgKyB0aGlzLmNvbnN0cnVjdG9yLm5hbWUpO1xuXG5cdGlmICh0aGlzW2ZhY2V0TmFtZV0pXG5cdFx0dGhyb3cgbmV3IEVycm9yKCdmYWNldCAnICsgZmFjZXROYW1lICsgJyBpcyBhbHJlYWR5IHByZXNlbnQgaW4gb2JqZWN0Jyk7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIGZhY2V0TmFtZSwge1xuXHRcdGVudW1lcmFibGU6IGZhbHNlLFxuXHRcdHZhbHVlOiBuZXcgRmFjZXRDbGFzcyh0aGlzLCBmYWNldE9wdHMpXG5cdH0pO1xufVxuXG5cbi8vIGZhY3RvcnkgdGhhdCBjcmVhdGVzIGNsYXNzZXMgKGNvbnN0cnVjdG9ycykgZnJvbSB0aGUgbWFwIG9mIGZhY2V0c1xuLy8gdGhlc2UgY2xhc3NlcyBpbmhlcml0IGZyb20gRmFjZXRlZE9iamVjdFxuRmFjZXRlZE9iamVjdC5jcmVhdGVGYWNldGVkQ2xhc3MgPSBmdW5jdGlvbiAobmFtZSwgZmFjZXRzQ2xhc3Nlcykge1xuXHRjaGVjayhuYW1lLCBTdHJpbmcpO1xuXHRjaGVjayhmYWNldHNDbGFzc2VzLCBNYXRjaC5PYmplY3RIYXNoKEZ1bmN0aW9uIC8qIE1hdGNoLlN1YmNsYXNzKEZhY2V0LCB0cnVlKSBUT0RPIC0gZml4ICovKSk7XG5cblx0dmFyIEZhY2V0ZWRDbGFzcyA9IF8uY3JlYXRlU3ViY2xhc3ModGhpcywgbmFtZSwgdHJ1ZSk7XG5cblx0Xy5leHRlbmRQcm90byhGYWNldGVkQ2xhc3MsIHtcblx0XHRmYWNldHM6IGZhY2V0c0NsYXNzZXNcblx0fSk7XG5cdHJldHVybiBGYWNldGVkQ2xhc3M7XG59O1xuXG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBtaWxvTWFpbCA9IHJlcXVpcmUoJy4vbWFpbCcpXG5cdCwgcmVxdWVzdCA9IHJlcXVpcmUoJy4vdXRpbC9yZXF1ZXN0Jylcblx0LCBsb2dnZXIgPSByZXF1aXJlKCcuL3V0aWwvbG9nZ2VyJylcblx0LCBjb25maWcgPSByZXF1aXJlKCcuL2NvbmZpZycpXG5cdCwgTG9hZEF0dHJpYnV0ZSA9IHJlcXVpcmUoJy4vYXR0cmlidXRlL2FfbG9hZCcpXG5cdCwgTG9hZGVyRXJyb3IgPSByZXF1aXJlKCcuL3V0aWwvZXJyb3InKS5Mb2FkZXI7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBsb2FkZXI7XG5cblxuZnVuY3Rpb24gbG9hZGVyKHJvb3RFbCwgY2FsbGJhY2spIHtcdFxuXHRtaWxvTWFpbC5vbk1lc3NhZ2UoJ2RvbXJlYWR5JywgZnVuY3Rpb24oKSB7XG5cdFx0aWYgKHR5cGVvZiByb290RWwgPT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0Y2FsbGJhY2sgPSByb290RWw7XG5cdFx0XHRyb290RWwgPSB1bmRlZmluZWQ7XG5cdFx0fVxuXG5cdFx0cm9vdEVsID0gcm9vdEVsIHx8IGRvY3VtZW50LmJvZHk7XG5cblx0XHRtaWxvTWFpbC5wb3N0TWVzc2FnZSgnbG9hZGVyJywgeyBzdGF0ZTogJ3N0YXJ0ZWQnIH0pO1xuXHRcdF9sb2FkZXIocm9vdEVsLCBmdW5jdGlvbih2aWV3cykge1xuXHRcdFx0bWlsb01haWwucG9zdE1lc3NhZ2UoJ2xvYWRlcicsIHsgXG5cdFx0XHRcdHN0YXRlOiAnZmluaXNoZWQnLFxuXHRcdFx0XHR2aWV3czogdmlld3Ncblx0XHRcdH0pO1xuXHRcdFx0Y2FsbGJhY2sodmlld3MpO1xuXHRcdH0pO1xuXHR9KTtcblxuXHQvLyBpZiAoZG9jdW1lbnQucmVhZHlTdGF0ZSA9PSAnbG9hZGluZycpXG5cdC8vIFx0ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigncmVhZHlzdGF0ZWNoYW5nZScsIGxvYWRXaGVuUmVhZHkpO1xuXHQvLyBlbHNlXG5cdC8vIFx0bG9hZFdoZW5SZWFkeSgpO1xuXG5cdC8vIGZ1bmN0aW9uIGxvYWRXaGVuUmVhZHkoKSB7XG5cdC8vIFx0ZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcigncmVhZHlzdGF0ZWNoYW5nZScsIGxvYWRXaGVuUmVhZHkpO1xuXHQvLyBcdF9sb2FkZXIuY2FsbChudWxsLCByb290RWwsIGNhbGxiYWNrKTtcblx0Ly8gfVxufVxuXG5cbmZ1bmN0aW9uIF9sb2FkZXIocm9vdEVsLCBjYWxsYmFjaykge1xuXHR2YXIgbG9hZEVsZW1lbnRzID0gcm9vdEVsLnF1ZXJ5U2VsZWN0b3JBbGwoJ1snICsgY29uZmlnLmF0dHJzLmxvYWQgKyAnXScpO1xuXG5cdHZhciB2aWV3cyA9IHt9XG5cdFx0LCB0b3RhbENvdW50ID0gbG9hZEVsZW1lbnRzLmxlbmd0aFxuXHRcdCwgbG9hZGVkQ291bnQgPSAwO1xuXG5cdEFycmF5LnByb3RvdHlwZS5mb3JFYWNoLmNhbGwobG9hZEVsZW1lbnRzLCBmdW5jdGlvbiAoZWwpIHtcblx0XHRsb2FkVmlldyhlbCwgZnVuY3Rpb24oZXJyKSB7XG5cdFx0XHR2aWV3c1tlbC5pZF0gPSBlcnIgfHwgZWw7XG5cdFx0XHRsb2FkZWRDb3VudCsrO1xuXHRcdFx0aWYgKGxvYWRlZENvdW50ID09IHRvdGFsQ291bnQpXG5cdFx0XHRcdGNhbGxiYWNrKHZpZXdzKTtcblx0XHR9KTtcblx0fSk7XG59O1xuXG5cbmZ1bmN0aW9uIGxvYWRWaWV3KGVsLCBjYWxsYmFjaykge1xuXHRpZiAoZWwuY2hpbGRyZW4ubGVuZ3RoKVxuXHRcdHRocm93IG5ldyBMb2FkZXJFcnJvcignY2FuXFwndCBsb2FkIGh0bWwgaW50byBlbGVtZW50IHRoYXQgaXMgbm90IGVtcHR5Jyk7XG5cblx0dmFyIGF0dHIgPSBuZXcgTG9hZEF0dHJpYnV0ZShlbCk7XG5cblx0YXR0ci5wYXJzZSgpLnZhbGlkYXRlKCk7XG5cblx0cmVxdWVzdC5nZXQoYXR0ci5sb2FkVXJsLCBmdW5jdGlvbihlcnIsIGh0bWwpIHtcblx0XHRpZiAoZXJyKSB7XG5cdFx0XHRlcnIubWVzc2FnZSA9IGVyci5tZXNzYWdlIHx8ICdjYW5cXCd0IGxvYWQgZmlsZSAnICsgYXR0ci5sb2FkVXJsO1xuXHRcdFx0Ly8gbG9nZ2VyLmVycm9yKGVyci5tZXNzYWdlKTtcblx0XHRcdGNhbGxiYWNrKGVycik7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0ZWwuaW5uZXJIVE1MID0gaHRtbDtcblx0XHRjYWxsYmFjayhudWxsKTtcblx0fSk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBNZXNzZW5nZXIgPSByZXF1aXJlKCcuLi9tZXNzZW5nZXInKVxuXHQsIE1haWxNZXNzYWdlU291cmNlID0gcmVxdWlyZSgnLi9tYWlsX3NvdXJjZScpO1xuXG5cbnZhciBtYWlsTXNnU291cmNlID0gbmV3IE1haWxNZXNzYWdlU291cmNlKCk7XG5cbnZhciBtaWxvTWFpbCA9IG5ldyBNZXNzZW5nZXIodW5kZWZpbmVkLCB1bmRlZmluZWQsIG1haWxNc2dTb3VyY2UpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG1pbG9NYWlsO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgTWVzc2FnZVNvdXJjZSA9IHJlcXVpcmUoJy4uL21lc3Nlbmdlci9tZXNzYWdlX3NvdXJjZScpXG5cdCwgZG9tRXZlbnRzQ29uc3RydWN0b3JzID0gcmVxdWlyZSgnLi4vY29tcG9uZW50cy9jX21lc3NhZ2Vfc291cmNlcy9kb21fZXZlbnRzX2NvbnN0cnVjdG9ycycpXG5cdCwgTWFpbE1lc3NhZ2VTb3VyY2VFcnJvciA9IHJlcXVpcmUoJy4uL3V0aWwvZXJyb3InKS5NYWlsTWVzc2FnZVNvdXJjZVxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vdXRpbC9jaGVjaycpXG5cdCwgTWF0Y2ggPSBjaGVjay5NYXRjaDtcblxuXG52YXIgTWFpbE1lc3NhZ2VTb3VyY2UgPSBfLmNyZWF0ZVN1YmNsYXNzKE1lc3NhZ2VTb3VyY2UsICdNYWlsTWVzc2FnZVNvdXJjZScsIHRydWUpO1xuXG5cbl8uZXh0ZW5kUHJvdG8oTWFpbE1lc3NhZ2VTb3VyY2UsIHtcblx0Ly8gaW1wbGVtZW50aW5nIE1lc3NhZ2VTb3VyY2UgaW50ZXJmYWNlXG5cdC8vIGluaXQ6IGRlZmluZWQgaW4gTWVzc2FnZVNvdXJjZVxuXHR0cmFuc2xhdGVUb1NvdXJjZU1lc3NhZ2U6IHRyYW5zbGF0ZVRvRG9tRXZlbnQsXG4gXHRhZGRTb3VyY2VMaXN0ZW5lcjogYWRkRG9tRXZlbnRMaXN0ZW5lcixcbiBcdHJlbW92ZVNvdXJjZUxpc3RlbmVyOiByZW1vdmVEb21FdmVudExpc3RlbmVyLFxuIFx0ZmlsdGVyU291cmNlTWVzc2FnZTogZmlsdGVyRG9tRXZlbnQsXG5cbiBcdC8vIGNsYXNzIHNwZWNpZmljIG1ldGhvZHNcbiBcdGhhbmRsZUV2ZW50OiBoYW5kbGVFdmVudCwgIC8vIGV2ZW50IGRpc3BhdGNoZXIgLSBhcyBkZWZpbmVkIGJ5IEV2ZW50IERPTSBBUElcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1haWxNZXNzYWdlU291cmNlO1xuXG5cbi8vIFRPRE86IHRoaXMgZnVuY3Rpb24gc2hvdWxkIHJldHVybiByZWxldmFudCBET00gZXZlbnQgZGVwZW5kZW50IG9uIGVsZW1lbnQgdGFnXG4vLyBDYW4gYWxzbyBpbXBsZW1lbnQgYmVmb3JlZGF0YWNoYW5nZWQgZXZlbnQgdG8gYWxsb3cgcHJldmVudGluZyB0aGUgY2hhbmdlXG5mdW5jdGlvbiB0cmFuc2xhdGVUb0RvbUV2ZW50KG1lc3NhZ2UpIHtcblx0aWYgKG1lc3NhZ2UgPT0gJ2RvbXJlYWR5Jylcblx0XHRyZXR1cm4gJ3JlYWR5c3RhdGVjaGFuZ2UnO1xufVxuXG5cbmZ1bmN0aW9uIGFkZERvbUV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlKSB7XG5cdGlmICh0eXBlb2YgZG9jdW1lbnQgPT0gJ29iamVjdCcpIHtcblx0XHRpZiAoZXZlbnRUeXBlID09ICdyZWFkeXN0YXRlY2hhbmdlJykge1xuXHRcdFx0aWYgKGRvY3VtZW50LnJlYWR5U3RhdGUgPT0gJ2xvYWRpbmcnKVxuXHRcdFx0XHRkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50VHlwZSwgdGhpcywgZmFsc2UpOyAvLyBubyBjYXB0dXJpbmdcblx0XHRcdGVsc2Uge1xuXHRcdFx0XHR2YXIgZG9tRXZlbnQgPSBFdmVudENvbnN0cnVjdG9yKGV2ZW50VHlwZSwgeyB0YXJnZXQ6IGRvY3VtZW50IH0pO1xuXHRcdFx0XHR0aGlzLmRpc3BhdGNoTWVzc2FnZShldmVudFR5cGUsIGV2ZW50KTtcblx0XHRcdH1cblx0XHR9XG5cdH1cbn1cblxuXG5mdW5jdGlvbiByZW1vdmVEb21FdmVudExpc3RlbmVyKGV2ZW50VHlwZSkge1xuXHRpZiAodHlwZW9mIGRvY3VtZW50ID09ICdvYmplY3QnKVxuXHRcdGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlLCB0aGlzLCBmYWxzZSk7IC8vIG5vIGNhcHR1cmluZ1xufVxuXG5cbmZ1bmN0aW9uIGZpbHRlckRvbUV2ZW50KGV2ZW50VHlwZSwgbWVzc2FnZSwgZXZlbnQpIHtcblx0aWYgKGV2ZW50VHlwZSA9PSAncmVhZHlzdGF0ZWNoYW5nZScpIHtcblx0XHRpZiAodGhpcy5kb21SZWFkeUZpcmVkKSByZXR1cm4gZmFsc2U7XG5cdFx0dGhpcy5kb21SZWFkeUZpcmVkID0gdHJ1ZTtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxufTtcblxuXG4gLy8gZXZlbnQgZGlzcGF0Y2hlciAtIGFzIGRlZmluZWQgYnkgRXZlbnQgRE9NIEFQSVxuZnVuY3Rpb24gaGFuZGxlRXZlbnQoZXZlbnQpIHtcblx0dGhpcy5kaXNwYXRjaE1lc3NhZ2UoZXZlbnQudHlwZSwgZXZlbnQpO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgTWl4aW4gPSByZXF1aXJlKCcuLi9hYnN0cmFjdC9taXhpbicpXG5cdCwgTWVzc2FnZVNvdXJjZSA9IHJlcXVpcmUoJy4vbWVzc2FnZV9zb3VyY2UnKVxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vdXRpbC9jaGVjaycpXG5cdCwgTWF0Y2ggPSBjaGVjay5NYXRjaFxuXHQsIE1lc3NlbmdlckVycm9yID0gcmVxdWlyZSgnLi4vdXRpbC9lcnJvcicpLk1lc3NlbmdlcjtcblxuXG52YXIgZXZlbnRzU3BsaXRSZWdFeHAgPSAvXFxzKig/OlxcLHxcXHMpXFxzKi87XG5cblxudmFyIE1lc3NlbmdlciA9IF8uY3JlYXRlU3ViY2xhc3MoTWl4aW4sICdNZXNzZW5nZXInKTtcblxuXy5leHRlbmRQcm90byhNZXNzZW5nZXIsIHtcblx0aW5pdDogaW5pdE1lc3NlbmdlciwgLy8gY2FsbGVkIGJ5IE1peGluIChzdXBlcmNsYXNzKVxuXHRvbk1lc3NhZ2U6IHJlZ2lzdGVyU3Vic2NyaWJlcixcblx0b2ZmTWVzc2FnZTogcmVtb3ZlU3Vic2NyaWJlcixcblx0b25NZXNzYWdlczogcmVnaXN0ZXJTdWJzY3JpYmVycyxcblx0b2ZmTWVzc2FnZXM6IHJlbW92ZVN1YnNjcmliZXJzLFxuXHRwb3N0TWVzc2FnZTogcG9zdE1lc3NhZ2UsXG5cdGdldFN1YnNjcmliZXJzOiBnZXRNZXNzYWdlU3Vic2NyaWJlcnMsXG5cdF9jaG9vc2VTdWJzY3JpYmVyc0hhc2g6IF9jaG9vc2VTdWJzY3JpYmVyc0hhc2gsXG5cdF9yZWdpc3RlclN1YnNjcmliZXI6IF9yZWdpc3RlclN1YnNjcmliZXIsXG5cdF9yZW1vdmVTdWJzY3JpYmVyOiBfcmVtb3ZlU3Vic2NyaWJlcixcblx0X3JlbW92ZUFsbFN1YnNjcmliZXJzOiBfcmVtb3ZlQWxsU3Vic2NyaWJlcnMsXG5cdF9jYWxsUGF0dGVyblN1YnNjcmliZXJzOiBfY2FsbFBhdHRlcm5TdWJzY3JpYmVycyxcblx0X2NhbGxTdWJzY3JpYmVyczogX2NhbGxTdWJzY3JpYmVyc1xufSk7XG5cblxuTWVzc2VuZ2VyLmRlZmF1bHRNZXRob2RzID0ge1xuXHRvbk1lc3NhZ2U6ICdvbk1lc3NhZ2UnLFxuXHRvZmZNZXNzYWdlOiAnb2ZmTWVzc2FnZScsXG5cdG9uTWVzc2FnZXM6ICdvbk1lc3NhZ2VzJyxcblx0b2ZmTWVzc2FnZXM6ICdvZmZNZXNzYWdlcycsXG5cdHBvc3RNZXNzYWdlOiAncG9zdE1lc3NhZ2UnLFxuXHRnZXRTdWJzY3JpYmVyczogJ2dldFN1YnNjcmliZXJzJ1xufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IE1lc3NlbmdlcjtcblxuXG5mdW5jdGlvbiBpbml0TWVzc2VuZ2VyKGhvc3RPYmplY3QsIHByb3h5TWV0aG9kcywgbWVzc2FnZVNvdXJjZSkge1xuXHRjaGVjayhtZXNzYWdlU291cmNlLCBNYXRjaC5PcHRpb25hbChNZXNzYWdlU291cmNlKSk7XG5cblx0Ly8gaG9zdE9iamVjdCBhbmQgcHJveHlNZXRob2RzIGFyZSB1c2VkIGluIE1peGluXG4gXHQvLyBtZXNzZW5nZXIgZGF0YVxuIFx0T2JqZWN0LmRlZmluZVByb3BlcnRpZXModGhpcywge1xuIFx0XHRfbWVzc2FnZVN1YnNjcmliZXJzOiB7IHZhbHVlOiB7fSB9LFxuIFx0XHRfcGF0dGVybk1lc3NhZ2VTdWJzY3JpYmVyczogeyB2YWx1ZToge30gfSxcbiBcdFx0X21lc3NhZ2VTb3VyY2U6IHsgdmFsdWU6IG1lc3NhZ2VTb3VyY2UgfVxuIFx0fSk7XG5cbiBcdGlmIChtZXNzYWdlU291cmNlKVxuIFx0XHRtZXNzYWdlU291cmNlLm1lc3NlbmdlciA9IHRoaXM7XG59XG5cblxuZnVuY3Rpb24gcmVnaXN0ZXJTdWJzY3JpYmVyKG1lc3NhZ2VzLCBzdWJzY3JpYmVyKSB7XG5cdGNoZWNrKG1lc3NhZ2VzLCBNYXRjaC5PbmVPZihTdHJpbmcsIFtTdHJpbmddLCBSZWdFeHApKTtcblx0Y2hlY2soc3Vic2NyaWJlciwgRnVuY3Rpb24pOyBcblxuXHRpZiAodHlwZW9mIG1lc3NhZ2VzID09ICdzdHJpbmcnKVxuXHRcdG1lc3NhZ2VzID0gbWVzc2FnZXMuc3BsaXQoZXZlbnRzU3BsaXRSZWdFeHApO1xuXG5cdHZhciBzdWJzY3JpYmVyc0hhc2ggPSB0aGlzLl9jaG9vc2VTdWJzY3JpYmVyc0hhc2gobWVzc2FnZXMpO1xuXG5cdGlmIChtZXNzYWdlcyBpbnN0YW5jZW9mIFJlZ0V4cClcblx0XHRyZXR1cm4gdGhpcy5fcmVnaXN0ZXJTdWJzY3JpYmVyKHN1YnNjcmliZXJzSGFzaCwgbWVzc2FnZXMsIHN1YnNjcmliZXIpO1xuXG5cdGVsc2Uge1xuXHRcdHZhciB3YXNSZWdpc3RlcmVkID0gZmFsc2U7XG5cblx0XHRtZXNzYWdlcy5mb3JFYWNoKGZ1bmN0aW9uKG1lc3NhZ2UpIHtcblx0XHRcdHZhciBub3RZZXRSZWdpc3RlcmVkID0gdGhpcy5fcmVnaXN0ZXJTdWJzY3JpYmVyKHN1YnNjcmliZXJzSGFzaCwgbWVzc2FnZSwgc3Vic2NyaWJlcik7XHRcdFx0XG5cdFx0XHR3YXNSZWdpc3RlcmVkID0gd2FzUmVnaXN0ZXJlZCB8fCBub3RZZXRSZWdpc3RlcmVkO1x0XHRcdFxuXHRcdH0sIHRoaXMpO1xuXG5cdFx0cmV0dXJuIHdhc1JlZ2lzdGVyZWQ7XG5cdH1cbn1cblxuXG5mdW5jdGlvbiBfcmVnaXN0ZXJTdWJzY3JpYmVyKHN1YnNjcmliZXJzSGFzaCwgbWVzc2FnZSwgc3Vic2NyaWJlcikge1xuXHRpZiAoISAoc3Vic2NyaWJlcnNIYXNoW21lc3NhZ2VdICYmIHN1YnNjcmliZXJzSGFzaFttZXNzYWdlXS5sZW5ndGgpKSB7XG5cdFx0c3Vic2NyaWJlcnNIYXNoW21lc3NhZ2VdID0gW107XG5cdFx0dmFyIG5vU3Vic2NyaWJlcnMgPSB0cnVlO1xuXHRcdGlmICh0aGlzLl9tZXNzYWdlU291cmNlKVxuXHRcdFx0dGhpcy5fbWVzc2FnZVNvdXJjZS5vblN1YnNjcmliZXJBZGRlZChtZXNzYWdlKTtcblx0fVxuXG5cdHZhciBtc2dTdWJzY3JpYmVycyA9IHN1YnNjcmliZXJzSGFzaFttZXNzYWdlXTtcblx0dmFyIG5vdFlldFJlZ2lzdGVyZWQgPSBub1N1YnNjcmliZXJzIHx8IG1zZ1N1YnNjcmliZXJzLmluZGV4T2Yoc3Vic2NyaWJlcikgPT0gLTE7XG5cblx0aWYgKG5vdFlldFJlZ2lzdGVyZWQpXG5cdFx0bXNnU3Vic2NyaWJlcnMucHVzaChzdWJzY3JpYmVyKTtcblxuXHRyZXR1cm4gbm90WWV0UmVnaXN0ZXJlZDtcbn1cblxuXG5mdW5jdGlvbiByZWdpc3RlclN1YnNjcmliZXJzKG1lc3NhZ2VTdWJzY3JpYmVycykge1xuXHRjaGVjayhtZXNzYWdlU3Vic2NyaWJlcnMsIE1hdGNoLk9iamVjdEhhc2goRnVuY3Rpb24pKTtcblxuXHR2YXIgbm90WWV0UmVnaXN0ZXJlZE1hcCA9IF8ubWFwS2V5cyhtZXNzYWdlU3Vic2NyaWJlcnMsIGZ1bmN0aW9uKHN1YnNjcmliZXIsIG1lc3NhZ2VzKSB7XG5cdFx0cmV0dXJuIHRoaXMub25NZXNzYWdlKG1lc3NhZ2VzLCBzdWJzY3JpYmVyKVxuXHR9LCB0aGlzKTtcblxuXHRyZXR1cm4gbm90WWV0UmVnaXN0ZXJlZE1hcDtcbn1cblxuXG4vLyByZW1vdmVzIGFsbCBzdWJzY3JpYmVycyBmb3IgdGhlIG1lc3NhZ2UgaWYgc3Vic2NyaWJlciBpc24ndCBzdXBwbGllZFxuZnVuY3Rpb24gcmVtb3ZlU3Vic2NyaWJlcihtZXNzYWdlcywgc3Vic2NyaWJlcikge1xuXHRjaGVjayhtZXNzYWdlcywgTWF0Y2guT25lT2YoU3RyaW5nLCBbU3RyaW5nXSwgUmVnRXhwKSk7XG5cdGNoZWNrKHN1YnNjcmliZXIsIE1hdGNoLk9wdGlvbmFsKEZ1bmN0aW9uKSk7IFxuXG5cdGlmICh0eXBlb2YgbWVzc2FnZXMgPT0gJ3N0cmluZycpXG5cdFx0bWVzc2FnZXMgPSBtZXNzYWdlcy5zcGxpdChldmVudHNTcGxpdFJlZ0V4cCk7XG5cblx0dmFyIHN1YnNjcmliZXJzSGFzaCA9IHRoaXMuX2Nob29zZVN1YnNjcmliZXJzSGFzaChtZXNzYWdlcyk7XG5cblx0aWYgKG1lc3NhZ2VzIGluc3RhbmNlb2YgUmVnRXhwKVxuXHRcdHJldHVybiB0aGlzLl9yZW1vdmVTdWJzY3JpYmVyKHN1YnNjcmliZXJzSGFzaCwgbWVzc2FnZXMsIHN1YnNjcmliZXIpO1xuXG5cdGVsc2Uge1xuXHRcdHZhciB3YXNSZW1vdmVkID0gZmFsc2U7XG5cblx0XHRtZXNzYWdlcy5mb3JFYWNoKGZ1bmN0aW9uKG1lc3NhZ2UpIHtcblx0XHRcdHZhciBzdWJzY3JpYmVyUmVtb3ZlZCA9IHRoaXMuX3JlbW92ZVN1YnNjcmliZXIoc3Vic2NyaWJlcnNIYXNoLCBtZXNzYWdlLCBzdWJzY3JpYmVyKTtcdFx0XHRcblx0XHRcdHdhc1JlbW92ZWQgPSB3YXNSZW1vdmVkIHx8IHN1YnNjcmliZXJSZW1vdmVkO1x0XHRcdFxuXHRcdH0sIHRoaXMpO1xuXG5cdFx0cmV0dXJuIHdhc1JlbW92ZWQ7XG5cdH1cbn1cblxuXG5mdW5jdGlvbiBfcmVtb3ZlU3Vic2NyaWJlcihzdWJzY3JpYmVyc0hhc2gsIG1lc3NhZ2UsIHN1YnNjcmliZXIpIHtcblx0dmFyIG1zZ1N1YnNjcmliZXJzID0gc3Vic2NyaWJlcnNIYXNoW21lc3NhZ2VdO1xuXHRpZiAoISBtc2dTdWJzY3JpYmVycyB8fCAhIG1zZ1N1YnNjcmliZXJzLmxlbmd0aClcblx0XHRyZXR1cm4gZmFsc2U7IC8vIG5vdGhpbmcgcmVtb3ZlZFxuXG5cdGlmIChzdWJzY3JpYmVyKSB7XG5cdFx0dmFyIHN1YnNjcmliZXJJbmRleCA9IG1zZ1N1YnNjcmliZXJzLmluZGV4T2Yoc3Vic2NyaWJlcik7XG5cdFx0aWYgKHN1YnNjcmliZXJJbmRleCA9PSAtMSkgXG5cdFx0XHRyZXR1cm4gZmFsc2U7IC8vIG5vdGhpbmcgcmVtb3ZlZFxuXHRcdG1zZ1N1YnNjcmliZXJzLnNwbGljZShzdWJzY3JpYmVySW5kZXgsIDEpO1xuXHRcdGlmICghIG1zZ1N1YnNjcmliZXJzLmxlbmd0aClcblx0XHRcdHRoaXMuX3JlbW92ZUFsbFN1YnNjcmliZXJzKHN1YnNjcmliZXJzSGFzaCwgbWVzc2FnZSk7XG5cblx0fSBlbHNlIFxuXHRcdHRoaXMuX3JlbW92ZUFsbFN1YnNjcmliZXJzKHN1YnNjcmliZXJzSGFzaCwgbWVzc2FnZSk7XG5cblx0cmV0dXJuIHRydWU7IC8vIHN1YnNjcmliZXIocykgcmVtb3ZlZFxufVxuXG5cbmZ1bmN0aW9uIF9yZW1vdmVBbGxTdWJzY3JpYmVycyhzdWJzY3JpYmVyc0hhc2gsIG1lc3NhZ2UpIHtcblx0ZGVsZXRlIHN1YnNjcmliZXJzSGFzaFttZXNzYWdlXTtcblx0aWYgKHRoaXMuX21lc3NhZ2VTb3VyY2UpXG5cdFx0dGhpcy5fbWVzc2FnZVNvdXJjZS5vblN1YnNjcmliZXJSZW1vdmVkKG1lc3NhZ2UpO1xufVxuXG5cbmZ1bmN0aW9uIHJlbW92ZVN1YnNjcmliZXJzKG1lc3NhZ2VTdWJzY3JpYmVycykge1xuXHRjaGVjayhtZXNzYWdlU3Vic2NyaWJlcnMsIE1hdGNoLk9iamVjdEhhc2goRnVuY3Rpb24pKTtcblxuXHR2YXIgc3Vic2NyaWJlclJlbW92ZWRNYXAgPSBfLm1hcEtleXMobWVzc2FnZVN1YnNjcmliZXJzLCBmdW5jdGlvbihzdWJzY3JpYmVyLCBtZXNzYWdlcykge1xuXHRcdHJldHVybiB0aGlzLm9mZk1lc3NhZ2VzKG1lc3NhZ2VzLCBzdWJzY3JpYmVyKVxuXHR9LCB0aGlzKTtcblxuXHRyZXR1cm4gc3Vic2NyaWJlclJlbW92ZWRNYXA7XHRcbn1cblxuXG4vLyBUT0RPIC0gc2VuZCBldmVudCB0byBtZXNzYWdlU291cmNlXG5cblxuZnVuY3Rpb24gcG9zdE1lc3NhZ2UobWVzc2FnZSwgZGF0YSkge1xuXHRjaGVjayhtZXNzYWdlLCBNYXRjaC5PbmVPZihTdHJpbmcsIFJlZ0V4cCkpO1xuXG5cdHZhciBzdWJzY3JpYmVyc0hhc2ggPSB0aGlzLl9jaG9vc2VTdWJzY3JpYmVyc0hhc2gobWVzc2FnZSk7XG5cdHZhciBtc2dTdWJzY3JpYmVycyA9IHN1YnNjcmliZXJzSGFzaFttZXNzYWdlXTtcblxuXHR0aGlzLl9jYWxsU3Vic2NyaWJlcnMobWVzc2FnZSwgZGF0YSwgbXNnU3Vic2NyaWJlcnMpO1xuXG5cdGlmICh0eXBlb2YgbWVzc2FnZSA9PSAnc3RyaW5nJylcblx0XHR0aGlzLl9jYWxsUGF0dGVyblN1YnNjcmliZXJzKG1lc3NhZ2UsIGRhdGEpO1xufVxuXG5cbmZ1bmN0aW9uIF9jYWxsUGF0dGVyblN1YnNjcmliZXJzKG1lc3NhZ2UsIGRhdGEpIHtcblx0Xy5lYWNoS2V5KHRoaXMuX3BhdHRlcm5NZXNzYWdlU3Vic2NyaWJlcnMsIFxuXHRcdGZ1bmN0aW9uKHBhdHRlcm5TdWJzY3JpYmVycywgcGF0dGVybikge1xuXHRcdFx0aWYgKHBhdHRlcm4udGVzdChtZXNzYWdlKSlcblx0XHRcdFx0dGhpcy5fY2FsbFN1YnNjcmliZXJzKG1lc3NhZ2UsIGRhdGEsIHBhdHRlcm5TdWJzY3JpYmVycyk7XG5cdFx0fVxuXHQsIHRoaXMpO1xufVxuXG5cbmZ1bmN0aW9uIF9jYWxsU3Vic2NyaWJlcnMobWVzc2FnZSwgZGF0YSwgbXNnU3Vic2NyaWJlcnMpIHtcblx0aWYgKG1zZ1N1YnNjcmliZXJzICYmIG1zZ1N1YnNjcmliZXJzLmxlbmd0aClcblx0XHRtc2dTdWJzY3JpYmVycy5mb3JFYWNoKGZ1bmN0aW9uKHN1YnNjcmliZXIpIHtcblx0XHRcdHN1YnNjcmliZXIuY2FsbCh0aGlzLCBtZXNzYWdlLCBkYXRhKTtcblx0XHR9LCB0aGlzKTtcbn1cblxuXG5mdW5jdGlvbiBnZXRNZXNzYWdlU3Vic2NyaWJlcnMobWVzc2FnZSwgaW5jbHVkZVBhdHRlcm5TdWJzY3JpYmVycykge1xuXHRjaGVjayhtZXNzYWdlLCBNYXRjaC5PbmVPZihTdHJpbmcsIFJlZ0V4cCkpO1xuXG5cdHZhciBzdWJzY3JpYmVyc0hhc2ggPSB0aGlzLl9jaG9vc2VTdWJzY3JpYmVyc0hhc2gobWVzc2FnZSk7XG5cdHZhciBtc2dTdWJzY3JpYmVycyA9IHN1YnNjcmliZXJzSGFzaFttZXNzYWdlXVxuXHRcdFx0XHRcdFx0XHQ/IFtdLmNvbmNhdChzdWJzY3JpYmVyc0hhc2hbbWVzc2FnZV0pXG5cdFx0XHRcdFx0XHRcdDogW107XG5cblx0Ly8gcGF0dGVybiBzdWJzY3JpYmVycyBhcmUgaW5jdWRlZCBieSBkZWZhdWx0XG5cdGlmIChpbmNsdWRlUGF0dGVyblN1YnNjcmliZXJzICE9PSBmYWxzZSAmJiB0eXBlb2YgbWVzc2FnZSA9PSAnc3RyaW5nJykge1xuXHRcdF8uZWFjaEtleSh0aGlzLl9wYXR0ZXJuTWVzc2FnZVN1YnNjcmliZXJzLCBcblx0XHRcdGZ1bmN0aW9uKHBhdHRlcm5TdWJzY3JpYmVycywgcGF0dGVybikge1xuXHRcdFx0XHRpZiAocGF0dGVyblN1YnNjcmliZXJzICYmIHBhdHRlcm5TdWJzY3JpYmVycy5sZW5ndGhcblx0XHRcdFx0XHRcdCYmIHBhdHRlcm4udGVzdChtZXNzYWdlKSlcblx0XHRcdFx0XHRfLmFwcGVuZEFycmF5KG1zZ1N1YnNjcmliZXJzLCBwYXR0ZXJuU3Vic2NyaWJlcnMpO1xuXHRcdFx0fVxuXHRcdCk7XG5cdH1cblxuXHRyZXR1cm4gbXNnU3Vic2NyaWJlcnMubGVuZ3RoXG5cdFx0XHRcdD8gbXNnU3Vic2NyaWJlcnNcblx0XHRcdFx0OiB1bmRlZmluZWQ7XG59XG5cblxuZnVuY3Rpb24gX2Nob29zZVN1YnNjcmliZXJzSGFzaChtZXNzYWdlKSB7XG5cdHJldHVybiBtZXNzYWdlIGluc3RhbmNlb2YgUmVnRXhwXG5cdFx0XHRcdD8gdGhpcy5fcGF0dGVybk1lc3NhZ2VTdWJzY3JpYmVyc1xuXHRcdFx0XHQ6IHRoaXMuX21lc3NhZ2VTdWJzY3JpYmVycztcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIE1peGluID0gcmVxdWlyZSgnLi4vYWJzdHJhY3QvbWl4aW4nKVxuXHQsIGxvZ2dlciA9IHJlcXVpcmUoJy4uL3V0aWwvbG9nZ2VyJylcblx0LCB0b0JlSW1wbGVtZW50ZWQgPSByZXF1aXJlKCcuLi91dGlsL2Vycm9yJykudG9CZUltcGxlbWVudGVkXG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpO1xuXG4vLyBhbiBhYnN0cmFjdCBjbGFzcyBmb3IgZGlzcGF0Y2hpbmcgZXh0ZXJuYWwgdG8gaW50ZXJuYWwgZXZlbnRzXG52YXIgTWVzc2FnZVNvdXJjZSA9IF8uY3JlYXRlU3ViY2xhc3MoTWl4aW4sICdNZXNzYWdlU291cmNlJywgdHJ1ZSk7XG5cbm1vZHVsZS5leHBvcnRzID0gTWVzc2FnZVNvdXJjZTtcblxuXG5fLmV4dGVuZFByb3RvKE1lc3NhZ2VTb3VyY2UsIHtcblx0Ly8gaW5pdGlhbGl6ZXMgbWVzc2FnZVNvdXJjZSAtIGNhbGxlZCBieSBNaXhpbiBzdXBlcmNsYXNzXG5cdGluaXQ6IGluaXRNZXNzYWdlU291cmNlLFxuXG5cdC8vIGNhbGxlZCBieSBNZXNzZW5nZXIgdG8gbm90aWZ5IHdoZW4gdGhlIGZpcnN0IHN1YnNjcmliZXIgZm9yIGFuIGludGVybmFsIG1lc3NhZ2Ugd2FzIGFkZGVkXG5cdG9uU3Vic2NyaWJlckFkZGVkOiBvblN1YnNjcmliZXJBZGRlZCxcblxuXHQvLyBjYWxsZWQgYnkgTWVzc2VuZ2VyIHRvIG5vdGlmeSB3aGVuIHRoZSBsYXN0IHN1YnNjcmliZXIgZm9yIGFuIGludGVybmFsIG1lc3NhZ2Ugd2FzIHJlbW92ZWRcbiBcdG9uU3Vic2NyaWJlclJlbW92ZWQ6IG9uU3Vic2NyaWJlclJlbW92ZWQsIFxuXG4gXHQvLyBkaXNwYXRjaGVzIHNvdXJjZSBtZXNzYWdlXG4gXHRkaXNwYXRjaE1lc3NhZ2U6IGRpc3BhdGNoU291cmNlTWVzc2FnZSxcblxuXHQvLyBmaWx0ZXJzIHNvdXJjZSBtZXNzYWdlIGJhc2VkIG9uIHRoZSBkYXRhIG9mIHRoZSBtZXNzYWdlIC0gc2hvdWxkIGJlIGltcGxlbWVudGVkIGluIHN1YmNsYXNzXG5cdGZpbHRlclNvdXJjZU1lc3NhZ2U6IGRpc3BhdGNoQWxsU291cmNlTWVzc2FnZXMsXG5cbiBcdC8vICoqKlxuIFx0Ly8gTWV0aG9kcyBiZWxvdyBtdXN0IGJlIGltcGxlbWVudGVkIGluIHN1YmNsYXNzXG4gXHRcblx0Ly8gY29udmVydHMgaW50ZXJuYWwgbWVzc2FnZSB0eXBlIHRvIGV4dGVybmFsIG1lc3NhZ2UgdHlwZSAtIHNob3VsZCBiZSBpbXBsZW1lbnRlZCBpbiBzdWJjbGFzc1xuXHR0cmFuc2xhdGVUb1NvdXJjZU1lc3NhZ2U6IHRvQmVJbXBsZW1lbnRlZCxcblxuIFx0Ly8gYWRkcyBsaXN0ZW5lciB0byBleHRlcm5hbCBtZXNzYWdlIC0gc2hvdWxkIGJlIGltcGxlbWVudGVkIGJ5IHN1YmNsYXNzXG4gXHRhZGRTb3VyY2VMaXN0ZW5lcjogdG9CZUltcGxlbWVudGVkLFxuXG4gXHQvLyByZW1vdmVzIGxpc3RlbmVyIGZyb20gZXh0ZXJuYWwgbWVzc2FnZSAtIHNob3VsZCBiZSBpbXBsZW1lbnRlZCBieSBzdWJjbGFzc1xuIFx0cmVtb3ZlU291cmNlTGlzdGVuZXI6IHRvQmVJbXBsZW1lbnRlZCxcbn0pO1xuXG5cbmZ1bmN0aW9uIGluaXRNZXNzYWdlU291cmNlKCkge1xuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ19pbnRlcm5hbE1lc3NhZ2VzJywgeyB2YWx1ZToge30gfSk7XG59XG5cblxuZnVuY3Rpb24gb25TdWJzY3JpYmVyQWRkZWQobWVzc2FnZSkge1xuXHR2YXIgc291cmNlTWVzc2FnZSA9IHRoaXMudHJhbnNsYXRlVG9Tb3VyY2VNZXNzYWdlKG1lc3NhZ2UpO1xuXG5cdGlmICghIHNvdXJjZU1lc3NhZ2UpIHJldHVybjtcblxuXHRpZiAoISB0aGlzLl9pbnRlcm5hbE1lc3NhZ2VzLmhhc093blByb3BlcnR5KHNvdXJjZU1lc3NhZ2UpKSB7XG5cdFx0dGhpcy5hZGRTb3VyY2VMaXN0ZW5lcihzb3VyY2VNZXNzYWdlKTtcblx0XHR0aGlzLl9pbnRlcm5hbE1lc3NhZ2VzW3NvdXJjZU1lc3NhZ2VdID0gW107XG5cdH1cblx0dmFyIGludGVybmFsTXNncyA9IHRoaXMuX2ludGVybmFsTWVzc2FnZXNbc291cmNlTWVzc2FnZV07XG5cblx0aWYgKGludGVybmFsTXNncy5pbmRleE9mKG1lc3NhZ2UpID09IC0xKVxuXHRcdGludGVybmFsTXNncy5wdXNoKG1lc3NhZ2UpO1xuXHRlbHNlXG5cdFx0bG9nZ2VyLndhcm4oJ0R1cGxpY2F0ZSBub3RpZmljYXRpb24gcmVjZWl2ZWQ6IGZvciBzdWJzY3JpYmUgdG8gaW50ZXJuYWwgbWVzc2FnZSAnICsgbWVzc2FnZSk7XG59XG5cblxuZnVuY3Rpb24gb25TdWJzY3JpYmVyUmVtb3ZlZChtZXNzYWdlKSB7XG5cdHZhciBzb3VyY2VNZXNzYWdlID0gdGhpcy50cmFuc2xhdGVUb1NvdXJjZU1lc3NhZ2UobWVzc2FnZSk7XG5cblx0aWYgKCEgc291cmNlTWVzc2FnZSkgcmV0dXJuO1xuXG5cdHZhciBpbnRlcm5hbE1zZ3MgPSB0aGlzLl9pbnRlcm5hbE1lc3NhZ2VzW3NvdXJjZU1lc3NhZ2VdO1xuXG5cdGlmIChpbnRlcm5hbE1zZ3MgJiYgaW50ZXJuYWxNc2dzLmxlbmd0aCkge1xuXHRcdG1lc3NhZ2VJbmRleCA9IGludGVybmFsTXNncy5pbmRleE9mKG1lc3NhZ2UpO1xuXHRcdGlmIChtZXNzYWdlSW5kZXggPj0gMCkge1xuXHRcdFx0aW50ZXJuYWxNc2dzLnNwbGljZShtZXNzYWdlSW5kZXgsIDEpO1xuXHRcdFx0aWYgKGludGVybmFsTXNncy5sZW5ndGggPT0gMCkge1xuXHRcdFx0XHRkZWxldGUgdGhpcy5faW50ZXJuYWxNZXNzYWdlc1tzb3VyY2VNZXNzYWdlXTtcblx0XHRcdFx0dGhpcy5yZW1vdmVTb3VyY2VMaXN0ZW5lcihzb3VyY2VNZXNzYWdlKTtcblx0XHRcdH1cblx0XHR9IGVsc2Vcblx0XHRcdHVuZXhwZWN0ZWROb3RpZmljYXRpb25XYXJuaW5nKCk7XG5cdH0gZWxzZVxuXHRcdHVuZXhwZWN0ZWROb3RpZmljYXRpb25XYXJuaW5nKCk7XG5cblxuXHRmdW5jdGlvbiB1bmV4cGVjdGVkTm90aWZpY2F0aW9uV2FybmluZygpIHtcblx0XHRsb2dnZXIud2Fybignbm90aWZpY2F0aW9uIHJlY2VpdmVkOiB1bi1zdWJzY3JpYmUgZnJvbSBpbnRlcm5hbCBtZXNzYWdlICcgKyBtZXNzYWdlXG5cdFx0XHRcdFx0ICsgJyB3aXRob3V0IHByZXZpb3VzIHN1YnNjcmlwdGlvbiBub3RpZmljYXRpb24nKTtcblx0fVxufVxuXG5cbmZ1bmN0aW9uIGRpc3BhdGNoU291cmNlTWVzc2FnZShzb3VyY2VNZXNzYWdlLCBkYXRhKSB7XG5cdHZhciBpbnRlcm5hbE1zZ3MgPSB0aGlzLl9pbnRlcm5hbE1lc3NhZ2VzW3NvdXJjZU1lc3NhZ2VdO1xuXG5cdGlmIChpbnRlcm5hbE1zZ3MgJiYgaW50ZXJuYWxNc2dzLmxlbmd0aClcblx0XHRpbnRlcm5hbE1zZ3MuZm9yRWFjaChmdW5jdGlvbihtZXNzYWdlKSB7XG5cdFx0XHRpZiAodGhpcy5maWx0ZXJTb3VyY2VNZXNzYWdlXG5cdFx0XHRcdFx0JiYgdGhpcy5maWx0ZXJTb3VyY2VNZXNzYWdlKHNvdXJjZU1lc3NhZ2UsIG1lc3NhZ2UsIGRhdGEpKVxuXHRcdFx0XHR0aGlzLm1lc3Nlbmdlci5wb3N0TWVzc2FnZShtZXNzYWdlLCBkYXRhKTtcblx0XHR9LCB0aGlzKTtcblx0ZWxzZVxuXHRcdGxvZ2dlci53YXJuKCdzb3VyY2UgbWVzc2FnZSByZWNlaXZlZCBmb3Igd2hpY2ggdGhlcmUgaXMgbm8gbWFwcGVkIGludGVybmFsIG1lc3NhZ2UnKTtcbn1cblxuXG4vLyBjYW4gYmUgb3ZlcnJpZGRlbiBpbiBzdWJjbGFzcyB0byBpbXBsZW1lbnQgZmlsdGVyaW5nIGJhc2VkIG9uIG1lc3NhZ2UgZGF0YVxuZnVuY3Rpb24gZGlzcGF0Y2hBbGxTb3VyY2VNZXNzYWdlcyhzb3VyY2VNZXNzYWdlLCBtZXNzYWdlLCBkYXRhKSB7XG5cdHJldHVybiB0cnVlO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgbWlsbyA9IHtcblx0bG9hZGVyOiByZXF1aXJlKCcuL2xvYWRlcicpLFxuXHRiaW5kZXI6IHJlcXVpcmUoJy4vYmluZGVyJyksXG5cdG1haWw6IHJlcXVpcmUoJy4vbWFpbCcpLFxuXHRjb25maWc6IHJlcXVpcmUoJy4vY29uZmlnJyksXG5cdHV0aWw6IHJlcXVpcmUoJy4vdXRpbCcpXG59XG5cblxuLy8gdXNlZCBmYWNldHNcbnJlcXVpcmUoJy4vY29tcG9uZW50cy9jX2ZhY2V0cy9Db250YWluZXInKTtcbnJlcXVpcmUoJy4vY29tcG9uZW50cy9jX2ZhY2V0cy9FdmVudHMnKTtcbnJlcXVpcmUoJy4vY29tcG9uZW50cy9jX2ZhY2V0cy9EYXRhJyk7XG5cbi8vIHVzZWQgY29tcG9uZW50c1xucmVxdWlyZSgnLi9jb21wb25lbnRzL2NsYXNzZXMvVmlldycpO1xuXG5cbmlmICh0eXBlb2YgbW9kdWxlID09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKVxuXHQvLyBleHBvcnQgZm9yIG5vZGUvYnJvd3NlcmlmeVxuXHRtb2R1bGUuZXhwb3J0cyA9IG1pbG87XG5cbmlmICh0eXBlb2Ygd2luZG93ID09ICdvYmplY3QnKVxuXHR3aW5kb3cubWlsbyA9IG1pbG87XG4iLCIndXNlIHN0cmljdCc7XG5cbi8vIFhYWCBkb2NzXG5cbi8vIFRoaW5ncyB3ZSBleHBsaWNpdGx5IGRvIE5PVCBzdXBwb3J0OlxuLy8gICAgLSBoZXRlcm9nZW5vdXMgYXJyYXlzXG52YXIgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpO1xuXG52YXIgY2hlY2sgPSBmdW5jdGlvbiAodmFsdWUsIHBhdHRlcm4pIHtcbiAgLy8gUmVjb3JkIHRoYXQgY2hlY2sgZ290IGNhbGxlZCwgaWYgc29tZWJvZHkgY2FyZWQuXG4gIHRyeSB7XG4gICAgY2hlY2tTdWJ0cmVlKHZhbHVlLCBwYXR0ZXJuKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgaWYgKChlcnIgaW5zdGFuY2VvZiBNYXRjaC5FcnJvcikgJiYgZXJyLnBhdGgpXG4gICAgICBlcnIubWVzc2FnZSArPSBcIiBpbiBmaWVsZCBcIiArIGVyci5wYXRoO1xuICAgIHRocm93IGVycjtcbiAgfVxufTtcbm1vZHVsZS5leHBvcnRzID0gY2hlY2s7XG5cbnZhciBNYXRjaCA9IGNoZWNrLk1hdGNoID0ge1xuICBPcHRpb25hbDogZnVuY3Rpb24gKHBhdHRlcm4pIHtcbiAgICByZXR1cm4gbmV3IE9wdGlvbmFsKHBhdHRlcm4pO1xuICB9LFxuICBPbmVPZjogZnVuY3Rpb24gKC8qYXJndW1lbnRzKi8pIHtcbiAgICByZXR1cm4gbmV3IE9uZU9mKGFyZ3VtZW50cyk7XG4gIH0sXG4gIEFueTogWydfX2FueV9fJ10sXG4gIFdoZXJlOiBmdW5jdGlvbiAoY29uZGl0aW9uKSB7XG4gICAgcmV0dXJuIG5ldyBXaGVyZShjb25kaXRpb24pO1xuICB9LFxuICBPYmplY3RJbmNsdWRpbmc6IGZ1bmN0aW9uIChwYXR0ZXJuKSB7XG4gICAgcmV0dXJuIG5ldyBPYmplY3RJbmNsdWRpbmcocGF0dGVybik7XG4gIH0sXG4gIC8vIE1hdGNoZXMgb25seSBzaWduZWQgMzItYml0IGludGVnZXJzXG4gIEludGVnZXI6IFsnX19pbnRlZ2VyX18nXSxcblxuICAvLyBNYXRjaGVzIGhhc2ggKG9iamVjdCkgd2l0aCB2YWx1ZXMgbWF0Y2hpbmcgcGF0dGVyblxuICBPYmplY3RIYXNoOiBmdW5jdGlvbihwYXR0ZXJuKSB7XG4gICAgcmV0dXJuIG5ldyBPYmplY3RIYXNoKHBhdHRlcm4pO1xuICB9LFxuXG4gIFN1YmNsYXNzOiBmdW5jdGlvbihTdXBlcmNsYXNzLCBtYXRjaFN1cGVyY2xhc3NUb28pIHtcbiAgICByZXR1cm4gbmV3IFN1YmNsYXNzKFN1cGVyY2xhc3MsIG1hdGNoU3VwZXJjbGFzc1Rvbyk7XG4gIH0sXG5cbiAgLy8gWFhYIG1hdGNoZXJzIHNob3VsZCBrbm93IGhvdyB0byBkZXNjcmliZSB0aGVtc2VsdmVzIGZvciBlcnJvcnNcbiAgRXJyb3I6IFR5cGVFcnJvcixcblxuICAvLyBNZXRlb3IubWFrZUVycm9yVHlwZShcIk1hdGNoLkVycm9yXCIsIGZ1bmN0aW9uIChtc2cpIHtcbiAgICAvLyB0aGlzLm1lc3NhZ2UgPSBcIk1hdGNoIGVycm9yOiBcIiArIG1zZztcbiAgICAvLyBUaGUgcGF0aCBvZiB0aGUgdmFsdWUgdGhhdCBmYWlsZWQgdG8gbWF0Y2guIEluaXRpYWxseSBlbXB0eSwgdGhpcyBnZXRzXG4gICAgLy8gcG9wdWxhdGVkIGJ5IGNhdGNoaW5nIGFuZCByZXRocm93aW5nIHRoZSBleGNlcHRpb24gYXMgaXQgZ29lcyBiYWNrIHVwIHRoZVxuICAgIC8vIHN0YWNrLlxuICAgIC8vIEUuZy46IFwidmFsc1szXS5lbnRpdHkuY3JlYXRlZFwiXG4gICAgLy8gdGhpcy5wYXRoID0gXCJcIjtcbiAgICAvLyBJZiB0aGlzIGdldHMgc2VudCBvdmVyIEREUCwgZG9uJ3QgZ2l2ZSBmdWxsIGludGVybmFsIGRldGFpbHMgYnV0IGF0IGxlYXN0XG4gICAgLy8gcHJvdmlkZSBzb21ldGhpbmcgYmV0dGVyIHRoYW4gNTAwIEludGVybmFsIHNlcnZlciBlcnJvci5cbiAgLy8gICB0aGlzLnNhbml0aXplZEVycm9yID0gbmV3IE1ldGVvci5FcnJvcig0MDAsIFwiTWF0Y2ggZmFpbGVkXCIpO1xuICAvLyB9KSxcblxuICAvLyBUZXN0cyB0byBzZWUgaWYgdmFsdWUgbWF0Y2hlcyBwYXR0ZXJuLiBVbmxpa2UgY2hlY2ssIGl0IG1lcmVseSByZXR1cm5zIHRydWVcbiAgLy8gb3IgZmFsc2UgKHVubGVzcyBhbiBlcnJvciBvdGhlciB0aGFuIE1hdGNoLkVycm9yIHdhcyB0aHJvd24pLlxuICB0ZXN0OiBmdW5jdGlvbiAodmFsdWUsIHBhdHRlcm4pIHtcbiAgICB0cnkge1xuICAgICAgY2hlY2tTdWJ0cmVlKHZhbHVlLCBwYXR0ZXJuKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChlIGluc3RhbmNlb2YgTWF0Y2guRXJyb3IpXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIC8vIFJldGhyb3cgb3RoZXIgZXJyb3JzLlxuICAgICAgdGhyb3cgZTtcbiAgICB9XG4gIH1cbn07XG5cbmZ1bmN0aW9uIE9wdGlvbmFsKHBhdHRlcm4pIHtcbiAgdGhpcy5wYXR0ZXJuID0gcGF0dGVybjtcbn07XG5cbmZ1bmN0aW9uIE9uZU9mKGNob2ljZXMpIHtcbiAgaWYgKGNob2ljZXMubGVuZ3RoID09IDApXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTXVzdCBwcm92aWRlIGF0IGxlYXN0IG9uZSBjaG9pY2UgdG8gTWF0Y2guT25lT2ZcIik7XG4gIHRoaXMuY2hvaWNlcyA9IGNob2ljZXM7XG59O1xuXG5mdW5jdGlvbiBXaGVyZShjb25kaXRpb24pIHtcbiAgdGhpcy5jb25kaXRpb24gPSBjb25kaXRpb247XG59O1xuXG5mdW5jdGlvbiBPYmplY3RJbmNsdWRpbmcocGF0dGVybikge1xuICB0aGlzLnBhdHRlcm4gPSBwYXR0ZXJuO1xufTtcblxuZnVuY3Rpb24gT2JqZWN0SGFzaChwYXR0ZXJuKSB7XG4gIHRoaXMucGF0dGVybiA9IHBhdHRlcm47XG59O1xuXG5mdW5jdGlvbiBTdWJjbGFzcyhTdXBlcmNsYXNzLCBtYXRjaFN1cGVyY2xhc3NUb28pIHtcbiAgdGhpcy5TdXBlcmNsYXNzID0gU3VwZXJjbGFzcztcbiAgdGhpcy5tYXRjaFN1cGVyY2xhc3MgPSBtYXRjaFN1cGVyY2xhc3NUb287XG59O1xuXG52YXIgdHlwZW9mQ2hlY2tzID0gW1xuICBbU3RyaW5nLCBcInN0cmluZ1wiXSxcbiAgW051bWJlciwgXCJudW1iZXJcIl0sXG4gIFtCb29sZWFuLCBcImJvb2xlYW5cIl0sXG4gIC8vIFdoaWxlIHdlIGRvbid0IGFsbG93IHVuZGVmaW5lZCBpbiBKU09OLCB0aGlzIGlzIGdvb2QgZm9yIG9wdGlvbmFsXG4gIC8vIGFyZ3VtZW50cyB3aXRoIE9uZU9mLlxuICBbdW5kZWZpbmVkLCBcInVuZGVmaW5lZFwiXVxuXTtcblxuZnVuY3Rpb24gY2hlY2tTdWJ0cmVlKHZhbHVlLCBwYXR0ZXJuKSB7XG4gIC8vIE1hdGNoIGFueXRoaW5nIVxuICBpZiAocGF0dGVybiA9PT0gTWF0Y2guQW55KVxuICAgIHJldHVybjtcblxuICAvLyBCYXNpYyBhdG9taWMgdHlwZXMuXG4gIC8vIERvIG5vdCBtYXRjaCBib3hlZCBvYmplY3RzIChlLmcuIFN0cmluZywgQm9vbGVhbilcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0eXBlb2ZDaGVja3MubGVuZ3RoOyArK2kpIHtcbiAgICBpZiAocGF0dGVybiA9PT0gdHlwZW9mQ2hlY2tzW2ldWzBdKSB7XG4gICAgICBpZiAodHlwZW9mIHZhbHVlID09PSB0eXBlb2ZDaGVja3NbaV1bMV0pXG4gICAgICAgIHJldHVybjtcbiAgICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIFwiICsgdHlwZW9mQ2hlY2tzW2ldWzFdICsgXCIsIGdvdCBcIiArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZW9mIHZhbHVlKTtcbiAgICB9XG4gIH1cbiAgaWYgKHBhdHRlcm4gPT09IG51bGwpIHtcbiAgICBpZiAodmFsdWUgPT09IG51bGwpXG4gICAgICByZXR1cm47XG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgbnVsbCwgZ290IFwiICsgSlNPTi5zdHJpbmdpZnkodmFsdWUpKTtcbiAgfVxuXG4gIC8vIE1hdGNoLkludGVnZXIgaXMgc3BlY2lhbCB0eXBlIGVuY29kZWQgd2l0aCBhcnJheVxuICBpZiAocGF0dGVybiA9PT0gTWF0Y2guSW50ZWdlcikge1xuICAgIC8vIFRoZXJlIGlzIG5vIGNvbnNpc3RlbnQgYW5kIHJlbGlhYmxlIHdheSB0byBjaGVjayBpZiB2YXJpYWJsZSBpcyBhIDY0LWJpdFxuICAgIC8vIGludGVnZXIuIE9uZSBvZiB0aGUgcG9wdWxhciBzb2x1dGlvbnMgaXMgdG8gZ2V0IHJlbWluZGVyIG9mIGRpdmlzaW9uIGJ5IDFcbiAgICAvLyBidXQgdGhpcyBtZXRob2QgZmFpbHMgb24gcmVhbGx5IGxhcmdlIGZsb2F0cyB3aXRoIGJpZyBwcmVjaXNpb24uXG4gICAgLy8gRS5nLjogMS4zNDgxOTIzMDg0OTE4MjRlKzIzICUgMSA9PT0gMCBpbiBWOFxuICAgIC8vIEJpdHdpc2Ugb3BlcmF0b3JzIHdvcmsgY29uc2lzdGFudGx5IGJ1dCBhbHdheXMgY2FzdCB2YXJpYWJsZSB0byAzMi1iaXRcbiAgICAvLyBzaWduZWQgaW50ZWdlciBhY2NvcmRpbmcgdG8gSmF2YVNjcmlwdCBzcGVjcy5cbiAgICBpZiAodHlwZW9mIHZhbHVlID09PSBcIm51bWJlclwiICYmICh2YWx1ZSB8IDApID09PSB2YWx1ZSlcbiAgICAgIHJldHVyblxuICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIEludGVnZXIsIGdvdCBcIlxuICAgICAgICAgICAgICAgICsgKHZhbHVlIGluc3RhbmNlb2YgT2JqZWN0ID8gSlNPTi5zdHJpbmdpZnkodmFsdWUpIDogdmFsdWUpKTtcbiAgfVxuXG4gIC8vIFwiT2JqZWN0XCIgaXMgc2hvcnRoYW5kIGZvciBNYXRjaC5PYmplY3RJbmNsdWRpbmcoe30pO1xuICBpZiAocGF0dGVybiA9PT0gT2JqZWN0KVxuICAgIHBhdHRlcm4gPSBNYXRjaC5PYmplY3RJbmNsdWRpbmcoe30pO1xuXG4gIC8vIEFycmF5IChjaGVja2VkIEFGVEVSIEFueSwgd2hpY2ggaXMgaW1wbGVtZW50ZWQgYXMgYW4gQXJyYXkpLlxuICBpZiAocGF0dGVybiBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgaWYgKHBhdHRlcm4ubGVuZ3RoICE9PSAxKVxuICAgICAgdGhyb3cgRXJyb3IoXCJCYWQgcGF0dGVybjogYXJyYXlzIG11c3QgaGF2ZSBvbmUgdHlwZSBlbGVtZW50XCIgK1xuICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkocGF0dGVybikpO1xuICAgIGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIGFycmF5LCBnb3QgXCIgKyBKU09OLnN0cmluZ2lmeSh2YWx1ZSkpO1xuICAgIH1cblxuICAgIHZhbHVlLmZvckVhY2goZnVuY3Rpb24gKHZhbHVlRWxlbWVudCwgaW5kZXgpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNoZWNrU3VidHJlZSh2YWx1ZUVsZW1lbnQsIHBhdHRlcm5bMF0pO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIGlmIChlcnIgaW5zdGFuY2VvZiBNYXRjaC5FcnJvcikge1xuICAgICAgICAgIGVyci5wYXRoID0gX3ByZXBlbmRQYXRoKGluZGV4LCBlcnIucGF0aCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIEFyYml0cmFyeSB2YWxpZGF0aW9uIGNoZWNrcy4gVGhlIGNvbmRpdGlvbiBjYW4gcmV0dXJuIGZhbHNlIG9yIHRocm93IGFcbiAgLy8gTWF0Y2guRXJyb3IgKGllLCBpdCBjYW4gaW50ZXJuYWxseSB1c2UgY2hlY2soKSkgdG8gZmFpbC5cbiAgaWYgKHBhdHRlcm4gaW5zdGFuY2VvZiBXaGVyZSkge1xuICAgIGlmIChwYXR0ZXJuLmNvbmRpdGlvbih2YWx1ZSkpXG4gICAgICByZXR1cm47XG4gICAgLy8gWFhYIHRoaXMgZXJyb3IgaXMgdGVycmlibGVcbiAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJGYWlsZWQgTWF0Y2guV2hlcmUgdmFsaWRhdGlvblwiKTtcbiAgfVxuXG5cbiAgaWYgKHBhdHRlcm4gaW5zdGFuY2VvZiBPcHRpb25hbClcbiAgICBwYXR0ZXJuID0gTWF0Y2guT25lT2YodW5kZWZpbmVkLCBwYXR0ZXJuLnBhdHRlcm4pO1xuXG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgT25lT2YpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhdHRlcm4uY2hvaWNlcy5sZW5ndGg7ICsraSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY2hlY2tTdWJ0cmVlKHZhbHVlLCBwYXR0ZXJuLmNob2ljZXNbaV0pO1xuICAgICAgICAvLyBObyBlcnJvcj8gWWF5LCByZXR1cm4uXG4gICAgICAgIHJldHVybjtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAvLyBPdGhlciBlcnJvcnMgc2hvdWxkIGJlIHRocm93bi4gTWF0Y2ggZXJyb3JzIGp1c3QgbWVhbiB0cnkgYW5vdGhlclxuICAgICAgICAvLyBjaG9pY2UuXG4gICAgICAgIGlmICghKGVyciBpbnN0YW5jZW9mIE1hdGNoLkVycm9yKSlcbiAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIFhYWCB0aGlzIGVycm9yIGlzIHRlcnJpYmxlXG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRmFpbGVkIE1hdGNoLk9uZU9mIG9yIE1hdGNoLk9wdGlvbmFsIHZhbGlkYXRpb25cIik7XG4gIH1cblxuICAvLyBBIGZ1bmN0aW9uIHRoYXQgaXNuJ3Qgc29tZXRoaW5nIHdlIHNwZWNpYWwtY2FzZSBpcyBhc3N1bWVkIHRvIGJlIGFcbiAgLy8gY29uc3RydWN0b3IuXG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBwYXR0ZXJuKVxuICAgICAgcmV0dXJuO1xuICAgIC8vIFhYWCB3aGF0IGlmIC5uYW1lIGlzbid0IGRlZmluZWRcbiAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJFeHBlY3RlZCBcIiArIHBhdHRlcm4uY29uc3RydWN0b3IubmFtZSk7XG4gIH1cblxuICB2YXIgdW5rbm93bktleXNBbGxvd2VkID0gZmFsc2U7XG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgT2JqZWN0SW5jbHVkaW5nKSB7XG4gICAgdW5rbm93bktleXNBbGxvd2VkID0gdHJ1ZTtcbiAgICBwYXR0ZXJuID0gcGF0dGVybi5wYXR0ZXJuO1xuICB9XG5cbiAgaWYgKHBhdHRlcm4gaW5zdGFuY2VvZiBPYmplY3RIYXNoKSB7XG4gICAgdmFyIGtleVBhdHRlcm4gPSBwYXR0ZXJuLnBhdHRlcm47XG4gICAgdmFyIGVtcHR5SGFzaCA9IHRydWU7XG4gICAgZm9yICh2YXIga2V5IGluIHZhbHVlKSB7XG4gICAgICBlbXB0eUhhc2ggPSBmYWxzZTtcbiAgICAgIGNoZWNrKHZhbHVlW2tleV0sIGtleVBhdHRlcm4pO1xuICAgIH1cbiAgICBpZiAoZW1wdHlIYXNoKVxuICAgICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgXCIgKyBwYXR0ZXJuLmNvbnN0cnVjdG9yLm5hbWUpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgU3ViY2xhc3MpIHtcbiAgICB2YXIgU3VwZXJjbGFzcyA9IHBhdHRlcm4uU3VwZXJjbGFzcztcbiAgICBpZiAocGF0dGVybi5tYXRjaFN1cGVyY2xhc3MgJiYgdmFsdWUgPT0gU3VwZXJjbGFzcykgXG4gICAgICByZXR1cm47XG4gICAgaWYgKCEgKHZhbHVlLnByb3RvdHlwZSBpbnN0YW5jZW9mIFN1cGVyY2xhc3MpKVxuICAgICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgXCIgKyBwYXR0ZXJuLmNvbnN0cnVjdG9yLm5hbWUgKyBcIiBvZiBcIiArIFN1cGVyY2xhc3MubmFtZSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBwYXR0ZXJuICE9PSBcIm9iamVjdFwiKVxuICAgIHRocm93IEVycm9yKFwiQmFkIHBhdHRlcm46IHVua25vd24gcGF0dGVybiB0eXBlXCIpO1xuXG4gIC8vIEFuIG9iamVjdCwgd2l0aCByZXF1aXJlZCBhbmQgb3B0aW9uYWwga2V5cy4gTm90ZSB0aGF0IHRoaXMgZG9lcyBOT1QgZG9cbiAgLy8gc3RydWN0dXJhbCBtYXRjaGVzIGFnYWluc3Qgb2JqZWN0cyBvZiBzcGVjaWFsIHR5cGVzIHRoYXQgaGFwcGVuIHRvIG1hdGNoXG4gIC8vIHRoZSBwYXR0ZXJuOiB0aGlzIHJlYWxseSBuZWVkcyB0byBiZSBhIHBsYWluIG9sZCB7T2JqZWN0fSFcbiAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ29iamVjdCcpXG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgb2JqZWN0LCBnb3QgXCIgKyB0eXBlb2YgdmFsdWUpO1xuICBpZiAodmFsdWUgPT09IG51bGwpXG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgb2JqZWN0LCBnb3QgbnVsbFwiKTtcblxuICB2YXIgcmVxdWlyZWRQYXR0ZXJucyA9IHt9O1xuICB2YXIgb3B0aW9uYWxQYXR0ZXJucyA9IHt9O1xuXG4gIF8uZWFjaEtleShwYXR0ZXJuLCBmdW5jdGlvbihzdWJQYXR0ZXJuLCBrZXkpIHtcbiAgICBpZiAocGF0dGVybltrZXldIGluc3RhbmNlb2YgT3B0aW9uYWwpXG4gICAgICBvcHRpb25hbFBhdHRlcm5zW2tleV0gPSBwYXR0ZXJuW2tleV0ucGF0dGVybjtcbiAgICBlbHNlXG4gICAgICByZXF1aXJlZFBhdHRlcm5zW2tleV0gPSBwYXR0ZXJuW2tleV07XG4gIH0sIHRoaXMsIHRydWUpO1xuXG4gIF8uZWFjaEtleSh2YWx1ZSwgZnVuY3Rpb24oc3ViVmFsdWUsIGtleSkge1xuICAgIHZhciBzdWJWYWx1ZSA9IHZhbHVlW2tleV07XG4gICAgdHJ5IHtcbiAgICAgIGlmIChyZXF1aXJlZFBhdHRlcm5zLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgY2hlY2tTdWJ0cmVlKHN1YlZhbHVlLCByZXF1aXJlZFBhdHRlcm5zW2tleV0pO1xuICAgICAgICBkZWxldGUgcmVxdWlyZWRQYXR0ZXJuc1trZXldO1xuICAgICAgfSBlbHNlIGlmIChvcHRpb25hbFBhdHRlcm5zLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgY2hlY2tTdWJ0cmVlKHN1YlZhbHVlLCBvcHRpb25hbFBhdHRlcm5zW2tleV0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKCF1bmtub3duS2V5c0FsbG93ZWQpXG4gICAgICAgICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiVW5rbm93biBrZXlcIik7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBpZiAoZXJyIGluc3RhbmNlb2YgTWF0Y2guRXJyb3IpXG4gICAgICAgIGVyci5wYXRoID0gX3ByZXBlbmRQYXRoKGtleSwgZXJyLnBhdGgpO1xuICAgICAgdGhyb3cgZXJyO1xuICAgIH1cbiAgfSwgdGhpcywgdHJ1ZSk7XG5cbiAgXy5lYWNoS2V5KHJlcXVpcmVkUGF0dGVybnMsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJNaXNzaW5nIGtleSAnXCIgKyBrZXkgKyBcIidcIik7XG4gIH0sIHRoaXMsIHRydWUpO1xufTtcblxuXG52YXIgX2pzS2V5d29yZHMgPSBbXCJkb1wiLCBcImlmXCIsIFwiaW5cIiwgXCJmb3JcIiwgXCJsZXRcIiwgXCJuZXdcIiwgXCJ0cnlcIiwgXCJ2YXJcIiwgXCJjYXNlXCIsXG4gIFwiZWxzZVwiLCBcImVudW1cIiwgXCJldmFsXCIsIFwiZmFsc2VcIiwgXCJudWxsXCIsIFwidGhpc1wiLCBcInRydWVcIiwgXCJ2b2lkXCIsIFwid2l0aFwiLFxuICBcImJyZWFrXCIsIFwiY2F0Y2hcIiwgXCJjbGFzc1wiLCBcImNvbnN0XCIsIFwic3VwZXJcIiwgXCJ0aHJvd1wiLCBcIndoaWxlXCIsIFwieWllbGRcIixcbiAgXCJkZWxldGVcIiwgXCJleHBvcnRcIiwgXCJpbXBvcnRcIiwgXCJwdWJsaWNcIiwgXCJyZXR1cm5cIiwgXCJzdGF0aWNcIiwgXCJzd2l0Y2hcIixcbiAgXCJ0eXBlb2ZcIiwgXCJkZWZhdWx0XCIsIFwiZXh0ZW5kc1wiLCBcImZpbmFsbHlcIiwgXCJwYWNrYWdlXCIsIFwicHJpdmF0ZVwiLCBcImNvbnRpbnVlXCIsXG4gIFwiZGVidWdnZXJcIiwgXCJmdW5jdGlvblwiLCBcImFyZ3VtZW50c1wiLCBcImludGVyZmFjZVwiLCBcInByb3RlY3RlZFwiLCBcImltcGxlbWVudHNcIixcbiAgXCJpbnN0YW5jZW9mXCJdO1xuXG4vLyBBc3N1bWVzIHRoZSBiYXNlIG9mIHBhdGggaXMgYWxyZWFkeSBlc2NhcGVkIHByb3Blcmx5XG4vLyByZXR1cm5zIGtleSArIGJhc2VcbmZ1bmN0aW9uIF9wcmVwZW5kUGF0aChrZXksIGJhc2UpIHtcbiAgaWYgKCh0eXBlb2Yga2V5KSA9PT0gXCJudW1iZXJcIiB8fCBrZXkubWF0Y2goL15bMC05XSskLykpXG4gICAga2V5ID0gXCJbXCIgKyBrZXkgKyBcIl1cIjtcbiAgZWxzZSBpZiAoIWtleS5tYXRjaCgvXlthLXpfJF1bMC05YS16XyRdKiQvaSkgfHwgX2pzS2V5d29yZHMuaW5kZXhPZihrZXkpICE9IC0xKVxuICAgIGtleSA9IEpTT04uc3RyaW5naWZ5KFtrZXldKTtcblxuICBpZiAoYmFzZSAmJiBiYXNlWzBdICE9PSBcIltcIilcbiAgICByZXR1cm4ga2V5ICsgJy4nICsgYmFzZTtcbiAgcmV0dXJuIGtleSArIGJhc2U7XG59O1xuXG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgnbW9sLXByb3RvJyk7XG5cblxuLy8gbW9kdWxlIGV4cG9ydHMgZXJyb3IgY2xhc3NlcyBmb3IgYWxsIG5hbWVzIGRlZmluZWQgaW4gdGhpcyBhcnJheVxudmFyIGVycm9yQ2xhc3NOYW1lcyA9IFsnQWJzdHJhY3RDbGFzcycsICdNaXhpbicsICdNZXNzZW5nZXInLCAnQ29tcG9uZW50RGF0YVNvdXJjZScsXG5cdFx0XHRcdFx0ICAgJ0F0dHJpYnV0ZScsICdCaW5kZXInLCAnTG9hZGVyJywgJ01haWxNZXNzYWdlU291cmNlJ107XG5cbnZhciBlcnJvciA9IHtcblx0dG9CZUltcGxlbWVudGVkOiB0b0JlSW1wbGVtZW50ZWQsXG5cdGNyZWF0ZUNsYXNzOiBjcmVhdGVFcnJvckNsYXNzXG59O1xuXG5lcnJvckNsYXNzTmFtZXMuZm9yRWFjaChmdW5jdGlvbihuYW1lKSB7XG5cdGVycm9yW25hbWVdID0gY3JlYXRlRXJyb3JDbGFzcyhuYW1lICsgJ0Vycm9yJyk7XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBlcnJvcjtcblxuXG5mdW5jdGlvbiBjcmVhdGVFcnJvckNsYXNzKGVycm9yQ2xhc3NOYW1lKSB7XG5cdHZhciBFcnJvckNsYXNzO1xuXHRldmFsKCdFcnJvckNsYXNzID0gZnVuY3Rpb24gJyArIGVycm9yQ2xhc3NOYW1lICsgJyhtZXNzYWdlKSB7IFxcXG5cdFx0XHR0aGlzLm5hbWUgPSBcIicgKyBlcnJvckNsYXNzTmFtZSArICdcIjsgXFxcblx0XHRcdHRoaXMubWVzc2FnZSA9IG1lc3NhZ2UgfHwgXCJUaGVyZSB3YXMgYW4gZXJyb3JcIjsgXFxcblx0XHR9Jyk7XG5cdF8ubWFrZVN1YmNsYXNzKEVycm9yQ2xhc3MsIEVycm9yKTtcblxuXHRyZXR1cm4gRXJyb3JDbGFzcztcbn1cblxuXG5mdW5jdGlvbiB0b0JlSW1wbGVtZW50ZWQoKSB7XG5cdHRocm93IG5ldyBlcnJvci5BYnN0cmFjdENsYXNzKCdjYWxsaW5nIHRoZSBtZXRob2Qgb2YgYW4gYWJzY3RyYWN0IGNsYXNzIE1lc3NhZ2VTb3VyY2UnKTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWwgPSB7XG5cdGxvZ2dlcjogcmVxdWlyZSgnLi9sb2dnZXInKSxcblx0cmVxdWVzdDogcmVxdWlyZSgnLi9yZXF1ZXN0JyksXG5cdGNoZWNrOiByZXF1aXJlKCcuL2NoZWNrJyksXG5cdGVycm9yOiByZXF1aXJlKCcuL2Vycm9yJylcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gdXRpbDtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIExvZ2dlciA9IHJlcXVpcmUoJy4vbG9nZ2VyX2NsYXNzJyk7XG5cbnZhciBsb2dnZXIgPSBuZXcgTG9nZ2VyKHsgbGV2ZWw6IDMgfSk7XG5cbm1vZHVsZS5leHBvcnRzID0gbG9nZ2VyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpO1xuXG5cbi8qKlxuICogTG9nIGxldmVscy5cbiAqL1xuXG52YXIgbGV2ZWxzID0gW1xuICAgICdlcnJvcicsXG4gICAgJ3dhcm4nLFxuICAgICdpbmZvJyxcbiAgICAnZGVidWcnXG5dO1xuXG52YXIgbWF4TGV2ZWxMZW5ndGggPSBNYXRoLm1heC5hcHBseShNYXRoLCBsZXZlbHMubWFwKGZ1bmN0aW9uKGxldmVsKSB7IHJldHVybiBsZXZlbC5sZW5ndGg7IH0pKTtcblxuLyoqXG4gKiBDb2xvcnMgZm9yIGxvZyBsZXZlbHMuXG4gKi9cblxudmFyIGNvbG9ycyA9IFtcbiAgICAzMSxcbiAgICAzMyxcbiAgICAzNixcbiAgICA5MFxuXTtcblxuLyoqXG4gKiBQYWRzIHRoZSBuaWNlIG91dHB1dCB0byB0aGUgbG9uZ2VzdCBsb2cgbGV2ZWwuXG4gKi9cblxuZnVuY3Rpb24gcGFkIChzdHIpIHtcbiAgICBpZiAoc3RyLmxlbmd0aCA8IG1heExldmVsTGVuZ3RoKVxuICAgICAgICByZXR1cm4gc3RyICsgbmV3IEFycmF5KG1heExldmVsTGVuZ3RoIC0gc3RyLmxlbmd0aCArIDEpLmpvaW4oJyAnKTtcblxuICAgIHJldHVybiBzdHI7XG59O1xuXG4vKipcbiAqIExvZ2dlciAoY29uc29sZSkuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG52YXIgTG9nZ2VyID0gZnVuY3Rpb24gKG9wdHMpIHtcbiAgICBvcHRzID0gb3B0cyB8fCB7fVxuICAgIHRoaXMuY29sb3JzID0gb3B0cy5jb2xvcnM7XG4gICAgdGhpcy5sZXZlbCA9IG9wdHMubGV2ZWwgfHwgMztcbiAgICB0aGlzLmVuYWJsZWQgPSBvcHRzLmVuYWJsZWQgfHwgdHJ1ZTtcbiAgICB0aGlzLmxvZ1ByZWZpeCA9IG9wdHMubG9nUHJlZml4IHx8ICcnO1xuICAgIHRoaXMubG9nUHJlZml4Q29sb3IgPSBvcHRzLmxvZ1ByZWZpeENvbG9yO1xufTtcblxuXG4vKipcbiAqIExvZyBtZXRob2QuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5Mb2dnZXIucHJvdG90eXBlLmxvZyA9IGZ1bmN0aW9uICh0eXBlKSB7XG4gICAgdmFyIGluZGV4ID0gbGV2ZWxzLmluZGV4T2YodHlwZSk7XG5cbiAgICBpZiAoaW5kZXggPiB0aGlzLmxldmVsIHx8ICEgdGhpcy5lbmFibGVkKVxuICAgICAgICByZXR1cm4gdGhpcztcblxuICAgIGNvbnNvbGUubG9nLmFwcGx5KFxuICAgICAgICAgIGNvbnNvbGVcbiAgICAgICAgLCBbdGhpcy5sb2dQcmVmaXhDb2xvclxuICAgICAgICAgICAgID8gJyAgIFxceDFCWycgKyB0aGlzLmxvZ1ByZWZpeENvbG9yICsgJ20nICsgdGhpcy5sb2dQcmVmaXggKyAnICAtXFx4MUJbMzltJ1xuICAgICAgICAgICAgIDogdGhpcy5sb2dQcmVmaXhcbiAgICAgICAgICAsdGhpcy5jb2xvcnNcbiAgICAgICAgICAgICA/ICcgXFx4MUJbJyArIGNvbG9yc1tpbmRleF0gKyAnbScgKyBwYWQodHlwZSkgKyAnIC1cXHgxQlszOW0nXG4gICAgICAgICAgICAgOiB0eXBlICsgJzonXG4gICAgICAgICAgXS5jb25jYXQoXy50b0FycmF5KGFyZ3VtZW50cykuc2xpY2UoMSkpXG4gICAgKTtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBHZW5lcmF0ZSBtZXRob2RzLlxuICovXG5cbmxldmVscy5mb3JFYWNoKGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgTG9nZ2VyLnByb3RvdHlwZVtuYW1lXSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5sb2cuYXBwbHkodGhpcywgW25hbWVdLmNvbmNhdChfLnRvQXJyYXkoYXJndW1lbnRzKSkpO1xuICAgIH07XG59KTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IExvZ2dlcjtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKTtcblxubW9kdWxlLmV4cG9ydHMgPSByZXF1ZXN0O1xuXG5cbi8vIFRPRE8gYWRkIGVycm9yIHN0YXR1c2VzXG52YXIgb2tTdGF0dXNlcyA9IFsnMjAwJywgJzMwNCddO1xuXG5cbmZ1bmN0aW9uIHJlcXVlc3QodXJsLCBvcHRzLCBjYWxsYmFjaykge1xuXHR2YXIgcmVxID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cdHJlcS5vcGVuKG9wdHMubWV0aG9kLCB1cmwsIHRydWUpOyAvLyB3aGF0IHRydWUgbWVhbnM/XG5cdHJlcS5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG5cdFx0aWYgKHJlcS5yZWFkeVN0YXRlID09IDQgJiYgcmVxLnN0YXR1c1RleHQudG9VcHBlckNhc2UoKSA9PSAnT0snIClcblx0XHRcdGNhbGxiYWNrKG51bGwsIHJlcS5yZXNwb25zZVRleHQsIHJlcSk7XG5cdFx0Ly8gZWxzZVxuXHRcdC8vIFx0Y2FsbGJhY2socmVxLnN0YXR1cywgcmVxLnJlc3BvbnNlVGV4dCwgcmVxKTtcblx0fTtcblx0cmVxLnNlbmQobnVsbCk7XG59XG5cbl8uZXh0ZW5kKHJlcXVlc3QsIHtcblx0Z2V0OiBnZXRcbn0pO1xuXG5cbmZ1bmN0aW9uIGdldCh1cmwsIGNhbGxiYWNrKSB7XG5cdHJlcXVlc3QodXJsLCB7IG1ldGhvZDogJ0dFVCcgfSwgY2FsbGJhY2spO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXztcbnZhciBwcm90byA9IF8gPSB7XG5cdGV4dGVuZFByb3RvOiBleHRlbmRQcm90byxcblx0Y3JlYXRlU3ViY2xhc3M6IGNyZWF0ZVN1YmNsYXNzLFxuXHRtYWtlU3ViY2xhc3M6IG1ha2VTdWJjbGFzcyxcblx0ZXh0ZW5kOiBleHRlbmQsXG5cdGNsb25lOiBjbG9uZSxcblx0ZGVlcEV4dGVuZDogZGVlcEV4dGVuZCxcblx0YWxsS2V5czogT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMuYmluZChPYmplY3QpLFxuXHRrZXlPZjoga2V5T2YsXG5cdGFsbEtleXNPZjogYWxsS2V5c09mLFxuXHRlYWNoS2V5OiBlYWNoS2V5LFxuXHRtYXBLZXlzOiBtYXBLZXlzLFxuXHRhcHBlbmRBcnJheTogYXBwZW5kQXJyYXksXG5cdHByZXBlbmRBcnJheTogcHJlcGVuZEFycmF5LFxuXHR0b0FycmF5OiB0b0FycmF5LFxuXHRmaXJzdFVwcGVyQ2FzZTogZmlyc3RVcHBlckNhc2UsXG5cdGZpcnN0TG93ZXJDYXNlOiBmaXJzdExvd2VyQ2FzZVxufTtcblxuXG5pZiAodHlwZW9mIHdpbmRvdyA9PSAnb2JqZWN0Jykge1xuXHQvLyBwcmVzZXJ2ZSBleGlzdGluZyBfIG9iamVjdFxuXHRpZiAod2luZG93Ll8pXG5cdFx0cHJvdG8udW5kZXJzY29yZSA9IHdpbmRvdy5fXG5cblx0Ly8gZXhwb3NlIGdsb2JhbCBfXG5cdHdpbmRvdy5fID0gcHJvdG87XG59XG5cbmlmICh0eXBlb2YgbW9kdWxlID09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKVxuXHQvLyBleHBvcnQgZm9yIG5vZGUvYnJvd3NlcmlmeVxuXHRtb2R1bGUuZXhwb3J0cyA9IHByb3RvO1xuXHRcblxuZnVuY3Rpb24gZXh0ZW5kUHJvdG8oc2VsZiwgbWV0aG9kcykge1xuXHR2YXIgcHJvcERlc2NyaXB0b3JzID0ge307XG5cblx0Xy5lYWNoS2V5KG1ldGhvZHMsIGZ1bmN0aW9uKG1ldGhvZCwgbmFtZSkge1xuXHRcdHByb3BEZXNjcmlwdG9yc1tuYW1lXSA9IHtcblx0XHRcdGVudW1lcmFibGU6IGZhbHNlLFxuXHRcdFx0Y29uZmlndXJhYmxlOiBmYWxzZSxcblx0XHRcdHdyaXRhYmxlOiBmYWxzZSxcblx0XHRcdHZhbHVlOiBtZXRob2Rcblx0XHR9O1xuXHR9KTtcblxuXHRPYmplY3QuZGVmaW5lUHJvcGVydGllcyhzZWxmLnByb3RvdHlwZSwgcHJvcERlc2NyaXB0b3JzKTtcblx0cmV0dXJuIHNlbGY7XG59XG5cblxuZnVuY3Rpb24gZXh0ZW5kKHNlbGYsIG9iaiwgb25seUVudW1lcmFibGUpIHtcblx0dmFyIHByb3BEZXNjcmlwdG9ycyA9IHt9O1xuXG5cdF8uZWFjaEtleShvYmosIGZ1bmN0aW9uKHZhbHVlLCBwcm9wKSB7XG5cdFx0dmFyIGRlc2NyaXB0b3IgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG9iaiwgcHJvcCk7XG5cdFx0cHJvcERlc2NyaXB0b3JzW3Byb3BdID0gZGVzY3JpcHRvcjtcblx0fSwgdGhpcywgb25seUVudW1lcmFibGUpO1xuXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHNlbGYsIHByb3BEZXNjcmlwdG9ycyk7XG5cblx0cmV0dXJuIHNlbGY7XG59XG5cblxuZnVuY3Rpb24gZGVlcEV4dGVuZChzZWxmLCBvYmosIG9ubHlFbnVtZXJhYmxlKSB7XG5cdHJldHVybiBfZXh0ZW5kVHJlZShzZWxmLCBvYmosIG9ubHlFbnVtZXJhYmxlLCBbXSk7XG59XG5cblxuZnVuY3Rpb24gX2V4dGVuZFRyZWUoc2VsZk5vZGUsIG9iak5vZGUsIG9ubHlFbnVtZXJhYmxlLCBvYmpUcmF2ZXJzZWQpIHtcblx0aWYgKG9ialRyYXZlcnNlZC5pbmRleE9mKG9iak5vZGUpID49IDApIHJldHVybjsgLy8gbm9kZSBhbHJlYWR5IHRyYXZlcnNlZFxuXHRvYmpUcmF2ZXJzZWQucHVzaChvYmpOb2RlKTtcblxuXHRfLmVhY2hLZXkob2JqTm9kZSwgZnVuY3Rpb24odmFsdWUsIHByb3ApIHtcblx0XHR2YXIgZGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Iob2JqTm9kZSwgcHJvcCk7XG5cdFx0aWYgKHR5cGVvZiB2YWx1ZSA9PSAnb2JqZWN0Jykge1xuXHRcdFx0aWYgKHNlbGZOb2RlLmhhc093blByb3BlcnR5KHByb3ApICYmIHR5cGVvZiBzZWxmTm9kZVtwcm9wXSA9PSAnb2JqZWN0Jylcblx0XHRcdFx0X2V4dGVuZFRyZWUoc2VsZk5vZGVbcHJvcF0sIHZhbHVlLCBvbmx5RW51bWVyYWJsZSwgb2JqVHJhdmVyc2VkKVxuXHRcdFx0ZWxzZVxuXHRcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoc2VsZk5vZGUsIHByb3AsIGRlc2NyaXB0b3IpO1xuXHRcdH0gZWxzZVxuXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHNlbGZOb2RlLCBwcm9wLCBkZXNjcmlwdG9yKTtcblx0fSwgdGhpcywgb25seUVudW1lcmFibGUpO1xuXG5cdHJldHVybiBzZWxmTm9kZTtcbn1cblxuXG5mdW5jdGlvbiBjbG9uZShvYmopIHtcblx0dmFyIGNsb25lZE9iamVjdCA9IE9iamVjdC5jcmVhdGUob2JqLmNvbnN0cnVjdG9yLnByb3RvdHlwZSk7XG5cdF8uZXh0ZW5kKGNsb25lZE9iamVjdCwgb2JqKTtcblx0cmV0dXJuIGNsb25lZE9iamVjdDtcbn1cblxuXG5mdW5jdGlvbiBjcmVhdGVTdWJjbGFzcyh0aGlzQ2xhc3MsIG5hbWUsIGFwcGx5Q29uc3RydWN0b3IpIHtcblx0dmFyIHN1YmNsYXNzO1xuXG5cdC8vIG5hbWUgaXMgb3B0aW9uYWxcblx0bmFtZSA9IG5hbWUgfHwgJyc7XG5cblx0Ly8gYXBwbHkgc3VwZXJjbGFzcyBjb25zdHJ1Y3RvclxuXHR2YXIgY29uc3RydWN0b3JDb2RlID0gYXBwbHlDb25zdHJ1Y3RvciA9PT0gZmFsc2Vcblx0XHRcdD8gJydcblx0XHRcdDogJ3RoaXNDbGFzcy5hcHBseSh0aGlzLCBhcmd1bWVudHMpOyc7XG5cblx0ZXZhbCgnc3ViY2xhc3MgPSBmdW5jdGlvbiAnICsgbmFtZSArICcoKXsgJyArIGNvbnN0cnVjdG9yQ29kZSArICcgfScpO1xuXG5cdF8ubWFrZVN1YmNsYXNzKHN1YmNsYXNzLCB0aGlzQ2xhc3MpO1xuXG5cdC8vIGNvcHkgY2xhc3MgbWV0aG9kc1xuXHQvLyAtIGZvciB0aGVtIHRvIHdvcmsgY29ycmVjdGx5IHRoZXkgc2hvdWxkIG5vdCBleHBsaWN0bHkgdXNlIHN1cGVyY2xhc3MgbmFtZVxuXHQvLyBhbmQgdXNlIFwidGhpc1wiIGluc3RlYWRcblx0Xy5leHRlbmQoc3ViY2xhc3MsIHRoaXNDbGFzcywgdHJ1ZSk7XG5cblx0cmV0dXJuIHN1YmNsYXNzO1xufVxuXG5cbmZ1bmN0aW9uIG1ha2VTdWJjbGFzcyh0aGlzQ2xhc3MsIFN1cGVyY2xhc3MpIHtcblx0Ly8gcHJvdG90eXBlIGNoYWluXG5cdHRoaXNDbGFzcy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFN1cGVyY2xhc3MucHJvdG90eXBlKTtcblx0XG5cdC8vIHN1YmNsYXNzIGlkZW50aXR5XG5cdF8uZXh0ZW5kUHJvdG8odGhpc0NsYXNzLCB7XG5cdFx0Y29uc3RydWN0b3I6IHRoaXNDbGFzc1xuXHR9KTtcblx0cmV0dXJuIHRoaXNDbGFzcztcbn1cblxuXG5mdW5jdGlvbiBrZXlPZihzZWxmLCBzZWFyY2hFbGVtZW50LCBvbmx5RW51bWVyYWJsZSkge1xuXHR2YXIgcHJvcGVydGllcyA9IG9ubHlFbnVtZXJhYmxlIFxuXHRcdFx0XHRcdFx0PyBPYmplY3Qua2V5cyhzZWxmKVxuXHRcdFx0XHRcdFx0OiBfLmFsbEtleXMoc2VsZik7XG5cblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wZXJ0aWVzLmxlbmd0aDsgaSsrKVxuXHRcdGlmIChzZWFyY2hFbGVtZW50ID09PSBzZWxmW3Byb3BlcnRpZXNbaV1dKVxuXHRcdFx0cmV0dXJuIHByb3BlcnRpZXNbaV07XG5cdFxuXHRyZXR1cm4gdW5kZWZpbmVkO1xufVxuXG5cbmZ1bmN0aW9uIGFsbEtleXNPZihzZWxmLCBzZWFyY2hFbGVtZW50LCBvbmx5RW51bWVyYWJsZSkge1xuXHR2YXIgcHJvcGVydGllcyA9IG9ubHlFbnVtZXJhYmxlIFxuXHRcdFx0XHRcdFx0PyBPYmplY3Qua2V5cyhzZWxmKVxuXHRcdFx0XHRcdFx0OiBfLmFsbEtleXMoc2VsZik7XG5cblx0dmFyIGtleXMgPSBwcm9wZXJ0aWVzLmZpbHRlcihmdW5jdGlvbihwcm9wKSB7XG5cdFx0cmV0dXJuIHNlYXJjaEVsZW1lbnQgPT09IHNlbGZbcHJvcF07XG5cdH0pO1xuXG5cdHJldHVybiBrZXlzO1xufVxuXG5cbmZ1bmN0aW9uIGVhY2hLZXkoc2VsZiwgY2FsbGJhY2ssIHRoaXNBcmcsIG9ubHlFbnVtZXJhYmxlKSB7XG5cdHZhciBwcm9wZXJ0aWVzID0gb25seUVudW1lcmFibGUgXG5cdFx0XHRcdFx0XHQ/IE9iamVjdC5rZXlzKHNlbGYpXG5cdFx0XHRcdFx0XHQ6IF8uYWxsS2V5cyhzZWxmKTtcblxuXHRwcm9wZXJ0aWVzLmZvckVhY2goZnVuY3Rpb24ocHJvcCkge1xuXHRcdGNhbGxiYWNrLmNhbGwodGhpc0FyZywgc2VsZltwcm9wXSwgcHJvcCwgc2VsZik7XG5cdH0pO1xufVxuXG5cbmZ1bmN0aW9uIG1hcEtleXMoc2VsZiwgY2FsbGJhY2ssIHRoaXNBcmcsIG9ubHlFbnVtZXJhYmxlKSB7XG5cdHZhciBtYXBSZXN1bHQgPSB7fTtcblx0Xy5lYWNoS2V5KHNlbGYsIG1hcFByb3BlcnR5LCB0aGlzQXJnLCBvbmx5RW51bWVyYWJsZSk7XG5cdHJldHVybiBtYXBSZXN1bHQ7XG5cblx0ZnVuY3Rpb24gbWFwUHJvcGVydHkodmFsdWUsIGtleSkge1xuXHRcdHZhciBkZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihzZWxmLCBrZXkpO1xuXHRcdGlmIChkZXNjcmlwdG9yLmVudW1lcmFibGUgfHwgISBvbmx5RW51bWVyYWJsZSkge1xuXHRcdFx0ZGVzY3JpcHRvci52YWx1ZSA9IGNhbGxiYWNrLmNhbGwodGhpcywgdmFsdWUsIGtleSwgc2VsZik7XG5cdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkobWFwUmVzdWx0LCBrZXksIGRlc2NyaXB0b3IpO1xuXHRcdH1cblx0fVxufVxuXG5cbmZ1bmN0aW9uIGFwcGVuZEFycmF5KHNlbGYsIGFycmF5VG9BcHBlbmQpIHtcblx0aWYgKCEgYXJyYXlUb0FwcGVuZC5sZW5ndGgpIHJldHVybiBzZWxmO1xuXG4gICAgdmFyIGFyZ3MgPSBbc2VsZi5sZW5ndGgsIDBdLmNvbmNhdChhcnJheVRvQXBwZW5kKTtcbiAgICBBcnJheS5wcm90b3R5cGUuc3BsaWNlLmFwcGx5KHNlbGYsIGFyZ3MpO1xuXG4gICAgcmV0dXJuIHNlbGY7XG59XG5cblxuZnVuY3Rpb24gcHJlcGVuZEFycmF5KHNlbGYsIGFycmF5VG9QcmVwZW5kKSB7XG5cdGlmICghIGFycmF5VG9QcmVwZW5kLmxlbmd0aCkgcmV0dXJuIHNlbGY7XG5cbiAgICB2YXIgYXJncyA9IFswLCAwXS5jb25jYXQoYXJyYXlUb1ByZXBlbmQpO1xuICAgIEFycmF5LnByb3RvdHlwZS5zcGxpY2UuYXBwbHkoc2VsZiwgYXJncyk7XG5cbiAgICByZXR1cm4gc2VsZjtcbn1cblxuXG5mdW5jdGlvbiB0b0FycmF5KGFycmF5TGlrZSkge1xuXHR2YXIgYXJyID0gW107XG5cdEFycmF5LnByb3RvdHlwZS5mb3JFYWNoLmNhbGwoYXJyYXlMaWtlLCBmdW5jdGlvbihpdGVtKSB7XG5cdFx0YXJyLnB1c2goaXRlbSlcblx0fSk7XG5cblx0cmV0dXJuIGFycjtcbn1cblxuXG5mdW5jdGlvbiBmaXJzdFVwcGVyQ2FzZShzdHIpIHtcblx0cmV0dXJuIHN0clswXS50b1VwcGVyQ2FzZSgpICsgc3RyLnNsaWNlKDEpO1xufVxuXG5cbmZ1bmN0aW9uIGZpcnN0TG93ZXJDYXNlKHN0cikge1xuXHRyZXR1cm4gc3RyWzBdLnRvTG93ZXJDYXNlKCkgKyBzdHIuc2xpY2UoMSk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmRlc2NyaWJlKCdtaWxvIGJpbmRlcicsIGZ1bmN0aW9uKCkge1xuICAgIGl0KCdzaG91bGQgYmluZCBjb21wb25lbnRzIGJhc2VkIG9uIG1sLWJpbmQgYXR0cmlidXRlJywgZnVuY3Rpb24oKSB7XG4gICAgXHR2YXIgbWlsbyA9IHJlcXVpcmUoJy4uLy4uL2xpYi9taWxvJyk7XG5cblx0XHRleHBlY3Qoe3A6IDF9KS5wcm9wZXJ0eSgncCcsIDEpO1xuXG4gICAgXHR2YXIgY3RybCA9IG1pbG8uYmluZGVyKCk7XG5cbiAgICBcdGN0cmwuYXJ0aWNsZUJ1dHRvbi5ldmVudHMub24oJ2NsaWNrIG1vdXNlZW50ZXInLCBmdW5jdGlvbihlVHlwZSwgZXZ0KSB7XG4gICAgXHRcdGNvbnNvbGUubG9nKCdidXR0b24nLCBlVHlwZSwgZXZ0KTtcbiAgICBcdH0pO1xuXG4gICAgICAgIGN0cmwubWFpbi5ldmVudHMub24oJ2NsaWNrIG1vdXNlZW50ZXIgaW5wdXQga2V5cHJlc3MnLCBmdW5jdGlvbihlVHlwZSwgZXZ0KSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZGl2JywgZVR5cGUsIGV2dCk7XG4gICAgICAgIH0pO1xuXG4gICAgXHRjdHJsLmFydGljbGVJZElucHV0LmRhdGEub24oJ2RhdGFjaGFuZ2VkJywgbG9nRGF0YSk7XG5cbiAgICBcdGZ1bmN0aW9uIGxvZ0RhdGEobWVzc2FnZSwgZGF0YSkge1xuICAgIFx0XHRjb25zb2xlLmxvZyhtZXNzYWdlLCBkYXRhKTtcbiAgICBcdH1cbiAgICBcdFxuXHRcdGNvbnNvbGUubG9nKGN0cmwpO1xuICAgIH0pO1xufSk7XG4iXX0=
;