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

},{"../util/check":33,"../util/error":34,"mol-proto":39}],2:[function(require,module,exports){
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

},{"../util/check":33,"mol-proto":39}],3:[function(require,module,exports){
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

},{"../config":24,"../util/check":33,"../util/error":34,"./index":5,"mol-proto":39}],4:[function(require,module,exports){
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
},{"../config":24,"../util/error":34,"./index":5,"mol-proto":39}],5:[function(require,module,exports){
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

},{"../util/check":33,"../util/error":34,"mol-proto":39}],6:[function(require,module,exports){
'use strict';

var miloMail = require('./mail')
	, miloComponentsRegistry = require('./components/c_registry')
	, Component = miloComponentsRegistry.get('Component')
	, BindAttribute = require('./attribute/a_bind')
	, BinderError = require('./util/error').Binder
	, _ = require('mol-proto')
	, check = require('./util/check')
	, Match =  check.Match;


module.exports = binder;


function binder(scopeEl, componentsRegistry) {
	var componentsRegistry = componentsRegistry || miloComponentsRegistry
		, scopeEl = scopeEl || document.body
		, components = {};

	bindElement(components, scopeEl);
	return components;


	function bindElement(components, el){
		var attr = new BindAttribute(el);

		if (attr.node)
			var aComponent = createComponent(el, attr);

		// bind inner elements to components
		if (el.children && el.children.length) {
			var innerComponents = bindChildren(el);

			if (Object.keys(innerComponents).length) {
				// attach inner components to the current one (create a new scope) ...
				if (typeof aComponent != 'undefined' && aComponent.container)
					aComponent.container.add(innerComponents);
				else // or keep them in the current scope
					_.eachKey(innerComponents, function(aComp, name) {
						storeComponent(components, aComp, name);
					});
			}
		}

		if (aComponent)
			storeComponent(components, aComponent, attr.compName);
	}


	function bindChildren(ownerEl) {
		var components = {};
		Array.prototype.forEach.call(ownerEl.children, function(el) {
			bindElement(components, el)
		});
		return components;
	}


	function createComponent(el, attr) {
		// element will be bound to a component
		attr.parse().validate();

		// get component class from registry and validate
		var ComponentClass = componentsRegistry.get(attr.compClass);

		if (! ComponentClass)
			throw new BinderError('class ' + attr.compClass + ' is not registered');

		check(ComponentClass, Match.Subclass(Component, true));

		// create new component
		var aComponent = new ComponentClass(el, attr.compName);

		// add extra facets
		var facets = attr.compFacets;
		if (facets)
			facets.forEach(function(fct) {
				aComponent.addFacet(fct);
			});

		return aComponent;
	}


	function storeComponent(components, aComponent, name) {
		if (components[name])
			throw new BinderError('duplicate component name: ' + name);

		components[name] = aComponent;
	}
}


},{"./attribute/a_bind":3,"./components/c_registry":22,"./mail":28,"./util/check":33,"./util/error":34,"mol-proto":39}],7:[function(require,module,exports){
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

},{"./abstract/registry":2,"./components/c_class":8,"./components/c_facet":9,"./components/c_facets/cf_registry":17,"./components/c_registry":22,"./facets/f_class":25}],8:[function(require,module,exports){
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


Component.createComponentClass = function(name, facetsConfig) {
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

delete Component.createFacetedClass;


_.extendProto(Component, {
	init: initComponent,
	addFacet: addFacet,
	allFacets: envokeMethodOnAllFacets
});


function initComponent(element, name) {
	this.el = element;
	this.name = name;

	var messenger = new Messenger(this, Messenger.defaultMethods, undefined /* no messageSource */);

	Object.defineProperties(this, {
		_messenger: { value: messenger },
	});	

	// start all facets
	this.allFacets('check');
	this.allFacets('start');
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


function envokeMethodOnAllFacets(method /* , ... */) {
	var args = Array.prototype.slice.call(arguments, 1);

	_.eachKey(this.facets, function(facet, fctName) {
		if (facet && typeof facet[method] == 'function')
			facet[method].apply(facet, args);
	});
}

},{"../facets/f_object":26,"../messenger":30,"../util/check":33,"./c_facet":9,"./c_facets/cf_registry":17,"mol-proto":39}],9:[function(require,module,exports){
'use strict';

var Facet = require('../facets/f_class')
	, Messenger = require('../messenger')
	, FacetError = require('../util/error').Facet
	, _ = require('mol-proto');

var ComponentFacet = _.createSubclass(Facet, 'ComponentFacet');

module.exports = ComponentFacet;


_.extendProto(ComponentFacet, {
	init: initComponentFacet,
	check: checkDependencies
});


function initComponentFacet() {
	// var messenger = new Messenger(this, Messenger.defaultMethods, undefined /* no messageSource */);

	// Object.defineProperties(this, {
	// 	_facetMessenger: { value: messenger },
	// });
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

},{"../facets/f_class":25,"../messenger":30,"../util/error":34,"mol-proto":39}],10:[function(require,module,exports){
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

},{"../../binder":6,"../c_facet":9,"./cf_registry":17,"mol-proto":39}],11:[function(require,module,exports){
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

},{"../../messenger":30,"../c_facet":9,"../c_message_sources/component_data_source":18,"./cf_registry":17,"mol-proto":39}],12:[function(require,module,exports){
'use strict';

var ComponentFacet = require('../c_facet')
	, facetsRegistry = require('./cf_registry')	
	, _ = require('mol-proto')
	, check = require('../../util/check')
	, Match = check.Match
	, binder = require('../../binder');


// data model connection facet
var Dom = _.createSubclass(ComponentFacet, 'Dom');

_.extendProto(Dom, {
	init: initDomFacet,
	start: startDomFacet,

	show: showElement,
	hide: hideElement,
	remove: removeElement,
	append: appendInsideElement,
	prepend: prependInsideElement,

	// _reattach: _reattachEventsOnElementChange
});

facetsRegistry.add(Dom);

module.exports = Dom;


function initDomFacet() {
	ComponentFacet.prototype.init.apply(this, arguments);
}

function startDomFacet() {
	if (this.config.cls)
		this.owner.el.classList.add(this.config.cls);
}

function showElement() {
	this.owner.el.style.display = 'block';
}

function hideElement() {
	this.owner.el.style.display = 'none';
}

function removeElement() {
	var thisEl = this.owner.el;
	thisEl.parentNode.removeChild(thisEl);
}

function appendInsideElement(el) {
	this.owner.el.appendChild(el)
}

function prependInsideElement(el) {
	var thisEl = this.owner.el
		, firstChild = thisEl.firstChild;
	if (firstChild)
		thisEl.insertBefore(el, firstChild);
	else
		thisEl.appendChild(el);
}


},{"../../binder":6,"../../util/check":33,"../c_facet":9,"./cf_registry":17,"mol-proto":39}],13:[function(require,module,exports){
'use strict';

var ComponentFacet = require('../c_facet')
	, facetsRegistry = require('./cf_registry')

	, _ = require('mol-proto');


// data model connection facet
var Drag = _.createSubclass(ComponentFacet, 'Drag');

_.extendProto(Drag, {
	init: initDragFacet,
	start: startDragFacet,
	require: ['Events'] // TODO implement facet dependencies

	// _reattach: _reattachEventsOnElementChange
});

facetsRegistry.add(Drag);

module.exports = Drag;


function initDragFacet() {
	ComponentFacet.prototype.init.apply(this, arguments);
}

function startDragFacet() {

}

},{"../c_facet":9,"./cf_registry":17,"mol-proto":39}],14:[function(require,module,exports){
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

},{"../../messenger":30,"../c_facet":9,"../c_message_sources/dom_events_source":20,"./cf_registry":17,"mol-proto":39}],15:[function(require,module,exports){
'use strict';

var ComponentFacet = require('../c_facet')
	, facetsRegistry = require('./cf_registry')

	, Messenger = require('../../messenger')
	, iFrameMessageSource = require('../c_message_sources/iframe_message_source')

	, _ = require('mol-proto');


// data model connection facet
var Frame = _.createSubclass(ComponentFacet, 'Frame');

_.extendProto(Frame, {
	init: initFrameFacet

	// _reattach: _reattachEventsOnElementChange
});


facetsRegistry.add(Frame);

module.exports = Frame;


function initFrameFacet() {
	ComponentFacet.prototype.init.apply(this, arguments);
	
	var iFrameMessageSourceProxy = {
		post: 'post'
	};
	var messageSource = new iFrameMessageSource(this, iFrameMessageSourceProxy);

	var proxyMessengerMethods = {
		on: 'onMessage',
		off: 'offMessage',
		onMessages: 'onMessages',
		offMessages: 'offMessages',
		getSubscribers: 'getSubscribers'
	};

	var iFrameMessenger = new Messenger(this, proxyMessengerMethods, messageSource);

	Object.defineProperties(this, {
		_iFrameMessenger: { value: iFrameMessenger },
		_messageSource: { value: messageSource }
	});
}
},{"../../messenger":30,"../c_facet":9,"../c_message_sources/iframe_message_source":21,"./cf_registry":17,"mol-proto":39}],16:[function(require,module,exports){
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


function bindInnerComponents(registry) {
	var thisComponent = binder(this.owner.el, registry);

	if (this.owner.container) // TODO should be changed to reconcillation of existing children with new
		this.owner.container.children = thisComponent[this.owner.name].container.children;

	return thisComponent;
}

},{"../../binder":6,"../../util/check":33,"../c_facet":9,"./cf_registry":17,"mol-proto":39}],17:[function(require,module,exports){
'use strict';

var ClassRegistry = require('../../abstract/registry')
	, ComponentFacet = require('../c_facet');

var facetsRegistry = new ClassRegistry(ComponentFacet);

facetsRegistry.add(ComponentFacet);

module.exports = facetsRegistry;

// TODO - refactor components registry test into a function
// that tests a registry with a given foundation class
// Make test for this registry based on this function
},{"../../abstract/registry":2,"../c_facet":9}],18:[function(require,module,exports){
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

},{"../../util/check":33,"../../util/error":34,"../c_class":8,"./dom_events_source":20,"mol-proto":39}],19:[function(require,module,exports){
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

},{"mol-proto":39}],20:[function(require,module,exports){
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
},{"../../messenger/message_source":31,"../../util/check":33,"../c_class":8,"./dom_events_constructors":19,"mol-proto":39}],21:[function(require,module,exports){
'use strict';

var MessageSource = require('../../messenger/message_source')
	, _ = require('mol-proto')
	, check = require('../../util/check')
	, Match = check.Match;

var iFrameMessageSource = _.createSubclass(MessageSource, 'iFrameMessageSource', true);


_.extendProto(iFrameMessageSource, {
	// implementing MessageSource interface
	init: initIFrameMessageSource,
	translateToSourceMessage: translateToIFrameMessage,
 	addSourceListener: addIFrameMessageListener,
 	removeSourceListener: removeIFrameMessageListener,
 	filterSourceMessage: filterRecievedIFrameMessage,

 	//class specific methods
 	post: postToOtherWindow,
 	handleEvent: handleEvent  // event dispatcher - as defined by Event DOM API
});

module.exports = iFrameMessageSource;


function initIFrameMessageSource(hostObject, proxyMethods) {
	check(hostObject, Object);
	MessageSource.prototype.init.apply(this, arguments);

	if (hostObject.owner.el.nodeName == 'IFRAME')
		this._postTo = hostObject.owner.el.contentWindow;
	else
		this._postTo = window.parent;

	this._listenTo = window;
}


function translateToIFrameMessage(message) {
	return 'message'; // sourceMessage
}


function addIFrameMessageListener(eventType) {
	this._listenTo.addEventListener(eventType, this, false);
}


function removeIFrameMessageListener(eventType) {
	this._listenTo.removeEventListener(eventType, this, false);
}


function filterRecievedIFrameMessage(eventType, message, event) {
	return true;
}

function postToOtherWindow(eventType, message) {
	message.type = eventType;
	this._postTo.postMessage(message, '*');
}

function handleEvent(event) {
	this.dispatchMessage(event.type, event);
}

},{"../../messenger/message_source":31,"../../util/check":33,"mol-proto":39}],22:[function(require,module,exports){
'use strict';

var ClassRegistry = require('../abstract/registry')
	, Component = require('./c_class');

var componentsRegistry = new ClassRegistry(Component);

componentsRegistry.add(Component);

module.exports = componentsRegistry;

},{"../abstract/registry":2,"./c_class":8}],23:[function(require,module,exports){
'use strict';

var Component = require('../c_class')
	, componentsRegistry = require('../c_registry');


var View = Component.createComponentClass('View', ['container']);

componentsRegistry.add(View);

module.exports = View;

},{"../c_class":8,"../c_registry":22}],24:[function(require,module,exports){
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

},{"mol-proto":39}],25:[function(require,module,exports){
'use strict';

var _ = require('mol-proto');

module.exports = Facet;

function Facet(owner, config) {
	this.owner = owner;
	this.config = config || {};
	this.init.apply(this, arguments);
}

_.extendProto(Facet, {
	init: function() {}
});

},{"mol-proto":39}],26:[function(require,module,exports){
'use strict';

var Facet = require('./f_class')
	, _ = require('mol-proto')
	, check = require('../util/check')
	, Match = check.Match;

module.exports = FacetedObject;

// abstract class for faceted object
function FacetedObject() {
	// TODO instantiate facets if configuration isn't passed
	// write a test to check it
	var facetsConfig = _.clone(this.facetsConfig || {});

	var thisClass = this.constructor
		, facetsDescriptors = {}
		, facets = {};

	if (this.constructor == FacetedObject)		
		throw new Error('FacetedObject is an abstract class, can\'t be instantiated');

	if (this.facets)
		_.eachKey(this.facets, instantiateFacet, this, true);

	var unusedFacetsNames = Object.keys(facetsConfig);
	if (unusedFacetsNames.length)
		throw new Error('Configuration for unknown facet(s) passed: ' + unusedFacetsNames.join(', '));

	Object.defineProperties(this, facetsDescriptors);
	Object.defineProperty(this, 'facets', { value: facets });	

	// calling init if it is defined in the class
	if (this.init)
		this.init.apply(this, arguments);

	function instantiateFacet(FacetClass, fct) {
		var facetOpts = facetsConfig[fct];
		delete facetsConfig[fct];

		facets[fct] = new FacetClass(this, facetOpts);

		facetsDescriptors[fct] = {
			enumerable: false,
			value: facets[fct]
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

	var newFacet = this.facets[facetName] = new FacetClass(this, facetOpts);

	Object.defineProperty(this, facetName, {
		enumerable: false,
		value: newFacet
	});

	return newFacet;
}


// factory that creates classes (constructors) from the map of facets
// these classes inherit from FacetedObject
FacetedObject.createFacetedClass = function (name, facetsClasses, facetsConfig) {
	check(name, String);
	check(facetsClasses, Match.ObjectHash(Function /* Match.Subclass(Facet, true) TODO - fix */));

	var FacetedClass = _.createSubclass(this, name, true);

	_.extendProto(FacetedClass, {
		facets: facetsClasses,
		facetsConfig: facetsConfig
	});
	return FacetedClass;
};


},{"../util/check":33,"./f_class":25,"mol-proto":39}],27:[function(require,module,exports){
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

},{"./attribute/a_load":4,"./config":24,"./mail":28,"./util/error":34,"./util/logger":36,"./util/request":38}],28:[function(require,module,exports){
'use strict';

var Messenger = require('../messenger')
	, MailMessageSource = require('./mail_source');


var mailMsgSource = new MailMessageSource();

var miloMail = new Messenger(undefined, undefined, mailMsgSource);

module.exports = miloMail;

},{"../messenger":30,"./mail_source":29}],29:[function(require,module,exports){
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

},{"../components/c_message_sources/dom_events_constructors":19,"../messenger/message_source":31,"../util/check":33,"../util/error":34,"mol-proto":39}],30:[function(require,module,exports){
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

},{"../abstract/mixin":1,"../util/check":33,"../util/error":34,"./message_source":31,"mol-proto":39}],31:[function(require,module,exports){
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

},{"../abstract/mixin":1,"../util/error":34,"../util/logger":36,"mol-proto":39}],32:[function(require,module,exports){
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
require('./components/c_facets/Dom');
require('./components/c_facets/Data');
require('./components/c_facets/Frame');
require('./components/c_facets/Events');
require('./components/c_facets/Template');
require('./components/c_facets/Container');
require('./components/c_facets/Drag');

// used components
require('./components/classes/View');


// export for node/browserify
if (typeof module == 'object' && module.exports)	
	module.exports = milo;

// global milo for browser
if (typeof window == 'object')
	window.milo = milo;

},{"./binder":6,"./classes":7,"./components/c_facets/Container":10,"./components/c_facets/Data":11,"./components/c_facets/Dom":12,"./components/c_facets/Drag":13,"./components/c_facets/Events":14,"./components/c_facets/Frame":15,"./components/c_facets/Template":16,"./components/classes/View":23,"./config":24,"./loader":27,"./mail":28,"./util":35}],33:[function(require,module,exports){
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


},{"mol-proto":39}],34:[function(require,module,exports){
'use strict';

var _ = require('mol-proto');


// module exports error classes for all names defined in this array
var errorClassNames = ['AbstractClass', 'Mixin', 'Messenger', 'ComponentDataSource',
					   'Attribute', 'Binder', 'Loader', 'MailMessageSource', 'Facet'];

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

},{"mol-proto":39}],35:[function(require,module,exports){
'use strict';

var util = {
	logger: require('./logger'),
	request: require('./request'),
	check: require('./check'),
	error: require('./error')
};

module.exports = util;

},{"./check":33,"./error":34,"./logger":36,"./request":38}],36:[function(require,module,exports){
'use strict';

var Logger = require('./logger_class');

var logger = new Logger({ level: 3 });

module.exports = logger;

},{"./logger_class":37}],37:[function(require,module,exports){
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

},{"mol-proto":39}],38:[function(require,module,exports){
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

},{"mol-proto":39}],39:[function(require,module,exports){
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

},{}],40:[function(require,module,exports){
'use strict';

describe('milo binder', function() {
    it('should bind components based on ml-bind attribute', function() {
    	var milo = require('../../lib/milo');

		expect({p: 1}).property('p', 1);

    	var ctrl = milo.binder();

        console.log(ctrl);

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
    });
});

},{"../../lib/milo":32}]},{},[40])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2Fic3RyYWN0L21peGluLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9hYnN0cmFjdC9yZWdpc3RyeS5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvYXR0cmlidXRlL2FfYmluZC5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvYXR0cmlidXRlL2FfbG9hZC5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvYXR0cmlidXRlL2luZGV4LmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9iaW5kZXIuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NsYXNzZXMuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19jbGFzcy5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX2ZhY2V0LmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfZmFjZXRzL0NvbnRhaW5lci5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX2ZhY2V0cy9EYXRhLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfZmFjZXRzL0RvbS5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX2ZhY2V0cy9EcmFnLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfZmFjZXRzL0V2ZW50cy5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX2ZhY2V0cy9GcmFtZS5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX2ZhY2V0cy9UZW1wbGF0ZS5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX2ZhY2V0cy9jZl9yZWdpc3RyeS5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX21lc3NhZ2Vfc291cmNlcy9jb21wb25lbnRfZGF0YV9zb3VyY2UuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19tZXNzYWdlX3NvdXJjZXMvZG9tX2V2ZW50c19jb25zdHJ1Y3RvcnMuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19tZXNzYWdlX3NvdXJjZXMvZG9tX2V2ZW50c19zb3VyY2UuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19tZXNzYWdlX3NvdXJjZXMvaWZyYW1lX21lc3NhZ2Vfc291cmNlLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfcmVnaXN0cnkuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY2xhc3Nlcy9WaWV3LmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb25maWcuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2ZhY2V0cy9mX2NsYXNzLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9mYWNldHMvZl9vYmplY3QuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2xvYWRlci5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvbWFpbC9pbmRleC5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvbWFpbC9tYWlsX3NvdXJjZS5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvbWVzc2VuZ2VyL2luZGV4LmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9tZXNzZW5nZXIvbWVzc2FnZV9zb3VyY2UuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL21pbG8uanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL3V0aWwvY2hlY2suanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL3V0aWwvZXJyb3IuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL3V0aWwvaW5kZXguanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL3V0aWwvbG9nZ2VyLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi91dGlsL2xvZ2dlcl9jbGFzcy5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvdXRpbC9yZXF1ZXN0LmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL25vZGVfbW9kdWxlcy9tb2wtcHJvdG8vbGliL3Byb3RvLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL3Rlc3RfaHRtbC9iaW5kX3Rlc3QvYmluZF90ZXN0LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25QQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vdXRpbC9jaGVjaycpXG5cdCwgTWF0Y2ggPSBjaGVjay5NYXRjaFxuXHQsIE1peGluRXJyb3IgPSByZXF1aXJlKCcuLi91dGlsL2Vycm9yJykuTWl4aW47XG5cblxubW9kdWxlLmV4cG9ydHMgPSBNaXhpbjtcblxuLy8gYW4gYWJzdHJhY3QgY2xhc3MgZm9yIG1peGluIHBhdHRlcm4gLSBhZGRpbmcgcHJveHkgbWV0aG9kcyB0byBob3N0IG9iamVjdHNcbmZ1bmN0aW9uIE1peGluKGhvc3RPYmplY3QsIHByb3h5TWV0aG9kcyAvKiwgb3RoZXIgYXJncyAtIHBhc3NlZCB0byBpbml0IG1ldGhvZCAqLykge1xuXHQvLyBUT0RPIC0gbW9jZSBjaGVja3MgZnJvbSBNZXNzZW5nZXIgaGVyZVxuXHRjaGVjayhob3N0T2JqZWN0LCBNYXRjaC5PcHRpb25hbChPYmplY3QpKTtcblx0Y2hlY2socHJveHlNZXRob2RzLCBNYXRjaC5PcHRpb25hbChNYXRjaC5PYmplY3RIYXNoKFN0cmluZykpKTtcblxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ19ob3N0T2JqZWN0JywgeyB2YWx1ZTogaG9zdE9iamVjdCB9KTtcblx0aWYgKHByb3h5TWV0aG9kcylcblx0XHR0aGlzLl9jcmVhdGVQcm94eU1ldGhvZHMocHJveHlNZXRob2RzKTtcblxuXHQvLyBjYWxsaW5nIGluaXQgaWYgaXQgaXMgZGVmaW5lZCBpbiB0aGUgY2xhc3Ncblx0aWYgKHRoaXMuaW5pdClcblx0XHR0aGlzLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn1cblxuXy5leHRlbmRQcm90byhNaXhpbiwge1xuXHRfY3JlYXRlUHJveHlNZXRob2Q6IF9jcmVhdGVQcm94eU1ldGhvZCxcblx0X2NyZWF0ZVByb3h5TWV0aG9kczogX2NyZWF0ZVByb3h5TWV0aG9kc1xufSk7XG5cblxuZnVuY3Rpb24gX2NyZWF0ZVByb3h5TWV0aG9kKG1peGluTWV0aG9kTmFtZSwgcHJveHlNZXRob2ROYW1lKSB7XG5cdGlmICh0aGlzLl9ob3N0T2JqZWN0W3Byb3h5TWV0aG9kTmFtZV0pXG5cdFx0dGhyb3cgbmV3IE1peGluRXJyb3IoJ21ldGhvZCAnICsgcHJveHlNZXRob2ROYW1lICtcblx0XHRcdFx0XHRcdFx0XHQgJyBhbHJlYWR5IGRlZmluZWQgaW4gaG9zdCBvYmplY3QnKTtcblxuXHRjaGVjayh0aGlzW21peGluTWV0aG9kTmFtZV0sIEZ1bmN0aW9uKTtcblxuXHR2YXIgYm91bmRNZXRob2QgPSB0aGlzW21peGluTWV0aG9kTmFtZV0uYmluZCh0aGlzKTtcblxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcy5faG9zdE9iamVjdCwgcHJveHlNZXRob2ROYW1lLFxuXHRcdHsgdmFsdWU6IGJvdW5kTWV0aG9kIH0pO1xufVxuXG5cbmZ1bmN0aW9uIF9jcmVhdGVQcm94eU1ldGhvZHMocHJveHlNZXRob2RzKSB7XG5cdC8vIGNyZWF0aW5nIGFuZCBiaW5kaW5nIHByb3h5IG1ldGhvZHMgb24gdGhlIGhvc3Qgb2JqZWN0XG5cdF8uZWFjaEtleShwcm94eU1ldGhvZHMsIF9jcmVhdGVQcm94eU1ldGhvZCwgdGhpcyk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgnbW9sLXByb3RvJylcblx0LCBjaGVjayA9IHJlcXVpcmUoJy4uL3V0aWwvY2hlY2snKVxuXHQsIE1hdGNoID0gY2hlY2suTWF0Y2g7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2xhc3NSZWdpc3RyeTtcblxuZnVuY3Rpb24gQ2xhc3NSZWdpc3RyeSAoRm91bmRhdGlvbkNsYXNzKSB7XG5cdGlmIChGb3VuZGF0aW9uQ2xhc3MpXG5cdFx0dGhpcy5zZXRDbGFzcyhGb3VuZGF0aW9uQ2xhc3MpO1xuXG5cdC8vIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnX19yZWdpc3RlcmVkQ2xhc3NlcycsIHtcblx0Ly8gXHRcdGVudW1lcmFibGU6IGZhbHNlLFxuXHQvLyBcdFx0d3JpdGFibGU6IHRydWUsXG5cdC8vIFx0XHRjb25maWd1cmFibGU6IHRydWUsXG5cdC8vIFx0XHR2YWx1ZToge31cblx0Ly8gfSk7XG5cblx0dGhpcy5fX3JlZ2lzdGVyZWRDbGFzc2VzID0ge307XG59XG5cbl8uZXh0ZW5kUHJvdG8oQ2xhc3NSZWdpc3RyeSwge1xuXHRhZGQ6IHJlZ2lzdGVyQ2xhc3MsXG5cdGdldDogZ2V0Q2xhc3MsXG5cdHJlbW92ZTogdW5yZWdpc3RlckNsYXNzLFxuXHRjbGVhbjogdW5yZWdpc3RlckFsbENsYXNzZXMsXG5cdHNldENsYXNzOiBzZXRGb3VuZGF0aW9uQ2xhc3Ncbn0pO1xuXG5cbmZ1bmN0aW9uIHNldEZvdW5kYXRpb25DbGFzcyhGb3VuZGF0aW9uQ2xhc3MpIHtcblx0Y2hlY2soRm91bmRhdGlvbkNsYXNzLCBGdW5jdGlvbik7XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnRm91bmRhdGlvbkNsYXNzJywge1xuXHRcdGVudW1lcmFibGU6IHRydWUsXG5cdFx0dmFsdWU6IEZvdW5kYXRpb25DbGFzc1xuXHR9KTtcbn1cblxuZnVuY3Rpb24gcmVnaXN0ZXJDbGFzcyhhQ2xhc3MsIG5hbWUpIHtcblx0bmFtZSA9IG5hbWUgfHwgYUNsYXNzLm5hbWU7XG5cblx0Y2hlY2sobmFtZSwgU3RyaW5nLCAnY2xhc3MgbmFtZSBtdXN0IGJlIHN0cmluZycpO1xuXHRjaGVjayhuYW1lLCBNYXRjaC5XaGVyZShmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gdHlwZW9mIG5hbWUgPT0gJ3N0cmluZycgJiYgbmFtZSAhPSAnJztcblx0fSksICdjbGFzcyBuYW1lIG11c3QgYmUgc3RyaW5nJyk7XG5cdGlmICh0aGlzLkZvdW5kYXRpb25DbGFzcykge1xuXHRcdGlmIChhQ2xhc3MgIT0gdGhpcy5Gb3VuZGF0aW9uQ2xhc3MpXG5cdFx0XHRjaGVjayhhQ2xhc3MsIE1hdGNoLlN1YmNsYXNzKHRoaXMuRm91bmRhdGlvbkNsYXNzKSwgJ2NsYXNzIG11c3QgYmUgYSBzdWIoY2xhc3MpIG9mIGEgZm91bmRhdGlvbiBjbGFzcycpO1xuXHR9IGVsc2Vcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdmb3VuZGF0aW9uIGNsYXNzIG11c3QgYmUgc2V0IGJlZm9yZSBhZGRpbmcgY2xhc3NlcyB0byByZWdpc3RyeScpO1xuXG5cdGlmICh0aGlzLl9fcmVnaXN0ZXJlZENsYXNzZXNbbmFtZV0pXG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignaXMgYWxyZWFkeSByZWdpc3RlcmVkJyk7XG5cblx0dGhpcy5fX3JlZ2lzdGVyZWRDbGFzc2VzW25hbWVdID0gYUNsYXNzO1xufTtcblxuXG5mdW5jdGlvbiBnZXRDbGFzcyhuYW1lKSB7XG5cdGNoZWNrKG5hbWUsIFN0cmluZywgJ2NsYXNzIG5hbWUgbXVzdCBiZSBzdHJpbmcnKTtcblx0cmV0dXJuIHRoaXMuX19yZWdpc3RlcmVkQ2xhc3Nlc1tuYW1lXTtcbn07XG5cblxuZnVuY3Rpb24gdW5yZWdpc3RlckNsYXNzKG5hbWVPckNsYXNzKSB7XG5cdGNoZWNrKG5hbWVPckNsYXNzLCBNYXRjaC5PbmVPZihTdHJpbmcsIEZ1bmN0aW9uKSwgJ2NsYXNzIG9yIG5hbWUgbXVzdCBiZSBzdXBwbGllZCcpO1xuXG5cdHZhciBuYW1lID0gdHlwZW9mIG5hbWVPckNsYXNzID09ICdzdHJpbmcnXG5cdFx0XHRcdFx0XHQ/IG5hbWVPckNsYXNzXG5cdFx0XHRcdFx0XHQ6IG5hbWVPckNsYXNzLm5hbWU7XG5cdFx0XHRcdFx0XHRcblx0aWYgKCEgdGhpcy5fX3JlZ2lzdGVyZWRDbGFzc2VzW25hbWVdKVxuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ2NsYXNzIGlzIG5vdCByZWdpc3RlcmVkJyk7XG5cblx0ZGVsZXRlIHRoaXMuX19yZWdpc3RlcmVkQ2xhc3Nlc1tuYW1lXTtcbn07XG5cblxuZnVuY3Rpb24gdW5yZWdpc3RlckFsbENsYXNzZXMoKSB7XG5cdHRoaXMuX19yZWdpc3RlcmVkQ2xhc3NlcyA9IHt9O1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIEF0dHJpYnV0ZSA9IHJlcXVpcmUoJy4vaW5kZXgnKVxuXHQsIEF0dHJpYnV0ZUVycm9yID0gcmVxdWlyZSgnLi4vdXRpbC9lcnJvcicpLkF0dHJpYnV0ZVxuXHQsIGNvbmZpZyA9IHJlcXVpcmUoJy4uL2NvbmZpZycpXG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpXG5cdCwgY2hlY2sgPSByZXF1aXJlKCcuLi91dGlsL2NoZWNrJylcblx0LCBNYXRjaCA9IGNoZWNrLk1hdGNoO1xuXG5cbi8vIE1hdGNoZXM7XG4vLyA6bXlWaWV3IC0gb25seSBjb21wb25lbnQgbmFtZVxuLy8gVmlldzpteVZpZXcgLSBjbGFzcyBhbmQgY29tcG9uZW50IG5hbWVcbi8vIFtFdmVudHMsIERhdGFdOm15VmlldyAtIGZhY2V0cyBhbmQgY29tcG9uZW50IG5hbWVcbi8vIFZpZXdbRXZlbnRzXTpteVZpZXcgLSBjbGFzcywgZmFjZXQocykgYW5kIGNvbXBvbmVudCBuYW1lXG5cbnZhciBhdHRyUmVnRXhwPSAvXihbXlxcOlxcW1xcXV0qKSg/OlxcWyhbXlxcOlxcW1xcXV0qKVxcXSk/XFw6PyhbXjpdKikkL1xuXHQsIGZhY2V0c1NwbGl0UmVnRXhwID0gL1xccyooPzpcXCx8XFxzKVxccyovO1xuXG5cbnZhciBCaW5kQXR0cmlidXRlID0gXy5jcmVhdGVTdWJjbGFzcyhBdHRyaWJ1dGUsICdCaW5kQXR0cmlidXRlJywgdHJ1ZSk7XG5cbl8uZXh0ZW5kUHJvdG8oQmluZEF0dHJpYnV0ZSwge1xuXHRhdHRyTmFtZTogZ2V0QXR0cmlidXRlTmFtZSxcblx0cGFyc2U6IHBhcnNlQXR0cmlidXRlLFxuXHR2YWxpZGF0ZTogdmFsaWRhdGVBdHRyaWJ1dGVcbn0pO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gQmluZEF0dHJpYnV0ZTtcblxuXG5mdW5jdGlvbiBnZXRBdHRyaWJ1dGVOYW1lKCkge1xuXHRyZXR1cm4gY29uZmlnLmF0dHJzWydiaW5kJ107XG59XG5cblxuZnVuY3Rpb24gcGFyc2VBdHRyaWJ1dGUoKSB7XG5cdGlmICghIHRoaXMubm9kZSkgcmV0dXJuO1xuXG5cdHZhciB2YWx1ZSA9IHRoaXMuZ2V0KCk7XG5cblx0aWYgKHZhbHVlKVxuXHRcdHZhciBiaW5kVG8gPSB2YWx1ZS5tYXRjaChhdHRyUmVnRXhwKTtcblxuXHRpZiAoISBiaW5kVG8pXG5cdFx0dGhyb3cgbmV3IEF0dHJpYnV0ZUVycm9yKCdpbnZhbGlkIGJpbmQgYXR0cmlidXRlICcgKyB2YWx1ZSk7XG5cblx0dGhpcy5jb21wQ2xhc3MgPSBiaW5kVG9bMV0gfHwgJ0NvbXBvbmVudCc7XG5cdHRoaXMuY29tcEZhY2V0cyA9IChiaW5kVG9bMl0gJiYgYmluZFRvWzJdLnNwbGl0KGZhY2V0c1NwbGl0UmVnRXhwKSkgfHwgdW5kZWZpbmVkO1xuXHR0aGlzLmNvbXBOYW1lID0gYmluZFRvWzNdIHx8IHVuZGVmaW5lZDtcblxuXHRyZXR1cm4gdGhpcztcbn1cblxuXG5mdW5jdGlvbiB2YWxpZGF0ZUF0dHJpYnV0ZSgpIHtcblx0dmFyIGNvbXBOYW1lID0gdGhpcy5jb21wTmFtZTtcblx0Y2hlY2soY29tcE5hbWUsIE1hdGNoLldoZXJlKGZ1bmN0aW9uKCkge1xuICBcdFx0cmV0dXJuIHR5cGVvZiBjb21wTmFtZSA9PSAnc3RyaW5nJyAmJiBjb21wTmFtZSAhPSAnJztcblx0fSksICdlbXB0eSBjb21wb25lbnQgbmFtZScpO1xuXG5cdGlmICghIHRoaXMuY29tcENsYXNzKVxuXHRcdHRocm93IG5ldyBBdHRyaWJ1dGVFcnJvcignZW1wdHkgY29tcG9uZW50IGNsYXNzIG5hbWUgJyArIHRoaXMuY29tcENsYXNzKTtcblxuXHRyZXR1cm4gdGhpcztcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIEF0dHJpYnV0ZSA9IHJlcXVpcmUoJy4vaW5kZXgnKVxuXHQsIEF0dHJpYnV0ZUVycm9yID0gcmVxdWlyZSgnLi4vdXRpbC9lcnJvcicpLkF0dHJpYnV0ZVxuXHQsIGNvbmZpZyA9IHJlcXVpcmUoJy4uL2NvbmZpZycpXG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpO1xuXG5cbnZhciBMb2FkQXR0cmlidXRlID0gXy5jcmVhdGVTdWJjbGFzcyhBdHRyaWJ1dGUsICdMb2FkQXR0cmlidXRlJywgdHJ1ZSk7XG5cbl8uZXh0ZW5kUHJvdG8oTG9hZEF0dHJpYnV0ZSwge1xuXHRhdHRyTmFtZTogZ2V0QXR0cmlidXRlTmFtZSxcblx0cGFyc2U6IHBhcnNlQXR0cmlidXRlLFxuXHR2YWxpZGF0ZTogdmFsaWRhdGVBdHRyaWJ1dGVcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IExvYWRBdHRyaWJ1dGU7XG5cblxuZnVuY3Rpb24gZ2V0QXR0cmlidXRlTmFtZSgpIHtcblx0cmV0dXJuIGNvbmZpZy5hdHRycy5sb2FkO1xufVxuXG5cbmZ1bmN0aW9uIHBhcnNlQXR0cmlidXRlKCkge1xuXHRpZiAoISB0aGlzLm5vZGUpIHJldHVybjtcblxuXHR2YXIgdmFsdWUgPSB0aGlzLmdldCgpO1xuXG5cdHRoaXMubG9hZFVybCA9IHZhbHVlO1xuXG5cdHJldHVybiB0aGlzO1xufVxuXG5cbmZ1bmN0aW9uIHZhbGlkYXRlQXR0cmlidXRlKCkge1xuXHQvLyBUT0RPIHVybCB2YWxpZGF0aW9uXG5cblx0cmV0dXJuIHRoaXM7XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpXG5cdCwgY2hlY2sgPSByZXF1aXJlKCcuLi91dGlsL2NoZWNrJylcblx0LCBNYXRjaCA9IGNoZWNrLk1hdGNoXG5cdCwgdG9CZUltcGxlbWVudGVkID0gcmVxdWlyZSgnLi4vdXRpbC9lcnJvcicpLnRvQmVJbXBsZW1lbnRlZDtcblxuXG4vLyBhbiBhYnN0cmFjdCBhdHRyaWJ1dGUgY2xhc3MgZm9yIGF0dHJpYnV0ZSBwYXJzaW5nIGFuZCB2YWxpZGF0aW9uXG5cbm1vZHVsZS5leHBvcnRzID0gQXR0cmlidXRlO1xuXG5mdW5jdGlvbiBBdHRyaWJ1dGUoZWwsIG5hbWUpIHtcblx0dGhpcy5uYW1lID0gbmFtZSB8fCB0aGlzLmF0dHJOYW1lKCk7XG5cdHRoaXMuZWwgPSBlbDtcblx0dGhpcy5ub2RlID0gZWwuYXR0cmlidXRlc1t0aGlzLm5hbWVdO1xufVxuXG5fLmV4dGVuZFByb3RvKEF0dHJpYnV0ZSwge1xuXHRnZXQ6IGdldEF0dHJpYnV0ZVZhbHVlLFxuXHRzZXQ6IHNldEF0dHJpYnV0ZVZhbHVlLFxuXG5cdC8vIHNob3VsZCBiZSBkZWZpbmVkIGluIHN1YmNsYXNzXG5cdGF0dHJOYW1lOiB0b0JlSW1wbGVtZW50ZWQsXG5cdHBhcnNlOiB0b0JlSW1wbGVtZW50ZWQsXG5cdHZhbGlkYXRlOiB0b0JlSW1wbGVtZW50ZWQsXG59KTtcblxuXG5mdW5jdGlvbiBnZXRBdHRyaWJ1dGVWYWx1ZSgpIHtcblx0cmV0dXJuIHRoaXMuZWwuZ2V0QXR0cmlidXRlKHRoaXMubmFtZSk7XG59XG5cbmZ1bmN0aW9uIHNldEF0dHJpYnV0ZVZhbHVlKHZhbHVlKSB7XG5cdHRoaXMuZWwuc2V0QXR0cmlidXRlKHRoaXMubmFtZSwgdmFsdWUpO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgbWlsb01haWwgPSByZXF1aXJlKCcuL21haWwnKVxuXHQsIG1pbG9Db21wb25lbnRzUmVnaXN0cnkgPSByZXF1aXJlKCcuL2NvbXBvbmVudHMvY19yZWdpc3RyeScpXG5cdCwgQ29tcG9uZW50ID0gbWlsb0NvbXBvbmVudHNSZWdpc3RyeS5nZXQoJ0NvbXBvbmVudCcpXG5cdCwgQmluZEF0dHJpYnV0ZSA9IHJlcXVpcmUoJy4vYXR0cmlidXRlL2FfYmluZCcpXG5cdCwgQmluZGVyRXJyb3IgPSByZXF1aXJlKCcuL3V0aWwvZXJyb3InKS5CaW5kZXJcblx0LCBfID0gcmVxdWlyZSgnbW9sLXByb3RvJylcblx0LCBjaGVjayA9IHJlcXVpcmUoJy4vdXRpbC9jaGVjaycpXG5cdCwgTWF0Y2ggPSAgY2hlY2suTWF0Y2g7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBiaW5kZXI7XG5cblxuZnVuY3Rpb24gYmluZGVyKHNjb3BlRWwsIGNvbXBvbmVudHNSZWdpc3RyeSkge1xuXHR2YXIgY29tcG9uZW50c1JlZ2lzdHJ5ID0gY29tcG9uZW50c1JlZ2lzdHJ5IHx8IG1pbG9Db21wb25lbnRzUmVnaXN0cnlcblx0XHQsIHNjb3BlRWwgPSBzY29wZUVsIHx8IGRvY3VtZW50LmJvZHlcblx0XHQsIGNvbXBvbmVudHMgPSB7fTtcblxuXHRiaW5kRWxlbWVudChjb21wb25lbnRzLCBzY29wZUVsKTtcblx0cmV0dXJuIGNvbXBvbmVudHM7XG5cblxuXHRmdW5jdGlvbiBiaW5kRWxlbWVudChjb21wb25lbnRzLCBlbCl7XG5cdFx0dmFyIGF0dHIgPSBuZXcgQmluZEF0dHJpYnV0ZShlbCk7XG5cblx0XHRpZiAoYXR0ci5ub2RlKVxuXHRcdFx0dmFyIGFDb21wb25lbnQgPSBjcmVhdGVDb21wb25lbnQoZWwsIGF0dHIpO1xuXG5cdFx0Ly8gYmluZCBpbm5lciBlbGVtZW50cyB0byBjb21wb25lbnRzXG5cdFx0aWYgKGVsLmNoaWxkcmVuICYmIGVsLmNoaWxkcmVuLmxlbmd0aCkge1xuXHRcdFx0dmFyIGlubmVyQ29tcG9uZW50cyA9IGJpbmRDaGlsZHJlbihlbCk7XG5cblx0XHRcdGlmIChPYmplY3Qua2V5cyhpbm5lckNvbXBvbmVudHMpLmxlbmd0aCkge1xuXHRcdFx0XHQvLyBhdHRhY2ggaW5uZXIgY29tcG9uZW50cyB0byB0aGUgY3VycmVudCBvbmUgKGNyZWF0ZSBhIG5ldyBzY29wZSkgLi4uXG5cdFx0XHRcdGlmICh0eXBlb2YgYUNvbXBvbmVudCAhPSAndW5kZWZpbmVkJyAmJiBhQ29tcG9uZW50LmNvbnRhaW5lcilcblx0XHRcdFx0XHRhQ29tcG9uZW50LmNvbnRhaW5lci5hZGQoaW5uZXJDb21wb25lbnRzKTtcblx0XHRcdFx0ZWxzZSAvLyBvciBrZWVwIHRoZW0gaW4gdGhlIGN1cnJlbnQgc2NvcGVcblx0XHRcdFx0XHRfLmVhY2hLZXkoaW5uZXJDb21wb25lbnRzLCBmdW5jdGlvbihhQ29tcCwgbmFtZSkge1xuXHRcdFx0XHRcdFx0c3RvcmVDb21wb25lbnQoY29tcG9uZW50cywgYUNvbXAsIG5hbWUpO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmIChhQ29tcG9uZW50KVxuXHRcdFx0c3RvcmVDb21wb25lbnQoY29tcG9uZW50cywgYUNvbXBvbmVudCwgYXR0ci5jb21wTmFtZSk7XG5cdH1cblxuXG5cdGZ1bmN0aW9uIGJpbmRDaGlsZHJlbihvd25lckVsKSB7XG5cdFx0dmFyIGNvbXBvbmVudHMgPSB7fTtcblx0XHRBcnJheS5wcm90b3R5cGUuZm9yRWFjaC5jYWxsKG93bmVyRWwuY2hpbGRyZW4sIGZ1bmN0aW9uKGVsKSB7XG5cdFx0XHRiaW5kRWxlbWVudChjb21wb25lbnRzLCBlbClcblx0XHR9KTtcblx0XHRyZXR1cm4gY29tcG9uZW50cztcblx0fVxuXG5cblx0ZnVuY3Rpb24gY3JlYXRlQ29tcG9uZW50KGVsLCBhdHRyKSB7XG5cdFx0Ly8gZWxlbWVudCB3aWxsIGJlIGJvdW5kIHRvIGEgY29tcG9uZW50XG5cdFx0YXR0ci5wYXJzZSgpLnZhbGlkYXRlKCk7XG5cblx0XHQvLyBnZXQgY29tcG9uZW50IGNsYXNzIGZyb20gcmVnaXN0cnkgYW5kIHZhbGlkYXRlXG5cdFx0dmFyIENvbXBvbmVudENsYXNzID0gY29tcG9uZW50c1JlZ2lzdHJ5LmdldChhdHRyLmNvbXBDbGFzcyk7XG5cblx0XHRpZiAoISBDb21wb25lbnRDbGFzcylcblx0XHRcdHRocm93IG5ldyBCaW5kZXJFcnJvcignY2xhc3MgJyArIGF0dHIuY29tcENsYXNzICsgJyBpcyBub3QgcmVnaXN0ZXJlZCcpO1xuXG5cdFx0Y2hlY2soQ29tcG9uZW50Q2xhc3MsIE1hdGNoLlN1YmNsYXNzKENvbXBvbmVudCwgdHJ1ZSkpO1xuXG5cdFx0Ly8gY3JlYXRlIG5ldyBjb21wb25lbnRcblx0XHR2YXIgYUNvbXBvbmVudCA9IG5ldyBDb21wb25lbnRDbGFzcyhlbCwgYXR0ci5jb21wTmFtZSk7XG5cblx0XHQvLyBhZGQgZXh0cmEgZmFjZXRzXG5cdFx0dmFyIGZhY2V0cyA9IGF0dHIuY29tcEZhY2V0cztcblx0XHRpZiAoZmFjZXRzKVxuXHRcdFx0ZmFjZXRzLmZvckVhY2goZnVuY3Rpb24oZmN0KSB7XG5cdFx0XHRcdGFDb21wb25lbnQuYWRkRmFjZXQoZmN0KTtcblx0XHRcdH0pO1xuXG5cdFx0cmV0dXJuIGFDb21wb25lbnQ7XG5cdH1cblxuXG5cdGZ1bmN0aW9uIHN0b3JlQ29tcG9uZW50KGNvbXBvbmVudHMsIGFDb21wb25lbnQsIG5hbWUpIHtcblx0XHRpZiAoY29tcG9uZW50c1tuYW1lXSlcblx0XHRcdHRocm93IG5ldyBCaW5kZXJFcnJvcignZHVwbGljYXRlIGNvbXBvbmVudCBuYW1lOiAnICsgbmFtZSk7XG5cblx0XHRjb21wb25lbnRzW25hbWVdID0gYUNvbXBvbmVudDtcblx0fVxufVxuXG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBjbGFzc2VzID0ge1xuXHRGYWNldDogcmVxdWlyZSgnLi9mYWNldHMvZl9jbGFzcycpLFxuXHRDb21wb25lbnQ6IHJlcXVpcmUoJy4vY29tcG9uZW50cy9jX2NsYXNzJyksXG5cdENvbXBvbmVudEZhY2V0OiByZXF1aXJlKCcuL2NvbXBvbmVudHMvY19mYWNldCcpLFxuXHRDbGFzc1JlZ2lzdHJ5OiByZXF1aXJlKCcuL2Fic3RyYWN0L3JlZ2lzdHJ5JyksXG5cdGZhY2V0c1JlZ2lzdHJ5OiByZXF1aXJlKCcuL2NvbXBvbmVudHMvY19mYWNldHMvY2ZfcmVnaXN0cnknKSxcblx0Y29tcG9uZW50c1JlZ2lzdHJ5OiByZXF1aXJlKCcuL2NvbXBvbmVudHMvY19yZWdpc3RyeScpXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzZXM7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBGYWNldGVkT2JqZWN0ID0gcmVxdWlyZSgnLi4vZmFjZXRzL2Zfb2JqZWN0Jylcblx0LCBmYWNldHNSZWdpc3RyeSA9IHJlcXVpcmUoJy4vY19mYWNldHMvY2ZfcmVnaXN0cnknKVxuXHQsIENvbXBvbmVudEZhY2V0ID0gcmVxdWlyZSgnLi9jX2ZhY2V0Jylcblx0LCBNZXNzZW5nZXIgPSByZXF1aXJlKCcuLi9tZXNzZW5nZXInKVxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vdXRpbC9jaGVjaycpXG5cdCwgTWF0Y2ggPSBjaGVjay5NYXRjaDtcblxudmFyIENvbXBvbmVudCA9IF8uY3JlYXRlU3ViY2xhc3MoRmFjZXRlZE9iamVjdCwgJ0NvbXBvbmVudCcsIHRydWUpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbXBvbmVudDtcblxuXG5Db21wb25lbnQuY3JlYXRlQ29tcG9uZW50Q2xhc3MgPSBmdW5jdGlvbihuYW1lLCBmYWNldHNDb25maWcpIHtcblx0dmFyIGZhY2V0c0NsYXNzZXMgPSB7fTtcblxuXHRpZiAoQXJyYXkuaXNBcnJheShmYWNldHNDb25maWcpKSB7XG5cdFx0dmFyIGNvbmZpZ01hcCA9IHt9O1xuXHRcdGZhY2V0c0NvbmZpZy5mb3JFYWNoKGZ1bmN0aW9uKGZjdCkge1xuXHRcdFx0dmFyIGZjdE5hbWUgPSBfLmZpcnN0TG93ZXJDYXNlKGZjdCk7XG5cdFx0XHRjb25maWdNYXBbZmN0TmFtZV0gPSB7fTtcblx0XHR9KTtcblx0XHRmYWNldHNDb25maWcgPSBjb25maWdNYXA7XG5cdH1cblxuXHRfLmVhY2hLZXkoZmFjZXRzQ29uZmlnLCBmdW5jdGlvbihmY3RDb25maWcsIGZjdCkge1xuXHRcdHZhciBmY3ROYW1lID0gXy5maXJzdExvd2VyQ2FzZShmY3QpO1xuXHRcdHZhciBmY3RDbGFzc05hbWUgPSBfLmZpcnN0VXBwZXJDYXNlKGZjdCk7XG5cdFx0ZmFjZXRzQ2xhc3Nlc1tmY3ROYW1lXSA9IGZhY2V0c1JlZ2lzdHJ5LmdldChmY3RDbGFzc05hbWUpO1xuXHR9KTtcblxuXHR2YXIgQ29tcG9uZW50Q2xhc3MgPSBGYWNldGVkT2JqZWN0LmNyZWF0ZUZhY2V0ZWRDbGFzcy5jYWxsKHRoaXMsIG5hbWUsIGZhY2V0c0NsYXNzZXMsIGZhY2V0c0NvbmZpZyk7XG5cdFxuXHRyZXR1cm4gQ29tcG9uZW50Q2xhc3M7XG59O1xuXG5kZWxldGUgQ29tcG9uZW50LmNyZWF0ZUZhY2V0ZWRDbGFzcztcblxuXG5fLmV4dGVuZFByb3RvKENvbXBvbmVudCwge1xuXHRpbml0OiBpbml0Q29tcG9uZW50LFxuXHRhZGRGYWNldDogYWRkRmFjZXQsXG5cdGFsbEZhY2V0czogZW52b2tlTWV0aG9kT25BbGxGYWNldHNcbn0pO1xuXG5cbmZ1bmN0aW9uIGluaXRDb21wb25lbnQoZWxlbWVudCwgbmFtZSkge1xuXHR0aGlzLmVsID0gZWxlbWVudDtcblx0dGhpcy5uYW1lID0gbmFtZTtcblxuXHR2YXIgbWVzc2VuZ2VyID0gbmV3IE1lc3Nlbmdlcih0aGlzLCBNZXNzZW5nZXIuZGVmYXVsdE1ldGhvZHMsIHVuZGVmaW5lZCAvKiBubyBtZXNzYWdlU291cmNlICovKTtcblxuXHRPYmplY3QuZGVmaW5lUHJvcGVydGllcyh0aGlzLCB7XG5cdFx0X21lc3NlbmdlcjogeyB2YWx1ZTogbWVzc2VuZ2VyIH0sXG5cdH0pO1x0XG5cblx0Ly8gc3RhcnQgYWxsIGZhY2V0c1xuXHR0aGlzLmFsbEZhY2V0cygnY2hlY2snKTtcblx0dGhpcy5hbGxGYWNldHMoJ3N0YXJ0Jyk7XG59XG5cblxuZnVuY3Rpb24gYWRkRmFjZXQoZmFjZXROYW1lT3JDbGFzcywgZmFjZXRPcHRzLCBmYWNldE5hbWUpIHtcblx0Y2hlY2soZmFjZXROYW1lT3JDbGFzcywgTWF0Y2guT25lT2YoU3RyaW5nLCBNYXRjaC5TdWJjbGFzcyhDb21wb25lbnRGYWNldCkpKTtcblx0Y2hlY2soZmFjZXRPcHRzLCBNYXRjaC5PcHRpb25hbChPYmplY3QpKTtcblx0Y2hlY2soZmFjZXROYW1lLCBNYXRjaC5PcHRpb25hbChTdHJpbmcpKTtcblxuXHRpZiAodHlwZW9mIGZhY2V0TmFtZU9yQ2xhc3MgPT0gJ3N0cmluZycpIHtcblx0XHR2YXIgZmFjZXRDbGFzc05hbWUgPSBfLmZpcnN0VXBwZXJDYXNlKGZhY2V0TmFtZU9yQ2xhc3MpO1xuXHRcdHZhciBGYWNldENsYXNzID0gZmFjZXRzUmVnaXN0cnkuZ2V0KGZhY2V0Q2xhc3NOYW1lKTtcblx0fSBlbHNlIFxuXHRcdEZhY2V0Q2xhc3MgPSBmYWNldE5hbWVPckNsYXNzO1xuXG5cdGZhY2V0TmFtZSA9IGZhY2V0TmFtZSB8fCBfLmZpcnN0TG93ZXJDYXNlKEZhY2V0Q2xhc3MubmFtZSk7XG5cblx0dmFyIG5ld0ZhY2V0ID0gRmFjZXRlZE9iamVjdC5wcm90b3R5cGUuYWRkRmFjZXQuY2FsbCh0aGlzLCBGYWNldENsYXNzLCBmYWNldE9wdHMsIGZhY2V0TmFtZSk7XG5cblx0Ly8gc3RhcnQgZmFjZXRcblx0bmV3RmFjZXQuY2hlY2sgJiYgbmV3RmFjZXQuY2hlY2soKTtcblx0bmV3RmFjZXQuc3RhcnQgJiYgbmV3RmFjZXQuc3RhcnQoKTtcbn1cblxuXG5mdW5jdGlvbiBlbnZva2VNZXRob2RPbkFsbEZhY2V0cyhtZXRob2QgLyogLCAuLi4gKi8pIHtcblx0dmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuXG5cdF8uZWFjaEtleSh0aGlzLmZhY2V0cywgZnVuY3Rpb24oZmFjZXQsIGZjdE5hbWUpIHtcblx0XHRpZiAoZmFjZXQgJiYgdHlwZW9mIGZhY2V0W21ldGhvZF0gPT0gJ2Z1bmN0aW9uJylcblx0XHRcdGZhY2V0W21ldGhvZF0uYXBwbHkoZmFjZXQsIGFyZ3MpO1xuXHR9KTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIEZhY2V0ID0gcmVxdWlyZSgnLi4vZmFjZXRzL2ZfY2xhc3MnKVxuXHQsIE1lc3NlbmdlciA9IHJlcXVpcmUoJy4uL21lc3NlbmdlcicpXG5cdCwgRmFjZXRFcnJvciA9IHJlcXVpcmUoJy4uL3V0aWwvZXJyb3InKS5GYWNldFxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKTtcblxudmFyIENvbXBvbmVudEZhY2V0ID0gXy5jcmVhdGVTdWJjbGFzcyhGYWNldCwgJ0NvbXBvbmVudEZhY2V0Jyk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ29tcG9uZW50RmFjZXQ7XG5cblxuXy5leHRlbmRQcm90byhDb21wb25lbnRGYWNldCwge1xuXHRpbml0OiBpbml0Q29tcG9uZW50RmFjZXQsXG5cdGNoZWNrOiBjaGVja0RlcGVuZGVuY2llc1xufSk7XG5cblxuZnVuY3Rpb24gaW5pdENvbXBvbmVudEZhY2V0KCkge1xuXHQvLyB2YXIgbWVzc2VuZ2VyID0gbmV3IE1lc3Nlbmdlcih0aGlzLCBNZXNzZW5nZXIuZGVmYXVsdE1ldGhvZHMsIHVuZGVmaW5lZCAvKiBubyBtZXNzYWdlU291cmNlICovKTtcblxuXHQvLyBPYmplY3QuZGVmaW5lUHJvcGVydGllcyh0aGlzLCB7XG5cdC8vIFx0X2ZhY2V0TWVzc2VuZ2VyOiB7IHZhbHVlOiBtZXNzZW5nZXIgfSxcblx0Ly8gfSk7XG59XG5cblxuZnVuY3Rpb24gY2hlY2tEZXBlbmRlbmNpZXMoKSB7XG5cdGlmICh0aGlzLnJlcXVpcmUpIHtcblx0XHR0aGlzLnJlcXVpcmUuZm9yRWFjaChmdW5jdGlvbihyZXFGYWNldCkge1xuXHRcdFx0dmFyIGZhY2V0TmFtZSA9IF8uZmlyc3RMb3dlckNhc2UocmVxRmFjZXQpO1xuXHRcdFx0aWYgKCEgKHRoaXMub3duZXJbZmFjZXROYW1lXSBpbnN0YW5jZW9mIENvbXBvbmVudEZhY2V0KSlcblx0XHRcdFx0dGhyb3cgbmV3IEZhY2V0RXJyb3IoJ2ZhY2V0ICcgKyB0aGlzLmNvbnN0cnVjdG9yLm5hbWUgKyAnIHJlcXVpcmVzIGZhY2V0ICcgKyByZXFGYWNldCk7XG5cdFx0fSwgdGhpcyk7XG5cdH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIENvbXBvbmVudEZhY2V0ID0gcmVxdWlyZSgnLi4vY19mYWNldCcpXG5cdCwgYmluZGVyID0gcmVxdWlyZSgnLi4vLi4vYmluZGVyJylcblx0LCBfID0gcmVxdWlyZSgnbW9sLXByb3RvJylcblx0LCBmYWNldHNSZWdpc3RyeSA9IHJlcXVpcmUoJy4vY2ZfcmVnaXN0cnknKTtcblxuLy8gY29udGFpbmVyIGZhY2V0XG52YXIgQ29udGFpbmVyID0gXy5jcmVhdGVTdWJjbGFzcyhDb21wb25lbnRGYWNldCwgJ0NvbnRhaW5lcicpO1xuXG5fLmV4dGVuZFByb3RvKENvbnRhaW5lciwge1xuXHRpbml0OiBpbml0Q29udGFpbmVyLFxuXHRfYmluZDogX2JpbmRDb21wb25lbnRzLFxuXHRhZGQ6IGFkZENoaWxkQ29tcG9uZW50c1xufSk7XG5cbmZhY2V0c1JlZ2lzdHJ5LmFkZChDb250YWluZXIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbnRhaW5lcjtcblxuXG5mdW5jdGlvbiBpbml0Q29udGFpbmVyKCkge1xuXHRDb21wb25lbnRGYWNldC5wcm90b3R5cGUuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXHR0aGlzLmNoaWxkcmVuID0ge307XG59XG5cblxuZnVuY3Rpb24gX2JpbmRDb21wb25lbnRzKCkge1xuXHQvLyBUT0RPXG5cdC8vIHRoaXMgZnVuY3Rpb24gc2hvdWxkIHJlLWJpbmQgcmF0aGVyIHRoYW4gYmluZCBhbGwgaW50ZXJuYWwgZWxlbWVudHNcblx0dGhpcy5jaGlsZHJlbiA9IGJpbmRlcih0aGlzLm93bmVyLmVsKTtcbn1cblxuXG5mdW5jdGlvbiBhZGRDaGlsZENvbXBvbmVudHMoY2hpbGRDb21wb25lbnRzKSB7XG5cdC8vIFRPRE9cblx0Ly8gdGhpcyBmdW5jdGlvbiBzaG91bGQgaW50ZWxsaWdlbnRseSByZS1iaW5kIGV4aXN0aW5nIGNvbXBvbmVudHMgdG9cblx0Ly8gbmV3IGVsZW1lbnRzIChpZiB0aGV5IGNoYW5nZWQpIGFuZCByZS1iaW5kIHByZXZpb3VzbHkgYm91bmQgZXZlbnRzIHRvIHRoZSBzYW1lXG5cdC8vIGV2ZW50IGhhbmRsZXJzXG5cdC8vIG9yIG1heWJlIG5vdCwgaWYgdGhpcyBmdW5jdGlvbiBpcyBvbmx5IHVzZWQgYnkgYmluZGVyIHRvIGFkZCBuZXcgZWxlbWVudHMuLi5cblx0Xy5leHRlbmQodGhpcy5jaGlsZHJlbiwgY2hpbGRDb21wb25lbnRzKTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIENvbXBvbmVudEZhY2V0ID0gcmVxdWlyZSgnLi4vY19mYWNldCcpXG5cdCwgZmFjZXRzUmVnaXN0cnkgPSByZXF1aXJlKCcuL2NmX3JlZ2lzdHJ5JylcblxuXHQsIE1lc3NlbmdlciA9IHJlcXVpcmUoJy4uLy4uL21lc3NlbmdlcicpXG5cdCwgQ29tcG9uZW50RGF0YVNvdXJjZSA9IHJlcXVpcmUoJy4uL2NfbWVzc2FnZV9zb3VyY2VzL2NvbXBvbmVudF9kYXRhX3NvdXJjZScpXG5cblx0LCBfID0gcmVxdWlyZSgnbW9sLXByb3RvJyk7XG5cblxuLy8gZGF0YSBtb2RlbCBjb25uZWN0aW9uIGZhY2V0XG52YXIgRGF0YSA9IF8uY3JlYXRlU3ViY2xhc3MoQ29tcG9uZW50RmFjZXQsICdEYXRhJyk7XG5cbl8uZXh0ZW5kUHJvdG8oRGF0YSwge1xuXHRpbml0OiBpbml0RGF0YUZhY2V0LFxuXG5cdC8vIF9yZWF0dGFjaDogX3JlYXR0YWNoRXZlbnRzT25FbGVtZW50Q2hhbmdlXG59KTtcblxuZmFjZXRzUmVnaXN0cnkuYWRkKERhdGEpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IERhdGE7XG5cblxuZnVuY3Rpb24gaW5pdERhdGFGYWNldCgpIHtcblx0Q29tcG9uZW50RmFjZXQucHJvdG90eXBlLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuXHR2YXIgcHJveHlDb21wRGF0YVNvdXJjZU1ldGhvZHMgPSB7XG5cdFx0dmFsdWU6ICd2YWx1ZScsXG5cdFx0dHJpZ2dlcjogJ3RyaWdnZXInXG5cdH07XG5cblx0Ly8gaW5zdGVhZCBvZiB0aGlzLm93bmVyIHNob3VsZCBwYXNzIG1vZGVsPyBXaGVyZSBpdCBpcyBzZXQ/XG5cdHZhciBjb21wRGF0YVNvdXJjZSA9IG5ldyBDb21wb25lbnREYXRhU291cmNlKHRoaXMsIHByb3h5Q29tcERhdGFTb3VyY2VNZXRob2RzLCB0aGlzLm93bmVyKTtcblxuXHR2YXIgcHJveHlNZXNzZW5nZXJNZXRob2RzID0ge1xuXHRcdG9uOiAnb25NZXNzYWdlJyxcblx0XHRvZmY6ICdvZmZNZXNzYWdlJyxcblx0XHRvbk1lc3NhZ2VzOiAnb25NZXNzYWdlcycsXG5cdFx0b2ZmTWVzc2FnZXM6ICdvZmZNZXNzYWdlcycsXG5cdFx0Z2V0U3Vic2NyaWJlcnM6ICdnZXRTdWJzY3JpYmVycydcblx0fTtcblxuXHR2YXIgZGF0YU1lc3NlbmdlciA9IG5ldyBNZXNzZW5nZXIodGhpcywgcHJveHlNZXNzZW5nZXJNZXRob2RzLCBjb21wRGF0YVNvdXJjZSk7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnRpZXModGhpcywge1xuXHRcdF9kYXRhTWVzc2VuZ2VyOiB7IHZhbHVlOiBkYXRhTWVzc2VuZ2VyIH0sXG5cdFx0X2NvbXBEYXRhU291cmNlOiB7IHZhbHVlOiBjb21wRGF0YVNvdXJjZSB9XG5cdH0pO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ29tcG9uZW50RmFjZXQgPSByZXF1aXJlKCcuLi9jX2ZhY2V0Jylcblx0LCBmYWNldHNSZWdpc3RyeSA9IHJlcXVpcmUoJy4vY2ZfcmVnaXN0cnknKVx0XG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpXG5cdCwgY2hlY2sgPSByZXF1aXJlKCcuLi8uLi91dGlsL2NoZWNrJylcblx0LCBNYXRjaCA9IGNoZWNrLk1hdGNoXG5cdCwgYmluZGVyID0gcmVxdWlyZSgnLi4vLi4vYmluZGVyJyk7XG5cblxuLy8gZGF0YSBtb2RlbCBjb25uZWN0aW9uIGZhY2V0XG52YXIgRG9tID0gXy5jcmVhdGVTdWJjbGFzcyhDb21wb25lbnRGYWNldCwgJ0RvbScpO1xuXG5fLmV4dGVuZFByb3RvKERvbSwge1xuXHRpbml0OiBpbml0RG9tRmFjZXQsXG5cdHN0YXJ0OiBzdGFydERvbUZhY2V0LFxuXG5cdHNob3c6IHNob3dFbGVtZW50LFxuXHRoaWRlOiBoaWRlRWxlbWVudCxcblx0cmVtb3ZlOiByZW1vdmVFbGVtZW50LFxuXHRhcHBlbmQ6IGFwcGVuZEluc2lkZUVsZW1lbnQsXG5cdHByZXBlbmQ6IHByZXBlbmRJbnNpZGVFbGVtZW50LFxuXG5cdC8vIF9yZWF0dGFjaDogX3JlYXR0YWNoRXZlbnRzT25FbGVtZW50Q2hhbmdlXG59KTtcblxuZmFjZXRzUmVnaXN0cnkuYWRkKERvbSk7XG5cbm1vZHVsZS5leHBvcnRzID0gRG9tO1xuXG5cbmZ1bmN0aW9uIGluaXREb21GYWNldCgpIHtcblx0Q29tcG9uZW50RmFjZXQucHJvdG90eXBlLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn1cblxuZnVuY3Rpb24gc3RhcnREb21GYWNldCgpIHtcblx0aWYgKHRoaXMuY29uZmlnLmNscylcblx0XHR0aGlzLm93bmVyLmVsLmNsYXNzTGlzdC5hZGQodGhpcy5jb25maWcuY2xzKTtcbn1cblxuZnVuY3Rpb24gc2hvd0VsZW1lbnQoKSB7XG5cdHRoaXMub3duZXIuZWwuc3R5bGUuZGlzcGxheSA9ICdibG9jayc7XG59XG5cbmZ1bmN0aW9uIGhpZGVFbGVtZW50KCkge1xuXHR0aGlzLm93bmVyLmVsLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG59XG5cbmZ1bmN0aW9uIHJlbW92ZUVsZW1lbnQoKSB7XG5cdHZhciB0aGlzRWwgPSB0aGlzLm93bmVyLmVsO1xuXHR0aGlzRWwucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0aGlzRWwpO1xufVxuXG5mdW5jdGlvbiBhcHBlbmRJbnNpZGVFbGVtZW50KGVsKSB7XG5cdHRoaXMub3duZXIuZWwuYXBwZW5kQ2hpbGQoZWwpXG59XG5cbmZ1bmN0aW9uIHByZXBlbmRJbnNpZGVFbGVtZW50KGVsKSB7XG5cdHZhciB0aGlzRWwgPSB0aGlzLm93bmVyLmVsXG5cdFx0LCBmaXJzdENoaWxkID0gdGhpc0VsLmZpcnN0Q2hpbGQ7XG5cdGlmIChmaXJzdENoaWxkKVxuXHRcdHRoaXNFbC5pbnNlcnRCZWZvcmUoZWwsIGZpcnN0Q2hpbGQpO1xuXHRlbHNlXG5cdFx0dGhpc0VsLmFwcGVuZENoaWxkKGVsKTtcbn1cblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ29tcG9uZW50RmFjZXQgPSByZXF1aXJlKCcuLi9jX2ZhY2V0Jylcblx0LCBmYWNldHNSZWdpc3RyeSA9IHJlcXVpcmUoJy4vY2ZfcmVnaXN0cnknKVxuXG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpO1xuXG5cbi8vIGRhdGEgbW9kZWwgY29ubmVjdGlvbiBmYWNldFxudmFyIERyYWcgPSBfLmNyZWF0ZVN1YmNsYXNzKENvbXBvbmVudEZhY2V0LCAnRHJhZycpO1xuXG5fLmV4dGVuZFByb3RvKERyYWcsIHtcblx0aW5pdDogaW5pdERyYWdGYWNldCxcblx0c3RhcnQ6IHN0YXJ0RHJhZ0ZhY2V0LFxuXHRyZXF1aXJlOiBbJ0V2ZW50cyddIC8vIFRPRE8gaW1wbGVtZW50IGZhY2V0IGRlcGVuZGVuY2llc1xuXG5cdC8vIF9yZWF0dGFjaDogX3JlYXR0YWNoRXZlbnRzT25FbGVtZW50Q2hhbmdlXG59KTtcblxuZmFjZXRzUmVnaXN0cnkuYWRkKERyYWcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IERyYWc7XG5cblxuZnVuY3Rpb24gaW5pdERyYWdGYWNldCgpIHtcblx0Q29tcG9uZW50RmFjZXQucHJvdG90eXBlLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn1cblxuZnVuY3Rpb24gc3RhcnREcmFnRmFjZXQoKSB7XG5cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIENvbXBvbmVudEZhY2V0ID0gcmVxdWlyZSgnLi4vY19mYWNldCcpXG5cdCwgZmFjZXRzUmVnaXN0cnkgPSByZXF1aXJlKCcuL2NmX3JlZ2lzdHJ5JylcblxuXHQsIE1lc3NlbmdlciA9IHJlcXVpcmUoJy4uLy4uL21lc3NlbmdlcicpXG5cdCwgRE9NRXZlbnRzU291cmNlID0gcmVxdWlyZSgnLi4vY19tZXNzYWdlX3NvdXJjZXMvZG9tX2V2ZW50c19zb3VyY2UnKVxuXG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpO1xuXG5cbi8vIGV2ZW50cyBmYWNldFxudmFyIEV2ZW50cyA9IF8uY3JlYXRlU3ViY2xhc3MoQ29tcG9uZW50RmFjZXQsICdFdmVudHMnKTtcblxuXy5leHRlbmRQcm90byhFdmVudHMsIHtcblx0aW5pdDogaW5pdEV2ZW50c0ZhY2V0LFxuXG5cdC8vIF9yZWF0dGFjaDogX3JlYXR0YWNoRXZlbnRzT25FbGVtZW50Q2hhbmdlXG59KTtcblxuZmFjZXRzUmVnaXN0cnkuYWRkKEV2ZW50cyk7XG5cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRzO1xuXG5cbmZ1bmN0aW9uIGluaXRFdmVudHNGYWNldCgpIHtcblx0Q29tcG9uZW50RmFjZXQucHJvdG90eXBlLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuXHR2YXIgZG9tRXZlbnRzU291cmNlID0gbmV3IERPTUV2ZW50c1NvdXJjZSh0aGlzLCB7IHRyaWdnZXI6ICd0cmlnZ2VyJyB9LCB0aGlzLm93bmVyKTtcblxuXHR2YXIgcHJveHlNZXNzZW5nZXJNZXRob2RzID0ge1xuXHRcdG9uOiAnb25NZXNzYWdlJyxcblx0XHRvZmY6ICdvZmZNZXNzYWdlJyxcblx0XHRvbkV2ZW50czogJ29uTWVzc2FnZXMnLFxuXHRcdG9mZkV2ZW50czogJ29mZk1lc3NhZ2VzJyxcblx0XHRnZXRMaXN0ZW5lcnM6ICdnZXRTdWJzY3JpYmVycydcblx0fTtcblxuXHR2YXIgbWVzc2VuZ2VyID0gbmV3IE1lc3Nlbmdlcih0aGlzLCBwcm94eU1lc3Nlbmdlck1ldGhvZHMsIGRvbUV2ZW50c1NvdXJjZSk7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnRpZXModGhpcywge1xuXHRcdF9ldmVudHNNZXNzZW5nZXI6IHsgdmFsdWU6IG1lc3NlbmdlciB9LFxuXHRcdF9kb21FdmVudHNTb3VyY2U6IHsgdmFsdWU6IGRvbUV2ZW50c1NvdXJjZSB9XG5cdH0pO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ29tcG9uZW50RmFjZXQgPSByZXF1aXJlKCcuLi9jX2ZhY2V0Jylcblx0LCBmYWNldHNSZWdpc3RyeSA9IHJlcXVpcmUoJy4vY2ZfcmVnaXN0cnknKVxuXG5cdCwgTWVzc2VuZ2VyID0gcmVxdWlyZSgnLi4vLi4vbWVzc2VuZ2VyJylcblx0LCBpRnJhbWVNZXNzYWdlU291cmNlID0gcmVxdWlyZSgnLi4vY19tZXNzYWdlX3NvdXJjZXMvaWZyYW1lX21lc3NhZ2Vfc291cmNlJylcblxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKTtcblxuXG4vLyBkYXRhIG1vZGVsIGNvbm5lY3Rpb24gZmFjZXRcbnZhciBGcmFtZSA9IF8uY3JlYXRlU3ViY2xhc3MoQ29tcG9uZW50RmFjZXQsICdGcmFtZScpO1xuXG5fLmV4dGVuZFByb3RvKEZyYW1lLCB7XG5cdGluaXQ6IGluaXRGcmFtZUZhY2V0XG5cblx0Ly8gX3JlYXR0YWNoOiBfcmVhdHRhY2hFdmVudHNPbkVsZW1lbnRDaGFuZ2Vcbn0pO1xuXG5cbmZhY2V0c1JlZ2lzdHJ5LmFkZChGcmFtZSk7XG5cbm1vZHVsZS5leHBvcnRzID0gRnJhbWU7XG5cblxuZnVuY3Rpb24gaW5pdEZyYW1lRmFjZXQoKSB7XG5cdENvbXBvbmVudEZhY2V0LnByb3RvdHlwZS5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cdFxuXHR2YXIgaUZyYW1lTWVzc2FnZVNvdXJjZVByb3h5ID0ge1xuXHRcdHBvc3Q6ICdwb3N0J1xuXHR9O1xuXHR2YXIgbWVzc2FnZVNvdXJjZSA9IG5ldyBpRnJhbWVNZXNzYWdlU291cmNlKHRoaXMsIGlGcmFtZU1lc3NhZ2VTb3VyY2VQcm94eSk7XG5cblx0dmFyIHByb3h5TWVzc2VuZ2VyTWV0aG9kcyA9IHtcblx0XHRvbjogJ29uTWVzc2FnZScsXG5cdFx0b2ZmOiAnb2ZmTWVzc2FnZScsXG5cdFx0b25NZXNzYWdlczogJ29uTWVzc2FnZXMnLFxuXHRcdG9mZk1lc3NhZ2VzOiAnb2ZmTWVzc2FnZXMnLFxuXHRcdGdldFN1YnNjcmliZXJzOiAnZ2V0U3Vic2NyaWJlcnMnXG5cdH07XG5cblx0dmFyIGlGcmFtZU1lc3NlbmdlciA9IG5ldyBNZXNzZW5nZXIodGhpcywgcHJveHlNZXNzZW5nZXJNZXRob2RzLCBtZXNzYWdlU291cmNlKTtcblxuXHRPYmplY3QuZGVmaW5lUHJvcGVydGllcyh0aGlzLCB7XG5cdFx0X2lGcmFtZU1lc3NlbmdlcjogeyB2YWx1ZTogaUZyYW1lTWVzc2VuZ2VyIH0sXG5cdFx0X21lc3NhZ2VTb3VyY2U6IHsgdmFsdWU6IG1lc3NhZ2VTb3VyY2UgfVxuXHR9KTtcbn0iLCIndXNlIHN0cmljdCc7XG5cbnZhciBDb21wb25lbnRGYWNldCA9IHJlcXVpcmUoJy4uL2NfZmFjZXQnKVxuXHQsIGZhY2V0c1JlZ2lzdHJ5ID0gcmVxdWlyZSgnLi9jZl9yZWdpc3RyeScpXHRcblx0LCBfID0gcmVxdWlyZSgnbW9sLXByb3RvJylcblx0LCBjaGVjayA9IHJlcXVpcmUoJy4uLy4uL3V0aWwvY2hlY2snKVxuXHQsIE1hdGNoID0gY2hlY2suTWF0Y2hcblx0LCBiaW5kZXIgPSByZXF1aXJlKCcuLi8uLi9iaW5kZXInKTtcblxuXG4vLyBkYXRhIG1vZGVsIGNvbm5lY3Rpb24gZmFjZXRcbnZhciBUZW1wbGF0ZSA9IF8uY3JlYXRlU3ViY2xhc3MoQ29tcG9uZW50RmFjZXQsICdUZW1wbGF0ZScpO1xuXG5fLmV4dGVuZFByb3RvKFRlbXBsYXRlLCB7XG5cdGluaXQ6IGluaXRUZW1wbGF0ZUZhY2V0LFxuXHRzZXQ6IHNldFRlbXBsYXRlLFxuXHRyZW5kZXI6IHJlbmRlclRlbXBsYXRlLFxuXHRiaW5kZXI6IGJpbmRJbm5lckNvbXBvbmVudHNcblxuXHQvLyBfcmVhdHRhY2g6IF9yZWF0dGFjaEV2ZW50c09uRWxlbWVudENoYW5nZVxufSk7XG5cbmZhY2V0c1JlZ2lzdHJ5LmFkZChUZW1wbGF0ZSk7XG5cbm1vZHVsZS5leHBvcnRzID0gVGVtcGxhdGU7XG5cblxuZnVuY3Rpb24gaW5pdFRlbXBsYXRlRmFjZXQoKSB7XG5cdENvbXBvbmVudEZhY2V0LnByb3RvdHlwZS5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cblx0dGhpcy5fdGVtcGxhdGVTdHIgPSB0aGlzLmNvbmZpZy50ZW1wbGF0ZTtcbn1cblxuXG5mdW5jdGlvbiBzZXRUZW1wbGF0ZSh0ZW1wbGF0ZVN0ciwgY29tcGlsZSkge1xuXHRjaGVjayh0ZW1wbGF0ZVN0ciwgU3RyaW5nKTtcblx0Y2hlY2soY29tcGlsZSwgTWF0Y2guT3B0aW9uYWwoRnVuY3Rpb24pKTtcblxuXHR0aGlzLl90ZW1wbGF0ZVN0ciA9IHRlbXBsYXRlU3RyO1xuXHRpZiAoY29tcGlsZSlcblx0XHR0aGlzLl9jb21waWxlID0gY29tcGlsZVxuXG5cdGNvbXBpbGUgPSBjb21waWxlIHx8IHRoaXMuX2NvbXBpbGU7IC8vIHx8IG1pbG8uY29uZmlnLnRlbXBsYXRlLmNvbXBpbGU7XG5cblx0aWYgKGNvbXBpbGUpXG5cdFx0dGhpcy5fdGVtcGxhdGUgPSBjb21waWxlKHRlbXBsYXRlU3RyKTtcblxuXHRyZXR1cm4gdGhpcztcbn1cblxuXG5mdW5jdGlvbiByZW5kZXJUZW1wbGF0ZShkYXRhKSB7IC8vIHdlIG5lZWQgZGF0YSBvbmx5IGlmIHVzZSB0ZW1wbGF0aW5nIGVuZ2luZVxuXHR0aGlzLm93bmVyLmVsLmlubmVySFRNTCA9IHRoaXMuX3RlbXBsYXRlXG5cdFx0XHRcdFx0XHRcdFx0PyB0aGlzLl90ZW1wbGF0ZShkYXRhKVxuXHRcdFx0XHRcdFx0XHRcdDogdGhpcy5fdGVtcGxhdGVTdHI7XG5cblx0cmV0dXJuIHRoaXM7XG59XG5cblxuZnVuY3Rpb24gYmluZElubmVyQ29tcG9uZW50cyhyZWdpc3RyeSkge1xuXHR2YXIgdGhpc0NvbXBvbmVudCA9IGJpbmRlcih0aGlzLm93bmVyLmVsLCByZWdpc3RyeSk7XG5cblx0aWYgKHRoaXMub3duZXIuY29udGFpbmVyKSAvLyBUT0RPIHNob3VsZCBiZSBjaGFuZ2VkIHRvIHJlY29uY2lsbGF0aW9uIG9mIGV4aXN0aW5nIGNoaWxkcmVuIHdpdGggbmV3XG5cdFx0dGhpcy5vd25lci5jb250YWluZXIuY2hpbGRyZW4gPSB0aGlzQ29tcG9uZW50W3RoaXMub3duZXIubmFtZV0uY29udGFpbmVyLmNoaWxkcmVuO1xuXG5cdHJldHVybiB0aGlzQ29tcG9uZW50O1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ2xhc3NSZWdpc3RyeSA9IHJlcXVpcmUoJy4uLy4uL2Fic3RyYWN0L3JlZ2lzdHJ5Jylcblx0LCBDb21wb25lbnRGYWNldCA9IHJlcXVpcmUoJy4uL2NfZmFjZXQnKTtcblxudmFyIGZhY2V0c1JlZ2lzdHJ5ID0gbmV3IENsYXNzUmVnaXN0cnkoQ29tcG9uZW50RmFjZXQpO1xuXG5mYWNldHNSZWdpc3RyeS5hZGQoQ29tcG9uZW50RmFjZXQpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZhY2V0c1JlZ2lzdHJ5O1xuXG4vLyBUT0RPIC0gcmVmYWN0b3IgY29tcG9uZW50cyByZWdpc3RyeSB0ZXN0IGludG8gYSBmdW5jdGlvblxuLy8gdGhhdCB0ZXN0cyBhIHJlZ2lzdHJ5IHdpdGggYSBnaXZlbiBmb3VuZGF0aW9uIGNsYXNzXG4vLyBNYWtlIHRlc3QgZm9yIHRoaXMgcmVnaXN0cnkgYmFzZWQgb24gdGhpcyBmdW5jdGlvbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIERPTUV2ZW50c1NvdXJjZSA9IHJlcXVpcmUoJy4vZG9tX2V2ZW50c19zb3VyY2UnKVxuXHQsIENvbXBvbmVudCA9IHJlcXVpcmUoJy4uL2NfY2xhc3MnKVxuXHQsIENvbXBvbmVudERhdGFTb3VyY2VFcnJvciA9IHJlcXVpcmUoJy4uLy4uL3V0aWwvZXJyb3InKS5Db21wb25lbnREYXRhU291cmNlXG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpXG5cdCwgY2hlY2sgPSByZXF1aXJlKCcuLi8uLi91dGlsL2NoZWNrJylcblx0LCBNYXRjaCA9IGNoZWNrLk1hdGNoO1xuXG5cbi8vIGNsYXNzIHRvIGhhbmRsZSBzdWJzY3JpYnRpb25zIHRvIGNoYW5nZXMgaW4gRE9NIGZvciBVSSAobWF5YmUgYWxzbyBjb250ZW50IGVkaXRhYmxlKSBlbGVtZW50c1xudmFyIENvbXBvbmVudERhdGFTb3VyY2UgPSBfLmNyZWF0ZVN1YmNsYXNzKERPTUV2ZW50c1NvdXJjZSwgJ0NvbXBvbmVudERhdGFTb3VyY2UnLCB0cnVlKTtcblxuXG5fLmV4dGVuZFByb3RvKENvbXBvbmVudERhdGFTb3VyY2UsIHtcblx0Ly8gaW1wbGVtZW50aW5nIE1lc3NhZ2VTb3VyY2UgaW50ZXJmYWNlXG5cdGluaXQ6IGluaXRDb21wb25lbnREYXRhU291cmNlLFxuXHR0cmFuc2xhdGVUb1NvdXJjZU1lc3NhZ2U6IHRyYW5zbGF0ZVRvRG9tRXZlbnQsXG4gXHRhZGRTb3VyY2VMaXN0ZW5lcjogYWRkRG9tRXZlbnRMaXN0ZW5lcixcbiBcdHJlbW92ZVNvdXJjZUxpc3RlbmVyOiByZW1vdmVEb21FdmVudExpc3RlbmVyLFxuIFx0ZmlsdGVyU291cmNlTWVzc2FnZTogZmlsdGVyRGF0YU1lc3NhZ2UsXG5cbiBcdC8vIGNsYXNzIHNwZWNpZmljIG1ldGhvZHNcbiBcdC8vIGRvbTogaW1wbGVtZW50ZWQgaW4gRE9NRXZlbnRzU291cmNlXG4gXHR2YWx1ZTogZ2V0RG9tRWxlbWVudERhdGFWYWx1ZSxcbiBcdGhhbmRsZUV2ZW50OiBoYW5kbGVFdmVudCwgIC8vIGV2ZW50IGRpc3BhdGNoZXIgLSBhcyBkZWZpbmVkIGJ5IEV2ZW50IERPTSBBUElcbiBcdHRyaWdnZXI6IHRyaWdnZXJEYXRhTWVzc2FnZSAvLyByZWRlZmluZXMgbWV0aG9kIG9mIHN1cGVyY2xhc3MgRE9NRXZlbnRzU291cmNlXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb25lbnREYXRhU291cmNlO1xuXG5cbmZ1bmN0aW9uIGluaXRDb21wb25lbnREYXRhU291cmNlKCkge1xuXHRET01FdmVudHNTb3VyY2UucHJvdG90eXBlLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuXHR0aGlzLnZhbHVlKCk7IC8vIHN0b3JlcyBjdXJyZW50IGNvbXBvbmVudCBkYXRhIHZhbHVlIGluIHRoaXMuX3ZhbHVlXG59XG5cblxuLy8gVE9ETzogc2hvdWxkIHJldHVybiB2YWx1ZSBkZXBlbmRlbnQgb24gZWxlbWVudCB0YWdcbmZ1bmN0aW9uIGdldERvbUVsZW1lbnREYXRhVmFsdWUoKSB7IC8vIHZhbHVlIG1ldGhvZFxuXHR2YXIgbmV3VmFsdWUgPSB0aGlzLmNvbXBvbmVudC5lbC52YWx1ZTtcblxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ192YWx1ZScsIHtcblx0XHRjb25maWd1cmFibGU6IHRydWUsXG5cdFx0dmFsdWU6IG5ld1ZhbHVlXG5cdH0pO1xuXG5cdHJldHVybiBuZXdWYWx1ZTtcbn1cblxuXG4vLyBUT0RPOiB0aGlzIGZ1bmN0aW9uIHNob3VsZCByZXR1cm4gcmVsZXZhbnQgRE9NIGV2ZW50IGRlcGVuZGVudCBvbiBlbGVtZW50IHRhZ1xuLy8gQ2FuIGFsc28gaW1wbGVtZW50IGJlZm9yZWRhdGFjaGFuZ2VkIGV2ZW50IHRvIGFsbG93IHByZXZlbnRpbmcgdGhlIGNoYW5nZVxuZnVuY3Rpb24gdHJhbnNsYXRlVG9Eb21FdmVudChtZXNzYWdlKSB7XG5cdGlmIChtZXNzYWdlID09ICdkYXRhY2hhbmdlZCcpXG5cdFx0cmV0dXJuICdpbnB1dCc7XG5cdGVsc2Vcblx0XHR0aHJvdyBuZXcgQ29tcG9uZW50RGF0YVNvdXJjZUVycm9yKCd1bmtub3duIGNvbXBvbmVudCBkYXRhIGV2ZW50Jyk7XG59XG5cblxuZnVuY3Rpb24gYWRkRG9tRXZlbnRMaXN0ZW5lcihldmVudFR5cGUpIHtcblx0dGhpcy5kb20oKS5hZGRFdmVudExpc3RlbmVyKGV2ZW50VHlwZSwgdGhpcywgZmFsc2UpOyAvLyBubyBjYXB0dXJpbmdcbn1cblxuXG5mdW5jdGlvbiByZW1vdmVEb21FdmVudExpc3RlbmVyKGV2ZW50VHlwZSkge1xuXHR0aGlzLmRvbSgpLnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlLCB0aGlzLCBmYWxzZSk7IC8vIG5vIGNhcHR1cmluZ1xufVxuXG5cbmZ1bmN0aW9uIGZpbHRlckRhdGFNZXNzYWdlKGV2ZW50VHlwZSwgbWVzc2FnZSwgZGF0YSkge1xuXHRyZXR1cm4gZGF0YS5uZXdWYWx1ZSAhPSBkYXRhLm9sZFZhbHVlO1xufTtcblxuXG4gLy8gZXZlbnQgZGlzcGF0Y2hlciAtIGFzIGRlZmluZWQgYnkgRXZlbnQgRE9NIEFQSVxuZnVuY3Rpb24gaGFuZGxlRXZlbnQoZXZlbnQpIHtcblx0dmFyIG9sZFZhbHVlID0gdGhpcy5fdmFsdWU7XG5cblx0dGhpcy5kaXNwYXRjaE1lc3NhZ2UoZXZlbnQudHlwZSwge1xuXHRcdG9sZFZhbHVlOiBvbGRWYWx1ZSxcblx0XHRuZXdWYWx1ZTogdGhpcy52YWx1ZSgpXG5cdH0pO1xufVxuXG5cbmZ1bmN0aW9uIHRyaWdnZXJEYXRhTWVzc2FnZShtZXNzYWdlLCBkYXRhKSB7XG5cdC8vIFRPRE8gLSBvcHBvc2l0ZSB0cmFuc2xhdGlvbiArIGV2ZW50IHRyaWdnZXIgXG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgnbW9sLXByb3RvJyk7XG5cblxuLy8gaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvUmVmZXJlbmNlL0V2ZW50c1xuXG52YXIgZXZlbnRUeXBlcyA9IHtcblx0Q2xpcGJvYXJkRXZlbnQ6IFsnY29weScsICdjdXQnLCAncGFzdGUnLCAnYmVmb3JlY29weScsICdiZWZvcmVjdXQnLCAnYmVmb3JlcGFzdGUnXSxcblx0RXZlbnQ6IFsnaW5wdXQnLCAncmVhZHlzdGF0ZWNoYW5nZSddLFxuXHRGb2N1c0V2ZW50OiBbJ2ZvY3VzJywgJ2JsdXInLCAnZm9jdXNpbicsICdmb2N1c291dCddLFxuXHRLZXlib2FyZEV2ZW50OiBbJ2tleWRvd24nLCAna2V5cHJlc3MnLCAgJ2tleXVwJ10sXG5cdE1vdXNlRXZlbnQ6IFsnY2xpY2snLCAnY29udGV4dG1lbnUnLCAnZGJsY2xpY2snLCAnbW91c2Vkb3duJywgJ21vdXNldXAnLFxuXHRcdFx0XHQgJ21vdXNlZW50ZXInLCAnbW91c2VsZWF2ZScsICdtb3VzZW1vdmUnLCAnbW91c2VvdXQnLCAnbW91c2VvdmVyJyxcblx0XHRcdFx0ICdzaG93JyAvKiBjb250ZXh0IG1lbnUgKi9dLFxuXHRUb3VjaEV2ZW50OiBbJ3RvdWNoc3RhcnQnLCAndG91Y2hlbmQnLCAndG91Y2htb3ZlJywgJ3RvdWNoZW50ZXInLCAndG91Y2hsZWF2ZScsICd0b3VjaGNhbmNlbCddLFxufTtcblxuXG4vLyBtb2NrIHdpbmRvdyBhbmQgZXZlbnQgY29uc3RydWN0b3JzIGZvciB0ZXN0aW5nXG5pZiAodHlwZW9mIHdpbmRvdyAhPSAndW5kZWZpbmVkJylcblx0dmFyIGdsb2JhbCA9IHdpbmRvdztcbmVsc2Uge1xuXHRnbG9iYWwgPSB7fTtcblx0Xy5lYWNoS2V5KGV2ZW50VHlwZXMsIGZ1bmN0aW9uKGVUeXBlcywgZXZlbnRDb25zdHJ1Y3Rvck5hbWUpIHtcblx0XHR2YXIgZXZlbnRzQ29uc3RydWN0b3I7XG5cdFx0ZXZhbChcblx0XHRcdCdldmVudHNDb25zdHJ1Y3RvciA9IGZ1bmN0aW9uICcgKyBldmVudENvbnN0cnVjdG9yTmFtZSArICcodHlwZSwgcHJvcGVydGllcykgeyBcXFxuXHRcdFx0XHR0aGlzLnR5cGUgPSB0eXBlOyBcXFxuXHRcdFx0XHRfLmV4dGVuZCh0aGlzLCBwcm9wZXJ0aWVzKTsgXFxcblx0XHRcdH07J1xuXHRcdCk7XG5cdFx0Z2xvYmFsW2V2ZW50Q29uc3RydWN0b3JOYW1lXSA9IGV2ZW50c0NvbnN0cnVjdG9yO1xuXHR9KTtcbn1cblxuXG52YXIgZG9tRXZlbnRzQ29uc3RydWN0b3JzID0ge307XG5cbl8uZWFjaEtleShldmVudFR5cGVzLCBmdW5jdGlvbihlVHlwZXMsIGV2ZW50Q29uc3RydWN0b3JOYW1lKSB7XG5cdGVUeXBlcy5mb3JFYWNoKGZ1bmN0aW9uKHR5cGUpIHtcblx0XHRpZiAoT2JqZWN0Lmhhc093blByb3BlcnR5KGRvbUV2ZW50c0NvbnN0cnVjdG9ycywgdHlwZSkpXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ2R1cGxpY2F0ZSBldmVudCB0eXBlICcgKyB0eXBlKTtcblxuXHRcdGRvbUV2ZW50c0NvbnN0cnVjdG9yc1t0eXBlXSA9IGdsb2JhbFtldmVudENvbnN0cnVjdG9yTmFtZV07XG5cdH0pO1xufSk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBkb21FdmVudHNDb25zdHJ1Y3RvcnM7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBNZXNzYWdlU291cmNlID0gcmVxdWlyZSgnLi4vLi4vbWVzc2VuZ2VyL21lc3NhZ2Vfc291cmNlJylcblx0LCBDb21wb25lbnQgPSByZXF1aXJlKCcuLi9jX2NsYXNzJylcblx0LCBkb21FdmVudHNDb25zdHJ1Y3RvcnMgPSByZXF1aXJlKCcuL2RvbV9ldmVudHNfY29uc3RydWN0b3JzJykgLy8gVE9ETyBtZXJnZSB3aXRoIERPTUV2ZW50U291cmNlID8/XG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpXG5cdCwgY2hlY2sgPSByZXF1aXJlKCcuLi8uLi91dGlsL2NoZWNrJylcblx0LCBNYXRjaCA9IGNoZWNrLk1hdGNoO1xuXG52YXIgRE9NRXZlbnRzU291cmNlID0gXy5jcmVhdGVTdWJjbGFzcyhNZXNzYWdlU291cmNlLCAnRE9NTWVzc2FnZVNvdXJjZScsIHRydWUpO1xuXG5cbl8uZXh0ZW5kUHJvdG8oRE9NRXZlbnRzU291cmNlLCB7XG5cdC8vIGltcGxlbWVudGluZyBNZXNzYWdlU291cmNlIGludGVyZmFjZVxuXHRpbml0OiBpbml0RG9tRXZlbnRzU291cmNlLFxuXHR0cmFuc2xhdGVUb1NvdXJjZU1lc3NhZ2U6IHRyYW5zbGF0ZVRvRG9tRXZlbnQsXG4gXHRhZGRTb3VyY2VMaXN0ZW5lcjogYWRkRG9tRXZlbnRMaXN0ZW5lcixcbiBcdHJlbW92ZVNvdXJjZUxpc3RlbmVyOiByZW1vdmVEb21FdmVudExpc3RlbmVyLFxuIFx0ZmlsdGVyU291cmNlTWVzc2FnZTogZmlsdGVyQ2FwdHVyZWREb21FdmVudCxcblxuIFx0Ly8gY2xhc3Mgc3BlY2lmaWMgbWV0aG9kc1xuIFx0ZG9tOiBnZXREb21FbGVtZW50LFxuIFx0aGFuZGxlRXZlbnQ6IGhhbmRsZUV2ZW50LCAgLy8gZXZlbnQgZGlzcGF0Y2hlciAtIGFzIGRlZmluZWQgYnkgRXZlbnQgRE9NIEFQSVxuIFx0dHJpZ2dlcjogdHJpZ2dlckRvbUV2ZW50XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBET01FdmVudHNTb3VyY2U7XG5cblxudmFyIHVzZUNhcHR1cmVQYXR0ZXJuID0gL19fY2FwdHVyZSQvO1xuXG5cbmZ1bmN0aW9uIGluaXREb21FdmVudHNTb3VyY2UoaG9zdE9iamVjdCwgcHJveHlNZXRob2RzLCBjb21wb25lbnQpIHtcblx0Y2hlY2soY29tcG9uZW50LCBDb21wb25lbnQpO1xuXHRNZXNzYWdlU291cmNlLnByb3RvdHlwZS5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cblx0dGhpcy5jb21wb25lbnQgPSBjb21wb25lbnQ7XG5cblx0Ly8gdGhpcy5tZXNzZW5nZXIgaXMgc2V0IGJ5IE1lc3NlbmdlciBjbGFzc1xufVxuXG5cbmZ1bmN0aW9uIGdldERvbUVsZW1lbnQoKSB7XG5cdHJldHVybiB0aGlzLmNvbXBvbmVudC5lbDtcbn1cblxuXG5mdW5jdGlvbiB0cmFuc2xhdGVUb0RvbUV2ZW50KG1lc3NhZ2UpIHtcblx0aWYgKHVzZUNhcHR1cmVQYXR0ZXJuLnRlc3QobWVzc2FnZSkpXG5cdFx0bWVzc2FnZSA9IG1lc3NhZ2UucmVwbGFjZSh1c2VDYXB0dXJlUGF0dGVybiwgJycpO1xuXHRyZXR1cm4gbWVzc2FnZTtcbn1cblxuXG5mdW5jdGlvbiBhZGREb21FdmVudExpc3RlbmVyKGV2ZW50VHlwZSkge1xuXHR0aGlzLmRvbSgpLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlLCB0aGlzLCB0cnVlKTtcbn1cblxuXG5mdW5jdGlvbiByZW1vdmVEb21FdmVudExpc3RlbmVyKGV2ZW50VHlwZSkge1xuXHR0aGlzLmRvbSgpLnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlLCB0aGlzLCB0cnVlKTtcbn1cblxuXG5mdW5jdGlvbiBmaWx0ZXJDYXB0dXJlZERvbUV2ZW50KGV2ZW50VHlwZSwgbWVzc2FnZSwgZXZlbnQpIHtcblx0dmFyIGlzQ2FwdHVyZVBoYXNlO1xuXHRpZiAodHlwZW9mIHdpbmRvdyAhPSAndW5kZWZpbmVkJylcblx0XHRpc0NhcHR1cmVQaGFzZSA9IGV2ZW50LmV2ZW50UGhhc2UgPT0gd2luZG93LkV2ZW50LkNBUFRVUklOR19QSEFTRTtcblxuXHRyZXR1cm4gKCEgaXNDYXB0dXJlUGhhc2UgfHwgKGlzQ2FwdHVyZVBoYXNlICYmIHVzZUNhcHR1cmVQYXR0ZXJuLnRlc3QobWVzc2FnZSkpKTtcbn1cblxuXG4vLyBldmVudCBkaXNwYXRjaGVyIC0gYXMgZGVmaW5lZCBieSBFdmVudCBET00gQVBJXG5mdW5jdGlvbiBoYW5kbGVFdmVudChldmVudCkge1xuXHR0aGlzLmRpc3BhdGNoTWVzc2FnZShldmVudC50eXBlLCBldmVudCk7XG59XG5cblxuLy8gVE9ETyBtYWtlIHdvcmsgd2l0aCBtZXNzYWdlcyAod2l0aCBfY2FwdHVyZSlcbmZ1bmN0aW9uIHRyaWdnZXJEb21FdmVudChldmVudFR5cGUsIHByb3BlcnRpZXMpIHtcblx0Y2hlY2soZXZlbnRUeXBlLCBTdHJpbmcpO1xuXHRjaGVjayhwcm9wZXJ0aWVzLCBNYXRjaC5PcHRpb25hbChPYmplY3QpKTtcblxuXHR2YXIgRXZlbnRDb25zdHJ1Y3RvciA9IGRvbUV2ZW50c0NvbnN0cnVjdG9yc1tldmVudFR5cGVdO1xuXG5cdGlmICh0eXBlb2YgZXZlbnRDb25zdHJ1Y3RvciAhPSAnZnVuY3Rpb24nKVxuXHRcdHRocm93IG5ldyBFcnJvcigndW5zdXBwb3J0ZWQgZXZlbnQgdHlwZScpO1xuXG5cdC8vIGNoZWNrIGlmIGl0IGlzIGNvcnJlY3Rcblx0aWYgKHR5cGVvZiBwcm9wZXJ0aWVzICE9ICd1bmRlZmluZWQnKVxuXHRcdHByb3BlcnRpZXMudHlwZSA9IGV2ZW50VHlwZTtcblxuXHR2YXIgZG9tRXZlbnQgPSBFdmVudENvbnN0cnVjdG9yKGV2ZW50VHlwZSwgcHJvcGVydGllcyk7XG5cblx0dmFyIG5vdENhbmNlbGxlZCA9IHRoaXMuZG9tKCkuZGlzcGF0Y2hFdmVudChkb21FdmVudCk7XG5cblx0cmV0dXJuIG5vdENhbmNlbGxlZDtcbn0iLCIndXNlIHN0cmljdCc7XG5cbnZhciBNZXNzYWdlU291cmNlID0gcmVxdWlyZSgnLi4vLi4vbWVzc2VuZ2VyL21lc3NhZ2Vfc291cmNlJylcblx0LCBfID0gcmVxdWlyZSgnbW9sLXByb3RvJylcblx0LCBjaGVjayA9IHJlcXVpcmUoJy4uLy4uL3V0aWwvY2hlY2snKVxuXHQsIE1hdGNoID0gY2hlY2suTWF0Y2g7XG5cbnZhciBpRnJhbWVNZXNzYWdlU291cmNlID0gXy5jcmVhdGVTdWJjbGFzcyhNZXNzYWdlU291cmNlLCAnaUZyYW1lTWVzc2FnZVNvdXJjZScsIHRydWUpO1xuXG5cbl8uZXh0ZW5kUHJvdG8oaUZyYW1lTWVzc2FnZVNvdXJjZSwge1xuXHQvLyBpbXBsZW1lbnRpbmcgTWVzc2FnZVNvdXJjZSBpbnRlcmZhY2Vcblx0aW5pdDogaW5pdElGcmFtZU1lc3NhZ2VTb3VyY2UsXG5cdHRyYW5zbGF0ZVRvU291cmNlTWVzc2FnZTogdHJhbnNsYXRlVG9JRnJhbWVNZXNzYWdlLFxuIFx0YWRkU291cmNlTGlzdGVuZXI6IGFkZElGcmFtZU1lc3NhZ2VMaXN0ZW5lcixcbiBcdHJlbW92ZVNvdXJjZUxpc3RlbmVyOiByZW1vdmVJRnJhbWVNZXNzYWdlTGlzdGVuZXIsXG4gXHRmaWx0ZXJTb3VyY2VNZXNzYWdlOiBmaWx0ZXJSZWNpZXZlZElGcmFtZU1lc3NhZ2UsXG5cbiBcdC8vY2xhc3Mgc3BlY2lmaWMgbWV0aG9kc1xuIFx0cG9zdDogcG9zdFRvT3RoZXJXaW5kb3csXG4gXHRoYW5kbGVFdmVudDogaGFuZGxlRXZlbnQgIC8vIGV2ZW50IGRpc3BhdGNoZXIgLSBhcyBkZWZpbmVkIGJ5IEV2ZW50IERPTSBBUElcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGlGcmFtZU1lc3NhZ2VTb3VyY2U7XG5cblxuZnVuY3Rpb24gaW5pdElGcmFtZU1lc3NhZ2VTb3VyY2UoaG9zdE9iamVjdCwgcHJveHlNZXRob2RzKSB7XG5cdGNoZWNrKGhvc3RPYmplY3QsIE9iamVjdCk7XG5cdE1lc3NhZ2VTb3VyY2UucHJvdG90eXBlLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuXHRpZiAoaG9zdE9iamVjdC5vd25lci5lbC5ub2RlTmFtZSA9PSAnSUZSQU1FJylcblx0XHR0aGlzLl9wb3N0VG8gPSBob3N0T2JqZWN0Lm93bmVyLmVsLmNvbnRlbnRXaW5kb3c7XG5cdGVsc2Vcblx0XHR0aGlzLl9wb3N0VG8gPSB3aW5kb3cucGFyZW50O1xuXG5cdHRoaXMuX2xpc3RlblRvID0gd2luZG93O1xufVxuXG5cbmZ1bmN0aW9uIHRyYW5zbGF0ZVRvSUZyYW1lTWVzc2FnZShtZXNzYWdlKSB7XG5cdHJldHVybiAnbWVzc2FnZSc7IC8vIHNvdXJjZU1lc3NhZ2Vcbn1cblxuXG5mdW5jdGlvbiBhZGRJRnJhbWVNZXNzYWdlTGlzdGVuZXIoZXZlbnRUeXBlKSB7XG5cdHRoaXMuX2xpc3RlblRvLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlLCB0aGlzLCBmYWxzZSk7XG59XG5cblxuZnVuY3Rpb24gcmVtb3ZlSUZyYW1lTWVzc2FnZUxpc3RlbmVyKGV2ZW50VHlwZSkge1xuXHR0aGlzLl9saXN0ZW5Uby5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50VHlwZSwgdGhpcywgZmFsc2UpO1xufVxuXG5cbmZ1bmN0aW9uIGZpbHRlclJlY2lldmVkSUZyYW1lTWVzc2FnZShldmVudFR5cGUsIG1lc3NhZ2UsIGV2ZW50KSB7XG5cdHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBwb3N0VG9PdGhlcldpbmRvdyhldmVudFR5cGUsIG1lc3NhZ2UpIHtcblx0bWVzc2FnZS50eXBlID0gZXZlbnRUeXBlO1xuXHR0aGlzLl9wb3N0VG8ucG9zdE1lc3NhZ2UobWVzc2FnZSwgJyonKTtcbn1cblxuZnVuY3Rpb24gaGFuZGxlRXZlbnQoZXZlbnQpIHtcblx0dGhpcy5kaXNwYXRjaE1lc3NhZ2UoZXZlbnQudHlwZSwgZXZlbnQpO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ2xhc3NSZWdpc3RyeSA9IHJlcXVpcmUoJy4uL2Fic3RyYWN0L3JlZ2lzdHJ5Jylcblx0LCBDb21wb25lbnQgPSByZXF1aXJlKCcuL2NfY2xhc3MnKTtcblxudmFyIGNvbXBvbmVudHNSZWdpc3RyeSA9IG5ldyBDbGFzc1JlZ2lzdHJ5KENvbXBvbmVudCk7XG5cbmNvbXBvbmVudHNSZWdpc3RyeS5hZGQoQ29tcG9uZW50KTtcblxubW9kdWxlLmV4cG9ydHMgPSBjb21wb25lbnRzUmVnaXN0cnk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBDb21wb25lbnQgPSByZXF1aXJlKCcuLi9jX2NsYXNzJylcblx0LCBjb21wb25lbnRzUmVnaXN0cnkgPSByZXF1aXJlKCcuLi9jX3JlZ2lzdHJ5Jyk7XG5cblxudmFyIFZpZXcgPSBDb21wb25lbnQuY3JlYXRlQ29tcG9uZW50Q2xhc3MoJ1ZpZXcnLCBbJ2NvbnRhaW5lciddKTtcblxuY29tcG9uZW50c1JlZ2lzdHJ5LmFkZChWaWV3KTtcblxubW9kdWxlLmV4cG9ydHMgPSBWaWV3O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gY29uZmlnO1xuXG5mdW5jdGlvbiBjb25maWcob3B0aW9ucykge1xuXHRfLmRlZXBFeHRlbmQoY29uZmlnLCBvcHRpb25zKTtcbn1cblxuY29uZmlnKHtcblx0YXR0cnM6IHtcblx0XHRiaW5kOiAnbWwtYmluZCcsXG5cdFx0bG9hZDogJ21sLWxvYWQnXG5cdH1cbn0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEZhY2V0O1xuXG5mdW5jdGlvbiBGYWNldChvd25lciwgY29uZmlnKSB7XG5cdHRoaXMub3duZXIgPSBvd25lcjtcblx0dGhpcy5jb25maWcgPSBjb25maWcgfHwge307XG5cdHRoaXMuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufVxuXG5fLmV4dGVuZFByb3RvKEZhY2V0LCB7XG5cdGluaXQ6IGZ1bmN0aW9uKCkge31cbn0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgRmFjZXQgPSByZXF1aXJlKCcuL2ZfY2xhc3MnKVxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vdXRpbC9jaGVjaycpXG5cdCwgTWF0Y2ggPSBjaGVjay5NYXRjaDtcblxubW9kdWxlLmV4cG9ydHMgPSBGYWNldGVkT2JqZWN0O1xuXG4vLyBhYnN0cmFjdCBjbGFzcyBmb3IgZmFjZXRlZCBvYmplY3RcbmZ1bmN0aW9uIEZhY2V0ZWRPYmplY3QoKSB7XG5cdC8vIFRPRE8gaW5zdGFudGlhdGUgZmFjZXRzIGlmIGNvbmZpZ3VyYXRpb24gaXNuJ3QgcGFzc2VkXG5cdC8vIHdyaXRlIGEgdGVzdCB0byBjaGVjayBpdFxuXHR2YXIgZmFjZXRzQ29uZmlnID0gXy5jbG9uZSh0aGlzLmZhY2V0c0NvbmZpZyB8fCB7fSk7XG5cblx0dmFyIHRoaXNDbGFzcyA9IHRoaXMuY29uc3RydWN0b3Jcblx0XHQsIGZhY2V0c0Rlc2NyaXB0b3JzID0ge31cblx0XHQsIGZhY2V0cyA9IHt9O1xuXG5cdGlmICh0aGlzLmNvbnN0cnVjdG9yID09IEZhY2V0ZWRPYmplY3QpXHRcdFxuXHRcdHRocm93IG5ldyBFcnJvcignRmFjZXRlZE9iamVjdCBpcyBhbiBhYnN0cmFjdCBjbGFzcywgY2FuXFwndCBiZSBpbnN0YW50aWF0ZWQnKTtcblxuXHRpZiAodGhpcy5mYWNldHMpXG5cdFx0Xy5lYWNoS2V5KHRoaXMuZmFjZXRzLCBpbnN0YW50aWF0ZUZhY2V0LCB0aGlzLCB0cnVlKTtcblxuXHR2YXIgdW51c2VkRmFjZXRzTmFtZXMgPSBPYmplY3Qua2V5cyhmYWNldHNDb25maWcpO1xuXHRpZiAodW51c2VkRmFjZXRzTmFtZXMubGVuZ3RoKVxuXHRcdHRocm93IG5ldyBFcnJvcignQ29uZmlndXJhdGlvbiBmb3IgdW5rbm93biBmYWNldChzKSBwYXNzZWQ6ICcgKyB1bnVzZWRGYWNldHNOYW1lcy5qb2luKCcsICcpKTtcblxuXHRPYmplY3QuZGVmaW5lUHJvcGVydGllcyh0aGlzLCBmYWNldHNEZXNjcmlwdG9ycyk7XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnZmFjZXRzJywgeyB2YWx1ZTogZmFjZXRzIH0pO1x0XG5cblx0Ly8gY2FsbGluZyBpbml0IGlmIGl0IGlzIGRlZmluZWQgaW4gdGhlIGNsYXNzXG5cdGlmICh0aGlzLmluaXQpXG5cdFx0dGhpcy5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cblx0ZnVuY3Rpb24gaW5zdGFudGlhdGVGYWNldChGYWNldENsYXNzLCBmY3QpIHtcblx0XHR2YXIgZmFjZXRPcHRzID0gZmFjZXRzQ29uZmlnW2ZjdF07XG5cdFx0ZGVsZXRlIGZhY2V0c0NvbmZpZ1tmY3RdO1xuXG5cdFx0ZmFjZXRzW2ZjdF0gPSBuZXcgRmFjZXRDbGFzcyh0aGlzLCBmYWNldE9wdHMpO1xuXG5cdFx0ZmFjZXRzRGVzY3JpcHRvcnNbZmN0XSA9IHtcblx0XHRcdGVudW1lcmFibGU6IGZhbHNlLFxuXHRcdFx0dmFsdWU6IGZhY2V0c1tmY3RdXG5cdFx0fTtcblx0fVxufVxuXG5cbl8uZXh0ZW5kUHJvdG8oRmFjZXRlZE9iamVjdCwge1xuXHRhZGRGYWNldDogYWRkRmFjZXRcbn0pO1xuXG5cbmZ1bmN0aW9uIGFkZEZhY2V0KEZhY2V0Q2xhc3MsIGZhY2V0T3B0cywgZmFjZXROYW1lKSB7XG5cdGNoZWNrKEZhY2V0Q2xhc3MsIEZ1bmN0aW9uKTtcblx0Y2hlY2soZmFjZXROYW1lLCBNYXRjaC5PcHRpb25hbChTdHJpbmcpKTtcblxuXHRmYWNldE5hbWUgPSBfLmZpcnN0TG93ZXJDYXNlKGZhY2V0TmFtZSB8fCBGYWNldENsYXNzLm5hbWUpO1xuXG5cdHZhciBwcm90b0ZhY2V0cyA9IHRoaXMuY29uc3RydWN0b3IucHJvdG90eXBlLmZhY2V0cztcblxuXHRpZiAocHJvdG9GYWNldHMgJiYgcHJvdG9GYWNldHNbZmFjZXROYW1lXSlcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ2ZhY2V0ICcgKyBmYWNldE5hbWUgKyAnIGlzIGFscmVhZHkgcGFydCBvZiB0aGUgY2xhc3MgJyArIHRoaXMuY29uc3RydWN0b3IubmFtZSk7XG5cblx0aWYgKHRoaXNbZmFjZXROYW1lXSlcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ2ZhY2V0ICcgKyBmYWNldE5hbWUgKyAnIGlzIGFscmVhZHkgcHJlc2VudCBpbiBvYmplY3QnKTtcblxuXHR2YXIgbmV3RmFjZXQgPSB0aGlzLmZhY2V0c1tmYWNldE5hbWVdID0gbmV3IEZhY2V0Q2xhc3ModGhpcywgZmFjZXRPcHRzKTtcblxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgZmFjZXROYW1lLCB7XG5cdFx0ZW51bWVyYWJsZTogZmFsc2UsXG5cdFx0dmFsdWU6IG5ld0ZhY2V0XG5cdH0pO1xuXG5cdHJldHVybiBuZXdGYWNldDtcbn1cblxuXG4vLyBmYWN0b3J5IHRoYXQgY3JlYXRlcyBjbGFzc2VzIChjb25zdHJ1Y3RvcnMpIGZyb20gdGhlIG1hcCBvZiBmYWNldHNcbi8vIHRoZXNlIGNsYXNzZXMgaW5oZXJpdCBmcm9tIEZhY2V0ZWRPYmplY3RcbkZhY2V0ZWRPYmplY3QuY3JlYXRlRmFjZXRlZENsYXNzID0gZnVuY3Rpb24gKG5hbWUsIGZhY2V0c0NsYXNzZXMsIGZhY2V0c0NvbmZpZykge1xuXHRjaGVjayhuYW1lLCBTdHJpbmcpO1xuXHRjaGVjayhmYWNldHNDbGFzc2VzLCBNYXRjaC5PYmplY3RIYXNoKEZ1bmN0aW9uIC8qIE1hdGNoLlN1YmNsYXNzKEZhY2V0LCB0cnVlKSBUT0RPIC0gZml4ICovKSk7XG5cblx0dmFyIEZhY2V0ZWRDbGFzcyA9IF8uY3JlYXRlU3ViY2xhc3ModGhpcywgbmFtZSwgdHJ1ZSk7XG5cblx0Xy5leHRlbmRQcm90byhGYWNldGVkQ2xhc3MsIHtcblx0XHRmYWNldHM6IGZhY2V0c0NsYXNzZXMsXG5cdFx0ZmFjZXRzQ29uZmlnOiBmYWNldHNDb25maWdcblx0fSk7XG5cdHJldHVybiBGYWNldGVkQ2xhc3M7XG59O1xuXG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBtaWxvTWFpbCA9IHJlcXVpcmUoJy4vbWFpbCcpXG5cdCwgcmVxdWVzdCA9IHJlcXVpcmUoJy4vdXRpbC9yZXF1ZXN0Jylcblx0LCBsb2dnZXIgPSByZXF1aXJlKCcuL3V0aWwvbG9nZ2VyJylcblx0LCBjb25maWcgPSByZXF1aXJlKCcuL2NvbmZpZycpXG5cdCwgTG9hZEF0dHJpYnV0ZSA9IHJlcXVpcmUoJy4vYXR0cmlidXRlL2FfbG9hZCcpXG5cdCwgTG9hZGVyRXJyb3IgPSByZXF1aXJlKCcuL3V0aWwvZXJyb3InKS5Mb2FkZXI7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBsb2FkZXI7XG5cblxuZnVuY3Rpb24gbG9hZGVyKHJvb3RFbCwgY2FsbGJhY2spIHtcdFxuXHRtaWxvTWFpbC5vbk1lc3NhZ2UoJ2RvbXJlYWR5JywgZnVuY3Rpb24oKSB7XG5cdFx0aWYgKHR5cGVvZiByb290RWwgPT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0Y2FsbGJhY2sgPSByb290RWw7XG5cdFx0XHRyb290RWwgPSB1bmRlZmluZWQ7XG5cdFx0fVxuXG5cdFx0cm9vdEVsID0gcm9vdEVsIHx8IGRvY3VtZW50LmJvZHk7XG5cblx0XHRtaWxvTWFpbC5wb3N0TWVzc2FnZSgnbG9hZGVyJywgeyBzdGF0ZTogJ3N0YXJ0ZWQnIH0pO1xuXHRcdF9sb2FkZXIocm9vdEVsLCBmdW5jdGlvbih2aWV3cykge1xuXHRcdFx0bWlsb01haWwucG9zdE1lc3NhZ2UoJ2xvYWRlcicsIHsgXG5cdFx0XHRcdHN0YXRlOiAnZmluaXNoZWQnLFxuXHRcdFx0XHR2aWV3czogdmlld3Ncblx0XHRcdH0pO1xuXHRcdFx0Y2FsbGJhY2sodmlld3MpO1xuXHRcdH0pO1xuXHR9KTtcbn1cblxuXG5mdW5jdGlvbiBfbG9hZGVyKHJvb3RFbCwgY2FsbGJhY2spIHtcblx0dmFyIGxvYWRFbGVtZW50cyA9IHJvb3RFbC5xdWVyeVNlbGVjdG9yQWxsKCdbJyArIGNvbmZpZy5hdHRycy5sb2FkICsgJ10nKTtcblxuXHR2YXIgdmlld3MgPSB7fVxuXHRcdCwgdG90YWxDb3VudCA9IGxvYWRFbGVtZW50cy5sZW5ndGhcblx0XHQsIGxvYWRlZENvdW50ID0gMDtcblxuXHRBcnJheS5wcm90b3R5cGUuZm9yRWFjaC5jYWxsKGxvYWRFbGVtZW50cywgZnVuY3Rpb24gKGVsKSB7XG5cdFx0bG9hZFZpZXcoZWwsIGZ1bmN0aW9uKGVycikge1xuXHRcdFx0dmlld3NbZWwuaWRdID0gZXJyIHx8IGVsO1xuXHRcdFx0bG9hZGVkQ291bnQrKztcblx0XHRcdGlmIChsb2FkZWRDb3VudCA9PSB0b3RhbENvdW50KVxuXHRcdFx0XHRjYWxsYmFjayh2aWV3cyk7XG5cdFx0fSk7XG5cdH0pO1xufTtcblxuXG5mdW5jdGlvbiBsb2FkVmlldyhlbCwgY2FsbGJhY2spIHtcblx0aWYgKGVsLmNoaWxkcmVuLmxlbmd0aClcblx0XHR0aHJvdyBuZXcgTG9hZGVyRXJyb3IoJ2NhblxcJ3QgbG9hZCBodG1sIGludG8gZWxlbWVudCB0aGF0IGlzIG5vdCBlbXB0eScpO1xuXG5cdHZhciBhdHRyID0gbmV3IExvYWRBdHRyaWJ1dGUoZWwpO1xuXG5cdGF0dHIucGFyc2UoKS52YWxpZGF0ZSgpO1xuXG5cdHJlcXVlc3QuZ2V0KGF0dHIubG9hZFVybCwgZnVuY3Rpb24oZXJyLCBodG1sKSB7XG5cdFx0aWYgKGVycikge1xuXHRcdFx0ZXJyLm1lc3NhZ2UgPSBlcnIubWVzc2FnZSB8fCAnY2FuXFwndCBsb2FkIGZpbGUgJyArIGF0dHIubG9hZFVybDtcblx0XHRcdC8vIGxvZ2dlci5lcnJvcihlcnIubWVzc2FnZSk7XG5cdFx0XHRjYWxsYmFjayhlcnIpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGVsLmlubmVySFRNTCA9IGh0bWw7XG5cdFx0Y2FsbGJhY2sobnVsbCk7XG5cdH0pO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgTWVzc2VuZ2VyID0gcmVxdWlyZSgnLi4vbWVzc2VuZ2VyJylcblx0LCBNYWlsTWVzc2FnZVNvdXJjZSA9IHJlcXVpcmUoJy4vbWFpbF9zb3VyY2UnKTtcblxuXG52YXIgbWFpbE1zZ1NvdXJjZSA9IG5ldyBNYWlsTWVzc2FnZVNvdXJjZSgpO1xuXG52YXIgbWlsb01haWwgPSBuZXcgTWVzc2VuZ2VyKHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBtYWlsTXNnU291cmNlKTtcblxubW9kdWxlLmV4cG9ydHMgPSBtaWxvTWFpbDtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIE1lc3NhZ2VTb3VyY2UgPSByZXF1aXJlKCcuLi9tZXNzZW5nZXIvbWVzc2FnZV9zb3VyY2UnKVxuXHQsIGRvbUV2ZW50c0NvbnN0cnVjdG9ycyA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudHMvY19tZXNzYWdlX3NvdXJjZXMvZG9tX2V2ZW50c19jb25zdHJ1Y3RvcnMnKVxuXHQsIE1haWxNZXNzYWdlU291cmNlRXJyb3IgPSByZXF1aXJlKCcuLi91dGlsL2Vycm9yJykuTWFpbE1lc3NhZ2VTb3VyY2Vcblx0LCBfID0gcmVxdWlyZSgnbW9sLXByb3RvJylcblx0LCBjaGVjayA9IHJlcXVpcmUoJy4uL3V0aWwvY2hlY2snKVxuXHQsIE1hdGNoID0gY2hlY2suTWF0Y2g7XG5cblxudmFyIE1haWxNZXNzYWdlU291cmNlID0gXy5jcmVhdGVTdWJjbGFzcyhNZXNzYWdlU291cmNlLCAnTWFpbE1lc3NhZ2VTb3VyY2UnLCB0cnVlKTtcblxuXG5fLmV4dGVuZFByb3RvKE1haWxNZXNzYWdlU291cmNlLCB7XG5cdC8vIGltcGxlbWVudGluZyBNZXNzYWdlU291cmNlIGludGVyZmFjZVxuXHQvLyBpbml0OiBkZWZpbmVkIGluIE1lc3NhZ2VTb3VyY2Vcblx0dHJhbnNsYXRlVG9Tb3VyY2VNZXNzYWdlOiB0cmFuc2xhdGVUb0RvbUV2ZW50LFxuIFx0YWRkU291cmNlTGlzdGVuZXI6IGFkZERvbUV2ZW50TGlzdGVuZXIsXG4gXHRyZW1vdmVTb3VyY2VMaXN0ZW5lcjogcmVtb3ZlRG9tRXZlbnRMaXN0ZW5lcixcbiBcdGZpbHRlclNvdXJjZU1lc3NhZ2U6IGZpbHRlckRvbUV2ZW50LFxuXG4gXHQvLyBjbGFzcyBzcGVjaWZpYyBtZXRob2RzXG4gXHRoYW5kbGVFdmVudDogaGFuZGxlRXZlbnQsICAvLyBldmVudCBkaXNwYXRjaGVyIC0gYXMgZGVmaW5lZCBieSBFdmVudCBET00gQVBJXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBNYWlsTWVzc2FnZVNvdXJjZTtcblxuXG4vLyBUT0RPOiB0aGlzIGZ1bmN0aW9uIHNob3VsZCByZXR1cm4gcmVsZXZhbnQgRE9NIGV2ZW50IGRlcGVuZGVudCBvbiBlbGVtZW50IHRhZ1xuLy8gQ2FuIGFsc28gaW1wbGVtZW50IGJlZm9yZWRhdGFjaGFuZ2VkIGV2ZW50IHRvIGFsbG93IHByZXZlbnRpbmcgdGhlIGNoYW5nZVxuZnVuY3Rpb24gdHJhbnNsYXRlVG9Eb21FdmVudChtZXNzYWdlKSB7XG5cdGlmIChtZXNzYWdlID09ICdkb21yZWFkeScpXG5cdFx0cmV0dXJuICdyZWFkeXN0YXRlY2hhbmdlJztcbn1cblxuXG5mdW5jdGlvbiBhZGREb21FdmVudExpc3RlbmVyKGV2ZW50VHlwZSkge1xuXHRpZiAodHlwZW9mIGRvY3VtZW50ID09ICdvYmplY3QnKSB7XG5cdFx0aWYgKGV2ZW50VHlwZSA9PSAncmVhZHlzdGF0ZWNoYW5nZScpIHtcblx0XHRcdGlmIChkb2N1bWVudC5yZWFkeVN0YXRlID09ICdsb2FkaW5nJylcblx0XHRcdFx0ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudFR5cGUsIHRoaXMsIGZhbHNlKTsgLy8gbm8gY2FwdHVyaW5nXG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0dmFyIGRvbUV2ZW50ID0gRXZlbnRDb25zdHJ1Y3RvcihldmVudFR5cGUsIHsgdGFyZ2V0OiBkb2N1bWVudCB9KTtcblx0XHRcdFx0dGhpcy5kaXNwYXRjaE1lc3NhZ2UoZXZlbnRUeXBlLCBldmVudCk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59XG5cblxuZnVuY3Rpb24gcmVtb3ZlRG9tRXZlbnRMaXN0ZW5lcihldmVudFR5cGUpIHtcblx0aWYgKHR5cGVvZiBkb2N1bWVudCA9PSAnb2JqZWN0Jylcblx0XHRkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50VHlwZSwgdGhpcywgZmFsc2UpOyAvLyBubyBjYXB0dXJpbmdcbn1cblxuXG5mdW5jdGlvbiBmaWx0ZXJEb21FdmVudChldmVudFR5cGUsIG1lc3NhZ2UsIGV2ZW50KSB7XG5cdGlmIChldmVudFR5cGUgPT0gJ3JlYWR5c3RhdGVjaGFuZ2UnKSB7XG5cdFx0aWYgKHRoaXMuX2RvbVJlYWR5RmlyZWQpIHJldHVybiBmYWxzZTtcblx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ19kb21SZWFkeUZpcmVkJywge1xuXHRcdFx0d3JpdGFibGU6IHRydWUsXG5cdFx0XHR2YWx1ZTogdHJ1ZVxuXHRcdH0pO1xuXHRcdHJldHVybiB0cnVlO1xuXHR9XG59O1xuXG5cbiAvLyBldmVudCBkaXNwYXRjaGVyIC0gYXMgZGVmaW5lZCBieSBFdmVudCBET00gQVBJXG5mdW5jdGlvbiBoYW5kbGVFdmVudChldmVudCkge1xuXHR0aGlzLmRpc3BhdGNoTWVzc2FnZShldmVudC50eXBlLCBldmVudCk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBNaXhpbiA9IHJlcXVpcmUoJy4uL2Fic3RyYWN0L21peGluJylcblx0LCBNZXNzYWdlU291cmNlID0gcmVxdWlyZSgnLi9tZXNzYWdlX3NvdXJjZScpXG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpXG5cdCwgY2hlY2sgPSByZXF1aXJlKCcuLi91dGlsL2NoZWNrJylcblx0LCBNYXRjaCA9IGNoZWNrLk1hdGNoXG5cdCwgTWVzc2VuZ2VyRXJyb3IgPSByZXF1aXJlKCcuLi91dGlsL2Vycm9yJykuTWVzc2VuZ2VyO1xuXG5cbnZhciBldmVudHNTcGxpdFJlZ0V4cCA9IC9cXHMqKD86XFwsfFxccylcXHMqLztcblxuXG52YXIgTWVzc2VuZ2VyID0gXy5jcmVhdGVTdWJjbGFzcyhNaXhpbiwgJ01lc3NlbmdlcicpO1xuXG5fLmV4dGVuZFByb3RvKE1lc3Nlbmdlciwge1xuXHRpbml0OiBpbml0TWVzc2VuZ2VyLCAvLyBjYWxsZWQgYnkgTWl4aW4gKHN1cGVyY2xhc3MpXG5cdG9uTWVzc2FnZTogcmVnaXN0ZXJTdWJzY3JpYmVyLFxuXHRvZmZNZXNzYWdlOiByZW1vdmVTdWJzY3JpYmVyLFxuXHRvbk1lc3NhZ2VzOiByZWdpc3RlclN1YnNjcmliZXJzLFxuXHRvZmZNZXNzYWdlczogcmVtb3ZlU3Vic2NyaWJlcnMsXG5cdHBvc3RNZXNzYWdlOiBwb3N0TWVzc2FnZSxcblx0Z2V0U3Vic2NyaWJlcnM6IGdldE1lc3NhZ2VTdWJzY3JpYmVycyxcblx0X2Nob29zZVN1YnNjcmliZXJzSGFzaDogX2Nob29zZVN1YnNjcmliZXJzSGFzaCxcblx0X3JlZ2lzdGVyU3Vic2NyaWJlcjogX3JlZ2lzdGVyU3Vic2NyaWJlcixcblx0X3JlbW92ZVN1YnNjcmliZXI6IF9yZW1vdmVTdWJzY3JpYmVyLFxuXHRfcmVtb3ZlQWxsU3Vic2NyaWJlcnM6IF9yZW1vdmVBbGxTdWJzY3JpYmVycyxcblx0X2NhbGxQYXR0ZXJuU3Vic2NyaWJlcnM6IF9jYWxsUGF0dGVyblN1YnNjcmliZXJzLFxuXHRfY2FsbFN1YnNjcmliZXJzOiBfY2FsbFN1YnNjcmliZXJzXG59KTtcblxuXG5NZXNzZW5nZXIuZGVmYXVsdE1ldGhvZHMgPSB7XG5cdG9uTWVzc2FnZTogJ29uTWVzc2FnZScsXG5cdG9mZk1lc3NhZ2U6ICdvZmZNZXNzYWdlJyxcblx0b25NZXNzYWdlczogJ29uTWVzc2FnZXMnLFxuXHRvZmZNZXNzYWdlczogJ29mZk1lc3NhZ2VzJyxcblx0cG9zdE1lc3NhZ2U6ICdwb3N0TWVzc2FnZScsXG5cdGdldFN1YnNjcmliZXJzOiAnZ2V0U3Vic2NyaWJlcnMnXG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gTWVzc2VuZ2VyO1xuXG5cbmZ1bmN0aW9uIGluaXRNZXNzZW5nZXIoaG9zdE9iamVjdCwgcHJveHlNZXRob2RzLCBtZXNzYWdlU291cmNlKSB7XG5cdGNoZWNrKG1lc3NhZ2VTb3VyY2UsIE1hdGNoLk9wdGlvbmFsKE1lc3NhZ2VTb3VyY2UpKTtcblxuXHQvLyBob3N0T2JqZWN0IGFuZCBwcm94eU1ldGhvZHMgYXJlIHVzZWQgaW4gTWl4aW5cbiBcdC8vIG1lc3NlbmdlciBkYXRhXG4gXHRPYmplY3QuZGVmaW5lUHJvcGVydGllcyh0aGlzLCB7XG4gXHRcdF9tZXNzYWdlU3Vic2NyaWJlcnM6IHsgdmFsdWU6IHt9IH0sXG4gXHRcdF9wYXR0ZXJuTWVzc2FnZVN1YnNjcmliZXJzOiB7IHZhbHVlOiB7fSB9LFxuIFx0XHRfbWVzc2FnZVNvdXJjZTogeyB2YWx1ZTogbWVzc2FnZVNvdXJjZSB9XG4gXHR9KTtcblxuIFx0aWYgKG1lc3NhZ2VTb3VyY2UpXG4gXHRcdG1lc3NhZ2VTb3VyY2UubWVzc2VuZ2VyID0gdGhpcztcbn1cblxuXG5mdW5jdGlvbiByZWdpc3RlclN1YnNjcmliZXIobWVzc2FnZXMsIHN1YnNjcmliZXIpIHtcblx0Y2hlY2sobWVzc2FnZXMsIE1hdGNoLk9uZU9mKFN0cmluZywgW1N0cmluZ10sIFJlZ0V4cCkpO1xuXHRjaGVjayhzdWJzY3JpYmVyLCBGdW5jdGlvbik7IFxuXG5cdGlmICh0eXBlb2YgbWVzc2FnZXMgPT0gJ3N0cmluZycpXG5cdFx0bWVzc2FnZXMgPSBtZXNzYWdlcy5zcGxpdChldmVudHNTcGxpdFJlZ0V4cCk7XG5cblx0dmFyIHN1YnNjcmliZXJzSGFzaCA9IHRoaXMuX2Nob29zZVN1YnNjcmliZXJzSGFzaChtZXNzYWdlcyk7XG5cblx0aWYgKG1lc3NhZ2VzIGluc3RhbmNlb2YgUmVnRXhwKVxuXHRcdHJldHVybiB0aGlzLl9yZWdpc3RlclN1YnNjcmliZXIoc3Vic2NyaWJlcnNIYXNoLCBtZXNzYWdlcywgc3Vic2NyaWJlcik7XG5cblx0ZWxzZSB7XG5cdFx0dmFyIHdhc1JlZ2lzdGVyZWQgPSBmYWxzZTtcblxuXHRcdG1lc3NhZ2VzLmZvckVhY2goZnVuY3Rpb24obWVzc2FnZSkge1xuXHRcdFx0dmFyIG5vdFlldFJlZ2lzdGVyZWQgPSB0aGlzLl9yZWdpc3RlclN1YnNjcmliZXIoc3Vic2NyaWJlcnNIYXNoLCBtZXNzYWdlLCBzdWJzY3JpYmVyKTtcdFx0XHRcblx0XHRcdHdhc1JlZ2lzdGVyZWQgPSB3YXNSZWdpc3RlcmVkIHx8IG5vdFlldFJlZ2lzdGVyZWQ7XHRcdFx0XG5cdFx0fSwgdGhpcyk7XG5cblx0XHRyZXR1cm4gd2FzUmVnaXN0ZXJlZDtcblx0fVxufVxuXG5cbmZ1bmN0aW9uIF9yZWdpc3RlclN1YnNjcmliZXIoc3Vic2NyaWJlcnNIYXNoLCBtZXNzYWdlLCBzdWJzY3JpYmVyKSB7XG5cdGlmICghIChzdWJzY3JpYmVyc0hhc2hbbWVzc2FnZV0gJiYgc3Vic2NyaWJlcnNIYXNoW21lc3NhZ2VdLmxlbmd0aCkpIHtcblx0XHRzdWJzY3JpYmVyc0hhc2hbbWVzc2FnZV0gPSBbXTtcblx0XHR2YXIgbm9TdWJzY3JpYmVycyA9IHRydWU7XG5cdFx0aWYgKHRoaXMuX21lc3NhZ2VTb3VyY2UpXG5cdFx0XHR0aGlzLl9tZXNzYWdlU291cmNlLm9uU3Vic2NyaWJlckFkZGVkKG1lc3NhZ2UpO1xuXHR9XG5cblx0dmFyIG1zZ1N1YnNjcmliZXJzID0gc3Vic2NyaWJlcnNIYXNoW21lc3NhZ2VdO1xuXHR2YXIgbm90WWV0UmVnaXN0ZXJlZCA9IG5vU3Vic2NyaWJlcnMgfHwgbXNnU3Vic2NyaWJlcnMuaW5kZXhPZihzdWJzY3JpYmVyKSA9PSAtMTtcblxuXHRpZiAobm90WWV0UmVnaXN0ZXJlZClcblx0XHRtc2dTdWJzY3JpYmVycy5wdXNoKHN1YnNjcmliZXIpO1xuXG5cdHJldHVybiBub3RZZXRSZWdpc3RlcmVkO1xufVxuXG5cbmZ1bmN0aW9uIHJlZ2lzdGVyU3Vic2NyaWJlcnMobWVzc2FnZVN1YnNjcmliZXJzKSB7XG5cdGNoZWNrKG1lc3NhZ2VTdWJzY3JpYmVycywgTWF0Y2guT2JqZWN0SGFzaChGdW5jdGlvbikpO1xuXG5cdHZhciBub3RZZXRSZWdpc3RlcmVkTWFwID0gXy5tYXBLZXlzKG1lc3NhZ2VTdWJzY3JpYmVycywgZnVuY3Rpb24oc3Vic2NyaWJlciwgbWVzc2FnZXMpIHtcblx0XHRyZXR1cm4gdGhpcy5vbk1lc3NhZ2UobWVzc2FnZXMsIHN1YnNjcmliZXIpXG5cdH0sIHRoaXMpO1xuXG5cdHJldHVybiBub3RZZXRSZWdpc3RlcmVkTWFwO1xufVxuXG5cbi8vIHJlbW92ZXMgYWxsIHN1YnNjcmliZXJzIGZvciB0aGUgbWVzc2FnZSBpZiBzdWJzY3JpYmVyIGlzbid0IHN1cHBsaWVkXG5mdW5jdGlvbiByZW1vdmVTdWJzY3JpYmVyKG1lc3NhZ2VzLCBzdWJzY3JpYmVyKSB7XG5cdGNoZWNrKG1lc3NhZ2VzLCBNYXRjaC5PbmVPZihTdHJpbmcsIFtTdHJpbmddLCBSZWdFeHApKTtcblx0Y2hlY2soc3Vic2NyaWJlciwgTWF0Y2guT3B0aW9uYWwoRnVuY3Rpb24pKTsgXG5cblx0aWYgKHR5cGVvZiBtZXNzYWdlcyA9PSAnc3RyaW5nJylcblx0XHRtZXNzYWdlcyA9IG1lc3NhZ2VzLnNwbGl0KGV2ZW50c1NwbGl0UmVnRXhwKTtcblxuXHR2YXIgc3Vic2NyaWJlcnNIYXNoID0gdGhpcy5fY2hvb3NlU3Vic2NyaWJlcnNIYXNoKG1lc3NhZ2VzKTtcblxuXHRpZiAobWVzc2FnZXMgaW5zdGFuY2VvZiBSZWdFeHApXG5cdFx0cmV0dXJuIHRoaXMuX3JlbW92ZVN1YnNjcmliZXIoc3Vic2NyaWJlcnNIYXNoLCBtZXNzYWdlcywgc3Vic2NyaWJlcik7XG5cblx0ZWxzZSB7XG5cdFx0dmFyIHdhc1JlbW92ZWQgPSBmYWxzZTtcblxuXHRcdG1lc3NhZ2VzLmZvckVhY2goZnVuY3Rpb24obWVzc2FnZSkge1xuXHRcdFx0dmFyIHN1YnNjcmliZXJSZW1vdmVkID0gdGhpcy5fcmVtb3ZlU3Vic2NyaWJlcihzdWJzY3JpYmVyc0hhc2gsIG1lc3NhZ2UsIHN1YnNjcmliZXIpO1x0XHRcdFxuXHRcdFx0d2FzUmVtb3ZlZCA9IHdhc1JlbW92ZWQgfHwgc3Vic2NyaWJlclJlbW92ZWQ7XHRcdFx0XG5cdFx0fSwgdGhpcyk7XG5cblx0XHRyZXR1cm4gd2FzUmVtb3ZlZDtcblx0fVxufVxuXG5cbmZ1bmN0aW9uIF9yZW1vdmVTdWJzY3JpYmVyKHN1YnNjcmliZXJzSGFzaCwgbWVzc2FnZSwgc3Vic2NyaWJlcikge1xuXHR2YXIgbXNnU3Vic2NyaWJlcnMgPSBzdWJzY3JpYmVyc0hhc2hbbWVzc2FnZV07XG5cdGlmICghIG1zZ1N1YnNjcmliZXJzIHx8ICEgbXNnU3Vic2NyaWJlcnMubGVuZ3RoKVxuXHRcdHJldHVybiBmYWxzZTsgLy8gbm90aGluZyByZW1vdmVkXG5cblx0aWYgKHN1YnNjcmliZXIpIHtcblx0XHR2YXIgc3Vic2NyaWJlckluZGV4ID0gbXNnU3Vic2NyaWJlcnMuaW5kZXhPZihzdWJzY3JpYmVyKTtcblx0XHRpZiAoc3Vic2NyaWJlckluZGV4ID09IC0xKSBcblx0XHRcdHJldHVybiBmYWxzZTsgLy8gbm90aGluZyByZW1vdmVkXG5cdFx0bXNnU3Vic2NyaWJlcnMuc3BsaWNlKHN1YnNjcmliZXJJbmRleCwgMSk7XG5cdFx0aWYgKCEgbXNnU3Vic2NyaWJlcnMubGVuZ3RoKVxuXHRcdFx0dGhpcy5fcmVtb3ZlQWxsU3Vic2NyaWJlcnMoc3Vic2NyaWJlcnNIYXNoLCBtZXNzYWdlKTtcblxuXHR9IGVsc2UgXG5cdFx0dGhpcy5fcmVtb3ZlQWxsU3Vic2NyaWJlcnMoc3Vic2NyaWJlcnNIYXNoLCBtZXNzYWdlKTtcblxuXHRyZXR1cm4gdHJ1ZTsgLy8gc3Vic2NyaWJlcihzKSByZW1vdmVkXG59XG5cblxuZnVuY3Rpb24gX3JlbW92ZUFsbFN1YnNjcmliZXJzKHN1YnNjcmliZXJzSGFzaCwgbWVzc2FnZSkge1xuXHRkZWxldGUgc3Vic2NyaWJlcnNIYXNoW21lc3NhZ2VdO1xuXHRpZiAodGhpcy5fbWVzc2FnZVNvdXJjZSlcblx0XHR0aGlzLl9tZXNzYWdlU291cmNlLm9uU3Vic2NyaWJlclJlbW92ZWQobWVzc2FnZSk7XG59XG5cblxuZnVuY3Rpb24gcmVtb3ZlU3Vic2NyaWJlcnMobWVzc2FnZVN1YnNjcmliZXJzKSB7XG5cdGNoZWNrKG1lc3NhZ2VTdWJzY3JpYmVycywgTWF0Y2guT2JqZWN0SGFzaChGdW5jdGlvbikpO1xuXG5cdHZhciBzdWJzY3JpYmVyUmVtb3ZlZE1hcCA9IF8ubWFwS2V5cyhtZXNzYWdlU3Vic2NyaWJlcnMsIGZ1bmN0aW9uKHN1YnNjcmliZXIsIG1lc3NhZ2VzKSB7XG5cdFx0cmV0dXJuIHRoaXMub2ZmTWVzc2FnZXMobWVzc2FnZXMsIHN1YnNjcmliZXIpXG5cdH0sIHRoaXMpO1xuXG5cdHJldHVybiBzdWJzY3JpYmVyUmVtb3ZlZE1hcDtcdFxufVxuXG5cbi8vIFRPRE8gLSBzZW5kIGV2ZW50IHRvIG1lc3NhZ2VTb3VyY2VcblxuXG5mdW5jdGlvbiBwb3N0TWVzc2FnZShtZXNzYWdlLCBkYXRhKSB7XG5cdGNoZWNrKG1lc3NhZ2UsIE1hdGNoLk9uZU9mKFN0cmluZywgUmVnRXhwKSk7XG5cblx0dmFyIHN1YnNjcmliZXJzSGFzaCA9IHRoaXMuX2Nob29zZVN1YnNjcmliZXJzSGFzaChtZXNzYWdlKTtcblx0dmFyIG1zZ1N1YnNjcmliZXJzID0gc3Vic2NyaWJlcnNIYXNoW21lc3NhZ2VdO1xuXG5cdHRoaXMuX2NhbGxTdWJzY3JpYmVycyhtZXNzYWdlLCBkYXRhLCBtc2dTdWJzY3JpYmVycyk7XG5cblx0aWYgKHR5cGVvZiBtZXNzYWdlID09ICdzdHJpbmcnKVxuXHRcdHRoaXMuX2NhbGxQYXR0ZXJuU3Vic2NyaWJlcnMobWVzc2FnZSwgZGF0YSk7XG59XG5cblxuZnVuY3Rpb24gX2NhbGxQYXR0ZXJuU3Vic2NyaWJlcnMobWVzc2FnZSwgZGF0YSkge1xuXHRfLmVhY2hLZXkodGhpcy5fcGF0dGVybk1lc3NhZ2VTdWJzY3JpYmVycywgXG5cdFx0ZnVuY3Rpb24ocGF0dGVyblN1YnNjcmliZXJzLCBwYXR0ZXJuKSB7XG5cdFx0XHRpZiAocGF0dGVybi50ZXN0KG1lc3NhZ2UpKVxuXHRcdFx0XHR0aGlzLl9jYWxsU3Vic2NyaWJlcnMobWVzc2FnZSwgZGF0YSwgcGF0dGVyblN1YnNjcmliZXJzKTtcblx0XHR9XG5cdCwgdGhpcyk7XG59XG5cblxuZnVuY3Rpb24gX2NhbGxTdWJzY3JpYmVycyhtZXNzYWdlLCBkYXRhLCBtc2dTdWJzY3JpYmVycykge1xuXHRpZiAobXNnU3Vic2NyaWJlcnMgJiYgbXNnU3Vic2NyaWJlcnMubGVuZ3RoKVxuXHRcdG1zZ1N1YnNjcmliZXJzLmZvckVhY2goZnVuY3Rpb24oc3Vic2NyaWJlcikge1xuXHRcdFx0c3Vic2NyaWJlci5jYWxsKHRoaXMsIG1lc3NhZ2UsIGRhdGEpO1xuXHRcdH0sIHRoaXMpO1xufVxuXG5cbmZ1bmN0aW9uIGdldE1lc3NhZ2VTdWJzY3JpYmVycyhtZXNzYWdlLCBpbmNsdWRlUGF0dGVyblN1YnNjcmliZXJzKSB7XG5cdGNoZWNrKG1lc3NhZ2UsIE1hdGNoLk9uZU9mKFN0cmluZywgUmVnRXhwKSk7XG5cblx0dmFyIHN1YnNjcmliZXJzSGFzaCA9IHRoaXMuX2Nob29zZVN1YnNjcmliZXJzSGFzaChtZXNzYWdlKTtcblx0dmFyIG1zZ1N1YnNjcmliZXJzID0gc3Vic2NyaWJlcnNIYXNoW21lc3NhZ2VdXG5cdFx0XHRcdFx0XHRcdD8gW10uY29uY2F0KHN1YnNjcmliZXJzSGFzaFttZXNzYWdlXSlcblx0XHRcdFx0XHRcdFx0OiBbXTtcblxuXHQvLyBwYXR0ZXJuIHN1YnNjcmliZXJzIGFyZSBpbmN1ZGVkIGJ5IGRlZmF1bHRcblx0aWYgKGluY2x1ZGVQYXR0ZXJuU3Vic2NyaWJlcnMgIT09IGZhbHNlICYmIHR5cGVvZiBtZXNzYWdlID09ICdzdHJpbmcnKSB7XG5cdFx0Xy5lYWNoS2V5KHRoaXMuX3BhdHRlcm5NZXNzYWdlU3Vic2NyaWJlcnMsIFxuXHRcdFx0ZnVuY3Rpb24ocGF0dGVyblN1YnNjcmliZXJzLCBwYXR0ZXJuKSB7XG5cdFx0XHRcdGlmIChwYXR0ZXJuU3Vic2NyaWJlcnMgJiYgcGF0dGVyblN1YnNjcmliZXJzLmxlbmd0aFxuXHRcdFx0XHRcdFx0JiYgcGF0dGVybi50ZXN0KG1lc3NhZ2UpKVxuXHRcdFx0XHRcdF8uYXBwZW5kQXJyYXkobXNnU3Vic2NyaWJlcnMsIHBhdHRlcm5TdWJzY3JpYmVycyk7XG5cdFx0XHR9XG5cdFx0KTtcblx0fVxuXG5cdHJldHVybiBtc2dTdWJzY3JpYmVycy5sZW5ndGhcblx0XHRcdFx0PyBtc2dTdWJzY3JpYmVyc1xuXHRcdFx0XHQ6IHVuZGVmaW5lZDtcbn1cblxuXG5mdW5jdGlvbiBfY2hvb3NlU3Vic2NyaWJlcnNIYXNoKG1lc3NhZ2UpIHtcblx0cmV0dXJuIG1lc3NhZ2UgaW5zdGFuY2VvZiBSZWdFeHBcblx0XHRcdFx0PyB0aGlzLl9wYXR0ZXJuTWVzc2FnZVN1YnNjcmliZXJzXG5cdFx0XHRcdDogdGhpcy5fbWVzc2FnZVN1YnNjcmliZXJzO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgTWl4aW4gPSByZXF1aXJlKCcuLi9hYnN0cmFjdC9taXhpbicpXG5cdCwgbG9nZ2VyID0gcmVxdWlyZSgnLi4vdXRpbC9sb2dnZXInKVxuXHQsIHRvQmVJbXBsZW1lbnRlZCA9IHJlcXVpcmUoJy4uL3V0aWwvZXJyb3InKS50b0JlSW1wbGVtZW50ZWRcblx0LCBfID0gcmVxdWlyZSgnbW9sLXByb3RvJyk7XG5cbi8vIGFuIGFic3RyYWN0IGNsYXNzIGZvciBkaXNwYXRjaGluZyBleHRlcm5hbCB0byBpbnRlcm5hbCBldmVudHNcbnZhciBNZXNzYWdlU291cmNlID0gXy5jcmVhdGVTdWJjbGFzcyhNaXhpbiwgJ01lc3NhZ2VTb3VyY2UnLCB0cnVlKTtcblxubW9kdWxlLmV4cG9ydHMgPSBNZXNzYWdlU291cmNlO1xuXG5cbl8uZXh0ZW5kUHJvdG8oTWVzc2FnZVNvdXJjZSwge1xuXHQvLyBpbml0aWFsaXplcyBtZXNzYWdlU291cmNlIC0gY2FsbGVkIGJ5IE1peGluIHN1cGVyY2xhc3Ncblx0aW5pdDogaW5pdE1lc3NhZ2VTb3VyY2UsXG5cblx0Ly8gY2FsbGVkIGJ5IE1lc3NlbmdlciB0byBub3RpZnkgd2hlbiB0aGUgZmlyc3Qgc3Vic2NyaWJlciBmb3IgYW4gaW50ZXJuYWwgbWVzc2FnZSB3YXMgYWRkZWRcblx0b25TdWJzY3JpYmVyQWRkZWQ6IG9uU3Vic2NyaWJlckFkZGVkLFxuXG5cdC8vIGNhbGxlZCBieSBNZXNzZW5nZXIgdG8gbm90aWZ5IHdoZW4gdGhlIGxhc3Qgc3Vic2NyaWJlciBmb3IgYW4gaW50ZXJuYWwgbWVzc2FnZSB3YXMgcmVtb3ZlZFxuIFx0b25TdWJzY3JpYmVyUmVtb3ZlZDogb25TdWJzY3JpYmVyUmVtb3ZlZCwgXG5cbiBcdC8vIGRpc3BhdGNoZXMgc291cmNlIG1lc3NhZ2VcbiBcdGRpc3BhdGNoTWVzc2FnZTogZGlzcGF0Y2hTb3VyY2VNZXNzYWdlLFxuXG5cdC8vIGZpbHRlcnMgc291cmNlIG1lc3NhZ2UgYmFzZWQgb24gdGhlIGRhdGEgb2YgdGhlIG1lc3NhZ2UgLSBzaG91bGQgYmUgaW1wbGVtZW50ZWQgaW4gc3ViY2xhc3Ncblx0ZmlsdGVyU291cmNlTWVzc2FnZTogZGlzcGF0Y2hBbGxTb3VyY2VNZXNzYWdlcyxcblxuIFx0Ly8gKioqXG4gXHQvLyBNZXRob2RzIGJlbG93IG11c3QgYmUgaW1wbGVtZW50ZWQgaW4gc3ViY2xhc3NcbiBcdFxuXHQvLyBjb252ZXJ0cyBpbnRlcm5hbCBtZXNzYWdlIHR5cGUgdG8gZXh0ZXJuYWwgbWVzc2FnZSB0eXBlIC0gc2hvdWxkIGJlIGltcGxlbWVudGVkIGluIHN1YmNsYXNzXG5cdHRyYW5zbGF0ZVRvU291cmNlTWVzc2FnZTogdG9CZUltcGxlbWVudGVkLFxuXG4gXHQvLyBhZGRzIGxpc3RlbmVyIHRvIGV4dGVybmFsIG1lc3NhZ2UgLSBzaG91bGQgYmUgaW1wbGVtZW50ZWQgYnkgc3ViY2xhc3NcbiBcdGFkZFNvdXJjZUxpc3RlbmVyOiB0b0JlSW1wbGVtZW50ZWQsXG5cbiBcdC8vIHJlbW92ZXMgbGlzdGVuZXIgZnJvbSBleHRlcm5hbCBtZXNzYWdlIC0gc2hvdWxkIGJlIGltcGxlbWVudGVkIGJ5IHN1YmNsYXNzXG4gXHRyZW1vdmVTb3VyY2VMaXN0ZW5lcjogdG9CZUltcGxlbWVudGVkLFxufSk7XG5cblxuZnVuY3Rpb24gaW5pdE1lc3NhZ2VTb3VyY2UoKSB7XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnX2ludGVybmFsTWVzc2FnZXMnLCB7IHZhbHVlOiB7fSB9KTtcbn1cblxuXG5mdW5jdGlvbiBvblN1YnNjcmliZXJBZGRlZChtZXNzYWdlKSB7XG5cdHZhciBzb3VyY2VNZXNzYWdlID0gdGhpcy50cmFuc2xhdGVUb1NvdXJjZU1lc3NhZ2UobWVzc2FnZSk7XG5cblx0aWYgKCEgc291cmNlTWVzc2FnZSkgcmV0dXJuO1xuXG5cdGlmICghIHRoaXMuX2ludGVybmFsTWVzc2FnZXMuaGFzT3duUHJvcGVydHkoc291cmNlTWVzc2FnZSkpIHtcblx0XHR0aGlzLmFkZFNvdXJjZUxpc3RlbmVyKHNvdXJjZU1lc3NhZ2UpO1xuXHRcdHRoaXMuX2ludGVybmFsTWVzc2FnZXNbc291cmNlTWVzc2FnZV0gPSBbXTtcblx0fVxuXHR2YXIgaW50ZXJuYWxNc2dzID0gdGhpcy5faW50ZXJuYWxNZXNzYWdlc1tzb3VyY2VNZXNzYWdlXTtcblxuXHRpZiAoaW50ZXJuYWxNc2dzLmluZGV4T2YobWVzc2FnZSkgPT0gLTEpXG5cdFx0aW50ZXJuYWxNc2dzLnB1c2gobWVzc2FnZSk7XG5cdGVsc2Vcblx0XHRsb2dnZXIud2FybignRHVwbGljYXRlIG5vdGlmaWNhdGlvbiByZWNlaXZlZDogZm9yIHN1YnNjcmliZSB0byBpbnRlcm5hbCBtZXNzYWdlICcgKyBtZXNzYWdlKTtcbn1cblxuXG5mdW5jdGlvbiBvblN1YnNjcmliZXJSZW1vdmVkKG1lc3NhZ2UpIHtcblx0dmFyIHNvdXJjZU1lc3NhZ2UgPSB0aGlzLnRyYW5zbGF0ZVRvU291cmNlTWVzc2FnZShtZXNzYWdlKTtcblxuXHRpZiAoISBzb3VyY2VNZXNzYWdlKSByZXR1cm47XG5cblx0dmFyIGludGVybmFsTXNncyA9IHRoaXMuX2ludGVybmFsTWVzc2FnZXNbc291cmNlTWVzc2FnZV07XG5cblx0aWYgKGludGVybmFsTXNncyAmJiBpbnRlcm5hbE1zZ3MubGVuZ3RoKSB7XG5cdFx0bWVzc2FnZUluZGV4ID0gaW50ZXJuYWxNc2dzLmluZGV4T2YobWVzc2FnZSk7XG5cdFx0aWYgKG1lc3NhZ2VJbmRleCA+PSAwKSB7XG5cdFx0XHRpbnRlcm5hbE1zZ3Muc3BsaWNlKG1lc3NhZ2VJbmRleCwgMSk7XG5cdFx0XHRpZiAoaW50ZXJuYWxNc2dzLmxlbmd0aCA9PSAwKSB7XG5cdFx0XHRcdGRlbGV0ZSB0aGlzLl9pbnRlcm5hbE1lc3NhZ2VzW3NvdXJjZU1lc3NhZ2VdO1xuXHRcdFx0XHR0aGlzLnJlbW92ZVNvdXJjZUxpc3RlbmVyKHNvdXJjZU1lc3NhZ2UpO1xuXHRcdFx0fVxuXHRcdH0gZWxzZVxuXHRcdFx0dW5leHBlY3RlZE5vdGlmaWNhdGlvbldhcm5pbmcoKTtcblx0fSBlbHNlXG5cdFx0dW5leHBlY3RlZE5vdGlmaWNhdGlvbldhcm5pbmcoKTtcblxuXG5cdGZ1bmN0aW9uIHVuZXhwZWN0ZWROb3RpZmljYXRpb25XYXJuaW5nKCkge1xuXHRcdGxvZ2dlci53YXJuKCdub3RpZmljYXRpb24gcmVjZWl2ZWQ6IHVuLXN1YnNjcmliZSBmcm9tIGludGVybmFsIG1lc3NhZ2UgJyArIG1lc3NhZ2Vcblx0XHRcdFx0XHQgKyAnIHdpdGhvdXQgcHJldmlvdXMgc3Vic2NyaXB0aW9uIG5vdGlmaWNhdGlvbicpO1xuXHR9XG59XG5cblxuZnVuY3Rpb24gZGlzcGF0Y2hTb3VyY2VNZXNzYWdlKHNvdXJjZU1lc3NhZ2UsIGRhdGEpIHtcblx0dmFyIGludGVybmFsTXNncyA9IHRoaXMuX2ludGVybmFsTWVzc2FnZXNbc291cmNlTWVzc2FnZV07XG5cblx0aWYgKGludGVybmFsTXNncyAmJiBpbnRlcm5hbE1zZ3MubGVuZ3RoKVxuXHRcdGludGVybmFsTXNncy5mb3JFYWNoKGZ1bmN0aW9uKG1lc3NhZ2UpIHtcblx0XHRcdGlmICh0aGlzLmZpbHRlclNvdXJjZU1lc3NhZ2Vcblx0XHRcdFx0XHQmJiB0aGlzLmZpbHRlclNvdXJjZU1lc3NhZ2Uoc291cmNlTWVzc2FnZSwgbWVzc2FnZSwgZGF0YSkpXG5cdFx0XHRcdHRoaXMubWVzc2VuZ2VyLnBvc3RNZXNzYWdlKG1lc3NhZ2UsIGRhdGEpO1xuXHRcdH0sIHRoaXMpO1xuXHRlbHNlXG5cdFx0bG9nZ2VyLndhcm4oJ3NvdXJjZSBtZXNzYWdlIHJlY2VpdmVkIGZvciB3aGljaCB0aGVyZSBpcyBubyBtYXBwZWQgaW50ZXJuYWwgbWVzc2FnZScpO1xufVxuXG5cbi8vIGNhbiBiZSBvdmVycmlkZGVuIGluIHN1YmNsYXNzIHRvIGltcGxlbWVudCBmaWx0ZXJpbmcgYmFzZWQgb24gbWVzc2FnZSBkYXRhXG5mdW5jdGlvbiBkaXNwYXRjaEFsbFNvdXJjZU1lc3NhZ2VzKHNvdXJjZU1lc3NhZ2UsIG1lc3NhZ2UsIGRhdGEpIHtcblx0cmV0dXJuIHRydWU7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBtaWxvID0ge1xuXHRsb2FkZXI6IHJlcXVpcmUoJy4vbG9hZGVyJyksXG5cdGJpbmRlcjogcmVxdWlyZSgnLi9iaW5kZXInKSxcblx0bWFpbDogcmVxdWlyZSgnLi9tYWlsJyksXG5cdGNvbmZpZzogcmVxdWlyZSgnLi9jb25maWcnKSxcblx0dXRpbDogcmVxdWlyZSgnLi91dGlsJyksXG5cdGNsYXNzZXM6IHJlcXVpcmUoJy4vY2xhc3NlcycpXG59XG5cblxuLy8gdXNlZCBmYWNldHNcbnJlcXVpcmUoJy4vY29tcG9uZW50cy9jX2ZhY2V0cy9Eb20nKTtcbnJlcXVpcmUoJy4vY29tcG9uZW50cy9jX2ZhY2V0cy9EYXRhJyk7XG5yZXF1aXJlKCcuL2NvbXBvbmVudHMvY19mYWNldHMvRnJhbWUnKTtcbnJlcXVpcmUoJy4vY29tcG9uZW50cy9jX2ZhY2V0cy9FdmVudHMnKTtcbnJlcXVpcmUoJy4vY29tcG9uZW50cy9jX2ZhY2V0cy9UZW1wbGF0ZScpO1xucmVxdWlyZSgnLi9jb21wb25lbnRzL2NfZmFjZXRzL0NvbnRhaW5lcicpO1xucmVxdWlyZSgnLi9jb21wb25lbnRzL2NfZmFjZXRzL0RyYWcnKTtcblxuLy8gdXNlZCBjb21wb25lbnRzXG5yZXF1aXJlKCcuL2NvbXBvbmVudHMvY2xhc3Nlcy9WaWV3Jyk7XG5cblxuLy8gZXhwb3J0IGZvciBub2RlL2Jyb3dzZXJpZnlcbmlmICh0eXBlb2YgbW9kdWxlID09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKVx0XG5cdG1vZHVsZS5leHBvcnRzID0gbWlsbztcblxuLy8gZ2xvYmFsIG1pbG8gZm9yIGJyb3dzZXJcbmlmICh0eXBlb2Ygd2luZG93ID09ICdvYmplY3QnKVxuXHR3aW5kb3cubWlsbyA9IG1pbG87XG4iLCIndXNlIHN0cmljdCc7XG5cbi8vIFhYWCBkb2NzXG5cbi8vIFRoaW5ncyB3ZSBleHBsaWNpdGx5IGRvIE5PVCBzdXBwb3J0OlxuLy8gICAgLSBoZXRlcm9nZW5vdXMgYXJyYXlzXG52YXIgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpO1xuXG52YXIgY2hlY2sgPSBmdW5jdGlvbiAodmFsdWUsIHBhdHRlcm4pIHtcbiAgLy8gUmVjb3JkIHRoYXQgY2hlY2sgZ290IGNhbGxlZCwgaWYgc29tZWJvZHkgY2FyZWQuXG4gIHRyeSB7XG4gICAgY2hlY2tTdWJ0cmVlKHZhbHVlLCBwYXR0ZXJuKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgaWYgKChlcnIgaW5zdGFuY2VvZiBNYXRjaC5FcnJvcikgJiYgZXJyLnBhdGgpXG4gICAgICBlcnIubWVzc2FnZSArPSBcIiBpbiBmaWVsZCBcIiArIGVyci5wYXRoO1xuICAgIHRocm93IGVycjtcbiAgfVxufTtcbm1vZHVsZS5leHBvcnRzID0gY2hlY2s7XG5cbnZhciBNYXRjaCA9IGNoZWNrLk1hdGNoID0ge1xuICBPcHRpb25hbDogZnVuY3Rpb24gKHBhdHRlcm4pIHtcbiAgICByZXR1cm4gbmV3IE9wdGlvbmFsKHBhdHRlcm4pO1xuICB9LFxuICBPbmVPZjogZnVuY3Rpb24gKC8qYXJndW1lbnRzKi8pIHtcbiAgICByZXR1cm4gbmV3IE9uZU9mKGFyZ3VtZW50cyk7XG4gIH0sXG4gIEFueTogWydfX2FueV9fJ10sXG4gIFdoZXJlOiBmdW5jdGlvbiAoY29uZGl0aW9uKSB7XG4gICAgcmV0dXJuIG5ldyBXaGVyZShjb25kaXRpb24pO1xuICB9LFxuICBPYmplY3RJbmNsdWRpbmc6IGZ1bmN0aW9uIChwYXR0ZXJuKSB7XG4gICAgcmV0dXJuIG5ldyBPYmplY3RJbmNsdWRpbmcocGF0dGVybik7XG4gIH0sXG4gIC8vIE1hdGNoZXMgb25seSBzaWduZWQgMzItYml0IGludGVnZXJzXG4gIEludGVnZXI6IFsnX19pbnRlZ2VyX18nXSxcblxuICAvLyBNYXRjaGVzIGhhc2ggKG9iamVjdCkgd2l0aCB2YWx1ZXMgbWF0Y2hpbmcgcGF0dGVyblxuICBPYmplY3RIYXNoOiBmdW5jdGlvbihwYXR0ZXJuKSB7XG4gICAgcmV0dXJuIG5ldyBPYmplY3RIYXNoKHBhdHRlcm4pO1xuICB9LFxuXG4gIFN1YmNsYXNzOiBmdW5jdGlvbihTdXBlcmNsYXNzLCBtYXRjaFN1cGVyY2xhc3NUb28pIHtcbiAgICByZXR1cm4gbmV3IFN1YmNsYXNzKFN1cGVyY2xhc3MsIG1hdGNoU3VwZXJjbGFzc1Rvbyk7XG4gIH0sXG5cbiAgLy8gWFhYIG1hdGNoZXJzIHNob3VsZCBrbm93IGhvdyB0byBkZXNjcmliZSB0aGVtc2VsdmVzIGZvciBlcnJvcnNcbiAgRXJyb3I6IFR5cGVFcnJvcixcblxuICAvLyBNZXRlb3IubWFrZUVycm9yVHlwZShcIk1hdGNoLkVycm9yXCIsIGZ1bmN0aW9uIChtc2cpIHtcbiAgICAvLyB0aGlzLm1lc3NhZ2UgPSBcIk1hdGNoIGVycm9yOiBcIiArIG1zZztcbiAgICAvLyBUaGUgcGF0aCBvZiB0aGUgdmFsdWUgdGhhdCBmYWlsZWQgdG8gbWF0Y2guIEluaXRpYWxseSBlbXB0eSwgdGhpcyBnZXRzXG4gICAgLy8gcG9wdWxhdGVkIGJ5IGNhdGNoaW5nIGFuZCByZXRocm93aW5nIHRoZSBleGNlcHRpb24gYXMgaXQgZ29lcyBiYWNrIHVwIHRoZVxuICAgIC8vIHN0YWNrLlxuICAgIC8vIEUuZy46IFwidmFsc1szXS5lbnRpdHkuY3JlYXRlZFwiXG4gICAgLy8gdGhpcy5wYXRoID0gXCJcIjtcbiAgICAvLyBJZiB0aGlzIGdldHMgc2VudCBvdmVyIEREUCwgZG9uJ3QgZ2l2ZSBmdWxsIGludGVybmFsIGRldGFpbHMgYnV0IGF0IGxlYXN0XG4gICAgLy8gcHJvdmlkZSBzb21ldGhpbmcgYmV0dGVyIHRoYW4gNTAwIEludGVybmFsIHNlcnZlciBlcnJvci5cbiAgLy8gICB0aGlzLnNhbml0aXplZEVycm9yID0gbmV3IE1ldGVvci5FcnJvcig0MDAsIFwiTWF0Y2ggZmFpbGVkXCIpO1xuICAvLyB9KSxcblxuICAvLyBUZXN0cyB0byBzZWUgaWYgdmFsdWUgbWF0Y2hlcyBwYXR0ZXJuLiBVbmxpa2UgY2hlY2ssIGl0IG1lcmVseSByZXR1cm5zIHRydWVcbiAgLy8gb3IgZmFsc2UgKHVubGVzcyBhbiBlcnJvciBvdGhlciB0aGFuIE1hdGNoLkVycm9yIHdhcyB0aHJvd24pLlxuICB0ZXN0OiBmdW5jdGlvbiAodmFsdWUsIHBhdHRlcm4pIHtcbiAgICB0cnkge1xuICAgICAgY2hlY2tTdWJ0cmVlKHZhbHVlLCBwYXR0ZXJuKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChlIGluc3RhbmNlb2YgTWF0Y2guRXJyb3IpXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIC8vIFJldGhyb3cgb3RoZXIgZXJyb3JzLlxuICAgICAgdGhyb3cgZTtcbiAgICB9XG4gIH1cbn07XG5cbmZ1bmN0aW9uIE9wdGlvbmFsKHBhdHRlcm4pIHtcbiAgdGhpcy5wYXR0ZXJuID0gcGF0dGVybjtcbn07XG5cbmZ1bmN0aW9uIE9uZU9mKGNob2ljZXMpIHtcbiAgaWYgKGNob2ljZXMubGVuZ3RoID09IDApXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTXVzdCBwcm92aWRlIGF0IGxlYXN0IG9uZSBjaG9pY2UgdG8gTWF0Y2guT25lT2ZcIik7XG4gIHRoaXMuY2hvaWNlcyA9IGNob2ljZXM7XG59O1xuXG5mdW5jdGlvbiBXaGVyZShjb25kaXRpb24pIHtcbiAgdGhpcy5jb25kaXRpb24gPSBjb25kaXRpb247XG59O1xuXG5mdW5jdGlvbiBPYmplY3RJbmNsdWRpbmcocGF0dGVybikge1xuICB0aGlzLnBhdHRlcm4gPSBwYXR0ZXJuO1xufTtcblxuZnVuY3Rpb24gT2JqZWN0SGFzaChwYXR0ZXJuKSB7XG4gIHRoaXMucGF0dGVybiA9IHBhdHRlcm47XG59O1xuXG5mdW5jdGlvbiBTdWJjbGFzcyhTdXBlcmNsYXNzLCBtYXRjaFN1cGVyY2xhc3NUb28pIHtcbiAgdGhpcy5TdXBlcmNsYXNzID0gU3VwZXJjbGFzcztcbiAgdGhpcy5tYXRjaFN1cGVyY2xhc3MgPSBtYXRjaFN1cGVyY2xhc3NUb287XG59O1xuXG52YXIgdHlwZW9mQ2hlY2tzID0gW1xuICBbU3RyaW5nLCBcInN0cmluZ1wiXSxcbiAgW051bWJlciwgXCJudW1iZXJcIl0sXG4gIFtCb29sZWFuLCBcImJvb2xlYW5cIl0sXG4gIC8vIFdoaWxlIHdlIGRvbid0IGFsbG93IHVuZGVmaW5lZCBpbiBKU09OLCB0aGlzIGlzIGdvb2QgZm9yIG9wdGlvbmFsXG4gIC8vIGFyZ3VtZW50cyB3aXRoIE9uZU9mLlxuICBbdW5kZWZpbmVkLCBcInVuZGVmaW5lZFwiXVxuXTtcblxuZnVuY3Rpb24gY2hlY2tTdWJ0cmVlKHZhbHVlLCBwYXR0ZXJuKSB7XG4gIC8vIE1hdGNoIGFueXRoaW5nIVxuICBpZiAocGF0dGVybiA9PT0gTWF0Y2guQW55KVxuICAgIHJldHVybjtcblxuICAvLyBCYXNpYyBhdG9taWMgdHlwZXMuXG4gIC8vIERvIG5vdCBtYXRjaCBib3hlZCBvYmplY3RzIChlLmcuIFN0cmluZywgQm9vbGVhbilcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0eXBlb2ZDaGVja3MubGVuZ3RoOyArK2kpIHtcbiAgICBpZiAocGF0dGVybiA9PT0gdHlwZW9mQ2hlY2tzW2ldWzBdKSB7XG4gICAgICBpZiAodHlwZW9mIHZhbHVlID09PSB0eXBlb2ZDaGVja3NbaV1bMV0pXG4gICAgICAgIHJldHVybjtcbiAgICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIFwiICsgdHlwZW9mQ2hlY2tzW2ldWzFdICsgXCIsIGdvdCBcIiArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZW9mIHZhbHVlKTtcbiAgICB9XG4gIH1cbiAgaWYgKHBhdHRlcm4gPT09IG51bGwpIHtcbiAgICBpZiAodmFsdWUgPT09IG51bGwpXG4gICAgICByZXR1cm47XG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgbnVsbCwgZ290IFwiICsgSlNPTi5zdHJpbmdpZnkodmFsdWUpKTtcbiAgfVxuXG4gIC8vIE1hdGNoLkludGVnZXIgaXMgc3BlY2lhbCB0eXBlIGVuY29kZWQgd2l0aCBhcnJheVxuICBpZiAocGF0dGVybiA9PT0gTWF0Y2guSW50ZWdlcikge1xuICAgIC8vIFRoZXJlIGlzIG5vIGNvbnNpc3RlbnQgYW5kIHJlbGlhYmxlIHdheSB0byBjaGVjayBpZiB2YXJpYWJsZSBpcyBhIDY0LWJpdFxuICAgIC8vIGludGVnZXIuIE9uZSBvZiB0aGUgcG9wdWxhciBzb2x1dGlvbnMgaXMgdG8gZ2V0IHJlbWluZGVyIG9mIGRpdmlzaW9uIGJ5IDFcbiAgICAvLyBidXQgdGhpcyBtZXRob2QgZmFpbHMgb24gcmVhbGx5IGxhcmdlIGZsb2F0cyB3aXRoIGJpZyBwcmVjaXNpb24uXG4gICAgLy8gRS5nLjogMS4zNDgxOTIzMDg0OTE4MjRlKzIzICUgMSA9PT0gMCBpbiBWOFxuICAgIC8vIEJpdHdpc2Ugb3BlcmF0b3JzIHdvcmsgY29uc2lzdGFudGx5IGJ1dCBhbHdheXMgY2FzdCB2YXJpYWJsZSB0byAzMi1iaXRcbiAgICAvLyBzaWduZWQgaW50ZWdlciBhY2NvcmRpbmcgdG8gSmF2YVNjcmlwdCBzcGVjcy5cbiAgICBpZiAodHlwZW9mIHZhbHVlID09PSBcIm51bWJlclwiICYmICh2YWx1ZSB8IDApID09PSB2YWx1ZSlcbiAgICAgIHJldHVyblxuICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIEludGVnZXIsIGdvdCBcIlxuICAgICAgICAgICAgICAgICsgKHZhbHVlIGluc3RhbmNlb2YgT2JqZWN0ID8gSlNPTi5zdHJpbmdpZnkodmFsdWUpIDogdmFsdWUpKTtcbiAgfVxuXG4gIC8vIFwiT2JqZWN0XCIgaXMgc2hvcnRoYW5kIGZvciBNYXRjaC5PYmplY3RJbmNsdWRpbmcoe30pO1xuICBpZiAocGF0dGVybiA9PT0gT2JqZWN0KVxuICAgIHBhdHRlcm4gPSBNYXRjaC5PYmplY3RJbmNsdWRpbmcoe30pO1xuXG4gIC8vIEFycmF5IChjaGVja2VkIEFGVEVSIEFueSwgd2hpY2ggaXMgaW1wbGVtZW50ZWQgYXMgYW4gQXJyYXkpLlxuICBpZiAocGF0dGVybiBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgaWYgKHBhdHRlcm4ubGVuZ3RoICE9PSAxKVxuICAgICAgdGhyb3cgRXJyb3IoXCJCYWQgcGF0dGVybjogYXJyYXlzIG11c3QgaGF2ZSBvbmUgdHlwZSBlbGVtZW50XCIgK1xuICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkocGF0dGVybikpO1xuICAgIGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIGFycmF5LCBnb3QgXCIgKyBKU09OLnN0cmluZ2lmeSh2YWx1ZSkpO1xuICAgIH1cblxuICAgIHZhbHVlLmZvckVhY2goZnVuY3Rpb24gKHZhbHVlRWxlbWVudCwgaW5kZXgpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNoZWNrU3VidHJlZSh2YWx1ZUVsZW1lbnQsIHBhdHRlcm5bMF0pO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIGlmIChlcnIgaW5zdGFuY2VvZiBNYXRjaC5FcnJvcikge1xuICAgICAgICAgIGVyci5wYXRoID0gX3ByZXBlbmRQYXRoKGluZGV4LCBlcnIucGF0aCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIEFyYml0cmFyeSB2YWxpZGF0aW9uIGNoZWNrcy4gVGhlIGNvbmRpdGlvbiBjYW4gcmV0dXJuIGZhbHNlIG9yIHRocm93IGFcbiAgLy8gTWF0Y2guRXJyb3IgKGllLCBpdCBjYW4gaW50ZXJuYWxseSB1c2UgY2hlY2soKSkgdG8gZmFpbC5cbiAgaWYgKHBhdHRlcm4gaW5zdGFuY2VvZiBXaGVyZSkge1xuICAgIGlmIChwYXR0ZXJuLmNvbmRpdGlvbih2YWx1ZSkpXG4gICAgICByZXR1cm47XG4gICAgLy8gWFhYIHRoaXMgZXJyb3IgaXMgdGVycmlibGVcbiAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJGYWlsZWQgTWF0Y2guV2hlcmUgdmFsaWRhdGlvblwiKTtcbiAgfVxuXG5cbiAgaWYgKHBhdHRlcm4gaW5zdGFuY2VvZiBPcHRpb25hbClcbiAgICBwYXR0ZXJuID0gTWF0Y2guT25lT2YodW5kZWZpbmVkLCBwYXR0ZXJuLnBhdHRlcm4pO1xuXG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgT25lT2YpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhdHRlcm4uY2hvaWNlcy5sZW5ndGg7ICsraSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY2hlY2tTdWJ0cmVlKHZhbHVlLCBwYXR0ZXJuLmNob2ljZXNbaV0pO1xuICAgICAgICAvLyBObyBlcnJvcj8gWWF5LCByZXR1cm4uXG4gICAgICAgIHJldHVybjtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAvLyBPdGhlciBlcnJvcnMgc2hvdWxkIGJlIHRocm93bi4gTWF0Y2ggZXJyb3JzIGp1c3QgbWVhbiB0cnkgYW5vdGhlclxuICAgICAgICAvLyBjaG9pY2UuXG4gICAgICAgIGlmICghKGVyciBpbnN0YW5jZW9mIE1hdGNoLkVycm9yKSlcbiAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIFhYWCB0aGlzIGVycm9yIGlzIHRlcnJpYmxlXG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRmFpbGVkIE1hdGNoLk9uZU9mIG9yIE1hdGNoLk9wdGlvbmFsIHZhbGlkYXRpb25cIik7XG4gIH1cblxuICAvLyBBIGZ1bmN0aW9uIHRoYXQgaXNuJ3Qgc29tZXRoaW5nIHdlIHNwZWNpYWwtY2FzZSBpcyBhc3N1bWVkIHRvIGJlIGFcbiAgLy8gY29uc3RydWN0b3IuXG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBwYXR0ZXJuKVxuICAgICAgcmV0dXJuO1xuICAgIC8vIFhYWCB3aGF0IGlmIC5uYW1lIGlzbid0IGRlZmluZWRcbiAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJFeHBlY3RlZCBcIiArIHBhdHRlcm4uY29uc3RydWN0b3IubmFtZSk7XG4gIH1cblxuICB2YXIgdW5rbm93bktleXNBbGxvd2VkID0gZmFsc2U7XG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgT2JqZWN0SW5jbHVkaW5nKSB7XG4gICAgdW5rbm93bktleXNBbGxvd2VkID0gdHJ1ZTtcbiAgICBwYXR0ZXJuID0gcGF0dGVybi5wYXR0ZXJuO1xuICB9XG5cbiAgaWYgKHBhdHRlcm4gaW5zdGFuY2VvZiBPYmplY3RIYXNoKSB7XG4gICAgdmFyIGtleVBhdHRlcm4gPSBwYXR0ZXJuLnBhdHRlcm47XG4gICAgdmFyIGVtcHR5SGFzaCA9IHRydWU7XG4gICAgZm9yICh2YXIga2V5IGluIHZhbHVlKSB7XG4gICAgICBlbXB0eUhhc2ggPSBmYWxzZTtcbiAgICAgIGNoZWNrKHZhbHVlW2tleV0sIGtleVBhdHRlcm4pO1xuICAgIH1cbiAgICBpZiAoZW1wdHlIYXNoKVxuICAgICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgXCIgKyBwYXR0ZXJuLmNvbnN0cnVjdG9yLm5hbWUpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgU3ViY2xhc3MpIHtcbiAgICB2YXIgU3VwZXJjbGFzcyA9IHBhdHRlcm4uU3VwZXJjbGFzcztcbiAgICBpZiAocGF0dGVybi5tYXRjaFN1cGVyY2xhc3MgJiYgdmFsdWUgPT0gU3VwZXJjbGFzcykgXG4gICAgICByZXR1cm47XG4gICAgaWYgKCEgKHZhbHVlLnByb3RvdHlwZSBpbnN0YW5jZW9mIFN1cGVyY2xhc3MpKVxuICAgICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgXCIgKyBwYXR0ZXJuLmNvbnN0cnVjdG9yLm5hbWUgKyBcIiBvZiBcIiArIFN1cGVyY2xhc3MubmFtZSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBwYXR0ZXJuICE9PSBcIm9iamVjdFwiKVxuICAgIHRocm93IEVycm9yKFwiQmFkIHBhdHRlcm46IHVua25vd24gcGF0dGVybiB0eXBlXCIpO1xuXG4gIC8vIEFuIG9iamVjdCwgd2l0aCByZXF1aXJlZCBhbmQgb3B0aW9uYWwga2V5cy4gTm90ZSB0aGF0IHRoaXMgZG9lcyBOT1QgZG9cbiAgLy8gc3RydWN0dXJhbCBtYXRjaGVzIGFnYWluc3Qgb2JqZWN0cyBvZiBzcGVjaWFsIHR5cGVzIHRoYXQgaGFwcGVuIHRvIG1hdGNoXG4gIC8vIHRoZSBwYXR0ZXJuOiB0aGlzIHJlYWxseSBuZWVkcyB0byBiZSBhIHBsYWluIG9sZCB7T2JqZWN0fSFcbiAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ29iamVjdCcpXG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgb2JqZWN0LCBnb3QgXCIgKyB0eXBlb2YgdmFsdWUpO1xuICBpZiAodmFsdWUgPT09IG51bGwpXG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgb2JqZWN0LCBnb3QgbnVsbFwiKTtcblxuICB2YXIgcmVxdWlyZWRQYXR0ZXJucyA9IHt9O1xuICB2YXIgb3B0aW9uYWxQYXR0ZXJucyA9IHt9O1xuXG4gIF8uZWFjaEtleShwYXR0ZXJuLCBmdW5jdGlvbihzdWJQYXR0ZXJuLCBrZXkpIHtcbiAgICBpZiAocGF0dGVybltrZXldIGluc3RhbmNlb2YgT3B0aW9uYWwpXG4gICAgICBvcHRpb25hbFBhdHRlcm5zW2tleV0gPSBwYXR0ZXJuW2tleV0ucGF0dGVybjtcbiAgICBlbHNlXG4gICAgICByZXF1aXJlZFBhdHRlcm5zW2tleV0gPSBwYXR0ZXJuW2tleV07XG4gIH0sIHRoaXMsIHRydWUpO1xuXG4gIF8uZWFjaEtleSh2YWx1ZSwgZnVuY3Rpb24oc3ViVmFsdWUsIGtleSkge1xuICAgIHZhciBzdWJWYWx1ZSA9IHZhbHVlW2tleV07XG4gICAgdHJ5IHtcbiAgICAgIGlmIChyZXF1aXJlZFBhdHRlcm5zLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgY2hlY2tTdWJ0cmVlKHN1YlZhbHVlLCByZXF1aXJlZFBhdHRlcm5zW2tleV0pO1xuICAgICAgICBkZWxldGUgcmVxdWlyZWRQYXR0ZXJuc1trZXldO1xuICAgICAgfSBlbHNlIGlmIChvcHRpb25hbFBhdHRlcm5zLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgY2hlY2tTdWJ0cmVlKHN1YlZhbHVlLCBvcHRpb25hbFBhdHRlcm5zW2tleV0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKCF1bmtub3duS2V5c0FsbG93ZWQpXG4gICAgICAgICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiVW5rbm93biBrZXlcIik7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBpZiAoZXJyIGluc3RhbmNlb2YgTWF0Y2guRXJyb3IpXG4gICAgICAgIGVyci5wYXRoID0gX3ByZXBlbmRQYXRoKGtleSwgZXJyLnBhdGgpO1xuICAgICAgdGhyb3cgZXJyO1xuICAgIH1cbiAgfSwgdGhpcywgdHJ1ZSk7XG5cbiAgXy5lYWNoS2V5KHJlcXVpcmVkUGF0dGVybnMsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJNaXNzaW5nIGtleSAnXCIgKyBrZXkgKyBcIidcIik7XG4gIH0sIHRoaXMsIHRydWUpO1xufTtcblxuXG52YXIgX2pzS2V5d29yZHMgPSBbXCJkb1wiLCBcImlmXCIsIFwiaW5cIiwgXCJmb3JcIiwgXCJsZXRcIiwgXCJuZXdcIiwgXCJ0cnlcIiwgXCJ2YXJcIiwgXCJjYXNlXCIsXG4gIFwiZWxzZVwiLCBcImVudW1cIiwgXCJldmFsXCIsIFwiZmFsc2VcIiwgXCJudWxsXCIsIFwidGhpc1wiLCBcInRydWVcIiwgXCJ2b2lkXCIsIFwid2l0aFwiLFxuICBcImJyZWFrXCIsIFwiY2F0Y2hcIiwgXCJjbGFzc1wiLCBcImNvbnN0XCIsIFwic3VwZXJcIiwgXCJ0aHJvd1wiLCBcIndoaWxlXCIsIFwieWllbGRcIixcbiAgXCJkZWxldGVcIiwgXCJleHBvcnRcIiwgXCJpbXBvcnRcIiwgXCJwdWJsaWNcIiwgXCJyZXR1cm5cIiwgXCJzdGF0aWNcIiwgXCJzd2l0Y2hcIixcbiAgXCJ0eXBlb2ZcIiwgXCJkZWZhdWx0XCIsIFwiZXh0ZW5kc1wiLCBcImZpbmFsbHlcIiwgXCJwYWNrYWdlXCIsIFwicHJpdmF0ZVwiLCBcImNvbnRpbnVlXCIsXG4gIFwiZGVidWdnZXJcIiwgXCJmdW5jdGlvblwiLCBcImFyZ3VtZW50c1wiLCBcImludGVyZmFjZVwiLCBcInByb3RlY3RlZFwiLCBcImltcGxlbWVudHNcIixcbiAgXCJpbnN0YW5jZW9mXCJdO1xuXG4vLyBBc3N1bWVzIHRoZSBiYXNlIG9mIHBhdGggaXMgYWxyZWFkeSBlc2NhcGVkIHByb3Blcmx5XG4vLyByZXR1cm5zIGtleSArIGJhc2VcbmZ1bmN0aW9uIF9wcmVwZW5kUGF0aChrZXksIGJhc2UpIHtcbiAgaWYgKCh0eXBlb2Yga2V5KSA9PT0gXCJudW1iZXJcIiB8fCBrZXkubWF0Y2goL15bMC05XSskLykpXG4gICAga2V5ID0gXCJbXCIgKyBrZXkgKyBcIl1cIjtcbiAgZWxzZSBpZiAoIWtleS5tYXRjaCgvXlthLXpfJF1bMC05YS16XyRdKiQvaSkgfHwgX2pzS2V5d29yZHMuaW5kZXhPZihrZXkpICE9IC0xKVxuICAgIGtleSA9IEpTT04uc3RyaW5naWZ5KFtrZXldKTtcblxuICBpZiAoYmFzZSAmJiBiYXNlWzBdICE9PSBcIltcIilcbiAgICByZXR1cm4ga2V5ICsgJy4nICsgYmFzZTtcbiAgcmV0dXJuIGtleSArIGJhc2U7XG59O1xuXG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgnbW9sLXByb3RvJyk7XG5cblxuLy8gbW9kdWxlIGV4cG9ydHMgZXJyb3IgY2xhc3NlcyBmb3IgYWxsIG5hbWVzIGRlZmluZWQgaW4gdGhpcyBhcnJheVxudmFyIGVycm9yQ2xhc3NOYW1lcyA9IFsnQWJzdHJhY3RDbGFzcycsICdNaXhpbicsICdNZXNzZW5nZXInLCAnQ29tcG9uZW50RGF0YVNvdXJjZScsXG5cdFx0XHRcdFx0ICAgJ0F0dHJpYnV0ZScsICdCaW5kZXInLCAnTG9hZGVyJywgJ01haWxNZXNzYWdlU291cmNlJywgJ0ZhY2V0J107XG5cbnZhciBlcnJvciA9IHtcblx0dG9CZUltcGxlbWVudGVkOiB0b0JlSW1wbGVtZW50ZWQsXG5cdGNyZWF0ZUNsYXNzOiBjcmVhdGVFcnJvckNsYXNzXG59O1xuXG5lcnJvckNsYXNzTmFtZXMuZm9yRWFjaChmdW5jdGlvbihuYW1lKSB7XG5cdGVycm9yW25hbWVdID0gY3JlYXRlRXJyb3JDbGFzcyhuYW1lICsgJ0Vycm9yJyk7XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBlcnJvcjtcblxuXG5mdW5jdGlvbiBjcmVhdGVFcnJvckNsYXNzKGVycm9yQ2xhc3NOYW1lKSB7XG5cdHZhciBFcnJvckNsYXNzO1xuXHRldmFsKCdFcnJvckNsYXNzID0gZnVuY3Rpb24gJyArIGVycm9yQ2xhc3NOYW1lICsgJyhtZXNzYWdlKSB7IFxcXG5cdFx0XHR0aGlzLm5hbWUgPSBcIicgKyBlcnJvckNsYXNzTmFtZSArICdcIjsgXFxcblx0XHRcdHRoaXMubWVzc2FnZSA9IG1lc3NhZ2UgfHwgXCJUaGVyZSB3YXMgYW4gZXJyb3JcIjsgXFxcblx0XHR9Jyk7XG5cdF8ubWFrZVN1YmNsYXNzKEVycm9yQ2xhc3MsIEVycm9yKTtcblxuXHRyZXR1cm4gRXJyb3JDbGFzcztcbn1cblxuXG5mdW5jdGlvbiB0b0JlSW1wbGVtZW50ZWQoKSB7XG5cdHRocm93IG5ldyBlcnJvci5BYnN0cmFjdENsYXNzKCdjYWxsaW5nIHRoZSBtZXRob2Qgb2YgYW4gYWJzY3RyYWN0IGNsYXNzIE1lc3NhZ2VTb3VyY2UnKTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWwgPSB7XG5cdGxvZ2dlcjogcmVxdWlyZSgnLi9sb2dnZXInKSxcblx0cmVxdWVzdDogcmVxdWlyZSgnLi9yZXF1ZXN0JyksXG5cdGNoZWNrOiByZXF1aXJlKCcuL2NoZWNrJyksXG5cdGVycm9yOiByZXF1aXJlKCcuL2Vycm9yJylcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gdXRpbDtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIExvZ2dlciA9IHJlcXVpcmUoJy4vbG9nZ2VyX2NsYXNzJyk7XG5cbnZhciBsb2dnZXIgPSBuZXcgTG9nZ2VyKHsgbGV2ZWw6IDMgfSk7XG5cbm1vZHVsZS5leHBvcnRzID0gbG9nZ2VyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpO1xuXG5cbi8qKlxuICogTG9nIGxldmVscy5cbiAqL1xuXG52YXIgbGV2ZWxzID0gW1xuICAgICdlcnJvcicsXG4gICAgJ3dhcm4nLFxuICAgICdpbmZvJyxcbiAgICAnZGVidWcnXG5dO1xuXG52YXIgbWF4TGV2ZWxMZW5ndGggPSBNYXRoLm1heC5hcHBseShNYXRoLCBsZXZlbHMubWFwKGZ1bmN0aW9uKGxldmVsKSB7IHJldHVybiBsZXZlbC5sZW5ndGg7IH0pKTtcblxuLyoqXG4gKiBDb2xvcnMgZm9yIGxvZyBsZXZlbHMuXG4gKi9cblxudmFyIGNvbG9ycyA9IFtcbiAgICAzMSxcbiAgICAzMyxcbiAgICAzNixcbiAgICA5MFxuXTtcblxuLyoqXG4gKiBQYWRzIHRoZSBuaWNlIG91dHB1dCB0byB0aGUgbG9uZ2VzdCBsb2cgbGV2ZWwuXG4gKi9cblxuZnVuY3Rpb24gcGFkIChzdHIpIHtcbiAgICBpZiAoc3RyLmxlbmd0aCA8IG1heExldmVsTGVuZ3RoKVxuICAgICAgICByZXR1cm4gc3RyICsgbmV3IEFycmF5KG1heExldmVsTGVuZ3RoIC0gc3RyLmxlbmd0aCArIDEpLmpvaW4oJyAnKTtcblxuICAgIHJldHVybiBzdHI7XG59O1xuXG4vKipcbiAqIExvZ2dlciAoY29uc29sZSkuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG52YXIgTG9nZ2VyID0gZnVuY3Rpb24gKG9wdHMpIHtcbiAgICBvcHRzID0gb3B0cyB8fCB7fVxuICAgIHRoaXMuY29sb3JzID0gb3B0cy5jb2xvcnM7XG4gICAgdGhpcy5sZXZlbCA9IG9wdHMubGV2ZWwgfHwgMztcbiAgICB0aGlzLmVuYWJsZWQgPSBvcHRzLmVuYWJsZWQgfHwgdHJ1ZTtcbiAgICB0aGlzLmxvZ1ByZWZpeCA9IG9wdHMubG9nUHJlZml4IHx8ICcnO1xuICAgIHRoaXMubG9nUHJlZml4Q29sb3IgPSBvcHRzLmxvZ1ByZWZpeENvbG9yO1xufTtcblxuXG4vKipcbiAqIExvZyBtZXRob2QuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5Mb2dnZXIucHJvdG90eXBlLmxvZyA9IGZ1bmN0aW9uICh0eXBlKSB7XG4gICAgdmFyIGluZGV4ID0gbGV2ZWxzLmluZGV4T2YodHlwZSk7XG5cbiAgICBpZiAoaW5kZXggPiB0aGlzLmxldmVsIHx8ICEgdGhpcy5lbmFibGVkKVxuICAgICAgICByZXR1cm4gdGhpcztcblxuICAgIGNvbnNvbGUubG9nLmFwcGx5KFxuICAgICAgICAgIGNvbnNvbGVcbiAgICAgICAgLCBbdGhpcy5sb2dQcmVmaXhDb2xvclxuICAgICAgICAgICAgID8gJyAgIFxceDFCWycgKyB0aGlzLmxvZ1ByZWZpeENvbG9yICsgJ20nICsgdGhpcy5sb2dQcmVmaXggKyAnICAtXFx4MUJbMzltJ1xuICAgICAgICAgICAgIDogdGhpcy5sb2dQcmVmaXhcbiAgICAgICAgICAsdGhpcy5jb2xvcnNcbiAgICAgICAgICAgICA/ICcgXFx4MUJbJyArIGNvbG9yc1tpbmRleF0gKyAnbScgKyBwYWQodHlwZSkgKyAnIC1cXHgxQlszOW0nXG4gICAgICAgICAgICAgOiB0eXBlICsgJzonXG4gICAgICAgICAgXS5jb25jYXQoXy50b0FycmF5KGFyZ3VtZW50cykuc2xpY2UoMSkpXG4gICAgKTtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBHZW5lcmF0ZSBtZXRob2RzLlxuICovXG5cbmxldmVscy5mb3JFYWNoKGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgTG9nZ2VyLnByb3RvdHlwZVtuYW1lXSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5sb2cuYXBwbHkodGhpcywgW25hbWVdLmNvbmNhdChfLnRvQXJyYXkoYXJndW1lbnRzKSkpO1xuICAgIH07XG59KTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IExvZ2dlcjtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKTtcblxubW9kdWxlLmV4cG9ydHMgPSByZXF1ZXN0O1xuXG5cbi8vIFRPRE8gYWRkIGVycm9yIHN0YXR1c2VzXG52YXIgb2tTdGF0dXNlcyA9IFsnMjAwJywgJzMwNCddO1xuXG5cbmZ1bmN0aW9uIHJlcXVlc3QodXJsLCBvcHRzLCBjYWxsYmFjaykge1xuXHR2YXIgcmVxID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cdHJlcS5vcGVuKG9wdHMubWV0aG9kLCB1cmwsIHRydWUpOyAvLyB3aGF0IHRydWUgbWVhbnM/XG5cdHJlcS5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG5cdFx0aWYgKHJlcS5yZWFkeVN0YXRlID09IDQgJiYgcmVxLnN0YXR1c1RleHQudG9VcHBlckNhc2UoKSA9PSAnT0snIClcblx0XHRcdGNhbGxiYWNrKG51bGwsIHJlcS5yZXNwb25zZVRleHQsIHJlcSk7XG5cdFx0Ly8gZWxzZVxuXHRcdC8vIFx0Y2FsbGJhY2socmVxLnN0YXR1cywgcmVxLnJlc3BvbnNlVGV4dCwgcmVxKTtcblx0fTtcblx0cmVxLnNlbmQobnVsbCk7XG59XG5cbl8uZXh0ZW5kKHJlcXVlc3QsIHtcblx0Z2V0OiBnZXRcbn0pO1xuXG5cbmZ1bmN0aW9uIGdldCh1cmwsIGNhbGxiYWNrKSB7XG5cdHJlcXVlc3QodXJsLCB7IG1ldGhvZDogJ0dFVCcgfSwgY2FsbGJhY2spO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXztcbnZhciBwcm90byA9IF8gPSB7XG5cdGV4dGVuZFByb3RvOiBleHRlbmRQcm90byxcblx0Y3JlYXRlU3ViY2xhc3M6IGNyZWF0ZVN1YmNsYXNzLFxuXHRtYWtlU3ViY2xhc3M6IG1ha2VTdWJjbGFzcyxcblx0ZXh0ZW5kOiBleHRlbmQsXG5cdGNsb25lOiBjbG9uZSxcblx0ZGVlcEV4dGVuZDogZGVlcEV4dGVuZCxcblx0YWxsS2V5czogT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMuYmluZChPYmplY3QpLFxuXHRrZXlPZjoga2V5T2YsXG5cdGFsbEtleXNPZjogYWxsS2V5c09mLFxuXHRlYWNoS2V5OiBlYWNoS2V5LFxuXHRtYXBLZXlzOiBtYXBLZXlzLFxuXHRhcHBlbmRBcnJheTogYXBwZW5kQXJyYXksXG5cdHByZXBlbmRBcnJheTogcHJlcGVuZEFycmF5LFxuXHR0b0FycmF5OiB0b0FycmF5LFxuXHRmaXJzdFVwcGVyQ2FzZTogZmlyc3RVcHBlckNhc2UsXG5cdGZpcnN0TG93ZXJDYXNlOiBmaXJzdExvd2VyQ2FzZVxufTtcblxuXG5pZiAodHlwZW9mIHdpbmRvdyA9PSAnb2JqZWN0Jykge1xuXHQvLyBwcmVzZXJ2ZSBleGlzdGluZyBfIG9iamVjdFxuXHRpZiAod2luZG93Ll8pXG5cdFx0cHJvdG8udW5kZXJzY29yZSA9IHdpbmRvdy5fXG5cblx0Ly8gZXhwb3NlIGdsb2JhbCBfXG5cdHdpbmRvdy5fID0gcHJvdG87XG59XG5cbmlmICh0eXBlb2YgbW9kdWxlID09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKVxuXHQvLyBleHBvcnQgZm9yIG5vZGUvYnJvd3NlcmlmeVxuXHRtb2R1bGUuZXhwb3J0cyA9IHByb3RvO1xuXHRcblxuZnVuY3Rpb24gZXh0ZW5kUHJvdG8oc2VsZiwgbWV0aG9kcykge1xuXHR2YXIgcHJvcERlc2NyaXB0b3JzID0ge307XG5cblx0Xy5lYWNoS2V5KG1ldGhvZHMsIGZ1bmN0aW9uKG1ldGhvZCwgbmFtZSkge1xuXHRcdHByb3BEZXNjcmlwdG9yc1tuYW1lXSA9IHtcblx0XHRcdGVudW1lcmFibGU6IGZhbHNlLFxuXHRcdFx0Y29uZmlndXJhYmxlOiBmYWxzZSxcblx0XHRcdHdyaXRhYmxlOiBmYWxzZSxcblx0XHRcdHZhbHVlOiBtZXRob2Rcblx0XHR9O1xuXHR9KTtcblxuXHRPYmplY3QuZGVmaW5lUHJvcGVydGllcyhzZWxmLnByb3RvdHlwZSwgcHJvcERlc2NyaXB0b3JzKTtcblx0cmV0dXJuIHNlbGY7XG59XG5cblxuZnVuY3Rpb24gZXh0ZW5kKHNlbGYsIG9iaiwgb25seUVudW1lcmFibGUpIHtcblx0dmFyIHByb3BEZXNjcmlwdG9ycyA9IHt9O1xuXG5cdF8uZWFjaEtleShvYmosIGZ1bmN0aW9uKHZhbHVlLCBwcm9wKSB7XG5cdFx0dmFyIGRlc2NyaXB0b3IgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG9iaiwgcHJvcCk7XG5cdFx0cHJvcERlc2NyaXB0b3JzW3Byb3BdID0gZGVzY3JpcHRvcjtcblx0fSwgdGhpcywgb25seUVudW1lcmFibGUpO1xuXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHNlbGYsIHByb3BEZXNjcmlwdG9ycyk7XG5cblx0cmV0dXJuIHNlbGY7XG59XG5cblxuZnVuY3Rpb24gZGVlcEV4dGVuZChzZWxmLCBvYmosIG9ubHlFbnVtZXJhYmxlKSB7XG5cdHJldHVybiBfZXh0ZW5kVHJlZShzZWxmLCBvYmosIG9ubHlFbnVtZXJhYmxlLCBbXSk7XG59XG5cblxuZnVuY3Rpb24gX2V4dGVuZFRyZWUoc2VsZk5vZGUsIG9iak5vZGUsIG9ubHlFbnVtZXJhYmxlLCBvYmpUcmF2ZXJzZWQpIHtcblx0aWYgKG9ialRyYXZlcnNlZC5pbmRleE9mKG9iak5vZGUpID49IDApIHJldHVybjsgLy8gbm9kZSBhbHJlYWR5IHRyYXZlcnNlZFxuXHRvYmpUcmF2ZXJzZWQucHVzaChvYmpOb2RlKTtcblxuXHRfLmVhY2hLZXkob2JqTm9kZSwgZnVuY3Rpb24odmFsdWUsIHByb3ApIHtcblx0XHR2YXIgZGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Iob2JqTm9kZSwgcHJvcCk7XG5cdFx0aWYgKHR5cGVvZiB2YWx1ZSA9PSAnb2JqZWN0Jykge1xuXHRcdFx0aWYgKHNlbGZOb2RlLmhhc093blByb3BlcnR5KHByb3ApICYmIHR5cGVvZiBzZWxmTm9kZVtwcm9wXSA9PSAnb2JqZWN0Jylcblx0XHRcdFx0X2V4dGVuZFRyZWUoc2VsZk5vZGVbcHJvcF0sIHZhbHVlLCBvbmx5RW51bWVyYWJsZSwgb2JqVHJhdmVyc2VkKVxuXHRcdFx0ZWxzZVxuXHRcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoc2VsZk5vZGUsIHByb3AsIGRlc2NyaXB0b3IpO1xuXHRcdH0gZWxzZVxuXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHNlbGZOb2RlLCBwcm9wLCBkZXNjcmlwdG9yKTtcblx0fSwgdGhpcywgb25seUVudW1lcmFibGUpO1xuXG5cdHJldHVybiBzZWxmTm9kZTtcbn1cblxuXG5mdW5jdGlvbiBjbG9uZShvYmopIHtcblx0dmFyIGNsb25lZE9iamVjdCA9IE9iamVjdC5jcmVhdGUob2JqLmNvbnN0cnVjdG9yLnByb3RvdHlwZSk7XG5cdF8uZXh0ZW5kKGNsb25lZE9iamVjdCwgb2JqKTtcblx0cmV0dXJuIGNsb25lZE9iamVjdDtcbn1cblxuXG5mdW5jdGlvbiBjcmVhdGVTdWJjbGFzcyh0aGlzQ2xhc3MsIG5hbWUsIGFwcGx5Q29uc3RydWN0b3IpIHtcblx0dmFyIHN1YmNsYXNzO1xuXG5cdC8vIG5hbWUgaXMgb3B0aW9uYWxcblx0bmFtZSA9IG5hbWUgfHwgJyc7XG5cblx0Ly8gYXBwbHkgc3VwZXJjbGFzcyBjb25zdHJ1Y3RvclxuXHR2YXIgY29uc3RydWN0b3JDb2RlID0gYXBwbHlDb25zdHJ1Y3RvciA9PT0gZmFsc2Vcblx0XHRcdD8gJydcblx0XHRcdDogJ3RoaXNDbGFzcy5hcHBseSh0aGlzLCBhcmd1bWVudHMpOyc7XG5cblx0ZXZhbCgnc3ViY2xhc3MgPSBmdW5jdGlvbiAnICsgbmFtZSArICcoKXsgJyArIGNvbnN0cnVjdG9yQ29kZSArICcgfScpO1xuXG5cdF8ubWFrZVN1YmNsYXNzKHN1YmNsYXNzLCB0aGlzQ2xhc3MpO1xuXG5cdC8vIGNvcHkgY2xhc3MgbWV0aG9kc1xuXHQvLyAtIGZvciB0aGVtIHRvIHdvcmsgY29ycmVjdGx5IHRoZXkgc2hvdWxkIG5vdCBleHBsaWN0bHkgdXNlIHN1cGVyY2xhc3MgbmFtZVxuXHQvLyBhbmQgdXNlIFwidGhpc1wiIGluc3RlYWRcblx0Xy5leHRlbmQoc3ViY2xhc3MsIHRoaXNDbGFzcywgdHJ1ZSk7XG5cblx0cmV0dXJuIHN1YmNsYXNzO1xufVxuXG5cbmZ1bmN0aW9uIG1ha2VTdWJjbGFzcyh0aGlzQ2xhc3MsIFN1cGVyY2xhc3MpIHtcblx0Ly8gcHJvdG90eXBlIGNoYWluXG5cdHRoaXNDbGFzcy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFN1cGVyY2xhc3MucHJvdG90eXBlKTtcblx0XG5cdC8vIHN1YmNsYXNzIGlkZW50aXR5XG5cdF8uZXh0ZW5kUHJvdG8odGhpc0NsYXNzLCB7XG5cdFx0Y29uc3RydWN0b3I6IHRoaXNDbGFzc1xuXHR9KTtcblx0cmV0dXJuIHRoaXNDbGFzcztcbn1cblxuXG5mdW5jdGlvbiBrZXlPZihzZWxmLCBzZWFyY2hFbGVtZW50LCBvbmx5RW51bWVyYWJsZSkge1xuXHR2YXIgcHJvcGVydGllcyA9IG9ubHlFbnVtZXJhYmxlIFxuXHRcdFx0XHRcdFx0PyBPYmplY3Qua2V5cyhzZWxmKVxuXHRcdFx0XHRcdFx0OiBfLmFsbEtleXMoc2VsZik7XG5cblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wZXJ0aWVzLmxlbmd0aDsgaSsrKVxuXHRcdGlmIChzZWFyY2hFbGVtZW50ID09PSBzZWxmW3Byb3BlcnRpZXNbaV1dKVxuXHRcdFx0cmV0dXJuIHByb3BlcnRpZXNbaV07XG5cdFxuXHRyZXR1cm4gdW5kZWZpbmVkO1xufVxuXG5cbmZ1bmN0aW9uIGFsbEtleXNPZihzZWxmLCBzZWFyY2hFbGVtZW50LCBvbmx5RW51bWVyYWJsZSkge1xuXHR2YXIgcHJvcGVydGllcyA9IG9ubHlFbnVtZXJhYmxlIFxuXHRcdFx0XHRcdFx0PyBPYmplY3Qua2V5cyhzZWxmKVxuXHRcdFx0XHRcdFx0OiBfLmFsbEtleXMoc2VsZik7XG5cblx0dmFyIGtleXMgPSBwcm9wZXJ0aWVzLmZpbHRlcihmdW5jdGlvbihwcm9wKSB7XG5cdFx0cmV0dXJuIHNlYXJjaEVsZW1lbnQgPT09IHNlbGZbcHJvcF07XG5cdH0pO1xuXG5cdHJldHVybiBrZXlzO1xufVxuXG5cbmZ1bmN0aW9uIGVhY2hLZXkoc2VsZiwgY2FsbGJhY2ssIHRoaXNBcmcsIG9ubHlFbnVtZXJhYmxlKSB7XG5cdHZhciBwcm9wZXJ0aWVzID0gb25seUVudW1lcmFibGUgXG5cdFx0XHRcdFx0XHQ/IE9iamVjdC5rZXlzKHNlbGYpXG5cdFx0XHRcdFx0XHQ6IF8uYWxsS2V5cyhzZWxmKTtcblxuXHRwcm9wZXJ0aWVzLmZvckVhY2goZnVuY3Rpb24ocHJvcCkge1xuXHRcdGNhbGxiYWNrLmNhbGwodGhpc0FyZywgc2VsZltwcm9wXSwgcHJvcCwgc2VsZik7XG5cdH0pO1xufVxuXG5cbmZ1bmN0aW9uIG1hcEtleXMoc2VsZiwgY2FsbGJhY2ssIHRoaXNBcmcsIG9ubHlFbnVtZXJhYmxlKSB7XG5cdHZhciBtYXBSZXN1bHQgPSB7fTtcblx0Xy5lYWNoS2V5KHNlbGYsIG1hcFByb3BlcnR5LCB0aGlzQXJnLCBvbmx5RW51bWVyYWJsZSk7XG5cdHJldHVybiBtYXBSZXN1bHQ7XG5cblx0ZnVuY3Rpb24gbWFwUHJvcGVydHkodmFsdWUsIGtleSkge1xuXHRcdHZhciBkZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihzZWxmLCBrZXkpO1xuXHRcdGlmIChkZXNjcmlwdG9yLmVudW1lcmFibGUgfHwgISBvbmx5RW51bWVyYWJsZSkge1xuXHRcdFx0ZGVzY3JpcHRvci52YWx1ZSA9IGNhbGxiYWNrLmNhbGwodGhpcywgdmFsdWUsIGtleSwgc2VsZik7XG5cdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkobWFwUmVzdWx0LCBrZXksIGRlc2NyaXB0b3IpO1xuXHRcdH1cblx0fVxufVxuXG5cbmZ1bmN0aW9uIGFwcGVuZEFycmF5KHNlbGYsIGFycmF5VG9BcHBlbmQpIHtcblx0aWYgKCEgYXJyYXlUb0FwcGVuZC5sZW5ndGgpIHJldHVybiBzZWxmO1xuXG4gICAgdmFyIGFyZ3MgPSBbc2VsZi5sZW5ndGgsIDBdLmNvbmNhdChhcnJheVRvQXBwZW5kKTtcbiAgICBBcnJheS5wcm90b3R5cGUuc3BsaWNlLmFwcGx5KHNlbGYsIGFyZ3MpO1xuXG4gICAgcmV0dXJuIHNlbGY7XG59XG5cblxuZnVuY3Rpb24gcHJlcGVuZEFycmF5KHNlbGYsIGFycmF5VG9QcmVwZW5kKSB7XG5cdGlmICghIGFycmF5VG9QcmVwZW5kLmxlbmd0aCkgcmV0dXJuIHNlbGY7XG5cbiAgICB2YXIgYXJncyA9IFswLCAwXS5jb25jYXQoYXJyYXlUb1ByZXBlbmQpO1xuICAgIEFycmF5LnByb3RvdHlwZS5zcGxpY2UuYXBwbHkoc2VsZiwgYXJncyk7XG5cbiAgICByZXR1cm4gc2VsZjtcbn1cblxuXG5mdW5jdGlvbiB0b0FycmF5KGFycmF5TGlrZSkge1xuXHR2YXIgYXJyID0gW107XG5cdEFycmF5LnByb3RvdHlwZS5mb3JFYWNoLmNhbGwoYXJyYXlMaWtlLCBmdW5jdGlvbihpdGVtKSB7XG5cdFx0YXJyLnB1c2goaXRlbSlcblx0fSk7XG5cblx0cmV0dXJuIGFycjtcbn1cblxuXG5mdW5jdGlvbiBmaXJzdFVwcGVyQ2FzZShzdHIpIHtcblx0cmV0dXJuIHN0clswXS50b1VwcGVyQ2FzZSgpICsgc3RyLnNsaWNlKDEpO1xufVxuXG5cbmZ1bmN0aW9uIGZpcnN0TG93ZXJDYXNlKHN0cikge1xuXHRyZXR1cm4gc3RyWzBdLnRvTG93ZXJDYXNlKCkgKyBzdHIuc2xpY2UoMSk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmRlc2NyaWJlKCdtaWxvIGJpbmRlcicsIGZ1bmN0aW9uKCkge1xuICAgIGl0KCdzaG91bGQgYmluZCBjb21wb25lbnRzIGJhc2VkIG9uIG1sLWJpbmQgYXR0cmlidXRlJywgZnVuY3Rpb24oKSB7XG4gICAgXHR2YXIgbWlsbyA9IHJlcXVpcmUoJy4uLy4uL2xpYi9taWxvJyk7XG5cblx0XHRleHBlY3Qoe3A6IDF9KS5wcm9wZXJ0eSgncCcsIDEpO1xuXG4gICAgXHR2YXIgY3RybCA9IG1pbG8uYmluZGVyKCk7XG5cbiAgICAgICAgY29uc29sZS5sb2coY3RybCk7XG5cbiAgICBcdGN0cmwuYXJ0aWNsZUJ1dHRvbi5ldmVudHMub24oJ2NsaWNrIG1vdXNlZW50ZXInLCBmdW5jdGlvbihlVHlwZSwgZXZ0KSB7XG4gICAgXHRcdGNvbnNvbGUubG9nKCdidXR0b24nLCBlVHlwZSwgZXZ0KTtcbiAgICBcdH0pO1xuXG4gICAgICAgIGN0cmwubWFpbi5ldmVudHMub24oJ2NsaWNrIG1vdXNlZW50ZXIgaW5wdXQga2V5cHJlc3MnLCBmdW5jdGlvbihlVHlwZSwgZXZ0KSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZGl2JywgZVR5cGUsIGV2dCk7XG4gICAgICAgIH0pO1xuXG4gICAgXHRjdHJsLmFydGljbGVJZElucHV0LmRhdGEub24oJ2RhdGFjaGFuZ2VkJywgbG9nRGF0YSk7XG5cbiAgICBcdGZ1bmN0aW9uIGxvZ0RhdGEobWVzc2FnZSwgZGF0YSkge1xuICAgIFx0XHRjb25zb2xlLmxvZyhtZXNzYWdlLCBkYXRhKTtcbiAgICBcdH1cblxuICAgICAgICB2YXIgbXlUbXBsQ29tcHMgPSBjdHJsLm15VGVtcGxhdGUudGVtcGxhdGVcbiAgICAgICAgICAgICAgICAuc2V0KCc8cCBtbC1iaW5kPVwiOmlubmVyUGFyYVwiPkkgYW0gcmVuZGVyZWQgZnJvbSB0ZW1wbGF0ZTwvcD4nKVxuICAgICAgICAgICAgICAgIC5yZW5kZXIoKVxuICAgICAgICAgICAgICAgIC5iaW5kZXIoKTtcblxuICAgICAgICBfLmV4dGVuZChjdHJsLCBteVRtcGxDb21wcyk7IC8vIHNob3VsZCBiZSBzb21lIGZ1bmN0aW9uIHRvIGFkZCB0byBjb250cm9sbGVyXG5cbiAgICAgICAgY3RybC5pbm5lclBhcmEuZWwuaW5uZXJIVE1MICs9ICcsIHRoZW4gYm91bmQgYW5kIGNoYW5nZWQgdmlhIGNvbXBvbmVudCBpbnNpZGUgdGVtcGxhdGUnO1xuICAgIH0pO1xufSk7XG4iXX0=
;