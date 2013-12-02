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

},{"../util/check":34,"../util/error":35,"mol-proto":40}],2:[function(require,module,exports){
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

},{"../util/check":34,"mol-proto":40}],3:[function(require,module,exports){
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

},{"../config":25,"../util/check":34,"../util/error":35,"./index":5,"mol-proto":40}],4:[function(require,module,exports){
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
},{"../config":25,"../util/error":35,"./index":5,"mol-proto":40}],5:[function(require,module,exports){
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

},{"../util/check":34,"../util/error":35,"mol-proto":40}],6:[function(require,module,exports){
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


},{"./attribute/a_bind":3,"./components/c_registry":23,"./mail":29,"./util/check":34,"./util/error":35,"mol-proto":40}],7:[function(require,module,exports){
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

},{"./abstract/registry":2,"./components/c_class":8,"./components/c_facet":9,"./components/c_facets/cf_registry":18,"./components/c_registry":23,"./facets/f_class":26}],8:[function(require,module,exports){
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

},{"../facets/f_object":27,"../messenger":31,"../util/check":34,"./c_facet":9,"./c_facets/cf_registry":18,"mol-proto":40}],9:[function(require,module,exports){
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

},{"../facets/f_class":26,"../messenger":31,"../util/error":35,"mol-proto":40}],10:[function(require,module,exports){
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

},{"../../binder":6,"../c_facet":9,"./cf_registry":18,"mol-proto":40}],11:[function(require,module,exports){
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

},{"../../messenger":31,"../c_facet":9,"../c_message_sources/component_data_source":19,"./cf_registry":18,"mol-proto":40}],12:[function(require,module,exports){
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


},{"../../binder":6,"../../util/check":34,"../c_facet":9,"./cf_registry":18,"mol-proto":40}],13:[function(require,module,exports){
'use strict';

var ComponentFacet = require('../c_facet')
	, facetsRegistry = require('./cf_registry')

	, _ = require('mol-proto');


// generic drag handler, should be overridden
var Drag = _.createSubclass(ComponentFacet, 'Drag');

_.extendProto(Drag, {
	init: initDragFacet,
	start: startDragFacet,
	require: ['Events'], // TODO implement facet dependencies

	setHandle: setDragHandle
	// _reattach: _reattachEventsOnElementChange
});

facetsRegistry.add(Drag);

module.exports = Drag;


function initDragFacet() {
	ComponentFacet.prototype.init.apply(this, arguments);
	this._ondragstart = this.config.ondragstart;
	this._ondrag = this.config.ondrag;
	this._ondragend = this.config.ondragstart;
}


function setDragHandle(handleEl) {
	if (! this.owner.el.contains(handleEl))
		return logger.warn('drag handle should be inside element to be dragged')
	this._dragHandle = handleEl;
}


function startDragFacet() {
	this.owner.el.setAttribute('draggable', true);

	var eventsFacet = this.owner.events;
	eventsFacet.onEvents({
		'mousedown': onMouseDown,
		'mouseenter mouseleave mousemove': onMouseMovement, 
		'dragstart': onDragStart
	});

	if (this._ondrag) eventsFacet.on('drag', this._ondrag)
	if (this._ondragend) eventsFacet.on('dragend', this._ondragend)


	var self = this;


	function onMouseDown(eventType, event) {
		self._target = event.target;
		if (targetInDragHandle(event))
			window.getSelection().empty();
	}


	function onMouseMovement(eventType, event) {
		var shouldBeDraggable = targetInDragHandle(event);
		self.owner.el.setAttribute('draggable', shouldBeDraggable);
	}


	function onDragStart(eventType, event) {
		if (targetInDragHandle(event)) {
			// event.dataTransfer.setData('text/plain', self.owner.el.innerHTML);
			event.dataTransfer.setData('text/html', self.owner.el.outerHTML);
			event.dataTransfer.setData('x-application/milo-component', self.owner);
			self._ondragstart && self._ondragstart(eventType, event);

		} else
			event.preventDefault();
	}


	function targetInDragHandle(event) {
		return ! self._dragHandle || self._dragHandle.contains(self._target);
	}
}

},{"../c_facet":9,"./cf_registry":18,"mol-proto":40}],14:[function(require,module,exports){
'use strict';

var ComponentFacet = require('../c_facet')
	, facetsRegistry = require('./cf_registry')

	, _ = require('mol-proto');


// generic drag handler, should be overridden
var Drop = _.createSubclass(ComponentFacet, 'Drop');

_.extendProto(Drop, {
	init: initDropFacet,
	start: startDropFacet,
	require: ['Events'] // TODO implement facet dependencies

	// _reattach: _reattachEventsOnElementChange
});

facetsRegistry.add(Drop);

module.exports = Drop;


function initDropFacet() {
	ComponentFacet.prototype.init.apply(this, arguments);

	this._ondragenter = this.config.ondragenter;
	this._ondragover = this.config.ondragover;
	this._ondragleave = this.config.ondragleave;
	this._ondrop = this.config.ondrop;
}


function startDropFacet() {
	var eventsFacet = this.owner.events;
	eventsFacet.on('dragenter dragover', onDragging);
	eventsFacet.on('dragenter dragover dragleave drop', callConfiguredHandler);

	var self = this;


	function callConfiguredHandler(eventType, event) {
		var handlerProperty = '_on' + eventType
			, handler = self[handlerProperty];
		if (handler)
			handler.call(self, eventType, event);
	}


	function onDragging(eventType, event) {
		var dataTypes = event.dataTransfer.types
		if (dataTypes.indexOf('text/html') >= 0
				|| dataTypes.indexOf('x-application/milo-component') >= 0)
			event.preventDefault();
	}
}
},{"../c_facet":9,"./cf_registry":18,"mol-proto":40}],15:[function(require,module,exports){
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

},{"../../messenger":31,"../c_facet":9,"../c_message_sources/dom_events_source":21,"./cf_registry":18,"mol-proto":40}],16:[function(require,module,exports){
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
},{"../../messenger":31,"../c_facet":9,"../c_message_sources/iframe_message_source":22,"./cf_registry":18,"mol-proto":40}],17:[function(require,module,exports){
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

},{"../../binder":6,"../../util/check":34,"../c_facet":9,"./cf_registry":18,"mol-proto":40}],18:[function(require,module,exports){
'use strict';

var ClassRegistry = require('../../abstract/registry')
	, ComponentFacet = require('../c_facet');

var facetsRegistry = new ClassRegistry(ComponentFacet);

facetsRegistry.add(ComponentFacet);

module.exports = facetsRegistry;

// TODO - refactor components registry test into a function
// that tests a registry with a given foundation class
// Make test for this registry based on this function
},{"../../abstract/registry":2,"../c_facet":9}],19:[function(require,module,exports){
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

},{"../../util/check":34,"../../util/error":35,"../c_class":8,"./dom_events_source":21,"mol-proto":40}],20:[function(require,module,exports){
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

},{"mol-proto":40}],21:[function(require,module,exports){
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
	this.dom().addEventListener(eventType, this, false);
}


function removeDomEventListener(eventType) {
	this.dom().removeEventListener(eventType, this, false);
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
},{"../../messenger/message_source":32,"../../util/check":34,"../c_class":8,"./dom_events_constructors":20,"mol-proto":40}],22:[function(require,module,exports){
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

},{"../../messenger/message_source":32,"../../util/check":34,"mol-proto":40}],23:[function(require,module,exports){
'use strict';

var ClassRegistry = require('../abstract/registry')
	, Component = require('./c_class');

var componentsRegistry = new ClassRegistry(Component);

componentsRegistry.add(Component);

module.exports = componentsRegistry;

},{"../abstract/registry":2,"./c_class":8}],24:[function(require,module,exports){
'use strict';

var Component = require('../c_class')
	, componentsRegistry = require('../c_registry');


var View = Component.createComponentClass('View', ['container']);

componentsRegistry.add(View);

module.exports = View;

},{"../c_class":8,"../c_registry":23}],25:[function(require,module,exports){
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

},{"mol-proto":40}],26:[function(require,module,exports){
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

},{"mol-proto":40}],27:[function(require,module,exports){
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


},{"../util/check":34,"./f_class":26,"mol-proto":40}],28:[function(require,module,exports){
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

},{"./attribute/a_load":4,"./config":25,"./mail":29,"./util/error":35,"./util/logger":37,"./util/request":39}],29:[function(require,module,exports){
'use strict';

var Messenger = require('../messenger')
	, MailMessageSource = require('./mail_source');


var mailMsgSource = new MailMessageSource();

var miloMail = new Messenger(undefined, undefined, mailMsgSource);

module.exports = miloMail;

},{"../messenger":31,"./mail_source":30}],30:[function(require,module,exports){
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

},{"../components/c_message_sources/dom_events_constructors":20,"../messenger/message_source":32,"../util/check":34,"../util/error":35,"mol-proto":40}],31:[function(require,module,exports){
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

},{"../abstract/mixin":1,"../util/check":34,"../util/error":35,"./message_source":32,"mol-proto":40}],32:[function(require,module,exports){
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

},{"../abstract/mixin":1,"../util/error":35,"../util/logger":37,"mol-proto":40}],33:[function(require,module,exports){
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
require('./components/c_facets/Drop');

// used components
require('./components/classes/View');


// export for node/browserify
if (typeof module == 'object' && module.exports)	
	module.exports = milo;

// global milo for browser
if (typeof window == 'object')
	window.milo = milo;

},{"./binder":6,"./classes":7,"./components/c_facets/Container":10,"./components/c_facets/Data":11,"./components/c_facets/Dom":12,"./components/c_facets/Drag":13,"./components/c_facets/Drop":14,"./components/c_facets/Events":15,"./components/c_facets/Frame":16,"./components/c_facets/Template":17,"./components/classes/View":24,"./config":25,"./loader":28,"./mail":29,"./util":36}],34:[function(require,module,exports){
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


},{"mol-proto":40}],35:[function(require,module,exports){
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

},{"mol-proto":40}],36:[function(require,module,exports){
'use strict';

var util = {
	logger: require('./logger'),
	request: require('./request'),
	check: require('./check'),
	error: require('./error')
};

module.exports = util;

},{"./check":34,"./error":35,"./logger":37,"./request":39}],37:[function(require,module,exports){
'use strict';

var Logger = require('./logger_class');

var logger = new Logger({ level: 3 });

module.exports = logger;

},{"./logger_class":38}],38:[function(require,module,exports){
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

},{"mol-proto":40}],39:[function(require,module,exports){
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

},{"mol-proto":40}],40:[function(require,module,exports){
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

},{}],41:[function(require,module,exports){
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

},{"../../lib/milo":33}]},{},[41])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2Fic3RyYWN0L21peGluLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9hYnN0cmFjdC9yZWdpc3RyeS5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvYXR0cmlidXRlL2FfYmluZC5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvYXR0cmlidXRlL2FfbG9hZC5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvYXR0cmlidXRlL2luZGV4LmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9iaW5kZXIuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NsYXNzZXMuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19jbGFzcy5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX2ZhY2V0LmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfZmFjZXRzL0NvbnRhaW5lci5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX2ZhY2V0cy9EYXRhLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfZmFjZXRzL0RvbS5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX2ZhY2V0cy9EcmFnLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfZmFjZXRzL0Ryb3AuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19mYWNldHMvRXZlbnRzLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfZmFjZXRzL0ZyYW1lLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfZmFjZXRzL1RlbXBsYXRlLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfZmFjZXRzL2NmX3JlZ2lzdHJ5LmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfbWVzc2FnZV9zb3VyY2VzL2NvbXBvbmVudF9kYXRhX3NvdXJjZS5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX21lc3NhZ2Vfc291cmNlcy9kb21fZXZlbnRzX2NvbnN0cnVjdG9ycy5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX21lc3NhZ2Vfc291cmNlcy9kb21fZXZlbnRzX3NvdXJjZS5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX21lc3NhZ2Vfc291cmNlcy9pZnJhbWVfbWVzc2FnZV9zb3VyY2UuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19yZWdpc3RyeS5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jbGFzc2VzL1ZpZXcuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbmZpZy5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvZmFjZXRzL2ZfY2xhc3MuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2ZhY2V0cy9mX29iamVjdC5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvbG9hZGVyLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9tYWlsL2luZGV4LmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9tYWlsL21haWxfc291cmNlLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9tZXNzZW5nZXIvaW5kZXguanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL21lc3Nlbmdlci9tZXNzYWdlX3NvdXJjZS5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvbWlsby5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvdXRpbC9jaGVjay5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvdXRpbC9lcnJvci5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvdXRpbC9pbmRleC5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvdXRpbC9sb2dnZXIuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL3V0aWwvbG9nZ2VyX2NsYXNzLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi91dGlsL3JlcXVlc3QuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbm9kZV9tb2R1bGVzL21vbC1wcm90by9saWIvcHJvdG8uanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vdGVzdF9odG1sL2JpbmRfdGVzdC9iaW5kX3Rlc3QuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25QQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbFRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDak9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpXG5cdCwgY2hlY2sgPSByZXF1aXJlKCcuLi91dGlsL2NoZWNrJylcblx0LCBNYXRjaCA9IGNoZWNrLk1hdGNoXG5cdCwgTWl4aW5FcnJvciA9IHJlcXVpcmUoJy4uL3V0aWwvZXJyb3InKS5NaXhpbjtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IE1peGluO1xuXG4vLyBhbiBhYnN0cmFjdCBjbGFzcyBmb3IgbWl4aW4gcGF0dGVybiAtIGFkZGluZyBwcm94eSBtZXRob2RzIHRvIGhvc3Qgb2JqZWN0c1xuZnVuY3Rpb24gTWl4aW4oaG9zdE9iamVjdCwgcHJveHlNZXRob2RzIC8qLCBvdGhlciBhcmdzIC0gcGFzc2VkIHRvIGluaXQgbWV0aG9kICovKSB7XG5cdC8vIFRPRE8gLSBtb2NlIGNoZWNrcyBmcm9tIE1lc3NlbmdlciBoZXJlXG5cdGNoZWNrKGhvc3RPYmplY3QsIE1hdGNoLk9wdGlvbmFsKE9iamVjdCkpO1xuXHRjaGVjayhwcm94eU1ldGhvZHMsIE1hdGNoLk9wdGlvbmFsKE1hdGNoLk9iamVjdEhhc2goU3RyaW5nKSkpO1xuXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnX2hvc3RPYmplY3QnLCB7IHZhbHVlOiBob3N0T2JqZWN0IH0pO1xuXHRpZiAocHJveHlNZXRob2RzKVxuXHRcdHRoaXMuX2NyZWF0ZVByb3h5TWV0aG9kcyhwcm94eU1ldGhvZHMpO1xuXG5cdC8vIGNhbGxpbmcgaW5pdCBpZiBpdCBpcyBkZWZpbmVkIGluIHRoZSBjbGFzc1xuXHRpZiAodGhpcy5pbml0KVxuXHRcdHRoaXMuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufVxuXG5fLmV4dGVuZFByb3RvKE1peGluLCB7XG5cdF9jcmVhdGVQcm94eU1ldGhvZDogX2NyZWF0ZVByb3h5TWV0aG9kLFxuXHRfY3JlYXRlUHJveHlNZXRob2RzOiBfY3JlYXRlUHJveHlNZXRob2RzXG59KTtcblxuXG5mdW5jdGlvbiBfY3JlYXRlUHJveHlNZXRob2QobWl4aW5NZXRob2ROYW1lLCBwcm94eU1ldGhvZE5hbWUpIHtcblx0aWYgKHRoaXMuX2hvc3RPYmplY3RbcHJveHlNZXRob2ROYW1lXSlcblx0XHR0aHJvdyBuZXcgTWl4aW5FcnJvcignbWV0aG9kICcgKyBwcm94eU1ldGhvZE5hbWUgK1xuXHRcdFx0XHRcdFx0XHRcdCAnIGFscmVhZHkgZGVmaW5lZCBpbiBob3N0IG9iamVjdCcpO1xuXG5cdGNoZWNrKHRoaXNbbWl4aW5NZXRob2ROYW1lXSwgRnVuY3Rpb24pO1xuXG5cdHZhciBib3VuZE1ldGhvZCA9IHRoaXNbbWl4aW5NZXRob2ROYW1lXS5iaW5kKHRoaXMpO1xuXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLl9ob3N0T2JqZWN0LCBwcm94eU1ldGhvZE5hbWUsXG5cdFx0eyB2YWx1ZTogYm91bmRNZXRob2QgfSk7XG59XG5cblxuZnVuY3Rpb24gX2NyZWF0ZVByb3h5TWV0aG9kcyhwcm94eU1ldGhvZHMpIHtcblx0Ly8gY3JlYXRpbmcgYW5kIGJpbmRpbmcgcHJveHkgbWV0aG9kcyBvbiB0aGUgaG9zdCBvYmplY3Rcblx0Xy5lYWNoS2V5KHByb3h5TWV0aG9kcywgX2NyZWF0ZVByb3h5TWV0aG9kLCB0aGlzKTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vdXRpbC9jaGVjaycpXG5cdCwgTWF0Y2ggPSBjaGVjay5NYXRjaDtcblxubW9kdWxlLmV4cG9ydHMgPSBDbGFzc1JlZ2lzdHJ5O1xuXG5mdW5jdGlvbiBDbGFzc1JlZ2lzdHJ5IChGb3VuZGF0aW9uQ2xhc3MpIHtcblx0aWYgKEZvdW5kYXRpb25DbGFzcylcblx0XHR0aGlzLnNldENsYXNzKEZvdW5kYXRpb25DbGFzcyk7XG5cblx0Ly8gT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdfX3JlZ2lzdGVyZWRDbGFzc2VzJywge1xuXHQvLyBcdFx0ZW51bWVyYWJsZTogZmFsc2UsXG5cdC8vIFx0XHR3cml0YWJsZTogdHJ1ZSxcblx0Ly8gXHRcdGNvbmZpZ3VyYWJsZTogdHJ1ZSxcblx0Ly8gXHRcdHZhbHVlOiB7fVxuXHQvLyB9KTtcblxuXHR0aGlzLl9fcmVnaXN0ZXJlZENsYXNzZXMgPSB7fTtcbn1cblxuXy5leHRlbmRQcm90byhDbGFzc1JlZ2lzdHJ5LCB7XG5cdGFkZDogcmVnaXN0ZXJDbGFzcyxcblx0Z2V0OiBnZXRDbGFzcyxcblx0cmVtb3ZlOiB1bnJlZ2lzdGVyQ2xhc3MsXG5cdGNsZWFuOiB1bnJlZ2lzdGVyQWxsQ2xhc3Nlcyxcblx0c2V0Q2xhc3M6IHNldEZvdW5kYXRpb25DbGFzc1xufSk7XG5cblxuZnVuY3Rpb24gc2V0Rm91bmRhdGlvbkNsYXNzKEZvdW5kYXRpb25DbGFzcykge1xuXHRjaGVjayhGb3VuZGF0aW9uQ2xhc3MsIEZ1bmN0aW9uKTtcblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdGb3VuZGF0aW9uQ2xhc3MnLCB7XG5cdFx0ZW51bWVyYWJsZTogdHJ1ZSxcblx0XHR2YWx1ZTogRm91bmRhdGlvbkNsYXNzXG5cdH0pO1xufVxuXG5mdW5jdGlvbiByZWdpc3RlckNsYXNzKGFDbGFzcywgbmFtZSkge1xuXHRuYW1lID0gbmFtZSB8fCBhQ2xhc3MubmFtZTtcblxuXHRjaGVjayhuYW1lLCBTdHJpbmcsICdjbGFzcyBuYW1lIG11c3QgYmUgc3RyaW5nJyk7XG5cdGNoZWNrKG5hbWUsIE1hdGNoLldoZXJlKGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiB0eXBlb2YgbmFtZSA9PSAnc3RyaW5nJyAmJiBuYW1lICE9ICcnO1xuXHR9KSwgJ2NsYXNzIG5hbWUgbXVzdCBiZSBzdHJpbmcnKTtcblx0aWYgKHRoaXMuRm91bmRhdGlvbkNsYXNzKSB7XG5cdFx0aWYgKGFDbGFzcyAhPSB0aGlzLkZvdW5kYXRpb25DbGFzcylcblx0XHRcdGNoZWNrKGFDbGFzcywgTWF0Y2guU3ViY2xhc3ModGhpcy5Gb3VuZGF0aW9uQ2xhc3MpLCAnY2xhc3MgbXVzdCBiZSBhIHN1YihjbGFzcykgb2YgYSBmb3VuZGF0aW9uIGNsYXNzJyk7XG5cdH0gZWxzZVxuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ2ZvdW5kYXRpb24gY2xhc3MgbXVzdCBiZSBzZXQgYmVmb3JlIGFkZGluZyBjbGFzc2VzIHRvIHJlZ2lzdHJ5Jyk7XG5cblx0aWYgKHRoaXMuX19yZWdpc3RlcmVkQ2xhc3Nlc1tuYW1lXSlcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdpcyBhbHJlYWR5IHJlZ2lzdGVyZWQnKTtcblxuXHR0aGlzLl9fcmVnaXN0ZXJlZENsYXNzZXNbbmFtZV0gPSBhQ2xhc3M7XG59O1xuXG5cbmZ1bmN0aW9uIGdldENsYXNzKG5hbWUpIHtcblx0Y2hlY2sobmFtZSwgU3RyaW5nLCAnY2xhc3MgbmFtZSBtdXN0IGJlIHN0cmluZycpO1xuXHRyZXR1cm4gdGhpcy5fX3JlZ2lzdGVyZWRDbGFzc2VzW25hbWVdO1xufTtcblxuXG5mdW5jdGlvbiB1bnJlZ2lzdGVyQ2xhc3MobmFtZU9yQ2xhc3MpIHtcblx0Y2hlY2sobmFtZU9yQ2xhc3MsIE1hdGNoLk9uZU9mKFN0cmluZywgRnVuY3Rpb24pLCAnY2xhc3Mgb3IgbmFtZSBtdXN0IGJlIHN1cHBsaWVkJyk7XG5cblx0dmFyIG5hbWUgPSB0eXBlb2YgbmFtZU9yQ2xhc3MgPT0gJ3N0cmluZydcblx0XHRcdFx0XHRcdD8gbmFtZU9yQ2xhc3Ncblx0XHRcdFx0XHRcdDogbmFtZU9yQ2xhc3MubmFtZTtcblx0XHRcdFx0XHRcdFxuXHRpZiAoISB0aGlzLl9fcmVnaXN0ZXJlZENsYXNzZXNbbmFtZV0pXG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignY2xhc3MgaXMgbm90IHJlZ2lzdGVyZWQnKTtcblxuXHRkZWxldGUgdGhpcy5fX3JlZ2lzdGVyZWRDbGFzc2VzW25hbWVdO1xufTtcblxuXG5mdW5jdGlvbiB1bnJlZ2lzdGVyQWxsQ2xhc3NlcygpIHtcblx0dGhpcy5fX3JlZ2lzdGVyZWRDbGFzc2VzID0ge307XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQXR0cmlidXRlID0gcmVxdWlyZSgnLi9pbmRleCcpXG5cdCwgQXR0cmlidXRlRXJyb3IgPSByZXF1aXJlKCcuLi91dGlsL2Vycm9yJykuQXR0cmlidXRlXG5cdCwgY29uZmlnID0gcmVxdWlyZSgnLi4vY29uZmlnJylcblx0LCBfID0gcmVxdWlyZSgnbW9sLXByb3RvJylcblx0LCBjaGVjayA9IHJlcXVpcmUoJy4uL3V0aWwvY2hlY2snKVxuXHQsIE1hdGNoID0gY2hlY2suTWF0Y2g7XG5cblxuLy8gTWF0Y2hlcztcbi8vIDpteVZpZXcgLSBvbmx5IGNvbXBvbmVudCBuYW1lXG4vLyBWaWV3Om15VmlldyAtIGNsYXNzIGFuZCBjb21wb25lbnQgbmFtZVxuLy8gW0V2ZW50cywgRGF0YV06bXlWaWV3IC0gZmFjZXRzIGFuZCBjb21wb25lbnQgbmFtZVxuLy8gVmlld1tFdmVudHNdOm15VmlldyAtIGNsYXNzLCBmYWNldChzKSBhbmQgY29tcG9uZW50IG5hbWVcblxudmFyIGF0dHJSZWdFeHA9IC9eKFteXFw6XFxbXFxdXSopKD86XFxbKFteXFw6XFxbXFxdXSopXFxdKT9cXDo/KFteOl0qKSQvXG5cdCwgZmFjZXRzU3BsaXRSZWdFeHAgPSAvXFxzKig/OlxcLHxcXHMpXFxzKi87XG5cblxudmFyIEJpbmRBdHRyaWJ1dGUgPSBfLmNyZWF0ZVN1YmNsYXNzKEF0dHJpYnV0ZSwgJ0JpbmRBdHRyaWJ1dGUnLCB0cnVlKTtcblxuXy5leHRlbmRQcm90byhCaW5kQXR0cmlidXRlLCB7XG5cdGF0dHJOYW1lOiBnZXRBdHRyaWJ1dGVOYW1lLFxuXHRwYXJzZTogcGFyc2VBdHRyaWJ1dGUsXG5cdHZhbGlkYXRlOiB2YWxpZGF0ZUF0dHJpYnV0ZVxufSk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBCaW5kQXR0cmlidXRlO1xuXG5cbmZ1bmN0aW9uIGdldEF0dHJpYnV0ZU5hbWUoKSB7XG5cdHJldHVybiBjb25maWcuYXR0cnNbJ2JpbmQnXTtcbn1cblxuXG5mdW5jdGlvbiBwYXJzZUF0dHJpYnV0ZSgpIHtcblx0aWYgKCEgdGhpcy5ub2RlKSByZXR1cm47XG5cblx0dmFyIHZhbHVlID0gdGhpcy5nZXQoKTtcblxuXHRpZiAodmFsdWUpXG5cdFx0dmFyIGJpbmRUbyA9IHZhbHVlLm1hdGNoKGF0dHJSZWdFeHApO1xuXG5cdGlmICghIGJpbmRUbylcblx0XHR0aHJvdyBuZXcgQXR0cmlidXRlRXJyb3IoJ2ludmFsaWQgYmluZCBhdHRyaWJ1dGUgJyArIHZhbHVlKTtcblxuXHR0aGlzLmNvbXBDbGFzcyA9IGJpbmRUb1sxXSB8fCAnQ29tcG9uZW50Jztcblx0dGhpcy5jb21wRmFjZXRzID0gKGJpbmRUb1syXSAmJiBiaW5kVG9bMl0uc3BsaXQoZmFjZXRzU3BsaXRSZWdFeHApKSB8fCB1bmRlZmluZWQ7XG5cdHRoaXMuY29tcE5hbWUgPSBiaW5kVG9bM10gfHwgdW5kZWZpbmVkO1xuXG5cdHJldHVybiB0aGlzO1xufVxuXG5cbmZ1bmN0aW9uIHZhbGlkYXRlQXR0cmlidXRlKCkge1xuXHR2YXIgY29tcE5hbWUgPSB0aGlzLmNvbXBOYW1lO1xuXHRjaGVjayhjb21wTmFtZSwgTWF0Y2guV2hlcmUoZnVuY3Rpb24oKSB7XG4gIFx0XHRyZXR1cm4gdHlwZW9mIGNvbXBOYW1lID09ICdzdHJpbmcnICYmIGNvbXBOYW1lICE9ICcnO1xuXHR9KSwgJ2VtcHR5IGNvbXBvbmVudCBuYW1lJyk7XG5cblx0aWYgKCEgdGhpcy5jb21wQ2xhc3MpXG5cdFx0dGhyb3cgbmV3IEF0dHJpYnV0ZUVycm9yKCdlbXB0eSBjb21wb25lbnQgY2xhc3MgbmFtZSAnICsgdGhpcy5jb21wQ2xhc3MpO1xuXG5cdHJldHVybiB0aGlzO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQXR0cmlidXRlID0gcmVxdWlyZSgnLi9pbmRleCcpXG5cdCwgQXR0cmlidXRlRXJyb3IgPSByZXF1aXJlKCcuLi91dGlsL2Vycm9yJykuQXR0cmlidXRlXG5cdCwgY29uZmlnID0gcmVxdWlyZSgnLi4vY29uZmlnJylcblx0LCBfID0gcmVxdWlyZSgnbW9sLXByb3RvJyk7XG5cblxudmFyIExvYWRBdHRyaWJ1dGUgPSBfLmNyZWF0ZVN1YmNsYXNzKEF0dHJpYnV0ZSwgJ0xvYWRBdHRyaWJ1dGUnLCB0cnVlKTtcblxuXy5leHRlbmRQcm90byhMb2FkQXR0cmlidXRlLCB7XG5cdGF0dHJOYW1lOiBnZXRBdHRyaWJ1dGVOYW1lLFxuXHRwYXJzZTogcGFyc2VBdHRyaWJ1dGUsXG5cdHZhbGlkYXRlOiB2YWxpZGF0ZUF0dHJpYnV0ZVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gTG9hZEF0dHJpYnV0ZTtcblxuXG5mdW5jdGlvbiBnZXRBdHRyaWJ1dGVOYW1lKCkge1xuXHRyZXR1cm4gY29uZmlnLmF0dHJzLmxvYWQ7XG59XG5cblxuZnVuY3Rpb24gcGFyc2VBdHRyaWJ1dGUoKSB7XG5cdGlmICghIHRoaXMubm9kZSkgcmV0dXJuO1xuXG5cdHZhciB2YWx1ZSA9IHRoaXMuZ2V0KCk7XG5cblx0dGhpcy5sb2FkVXJsID0gdmFsdWU7XG5cblx0cmV0dXJuIHRoaXM7XG59XG5cblxuZnVuY3Rpb24gdmFsaWRhdGVBdHRyaWJ1dGUoKSB7XG5cdC8vIFRPRE8gdXJsIHZhbGlkYXRpb25cblxuXHRyZXR1cm4gdGhpcztcbn0iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgnbW9sLXByb3RvJylcblx0LCBjaGVjayA9IHJlcXVpcmUoJy4uL3V0aWwvY2hlY2snKVxuXHQsIE1hdGNoID0gY2hlY2suTWF0Y2hcblx0LCB0b0JlSW1wbGVtZW50ZWQgPSByZXF1aXJlKCcuLi91dGlsL2Vycm9yJykudG9CZUltcGxlbWVudGVkO1xuXG5cbi8vIGFuIGFic3RyYWN0IGF0dHJpYnV0ZSBjbGFzcyBmb3IgYXR0cmlidXRlIHBhcnNpbmcgYW5kIHZhbGlkYXRpb25cblxubW9kdWxlLmV4cG9ydHMgPSBBdHRyaWJ1dGU7XG5cbmZ1bmN0aW9uIEF0dHJpYnV0ZShlbCwgbmFtZSkge1xuXHR0aGlzLm5hbWUgPSBuYW1lIHx8IHRoaXMuYXR0ck5hbWUoKTtcblx0dGhpcy5lbCA9IGVsO1xuXHR0aGlzLm5vZGUgPSBlbC5hdHRyaWJ1dGVzW3RoaXMubmFtZV07XG59XG5cbl8uZXh0ZW5kUHJvdG8oQXR0cmlidXRlLCB7XG5cdGdldDogZ2V0QXR0cmlidXRlVmFsdWUsXG5cdHNldDogc2V0QXR0cmlidXRlVmFsdWUsXG5cblx0Ly8gc2hvdWxkIGJlIGRlZmluZWQgaW4gc3ViY2xhc3Ncblx0YXR0ck5hbWU6IHRvQmVJbXBsZW1lbnRlZCxcblx0cGFyc2U6IHRvQmVJbXBsZW1lbnRlZCxcblx0dmFsaWRhdGU6IHRvQmVJbXBsZW1lbnRlZCxcbn0pO1xuXG5cbmZ1bmN0aW9uIGdldEF0dHJpYnV0ZVZhbHVlKCkge1xuXHRyZXR1cm4gdGhpcy5lbC5nZXRBdHRyaWJ1dGUodGhpcy5uYW1lKTtcbn1cblxuZnVuY3Rpb24gc2V0QXR0cmlidXRlVmFsdWUodmFsdWUpIHtcblx0dGhpcy5lbC5zZXRBdHRyaWJ1dGUodGhpcy5uYW1lLCB2YWx1ZSk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBtaWxvTWFpbCA9IHJlcXVpcmUoJy4vbWFpbCcpXG5cdCwgbWlsb0NvbXBvbmVudHNSZWdpc3RyeSA9IHJlcXVpcmUoJy4vY29tcG9uZW50cy9jX3JlZ2lzdHJ5Jylcblx0LCBDb21wb25lbnQgPSBtaWxvQ29tcG9uZW50c1JlZ2lzdHJ5LmdldCgnQ29tcG9uZW50Jylcblx0LCBCaW5kQXR0cmlidXRlID0gcmVxdWlyZSgnLi9hdHRyaWJ1dGUvYV9iaW5kJylcblx0LCBCaW5kZXJFcnJvciA9IHJlcXVpcmUoJy4vdXRpbC9lcnJvcicpLkJpbmRlclxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi91dGlsL2NoZWNrJylcblx0LCBNYXRjaCA9ICBjaGVjay5NYXRjaDtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGJpbmRlcjtcblxuXG5mdW5jdGlvbiBiaW5kZXIoc2NvcGVFbCwgY29tcG9uZW50c1JlZ2lzdHJ5KSB7XG5cdHZhciBjb21wb25lbnRzUmVnaXN0cnkgPSBjb21wb25lbnRzUmVnaXN0cnkgfHwgbWlsb0NvbXBvbmVudHNSZWdpc3RyeVxuXHRcdCwgc2NvcGVFbCA9IHNjb3BlRWwgfHwgZG9jdW1lbnQuYm9keVxuXHRcdCwgY29tcG9uZW50cyA9IHt9O1xuXG5cdGJpbmRFbGVtZW50KGNvbXBvbmVudHMsIHNjb3BlRWwpO1xuXHRyZXR1cm4gY29tcG9uZW50cztcblxuXG5cdGZ1bmN0aW9uIGJpbmRFbGVtZW50KGNvbXBvbmVudHMsIGVsKXtcblx0XHR2YXIgYXR0ciA9IG5ldyBCaW5kQXR0cmlidXRlKGVsKTtcblxuXHRcdGlmIChhdHRyLm5vZGUpXG5cdFx0XHR2YXIgYUNvbXBvbmVudCA9IGNyZWF0ZUNvbXBvbmVudChlbCwgYXR0cik7XG5cblx0XHQvLyBiaW5kIGlubmVyIGVsZW1lbnRzIHRvIGNvbXBvbmVudHNcblx0XHRpZiAoZWwuY2hpbGRyZW4gJiYgZWwuY2hpbGRyZW4ubGVuZ3RoKSB7XG5cdFx0XHR2YXIgaW5uZXJDb21wb25lbnRzID0gYmluZENoaWxkcmVuKGVsKTtcblxuXHRcdFx0aWYgKE9iamVjdC5rZXlzKGlubmVyQ29tcG9uZW50cykubGVuZ3RoKSB7XG5cdFx0XHRcdC8vIGF0dGFjaCBpbm5lciBjb21wb25lbnRzIHRvIHRoZSBjdXJyZW50IG9uZSAoY3JlYXRlIGEgbmV3IHNjb3BlKSAuLi5cblx0XHRcdFx0aWYgKHR5cGVvZiBhQ29tcG9uZW50ICE9ICd1bmRlZmluZWQnICYmIGFDb21wb25lbnQuY29udGFpbmVyKVxuXHRcdFx0XHRcdGFDb21wb25lbnQuY29udGFpbmVyLmFkZChpbm5lckNvbXBvbmVudHMpO1xuXHRcdFx0XHRlbHNlIC8vIG9yIGtlZXAgdGhlbSBpbiB0aGUgY3VycmVudCBzY29wZVxuXHRcdFx0XHRcdF8uZWFjaEtleShpbm5lckNvbXBvbmVudHMsIGZ1bmN0aW9uKGFDb21wLCBuYW1lKSB7XG5cdFx0XHRcdFx0XHRzdG9yZUNvbXBvbmVudChjb21wb25lbnRzLCBhQ29tcCwgbmFtZSk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKGFDb21wb25lbnQpXG5cdFx0XHRzdG9yZUNvbXBvbmVudChjb21wb25lbnRzLCBhQ29tcG9uZW50LCBhdHRyLmNvbXBOYW1lKTtcblx0fVxuXG5cblx0ZnVuY3Rpb24gYmluZENoaWxkcmVuKG93bmVyRWwpIHtcblx0XHR2YXIgY29tcG9uZW50cyA9IHt9O1xuXHRcdEFycmF5LnByb3RvdHlwZS5mb3JFYWNoLmNhbGwob3duZXJFbC5jaGlsZHJlbiwgZnVuY3Rpb24oZWwpIHtcblx0XHRcdGJpbmRFbGVtZW50KGNvbXBvbmVudHMsIGVsKVxuXHRcdH0pO1xuXHRcdHJldHVybiBjb21wb25lbnRzO1xuXHR9XG5cblxuXHRmdW5jdGlvbiBjcmVhdGVDb21wb25lbnQoZWwsIGF0dHIpIHtcblx0XHQvLyBlbGVtZW50IHdpbGwgYmUgYm91bmQgdG8gYSBjb21wb25lbnRcblx0XHRhdHRyLnBhcnNlKCkudmFsaWRhdGUoKTtcblxuXHRcdC8vIGdldCBjb21wb25lbnQgY2xhc3MgZnJvbSByZWdpc3RyeSBhbmQgdmFsaWRhdGVcblx0XHR2YXIgQ29tcG9uZW50Q2xhc3MgPSBjb21wb25lbnRzUmVnaXN0cnkuZ2V0KGF0dHIuY29tcENsYXNzKTtcblxuXHRcdGlmICghIENvbXBvbmVudENsYXNzKVxuXHRcdFx0dGhyb3cgbmV3IEJpbmRlckVycm9yKCdjbGFzcyAnICsgYXR0ci5jb21wQ2xhc3MgKyAnIGlzIG5vdCByZWdpc3RlcmVkJyk7XG5cblx0XHRjaGVjayhDb21wb25lbnRDbGFzcywgTWF0Y2guU3ViY2xhc3MoQ29tcG9uZW50LCB0cnVlKSk7XG5cblx0XHQvLyBjcmVhdGUgbmV3IGNvbXBvbmVudFxuXHRcdHZhciBhQ29tcG9uZW50ID0gbmV3IENvbXBvbmVudENsYXNzKGVsLCBhdHRyLmNvbXBOYW1lKTtcblxuXHRcdC8vIGFkZCBleHRyYSBmYWNldHNcblx0XHR2YXIgZmFjZXRzID0gYXR0ci5jb21wRmFjZXRzO1xuXHRcdGlmIChmYWNldHMpXG5cdFx0XHRmYWNldHMuZm9yRWFjaChmdW5jdGlvbihmY3QpIHtcblx0XHRcdFx0YUNvbXBvbmVudC5hZGRGYWNldChmY3QpO1xuXHRcdFx0fSk7XG5cblx0XHRyZXR1cm4gYUNvbXBvbmVudDtcblx0fVxuXG5cblx0ZnVuY3Rpb24gc3RvcmVDb21wb25lbnQoY29tcG9uZW50cywgYUNvbXBvbmVudCwgbmFtZSkge1xuXHRcdGlmIChjb21wb25lbnRzW25hbWVdKVxuXHRcdFx0dGhyb3cgbmV3IEJpbmRlckVycm9yKCdkdXBsaWNhdGUgY29tcG9uZW50IG5hbWU6ICcgKyBuYW1lKTtcblxuXHRcdGNvbXBvbmVudHNbbmFtZV0gPSBhQ29tcG9uZW50O1xuXHR9XG59XG5cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGNsYXNzZXMgPSB7XG5cdEZhY2V0OiByZXF1aXJlKCcuL2ZhY2V0cy9mX2NsYXNzJyksXG5cdENvbXBvbmVudDogcmVxdWlyZSgnLi9jb21wb25lbnRzL2NfY2xhc3MnKSxcblx0Q29tcG9uZW50RmFjZXQ6IHJlcXVpcmUoJy4vY29tcG9uZW50cy9jX2ZhY2V0JyksXG5cdENsYXNzUmVnaXN0cnk6IHJlcXVpcmUoJy4vYWJzdHJhY3QvcmVnaXN0cnknKSxcblx0ZmFjZXRzUmVnaXN0cnk6IHJlcXVpcmUoJy4vY29tcG9uZW50cy9jX2ZhY2V0cy9jZl9yZWdpc3RyeScpLFxuXHRjb21wb25lbnRzUmVnaXN0cnk6IHJlcXVpcmUoJy4vY29tcG9uZW50cy9jX3JlZ2lzdHJ5Jylcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3NlcztcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIEZhY2V0ZWRPYmplY3QgPSByZXF1aXJlKCcuLi9mYWNldHMvZl9vYmplY3QnKVxuXHQsIGZhY2V0c1JlZ2lzdHJ5ID0gcmVxdWlyZSgnLi9jX2ZhY2V0cy9jZl9yZWdpc3RyeScpXG5cdCwgQ29tcG9uZW50RmFjZXQgPSByZXF1aXJlKCcuL2NfZmFjZXQnKVxuXHQsIE1lc3NlbmdlciA9IHJlcXVpcmUoJy4uL21lc3NlbmdlcicpXG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpXG5cdCwgY2hlY2sgPSByZXF1aXJlKCcuLi91dGlsL2NoZWNrJylcblx0LCBNYXRjaCA9IGNoZWNrLk1hdGNoO1xuXG52YXIgQ29tcG9uZW50ID0gXy5jcmVhdGVTdWJjbGFzcyhGYWNldGVkT2JqZWN0LCAnQ29tcG9uZW50JywgdHJ1ZSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ29tcG9uZW50O1xuXG5cbkNvbXBvbmVudC5jcmVhdGVDb21wb25lbnRDbGFzcyA9IGZ1bmN0aW9uKG5hbWUsIGZhY2V0c0NvbmZpZykge1xuXHR2YXIgZmFjZXRzQ2xhc3NlcyA9IHt9O1xuXG5cdGlmIChBcnJheS5pc0FycmF5KGZhY2V0c0NvbmZpZykpIHtcblx0XHR2YXIgY29uZmlnTWFwID0ge307XG5cdFx0ZmFjZXRzQ29uZmlnLmZvckVhY2goZnVuY3Rpb24oZmN0KSB7XG5cdFx0XHR2YXIgZmN0TmFtZSA9IF8uZmlyc3RMb3dlckNhc2UoZmN0KTtcblx0XHRcdGNvbmZpZ01hcFtmY3ROYW1lXSA9IHt9O1xuXHRcdH0pO1xuXHRcdGZhY2V0c0NvbmZpZyA9IGNvbmZpZ01hcDtcblx0fVxuXG5cdF8uZWFjaEtleShmYWNldHNDb25maWcsIGZ1bmN0aW9uKGZjdENvbmZpZywgZmN0KSB7XG5cdFx0dmFyIGZjdE5hbWUgPSBfLmZpcnN0TG93ZXJDYXNlKGZjdCk7XG5cdFx0dmFyIGZjdENsYXNzTmFtZSA9IF8uZmlyc3RVcHBlckNhc2UoZmN0KTtcblx0XHRmYWNldHNDbGFzc2VzW2ZjdE5hbWVdID0gZmFjZXRzUmVnaXN0cnkuZ2V0KGZjdENsYXNzTmFtZSk7XG5cdH0pO1xuXG5cdHZhciBDb21wb25lbnRDbGFzcyA9IEZhY2V0ZWRPYmplY3QuY3JlYXRlRmFjZXRlZENsYXNzLmNhbGwodGhpcywgbmFtZSwgZmFjZXRzQ2xhc3NlcywgZmFjZXRzQ29uZmlnKTtcblx0XG5cdHJldHVybiBDb21wb25lbnRDbGFzcztcbn07XG5cbmRlbGV0ZSBDb21wb25lbnQuY3JlYXRlRmFjZXRlZENsYXNzO1xuXG5cbl8uZXh0ZW5kUHJvdG8oQ29tcG9uZW50LCB7XG5cdGluaXQ6IGluaXRDb21wb25lbnQsXG5cdGFkZEZhY2V0OiBhZGRGYWNldCxcblx0YWxsRmFjZXRzOiBlbnZva2VNZXRob2RPbkFsbEZhY2V0c1xufSk7XG5cblxuZnVuY3Rpb24gaW5pdENvbXBvbmVudChlbGVtZW50LCBuYW1lKSB7XG5cdHRoaXMuZWwgPSBlbGVtZW50O1xuXHR0aGlzLm5hbWUgPSBuYW1lO1xuXG5cdHZhciBtZXNzZW5nZXIgPSBuZXcgTWVzc2VuZ2VyKHRoaXMsIE1lc3Nlbmdlci5kZWZhdWx0TWV0aG9kcywgdW5kZWZpbmVkIC8qIG5vIG1lc3NhZ2VTb3VyY2UgKi8pO1xuXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRoaXMsIHtcblx0XHRfbWVzc2VuZ2VyOiB7IHZhbHVlOiBtZXNzZW5nZXIgfSxcblx0fSk7XHRcblxuXHQvLyBzdGFydCBhbGwgZmFjZXRzXG5cdHRoaXMuYWxsRmFjZXRzKCdjaGVjaycpO1xuXHR0aGlzLmFsbEZhY2V0cygnc3RhcnQnKTtcbn1cblxuXG5mdW5jdGlvbiBhZGRGYWNldChmYWNldE5hbWVPckNsYXNzLCBmYWNldE9wdHMsIGZhY2V0TmFtZSkge1xuXHRjaGVjayhmYWNldE5hbWVPckNsYXNzLCBNYXRjaC5PbmVPZihTdHJpbmcsIE1hdGNoLlN1YmNsYXNzKENvbXBvbmVudEZhY2V0KSkpO1xuXHRjaGVjayhmYWNldE9wdHMsIE1hdGNoLk9wdGlvbmFsKE9iamVjdCkpO1xuXHRjaGVjayhmYWNldE5hbWUsIE1hdGNoLk9wdGlvbmFsKFN0cmluZykpO1xuXG5cdGlmICh0eXBlb2YgZmFjZXROYW1lT3JDbGFzcyA9PSAnc3RyaW5nJykge1xuXHRcdHZhciBmYWNldENsYXNzTmFtZSA9IF8uZmlyc3RVcHBlckNhc2UoZmFjZXROYW1lT3JDbGFzcyk7XG5cdFx0dmFyIEZhY2V0Q2xhc3MgPSBmYWNldHNSZWdpc3RyeS5nZXQoZmFjZXRDbGFzc05hbWUpO1xuXHR9IGVsc2UgXG5cdFx0RmFjZXRDbGFzcyA9IGZhY2V0TmFtZU9yQ2xhc3M7XG5cblx0ZmFjZXROYW1lID0gZmFjZXROYW1lIHx8IF8uZmlyc3RMb3dlckNhc2UoRmFjZXRDbGFzcy5uYW1lKTtcblxuXHR2YXIgbmV3RmFjZXQgPSBGYWNldGVkT2JqZWN0LnByb3RvdHlwZS5hZGRGYWNldC5jYWxsKHRoaXMsIEZhY2V0Q2xhc3MsIGZhY2V0T3B0cywgZmFjZXROYW1lKTtcblxuXHQvLyBzdGFydCBmYWNldFxuXHRuZXdGYWNldC5jaGVjayAmJiBuZXdGYWNldC5jaGVjaygpO1xuXHRuZXdGYWNldC5zdGFydCAmJiBuZXdGYWNldC5zdGFydCgpO1xufVxuXG5cbmZ1bmN0aW9uIGVudm9rZU1ldGhvZE9uQWxsRmFjZXRzKG1ldGhvZCAvKiAsIC4uLiAqLykge1xuXHR2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG5cblx0Xy5lYWNoS2V5KHRoaXMuZmFjZXRzLCBmdW5jdGlvbihmYWNldCwgZmN0TmFtZSkge1xuXHRcdGlmIChmYWNldCAmJiB0eXBlb2YgZmFjZXRbbWV0aG9kXSA9PSAnZnVuY3Rpb24nKVxuXHRcdFx0ZmFjZXRbbWV0aG9kXS5hcHBseShmYWNldCwgYXJncyk7XG5cdH0pO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgRmFjZXQgPSByZXF1aXJlKCcuLi9mYWNldHMvZl9jbGFzcycpXG5cdCwgTWVzc2VuZ2VyID0gcmVxdWlyZSgnLi4vbWVzc2VuZ2VyJylcblx0LCBGYWNldEVycm9yID0gcmVxdWlyZSgnLi4vdXRpbC9lcnJvcicpLkZhY2V0XG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpO1xuXG52YXIgQ29tcG9uZW50RmFjZXQgPSBfLmNyZWF0ZVN1YmNsYXNzKEZhY2V0LCAnQ29tcG9uZW50RmFjZXQnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb25lbnRGYWNldDtcblxuXG5fLmV4dGVuZFByb3RvKENvbXBvbmVudEZhY2V0LCB7XG5cdGluaXQ6IGluaXRDb21wb25lbnRGYWNldCxcblx0Y2hlY2s6IGNoZWNrRGVwZW5kZW5jaWVzXG59KTtcblxuXG5mdW5jdGlvbiBpbml0Q29tcG9uZW50RmFjZXQoKSB7XG5cdC8vIHZhciBtZXNzZW5nZXIgPSBuZXcgTWVzc2VuZ2VyKHRoaXMsIE1lc3Nlbmdlci5kZWZhdWx0TWV0aG9kcywgdW5kZWZpbmVkIC8qIG5vIG1lc3NhZ2VTb3VyY2UgKi8pO1xuXG5cdC8vIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRoaXMsIHtcblx0Ly8gXHRfZmFjZXRNZXNzZW5nZXI6IHsgdmFsdWU6IG1lc3NlbmdlciB9LFxuXHQvLyB9KTtcbn1cblxuXG5mdW5jdGlvbiBjaGVja0RlcGVuZGVuY2llcygpIHtcblx0aWYgKHRoaXMucmVxdWlyZSkge1xuXHRcdHRoaXMucmVxdWlyZS5mb3JFYWNoKGZ1bmN0aW9uKHJlcUZhY2V0KSB7XG5cdFx0XHR2YXIgZmFjZXROYW1lID0gXy5maXJzdExvd2VyQ2FzZShyZXFGYWNldCk7XG5cdFx0XHRpZiAoISAodGhpcy5vd25lcltmYWNldE5hbWVdIGluc3RhbmNlb2YgQ29tcG9uZW50RmFjZXQpKVxuXHRcdFx0XHR0aHJvdyBuZXcgRmFjZXRFcnJvcignZmFjZXQgJyArIHRoaXMuY29uc3RydWN0b3IubmFtZSArICcgcmVxdWlyZXMgZmFjZXQgJyArIHJlcUZhY2V0KTtcblx0XHR9LCB0aGlzKTtcblx0fVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ29tcG9uZW50RmFjZXQgPSByZXF1aXJlKCcuLi9jX2ZhY2V0Jylcblx0LCBiaW5kZXIgPSByZXF1aXJlKCcuLi8uLi9iaW5kZXInKVxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKVxuXHQsIGZhY2V0c1JlZ2lzdHJ5ID0gcmVxdWlyZSgnLi9jZl9yZWdpc3RyeScpO1xuXG4vLyBjb250YWluZXIgZmFjZXRcbnZhciBDb250YWluZXIgPSBfLmNyZWF0ZVN1YmNsYXNzKENvbXBvbmVudEZhY2V0LCAnQ29udGFpbmVyJyk7XG5cbl8uZXh0ZW5kUHJvdG8oQ29udGFpbmVyLCB7XG5cdGluaXQ6IGluaXRDb250YWluZXIsXG5cdF9iaW5kOiBfYmluZENvbXBvbmVudHMsXG5cdGFkZDogYWRkQ2hpbGRDb21wb25lbnRzXG59KTtcblxuZmFjZXRzUmVnaXN0cnkuYWRkKENvbnRhaW5lcik7XG5cbm1vZHVsZS5leHBvcnRzID0gQ29udGFpbmVyO1xuXG5cbmZ1bmN0aW9uIGluaXRDb250YWluZXIoKSB7XG5cdENvbXBvbmVudEZhY2V0LnByb3RvdHlwZS5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cdHRoaXMuY2hpbGRyZW4gPSB7fTtcbn1cblxuXG5mdW5jdGlvbiBfYmluZENvbXBvbmVudHMoKSB7XG5cdC8vIFRPRE9cblx0Ly8gdGhpcyBmdW5jdGlvbiBzaG91bGQgcmUtYmluZCByYXRoZXIgdGhhbiBiaW5kIGFsbCBpbnRlcm5hbCBlbGVtZW50c1xuXHR0aGlzLmNoaWxkcmVuID0gYmluZGVyKHRoaXMub3duZXIuZWwpO1xufVxuXG5cbmZ1bmN0aW9uIGFkZENoaWxkQ29tcG9uZW50cyhjaGlsZENvbXBvbmVudHMpIHtcblx0Ly8gVE9ET1xuXHQvLyB0aGlzIGZ1bmN0aW9uIHNob3VsZCBpbnRlbGxpZ2VudGx5IHJlLWJpbmQgZXhpc3RpbmcgY29tcG9uZW50cyB0b1xuXHQvLyBuZXcgZWxlbWVudHMgKGlmIHRoZXkgY2hhbmdlZCkgYW5kIHJlLWJpbmQgcHJldmlvdXNseSBib3VuZCBldmVudHMgdG8gdGhlIHNhbWVcblx0Ly8gZXZlbnQgaGFuZGxlcnNcblx0Ly8gb3IgbWF5YmUgbm90LCBpZiB0aGlzIGZ1bmN0aW9uIGlzIG9ubHkgdXNlZCBieSBiaW5kZXIgdG8gYWRkIG5ldyBlbGVtZW50cy4uLlxuXHRfLmV4dGVuZCh0aGlzLmNoaWxkcmVuLCBjaGlsZENvbXBvbmVudHMpO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ29tcG9uZW50RmFjZXQgPSByZXF1aXJlKCcuLi9jX2ZhY2V0Jylcblx0LCBmYWNldHNSZWdpc3RyeSA9IHJlcXVpcmUoJy4vY2ZfcmVnaXN0cnknKVxuXG5cdCwgTWVzc2VuZ2VyID0gcmVxdWlyZSgnLi4vLi4vbWVzc2VuZ2VyJylcblx0LCBDb21wb25lbnREYXRhU291cmNlID0gcmVxdWlyZSgnLi4vY19tZXNzYWdlX3NvdXJjZXMvY29tcG9uZW50X2RhdGFfc291cmNlJylcblxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKTtcblxuXG4vLyBkYXRhIG1vZGVsIGNvbm5lY3Rpb24gZmFjZXRcbnZhciBEYXRhID0gXy5jcmVhdGVTdWJjbGFzcyhDb21wb25lbnRGYWNldCwgJ0RhdGEnKTtcblxuXy5leHRlbmRQcm90byhEYXRhLCB7XG5cdGluaXQ6IGluaXREYXRhRmFjZXQsXG5cblx0Ly8gX3JlYXR0YWNoOiBfcmVhdHRhY2hFdmVudHNPbkVsZW1lbnRDaGFuZ2Vcbn0pO1xuXG5mYWNldHNSZWdpc3RyeS5hZGQoRGF0YSk7XG5cbm1vZHVsZS5leHBvcnRzID0gRGF0YTtcblxuXG5mdW5jdGlvbiBpbml0RGF0YUZhY2V0KCkge1xuXHRDb21wb25lbnRGYWNldC5wcm90b3R5cGUuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG5cdHZhciBwcm94eUNvbXBEYXRhU291cmNlTWV0aG9kcyA9IHtcblx0XHR2YWx1ZTogJ3ZhbHVlJyxcblx0XHR0cmlnZ2VyOiAndHJpZ2dlcidcblx0fTtcblxuXHQvLyBpbnN0ZWFkIG9mIHRoaXMub3duZXIgc2hvdWxkIHBhc3MgbW9kZWw/IFdoZXJlIGl0IGlzIHNldD9cblx0dmFyIGNvbXBEYXRhU291cmNlID0gbmV3IENvbXBvbmVudERhdGFTb3VyY2UodGhpcywgcHJveHlDb21wRGF0YVNvdXJjZU1ldGhvZHMsIHRoaXMub3duZXIpO1xuXG5cdHZhciBwcm94eU1lc3Nlbmdlck1ldGhvZHMgPSB7XG5cdFx0b246ICdvbk1lc3NhZ2UnLFxuXHRcdG9mZjogJ29mZk1lc3NhZ2UnLFxuXHRcdG9uTWVzc2FnZXM6ICdvbk1lc3NhZ2VzJyxcblx0XHRvZmZNZXNzYWdlczogJ29mZk1lc3NhZ2VzJyxcblx0XHRnZXRTdWJzY3JpYmVyczogJ2dldFN1YnNjcmliZXJzJ1xuXHR9O1xuXG5cdHZhciBkYXRhTWVzc2VuZ2VyID0gbmV3IE1lc3Nlbmdlcih0aGlzLCBwcm94eU1lc3Nlbmdlck1ldGhvZHMsIGNvbXBEYXRhU291cmNlKTtcblxuXHRPYmplY3QuZGVmaW5lUHJvcGVydGllcyh0aGlzLCB7XG5cdFx0X2RhdGFNZXNzZW5nZXI6IHsgdmFsdWU6IGRhdGFNZXNzZW5nZXIgfSxcblx0XHRfY29tcERhdGFTb3VyY2U6IHsgdmFsdWU6IGNvbXBEYXRhU291cmNlIH1cblx0fSk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBDb21wb25lbnRGYWNldCA9IHJlcXVpcmUoJy4uL2NfZmFjZXQnKVxuXHQsIGZhY2V0c1JlZ2lzdHJ5ID0gcmVxdWlyZSgnLi9jZl9yZWdpc3RyeScpXHRcblx0LCBfID0gcmVxdWlyZSgnbW9sLXByb3RvJylcblx0LCBjaGVjayA9IHJlcXVpcmUoJy4uLy4uL3V0aWwvY2hlY2snKVxuXHQsIE1hdGNoID0gY2hlY2suTWF0Y2hcblx0LCBiaW5kZXIgPSByZXF1aXJlKCcuLi8uLi9iaW5kZXInKTtcblxuXG4vLyBkYXRhIG1vZGVsIGNvbm5lY3Rpb24gZmFjZXRcbnZhciBEb20gPSBfLmNyZWF0ZVN1YmNsYXNzKENvbXBvbmVudEZhY2V0LCAnRG9tJyk7XG5cbl8uZXh0ZW5kUHJvdG8oRG9tLCB7XG5cdGluaXQ6IGluaXREb21GYWNldCxcblx0c3RhcnQ6IHN0YXJ0RG9tRmFjZXQsXG5cblx0c2hvdzogc2hvd0VsZW1lbnQsXG5cdGhpZGU6IGhpZGVFbGVtZW50LFxuXHRyZW1vdmU6IHJlbW92ZUVsZW1lbnQsXG5cdGFwcGVuZDogYXBwZW5kSW5zaWRlRWxlbWVudCxcblx0cHJlcGVuZDogcHJlcGVuZEluc2lkZUVsZW1lbnQsXG5cblx0Ly8gX3JlYXR0YWNoOiBfcmVhdHRhY2hFdmVudHNPbkVsZW1lbnRDaGFuZ2Vcbn0pO1xuXG5mYWNldHNSZWdpc3RyeS5hZGQoRG9tKTtcblxubW9kdWxlLmV4cG9ydHMgPSBEb207XG5cblxuZnVuY3Rpb24gaW5pdERvbUZhY2V0KCkge1xuXHRDb21wb25lbnRGYWNldC5wcm90b3R5cGUuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufVxuXG5mdW5jdGlvbiBzdGFydERvbUZhY2V0KCkge1xuXHRpZiAodGhpcy5jb25maWcuY2xzKVxuXHRcdHRoaXMub3duZXIuZWwuY2xhc3NMaXN0LmFkZCh0aGlzLmNvbmZpZy5jbHMpO1xufVxuXG5mdW5jdGlvbiBzaG93RWxlbWVudCgpIHtcblx0dGhpcy5vd25lci5lbC5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcbn1cblxuZnVuY3Rpb24gaGlkZUVsZW1lbnQoKSB7XG5cdHRoaXMub3duZXIuZWwuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbn1cblxuZnVuY3Rpb24gcmVtb3ZlRWxlbWVudCgpIHtcblx0dmFyIHRoaXNFbCA9IHRoaXMub3duZXIuZWw7XG5cdHRoaXNFbC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRoaXNFbCk7XG59XG5cbmZ1bmN0aW9uIGFwcGVuZEluc2lkZUVsZW1lbnQoZWwpIHtcblx0dGhpcy5vd25lci5lbC5hcHBlbmRDaGlsZChlbClcbn1cblxuZnVuY3Rpb24gcHJlcGVuZEluc2lkZUVsZW1lbnQoZWwpIHtcblx0dmFyIHRoaXNFbCA9IHRoaXMub3duZXIuZWxcblx0XHQsIGZpcnN0Q2hpbGQgPSB0aGlzRWwuZmlyc3RDaGlsZDtcblx0aWYgKGZpcnN0Q2hpbGQpXG5cdFx0dGhpc0VsLmluc2VydEJlZm9yZShlbCwgZmlyc3RDaGlsZCk7XG5cdGVsc2Vcblx0XHR0aGlzRWwuYXBwZW5kQ2hpbGQoZWwpO1xufVxuXG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBDb21wb25lbnRGYWNldCA9IHJlcXVpcmUoJy4uL2NfZmFjZXQnKVxuXHQsIGZhY2V0c1JlZ2lzdHJ5ID0gcmVxdWlyZSgnLi9jZl9yZWdpc3RyeScpXG5cblx0LCBfID0gcmVxdWlyZSgnbW9sLXByb3RvJyk7XG5cblxuLy8gZ2VuZXJpYyBkcmFnIGhhbmRsZXIsIHNob3VsZCBiZSBvdmVycmlkZGVuXG52YXIgRHJhZyA9IF8uY3JlYXRlU3ViY2xhc3MoQ29tcG9uZW50RmFjZXQsICdEcmFnJyk7XG5cbl8uZXh0ZW5kUHJvdG8oRHJhZywge1xuXHRpbml0OiBpbml0RHJhZ0ZhY2V0LFxuXHRzdGFydDogc3RhcnREcmFnRmFjZXQsXG5cdHJlcXVpcmU6IFsnRXZlbnRzJ10sIC8vIFRPRE8gaW1wbGVtZW50IGZhY2V0IGRlcGVuZGVuY2llc1xuXG5cdHNldEhhbmRsZTogc2V0RHJhZ0hhbmRsZVxuXHQvLyBfcmVhdHRhY2g6IF9yZWF0dGFjaEV2ZW50c09uRWxlbWVudENoYW5nZVxufSk7XG5cbmZhY2V0c1JlZ2lzdHJ5LmFkZChEcmFnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBEcmFnO1xuXG5cbmZ1bmN0aW9uIGluaXREcmFnRmFjZXQoKSB7XG5cdENvbXBvbmVudEZhY2V0LnByb3RvdHlwZS5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cdHRoaXMuX29uZHJhZ3N0YXJ0ID0gdGhpcy5jb25maWcub25kcmFnc3RhcnQ7XG5cdHRoaXMuX29uZHJhZyA9IHRoaXMuY29uZmlnLm9uZHJhZztcblx0dGhpcy5fb25kcmFnZW5kID0gdGhpcy5jb25maWcub25kcmFnc3RhcnQ7XG59XG5cblxuZnVuY3Rpb24gc2V0RHJhZ0hhbmRsZShoYW5kbGVFbCkge1xuXHRpZiAoISB0aGlzLm93bmVyLmVsLmNvbnRhaW5zKGhhbmRsZUVsKSlcblx0XHRyZXR1cm4gbG9nZ2VyLndhcm4oJ2RyYWcgaGFuZGxlIHNob3VsZCBiZSBpbnNpZGUgZWxlbWVudCB0byBiZSBkcmFnZ2VkJylcblx0dGhpcy5fZHJhZ0hhbmRsZSA9IGhhbmRsZUVsO1xufVxuXG5cbmZ1bmN0aW9uIHN0YXJ0RHJhZ0ZhY2V0KCkge1xuXHR0aGlzLm93bmVyLmVsLnNldEF0dHJpYnV0ZSgnZHJhZ2dhYmxlJywgdHJ1ZSk7XG5cblx0dmFyIGV2ZW50c0ZhY2V0ID0gdGhpcy5vd25lci5ldmVudHM7XG5cdGV2ZW50c0ZhY2V0Lm9uRXZlbnRzKHtcblx0XHQnbW91c2Vkb3duJzogb25Nb3VzZURvd24sXG5cdFx0J21vdXNlZW50ZXIgbW91c2VsZWF2ZSBtb3VzZW1vdmUnOiBvbk1vdXNlTW92ZW1lbnQsIFxuXHRcdCdkcmFnc3RhcnQnOiBvbkRyYWdTdGFydFxuXHR9KTtcblxuXHRpZiAodGhpcy5fb25kcmFnKSBldmVudHNGYWNldC5vbignZHJhZycsIHRoaXMuX29uZHJhZylcblx0aWYgKHRoaXMuX29uZHJhZ2VuZCkgZXZlbnRzRmFjZXQub24oJ2RyYWdlbmQnLCB0aGlzLl9vbmRyYWdlbmQpXG5cblxuXHR2YXIgc2VsZiA9IHRoaXM7XG5cblxuXHRmdW5jdGlvbiBvbk1vdXNlRG93bihldmVudFR5cGUsIGV2ZW50KSB7XG5cdFx0c2VsZi5fdGFyZ2V0ID0gZXZlbnQudGFyZ2V0O1xuXHRcdGlmICh0YXJnZXRJbkRyYWdIYW5kbGUoZXZlbnQpKVxuXHRcdFx0d2luZG93LmdldFNlbGVjdGlvbigpLmVtcHR5KCk7XG5cdH1cblxuXG5cdGZ1bmN0aW9uIG9uTW91c2VNb3ZlbWVudChldmVudFR5cGUsIGV2ZW50KSB7XG5cdFx0dmFyIHNob3VsZEJlRHJhZ2dhYmxlID0gdGFyZ2V0SW5EcmFnSGFuZGxlKGV2ZW50KTtcblx0XHRzZWxmLm93bmVyLmVsLnNldEF0dHJpYnV0ZSgnZHJhZ2dhYmxlJywgc2hvdWxkQmVEcmFnZ2FibGUpO1xuXHR9XG5cblxuXHRmdW5jdGlvbiBvbkRyYWdTdGFydChldmVudFR5cGUsIGV2ZW50KSB7XG5cdFx0aWYgKHRhcmdldEluRHJhZ0hhbmRsZShldmVudCkpIHtcblx0XHRcdC8vIGV2ZW50LmRhdGFUcmFuc2Zlci5zZXREYXRhKCd0ZXh0L3BsYWluJywgc2VsZi5vd25lci5lbC5pbm5lckhUTUwpO1xuXHRcdFx0ZXZlbnQuZGF0YVRyYW5zZmVyLnNldERhdGEoJ3RleHQvaHRtbCcsIHNlbGYub3duZXIuZWwub3V0ZXJIVE1MKTtcblx0XHRcdGV2ZW50LmRhdGFUcmFuc2Zlci5zZXREYXRhKCd4LWFwcGxpY2F0aW9uL21pbG8tY29tcG9uZW50Jywgc2VsZi5vd25lcik7XG5cdFx0XHRzZWxmLl9vbmRyYWdzdGFydCAmJiBzZWxmLl9vbmRyYWdzdGFydChldmVudFR5cGUsIGV2ZW50KTtcblxuXHRcdH0gZWxzZVxuXHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0fVxuXG5cblx0ZnVuY3Rpb24gdGFyZ2V0SW5EcmFnSGFuZGxlKGV2ZW50KSB7XG5cdFx0cmV0dXJuICEgc2VsZi5fZHJhZ0hhbmRsZSB8fCBzZWxmLl9kcmFnSGFuZGxlLmNvbnRhaW5zKHNlbGYuX3RhcmdldCk7XG5cdH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIENvbXBvbmVudEZhY2V0ID0gcmVxdWlyZSgnLi4vY19mYWNldCcpXG5cdCwgZmFjZXRzUmVnaXN0cnkgPSByZXF1aXJlKCcuL2NmX3JlZ2lzdHJ5JylcblxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKTtcblxuXG4vLyBnZW5lcmljIGRyYWcgaGFuZGxlciwgc2hvdWxkIGJlIG92ZXJyaWRkZW5cbnZhciBEcm9wID0gXy5jcmVhdGVTdWJjbGFzcyhDb21wb25lbnRGYWNldCwgJ0Ryb3AnKTtcblxuXy5leHRlbmRQcm90byhEcm9wLCB7XG5cdGluaXQ6IGluaXREcm9wRmFjZXQsXG5cdHN0YXJ0OiBzdGFydERyb3BGYWNldCxcblx0cmVxdWlyZTogWydFdmVudHMnXSAvLyBUT0RPIGltcGxlbWVudCBmYWNldCBkZXBlbmRlbmNpZXNcblxuXHQvLyBfcmVhdHRhY2g6IF9yZWF0dGFjaEV2ZW50c09uRWxlbWVudENoYW5nZVxufSk7XG5cbmZhY2V0c1JlZ2lzdHJ5LmFkZChEcm9wKTtcblxubW9kdWxlLmV4cG9ydHMgPSBEcm9wO1xuXG5cbmZ1bmN0aW9uIGluaXREcm9wRmFjZXQoKSB7XG5cdENvbXBvbmVudEZhY2V0LnByb3RvdHlwZS5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cblx0dGhpcy5fb25kcmFnZW50ZXIgPSB0aGlzLmNvbmZpZy5vbmRyYWdlbnRlcjtcblx0dGhpcy5fb25kcmFnb3ZlciA9IHRoaXMuY29uZmlnLm9uZHJhZ292ZXI7XG5cdHRoaXMuX29uZHJhZ2xlYXZlID0gdGhpcy5jb25maWcub25kcmFnbGVhdmU7XG5cdHRoaXMuX29uZHJvcCA9IHRoaXMuY29uZmlnLm9uZHJvcDtcbn1cblxuXG5mdW5jdGlvbiBzdGFydERyb3BGYWNldCgpIHtcblx0dmFyIGV2ZW50c0ZhY2V0ID0gdGhpcy5vd25lci5ldmVudHM7XG5cdGV2ZW50c0ZhY2V0Lm9uKCdkcmFnZW50ZXIgZHJhZ292ZXInLCBvbkRyYWdnaW5nKTtcblx0ZXZlbnRzRmFjZXQub24oJ2RyYWdlbnRlciBkcmFnb3ZlciBkcmFnbGVhdmUgZHJvcCcsIGNhbGxDb25maWd1cmVkSGFuZGxlcik7XG5cblx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cblx0ZnVuY3Rpb24gY2FsbENvbmZpZ3VyZWRIYW5kbGVyKGV2ZW50VHlwZSwgZXZlbnQpIHtcblx0XHR2YXIgaGFuZGxlclByb3BlcnR5ID0gJ19vbicgKyBldmVudFR5cGVcblx0XHRcdCwgaGFuZGxlciA9IHNlbGZbaGFuZGxlclByb3BlcnR5XTtcblx0XHRpZiAoaGFuZGxlcilcblx0XHRcdGhhbmRsZXIuY2FsbChzZWxmLCBldmVudFR5cGUsIGV2ZW50KTtcblx0fVxuXG5cblx0ZnVuY3Rpb24gb25EcmFnZ2luZyhldmVudFR5cGUsIGV2ZW50KSB7XG5cdFx0dmFyIGRhdGFUeXBlcyA9IGV2ZW50LmRhdGFUcmFuc2Zlci50eXBlc1xuXHRcdGlmIChkYXRhVHlwZXMuaW5kZXhPZigndGV4dC9odG1sJykgPj0gMFxuXHRcdFx0XHR8fCBkYXRhVHlwZXMuaW5kZXhPZigneC1hcHBsaWNhdGlvbi9taWxvLWNvbXBvbmVudCcpID49IDApXG5cdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHR9XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ29tcG9uZW50RmFjZXQgPSByZXF1aXJlKCcuLi9jX2ZhY2V0Jylcblx0LCBmYWNldHNSZWdpc3RyeSA9IHJlcXVpcmUoJy4vY2ZfcmVnaXN0cnknKVxuXG5cdCwgTWVzc2VuZ2VyID0gcmVxdWlyZSgnLi4vLi4vbWVzc2VuZ2VyJylcblx0LCBET01FdmVudHNTb3VyY2UgPSByZXF1aXJlKCcuLi9jX21lc3NhZ2Vfc291cmNlcy9kb21fZXZlbnRzX3NvdXJjZScpXG5cblx0LCBfID0gcmVxdWlyZSgnbW9sLXByb3RvJyk7XG5cblxuLy8gZXZlbnRzIGZhY2V0XG52YXIgRXZlbnRzID0gXy5jcmVhdGVTdWJjbGFzcyhDb21wb25lbnRGYWNldCwgJ0V2ZW50cycpO1xuXG5fLmV4dGVuZFByb3RvKEV2ZW50cywge1xuXHRpbml0OiBpbml0RXZlbnRzRmFjZXQsXG5cblx0Ly8gX3JlYXR0YWNoOiBfcmVhdHRhY2hFdmVudHNPbkVsZW1lbnRDaGFuZ2Vcbn0pO1xuXG5mYWNldHNSZWdpc3RyeS5hZGQoRXZlbnRzKTtcblxubW9kdWxlLmV4cG9ydHMgPSBFdmVudHM7XG5cblxuZnVuY3Rpb24gaW5pdEV2ZW50c0ZhY2V0KCkge1xuXHRDb21wb25lbnRGYWNldC5wcm90b3R5cGUuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG5cdHZhciBkb21FdmVudHNTb3VyY2UgPSBuZXcgRE9NRXZlbnRzU291cmNlKHRoaXMsIHsgdHJpZ2dlcjogJ3RyaWdnZXInIH0sIHRoaXMub3duZXIpO1xuXG5cdHZhciBwcm94eU1lc3Nlbmdlck1ldGhvZHMgPSB7XG5cdFx0b246ICdvbk1lc3NhZ2UnLFxuXHRcdG9mZjogJ29mZk1lc3NhZ2UnLFxuXHRcdG9uRXZlbnRzOiAnb25NZXNzYWdlcycsXG5cdFx0b2ZmRXZlbnRzOiAnb2ZmTWVzc2FnZXMnLFxuXHRcdGdldExpc3RlbmVyczogJ2dldFN1YnNjcmliZXJzJ1xuXHR9O1xuXG5cdHZhciBtZXNzZW5nZXIgPSBuZXcgTWVzc2VuZ2VyKHRoaXMsIHByb3h5TWVzc2VuZ2VyTWV0aG9kcywgZG9tRXZlbnRzU291cmNlKTtcblxuXHRPYmplY3QuZGVmaW5lUHJvcGVydGllcyh0aGlzLCB7XG5cdFx0X2V2ZW50c01lc3NlbmdlcjogeyB2YWx1ZTogbWVzc2VuZ2VyIH0sXG5cdFx0X2RvbUV2ZW50c1NvdXJjZTogeyB2YWx1ZTogZG9tRXZlbnRzU291cmNlIH1cblx0fSk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBDb21wb25lbnRGYWNldCA9IHJlcXVpcmUoJy4uL2NfZmFjZXQnKVxuXHQsIGZhY2V0c1JlZ2lzdHJ5ID0gcmVxdWlyZSgnLi9jZl9yZWdpc3RyeScpXG5cblx0LCBNZXNzZW5nZXIgPSByZXF1aXJlKCcuLi8uLi9tZXNzZW5nZXInKVxuXHQsIGlGcmFtZU1lc3NhZ2VTb3VyY2UgPSByZXF1aXJlKCcuLi9jX21lc3NhZ2Vfc291cmNlcy9pZnJhbWVfbWVzc2FnZV9zb3VyY2UnKVxuXG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpO1xuXG5cbi8vIGRhdGEgbW9kZWwgY29ubmVjdGlvbiBmYWNldFxudmFyIEZyYW1lID0gXy5jcmVhdGVTdWJjbGFzcyhDb21wb25lbnRGYWNldCwgJ0ZyYW1lJyk7XG5cbl8uZXh0ZW5kUHJvdG8oRnJhbWUsIHtcblx0aW5pdDogaW5pdEZyYW1lRmFjZXRcblxuXHQvLyBfcmVhdHRhY2g6IF9yZWF0dGFjaEV2ZW50c09uRWxlbWVudENoYW5nZVxufSk7XG5cblxuZmFjZXRzUmVnaXN0cnkuYWRkKEZyYW1lKTtcblxubW9kdWxlLmV4cG9ydHMgPSBGcmFtZTtcblxuXG5mdW5jdGlvbiBpbml0RnJhbWVGYWNldCgpIHtcblx0Q29tcG9uZW50RmFjZXQucHJvdG90eXBlLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblx0XG5cdHZhciBpRnJhbWVNZXNzYWdlU291cmNlUHJveHkgPSB7XG5cdFx0cG9zdDogJ3Bvc3QnXG5cdH07XG5cdHZhciBtZXNzYWdlU291cmNlID0gbmV3IGlGcmFtZU1lc3NhZ2VTb3VyY2UodGhpcywgaUZyYW1lTWVzc2FnZVNvdXJjZVByb3h5KTtcblxuXHR2YXIgcHJveHlNZXNzZW5nZXJNZXRob2RzID0ge1xuXHRcdG9uOiAnb25NZXNzYWdlJyxcblx0XHRvZmY6ICdvZmZNZXNzYWdlJyxcblx0XHRvbk1lc3NhZ2VzOiAnb25NZXNzYWdlcycsXG5cdFx0b2ZmTWVzc2FnZXM6ICdvZmZNZXNzYWdlcycsXG5cdFx0Z2V0U3Vic2NyaWJlcnM6ICdnZXRTdWJzY3JpYmVycydcblx0fTtcblxuXHR2YXIgaUZyYW1lTWVzc2VuZ2VyID0gbmV3IE1lc3Nlbmdlcih0aGlzLCBwcm94eU1lc3Nlbmdlck1ldGhvZHMsIG1lc3NhZ2VTb3VyY2UpO1xuXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRoaXMsIHtcblx0XHRfaUZyYW1lTWVzc2VuZ2VyOiB7IHZhbHVlOiBpRnJhbWVNZXNzZW5nZXIgfSxcblx0XHRfbWVzc2FnZVNvdXJjZTogeyB2YWx1ZTogbWVzc2FnZVNvdXJjZSB9XG5cdH0pO1xufSIsIid1c2Ugc3RyaWN0JztcblxudmFyIENvbXBvbmVudEZhY2V0ID0gcmVxdWlyZSgnLi4vY19mYWNldCcpXG5cdCwgZmFjZXRzUmVnaXN0cnkgPSByZXF1aXJlKCcuL2NmX3JlZ2lzdHJ5JylcdFxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vLi4vdXRpbC9jaGVjaycpXG5cdCwgTWF0Y2ggPSBjaGVjay5NYXRjaFxuXHQsIGJpbmRlciA9IHJlcXVpcmUoJy4uLy4uL2JpbmRlcicpO1xuXG5cbi8vIGRhdGEgbW9kZWwgY29ubmVjdGlvbiBmYWNldFxudmFyIFRlbXBsYXRlID0gXy5jcmVhdGVTdWJjbGFzcyhDb21wb25lbnRGYWNldCwgJ1RlbXBsYXRlJyk7XG5cbl8uZXh0ZW5kUHJvdG8oVGVtcGxhdGUsIHtcblx0aW5pdDogaW5pdFRlbXBsYXRlRmFjZXQsXG5cdHNldDogc2V0VGVtcGxhdGUsXG5cdHJlbmRlcjogcmVuZGVyVGVtcGxhdGUsXG5cdGJpbmRlcjogYmluZElubmVyQ29tcG9uZW50c1xuXG5cdC8vIF9yZWF0dGFjaDogX3JlYXR0YWNoRXZlbnRzT25FbGVtZW50Q2hhbmdlXG59KTtcblxuZmFjZXRzUmVnaXN0cnkuYWRkKFRlbXBsYXRlKTtcblxubW9kdWxlLmV4cG9ydHMgPSBUZW1wbGF0ZTtcblxuXG5mdW5jdGlvbiBpbml0VGVtcGxhdGVGYWNldCgpIHtcblx0Q29tcG9uZW50RmFjZXQucHJvdG90eXBlLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuXHR0aGlzLl90ZW1wbGF0ZVN0ciA9IHRoaXMuY29uZmlnLnRlbXBsYXRlO1xufVxuXG5cbmZ1bmN0aW9uIHNldFRlbXBsYXRlKHRlbXBsYXRlU3RyLCBjb21waWxlKSB7XG5cdGNoZWNrKHRlbXBsYXRlU3RyLCBTdHJpbmcpO1xuXHRjaGVjayhjb21waWxlLCBNYXRjaC5PcHRpb25hbChGdW5jdGlvbikpO1xuXG5cdHRoaXMuX3RlbXBsYXRlU3RyID0gdGVtcGxhdGVTdHI7XG5cdGlmIChjb21waWxlKVxuXHRcdHRoaXMuX2NvbXBpbGUgPSBjb21waWxlXG5cblx0Y29tcGlsZSA9IGNvbXBpbGUgfHwgdGhpcy5fY29tcGlsZTsgLy8gfHwgbWlsby5jb25maWcudGVtcGxhdGUuY29tcGlsZTtcblxuXHRpZiAoY29tcGlsZSlcblx0XHR0aGlzLl90ZW1wbGF0ZSA9IGNvbXBpbGUodGVtcGxhdGVTdHIpO1xuXG5cdHJldHVybiB0aGlzO1xufVxuXG5cbmZ1bmN0aW9uIHJlbmRlclRlbXBsYXRlKGRhdGEpIHsgLy8gd2UgbmVlZCBkYXRhIG9ubHkgaWYgdXNlIHRlbXBsYXRpbmcgZW5naW5lXG5cdHRoaXMub3duZXIuZWwuaW5uZXJIVE1MID0gdGhpcy5fdGVtcGxhdGVcblx0XHRcdFx0XHRcdFx0XHQ/IHRoaXMuX3RlbXBsYXRlKGRhdGEpXG5cdFx0XHRcdFx0XHRcdFx0OiB0aGlzLl90ZW1wbGF0ZVN0cjtcblxuXHRyZXR1cm4gdGhpcztcbn1cblxuXG5mdW5jdGlvbiBiaW5kSW5uZXJDb21wb25lbnRzKHJlZ2lzdHJ5KSB7XG5cdHZhciB0aGlzQ29tcG9uZW50ID0gYmluZGVyKHRoaXMub3duZXIuZWwsIHJlZ2lzdHJ5KTtcblxuXHRpZiAodGhpcy5vd25lci5jb250YWluZXIpIC8vIFRPRE8gc2hvdWxkIGJlIGNoYW5nZWQgdG8gcmVjb25jaWxsYXRpb24gb2YgZXhpc3RpbmcgY2hpbGRyZW4gd2l0aCBuZXdcblx0XHR0aGlzLm93bmVyLmNvbnRhaW5lci5jaGlsZHJlbiA9IHRoaXNDb21wb25lbnRbdGhpcy5vd25lci5uYW1lXS5jb250YWluZXIuY2hpbGRyZW47XG5cblx0cmV0dXJuIHRoaXNDb21wb25lbnQ7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBDbGFzc1JlZ2lzdHJ5ID0gcmVxdWlyZSgnLi4vLi4vYWJzdHJhY3QvcmVnaXN0cnknKVxuXHQsIENvbXBvbmVudEZhY2V0ID0gcmVxdWlyZSgnLi4vY19mYWNldCcpO1xuXG52YXIgZmFjZXRzUmVnaXN0cnkgPSBuZXcgQ2xhc3NSZWdpc3RyeShDb21wb25lbnRGYWNldCk7XG5cbmZhY2V0c1JlZ2lzdHJ5LmFkZChDb21wb25lbnRGYWNldCk7XG5cbm1vZHVsZS5leHBvcnRzID0gZmFjZXRzUmVnaXN0cnk7XG5cbi8vIFRPRE8gLSByZWZhY3RvciBjb21wb25lbnRzIHJlZ2lzdHJ5IHRlc3QgaW50byBhIGZ1bmN0aW9uXG4vLyB0aGF0IHRlc3RzIGEgcmVnaXN0cnkgd2l0aCBhIGdpdmVuIGZvdW5kYXRpb24gY2xhc3Ncbi8vIE1ha2UgdGVzdCBmb3IgdGhpcyByZWdpc3RyeSBiYXNlZCBvbiB0aGlzIGZ1bmN0aW9uIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgRE9NRXZlbnRzU291cmNlID0gcmVxdWlyZSgnLi9kb21fZXZlbnRzX3NvdXJjZScpXG5cdCwgQ29tcG9uZW50ID0gcmVxdWlyZSgnLi4vY19jbGFzcycpXG5cdCwgQ29tcG9uZW50RGF0YVNvdXJjZUVycm9yID0gcmVxdWlyZSgnLi4vLi4vdXRpbC9lcnJvcicpLkNvbXBvbmVudERhdGFTb3VyY2Vcblx0LCBfID0gcmVxdWlyZSgnbW9sLXByb3RvJylcblx0LCBjaGVjayA9IHJlcXVpcmUoJy4uLy4uL3V0aWwvY2hlY2snKVxuXHQsIE1hdGNoID0gY2hlY2suTWF0Y2g7XG5cblxuLy8gY2xhc3MgdG8gaGFuZGxlIHN1YnNjcmlidGlvbnMgdG8gY2hhbmdlcyBpbiBET00gZm9yIFVJIChtYXliZSBhbHNvIGNvbnRlbnQgZWRpdGFibGUpIGVsZW1lbnRzXG52YXIgQ29tcG9uZW50RGF0YVNvdXJjZSA9IF8uY3JlYXRlU3ViY2xhc3MoRE9NRXZlbnRzU291cmNlLCAnQ29tcG9uZW50RGF0YVNvdXJjZScsIHRydWUpO1xuXG5cbl8uZXh0ZW5kUHJvdG8oQ29tcG9uZW50RGF0YVNvdXJjZSwge1xuXHQvLyBpbXBsZW1lbnRpbmcgTWVzc2FnZVNvdXJjZSBpbnRlcmZhY2Vcblx0aW5pdDogaW5pdENvbXBvbmVudERhdGFTb3VyY2UsXG5cdHRyYW5zbGF0ZVRvU291cmNlTWVzc2FnZTogdHJhbnNsYXRlVG9Eb21FdmVudCxcbiBcdGFkZFNvdXJjZUxpc3RlbmVyOiBhZGREb21FdmVudExpc3RlbmVyLFxuIFx0cmVtb3ZlU291cmNlTGlzdGVuZXI6IHJlbW92ZURvbUV2ZW50TGlzdGVuZXIsXG4gXHRmaWx0ZXJTb3VyY2VNZXNzYWdlOiBmaWx0ZXJEYXRhTWVzc2FnZSxcblxuIFx0Ly8gY2xhc3Mgc3BlY2lmaWMgbWV0aG9kc1xuIFx0Ly8gZG9tOiBpbXBsZW1lbnRlZCBpbiBET01FdmVudHNTb3VyY2VcbiBcdHZhbHVlOiBnZXREb21FbGVtZW50RGF0YVZhbHVlLFxuIFx0aGFuZGxlRXZlbnQ6IGhhbmRsZUV2ZW50LCAgLy8gZXZlbnQgZGlzcGF0Y2hlciAtIGFzIGRlZmluZWQgYnkgRXZlbnQgRE9NIEFQSVxuIFx0dHJpZ2dlcjogdHJpZ2dlckRhdGFNZXNzYWdlIC8vIHJlZGVmaW5lcyBtZXRob2Qgb2Ygc3VwZXJjbGFzcyBET01FdmVudHNTb3VyY2Vcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbXBvbmVudERhdGFTb3VyY2U7XG5cblxuZnVuY3Rpb24gaW5pdENvbXBvbmVudERhdGFTb3VyY2UoKSB7XG5cdERPTUV2ZW50c1NvdXJjZS5wcm90b3R5cGUuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG5cdHRoaXMudmFsdWUoKTsgLy8gc3RvcmVzIGN1cnJlbnQgY29tcG9uZW50IGRhdGEgdmFsdWUgaW4gdGhpcy5fdmFsdWVcbn1cblxuXG4vLyBUT0RPOiBzaG91bGQgcmV0dXJuIHZhbHVlIGRlcGVuZGVudCBvbiBlbGVtZW50IHRhZ1xuZnVuY3Rpb24gZ2V0RG9tRWxlbWVudERhdGFWYWx1ZSgpIHsgLy8gdmFsdWUgbWV0aG9kXG5cdHZhciBuZXdWYWx1ZSA9IHRoaXMuY29tcG9uZW50LmVsLnZhbHVlO1xuXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnX3ZhbHVlJywge1xuXHRcdGNvbmZpZ3VyYWJsZTogdHJ1ZSxcblx0XHR2YWx1ZTogbmV3VmFsdWVcblx0fSk7XG5cblx0cmV0dXJuIG5ld1ZhbHVlO1xufVxuXG5cbi8vIFRPRE86IHRoaXMgZnVuY3Rpb24gc2hvdWxkIHJldHVybiByZWxldmFudCBET00gZXZlbnQgZGVwZW5kZW50IG9uIGVsZW1lbnQgdGFnXG4vLyBDYW4gYWxzbyBpbXBsZW1lbnQgYmVmb3JlZGF0YWNoYW5nZWQgZXZlbnQgdG8gYWxsb3cgcHJldmVudGluZyB0aGUgY2hhbmdlXG5mdW5jdGlvbiB0cmFuc2xhdGVUb0RvbUV2ZW50KG1lc3NhZ2UpIHtcblx0aWYgKG1lc3NhZ2UgPT0gJ2RhdGFjaGFuZ2VkJylcblx0XHRyZXR1cm4gJ2lucHV0Jztcblx0ZWxzZVxuXHRcdHRocm93IG5ldyBDb21wb25lbnREYXRhU291cmNlRXJyb3IoJ3Vua25vd24gY29tcG9uZW50IGRhdGEgZXZlbnQnKTtcbn1cblxuXG5mdW5jdGlvbiBhZGREb21FdmVudExpc3RlbmVyKGV2ZW50VHlwZSkge1xuXHR0aGlzLmRvbSgpLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlLCB0aGlzLCBmYWxzZSk7IC8vIG5vIGNhcHR1cmluZ1xufVxuXG5cbmZ1bmN0aW9uIHJlbW92ZURvbUV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlKSB7XG5cdHRoaXMuZG9tKCkucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudFR5cGUsIHRoaXMsIGZhbHNlKTsgLy8gbm8gY2FwdHVyaW5nXG59XG5cblxuZnVuY3Rpb24gZmlsdGVyRGF0YU1lc3NhZ2UoZXZlbnRUeXBlLCBtZXNzYWdlLCBkYXRhKSB7XG5cdHJldHVybiBkYXRhLm5ld1ZhbHVlICE9IGRhdGEub2xkVmFsdWU7XG59O1xuXG5cbiAvLyBldmVudCBkaXNwYXRjaGVyIC0gYXMgZGVmaW5lZCBieSBFdmVudCBET00gQVBJXG5mdW5jdGlvbiBoYW5kbGVFdmVudChldmVudCkge1xuXHR2YXIgb2xkVmFsdWUgPSB0aGlzLl92YWx1ZTtcblxuXHR0aGlzLmRpc3BhdGNoTWVzc2FnZShldmVudC50eXBlLCB7XG5cdFx0b2xkVmFsdWU6IG9sZFZhbHVlLFxuXHRcdG5ld1ZhbHVlOiB0aGlzLnZhbHVlKClcblx0fSk7XG59XG5cblxuZnVuY3Rpb24gdHJpZ2dlckRhdGFNZXNzYWdlKG1lc3NhZ2UsIGRhdGEpIHtcblx0Ly8gVE9ETyAtIG9wcG9zaXRlIHRyYW5zbGF0aW9uICsgZXZlbnQgdHJpZ2dlciBcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKTtcblxuXG4vLyBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9SZWZlcmVuY2UvRXZlbnRzXG5cbnZhciBldmVudFR5cGVzID0ge1xuXHRDbGlwYm9hcmRFdmVudDogWydjb3B5JywgJ2N1dCcsICdwYXN0ZScsICdiZWZvcmVjb3B5JywgJ2JlZm9yZWN1dCcsICdiZWZvcmVwYXN0ZSddLFxuXHRFdmVudDogWydpbnB1dCcsICdyZWFkeXN0YXRlY2hhbmdlJ10sXG5cdEZvY3VzRXZlbnQ6IFsnZm9jdXMnLCAnYmx1cicsICdmb2N1c2luJywgJ2ZvY3Vzb3V0J10sXG5cdEtleWJvYXJkRXZlbnQ6IFsna2V5ZG93bicsICdrZXlwcmVzcycsICAna2V5dXAnXSxcblx0TW91c2VFdmVudDogWydjbGljaycsICdjb250ZXh0bWVudScsICdkYmxjbGljaycsICdtb3VzZWRvd24nLCAnbW91c2V1cCcsXG5cdFx0XHRcdCAnbW91c2VlbnRlcicsICdtb3VzZWxlYXZlJywgJ21vdXNlbW92ZScsICdtb3VzZW91dCcsICdtb3VzZW92ZXInLFxuXHRcdFx0XHQgJ3Nob3cnIC8qIGNvbnRleHQgbWVudSAqL10sXG5cdFRvdWNoRXZlbnQ6IFsndG91Y2hzdGFydCcsICd0b3VjaGVuZCcsICd0b3VjaG1vdmUnLCAndG91Y2hlbnRlcicsICd0b3VjaGxlYXZlJywgJ3RvdWNoY2FuY2VsJ10sXG59O1xuXG5cbi8vIG1vY2sgd2luZG93IGFuZCBldmVudCBjb25zdHJ1Y3RvcnMgZm9yIHRlc3RpbmdcbmlmICh0eXBlb2Ygd2luZG93ICE9ICd1bmRlZmluZWQnKVxuXHR2YXIgZ2xvYmFsID0gd2luZG93O1xuZWxzZSB7XG5cdGdsb2JhbCA9IHt9O1xuXHRfLmVhY2hLZXkoZXZlbnRUeXBlcywgZnVuY3Rpb24oZVR5cGVzLCBldmVudENvbnN0cnVjdG9yTmFtZSkge1xuXHRcdHZhciBldmVudHNDb25zdHJ1Y3Rvcjtcblx0XHRldmFsKFxuXHRcdFx0J2V2ZW50c0NvbnN0cnVjdG9yID0gZnVuY3Rpb24gJyArIGV2ZW50Q29uc3RydWN0b3JOYW1lICsgJyh0eXBlLCBwcm9wZXJ0aWVzKSB7IFxcXG5cdFx0XHRcdHRoaXMudHlwZSA9IHR5cGU7IFxcXG5cdFx0XHRcdF8uZXh0ZW5kKHRoaXMsIHByb3BlcnRpZXMpOyBcXFxuXHRcdFx0fTsnXG5cdFx0KTtcblx0XHRnbG9iYWxbZXZlbnRDb25zdHJ1Y3Rvck5hbWVdID0gZXZlbnRzQ29uc3RydWN0b3I7XG5cdH0pO1xufVxuXG5cbnZhciBkb21FdmVudHNDb25zdHJ1Y3RvcnMgPSB7fTtcblxuXy5lYWNoS2V5KGV2ZW50VHlwZXMsIGZ1bmN0aW9uKGVUeXBlcywgZXZlbnRDb25zdHJ1Y3Rvck5hbWUpIHtcblx0ZVR5cGVzLmZvckVhY2goZnVuY3Rpb24odHlwZSkge1xuXHRcdGlmIChPYmplY3QuaGFzT3duUHJvcGVydHkoZG9tRXZlbnRzQ29uc3RydWN0b3JzLCB0eXBlKSlcblx0XHRcdHRocm93IG5ldyBFcnJvcignZHVwbGljYXRlIGV2ZW50IHR5cGUgJyArIHR5cGUpO1xuXG5cdFx0ZG9tRXZlbnRzQ29uc3RydWN0b3JzW3R5cGVdID0gZ2xvYmFsW2V2ZW50Q29uc3RydWN0b3JOYW1lXTtcblx0fSk7XG59KTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGRvbUV2ZW50c0NvbnN0cnVjdG9ycztcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIE1lc3NhZ2VTb3VyY2UgPSByZXF1aXJlKCcuLi8uLi9tZXNzZW5nZXIvbWVzc2FnZV9zb3VyY2UnKVxuXHQsIENvbXBvbmVudCA9IHJlcXVpcmUoJy4uL2NfY2xhc3MnKVxuXHQsIGRvbUV2ZW50c0NvbnN0cnVjdG9ycyA9IHJlcXVpcmUoJy4vZG9tX2V2ZW50c19jb25zdHJ1Y3RvcnMnKSAvLyBUT0RPIG1lcmdlIHdpdGggRE9NRXZlbnRTb3VyY2UgPz9cblx0LCBfID0gcmVxdWlyZSgnbW9sLXByb3RvJylcblx0LCBjaGVjayA9IHJlcXVpcmUoJy4uLy4uL3V0aWwvY2hlY2snKVxuXHQsIE1hdGNoID0gY2hlY2suTWF0Y2g7XG5cbnZhciBET01FdmVudHNTb3VyY2UgPSBfLmNyZWF0ZVN1YmNsYXNzKE1lc3NhZ2VTb3VyY2UsICdET01NZXNzYWdlU291cmNlJywgdHJ1ZSk7XG5cblxuXy5leHRlbmRQcm90byhET01FdmVudHNTb3VyY2UsIHtcblx0Ly8gaW1wbGVtZW50aW5nIE1lc3NhZ2VTb3VyY2UgaW50ZXJmYWNlXG5cdGluaXQ6IGluaXREb21FdmVudHNTb3VyY2UsXG5cdHRyYW5zbGF0ZVRvU291cmNlTWVzc2FnZTogdHJhbnNsYXRlVG9Eb21FdmVudCxcbiBcdGFkZFNvdXJjZUxpc3RlbmVyOiBhZGREb21FdmVudExpc3RlbmVyLFxuIFx0cmVtb3ZlU291cmNlTGlzdGVuZXI6IHJlbW92ZURvbUV2ZW50TGlzdGVuZXIsXG4gXHRmaWx0ZXJTb3VyY2VNZXNzYWdlOiBmaWx0ZXJDYXB0dXJlZERvbUV2ZW50LFxuXG4gXHQvLyBjbGFzcyBzcGVjaWZpYyBtZXRob2RzXG4gXHRkb206IGdldERvbUVsZW1lbnQsXG4gXHRoYW5kbGVFdmVudDogaGFuZGxlRXZlbnQsICAvLyBldmVudCBkaXNwYXRjaGVyIC0gYXMgZGVmaW5lZCBieSBFdmVudCBET00gQVBJXG4gXHR0cmlnZ2VyOiB0cmlnZ2VyRG9tRXZlbnRcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IERPTUV2ZW50c1NvdXJjZTtcblxuXG52YXIgdXNlQ2FwdHVyZVBhdHRlcm4gPSAvX19jYXB0dXJlJC87XG5cblxuZnVuY3Rpb24gaW5pdERvbUV2ZW50c1NvdXJjZShob3N0T2JqZWN0LCBwcm94eU1ldGhvZHMsIGNvbXBvbmVudCkge1xuXHRjaGVjayhjb21wb25lbnQsIENvbXBvbmVudCk7XG5cdE1lc3NhZ2VTb3VyY2UucHJvdG90eXBlLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuXHR0aGlzLmNvbXBvbmVudCA9IGNvbXBvbmVudDtcblxuXHQvLyB0aGlzLm1lc3NlbmdlciBpcyBzZXQgYnkgTWVzc2VuZ2VyIGNsYXNzXG59XG5cblxuZnVuY3Rpb24gZ2V0RG9tRWxlbWVudCgpIHtcblx0cmV0dXJuIHRoaXMuY29tcG9uZW50LmVsO1xufVxuXG5cbmZ1bmN0aW9uIHRyYW5zbGF0ZVRvRG9tRXZlbnQobWVzc2FnZSkge1xuXHRpZiAodXNlQ2FwdHVyZVBhdHRlcm4udGVzdChtZXNzYWdlKSlcblx0XHRtZXNzYWdlID0gbWVzc2FnZS5yZXBsYWNlKHVzZUNhcHR1cmVQYXR0ZXJuLCAnJyk7XG5cdHJldHVybiBtZXNzYWdlO1xufVxuXG5cbmZ1bmN0aW9uIGFkZERvbUV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlKSB7XG5cdHRoaXMuZG9tKCkuYWRkRXZlbnRMaXN0ZW5lcihldmVudFR5cGUsIHRoaXMsIGZhbHNlKTtcbn1cblxuXG5mdW5jdGlvbiByZW1vdmVEb21FdmVudExpc3RlbmVyKGV2ZW50VHlwZSkge1xuXHR0aGlzLmRvbSgpLnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlLCB0aGlzLCBmYWxzZSk7XG59XG5cblxuZnVuY3Rpb24gZmlsdGVyQ2FwdHVyZWREb21FdmVudChldmVudFR5cGUsIG1lc3NhZ2UsIGV2ZW50KSB7XG5cdHZhciBpc0NhcHR1cmVQaGFzZTtcblx0aWYgKHR5cGVvZiB3aW5kb3cgIT0gJ3VuZGVmaW5lZCcpXG5cdFx0aXNDYXB0dXJlUGhhc2UgPSBldmVudC5ldmVudFBoYXNlID09IHdpbmRvdy5FdmVudC5DQVBUVVJJTkdfUEhBU0U7XG5cblx0cmV0dXJuICghIGlzQ2FwdHVyZVBoYXNlIHx8IChpc0NhcHR1cmVQaGFzZSAmJiB1c2VDYXB0dXJlUGF0dGVybi50ZXN0KG1lc3NhZ2UpKSk7XG59XG5cblxuLy8gZXZlbnQgZGlzcGF0Y2hlciAtIGFzIGRlZmluZWQgYnkgRXZlbnQgRE9NIEFQSVxuZnVuY3Rpb24gaGFuZGxlRXZlbnQoZXZlbnQpIHtcblx0dGhpcy5kaXNwYXRjaE1lc3NhZ2UoZXZlbnQudHlwZSwgZXZlbnQpO1xufVxuXG5cbi8vIFRPRE8gbWFrZSB3b3JrIHdpdGggbWVzc2FnZXMgKHdpdGggX2NhcHR1cmUpXG5mdW5jdGlvbiB0cmlnZ2VyRG9tRXZlbnQoZXZlbnRUeXBlLCBwcm9wZXJ0aWVzKSB7XG5cdGNoZWNrKGV2ZW50VHlwZSwgU3RyaW5nKTtcblx0Y2hlY2socHJvcGVydGllcywgTWF0Y2guT3B0aW9uYWwoT2JqZWN0KSk7XG5cblx0dmFyIEV2ZW50Q29uc3RydWN0b3IgPSBkb21FdmVudHNDb25zdHJ1Y3RvcnNbZXZlbnRUeXBlXTtcblxuXHRpZiAodHlwZW9mIGV2ZW50Q29uc3RydWN0b3IgIT0gJ2Z1bmN0aW9uJylcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ3Vuc3VwcG9ydGVkIGV2ZW50IHR5cGUnKTtcblxuXHQvLyBjaGVjayBpZiBpdCBpcyBjb3JyZWN0XG5cdGlmICh0eXBlb2YgcHJvcGVydGllcyAhPSAndW5kZWZpbmVkJylcblx0XHRwcm9wZXJ0aWVzLnR5cGUgPSBldmVudFR5cGU7XG5cblx0dmFyIGRvbUV2ZW50ID0gRXZlbnRDb25zdHJ1Y3RvcihldmVudFR5cGUsIHByb3BlcnRpZXMpO1xuXG5cdHZhciBub3RDYW5jZWxsZWQgPSB0aGlzLmRvbSgpLmRpc3BhdGNoRXZlbnQoZG9tRXZlbnQpO1xuXG5cdHJldHVybiBub3RDYW5jZWxsZWQ7XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgTWVzc2FnZVNvdXJjZSA9IHJlcXVpcmUoJy4uLy4uL21lc3Nlbmdlci9tZXNzYWdlX3NvdXJjZScpXG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpXG5cdCwgY2hlY2sgPSByZXF1aXJlKCcuLi8uLi91dGlsL2NoZWNrJylcblx0LCBNYXRjaCA9IGNoZWNrLk1hdGNoO1xuXG52YXIgaUZyYW1lTWVzc2FnZVNvdXJjZSA9IF8uY3JlYXRlU3ViY2xhc3MoTWVzc2FnZVNvdXJjZSwgJ2lGcmFtZU1lc3NhZ2VTb3VyY2UnLCB0cnVlKTtcblxuXG5fLmV4dGVuZFByb3RvKGlGcmFtZU1lc3NhZ2VTb3VyY2UsIHtcblx0Ly8gaW1wbGVtZW50aW5nIE1lc3NhZ2VTb3VyY2UgaW50ZXJmYWNlXG5cdGluaXQ6IGluaXRJRnJhbWVNZXNzYWdlU291cmNlLFxuXHR0cmFuc2xhdGVUb1NvdXJjZU1lc3NhZ2U6IHRyYW5zbGF0ZVRvSUZyYW1lTWVzc2FnZSxcbiBcdGFkZFNvdXJjZUxpc3RlbmVyOiBhZGRJRnJhbWVNZXNzYWdlTGlzdGVuZXIsXG4gXHRyZW1vdmVTb3VyY2VMaXN0ZW5lcjogcmVtb3ZlSUZyYW1lTWVzc2FnZUxpc3RlbmVyLFxuIFx0ZmlsdGVyU291cmNlTWVzc2FnZTogZmlsdGVyUmVjaWV2ZWRJRnJhbWVNZXNzYWdlLFxuXG4gXHQvL2NsYXNzIHNwZWNpZmljIG1ldGhvZHNcbiBcdHBvc3Q6IHBvc3RUb090aGVyV2luZG93LFxuIFx0aGFuZGxlRXZlbnQ6IGhhbmRsZUV2ZW50ICAvLyBldmVudCBkaXNwYXRjaGVyIC0gYXMgZGVmaW5lZCBieSBFdmVudCBET00gQVBJXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBpRnJhbWVNZXNzYWdlU291cmNlO1xuXG5cbmZ1bmN0aW9uIGluaXRJRnJhbWVNZXNzYWdlU291cmNlKGhvc3RPYmplY3QsIHByb3h5TWV0aG9kcykge1xuXHRjaGVjayhob3N0T2JqZWN0LCBPYmplY3QpO1xuXHRNZXNzYWdlU291cmNlLnByb3RvdHlwZS5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cblx0aWYgKGhvc3RPYmplY3Qub3duZXIuZWwubm9kZU5hbWUgPT0gJ0lGUkFNRScpXG5cdFx0dGhpcy5fcG9zdFRvID0gaG9zdE9iamVjdC5vd25lci5lbC5jb250ZW50V2luZG93O1xuXHRlbHNlXG5cdFx0dGhpcy5fcG9zdFRvID0gd2luZG93LnBhcmVudDtcblxuXHR0aGlzLl9saXN0ZW5UbyA9IHdpbmRvdztcbn1cblxuXG5mdW5jdGlvbiB0cmFuc2xhdGVUb0lGcmFtZU1lc3NhZ2UobWVzc2FnZSkge1xuXHRyZXR1cm4gJ21lc3NhZ2UnOyAvLyBzb3VyY2VNZXNzYWdlXG59XG5cblxuZnVuY3Rpb24gYWRkSUZyYW1lTWVzc2FnZUxpc3RlbmVyKGV2ZW50VHlwZSkge1xuXHR0aGlzLl9saXN0ZW5Uby5hZGRFdmVudExpc3RlbmVyKGV2ZW50VHlwZSwgdGhpcywgZmFsc2UpO1xufVxuXG5cbmZ1bmN0aW9uIHJlbW92ZUlGcmFtZU1lc3NhZ2VMaXN0ZW5lcihldmVudFR5cGUpIHtcblx0dGhpcy5fbGlzdGVuVG8ucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudFR5cGUsIHRoaXMsIGZhbHNlKTtcbn1cblxuXG5mdW5jdGlvbiBmaWx0ZXJSZWNpZXZlZElGcmFtZU1lc3NhZ2UoZXZlbnRUeXBlLCBtZXNzYWdlLCBldmVudCkge1xuXHRyZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gcG9zdFRvT3RoZXJXaW5kb3coZXZlbnRUeXBlLCBtZXNzYWdlKSB7XG5cdG1lc3NhZ2UudHlwZSA9IGV2ZW50VHlwZTtcblx0dGhpcy5fcG9zdFRvLnBvc3RNZXNzYWdlKG1lc3NhZ2UsICcqJyk7XG59XG5cbmZ1bmN0aW9uIGhhbmRsZUV2ZW50KGV2ZW50KSB7XG5cdHRoaXMuZGlzcGF0Y2hNZXNzYWdlKGV2ZW50LnR5cGUsIGV2ZW50KTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIENsYXNzUmVnaXN0cnkgPSByZXF1aXJlKCcuLi9hYnN0cmFjdC9yZWdpc3RyeScpXG5cdCwgQ29tcG9uZW50ID0gcmVxdWlyZSgnLi9jX2NsYXNzJyk7XG5cbnZhciBjb21wb25lbnRzUmVnaXN0cnkgPSBuZXcgQ2xhc3NSZWdpc3RyeShDb21wb25lbnQpO1xuXG5jb21wb25lbnRzUmVnaXN0cnkuYWRkKENvbXBvbmVudCk7XG5cbm1vZHVsZS5leHBvcnRzID0gY29tcG9uZW50c1JlZ2lzdHJ5O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ29tcG9uZW50ID0gcmVxdWlyZSgnLi4vY19jbGFzcycpXG5cdCwgY29tcG9uZW50c1JlZ2lzdHJ5ID0gcmVxdWlyZSgnLi4vY19yZWdpc3RyeScpO1xuXG5cbnZhciBWaWV3ID0gQ29tcG9uZW50LmNyZWF0ZUNvbXBvbmVudENsYXNzKCdWaWV3JywgWydjb250YWluZXInXSk7XG5cbmNvbXBvbmVudHNSZWdpc3RyeS5hZGQoVmlldyk7XG5cbm1vZHVsZS5leHBvcnRzID0gVmlldztcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGNvbmZpZztcblxuZnVuY3Rpb24gY29uZmlnKG9wdGlvbnMpIHtcblx0Xy5kZWVwRXh0ZW5kKGNvbmZpZywgb3B0aW9ucyk7XG59XG5cbmNvbmZpZyh7XG5cdGF0dHJzOiB7XG5cdFx0YmluZDogJ21sLWJpbmQnLFxuXHRcdGxvYWQ6ICdtbC1sb2FkJ1xuXHR9XG59KTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKTtcblxubW9kdWxlLmV4cG9ydHMgPSBGYWNldDtcblxuZnVuY3Rpb24gRmFjZXQob3duZXIsIGNvbmZpZykge1xuXHR0aGlzLm93bmVyID0gb3duZXI7XG5cdHRoaXMuY29uZmlnID0gY29uZmlnIHx8IHt9O1xuXHR0aGlzLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn1cblxuXy5leHRlbmRQcm90byhGYWNldCwge1xuXHRpbml0OiBmdW5jdGlvbigpIHt9XG59KTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIEZhY2V0ID0gcmVxdWlyZSgnLi9mX2NsYXNzJylcblx0LCBfID0gcmVxdWlyZSgnbW9sLXByb3RvJylcblx0LCBjaGVjayA9IHJlcXVpcmUoJy4uL3V0aWwvY2hlY2snKVxuXHQsIE1hdGNoID0gY2hlY2suTWF0Y2g7XG5cbm1vZHVsZS5leHBvcnRzID0gRmFjZXRlZE9iamVjdDtcblxuLy8gYWJzdHJhY3QgY2xhc3MgZm9yIGZhY2V0ZWQgb2JqZWN0XG5mdW5jdGlvbiBGYWNldGVkT2JqZWN0KCkge1xuXHQvLyBUT0RPIGluc3RhbnRpYXRlIGZhY2V0cyBpZiBjb25maWd1cmF0aW9uIGlzbid0IHBhc3NlZFxuXHQvLyB3cml0ZSBhIHRlc3QgdG8gY2hlY2sgaXRcblx0dmFyIGZhY2V0c0NvbmZpZyA9IF8uY2xvbmUodGhpcy5mYWNldHNDb25maWcgfHwge30pO1xuXG5cdHZhciB0aGlzQ2xhc3MgPSB0aGlzLmNvbnN0cnVjdG9yXG5cdFx0LCBmYWNldHNEZXNjcmlwdG9ycyA9IHt9XG5cdFx0LCBmYWNldHMgPSB7fTtcblxuXHRpZiAodGhpcy5jb25zdHJ1Y3RvciA9PSBGYWNldGVkT2JqZWN0KVx0XHRcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ0ZhY2V0ZWRPYmplY3QgaXMgYW4gYWJzdHJhY3QgY2xhc3MsIGNhblxcJ3QgYmUgaW5zdGFudGlhdGVkJyk7XG5cblx0aWYgKHRoaXMuZmFjZXRzKVxuXHRcdF8uZWFjaEtleSh0aGlzLmZhY2V0cywgaW5zdGFudGlhdGVGYWNldCwgdGhpcywgdHJ1ZSk7XG5cblx0dmFyIHVudXNlZEZhY2V0c05hbWVzID0gT2JqZWN0LmtleXMoZmFjZXRzQ29uZmlnKTtcblx0aWYgKHVudXNlZEZhY2V0c05hbWVzLmxlbmd0aClcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ0NvbmZpZ3VyYXRpb24gZm9yIHVua25vd24gZmFjZXQocykgcGFzc2VkOiAnICsgdW51c2VkRmFjZXRzTmFtZXMuam9pbignLCAnKSk7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnRpZXModGhpcywgZmFjZXRzRGVzY3JpcHRvcnMpO1xuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ2ZhY2V0cycsIHsgdmFsdWU6IGZhY2V0cyB9KTtcdFxuXG5cdC8vIGNhbGxpbmcgaW5pdCBpZiBpdCBpcyBkZWZpbmVkIGluIHRoZSBjbGFzc1xuXHRpZiAodGhpcy5pbml0KVxuXHRcdHRoaXMuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG5cdGZ1bmN0aW9uIGluc3RhbnRpYXRlRmFjZXQoRmFjZXRDbGFzcywgZmN0KSB7XG5cdFx0dmFyIGZhY2V0T3B0cyA9IGZhY2V0c0NvbmZpZ1tmY3RdO1xuXHRcdGRlbGV0ZSBmYWNldHNDb25maWdbZmN0XTtcblxuXHRcdGZhY2V0c1tmY3RdID0gbmV3IEZhY2V0Q2xhc3ModGhpcywgZmFjZXRPcHRzKTtcblxuXHRcdGZhY2V0c0Rlc2NyaXB0b3JzW2ZjdF0gPSB7XG5cdFx0XHRlbnVtZXJhYmxlOiBmYWxzZSxcblx0XHRcdHZhbHVlOiBmYWNldHNbZmN0XVxuXHRcdH07XG5cdH1cbn1cblxuXG5fLmV4dGVuZFByb3RvKEZhY2V0ZWRPYmplY3QsIHtcblx0YWRkRmFjZXQ6IGFkZEZhY2V0XG59KTtcblxuXG5mdW5jdGlvbiBhZGRGYWNldChGYWNldENsYXNzLCBmYWNldE9wdHMsIGZhY2V0TmFtZSkge1xuXHRjaGVjayhGYWNldENsYXNzLCBGdW5jdGlvbik7XG5cdGNoZWNrKGZhY2V0TmFtZSwgTWF0Y2guT3B0aW9uYWwoU3RyaW5nKSk7XG5cblx0ZmFjZXROYW1lID0gXy5maXJzdExvd2VyQ2FzZShmYWNldE5hbWUgfHwgRmFjZXRDbGFzcy5uYW1lKTtcblxuXHR2YXIgcHJvdG9GYWNldHMgPSB0aGlzLmNvbnN0cnVjdG9yLnByb3RvdHlwZS5mYWNldHM7XG5cblx0aWYgKHByb3RvRmFjZXRzICYmIHByb3RvRmFjZXRzW2ZhY2V0TmFtZV0pXG5cdFx0dGhyb3cgbmV3IEVycm9yKCdmYWNldCAnICsgZmFjZXROYW1lICsgJyBpcyBhbHJlYWR5IHBhcnQgb2YgdGhlIGNsYXNzICcgKyB0aGlzLmNvbnN0cnVjdG9yLm5hbWUpO1xuXG5cdGlmICh0aGlzW2ZhY2V0TmFtZV0pXG5cdFx0dGhyb3cgbmV3IEVycm9yKCdmYWNldCAnICsgZmFjZXROYW1lICsgJyBpcyBhbHJlYWR5IHByZXNlbnQgaW4gb2JqZWN0Jyk7XG5cblx0dmFyIG5ld0ZhY2V0ID0gdGhpcy5mYWNldHNbZmFjZXROYW1lXSA9IG5ldyBGYWNldENsYXNzKHRoaXMsIGZhY2V0T3B0cyk7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIGZhY2V0TmFtZSwge1xuXHRcdGVudW1lcmFibGU6IGZhbHNlLFxuXHRcdHZhbHVlOiBuZXdGYWNldFxuXHR9KTtcblxuXHRyZXR1cm4gbmV3RmFjZXQ7XG59XG5cblxuLy8gZmFjdG9yeSB0aGF0IGNyZWF0ZXMgY2xhc3NlcyAoY29uc3RydWN0b3JzKSBmcm9tIHRoZSBtYXAgb2YgZmFjZXRzXG4vLyB0aGVzZSBjbGFzc2VzIGluaGVyaXQgZnJvbSBGYWNldGVkT2JqZWN0XG5GYWNldGVkT2JqZWN0LmNyZWF0ZUZhY2V0ZWRDbGFzcyA9IGZ1bmN0aW9uIChuYW1lLCBmYWNldHNDbGFzc2VzLCBmYWNldHNDb25maWcpIHtcblx0Y2hlY2sobmFtZSwgU3RyaW5nKTtcblx0Y2hlY2soZmFjZXRzQ2xhc3NlcywgTWF0Y2guT2JqZWN0SGFzaChGdW5jdGlvbiAvKiBNYXRjaC5TdWJjbGFzcyhGYWNldCwgdHJ1ZSkgVE9ETyAtIGZpeCAqLykpO1xuXG5cdHZhciBGYWNldGVkQ2xhc3MgPSBfLmNyZWF0ZVN1YmNsYXNzKHRoaXMsIG5hbWUsIHRydWUpO1xuXG5cdF8uZXh0ZW5kUHJvdG8oRmFjZXRlZENsYXNzLCB7XG5cdFx0ZmFjZXRzOiBmYWNldHNDbGFzc2VzLFxuXHRcdGZhY2V0c0NvbmZpZzogZmFjZXRzQ29uZmlnXG5cdH0pO1xuXHRyZXR1cm4gRmFjZXRlZENsYXNzO1xufTtcblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgbWlsb01haWwgPSByZXF1aXJlKCcuL21haWwnKVxuXHQsIHJlcXVlc3QgPSByZXF1aXJlKCcuL3V0aWwvcmVxdWVzdCcpXG5cdCwgbG9nZ2VyID0gcmVxdWlyZSgnLi91dGlsL2xvZ2dlcicpXG5cdCwgY29uZmlnID0gcmVxdWlyZSgnLi9jb25maWcnKVxuXHQsIExvYWRBdHRyaWJ1dGUgPSByZXF1aXJlKCcuL2F0dHJpYnV0ZS9hX2xvYWQnKVxuXHQsIExvYWRlckVycm9yID0gcmVxdWlyZSgnLi91dGlsL2Vycm9yJykuTG9hZGVyO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gbG9hZGVyO1xuXG5cbmZ1bmN0aW9uIGxvYWRlcihyb290RWwsIGNhbGxiYWNrKSB7XHRcblx0bWlsb01haWwub25NZXNzYWdlKCdkb21yZWFkeScsIGZ1bmN0aW9uKCkge1xuXHRcdGlmICh0eXBlb2Ygcm9vdEVsID09ICdmdW5jdGlvbicpIHtcblx0XHRcdGNhbGxiYWNrID0gcm9vdEVsO1xuXHRcdFx0cm9vdEVsID0gdW5kZWZpbmVkO1xuXHRcdH1cblxuXHRcdHJvb3RFbCA9IHJvb3RFbCB8fCBkb2N1bWVudC5ib2R5O1xuXG5cdFx0bWlsb01haWwucG9zdE1lc3NhZ2UoJ2xvYWRlcicsIHsgc3RhdGU6ICdzdGFydGVkJyB9KTtcblx0XHRfbG9hZGVyKHJvb3RFbCwgZnVuY3Rpb24odmlld3MpIHtcblx0XHRcdG1pbG9NYWlsLnBvc3RNZXNzYWdlKCdsb2FkZXInLCB7IFxuXHRcdFx0XHRzdGF0ZTogJ2ZpbmlzaGVkJyxcblx0XHRcdFx0dmlld3M6IHZpZXdzXG5cdFx0XHR9KTtcblx0XHRcdGNhbGxiYWNrKHZpZXdzKTtcblx0XHR9KTtcblx0fSk7XG59XG5cblxuZnVuY3Rpb24gX2xvYWRlcihyb290RWwsIGNhbGxiYWNrKSB7XG5cdHZhciBsb2FkRWxlbWVudHMgPSByb290RWwucXVlcnlTZWxlY3RvckFsbCgnWycgKyBjb25maWcuYXR0cnMubG9hZCArICddJyk7XG5cblx0dmFyIHZpZXdzID0ge31cblx0XHQsIHRvdGFsQ291bnQgPSBsb2FkRWxlbWVudHMubGVuZ3RoXG5cdFx0LCBsb2FkZWRDb3VudCA9IDA7XG5cblx0QXJyYXkucHJvdG90eXBlLmZvckVhY2guY2FsbChsb2FkRWxlbWVudHMsIGZ1bmN0aW9uIChlbCkge1xuXHRcdGxvYWRWaWV3KGVsLCBmdW5jdGlvbihlcnIpIHtcblx0XHRcdHZpZXdzW2VsLmlkXSA9IGVyciB8fCBlbDtcblx0XHRcdGxvYWRlZENvdW50Kys7XG5cdFx0XHRpZiAobG9hZGVkQ291bnQgPT0gdG90YWxDb3VudClcblx0XHRcdFx0Y2FsbGJhY2sodmlld3MpO1xuXHRcdH0pO1xuXHR9KTtcbn07XG5cblxuZnVuY3Rpb24gbG9hZFZpZXcoZWwsIGNhbGxiYWNrKSB7XG5cdGlmIChlbC5jaGlsZHJlbi5sZW5ndGgpXG5cdFx0dGhyb3cgbmV3IExvYWRlckVycm9yKCdjYW5cXCd0IGxvYWQgaHRtbCBpbnRvIGVsZW1lbnQgdGhhdCBpcyBub3QgZW1wdHknKTtcblxuXHR2YXIgYXR0ciA9IG5ldyBMb2FkQXR0cmlidXRlKGVsKTtcblxuXHRhdHRyLnBhcnNlKCkudmFsaWRhdGUoKTtcblxuXHRyZXF1ZXN0LmdldChhdHRyLmxvYWRVcmwsIGZ1bmN0aW9uKGVyciwgaHRtbCkge1xuXHRcdGlmIChlcnIpIHtcblx0XHRcdGVyci5tZXNzYWdlID0gZXJyLm1lc3NhZ2UgfHwgJ2NhblxcJ3QgbG9hZCBmaWxlICcgKyBhdHRyLmxvYWRVcmw7XG5cdFx0XHQvLyBsb2dnZXIuZXJyb3IoZXJyLm1lc3NhZ2UpO1xuXHRcdFx0Y2FsbGJhY2soZXJyKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRlbC5pbm5lckhUTUwgPSBodG1sO1xuXHRcdGNhbGxiYWNrKG51bGwpO1xuXHR9KTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIE1lc3NlbmdlciA9IHJlcXVpcmUoJy4uL21lc3NlbmdlcicpXG5cdCwgTWFpbE1lc3NhZ2VTb3VyY2UgPSByZXF1aXJlKCcuL21haWxfc291cmNlJyk7XG5cblxudmFyIG1haWxNc2dTb3VyY2UgPSBuZXcgTWFpbE1lc3NhZ2VTb3VyY2UoKTtcblxudmFyIG1pbG9NYWlsID0gbmV3IE1lc3Nlbmdlcih1bmRlZmluZWQsIHVuZGVmaW5lZCwgbWFpbE1zZ1NvdXJjZSk7XG5cbm1vZHVsZS5leHBvcnRzID0gbWlsb01haWw7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBNZXNzYWdlU291cmNlID0gcmVxdWlyZSgnLi4vbWVzc2VuZ2VyL21lc3NhZ2Vfc291cmNlJylcblx0LCBkb21FdmVudHNDb25zdHJ1Y3RvcnMgPSByZXF1aXJlKCcuLi9jb21wb25lbnRzL2NfbWVzc2FnZV9zb3VyY2VzL2RvbV9ldmVudHNfY29uc3RydWN0b3JzJylcblx0LCBNYWlsTWVzc2FnZVNvdXJjZUVycm9yID0gcmVxdWlyZSgnLi4vdXRpbC9lcnJvcicpLk1haWxNZXNzYWdlU291cmNlXG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpXG5cdCwgY2hlY2sgPSByZXF1aXJlKCcuLi91dGlsL2NoZWNrJylcblx0LCBNYXRjaCA9IGNoZWNrLk1hdGNoO1xuXG5cbnZhciBNYWlsTWVzc2FnZVNvdXJjZSA9IF8uY3JlYXRlU3ViY2xhc3MoTWVzc2FnZVNvdXJjZSwgJ01haWxNZXNzYWdlU291cmNlJywgdHJ1ZSk7XG5cblxuXy5leHRlbmRQcm90byhNYWlsTWVzc2FnZVNvdXJjZSwge1xuXHQvLyBpbXBsZW1lbnRpbmcgTWVzc2FnZVNvdXJjZSBpbnRlcmZhY2Vcblx0Ly8gaW5pdDogZGVmaW5lZCBpbiBNZXNzYWdlU291cmNlXG5cdHRyYW5zbGF0ZVRvU291cmNlTWVzc2FnZTogdHJhbnNsYXRlVG9Eb21FdmVudCxcbiBcdGFkZFNvdXJjZUxpc3RlbmVyOiBhZGREb21FdmVudExpc3RlbmVyLFxuIFx0cmVtb3ZlU291cmNlTGlzdGVuZXI6IHJlbW92ZURvbUV2ZW50TGlzdGVuZXIsXG4gXHRmaWx0ZXJTb3VyY2VNZXNzYWdlOiBmaWx0ZXJEb21FdmVudCxcblxuIFx0Ly8gY2xhc3Mgc3BlY2lmaWMgbWV0aG9kc1xuIFx0aGFuZGxlRXZlbnQ6IGhhbmRsZUV2ZW50LCAgLy8gZXZlbnQgZGlzcGF0Y2hlciAtIGFzIGRlZmluZWQgYnkgRXZlbnQgRE9NIEFQSVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gTWFpbE1lc3NhZ2VTb3VyY2U7XG5cblxuLy8gVE9ETzogdGhpcyBmdW5jdGlvbiBzaG91bGQgcmV0dXJuIHJlbGV2YW50IERPTSBldmVudCBkZXBlbmRlbnQgb24gZWxlbWVudCB0YWdcbi8vIENhbiBhbHNvIGltcGxlbWVudCBiZWZvcmVkYXRhY2hhbmdlZCBldmVudCB0byBhbGxvdyBwcmV2ZW50aW5nIHRoZSBjaGFuZ2VcbmZ1bmN0aW9uIHRyYW5zbGF0ZVRvRG9tRXZlbnQobWVzc2FnZSkge1xuXHRpZiAobWVzc2FnZSA9PSAnZG9tcmVhZHknKVxuXHRcdHJldHVybiAncmVhZHlzdGF0ZWNoYW5nZSc7XG59XG5cblxuZnVuY3Rpb24gYWRkRG9tRXZlbnRMaXN0ZW5lcihldmVudFR5cGUpIHtcblx0aWYgKHR5cGVvZiBkb2N1bWVudCA9PSAnb2JqZWN0Jykge1xuXHRcdGlmIChldmVudFR5cGUgPT0gJ3JlYWR5c3RhdGVjaGFuZ2UnKSB7XG5cdFx0XHRpZiAoZG9jdW1lbnQucmVhZHlTdGF0ZSA9PSAnbG9hZGluZycpXG5cdFx0XHRcdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlLCB0aGlzLCBmYWxzZSk7IC8vIG5vIGNhcHR1cmluZ1xuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdHZhciBkb21FdmVudCA9IEV2ZW50Q29uc3RydWN0b3IoZXZlbnRUeXBlLCB7IHRhcmdldDogZG9jdW1lbnQgfSk7XG5cdFx0XHRcdHRoaXMuZGlzcGF0Y2hNZXNzYWdlKGV2ZW50VHlwZSwgZXZlbnQpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxufVxuXG5cbmZ1bmN0aW9uIHJlbW92ZURvbUV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlKSB7XG5cdGlmICh0eXBlb2YgZG9jdW1lbnQgPT0gJ29iamVjdCcpXG5cdFx0ZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudFR5cGUsIHRoaXMsIGZhbHNlKTsgLy8gbm8gY2FwdHVyaW5nXG59XG5cblxuZnVuY3Rpb24gZmlsdGVyRG9tRXZlbnQoZXZlbnRUeXBlLCBtZXNzYWdlLCBldmVudCkge1xuXHRpZiAoZXZlbnRUeXBlID09ICdyZWFkeXN0YXRlY2hhbmdlJykge1xuXHRcdGlmICh0aGlzLl9kb21SZWFkeUZpcmVkKSByZXR1cm4gZmFsc2U7XG5cdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdfZG9tUmVhZHlGaXJlZCcsIHtcblx0XHRcdHdyaXRhYmxlOiB0cnVlLFxuXHRcdFx0dmFsdWU6IHRydWVcblx0XHR9KTtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxufTtcblxuXG4gLy8gZXZlbnQgZGlzcGF0Y2hlciAtIGFzIGRlZmluZWQgYnkgRXZlbnQgRE9NIEFQSVxuZnVuY3Rpb24gaGFuZGxlRXZlbnQoZXZlbnQpIHtcblx0dGhpcy5kaXNwYXRjaE1lc3NhZ2UoZXZlbnQudHlwZSwgZXZlbnQpO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgTWl4aW4gPSByZXF1aXJlKCcuLi9hYnN0cmFjdC9taXhpbicpXG5cdCwgTWVzc2FnZVNvdXJjZSA9IHJlcXVpcmUoJy4vbWVzc2FnZV9zb3VyY2UnKVxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vdXRpbC9jaGVjaycpXG5cdCwgTWF0Y2ggPSBjaGVjay5NYXRjaFxuXHQsIE1lc3NlbmdlckVycm9yID0gcmVxdWlyZSgnLi4vdXRpbC9lcnJvcicpLk1lc3NlbmdlcjtcblxuXG52YXIgZXZlbnRzU3BsaXRSZWdFeHAgPSAvXFxzKig/OlxcLHxcXHMpXFxzKi87XG5cblxudmFyIE1lc3NlbmdlciA9IF8uY3JlYXRlU3ViY2xhc3MoTWl4aW4sICdNZXNzZW5nZXInKTtcblxuXy5leHRlbmRQcm90byhNZXNzZW5nZXIsIHtcblx0aW5pdDogaW5pdE1lc3NlbmdlciwgLy8gY2FsbGVkIGJ5IE1peGluIChzdXBlcmNsYXNzKVxuXHRvbk1lc3NhZ2U6IHJlZ2lzdGVyU3Vic2NyaWJlcixcblx0b2ZmTWVzc2FnZTogcmVtb3ZlU3Vic2NyaWJlcixcblx0b25NZXNzYWdlczogcmVnaXN0ZXJTdWJzY3JpYmVycyxcblx0b2ZmTWVzc2FnZXM6IHJlbW92ZVN1YnNjcmliZXJzLFxuXHRwb3N0TWVzc2FnZTogcG9zdE1lc3NhZ2UsXG5cdGdldFN1YnNjcmliZXJzOiBnZXRNZXNzYWdlU3Vic2NyaWJlcnMsXG5cdF9jaG9vc2VTdWJzY3JpYmVyc0hhc2g6IF9jaG9vc2VTdWJzY3JpYmVyc0hhc2gsXG5cdF9yZWdpc3RlclN1YnNjcmliZXI6IF9yZWdpc3RlclN1YnNjcmliZXIsXG5cdF9yZW1vdmVTdWJzY3JpYmVyOiBfcmVtb3ZlU3Vic2NyaWJlcixcblx0X3JlbW92ZUFsbFN1YnNjcmliZXJzOiBfcmVtb3ZlQWxsU3Vic2NyaWJlcnMsXG5cdF9jYWxsUGF0dGVyblN1YnNjcmliZXJzOiBfY2FsbFBhdHRlcm5TdWJzY3JpYmVycyxcblx0X2NhbGxTdWJzY3JpYmVyczogX2NhbGxTdWJzY3JpYmVyc1xufSk7XG5cblxuTWVzc2VuZ2VyLmRlZmF1bHRNZXRob2RzID0ge1xuXHRvbk1lc3NhZ2U6ICdvbk1lc3NhZ2UnLFxuXHRvZmZNZXNzYWdlOiAnb2ZmTWVzc2FnZScsXG5cdG9uTWVzc2FnZXM6ICdvbk1lc3NhZ2VzJyxcblx0b2ZmTWVzc2FnZXM6ICdvZmZNZXNzYWdlcycsXG5cdHBvc3RNZXNzYWdlOiAncG9zdE1lc3NhZ2UnLFxuXHRnZXRTdWJzY3JpYmVyczogJ2dldFN1YnNjcmliZXJzJ1xufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IE1lc3NlbmdlcjtcblxuXG5mdW5jdGlvbiBpbml0TWVzc2VuZ2VyKGhvc3RPYmplY3QsIHByb3h5TWV0aG9kcywgbWVzc2FnZVNvdXJjZSkge1xuXHRjaGVjayhtZXNzYWdlU291cmNlLCBNYXRjaC5PcHRpb25hbChNZXNzYWdlU291cmNlKSk7XG5cblx0Ly8gaG9zdE9iamVjdCBhbmQgcHJveHlNZXRob2RzIGFyZSB1c2VkIGluIE1peGluXG4gXHQvLyBtZXNzZW5nZXIgZGF0YVxuIFx0T2JqZWN0LmRlZmluZVByb3BlcnRpZXModGhpcywge1xuIFx0XHRfbWVzc2FnZVN1YnNjcmliZXJzOiB7IHZhbHVlOiB7fSB9LFxuIFx0XHRfcGF0dGVybk1lc3NhZ2VTdWJzY3JpYmVyczogeyB2YWx1ZToge30gfSxcbiBcdFx0X21lc3NhZ2VTb3VyY2U6IHsgdmFsdWU6IG1lc3NhZ2VTb3VyY2UgfVxuIFx0fSk7XG5cbiBcdGlmIChtZXNzYWdlU291cmNlKVxuIFx0XHRtZXNzYWdlU291cmNlLm1lc3NlbmdlciA9IHRoaXM7XG59XG5cblxuZnVuY3Rpb24gcmVnaXN0ZXJTdWJzY3JpYmVyKG1lc3NhZ2VzLCBzdWJzY3JpYmVyKSB7XG5cdGNoZWNrKG1lc3NhZ2VzLCBNYXRjaC5PbmVPZihTdHJpbmcsIFtTdHJpbmddLCBSZWdFeHApKTtcblx0Y2hlY2soc3Vic2NyaWJlciwgRnVuY3Rpb24pOyBcblxuXHRpZiAodHlwZW9mIG1lc3NhZ2VzID09ICdzdHJpbmcnKVxuXHRcdG1lc3NhZ2VzID0gbWVzc2FnZXMuc3BsaXQoZXZlbnRzU3BsaXRSZWdFeHApO1xuXG5cdHZhciBzdWJzY3JpYmVyc0hhc2ggPSB0aGlzLl9jaG9vc2VTdWJzY3JpYmVyc0hhc2gobWVzc2FnZXMpO1xuXG5cdGlmIChtZXNzYWdlcyBpbnN0YW5jZW9mIFJlZ0V4cClcblx0XHRyZXR1cm4gdGhpcy5fcmVnaXN0ZXJTdWJzY3JpYmVyKHN1YnNjcmliZXJzSGFzaCwgbWVzc2FnZXMsIHN1YnNjcmliZXIpO1xuXG5cdGVsc2Uge1xuXHRcdHZhciB3YXNSZWdpc3RlcmVkID0gZmFsc2U7XG5cblx0XHRtZXNzYWdlcy5mb3JFYWNoKGZ1bmN0aW9uKG1lc3NhZ2UpIHtcblx0XHRcdHZhciBub3RZZXRSZWdpc3RlcmVkID0gdGhpcy5fcmVnaXN0ZXJTdWJzY3JpYmVyKHN1YnNjcmliZXJzSGFzaCwgbWVzc2FnZSwgc3Vic2NyaWJlcik7XHRcdFx0XG5cdFx0XHR3YXNSZWdpc3RlcmVkID0gd2FzUmVnaXN0ZXJlZCB8fCBub3RZZXRSZWdpc3RlcmVkO1x0XHRcdFxuXHRcdH0sIHRoaXMpO1xuXG5cdFx0cmV0dXJuIHdhc1JlZ2lzdGVyZWQ7XG5cdH1cbn1cblxuXG5mdW5jdGlvbiBfcmVnaXN0ZXJTdWJzY3JpYmVyKHN1YnNjcmliZXJzSGFzaCwgbWVzc2FnZSwgc3Vic2NyaWJlcikge1xuXHRpZiAoISAoc3Vic2NyaWJlcnNIYXNoW21lc3NhZ2VdICYmIHN1YnNjcmliZXJzSGFzaFttZXNzYWdlXS5sZW5ndGgpKSB7XG5cdFx0c3Vic2NyaWJlcnNIYXNoW21lc3NhZ2VdID0gW107XG5cdFx0dmFyIG5vU3Vic2NyaWJlcnMgPSB0cnVlO1xuXHRcdGlmICh0aGlzLl9tZXNzYWdlU291cmNlKVxuXHRcdFx0dGhpcy5fbWVzc2FnZVNvdXJjZS5vblN1YnNjcmliZXJBZGRlZChtZXNzYWdlKTtcblx0fVxuXG5cdHZhciBtc2dTdWJzY3JpYmVycyA9IHN1YnNjcmliZXJzSGFzaFttZXNzYWdlXTtcblx0dmFyIG5vdFlldFJlZ2lzdGVyZWQgPSBub1N1YnNjcmliZXJzIHx8IG1zZ1N1YnNjcmliZXJzLmluZGV4T2Yoc3Vic2NyaWJlcikgPT0gLTE7XG5cblx0aWYgKG5vdFlldFJlZ2lzdGVyZWQpXG5cdFx0bXNnU3Vic2NyaWJlcnMucHVzaChzdWJzY3JpYmVyKTtcblxuXHRyZXR1cm4gbm90WWV0UmVnaXN0ZXJlZDtcbn1cblxuXG5mdW5jdGlvbiByZWdpc3RlclN1YnNjcmliZXJzKG1lc3NhZ2VTdWJzY3JpYmVycykge1xuXHRjaGVjayhtZXNzYWdlU3Vic2NyaWJlcnMsIE1hdGNoLk9iamVjdEhhc2goRnVuY3Rpb24pKTtcblxuXHR2YXIgbm90WWV0UmVnaXN0ZXJlZE1hcCA9IF8ubWFwS2V5cyhtZXNzYWdlU3Vic2NyaWJlcnMsIGZ1bmN0aW9uKHN1YnNjcmliZXIsIG1lc3NhZ2VzKSB7XG5cdFx0cmV0dXJuIHRoaXMub25NZXNzYWdlKG1lc3NhZ2VzLCBzdWJzY3JpYmVyKVxuXHR9LCB0aGlzKTtcblxuXHRyZXR1cm4gbm90WWV0UmVnaXN0ZXJlZE1hcDtcbn1cblxuXG4vLyByZW1vdmVzIGFsbCBzdWJzY3JpYmVycyBmb3IgdGhlIG1lc3NhZ2UgaWYgc3Vic2NyaWJlciBpc24ndCBzdXBwbGllZFxuZnVuY3Rpb24gcmVtb3ZlU3Vic2NyaWJlcihtZXNzYWdlcywgc3Vic2NyaWJlcikge1xuXHRjaGVjayhtZXNzYWdlcywgTWF0Y2guT25lT2YoU3RyaW5nLCBbU3RyaW5nXSwgUmVnRXhwKSk7XG5cdGNoZWNrKHN1YnNjcmliZXIsIE1hdGNoLk9wdGlvbmFsKEZ1bmN0aW9uKSk7IFxuXG5cdGlmICh0eXBlb2YgbWVzc2FnZXMgPT0gJ3N0cmluZycpXG5cdFx0bWVzc2FnZXMgPSBtZXNzYWdlcy5zcGxpdChldmVudHNTcGxpdFJlZ0V4cCk7XG5cblx0dmFyIHN1YnNjcmliZXJzSGFzaCA9IHRoaXMuX2Nob29zZVN1YnNjcmliZXJzSGFzaChtZXNzYWdlcyk7XG5cblx0aWYgKG1lc3NhZ2VzIGluc3RhbmNlb2YgUmVnRXhwKVxuXHRcdHJldHVybiB0aGlzLl9yZW1vdmVTdWJzY3JpYmVyKHN1YnNjcmliZXJzSGFzaCwgbWVzc2FnZXMsIHN1YnNjcmliZXIpO1xuXG5cdGVsc2Uge1xuXHRcdHZhciB3YXNSZW1vdmVkID0gZmFsc2U7XG5cblx0XHRtZXNzYWdlcy5mb3JFYWNoKGZ1bmN0aW9uKG1lc3NhZ2UpIHtcblx0XHRcdHZhciBzdWJzY3JpYmVyUmVtb3ZlZCA9IHRoaXMuX3JlbW92ZVN1YnNjcmliZXIoc3Vic2NyaWJlcnNIYXNoLCBtZXNzYWdlLCBzdWJzY3JpYmVyKTtcdFx0XHRcblx0XHRcdHdhc1JlbW92ZWQgPSB3YXNSZW1vdmVkIHx8IHN1YnNjcmliZXJSZW1vdmVkO1x0XHRcdFxuXHRcdH0sIHRoaXMpO1xuXG5cdFx0cmV0dXJuIHdhc1JlbW92ZWQ7XG5cdH1cbn1cblxuXG5mdW5jdGlvbiBfcmVtb3ZlU3Vic2NyaWJlcihzdWJzY3JpYmVyc0hhc2gsIG1lc3NhZ2UsIHN1YnNjcmliZXIpIHtcblx0dmFyIG1zZ1N1YnNjcmliZXJzID0gc3Vic2NyaWJlcnNIYXNoW21lc3NhZ2VdO1xuXHRpZiAoISBtc2dTdWJzY3JpYmVycyB8fCAhIG1zZ1N1YnNjcmliZXJzLmxlbmd0aClcblx0XHRyZXR1cm4gZmFsc2U7IC8vIG5vdGhpbmcgcmVtb3ZlZFxuXG5cdGlmIChzdWJzY3JpYmVyKSB7XG5cdFx0dmFyIHN1YnNjcmliZXJJbmRleCA9IG1zZ1N1YnNjcmliZXJzLmluZGV4T2Yoc3Vic2NyaWJlcik7XG5cdFx0aWYgKHN1YnNjcmliZXJJbmRleCA9PSAtMSkgXG5cdFx0XHRyZXR1cm4gZmFsc2U7IC8vIG5vdGhpbmcgcmVtb3ZlZFxuXHRcdG1zZ1N1YnNjcmliZXJzLnNwbGljZShzdWJzY3JpYmVySW5kZXgsIDEpO1xuXHRcdGlmICghIG1zZ1N1YnNjcmliZXJzLmxlbmd0aClcblx0XHRcdHRoaXMuX3JlbW92ZUFsbFN1YnNjcmliZXJzKHN1YnNjcmliZXJzSGFzaCwgbWVzc2FnZSk7XG5cblx0fSBlbHNlIFxuXHRcdHRoaXMuX3JlbW92ZUFsbFN1YnNjcmliZXJzKHN1YnNjcmliZXJzSGFzaCwgbWVzc2FnZSk7XG5cblx0cmV0dXJuIHRydWU7IC8vIHN1YnNjcmliZXIocykgcmVtb3ZlZFxufVxuXG5cbmZ1bmN0aW9uIF9yZW1vdmVBbGxTdWJzY3JpYmVycyhzdWJzY3JpYmVyc0hhc2gsIG1lc3NhZ2UpIHtcblx0ZGVsZXRlIHN1YnNjcmliZXJzSGFzaFttZXNzYWdlXTtcblx0aWYgKHRoaXMuX21lc3NhZ2VTb3VyY2UpXG5cdFx0dGhpcy5fbWVzc2FnZVNvdXJjZS5vblN1YnNjcmliZXJSZW1vdmVkKG1lc3NhZ2UpO1xufVxuXG5cbmZ1bmN0aW9uIHJlbW92ZVN1YnNjcmliZXJzKG1lc3NhZ2VTdWJzY3JpYmVycykge1xuXHRjaGVjayhtZXNzYWdlU3Vic2NyaWJlcnMsIE1hdGNoLk9iamVjdEhhc2goRnVuY3Rpb24pKTtcblxuXHR2YXIgc3Vic2NyaWJlclJlbW92ZWRNYXAgPSBfLm1hcEtleXMobWVzc2FnZVN1YnNjcmliZXJzLCBmdW5jdGlvbihzdWJzY3JpYmVyLCBtZXNzYWdlcykge1xuXHRcdHJldHVybiB0aGlzLm9mZk1lc3NhZ2VzKG1lc3NhZ2VzLCBzdWJzY3JpYmVyKVxuXHR9LCB0aGlzKTtcblxuXHRyZXR1cm4gc3Vic2NyaWJlclJlbW92ZWRNYXA7XHRcbn1cblxuXG4vLyBUT0RPIC0gc2VuZCBldmVudCB0byBtZXNzYWdlU291cmNlXG5cblxuZnVuY3Rpb24gcG9zdE1lc3NhZ2UobWVzc2FnZSwgZGF0YSkge1xuXHRjaGVjayhtZXNzYWdlLCBNYXRjaC5PbmVPZihTdHJpbmcsIFJlZ0V4cCkpO1xuXG5cdHZhciBzdWJzY3JpYmVyc0hhc2ggPSB0aGlzLl9jaG9vc2VTdWJzY3JpYmVyc0hhc2gobWVzc2FnZSk7XG5cdHZhciBtc2dTdWJzY3JpYmVycyA9IHN1YnNjcmliZXJzSGFzaFttZXNzYWdlXTtcblxuXHR0aGlzLl9jYWxsU3Vic2NyaWJlcnMobWVzc2FnZSwgZGF0YSwgbXNnU3Vic2NyaWJlcnMpO1xuXG5cdGlmICh0eXBlb2YgbWVzc2FnZSA9PSAnc3RyaW5nJylcblx0XHR0aGlzLl9jYWxsUGF0dGVyblN1YnNjcmliZXJzKG1lc3NhZ2UsIGRhdGEpO1xufVxuXG5cbmZ1bmN0aW9uIF9jYWxsUGF0dGVyblN1YnNjcmliZXJzKG1lc3NhZ2UsIGRhdGEpIHtcblx0Xy5lYWNoS2V5KHRoaXMuX3BhdHRlcm5NZXNzYWdlU3Vic2NyaWJlcnMsIFxuXHRcdGZ1bmN0aW9uKHBhdHRlcm5TdWJzY3JpYmVycywgcGF0dGVybikge1xuXHRcdFx0aWYgKHBhdHRlcm4udGVzdChtZXNzYWdlKSlcblx0XHRcdFx0dGhpcy5fY2FsbFN1YnNjcmliZXJzKG1lc3NhZ2UsIGRhdGEsIHBhdHRlcm5TdWJzY3JpYmVycyk7XG5cdFx0fVxuXHQsIHRoaXMpO1xufVxuXG5cbmZ1bmN0aW9uIF9jYWxsU3Vic2NyaWJlcnMobWVzc2FnZSwgZGF0YSwgbXNnU3Vic2NyaWJlcnMpIHtcblx0aWYgKG1zZ1N1YnNjcmliZXJzICYmIG1zZ1N1YnNjcmliZXJzLmxlbmd0aClcblx0XHRtc2dTdWJzY3JpYmVycy5mb3JFYWNoKGZ1bmN0aW9uKHN1YnNjcmliZXIpIHtcblx0XHRcdHN1YnNjcmliZXIuY2FsbCh0aGlzLCBtZXNzYWdlLCBkYXRhKTtcblx0XHR9LCB0aGlzKTtcbn1cblxuXG5mdW5jdGlvbiBnZXRNZXNzYWdlU3Vic2NyaWJlcnMobWVzc2FnZSwgaW5jbHVkZVBhdHRlcm5TdWJzY3JpYmVycykge1xuXHRjaGVjayhtZXNzYWdlLCBNYXRjaC5PbmVPZihTdHJpbmcsIFJlZ0V4cCkpO1xuXG5cdHZhciBzdWJzY3JpYmVyc0hhc2ggPSB0aGlzLl9jaG9vc2VTdWJzY3JpYmVyc0hhc2gobWVzc2FnZSk7XG5cdHZhciBtc2dTdWJzY3JpYmVycyA9IHN1YnNjcmliZXJzSGFzaFttZXNzYWdlXVxuXHRcdFx0XHRcdFx0XHQ/IFtdLmNvbmNhdChzdWJzY3JpYmVyc0hhc2hbbWVzc2FnZV0pXG5cdFx0XHRcdFx0XHRcdDogW107XG5cblx0Ly8gcGF0dGVybiBzdWJzY3JpYmVycyBhcmUgaW5jdWRlZCBieSBkZWZhdWx0XG5cdGlmIChpbmNsdWRlUGF0dGVyblN1YnNjcmliZXJzICE9PSBmYWxzZSAmJiB0eXBlb2YgbWVzc2FnZSA9PSAnc3RyaW5nJykge1xuXHRcdF8uZWFjaEtleSh0aGlzLl9wYXR0ZXJuTWVzc2FnZVN1YnNjcmliZXJzLCBcblx0XHRcdGZ1bmN0aW9uKHBhdHRlcm5TdWJzY3JpYmVycywgcGF0dGVybikge1xuXHRcdFx0XHRpZiAocGF0dGVyblN1YnNjcmliZXJzICYmIHBhdHRlcm5TdWJzY3JpYmVycy5sZW5ndGhcblx0XHRcdFx0XHRcdCYmIHBhdHRlcm4udGVzdChtZXNzYWdlKSlcblx0XHRcdFx0XHRfLmFwcGVuZEFycmF5KG1zZ1N1YnNjcmliZXJzLCBwYXR0ZXJuU3Vic2NyaWJlcnMpO1xuXHRcdFx0fVxuXHRcdCk7XG5cdH1cblxuXHRyZXR1cm4gbXNnU3Vic2NyaWJlcnMubGVuZ3RoXG5cdFx0XHRcdD8gbXNnU3Vic2NyaWJlcnNcblx0XHRcdFx0OiB1bmRlZmluZWQ7XG59XG5cblxuZnVuY3Rpb24gX2Nob29zZVN1YnNjcmliZXJzSGFzaChtZXNzYWdlKSB7XG5cdHJldHVybiBtZXNzYWdlIGluc3RhbmNlb2YgUmVnRXhwXG5cdFx0XHRcdD8gdGhpcy5fcGF0dGVybk1lc3NhZ2VTdWJzY3JpYmVyc1xuXHRcdFx0XHQ6IHRoaXMuX21lc3NhZ2VTdWJzY3JpYmVycztcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIE1peGluID0gcmVxdWlyZSgnLi4vYWJzdHJhY3QvbWl4aW4nKVxuXHQsIGxvZ2dlciA9IHJlcXVpcmUoJy4uL3V0aWwvbG9nZ2VyJylcblx0LCB0b0JlSW1wbGVtZW50ZWQgPSByZXF1aXJlKCcuLi91dGlsL2Vycm9yJykudG9CZUltcGxlbWVudGVkXG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpO1xuXG4vLyBhbiBhYnN0cmFjdCBjbGFzcyBmb3IgZGlzcGF0Y2hpbmcgZXh0ZXJuYWwgdG8gaW50ZXJuYWwgZXZlbnRzXG52YXIgTWVzc2FnZVNvdXJjZSA9IF8uY3JlYXRlU3ViY2xhc3MoTWl4aW4sICdNZXNzYWdlU291cmNlJywgdHJ1ZSk7XG5cbm1vZHVsZS5leHBvcnRzID0gTWVzc2FnZVNvdXJjZTtcblxuXG5fLmV4dGVuZFByb3RvKE1lc3NhZ2VTb3VyY2UsIHtcblx0Ly8gaW5pdGlhbGl6ZXMgbWVzc2FnZVNvdXJjZSAtIGNhbGxlZCBieSBNaXhpbiBzdXBlcmNsYXNzXG5cdGluaXQ6IGluaXRNZXNzYWdlU291cmNlLFxuXG5cdC8vIGNhbGxlZCBieSBNZXNzZW5nZXIgdG8gbm90aWZ5IHdoZW4gdGhlIGZpcnN0IHN1YnNjcmliZXIgZm9yIGFuIGludGVybmFsIG1lc3NhZ2Ugd2FzIGFkZGVkXG5cdG9uU3Vic2NyaWJlckFkZGVkOiBvblN1YnNjcmliZXJBZGRlZCxcblxuXHQvLyBjYWxsZWQgYnkgTWVzc2VuZ2VyIHRvIG5vdGlmeSB3aGVuIHRoZSBsYXN0IHN1YnNjcmliZXIgZm9yIGFuIGludGVybmFsIG1lc3NhZ2Ugd2FzIHJlbW92ZWRcbiBcdG9uU3Vic2NyaWJlclJlbW92ZWQ6IG9uU3Vic2NyaWJlclJlbW92ZWQsIFxuXG4gXHQvLyBkaXNwYXRjaGVzIHNvdXJjZSBtZXNzYWdlXG4gXHRkaXNwYXRjaE1lc3NhZ2U6IGRpc3BhdGNoU291cmNlTWVzc2FnZSxcblxuXHQvLyBmaWx0ZXJzIHNvdXJjZSBtZXNzYWdlIGJhc2VkIG9uIHRoZSBkYXRhIG9mIHRoZSBtZXNzYWdlIC0gc2hvdWxkIGJlIGltcGxlbWVudGVkIGluIHN1YmNsYXNzXG5cdGZpbHRlclNvdXJjZU1lc3NhZ2U6IGRpc3BhdGNoQWxsU291cmNlTWVzc2FnZXMsXG5cbiBcdC8vICoqKlxuIFx0Ly8gTWV0aG9kcyBiZWxvdyBtdXN0IGJlIGltcGxlbWVudGVkIGluIHN1YmNsYXNzXG4gXHRcblx0Ly8gY29udmVydHMgaW50ZXJuYWwgbWVzc2FnZSB0eXBlIHRvIGV4dGVybmFsIG1lc3NhZ2UgdHlwZSAtIHNob3VsZCBiZSBpbXBsZW1lbnRlZCBpbiBzdWJjbGFzc1xuXHR0cmFuc2xhdGVUb1NvdXJjZU1lc3NhZ2U6IHRvQmVJbXBsZW1lbnRlZCxcblxuIFx0Ly8gYWRkcyBsaXN0ZW5lciB0byBleHRlcm5hbCBtZXNzYWdlIC0gc2hvdWxkIGJlIGltcGxlbWVudGVkIGJ5IHN1YmNsYXNzXG4gXHRhZGRTb3VyY2VMaXN0ZW5lcjogdG9CZUltcGxlbWVudGVkLFxuXG4gXHQvLyByZW1vdmVzIGxpc3RlbmVyIGZyb20gZXh0ZXJuYWwgbWVzc2FnZSAtIHNob3VsZCBiZSBpbXBsZW1lbnRlZCBieSBzdWJjbGFzc1xuIFx0cmVtb3ZlU291cmNlTGlzdGVuZXI6IHRvQmVJbXBsZW1lbnRlZCxcbn0pO1xuXG5cbmZ1bmN0aW9uIGluaXRNZXNzYWdlU291cmNlKCkge1xuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ19pbnRlcm5hbE1lc3NhZ2VzJywgeyB2YWx1ZToge30gfSk7XG59XG5cblxuZnVuY3Rpb24gb25TdWJzY3JpYmVyQWRkZWQobWVzc2FnZSkge1xuXHR2YXIgc291cmNlTWVzc2FnZSA9IHRoaXMudHJhbnNsYXRlVG9Tb3VyY2VNZXNzYWdlKG1lc3NhZ2UpO1xuXG5cdGlmICghIHNvdXJjZU1lc3NhZ2UpIHJldHVybjtcblxuXHRpZiAoISB0aGlzLl9pbnRlcm5hbE1lc3NhZ2VzLmhhc093blByb3BlcnR5KHNvdXJjZU1lc3NhZ2UpKSB7XG5cdFx0dGhpcy5hZGRTb3VyY2VMaXN0ZW5lcihzb3VyY2VNZXNzYWdlKTtcblx0XHR0aGlzLl9pbnRlcm5hbE1lc3NhZ2VzW3NvdXJjZU1lc3NhZ2VdID0gW107XG5cdH1cblx0dmFyIGludGVybmFsTXNncyA9IHRoaXMuX2ludGVybmFsTWVzc2FnZXNbc291cmNlTWVzc2FnZV07XG5cblx0aWYgKGludGVybmFsTXNncy5pbmRleE9mKG1lc3NhZ2UpID09IC0xKVxuXHRcdGludGVybmFsTXNncy5wdXNoKG1lc3NhZ2UpO1xuXHRlbHNlXG5cdFx0bG9nZ2VyLndhcm4oJ0R1cGxpY2F0ZSBub3RpZmljYXRpb24gcmVjZWl2ZWQ6IGZvciBzdWJzY3JpYmUgdG8gaW50ZXJuYWwgbWVzc2FnZSAnICsgbWVzc2FnZSk7XG59XG5cblxuZnVuY3Rpb24gb25TdWJzY3JpYmVyUmVtb3ZlZChtZXNzYWdlKSB7XG5cdHZhciBzb3VyY2VNZXNzYWdlID0gdGhpcy50cmFuc2xhdGVUb1NvdXJjZU1lc3NhZ2UobWVzc2FnZSk7XG5cblx0aWYgKCEgc291cmNlTWVzc2FnZSkgcmV0dXJuO1xuXG5cdHZhciBpbnRlcm5hbE1zZ3MgPSB0aGlzLl9pbnRlcm5hbE1lc3NhZ2VzW3NvdXJjZU1lc3NhZ2VdO1xuXG5cdGlmIChpbnRlcm5hbE1zZ3MgJiYgaW50ZXJuYWxNc2dzLmxlbmd0aCkge1xuXHRcdG1lc3NhZ2VJbmRleCA9IGludGVybmFsTXNncy5pbmRleE9mKG1lc3NhZ2UpO1xuXHRcdGlmIChtZXNzYWdlSW5kZXggPj0gMCkge1xuXHRcdFx0aW50ZXJuYWxNc2dzLnNwbGljZShtZXNzYWdlSW5kZXgsIDEpO1xuXHRcdFx0aWYgKGludGVybmFsTXNncy5sZW5ndGggPT0gMCkge1xuXHRcdFx0XHRkZWxldGUgdGhpcy5faW50ZXJuYWxNZXNzYWdlc1tzb3VyY2VNZXNzYWdlXTtcblx0XHRcdFx0dGhpcy5yZW1vdmVTb3VyY2VMaXN0ZW5lcihzb3VyY2VNZXNzYWdlKTtcblx0XHRcdH1cblx0XHR9IGVsc2Vcblx0XHRcdHVuZXhwZWN0ZWROb3RpZmljYXRpb25XYXJuaW5nKCk7XG5cdH0gZWxzZVxuXHRcdHVuZXhwZWN0ZWROb3RpZmljYXRpb25XYXJuaW5nKCk7XG5cblxuXHRmdW5jdGlvbiB1bmV4cGVjdGVkTm90aWZpY2F0aW9uV2FybmluZygpIHtcblx0XHRsb2dnZXIud2Fybignbm90aWZpY2F0aW9uIHJlY2VpdmVkOiB1bi1zdWJzY3JpYmUgZnJvbSBpbnRlcm5hbCBtZXNzYWdlICcgKyBtZXNzYWdlXG5cdFx0XHRcdFx0ICsgJyB3aXRob3V0IHByZXZpb3VzIHN1YnNjcmlwdGlvbiBub3RpZmljYXRpb24nKTtcblx0fVxufVxuXG5cbmZ1bmN0aW9uIGRpc3BhdGNoU291cmNlTWVzc2FnZShzb3VyY2VNZXNzYWdlLCBkYXRhKSB7XG5cdHZhciBpbnRlcm5hbE1zZ3MgPSB0aGlzLl9pbnRlcm5hbE1lc3NhZ2VzW3NvdXJjZU1lc3NhZ2VdO1xuXG5cdGlmIChpbnRlcm5hbE1zZ3MgJiYgaW50ZXJuYWxNc2dzLmxlbmd0aClcblx0XHRpbnRlcm5hbE1zZ3MuZm9yRWFjaChmdW5jdGlvbihtZXNzYWdlKSB7XG5cdFx0XHRpZiAodGhpcy5maWx0ZXJTb3VyY2VNZXNzYWdlXG5cdFx0XHRcdFx0JiYgdGhpcy5maWx0ZXJTb3VyY2VNZXNzYWdlKHNvdXJjZU1lc3NhZ2UsIG1lc3NhZ2UsIGRhdGEpKVxuXHRcdFx0XHR0aGlzLm1lc3Nlbmdlci5wb3N0TWVzc2FnZShtZXNzYWdlLCBkYXRhKTtcblx0XHR9LCB0aGlzKTtcblx0ZWxzZVxuXHRcdGxvZ2dlci53YXJuKCdzb3VyY2UgbWVzc2FnZSByZWNlaXZlZCBmb3Igd2hpY2ggdGhlcmUgaXMgbm8gbWFwcGVkIGludGVybmFsIG1lc3NhZ2UnKTtcbn1cblxuXG4vLyBjYW4gYmUgb3ZlcnJpZGRlbiBpbiBzdWJjbGFzcyB0byBpbXBsZW1lbnQgZmlsdGVyaW5nIGJhc2VkIG9uIG1lc3NhZ2UgZGF0YVxuZnVuY3Rpb24gZGlzcGF0Y2hBbGxTb3VyY2VNZXNzYWdlcyhzb3VyY2VNZXNzYWdlLCBtZXNzYWdlLCBkYXRhKSB7XG5cdHJldHVybiB0cnVlO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgbWlsbyA9IHtcblx0bG9hZGVyOiByZXF1aXJlKCcuL2xvYWRlcicpLFxuXHRiaW5kZXI6IHJlcXVpcmUoJy4vYmluZGVyJyksXG5cdG1haWw6IHJlcXVpcmUoJy4vbWFpbCcpLFxuXHRjb25maWc6IHJlcXVpcmUoJy4vY29uZmlnJyksXG5cdHV0aWw6IHJlcXVpcmUoJy4vdXRpbCcpLFxuXHRjbGFzc2VzOiByZXF1aXJlKCcuL2NsYXNzZXMnKVxufVxuXG5cbi8vIHVzZWQgZmFjZXRzXG5yZXF1aXJlKCcuL2NvbXBvbmVudHMvY19mYWNldHMvRG9tJyk7XG5yZXF1aXJlKCcuL2NvbXBvbmVudHMvY19mYWNldHMvRGF0YScpO1xucmVxdWlyZSgnLi9jb21wb25lbnRzL2NfZmFjZXRzL0ZyYW1lJyk7XG5yZXF1aXJlKCcuL2NvbXBvbmVudHMvY19mYWNldHMvRXZlbnRzJyk7XG5yZXF1aXJlKCcuL2NvbXBvbmVudHMvY19mYWNldHMvVGVtcGxhdGUnKTtcbnJlcXVpcmUoJy4vY29tcG9uZW50cy9jX2ZhY2V0cy9Db250YWluZXInKTtcbnJlcXVpcmUoJy4vY29tcG9uZW50cy9jX2ZhY2V0cy9EcmFnJyk7XG5yZXF1aXJlKCcuL2NvbXBvbmVudHMvY19mYWNldHMvRHJvcCcpO1xuXG4vLyB1c2VkIGNvbXBvbmVudHNcbnJlcXVpcmUoJy4vY29tcG9uZW50cy9jbGFzc2VzL1ZpZXcnKTtcblxuXG4vLyBleHBvcnQgZm9yIG5vZGUvYnJvd3NlcmlmeVxuaWYgKHR5cGVvZiBtb2R1bGUgPT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpXHRcblx0bW9kdWxlLmV4cG9ydHMgPSBtaWxvO1xuXG4vLyBnbG9iYWwgbWlsbyBmb3IgYnJvd3NlclxuaWYgKHR5cGVvZiB3aW5kb3cgPT0gJ29iamVjdCcpXG5cdHdpbmRvdy5taWxvID0gbWlsbztcbiIsIid1c2Ugc3RyaWN0JztcblxuLy8gWFhYIGRvY3NcblxuLy8gVGhpbmdzIHdlIGV4cGxpY2l0bHkgZG8gTk9UIHN1cHBvcnQ6XG4vLyAgICAtIGhldGVyb2dlbm91cyBhcnJheXNcbnZhciBfID0gcmVxdWlyZSgnbW9sLXByb3RvJyk7XG5cbnZhciBjaGVjayA9IGZ1bmN0aW9uICh2YWx1ZSwgcGF0dGVybikge1xuICAvLyBSZWNvcmQgdGhhdCBjaGVjayBnb3QgY2FsbGVkLCBpZiBzb21lYm9keSBjYXJlZC5cbiAgdHJ5IHtcbiAgICBjaGVja1N1YnRyZWUodmFsdWUsIHBhdHRlcm4pO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICBpZiAoKGVyciBpbnN0YW5jZW9mIE1hdGNoLkVycm9yKSAmJiBlcnIucGF0aClcbiAgICAgIGVyci5tZXNzYWdlICs9IFwiIGluIGZpZWxkIFwiICsgZXJyLnBhdGg7XG4gICAgdGhyb3cgZXJyO1xuICB9XG59O1xubW9kdWxlLmV4cG9ydHMgPSBjaGVjaztcblxudmFyIE1hdGNoID0gY2hlY2suTWF0Y2ggPSB7XG4gIE9wdGlvbmFsOiBmdW5jdGlvbiAocGF0dGVybikge1xuICAgIHJldHVybiBuZXcgT3B0aW9uYWwocGF0dGVybik7XG4gIH0sXG4gIE9uZU9mOiBmdW5jdGlvbiAoLyphcmd1bWVudHMqLykge1xuICAgIHJldHVybiBuZXcgT25lT2YoYXJndW1lbnRzKTtcbiAgfSxcbiAgQW55OiBbJ19fYW55X18nXSxcbiAgV2hlcmU6IGZ1bmN0aW9uIChjb25kaXRpb24pIHtcbiAgICByZXR1cm4gbmV3IFdoZXJlKGNvbmRpdGlvbik7XG4gIH0sXG4gIE9iamVjdEluY2x1ZGluZzogZnVuY3Rpb24gKHBhdHRlcm4pIHtcbiAgICByZXR1cm4gbmV3IE9iamVjdEluY2x1ZGluZyhwYXR0ZXJuKTtcbiAgfSxcbiAgLy8gTWF0Y2hlcyBvbmx5IHNpZ25lZCAzMi1iaXQgaW50ZWdlcnNcbiAgSW50ZWdlcjogWydfX2ludGVnZXJfXyddLFxuXG4gIC8vIE1hdGNoZXMgaGFzaCAob2JqZWN0KSB3aXRoIHZhbHVlcyBtYXRjaGluZyBwYXR0ZXJuXG4gIE9iamVjdEhhc2g6IGZ1bmN0aW9uKHBhdHRlcm4pIHtcbiAgICByZXR1cm4gbmV3IE9iamVjdEhhc2gocGF0dGVybik7XG4gIH0sXG5cbiAgU3ViY2xhc3M6IGZ1bmN0aW9uKFN1cGVyY2xhc3MsIG1hdGNoU3VwZXJjbGFzc1Rvbykge1xuICAgIHJldHVybiBuZXcgU3ViY2xhc3MoU3VwZXJjbGFzcywgbWF0Y2hTdXBlcmNsYXNzVG9vKTtcbiAgfSxcblxuICAvLyBYWFggbWF0Y2hlcnMgc2hvdWxkIGtub3cgaG93IHRvIGRlc2NyaWJlIHRoZW1zZWx2ZXMgZm9yIGVycm9yc1xuICBFcnJvcjogVHlwZUVycm9yLFxuXG4gIC8vIE1ldGVvci5tYWtlRXJyb3JUeXBlKFwiTWF0Y2guRXJyb3JcIiwgZnVuY3Rpb24gKG1zZykge1xuICAgIC8vIHRoaXMubWVzc2FnZSA9IFwiTWF0Y2ggZXJyb3I6IFwiICsgbXNnO1xuICAgIC8vIFRoZSBwYXRoIG9mIHRoZSB2YWx1ZSB0aGF0IGZhaWxlZCB0byBtYXRjaC4gSW5pdGlhbGx5IGVtcHR5LCB0aGlzIGdldHNcbiAgICAvLyBwb3B1bGF0ZWQgYnkgY2F0Y2hpbmcgYW5kIHJldGhyb3dpbmcgdGhlIGV4Y2VwdGlvbiBhcyBpdCBnb2VzIGJhY2sgdXAgdGhlXG4gICAgLy8gc3RhY2suXG4gICAgLy8gRS5nLjogXCJ2YWxzWzNdLmVudGl0eS5jcmVhdGVkXCJcbiAgICAvLyB0aGlzLnBhdGggPSBcIlwiO1xuICAgIC8vIElmIHRoaXMgZ2V0cyBzZW50IG92ZXIgRERQLCBkb24ndCBnaXZlIGZ1bGwgaW50ZXJuYWwgZGV0YWlscyBidXQgYXQgbGVhc3RcbiAgICAvLyBwcm92aWRlIHNvbWV0aGluZyBiZXR0ZXIgdGhhbiA1MDAgSW50ZXJuYWwgc2VydmVyIGVycm9yLlxuICAvLyAgIHRoaXMuc2FuaXRpemVkRXJyb3IgPSBuZXcgTWV0ZW9yLkVycm9yKDQwMCwgXCJNYXRjaCBmYWlsZWRcIik7XG4gIC8vIH0pLFxuXG4gIC8vIFRlc3RzIHRvIHNlZSBpZiB2YWx1ZSBtYXRjaGVzIHBhdHRlcm4uIFVubGlrZSBjaGVjaywgaXQgbWVyZWx5IHJldHVybnMgdHJ1ZVxuICAvLyBvciBmYWxzZSAodW5sZXNzIGFuIGVycm9yIG90aGVyIHRoYW4gTWF0Y2guRXJyb3Igd2FzIHRocm93bikuXG4gIHRlc3Q6IGZ1bmN0aW9uICh2YWx1ZSwgcGF0dGVybikge1xuICAgIHRyeSB7XG4gICAgICBjaGVja1N1YnRyZWUodmFsdWUsIHBhdHRlcm4pO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKGUgaW5zdGFuY2VvZiBNYXRjaC5FcnJvcilcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgLy8gUmV0aHJvdyBvdGhlciBlcnJvcnMuXG4gICAgICB0aHJvdyBlO1xuICAgIH1cbiAgfVxufTtcblxuZnVuY3Rpb24gT3B0aW9uYWwocGF0dGVybikge1xuICB0aGlzLnBhdHRlcm4gPSBwYXR0ZXJuO1xufTtcblxuZnVuY3Rpb24gT25lT2YoY2hvaWNlcykge1xuICBpZiAoY2hvaWNlcy5sZW5ndGggPT0gMClcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJNdXN0IHByb3ZpZGUgYXQgbGVhc3Qgb25lIGNob2ljZSB0byBNYXRjaC5PbmVPZlwiKTtcbiAgdGhpcy5jaG9pY2VzID0gY2hvaWNlcztcbn07XG5cbmZ1bmN0aW9uIFdoZXJlKGNvbmRpdGlvbikge1xuICB0aGlzLmNvbmRpdGlvbiA9IGNvbmRpdGlvbjtcbn07XG5cbmZ1bmN0aW9uIE9iamVjdEluY2x1ZGluZyhwYXR0ZXJuKSB7XG4gIHRoaXMucGF0dGVybiA9IHBhdHRlcm47XG59O1xuXG5mdW5jdGlvbiBPYmplY3RIYXNoKHBhdHRlcm4pIHtcbiAgdGhpcy5wYXR0ZXJuID0gcGF0dGVybjtcbn07XG5cbmZ1bmN0aW9uIFN1YmNsYXNzKFN1cGVyY2xhc3MsIG1hdGNoU3VwZXJjbGFzc1Rvbykge1xuICB0aGlzLlN1cGVyY2xhc3MgPSBTdXBlcmNsYXNzO1xuICB0aGlzLm1hdGNoU3VwZXJjbGFzcyA9IG1hdGNoU3VwZXJjbGFzc1Rvbztcbn07XG5cbnZhciB0eXBlb2ZDaGVja3MgPSBbXG4gIFtTdHJpbmcsIFwic3RyaW5nXCJdLFxuICBbTnVtYmVyLCBcIm51bWJlclwiXSxcbiAgW0Jvb2xlYW4sIFwiYm9vbGVhblwiXSxcbiAgLy8gV2hpbGUgd2UgZG9uJ3QgYWxsb3cgdW5kZWZpbmVkIGluIEpTT04sIHRoaXMgaXMgZ29vZCBmb3Igb3B0aW9uYWxcbiAgLy8gYXJndW1lbnRzIHdpdGggT25lT2YuXG4gIFt1bmRlZmluZWQsIFwidW5kZWZpbmVkXCJdXG5dO1xuXG5mdW5jdGlvbiBjaGVja1N1YnRyZWUodmFsdWUsIHBhdHRlcm4pIHtcbiAgLy8gTWF0Y2ggYW55dGhpbmchXG4gIGlmIChwYXR0ZXJuID09PSBNYXRjaC5BbnkpXG4gICAgcmV0dXJuO1xuXG4gIC8vIEJhc2ljIGF0b21pYyB0eXBlcy5cbiAgLy8gRG8gbm90IG1hdGNoIGJveGVkIG9iamVjdHMgKGUuZy4gU3RyaW5nLCBCb29sZWFuKVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHR5cGVvZkNoZWNrcy5sZW5ndGg7ICsraSkge1xuICAgIGlmIChwYXR0ZXJuID09PSB0eXBlb2ZDaGVja3NbaV1bMF0pIHtcbiAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09IHR5cGVvZkNoZWNrc1tpXVsxXSlcbiAgICAgICAgcmV0dXJuO1xuICAgICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgXCIgKyB0eXBlb2ZDaGVja3NbaV1bMV0gKyBcIiwgZ290IFwiICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlb2YgdmFsdWUpO1xuICAgIH1cbiAgfVxuICBpZiAocGF0dGVybiA9PT0gbnVsbCkge1xuICAgIGlmICh2YWx1ZSA9PT0gbnVsbClcbiAgICAgIHJldHVybjtcbiAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJFeHBlY3RlZCBudWxsLCBnb3QgXCIgKyBKU09OLnN0cmluZ2lmeSh2YWx1ZSkpO1xuICB9XG5cbiAgLy8gTWF0Y2guSW50ZWdlciBpcyBzcGVjaWFsIHR5cGUgZW5jb2RlZCB3aXRoIGFycmF5XG4gIGlmIChwYXR0ZXJuID09PSBNYXRjaC5JbnRlZ2VyKSB7XG4gICAgLy8gVGhlcmUgaXMgbm8gY29uc2lzdGVudCBhbmQgcmVsaWFibGUgd2F5IHRvIGNoZWNrIGlmIHZhcmlhYmxlIGlzIGEgNjQtYml0XG4gICAgLy8gaW50ZWdlci4gT25lIG9mIHRoZSBwb3B1bGFyIHNvbHV0aW9ucyBpcyB0byBnZXQgcmVtaW5kZXIgb2YgZGl2aXNpb24gYnkgMVxuICAgIC8vIGJ1dCB0aGlzIG1ldGhvZCBmYWlscyBvbiByZWFsbHkgbGFyZ2UgZmxvYXRzIHdpdGggYmlnIHByZWNpc2lvbi5cbiAgICAvLyBFLmcuOiAxLjM0ODE5MjMwODQ5MTgyNGUrMjMgJSAxID09PSAwIGluIFY4XG4gICAgLy8gQml0d2lzZSBvcGVyYXRvcnMgd29yayBjb25zaXN0YW50bHkgYnV0IGFsd2F5cyBjYXN0IHZhcmlhYmxlIHRvIDMyLWJpdFxuICAgIC8vIHNpZ25lZCBpbnRlZ2VyIGFjY29yZGluZyB0byBKYXZhU2NyaXB0IHNwZWNzLlxuICAgIGlmICh0eXBlb2YgdmFsdWUgPT09IFwibnVtYmVyXCIgJiYgKHZhbHVlIHwgMCkgPT09IHZhbHVlKVxuICAgICAgcmV0dXJuXG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgSW50ZWdlciwgZ290IFwiXG4gICAgICAgICAgICAgICAgKyAodmFsdWUgaW5zdGFuY2VvZiBPYmplY3QgPyBKU09OLnN0cmluZ2lmeSh2YWx1ZSkgOiB2YWx1ZSkpO1xuICB9XG5cbiAgLy8gXCJPYmplY3RcIiBpcyBzaG9ydGhhbmQgZm9yIE1hdGNoLk9iamVjdEluY2x1ZGluZyh7fSk7XG4gIGlmIChwYXR0ZXJuID09PSBPYmplY3QpXG4gICAgcGF0dGVybiA9IE1hdGNoLk9iamVjdEluY2x1ZGluZyh7fSk7XG5cbiAgLy8gQXJyYXkgKGNoZWNrZWQgQUZURVIgQW55LCB3aGljaCBpcyBpbXBsZW1lbnRlZCBhcyBhbiBBcnJheSkuXG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICBpZiAocGF0dGVybi5sZW5ndGggIT09IDEpXG4gICAgICB0aHJvdyBFcnJvcihcIkJhZCBwYXR0ZXJuOiBhcnJheXMgbXVzdCBoYXZlIG9uZSB0eXBlIGVsZW1lbnRcIiArXG4gICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeShwYXR0ZXJuKSk7XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgYXJyYXksIGdvdCBcIiArIEpTT04uc3RyaW5naWZ5KHZhbHVlKSk7XG4gICAgfVxuXG4gICAgdmFsdWUuZm9yRWFjaChmdW5jdGlvbiAodmFsdWVFbGVtZW50LCBpbmRleCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY2hlY2tTdWJ0cmVlKHZhbHVlRWxlbWVudCwgcGF0dGVyblswXSk7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgaWYgKGVyciBpbnN0YW5jZW9mIE1hdGNoLkVycm9yKSB7XG4gICAgICAgICAgZXJyLnBhdGggPSBfcHJlcGVuZFBhdGgoaW5kZXgsIGVyci5wYXRoKTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBlcnI7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gQXJiaXRyYXJ5IHZhbGlkYXRpb24gY2hlY2tzLiBUaGUgY29uZGl0aW9uIGNhbiByZXR1cm4gZmFsc2Ugb3IgdGhyb3cgYVxuICAvLyBNYXRjaC5FcnJvciAoaWUsIGl0IGNhbiBpbnRlcm5hbGx5IHVzZSBjaGVjaygpKSB0byBmYWlsLlxuICBpZiAocGF0dGVybiBpbnN0YW5jZW9mIFdoZXJlKSB7XG4gICAgaWYgKHBhdHRlcm4uY29uZGl0aW9uKHZhbHVlKSlcbiAgICAgIHJldHVybjtcbiAgICAvLyBYWFggdGhpcyBlcnJvciBpcyB0ZXJyaWJsZVxuICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkZhaWxlZCBNYXRjaC5XaGVyZSB2YWxpZGF0aW9uXCIpO1xuICB9XG5cblxuICBpZiAocGF0dGVybiBpbnN0YW5jZW9mIE9wdGlvbmFsKVxuICAgIHBhdHRlcm4gPSBNYXRjaC5PbmVPZih1bmRlZmluZWQsIHBhdHRlcm4ucGF0dGVybik7XG5cbiAgaWYgKHBhdHRlcm4gaW5zdGFuY2VvZiBPbmVPZikge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGF0dGVybi5jaG9pY2VzLmxlbmd0aDsgKytpKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjaGVja1N1YnRyZWUodmFsdWUsIHBhdHRlcm4uY2hvaWNlc1tpXSk7XG4gICAgICAgIC8vIE5vIGVycm9yPyBZYXksIHJldHVybi5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIC8vIE90aGVyIGVycm9ycyBzaG91bGQgYmUgdGhyb3duLiBNYXRjaCBlcnJvcnMganVzdCBtZWFuIHRyeSBhbm90aGVyXG4gICAgICAgIC8vIGNob2ljZS5cbiAgICAgICAgaWYgKCEoZXJyIGluc3RhbmNlb2YgTWF0Y2guRXJyb3IpKVxuICAgICAgICAgIHRocm93IGVycjtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gWFhYIHRoaXMgZXJyb3IgaXMgdGVycmlibGVcbiAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJGYWlsZWQgTWF0Y2guT25lT2Ygb3IgTWF0Y2guT3B0aW9uYWwgdmFsaWRhdGlvblwiKTtcbiAgfVxuXG4gIC8vIEEgZnVuY3Rpb24gdGhhdCBpc24ndCBzb21ldGhpbmcgd2Ugc3BlY2lhbC1jYXNlIGlzIGFzc3VtZWQgdG8gYmUgYVxuICAvLyBjb25zdHJ1Y3Rvci5cbiAgaWYgKHBhdHRlcm4gaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIHBhdHRlcm4pXG4gICAgICByZXR1cm47XG4gICAgLy8gWFhYIHdoYXQgaWYgLm5hbWUgaXNuJ3QgZGVmaW5lZFxuICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIFwiICsgcGF0dGVybi5jb25zdHJ1Y3Rvci5uYW1lKTtcbiAgfVxuXG4gIHZhciB1bmtub3duS2V5c0FsbG93ZWQgPSBmYWxzZTtcbiAgaWYgKHBhdHRlcm4gaW5zdGFuY2VvZiBPYmplY3RJbmNsdWRpbmcpIHtcbiAgICB1bmtub3duS2V5c0FsbG93ZWQgPSB0cnVlO1xuICAgIHBhdHRlcm4gPSBwYXR0ZXJuLnBhdHRlcm47XG4gIH1cblxuICBpZiAocGF0dGVybiBpbnN0YW5jZW9mIE9iamVjdEhhc2gpIHtcbiAgICB2YXIga2V5UGF0dGVybiA9IHBhdHRlcm4ucGF0dGVybjtcbiAgICB2YXIgZW1wdHlIYXNoID0gdHJ1ZTtcbiAgICBmb3IgKHZhciBrZXkgaW4gdmFsdWUpIHtcbiAgICAgIGVtcHR5SGFzaCA9IGZhbHNlO1xuICAgICAgY2hlY2sodmFsdWVba2V5XSwga2V5UGF0dGVybik7XG4gICAgfVxuICAgIGlmIChlbXB0eUhhc2gpXG4gICAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJFeHBlY3RlZCBcIiArIHBhdHRlcm4uY29uc3RydWN0b3IubmFtZSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKHBhdHRlcm4gaW5zdGFuY2VvZiBTdWJjbGFzcykge1xuICAgIHZhciBTdXBlcmNsYXNzID0gcGF0dGVybi5TdXBlcmNsYXNzO1xuICAgIGlmIChwYXR0ZXJuLm1hdGNoU3VwZXJjbGFzcyAmJiB2YWx1ZSA9PSBTdXBlcmNsYXNzKSBcbiAgICAgIHJldHVybjtcbiAgICBpZiAoISAodmFsdWUucHJvdG90eXBlIGluc3RhbmNlb2YgU3VwZXJjbGFzcykpXG4gICAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJFeHBlY3RlZCBcIiArIHBhdHRlcm4uY29uc3RydWN0b3IubmFtZSArIFwiIG9mIFwiICsgU3VwZXJjbGFzcy5uYW1lKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAodHlwZW9mIHBhdHRlcm4gIT09IFwib2JqZWN0XCIpXG4gICAgdGhyb3cgRXJyb3IoXCJCYWQgcGF0dGVybjogdW5rbm93biBwYXR0ZXJuIHR5cGVcIik7XG5cbiAgLy8gQW4gb2JqZWN0LCB3aXRoIHJlcXVpcmVkIGFuZCBvcHRpb25hbCBrZXlzLiBOb3RlIHRoYXQgdGhpcyBkb2VzIE5PVCBkb1xuICAvLyBzdHJ1Y3R1cmFsIG1hdGNoZXMgYWdhaW5zdCBvYmplY3RzIG9mIHNwZWNpYWwgdHlwZXMgdGhhdCBoYXBwZW4gdG8gbWF0Y2hcbiAgLy8gdGhlIHBhdHRlcm46IHRoaXMgcmVhbGx5IG5lZWRzIHRvIGJlIGEgcGxhaW4gb2xkIHtPYmplY3R9IVxuICBpZiAodHlwZW9mIHZhbHVlICE9PSAnb2JqZWN0JylcbiAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJFeHBlY3RlZCBvYmplY3QsIGdvdCBcIiArIHR5cGVvZiB2YWx1ZSk7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbClcbiAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJFeHBlY3RlZCBvYmplY3QsIGdvdCBudWxsXCIpO1xuXG4gIHZhciByZXF1aXJlZFBhdHRlcm5zID0ge307XG4gIHZhciBvcHRpb25hbFBhdHRlcm5zID0ge307XG5cbiAgXy5lYWNoS2V5KHBhdHRlcm4sIGZ1bmN0aW9uKHN1YlBhdHRlcm4sIGtleSkge1xuICAgIGlmIChwYXR0ZXJuW2tleV0gaW5zdGFuY2VvZiBPcHRpb25hbClcbiAgICAgIG9wdGlvbmFsUGF0dGVybnNba2V5XSA9IHBhdHRlcm5ba2V5XS5wYXR0ZXJuO1xuICAgIGVsc2VcbiAgICAgIHJlcXVpcmVkUGF0dGVybnNba2V5XSA9IHBhdHRlcm5ba2V5XTtcbiAgfSwgdGhpcywgdHJ1ZSk7XG5cbiAgXy5lYWNoS2V5KHZhbHVlLCBmdW5jdGlvbihzdWJWYWx1ZSwga2V5KSB7XG4gICAgdmFyIHN1YlZhbHVlID0gdmFsdWVba2V5XTtcbiAgICB0cnkge1xuICAgICAgaWYgKHJlcXVpcmVkUGF0dGVybnMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICBjaGVja1N1YnRyZWUoc3ViVmFsdWUsIHJlcXVpcmVkUGF0dGVybnNba2V5XSk7XG4gICAgICAgIGRlbGV0ZSByZXF1aXJlZFBhdHRlcm5zW2tleV07XG4gICAgICB9IGVsc2UgaWYgKG9wdGlvbmFsUGF0dGVybnMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICBjaGVja1N1YnRyZWUoc3ViVmFsdWUsIG9wdGlvbmFsUGF0dGVybnNba2V5XSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoIXVua25vd25LZXlzQWxsb3dlZClcbiAgICAgICAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJVbmtub3duIGtleVwiKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGlmIChlcnIgaW5zdGFuY2VvZiBNYXRjaC5FcnJvcilcbiAgICAgICAgZXJyLnBhdGggPSBfcHJlcGVuZFBhdGgoa2V5LCBlcnIucGF0aCk7XG4gICAgICB0aHJvdyBlcnI7XG4gICAgfVxuICB9LCB0aGlzLCB0cnVlKTtcblxuICBfLmVhY2hLZXkocmVxdWlyZWRQYXR0ZXJucywgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIk1pc3Npbmcga2V5ICdcIiArIGtleSArIFwiJ1wiKTtcbiAgfSwgdGhpcywgdHJ1ZSk7XG59O1xuXG5cbnZhciBfanNLZXl3b3JkcyA9IFtcImRvXCIsIFwiaWZcIiwgXCJpblwiLCBcImZvclwiLCBcImxldFwiLCBcIm5ld1wiLCBcInRyeVwiLCBcInZhclwiLCBcImNhc2VcIixcbiAgXCJlbHNlXCIsIFwiZW51bVwiLCBcImV2YWxcIiwgXCJmYWxzZVwiLCBcIm51bGxcIiwgXCJ0aGlzXCIsIFwidHJ1ZVwiLCBcInZvaWRcIiwgXCJ3aXRoXCIsXG4gIFwiYnJlYWtcIiwgXCJjYXRjaFwiLCBcImNsYXNzXCIsIFwiY29uc3RcIiwgXCJzdXBlclwiLCBcInRocm93XCIsIFwid2hpbGVcIiwgXCJ5aWVsZFwiLFxuICBcImRlbGV0ZVwiLCBcImV4cG9ydFwiLCBcImltcG9ydFwiLCBcInB1YmxpY1wiLCBcInJldHVyblwiLCBcInN0YXRpY1wiLCBcInN3aXRjaFwiLFxuICBcInR5cGVvZlwiLCBcImRlZmF1bHRcIiwgXCJleHRlbmRzXCIsIFwiZmluYWxseVwiLCBcInBhY2thZ2VcIiwgXCJwcml2YXRlXCIsIFwiY29udGludWVcIixcbiAgXCJkZWJ1Z2dlclwiLCBcImZ1bmN0aW9uXCIsIFwiYXJndW1lbnRzXCIsIFwiaW50ZXJmYWNlXCIsIFwicHJvdGVjdGVkXCIsIFwiaW1wbGVtZW50c1wiLFxuICBcImluc3RhbmNlb2ZcIl07XG5cbi8vIEFzc3VtZXMgdGhlIGJhc2Ugb2YgcGF0aCBpcyBhbHJlYWR5IGVzY2FwZWQgcHJvcGVybHlcbi8vIHJldHVybnMga2V5ICsgYmFzZVxuZnVuY3Rpb24gX3ByZXBlbmRQYXRoKGtleSwgYmFzZSkge1xuICBpZiAoKHR5cGVvZiBrZXkpID09PSBcIm51bWJlclwiIHx8IGtleS5tYXRjaCgvXlswLTldKyQvKSlcbiAgICBrZXkgPSBcIltcIiArIGtleSArIFwiXVwiO1xuICBlbHNlIGlmICgha2V5Lm1hdGNoKC9eW2Etel8kXVswLTlhLXpfJF0qJC9pKSB8fCBfanNLZXl3b3Jkcy5pbmRleE9mKGtleSkgIT0gLTEpXG4gICAga2V5ID0gSlNPTi5zdHJpbmdpZnkoW2tleV0pO1xuXG4gIGlmIChiYXNlICYmIGJhc2VbMF0gIT09IFwiW1wiKVxuICAgIHJldHVybiBrZXkgKyAnLicgKyBiYXNlO1xuICByZXR1cm4ga2V5ICsgYmFzZTtcbn07XG5cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKTtcblxuXG4vLyBtb2R1bGUgZXhwb3J0cyBlcnJvciBjbGFzc2VzIGZvciBhbGwgbmFtZXMgZGVmaW5lZCBpbiB0aGlzIGFycmF5XG52YXIgZXJyb3JDbGFzc05hbWVzID0gWydBYnN0cmFjdENsYXNzJywgJ01peGluJywgJ01lc3NlbmdlcicsICdDb21wb25lbnREYXRhU291cmNlJyxcblx0XHRcdFx0XHQgICAnQXR0cmlidXRlJywgJ0JpbmRlcicsICdMb2FkZXInLCAnTWFpbE1lc3NhZ2VTb3VyY2UnLCAnRmFjZXQnXTtcblxudmFyIGVycm9yID0ge1xuXHR0b0JlSW1wbGVtZW50ZWQ6IHRvQmVJbXBsZW1lbnRlZCxcblx0Y3JlYXRlQ2xhc3M6IGNyZWF0ZUVycm9yQ2xhc3Ncbn07XG5cbmVycm9yQ2xhc3NOYW1lcy5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUpIHtcblx0ZXJyb3JbbmFtZV0gPSBjcmVhdGVFcnJvckNsYXNzKG5hbWUgKyAnRXJyb3InKTtcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGVycm9yO1xuXG5cbmZ1bmN0aW9uIGNyZWF0ZUVycm9yQ2xhc3MoZXJyb3JDbGFzc05hbWUpIHtcblx0dmFyIEVycm9yQ2xhc3M7XG5cdGV2YWwoJ0Vycm9yQ2xhc3MgPSBmdW5jdGlvbiAnICsgZXJyb3JDbGFzc05hbWUgKyAnKG1lc3NhZ2UpIHsgXFxcblx0XHRcdHRoaXMubmFtZSA9IFwiJyArIGVycm9yQ2xhc3NOYW1lICsgJ1wiOyBcXFxuXHRcdFx0dGhpcy5tZXNzYWdlID0gbWVzc2FnZSB8fCBcIlRoZXJlIHdhcyBhbiBlcnJvclwiOyBcXFxuXHRcdH0nKTtcblx0Xy5tYWtlU3ViY2xhc3MoRXJyb3JDbGFzcywgRXJyb3IpO1xuXG5cdHJldHVybiBFcnJvckNsYXNzO1xufVxuXG5cbmZ1bmN0aW9uIHRvQmVJbXBsZW1lbnRlZCgpIHtcblx0dGhyb3cgbmV3IGVycm9yLkFic3RyYWN0Q2xhc3MoJ2NhbGxpbmcgdGhlIG1ldGhvZCBvZiBhbiBhYnNjdHJhY3QgY2xhc3MgTWVzc2FnZVNvdXJjZScpO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbCA9IHtcblx0bG9nZ2VyOiByZXF1aXJlKCcuL2xvZ2dlcicpLFxuXHRyZXF1ZXN0OiByZXF1aXJlKCcuL3JlcXVlc3QnKSxcblx0Y2hlY2s6IHJlcXVpcmUoJy4vY2hlY2snKSxcblx0ZXJyb3I6IHJlcXVpcmUoJy4vZXJyb3InKVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSB1dGlsO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgTG9nZ2VyID0gcmVxdWlyZSgnLi9sb2dnZXJfY2xhc3MnKTtcblxudmFyIGxvZ2dlciA9IG5ldyBMb2dnZXIoeyBsZXZlbDogMyB9KTtcblxubW9kdWxlLmV4cG9ydHMgPSBsb2dnZXI7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgnbW9sLXByb3RvJyk7XG5cblxuLyoqXG4gKiBMb2cgbGV2ZWxzLlxuICovXG5cbnZhciBsZXZlbHMgPSBbXG4gICAgJ2Vycm9yJyxcbiAgICAnd2FybicsXG4gICAgJ2luZm8nLFxuICAgICdkZWJ1Zydcbl07XG5cbnZhciBtYXhMZXZlbExlbmd0aCA9IE1hdGgubWF4LmFwcGx5KE1hdGgsIGxldmVscy5tYXAoZnVuY3Rpb24obGV2ZWwpIHsgcmV0dXJuIGxldmVsLmxlbmd0aDsgfSkpO1xuXG4vKipcbiAqIENvbG9ycyBmb3IgbG9nIGxldmVscy5cbiAqL1xuXG52YXIgY29sb3JzID0gW1xuICAgIDMxLFxuICAgIDMzLFxuICAgIDM2LFxuICAgIDkwXG5dO1xuXG4vKipcbiAqIFBhZHMgdGhlIG5pY2Ugb3V0cHV0IHRvIHRoZSBsb25nZXN0IGxvZyBsZXZlbC5cbiAqL1xuXG5mdW5jdGlvbiBwYWQgKHN0cikge1xuICAgIGlmIChzdHIubGVuZ3RoIDwgbWF4TGV2ZWxMZW5ndGgpXG4gICAgICAgIHJldHVybiBzdHIgKyBuZXcgQXJyYXkobWF4TGV2ZWxMZW5ndGggLSBzdHIubGVuZ3RoICsgMSkuam9pbignICcpO1xuXG4gICAgcmV0dXJuIHN0cjtcbn07XG5cbi8qKlxuICogTG9nZ2VyIChjb25zb2xlKS5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbnZhciBMb2dnZXIgPSBmdW5jdGlvbiAob3B0cykge1xuICAgIG9wdHMgPSBvcHRzIHx8IHt9XG4gICAgdGhpcy5jb2xvcnMgPSBvcHRzLmNvbG9ycztcbiAgICB0aGlzLmxldmVsID0gb3B0cy5sZXZlbCB8fCAzO1xuICAgIHRoaXMuZW5hYmxlZCA9IG9wdHMuZW5hYmxlZCB8fCB0cnVlO1xuICAgIHRoaXMubG9nUHJlZml4ID0gb3B0cy5sb2dQcmVmaXggfHwgJyc7XG4gICAgdGhpcy5sb2dQcmVmaXhDb2xvciA9IG9wdHMubG9nUHJlZml4Q29sb3I7XG59O1xuXG5cbi8qKlxuICogTG9nIG1ldGhvZC5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkxvZ2dlci5wcm90b3R5cGUubG9nID0gZnVuY3Rpb24gKHR5cGUpIHtcbiAgICB2YXIgaW5kZXggPSBsZXZlbHMuaW5kZXhPZih0eXBlKTtcblxuICAgIGlmIChpbmRleCA+IHRoaXMubGV2ZWwgfHwgISB0aGlzLmVuYWJsZWQpXG4gICAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgY29uc29sZS5sb2cuYXBwbHkoXG4gICAgICAgICAgY29uc29sZVxuICAgICAgICAsIFt0aGlzLmxvZ1ByZWZpeENvbG9yXG4gICAgICAgICAgICAgPyAnICAgXFx4MUJbJyArIHRoaXMubG9nUHJlZml4Q29sb3IgKyAnbScgKyB0aGlzLmxvZ1ByZWZpeCArICcgIC1cXHgxQlszOW0nXG4gICAgICAgICAgICAgOiB0aGlzLmxvZ1ByZWZpeFxuICAgICAgICAgICx0aGlzLmNvbG9yc1xuICAgICAgICAgICAgID8gJyBcXHgxQlsnICsgY29sb3JzW2luZGV4XSArICdtJyArIHBhZCh0eXBlKSArICcgLVxceDFCWzM5bSdcbiAgICAgICAgICAgICA6IHR5cGUgKyAnOidcbiAgICAgICAgICBdLmNvbmNhdChfLnRvQXJyYXkoYXJndW1lbnRzKS5zbGljZSgxKSlcbiAgICApO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEdlbmVyYXRlIG1ldGhvZHMuXG4gKi9cblxubGV2ZWxzLmZvckVhY2goZnVuY3Rpb24gKG5hbWUpIHtcbiAgICBMb2dnZXIucHJvdG90eXBlW25hbWVdID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmxvZy5hcHBseSh0aGlzLCBbbmFtZV0uY29uY2F0KF8udG9BcnJheShhcmd1bWVudHMpKSk7XG4gICAgfTtcbn0pO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gTG9nZ2VyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVlc3Q7XG5cblxuLy8gVE9ETyBhZGQgZXJyb3Igc3RhdHVzZXNcbnZhciBva1N0YXR1c2VzID0gWycyMDAnLCAnMzA0J107XG5cblxuZnVuY3Rpb24gcmVxdWVzdCh1cmwsIG9wdHMsIGNhbGxiYWNrKSB7XG5cdHZhciByZXEgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblx0cmVxLm9wZW4ob3B0cy5tZXRob2QsIHVybCwgdHJ1ZSk7IC8vIHdoYXQgdHJ1ZSBtZWFucz9cblx0cmVxLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcblx0XHRpZiAocmVxLnJlYWR5U3RhdGUgPT0gNCAmJiByZXEuc3RhdHVzVGV4dC50b1VwcGVyQ2FzZSgpID09ICdPSycgKVxuXHRcdFx0Y2FsbGJhY2sobnVsbCwgcmVxLnJlc3BvbnNlVGV4dCwgcmVxKTtcblx0XHQvLyBlbHNlXG5cdFx0Ly8gXHRjYWxsYmFjayhyZXEuc3RhdHVzLCByZXEucmVzcG9uc2VUZXh0LCByZXEpO1xuXHR9O1xuXHRyZXEuc2VuZChudWxsKTtcbn1cblxuXy5leHRlbmQocmVxdWVzdCwge1xuXHRnZXQ6IGdldFxufSk7XG5cblxuZnVuY3Rpb24gZ2V0KHVybCwgY2FsbGJhY2spIHtcblx0cmVxdWVzdCh1cmwsIHsgbWV0aG9kOiAnR0VUJyB9LCBjYWxsYmFjayk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfO1xudmFyIHByb3RvID0gXyA9IHtcblx0ZXh0ZW5kUHJvdG86IGV4dGVuZFByb3RvLFxuXHRjcmVhdGVTdWJjbGFzczogY3JlYXRlU3ViY2xhc3MsXG5cdG1ha2VTdWJjbGFzczogbWFrZVN1YmNsYXNzLFxuXHRleHRlbmQ6IGV4dGVuZCxcblx0Y2xvbmU6IGNsb25lLFxuXHRkZWVwRXh0ZW5kOiBkZWVwRXh0ZW5kLFxuXHRhbGxLZXlzOiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcy5iaW5kKE9iamVjdCksXG5cdGtleU9mOiBrZXlPZixcblx0YWxsS2V5c09mOiBhbGxLZXlzT2YsXG5cdGVhY2hLZXk6IGVhY2hLZXksXG5cdG1hcEtleXM6IG1hcEtleXMsXG5cdGFwcGVuZEFycmF5OiBhcHBlbmRBcnJheSxcblx0cHJlcGVuZEFycmF5OiBwcmVwZW5kQXJyYXksXG5cdHRvQXJyYXk6IHRvQXJyYXksXG5cdGZpcnN0VXBwZXJDYXNlOiBmaXJzdFVwcGVyQ2FzZSxcblx0Zmlyc3RMb3dlckNhc2U6IGZpcnN0TG93ZXJDYXNlXG59O1xuXG5cbmlmICh0eXBlb2Ygd2luZG93ID09ICdvYmplY3QnKSB7XG5cdC8vIHByZXNlcnZlIGV4aXN0aW5nIF8gb2JqZWN0XG5cdGlmICh3aW5kb3cuXylcblx0XHRwcm90by51bmRlcnNjb3JlID0gd2luZG93Ll9cblxuXHQvLyBleHBvc2UgZ2xvYmFsIF9cblx0d2luZG93Ll8gPSBwcm90bztcbn1cblxuaWYgKHR5cGVvZiBtb2R1bGUgPT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpXG5cdC8vIGV4cG9ydCBmb3Igbm9kZS9icm93c2VyaWZ5XG5cdG1vZHVsZS5leHBvcnRzID0gcHJvdG87XG5cdFxuXG5mdW5jdGlvbiBleHRlbmRQcm90byhzZWxmLCBtZXRob2RzKSB7XG5cdHZhciBwcm9wRGVzY3JpcHRvcnMgPSB7fTtcblxuXHRfLmVhY2hLZXkobWV0aG9kcywgZnVuY3Rpb24obWV0aG9kLCBuYW1lKSB7XG5cdFx0cHJvcERlc2NyaXB0b3JzW25hbWVdID0ge1xuXHRcdFx0ZW51bWVyYWJsZTogZmFsc2UsXG5cdFx0XHRjb25maWd1cmFibGU6IGZhbHNlLFxuXHRcdFx0d3JpdGFibGU6IGZhbHNlLFxuXHRcdFx0dmFsdWU6IG1ldGhvZFxuXHRcdH07XG5cdH0pO1xuXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHNlbGYucHJvdG90eXBlLCBwcm9wRGVzY3JpcHRvcnMpO1xuXHRyZXR1cm4gc2VsZjtcbn1cblxuXG5mdW5jdGlvbiBleHRlbmQoc2VsZiwgb2JqLCBvbmx5RW51bWVyYWJsZSkge1xuXHR2YXIgcHJvcERlc2NyaXB0b3JzID0ge307XG5cblx0Xy5lYWNoS2V5KG9iaiwgZnVuY3Rpb24odmFsdWUsIHByb3ApIHtcblx0XHR2YXIgZGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Iob2JqLCBwcm9wKTtcblx0XHRwcm9wRGVzY3JpcHRvcnNbcHJvcF0gPSBkZXNjcmlwdG9yO1xuXHR9LCB0aGlzLCBvbmx5RW51bWVyYWJsZSk7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnRpZXMoc2VsZiwgcHJvcERlc2NyaXB0b3JzKTtcblxuXHRyZXR1cm4gc2VsZjtcbn1cblxuXG5mdW5jdGlvbiBkZWVwRXh0ZW5kKHNlbGYsIG9iaiwgb25seUVudW1lcmFibGUpIHtcblx0cmV0dXJuIF9leHRlbmRUcmVlKHNlbGYsIG9iaiwgb25seUVudW1lcmFibGUsIFtdKTtcbn1cblxuXG5mdW5jdGlvbiBfZXh0ZW5kVHJlZShzZWxmTm9kZSwgb2JqTm9kZSwgb25seUVudW1lcmFibGUsIG9ialRyYXZlcnNlZCkge1xuXHRpZiAob2JqVHJhdmVyc2VkLmluZGV4T2Yob2JqTm9kZSkgPj0gMCkgcmV0dXJuOyAvLyBub2RlIGFscmVhZHkgdHJhdmVyc2VkXG5cdG9ialRyYXZlcnNlZC5wdXNoKG9iak5vZGUpO1xuXG5cdF8uZWFjaEtleShvYmpOb2RlLCBmdW5jdGlvbih2YWx1ZSwgcHJvcCkge1xuXHRcdHZhciBkZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmpOb2RlLCBwcm9wKTtcblx0XHRpZiAodHlwZW9mIHZhbHVlID09ICdvYmplY3QnKSB7XG5cdFx0XHRpZiAoc2VsZk5vZGUuaGFzT3duUHJvcGVydHkocHJvcCkgJiYgdHlwZW9mIHNlbGZOb2RlW3Byb3BdID09ICdvYmplY3QnKVxuXHRcdFx0XHRfZXh0ZW5kVHJlZShzZWxmTm9kZVtwcm9wXSwgdmFsdWUsIG9ubHlFbnVtZXJhYmxlLCBvYmpUcmF2ZXJzZWQpXG5cdFx0XHRlbHNlXG5cdFx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShzZWxmTm9kZSwgcHJvcCwgZGVzY3JpcHRvcik7XG5cdFx0fSBlbHNlXG5cdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoc2VsZk5vZGUsIHByb3AsIGRlc2NyaXB0b3IpO1xuXHR9LCB0aGlzLCBvbmx5RW51bWVyYWJsZSk7XG5cblx0cmV0dXJuIHNlbGZOb2RlO1xufVxuXG5cbmZ1bmN0aW9uIGNsb25lKG9iaikge1xuXHR2YXIgY2xvbmVkT2JqZWN0ID0gT2JqZWN0LmNyZWF0ZShvYmouY29uc3RydWN0b3IucHJvdG90eXBlKTtcblx0Xy5leHRlbmQoY2xvbmVkT2JqZWN0LCBvYmopO1xuXHRyZXR1cm4gY2xvbmVkT2JqZWN0O1xufVxuXG5cbmZ1bmN0aW9uIGNyZWF0ZVN1YmNsYXNzKHRoaXNDbGFzcywgbmFtZSwgYXBwbHlDb25zdHJ1Y3Rvcikge1xuXHR2YXIgc3ViY2xhc3M7XG5cblx0Ly8gbmFtZSBpcyBvcHRpb25hbFxuXHRuYW1lID0gbmFtZSB8fCAnJztcblxuXHQvLyBhcHBseSBzdXBlcmNsYXNzIGNvbnN0cnVjdG9yXG5cdHZhciBjb25zdHJ1Y3RvckNvZGUgPSBhcHBseUNvbnN0cnVjdG9yID09PSBmYWxzZVxuXHRcdFx0PyAnJ1xuXHRcdFx0OiAndGhpc0NsYXNzLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7JztcblxuXHRldmFsKCdzdWJjbGFzcyA9IGZ1bmN0aW9uICcgKyBuYW1lICsgJygpeyAnICsgY29uc3RydWN0b3JDb2RlICsgJyB9Jyk7XG5cblx0Xy5tYWtlU3ViY2xhc3Moc3ViY2xhc3MsIHRoaXNDbGFzcyk7XG5cblx0Ly8gY29weSBjbGFzcyBtZXRob2RzXG5cdC8vIC0gZm9yIHRoZW0gdG8gd29yayBjb3JyZWN0bHkgdGhleSBzaG91bGQgbm90IGV4cGxpY3RseSB1c2Ugc3VwZXJjbGFzcyBuYW1lXG5cdC8vIGFuZCB1c2UgXCJ0aGlzXCIgaW5zdGVhZFxuXHRfLmV4dGVuZChzdWJjbGFzcywgdGhpc0NsYXNzLCB0cnVlKTtcblxuXHRyZXR1cm4gc3ViY2xhc3M7XG59XG5cblxuZnVuY3Rpb24gbWFrZVN1YmNsYXNzKHRoaXNDbGFzcywgU3VwZXJjbGFzcykge1xuXHQvLyBwcm90b3R5cGUgY2hhaW5cblx0dGhpc0NsYXNzLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoU3VwZXJjbGFzcy5wcm90b3R5cGUpO1xuXHRcblx0Ly8gc3ViY2xhc3MgaWRlbnRpdHlcblx0Xy5leHRlbmRQcm90byh0aGlzQ2xhc3MsIHtcblx0XHRjb25zdHJ1Y3RvcjogdGhpc0NsYXNzXG5cdH0pO1xuXHRyZXR1cm4gdGhpc0NsYXNzO1xufVxuXG5cbmZ1bmN0aW9uIGtleU9mKHNlbGYsIHNlYXJjaEVsZW1lbnQsIG9ubHlFbnVtZXJhYmxlKSB7XG5cdHZhciBwcm9wZXJ0aWVzID0gb25seUVudW1lcmFibGUgXG5cdFx0XHRcdFx0XHQ/IE9iamVjdC5rZXlzKHNlbGYpXG5cdFx0XHRcdFx0XHQ6IF8uYWxsS2V5cyhzZWxmKTtcblxuXHRmb3IgKHZhciBpID0gMDsgaSA8IHByb3BlcnRpZXMubGVuZ3RoOyBpKyspXG5cdFx0aWYgKHNlYXJjaEVsZW1lbnQgPT09IHNlbGZbcHJvcGVydGllc1tpXV0pXG5cdFx0XHRyZXR1cm4gcHJvcGVydGllc1tpXTtcblx0XG5cdHJldHVybiB1bmRlZmluZWQ7XG59XG5cblxuZnVuY3Rpb24gYWxsS2V5c09mKHNlbGYsIHNlYXJjaEVsZW1lbnQsIG9ubHlFbnVtZXJhYmxlKSB7XG5cdHZhciBwcm9wZXJ0aWVzID0gb25seUVudW1lcmFibGUgXG5cdFx0XHRcdFx0XHQ/IE9iamVjdC5rZXlzKHNlbGYpXG5cdFx0XHRcdFx0XHQ6IF8uYWxsS2V5cyhzZWxmKTtcblxuXHR2YXIga2V5cyA9IHByb3BlcnRpZXMuZmlsdGVyKGZ1bmN0aW9uKHByb3ApIHtcblx0XHRyZXR1cm4gc2VhcmNoRWxlbWVudCA9PT0gc2VsZltwcm9wXTtcblx0fSk7XG5cblx0cmV0dXJuIGtleXM7XG59XG5cblxuZnVuY3Rpb24gZWFjaEtleShzZWxmLCBjYWxsYmFjaywgdGhpc0FyZywgb25seUVudW1lcmFibGUpIHtcblx0dmFyIHByb3BlcnRpZXMgPSBvbmx5RW51bWVyYWJsZSBcblx0XHRcdFx0XHRcdD8gT2JqZWN0LmtleXMoc2VsZilcblx0XHRcdFx0XHRcdDogXy5hbGxLZXlzKHNlbGYpO1xuXG5cdHByb3BlcnRpZXMuZm9yRWFjaChmdW5jdGlvbihwcm9wKSB7XG5cdFx0Y2FsbGJhY2suY2FsbCh0aGlzQXJnLCBzZWxmW3Byb3BdLCBwcm9wLCBzZWxmKTtcblx0fSk7XG59XG5cblxuZnVuY3Rpb24gbWFwS2V5cyhzZWxmLCBjYWxsYmFjaywgdGhpc0FyZywgb25seUVudW1lcmFibGUpIHtcblx0dmFyIG1hcFJlc3VsdCA9IHt9O1xuXHRfLmVhY2hLZXkoc2VsZiwgbWFwUHJvcGVydHksIHRoaXNBcmcsIG9ubHlFbnVtZXJhYmxlKTtcblx0cmV0dXJuIG1hcFJlc3VsdDtcblxuXHRmdW5jdGlvbiBtYXBQcm9wZXJ0eSh2YWx1ZSwga2V5KSB7XG5cdFx0dmFyIGRlc2NyaXB0b3IgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHNlbGYsIGtleSk7XG5cdFx0aWYgKGRlc2NyaXB0b3IuZW51bWVyYWJsZSB8fCAhIG9ubHlFbnVtZXJhYmxlKSB7XG5cdFx0XHRkZXNjcmlwdG9yLnZhbHVlID0gY2FsbGJhY2suY2FsbCh0aGlzLCB2YWx1ZSwga2V5LCBzZWxmKTtcblx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShtYXBSZXN1bHQsIGtleSwgZGVzY3JpcHRvcik7XG5cdFx0fVxuXHR9XG59XG5cblxuZnVuY3Rpb24gYXBwZW5kQXJyYXkoc2VsZiwgYXJyYXlUb0FwcGVuZCkge1xuXHRpZiAoISBhcnJheVRvQXBwZW5kLmxlbmd0aCkgcmV0dXJuIHNlbGY7XG5cbiAgICB2YXIgYXJncyA9IFtzZWxmLmxlbmd0aCwgMF0uY29uY2F0KGFycmF5VG9BcHBlbmQpO1xuICAgIEFycmF5LnByb3RvdHlwZS5zcGxpY2UuYXBwbHkoc2VsZiwgYXJncyk7XG5cbiAgICByZXR1cm4gc2VsZjtcbn1cblxuXG5mdW5jdGlvbiBwcmVwZW5kQXJyYXkoc2VsZiwgYXJyYXlUb1ByZXBlbmQpIHtcblx0aWYgKCEgYXJyYXlUb1ByZXBlbmQubGVuZ3RoKSByZXR1cm4gc2VsZjtcblxuICAgIHZhciBhcmdzID0gWzAsIDBdLmNvbmNhdChhcnJheVRvUHJlcGVuZCk7XG4gICAgQXJyYXkucHJvdG90eXBlLnNwbGljZS5hcHBseShzZWxmLCBhcmdzKTtcblxuICAgIHJldHVybiBzZWxmO1xufVxuXG5cbmZ1bmN0aW9uIHRvQXJyYXkoYXJyYXlMaWtlKSB7XG5cdHZhciBhcnIgPSBbXTtcblx0QXJyYXkucHJvdG90eXBlLmZvckVhY2guY2FsbChhcnJheUxpa2UsIGZ1bmN0aW9uKGl0ZW0pIHtcblx0XHRhcnIucHVzaChpdGVtKVxuXHR9KTtcblxuXHRyZXR1cm4gYXJyO1xufVxuXG5cbmZ1bmN0aW9uIGZpcnN0VXBwZXJDYXNlKHN0cikge1xuXHRyZXR1cm4gc3RyWzBdLnRvVXBwZXJDYXNlKCkgKyBzdHIuc2xpY2UoMSk7XG59XG5cblxuZnVuY3Rpb24gZmlyc3RMb3dlckNhc2Uoc3RyKSB7XG5cdHJldHVybiBzdHJbMF0udG9Mb3dlckNhc2UoKSArIHN0ci5zbGljZSgxKTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuZGVzY3JpYmUoJ21pbG8gYmluZGVyJywgZnVuY3Rpb24oKSB7XG4gICAgaXQoJ3Nob3VsZCBiaW5kIGNvbXBvbmVudHMgYmFzZWQgb24gbWwtYmluZCBhdHRyaWJ1dGUnLCBmdW5jdGlvbigpIHtcbiAgICBcdHZhciBtaWxvID0gcmVxdWlyZSgnLi4vLi4vbGliL21pbG8nKTtcblxuXHRcdGV4cGVjdCh7cDogMX0pLnByb3BlcnR5KCdwJywgMSk7XG5cbiAgICBcdHZhciBjdHJsID0gbWlsby5iaW5kZXIoKTtcblxuICAgICAgICBjb25zb2xlLmxvZyhjdHJsKTtcblxuICAgIFx0Y3RybC5hcnRpY2xlQnV0dG9uLmV2ZW50cy5vbignY2xpY2sgbW91c2VlbnRlcicsIGZ1bmN0aW9uKGVUeXBlLCBldnQpIHtcbiAgICBcdFx0Y29uc29sZS5sb2coJ2J1dHRvbicsIGVUeXBlLCBldnQpO1xuICAgIFx0fSk7XG5cbiAgICAgICAgY3RybC5tYWluLmV2ZW50cy5vbignY2xpY2sgbW91c2VlbnRlciBpbnB1dCBrZXlwcmVzcycsIGZ1bmN0aW9uKGVUeXBlLCBldnQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdkaXYnLCBlVHlwZSwgZXZ0KTtcbiAgICAgICAgfSk7XG5cbiAgICBcdGN0cmwuYXJ0aWNsZUlkSW5wdXQuZGF0YS5vbignZGF0YWNoYW5nZWQnLCBsb2dEYXRhKTtcblxuICAgIFx0ZnVuY3Rpb24gbG9nRGF0YShtZXNzYWdlLCBkYXRhKSB7XG4gICAgXHRcdGNvbnNvbGUubG9nKG1lc3NhZ2UsIGRhdGEpO1xuICAgIFx0fVxuXG4gICAgICAgIHZhciBteVRtcGxDb21wcyA9IGN0cmwubXlUZW1wbGF0ZS50ZW1wbGF0ZVxuICAgICAgICAgICAgICAgIC5zZXQoJzxwIG1sLWJpbmQ9XCI6aW5uZXJQYXJhXCI+SSBhbSByZW5kZXJlZCBmcm9tIHRlbXBsYXRlPC9wPicpXG4gICAgICAgICAgICAgICAgLnJlbmRlcigpXG4gICAgICAgICAgICAgICAgLmJpbmRlcigpO1xuXG4gICAgICAgIF8uZXh0ZW5kKGN0cmwsIG15VG1wbENvbXBzKTsgLy8gc2hvdWxkIGJlIHNvbWUgZnVuY3Rpb24gdG8gYWRkIHRvIGNvbnRyb2xsZXJcblxuICAgICAgICBjdHJsLmlubmVyUGFyYS5lbC5pbm5lckhUTUwgKz0gJywgdGhlbiBib3VuZCBhbmQgY2hhbmdlZCB2aWEgY29tcG9uZW50IGluc2lkZSB0ZW1wbGF0ZSc7XG4gICAgfSk7XG59KTtcbiJdfQ==
;