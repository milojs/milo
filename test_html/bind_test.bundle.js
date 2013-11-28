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

},{"../util/check":29,"../util/error":30,"mol-proto":35}],2:[function(require,module,exports){
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

},{"../util/check":29,"mol-proto":35}],3:[function(require,module,exports){
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

},{"../config":20,"../util/check":29,"../util/error":30,"./index":5,"mol-proto":35}],4:[function(require,module,exports){
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
},{"../config":20,"../util/error":30,"./index":5,"mol-proto":35}],5:[function(require,module,exports){
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

},{"../util/check":29,"../util/error":30,"mol-proto":35}],6:[function(require,module,exports){
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

	return components;


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


},{"./attribute/a_bind":3,"./components/c_registry":18,"./mail":24,"./util/check":29,"./util/error":30,"mol-proto":35}],7:[function(require,module,exports){
'use strict';

var classes = {
	Facet: require('./facets/f_class'),
	Component: require('./components/c_class'),
	ComponentFacet: require('./components/c_facet'),
	ClassRegistry: require('./abstract/registry'),
	facetsRegistry: require('./components/c_facets/cf_registry'),
	componentsRegistry: require('./components/c_registry')
};

module.exports = classes;

},{"./abstract/registry":2,"./components/c_class":8,"./components/c_facet":9,"./components/c_facets/cf_registry":14,"./components/c_registry":18,"./facets/f_class":21}],8:[function(require,module,exports){
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

},{"../facets/f_object":22,"../messenger":26,"../util/check":29,"./c_facet":9,"./c_facets/cf_registry":14,"mol-proto":35}],9:[function(require,module,exports){
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

},{"../facets/f_class":21,"../messenger":26,"mol-proto":35}],10:[function(require,module,exports){
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

},{"../../binder":6,"../c_facet":9,"./cf_registry":14,"mol-proto":35}],11:[function(require,module,exports){
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

},{"../../messenger":26,"../c_facet":9,"../c_message_sources/component_data_source":15,"./cf_registry":14,"mol-proto":35}],12:[function(require,module,exports){
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

},{"../../messenger":26,"../c_facet":9,"../c_message_sources/dom_events_source":17,"./cf_registry":14,"mol-proto":35}],13:[function(require,module,exports){
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
	binder: bindInnerComponents

	// _reattach: _reattachEventsOnElementChange
});

facetsRegistry.add(Template);

module.exports = Template;


function initTemplateFacet() {
	ComponentFacet.prototype.init.apply(this, arguments);
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


function bindInnerComponents(bindToComponent) {
	var innerComponents = binder(this.owner.el);

	if (this.owner.container) // should be changed to reconcillation of existing children with new
		this.owner.container.children = innerComponents;

	return innerComponents;
}

},{"../../binder":6,"../../util/check":29,"../c_facet":9,"./cf_registry":14,"mol-proto":35}],14:[function(require,module,exports){
'use strict';

var ClassRegistry = require('../../abstract/registry')
	, ComponentFacet = require('../c_facet');

var facetsRegistry = new ClassRegistry(ComponentFacet);

facetsRegistry.add(ComponentFacet);

module.exports = facetsRegistry;

// TODO - refactor components registry test into a function
// that tests a registry with a given foundation class
// Make test for this registry based on this function
},{"../../abstract/registry":2,"../c_facet":9}],15:[function(require,module,exports){
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

},{"../../util/check":29,"../../util/error":30,"../c_class":8,"./dom_events_source":17,"mol-proto":35}],16:[function(require,module,exports){
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

},{"mol-proto":35}],17:[function(require,module,exports){
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
},{"../../messenger/message_source":27,"../../util/check":29,"../c_class":8,"./dom_events_constructors":16,"mol-proto":35}],18:[function(require,module,exports){
'use strict';

var ClassRegistry = require('../abstract/registry')
	, Component = require('./c_class');

var componentsRegistry = new ClassRegistry(Component);

componentsRegistry.add(Component);

module.exports = componentsRegistry;

},{"../abstract/registry":2,"./c_class":8}],19:[function(require,module,exports){
'use strict';

var Component = require('../c_class')
	, componentsRegistry = require('../c_registry');


var View = Component.createComponentClass('View', ['container']);

componentsRegistry.add(View);

module.exports = View;

},{"../c_class":8,"../c_registry":18}],20:[function(require,module,exports){
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

},{"mol-proto":35}],21:[function(require,module,exports){
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

},{"mol-proto":35}],22:[function(require,module,exports){
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


},{"../util/check":29,"./f_class":21,"mol-proto":35}],23:[function(require,module,exports){
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

},{"./attribute/a_load":4,"./config":20,"./mail":24,"./util/error":30,"./util/logger":32,"./util/request":34}],24:[function(require,module,exports){
'use strict';

var Messenger = require('../messenger')
	, MailMessageSource = require('./mail_source');


var mailMsgSource = new MailMessageSource();

var miloMail = new Messenger(undefined, undefined, mailMsgSource);

module.exports = miloMail;

},{"../messenger":26,"./mail_source":25}],25:[function(require,module,exports){
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
		if (this._domReadyFired) return false;
		Object.defineProperty(this, '_domReadyFired', {
			writable: true,
			value: true
		});
		return true;
	}
};


 // event dispatcher - as defined by Event DOM API
function handleEvent(event) {
	this.dispatchMessage(event.type, event);
}

},{"../components/c_message_sources/dom_events_constructors":16,"../messenger/message_source":27,"../util/check":29,"../util/error":30,"mol-proto":35}],26:[function(require,module,exports){
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

},{"../abstract/mixin":1,"../util/check":29,"../util/error":30,"./message_source":27,"mol-proto":35}],27:[function(require,module,exports){
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

},{"../abstract/mixin":1,"../util/error":30,"../util/logger":32,"mol-proto":35}],28:[function(require,module,exports){
'use strict';

var milo = {
	loader: require('./loader'),
	binder: require('./binder'),
	mail: require('./mail'),
	config: require('./config'),
	util: require('./util'),
	classes: require('./classes')
}


// used facets
require('./components/c_facets/Data');
require('./components/c_facets/Events');
require('./components/c_facets/Template');
require('./components/c_facets/Container');

// used components
require('./components/classes/View');


// export for node/browserify
if (typeof module == 'object' && module.exports)	
	module.exports = milo;

// global milo for browser
if (typeof window == 'object')
	window.milo = milo;

},{"./binder":6,"./classes":7,"./components/c_facets/Container":10,"./components/c_facets/Data":11,"./components/c_facets/Events":12,"./components/c_facets/Template":13,"./components/classes/View":19,"./config":20,"./loader":23,"./mail":24,"./util":31}],29:[function(require,module,exports){
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


},{"mol-proto":35}],30:[function(require,module,exports){
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

},{"mol-proto":35}],31:[function(require,module,exports){
'use strict';

var util = {
	logger: require('./logger'),
	request: require('./request'),
	check: require('./check'),
	error: require('./error')
};

module.exports = util;

},{"./check":29,"./error":30,"./logger":32,"./request":34}],32:[function(require,module,exports){
'use strict';

var Logger = require('./logger_class');

var logger = new Logger({ level: 3 });

module.exports = logger;

},{"./logger_class":33}],33:[function(require,module,exports){
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

},{"mol-proto":35}],34:[function(require,module,exports){
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

},{"mol-proto":35}],35:[function(require,module,exports){
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

},{}],36:[function(require,module,exports){
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

        var myTmplComps = ctrl.myTemplate.template
                .set('<p ml-bind=":innerPara">I am rendered from template</p>')
                .render()
                .binder();

        _.extend(ctrl, myTmplComps); // should be some function to add to controller

        ctrl.innerPara.el.innerHTML += ', then bound and changed via component inside template';

        console.log(ctrl);
    });
});

},{"../../lib/milo":28}]},{},[36])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2Fic3RyYWN0L21peGluLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9hYnN0cmFjdC9yZWdpc3RyeS5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvYXR0cmlidXRlL2FfYmluZC5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvYXR0cmlidXRlL2FfbG9hZC5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvYXR0cmlidXRlL2luZGV4LmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9iaW5kZXIuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NsYXNzZXMuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19jbGFzcy5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX2ZhY2V0LmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfZmFjZXRzL0NvbnRhaW5lci5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX2ZhY2V0cy9EYXRhLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfZmFjZXRzL0V2ZW50cy5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX2ZhY2V0cy9UZW1wbGF0ZS5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX2ZhY2V0cy9jZl9yZWdpc3RyeS5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX21lc3NhZ2Vfc291cmNlcy9jb21wb25lbnRfZGF0YV9zb3VyY2UuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19tZXNzYWdlX3NvdXJjZXMvZG9tX2V2ZW50c19jb25zdHJ1Y3RvcnMuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19tZXNzYWdlX3NvdXJjZXMvZG9tX2V2ZW50c19zb3VyY2UuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19yZWdpc3RyeS5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jbGFzc2VzL1ZpZXcuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbmZpZy5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvZmFjZXRzL2ZfY2xhc3MuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2ZhY2V0cy9mX29iamVjdC5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvbG9hZGVyLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9tYWlsL2luZGV4LmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9tYWlsL21haWxfc291cmNlLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9tZXNzZW5nZXIvaW5kZXguanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL21lc3Nlbmdlci9tZXNzYWdlX3NvdXJjZS5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvbWlsby5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvdXRpbC9jaGVjay5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvdXRpbC9lcnJvci5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvdXRpbC9pbmRleC5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvdXRpbC9sb2dnZXIuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL3V0aWwvbG9nZ2VyX2NsYXNzLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi91dGlsL3JlcXVlc3QuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbm9kZV9tb2R1bGVzL21vbC1wcm90by9saWIvcHJvdG8uanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vdGVzdF9odG1sL2JpbmRfdGVzdC9iaW5kX3Rlc3QuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25QQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vdXRpbC9jaGVjaycpXG5cdCwgTWF0Y2ggPSBjaGVjay5NYXRjaFxuXHQsIE1peGluRXJyb3IgPSByZXF1aXJlKCcuLi91dGlsL2Vycm9yJykuTWl4aW47XG5cblxubW9kdWxlLmV4cG9ydHMgPSBNaXhpbjtcblxuLy8gYW4gYWJzdHJhY3QgY2xhc3MgZm9yIG1peGluIHBhdHRlcm4gLSBhZGRpbmcgcHJveHkgbWV0aG9kcyB0byBob3N0IG9iamVjdHNcbmZ1bmN0aW9uIE1peGluKGhvc3RPYmplY3QsIHByb3h5TWV0aG9kcyAvKiwgb3RoZXIgYXJncyAtIHBhc3NlZCB0byBpbml0IG1ldGhvZCAqLykge1xuXHQvLyBUT0RPIC0gbW9jZSBjaGVja3MgZnJvbSBNZXNzZW5nZXIgaGVyZVxuXHRjaGVjayhob3N0T2JqZWN0LCBNYXRjaC5PcHRpb25hbChPYmplY3QpKTtcblx0Y2hlY2socHJveHlNZXRob2RzLCBNYXRjaC5PcHRpb25hbChNYXRjaC5PYmplY3RIYXNoKFN0cmluZykpKTtcblxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ19ob3N0T2JqZWN0JywgeyB2YWx1ZTogaG9zdE9iamVjdCB9KTtcblx0aWYgKHByb3h5TWV0aG9kcylcblx0XHR0aGlzLl9jcmVhdGVQcm94eU1ldGhvZHMocHJveHlNZXRob2RzKTtcblxuXHQvLyBjYWxsaW5nIGluaXQgaWYgaXQgaXMgZGVmaW5lZCBpbiB0aGUgY2xhc3Ncblx0aWYgKHRoaXMuaW5pdClcblx0XHR0aGlzLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn1cblxuXy5leHRlbmRQcm90byhNaXhpbiwge1xuXHRfY3JlYXRlUHJveHlNZXRob2Q6IF9jcmVhdGVQcm94eU1ldGhvZCxcblx0X2NyZWF0ZVByb3h5TWV0aG9kczogX2NyZWF0ZVByb3h5TWV0aG9kc1xufSk7XG5cblxuZnVuY3Rpb24gX2NyZWF0ZVByb3h5TWV0aG9kKG1peGluTWV0aG9kTmFtZSwgcHJveHlNZXRob2ROYW1lKSB7XG5cdGlmICh0aGlzLl9ob3N0T2JqZWN0W3Byb3h5TWV0aG9kTmFtZV0pXG5cdFx0dGhyb3cgbmV3IE1peGluRXJyb3IoJ21ldGhvZCAnICsgcHJveHlNZXRob2ROYW1lICtcblx0XHRcdFx0XHRcdFx0XHQgJyBhbHJlYWR5IGRlZmluZWQgaW4gaG9zdCBvYmplY3QnKTtcblxuXHRjaGVjayh0aGlzW21peGluTWV0aG9kTmFtZV0sIEZ1bmN0aW9uKTtcblxuXHR2YXIgYm91bmRNZXRob2QgPSB0aGlzW21peGluTWV0aG9kTmFtZV0uYmluZCh0aGlzKTtcblxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcy5faG9zdE9iamVjdCwgcHJveHlNZXRob2ROYW1lLFxuXHRcdHsgdmFsdWU6IGJvdW5kTWV0aG9kIH0pO1xufVxuXG5cbmZ1bmN0aW9uIF9jcmVhdGVQcm94eU1ldGhvZHMocHJveHlNZXRob2RzKSB7XG5cdC8vIGNyZWF0aW5nIGFuZCBiaW5kaW5nIHByb3h5IG1ldGhvZHMgb24gdGhlIGhvc3Qgb2JqZWN0XG5cdF8uZWFjaEtleShwcm94eU1ldGhvZHMsIF9jcmVhdGVQcm94eU1ldGhvZCwgdGhpcyk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgnbW9sLXByb3RvJylcblx0LCBjaGVjayA9IHJlcXVpcmUoJy4uL3V0aWwvY2hlY2snKVxuXHQsIE1hdGNoID0gY2hlY2suTWF0Y2g7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2xhc3NSZWdpc3RyeTtcblxuZnVuY3Rpb24gQ2xhc3NSZWdpc3RyeSAoRm91bmRhdGlvbkNsYXNzKSB7XG5cdGlmIChGb3VuZGF0aW9uQ2xhc3MpXG5cdFx0dGhpcy5zZXRDbGFzcyhGb3VuZGF0aW9uQ2xhc3MpO1xuXG5cdC8vIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnX19yZWdpc3RlcmVkQ2xhc3NlcycsIHtcblx0Ly8gXHRcdGVudW1lcmFibGU6IGZhbHNlLFxuXHQvLyBcdFx0d3JpdGFibGU6IHRydWUsXG5cdC8vIFx0XHRjb25maWd1cmFibGU6IHRydWUsXG5cdC8vIFx0XHR2YWx1ZToge31cblx0Ly8gfSk7XG5cblx0dGhpcy5fX3JlZ2lzdGVyZWRDbGFzc2VzID0ge307XG59XG5cbl8uZXh0ZW5kUHJvdG8oQ2xhc3NSZWdpc3RyeSwge1xuXHRhZGQ6IHJlZ2lzdGVyQ2xhc3MsXG5cdGdldDogZ2V0Q2xhc3MsXG5cdHJlbW92ZTogdW5yZWdpc3RlckNsYXNzLFxuXHRjbGVhbjogdW5yZWdpc3RlckFsbENsYXNzZXMsXG5cdHNldENsYXNzOiBzZXRGb3VuZGF0aW9uQ2xhc3Ncbn0pO1xuXG5cbmZ1bmN0aW9uIHNldEZvdW5kYXRpb25DbGFzcyhGb3VuZGF0aW9uQ2xhc3MpIHtcblx0Y2hlY2soRm91bmRhdGlvbkNsYXNzLCBGdW5jdGlvbik7XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnRm91bmRhdGlvbkNsYXNzJywge1xuXHRcdGVudW1lcmFibGU6IHRydWUsXG5cdFx0dmFsdWU6IEZvdW5kYXRpb25DbGFzc1xuXHR9KTtcbn1cblxuZnVuY3Rpb24gcmVnaXN0ZXJDbGFzcyhhQ2xhc3MsIG5hbWUpIHtcblx0bmFtZSA9IG5hbWUgfHwgYUNsYXNzLm5hbWU7XG5cblx0Y2hlY2sobmFtZSwgU3RyaW5nLCAnY2xhc3MgbmFtZSBtdXN0IGJlIHN0cmluZycpO1xuXHRjaGVjayhuYW1lLCBNYXRjaC5XaGVyZShmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gdHlwZW9mIG5hbWUgPT0gJ3N0cmluZycgJiYgbmFtZSAhPSAnJztcblx0fSksICdjbGFzcyBuYW1lIG11c3QgYmUgc3RyaW5nJyk7XG5cdGlmICh0aGlzLkZvdW5kYXRpb25DbGFzcykge1xuXHRcdGlmIChhQ2xhc3MgIT0gdGhpcy5Gb3VuZGF0aW9uQ2xhc3MpXG5cdFx0XHRjaGVjayhhQ2xhc3MsIE1hdGNoLlN1YmNsYXNzKHRoaXMuRm91bmRhdGlvbkNsYXNzKSwgJ2NsYXNzIG11c3QgYmUgYSBzdWIoY2xhc3MpIG9mIGEgZm91bmRhdGlvbiBjbGFzcycpO1xuXHR9IGVsc2Vcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdmb3VuZGF0aW9uIGNsYXNzIG11c3QgYmUgc2V0IGJlZm9yZSBhZGRpbmcgY2xhc3NlcyB0byByZWdpc3RyeScpO1xuXG5cdGlmICh0aGlzLl9fcmVnaXN0ZXJlZENsYXNzZXNbbmFtZV0pXG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignaXMgYWxyZWFkeSByZWdpc3RlcmVkJyk7XG5cblx0dGhpcy5fX3JlZ2lzdGVyZWRDbGFzc2VzW25hbWVdID0gYUNsYXNzO1xufTtcblxuXG5mdW5jdGlvbiBnZXRDbGFzcyhuYW1lKSB7XG5cdGNoZWNrKG5hbWUsIFN0cmluZywgJ2NsYXNzIG5hbWUgbXVzdCBiZSBzdHJpbmcnKTtcblx0cmV0dXJuIHRoaXMuX19yZWdpc3RlcmVkQ2xhc3Nlc1tuYW1lXTtcbn07XG5cblxuZnVuY3Rpb24gdW5yZWdpc3RlckNsYXNzKG5hbWVPckNsYXNzKSB7XG5cdGNoZWNrKG5hbWVPckNsYXNzLCBNYXRjaC5PbmVPZihTdHJpbmcsIEZ1bmN0aW9uKSwgJ2NsYXNzIG9yIG5hbWUgbXVzdCBiZSBzdXBwbGllZCcpO1xuXG5cdHZhciBuYW1lID0gdHlwZW9mIG5hbWVPckNsYXNzID09ICdzdHJpbmcnXG5cdFx0XHRcdFx0XHQ/IG5hbWVPckNsYXNzXG5cdFx0XHRcdFx0XHQ6IG5hbWVPckNsYXNzLm5hbWU7XG5cdFx0XHRcdFx0XHRcblx0aWYgKCEgdGhpcy5fX3JlZ2lzdGVyZWRDbGFzc2VzW25hbWVdKVxuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ2NsYXNzIGlzIG5vdCByZWdpc3RlcmVkJyk7XG5cblx0ZGVsZXRlIHRoaXMuX19yZWdpc3RlcmVkQ2xhc3Nlc1tuYW1lXTtcbn07XG5cblxuZnVuY3Rpb24gdW5yZWdpc3RlckFsbENsYXNzZXMoKSB7XG5cdHRoaXMuX19yZWdpc3RlcmVkQ2xhc3NlcyA9IHt9O1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIEF0dHJpYnV0ZSA9IHJlcXVpcmUoJy4vaW5kZXgnKVxuXHQsIEF0dHJpYnV0ZUVycm9yID0gcmVxdWlyZSgnLi4vdXRpbC9lcnJvcicpLkF0dHJpYnV0ZVxuXHQsIGNvbmZpZyA9IHJlcXVpcmUoJy4uL2NvbmZpZycpXG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpXG5cdCwgY2hlY2sgPSByZXF1aXJlKCcuLi91dGlsL2NoZWNrJylcblx0LCBNYXRjaCA9IGNoZWNrLk1hdGNoO1xuXG5cbi8vIE1hdGNoZXM7XG4vLyA6bXlWaWV3IC0gb25seSBjb21wb25lbnQgbmFtZVxuLy8gVmlldzpteVZpZXcgLSBjbGFzcyBhbmQgY29tcG9uZW50IG5hbWVcbi8vIFtFdmVudHMsIERhdGFdOm15VmlldyAtIGZhY2V0cyBhbmQgY29tcG9uZW50IG5hbWVcbi8vIFZpZXdbRXZlbnRzXTpteVZpZXcgLSBjbGFzcywgZmFjZXQocykgYW5kIGNvbXBvbmVudCBuYW1lXG5cbnZhciBhdHRyUmVnRXhwPSAvXihbXlxcOlxcW1xcXV0qKSg/OlxcWyhbXlxcOlxcW1xcXV0qKVxcXSk/XFw6PyhbXjpdKikkL1xuXHQsIGZhY2V0c1NwbGl0UmVnRXhwID0gL1xccyooPzpcXCx8XFxzKVxccyovO1xuXG5cbnZhciBCaW5kQXR0cmlidXRlID0gXy5jcmVhdGVTdWJjbGFzcyhBdHRyaWJ1dGUsICdCaW5kQXR0cmlidXRlJywgdHJ1ZSk7XG5cbl8uZXh0ZW5kUHJvdG8oQmluZEF0dHJpYnV0ZSwge1xuXHRhdHRyTmFtZTogZ2V0QXR0cmlidXRlTmFtZSxcblx0cGFyc2U6IHBhcnNlQXR0cmlidXRlLFxuXHR2YWxpZGF0ZTogdmFsaWRhdGVBdHRyaWJ1dGVcbn0pO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gQmluZEF0dHJpYnV0ZTtcblxuXG5mdW5jdGlvbiBnZXRBdHRyaWJ1dGVOYW1lKCkge1xuXHRyZXR1cm4gY29uZmlnLmF0dHJzWydiaW5kJ107XG59XG5cblxuZnVuY3Rpb24gcGFyc2VBdHRyaWJ1dGUoKSB7XG5cdGlmICghIHRoaXMubm9kZSkgcmV0dXJuO1xuXG5cdHZhciB2YWx1ZSA9IHRoaXMuZ2V0KCk7XG5cblx0aWYgKHZhbHVlKVxuXHRcdHZhciBiaW5kVG8gPSB2YWx1ZS5tYXRjaChhdHRyUmVnRXhwKTtcblxuXHRpZiAoISBiaW5kVG8pXG5cdFx0dGhyb3cgbmV3IEF0dHJpYnV0ZUVycm9yKCdpbnZhbGlkIGJpbmQgYXR0cmlidXRlICcgKyB2YWx1ZSk7XG5cblx0dGhpcy5jb21wQ2xhc3MgPSBiaW5kVG9bMV0gfHwgJ0NvbXBvbmVudCc7XG5cdHRoaXMuY29tcEZhY2V0cyA9IChiaW5kVG9bMl0gJiYgYmluZFRvWzJdLnNwbGl0KGZhY2V0c1NwbGl0UmVnRXhwKSkgfHwgdW5kZWZpbmVkO1xuXHR0aGlzLmNvbXBOYW1lID0gYmluZFRvWzNdIHx8IHVuZGVmaW5lZDtcblxuXHRyZXR1cm4gdGhpcztcbn1cblxuXG5mdW5jdGlvbiB2YWxpZGF0ZUF0dHJpYnV0ZSgpIHtcblx0dmFyIGNvbXBOYW1lID0gdGhpcy5jb21wTmFtZTtcblx0Y2hlY2soY29tcE5hbWUsIE1hdGNoLldoZXJlKGZ1bmN0aW9uKCkge1xuICBcdFx0cmV0dXJuIHR5cGVvZiBjb21wTmFtZSA9PSAnc3RyaW5nJyAmJiBjb21wTmFtZSAhPSAnJztcblx0fSksICdlbXB0eSBjb21wb25lbnQgbmFtZScpO1xuXG5cdGlmICghIHRoaXMuY29tcENsYXNzKVxuXHRcdHRocm93IG5ldyBBdHRyaWJ1dGVFcnJvcignZW1wdHkgY29tcG9uZW50IGNsYXNzIG5hbWUgJyArIHRoaXMuY29tcENsYXNzKTtcblxuXHRyZXR1cm4gdGhpcztcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIEF0dHJpYnV0ZSA9IHJlcXVpcmUoJy4vaW5kZXgnKVxuXHQsIEF0dHJpYnV0ZUVycm9yID0gcmVxdWlyZSgnLi4vdXRpbC9lcnJvcicpLkF0dHJpYnV0ZVxuXHQsIGNvbmZpZyA9IHJlcXVpcmUoJy4uL2NvbmZpZycpXG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpO1xuXG5cbnZhciBMb2FkQXR0cmlidXRlID0gXy5jcmVhdGVTdWJjbGFzcyhBdHRyaWJ1dGUsICdMb2FkQXR0cmlidXRlJywgdHJ1ZSk7XG5cbl8uZXh0ZW5kUHJvdG8oTG9hZEF0dHJpYnV0ZSwge1xuXHRhdHRyTmFtZTogZ2V0QXR0cmlidXRlTmFtZSxcblx0cGFyc2U6IHBhcnNlQXR0cmlidXRlLFxuXHR2YWxpZGF0ZTogdmFsaWRhdGVBdHRyaWJ1dGVcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IExvYWRBdHRyaWJ1dGU7XG5cblxuZnVuY3Rpb24gZ2V0QXR0cmlidXRlTmFtZSgpIHtcblx0cmV0dXJuIGNvbmZpZy5hdHRycy5sb2FkO1xufVxuXG5cbmZ1bmN0aW9uIHBhcnNlQXR0cmlidXRlKCkge1xuXHRpZiAoISB0aGlzLm5vZGUpIHJldHVybjtcblxuXHR2YXIgdmFsdWUgPSB0aGlzLmdldCgpO1xuXG5cdHRoaXMubG9hZFVybCA9IHZhbHVlO1xuXG5cdHJldHVybiB0aGlzO1xufVxuXG5cbmZ1bmN0aW9uIHZhbGlkYXRlQXR0cmlidXRlKCkge1xuXHQvLyBUT0RPIHVybCB2YWxpZGF0aW9uXG5cblx0cmV0dXJuIHRoaXM7XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpXG5cdCwgY2hlY2sgPSByZXF1aXJlKCcuLi91dGlsL2NoZWNrJylcblx0LCBNYXRjaCA9IGNoZWNrLk1hdGNoXG5cdCwgdG9CZUltcGxlbWVudGVkID0gcmVxdWlyZSgnLi4vdXRpbC9lcnJvcicpLnRvQmVJbXBsZW1lbnRlZDtcblxuXG4vLyBhbiBhYnN0cmFjdCBhdHRyaWJ1dGUgY2xhc3MgZm9yIGF0dHJpYnV0ZSBwYXJzaW5nIGFuZCB2YWxpZGF0aW9uXG5cbm1vZHVsZS5leHBvcnRzID0gQXR0cmlidXRlO1xuXG5mdW5jdGlvbiBBdHRyaWJ1dGUoZWwsIG5hbWUpIHtcblx0dGhpcy5uYW1lID0gbmFtZSB8fCB0aGlzLmF0dHJOYW1lKCk7XG5cdHRoaXMuZWwgPSBlbDtcblx0dGhpcy5ub2RlID0gZWwuYXR0cmlidXRlc1t0aGlzLm5hbWVdO1xufVxuXG5fLmV4dGVuZFByb3RvKEF0dHJpYnV0ZSwge1xuXHRnZXQ6IGdldEF0dHJpYnV0ZVZhbHVlLFxuXHRzZXQ6IHNldEF0dHJpYnV0ZVZhbHVlLFxuXG5cdC8vIHNob3VsZCBiZSBkZWZpbmVkIGluIHN1YmNsYXNzXG5cdGF0dHJOYW1lOiB0b0JlSW1wbGVtZW50ZWQsXG5cdHBhcnNlOiB0b0JlSW1wbGVtZW50ZWQsXG5cdHZhbGlkYXRlOiB0b0JlSW1wbGVtZW50ZWQsXG59KTtcblxuXG5mdW5jdGlvbiBnZXRBdHRyaWJ1dGVWYWx1ZSgpIHtcblx0cmV0dXJuIHRoaXMuZWwuZ2V0QXR0cmlidXRlKHRoaXMubmFtZSk7XG59XG5cbmZ1bmN0aW9uIHNldEF0dHJpYnV0ZVZhbHVlKHZhbHVlKSB7XG5cdHRoaXMuZWwuc2V0QXR0cmlidXRlKHRoaXMubmFtZSwgdmFsdWUpO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgbWlsb01haWwgPSByZXF1aXJlKCcuL21haWwnKVxuXHQsIGNvbXBvbmVudHNSZWdpc3RyeSA9IHJlcXVpcmUoJy4vY29tcG9uZW50cy9jX3JlZ2lzdHJ5Jylcblx0LCBDb21wb25lbnQgPSBjb21wb25lbnRzUmVnaXN0cnkuZ2V0KCdDb21wb25lbnQnKVxuXHQsIEJpbmRBdHRyaWJ1dGUgPSByZXF1aXJlKCcuL2F0dHJpYnV0ZS9hX2JpbmQnKVxuXHQsIEJpbmRlckVycm9yID0gcmVxdWlyZSgnLi91dGlsL2Vycm9yJykuQmluZGVyXG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpXG5cdCwgY2hlY2sgPSByZXF1aXJlKCcuL3V0aWwvY2hlY2snKVxuXHQsIE1hdGNoID0gIGNoZWNrLk1hdGNoO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gYmluZGVyO1xuXG5cbmZ1bmN0aW9uIGJpbmRlcihzY29wZUVsLCBjYWxsYmFjaykge1xuXHR2YXIgc2NvcGVFbCA9IHNjb3BlRWwgfHwgZG9jdW1lbnQuYm9keVxuXHRcdCwgY29tcG9uZW50cyA9IHt9O1xuXG5cdC8vIGl0ZXJhdGUgY2hpbGRyZW4gb2Ygc2NvcGVFbFxuXHRBcnJheS5wcm90b3R5cGUuZm9yRWFjaC5jYWxsKHNjb3BlRWwuY2hpbGRyZW4sIGJpbmRFbGVtZW50KTtcblxuXHRyZXR1cm4gY29tcG9uZW50cztcblxuXG5cdGZ1bmN0aW9uIGJpbmRFbGVtZW50KGVsKXtcblx0XHR2YXIgYXR0ciA9IG5ldyBCaW5kQXR0cmlidXRlKGVsKTtcblxuXHRcdHZhciBhQ29tcG9uZW50ID0gY3JlYXRlQ29tcG9uZW50KGVsLCBhdHRyKTtcblxuXHRcdC8vIGJpbmQgaW5uZXIgZWxlbWVudHMgdG8gY29tcG9uZW50c1xuXHRcdGlmIChlbC5jaGlsZHJlbiAmJiBlbC5jaGlsZHJlbi5sZW5ndGgpIHtcblx0XHRcdHZhciBpbm5lckNvbXBvbmVudHMgPSBiaW5kZXIoZWwpO1xuXG5cdFx0XHRpZiAoT2JqZWN0LmtleXMoaW5uZXJDb21wb25lbnRzKS5sZW5ndGgpIHtcblx0XHRcdFx0Ly8gYXR0YWNoIGlubmVyIGNvbXBvbmVudHMgdG8gdGhlIGN1cnJlbnQgb25lIChjcmVhdGUgYSBuZXcgc2NvcGUpIC4uLlxuXHRcdFx0XHRpZiAodHlwZW9mIGFDb21wb25lbnQgIT0gJ3VuZGVmaW5lZCcgJiYgYUNvbXBvbmVudC5jb250YWluZXIpXG5cdFx0XHRcdFx0YUNvbXBvbmVudC5jb250YWluZXIuYWRkKGlubmVyQ29tcG9uZW50cyk7XG5cdFx0XHRcdGVsc2UgLy8gb3Iga2VlcCB0aGVtIGluIHRoZSBjdXJyZW50IHNjb3BlXG5cdFx0XHRcdFx0Xy5lYWNoS2V5KGlubmVyQ29tcG9uZW50cywgc3RvcmVDb21wb25lbnQpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmIChhQ29tcG9uZW50KVxuXHRcdFx0c3RvcmVDb21wb25lbnQoYUNvbXBvbmVudCwgYXR0ci5jb21wTmFtZSk7XG5cdH1cblxuXHRmdW5jdGlvbiBjcmVhdGVDb21wb25lbnQoZWwsIGF0dHIpIHtcblx0XHRpZiAoYXR0ci5ub2RlKSB7IC8vIGVsZW1lbnQgd2lsbCBiZSBib3VuZCB0byBhIGNvbXBvbmVudFxuXHRcdFx0YXR0ci5wYXJzZSgpLnZhbGlkYXRlKCk7XG5cblx0XHRcdC8vIGdldCBjb21wb25lbnQgY2xhc3MgZnJvbSByZWdpc3RyeSBhbmQgdmFsaWRhdGVcblx0XHRcdHZhciBDb21wb25lbnRDbGFzcyA9IGNvbXBvbmVudHNSZWdpc3RyeS5nZXQoYXR0ci5jb21wQ2xhc3MpO1xuXG5cdFx0XHRpZiAoISBDb21wb25lbnRDbGFzcylcblx0XHRcdFx0dGhyb3cgbmV3IEJpbmRlckVycm9yKCdjbGFzcyAnICsgYXR0ci5jb21wQ2xhc3MgKyAnIGlzIG5vdCByZWdpc3RlcmVkJyk7XG5cblx0XHRcdGNoZWNrKENvbXBvbmVudENsYXNzLCBNYXRjaC5TdWJjbGFzcyhDb21wb25lbnQsIHRydWUpKTtcblx0XG5cdFx0XHQvLyBjcmVhdGUgbmV3IGNvbXBvbmVudFxuXHRcdFx0dmFyIGFDb21wb25lbnQgPSBuZXcgQ29tcG9uZW50Q2xhc3Moe30sIGVsKTtcblxuXHRcdFx0Ly8gYWRkIGV4dHJhIGZhY2V0c1xuXHRcdFx0dmFyIGZhY2V0cyA9IGF0dHIuY29tcEZhY2V0cztcblx0XHRcdGlmIChmYWNldHMpXG5cdFx0XHRcdGZhY2V0cy5mb3JFYWNoKGZ1bmN0aW9uKGZjdCkge1xuXHRcdFx0XHRcdGFDb21wb25lbnQuYWRkRmFjZXQoZmN0KTtcblx0XHRcdFx0fSk7XG5cblx0XHRcdHJldHVybiBhQ29tcG9uZW50O1xuXHRcdH1cblx0fVxuXG5cblx0ZnVuY3Rpb24gc3RvcmVDb21wb25lbnQoYUNvbXBvbmVudCwgbmFtZSkge1xuXHRcdGlmIChjb21wb25lbnRzW25hbWVdKVxuXHRcdFx0dGhyb3cgbmV3IEJpbmRlckVycm9yKCdkdXBsaWNhdGUgY29tcG9uZW50IG5hbWU6ICcgKyBuYW1lKTtcblxuXHRcdGNvbXBvbmVudHNbbmFtZV0gPSBhQ29tcG9uZW50O1xuXHR9XG59XG5cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGNsYXNzZXMgPSB7XG5cdEZhY2V0OiByZXF1aXJlKCcuL2ZhY2V0cy9mX2NsYXNzJyksXG5cdENvbXBvbmVudDogcmVxdWlyZSgnLi9jb21wb25lbnRzL2NfY2xhc3MnKSxcblx0Q29tcG9uZW50RmFjZXQ6IHJlcXVpcmUoJy4vY29tcG9uZW50cy9jX2ZhY2V0JyksXG5cdENsYXNzUmVnaXN0cnk6IHJlcXVpcmUoJy4vYWJzdHJhY3QvcmVnaXN0cnknKSxcblx0ZmFjZXRzUmVnaXN0cnk6IHJlcXVpcmUoJy4vY29tcG9uZW50cy9jX2ZhY2V0cy9jZl9yZWdpc3RyeScpLFxuXHRjb21wb25lbnRzUmVnaXN0cnk6IHJlcXVpcmUoJy4vY29tcG9uZW50cy9jX3JlZ2lzdHJ5Jylcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3NlcztcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIEZhY2V0ZWRPYmplY3QgPSByZXF1aXJlKCcuLi9mYWNldHMvZl9vYmplY3QnKVxuXHQsIGZhY2V0c1JlZ2lzdHJ5ID0gcmVxdWlyZSgnLi9jX2ZhY2V0cy9jZl9yZWdpc3RyeScpXG5cdCwgQ29tcG9uZW50RmFjZXQgPSByZXF1aXJlKCcuL2NfZmFjZXQnKVxuXHQsIE1lc3NlbmdlciA9IHJlcXVpcmUoJy4uL21lc3NlbmdlcicpXG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpXG5cdCwgY2hlY2sgPSByZXF1aXJlKCcuLi91dGlsL2NoZWNrJylcblx0LCBNYXRjaCA9IGNoZWNrLk1hdGNoO1xuXG52YXIgQ29tcG9uZW50ID0gXy5jcmVhdGVTdWJjbGFzcyhGYWNldGVkT2JqZWN0LCAnQ29tcG9uZW50JywgdHJ1ZSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ29tcG9uZW50O1xuXG5cbkNvbXBvbmVudC5jcmVhdGVDb21wb25lbnRDbGFzcyA9IGZ1bmN0aW9uKG5hbWUsIGZhY2V0cykge1xuXHR2YXIgZmFjZXRzQ2xhc3NlcyA9IHt9O1xuXG5cdGZhY2V0cy5mb3JFYWNoKGZ1bmN0aW9uKGZjdCkge1xuXHRcdHZhciBmY3ROYW1lID0gXy5maXJzdExvd2VyQ2FzZShmY3QpO1xuXHRcdHZhciBmY3RDbGFzc05hbWUgPSBfLmZpcnN0VXBwZXJDYXNlKGZjdCk7XG5cdFx0ZmFjZXRzQ2xhc3Nlc1tmY3ROYW1lXSA9IGZhY2V0c1JlZ2lzdHJ5LmdldChmY3RDbGFzc05hbWUpXG5cdH0pO1xuXG5cdHJldHVybiBGYWNldGVkT2JqZWN0LmNyZWF0ZUZhY2V0ZWRDbGFzcy5jYWxsKHRoaXMsIG5hbWUsIGZhY2V0c0NsYXNzZXMpO1xufTtcblxuZGVsZXRlIENvbXBvbmVudC5jcmVhdGVGYWNldGVkQ2xhc3M7XG5cblxuXy5leHRlbmRQcm90byhDb21wb25lbnQsIHtcblx0aW5pdDogaW5pdENvbXBvbmVudCxcblx0YWRkRmFjZXQ6IGFkZEZhY2V0XG59KTtcblxuXG5mdW5jdGlvbiBpbml0Q29tcG9uZW50KGZhY2V0c09wdGlvbnMsIGVsZW1lbnQpIHtcblx0dGhpcy5lbCA9IGVsZW1lbnQ7XG5cblx0dmFyIG1lc3NlbmdlciA9IG5ldyBNZXNzZW5nZXIodGhpcywgTWVzc2VuZ2VyLmRlZmF1bHRNZXRob2RzLCB1bmRlZmluZWQgLyogbm8gbWVzc2FnZVNvdXJjZSAqLyk7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnRpZXModGhpcywge1xuXHRcdF9tZXNzZW5nZXI6IHsgdmFsdWU6IG1lc3NlbmdlciB9LFxuXHR9KTtcdFxufVxuXG5cbmZ1bmN0aW9uIGFkZEZhY2V0KGZhY2V0TmFtZU9yQ2xhc3MsIGZhY2V0T3B0cywgZmFjZXROYW1lKSB7XG5cdGNoZWNrKGZhY2V0TmFtZU9yQ2xhc3MsIE1hdGNoLk9uZU9mKFN0cmluZywgTWF0Y2guU3ViY2xhc3MoQ29tcG9uZW50RmFjZXQpKSk7XG5cdGNoZWNrKGZhY2V0T3B0cywgTWF0Y2guT3B0aW9uYWwoT2JqZWN0KSk7XG5cdGNoZWNrKGZhY2V0TmFtZSwgTWF0Y2guT3B0aW9uYWwoU3RyaW5nKSk7XG5cblx0aWYgKHR5cGVvZiBmYWNldE5hbWVPckNsYXNzID09ICdzdHJpbmcnKSB7XG5cdFx0dmFyIGZhY2V0Q2xhc3NOYW1lID0gXy5maXJzdFVwcGVyQ2FzZShmYWNldE5hbWVPckNsYXNzKTtcblx0XHR2YXIgRmFjZXRDbGFzcyA9IGZhY2V0c1JlZ2lzdHJ5LmdldChmYWNldENsYXNzTmFtZSk7XG5cdH0gZWxzZSBcblx0XHRGYWNldENsYXNzID0gZmFjZXROYW1lT3JDbGFzcztcblxuXHRmYWNldE5hbWUgPSBmYWNldE5hbWUgfHwgXy5maXJzdExvd2VyQ2FzZShGYWNldENsYXNzLm5hbWUpO1xuXG5cdEZhY2V0ZWRPYmplY3QucHJvdG90eXBlLmFkZEZhY2V0LmNhbGwodGhpcywgRmFjZXRDbGFzcywgZmFjZXRPcHRzLCBmYWNldE5hbWUpO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgRmFjZXQgPSByZXF1aXJlKCcuLi9mYWNldHMvZl9jbGFzcycpXG5cdCwgTWVzc2VuZ2VyID0gcmVxdWlyZSgnLi4vbWVzc2VuZ2VyJylcblx0LCBfID0gcmVxdWlyZSgnbW9sLXByb3RvJyk7XG5cbnZhciBDb21wb25lbnRGYWNldCA9IF8uY3JlYXRlU3ViY2xhc3MoRmFjZXQsICdDb21wb25lbnRGYWNldCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbXBvbmVudEZhY2V0O1xuXG5cbl8uZXh0ZW5kUHJvdG8oQ29tcG9uZW50RmFjZXQsIHtcblx0aW5pdDogaW5pdENvbXBvbmVudEZhY2V0LFxufSk7XG5cblxuZnVuY3Rpb24gaW5pdENvbXBvbmVudEZhY2V0KCkge1xuXHQvLyB2YXIgbWVzc2VuZ2VyID0gbmV3IE1lc3Nlbmdlcih0aGlzLCBNZXNzZW5nZXIuZGVmYXVsdE1ldGhvZHMsIHVuZGVmaW5lZCAvKiBubyBtZXNzYWdlU291cmNlICovKTtcblxuXHQvLyBPYmplY3QuZGVmaW5lUHJvcGVydGllcyh0aGlzLCB7XG5cdC8vIFx0X2ZhY2V0TWVzc2VuZ2VyOiB7IHZhbHVlOiBtZXNzZW5nZXIgfSxcblx0Ly8gfSk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBDb21wb25lbnRGYWNldCA9IHJlcXVpcmUoJy4uL2NfZmFjZXQnKVxuXHQsIGJpbmRlciA9IHJlcXVpcmUoJy4uLy4uL2JpbmRlcicpXG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpXG5cdCwgZmFjZXRzUmVnaXN0cnkgPSByZXF1aXJlKCcuL2NmX3JlZ2lzdHJ5Jyk7XG5cbi8vIGNvbnRhaW5lciBmYWNldFxudmFyIENvbnRhaW5lciA9IF8uY3JlYXRlU3ViY2xhc3MoQ29tcG9uZW50RmFjZXQsICdDb250YWluZXInKTtcblxuXy5leHRlbmRQcm90byhDb250YWluZXIsIHtcblx0aW5pdDogaW5pdENvbnRhaW5lcixcblx0X2JpbmQ6IF9iaW5kQ29tcG9uZW50cyxcblx0YWRkOiBhZGRDaGlsZENvbXBvbmVudHNcbn0pO1xuXG5mYWNldHNSZWdpc3RyeS5hZGQoQ29udGFpbmVyKTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb250YWluZXI7XG5cblxuZnVuY3Rpb24gaW5pdENvbnRhaW5lcigpIHtcblx0Q29tcG9uZW50RmFjZXQucHJvdG90eXBlLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblx0dGhpcy5jaGlsZHJlbiA9IHt9O1xufVxuXG5cbmZ1bmN0aW9uIF9iaW5kQ29tcG9uZW50cygpIHtcblx0Ly8gVE9ET1xuXHQvLyB0aGlzIGZ1bmN0aW9uIHNob3VsZCByZS1iaW5kIHJhdGhlciB0aGFuIGJpbmQgYWxsIGludGVybmFsIGVsZW1lbnRzXG5cdHRoaXMuY2hpbGRyZW4gPSBiaW5kZXIodGhpcy5vd25lci5lbCk7XG59XG5cblxuZnVuY3Rpb24gYWRkQ2hpbGRDb21wb25lbnRzKGNoaWxkQ29tcG9uZW50cykge1xuXHQvLyBUT0RPXG5cdC8vIHRoaXMgZnVuY3Rpb24gc2hvdWxkIGludGVsbGlnZW50bHkgcmUtYmluZCBleGlzdGluZyBjb21wb25lbnRzIHRvXG5cdC8vIG5ldyBlbGVtZW50cyAoaWYgdGhleSBjaGFuZ2VkKSBhbmQgcmUtYmluZCBwcmV2aW91c2x5IGJvdW5kIGV2ZW50cyB0byB0aGUgc2FtZVxuXHQvLyBldmVudCBoYW5kbGVyc1xuXHQvLyBvciBtYXliZSBub3QsIGlmIHRoaXMgZnVuY3Rpb24gaXMgb25seSB1c2VkIGJ5IGJpbmRlciB0byBhZGQgbmV3IGVsZW1lbnRzLi4uXG5cdF8uZXh0ZW5kKHRoaXMuY2hpbGRyZW4sIGNoaWxkQ29tcG9uZW50cyk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBDb21wb25lbnRGYWNldCA9IHJlcXVpcmUoJy4uL2NfZmFjZXQnKVxuXHQsIGZhY2V0c1JlZ2lzdHJ5ID0gcmVxdWlyZSgnLi9jZl9yZWdpc3RyeScpXG5cblx0LCBNZXNzZW5nZXIgPSByZXF1aXJlKCcuLi8uLi9tZXNzZW5nZXInKVxuXHQsIENvbXBvbmVudERhdGFTb3VyY2UgPSByZXF1aXJlKCcuLi9jX21lc3NhZ2Vfc291cmNlcy9jb21wb25lbnRfZGF0YV9zb3VyY2UnKVxuXG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpO1xuXG5cbi8vIGRhdGEgbW9kZWwgY29ubmVjdGlvbiBmYWNldFxudmFyIERhdGEgPSBfLmNyZWF0ZVN1YmNsYXNzKENvbXBvbmVudEZhY2V0LCAnRGF0YScpO1xuXG5fLmV4dGVuZFByb3RvKERhdGEsIHtcblx0aW5pdDogaW5pdERhdGFGYWNldCxcblxuXHQvLyBfcmVhdHRhY2g6IF9yZWF0dGFjaEV2ZW50c09uRWxlbWVudENoYW5nZVxufSk7XG5cbmZhY2V0c1JlZ2lzdHJ5LmFkZChEYXRhKTtcblxubW9kdWxlLmV4cG9ydHMgPSBEYXRhO1xuXG5cbmZ1bmN0aW9uIGluaXREYXRhRmFjZXQoKSB7XG5cdENvbXBvbmVudEZhY2V0LnByb3RvdHlwZS5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cblx0dmFyIHByb3h5Q29tcERhdGFTb3VyY2VNZXRob2RzID0ge1xuXHRcdHZhbHVlOiAndmFsdWUnLFxuXHRcdHRyaWdnZXI6ICd0cmlnZ2VyJ1xuXHR9O1xuXG5cdC8vIGluc3RlYWQgb2YgdGhpcy5vd25lciBzaG91bGQgcGFzcyBtb2RlbD8gV2hlcmUgaXQgaXMgc2V0P1xuXHR2YXIgY29tcERhdGFTb3VyY2UgPSBuZXcgQ29tcG9uZW50RGF0YVNvdXJjZSh0aGlzLCBwcm94eUNvbXBEYXRhU291cmNlTWV0aG9kcywgdGhpcy5vd25lcik7XG5cblx0dmFyIHByb3h5TWVzc2VuZ2VyTWV0aG9kcyA9IHtcblx0XHRvbjogJ29uTWVzc2FnZScsXG5cdFx0b2ZmOiAnb2ZmTWVzc2FnZScsXG5cdFx0b25NZXNzYWdlczogJ29uTWVzc2FnZXMnLFxuXHRcdG9mZk1lc3NhZ2VzOiAnb2ZmTWVzc2FnZXMnLFxuXHRcdGdldFN1YnNjcmliZXJzOiAnZ2V0U3Vic2NyaWJlcnMnXG5cdH07XG5cblx0dmFyIGRhdGFNZXNzZW5nZXIgPSBuZXcgTWVzc2VuZ2VyKHRoaXMsIHByb3h5TWVzc2VuZ2VyTWV0aG9kcywgY29tcERhdGFTb3VyY2UpO1xuXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRoaXMsIHtcblx0XHRfZGF0YU1lc3NlbmdlcjogeyB2YWx1ZTogZGF0YU1lc3NlbmdlciB9LFxuXHRcdF9jb21wRGF0YVNvdXJjZTogeyB2YWx1ZTogY29tcERhdGFTb3VyY2UgfVxuXHR9KTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIENvbXBvbmVudEZhY2V0ID0gcmVxdWlyZSgnLi4vY19mYWNldCcpXG5cdCwgZmFjZXRzUmVnaXN0cnkgPSByZXF1aXJlKCcuL2NmX3JlZ2lzdHJ5JylcblxuXHQsIE1lc3NlbmdlciA9IHJlcXVpcmUoJy4uLy4uL21lc3NlbmdlcicpXG5cdCwgRE9NRXZlbnRzU291cmNlID0gcmVxdWlyZSgnLi4vY19tZXNzYWdlX3NvdXJjZXMvZG9tX2V2ZW50c19zb3VyY2UnKVxuXG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpO1xuXG5cbi8vIGV2ZW50cyBmYWNldFxudmFyIEV2ZW50cyA9IF8uY3JlYXRlU3ViY2xhc3MoQ29tcG9uZW50RmFjZXQsICdFdmVudHMnKTtcblxuXy5leHRlbmRQcm90byhFdmVudHMsIHtcblx0aW5pdDogaW5pdEV2ZW50c0ZhY2V0LFxuXG5cdC8vIF9yZWF0dGFjaDogX3JlYXR0YWNoRXZlbnRzT25FbGVtZW50Q2hhbmdlXG59KTtcblxuZmFjZXRzUmVnaXN0cnkuYWRkKEV2ZW50cyk7XG5cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRzO1xuXG5cbmZ1bmN0aW9uIGluaXRFdmVudHNGYWNldCgpIHtcblx0Q29tcG9uZW50RmFjZXQucHJvdG90eXBlLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuXHR2YXIgZG9tRXZlbnRzU291cmNlID0gbmV3IERPTUV2ZW50c1NvdXJjZSh0aGlzLCB7IHRyaWdnZXI6ICd0cmlnZ2VyJyB9LCB0aGlzLm93bmVyKTtcblxuXHR2YXIgcHJveHlNZXNzZW5nZXJNZXRob2RzID0ge1xuXHRcdG9uOiAnb25NZXNzYWdlJyxcblx0XHRvZmY6ICdvZmZNZXNzYWdlJyxcblx0XHRvbkV2ZW50czogJ29uTWVzc2FnZXMnLFxuXHRcdG9mZkV2ZW50czogJ29mZk1lc3NhZ2VzJyxcblx0XHRnZXRMaXN0ZW5lcnM6ICdnZXRTdWJzY3JpYmVycydcblx0fTtcblxuXHR2YXIgbWVzc2VuZ2VyID0gbmV3IE1lc3Nlbmdlcih0aGlzLCBwcm94eU1lc3Nlbmdlck1ldGhvZHMsIGRvbUV2ZW50c1NvdXJjZSk7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnRpZXModGhpcywge1xuXHRcdF9ldmVudHNNZXNzZW5nZXI6IHsgdmFsdWU6IG1lc3NlbmdlciB9LFxuXHRcdF9kb21FdmVudHNTb3VyY2U6IHsgdmFsdWU6IGRvbUV2ZW50c1NvdXJjZSB9XG5cdH0pO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ29tcG9uZW50RmFjZXQgPSByZXF1aXJlKCcuLi9jX2ZhY2V0Jylcblx0LCBmYWNldHNSZWdpc3RyeSA9IHJlcXVpcmUoJy4vY2ZfcmVnaXN0cnknKVx0XG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpXG5cdCwgY2hlY2sgPSByZXF1aXJlKCcuLi8uLi91dGlsL2NoZWNrJylcblx0LCBNYXRjaCA9IGNoZWNrLk1hdGNoXG5cdCwgYmluZGVyID0gcmVxdWlyZSgnLi4vLi4vYmluZGVyJyk7XG5cblxuLy8gZGF0YSBtb2RlbCBjb25uZWN0aW9uIGZhY2V0XG52YXIgVGVtcGxhdGUgPSBfLmNyZWF0ZVN1YmNsYXNzKENvbXBvbmVudEZhY2V0LCAnVGVtcGxhdGUnKTtcblxuXy5leHRlbmRQcm90byhUZW1wbGF0ZSwge1xuXHRpbml0OiBpbml0VGVtcGxhdGVGYWNldCxcblx0c2V0OiBzZXRUZW1wbGF0ZSxcblx0cmVuZGVyOiByZW5kZXJUZW1wbGF0ZSxcblx0YmluZGVyOiBiaW5kSW5uZXJDb21wb25lbnRzXG5cblx0Ly8gX3JlYXR0YWNoOiBfcmVhdHRhY2hFdmVudHNPbkVsZW1lbnRDaGFuZ2Vcbn0pO1xuXG5mYWNldHNSZWdpc3RyeS5hZGQoVGVtcGxhdGUpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFRlbXBsYXRlO1xuXG5cbmZ1bmN0aW9uIGluaXRUZW1wbGF0ZUZhY2V0KCkge1xuXHRDb21wb25lbnRGYWNldC5wcm90b3R5cGUuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufVxuXG5cbmZ1bmN0aW9uIHNldFRlbXBsYXRlKHRlbXBsYXRlU3RyLCBjb21waWxlKSB7XG5cdGNoZWNrKHRlbXBsYXRlU3RyLCBTdHJpbmcpO1xuXHRjaGVjayhjb21waWxlLCBNYXRjaC5PcHRpb25hbChGdW5jdGlvbikpO1xuXG5cdHRoaXMuX3RlbXBsYXRlU3RyID0gdGVtcGxhdGVTdHI7XG5cdGlmIChjb21waWxlKVxuXHRcdHRoaXMuX2NvbXBpbGUgPSBjb21waWxlXG5cblx0Y29tcGlsZSA9IGNvbXBpbGUgfHwgdGhpcy5fY29tcGlsZTsgLy8gfHwgbWlsby5jb25maWcudGVtcGxhdGUuY29tcGlsZTtcblxuXHRpZiAoY29tcGlsZSlcblx0XHR0aGlzLl90ZW1wbGF0ZSA9IGNvbXBpbGUodGVtcGxhdGVTdHIpO1xuXG5cdHJldHVybiB0aGlzO1xufVxuXG5cbmZ1bmN0aW9uIHJlbmRlclRlbXBsYXRlKGRhdGEpIHsgLy8gd2UgbmVlZCBkYXRhIG9ubHkgaWYgdXNlIHRlbXBsYXRpbmcgZW5naW5lXG5cdHRoaXMub3duZXIuZWwuaW5uZXJIVE1MID0gdGhpcy5fdGVtcGxhdGVcblx0XHRcdFx0XHRcdFx0XHQ/IHRoaXMuX3RlbXBsYXRlKGRhdGEpXG5cdFx0XHRcdFx0XHRcdFx0OiB0aGlzLl90ZW1wbGF0ZVN0cjtcblxuXHRyZXR1cm4gdGhpcztcbn1cblxuXG5mdW5jdGlvbiBiaW5kSW5uZXJDb21wb25lbnRzKGJpbmRUb0NvbXBvbmVudCkge1xuXHR2YXIgaW5uZXJDb21wb25lbnRzID0gYmluZGVyKHRoaXMub3duZXIuZWwpO1xuXG5cdGlmICh0aGlzLm93bmVyLmNvbnRhaW5lcikgLy8gc2hvdWxkIGJlIGNoYW5nZWQgdG8gcmVjb25jaWxsYXRpb24gb2YgZXhpc3RpbmcgY2hpbGRyZW4gd2l0aCBuZXdcblx0XHR0aGlzLm93bmVyLmNvbnRhaW5lci5jaGlsZHJlbiA9IGlubmVyQ29tcG9uZW50cztcblxuXHRyZXR1cm4gaW5uZXJDb21wb25lbnRzO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ2xhc3NSZWdpc3RyeSA9IHJlcXVpcmUoJy4uLy4uL2Fic3RyYWN0L3JlZ2lzdHJ5Jylcblx0LCBDb21wb25lbnRGYWNldCA9IHJlcXVpcmUoJy4uL2NfZmFjZXQnKTtcblxudmFyIGZhY2V0c1JlZ2lzdHJ5ID0gbmV3IENsYXNzUmVnaXN0cnkoQ29tcG9uZW50RmFjZXQpO1xuXG5mYWNldHNSZWdpc3RyeS5hZGQoQ29tcG9uZW50RmFjZXQpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZhY2V0c1JlZ2lzdHJ5O1xuXG4vLyBUT0RPIC0gcmVmYWN0b3IgY29tcG9uZW50cyByZWdpc3RyeSB0ZXN0IGludG8gYSBmdW5jdGlvblxuLy8gdGhhdCB0ZXN0cyBhIHJlZ2lzdHJ5IHdpdGggYSBnaXZlbiBmb3VuZGF0aW9uIGNsYXNzXG4vLyBNYWtlIHRlc3QgZm9yIHRoaXMgcmVnaXN0cnkgYmFzZWQgb24gdGhpcyBmdW5jdGlvbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIERPTUV2ZW50c1NvdXJjZSA9IHJlcXVpcmUoJy4vZG9tX2V2ZW50c19zb3VyY2UnKVxuXHQsIENvbXBvbmVudCA9IHJlcXVpcmUoJy4uL2NfY2xhc3MnKVxuXHQsIENvbXBvbmVudERhdGFTb3VyY2VFcnJvciA9IHJlcXVpcmUoJy4uLy4uL3V0aWwvZXJyb3InKS5Db21wb25lbnREYXRhU291cmNlXG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpXG5cdCwgY2hlY2sgPSByZXF1aXJlKCcuLi8uLi91dGlsL2NoZWNrJylcblx0LCBNYXRjaCA9IGNoZWNrLk1hdGNoO1xuXG5cbi8vIGNsYXNzIHRvIGhhbmRsZSBzdWJzY3JpYnRpb25zIHRvIGNoYW5nZXMgaW4gRE9NIGZvciBVSSAobWF5YmUgYWxzbyBjb250ZW50IGVkaXRhYmxlKSBlbGVtZW50c1xudmFyIENvbXBvbmVudERhdGFTb3VyY2UgPSBfLmNyZWF0ZVN1YmNsYXNzKERPTUV2ZW50c1NvdXJjZSwgJ0NvbXBvbmVudERhdGFTb3VyY2UnLCB0cnVlKTtcblxuXG5fLmV4dGVuZFByb3RvKENvbXBvbmVudERhdGFTb3VyY2UsIHtcblx0Ly8gaW1wbGVtZW50aW5nIE1lc3NhZ2VTb3VyY2UgaW50ZXJmYWNlXG5cdGluaXQ6IGluaXRDb21wb25lbnREYXRhU291cmNlLFxuXHR0cmFuc2xhdGVUb1NvdXJjZU1lc3NhZ2U6IHRyYW5zbGF0ZVRvRG9tRXZlbnQsXG4gXHRhZGRTb3VyY2VMaXN0ZW5lcjogYWRkRG9tRXZlbnRMaXN0ZW5lcixcbiBcdHJlbW92ZVNvdXJjZUxpc3RlbmVyOiByZW1vdmVEb21FdmVudExpc3RlbmVyLFxuIFx0ZmlsdGVyU291cmNlTWVzc2FnZTogZmlsdGVyRGF0YU1lc3NhZ2UsXG5cbiBcdC8vIGNsYXNzIHNwZWNpZmljIG1ldGhvZHNcbiBcdC8vIGRvbTogaW1wbGVtZW50ZWQgaW4gRE9NRXZlbnRzU291cmNlXG4gXHR2YWx1ZTogZ2V0RG9tRWxlbWVudERhdGFWYWx1ZSxcbiBcdGhhbmRsZUV2ZW50OiBoYW5kbGVFdmVudCwgIC8vIGV2ZW50IGRpc3BhdGNoZXIgLSBhcyBkZWZpbmVkIGJ5IEV2ZW50IERPTSBBUElcbiBcdHRyaWdnZXI6IHRyaWdnZXJEYXRhTWVzc2FnZSAvLyByZWRlZmluZXMgbWV0aG9kIG9mIHN1cGVyY2xhc3MgRE9NRXZlbnRzU291cmNlXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb25lbnREYXRhU291cmNlO1xuXG5cbmZ1bmN0aW9uIGluaXRDb21wb25lbnREYXRhU291cmNlKCkge1xuXHRET01FdmVudHNTb3VyY2UucHJvdG90eXBlLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuXHR0aGlzLnZhbHVlKCk7IC8vIHN0b3JlcyBjdXJyZW50IGNvbXBvbmVudCBkYXRhIHZhbHVlIGluIHRoaXMuX3ZhbHVlXG59XG5cblxuLy8gVE9ETzogc2hvdWxkIHJldHVybiB2YWx1ZSBkZXBlbmRlbnQgb24gZWxlbWVudCB0YWdcbmZ1bmN0aW9uIGdldERvbUVsZW1lbnREYXRhVmFsdWUoKSB7IC8vIHZhbHVlIG1ldGhvZFxuXHR2YXIgbmV3VmFsdWUgPSB0aGlzLmNvbXBvbmVudC5lbC52YWx1ZTtcblxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ192YWx1ZScsIHtcblx0XHRjb25maWd1cmFibGU6IHRydWUsXG5cdFx0dmFsdWU6IG5ld1ZhbHVlXG5cdH0pO1xuXG5cdHJldHVybiBuZXdWYWx1ZTtcbn1cblxuXG4vLyBUT0RPOiB0aGlzIGZ1bmN0aW9uIHNob3VsZCByZXR1cm4gcmVsZXZhbnQgRE9NIGV2ZW50IGRlcGVuZGVudCBvbiBlbGVtZW50IHRhZ1xuLy8gQ2FuIGFsc28gaW1wbGVtZW50IGJlZm9yZWRhdGFjaGFuZ2VkIGV2ZW50IHRvIGFsbG93IHByZXZlbnRpbmcgdGhlIGNoYW5nZVxuZnVuY3Rpb24gdHJhbnNsYXRlVG9Eb21FdmVudChtZXNzYWdlKSB7XG5cdGlmIChtZXNzYWdlID09ICdkYXRhY2hhbmdlZCcpXG5cdFx0cmV0dXJuICdpbnB1dCc7XG5cdGVsc2Vcblx0XHR0aHJvdyBuZXcgQ29tcG9uZW50RGF0YVNvdXJjZUVycm9yKCd1bmtub3duIGNvbXBvbmVudCBkYXRhIGV2ZW50Jyk7XG59XG5cblxuZnVuY3Rpb24gYWRkRG9tRXZlbnRMaXN0ZW5lcihldmVudFR5cGUpIHtcblx0dGhpcy5kb20oKS5hZGRFdmVudExpc3RlbmVyKGV2ZW50VHlwZSwgdGhpcywgZmFsc2UpOyAvLyBubyBjYXB0dXJpbmdcbn1cblxuXG5mdW5jdGlvbiByZW1vdmVEb21FdmVudExpc3RlbmVyKGV2ZW50VHlwZSkge1xuXHR0aGlzLmRvbSgpLnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlLCB0aGlzLCBmYWxzZSk7IC8vIG5vIGNhcHR1cmluZ1xufVxuXG5cbmZ1bmN0aW9uIGZpbHRlckRhdGFNZXNzYWdlKGV2ZW50VHlwZSwgbWVzc2FnZSwgZGF0YSkge1xuXHRyZXR1cm4gZGF0YS5uZXdWYWx1ZSAhPSBkYXRhLm9sZFZhbHVlO1xufTtcblxuXG4gLy8gZXZlbnQgZGlzcGF0Y2hlciAtIGFzIGRlZmluZWQgYnkgRXZlbnQgRE9NIEFQSVxuZnVuY3Rpb24gaGFuZGxlRXZlbnQoZXZlbnQpIHtcblx0dmFyIG9sZFZhbHVlID0gdGhpcy5fdmFsdWU7XG5cblx0dGhpcy5kaXNwYXRjaE1lc3NhZ2UoZXZlbnQudHlwZSwge1xuXHRcdG9sZFZhbHVlOiBvbGRWYWx1ZSxcblx0XHRuZXdWYWx1ZTogdGhpcy52YWx1ZSgpXG5cdH0pO1xufVxuXG5cbmZ1bmN0aW9uIHRyaWdnZXJEYXRhTWVzc2FnZShtZXNzYWdlLCBkYXRhKSB7XG5cdC8vIFRPRE8gLSBvcHBvc2l0ZSB0cmFuc2xhdGlvbiArIGV2ZW50IHRyaWdnZXIgXG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgnbW9sLXByb3RvJyk7XG5cblxuLy8gaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvUmVmZXJlbmNlL0V2ZW50c1xuXG52YXIgZXZlbnRUeXBlcyA9IHtcblx0Q2xpcGJvYXJkRXZlbnQ6IFsnY29weScsICdjdXQnLCAncGFzdGUnLCAnYmVmb3JlY29weScsICdiZWZvcmVjdXQnLCAnYmVmb3JlcGFzdGUnXSxcblx0RXZlbnQ6IFsnaW5wdXQnLCAncmVhZHlzdGF0ZWNoYW5nZSddLFxuXHRGb2N1c0V2ZW50OiBbJ2ZvY3VzJywgJ2JsdXInLCAnZm9jdXNpbicsICdmb2N1c291dCddLFxuXHRLZXlib2FyZEV2ZW50OiBbJ2tleWRvd24nLCAna2V5cHJlc3MnLCAgJ2tleXVwJ10sXG5cdE1vdXNlRXZlbnQ6IFsnY2xpY2snLCAnY29udGV4dG1lbnUnLCAnZGJsY2xpY2snLCAnbW91c2Vkb3duJywgJ21vdXNldXAnLFxuXHRcdFx0XHQgJ21vdXNlZW50ZXInLCAnbW91c2VsZWF2ZScsICdtb3VzZW1vdmUnLCAnbW91c2VvdXQnLCAnbW91c2VvdmVyJyxcblx0XHRcdFx0ICdzaG93JyAvKiBjb250ZXh0IG1lbnUgKi9dLFxuXHRUb3VjaEV2ZW50OiBbJ3RvdWNoc3RhcnQnLCAndG91Y2hlbmQnLCAndG91Y2htb3ZlJywgJ3RvdWNoZW50ZXInLCAndG91Y2hsZWF2ZScsICd0b3VjaGNhbmNlbCddLFxufTtcblxuXG4vLyBtb2NrIHdpbmRvdyBhbmQgZXZlbnQgY29uc3RydWN0b3JzIGZvciB0ZXN0aW5nXG5pZiAodHlwZW9mIHdpbmRvdyAhPSAndW5kZWZpbmVkJylcblx0dmFyIGdsb2JhbCA9IHdpbmRvdztcbmVsc2Uge1xuXHRnbG9iYWwgPSB7fTtcblx0Xy5lYWNoS2V5KGV2ZW50VHlwZXMsIGZ1bmN0aW9uKGVUeXBlcywgZXZlbnRDb25zdHJ1Y3Rvck5hbWUpIHtcblx0XHR2YXIgZXZlbnRzQ29uc3RydWN0b3I7XG5cdFx0ZXZhbChcblx0XHRcdCdldmVudHNDb25zdHJ1Y3RvciA9IGZ1bmN0aW9uICcgKyBldmVudENvbnN0cnVjdG9yTmFtZSArICcodHlwZSwgcHJvcGVydGllcykgeyBcXFxuXHRcdFx0XHR0aGlzLnR5cGUgPSB0eXBlOyBcXFxuXHRcdFx0XHRfLmV4dGVuZCh0aGlzLCBwcm9wZXJ0aWVzKTsgXFxcblx0XHRcdH07J1xuXHRcdCk7XG5cdFx0Z2xvYmFsW2V2ZW50Q29uc3RydWN0b3JOYW1lXSA9IGV2ZW50c0NvbnN0cnVjdG9yO1xuXHR9KTtcbn1cblxuXG52YXIgZG9tRXZlbnRzQ29uc3RydWN0b3JzID0ge307XG5cbl8uZWFjaEtleShldmVudFR5cGVzLCBmdW5jdGlvbihlVHlwZXMsIGV2ZW50Q29uc3RydWN0b3JOYW1lKSB7XG5cdGVUeXBlcy5mb3JFYWNoKGZ1bmN0aW9uKHR5cGUpIHtcblx0XHRpZiAoT2JqZWN0Lmhhc093blByb3BlcnR5KGRvbUV2ZW50c0NvbnN0cnVjdG9ycywgdHlwZSkpXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ2R1cGxpY2F0ZSBldmVudCB0eXBlICcgKyB0eXBlKTtcblxuXHRcdGRvbUV2ZW50c0NvbnN0cnVjdG9yc1t0eXBlXSA9IGdsb2JhbFtldmVudENvbnN0cnVjdG9yTmFtZV07XG5cdH0pO1xufSk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBkb21FdmVudHNDb25zdHJ1Y3RvcnM7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBNZXNzYWdlU291cmNlID0gcmVxdWlyZSgnLi4vLi4vbWVzc2VuZ2VyL21lc3NhZ2Vfc291cmNlJylcblx0LCBDb21wb25lbnQgPSByZXF1aXJlKCcuLi9jX2NsYXNzJylcblx0LCBkb21FdmVudHNDb25zdHJ1Y3RvcnMgPSByZXF1aXJlKCcuL2RvbV9ldmVudHNfY29uc3RydWN0b3JzJykgLy8gVE9ETyBtZXJnZSB3aXRoIERPTUV2ZW50U291cmNlID8/XG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpXG5cdCwgY2hlY2sgPSByZXF1aXJlKCcuLi8uLi91dGlsL2NoZWNrJylcblx0LCBNYXRjaCA9IGNoZWNrLk1hdGNoO1xuXG52YXIgRE9NRXZlbnRzU291cmNlID0gXy5jcmVhdGVTdWJjbGFzcyhNZXNzYWdlU291cmNlLCAnRE9NTWVzc2FnZVNvdXJjZScsIHRydWUpO1xuXG5cbl8uZXh0ZW5kUHJvdG8oRE9NRXZlbnRzU291cmNlLCB7XG5cdC8vIGltcGxlbWVudGluZyBNZXNzYWdlU291cmNlIGludGVyZmFjZVxuXHRpbml0OiBpbml0RG9tRXZlbnRzU291cmNlLFxuXHR0cmFuc2xhdGVUb1NvdXJjZU1lc3NhZ2U6IHRyYW5zbGF0ZVRvRG9tRXZlbnQsXG4gXHRhZGRTb3VyY2VMaXN0ZW5lcjogYWRkRG9tRXZlbnRMaXN0ZW5lcixcbiBcdHJlbW92ZVNvdXJjZUxpc3RlbmVyOiByZW1vdmVEb21FdmVudExpc3RlbmVyLFxuIFx0ZmlsdGVyU291cmNlTWVzc2FnZTogZmlsdGVyQ2FwdHVyZWREb21FdmVudCxcblxuIFx0Ly8gY2xhc3Mgc3BlY2lmaWMgbWV0aG9kc1xuIFx0ZG9tOiBnZXREb21FbGVtZW50LFxuIFx0aGFuZGxlRXZlbnQ6IGhhbmRsZUV2ZW50LCAgLy8gZXZlbnQgZGlzcGF0Y2hlciAtIGFzIGRlZmluZWQgYnkgRXZlbnQgRE9NIEFQSVxuIFx0dHJpZ2dlcjogdHJpZ2dlckRvbUV2ZW50XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBET01FdmVudHNTb3VyY2U7XG5cblxudmFyIHVzZUNhcHR1cmVQYXR0ZXJuID0gL19fY2FwdHVyZSQvO1xuXG5cbmZ1bmN0aW9uIGluaXREb21FdmVudHNTb3VyY2UoaG9zdE9iamVjdCwgcHJveHlNZXRob2RzLCBjb21wb25lbnQpIHtcblx0Y2hlY2soY29tcG9uZW50LCBDb21wb25lbnQpO1xuXHRNZXNzYWdlU291cmNlLnByb3RvdHlwZS5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cblx0dGhpcy5jb21wb25lbnQgPSBjb21wb25lbnQ7XG5cblx0Ly8gdGhpcy5tZXNzZW5nZXIgaXMgc2V0IGJ5IE1lc3NlbmdlciBjbGFzc1xufVxuXG5cbmZ1bmN0aW9uIGdldERvbUVsZW1lbnQoKSB7XG5cdHJldHVybiB0aGlzLmNvbXBvbmVudC5lbDtcbn1cblxuXG5mdW5jdGlvbiB0cmFuc2xhdGVUb0RvbUV2ZW50KG1lc3NhZ2UpIHtcblx0aWYgKHVzZUNhcHR1cmVQYXR0ZXJuLnRlc3QobWVzc2FnZSkpXG5cdFx0bWVzc2FnZSA9IG1lc3NhZ2UucmVwbGFjZSh1c2VDYXB0dXJlUGF0dGVybiwgJycpO1xuXHRyZXR1cm4gbWVzc2FnZTtcbn1cblxuXG5mdW5jdGlvbiBhZGREb21FdmVudExpc3RlbmVyKGV2ZW50VHlwZSkge1xuXHR0aGlzLmRvbSgpLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlLCB0aGlzLCB0cnVlKTtcbn1cblxuXG5mdW5jdGlvbiByZW1vdmVEb21FdmVudExpc3RlbmVyKGV2ZW50VHlwZSkge1xuXHR0aGlzLmRvbSgpLnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlLCB0aGlzLCB0cnVlKTtcbn1cblxuXG5mdW5jdGlvbiBmaWx0ZXJDYXB0dXJlZERvbUV2ZW50KGV2ZW50VHlwZSwgbWVzc2FnZSwgZXZlbnQpIHtcblx0dmFyIGlzQ2FwdHVyZVBoYXNlO1xuXHRpZiAodHlwZW9mIHdpbmRvdyAhPSAndW5kZWZpbmVkJylcblx0XHRpc0NhcHR1cmVQaGFzZSA9IGV2ZW50LmV2ZW50UGhhc2UgPT0gd2luZG93LkV2ZW50LkNBUFRVUklOR19QSEFTRTtcblxuXHRyZXR1cm4gKCEgaXNDYXB0dXJlUGhhc2UgfHwgKGlzQ2FwdHVyZVBoYXNlICYmIHVzZUNhcHR1cmVQYXR0ZXJuLnRlc3QobWVzc2FnZSkpKTtcbn1cblxuXG4vLyBldmVudCBkaXNwYXRjaGVyIC0gYXMgZGVmaW5lZCBieSBFdmVudCBET00gQVBJXG5mdW5jdGlvbiBoYW5kbGVFdmVudChldmVudCkge1xuXHR0aGlzLmRpc3BhdGNoTWVzc2FnZShldmVudC50eXBlLCBldmVudCk7XG59XG5cblxuLy8gVE9ETyBtYWtlIHdvcmsgd2l0aCBtZXNzYWdlcyAod2l0aCBfY2FwdHVyZSlcbmZ1bmN0aW9uIHRyaWdnZXJEb21FdmVudChldmVudFR5cGUsIHByb3BlcnRpZXMpIHtcblx0Y2hlY2soZXZlbnRUeXBlLCBTdHJpbmcpO1xuXHRjaGVjayhwcm9wZXJ0aWVzLCBNYXRjaC5PcHRpb25hbChPYmplY3QpKTtcblxuXHR2YXIgRXZlbnRDb25zdHJ1Y3RvciA9IGRvbUV2ZW50c0NvbnN0cnVjdG9yc1tldmVudFR5cGVdO1xuXG5cdGlmICh0eXBlb2YgZXZlbnRDb25zdHJ1Y3RvciAhPSAnZnVuY3Rpb24nKVxuXHRcdHRocm93IG5ldyBFcnJvcigndW5zdXBwb3J0ZWQgZXZlbnQgdHlwZScpO1xuXG5cdC8vIGNoZWNrIGlmIGl0IGlzIGNvcnJlY3Rcblx0aWYgKHR5cGVvZiBwcm9wZXJ0aWVzICE9ICd1bmRlZmluZWQnKVxuXHRcdHByb3BlcnRpZXMudHlwZSA9IGV2ZW50VHlwZTtcblxuXHR2YXIgZG9tRXZlbnQgPSBFdmVudENvbnN0cnVjdG9yKGV2ZW50VHlwZSwgcHJvcGVydGllcyk7XG5cblx0dmFyIG5vdENhbmNlbGxlZCA9IHRoaXMuZG9tKCkuZGlzcGF0Y2hFdmVudChkb21FdmVudCk7XG5cblx0cmV0dXJuIG5vdENhbmNlbGxlZDtcbn0iLCIndXNlIHN0cmljdCc7XG5cbnZhciBDbGFzc1JlZ2lzdHJ5ID0gcmVxdWlyZSgnLi4vYWJzdHJhY3QvcmVnaXN0cnknKVxuXHQsIENvbXBvbmVudCA9IHJlcXVpcmUoJy4vY19jbGFzcycpO1xuXG52YXIgY29tcG9uZW50c1JlZ2lzdHJ5ID0gbmV3IENsYXNzUmVnaXN0cnkoQ29tcG9uZW50KTtcblxuY29tcG9uZW50c1JlZ2lzdHJ5LmFkZChDb21wb25lbnQpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNvbXBvbmVudHNSZWdpc3RyeTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIENvbXBvbmVudCA9IHJlcXVpcmUoJy4uL2NfY2xhc3MnKVxuXHQsIGNvbXBvbmVudHNSZWdpc3RyeSA9IHJlcXVpcmUoJy4uL2NfcmVnaXN0cnknKTtcblxuXG52YXIgVmlldyA9IENvbXBvbmVudC5jcmVhdGVDb21wb25lbnRDbGFzcygnVmlldycsIFsnY29udGFpbmVyJ10pO1xuXG5jb21wb25lbnRzUmVnaXN0cnkuYWRkKFZpZXcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZpZXc7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgnbW9sLXByb3RvJyk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBjb25maWc7XG5cbmZ1bmN0aW9uIGNvbmZpZyhvcHRpb25zKSB7XG5cdF8uZGVlcEV4dGVuZChjb25maWcsIG9wdGlvbnMpO1xufVxuXG5jb25maWcoe1xuXHRhdHRyczoge1xuXHRcdGJpbmQ6ICdtbC1iaW5kJyxcblx0XHRsb2FkOiAnbWwtbG9hZCdcblx0fVxufSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgnbW9sLXByb3RvJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gRmFjZXQ7XG5cbmZ1bmN0aW9uIEZhY2V0KG93bmVyLCBvcHRpb25zKSB7XG5cdHRoaXMub3duZXIgPSBvd25lcjtcblx0dGhpcy5vcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblx0dGhpcy5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59XG5cbl8uZXh0ZW5kUHJvdG8oRmFjZXQsIHtcblx0aW5pdDogZnVuY3Rpb24oKSB7fVxufSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBGYWNldCA9IHJlcXVpcmUoJy4vZl9jbGFzcycpXG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpXG5cdCwgY2hlY2sgPSByZXF1aXJlKCcuLi91dGlsL2NoZWNrJylcblx0LCBNYXRjaCA9IGNoZWNrLk1hdGNoO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEZhY2V0ZWRPYmplY3Q7XG5cbi8vIGFic3RyYWN0IGNsYXNzIGZvciBmYWNldGVkIG9iamVjdFxuZnVuY3Rpb24gRmFjZXRlZE9iamVjdChmYWNldHNPcHRpb25zIC8qLCBvdGhlciBhcmdzIC0gcGFzc2VkIHRvIGluaXQgbWV0aG9kICovKSB7XG5cdC8vIFRPRE8gaW5zdGFudGlhdGUgZmFjZXRzIGlmIGNvbmZpZ3VyYXRpb24gaXNuJ3QgcGFzc2VkXG5cdC8vIHdyaXRlIGEgdGVzdCB0byBjaGVjayBpdFxuXHRmYWNldHNPcHRpb25zID0gZmFjZXRzT3B0aW9ucyA/IF8uY2xvbmUoZmFjZXRzT3B0aW9ucykgOiB7fTtcblxuXHR2YXIgdGhpc0NsYXNzID0gdGhpcy5jb25zdHJ1Y3RvclxuXHRcdCwgZmFjZXRzID0ge307XG5cblx0aWYgKHRoaXMuY29uc3RydWN0b3IgPT0gRmFjZXRlZE9iamVjdClcdFx0XG5cdFx0dGhyb3cgbmV3IEVycm9yKCdGYWNldGVkT2JqZWN0IGlzIGFuIGFic3RyYWN0IGNsYXNzLCBjYW5cXCd0IGJlIGluc3RhbnRpYXRlZCcpO1xuXHQvL2lmICghIHRoaXNDbGFzcy5wcm90b3R5cGUuZmFjZXRzKVxuXHQvL1x0dGhyb3cgbmV3IEVycm9yKCdObyBmYWNldHMgZGVmaW5lZCBpbiBjbGFzcyAnICsgdGhpcy5jb25zdHJ1Y3Rvci5uYW1lKTtcblx0XG5cdC8vIF8uZWFjaEtleShmYWNldHNPcHRpb25zLCBpbnN0YW50aWF0ZUZhY2V0LCB0aGlzLCB0cnVlKTtcblxuXHRpZiAodGhpcy5mYWNldHMpXG5cdFx0Xy5lYWNoS2V5KHRoaXMuZmFjZXRzLCBpbnN0YW50aWF0ZUZhY2V0LCB0aGlzLCB0cnVlKTtcblxuXHR2YXIgdW51c2VkRmFjZXRzTmFtZXMgPSBPYmplY3Qua2V5cyhmYWNldHNPcHRpb25zKTtcblx0aWYgKHVudXNlZEZhY2V0c05hbWVzLmxlbmd0aClcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ0NvbmZpZ3VyYXRpb24gZm9yIHVua25vd24gZmFjZXQocykgcGFzc2VkOiAnICsgdW51c2VkRmFjZXRzTmFtZXMuam9pbignLCAnKSk7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnRpZXModGhpcywgZmFjZXRzKTtcblxuXHQvLyBjYWxsaW5nIGluaXQgaWYgaXQgaXMgZGVmaW5lZCBpbiB0aGUgY2xhc3Ncblx0aWYgKHRoaXMuaW5pdClcblx0XHR0aGlzLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuXHRmdW5jdGlvbiBpbnN0YW50aWF0ZUZhY2V0KC8qIGZhY2V0T3B0cyAqLyBGYWNldENsYXNzLCBmY3QpIHtcblx0XHQvLyB2YXIgRmFjZXRDbGFzcyA9IHRoaXMuZmFjZXRzW2ZjdF07XG5cdFx0dmFyIGZhY2V0T3B0cyA9IGZhY2V0c09wdGlvbnNbZmN0XTtcblx0XHRkZWxldGUgZmFjZXRzT3B0aW9uc1tmY3RdO1xuXG5cdFx0ZmFjZXRzW2ZjdF0gPSB7XG5cdFx0XHRlbnVtZXJhYmxlOiBmYWxzZSxcblx0XHRcdHZhbHVlOiBuZXcgRmFjZXRDbGFzcyh0aGlzLCBmYWNldE9wdHMpXG5cdFx0fTtcblx0fVxufVxuXG5cbl8uZXh0ZW5kUHJvdG8oRmFjZXRlZE9iamVjdCwge1xuXHRhZGRGYWNldDogYWRkRmFjZXRcbn0pO1xuXG5cbmZ1bmN0aW9uIGFkZEZhY2V0KEZhY2V0Q2xhc3MsIGZhY2V0T3B0cywgZmFjZXROYW1lKSB7XG5cdGNoZWNrKEZhY2V0Q2xhc3MsIEZ1bmN0aW9uKTtcblx0Y2hlY2soZmFjZXROYW1lLCBNYXRjaC5PcHRpb25hbChTdHJpbmcpKTtcblxuXHRmYWNldE5hbWUgPSBfLmZpcnN0TG93ZXJDYXNlKGZhY2V0TmFtZSB8fCBGYWNldENsYXNzLm5hbWUpO1xuXG5cdHZhciBwcm90b0ZhY2V0cyA9IHRoaXMuY29uc3RydWN0b3IucHJvdG90eXBlLmZhY2V0cztcblxuXHRpZiAocHJvdG9GYWNldHMgJiYgcHJvdG9GYWNldHNbZmFjZXROYW1lXSlcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ2ZhY2V0ICcgKyBmYWNldE5hbWUgKyAnIGlzIGFscmVhZHkgcGFydCBvZiB0aGUgY2xhc3MgJyArIHRoaXMuY29uc3RydWN0b3IubmFtZSk7XG5cblx0aWYgKHRoaXNbZmFjZXROYW1lXSlcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ2ZhY2V0ICcgKyBmYWNldE5hbWUgKyAnIGlzIGFscmVhZHkgcHJlc2VudCBpbiBvYmplY3QnKTtcblxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgZmFjZXROYW1lLCB7XG5cdFx0ZW51bWVyYWJsZTogZmFsc2UsXG5cdFx0dmFsdWU6IG5ldyBGYWNldENsYXNzKHRoaXMsIGZhY2V0T3B0cylcblx0fSk7XG59XG5cblxuLy8gZmFjdG9yeSB0aGF0IGNyZWF0ZXMgY2xhc3NlcyAoY29uc3RydWN0b3JzKSBmcm9tIHRoZSBtYXAgb2YgZmFjZXRzXG4vLyB0aGVzZSBjbGFzc2VzIGluaGVyaXQgZnJvbSBGYWNldGVkT2JqZWN0XG5GYWNldGVkT2JqZWN0LmNyZWF0ZUZhY2V0ZWRDbGFzcyA9IGZ1bmN0aW9uIChuYW1lLCBmYWNldHNDbGFzc2VzKSB7XG5cdGNoZWNrKG5hbWUsIFN0cmluZyk7XG5cdGNoZWNrKGZhY2V0c0NsYXNzZXMsIE1hdGNoLk9iamVjdEhhc2goRnVuY3Rpb24gLyogTWF0Y2guU3ViY2xhc3MoRmFjZXQsIHRydWUpIFRPRE8gLSBmaXggKi8pKTtcblxuXHR2YXIgRmFjZXRlZENsYXNzID0gXy5jcmVhdGVTdWJjbGFzcyh0aGlzLCBuYW1lLCB0cnVlKTtcblxuXHRfLmV4dGVuZFByb3RvKEZhY2V0ZWRDbGFzcywge1xuXHRcdGZhY2V0czogZmFjZXRzQ2xhc3Nlc1xuXHR9KTtcblx0cmV0dXJuIEZhY2V0ZWRDbGFzcztcbn07XG5cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIG1pbG9NYWlsID0gcmVxdWlyZSgnLi9tYWlsJylcblx0LCByZXF1ZXN0ID0gcmVxdWlyZSgnLi91dGlsL3JlcXVlc3QnKVxuXHQsIGxvZ2dlciA9IHJlcXVpcmUoJy4vdXRpbC9sb2dnZXInKVxuXHQsIGNvbmZpZyA9IHJlcXVpcmUoJy4vY29uZmlnJylcblx0LCBMb2FkQXR0cmlidXRlID0gcmVxdWlyZSgnLi9hdHRyaWJ1dGUvYV9sb2FkJylcblx0LCBMb2FkZXJFcnJvciA9IHJlcXVpcmUoJy4vdXRpbC9lcnJvcicpLkxvYWRlcjtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGxvYWRlcjtcblxuXG5mdW5jdGlvbiBsb2FkZXIocm9vdEVsLCBjYWxsYmFjaykge1x0XG5cdG1pbG9NYWlsLm9uTWVzc2FnZSgnZG9tcmVhZHknLCBmdW5jdGlvbigpIHtcblx0XHRpZiAodHlwZW9mIHJvb3RFbCA9PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRjYWxsYmFjayA9IHJvb3RFbDtcblx0XHRcdHJvb3RFbCA9IHVuZGVmaW5lZDtcblx0XHR9XG5cblx0XHRyb290RWwgPSByb290RWwgfHwgZG9jdW1lbnQuYm9keTtcblxuXHRcdG1pbG9NYWlsLnBvc3RNZXNzYWdlKCdsb2FkZXInLCB7IHN0YXRlOiAnc3RhcnRlZCcgfSk7XG5cdFx0X2xvYWRlcihyb290RWwsIGZ1bmN0aW9uKHZpZXdzKSB7XG5cdFx0XHRtaWxvTWFpbC5wb3N0TWVzc2FnZSgnbG9hZGVyJywgeyBcblx0XHRcdFx0c3RhdGU6ICdmaW5pc2hlZCcsXG5cdFx0XHRcdHZpZXdzOiB2aWV3c1xuXHRcdFx0fSk7XG5cdFx0XHRjYWxsYmFjayh2aWV3cyk7XG5cdFx0fSk7XG5cdH0pO1xufVxuXG5cbmZ1bmN0aW9uIF9sb2FkZXIocm9vdEVsLCBjYWxsYmFjaykge1xuXHR2YXIgbG9hZEVsZW1lbnRzID0gcm9vdEVsLnF1ZXJ5U2VsZWN0b3JBbGwoJ1snICsgY29uZmlnLmF0dHJzLmxvYWQgKyAnXScpO1xuXG5cdHZhciB2aWV3cyA9IHt9XG5cdFx0LCB0b3RhbENvdW50ID0gbG9hZEVsZW1lbnRzLmxlbmd0aFxuXHRcdCwgbG9hZGVkQ291bnQgPSAwO1xuXG5cdEFycmF5LnByb3RvdHlwZS5mb3JFYWNoLmNhbGwobG9hZEVsZW1lbnRzLCBmdW5jdGlvbiAoZWwpIHtcblx0XHRsb2FkVmlldyhlbCwgZnVuY3Rpb24oZXJyKSB7XG5cdFx0XHR2aWV3c1tlbC5pZF0gPSBlcnIgfHwgZWw7XG5cdFx0XHRsb2FkZWRDb3VudCsrO1xuXHRcdFx0aWYgKGxvYWRlZENvdW50ID09IHRvdGFsQ291bnQpXG5cdFx0XHRcdGNhbGxiYWNrKHZpZXdzKTtcblx0XHR9KTtcblx0fSk7XG59O1xuXG5cbmZ1bmN0aW9uIGxvYWRWaWV3KGVsLCBjYWxsYmFjaykge1xuXHRpZiAoZWwuY2hpbGRyZW4ubGVuZ3RoKVxuXHRcdHRocm93IG5ldyBMb2FkZXJFcnJvcignY2FuXFwndCBsb2FkIGh0bWwgaW50byBlbGVtZW50IHRoYXQgaXMgbm90IGVtcHR5Jyk7XG5cblx0dmFyIGF0dHIgPSBuZXcgTG9hZEF0dHJpYnV0ZShlbCk7XG5cblx0YXR0ci5wYXJzZSgpLnZhbGlkYXRlKCk7XG5cblx0cmVxdWVzdC5nZXQoYXR0ci5sb2FkVXJsLCBmdW5jdGlvbihlcnIsIGh0bWwpIHtcblx0XHRpZiAoZXJyKSB7XG5cdFx0XHRlcnIubWVzc2FnZSA9IGVyci5tZXNzYWdlIHx8ICdjYW5cXCd0IGxvYWQgZmlsZSAnICsgYXR0ci5sb2FkVXJsO1xuXHRcdFx0Ly8gbG9nZ2VyLmVycm9yKGVyci5tZXNzYWdlKTtcblx0XHRcdGNhbGxiYWNrKGVycik7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0ZWwuaW5uZXJIVE1MID0gaHRtbDtcblx0XHRjYWxsYmFjayhudWxsKTtcblx0fSk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBNZXNzZW5nZXIgPSByZXF1aXJlKCcuLi9tZXNzZW5nZXInKVxuXHQsIE1haWxNZXNzYWdlU291cmNlID0gcmVxdWlyZSgnLi9tYWlsX3NvdXJjZScpO1xuXG5cbnZhciBtYWlsTXNnU291cmNlID0gbmV3IE1haWxNZXNzYWdlU291cmNlKCk7XG5cbnZhciBtaWxvTWFpbCA9IG5ldyBNZXNzZW5nZXIodW5kZWZpbmVkLCB1bmRlZmluZWQsIG1haWxNc2dTb3VyY2UpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG1pbG9NYWlsO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgTWVzc2FnZVNvdXJjZSA9IHJlcXVpcmUoJy4uL21lc3Nlbmdlci9tZXNzYWdlX3NvdXJjZScpXG5cdCwgZG9tRXZlbnRzQ29uc3RydWN0b3JzID0gcmVxdWlyZSgnLi4vY29tcG9uZW50cy9jX21lc3NhZ2Vfc291cmNlcy9kb21fZXZlbnRzX2NvbnN0cnVjdG9ycycpXG5cdCwgTWFpbE1lc3NhZ2VTb3VyY2VFcnJvciA9IHJlcXVpcmUoJy4uL3V0aWwvZXJyb3InKS5NYWlsTWVzc2FnZVNvdXJjZVxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vdXRpbC9jaGVjaycpXG5cdCwgTWF0Y2ggPSBjaGVjay5NYXRjaDtcblxuXG52YXIgTWFpbE1lc3NhZ2VTb3VyY2UgPSBfLmNyZWF0ZVN1YmNsYXNzKE1lc3NhZ2VTb3VyY2UsICdNYWlsTWVzc2FnZVNvdXJjZScsIHRydWUpO1xuXG5cbl8uZXh0ZW5kUHJvdG8oTWFpbE1lc3NhZ2VTb3VyY2UsIHtcblx0Ly8gaW1wbGVtZW50aW5nIE1lc3NhZ2VTb3VyY2UgaW50ZXJmYWNlXG5cdC8vIGluaXQ6IGRlZmluZWQgaW4gTWVzc2FnZVNvdXJjZVxuXHR0cmFuc2xhdGVUb1NvdXJjZU1lc3NhZ2U6IHRyYW5zbGF0ZVRvRG9tRXZlbnQsXG4gXHRhZGRTb3VyY2VMaXN0ZW5lcjogYWRkRG9tRXZlbnRMaXN0ZW5lcixcbiBcdHJlbW92ZVNvdXJjZUxpc3RlbmVyOiByZW1vdmVEb21FdmVudExpc3RlbmVyLFxuIFx0ZmlsdGVyU291cmNlTWVzc2FnZTogZmlsdGVyRG9tRXZlbnQsXG5cbiBcdC8vIGNsYXNzIHNwZWNpZmljIG1ldGhvZHNcbiBcdGhhbmRsZUV2ZW50OiBoYW5kbGVFdmVudCwgIC8vIGV2ZW50IGRpc3BhdGNoZXIgLSBhcyBkZWZpbmVkIGJ5IEV2ZW50IERPTSBBUElcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1haWxNZXNzYWdlU291cmNlO1xuXG5cbi8vIFRPRE86IHRoaXMgZnVuY3Rpb24gc2hvdWxkIHJldHVybiByZWxldmFudCBET00gZXZlbnQgZGVwZW5kZW50IG9uIGVsZW1lbnQgdGFnXG4vLyBDYW4gYWxzbyBpbXBsZW1lbnQgYmVmb3JlZGF0YWNoYW5nZWQgZXZlbnQgdG8gYWxsb3cgcHJldmVudGluZyB0aGUgY2hhbmdlXG5mdW5jdGlvbiB0cmFuc2xhdGVUb0RvbUV2ZW50KG1lc3NhZ2UpIHtcblx0aWYgKG1lc3NhZ2UgPT0gJ2RvbXJlYWR5Jylcblx0XHRyZXR1cm4gJ3JlYWR5c3RhdGVjaGFuZ2UnO1xufVxuXG5cbmZ1bmN0aW9uIGFkZERvbUV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlKSB7XG5cdGlmICh0eXBlb2YgZG9jdW1lbnQgPT0gJ29iamVjdCcpIHtcblx0XHRpZiAoZXZlbnRUeXBlID09ICdyZWFkeXN0YXRlY2hhbmdlJykge1xuXHRcdFx0aWYgKGRvY3VtZW50LnJlYWR5U3RhdGUgPT0gJ2xvYWRpbmcnKVxuXHRcdFx0XHRkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50VHlwZSwgdGhpcywgZmFsc2UpOyAvLyBubyBjYXB0dXJpbmdcblx0XHRcdGVsc2Uge1xuXHRcdFx0XHR2YXIgZG9tRXZlbnQgPSBFdmVudENvbnN0cnVjdG9yKGV2ZW50VHlwZSwgeyB0YXJnZXQ6IGRvY3VtZW50IH0pO1xuXHRcdFx0XHR0aGlzLmRpc3BhdGNoTWVzc2FnZShldmVudFR5cGUsIGV2ZW50KTtcblx0XHRcdH1cblx0XHR9XG5cdH1cbn1cblxuXG5mdW5jdGlvbiByZW1vdmVEb21FdmVudExpc3RlbmVyKGV2ZW50VHlwZSkge1xuXHRpZiAodHlwZW9mIGRvY3VtZW50ID09ICdvYmplY3QnKVxuXHRcdGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlLCB0aGlzLCBmYWxzZSk7IC8vIG5vIGNhcHR1cmluZ1xufVxuXG5cbmZ1bmN0aW9uIGZpbHRlckRvbUV2ZW50KGV2ZW50VHlwZSwgbWVzc2FnZSwgZXZlbnQpIHtcblx0aWYgKGV2ZW50VHlwZSA9PSAncmVhZHlzdGF0ZWNoYW5nZScpIHtcblx0XHRpZiAodGhpcy5fZG9tUmVhZHlGaXJlZCkgcmV0dXJuIGZhbHNlO1xuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnX2RvbVJlYWR5RmlyZWQnLCB7XG5cdFx0XHR3cml0YWJsZTogdHJ1ZSxcblx0XHRcdHZhbHVlOiB0cnVlXG5cdFx0fSk7XG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cbn07XG5cblxuIC8vIGV2ZW50IGRpc3BhdGNoZXIgLSBhcyBkZWZpbmVkIGJ5IEV2ZW50IERPTSBBUElcbmZ1bmN0aW9uIGhhbmRsZUV2ZW50KGV2ZW50KSB7XG5cdHRoaXMuZGlzcGF0Y2hNZXNzYWdlKGV2ZW50LnR5cGUsIGV2ZW50KTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIE1peGluID0gcmVxdWlyZSgnLi4vYWJzdHJhY3QvbWl4aW4nKVxuXHQsIE1lc3NhZ2VTb3VyY2UgPSByZXF1aXJlKCcuL21lc3NhZ2Vfc291cmNlJylcblx0LCBfID0gcmVxdWlyZSgnbW9sLXByb3RvJylcblx0LCBjaGVjayA9IHJlcXVpcmUoJy4uL3V0aWwvY2hlY2snKVxuXHQsIE1hdGNoID0gY2hlY2suTWF0Y2hcblx0LCBNZXNzZW5nZXJFcnJvciA9IHJlcXVpcmUoJy4uL3V0aWwvZXJyb3InKS5NZXNzZW5nZXI7XG5cblxudmFyIGV2ZW50c1NwbGl0UmVnRXhwID0gL1xccyooPzpcXCx8XFxzKVxccyovO1xuXG5cbnZhciBNZXNzZW5nZXIgPSBfLmNyZWF0ZVN1YmNsYXNzKE1peGluLCAnTWVzc2VuZ2VyJyk7XG5cbl8uZXh0ZW5kUHJvdG8oTWVzc2VuZ2VyLCB7XG5cdGluaXQ6IGluaXRNZXNzZW5nZXIsIC8vIGNhbGxlZCBieSBNaXhpbiAoc3VwZXJjbGFzcylcblx0b25NZXNzYWdlOiByZWdpc3RlclN1YnNjcmliZXIsXG5cdG9mZk1lc3NhZ2U6IHJlbW92ZVN1YnNjcmliZXIsXG5cdG9uTWVzc2FnZXM6IHJlZ2lzdGVyU3Vic2NyaWJlcnMsXG5cdG9mZk1lc3NhZ2VzOiByZW1vdmVTdWJzY3JpYmVycyxcblx0cG9zdE1lc3NhZ2U6IHBvc3RNZXNzYWdlLFxuXHRnZXRTdWJzY3JpYmVyczogZ2V0TWVzc2FnZVN1YnNjcmliZXJzLFxuXHRfY2hvb3NlU3Vic2NyaWJlcnNIYXNoOiBfY2hvb3NlU3Vic2NyaWJlcnNIYXNoLFxuXHRfcmVnaXN0ZXJTdWJzY3JpYmVyOiBfcmVnaXN0ZXJTdWJzY3JpYmVyLFxuXHRfcmVtb3ZlU3Vic2NyaWJlcjogX3JlbW92ZVN1YnNjcmliZXIsXG5cdF9yZW1vdmVBbGxTdWJzY3JpYmVyczogX3JlbW92ZUFsbFN1YnNjcmliZXJzLFxuXHRfY2FsbFBhdHRlcm5TdWJzY3JpYmVyczogX2NhbGxQYXR0ZXJuU3Vic2NyaWJlcnMsXG5cdF9jYWxsU3Vic2NyaWJlcnM6IF9jYWxsU3Vic2NyaWJlcnNcbn0pO1xuXG5cbk1lc3Nlbmdlci5kZWZhdWx0TWV0aG9kcyA9IHtcblx0b25NZXNzYWdlOiAnb25NZXNzYWdlJyxcblx0b2ZmTWVzc2FnZTogJ29mZk1lc3NhZ2UnLFxuXHRvbk1lc3NhZ2VzOiAnb25NZXNzYWdlcycsXG5cdG9mZk1lc3NhZ2VzOiAnb2ZmTWVzc2FnZXMnLFxuXHRwb3N0TWVzc2FnZTogJ3Bvc3RNZXNzYWdlJyxcblx0Z2V0U3Vic2NyaWJlcnM6ICdnZXRTdWJzY3JpYmVycydcbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBNZXNzZW5nZXI7XG5cblxuZnVuY3Rpb24gaW5pdE1lc3Nlbmdlcihob3N0T2JqZWN0LCBwcm94eU1ldGhvZHMsIG1lc3NhZ2VTb3VyY2UpIHtcblx0Y2hlY2sobWVzc2FnZVNvdXJjZSwgTWF0Y2guT3B0aW9uYWwoTWVzc2FnZVNvdXJjZSkpO1xuXG5cdC8vIGhvc3RPYmplY3QgYW5kIHByb3h5TWV0aG9kcyBhcmUgdXNlZCBpbiBNaXhpblxuIFx0Ly8gbWVzc2VuZ2VyIGRhdGFcbiBcdE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRoaXMsIHtcbiBcdFx0X21lc3NhZ2VTdWJzY3JpYmVyczogeyB2YWx1ZToge30gfSxcbiBcdFx0X3BhdHRlcm5NZXNzYWdlU3Vic2NyaWJlcnM6IHsgdmFsdWU6IHt9IH0sXG4gXHRcdF9tZXNzYWdlU291cmNlOiB7IHZhbHVlOiBtZXNzYWdlU291cmNlIH1cbiBcdH0pO1xuXG4gXHRpZiAobWVzc2FnZVNvdXJjZSlcbiBcdFx0bWVzc2FnZVNvdXJjZS5tZXNzZW5nZXIgPSB0aGlzO1xufVxuXG5cbmZ1bmN0aW9uIHJlZ2lzdGVyU3Vic2NyaWJlcihtZXNzYWdlcywgc3Vic2NyaWJlcikge1xuXHRjaGVjayhtZXNzYWdlcywgTWF0Y2guT25lT2YoU3RyaW5nLCBbU3RyaW5nXSwgUmVnRXhwKSk7XG5cdGNoZWNrKHN1YnNjcmliZXIsIEZ1bmN0aW9uKTsgXG5cblx0aWYgKHR5cGVvZiBtZXNzYWdlcyA9PSAnc3RyaW5nJylcblx0XHRtZXNzYWdlcyA9IG1lc3NhZ2VzLnNwbGl0KGV2ZW50c1NwbGl0UmVnRXhwKTtcblxuXHR2YXIgc3Vic2NyaWJlcnNIYXNoID0gdGhpcy5fY2hvb3NlU3Vic2NyaWJlcnNIYXNoKG1lc3NhZ2VzKTtcblxuXHRpZiAobWVzc2FnZXMgaW5zdGFuY2VvZiBSZWdFeHApXG5cdFx0cmV0dXJuIHRoaXMuX3JlZ2lzdGVyU3Vic2NyaWJlcihzdWJzY3JpYmVyc0hhc2gsIG1lc3NhZ2VzLCBzdWJzY3JpYmVyKTtcblxuXHRlbHNlIHtcblx0XHR2YXIgd2FzUmVnaXN0ZXJlZCA9IGZhbHNlO1xuXG5cdFx0bWVzc2FnZXMuZm9yRWFjaChmdW5jdGlvbihtZXNzYWdlKSB7XG5cdFx0XHR2YXIgbm90WWV0UmVnaXN0ZXJlZCA9IHRoaXMuX3JlZ2lzdGVyU3Vic2NyaWJlcihzdWJzY3JpYmVyc0hhc2gsIG1lc3NhZ2UsIHN1YnNjcmliZXIpO1x0XHRcdFxuXHRcdFx0d2FzUmVnaXN0ZXJlZCA9IHdhc1JlZ2lzdGVyZWQgfHwgbm90WWV0UmVnaXN0ZXJlZDtcdFx0XHRcblx0XHR9LCB0aGlzKTtcblxuXHRcdHJldHVybiB3YXNSZWdpc3RlcmVkO1xuXHR9XG59XG5cblxuZnVuY3Rpb24gX3JlZ2lzdGVyU3Vic2NyaWJlcihzdWJzY3JpYmVyc0hhc2gsIG1lc3NhZ2UsIHN1YnNjcmliZXIpIHtcblx0aWYgKCEgKHN1YnNjcmliZXJzSGFzaFttZXNzYWdlXSAmJiBzdWJzY3JpYmVyc0hhc2hbbWVzc2FnZV0ubGVuZ3RoKSkge1xuXHRcdHN1YnNjcmliZXJzSGFzaFttZXNzYWdlXSA9IFtdO1xuXHRcdHZhciBub1N1YnNjcmliZXJzID0gdHJ1ZTtcblx0XHRpZiAodGhpcy5fbWVzc2FnZVNvdXJjZSlcblx0XHRcdHRoaXMuX21lc3NhZ2VTb3VyY2Uub25TdWJzY3JpYmVyQWRkZWQobWVzc2FnZSk7XG5cdH1cblxuXHR2YXIgbXNnU3Vic2NyaWJlcnMgPSBzdWJzY3JpYmVyc0hhc2hbbWVzc2FnZV07XG5cdHZhciBub3RZZXRSZWdpc3RlcmVkID0gbm9TdWJzY3JpYmVycyB8fCBtc2dTdWJzY3JpYmVycy5pbmRleE9mKHN1YnNjcmliZXIpID09IC0xO1xuXG5cdGlmIChub3RZZXRSZWdpc3RlcmVkKVxuXHRcdG1zZ1N1YnNjcmliZXJzLnB1c2goc3Vic2NyaWJlcik7XG5cblx0cmV0dXJuIG5vdFlldFJlZ2lzdGVyZWQ7XG59XG5cblxuZnVuY3Rpb24gcmVnaXN0ZXJTdWJzY3JpYmVycyhtZXNzYWdlU3Vic2NyaWJlcnMpIHtcblx0Y2hlY2sobWVzc2FnZVN1YnNjcmliZXJzLCBNYXRjaC5PYmplY3RIYXNoKEZ1bmN0aW9uKSk7XG5cblx0dmFyIG5vdFlldFJlZ2lzdGVyZWRNYXAgPSBfLm1hcEtleXMobWVzc2FnZVN1YnNjcmliZXJzLCBmdW5jdGlvbihzdWJzY3JpYmVyLCBtZXNzYWdlcykge1xuXHRcdHJldHVybiB0aGlzLm9uTWVzc2FnZShtZXNzYWdlcywgc3Vic2NyaWJlcilcblx0fSwgdGhpcyk7XG5cblx0cmV0dXJuIG5vdFlldFJlZ2lzdGVyZWRNYXA7XG59XG5cblxuLy8gcmVtb3ZlcyBhbGwgc3Vic2NyaWJlcnMgZm9yIHRoZSBtZXNzYWdlIGlmIHN1YnNjcmliZXIgaXNuJ3Qgc3VwcGxpZWRcbmZ1bmN0aW9uIHJlbW92ZVN1YnNjcmliZXIobWVzc2FnZXMsIHN1YnNjcmliZXIpIHtcblx0Y2hlY2sobWVzc2FnZXMsIE1hdGNoLk9uZU9mKFN0cmluZywgW1N0cmluZ10sIFJlZ0V4cCkpO1xuXHRjaGVjayhzdWJzY3JpYmVyLCBNYXRjaC5PcHRpb25hbChGdW5jdGlvbikpOyBcblxuXHRpZiAodHlwZW9mIG1lc3NhZ2VzID09ICdzdHJpbmcnKVxuXHRcdG1lc3NhZ2VzID0gbWVzc2FnZXMuc3BsaXQoZXZlbnRzU3BsaXRSZWdFeHApO1xuXG5cdHZhciBzdWJzY3JpYmVyc0hhc2ggPSB0aGlzLl9jaG9vc2VTdWJzY3JpYmVyc0hhc2gobWVzc2FnZXMpO1xuXG5cdGlmIChtZXNzYWdlcyBpbnN0YW5jZW9mIFJlZ0V4cClcblx0XHRyZXR1cm4gdGhpcy5fcmVtb3ZlU3Vic2NyaWJlcihzdWJzY3JpYmVyc0hhc2gsIG1lc3NhZ2VzLCBzdWJzY3JpYmVyKTtcblxuXHRlbHNlIHtcblx0XHR2YXIgd2FzUmVtb3ZlZCA9IGZhbHNlO1xuXG5cdFx0bWVzc2FnZXMuZm9yRWFjaChmdW5jdGlvbihtZXNzYWdlKSB7XG5cdFx0XHR2YXIgc3Vic2NyaWJlclJlbW92ZWQgPSB0aGlzLl9yZW1vdmVTdWJzY3JpYmVyKHN1YnNjcmliZXJzSGFzaCwgbWVzc2FnZSwgc3Vic2NyaWJlcik7XHRcdFx0XG5cdFx0XHR3YXNSZW1vdmVkID0gd2FzUmVtb3ZlZCB8fCBzdWJzY3JpYmVyUmVtb3ZlZDtcdFx0XHRcblx0XHR9LCB0aGlzKTtcblxuXHRcdHJldHVybiB3YXNSZW1vdmVkO1xuXHR9XG59XG5cblxuZnVuY3Rpb24gX3JlbW92ZVN1YnNjcmliZXIoc3Vic2NyaWJlcnNIYXNoLCBtZXNzYWdlLCBzdWJzY3JpYmVyKSB7XG5cdHZhciBtc2dTdWJzY3JpYmVycyA9IHN1YnNjcmliZXJzSGFzaFttZXNzYWdlXTtcblx0aWYgKCEgbXNnU3Vic2NyaWJlcnMgfHwgISBtc2dTdWJzY3JpYmVycy5sZW5ndGgpXG5cdFx0cmV0dXJuIGZhbHNlOyAvLyBub3RoaW5nIHJlbW92ZWRcblxuXHRpZiAoc3Vic2NyaWJlcikge1xuXHRcdHZhciBzdWJzY3JpYmVySW5kZXggPSBtc2dTdWJzY3JpYmVycy5pbmRleE9mKHN1YnNjcmliZXIpO1xuXHRcdGlmIChzdWJzY3JpYmVySW5kZXggPT0gLTEpIFxuXHRcdFx0cmV0dXJuIGZhbHNlOyAvLyBub3RoaW5nIHJlbW92ZWRcblx0XHRtc2dTdWJzY3JpYmVycy5zcGxpY2Uoc3Vic2NyaWJlckluZGV4LCAxKTtcblx0XHRpZiAoISBtc2dTdWJzY3JpYmVycy5sZW5ndGgpXG5cdFx0XHR0aGlzLl9yZW1vdmVBbGxTdWJzY3JpYmVycyhzdWJzY3JpYmVyc0hhc2gsIG1lc3NhZ2UpO1xuXG5cdH0gZWxzZSBcblx0XHR0aGlzLl9yZW1vdmVBbGxTdWJzY3JpYmVycyhzdWJzY3JpYmVyc0hhc2gsIG1lc3NhZ2UpO1xuXG5cdHJldHVybiB0cnVlOyAvLyBzdWJzY3JpYmVyKHMpIHJlbW92ZWRcbn1cblxuXG5mdW5jdGlvbiBfcmVtb3ZlQWxsU3Vic2NyaWJlcnMoc3Vic2NyaWJlcnNIYXNoLCBtZXNzYWdlKSB7XG5cdGRlbGV0ZSBzdWJzY3JpYmVyc0hhc2hbbWVzc2FnZV07XG5cdGlmICh0aGlzLl9tZXNzYWdlU291cmNlKVxuXHRcdHRoaXMuX21lc3NhZ2VTb3VyY2Uub25TdWJzY3JpYmVyUmVtb3ZlZChtZXNzYWdlKTtcbn1cblxuXG5mdW5jdGlvbiByZW1vdmVTdWJzY3JpYmVycyhtZXNzYWdlU3Vic2NyaWJlcnMpIHtcblx0Y2hlY2sobWVzc2FnZVN1YnNjcmliZXJzLCBNYXRjaC5PYmplY3RIYXNoKEZ1bmN0aW9uKSk7XG5cblx0dmFyIHN1YnNjcmliZXJSZW1vdmVkTWFwID0gXy5tYXBLZXlzKG1lc3NhZ2VTdWJzY3JpYmVycywgZnVuY3Rpb24oc3Vic2NyaWJlciwgbWVzc2FnZXMpIHtcblx0XHRyZXR1cm4gdGhpcy5vZmZNZXNzYWdlcyhtZXNzYWdlcywgc3Vic2NyaWJlcilcblx0fSwgdGhpcyk7XG5cblx0cmV0dXJuIHN1YnNjcmliZXJSZW1vdmVkTWFwO1x0XG59XG5cblxuLy8gVE9ETyAtIHNlbmQgZXZlbnQgdG8gbWVzc2FnZVNvdXJjZVxuXG5cbmZ1bmN0aW9uIHBvc3RNZXNzYWdlKG1lc3NhZ2UsIGRhdGEpIHtcblx0Y2hlY2sobWVzc2FnZSwgTWF0Y2guT25lT2YoU3RyaW5nLCBSZWdFeHApKTtcblxuXHR2YXIgc3Vic2NyaWJlcnNIYXNoID0gdGhpcy5fY2hvb3NlU3Vic2NyaWJlcnNIYXNoKG1lc3NhZ2UpO1xuXHR2YXIgbXNnU3Vic2NyaWJlcnMgPSBzdWJzY3JpYmVyc0hhc2hbbWVzc2FnZV07XG5cblx0dGhpcy5fY2FsbFN1YnNjcmliZXJzKG1lc3NhZ2UsIGRhdGEsIG1zZ1N1YnNjcmliZXJzKTtcblxuXHRpZiAodHlwZW9mIG1lc3NhZ2UgPT0gJ3N0cmluZycpXG5cdFx0dGhpcy5fY2FsbFBhdHRlcm5TdWJzY3JpYmVycyhtZXNzYWdlLCBkYXRhKTtcbn1cblxuXG5mdW5jdGlvbiBfY2FsbFBhdHRlcm5TdWJzY3JpYmVycyhtZXNzYWdlLCBkYXRhKSB7XG5cdF8uZWFjaEtleSh0aGlzLl9wYXR0ZXJuTWVzc2FnZVN1YnNjcmliZXJzLCBcblx0XHRmdW5jdGlvbihwYXR0ZXJuU3Vic2NyaWJlcnMsIHBhdHRlcm4pIHtcblx0XHRcdGlmIChwYXR0ZXJuLnRlc3QobWVzc2FnZSkpXG5cdFx0XHRcdHRoaXMuX2NhbGxTdWJzY3JpYmVycyhtZXNzYWdlLCBkYXRhLCBwYXR0ZXJuU3Vic2NyaWJlcnMpO1xuXHRcdH1cblx0LCB0aGlzKTtcbn1cblxuXG5mdW5jdGlvbiBfY2FsbFN1YnNjcmliZXJzKG1lc3NhZ2UsIGRhdGEsIG1zZ1N1YnNjcmliZXJzKSB7XG5cdGlmIChtc2dTdWJzY3JpYmVycyAmJiBtc2dTdWJzY3JpYmVycy5sZW5ndGgpXG5cdFx0bXNnU3Vic2NyaWJlcnMuZm9yRWFjaChmdW5jdGlvbihzdWJzY3JpYmVyKSB7XG5cdFx0XHRzdWJzY3JpYmVyLmNhbGwodGhpcywgbWVzc2FnZSwgZGF0YSk7XG5cdFx0fSwgdGhpcyk7XG59XG5cblxuZnVuY3Rpb24gZ2V0TWVzc2FnZVN1YnNjcmliZXJzKG1lc3NhZ2UsIGluY2x1ZGVQYXR0ZXJuU3Vic2NyaWJlcnMpIHtcblx0Y2hlY2sobWVzc2FnZSwgTWF0Y2guT25lT2YoU3RyaW5nLCBSZWdFeHApKTtcblxuXHR2YXIgc3Vic2NyaWJlcnNIYXNoID0gdGhpcy5fY2hvb3NlU3Vic2NyaWJlcnNIYXNoKG1lc3NhZ2UpO1xuXHR2YXIgbXNnU3Vic2NyaWJlcnMgPSBzdWJzY3JpYmVyc0hhc2hbbWVzc2FnZV1cblx0XHRcdFx0XHRcdFx0PyBbXS5jb25jYXQoc3Vic2NyaWJlcnNIYXNoW21lc3NhZ2VdKVxuXHRcdFx0XHRcdFx0XHQ6IFtdO1xuXG5cdC8vIHBhdHRlcm4gc3Vic2NyaWJlcnMgYXJlIGluY3VkZWQgYnkgZGVmYXVsdFxuXHRpZiAoaW5jbHVkZVBhdHRlcm5TdWJzY3JpYmVycyAhPT0gZmFsc2UgJiYgdHlwZW9mIG1lc3NhZ2UgPT0gJ3N0cmluZycpIHtcblx0XHRfLmVhY2hLZXkodGhpcy5fcGF0dGVybk1lc3NhZ2VTdWJzY3JpYmVycywgXG5cdFx0XHRmdW5jdGlvbihwYXR0ZXJuU3Vic2NyaWJlcnMsIHBhdHRlcm4pIHtcblx0XHRcdFx0aWYgKHBhdHRlcm5TdWJzY3JpYmVycyAmJiBwYXR0ZXJuU3Vic2NyaWJlcnMubGVuZ3RoXG5cdFx0XHRcdFx0XHQmJiBwYXR0ZXJuLnRlc3QobWVzc2FnZSkpXG5cdFx0XHRcdFx0Xy5hcHBlbmRBcnJheShtc2dTdWJzY3JpYmVycywgcGF0dGVyblN1YnNjcmliZXJzKTtcblx0XHRcdH1cblx0XHQpO1xuXHR9XG5cblx0cmV0dXJuIG1zZ1N1YnNjcmliZXJzLmxlbmd0aFxuXHRcdFx0XHQ/IG1zZ1N1YnNjcmliZXJzXG5cdFx0XHRcdDogdW5kZWZpbmVkO1xufVxuXG5cbmZ1bmN0aW9uIF9jaG9vc2VTdWJzY3JpYmVyc0hhc2gobWVzc2FnZSkge1xuXHRyZXR1cm4gbWVzc2FnZSBpbnN0YW5jZW9mIFJlZ0V4cFxuXHRcdFx0XHQ/IHRoaXMuX3BhdHRlcm5NZXNzYWdlU3Vic2NyaWJlcnNcblx0XHRcdFx0OiB0aGlzLl9tZXNzYWdlU3Vic2NyaWJlcnM7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBNaXhpbiA9IHJlcXVpcmUoJy4uL2Fic3RyYWN0L21peGluJylcblx0LCBsb2dnZXIgPSByZXF1aXJlKCcuLi91dGlsL2xvZ2dlcicpXG5cdCwgdG9CZUltcGxlbWVudGVkID0gcmVxdWlyZSgnLi4vdXRpbC9lcnJvcicpLnRvQmVJbXBsZW1lbnRlZFxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKTtcblxuLy8gYW4gYWJzdHJhY3QgY2xhc3MgZm9yIGRpc3BhdGNoaW5nIGV4dGVybmFsIHRvIGludGVybmFsIGV2ZW50c1xudmFyIE1lc3NhZ2VTb3VyY2UgPSBfLmNyZWF0ZVN1YmNsYXNzKE1peGluLCAnTWVzc2FnZVNvdXJjZScsIHRydWUpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1lc3NhZ2VTb3VyY2U7XG5cblxuXy5leHRlbmRQcm90byhNZXNzYWdlU291cmNlLCB7XG5cdC8vIGluaXRpYWxpemVzIG1lc3NhZ2VTb3VyY2UgLSBjYWxsZWQgYnkgTWl4aW4gc3VwZXJjbGFzc1xuXHRpbml0OiBpbml0TWVzc2FnZVNvdXJjZSxcblxuXHQvLyBjYWxsZWQgYnkgTWVzc2VuZ2VyIHRvIG5vdGlmeSB3aGVuIHRoZSBmaXJzdCBzdWJzY3JpYmVyIGZvciBhbiBpbnRlcm5hbCBtZXNzYWdlIHdhcyBhZGRlZFxuXHRvblN1YnNjcmliZXJBZGRlZDogb25TdWJzY3JpYmVyQWRkZWQsXG5cblx0Ly8gY2FsbGVkIGJ5IE1lc3NlbmdlciB0byBub3RpZnkgd2hlbiB0aGUgbGFzdCBzdWJzY3JpYmVyIGZvciBhbiBpbnRlcm5hbCBtZXNzYWdlIHdhcyByZW1vdmVkXG4gXHRvblN1YnNjcmliZXJSZW1vdmVkOiBvblN1YnNjcmliZXJSZW1vdmVkLCBcblxuIFx0Ly8gZGlzcGF0Y2hlcyBzb3VyY2UgbWVzc2FnZVxuIFx0ZGlzcGF0Y2hNZXNzYWdlOiBkaXNwYXRjaFNvdXJjZU1lc3NhZ2UsXG5cblx0Ly8gZmlsdGVycyBzb3VyY2UgbWVzc2FnZSBiYXNlZCBvbiB0aGUgZGF0YSBvZiB0aGUgbWVzc2FnZSAtIHNob3VsZCBiZSBpbXBsZW1lbnRlZCBpbiBzdWJjbGFzc1xuXHRmaWx0ZXJTb3VyY2VNZXNzYWdlOiBkaXNwYXRjaEFsbFNvdXJjZU1lc3NhZ2VzLFxuXG4gXHQvLyAqKipcbiBcdC8vIE1ldGhvZHMgYmVsb3cgbXVzdCBiZSBpbXBsZW1lbnRlZCBpbiBzdWJjbGFzc1xuIFx0XG5cdC8vIGNvbnZlcnRzIGludGVybmFsIG1lc3NhZ2UgdHlwZSB0byBleHRlcm5hbCBtZXNzYWdlIHR5cGUgLSBzaG91bGQgYmUgaW1wbGVtZW50ZWQgaW4gc3ViY2xhc3Ncblx0dHJhbnNsYXRlVG9Tb3VyY2VNZXNzYWdlOiB0b0JlSW1wbGVtZW50ZWQsXG5cbiBcdC8vIGFkZHMgbGlzdGVuZXIgdG8gZXh0ZXJuYWwgbWVzc2FnZSAtIHNob3VsZCBiZSBpbXBsZW1lbnRlZCBieSBzdWJjbGFzc1xuIFx0YWRkU291cmNlTGlzdGVuZXI6IHRvQmVJbXBsZW1lbnRlZCxcblxuIFx0Ly8gcmVtb3ZlcyBsaXN0ZW5lciBmcm9tIGV4dGVybmFsIG1lc3NhZ2UgLSBzaG91bGQgYmUgaW1wbGVtZW50ZWQgYnkgc3ViY2xhc3NcbiBcdHJlbW92ZVNvdXJjZUxpc3RlbmVyOiB0b0JlSW1wbGVtZW50ZWQsXG59KTtcblxuXG5mdW5jdGlvbiBpbml0TWVzc2FnZVNvdXJjZSgpIHtcblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdfaW50ZXJuYWxNZXNzYWdlcycsIHsgdmFsdWU6IHt9IH0pO1xufVxuXG5cbmZ1bmN0aW9uIG9uU3Vic2NyaWJlckFkZGVkKG1lc3NhZ2UpIHtcblx0dmFyIHNvdXJjZU1lc3NhZ2UgPSB0aGlzLnRyYW5zbGF0ZVRvU291cmNlTWVzc2FnZShtZXNzYWdlKTtcblxuXHRpZiAoISBzb3VyY2VNZXNzYWdlKSByZXR1cm47XG5cblx0aWYgKCEgdGhpcy5faW50ZXJuYWxNZXNzYWdlcy5oYXNPd25Qcm9wZXJ0eShzb3VyY2VNZXNzYWdlKSkge1xuXHRcdHRoaXMuYWRkU291cmNlTGlzdGVuZXIoc291cmNlTWVzc2FnZSk7XG5cdFx0dGhpcy5faW50ZXJuYWxNZXNzYWdlc1tzb3VyY2VNZXNzYWdlXSA9IFtdO1xuXHR9XG5cdHZhciBpbnRlcm5hbE1zZ3MgPSB0aGlzLl9pbnRlcm5hbE1lc3NhZ2VzW3NvdXJjZU1lc3NhZ2VdO1xuXG5cdGlmIChpbnRlcm5hbE1zZ3MuaW5kZXhPZihtZXNzYWdlKSA9PSAtMSlcblx0XHRpbnRlcm5hbE1zZ3MucHVzaChtZXNzYWdlKTtcblx0ZWxzZVxuXHRcdGxvZ2dlci53YXJuKCdEdXBsaWNhdGUgbm90aWZpY2F0aW9uIHJlY2VpdmVkOiBmb3Igc3Vic2NyaWJlIHRvIGludGVybmFsIG1lc3NhZ2UgJyArIG1lc3NhZ2UpO1xufVxuXG5cbmZ1bmN0aW9uIG9uU3Vic2NyaWJlclJlbW92ZWQobWVzc2FnZSkge1xuXHR2YXIgc291cmNlTWVzc2FnZSA9IHRoaXMudHJhbnNsYXRlVG9Tb3VyY2VNZXNzYWdlKG1lc3NhZ2UpO1xuXG5cdGlmICghIHNvdXJjZU1lc3NhZ2UpIHJldHVybjtcblxuXHR2YXIgaW50ZXJuYWxNc2dzID0gdGhpcy5faW50ZXJuYWxNZXNzYWdlc1tzb3VyY2VNZXNzYWdlXTtcblxuXHRpZiAoaW50ZXJuYWxNc2dzICYmIGludGVybmFsTXNncy5sZW5ndGgpIHtcblx0XHRtZXNzYWdlSW5kZXggPSBpbnRlcm5hbE1zZ3MuaW5kZXhPZihtZXNzYWdlKTtcblx0XHRpZiAobWVzc2FnZUluZGV4ID49IDApIHtcblx0XHRcdGludGVybmFsTXNncy5zcGxpY2UobWVzc2FnZUluZGV4LCAxKTtcblx0XHRcdGlmIChpbnRlcm5hbE1zZ3MubGVuZ3RoID09IDApIHtcblx0XHRcdFx0ZGVsZXRlIHRoaXMuX2ludGVybmFsTWVzc2FnZXNbc291cmNlTWVzc2FnZV07XG5cdFx0XHRcdHRoaXMucmVtb3ZlU291cmNlTGlzdGVuZXIoc291cmNlTWVzc2FnZSk7XG5cdFx0XHR9XG5cdFx0fSBlbHNlXG5cdFx0XHR1bmV4cGVjdGVkTm90aWZpY2F0aW9uV2FybmluZygpO1xuXHR9IGVsc2Vcblx0XHR1bmV4cGVjdGVkTm90aWZpY2F0aW9uV2FybmluZygpO1xuXG5cblx0ZnVuY3Rpb24gdW5leHBlY3RlZE5vdGlmaWNhdGlvbldhcm5pbmcoKSB7XG5cdFx0bG9nZ2VyLndhcm4oJ25vdGlmaWNhdGlvbiByZWNlaXZlZDogdW4tc3Vic2NyaWJlIGZyb20gaW50ZXJuYWwgbWVzc2FnZSAnICsgbWVzc2FnZVxuXHRcdFx0XHRcdCArICcgd2l0aG91dCBwcmV2aW91cyBzdWJzY3JpcHRpb24gbm90aWZpY2F0aW9uJyk7XG5cdH1cbn1cblxuXG5mdW5jdGlvbiBkaXNwYXRjaFNvdXJjZU1lc3NhZ2Uoc291cmNlTWVzc2FnZSwgZGF0YSkge1xuXHR2YXIgaW50ZXJuYWxNc2dzID0gdGhpcy5faW50ZXJuYWxNZXNzYWdlc1tzb3VyY2VNZXNzYWdlXTtcblxuXHRpZiAoaW50ZXJuYWxNc2dzICYmIGludGVybmFsTXNncy5sZW5ndGgpXG5cdFx0aW50ZXJuYWxNc2dzLmZvckVhY2goZnVuY3Rpb24obWVzc2FnZSkge1xuXHRcdFx0aWYgKHRoaXMuZmlsdGVyU291cmNlTWVzc2FnZVxuXHRcdFx0XHRcdCYmIHRoaXMuZmlsdGVyU291cmNlTWVzc2FnZShzb3VyY2VNZXNzYWdlLCBtZXNzYWdlLCBkYXRhKSlcblx0XHRcdFx0dGhpcy5tZXNzZW5nZXIucG9zdE1lc3NhZ2UobWVzc2FnZSwgZGF0YSk7XG5cdFx0fSwgdGhpcyk7XG5cdGVsc2Vcblx0XHRsb2dnZXIud2Fybignc291cmNlIG1lc3NhZ2UgcmVjZWl2ZWQgZm9yIHdoaWNoIHRoZXJlIGlzIG5vIG1hcHBlZCBpbnRlcm5hbCBtZXNzYWdlJyk7XG59XG5cblxuLy8gY2FuIGJlIG92ZXJyaWRkZW4gaW4gc3ViY2xhc3MgdG8gaW1wbGVtZW50IGZpbHRlcmluZyBiYXNlZCBvbiBtZXNzYWdlIGRhdGFcbmZ1bmN0aW9uIGRpc3BhdGNoQWxsU291cmNlTWVzc2FnZXMoc291cmNlTWVzc2FnZSwgbWVzc2FnZSwgZGF0YSkge1xuXHRyZXR1cm4gdHJ1ZTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIG1pbG8gPSB7XG5cdGxvYWRlcjogcmVxdWlyZSgnLi9sb2FkZXInKSxcblx0YmluZGVyOiByZXF1aXJlKCcuL2JpbmRlcicpLFxuXHRtYWlsOiByZXF1aXJlKCcuL21haWwnKSxcblx0Y29uZmlnOiByZXF1aXJlKCcuL2NvbmZpZycpLFxuXHR1dGlsOiByZXF1aXJlKCcuL3V0aWwnKSxcblx0Y2xhc3NlczogcmVxdWlyZSgnLi9jbGFzc2VzJylcbn1cblxuXG4vLyB1c2VkIGZhY2V0c1xucmVxdWlyZSgnLi9jb21wb25lbnRzL2NfZmFjZXRzL0RhdGEnKTtcbnJlcXVpcmUoJy4vY29tcG9uZW50cy9jX2ZhY2V0cy9FdmVudHMnKTtcbnJlcXVpcmUoJy4vY29tcG9uZW50cy9jX2ZhY2V0cy9UZW1wbGF0ZScpO1xucmVxdWlyZSgnLi9jb21wb25lbnRzL2NfZmFjZXRzL0NvbnRhaW5lcicpO1xuXG4vLyB1c2VkIGNvbXBvbmVudHNcbnJlcXVpcmUoJy4vY29tcG9uZW50cy9jbGFzc2VzL1ZpZXcnKTtcblxuXG4vLyBleHBvcnQgZm9yIG5vZGUvYnJvd3NlcmlmeVxuaWYgKHR5cGVvZiBtb2R1bGUgPT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpXHRcblx0bW9kdWxlLmV4cG9ydHMgPSBtaWxvO1xuXG4vLyBnbG9iYWwgbWlsbyBmb3IgYnJvd3NlclxuaWYgKHR5cGVvZiB3aW5kb3cgPT0gJ29iamVjdCcpXG5cdHdpbmRvdy5taWxvID0gbWlsbztcbiIsIid1c2Ugc3RyaWN0JztcblxuLy8gWFhYIGRvY3NcblxuLy8gVGhpbmdzIHdlIGV4cGxpY2l0bHkgZG8gTk9UIHN1cHBvcnQ6XG4vLyAgICAtIGhldGVyb2dlbm91cyBhcnJheXNcbnZhciBfID0gcmVxdWlyZSgnbW9sLXByb3RvJyk7XG5cbnZhciBjaGVjayA9IGZ1bmN0aW9uICh2YWx1ZSwgcGF0dGVybikge1xuICAvLyBSZWNvcmQgdGhhdCBjaGVjayBnb3QgY2FsbGVkLCBpZiBzb21lYm9keSBjYXJlZC5cbiAgdHJ5IHtcbiAgICBjaGVja1N1YnRyZWUodmFsdWUsIHBhdHRlcm4pO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICBpZiAoKGVyciBpbnN0YW5jZW9mIE1hdGNoLkVycm9yKSAmJiBlcnIucGF0aClcbiAgICAgIGVyci5tZXNzYWdlICs9IFwiIGluIGZpZWxkIFwiICsgZXJyLnBhdGg7XG4gICAgdGhyb3cgZXJyO1xuICB9XG59O1xubW9kdWxlLmV4cG9ydHMgPSBjaGVjaztcblxudmFyIE1hdGNoID0gY2hlY2suTWF0Y2ggPSB7XG4gIE9wdGlvbmFsOiBmdW5jdGlvbiAocGF0dGVybikge1xuICAgIHJldHVybiBuZXcgT3B0aW9uYWwocGF0dGVybik7XG4gIH0sXG4gIE9uZU9mOiBmdW5jdGlvbiAoLyphcmd1bWVudHMqLykge1xuICAgIHJldHVybiBuZXcgT25lT2YoYXJndW1lbnRzKTtcbiAgfSxcbiAgQW55OiBbJ19fYW55X18nXSxcbiAgV2hlcmU6IGZ1bmN0aW9uIChjb25kaXRpb24pIHtcbiAgICByZXR1cm4gbmV3IFdoZXJlKGNvbmRpdGlvbik7XG4gIH0sXG4gIE9iamVjdEluY2x1ZGluZzogZnVuY3Rpb24gKHBhdHRlcm4pIHtcbiAgICByZXR1cm4gbmV3IE9iamVjdEluY2x1ZGluZyhwYXR0ZXJuKTtcbiAgfSxcbiAgLy8gTWF0Y2hlcyBvbmx5IHNpZ25lZCAzMi1iaXQgaW50ZWdlcnNcbiAgSW50ZWdlcjogWydfX2ludGVnZXJfXyddLFxuXG4gIC8vIE1hdGNoZXMgaGFzaCAob2JqZWN0KSB3aXRoIHZhbHVlcyBtYXRjaGluZyBwYXR0ZXJuXG4gIE9iamVjdEhhc2g6IGZ1bmN0aW9uKHBhdHRlcm4pIHtcbiAgICByZXR1cm4gbmV3IE9iamVjdEhhc2gocGF0dGVybik7XG4gIH0sXG5cbiAgU3ViY2xhc3M6IGZ1bmN0aW9uKFN1cGVyY2xhc3MsIG1hdGNoU3VwZXJjbGFzc1Rvbykge1xuICAgIHJldHVybiBuZXcgU3ViY2xhc3MoU3VwZXJjbGFzcywgbWF0Y2hTdXBlcmNsYXNzVG9vKTtcbiAgfSxcblxuICAvLyBYWFggbWF0Y2hlcnMgc2hvdWxkIGtub3cgaG93IHRvIGRlc2NyaWJlIHRoZW1zZWx2ZXMgZm9yIGVycm9yc1xuICBFcnJvcjogVHlwZUVycm9yLFxuXG4gIC8vIE1ldGVvci5tYWtlRXJyb3JUeXBlKFwiTWF0Y2guRXJyb3JcIiwgZnVuY3Rpb24gKG1zZykge1xuICAgIC8vIHRoaXMubWVzc2FnZSA9IFwiTWF0Y2ggZXJyb3I6IFwiICsgbXNnO1xuICAgIC8vIFRoZSBwYXRoIG9mIHRoZSB2YWx1ZSB0aGF0IGZhaWxlZCB0byBtYXRjaC4gSW5pdGlhbGx5IGVtcHR5LCB0aGlzIGdldHNcbiAgICAvLyBwb3B1bGF0ZWQgYnkgY2F0Y2hpbmcgYW5kIHJldGhyb3dpbmcgdGhlIGV4Y2VwdGlvbiBhcyBpdCBnb2VzIGJhY2sgdXAgdGhlXG4gICAgLy8gc3RhY2suXG4gICAgLy8gRS5nLjogXCJ2YWxzWzNdLmVudGl0eS5jcmVhdGVkXCJcbiAgICAvLyB0aGlzLnBhdGggPSBcIlwiO1xuICAgIC8vIElmIHRoaXMgZ2V0cyBzZW50IG92ZXIgRERQLCBkb24ndCBnaXZlIGZ1bGwgaW50ZXJuYWwgZGV0YWlscyBidXQgYXQgbGVhc3RcbiAgICAvLyBwcm92aWRlIHNvbWV0aGluZyBiZXR0ZXIgdGhhbiA1MDAgSW50ZXJuYWwgc2VydmVyIGVycm9yLlxuICAvLyAgIHRoaXMuc2FuaXRpemVkRXJyb3IgPSBuZXcgTWV0ZW9yLkVycm9yKDQwMCwgXCJNYXRjaCBmYWlsZWRcIik7XG4gIC8vIH0pLFxuXG4gIC8vIFRlc3RzIHRvIHNlZSBpZiB2YWx1ZSBtYXRjaGVzIHBhdHRlcm4uIFVubGlrZSBjaGVjaywgaXQgbWVyZWx5IHJldHVybnMgdHJ1ZVxuICAvLyBvciBmYWxzZSAodW5sZXNzIGFuIGVycm9yIG90aGVyIHRoYW4gTWF0Y2guRXJyb3Igd2FzIHRocm93bikuXG4gIHRlc3Q6IGZ1bmN0aW9uICh2YWx1ZSwgcGF0dGVybikge1xuICAgIHRyeSB7XG4gICAgICBjaGVja1N1YnRyZWUodmFsdWUsIHBhdHRlcm4pO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKGUgaW5zdGFuY2VvZiBNYXRjaC5FcnJvcilcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgLy8gUmV0aHJvdyBvdGhlciBlcnJvcnMuXG4gICAgICB0aHJvdyBlO1xuICAgIH1cbiAgfVxufTtcblxuZnVuY3Rpb24gT3B0aW9uYWwocGF0dGVybikge1xuICB0aGlzLnBhdHRlcm4gPSBwYXR0ZXJuO1xufTtcblxuZnVuY3Rpb24gT25lT2YoY2hvaWNlcykge1xuICBpZiAoY2hvaWNlcy5sZW5ndGggPT0gMClcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJNdXN0IHByb3ZpZGUgYXQgbGVhc3Qgb25lIGNob2ljZSB0byBNYXRjaC5PbmVPZlwiKTtcbiAgdGhpcy5jaG9pY2VzID0gY2hvaWNlcztcbn07XG5cbmZ1bmN0aW9uIFdoZXJlKGNvbmRpdGlvbikge1xuICB0aGlzLmNvbmRpdGlvbiA9IGNvbmRpdGlvbjtcbn07XG5cbmZ1bmN0aW9uIE9iamVjdEluY2x1ZGluZyhwYXR0ZXJuKSB7XG4gIHRoaXMucGF0dGVybiA9IHBhdHRlcm47XG59O1xuXG5mdW5jdGlvbiBPYmplY3RIYXNoKHBhdHRlcm4pIHtcbiAgdGhpcy5wYXR0ZXJuID0gcGF0dGVybjtcbn07XG5cbmZ1bmN0aW9uIFN1YmNsYXNzKFN1cGVyY2xhc3MsIG1hdGNoU3VwZXJjbGFzc1Rvbykge1xuICB0aGlzLlN1cGVyY2xhc3MgPSBTdXBlcmNsYXNzO1xuICB0aGlzLm1hdGNoU3VwZXJjbGFzcyA9IG1hdGNoU3VwZXJjbGFzc1Rvbztcbn07XG5cbnZhciB0eXBlb2ZDaGVja3MgPSBbXG4gIFtTdHJpbmcsIFwic3RyaW5nXCJdLFxuICBbTnVtYmVyLCBcIm51bWJlclwiXSxcbiAgW0Jvb2xlYW4sIFwiYm9vbGVhblwiXSxcbiAgLy8gV2hpbGUgd2UgZG9uJ3QgYWxsb3cgdW5kZWZpbmVkIGluIEpTT04sIHRoaXMgaXMgZ29vZCBmb3Igb3B0aW9uYWxcbiAgLy8gYXJndW1lbnRzIHdpdGggT25lT2YuXG4gIFt1bmRlZmluZWQsIFwidW5kZWZpbmVkXCJdXG5dO1xuXG5mdW5jdGlvbiBjaGVja1N1YnRyZWUodmFsdWUsIHBhdHRlcm4pIHtcbiAgLy8gTWF0Y2ggYW55dGhpbmchXG4gIGlmIChwYXR0ZXJuID09PSBNYXRjaC5BbnkpXG4gICAgcmV0dXJuO1xuXG4gIC8vIEJhc2ljIGF0b21pYyB0eXBlcy5cbiAgLy8gRG8gbm90IG1hdGNoIGJveGVkIG9iamVjdHMgKGUuZy4gU3RyaW5nLCBCb29sZWFuKVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHR5cGVvZkNoZWNrcy5sZW5ndGg7ICsraSkge1xuICAgIGlmIChwYXR0ZXJuID09PSB0eXBlb2ZDaGVja3NbaV1bMF0pIHtcbiAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09IHR5cGVvZkNoZWNrc1tpXVsxXSlcbiAgICAgICAgcmV0dXJuO1xuICAgICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgXCIgKyB0eXBlb2ZDaGVja3NbaV1bMV0gKyBcIiwgZ290IFwiICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlb2YgdmFsdWUpO1xuICAgIH1cbiAgfVxuICBpZiAocGF0dGVybiA9PT0gbnVsbCkge1xuICAgIGlmICh2YWx1ZSA9PT0gbnVsbClcbiAgICAgIHJldHVybjtcbiAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJFeHBlY3RlZCBudWxsLCBnb3QgXCIgKyBKU09OLnN0cmluZ2lmeSh2YWx1ZSkpO1xuICB9XG5cbiAgLy8gTWF0Y2guSW50ZWdlciBpcyBzcGVjaWFsIHR5cGUgZW5jb2RlZCB3aXRoIGFycmF5XG4gIGlmIChwYXR0ZXJuID09PSBNYXRjaC5JbnRlZ2VyKSB7XG4gICAgLy8gVGhlcmUgaXMgbm8gY29uc2lzdGVudCBhbmQgcmVsaWFibGUgd2F5IHRvIGNoZWNrIGlmIHZhcmlhYmxlIGlzIGEgNjQtYml0XG4gICAgLy8gaW50ZWdlci4gT25lIG9mIHRoZSBwb3B1bGFyIHNvbHV0aW9ucyBpcyB0byBnZXQgcmVtaW5kZXIgb2YgZGl2aXNpb24gYnkgMVxuICAgIC8vIGJ1dCB0aGlzIG1ldGhvZCBmYWlscyBvbiByZWFsbHkgbGFyZ2UgZmxvYXRzIHdpdGggYmlnIHByZWNpc2lvbi5cbiAgICAvLyBFLmcuOiAxLjM0ODE5MjMwODQ5MTgyNGUrMjMgJSAxID09PSAwIGluIFY4XG4gICAgLy8gQml0d2lzZSBvcGVyYXRvcnMgd29yayBjb25zaXN0YW50bHkgYnV0IGFsd2F5cyBjYXN0IHZhcmlhYmxlIHRvIDMyLWJpdFxuICAgIC8vIHNpZ25lZCBpbnRlZ2VyIGFjY29yZGluZyB0byBKYXZhU2NyaXB0IHNwZWNzLlxuICAgIGlmICh0eXBlb2YgdmFsdWUgPT09IFwibnVtYmVyXCIgJiYgKHZhbHVlIHwgMCkgPT09IHZhbHVlKVxuICAgICAgcmV0dXJuXG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgSW50ZWdlciwgZ290IFwiXG4gICAgICAgICAgICAgICAgKyAodmFsdWUgaW5zdGFuY2VvZiBPYmplY3QgPyBKU09OLnN0cmluZ2lmeSh2YWx1ZSkgOiB2YWx1ZSkpO1xuICB9XG5cbiAgLy8gXCJPYmplY3RcIiBpcyBzaG9ydGhhbmQgZm9yIE1hdGNoLk9iamVjdEluY2x1ZGluZyh7fSk7XG4gIGlmIChwYXR0ZXJuID09PSBPYmplY3QpXG4gICAgcGF0dGVybiA9IE1hdGNoLk9iamVjdEluY2x1ZGluZyh7fSk7XG5cbiAgLy8gQXJyYXkgKGNoZWNrZWQgQUZURVIgQW55LCB3aGljaCBpcyBpbXBsZW1lbnRlZCBhcyBhbiBBcnJheSkuXG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICBpZiAocGF0dGVybi5sZW5ndGggIT09IDEpXG4gICAgICB0aHJvdyBFcnJvcihcIkJhZCBwYXR0ZXJuOiBhcnJheXMgbXVzdCBoYXZlIG9uZSB0eXBlIGVsZW1lbnRcIiArXG4gICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeShwYXR0ZXJuKSk7XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgYXJyYXksIGdvdCBcIiArIEpTT04uc3RyaW5naWZ5KHZhbHVlKSk7XG4gICAgfVxuXG4gICAgdmFsdWUuZm9yRWFjaChmdW5jdGlvbiAodmFsdWVFbGVtZW50LCBpbmRleCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY2hlY2tTdWJ0cmVlKHZhbHVlRWxlbWVudCwgcGF0dGVyblswXSk7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgaWYgKGVyciBpbnN0YW5jZW9mIE1hdGNoLkVycm9yKSB7XG4gICAgICAgICAgZXJyLnBhdGggPSBfcHJlcGVuZFBhdGgoaW5kZXgsIGVyci5wYXRoKTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBlcnI7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gQXJiaXRyYXJ5IHZhbGlkYXRpb24gY2hlY2tzLiBUaGUgY29uZGl0aW9uIGNhbiByZXR1cm4gZmFsc2Ugb3IgdGhyb3cgYVxuICAvLyBNYXRjaC5FcnJvciAoaWUsIGl0IGNhbiBpbnRlcm5hbGx5IHVzZSBjaGVjaygpKSB0byBmYWlsLlxuICBpZiAocGF0dGVybiBpbnN0YW5jZW9mIFdoZXJlKSB7XG4gICAgaWYgKHBhdHRlcm4uY29uZGl0aW9uKHZhbHVlKSlcbiAgICAgIHJldHVybjtcbiAgICAvLyBYWFggdGhpcyBlcnJvciBpcyB0ZXJyaWJsZVxuICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkZhaWxlZCBNYXRjaC5XaGVyZSB2YWxpZGF0aW9uXCIpO1xuICB9XG5cblxuICBpZiAocGF0dGVybiBpbnN0YW5jZW9mIE9wdGlvbmFsKVxuICAgIHBhdHRlcm4gPSBNYXRjaC5PbmVPZih1bmRlZmluZWQsIHBhdHRlcm4ucGF0dGVybik7XG5cbiAgaWYgKHBhdHRlcm4gaW5zdGFuY2VvZiBPbmVPZikge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGF0dGVybi5jaG9pY2VzLmxlbmd0aDsgKytpKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjaGVja1N1YnRyZWUodmFsdWUsIHBhdHRlcm4uY2hvaWNlc1tpXSk7XG4gICAgICAgIC8vIE5vIGVycm9yPyBZYXksIHJldHVybi5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIC8vIE90aGVyIGVycm9ycyBzaG91bGQgYmUgdGhyb3duLiBNYXRjaCBlcnJvcnMganVzdCBtZWFuIHRyeSBhbm90aGVyXG4gICAgICAgIC8vIGNob2ljZS5cbiAgICAgICAgaWYgKCEoZXJyIGluc3RhbmNlb2YgTWF0Y2guRXJyb3IpKVxuICAgICAgICAgIHRocm93IGVycjtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gWFhYIHRoaXMgZXJyb3IgaXMgdGVycmlibGVcbiAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJGYWlsZWQgTWF0Y2guT25lT2Ygb3IgTWF0Y2guT3B0aW9uYWwgdmFsaWRhdGlvblwiKTtcbiAgfVxuXG4gIC8vIEEgZnVuY3Rpb24gdGhhdCBpc24ndCBzb21ldGhpbmcgd2Ugc3BlY2lhbC1jYXNlIGlzIGFzc3VtZWQgdG8gYmUgYVxuICAvLyBjb25zdHJ1Y3Rvci5cbiAgaWYgKHBhdHRlcm4gaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIHBhdHRlcm4pXG4gICAgICByZXR1cm47XG4gICAgLy8gWFhYIHdoYXQgaWYgLm5hbWUgaXNuJ3QgZGVmaW5lZFxuICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIFwiICsgcGF0dGVybi5jb25zdHJ1Y3Rvci5uYW1lKTtcbiAgfVxuXG4gIHZhciB1bmtub3duS2V5c0FsbG93ZWQgPSBmYWxzZTtcbiAgaWYgKHBhdHRlcm4gaW5zdGFuY2VvZiBPYmplY3RJbmNsdWRpbmcpIHtcbiAgICB1bmtub3duS2V5c0FsbG93ZWQgPSB0cnVlO1xuICAgIHBhdHRlcm4gPSBwYXR0ZXJuLnBhdHRlcm47XG4gIH1cblxuICBpZiAocGF0dGVybiBpbnN0YW5jZW9mIE9iamVjdEhhc2gpIHtcbiAgICB2YXIga2V5UGF0dGVybiA9IHBhdHRlcm4ucGF0dGVybjtcbiAgICB2YXIgZW1wdHlIYXNoID0gdHJ1ZTtcbiAgICBmb3IgKHZhciBrZXkgaW4gdmFsdWUpIHtcbiAgICAgIGVtcHR5SGFzaCA9IGZhbHNlO1xuICAgICAgY2hlY2sodmFsdWVba2V5XSwga2V5UGF0dGVybik7XG4gICAgfVxuICAgIGlmIChlbXB0eUhhc2gpXG4gICAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJFeHBlY3RlZCBcIiArIHBhdHRlcm4uY29uc3RydWN0b3IubmFtZSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKHBhdHRlcm4gaW5zdGFuY2VvZiBTdWJjbGFzcykge1xuICAgIHZhciBTdXBlcmNsYXNzID0gcGF0dGVybi5TdXBlcmNsYXNzO1xuICAgIGlmIChwYXR0ZXJuLm1hdGNoU3VwZXJjbGFzcyAmJiB2YWx1ZSA9PSBTdXBlcmNsYXNzKSBcbiAgICAgIHJldHVybjtcbiAgICBpZiAoISAodmFsdWUucHJvdG90eXBlIGluc3RhbmNlb2YgU3VwZXJjbGFzcykpXG4gICAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJFeHBlY3RlZCBcIiArIHBhdHRlcm4uY29uc3RydWN0b3IubmFtZSArIFwiIG9mIFwiICsgU3VwZXJjbGFzcy5uYW1lKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAodHlwZW9mIHBhdHRlcm4gIT09IFwib2JqZWN0XCIpXG4gICAgdGhyb3cgRXJyb3IoXCJCYWQgcGF0dGVybjogdW5rbm93biBwYXR0ZXJuIHR5cGVcIik7XG5cbiAgLy8gQW4gb2JqZWN0LCB3aXRoIHJlcXVpcmVkIGFuZCBvcHRpb25hbCBrZXlzLiBOb3RlIHRoYXQgdGhpcyBkb2VzIE5PVCBkb1xuICAvLyBzdHJ1Y3R1cmFsIG1hdGNoZXMgYWdhaW5zdCBvYmplY3RzIG9mIHNwZWNpYWwgdHlwZXMgdGhhdCBoYXBwZW4gdG8gbWF0Y2hcbiAgLy8gdGhlIHBhdHRlcm46IHRoaXMgcmVhbGx5IG5lZWRzIHRvIGJlIGEgcGxhaW4gb2xkIHtPYmplY3R9IVxuICBpZiAodHlwZW9mIHZhbHVlICE9PSAnb2JqZWN0JylcbiAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJFeHBlY3RlZCBvYmplY3QsIGdvdCBcIiArIHR5cGVvZiB2YWx1ZSk7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbClcbiAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJFeHBlY3RlZCBvYmplY3QsIGdvdCBudWxsXCIpO1xuXG4gIHZhciByZXF1aXJlZFBhdHRlcm5zID0ge307XG4gIHZhciBvcHRpb25hbFBhdHRlcm5zID0ge307XG5cbiAgXy5lYWNoS2V5KHBhdHRlcm4sIGZ1bmN0aW9uKHN1YlBhdHRlcm4sIGtleSkge1xuICAgIGlmIChwYXR0ZXJuW2tleV0gaW5zdGFuY2VvZiBPcHRpb25hbClcbiAgICAgIG9wdGlvbmFsUGF0dGVybnNba2V5XSA9IHBhdHRlcm5ba2V5XS5wYXR0ZXJuO1xuICAgIGVsc2VcbiAgICAgIHJlcXVpcmVkUGF0dGVybnNba2V5XSA9IHBhdHRlcm5ba2V5XTtcbiAgfSwgdGhpcywgdHJ1ZSk7XG5cbiAgXy5lYWNoS2V5KHZhbHVlLCBmdW5jdGlvbihzdWJWYWx1ZSwga2V5KSB7XG4gICAgdmFyIHN1YlZhbHVlID0gdmFsdWVba2V5XTtcbiAgICB0cnkge1xuICAgICAgaWYgKHJlcXVpcmVkUGF0dGVybnMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICBjaGVja1N1YnRyZWUoc3ViVmFsdWUsIHJlcXVpcmVkUGF0dGVybnNba2V5XSk7XG4gICAgICAgIGRlbGV0ZSByZXF1aXJlZFBhdHRlcm5zW2tleV07XG4gICAgICB9IGVsc2UgaWYgKG9wdGlvbmFsUGF0dGVybnMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICBjaGVja1N1YnRyZWUoc3ViVmFsdWUsIG9wdGlvbmFsUGF0dGVybnNba2V5XSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoIXVua25vd25LZXlzQWxsb3dlZClcbiAgICAgICAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJVbmtub3duIGtleVwiKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGlmIChlcnIgaW5zdGFuY2VvZiBNYXRjaC5FcnJvcilcbiAgICAgICAgZXJyLnBhdGggPSBfcHJlcGVuZFBhdGgoa2V5LCBlcnIucGF0aCk7XG4gICAgICB0aHJvdyBlcnI7XG4gICAgfVxuICB9LCB0aGlzLCB0cnVlKTtcblxuICBfLmVhY2hLZXkocmVxdWlyZWRQYXR0ZXJucywgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIk1pc3Npbmcga2V5ICdcIiArIGtleSArIFwiJ1wiKTtcbiAgfSwgdGhpcywgdHJ1ZSk7XG59O1xuXG5cbnZhciBfanNLZXl3b3JkcyA9IFtcImRvXCIsIFwiaWZcIiwgXCJpblwiLCBcImZvclwiLCBcImxldFwiLCBcIm5ld1wiLCBcInRyeVwiLCBcInZhclwiLCBcImNhc2VcIixcbiAgXCJlbHNlXCIsIFwiZW51bVwiLCBcImV2YWxcIiwgXCJmYWxzZVwiLCBcIm51bGxcIiwgXCJ0aGlzXCIsIFwidHJ1ZVwiLCBcInZvaWRcIiwgXCJ3aXRoXCIsXG4gIFwiYnJlYWtcIiwgXCJjYXRjaFwiLCBcImNsYXNzXCIsIFwiY29uc3RcIiwgXCJzdXBlclwiLCBcInRocm93XCIsIFwid2hpbGVcIiwgXCJ5aWVsZFwiLFxuICBcImRlbGV0ZVwiLCBcImV4cG9ydFwiLCBcImltcG9ydFwiLCBcInB1YmxpY1wiLCBcInJldHVyblwiLCBcInN0YXRpY1wiLCBcInN3aXRjaFwiLFxuICBcInR5cGVvZlwiLCBcImRlZmF1bHRcIiwgXCJleHRlbmRzXCIsIFwiZmluYWxseVwiLCBcInBhY2thZ2VcIiwgXCJwcml2YXRlXCIsIFwiY29udGludWVcIixcbiAgXCJkZWJ1Z2dlclwiLCBcImZ1bmN0aW9uXCIsIFwiYXJndW1lbnRzXCIsIFwiaW50ZXJmYWNlXCIsIFwicHJvdGVjdGVkXCIsIFwiaW1wbGVtZW50c1wiLFxuICBcImluc3RhbmNlb2ZcIl07XG5cbi8vIEFzc3VtZXMgdGhlIGJhc2Ugb2YgcGF0aCBpcyBhbHJlYWR5IGVzY2FwZWQgcHJvcGVybHlcbi8vIHJldHVybnMga2V5ICsgYmFzZVxuZnVuY3Rpb24gX3ByZXBlbmRQYXRoKGtleSwgYmFzZSkge1xuICBpZiAoKHR5cGVvZiBrZXkpID09PSBcIm51bWJlclwiIHx8IGtleS5tYXRjaCgvXlswLTldKyQvKSlcbiAgICBrZXkgPSBcIltcIiArIGtleSArIFwiXVwiO1xuICBlbHNlIGlmICgha2V5Lm1hdGNoKC9eW2Etel8kXVswLTlhLXpfJF0qJC9pKSB8fCBfanNLZXl3b3Jkcy5pbmRleE9mKGtleSkgIT0gLTEpXG4gICAga2V5ID0gSlNPTi5zdHJpbmdpZnkoW2tleV0pO1xuXG4gIGlmIChiYXNlICYmIGJhc2VbMF0gIT09IFwiW1wiKVxuICAgIHJldHVybiBrZXkgKyAnLicgKyBiYXNlO1xuICByZXR1cm4ga2V5ICsgYmFzZTtcbn07XG5cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKTtcblxuXG4vLyBtb2R1bGUgZXhwb3J0cyBlcnJvciBjbGFzc2VzIGZvciBhbGwgbmFtZXMgZGVmaW5lZCBpbiB0aGlzIGFycmF5XG52YXIgZXJyb3JDbGFzc05hbWVzID0gWydBYnN0cmFjdENsYXNzJywgJ01peGluJywgJ01lc3NlbmdlcicsICdDb21wb25lbnREYXRhU291cmNlJyxcblx0XHRcdFx0XHQgICAnQXR0cmlidXRlJywgJ0JpbmRlcicsICdMb2FkZXInLCAnTWFpbE1lc3NhZ2VTb3VyY2UnXTtcblxudmFyIGVycm9yID0ge1xuXHR0b0JlSW1wbGVtZW50ZWQ6IHRvQmVJbXBsZW1lbnRlZCxcblx0Y3JlYXRlQ2xhc3M6IGNyZWF0ZUVycm9yQ2xhc3Ncbn07XG5cbmVycm9yQ2xhc3NOYW1lcy5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUpIHtcblx0ZXJyb3JbbmFtZV0gPSBjcmVhdGVFcnJvckNsYXNzKG5hbWUgKyAnRXJyb3InKTtcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGVycm9yO1xuXG5cbmZ1bmN0aW9uIGNyZWF0ZUVycm9yQ2xhc3MoZXJyb3JDbGFzc05hbWUpIHtcblx0dmFyIEVycm9yQ2xhc3M7XG5cdGV2YWwoJ0Vycm9yQ2xhc3MgPSBmdW5jdGlvbiAnICsgZXJyb3JDbGFzc05hbWUgKyAnKG1lc3NhZ2UpIHsgXFxcblx0XHRcdHRoaXMubmFtZSA9IFwiJyArIGVycm9yQ2xhc3NOYW1lICsgJ1wiOyBcXFxuXHRcdFx0dGhpcy5tZXNzYWdlID0gbWVzc2FnZSB8fCBcIlRoZXJlIHdhcyBhbiBlcnJvclwiOyBcXFxuXHRcdH0nKTtcblx0Xy5tYWtlU3ViY2xhc3MoRXJyb3JDbGFzcywgRXJyb3IpO1xuXG5cdHJldHVybiBFcnJvckNsYXNzO1xufVxuXG5cbmZ1bmN0aW9uIHRvQmVJbXBsZW1lbnRlZCgpIHtcblx0dGhyb3cgbmV3IGVycm9yLkFic3RyYWN0Q2xhc3MoJ2NhbGxpbmcgdGhlIG1ldGhvZCBvZiBhbiBhYnNjdHJhY3QgY2xhc3MgTWVzc2FnZVNvdXJjZScpO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbCA9IHtcblx0bG9nZ2VyOiByZXF1aXJlKCcuL2xvZ2dlcicpLFxuXHRyZXF1ZXN0OiByZXF1aXJlKCcuL3JlcXVlc3QnKSxcblx0Y2hlY2s6IHJlcXVpcmUoJy4vY2hlY2snKSxcblx0ZXJyb3I6IHJlcXVpcmUoJy4vZXJyb3InKVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSB1dGlsO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgTG9nZ2VyID0gcmVxdWlyZSgnLi9sb2dnZXJfY2xhc3MnKTtcblxudmFyIGxvZ2dlciA9IG5ldyBMb2dnZXIoeyBsZXZlbDogMyB9KTtcblxubW9kdWxlLmV4cG9ydHMgPSBsb2dnZXI7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgnbW9sLXByb3RvJyk7XG5cblxuLyoqXG4gKiBMb2cgbGV2ZWxzLlxuICovXG5cbnZhciBsZXZlbHMgPSBbXG4gICAgJ2Vycm9yJyxcbiAgICAnd2FybicsXG4gICAgJ2luZm8nLFxuICAgICdkZWJ1Zydcbl07XG5cbnZhciBtYXhMZXZlbExlbmd0aCA9IE1hdGgubWF4LmFwcGx5KE1hdGgsIGxldmVscy5tYXAoZnVuY3Rpb24obGV2ZWwpIHsgcmV0dXJuIGxldmVsLmxlbmd0aDsgfSkpO1xuXG4vKipcbiAqIENvbG9ycyBmb3IgbG9nIGxldmVscy5cbiAqL1xuXG52YXIgY29sb3JzID0gW1xuICAgIDMxLFxuICAgIDMzLFxuICAgIDM2LFxuICAgIDkwXG5dO1xuXG4vKipcbiAqIFBhZHMgdGhlIG5pY2Ugb3V0cHV0IHRvIHRoZSBsb25nZXN0IGxvZyBsZXZlbC5cbiAqL1xuXG5mdW5jdGlvbiBwYWQgKHN0cikge1xuICAgIGlmIChzdHIubGVuZ3RoIDwgbWF4TGV2ZWxMZW5ndGgpXG4gICAgICAgIHJldHVybiBzdHIgKyBuZXcgQXJyYXkobWF4TGV2ZWxMZW5ndGggLSBzdHIubGVuZ3RoICsgMSkuam9pbignICcpO1xuXG4gICAgcmV0dXJuIHN0cjtcbn07XG5cbi8qKlxuICogTG9nZ2VyIChjb25zb2xlKS5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbnZhciBMb2dnZXIgPSBmdW5jdGlvbiAob3B0cykge1xuICAgIG9wdHMgPSBvcHRzIHx8IHt9XG4gICAgdGhpcy5jb2xvcnMgPSBvcHRzLmNvbG9ycztcbiAgICB0aGlzLmxldmVsID0gb3B0cy5sZXZlbCB8fCAzO1xuICAgIHRoaXMuZW5hYmxlZCA9IG9wdHMuZW5hYmxlZCB8fCB0cnVlO1xuICAgIHRoaXMubG9nUHJlZml4ID0gb3B0cy5sb2dQcmVmaXggfHwgJyc7XG4gICAgdGhpcy5sb2dQcmVmaXhDb2xvciA9IG9wdHMubG9nUHJlZml4Q29sb3I7XG59O1xuXG5cbi8qKlxuICogTG9nIG1ldGhvZC5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkxvZ2dlci5wcm90b3R5cGUubG9nID0gZnVuY3Rpb24gKHR5cGUpIHtcbiAgICB2YXIgaW5kZXggPSBsZXZlbHMuaW5kZXhPZih0eXBlKTtcblxuICAgIGlmIChpbmRleCA+IHRoaXMubGV2ZWwgfHwgISB0aGlzLmVuYWJsZWQpXG4gICAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgY29uc29sZS5sb2cuYXBwbHkoXG4gICAgICAgICAgY29uc29sZVxuICAgICAgICAsIFt0aGlzLmxvZ1ByZWZpeENvbG9yXG4gICAgICAgICAgICAgPyAnICAgXFx4MUJbJyArIHRoaXMubG9nUHJlZml4Q29sb3IgKyAnbScgKyB0aGlzLmxvZ1ByZWZpeCArICcgIC1cXHgxQlszOW0nXG4gICAgICAgICAgICAgOiB0aGlzLmxvZ1ByZWZpeFxuICAgICAgICAgICx0aGlzLmNvbG9yc1xuICAgICAgICAgICAgID8gJyBcXHgxQlsnICsgY29sb3JzW2luZGV4XSArICdtJyArIHBhZCh0eXBlKSArICcgLVxceDFCWzM5bSdcbiAgICAgICAgICAgICA6IHR5cGUgKyAnOidcbiAgICAgICAgICBdLmNvbmNhdChfLnRvQXJyYXkoYXJndW1lbnRzKS5zbGljZSgxKSlcbiAgICApO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEdlbmVyYXRlIG1ldGhvZHMuXG4gKi9cblxubGV2ZWxzLmZvckVhY2goZnVuY3Rpb24gKG5hbWUpIHtcbiAgICBMb2dnZXIucHJvdG90eXBlW25hbWVdID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmxvZy5hcHBseSh0aGlzLCBbbmFtZV0uY29uY2F0KF8udG9BcnJheShhcmd1bWVudHMpKSk7XG4gICAgfTtcbn0pO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gTG9nZ2VyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVlc3Q7XG5cblxuLy8gVE9ETyBhZGQgZXJyb3Igc3RhdHVzZXNcbnZhciBva1N0YXR1c2VzID0gWycyMDAnLCAnMzA0J107XG5cblxuZnVuY3Rpb24gcmVxdWVzdCh1cmwsIG9wdHMsIGNhbGxiYWNrKSB7XG5cdHZhciByZXEgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblx0cmVxLm9wZW4ob3B0cy5tZXRob2QsIHVybCwgdHJ1ZSk7IC8vIHdoYXQgdHJ1ZSBtZWFucz9cblx0cmVxLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcblx0XHRpZiAocmVxLnJlYWR5U3RhdGUgPT0gNCAmJiByZXEuc3RhdHVzVGV4dC50b1VwcGVyQ2FzZSgpID09ICdPSycgKVxuXHRcdFx0Y2FsbGJhY2sobnVsbCwgcmVxLnJlc3BvbnNlVGV4dCwgcmVxKTtcblx0XHQvLyBlbHNlXG5cdFx0Ly8gXHRjYWxsYmFjayhyZXEuc3RhdHVzLCByZXEucmVzcG9uc2VUZXh0LCByZXEpO1xuXHR9O1xuXHRyZXEuc2VuZChudWxsKTtcbn1cblxuXy5leHRlbmQocmVxdWVzdCwge1xuXHRnZXQ6IGdldFxufSk7XG5cblxuZnVuY3Rpb24gZ2V0KHVybCwgY2FsbGJhY2spIHtcblx0cmVxdWVzdCh1cmwsIHsgbWV0aG9kOiAnR0VUJyB9LCBjYWxsYmFjayk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfO1xudmFyIHByb3RvID0gXyA9IHtcblx0ZXh0ZW5kUHJvdG86IGV4dGVuZFByb3RvLFxuXHRjcmVhdGVTdWJjbGFzczogY3JlYXRlU3ViY2xhc3MsXG5cdG1ha2VTdWJjbGFzczogbWFrZVN1YmNsYXNzLFxuXHRleHRlbmQ6IGV4dGVuZCxcblx0Y2xvbmU6IGNsb25lLFxuXHRkZWVwRXh0ZW5kOiBkZWVwRXh0ZW5kLFxuXHRhbGxLZXlzOiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcy5iaW5kKE9iamVjdCksXG5cdGtleU9mOiBrZXlPZixcblx0YWxsS2V5c09mOiBhbGxLZXlzT2YsXG5cdGVhY2hLZXk6IGVhY2hLZXksXG5cdG1hcEtleXM6IG1hcEtleXMsXG5cdGFwcGVuZEFycmF5OiBhcHBlbmRBcnJheSxcblx0cHJlcGVuZEFycmF5OiBwcmVwZW5kQXJyYXksXG5cdHRvQXJyYXk6IHRvQXJyYXksXG5cdGZpcnN0VXBwZXJDYXNlOiBmaXJzdFVwcGVyQ2FzZSxcblx0Zmlyc3RMb3dlckNhc2U6IGZpcnN0TG93ZXJDYXNlXG59O1xuXG5cbmlmICh0eXBlb2Ygd2luZG93ID09ICdvYmplY3QnKSB7XG5cdC8vIHByZXNlcnZlIGV4aXN0aW5nIF8gb2JqZWN0XG5cdGlmICh3aW5kb3cuXylcblx0XHRwcm90by51bmRlcnNjb3JlID0gd2luZG93Ll9cblxuXHQvLyBleHBvc2UgZ2xvYmFsIF9cblx0d2luZG93Ll8gPSBwcm90bztcbn1cblxuaWYgKHR5cGVvZiBtb2R1bGUgPT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpXG5cdC8vIGV4cG9ydCBmb3Igbm9kZS9icm93c2VyaWZ5XG5cdG1vZHVsZS5leHBvcnRzID0gcHJvdG87XG5cdFxuXG5mdW5jdGlvbiBleHRlbmRQcm90byhzZWxmLCBtZXRob2RzKSB7XG5cdHZhciBwcm9wRGVzY3JpcHRvcnMgPSB7fTtcblxuXHRfLmVhY2hLZXkobWV0aG9kcywgZnVuY3Rpb24obWV0aG9kLCBuYW1lKSB7XG5cdFx0cHJvcERlc2NyaXB0b3JzW25hbWVdID0ge1xuXHRcdFx0ZW51bWVyYWJsZTogZmFsc2UsXG5cdFx0XHRjb25maWd1cmFibGU6IGZhbHNlLFxuXHRcdFx0d3JpdGFibGU6IGZhbHNlLFxuXHRcdFx0dmFsdWU6IG1ldGhvZFxuXHRcdH07XG5cdH0pO1xuXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHNlbGYucHJvdG90eXBlLCBwcm9wRGVzY3JpcHRvcnMpO1xuXHRyZXR1cm4gc2VsZjtcbn1cblxuXG5mdW5jdGlvbiBleHRlbmQoc2VsZiwgb2JqLCBvbmx5RW51bWVyYWJsZSkge1xuXHR2YXIgcHJvcERlc2NyaXB0b3JzID0ge307XG5cblx0Xy5lYWNoS2V5KG9iaiwgZnVuY3Rpb24odmFsdWUsIHByb3ApIHtcblx0XHR2YXIgZGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Iob2JqLCBwcm9wKTtcblx0XHRwcm9wRGVzY3JpcHRvcnNbcHJvcF0gPSBkZXNjcmlwdG9yO1xuXHR9LCB0aGlzLCBvbmx5RW51bWVyYWJsZSk7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnRpZXMoc2VsZiwgcHJvcERlc2NyaXB0b3JzKTtcblxuXHRyZXR1cm4gc2VsZjtcbn1cblxuXG5mdW5jdGlvbiBkZWVwRXh0ZW5kKHNlbGYsIG9iaiwgb25seUVudW1lcmFibGUpIHtcblx0cmV0dXJuIF9leHRlbmRUcmVlKHNlbGYsIG9iaiwgb25seUVudW1lcmFibGUsIFtdKTtcbn1cblxuXG5mdW5jdGlvbiBfZXh0ZW5kVHJlZShzZWxmTm9kZSwgb2JqTm9kZSwgb25seUVudW1lcmFibGUsIG9ialRyYXZlcnNlZCkge1xuXHRpZiAob2JqVHJhdmVyc2VkLmluZGV4T2Yob2JqTm9kZSkgPj0gMCkgcmV0dXJuOyAvLyBub2RlIGFscmVhZHkgdHJhdmVyc2VkXG5cdG9ialRyYXZlcnNlZC5wdXNoKG9iak5vZGUpO1xuXG5cdF8uZWFjaEtleShvYmpOb2RlLCBmdW5jdGlvbih2YWx1ZSwgcHJvcCkge1xuXHRcdHZhciBkZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmpOb2RlLCBwcm9wKTtcblx0XHRpZiAodHlwZW9mIHZhbHVlID09ICdvYmplY3QnKSB7XG5cdFx0XHRpZiAoc2VsZk5vZGUuaGFzT3duUHJvcGVydHkocHJvcCkgJiYgdHlwZW9mIHNlbGZOb2RlW3Byb3BdID09ICdvYmplY3QnKVxuXHRcdFx0XHRfZXh0ZW5kVHJlZShzZWxmTm9kZVtwcm9wXSwgdmFsdWUsIG9ubHlFbnVtZXJhYmxlLCBvYmpUcmF2ZXJzZWQpXG5cdFx0XHRlbHNlXG5cdFx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShzZWxmTm9kZSwgcHJvcCwgZGVzY3JpcHRvcik7XG5cdFx0fSBlbHNlXG5cdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoc2VsZk5vZGUsIHByb3AsIGRlc2NyaXB0b3IpO1xuXHR9LCB0aGlzLCBvbmx5RW51bWVyYWJsZSk7XG5cblx0cmV0dXJuIHNlbGZOb2RlO1xufVxuXG5cbmZ1bmN0aW9uIGNsb25lKG9iaikge1xuXHR2YXIgY2xvbmVkT2JqZWN0ID0gT2JqZWN0LmNyZWF0ZShvYmouY29uc3RydWN0b3IucHJvdG90eXBlKTtcblx0Xy5leHRlbmQoY2xvbmVkT2JqZWN0LCBvYmopO1xuXHRyZXR1cm4gY2xvbmVkT2JqZWN0O1xufVxuXG5cbmZ1bmN0aW9uIGNyZWF0ZVN1YmNsYXNzKHRoaXNDbGFzcywgbmFtZSwgYXBwbHlDb25zdHJ1Y3Rvcikge1xuXHR2YXIgc3ViY2xhc3M7XG5cblx0Ly8gbmFtZSBpcyBvcHRpb25hbFxuXHRuYW1lID0gbmFtZSB8fCAnJztcblxuXHQvLyBhcHBseSBzdXBlcmNsYXNzIGNvbnN0cnVjdG9yXG5cdHZhciBjb25zdHJ1Y3RvckNvZGUgPSBhcHBseUNvbnN0cnVjdG9yID09PSBmYWxzZVxuXHRcdFx0PyAnJ1xuXHRcdFx0OiAndGhpc0NsYXNzLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7JztcblxuXHRldmFsKCdzdWJjbGFzcyA9IGZ1bmN0aW9uICcgKyBuYW1lICsgJygpeyAnICsgY29uc3RydWN0b3JDb2RlICsgJyB9Jyk7XG5cblx0Xy5tYWtlU3ViY2xhc3Moc3ViY2xhc3MsIHRoaXNDbGFzcyk7XG5cblx0Ly8gY29weSBjbGFzcyBtZXRob2RzXG5cdC8vIC0gZm9yIHRoZW0gdG8gd29yayBjb3JyZWN0bHkgdGhleSBzaG91bGQgbm90IGV4cGxpY3RseSB1c2Ugc3VwZXJjbGFzcyBuYW1lXG5cdC8vIGFuZCB1c2UgXCJ0aGlzXCIgaW5zdGVhZFxuXHRfLmV4dGVuZChzdWJjbGFzcywgdGhpc0NsYXNzLCB0cnVlKTtcblxuXHRyZXR1cm4gc3ViY2xhc3M7XG59XG5cblxuZnVuY3Rpb24gbWFrZVN1YmNsYXNzKHRoaXNDbGFzcywgU3VwZXJjbGFzcykge1xuXHQvLyBwcm90b3R5cGUgY2hhaW5cblx0dGhpc0NsYXNzLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoU3VwZXJjbGFzcy5wcm90b3R5cGUpO1xuXHRcblx0Ly8gc3ViY2xhc3MgaWRlbnRpdHlcblx0Xy5leHRlbmRQcm90byh0aGlzQ2xhc3MsIHtcblx0XHRjb25zdHJ1Y3RvcjogdGhpc0NsYXNzXG5cdH0pO1xuXHRyZXR1cm4gdGhpc0NsYXNzO1xufVxuXG5cbmZ1bmN0aW9uIGtleU9mKHNlbGYsIHNlYXJjaEVsZW1lbnQsIG9ubHlFbnVtZXJhYmxlKSB7XG5cdHZhciBwcm9wZXJ0aWVzID0gb25seUVudW1lcmFibGUgXG5cdFx0XHRcdFx0XHQ/IE9iamVjdC5rZXlzKHNlbGYpXG5cdFx0XHRcdFx0XHQ6IF8uYWxsS2V5cyhzZWxmKTtcblxuXHRmb3IgKHZhciBpID0gMDsgaSA8IHByb3BlcnRpZXMubGVuZ3RoOyBpKyspXG5cdFx0aWYgKHNlYXJjaEVsZW1lbnQgPT09IHNlbGZbcHJvcGVydGllc1tpXV0pXG5cdFx0XHRyZXR1cm4gcHJvcGVydGllc1tpXTtcblx0XG5cdHJldHVybiB1bmRlZmluZWQ7XG59XG5cblxuZnVuY3Rpb24gYWxsS2V5c09mKHNlbGYsIHNlYXJjaEVsZW1lbnQsIG9ubHlFbnVtZXJhYmxlKSB7XG5cdHZhciBwcm9wZXJ0aWVzID0gb25seUVudW1lcmFibGUgXG5cdFx0XHRcdFx0XHQ/IE9iamVjdC5rZXlzKHNlbGYpXG5cdFx0XHRcdFx0XHQ6IF8uYWxsS2V5cyhzZWxmKTtcblxuXHR2YXIga2V5cyA9IHByb3BlcnRpZXMuZmlsdGVyKGZ1bmN0aW9uKHByb3ApIHtcblx0XHRyZXR1cm4gc2VhcmNoRWxlbWVudCA9PT0gc2VsZltwcm9wXTtcblx0fSk7XG5cblx0cmV0dXJuIGtleXM7XG59XG5cblxuZnVuY3Rpb24gZWFjaEtleShzZWxmLCBjYWxsYmFjaywgdGhpc0FyZywgb25seUVudW1lcmFibGUpIHtcblx0dmFyIHByb3BlcnRpZXMgPSBvbmx5RW51bWVyYWJsZSBcblx0XHRcdFx0XHRcdD8gT2JqZWN0LmtleXMoc2VsZilcblx0XHRcdFx0XHRcdDogXy5hbGxLZXlzKHNlbGYpO1xuXG5cdHByb3BlcnRpZXMuZm9yRWFjaChmdW5jdGlvbihwcm9wKSB7XG5cdFx0Y2FsbGJhY2suY2FsbCh0aGlzQXJnLCBzZWxmW3Byb3BdLCBwcm9wLCBzZWxmKTtcblx0fSk7XG59XG5cblxuZnVuY3Rpb24gbWFwS2V5cyhzZWxmLCBjYWxsYmFjaywgdGhpc0FyZywgb25seUVudW1lcmFibGUpIHtcblx0dmFyIG1hcFJlc3VsdCA9IHt9O1xuXHRfLmVhY2hLZXkoc2VsZiwgbWFwUHJvcGVydHksIHRoaXNBcmcsIG9ubHlFbnVtZXJhYmxlKTtcblx0cmV0dXJuIG1hcFJlc3VsdDtcblxuXHRmdW5jdGlvbiBtYXBQcm9wZXJ0eSh2YWx1ZSwga2V5KSB7XG5cdFx0dmFyIGRlc2NyaXB0b3IgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHNlbGYsIGtleSk7XG5cdFx0aWYgKGRlc2NyaXB0b3IuZW51bWVyYWJsZSB8fCAhIG9ubHlFbnVtZXJhYmxlKSB7XG5cdFx0XHRkZXNjcmlwdG9yLnZhbHVlID0gY2FsbGJhY2suY2FsbCh0aGlzLCB2YWx1ZSwga2V5LCBzZWxmKTtcblx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShtYXBSZXN1bHQsIGtleSwgZGVzY3JpcHRvcik7XG5cdFx0fVxuXHR9XG59XG5cblxuZnVuY3Rpb24gYXBwZW5kQXJyYXkoc2VsZiwgYXJyYXlUb0FwcGVuZCkge1xuXHRpZiAoISBhcnJheVRvQXBwZW5kLmxlbmd0aCkgcmV0dXJuIHNlbGY7XG5cbiAgICB2YXIgYXJncyA9IFtzZWxmLmxlbmd0aCwgMF0uY29uY2F0KGFycmF5VG9BcHBlbmQpO1xuICAgIEFycmF5LnByb3RvdHlwZS5zcGxpY2UuYXBwbHkoc2VsZiwgYXJncyk7XG5cbiAgICByZXR1cm4gc2VsZjtcbn1cblxuXG5mdW5jdGlvbiBwcmVwZW5kQXJyYXkoc2VsZiwgYXJyYXlUb1ByZXBlbmQpIHtcblx0aWYgKCEgYXJyYXlUb1ByZXBlbmQubGVuZ3RoKSByZXR1cm4gc2VsZjtcblxuICAgIHZhciBhcmdzID0gWzAsIDBdLmNvbmNhdChhcnJheVRvUHJlcGVuZCk7XG4gICAgQXJyYXkucHJvdG90eXBlLnNwbGljZS5hcHBseShzZWxmLCBhcmdzKTtcblxuICAgIHJldHVybiBzZWxmO1xufVxuXG5cbmZ1bmN0aW9uIHRvQXJyYXkoYXJyYXlMaWtlKSB7XG5cdHZhciBhcnIgPSBbXTtcblx0QXJyYXkucHJvdG90eXBlLmZvckVhY2guY2FsbChhcnJheUxpa2UsIGZ1bmN0aW9uKGl0ZW0pIHtcblx0XHRhcnIucHVzaChpdGVtKVxuXHR9KTtcblxuXHRyZXR1cm4gYXJyO1xufVxuXG5cbmZ1bmN0aW9uIGZpcnN0VXBwZXJDYXNlKHN0cikge1xuXHRyZXR1cm4gc3RyWzBdLnRvVXBwZXJDYXNlKCkgKyBzdHIuc2xpY2UoMSk7XG59XG5cblxuZnVuY3Rpb24gZmlyc3RMb3dlckNhc2Uoc3RyKSB7XG5cdHJldHVybiBzdHJbMF0udG9Mb3dlckNhc2UoKSArIHN0ci5zbGljZSgxKTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuZGVzY3JpYmUoJ21pbG8gYmluZGVyJywgZnVuY3Rpb24oKSB7XG4gICAgaXQoJ3Nob3VsZCBiaW5kIGNvbXBvbmVudHMgYmFzZWQgb24gbWwtYmluZCBhdHRyaWJ1dGUnLCBmdW5jdGlvbigpIHtcbiAgICBcdHZhciBtaWxvID0gcmVxdWlyZSgnLi4vLi4vbGliL21pbG8nKTtcblxuXHRcdGV4cGVjdCh7cDogMX0pLnByb3BlcnR5KCdwJywgMSk7XG5cbiAgICBcdHZhciBjdHJsID0gbWlsby5iaW5kZXIoKTtcblxuICAgIFx0Y3RybC5hcnRpY2xlQnV0dG9uLmV2ZW50cy5vbignY2xpY2sgbW91c2VlbnRlcicsIGZ1bmN0aW9uKGVUeXBlLCBldnQpIHtcbiAgICBcdFx0Y29uc29sZS5sb2coJ2J1dHRvbicsIGVUeXBlLCBldnQpO1xuICAgIFx0fSk7XG5cbiAgICAgICAgY3RybC5tYWluLmV2ZW50cy5vbignY2xpY2sgbW91c2VlbnRlciBpbnB1dCBrZXlwcmVzcycsIGZ1bmN0aW9uKGVUeXBlLCBldnQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdkaXYnLCBlVHlwZSwgZXZ0KTtcbiAgICAgICAgfSk7XG5cbiAgICBcdGN0cmwuYXJ0aWNsZUlkSW5wdXQuZGF0YS5vbignZGF0YWNoYW5nZWQnLCBsb2dEYXRhKTtcblxuICAgIFx0ZnVuY3Rpb24gbG9nRGF0YShtZXNzYWdlLCBkYXRhKSB7XG4gICAgXHRcdGNvbnNvbGUubG9nKG1lc3NhZ2UsIGRhdGEpO1xuICAgIFx0fVxuXG4gICAgICAgIHZhciBteVRtcGxDb21wcyA9IGN0cmwubXlUZW1wbGF0ZS50ZW1wbGF0ZVxuICAgICAgICAgICAgICAgIC5zZXQoJzxwIG1sLWJpbmQ9XCI6aW5uZXJQYXJhXCI+SSBhbSByZW5kZXJlZCBmcm9tIHRlbXBsYXRlPC9wPicpXG4gICAgICAgICAgICAgICAgLnJlbmRlcigpXG4gICAgICAgICAgICAgICAgLmJpbmRlcigpO1xuXG4gICAgICAgIF8uZXh0ZW5kKGN0cmwsIG15VG1wbENvbXBzKTsgLy8gc2hvdWxkIGJlIHNvbWUgZnVuY3Rpb24gdG8gYWRkIHRvIGNvbnRyb2xsZXJcblxuICAgICAgICBjdHJsLmlubmVyUGFyYS5lbC5pbm5lckhUTUwgKz0gJywgdGhlbiBib3VuZCBhbmQgY2hhbmdlZCB2aWEgY29tcG9uZW50IGluc2lkZSB0ZW1wbGF0ZSc7XG5cbiAgICAgICAgY29uc29sZS5sb2coY3RybCk7XG4gICAgfSk7XG59KTtcbiJdfQ==
;