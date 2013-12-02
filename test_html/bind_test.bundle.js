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
		console.log('listener on paragraph', this);
		self._target = event.target;
		if (targetInDragHandle(event))
			window.getSelection().empty();
	}


	function onMouseMovement(eventType, event) {
		var shouldBeDraggable = targetInDragHandle(event);
		self.owner.el.setAttribute('draggable', shouldBeDraggable);
	}


	function onDragStart(eventType, event) {
		console.log(self._dragHandle);
		console.log(self._target);

		if (targetInDragHandle(event)) {
			// event.dataTransfer.setData('text/plain', self.owner.el.innerHTML);
			event.dataTransfer.setData('text/html', self.owner.el.outerHTML);
			event.dataTransfer.setData('x-application/milo-component', self.owner);
			self._ondragstart && self._ondragstart(eventType, event);


			console.log(event.dataTransfer.getData('text/html'));
			console.log(event.dataTransfer.getData('x-application/milo-component'));
			console.log(event);
		} else {
			console.log('preventDefault');
			event.preventDefault();
		}
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
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2Fic3RyYWN0L21peGluLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9hYnN0cmFjdC9yZWdpc3RyeS5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvYXR0cmlidXRlL2FfYmluZC5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvYXR0cmlidXRlL2FfbG9hZC5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvYXR0cmlidXRlL2luZGV4LmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9iaW5kZXIuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NsYXNzZXMuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19jbGFzcy5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX2ZhY2V0LmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfZmFjZXRzL0NvbnRhaW5lci5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX2ZhY2V0cy9EYXRhLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfZmFjZXRzL0RvbS5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX2ZhY2V0cy9EcmFnLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfZmFjZXRzL0Ryb3AuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19mYWNldHMvRXZlbnRzLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfZmFjZXRzL0ZyYW1lLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfZmFjZXRzL1RlbXBsYXRlLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfZmFjZXRzL2NmX3JlZ2lzdHJ5LmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfbWVzc2FnZV9zb3VyY2VzL2NvbXBvbmVudF9kYXRhX3NvdXJjZS5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX21lc3NhZ2Vfc291cmNlcy9kb21fZXZlbnRzX2NvbnN0cnVjdG9ycy5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX21lc3NhZ2Vfc291cmNlcy9kb21fZXZlbnRzX3NvdXJjZS5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX21lc3NhZ2Vfc291cmNlcy9pZnJhbWVfbWVzc2FnZV9zb3VyY2UuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19yZWdpc3RyeS5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jbGFzc2VzL1ZpZXcuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbmZpZy5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvZmFjZXRzL2ZfY2xhc3MuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2ZhY2V0cy9mX29iamVjdC5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvbG9hZGVyLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9tYWlsL2luZGV4LmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9tYWlsL21haWxfc291cmNlLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9tZXNzZW5nZXIvaW5kZXguanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL21lc3Nlbmdlci9tZXNzYWdlX3NvdXJjZS5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvbWlsby5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvdXRpbC9jaGVjay5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvdXRpbC9lcnJvci5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvdXRpbC9pbmRleC5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvdXRpbC9sb2dnZXIuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL3V0aWwvbG9nZ2VyX2NsYXNzLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi91dGlsL3JlcXVlc3QuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbm9kZV9tb2R1bGVzL21vbC1wcm90by9saWIvcHJvdG8uanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vdGVzdF9odG1sL2JpbmRfdGVzdC9iaW5kX3Rlc3QuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDblBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgnbW9sLXByb3RvJylcblx0LCBjaGVjayA9IHJlcXVpcmUoJy4uL3V0aWwvY2hlY2snKVxuXHQsIE1hdGNoID0gY2hlY2suTWF0Y2hcblx0LCBNaXhpbkVycm9yID0gcmVxdWlyZSgnLi4vdXRpbC9lcnJvcicpLk1peGluO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gTWl4aW47XG5cbi8vIGFuIGFic3RyYWN0IGNsYXNzIGZvciBtaXhpbiBwYXR0ZXJuIC0gYWRkaW5nIHByb3h5IG1ldGhvZHMgdG8gaG9zdCBvYmplY3RzXG5mdW5jdGlvbiBNaXhpbihob3N0T2JqZWN0LCBwcm94eU1ldGhvZHMgLyosIG90aGVyIGFyZ3MgLSBwYXNzZWQgdG8gaW5pdCBtZXRob2QgKi8pIHtcblx0Ly8gVE9ETyAtIG1vY2UgY2hlY2tzIGZyb20gTWVzc2VuZ2VyIGhlcmVcblx0Y2hlY2soaG9zdE9iamVjdCwgTWF0Y2guT3B0aW9uYWwoT2JqZWN0KSk7XG5cdGNoZWNrKHByb3h5TWV0aG9kcywgTWF0Y2guT3B0aW9uYWwoTWF0Y2guT2JqZWN0SGFzaChTdHJpbmcpKSk7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdfaG9zdE9iamVjdCcsIHsgdmFsdWU6IGhvc3RPYmplY3QgfSk7XG5cdGlmIChwcm94eU1ldGhvZHMpXG5cdFx0dGhpcy5fY3JlYXRlUHJveHlNZXRob2RzKHByb3h5TWV0aG9kcyk7XG5cblx0Ly8gY2FsbGluZyBpbml0IGlmIGl0IGlzIGRlZmluZWQgaW4gdGhlIGNsYXNzXG5cdGlmICh0aGlzLmluaXQpXG5cdFx0dGhpcy5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59XG5cbl8uZXh0ZW5kUHJvdG8oTWl4aW4sIHtcblx0X2NyZWF0ZVByb3h5TWV0aG9kOiBfY3JlYXRlUHJveHlNZXRob2QsXG5cdF9jcmVhdGVQcm94eU1ldGhvZHM6IF9jcmVhdGVQcm94eU1ldGhvZHNcbn0pO1xuXG5cbmZ1bmN0aW9uIF9jcmVhdGVQcm94eU1ldGhvZChtaXhpbk1ldGhvZE5hbWUsIHByb3h5TWV0aG9kTmFtZSkge1xuXHRpZiAodGhpcy5faG9zdE9iamVjdFtwcm94eU1ldGhvZE5hbWVdKVxuXHRcdHRocm93IG5ldyBNaXhpbkVycm9yKCdtZXRob2QgJyArIHByb3h5TWV0aG9kTmFtZSArXG5cdFx0XHRcdFx0XHRcdFx0ICcgYWxyZWFkeSBkZWZpbmVkIGluIGhvc3Qgb2JqZWN0Jyk7XG5cblx0Y2hlY2sodGhpc1ttaXhpbk1ldGhvZE5hbWVdLCBGdW5jdGlvbik7XG5cblx0dmFyIGJvdW5kTWV0aG9kID0gdGhpc1ttaXhpbk1ldGhvZE5hbWVdLmJpbmQodGhpcyk7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMuX2hvc3RPYmplY3QsIHByb3h5TWV0aG9kTmFtZSxcblx0XHR7IHZhbHVlOiBib3VuZE1ldGhvZCB9KTtcbn1cblxuXG5mdW5jdGlvbiBfY3JlYXRlUHJveHlNZXRob2RzKHByb3h5TWV0aG9kcykge1xuXHQvLyBjcmVhdGluZyBhbmQgYmluZGluZyBwcm94eSBtZXRob2RzIG9uIHRoZSBob3N0IG9iamVjdFxuXHRfLmVhY2hLZXkocHJveHlNZXRob2RzLCBfY3JlYXRlUHJveHlNZXRob2QsIHRoaXMpO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpXG5cdCwgY2hlY2sgPSByZXF1aXJlKCcuLi91dGlsL2NoZWNrJylcblx0LCBNYXRjaCA9IGNoZWNrLk1hdGNoO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENsYXNzUmVnaXN0cnk7XG5cbmZ1bmN0aW9uIENsYXNzUmVnaXN0cnkgKEZvdW5kYXRpb25DbGFzcykge1xuXHRpZiAoRm91bmRhdGlvbkNsYXNzKVxuXHRcdHRoaXMuc2V0Q2xhc3MoRm91bmRhdGlvbkNsYXNzKTtcblxuXHQvLyBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ19fcmVnaXN0ZXJlZENsYXNzZXMnLCB7XG5cdC8vIFx0XHRlbnVtZXJhYmxlOiBmYWxzZSxcblx0Ly8gXHRcdHdyaXRhYmxlOiB0cnVlLFxuXHQvLyBcdFx0Y29uZmlndXJhYmxlOiB0cnVlLFxuXHQvLyBcdFx0dmFsdWU6IHt9XG5cdC8vIH0pO1xuXG5cdHRoaXMuX19yZWdpc3RlcmVkQ2xhc3NlcyA9IHt9O1xufVxuXG5fLmV4dGVuZFByb3RvKENsYXNzUmVnaXN0cnksIHtcblx0YWRkOiByZWdpc3RlckNsYXNzLFxuXHRnZXQ6IGdldENsYXNzLFxuXHRyZW1vdmU6IHVucmVnaXN0ZXJDbGFzcyxcblx0Y2xlYW46IHVucmVnaXN0ZXJBbGxDbGFzc2VzLFxuXHRzZXRDbGFzczogc2V0Rm91bmRhdGlvbkNsYXNzXG59KTtcblxuXG5mdW5jdGlvbiBzZXRGb3VuZGF0aW9uQ2xhc3MoRm91bmRhdGlvbkNsYXNzKSB7XG5cdGNoZWNrKEZvdW5kYXRpb25DbGFzcywgRnVuY3Rpb24pO1xuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ0ZvdW5kYXRpb25DbGFzcycsIHtcblx0XHRlbnVtZXJhYmxlOiB0cnVlLFxuXHRcdHZhbHVlOiBGb3VuZGF0aW9uQ2xhc3Ncblx0fSk7XG59XG5cbmZ1bmN0aW9uIHJlZ2lzdGVyQ2xhc3MoYUNsYXNzLCBuYW1lKSB7XG5cdG5hbWUgPSBuYW1lIHx8IGFDbGFzcy5uYW1lO1xuXG5cdGNoZWNrKG5hbWUsIFN0cmluZywgJ2NsYXNzIG5hbWUgbXVzdCBiZSBzdHJpbmcnKTtcblx0Y2hlY2sobmFtZSwgTWF0Y2guV2hlcmUoZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHR5cGVvZiBuYW1lID09ICdzdHJpbmcnICYmIG5hbWUgIT0gJyc7XG5cdH0pLCAnY2xhc3MgbmFtZSBtdXN0IGJlIHN0cmluZycpO1xuXHRpZiAodGhpcy5Gb3VuZGF0aW9uQ2xhc3MpIHtcblx0XHRpZiAoYUNsYXNzICE9IHRoaXMuRm91bmRhdGlvbkNsYXNzKVxuXHRcdFx0Y2hlY2soYUNsYXNzLCBNYXRjaC5TdWJjbGFzcyh0aGlzLkZvdW5kYXRpb25DbGFzcyksICdjbGFzcyBtdXN0IGJlIGEgc3ViKGNsYXNzKSBvZiBhIGZvdW5kYXRpb24gY2xhc3MnKTtcblx0fSBlbHNlXG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignZm91bmRhdGlvbiBjbGFzcyBtdXN0IGJlIHNldCBiZWZvcmUgYWRkaW5nIGNsYXNzZXMgdG8gcmVnaXN0cnknKTtcblxuXHRpZiAodGhpcy5fX3JlZ2lzdGVyZWRDbGFzc2VzW25hbWVdKVxuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ2lzIGFscmVhZHkgcmVnaXN0ZXJlZCcpO1xuXG5cdHRoaXMuX19yZWdpc3RlcmVkQ2xhc3Nlc1tuYW1lXSA9IGFDbGFzcztcbn07XG5cblxuZnVuY3Rpb24gZ2V0Q2xhc3MobmFtZSkge1xuXHRjaGVjayhuYW1lLCBTdHJpbmcsICdjbGFzcyBuYW1lIG11c3QgYmUgc3RyaW5nJyk7XG5cdHJldHVybiB0aGlzLl9fcmVnaXN0ZXJlZENsYXNzZXNbbmFtZV07XG59O1xuXG5cbmZ1bmN0aW9uIHVucmVnaXN0ZXJDbGFzcyhuYW1lT3JDbGFzcykge1xuXHRjaGVjayhuYW1lT3JDbGFzcywgTWF0Y2guT25lT2YoU3RyaW5nLCBGdW5jdGlvbiksICdjbGFzcyBvciBuYW1lIG11c3QgYmUgc3VwcGxpZWQnKTtcblxuXHR2YXIgbmFtZSA9IHR5cGVvZiBuYW1lT3JDbGFzcyA9PSAnc3RyaW5nJ1xuXHRcdFx0XHRcdFx0PyBuYW1lT3JDbGFzc1xuXHRcdFx0XHRcdFx0OiBuYW1lT3JDbGFzcy5uYW1lO1xuXHRcdFx0XHRcdFx0XG5cdGlmICghIHRoaXMuX19yZWdpc3RlcmVkQ2xhc3Nlc1tuYW1lXSlcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdjbGFzcyBpcyBub3QgcmVnaXN0ZXJlZCcpO1xuXG5cdGRlbGV0ZSB0aGlzLl9fcmVnaXN0ZXJlZENsYXNzZXNbbmFtZV07XG59O1xuXG5cbmZ1bmN0aW9uIHVucmVnaXN0ZXJBbGxDbGFzc2VzKCkge1xuXHR0aGlzLl9fcmVnaXN0ZXJlZENsYXNzZXMgPSB7fTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBBdHRyaWJ1dGUgPSByZXF1aXJlKCcuL2luZGV4Jylcblx0LCBBdHRyaWJ1dGVFcnJvciA9IHJlcXVpcmUoJy4uL3V0aWwvZXJyb3InKS5BdHRyaWJ1dGVcblx0LCBjb25maWcgPSByZXF1aXJlKCcuLi9jb25maWcnKVxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vdXRpbC9jaGVjaycpXG5cdCwgTWF0Y2ggPSBjaGVjay5NYXRjaDtcblxuXG4vLyBNYXRjaGVzO1xuLy8gOm15VmlldyAtIG9ubHkgY29tcG9uZW50IG5hbWVcbi8vIFZpZXc6bXlWaWV3IC0gY2xhc3MgYW5kIGNvbXBvbmVudCBuYW1lXG4vLyBbRXZlbnRzLCBEYXRhXTpteVZpZXcgLSBmYWNldHMgYW5kIGNvbXBvbmVudCBuYW1lXG4vLyBWaWV3W0V2ZW50c106bXlWaWV3IC0gY2xhc3MsIGZhY2V0KHMpIGFuZCBjb21wb25lbnQgbmFtZVxuXG52YXIgYXR0clJlZ0V4cD0gL14oW15cXDpcXFtcXF1dKikoPzpcXFsoW15cXDpcXFtcXF1dKilcXF0pP1xcOj8oW146XSopJC9cblx0LCBmYWNldHNTcGxpdFJlZ0V4cCA9IC9cXHMqKD86XFwsfFxccylcXHMqLztcblxuXG52YXIgQmluZEF0dHJpYnV0ZSA9IF8uY3JlYXRlU3ViY2xhc3MoQXR0cmlidXRlLCAnQmluZEF0dHJpYnV0ZScsIHRydWUpO1xuXG5fLmV4dGVuZFByb3RvKEJpbmRBdHRyaWJ1dGUsIHtcblx0YXR0ck5hbWU6IGdldEF0dHJpYnV0ZU5hbWUsXG5cdHBhcnNlOiBwYXJzZUF0dHJpYnV0ZSxcblx0dmFsaWRhdGU6IHZhbGlkYXRlQXR0cmlidXRlXG59KTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IEJpbmRBdHRyaWJ1dGU7XG5cblxuZnVuY3Rpb24gZ2V0QXR0cmlidXRlTmFtZSgpIHtcblx0cmV0dXJuIGNvbmZpZy5hdHRyc1snYmluZCddO1xufVxuXG5cbmZ1bmN0aW9uIHBhcnNlQXR0cmlidXRlKCkge1xuXHRpZiAoISB0aGlzLm5vZGUpIHJldHVybjtcblxuXHR2YXIgdmFsdWUgPSB0aGlzLmdldCgpO1xuXG5cdGlmICh2YWx1ZSlcblx0XHR2YXIgYmluZFRvID0gdmFsdWUubWF0Y2goYXR0clJlZ0V4cCk7XG5cblx0aWYgKCEgYmluZFRvKVxuXHRcdHRocm93IG5ldyBBdHRyaWJ1dGVFcnJvcignaW52YWxpZCBiaW5kIGF0dHJpYnV0ZSAnICsgdmFsdWUpO1xuXG5cdHRoaXMuY29tcENsYXNzID0gYmluZFRvWzFdIHx8ICdDb21wb25lbnQnO1xuXHR0aGlzLmNvbXBGYWNldHMgPSAoYmluZFRvWzJdICYmIGJpbmRUb1syXS5zcGxpdChmYWNldHNTcGxpdFJlZ0V4cCkpIHx8IHVuZGVmaW5lZDtcblx0dGhpcy5jb21wTmFtZSA9IGJpbmRUb1szXSB8fCB1bmRlZmluZWQ7XG5cblx0cmV0dXJuIHRoaXM7XG59XG5cblxuZnVuY3Rpb24gdmFsaWRhdGVBdHRyaWJ1dGUoKSB7XG5cdHZhciBjb21wTmFtZSA9IHRoaXMuY29tcE5hbWU7XG5cdGNoZWNrKGNvbXBOYW1lLCBNYXRjaC5XaGVyZShmdW5jdGlvbigpIHtcbiAgXHRcdHJldHVybiB0eXBlb2YgY29tcE5hbWUgPT0gJ3N0cmluZycgJiYgY29tcE5hbWUgIT0gJyc7XG5cdH0pLCAnZW1wdHkgY29tcG9uZW50IG5hbWUnKTtcblxuXHRpZiAoISB0aGlzLmNvbXBDbGFzcylcblx0XHR0aHJvdyBuZXcgQXR0cmlidXRlRXJyb3IoJ2VtcHR5IGNvbXBvbmVudCBjbGFzcyBuYW1lICcgKyB0aGlzLmNvbXBDbGFzcyk7XG5cblx0cmV0dXJuIHRoaXM7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBBdHRyaWJ1dGUgPSByZXF1aXJlKCcuL2luZGV4Jylcblx0LCBBdHRyaWJ1dGVFcnJvciA9IHJlcXVpcmUoJy4uL3V0aWwvZXJyb3InKS5BdHRyaWJ1dGVcblx0LCBjb25maWcgPSByZXF1aXJlKCcuLi9jb25maWcnKVxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKTtcblxuXG52YXIgTG9hZEF0dHJpYnV0ZSA9IF8uY3JlYXRlU3ViY2xhc3MoQXR0cmlidXRlLCAnTG9hZEF0dHJpYnV0ZScsIHRydWUpO1xuXG5fLmV4dGVuZFByb3RvKExvYWRBdHRyaWJ1dGUsIHtcblx0YXR0ck5hbWU6IGdldEF0dHJpYnV0ZU5hbWUsXG5cdHBhcnNlOiBwYXJzZUF0dHJpYnV0ZSxcblx0dmFsaWRhdGU6IHZhbGlkYXRlQXR0cmlidXRlXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBMb2FkQXR0cmlidXRlO1xuXG5cbmZ1bmN0aW9uIGdldEF0dHJpYnV0ZU5hbWUoKSB7XG5cdHJldHVybiBjb25maWcuYXR0cnMubG9hZDtcbn1cblxuXG5mdW5jdGlvbiBwYXJzZUF0dHJpYnV0ZSgpIHtcblx0aWYgKCEgdGhpcy5ub2RlKSByZXR1cm47XG5cblx0dmFyIHZhbHVlID0gdGhpcy5nZXQoKTtcblxuXHR0aGlzLmxvYWRVcmwgPSB2YWx1ZTtcblxuXHRyZXR1cm4gdGhpcztcbn1cblxuXG5mdW5jdGlvbiB2YWxpZGF0ZUF0dHJpYnV0ZSgpIHtcblx0Ly8gVE9ETyB1cmwgdmFsaWRhdGlvblxuXG5cdHJldHVybiB0aGlzO1xufSIsIid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vdXRpbC9jaGVjaycpXG5cdCwgTWF0Y2ggPSBjaGVjay5NYXRjaFxuXHQsIHRvQmVJbXBsZW1lbnRlZCA9IHJlcXVpcmUoJy4uL3V0aWwvZXJyb3InKS50b0JlSW1wbGVtZW50ZWQ7XG5cblxuLy8gYW4gYWJzdHJhY3QgYXR0cmlidXRlIGNsYXNzIGZvciBhdHRyaWJ1dGUgcGFyc2luZyBhbmQgdmFsaWRhdGlvblxuXG5tb2R1bGUuZXhwb3J0cyA9IEF0dHJpYnV0ZTtcblxuZnVuY3Rpb24gQXR0cmlidXRlKGVsLCBuYW1lKSB7XG5cdHRoaXMubmFtZSA9IG5hbWUgfHwgdGhpcy5hdHRyTmFtZSgpO1xuXHR0aGlzLmVsID0gZWw7XG5cdHRoaXMubm9kZSA9IGVsLmF0dHJpYnV0ZXNbdGhpcy5uYW1lXTtcbn1cblxuXy5leHRlbmRQcm90byhBdHRyaWJ1dGUsIHtcblx0Z2V0OiBnZXRBdHRyaWJ1dGVWYWx1ZSxcblx0c2V0OiBzZXRBdHRyaWJ1dGVWYWx1ZSxcblxuXHQvLyBzaG91bGQgYmUgZGVmaW5lZCBpbiBzdWJjbGFzc1xuXHRhdHRyTmFtZTogdG9CZUltcGxlbWVudGVkLFxuXHRwYXJzZTogdG9CZUltcGxlbWVudGVkLFxuXHR2YWxpZGF0ZTogdG9CZUltcGxlbWVudGVkLFxufSk7XG5cblxuZnVuY3Rpb24gZ2V0QXR0cmlidXRlVmFsdWUoKSB7XG5cdHJldHVybiB0aGlzLmVsLmdldEF0dHJpYnV0ZSh0aGlzLm5hbWUpO1xufVxuXG5mdW5jdGlvbiBzZXRBdHRyaWJ1dGVWYWx1ZSh2YWx1ZSkge1xuXHR0aGlzLmVsLnNldEF0dHJpYnV0ZSh0aGlzLm5hbWUsIHZhbHVlKTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIG1pbG9NYWlsID0gcmVxdWlyZSgnLi9tYWlsJylcblx0LCBtaWxvQ29tcG9uZW50c1JlZ2lzdHJ5ID0gcmVxdWlyZSgnLi9jb21wb25lbnRzL2NfcmVnaXN0cnknKVxuXHQsIENvbXBvbmVudCA9IG1pbG9Db21wb25lbnRzUmVnaXN0cnkuZ2V0KCdDb21wb25lbnQnKVxuXHQsIEJpbmRBdHRyaWJ1dGUgPSByZXF1aXJlKCcuL2F0dHJpYnV0ZS9hX2JpbmQnKVxuXHQsIEJpbmRlckVycm9yID0gcmVxdWlyZSgnLi91dGlsL2Vycm9yJykuQmluZGVyXG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpXG5cdCwgY2hlY2sgPSByZXF1aXJlKCcuL3V0aWwvY2hlY2snKVxuXHQsIE1hdGNoID0gIGNoZWNrLk1hdGNoO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gYmluZGVyO1xuXG5cbmZ1bmN0aW9uIGJpbmRlcihzY29wZUVsLCBjb21wb25lbnRzUmVnaXN0cnkpIHtcblx0dmFyIGNvbXBvbmVudHNSZWdpc3RyeSA9IGNvbXBvbmVudHNSZWdpc3RyeSB8fCBtaWxvQ29tcG9uZW50c1JlZ2lzdHJ5XG5cdFx0LCBzY29wZUVsID0gc2NvcGVFbCB8fCBkb2N1bWVudC5ib2R5XG5cdFx0LCBjb21wb25lbnRzID0ge307XG5cblx0YmluZEVsZW1lbnQoY29tcG9uZW50cywgc2NvcGVFbCk7XG5cdHJldHVybiBjb21wb25lbnRzO1xuXG5cblx0ZnVuY3Rpb24gYmluZEVsZW1lbnQoY29tcG9uZW50cywgZWwpe1xuXHRcdHZhciBhdHRyID0gbmV3IEJpbmRBdHRyaWJ1dGUoZWwpO1xuXG5cdFx0aWYgKGF0dHIubm9kZSlcblx0XHRcdHZhciBhQ29tcG9uZW50ID0gY3JlYXRlQ29tcG9uZW50KGVsLCBhdHRyKTtcblxuXHRcdC8vIGJpbmQgaW5uZXIgZWxlbWVudHMgdG8gY29tcG9uZW50c1xuXHRcdGlmIChlbC5jaGlsZHJlbiAmJiBlbC5jaGlsZHJlbi5sZW5ndGgpIHtcblx0XHRcdHZhciBpbm5lckNvbXBvbmVudHMgPSBiaW5kQ2hpbGRyZW4oZWwpO1xuXG5cdFx0XHRpZiAoT2JqZWN0LmtleXMoaW5uZXJDb21wb25lbnRzKS5sZW5ndGgpIHtcblx0XHRcdFx0Ly8gYXR0YWNoIGlubmVyIGNvbXBvbmVudHMgdG8gdGhlIGN1cnJlbnQgb25lIChjcmVhdGUgYSBuZXcgc2NvcGUpIC4uLlxuXHRcdFx0XHRpZiAodHlwZW9mIGFDb21wb25lbnQgIT0gJ3VuZGVmaW5lZCcgJiYgYUNvbXBvbmVudC5jb250YWluZXIpXG5cdFx0XHRcdFx0YUNvbXBvbmVudC5jb250YWluZXIuYWRkKGlubmVyQ29tcG9uZW50cyk7XG5cdFx0XHRcdGVsc2UgLy8gb3Iga2VlcCB0aGVtIGluIHRoZSBjdXJyZW50IHNjb3BlXG5cdFx0XHRcdFx0Xy5lYWNoS2V5KGlubmVyQ29tcG9uZW50cywgZnVuY3Rpb24oYUNvbXAsIG5hbWUpIHtcblx0XHRcdFx0XHRcdHN0b3JlQ29tcG9uZW50KGNvbXBvbmVudHMsIGFDb21wLCBuYW1lKTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAoYUNvbXBvbmVudClcblx0XHRcdHN0b3JlQ29tcG9uZW50KGNvbXBvbmVudHMsIGFDb21wb25lbnQsIGF0dHIuY29tcE5hbWUpO1xuXHR9XG5cblxuXHRmdW5jdGlvbiBiaW5kQ2hpbGRyZW4ob3duZXJFbCkge1xuXHRcdHZhciBjb21wb25lbnRzID0ge307XG5cdFx0QXJyYXkucHJvdG90eXBlLmZvckVhY2guY2FsbChvd25lckVsLmNoaWxkcmVuLCBmdW5jdGlvbihlbCkge1xuXHRcdFx0YmluZEVsZW1lbnQoY29tcG9uZW50cywgZWwpXG5cdFx0fSk7XG5cdFx0cmV0dXJuIGNvbXBvbmVudHM7XG5cdH1cblxuXG5cdGZ1bmN0aW9uIGNyZWF0ZUNvbXBvbmVudChlbCwgYXR0cikge1xuXHRcdC8vIGVsZW1lbnQgd2lsbCBiZSBib3VuZCB0byBhIGNvbXBvbmVudFxuXHRcdGF0dHIucGFyc2UoKS52YWxpZGF0ZSgpO1xuXG5cdFx0Ly8gZ2V0IGNvbXBvbmVudCBjbGFzcyBmcm9tIHJlZ2lzdHJ5IGFuZCB2YWxpZGF0ZVxuXHRcdHZhciBDb21wb25lbnRDbGFzcyA9IGNvbXBvbmVudHNSZWdpc3RyeS5nZXQoYXR0ci5jb21wQ2xhc3MpO1xuXG5cdFx0aWYgKCEgQ29tcG9uZW50Q2xhc3MpXG5cdFx0XHR0aHJvdyBuZXcgQmluZGVyRXJyb3IoJ2NsYXNzICcgKyBhdHRyLmNvbXBDbGFzcyArICcgaXMgbm90IHJlZ2lzdGVyZWQnKTtcblxuXHRcdGNoZWNrKENvbXBvbmVudENsYXNzLCBNYXRjaC5TdWJjbGFzcyhDb21wb25lbnQsIHRydWUpKTtcblxuXHRcdC8vIGNyZWF0ZSBuZXcgY29tcG9uZW50XG5cdFx0dmFyIGFDb21wb25lbnQgPSBuZXcgQ29tcG9uZW50Q2xhc3MoZWwsIGF0dHIuY29tcE5hbWUpO1xuXG5cdFx0Ly8gYWRkIGV4dHJhIGZhY2V0c1xuXHRcdHZhciBmYWNldHMgPSBhdHRyLmNvbXBGYWNldHM7XG5cdFx0aWYgKGZhY2V0cylcblx0XHRcdGZhY2V0cy5mb3JFYWNoKGZ1bmN0aW9uKGZjdCkge1xuXHRcdFx0XHRhQ29tcG9uZW50LmFkZEZhY2V0KGZjdCk7XG5cdFx0XHR9KTtcblxuXHRcdHJldHVybiBhQ29tcG9uZW50O1xuXHR9XG5cblxuXHRmdW5jdGlvbiBzdG9yZUNvbXBvbmVudChjb21wb25lbnRzLCBhQ29tcG9uZW50LCBuYW1lKSB7XG5cdFx0aWYgKGNvbXBvbmVudHNbbmFtZV0pXG5cdFx0XHR0aHJvdyBuZXcgQmluZGVyRXJyb3IoJ2R1cGxpY2F0ZSBjb21wb25lbnQgbmFtZTogJyArIG5hbWUpO1xuXG5cdFx0Y29tcG9uZW50c1tuYW1lXSA9IGFDb21wb25lbnQ7XG5cdH1cbn1cblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgY2xhc3NlcyA9IHtcblx0RmFjZXQ6IHJlcXVpcmUoJy4vZmFjZXRzL2ZfY2xhc3MnKSxcblx0Q29tcG9uZW50OiByZXF1aXJlKCcuL2NvbXBvbmVudHMvY19jbGFzcycpLFxuXHRDb21wb25lbnRGYWNldDogcmVxdWlyZSgnLi9jb21wb25lbnRzL2NfZmFjZXQnKSxcblx0Q2xhc3NSZWdpc3RyeTogcmVxdWlyZSgnLi9hYnN0cmFjdC9yZWdpc3RyeScpLFxuXHRmYWNldHNSZWdpc3RyeTogcmVxdWlyZSgnLi9jb21wb25lbnRzL2NfZmFjZXRzL2NmX3JlZ2lzdHJ5JyksXG5cdGNvbXBvbmVudHNSZWdpc3RyeTogcmVxdWlyZSgnLi9jb21wb25lbnRzL2NfcmVnaXN0cnknKVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzc2VzO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgRmFjZXRlZE9iamVjdCA9IHJlcXVpcmUoJy4uL2ZhY2V0cy9mX29iamVjdCcpXG5cdCwgZmFjZXRzUmVnaXN0cnkgPSByZXF1aXJlKCcuL2NfZmFjZXRzL2NmX3JlZ2lzdHJ5Jylcblx0LCBDb21wb25lbnRGYWNldCA9IHJlcXVpcmUoJy4vY19mYWNldCcpXG5cdCwgTWVzc2VuZ2VyID0gcmVxdWlyZSgnLi4vbWVzc2VuZ2VyJylcblx0LCBfID0gcmVxdWlyZSgnbW9sLXByb3RvJylcblx0LCBjaGVjayA9IHJlcXVpcmUoJy4uL3V0aWwvY2hlY2snKVxuXHQsIE1hdGNoID0gY2hlY2suTWF0Y2g7XG5cbnZhciBDb21wb25lbnQgPSBfLmNyZWF0ZVN1YmNsYXNzKEZhY2V0ZWRPYmplY3QsICdDb21wb25lbnQnLCB0cnVlKTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb25lbnQ7XG5cblxuQ29tcG9uZW50LmNyZWF0ZUNvbXBvbmVudENsYXNzID0gZnVuY3Rpb24obmFtZSwgZmFjZXRzQ29uZmlnKSB7XG5cdHZhciBmYWNldHNDbGFzc2VzID0ge307XG5cblx0aWYgKEFycmF5LmlzQXJyYXkoZmFjZXRzQ29uZmlnKSkge1xuXHRcdHZhciBjb25maWdNYXAgPSB7fTtcblx0XHRmYWNldHNDb25maWcuZm9yRWFjaChmdW5jdGlvbihmY3QpIHtcblx0XHRcdHZhciBmY3ROYW1lID0gXy5maXJzdExvd2VyQ2FzZShmY3QpO1xuXHRcdFx0Y29uZmlnTWFwW2ZjdE5hbWVdID0ge307XG5cdFx0fSk7XG5cdFx0ZmFjZXRzQ29uZmlnID0gY29uZmlnTWFwO1xuXHR9XG5cblx0Xy5lYWNoS2V5KGZhY2V0c0NvbmZpZywgZnVuY3Rpb24oZmN0Q29uZmlnLCBmY3QpIHtcblx0XHR2YXIgZmN0TmFtZSA9IF8uZmlyc3RMb3dlckNhc2UoZmN0KTtcblx0XHR2YXIgZmN0Q2xhc3NOYW1lID0gXy5maXJzdFVwcGVyQ2FzZShmY3QpO1xuXHRcdGZhY2V0c0NsYXNzZXNbZmN0TmFtZV0gPSBmYWNldHNSZWdpc3RyeS5nZXQoZmN0Q2xhc3NOYW1lKTtcblx0fSk7XG5cblx0dmFyIENvbXBvbmVudENsYXNzID0gRmFjZXRlZE9iamVjdC5jcmVhdGVGYWNldGVkQ2xhc3MuY2FsbCh0aGlzLCBuYW1lLCBmYWNldHNDbGFzc2VzLCBmYWNldHNDb25maWcpO1xuXHRcblx0cmV0dXJuIENvbXBvbmVudENsYXNzO1xufTtcblxuZGVsZXRlIENvbXBvbmVudC5jcmVhdGVGYWNldGVkQ2xhc3M7XG5cblxuXy5leHRlbmRQcm90byhDb21wb25lbnQsIHtcblx0aW5pdDogaW5pdENvbXBvbmVudCxcblx0YWRkRmFjZXQ6IGFkZEZhY2V0LFxuXHRhbGxGYWNldHM6IGVudm9rZU1ldGhvZE9uQWxsRmFjZXRzXG59KTtcblxuXG5mdW5jdGlvbiBpbml0Q29tcG9uZW50KGVsZW1lbnQsIG5hbWUpIHtcblx0dGhpcy5lbCA9IGVsZW1lbnQ7XG5cdHRoaXMubmFtZSA9IG5hbWU7XG5cblx0dmFyIG1lc3NlbmdlciA9IG5ldyBNZXNzZW5nZXIodGhpcywgTWVzc2VuZ2VyLmRlZmF1bHRNZXRob2RzLCB1bmRlZmluZWQgLyogbm8gbWVzc2FnZVNvdXJjZSAqLyk7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnRpZXModGhpcywge1xuXHRcdF9tZXNzZW5nZXI6IHsgdmFsdWU6IG1lc3NlbmdlciB9LFxuXHR9KTtcdFxuXG5cdC8vIHN0YXJ0IGFsbCBmYWNldHNcblx0dGhpcy5hbGxGYWNldHMoJ2NoZWNrJyk7XG5cdHRoaXMuYWxsRmFjZXRzKCdzdGFydCcpO1xufVxuXG5cbmZ1bmN0aW9uIGFkZEZhY2V0KGZhY2V0TmFtZU9yQ2xhc3MsIGZhY2V0T3B0cywgZmFjZXROYW1lKSB7XG5cdGNoZWNrKGZhY2V0TmFtZU9yQ2xhc3MsIE1hdGNoLk9uZU9mKFN0cmluZywgTWF0Y2guU3ViY2xhc3MoQ29tcG9uZW50RmFjZXQpKSk7XG5cdGNoZWNrKGZhY2V0T3B0cywgTWF0Y2guT3B0aW9uYWwoT2JqZWN0KSk7XG5cdGNoZWNrKGZhY2V0TmFtZSwgTWF0Y2guT3B0aW9uYWwoU3RyaW5nKSk7XG5cblx0aWYgKHR5cGVvZiBmYWNldE5hbWVPckNsYXNzID09ICdzdHJpbmcnKSB7XG5cdFx0dmFyIGZhY2V0Q2xhc3NOYW1lID0gXy5maXJzdFVwcGVyQ2FzZShmYWNldE5hbWVPckNsYXNzKTtcblx0XHR2YXIgRmFjZXRDbGFzcyA9IGZhY2V0c1JlZ2lzdHJ5LmdldChmYWNldENsYXNzTmFtZSk7XG5cdH0gZWxzZSBcblx0XHRGYWNldENsYXNzID0gZmFjZXROYW1lT3JDbGFzcztcblxuXHRmYWNldE5hbWUgPSBmYWNldE5hbWUgfHwgXy5maXJzdExvd2VyQ2FzZShGYWNldENsYXNzLm5hbWUpO1xuXG5cdHZhciBuZXdGYWNldCA9IEZhY2V0ZWRPYmplY3QucHJvdG90eXBlLmFkZEZhY2V0LmNhbGwodGhpcywgRmFjZXRDbGFzcywgZmFjZXRPcHRzLCBmYWNldE5hbWUpO1xuXG5cdC8vIHN0YXJ0IGZhY2V0XG5cdG5ld0ZhY2V0LmNoZWNrICYmIG5ld0ZhY2V0LmNoZWNrKCk7XG5cdG5ld0ZhY2V0LnN0YXJ0ICYmIG5ld0ZhY2V0LnN0YXJ0KCk7XG59XG5cblxuZnVuY3Rpb24gZW52b2tlTWV0aG9kT25BbGxGYWNldHMobWV0aG9kIC8qICwgLi4uICovKSB7XG5cdHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcblxuXHRfLmVhY2hLZXkodGhpcy5mYWNldHMsIGZ1bmN0aW9uKGZhY2V0LCBmY3ROYW1lKSB7XG5cdFx0aWYgKGZhY2V0ICYmIHR5cGVvZiBmYWNldFttZXRob2RdID09ICdmdW5jdGlvbicpXG5cdFx0XHRmYWNldFttZXRob2RdLmFwcGx5KGZhY2V0LCBhcmdzKTtcblx0fSk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBGYWNldCA9IHJlcXVpcmUoJy4uL2ZhY2V0cy9mX2NsYXNzJylcblx0LCBNZXNzZW5nZXIgPSByZXF1aXJlKCcuLi9tZXNzZW5nZXInKVxuXHQsIEZhY2V0RXJyb3IgPSByZXF1aXJlKCcuLi91dGlsL2Vycm9yJykuRmFjZXRcblx0LCBfID0gcmVxdWlyZSgnbW9sLXByb3RvJyk7XG5cbnZhciBDb21wb25lbnRGYWNldCA9IF8uY3JlYXRlU3ViY2xhc3MoRmFjZXQsICdDb21wb25lbnRGYWNldCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbXBvbmVudEZhY2V0O1xuXG5cbl8uZXh0ZW5kUHJvdG8oQ29tcG9uZW50RmFjZXQsIHtcblx0aW5pdDogaW5pdENvbXBvbmVudEZhY2V0LFxuXHRjaGVjazogY2hlY2tEZXBlbmRlbmNpZXNcbn0pO1xuXG5cbmZ1bmN0aW9uIGluaXRDb21wb25lbnRGYWNldCgpIHtcblx0Ly8gdmFyIG1lc3NlbmdlciA9IG5ldyBNZXNzZW5nZXIodGhpcywgTWVzc2VuZ2VyLmRlZmF1bHRNZXRob2RzLCB1bmRlZmluZWQgLyogbm8gbWVzc2FnZVNvdXJjZSAqLyk7XG5cblx0Ly8gT2JqZWN0LmRlZmluZVByb3BlcnRpZXModGhpcywge1xuXHQvLyBcdF9mYWNldE1lc3NlbmdlcjogeyB2YWx1ZTogbWVzc2VuZ2VyIH0sXG5cdC8vIH0pO1xufVxuXG5cbmZ1bmN0aW9uIGNoZWNrRGVwZW5kZW5jaWVzKCkge1xuXHRpZiAodGhpcy5yZXF1aXJlKSB7XG5cdFx0dGhpcy5yZXF1aXJlLmZvckVhY2goZnVuY3Rpb24ocmVxRmFjZXQpIHtcblx0XHRcdHZhciBmYWNldE5hbWUgPSBfLmZpcnN0TG93ZXJDYXNlKHJlcUZhY2V0KTtcblx0XHRcdGlmICghICh0aGlzLm93bmVyW2ZhY2V0TmFtZV0gaW5zdGFuY2VvZiBDb21wb25lbnRGYWNldCkpXG5cdFx0XHRcdHRocm93IG5ldyBGYWNldEVycm9yKCdmYWNldCAnICsgdGhpcy5jb25zdHJ1Y3Rvci5uYW1lICsgJyByZXF1aXJlcyBmYWNldCAnICsgcmVxRmFjZXQpO1xuXHRcdH0sIHRoaXMpO1xuXHR9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBDb21wb25lbnRGYWNldCA9IHJlcXVpcmUoJy4uL2NfZmFjZXQnKVxuXHQsIGJpbmRlciA9IHJlcXVpcmUoJy4uLy4uL2JpbmRlcicpXG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpXG5cdCwgZmFjZXRzUmVnaXN0cnkgPSByZXF1aXJlKCcuL2NmX3JlZ2lzdHJ5Jyk7XG5cbi8vIGNvbnRhaW5lciBmYWNldFxudmFyIENvbnRhaW5lciA9IF8uY3JlYXRlU3ViY2xhc3MoQ29tcG9uZW50RmFjZXQsICdDb250YWluZXInKTtcblxuXy5leHRlbmRQcm90byhDb250YWluZXIsIHtcblx0aW5pdDogaW5pdENvbnRhaW5lcixcblx0X2JpbmQ6IF9iaW5kQ29tcG9uZW50cyxcblx0YWRkOiBhZGRDaGlsZENvbXBvbmVudHNcbn0pO1xuXG5mYWNldHNSZWdpc3RyeS5hZGQoQ29udGFpbmVyKTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb250YWluZXI7XG5cblxuZnVuY3Rpb24gaW5pdENvbnRhaW5lcigpIHtcblx0Q29tcG9uZW50RmFjZXQucHJvdG90eXBlLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblx0dGhpcy5jaGlsZHJlbiA9IHt9O1xufVxuXG5cbmZ1bmN0aW9uIF9iaW5kQ29tcG9uZW50cygpIHtcblx0Ly8gVE9ET1xuXHQvLyB0aGlzIGZ1bmN0aW9uIHNob3VsZCByZS1iaW5kIHJhdGhlciB0aGFuIGJpbmQgYWxsIGludGVybmFsIGVsZW1lbnRzXG5cdHRoaXMuY2hpbGRyZW4gPSBiaW5kZXIodGhpcy5vd25lci5lbCk7XG59XG5cblxuZnVuY3Rpb24gYWRkQ2hpbGRDb21wb25lbnRzKGNoaWxkQ29tcG9uZW50cykge1xuXHQvLyBUT0RPXG5cdC8vIHRoaXMgZnVuY3Rpb24gc2hvdWxkIGludGVsbGlnZW50bHkgcmUtYmluZCBleGlzdGluZyBjb21wb25lbnRzIHRvXG5cdC8vIG5ldyBlbGVtZW50cyAoaWYgdGhleSBjaGFuZ2VkKSBhbmQgcmUtYmluZCBwcmV2aW91c2x5IGJvdW5kIGV2ZW50cyB0byB0aGUgc2FtZVxuXHQvLyBldmVudCBoYW5kbGVyc1xuXHQvLyBvciBtYXliZSBub3QsIGlmIHRoaXMgZnVuY3Rpb24gaXMgb25seSB1c2VkIGJ5IGJpbmRlciB0byBhZGQgbmV3IGVsZW1lbnRzLi4uXG5cdF8uZXh0ZW5kKHRoaXMuY2hpbGRyZW4sIGNoaWxkQ29tcG9uZW50cyk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBDb21wb25lbnRGYWNldCA9IHJlcXVpcmUoJy4uL2NfZmFjZXQnKVxuXHQsIGZhY2V0c1JlZ2lzdHJ5ID0gcmVxdWlyZSgnLi9jZl9yZWdpc3RyeScpXG5cblx0LCBNZXNzZW5nZXIgPSByZXF1aXJlKCcuLi8uLi9tZXNzZW5nZXInKVxuXHQsIENvbXBvbmVudERhdGFTb3VyY2UgPSByZXF1aXJlKCcuLi9jX21lc3NhZ2Vfc291cmNlcy9jb21wb25lbnRfZGF0YV9zb3VyY2UnKVxuXG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpO1xuXG5cbi8vIGRhdGEgbW9kZWwgY29ubmVjdGlvbiBmYWNldFxudmFyIERhdGEgPSBfLmNyZWF0ZVN1YmNsYXNzKENvbXBvbmVudEZhY2V0LCAnRGF0YScpO1xuXG5fLmV4dGVuZFByb3RvKERhdGEsIHtcblx0aW5pdDogaW5pdERhdGFGYWNldCxcblxuXHQvLyBfcmVhdHRhY2g6IF9yZWF0dGFjaEV2ZW50c09uRWxlbWVudENoYW5nZVxufSk7XG5cbmZhY2V0c1JlZ2lzdHJ5LmFkZChEYXRhKTtcblxubW9kdWxlLmV4cG9ydHMgPSBEYXRhO1xuXG5cbmZ1bmN0aW9uIGluaXREYXRhRmFjZXQoKSB7XG5cdENvbXBvbmVudEZhY2V0LnByb3RvdHlwZS5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cblx0dmFyIHByb3h5Q29tcERhdGFTb3VyY2VNZXRob2RzID0ge1xuXHRcdHZhbHVlOiAndmFsdWUnLFxuXHRcdHRyaWdnZXI6ICd0cmlnZ2VyJ1xuXHR9O1xuXG5cdC8vIGluc3RlYWQgb2YgdGhpcy5vd25lciBzaG91bGQgcGFzcyBtb2RlbD8gV2hlcmUgaXQgaXMgc2V0P1xuXHR2YXIgY29tcERhdGFTb3VyY2UgPSBuZXcgQ29tcG9uZW50RGF0YVNvdXJjZSh0aGlzLCBwcm94eUNvbXBEYXRhU291cmNlTWV0aG9kcywgdGhpcy5vd25lcik7XG5cblx0dmFyIHByb3h5TWVzc2VuZ2VyTWV0aG9kcyA9IHtcblx0XHRvbjogJ29uTWVzc2FnZScsXG5cdFx0b2ZmOiAnb2ZmTWVzc2FnZScsXG5cdFx0b25NZXNzYWdlczogJ29uTWVzc2FnZXMnLFxuXHRcdG9mZk1lc3NhZ2VzOiAnb2ZmTWVzc2FnZXMnLFxuXHRcdGdldFN1YnNjcmliZXJzOiAnZ2V0U3Vic2NyaWJlcnMnXG5cdH07XG5cblx0dmFyIGRhdGFNZXNzZW5nZXIgPSBuZXcgTWVzc2VuZ2VyKHRoaXMsIHByb3h5TWVzc2VuZ2VyTWV0aG9kcywgY29tcERhdGFTb3VyY2UpO1xuXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRoaXMsIHtcblx0XHRfZGF0YU1lc3NlbmdlcjogeyB2YWx1ZTogZGF0YU1lc3NlbmdlciB9LFxuXHRcdF9jb21wRGF0YVNvdXJjZTogeyB2YWx1ZTogY29tcERhdGFTb3VyY2UgfVxuXHR9KTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIENvbXBvbmVudEZhY2V0ID0gcmVxdWlyZSgnLi4vY19mYWNldCcpXG5cdCwgZmFjZXRzUmVnaXN0cnkgPSByZXF1aXJlKCcuL2NmX3JlZ2lzdHJ5JylcdFxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vLi4vdXRpbC9jaGVjaycpXG5cdCwgTWF0Y2ggPSBjaGVjay5NYXRjaFxuXHQsIGJpbmRlciA9IHJlcXVpcmUoJy4uLy4uL2JpbmRlcicpO1xuXG5cbi8vIGRhdGEgbW9kZWwgY29ubmVjdGlvbiBmYWNldFxudmFyIERvbSA9IF8uY3JlYXRlU3ViY2xhc3MoQ29tcG9uZW50RmFjZXQsICdEb20nKTtcblxuXy5leHRlbmRQcm90byhEb20sIHtcblx0aW5pdDogaW5pdERvbUZhY2V0LFxuXHRzdGFydDogc3RhcnREb21GYWNldCxcblxuXHRzaG93OiBzaG93RWxlbWVudCxcblx0aGlkZTogaGlkZUVsZW1lbnQsXG5cdHJlbW92ZTogcmVtb3ZlRWxlbWVudCxcblx0YXBwZW5kOiBhcHBlbmRJbnNpZGVFbGVtZW50LFxuXHRwcmVwZW5kOiBwcmVwZW5kSW5zaWRlRWxlbWVudCxcblxuXHQvLyBfcmVhdHRhY2g6IF9yZWF0dGFjaEV2ZW50c09uRWxlbWVudENoYW5nZVxufSk7XG5cbmZhY2V0c1JlZ2lzdHJ5LmFkZChEb20pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IERvbTtcblxuXG5mdW5jdGlvbiBpbml0RG9tRmFjZXQoKSB7XG5cdENvbXBvbmVudEZhY2V0LnByb3RvdHlwZS5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59XG5cbmZ1bmN0aW9uIHN0YXJ0RG9tRmFjZXQoKSB7XG5cdGlmICh0aGlzLmNvbmZpZy5jbHMpXG5cdFx0dGhpcy5vd25lci5lbC5jbGFzc0xpc3QuYWRkKHRoaXMuY29uZmlnLmNscyk7XG59XG5cbmZ1bmN0aW9uIHNob3dFbGVtZW50KCkge1xuXHR0aGlzLm93bmVyLmVsLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xufVxuXG5mdW5jdGlvbiBoaWRlRWxlbWVudCgpIHtcblx0dGhpcy5vd25lci5lbC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xufVxuXG5mdW5jdGlvbiByZW1vdmVFbGVtZW50KCkge1xuXHR2YXIgdGhpc0VsID0gdGhpcy5vd25lci5lbDtcblx0dGhpc0VsLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGhpc0VsKTtcbn1cblxuZnVuY3Rpb24gYXBwZW5kSW5zaWRlRWxlbWVudChlbCkge1xuXHR0aGlzLm93bmVyLmVsLmFwcGVuZENoaWxkKGVsKVxufVxuXG5mdW5jdGlvbiBwcmVwZW5kSW5zaWRlRWxlbWVudChlbCkge1xuXHR2YXIgdGhpc0VsID0gdGhpcy5vd25lci5lbFxuXHRcdCwgZmlyc3RDaGlsZCA9IHRoaXNFbC5maXJzdENoaWxkO1xuXHRpZiAoZmlyc3RDaGlsZClcblx0XHR0aGlzRWwuaW5zZXJ0QmVmb3JlKGVsLCBmaXJzdENoaWxkKTtcblx0ZWxzZVxuXHRcdHRoaXNFbC5hcHBlbmRDaGlsZChlbCk7XG59XG5cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIENvbXBvbmVudEZhY2V0ID0gcmVxdWlyZSgnLi4vY19mYWNldCcpXG5cdCwgZmFjZXRzUmVnaXN0cnkgPSByZXF1aXJlKCcuL2NmX3JlZ2lzdHJ5JylcblxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKTtcblxuXG4vLyBnZW5lcmljIGRyYWcgaGFuZGxlciwgc2hvdWxkIGJlIG92ZXJyaWRkZW5cbnZhciBEcmFnID0gXy5jcmVhdGVTdWJjbGFzcyhDb21wb25lbnRGYWNldCwgJ0RyYWcnKTtcblxuXy5leHRlbmRQcm90byhEcmFnLCB7XG5cdGluaXQ6IGluaXREcmFnRmFjZXQsXG5cdHN0YXJ0OiBzdGFydERyYWdGYWNldCxcblx0cmVxdWlyZTogWydFdmVudHMnXSwgLy8gVE9ETyBpbXBsZW1lbnQgZmFjZXQgZGVwZW5kZW5jaWVzXG5cblx0c2V0SGFuZGxlOiBzZXREcmFnSGFuZGxlXG5cdC8vIF9yZWF0dGFjaDogX3JlYXR0YWNoRXZlbnRzT25FbGVtZW50Q2hhbmdlXG59KTtcblxuZmFjZXRzUmVnaXN0cnkuYWRkKERyYWcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IERyYWc7XG5cblxuZnVuY3Rpb24gaW5pdERyYWdGYWNldCgpIHtcblx0Q29tcG9uZW50RmFjZXQucHJvdG90eXBlLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblx0dGhpcy5fb25kcmFnc3RhcnQgPSB0aGlzLmNvbmZpZy5vbmRyYWdzdGFydDtcblx0dGhpcy5fb25kcmFnID0gdGhpcy5jb25maWcub25kcmFnO1xuXHR0aGlzLl9vbmRyYWdlbmQgPSB0aGlzLmNvbmZpZy5vbmRyYWdzdGFydDtcbn1cblxuXG5mdW5jdGlvbiBzZXREcmFnSGFuZGxlKGhhbmRsZUVsKSB7XG5cdGlmICghIHRoaXMub3duZXIuZWwuY29udGFpbnMoaGFuZGxlRWwpKVxuXHRcdHJldHVybiBsb2dnZXIud2FybignZHJhZyBoYW5kbGUgc2hvdWxkIGJlIGluc2lkZSBlbGVtZW50IHRvIGJlIGRyYWdnZWQnKVxuXHR0aGlzLl9kcmFnSGFuZGxlID0gaGFuZGxlRWw7XG59XG5cblxuZnVuY3Rpb24gc3RhcnREcmFnRmFjZXQoKSB7XG5cdHRoaXMub3duZXIuZWwuc2V0QXR0cmlidXRlKCdkcmFnZ2FibGUnLCB0cnVlKTtcblxuXHR2YXIgZXZlbnRzRmFjZXQgPSB0aGlzLm93bmVyLmV2ZW50cztcblx0ZXZlbnRzRmFjZXQub25FdmVudHMoe1xuXHRcdCdtb3VzZWRvd24nOiBvbk1vdXNlRG93bixcblx0XHQnbW91c2VlbnRlciBtb3VzZWxlYXZlIG1vdXNlbW92ZSc6IG9uTW91c2VNb3ZlbWVudCwgXG5cdFx0J2RyYWdzdGFydCc6IG9uRHJhZ1N0YXJ0XG5cdH0pO1xuXG5cdGlmICh0aGlzLl9vbmRyYWcpIGV2ZW50c0ZhY2V0Lm9uKCdkcmFnJywgdGhpcy5fb25kcmFnKVxuXHRpZiAodGhpcy5fb25kcmFnZW5kKSBldmVudHNGYWNldC5vbignZHJhZ2VuZCcsIHRoaXMuX29uZHJhZ2VuZClcblxuXG5cdHZhciBzZWxmID0gdGhpcztcblxuXG5cdGZ1bmN0aW9uIG9uTW91c2VEb3duKGV2ZW50VHlwZSwgZXZlbnQpIHtcblx0XHRjb25zb2xlLmxvZygnbGlzdGVuZXIgb24gcGFyYWdyYXBoJywgdGhpcyk7XG5cdFx0c2VsZi5fdGFyZ2V0ID0gZXZlbnQudGFyZ2V0O1xuXHRcdGlmICh0YXJnZXRJbkRyYWdIYW5kbGUoZXZlbnQpKVxuXHRcdFx0d2luZG93LmdldFNlbGVjdGlvbigpLmVtcHR5KCk7XG5cdH1cblxuXG5cdGZ1bmN0aW9uIG9uTW91c2VNb3ZlbWVudChldmVudFR5cGUsIGV2ZW50KSB7XG5cdFx0dmFyIHNob3VsZEJlRHJhZ2dhYmxlID0gdGFyZ2V0SW5EcmFnSGFuZGxlKGV2ZW50KTtcblx0XHRzZWxmLm93bmVyLmVsLnNldEF0dHJpYnV0ZSgnZHJhZ2dhYmxlJywgc2hvdWxkQmVEcmFnZ2FibGUpO1xuXHR9XG5cblxuXHRmdW5jdGlvbiBvbkRyYWdTdGFydChldmVudFR5cGUsIGV2ZW50KSB7XG5cdFx0Y29uc29sZS5sb2coc2VsZi5fZHJhZ0hhbmRsZSk7XG5cdFx0Y29uc29sZS5sb2coc2VsZi5fdGFyZ2V0KTtcblxuXHRcdGlmICh0YXJnZXRJbkRyYWdIYW5kbGUoZXZlbnQpKSB7XG5cdFx0XHQvLyBldmVudC5kYXRhVHJhbnNmZXIuc2V0RGF0YSgndGV4dC9wbGFpbicsIHNlbGYub3duZXIuZWwuaW5uZXJIVE1MKTtcblx0XHRcdGV2ZW50LmRhdGFUcmFuc2Zlci5zZXREYXRhKCd0ZXh0L2h0bWwnLCBzZWxmLm93bmVyLmVsLm91dGVySFRNTCk7XG5cdFx0XHRldmVudC5kYXRhVHJhbnNmZXIuc2V0RGF0YSgneC1hcHBsaWNhdGlvbi9taWxvLWNvbXBvbmVudCcsIHNlbGYub3duZXIpO1xuXHRcdFx0c2VsZi5fb25kcmFnc3RhcnQgJiYgc2VsZi5fb25kcmFnc3RhcnQoZXZlbnRUeXBlLCBldmVudCk7XG5cblxuXHRcdFx0Y29uc29sZS5sb2coZXZlbnQuZGF0YVRyYW5zZmVyLmdldERhdGEoJ3RleHQvaHRtbCcpKTtcblx0XHRcdGNvbnNvbGUubG9nKGV2ZW50LmRhdGFUcmFuc2Zlci5nZXREYXRhKCd4LWFwcGxpY2F0aW9uL21pbG8tY29tcG9uZW50JykpO1xuXHRcdFx0Y29uc29sZS5sb2coZXZlbnQpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRjb25zb2xlLmxvZygncHJldmVudERlZmF1bHQnKTtcblx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0fVxuXHR9XG5cblxuXHRmdW5jdGlvbiB0YXJnZXRJbkRyYWdIYW5kbGUoZXZlbnQpIHtcblx0XHRyZXR1cm4gISBzZWxmLl9kcmFnSGFuZGxlIHx8IHNlbGYuX2RyYWdIYW5kbGUuY29udGFpbnMoc2VsZi5fdGFyZ2V0KTtcblx0fVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ29tcG9uZW50RmFjZXQgPSByZXF1aXJlKCcuLi9jX2ZhY2V0Jylcblx0LCBmYWNldHNSZWdpc3RyeSA9IHJlcXVpcmUoJy4vY2ZfcmVnaXN0cnknKVxuXG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpO1xuXG5cbi8vIGdlbmVyaWMgZHJhZyBoYW5kbGVyLCBzaG91bGQgYmUgb3ZlcnJpZGRlblxudmFyIERyb3AgPSBfLmNyZWF0ZVN1YmNsYXNzKENvbXBvbmVudEZhY2V0LCAnRHJvcCcpO1xuXG5fLmV4dGVuZFByb3RvKERyb3AsIHtcblx0aW5pdDogaW5pdERyb3BGYWNldCxcblx0c3RhcnQ6IHN0YXJ0RHJvcEZhY2V0LFxuXHRyZXF1aXJlOiBbJ0V2ZW50cyddIC8vIFRPRE8gaW1wbGVtZW50IGZhY2V0IGRlcGVuZGVuY2llc1xuXG5cdC8vIF9yZWF0dGFjaDogX3JlYXR0YWNoRXZlbnRzT25FbGVtZW50Q2hhbmdlXG59KTtcblxuZmFjZXRzUmVnaXN0cnkuYWRkKERyb3ApO1xuXG5tb2R1bGUuZXhwb3J0cyA9IERyb3A7XG5cblxuZnVuY3Rpb24gaW5pdERyb3BGYWNldCgpIHtcblx0Q29tcG9uZW50RmFjZXQucHJvdG90eXBlLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuXHR0aGlzLl9vbmRyYWdlbnRlciA9IHRoaXMuY29uZmlnLm9uZHJhZ2VudGVyO1xuXHR0aGlzLl9vbmRyYWdvdmVyID0gdGhpcy5jb25maWcub25kcmFnb3Zlcjtcblx0dGhpcy5fb25kcmFnbGVhdmUgPSB0aGlzLmNvbmZpZy5vbmRyYWdsZWF2ZTtcblx0dGhpcy5fb25kcm9wID0gdGhpcy5jb25maWcub25kcm9wO1xufVxuXG5cbmZ1bmN0aW9uIHN0YXJ0RHJvcEZhY2V0KCkge1xuXHR2YXIgZXZlbnRzRmFjZXQgPSB0aGlzLm93bmVyLmV2ZW50cztcblx0ZXZlbnRzRmFjZXQub24oJ2RyYWdlbnRlciBkcmFnb3ZlcicsIG9uRHJhZ2dpbmcpO1xuXHRldmVudHNGYWNldC5vbignZHJhZ2VudGVyIGRyYWdvdmVyIGRyYWdsZWF2ZSBkcm9wJywgY2FsbENvbmZpZ3VyZWRIYW5kbGVyKTtcblxuXHR2YXIgc2VsZiA9IHRoaXM7XG5cblxuXHRmdW5jdGlvbiBjYWxsQ29uZmlndXJlZEhhbmRsZXIoZXZlbnRUeXBlLCBldmVudCkge1xuXHRcdHZhciBoYW5kbGVyUHJvcGVydHkgPSAnX29uJyArIGV2ZW50VHlwZVxuXHRcdFx0LCBoYW5kbGVyID0gc2VsZltoYW5kbGVyUHJvcGVydHldO1xuXHRcdGlmIChoYW5kbGVyKVxuXHRcdFx0aGFuZGxlci5jYWxsKHNlbGYsIGV2ZW50VHlwZSwgZXZlbnQpO1xuXHR9XG5cblxuXHRmdW5jdGlvbiBvbkRyYWdnaW5nKGV2ZW50VHlwZSwgZXZlbnQpIHtcblx0XHR2YXIgZGF0YVR5cGVzID0gZXZlbnQuZGF0YVRyYW5zZmVyLnR5cGVzXG5cdFx0aWYgKGRhdGFUeXBlcy5pbmRleE9mKCd0ZXh0L2h0bWwnKSA+PSAwXG5cdFx0XHRcdHx8IGRhdGFUeXBlcy5pbmRleE9mKCd4LWFwcGxpY2F0aW9uL21pbG8tY29tcG9uZW50JykgPj0gMClcblx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdH1cbn0iLCIndXNlIHN0cmljdCc7XG5cbnZhciBDb21wb25lbnRGYWNldCA9IHJlcXVpcmUoJy4uL2NfZmFjZXQnKVxuXHQsIGZhY2V0c1JlZ2lzdHJ5ID0gcmVxdWlyZSgnLi9jZl9yZWdpc3RyeScpXG5cblx0LCBNZXNzZW5nZXIgPSByZXF1aXJlKCcuLi8uLi9tZXNzZW5nZXInKVxuXHQsIERPTUV2ZW50c1NvdXJjZSA9IHJlcXVpcmUoJy4uL2NfbWVzc2FnZV9zb3VyY2VzL2RvbV9ldmVudHNfc291cmNlJylcblxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKTtcblxuXG4vLyBldmVudHMgZmFjZXRcbnZhciBFdmVudHMgPSBfLmNyZWF0ZVN1YmNsYXNzKENvbXBvbmVudEZhY2V0LCAnRXZlbnRzJyk7XG5cbl8uZXh0ZW5kUHJvdG8oRXZlbnRzLCB7XG5cdGluaXQ6IGluaXRFdmVudHNGYWNldCxcblxuXHQvLyBfcmVhdHRhY2g6IF9yZWF0dGFjaEV2ZW50c09uRWxlbWVudENoYW5nZVxufSk7XG5cbmZhY2V0c1JlZ2lzdHJ5LmFkZChFdmVudHMpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50cztcblxuXG5mdW5jdGlvbiBpbml0RXZlbnRzRmFjZXQoKSB7XG5cdENvbXBvbmVudEZhY2V0LnByb3RvdHlwZS5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cblx0dmFyIGRvbUV2ZW50c1NvdXJjZSA9IG5ldyBET01FdmVudHNTb3VyY2UodGhpcywgeyB0cmlnZ2VyOiAndHJpZ2dlcicgfSwgdGhpcy5vd25lcik7XG5cblx0dmFyIHByb3h5TWVzc2VuZ2VyTWV0aG9kcyA9IHtcblx0XHRvbjogJ29uTWVzc2FnZScsXG5cdFx0b2ZmOiAnb2ZmTWVzc2FnZScsXG5cdFx0b25FdmVudHM6ICdvbk1lc3NhZ2VzJyxcblx0XHRvZmZFdmVudHM6ICdvZmZNZXNzYWdlcycsXG5cdFx0Z2V0TGlzdGVuZXJzOiAnZ2V0U3Vic2NyaWJlcnMnXG5cdH07XG5cblx0dmFyIG1lc3NlbmdlciA9IG5ldyBNZXNzZW5nZXIodGhpcywgcHJveHlNZXNzZW5nZXJNZXRob2RzLCBkb21FdmVudHNTb3VyY2UpO1xuXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRoaXMsIHtcblx0XHRfZXZlbnRzTWVzc2VuZ2VyOiB7IHZhbHVlOiBtZXNzZW5nZXIgfSxcblx0XHRfZG9tRXZlbnRzU291cmNlOiB7IHZhbHVlOiBkb21FdmVudHNTb3VyY2UgfVxuXHR9KTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIENvbXBvbmVudEZhY2V0ID0gcmVxdWlyZSgnLi4vY19mYWNldCcpXG5cdCwgZmFjZXRzUmVnaXN0cnkgPSByZXF1aXJlKCcuL2NmX3JlZ2lzdHJ5JylcblxuXHQsIE1lc3NlbmdlciA9IHJlcXVpcmUoJy4uLy4uL21lc3NlbmdlcicpXG5cdCwgaUZyYW1lTWVzc2FnZVNvdXJjZSA9IHJlcXVpcmUoJy4uL2NfbWVzc2FnZV9zb3VyY2VzL2lmcmFtZV9tZXNzYWdlX3NvdXJjZScpXG5cblx0LCBfID0gcmVxdWlyZSgnbW9sLXByb3RvJyk7XG5cblxuLy8gZGF0YSBtb2RlbCBjb25uZWN0aW9uIGZhY2V0XG52YXIgRnJhbWUgPSBfLmNyZWF0ZVN1YmNsYXNzKENvbXBvbmVudEZhY2V0LCAnRnJhbWUnKTtcblxuXy5leHRlbmRQcm90byhGcmFtZSwge1xuXHRpbml0OiBpbml0RnJhbWVGYWNldFxuXG5cdC8vIF9yZWF0dGFjaDogX3JlYXR0YWNoRXZlbnRzT25FbGVtZW50Q2hhbmdlXG59KTtcblxuXG5mYWNldHNSZWdpc3RyeS5hZGQoRnJhbWUpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEZyYW1lO1xuXG5cbmZ1bmN0aW9uIGluaXRGcmFtZUZhY2V0KCkge1xuXHRDb21wb25lbnRGYWNldC5wcm90b3R5cGUuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXHRcblx0dmFyIGlGcmFtZU1lc3NhZ2VTb3VyY2VQcm94eSA9IHtcblx0XHRwb3N0OiAncG9zdCdcblx0fTtcblx0dmFyIG1lc3NhZ2VTb3VyY2UgPSBuZXcgaUZyYW1lTWVzc2FnZVNvdXJjZSh0aGlzLCBpRnJhbWVNZXNzYWdlU291cmNlUHJveHkpO1xuXG5cdHZhciBwcm94eU1lc3Nlbmdlck1ldGhvZHMgPSB7XG5cdFx0b246ICdvbk1lc3NhZ2UnLFxuXHRcdG9mZjogJ29mZk1lc3NhZ2UnLFxuXHRcdG9uTWVzc2FnZXM6ICdvbk1lc3NhZ2VzJyxcblx0XHRvZmZNZXNzYWdlczogJ29mZk1lc3NhZ2VzJyxcblx0XHRnZXRTdWJzY3JpYmVyczogJ2dldFN1YnNjcmliZXJzJ1xuXHR9O1xuXG5cdHZhciBpRnJhbWVNZXNzZW5nZXIgPSBuZXcgTWVzc2VuZ2VyKHRoaXMsIHByb3h5TWVzc2VuZ2VyTWV0aG9kcywgbWVzc2FnZVNvdXJjZSk7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnRpZXModGhpcywge1xuXHRcdF9pRnJhbWVNZXNzZW5nZXI6IHsgdmFsdWU6IGlGcmFtZU1lc3NlbmdlciB9LFxuXHRcdF9tZXNzYWdlU291cmNlOiB7IHZhbHVlOiBtZXNzYWdlU291cmNlIH1cblx0fSk7XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ29tcG9uZW50RmFjZXQgPSByZXF1aXJlKCcuLi9jX2ZhY2V0Jylcblx0LCBmYWNldHNSZWdpc3RyeSA9IHJlcXVpcmUoJy4vY2ZfcmVnaXN0cnknKVx0XG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpXG5cdCwgY2hlY2sgPSByZXF1aXJlKCcuLi8uLi91dGlsL2NoZWNrJylcblx0LCBNYXRjaCA9IGNoZWNrLk1hdGNoXG5cdCwgYmluZGVyID0gcmVxdWlyZSgnLi4vLi4vYmluZGVyJyk7XG5cblxuLy8gZGF0YSBtb2RlbCBjb25uZWN0aW9uIGZhY2V0XG52YXIgVGVtcGxhdGUgPSBfLmNyZWF0ZVN1YmNsYXNzKENvbXBvbmVudEZhY2V0LCAnVGVtcGxhdGUnKTtcblxuXy5leHRlbmRQcm90byhUZW1wbGF0ZSwge1xuXHRpbml0OiBpbml0VGVtcGxhdGVGYWNldCxcblx0c2V0OiBzZXRUZW1wbGF0ZSxcblx0cmVuZGVyOiByZW5kZXJUZW1wbGF0ZSxcblx0YmluZGVyOiBiaW5kSW5uZXJDb21wb25lbnRzXG5cblx0Ly8gX3JlYXR0YWNoOiBfcmVhdHRhY2hFdmVudHNPbkVsZW1lbnRDaGFuZ2Vcbn0pO1xuXG5mYWNldHNSZWdpc3RyeS5hZGQoVGVtcGxhdGUpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFRlbXBsYXRlO1xuXG5cbmZ1bmN0aW9uIGluaXRUZW1wbGF0ZUZhY2V0KCkge1xuXHRDb21wb25lbnRGYWNldC5wcm90b3R5cGUuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG5cdHRoaXMuX3RlbXBsYXRlU3RyID0gdGhpcy5jb25maWcudGVtcGxhdGU7XG59XG5cblxuZnVuY3Rpb24gc2V0VGVtcGxhdGUodGVtcGxhdGVTdHIsIGNvbXBpbGUpIHtcblx0Y2hlY2sodGVtcGxhdGVTdHIsIFN0cmluZyk7XG5cdGNoZWNrKGNvbXBpbGUsIE1hdGNoLk9wdGlvbmFsKEZ1bmN0aW9uKSk7XG5cblx0dGhpcy5fdGVtcGxhdGVTdHIgPSB0ZW1wbGF0ZVN0cjtcblx0aWYgKGNvbXBpbGUpXG5cdFx0dGhpcy5fY29tcGlsZSA9IGNvbXBpbGVcblxuXHRjb21waWxlID0gY29tcGlsZSB8fCB0aGlzLl9jb21waWxlOyAvLyB8fCBtaWxvLmNvbmZpZy50ZW1wbGF0ZS5jb21waWxlO1xuXG5cdGlmIChjb21waWxlKVxuXHRcdHRoaXMuX3RlbXBsYXRlID0gY29tcGlsZSh0ZW1wbGF0ZVN0cik7XG5cblx0cmV0dXJuIHRoaXM7XG59XG5cblxuZnVuY3Rpb24gcmVuZGVyVGVtcGxhdGUoZGF0YSkgeyAvLyB3ZSBuZWVkIGRhdGEgb25seSBpZiB1c2UgdGVtcGxhdGluZyBlbmdpbmVcblx0dGhpcy5vd25lci5lbC5pbm5lckhUTUwgPSB0aGlzLl90ZW1wbGF0ZVxuXHRcdFx0XHRcdFx0XHRcdD8gdGhpcy5fdGVtcGxhdGUoZGF0YSlcblx0XHRcdFx0XHRcdFx0XHQ6IHRoaXMuX3RlbXBsYXRlU3RyO1xuXG5cdHJldHVybiB0aGlzO1xufVxuXG5cbmZ1bmN0aW9uIGJpbmRJbm5lckNvbXBvbmVudHMocmVnaXN0cnkpIHtcblx0dmFyIHRoaXNDb21wb25lbnQgPSBiaW5kZXIodGhpcy5vd25lci5lbCwgcmVnaXN0cnkpO1xuXG5cdGlmICh0aGlzLm93bmVyLmNvbnRhaW5lcikgLy8gVE9ETyBzaG91bGQgYmUgY2hhbmdlZCB0byByZWNvbmNpbGxhdGlvbiBvZiBleGlzdGluZyBjaGlsZHJlbiB3aXRoIG5ld1xuXHRcdHRoaXMub3duZXIuY29udGFpbmVyLmNoaWxkcmVuID0gdGhpc0NvbXBvbmVudFt0aGlzLm93bmVyLm5hbWVdLmNvbnRhaW5lci5jaGlsZHJlbjtcblxuXHRyZXR1cm4gdGhpc0NvbXBvbmVudDtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIENsYXNzUmVnaXN0cnkgPSByZXF1aXJlKCcuLi8uLi9hYnN0cmFjdC9yZWdpc3RyeScpXG5cdCwgQ29tcG9uZW50RmFjZXQgPSByZXF1aXJlKCcuLi9jX2ZhY2V0Jyk7XG5cbnZhciBmYWNldHNSZWdpc3RyeSA9IG5ldyBDbGFzc1JlZ2lzdHJ5KENvbXBvbmVudEZhY2V0KTtcblxuZmFjZXRzUmVnaXN0cnkuYWRkKENvbXBvbmVudEZhY2V0KTtcblxubW9kdWxlLmV4cG9ydHMgPSBmYWNldHNSZWdpc3RyeTtcblxuLy8gVE9ETyAtIHJlZmFjdG9yIGNvbXBvbmVudHMgcmVnaXN0cnkgdGVzdCBpbnRvIGEgZnVuY3Rpb25cbi8vIHRoYXQgdGVzdHMgYSByZWdpc3RyeSB3aXRoIGEgZ2l2ZW4gZm91bmRhdGlvbiBjbGFzc1xuLy8gTWFrZSB0ZXN0IGZvciB0aGlzIHJlZ2lzdHJ5IGJhc2VkIG9uIHRoaXMgZnVuY3Rpb24iLCIndXNlIHN0cmljdCc7XG5cbnZhciBET01FdmVudHNTb3VyY2UgPSByZXF1aXJlKCcuL2RvbV9ldmVudHNfc291cmNlJylcblx0LCBDb21wb25lbnQgPSByZXF1aXJlKCcuLi9jX2NsYXNzJylcblx0LCBDb21wb25lbnREYXRhU291cmNlRXJyb3IgPSByZXF1aXJlKCcuLi8uLi91dGlsL2Vycm9yJykuQ29tcG9uZW50RGF0YVNvdXJjZVxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vLi4vdXRpbC9jaGVjaycpXG5cdCwgTWF0Y2ggPSBjaGVjay5NYXRjaDtcblxuXG4vLyBjbGFzcyB0byBoYW5kbGUgc3Vic2NyaWJ0aW9ucyB0byBjaGFuZ2VzIGluIERPTSBmb3IgVUkgKG1heWJlIGFsc28gY29udGVudCBlZGl0YWJsZSkgZWxlbWVudHNcbnZhciBDb21wb25lbnREYXRhU291cmNlID0gXy5jcmVhdGVTdWJjbGFzcyhET01FdmVudHNTb3VyY2UsICdDb21wb25lbnREYXRhU291cmNlJywgdHJ1ZSk7XG5cblxuXy5leHRlbmRQcm90byhDb21wb25lbnREYXRhU291cmNlLCB7XG5cdC8vIGltcGxlbWVudGluZyBNZXNzYWdlU291cmNlIGludGVyZmFjZVxuXHRpbml0OiBpbml0Q29tcG9uZW50RGF0YVNvdXJjZSxcblx0dHJhbnNsYXRlVG9Tb3VyY2VNZXNzYWdlOiB0cmFuc2xhdGVUb0RvbUV2ZW50LFxuIFx0YWRkU291cmNlTGlzdGVuZXI6IGFkZERvbUV2ZW50TGlzdGVuZXIsXG4gXHRyZW1vdmVTb3VyY2VMaXN0ZW5lcjogcmVtb3ZlRG9tRXZlbnRMaXN0ZW5lcixcbiBcdGZpbHRlclNvdXJjZU1lc3NhZ2U6IGZpbHRlckRhdGFNZXNzYWdlLFxuXG4gXHQvLyBjbGFzcyBzcGVjaWZpYyBtZXRob2RzXG4gXHQvLyBkb206IGltcGxlbWVudGVkIGluIERPTUV2ZW50c1NvdXJjZVxuIFx0dmFsdWU6IGdldERvbUVsZW1lbnREYXRhVmFsdWUsXG4gXHRoYW5kbGVFdmVudDogaGFuZGxlRXZlbnQsICAvLyBldmVudCBkaXNwYXRjaGVyIC0gYXMgZGVmaW5lZCBieSBFdmVudCBET00gQVBJXG4gXHR0cmlnZ2VyOiB0cmlnZ2VyRGF0YU1lc3NhZ2UgLy8gcmVkZWZpbmVzIG1ldGhvZCBvZiBzdXBlcmNsYXNzIERPTUV2ZW50c1NvdXJjZVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ29tcG9uZW50RGF0YVNvdXJjZTtcblxuXG5mdW5jdGlvbiBpbml0Q29tcG9uZW50RGF0YVNvdXJjZSgpIHtcblx0RE9NRXZlbnRzU291cmNlLnByb3RvdHlwZS5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cblx0dGhpcy52YWx1ZSgpOyAvLyBzdG9yZXMgY3VycmVudCBjb21wb25lbnQgZGF0YSB2YWx1ZSBpbiB0aGlzLl92YWx1ZVxufVxuXG5cbi8vIFRPRE86IHNob3VsZCByZXR1cm4gdmFsdWUgZGVwZW5kZW50IG9uIGVsZW1lbnQgdGFnXG5mdW5jdGlvbiBnZXREb21FbGVtZW50RGF0YVZhbHVlKCkgeyAvLyB2YWx1ZSBtZXRob2Rcblx0dmFyIG5ld1ZhbHVlID0gdGhpcy5jb21wb25lbnQuZWwudmFsdWU7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdfdmFsdWUnLCB7XG5cdFx0Y29uZmlndXJhYmxlOiB0cnVlLFxuXHRcdHZhbHVlOiBuZXdWYWx1ZVxuXHR9KTtcblxuXHRyZXR1cm4gbmV3VmFsdWU7XG59XG5cblxuLy8gVE9ETzogdGhpcyBmdW5jdGlvbiBzaG91bGQgcmV0dXJuIHJlbGV2YW50IERPTSBldmVudCBkZXBlbmRlbnQgb24gZWxlbWVudCB0YWdcbi8vIENhbiBhbHNvIGltcGxlbWVudCBiZWZvcmVkYXRhY2hhbmdlZCBldmVudCB0byBhbGxvdyBwcmV2ZW50aW5nIHRoZSBjaGFuZ2VcbmZ1bmN0aW9uIHRyYW5zbGF0ZVRvRG9tRXZlbnQobWVzc2FnZSkge1xuXHRpZiAobWVzc2FnZSA9PSAnZGF0YWNoYW5nZWQnKVxuXHRcdHJldHVybiAnaW5wdXQnO1xuXHRlbHNlXG5cdFx0dGhyb3cgbmV3IENvbXBvbmVudERhdGFTb3VyY2VFcnJvcigndW5rbm93biBjb21wb25lbnQgZGF0YSBldmVudCcpO1xufVxuXG5cbmZ1bmN0aW9uIGFkZERvbUV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlKSB7XG5cdHRoaXMuZG9tKCkuYWRkRXZlbnRMaXN0ZW5lcihldmVudFR5cGUsIHRoaXMsIGZhbHNlKTsgLy8gbm8gY2FwdHVyaW5nXG59XG5cblxuZnVuY3Rpb24gcmVtb3ZlRG9tRXZlbnRMaXN0ZW5lcihldmVudFR5cGUpIHtcblx0dGhpcy5kb20oKS5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50VHlwZSwgdGhpcywgZmFsc2UpOyAvLyBubyBjYXB0dXJpbmdcbn1cblxuXG5mdW5jdGlvbiBmaWx0ZXJEYXRhTWVzc2FnZShldmVudFR5cGUsIG1lc3NhZ2UsIGRhdGEpIHtcblx0cmV0dXJuIGRhdGEubmV3VmFsdWUgIT0gZGF0YS5vbGRWYWx1ZTtcbn07XG5cblxuIC8vIGV2ZW50IGRpc3BhdGNoZXIgLSBhcyBkZWZpbmVkIGJ5IEV2ZW50IERPTSBBUElcbmZ1bmN0aW9uIGhhbmRsZUV2ZW50KGV2ZW50KSB7XG5cdHZhciBvbGRWYWx1ZSA9IHRoaXMuX3ZhbHVlO1xuXG5cdHRoaXMuZGlzcGF0Y2hNZXNzYWdlKGV2ZW50LnR5cGUsIHtcblx0XHRvbGRWYWx1ZTogb2xkVmFsdWUsXG5cdFx0bmV3VmFsdWU6IHRoaXMudmFsdWUoKVxuXHR9KTtcbn1cblxuXG5mdW5jdGlvbiB0cmlnZ2VyRGF0YU1lc3NhZ2UobWVzc2FnZSwgZGF0YSkge1xuXHQvLyBUT0RPIC0gb3Bwb3NpdGUgdHJhbnNsYXRpb24gKyBldmVudCB0cmlnZ2VyIFxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpO1xuXG5cbi8vIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL1JlZmVyZW5jZS9FdmVudHNcblxudmFyIGV2ZW50VHlwZXMgPSB7XG5cdENsaXBib2FyZEV2ZW50OiBbJ2NvcHknLCAnY3V0JywgJ3Bhc3RlJywgJ2JlZm9yZWNvcHknLCAnYmVmb3JlY3V0JywgJ2JlZm9yZXBhc3RlJ10sXG5cdEV2ZW50OiBbJ2lucHV0JywgJ3JlYWR5c3RhdGVjaGFuZ2UnXSxcblx0Rm9jdXNFdmVudDogWydmb2N1cycsICdibHVyJywgJ2ZvY3VzaW4nLCAnZm9jdXNvdXQnXSxcblx0S2V5Ym9hcmRFdmVudDogWydrZXlkb3duJywgJ2tleXByZXNzJywgICdrZXl1cCddLFxuXHRNb3VzZUV2ZW50OiBbJ2NsaWNrJywgJ2NvbnRleHRtZW51JywgJ2RibGNsaWNrJywgJ21vdXNlZG93bicsICdtb3VzZXVwJyxcblx0XHRcdFx0ICdtb3VzZWVudGVyJywgJ21vdXNlbGVhdmUnLCAnbW91c2Vtb3ZlJywgJ21vdXNlb3V0JywgJ21vdXNlb3ZlcicsXG5cdFx0XHRcdCAnc2hvdycgLyogY29udGV4dCBtZW51ICovXSxcblx0VG91Y2hFdmVudDogWyd0b3VjaHN0YXJ0JywgJ3RvdWNoZW5kJywgJ3RvdWNobW92ZScsICd0b3VjaGVudGVyJywgJ3RvdWNobGVhdmUnLCAndG91Y2hjYW5jZWwnXSxcbn07XG5cblxuLy8gbW9jayB3aW5kb3cgYW5kIGV2ZW50IGNvbnN0cnVjdG9ycyBmb3IgdGVzdGluZ1xuaWYgKHR5cGVvZiB3aW5kb3cgIT0gJ3VuZGVmaW5lZCcpXG5cdHZhciBnbG9iYWwgPSB3aW5kb3c7XG5lbHNlIHtcblx0Z2xvYmFsID0ge307XG5cdF8uZWFjaEtleShldmVudFR5cGVzLCBmdW5jdGlvbihlVHlwZXMsIGV2ZW50Q29uc3RydWN0b3JOYW1lKSB7XG5cdFx0dmFyIGV2ZW50c0NvbnN0cnVjdG9yO1xuXHRcdGV2YWwoXG5cdFx0XHQnZXZlbnRzQ29uc3RydWN0b3IgPSBmdW5jdGlvbiAnICsgZXZlbnRDb25zdHJ1Y3Rvck5hbWUgKyAnKHR5cGUsIHByb3BlcnRpZXMpIHsgXFxcblx0XHRcdFx0dGhpcy50eXBlID0gdHlwZTsgXFxcblx0XHRcdFx0Xy5leHRlbmQodGhpcywgcHJvcGVydGllcyk7IFxcXG5cdFx0XHR9Oydcblx0XHQpO1xuXHRcdGdsb2JhbFtldmVudENvbnN0cnVjdG9yTmFtZV0gPSBldmVudHNDb25zdHJ1Y3Rvcjtcblx0fSk7XG59XG5cblxudmFyIGRvbUV2ZW50c0NvbnN0cnVjdG9ycyA9IHt9O1xuXG5fLmVhY2hLZXkoZXZlbnRUeXBlcywgZnVuY3Rpb24oZVR5cGVzLCBldmVudENvbnN0cnVjdG9yTmFtZSkge1xuXHRlVHlwZXMuZm9yRWFjaChmdW5jdGlvbih0eXBlKSB7XG5cdFx0aWYgKE9iamVjdC5oYXNPd25Qcm9wZXJ0eShkb21FdmVudHNDb25zdHJ1Y3RvcnMsIHR5cGUpKVxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdkdXBsaWNhdGUgZXZlbnQgdHlwZSAnICsgdHlwZSk7XG5cblx0XHRkb21FdmVudHNDb25zdHJ1Y3RvcnNbdHlwZV0gPSBnbG9iYWxbZXZlbnRDb25zdHJ1Y3Rvck5hbWVdO1xuXHR9KTtcbn0pO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gZG9tRXZlbnRzQ29uc3RydWN0b3JzO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgTWVzc2FnZVNvdXJjZSA9IHJlcXVpcmUoJy4uLy4uL21lc3Nlbmdlci9tZXNzYWdlX3NvdXJjZScpXG5cdCwgQ29tcG9uZW50ID0gcmVxdWlyZSgnLi4vY19jbGFzcycpXG5cdCwgZG9tRXZlbnRzQ29uc3RydWN0b3JzID0gcmVxdWlyZSgnLi9kb21fZXZlbnRzX2NvbnN0cnVjdG9ycycpIC8vIFRPRE8gbWVyZ2Ugd2l0aCBET01FdmVudFNvdXJjZSA/P1xuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vLi4vdXRpbC9jaGVjaycpXG5cdCwgTWF0Y2ggPSBjaGVjay5NYXRjaDtcblxudmFyIERPTUV2ZW50c1NvdXJjZSA9IF8uY3JlYXRlU3ViY2xhc3MoTWVzc2FnZVNvdXJjZSwgJ0RPTU1lc3NhZ2VTb3VyY2UnLCB0cnVlKTtcblxuXG5fLmV4dGVuZFByb3RvKERPTUV2ZW50c1NvdXJjZSwge1xuXHQvLyBpbXBsZW1lbnRpbmcgTWVzc2FnZVNvdXJjZSBpbnRlcmZhY2Vcblx0aW5pdDogaW5pdERvbUV2ZW50c1NvdXJjZSxcblx0dHJhbnNsYXRlVG9Tb3VyY2VNZXNzYWdlOiB0cmFuc2xhdGVUb0RvbUV2ZW50LFxuIFx0YWRkU291cmNlTGlzdGVuZXI6IGFkZERvbUV2ZW50TGlzdGVuZXIsXG4gXHRyZW1vdmVTb3VyY2VMaXN0ZW5lcjogcmVtb3ZlRG9tRXZlbnRMaXN0ZW5lcixcbiBcdGZpbHRlclNvdXJjZU1lc3NhZ2U6IGZpbHRlckNhcHR1cmVkRG9tRXZlbnQsXG5cbiBcdC8vIGNsYXNzIHNwZWNpZmljIG1ldGhvZHNcbiBcdGRvbTogZ2V0RG9tRWxlbWVudCxcbiBcdGhhbmRsZUV2ZW50OiBoYW5kbGVFdmVudCwgIC8vIGV2ZW50IGRpc3BhdGNoZXIgLSBhcyBkZWZpbmVkIGJ5IEV2ZW50IERPTSBBUElcbiBcdHRyaWdnZXI6IHRyaWdnZXJEb21FdmVudFxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gRE9NRXZlbnRzU291cmNlO1xuXG5cbnZhciB1c2VDYXB0dXJlUGF0dGVybiA9IC9fX2NhcHR1cmUkLztcblxuXG5mdW5jdGlvbiBpbml0RG9tRXZlbnRzU291cmNlKGhvc3RPYmplY3QsIHByb3h5TWV0aG9kcywgY29tcG9uZW50KSB7XG5cdGNoZWNrKGNvbXBvbmVudCwgQ29tcG9uZW50KTtcblx0TWVzc2FnZVNvdXJjZS5wcm90b3R5cGUuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG5cdHRoaXMuY29tcG9uZW50ID0gY29tcG9uZW50O1xuXG5cdC8vIHRoaXMubWVzc2VuZ2VyIGlzIHNldCBieSBNZXNzZW5nZXIgY2xhc3Ncbn1cblxuXG5mdW5jdGlvbiBnZXREb21FbGVtZW50KCkge1xuXHRyZXR1cm4gdGhpcy5jb21wb25lbnQuZWw7XG59XG5cblxuZnVuY3Rpb24gdHJhbnNsYXRlVG9Eb21FdmVudChtZXNzYWdlKSB7XG5cdGlmICh1c2VDYXB0dXJlUGF0dGVybi50ZXN0KG1lc3NhZ2UpKVxuXHRcdG1lc3NhZ2UgPSBtZXNzYWdlLnJlcGxhY2UodXNlQ2FwdHVyZVBhdHRlcm4sICcnKTtcblx0cmV0dXJuIG1lc3NhZ2U7XG59XG5cblxuZnVuY3Rpb24gYWRkRG9tRXZlbnRMaXN0ZW5lcihldmVudFR5cGUpIHtcblx0dGhpcy5kb20oKS5hZGRFdmVudExpc3RlbmVyKGV2ZW50VHlwZSwgdGhpcywgZmFsc2UpO1xufVxuXG5cbmZ1bmN0aW9uIHJlbW92ZURvbUV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlKSB7XG5cdHRoaXMuZG9tKCkucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudFR5cGUsIHRoaXMsIGZhbHNlKTtcbn1cblxuXG5mdW5jdGlvbiBmaWx0ZXJDYXB0dXJlZERvbUV2ZW50KGV2ZW50VHlwZSwgbWVzc2FnZSwgZXZlbnQpIHtcblx0dmFyIGlzQ2FwdHVyZVBoYXNlO1xuXHRpZiAodHlwZW9mIHdpbmRvdyAhPSAndW5kZWZpbmVkJylcblx0XHRpc0NhcHR1cmVQaGFzZSA9IGV2ZW50LmV2ZW50UGhhc2UgPT0gd2luZG93LkV2ZW50LkNBUFRVUklOR19QSEFTRTtcblxuXHRyZXR1cm4gKCEgaXNDYXB0dXJlUGhhc2UgfHwgKGlzQ2FwdHVyZVBoYXNlICYmIHVzZUNhcHR1cmVQYXR0ZXJuLnRlc3QobWVzc2FnZSkpKTtcbn1cblxuXG4vLyBldmVudCBkaXNwYXRjaGVyIC0gYXMgZGVmaW5lZCBieSBFdmVudCBET00gQVBJXG5mdW5jdGlvbiBoYW5kbGVFdmVudChldmVudCkge1xuXHR0aGlzLmRpc3BhdGNoTWVzc2FnZShldmVudC50eXBlLCBldmVudCk7XG59XG5cblxuLy8gVE9ETyBtYWtlIHdvcmsgd2l0aCBtZXNzYWdlcyAod2l0aCBfY2FwdHVyZSlcbmZ1bmN0aW9uIHRyaWdnZXJEb21FdmVudChldmVudFR5cGUsIHByb3BlcnRpZXMpIHtcblx0Y2hlY2soZXZlbnRUeXBlLCBTdHJpbmcpO1xuXHRjaGVjayhwcm9wZXJ0aWVzLCBNYXRjaC5PcHRpb25hbChPYmplY3QpKTtcblxuXHR2YXIgRXZlbnRDb25zdHJ1Y3RvciA9IGRvbUV2ZW50c0NvbnN0cnVjdG9yc1tldmVudFR5cGVdO1xuXG5cdGlmICh0eXBlb2YgZXZlbnRDb25zdHJ1Y3RvciAhPSAnZnVuY3Rpb24nKVxuXHRcdHRocm93IG5ldyBFcnJvcigndW5zdXBwb3J0ZWQgZXZlbnQgdHlwZScpO1xuXG5cdC8vIGNoZWNrIGlmIGl0IGlzIGNvcnJlY3Rcblx0aWYgKHR5cGVvZiBwcm9wZXJ0aWVzICE9ICd1bmRlZmluZWQnKVxuXHRcdHByb3BlcnRpZXMudHlwZSA9IGV2ZW50VHlwZTtcblxuXHR2YXIgZG9tRXZlbnQgPSBFdmVudENvbnN0cnVjdG9yKGV2ZW50VHlwZSwgcHJvcGVydGllcyk7XG5cblx0dmFyIG5vdENhbmNlbGxlZCA9IHRoaXMuZG9tKCkuZGlzcGF0Y2hFdmVudChkb21FdmVudCk7XG5cblx0cmV0dXJuIG5vdENhbmNlbGxlZDtcbn0iLCIndXNlIHN0cmljdCc7XG5cbnZhciBNZXNzYWdlU291cmNlID0gcmVxdWlyZSgnLi4vLi4vbWVzc2VuZ2VyL21lc3NhZ2Vfc291cmNlJylcblx0LCBfID0gcmVxdWlyZSgnbW9sLXByb3RvJylcblx0LCBjaGVjayA9IHJlcXVpcmUoJy4uLy4uL3V0aWwvY2hlY2snKVxuXHQsIE1hdGNoID0gY2hlY2suTWF0Y2g7XG5cbnZhciBpRnJhbWVNZXNzYWdlU291cmNlID0gXy5jcmVhdGVTdWJjbGFzcyhNZXNzYWdlU291cmNlLCAnaUZyYW1lTWVzc2FnZVNvdXJjZScsIHRydWUpO1xuXG5cbl8uZXh0ZW5kUHJvdG8oaUZyYW1lTWVzc2FnZVNvdXJjZSwge1xuXHQvLyBpbXBsZW1lbnRpbmcgTWVzc2FnZVNvdXJjZSBpbnRlcmZhY2Vcblx0aW5pdDogaW5pdElGcmFtZU1lc3NhZ2VTb3VyY2UsXG5cdHRyYW5zbGF0ZVRvU291cmNlTWVzc2FnZTogdHJhbnNsYXRlVG9JRnJhbWVNZXNzYWdlLFxuIFx0YWRkU291cmNlTGlzdGVuZXI6IGFkZElGcmFtZU1lc3NhZ2VMaXN0ZW5lcixcbiBcdHJlbW92ZVNvdXJjZUxpc3RlbmVyOiByZW1vdmVJRnJhbWVNZXNzYWdlTGlzdGVuZXIsXG4gXHRmaWx0ZXJTb3VyY2VNZXNzYWdlOiBmaWx0ZXJSZWNpZXZlZElGcmFtZU1lc3NhZ2UsXG5cbiBcdC8vY2xhc3Mgc3BlY2lmaWMgbWV0aG9kc1xuIFx0cG9zdDogcG9zdFRvT3RoZXJXaW5kb3csXG4gXHRoYW5kbGVFdmVudDogaGFuZGxlRXZlbnQgIC8vIGV2ZW50IGRpc3BhdGNoZXIgLSBhcyBkZWZpbmVkIGJ5IEV2ZW50IERPTSBBUElcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGlGcmFtZU1lc3NhZ2VTb3VyY2U7XG5cblxuZnVuY3Rpb24gaW5pdElGcmFtZU1lc3NhZ2VTb3VyY2UoaG9zdE9iamVjdCwgcHJveHlNZXRob2RzKSB7XG5cdGNoZWNrKGhvc3RPYmplY3QsIE9iamVjdCk7XG5cdE1lc3NhZ2VTb3VyY2UucHJvdG90eXBlLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuXHRpZiAoaG9zdE9iamVjdC5vd25lci5lbC5ub2RlTmFtZSA9PSAnSUZSQU1FJylcblx0XHR0aGlzLl9wb3N0VG8gPSBob3N0T2JqZWN0Lm93bmVyLmVsLmNvbnRlbnRXaW5kb3c7XG5cdGVsc2Vcblx0XHR0aGlzLl9wb3N0VG8gPSB3aW5kb3cucGFyZW50O1xuXG5cdHRoaXMuX2xpc3RlblRvID0gd2luZG93O1xufVxuXG5cbmZ1bmN0aW9uIHRyYW5zbGF0ZVRvSUZyYW1lTWVzc2FnZShtZXNzYWdlKSB7XG5cdHJldHVybiAnbWVzc2FnZSc7IC8vIHNvdXJjZU1lc3NhZ2Vcbn1cblxuXG5mdW5jdGlvbiBhZGRJRnJhbWVNZXNzYWdlTGlzdGVuZXIoZXZlbnRUeXBlKSB7XG5cdHRoaXMuX2xpc3RlblRvLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlLCB0aGlzLCBmYWxzZSk7XG59XG5cblxuZnVuY3Rpb24gcmVtb3ZlSUZyYW1lTWVzc2FnZUxpc3RlbmVyKGV2ZW50VHlwZSkge1xuXHR0aGlzLl9saXN0ZW5Uby5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50VHlwZSwgdGhpcywgZmFsc2UpO1xufVxuXG5cbmZ1bmN0aW9uIGZpbHRlclJlY2lldmVkSUZyYW1lTWVzc2FnZShldmVudFR5cGUsIG1lc3NhZ2UsIGV2ZW50KSB7XG5cdHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBwb3N0VG9PdGhlcldpbmRvdyhldmVudFR5cGUsIG1lc3NhZ2UpIHtcblx0bWVzc2FnZS50eXBlID0gZXZlbnRUeXBlO1xuXHR0aGlzLl9wb3N0VG8ucG9zdE1lc3NhZ2UobWVzc2FnZSwgJyonKTtcbn1cblxuZnVuY3Rpb24gaGFuZGxlRXZlbnQoZXZlbnQpIHtcblx0dGhpcy5kaXNwYXRjaE1lc3NhZ2UoZXZlbnQudHlwZSwgZXZlbnQpO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ2xhc3NSZWdpc3RyeSA9IHJlcXVpcmUoJy4uL2Fic3RyYWN0L3JlZ2lzdHJ5Jylcblx0LCBDb21wb25lbnQgPSByZXF1aXJlKCcuL2NfY2xhc3MnKTtcblxudmFyIGNvbXBvbmVudHNSZWdpc3RyeSA9IG5ldyBDbGFzc1JlZ2lzdHJ5KENvbXBvbmVudCk7XG5cbmNvbXBvbmVudHNSZWdpc3RyeS5hZGQoQ29tcG9uZW50KTtcblxubW9kdWxlLmV4cG9ydHMgPSBjb21wb25lbnRzUmVnaXN0cnk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBDb21wb25lbnQgPSByZXF1aXJlKCcuLi9jX2NsYXNzJylcblx0LCBjb21wb25lbnRzUmVnaXN0cnkgPSByZXF1aXJlKCcuLi9jX3JlZ2lzdHJ5Jyk7XG5cblxudmFyIFZpZXcgPSBDb21wb25lbnQuY3JlYXRlQ29tcG9uZW50Q2xhc3MoJ1ZpZXcnLCBbJ2NvbnRhaW5lciddKTtcblxuY29tcG9uZW50c1JlZ2lzdHJ5LmFkZChWaWV3KTtcblxubW9kdWxlLmV4cG9ydHMgPSBWaWV3O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gY29uZmlnO1xuXG5mdW5jdGlvbiBjb25maWcob3B0aW9ucykge1xuXHRfLmRlZXBFeHRlbmQoY29uZmlnLCBvcHRpb25zKTtcbn1cblxuY29uZmlnKHtcblx0YXR0cnM6IHtcblx0XHRiaW5kOiAnbWwtYmluZCcsXG5cdFx0bG9hZDogJ21sLWxvYWQnXG5cdH1cbn0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEZhY2V0O1xuXG5mdW5jdGlvbiBGYWNldChvd25lciwgY29uZmlnKSB7XG5cdHRoaXMub3duZXIgPSBvd25lcjtcblx0dGhpcy5jb25maWcgPSBjb25maWcgfHwge307XG5cdHRoaXMuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufVxuXG5fLmV4dGVuZFByb3RvKEZhY2V0LCB7XG5cdGluaXQ6IGZ1bmN0aW9uKCkge31cbn0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgRmFjZXQgPSByZXF1aXJlKCcuL2ZfY2xhc3MnKVxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vdXRpbC9jaGVjaycpXG5cdCwgTWF0Y2ggPSBjaGVjay5NYXRjaDtcblxubW9kdWxlLmV4cG9ydHMgPSBGYWNldGVkT2JqZWN0O1xuXG4vLyBhYnN0cmFjdCBjbGFzcyBmb3IgZmFjZXRlZCBvYmplY3RcbmZ1bmN0aW9uIEZhY2V0ZWRPYmplY3QoKSB7XG5cdC8vIFRPRE8gaW5zdGFudGlhdGUgZmFjZXRzIGlmIGNvbmZpZ3VyYXRpb24gaXNuJ3QgcGFzc2VkXG5cdC8vIHdyaXRlIGEgdGVzdCB0byBjaGVjayBpdFxuXHR2YXIgZmFjZXRzQ29uZmlnID0gXy5jbG9uZSh0aGlzLmZhY2V0c0NvbmZpZyB8fCB7fSk7XG5cblx0dmFyIHRoaXNDbGFzcyA9IHRoaXMuY29uc3RydWN0b3Jcblx0XHQsIGZhY2V0c0Rlc2NyaXB0b3JzID0ge31cblx0XHQsIGZhY2V0cyA9IHt9O1xuXG5cdGlmICh0aGlzLmNvbnN0cnVjdG9yID09IEZhY2V0ZWRPYmplY3QpXHRcdFxuXHRcdHRocm93IG5ldyBFcnJvcignRmFjZXRlZE9iamVjdCBpcyBhbiBhYnN0cmFjdCBjbGFzcywgY2FuXFwndCBiZSBpbnN0YW50aWF0ZWQnKTtcblxuXHRpZiAodGhpcy5mYWNldHMpXG5cdFx0Xy5lYWNoS2V5KHRoaXMuZmFjZXRzLCBpbnN0YW50aWF0ZUZhY2V0LCB0aGlzLCB0cnVlKTtcblxuXHR2YXIgdW51c2VkRmFjZXRzTmFtZXMgPSBPYmplY3Qua2V5cyhmYWNldHNDb25maWcpO1xuXHRpZiAodW51c2VkRmFjZXRzTmFtZXMubGVuZ3RoKVxuXHRcdHRocm93IG5ldyBFcnJvcignQ29uZmlndXJhdGlvbiBmb3IgdW5rbm93biBmYWNldChzKSBwYXNzZWQ6ICcgKyB1bnVzZWRGYWNldHNOYW1lcy5qb2luKCcsICcpKTtcblxuXHRPYmplY3QuZGVmaW5lUHJvcGVydGllcyh0aGlzLCBmYWNldHNEZXNjcmlwdG9ycyk7XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnZmFjZXRzJywgeyB2YWx1ZTogZmFjZXRzIH0pO1x0XG5cblx0Ly8gY2FsbGluZyBpbml0IGlmIGl0IGlzIGRlZmluZWQgaW4gdGhlIGNsYXNzXG5cdGlmICh0aGlzLmluaXQpXG5cdFx0dGhpcy5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cblx0ZnVuY3Rpb24gaW5zdGFudGlhdGVGYWNldChGYWNldENsYXNzLCBmY3QpIHtcblx0XHR2YXIgZmFjZXRPcHRzID0gZmFjZXRzQ29uZmlnW2ZjdF07XG5cdFx0ZGVsZXRlIGZhY2V0c0NvbmZpZ1tmY3RdO1xuXG5cdFx0ZmFjZXRzW2ZjdF0gPSBuZXcgRmFjZXRDbGFzcyh0aGlzLCBmYWNldE9wdHMpO1xuXG5cdFx0ZmFjZXRzRGVzY3JpcHRvcnNbZmN0XSA9IHtcblx0XHRcdGVudW1lcmFibGU6IGZhbHNlLFxuXHRcdFx0dmFsdWU6IGZhY2V0c1tmY3RdXG5cdFx0fTtcblx0fVxufVxuXG5cbl8uZXh0ZW5kUHJvdG8oRmFjZXRlZE9iamVjdCwge1xuXHRhZGRGYWNldDogYWRkRmFjZXRcbn0pO1xuXG5cbmZ1bmN0aW9uIGFkZEZhY2V0KEZhY2V0Q2xhc3MsIGZhY2V0T3B0cywgZmFjZXROYW1lKSB7XG5cdGNoZWNrKEZhY2V0Q2xhc3MsIEZ1bmN0aW9uKTtcblx0Y2hlY2soZmFjZXROYW1lLCBNYXRjaC5PcHRpb25hbChTdHJpbmcpKTtcblxuXHRmYWNldE5hbWUgPSBfLmZpcnN0TG93ZXJDYXNlKGZhY2V0TmFtZSB8fCBGYWNldENsYXNzLm5hbWUpO1xuXG5cdHZhciBwcm90b0ZhY2V0cyA9IHRoaXMuY29uc3RydWN0b3IucHJvdG90eXBlLmZhY2V0cztcblxuXHRpZiAocHJvdG9GYWNldHMgJiYgcHJvdG9GYWNldHNbZmFjZXROYW1lXSlcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ2ZhY2V0ICcgKyBmYWNldE5hbWUgKyAnIGlzIGFscmVhZHkgcGFydCBvZiB0aGUgY2xhc3MgJyArIHRoaXMuY29uc3RydWN0b3IubmFtZSk7XG5cblx0aWYgKHRoaXNbZmFjZXROYW1lXSlcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ2ZhY2V0ICcgKyBmYWNldE5hbWUgKyAnIGlzIGFscmVhZHkgcHJlc2VudCBpbiBvYmplY3QnKTtcblxuXHR2YXIgbmV3RmFjZXQgPSB0aGlzLmZhY2V0c1tmYWNldE5hbWVdID0gbmV3IEZhY2V0Q2xhc3ModGhpcywgZmFjZXRPcHRzKTtcblxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgZmFjZXROYW1lLCB7XG5cdFx0ZW51bWVyYWJsZTogZmFsc2UsXG5cdFx0dmFsdWU6IG5ld0ZhY2V0XG5cdH0pO1xuXG5cdHJldHVybiBuZXdGYWNldDtcbn1cblxuXG4vLyBmYWN0b3J5IHRoYXQgY3JlYXRlcyBjbGFzc2VzIChjb25zdHJ1Y3RvcnMpIGZyb20gdGhlIG1hcCBvZiBmYWNldHNcbi8vIHRoZXNlIGNsYXNzZXMgaW5oZXJpdCBmcm9tIEZhY2V0ZWRPYmplY3RcbkZhY2V0ZWRPYmplY3QuY3JlYXRlRmFjZXRlZENsYXNzID0gZnVuY3Rpb24gKG5hbWUsIGZhY2V0c0NsYXNzZXMsIGZhY2V0c0NvbmZpZykge1xuXHRjaGVjayhuYW1lLCBTdHJpbmcpO1xuXHRjaGVjayhmYWNldHNDbGFzc2VzLCBNYXRjaC5PYmplY3RIYXNoKEZ1bmN0aW9uIC8qIE1hdGNoLlN1YmNsYXNzKEZhY2V0LCB0cnVlKSBUT0RPIC0gZml4ICovKSk7XG5cblx0dmFyIEZhY2V0ZWRDbGFzcyA9IF8uY3JlYXRlU3ViY2xhc3ModGhpcywgbmFtZSwgdHJ1ZSk7XG5cblx0Xy5leHRlbmRQcm90byhGYWNldGVkQ2xhc3MsIHtcblx0XHRmYWNldHM6IGZhY2V0c0NsYXNzZXMsXG5cdFx0ZmFjZXRzQ29uZmlnOiBmYWNldHNDb25maWdcblx0fSk7XG5cdHJldHVybiBGYWNldGVkQ2xhc3M7XG59O1xuXG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBtaWxvTWFpbCA9IHJlcXVpcmUoJy4vbWFpbCcpXG5cdCwgcmVxdWVzdCA9IHJlcXVpcmUoJy4vdXRpbC9yZXF1ZXN0Jylcblx0LCBsb2dnZXIgPSByZXF1aXJlKCcuL3V0aWwvbG9nZ2VyJylcblx0LCBjb25maWcgPSByZXF1aXJlKCcuL2NvbmZpZycpXG5cdCwgTG9hZEF0dHJpYnV0ZSA9IHJlcXVpcmUoJy4vYXR0cmlidXRlL2FfbG9hZCcpXG5cdCwgTG9hZGVyRXJyb3IgPSByZXF1aXJlKCcuL3V0aWwvZXJyb3InKS5Mb2FkZXI7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBsb2FkZXI7XG5cblxuZnVuY3Rpb24gbG9hZGVyKHJvb3RFbCwgY2FsbGJhY2spIHtcdFxuXHRtaWxvTWFpbC5vbk1lc3NhZ2UoJ2RvbXJlYWR5JywgZnVuY3Rpb24oKSB7XG5cdFx0aWYgKHR5cGVvZiByb290RWwgPT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0Y2FsbGJhY2sgPSByb290RWw7XG5cdFx0XHRyb290RWwgPSB1bmRlZmluZWQ7XG5cdFx0fVxuXG5cdFx0cm9vdEVsID0gcm9vdEVsIHx8IGRvY3VtZW50LmJvZHk7XG5cblx0XHRtaWxvTWFpbC5wb3N0TWVzc2FnZSgnbG9hZGVyJywgeyBzdGF0ZTogJ3N0YXJ0ZWQnIH0pO1xuXHRcdF9sb2FkZXIocm9vdEVsLCBmdW5jdGlvbih2aWV3cykge1xuXHRcdFx0bWlsb01haWwucG9zdE1lc3NhZ2UoJ2xvYWRlcicsIHsgXG5cdFx0XHRcdHN0YXRlOiAnZmluaXNoZWQnLFxuXHRcdFx0XHR2aWV3czogdmlld3Ncblx0XHRcdH0pO1xuXHRcdFx0Y2FsbGJhY2sodmlld3MpO1xuXHRcdH0pO1xuXHR9KTtcbn1cblxuXG5mdW5jdGlvbiBfbG9hZGVyKHJvb3RFbCwgY2FsbGJhY2spIHtcblx0dmFyIGxvYWRFbGVtZW50cyA9IHJvb3RFbC5xdWVyeVNlbGVjdG9yQWxsKCdbJyArIGNvbmZpZy5hdHRycy5sb2FkICsgJ10nKTtcblxuXHR2YXIgdmlld3MgPSB7fVxuXHRcdCwgdG90YWxDb3VudCA9IGxvYWRFbGVtZW50cy5sZW5ndGhcblx0XHQsIGxvYWRlZENvdW50ID0gMDtcblxuXHRBcnJheS5wcm90b3R5cGUuZm9yRWFjaC5jYWxsKGxvYWRFbGVtZW50cywgZnVuY3Rpb24gKGVsKSB7XG5cdFx0bG9hZFZpZXcoZWwsIGZ1bmN0aW9uKGVycikge1xuXHRcdFx0dmlld3NbZWwuaWRdID0gZXJyIHx8IGVsO1xuXHRcdFx0bG9hZGVkQ291bnQrKztcblx0XHRcdGlmIChsb2FkZWRDb3VudCA9PSB0b3RhbENvdW50KVxuXHRcdFx0XHRjYWxsYmFjayh2aWV3cyk7XG5cdFx0fSk7XG5cdH0pO1xufTtcblxuXG5mdW5jdGlvbiBsb2FkVmlldyhlbCwgY2FsbGJhY2spIHtcblx0aWYgKGVsLmNoaWxkcmVuLmxlbmd0aClcblx0XHR0aHJvdyBuZXcgTG9hZGVyRXJyb3IoJ2NhblxcJ3QgbG9hZCBodG1sIGludG8gZWxlbWVudCB0aGF0IGlzIG5vdCBlbXB0eScpO1xuXG5cdHZhciBhdHRyID0gbmV3IExvYWRBdHRyaWJ1dGUoZWwpO1xuXG5cdGF0dHIucGFyc2UoKS52YWxpZGF0ZSgpO1xuXG5cdHJlcXVlc3QuZ2V0KGF0dHIubG9hZFVybCwgZnVuY3Rpb24oZXJyLCBodG1sKSB7XG5cdFx0aWYgKGVycikge1xuXHRcdFx0ZXJyLm1lc3NhZ2UgPSBlcnIubWVzc2FnZSB8fCAnY2FuXFwndCBsb2FkIGZpbGUgJyArIGF0dHIubG9hZFVybDtcblx0XHRcdC8vIGxvZ2dlci5lcnJvcihlcnIubWVzc2FnZSk7XG5cdFx0XHRjYWxsYmFjayhlcnIpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGVsLmlubmVySFRNTCA9IGh0bWw7XG5cdFx0Y2FsbGJhY2sobnVsbCk7XG5cdH0pO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgTWVzc2VuZ2VyID0gcmVxdWlyZSgnLi4vbWVzc2VuZ2VyJylcblx0LCBNYWlsTWVzc2FnZVNvdXJjZSA9IHJlcXVpcmUoJy4vbWFpbF9zb3VyY2UnKTtcblxuXG52YXIgbWFpbE1zZ1NvdXJjZSA9IG5ldyBNYWlsTWVzc2FnZVNvdXJjZSgpO1xuXG52YXIgbWlsb01haWwgPSBuZXcgTWVzc2VuZ2VyKHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBtYWlsTXNnU291cmNlKTtcblxubW9kdWxlLmV4cG9ydHMgPSBtaWxvTWFpbDtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIE1lc3NhZ2VTb3VyY2UgPSByZXF1aXJlKCcuLi9tZXNzZW5nZXIvbWVzc2FnZV9zb3VyY2UnKVxuXHQsIGRvbUV2ZW50c0NvbnN0cnVjdG9ycyA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudHMvY19tZXNzYWdlX3NvdXJjZXMvZG9tX2V2ZW50c19jb25zdHJ1Y3RvcnMnKVxuXHQsIE1haWxNZXNzYWdlU291cmNlRXJyb3IgPSByZXF1aXJlKCcuLi91dGlsL2Vycm9yJykuTWFpbE1lc3NhZ2VTb3VyY2Vcblx0LCBfID0gcmVxdWlyZSgnbW9sLXByb3RvJylcblx0LCBjaGVjayA9IHJlcXVpcmUoJy4uL3V0aWwvY2hlY2snKVxuXHQsIE1hdGNoID0gY2hlY2suTWF0Y2g7XG5cblxudmFyIE1haWxNZXNzYWdlU291cmNlID0gXy5jcmVhdGVTdWJjbGFzcyhNZXNzYWdlU291cmNlLCAnTWFpbE1lc3NhZ2VTb3VyY2UnLCB0cnVlKTtcblxuXG5fLmV4dGVuZFByb3RvKE1haWxNZXNzYWdlU291cmNlLCB7XG5cdC8vIGltcGxlbWVudGluZyBNZXNzYWdlU291cmNlIGludGVyZmFjZVxuXHQvLyBpbml0OiBkZWZpbmVkIGluIE1lc3NhZ2VTb3VyY2Vcblx0dHJhbnNsYXRlVG9Tb3VyY2VNZXNzYWdlOiB0cmFuc2xhdGVUb0RvbUV2ZW50LFxuIFx0YWRkU291cmNlTGlzdGVuZXI6IGFkZERvbUV2ZW50TGlzdGVuZXIsXG4gXHRyZW1vdmVTb3VyY2VMaXN0ZW5lcjogcmVtb3ZlRG9tRXZlbnRMaXN0ZW5lcixcbiBcdGZpbHRlclNvdXJjZU1lc3NhZ2U6IGZpbHRlckRvbUV2ZW50LFxuXG4gXHQvLyBjbGFzcyBzcGVjaWZpYyBtZXRob2RzXG4gXHRoYW5kbGVFdmVudDogaGFuZGxlRXZlbnQsICAvLyBldmVudCBkaXNwYXRjaGVyIC0gYXMgZGVmaW5lZCBieSBFdmVudCBET00gQVBJXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBNYWlsTWVzc2FnZVNvdXJjZTtcblxuXG4vLyBUT0RPOiB0aGlzIGZ1bmN0aW9uIHNob3VsZCByZXR1cm4gcmVsZXZhbnQgRE9NIGV2ZW50IGRlcGVuZGVudCBvbiBlbGVtZW50IHRhZ1xuLy8gQ2FuIGFsc28gaW1wbGVtZW50IGJlZm9yZWRhdGFjaGFuZ2VkIGV2ZW50IHRvIGFsbG93IHByZXZlbnRpbmcgdGhlIGNoYW5nZVxuZnVuY3Rpb24gdHJhbnNsYXRlVG9Eb21FdmVudChtZXNzYWdlKSB7XG5cdGlmIChtZXNzYWdlID09ICdkb21yZWFkeScpXG5cdFx0cmV0dXJuICdyZWFkeXN0YXRlY2hhbmdlJztcbn1cblxuXG5mdW5jdGlvbiBhZGREb21FdmVudExpc3RlbmVyKGV2ZW50VHlwZSkge1xuXHRpZiAodHlwZW9mIGRvY3VtZW50ID09ICdvYmplY3QnKSB7XG5cdFx0aWYgKGV2ZW50VHlwZSA9PSAncmVhZHlzdGF0ZWNoYW5nZScpIHtcblx0XHRcdGlmIChkb2N1bWVudC5yZWFkeVN0YXRlID09ICdsb2FkaW5nJylcblx0XHRcdFx0ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudFR5cGUsIHRoaXMsIGZhbHNlKTsgLy8gbm8gY2FwdHVyaW5nXG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0dmFyIGRvbUV2ZW50ID0gRXZlbnRDb25zdHJ1Y3RvcihldmVudFR5cGUsIHsgdGFyZ2V0OiBkb2N1bWVudCB9KTtcblx0XHRcdFx0dGhpcy5kaXNwYXRjaE1lc3NhZ2UoZXZlbnRUeXBlLCBldmVudCk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59XG5cblxuZnVuY3Rpb24gcmVtb3ZlRG9tRXZlbnRMaXN0ZW5lcihldmVudFR5cGUpIHtcblx0aWYgKHR5cGVvZiBkb2N1bWVudCA9PSAnb2JqZWN0Jylcblx0XHRkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50VHlwZSwgdGhpcywgZmFsc2UpOyAvLyBubyBjYXB0dXJpbmdcbn1cblxuXG5mdW5jdGlvbiBmaWx0ZXJEb21FdmVudChldmVudFR5cGUsIG1lc3NhZ2UsIGV2ZW50KSB7XG5cdGlmIChldmVudFR5cGUgPT0gJ3JlYWR5c3RhdGVjaGFuZ2UnKSB7XG5cdFx0aWYgKHRoaXMuX2RvbVJlYWR5RmlyZWQpIHJldHVybiBmYWxzZTtcblx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ19kb21SZWFkeUZpcmVkJywge1xuXHRcdFx0d3JpdGFibGU6IHRydWUsXG5cdFx0XHR2YWx1ZTogdHJ1ZVxuXHRcdH0pO1xuXHRcdHJldHVybiB0cnVlO1xuXHR9XG59O1xuXG5cbiAvLyBldmVudCBkaXNwYXRjaGVyIC0gYXMgZGVmaW5lZCBieSBFdmVudCBET00gQVBJXG5mdW5jdGlvbiBoYW5kbGVFdmVudChldmVudCkge1xuXHR0aGlzLmRpc3BhdGNoTWVzc2FnZShldmVudC50eXBlLCBldmVudCk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBNaXhpbiA9IHJlcXVpcmUoJy4uL2Fic3RyYWN0L21peGluJylcblx0LCBNZXNzYWdlU291cmNlID0gcmVxdWlyZSgnLi9tZXNzYWdlX3NvdXJjZScpXG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpXG5cdCwgY2hlY2sgPSByZXF1aXJlKCcuLi91dGlsL2NoZWNrJylcblx0LCBNYXRjaCA9IGNoZWNrLk1hdGNoXG5cdCwgTWVzc2VuZ2VyRXJyb3IgPSByZXF1aXJlKCcuLi91dGlsL2Vycm9yJykuTWVzc2VuZ2VyO1xuXG5cbnZhciBldmVudHNTcGxpdFJlZ0V4cCA9IC9cXHMqKD86XFwsfFxccylcXHMqLztcblxuXG52YXIgTWVzc2VuZ2VyID0gXy5jcmVhdGVTdWJjbGFzcyhNaXhpbiwgJ01lc3NlbmdlcicpO1xuXG5fLmV4dGVuZFByb3RvKE1lc3Nlbmdlciwge1xuXHRpbml0OiBpbml0TWVzc2VuZ2VyLCAvLyBjYWxsZWQgYnkgTWl4aW4gKHN1cGVyY2xhc3MpXG5cdG9uTWVzc2FnZTogcmVnaXN0ZXJTdWJzY3JpYmVyLFxuXHRvZmZNZXNzYWdlOiByZW1vdmVTdWJzY3JpYmVyLFxuXHRvbk1lc3NhZ2VzOiByZWdpc3RlclN1YnNjcmliZXJzLFxuXHRvZmZNZXNzYWdlczogcmVtb3ZlU3Vic2NyaWJlcnMsXG5cdHBvc3RNZXNzYWdlOiBwb3N0TWVzc2FnZSxcblx0Z2V0U3Vic2NyaWJlcnM6IGdldE1lc3NhZ2VTdWJzY3JpYmVycyxcblx0X2Nob29zZVN1YnNjcmliZXJzSGFzaDogX2Nob29zZVN1YnNjcmliZXJzSGFzaCxcblx0X3JlZ2lzdGVyU3Vic2NyaWJlcjogX3JlZ2lzdGVyU3Vic2NyaWJlcixcblx0X3JlbW92ZVN1YnNjcmliZXI6IF9yZW1vdmVTdWJzY3JpYmVyLFxuXHRfcmVtb3ZlQWxsU3Vic2NyaWJlcnM6IF9yZW1vdmVBbGxTdWJzY3JpYmVycyxcblx0X2NhbGxQYXR0ZXJuU3Vic2NyaWJlcnM6IF9jYWxsUGF0dGVyblN1YnNjcmliZXJzLFxuXHRfY2FsbFN1YnNjcmliZXJzOiBfY2FsbFN1YnNjcmliZXJzXG59KTtcblxuXG5NZXNzZW5nZXIuZGVmYXVsdE1ldGhvZHMgPSB7XG5cdG9uTWVzc2FnZTogJ29uTWVzc2FnZScsXG5cdG9mZk1lc3NhZ2U6ICdvZmZNZXNzYWdlJyxcblx0b25NZXNzYWdlczogJ29uTWVzc2FnZXMnLFxuXHRvZmZNZXNzYWdlczogJ29mZk1lc3NhZ2VzJyxcblx0cG9zdE1lc3NhZ2U6ICdwb3N0TWVzc2FnZScsXG5cdGdldFN1YnNjcmliZXJzOiAnZ2V0U3Vic2NyaWJlcnMnXG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gTWVzc2VuZ2VyO1xuXG5cbmZ1bmN0aW9uIGluaXRNZXNzZW5nZXIoaG9zdE9iamVjdCwgcHJveHlNZXRob2RzLCBtZXNzYWdlU291cmNlKSB7XG5cdGNoZWNrKG1lc3NhZ2VTb3VyY2UsIE1hdGNoLk9wdGlvbmFsKE1lc3NhZ2VTb3VyY2UpKTtcblxuXHQvLyBob3N0T2JqZWN0IGFuZCBwcm94eU1ldGhvZHMgYXJlIHVzZWQgaW4gTWl4aW5cbiBcdC8vIG1lc3NlbmdlciBkYXRhXG4gXHRPYmplY3QuZGVmaW5lUHJvcGVydGllcyh0aGlzLCB7XG4gXHRcdF9tZXNzYWdlU3Vic2NyaWJlcnM6IHsgdmFsdWU6IHt9IH0sXG4gXHRcdF9wYXR0ZXJuTWVzc2FnZVN1YnNjcmliZXJzOiB7IHZhbHVlOiB7fSB9LFxuIFx0XHRfbWVzc2FnZVNvdXJjZTogeyB2YWx1ZTogbWVzc2FnZVNvdXJjZSB9XG4gXHR9KTtcblxuIFx0aWYgKG1lc3NhZ2VTb3VyY2UpXG4gXHRcdG1lc3NhZ2VTb3VyY2UubWVzc2VuZ2VyID0gdGhpcztcbn1cblxuXG5mdW5jdGlvbiByZWdpc3RlclN1YnNjcmliZXIobWVzc2FnZXMsIHN1YnNjcmliZXIpIHtcblx0Y2hlY2sobWVzc2FnZXMsIE1hdGNoLk9uZU9mKFN0cmluZywgW1N0cmluZ10sIFJlZ0V4cCkpO1xuXHRjaGVjayhzdWJzY3JpYmVyLCBGdW5jdGlvbik7IFxuXG5cdGlmICh0eXBlb2YgbWVzc2FnZXMgPT0gJ3N0cmluZycpXG5cdFx0bWVzc2FnZXMgPSBtZXNzYWdlcy5zcGxpdChldmVudHNTcGxpdFJlZ0V4cCk7XG5cblx0dmFyIHN1YnNjcmliZXJzSGFzaCA9IHRoaXMuX2Nob29zZVN1YnNjcmliZXJzSGFzaChtZXNzYWdlcyk7XG5cblx0aWYgKG1lc3NhZ2VzIGluc3RhbmNlb2YgUmVnRXhwKVxuXHRcdHJldHVybiB0aGlzLl9yZWdpc3RlclN1YnNjcmliZXIoc3Vic2NyaWJlcnNIYXNoLCBtZXNzYWdlcywgc3Vic2NyaWJlcik7XG5cblx0ZWxzZSB7XG5cdFx0dmFyIHdhc1JlZ2lzdGVyZWQgPSBmYWxzZTtcblxuXHRcdG1lc3NhZ2VzLmZvckVhY2goZnVuY3Rpb24obWVzc2FnZSkge1xuXHRcdFx0dmFyIG5vdFlldFJlZ2lzdGVyZWQgPSB0aGlzLl9yZWdpc3RlclN1YnNjcmliZXIoc3Vic2NyaWJlcnNIYXNoLCBtZXNzYWdlLCBzdWJzY3JpYmVyKTtcdFx0XHRcblx0XHRcdHdhc1JlZ2lzdGVyZWQgPSB3YXNSZWdpc3RlcmVkIHx8IG5vdFlldFJlZ2lzdGVyZWQ7XHRcdFx0XG5cdFx0fSwgdGhpcyk7XG5cblx0XHRyZXR1cm4gd2FzUmVnaXN0ZXJlZDtcblx0fVxufVxuXG5cbmZ1bmN0aW9uIF9yZWdpc3RlclN1YnNjcmliZXIoc3Vic2NyaWJlcnNIYXNoLCBtZXNzYWdlLCBzdWJzY3JpYmVyKSB7XG5cdGlmICghIChzdWJzY3JpYmVyc0hhc2hbbWVzc2FnZV0gJiYgc3Vic2NyaWJlcnNIYXNoW21lc3NhZ2VdLmxlbmd0aCkpIHtcblx0XHRzdWJzY3JpYmVyc0hhc2hbbWVzc2FnZV0gPSBbXTtcblx0XHR2YXIgbm9TdWJzY3JpYmVycyA9IHRydWU7XG5cdFx0aWYgKHRoaXMuX21lc3NhZ2VTb3VyY2UpXG5cdFx0XHR0aGlzLl9tZXNzYWdlU291cmNlLm9uU3Vic2NyaWJlckFkZGVkKG1lc3NhZ2UpO1xuXHR9XG5cblx0dmFyIG1zZ1N1YnNjcmliZXJzID0gc3Vic2NyaWJlcnNIYXNoW21lc3NhZ2VdO1xuXHR2YXIgbm90WWV0UmVnaXN0ZXJlZCA9IG5vU3Vic2NyaWJlcnMgfHwgbXNnU3Vic2NyaWJlcnMuaW5kZXhPZihzdWJzY3JpYmVyKSA9PSAtMTtcblxuXHRpZiAobm90WWV0UmVnaXN0ZXJlZClcblx0XHRtc2dTdWJzY3JpYmVycy5wdXNoKHN1YnNjcmliZXIpO1xuXG5cdHJldHVybiBub3RZZXRSZWdpc3RlcmVkO1xufVxuXG5cbmZ1bmN0aW9uIHJlZ2lzdGVyU3Vic2NyaWJlcnMobWVzc2FnZVN1YnNjcmliZXJzKSB7XG5cdGNoZWNrKG1lc3NhZ2VTdWJzY3JpYmVycywgTWF0Y2guT2JqZWN0SGFzaChGdW5jdGlvbikpO1xuXG5cdHZhciBub3RZZXRSZWdpc3RlcmVkTWFwID0gXy5tYXBLZXlzKG1lc3NhZ2VTdWJzY3JpYmVycywgZnVuY3Rpb24oc3Vic2NyaWJlciwgbWVzc2FnZXMpIHtcblx0XHRyZXR1cm4gdGhpcy5vbk1lc3NhZ2UobWVzc2FnZXMsIHN1YnNjcmliZXIpXG5cdH0sIHRoaXMpO1xuXG5cdHJldHVybiBub3RZZXRSZWdpc3RlcmVkTWFwO1xufVxuXG5cbi8vIHJlbW92ZXMgYWxsIHN1YnNjcmliZXJzIGZvciB0aGUgbWVzc2FnZSBpZiBzdWJzY3JpYmVyIGlzbid0IHN1cHBsaWVkXG5mdW5jdGlvbiByZW1vdmVTdWJzY3JpYmVyKG1lc3NhZ2VzLCBzdWJzY3JpYmVyKSB7XG5cdGNoZWNrKG1lc3NhZ2VzLCBNYXRjaC5PbmVPZihTdHJpbmcsIFtTdHJpbmddLCBSZWdFeHApKTtcblx0Y2hlY2soc3Vic2NyaWJlciwgTWF0Y2guT3B0aW9uYWwoRnVuY3Rpb24pKTsgXG5cblx0aWYgKHR5cGVvZiBtZXNzYWdlcyA9PSAnc3RyaW5nJylcblx0XHRtZXNzYWdlcyA9IG1lc3NhZ2VzLnNwbGl0KGV2ZW50c1NwbGl0UmVnRXhwKTtcblxuXHR2YXIgc3Vic2NyaWJlcnNIYXNoID0gdGhpcy5fY2hvb3NlU3Vic2NyaWJlcnNIYXNoKG1lc3NhZ2VzKTtcblxuXHRpZiAobWVzc2FnZXMgaW5zdGFuY2VvZiBSZWdFeHApXG5cdFx0cmV0dXJuIHRoaXMuX3JlbW92ZVN1YnNjcmliZXIoc3Vic2NyaWJlcnNIYXNoLCBtZXNzYWdlcywgc3Vic2NyaWJlcik7XG5cblx0ZWxzZSB7XG5cdFx0dmFyIHdhc1JlbW92ZWQgPSBmYWxzZTtcblxuXHRcdG1lc3NhZ2VzLmZvckVhY2goZnVuY3Rpb24obWVzc2FnZSkge1xuXHRcdFx0dmFyIHN1YnNjcmliZXJSZW1vdmVkID0gdGhpcy5fcmVtb3ZlU3Vic2NyaWJlcihzdWJzY3JpYmVyc0hhc2gsIG1lc3NhZ2UsIHN1YnNjcmliZXIpO1x0XHRcdFxuXHRcdFx0d2FzUmVtb3ZlZCA9IHdhc1JlbW92ZWQgfHwgc3Vic2NyaWJlclJlbW92ZWQ7XHRcdFx0XG5cdFx0fSwgdGhpcyk7XG5cblx0XHRyZXR1cm4gd2FzUmVtb3ZlZDtcblx0fVxufVxuXG5cbmZ1bmN0aW9uIF9yZW1vdmVTdWJzY3JpYmVyKHN1YnNjcmliZXJzSGFzaCwgbWVzc2FnZSwgc3Vic2NyaWJlcikge1xuXHR2YXIgbXNnU3Vic2NyaWJlcnMgPSBzdWJzY3JpYmVyc0hhc2hbbWVzc2FnZV07XG5cdGlmICghIG1zZ1N1YnNjcmliZXJzIHx8ICEgbXNnU3Vic2NyaWJlcnMubGVuZ3RoKVxuXHRcdHJldHVybiBmYWxzZTsgLy8gbm90aGluZyByZW1vdmVkXG5cblx0aWYgKHN1YnNjcmliZXIpIHtcblx0XHR2YXIgc3Vic2NyaWJlckluZGV4ID0gbXNnU3Vic2NyaWJlcnMuaW5kZXhPZihzdWJzY3JpYmVyKTtcblx0XHRpZiAoc3Vic2NyaWJlckluZGV4ID09IC0xKSBcblx0XHRcdHJldHVybiBmYWxzZTsgLy8gbm90aGluZyByZW1vdmVkXG5cdFx0bXNnU3Vic2NyaWJlcnMuc3BsaWNlKHN1YnNjcmliZXJJbmRleCwgMSk7XG5cdFx0aWYgKCEgbXNnU3Vic2NyaWJlcnMubGVuZ3RoKVxuXHRcdFx0dGhpcy5fcmVtb3ZlQWxsU3Vic2NyaWJlcnMoc3Vic2NyaWJlcnNIYXNoLCBtZXNzYWdlKTtcblxuXHR9IGVsc2UgXG5cdFx0dGhpcy5fcmVtb3ZlQWxsU3Vic2NyaWJlcnMoc3Vic2NyaWJlcnNIYXNoLCBtZXNzYWdlKTtcblxuXHRyZXR1cm4gdHJ1ZTsgLy8gc3Vic2NyaWJlcihzKSByZW1vdmVkXG59XG5cblxuZnVuY3Rpb24gX3JlbW92ZUFsbFN1YnNjcmliZXJzKHN1YnNjcmliZXJzSGFzaCwgbWVzc2FnZSkge1xuXHRkZWxldGUgc3Vic2NyaWJlcnNIYXNoW21lc3NhZ2VdO1xuXHRpZiAodGhpcy5fbWVzc2FnZVNvdXJjZSlcblx0XHR0aGlzLl9tZXNzYWdlU291cmNlLm9uU3Vic2NyaWJlclJlbW92ZWQobWVzc2FnZSk7XG59XG5cblxuZnVuY3Rpb24gcmVtb3ZlU3Vic2NyaWJlcnMobWVzc2FnZVN1YnNjcmliZXJzKSB7XG5cdGNoZWNrKG1lc3NhZ2VTdWJzY3JpYmVycywgTWF0Y2guT2JqZWN0SGFzaChGdW5jdGlvbikpO1xuXG5cdHZhciBzdWJzY3JpYmVyUmVtb3ZlZE1hcCA9IF8ubWFwS2V5cyhtZXNzYWdlU3Vic2NyaWJlcnMsIGZ1bmN0aW9uKHN1YnNjcmliZXIsIG1lc3NhZ2VzKSB7XG5cdFx0cmV0dXJuIHRoaXMub2ZmTWVzc2FnZXMobWVzc2FnZXMsIHN1YnNjcmliZXIpXG5cdH0sIHRoaXMpO1xuXG5cdHJldHVybiBzdWJzY3JpYmVyUmVtb3ZlZE1hcDtcdFxufVxuXG5cbi8vIFRPRE8gLSBzZW5kIGV2ZW50IHRvIG1lc3NhZ2VTb3VyY2VcblxuXG5mdW5jdGlvbiBwb3N0TWVzc2FnZShtZXNzYWdlLCBkYXRhKSB7XG5cdGNoZWNrKG1lc3NhZ2UsIE1hdGNoLk9uZU9mKFN0cmluZywgUmVnRXhwKSk7XG5cblx0dmFyIHN1YnNjcmliZXJzSGFzaCA9IHRoaXMuX2Nob29zZVN1YnNjcmliZXJzSGFzaChtZXNzYWdlKTtcblx0dmFyIG1zZ1N1YnNjcmliZXJzID0gc3Vic2NyaWJlcnNIYXNoW21lc3NhZ2VdO1xuXG5cdHRoaXMuX2NhbGxTdWJzY3JpYmVycyhtZXNzYWdlLCBkYXRhLCBtc2dTdWJzY3JpYmVycyk7XG5cblx0aWYgKHR5cGVvZiBtZXNzYWdlID09ICdzdHJpbmcnKVxuXHRcdHRoaXMuX2NhbGxQYXR0ZXJuU3Vic2NyaWJlcnMobWVzc2FnZSwgZGF0YSk7XG59XG5cblxuZnVuY3Rpb24gX2NhbGxQYXR0ZXJuU3Vic2NyaWJlcnMobWVzc2FnZSwgZGF0YSkge1xuXHRfLmVhY2hLZXkodGhpcy5fcGF0dGVybk1lc3NhZ2VTdWJzY3JpYmVycywgXG5cdFx0ZnVuY3Rpb24ocGF0dGVyblN1YnNjcmliZXJzLCBwYXR0ZXJuKSB7XG5cdFx0XHRpZiAocGF0dGVybi50ZXN0KG1lc3NhZ2UpKVxuXHRcdFx0XHR0aGlzLl9jYWxsU3Vic2NyaWJlcnMobWVzc2FnZSwgZGF0YSwgcGF0dGVyblN1YnNjcmliZXJzKTtcblx0XHR9XG5cdCwgdGhpcyk7XG59XG5cblxuZnVuY3Rpb24gX2NhbGxTdWJzY3JpYmVycyhtZXNzYWdlLCBkYXRhLCBtc2dTdWJzY3JpYmVycykge1xuXHRpZiAobXNnU3Vic2NyaWJlcnMgJiYgbXNnU3Vic2NyaWJlcnMubGVuZ3RoKVxuXHRcdG1zZ1N1YnNjcmliZXJzLmZvckVhY2goZnVuY3Rpb24oc3Vic2NyaWJlcikge1xuXHRcdFx0c3Vic2NyaWJlci5jYWxsKHRoaXMsIG1lc3NhZ2UsIGRhdGEpO1xuXHRcdH0sIHRoaXMpO1xufVxuXG5cbmZ1bmN0aW9uIGdldE1lc3NhZ2VTdWJzY3JpYmVycyhtZXNzYWdlLCBpbmNsdWRlUGF0dGVyblN1YnNjcmliZXJzKSB7XG5cdGNoZWNrKG1lc3NhZ2UsIE1hdGNoLk9uZU9mKFN0cmluZywgUmVnRXhwKSk7XG5cblx0dmFyIHN1YnNjcmliZXJzSGFzaCA9IHRoaXMuX2Nob29zZVN1YnNjcmliZXJzSGFzaChtZXNzYWdlKTtcblx0dmFyIG1zZ1N1YnNjcmliZXJzID0gc3Vic2NyaWJlcnNIYXNoW21lc3NhZ2VdXG5cdFx0XHRcdFx0XHRcdD8gW10uY29uY2F0KHN1YnNjcmliZXJzSGFzaFttZXNzYWdlXSlcblx0XHRcdFx0XHRcdFx0OiBbXTtcblxuXHQvLyBwYXR0ZXJuIHN1YnNjcmliZXJzIGFyZSBpbmN1ZGVkIGJ5IGRlZmF1bHRcblx0aWYgKGluY2x1ZGVQYXR0ZXJuU3Vic2NyaWJlcnMgIT09IGZhbHNlICYmIHR5cGVvZiBtZXNzYWdlID09ICdzdHJpbmcnKSB7XG5cdFx0Xy5lYWNoS2V5KHRoaXMuX3BhdHRlcm5NZXNzYWdlU3Vic2NyaWJlcnMsIFxuXHRcdFx0ZnVuY3Rpb24ocGF0dGVyblN1YnNjcmliZXJzLCBwYXR0ZXJuKSB7XG5cdFx0XHRcdGlmIChwYXR0ZXJuU3Vic2NyaWJlcnMgJiYgcGF0dGVyblN1YnNjcmliZXJzLmxlbmd0aFxuXHRcdFx0XHRcdFx0JiYgcGF0dGVybi50ZXN0KG1lc3NhZ2UpKVxuXHRcdFx0XHRcdF8uYXBwZW5kQXJyYXkobXNnU3Vic2NyaWJlcnMsIHBhdHRlcm5TdWJzY3JpYmVycyk7XG5cdFx0XHR9XG5cdFx0KTtcblx0fVxuXG5cdHJldHVybiBtc2dTdWJzY3JpYmVycy5sZW5ndGhcblx0XHRcdFx0PyBtc2dTdWJzY3JpYmVyc1xuXHRcdFx0XHQ6IHVuZGVmaW5lZDtcbn1cblxuXG5mdW5jdGlvbiBfY2hvb3NlU3Vic2NyaWJlcnNIYXNoKG1lc3NhZ2UpIHtcblx0cmV0dXJuIG1lc3NhZ2UgaW5zdGFuY2VvZiBSZWdFeHBcblx0XHRcdFx0PyB0aGlzLl9wYXR0ZXJuTWVzc2FnZVN1YnNjcmliZXJzXG5cdFx0XHRcdDogdGhpcy5fbWVzc2FnZVN1YnNjcmliZXJzO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgTWl4aW4gPSByZXF1aXJlKCcuLi9hYnN0cmFjdC9taXhpbicpXG5cdCwgbG9nZ2VyID0gcmVxdWlyZSgnLi4vdXRpbC9sb2dnZXInKVxuXHQsIHRvQmVJbXBsZW1lbnRlZCA9IHJlcXVpcmUoJy4uL3V0aWwvZXJyb3InKS50b0JlSW1wbGVtZW50ZWRcblx0LCBfID0gcmVxdWlyZSgnbW9sLXByb3RvJyk7XG5cbi8vIGFuIGFic3RyYWN0IGNsYXNzIGZvciBkaXNwYXRjaGluZyBleHRlcm5hbCB0byBpbnRlcm5hbCBldmVudHNcbnZhciBNZXNzYWdlU291cmNlID0gXy5jcmVhdGVTdWJjbGFzcyhNaXhpbiwgJ01lc3NhZ2VTb3VyY2UnLCB0cnVlKTtcblxubW9kdWxlLmV4cG9ydHMgPSBNZXNzYWdlU291cmNlO1xuXG5cbl8uZXh0ZW5kUHJvdG8oTWVzc2FnZVNvdXJjZSwge1xuXHQvLyBpbml0aWFsaXplcyBtZXNzYWdlU291cmNlIC0gY2FsbGVkIGJ5IE1peGluIHN1cGVyY2xhc3Ncblx0aW5pdDogaW5pdE1lc3NhZ2VTb3VyY2UsXG5cblx0Ly8gY2FsbGVkIGJ5IE1lc3NlbmdlciB0byBub3RpZnkgd2hlbiB0aGUgZmlyc3Qgc3Vic2NyaWJlciBmb3IgYW4gaW50ZXJuYWwgbWVzc2FnZSB3YXMgYWRkZWRcblx0b25TdWJzY3JpYmVyQWRkZWQ6IG9uU3Vic2NyaWJlckFkZGVkLFxuXG5cdC8vIGNhbGxlZCBieSBNZXNzZW5nZXIgdG8gbm90aWZ5IHdoZW4gdGhlIGxhc3Qgc3Vic2NyaWJlciBmb3IgYW4gaW50ZXJuYWwgbWVzc2FnZSB3YXMgcmVtb3ZlZFxuIFx0b25TdWJzY3JpYmVyUmVtb3ZlZDogb25TdWJzY3JpYmVyUmVtb3ZlZCwgXG5cbiBcdC8vIGRpc3BhdGNoZXMgc291cmNlIG1lc3NhZ2VcbiBcdGRpc3BhdGNoTWVzc2FnZTogZGlzcGF0Y2hTb3VyY2VNZXNzYWdlLFxuXG5cdC8vIGZpbHRlcnMgc291cmNlIG1lc3NhZ2UgYmFzZWQgb24gdGhlIGRhdGEgb2YgdGhlIG1lc3NhZ2UgLSBzaG91bGQgYmUgaW1wbGVtZW50ZWQgaW4gc3ViY2xhc3Ncblx0ZmlsdGVyU291cmNlTWVzc2FnZTogZGlzcGF0Y2hBbGxTb3VyY2VNZXNzYWdlcyxcblxuIFx0Ly8gKioqXG4gXHQvLyBNZXRob2RzIGJlbG93IG11c3QgYmUgaW1wbGVtZW50ZWQgaW4gc3ViY2xhc3NcbiBcdFxuXHQvLyBjb252ZXJ0cyBpbnRlcm5hbCBtZXNzYWdlIHR5cGUgdG8gZXh0ZXJuYWwgbWVzc2FnZSB0eXBlIC0gc2hvdWxkIGJlIGltcGxlbWVudGVkIGluIHN1YmNsYXNzXG5cdHRyYW5zbGF0ZVRvU291cmNlTWVzc2FnZTogdG9CZUltcGxlbWVudGVkLFxuXG4gXHQvLyBhZGRzIGxpc3RlbmVyIHRvIGV4dGVybmFsIG1lc3NhZ2UgLSBzaG91bGQgYmUgaW1wbGVtZW50ZWQgYnkgc3ViY2xhc3NcbiBcdGFkZFNvdXJjZUxpc3RlbmVyOiB0b0JlSW1wbGVtZW50ZWQsXG5cbiBcdC8vIHJlbW92ZXMgbGlzdGVuZXIgZnJvbSBleHRlcm5hbCBtZXNzYWdlIC0gc2hvdWxkIGJlIGltcGxlbWVudGVkIGJ5IHN1YmNsYXNzXG4gXHRyZW1vdmVTb3VyY2VMaXN0ZW5lcjogdG9CZUltcGxlbWVudGVkLFxufSk7XG5cblxuZnVuY3Rpb24gaW5pdE1lc3NhZ2VTb3VyY2UoKSB7XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnX2ludGVybmFsTWVzc2FnZXMnLCB7IHZhbHVlOiB7fSB9KTtcbn1cblxuXG5mdW5jdGlvbiBvblN1YnNjcmliZXJBZGRlZChtZXNzYWdlKSB7XG5cdHZhciBzb3VyY2VNZXNzYWdlID0gdGhpcy50cmFuc2xhdGVUb1NvdXJjZU1lc3NhZ2UobWVzc2FnZSk7XG5cblx0aWYgKCEgc291cmNlTWVzc2FnZSkgcmV0dXJuO1xuXG5cdGlmICghIHRoaXMuX2ludGVybmFsTWVzc2FnZXMuaGFzT3duUHJvcGVydHkoc291cmNlTWVzc2FnZSkpIHtcblx0XHR0aGlzLmFkZFNvdXJjZUxpc3RlbmVyKHNvdXJjZU1lc3NhZ2UpO1xuXHRcdHRoaXMuX2ludGVybmFsTWVzc2FnZXNbc291cmNlTWVzc2FnZV0gPSBbXTtcblx0fVxuXHR2YXIgaW50ZXJuYWxNc2dzID0gdGhpcy5faW50ZXJuYWxNZXNzYWdlc1tzb3VyY2VNZXNzYWdlXTtcblxuXHRpZiAoaW50ZXJuYWxNc2dzLmluZGV4T2YobWVzc2FnZSkgPT0gLTEpXG5cdFx0aW50ZXJuYWxNc2dzLnB1c2gobWVzc2FnZSk7XG5cdGVsc2Vcblx0XHRsb2dnZXIud2FybignRHVwbGljYXRlIG5vdGlmaWNhdGlvbiByZWNlaXZlZDogZm9yIHN1YnNjcmliZSB0byBpbnRlcm5hbCBtZXNzYWdlICcgKyBtZXNzYWdlKTtcbn1cblxuXG5mdW5jdGlvbiBvblN1YnNjcmliZXJSZW1vdmVkKG1lc3NhZ2UpIHtcblx0dmFyIHNvdXJjZU1lc3NhZ2UgPSB0aGlzLnRyYW5zbGF0ZVRvU291cmNlTWVzc2FnZShtZXNzYWdlKTtcblxuXHRpZiAoISBzb3VyY2VNZXNzYWdlKSByZXR1cm47XG5cblx0dmFyIGludGVybmFsTXNncyA9IHRoaXMuX2ludGVybmFsTWVzc2FnZXNbc291cmNlTWVzc2FnZV07XG5cblx0aWYgKGludGVybmFsTXNncyAmJiBpbnRlcm5hbE1zZ3MubGVuZ3RoKSB7XG5cdFx0bWVzc2FnZUluZGV4ID0gaW50ZXJuYWxNc2dzLmluZGV4T2YobWVzc2FnZSk7XG5cdFx0aWYgKG1lc3NhZ2VJbmRleCA+PSAwKSB7XG5cdFx0XHRpbnRlcm5hbE1zZ3Muc3BsaWNlKG1lc3NhZ2VJbmRleCwgMSk7XG5cdFx0XHRpZiAoaW50ZXJuYWxNc2dzLmxlbmd0aCA9PSAwKSB7XG5cdFx0XHRcdGRlbGV0ZSB0aGlzLl9pbnRlcm5hbE1lc3NhZ2VzW3NvdXJjZU1lc3NhZ2VdO1xuXHRcdFx0XHR0aGlzLnJlbW92ZVNvdXJjZUxpc3RlbmVyKHNvdXJjZU1lc3NhZ2UpO1xuXHRcdFx0fVxuXHRcdH0gZWxzZVxuXHRcdFx0dW5leHBlY3RlZE5vdGlmaWNhdGlvbldhcm5pbmcoKTtcblx0fSBlbHNlXG5cdFx0dW5leHBlY3RlZE5vdGlmaWNhdGlvbldhcm5pbmcoKTtcblxuXG5cdGZ1bmN0aW9uIHVuZXhwZWN0ZWROb3RpZmljYXRpb25XYXJuaW5nKCkge1xuXHRcdGxvZ2dlci53YXJuKCdub3RpZmljYXRpb24gcmVjZWl2ZWQ6IHVuLXN1YnNjcmliZSBmcm9tIGludGVybmFsIG1lc3NhZ2UgJyArIG1lc3NhZ2Vcblx0XHRcdFx0XHQgKyAnIHdpdGhvdXQgcHJldmlvdXMgc3Vic2NyaXB0aW9uIG5vdGlmaWNhdGlvbicpO1xuXHR9XG59XG5cblxuZnVuY3Rpb24gZGlzcGF0Y2hTb3VyY2VNZXNzYWdlKHNvdXJjZU1lc3NhZ2UsIGRhdGEpIHtcblx0dmFyIGludGVybmFsTXNncyA9IHRoaXMuX2ludGVybmFsTWVzc2FnZXNbc291cmNlTWVzc2FnZV07XG5cblx0aWYgKGludGVybmFsTXNncyAmJiBpbnRlcm5hbE1zZ3MubGVuZ3RoKVxuXHRcdGludGVybmFsTXNncy5mb3JFYWNoKGZ1bmN0aW9uKG1lc3NhZ2UpIHtcblx0XHRcdGlmICh0aGlzLmZpbHRlclNvdXJjZU1lc3NhZ2Vcblx0XHRcdFx0XHQmJiB0aGlzLmZpbHRlclNvdXJjZU1lc3NhZ2Uoc291cmNlTWVzc2FnZSwgbWVzc2FnZSwgZGF0YSkpXG5cdFx0XHRcdHRoaXMubWVzc2VuZ2VyLnBvc3RNZXNzYWdlKG1lc3NhZ2UsIGRhdGEpO1xuXHRcdH0sIHRoaXMpO1xuXHRlbHNlXG5cdFx0bG9nZ2VyLndhcm4oJ3NvdXJjZSBtZXNzYWdlIHJlY2VpdmVkIGZvciB3aGljaCB0aGVyZSBpcyBubyBtYXBwZWQgaW50ZXJuYWwgbWVzc2FnZScpO1xufVxuXG5cbi8vIGNhbiBiZSBvdmVycmlkZGVuIGluIHN1YmNsYXNzIHRvIGltcGxlbWVudCBmaWx0ZXJpbmcgYmFzZWQgb24gbWVzc2FnZSBkYXRhXG5mdW5jdGlvbiBkaXNwYXRjaEFsbFNvdXJjZU1lc3NhZ2VzKHNvdXJjZU1lc3NhZ2UsIG1lc3NhZ2UsIGRhdGEpIHtcblx0cmV0dXJuIHRydWU7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBtaWxvID0ge1xuXHRsb2FkZXI6IHJlcXVpcmUoJy4vbG9hZGVyJyksXG5cdGJpbmRlcjogcmVxdWlyZSgnLi9iaW5kZXInKSxcblx0bWFpbDogcmVxdWlyZSgnLi9tYWlsJyksXG5cdGNvbmZpZzogcmVxdWlyZSgnLi9jb25maWcnKSxcblx0dXRpbDogcmVxdWlyZSgnLi91dGlsJyksXG5cdGNsYXNzZXM6IHJlcXVpcmUoJy4vY2xhc3NlcycpXG59XG5cblxuLy8gdXNlZCBmYWNldHNcbnJlcXVpcmUoJy4vY29tcG9uZW50cy9jX2ZhY2V0cy9Eb20nKTtcbnJlcXVpcmUoJy4vY29tcG9uZW50cy9jX2ZhY2V0cy9EYXRhJyk7XG5yZXF1aXJlKCcuL2NvbXBvbmVudHMvY19mYWNldHMvRnJhbWUnKTtcbnJlcXVpcmUoJy4vY29tcG9uZW50cy9jX2ZhY2V0cy9FdmVudHMnKTtcbnJlcXVpcmUoJy4vY29tcG9uZW50cy9jX2ZhY2V0cy9UZW1wbGF0ZScpO1xucmVxdWlyZSgnLi9jb21wb25lbnRzL2NfZmFjZXRzL0NvbnRhaW5lcicpO1xucmVxdWlyZSgnLi9jb21wb25lbnRzL2NfZmFjZXRzL0RyYWcnKTtcbnJlcXVpcmUoJy4vY29tcG9uZW50cy9jX2ZhY2V0cy9Ecm9wJyk7XG5cbi8vIHVzZWQgY29tcG9uZW50c1xucmVxdWlyZSgnLi9jb21wb25lbnRzL2NsYXNzZXMvVmlldycpO1xuXG5cbi8vIGV4cG9ydCBmb3Igbm9kZS9icm93c2VyaWZ5XG5pZiAodHlwZW9mIG1vZHVsZSA9PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cylcdFxuXHRtb2R1bGUuZXhwb3J0cyA9IG1pbG87XG5cbi8vIGdsb2JhbCBtaWxvIGZvciBicm93c2VyXG5pZiAodHlwZW9mIHdpbmRvdyA9PSAnb2JqZWN0Jylcblx0d2luZG93Lm1pbG8gPSBtaWxvO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyBYWFggZG9jc1xuXG4vLyBUaGluZ3Mgd2UgZXhwbGljaXRseSBkbyBOT1Qgc3VwcG9ydDpcbi8vICAgIC0gaGV0ZXJvZ2Vub3VzIGFycmF5c1xudmFyIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKTtcblxudmFyIGNoZWNrID0gZnVuY3Rpb24gKHZhbHVlLCBwYXR0ZXJuKSB7XG4gIC8vIFJlY29yZCB0aGF0IGNoZWNrIGdvdCBjYWxsZWQsIGlmIHNvbWVib2R5IGNhcmVkLlxuICB0cnkge1xuICAgIGNoZWNrU3VidHJlZSh2YWx1ZSwgcGF0dGVybik7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGlmICgoZXJyIGluc3RhbmNlb2YgTWF0Y2guRXJyb3IpICYmIGVyci5wYXRoKVxuICAgICAgZXJyLm1lc3NhZ2UgKz0gXCIgaW4gZmllbGQgXCIgKyBlcnIucGF0aDtcbiAgICB0aHJvdyBlcnI7XG4gIH1cbn07XG5tb2R1bGUuZXhwb3J0cyA9IGNoZWNrO1xuXG52YXIgTWF0Y2ggPSBjaGVjay5NYXRjaCA9IHtcbiAgT3B0aW9uYWw6IGZ1bmN0aW9uIChwYXR0ZXJuKSB7XG4gICAgcmV0dXJuIG5ldyBPcHRpb25hbChwYXR0ZXJuKTtcbiAgfSxcbiAgT25lT2Y6IGZ1bmN0aW9uICgvKmFyZ3VtZW50cyovKSB7XG4gICAgcmV0dXJuIG5ldyBPbmVPZihhcmd1bWVudHMpO1xuICB9LFxuICBBbnk6IFsnX19hbnlfXyddLFxuICBXaGVyZTogZnVuY3Rpb24gKGNvbmRpdGlvbikge1xuICAgIHJldHVybiBuZXcgV2hlcmUoY29uZGl0aW9uKTtcbiAgfSxcbiAgT2JqZWN0SW5jbHVkaW5nOiBmdW5jdGlvbiAocGF0dGVybikge1xuICAgIHJldHVybiBuZXcgT2JqZWN0SW5jbHVkaW5nKHBhdHRlcm4pO1xuICB9LFxuICAvLyBNYXRjaGVzIG9ubHkgc2lnbmVkIDMyLWJpdCBpbnRlZ2Vyc1xuICBJbnRlZ2VyOiBbJ19faW50ZWdlcl9fJ10sXG5cbiAgLy8gTWF0Y2hlcyBoYXNoIChvYmplY3QpIHdpdGggdmFsdWVzIG1hdGNoaW5nIHBhdHRlcm5cbiAgT2JqZWN0SGFzaDogZnVuY3Rpb24ocGF0dGVybikge1xuICAgIHJldHVybiBuZXcgT2JqZWN0SGFzaChwYXR0ZXJuKTtcbiAgfSxcblxuICBTdWJjbGFzczogZnVuY3Rpb24oU3VwZXJjbGFzcywgbWF0Y2hTdXBlcmNsYXNzVG9vKSB7XG4gICAgcmV0dXJuIG5ldyBTdWJjbGFzcyhTdXBlcmNsYXNzLCBtYXRjaFN1cGVyY2xhc3NUb28pO1xuICB9LFxuXG4gIC8vIFhYWCBtYXRjaGVycyBzaG91bGQga25vdyBob3cgdG8gZGVzY3JpYmUgdGhlbXNlbHZlcyBmb3IgZXJyb3JzXG4gIEVycm9yOiBUeXBlRXJyb3IsXG5cbiAgLy8gTWV0ZW9yLm1ha2VFcnJvclR5cGUoXCJNYXRjaC5FcnJvclwiLCBmdW5jdGlvbiAobXNnKSB7XG4gICAgLy8gdGhpcy5tZXNzYWdlID0gXCJNYXRjaCBlcnJvcjogXCIgKyBtc2c7XG4gICAgLy8gVGhlIHBhdGggb2YgdGhlIHZhbHVlIHRoYXQgZmFpbGVkIHRvIG1hdGNoLiBJbml0aWFsbHkgZW1wdHksIHRoaXMgZ2V0c1xuICAgIC8vIHBvcHVsYXRlZCBieSBjYXRjaGluZyBhbmQgcmV0aHJvd2luZyB0aGUgZXhjZXB0aW9uIGFzIGl0IGdvZXMgYmFjayB1cCB0aGVcbiAgICAvLyBzdGFjay5cbiAgICAvLyBFLmcuOiBcInZhbHNbM10uZW50aXR5LmNyZWF0ZWRcIlxuICAgIC8vIHRoaXMucGF0aCA9IFwiXCI7XG4gICAgLy8gSWYgdGhpcyBnZXRzIHNlbnQgb3ZlciBERFAsIGRvbid0IGdpdmUgZnVsbCBpbnRlcm5hbCBkZXRhaWxzIGJ1dCBhdCBsZWFzdFxuICAgIC8vIHByb3ZpZGUgc29tZXRoaW5nIGJldHRlciB0aGFuIDUwMCBJbnRlcm5hbCBzZXJ2ZXIgZXJyb3IuXG4gIC8vICAgdGhpcy5zYW5pdGl6ZWRFcnJvciA9IG5ldyBNZXRlb3IuRXJyb3IoNDAwLCBcIk1hdGNoIGZhaWxlZFwiKTtcbiAgLy8gfSksXG5cbiAgLy8gVGVzdHMgdG8gc2VlIGlmIHZhbHVlIG1hdGNoZXMgcGF0dGVybi4gVW5saWtlIGNoZWNrLCBpdCBtZXJlbHkgcmV0dXJucyB0cnVlXG4gIC8vIG9yIGZhbHNlICh1bmxlc3MgYW4gZXJyb3Igb3RoZXIgdGhhbiBNYXRjaC5FcnJvciB3YXMgdGhyb3duKS5cbiAgdGVzdDogZnVuY3Rpb24gKHZhbHVlLCBwYXR0ZXJuKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNoZWNrU3VidHJlZSh2YWx1ZSwgcGF0dGVybik7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoZSBpbnN0YW5jZW9mIE1hdGNoLkVycm9yKVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAvLyBSZXRocm93IG90aGVyIGVycm9ycy5cbiAgICAgIHRocm93IGU7XG4gICAgfVxuICB9XG59O1xuXG5mdW5jdGlvbiBPcHRpb25hbChwYXR0ZXJuKSB7XG4gIHRoaXMucGF0dGVybiA9IHBhdHRlcm47XG59O1xuXG5mdW5jdGlvbiBPbmVPZihjaG9pY2VzKSB7XG4gIGlmIChjaG9pY2VzLmxlbmd0aCA9PSAwKVxuICAgIHRocm93IG5ldyBFcnJvcihcIk11c3QgcHJvdmlkZSBhdCBsZWFzdCBvbmUgY2hvaWNlIHRvIE1hdGNoLk9uZU9mXCIpO1xuICB0aGlzLmNob2ljZXMgPSBjaG9pY2VzO1xufTtcblxuZnVuY3Rpb24gV2hlcmUoY29uZGl0aW9uKSB7XG4gIHRoaXMuY29uZGl0aW9uID0gY29uZGl0aW9uO1xufTtcblxuZnVuY3Rpb24gT2JqZWN0SW5jbHVkaW5nKHBhdHRlcm4pIHtcbiAgdGhpcy5wYXR0ZXJuID0gcGF0dGVybjtcbn07XG5cbmZ1bmN0aW9uIE9iamVjdEhhc2gocGF0dGVybikge1xuICB0aGlzLnBhdHRlcm4gPSBwYXR0ZXJuO1xufTtcblxuZnVuY3Rpb24gU3ViY2xhc3MoU3VwZXJjbGFzcywgbWF0Y2hTdXBlcmNsYXNzVG9vKSB7XG4gIHRoaXMuU3VwZXJjbGFzcyA9IFN1cGVyY2xhc3M7XG4gIHRoaXMubWF0Y2hTdXBlcmNsYXNzID0gbWF0Y2hTdXBlcmNsYXNzVG9vO1xufTtcblxudmFyIHR5cGVvZkNoZWNrcyA9IFtcbiAgW1N0cmluZywgXCJzdHJpbmdcIl0sXG4gIFtOdW1iZXIsIFwibnVtYmVyXCJdLFxuICBbQm9vbGVhbiwgXCJib29sZWFuXCJdLFxuICAvLyBXaGlsZSB3ZSBkb24ndCBhbGxvdyB1bmRlZmluZWQgaW4gSlNPTiwgdGhpcyBpcyBnb29kIGZvciBvcHRpb25hbFxuICAvLyBhcmd1bWVudHMgd2l0aCBPbmVPZi5cbiAgW3VuZGVmaW5lZCwgXCJ1bmRlZmluZWRcIl1cbl07XG5cbmZ1bmN0aW9uIGNoZWNrU3VidHJlZSh2YWx1ZSwgcGF0dGVybikge1xuICAvLyBNYXRjaCBhbnl0aGluZyFcbiAgaWYgKHBhdHRlcm4gPT09IE1hdGNoLkFueSlcbiAgICByZXR1cm47XG5cbiAgLy8gQmFzaWMgYXRvbWljIHR5cGVzLlxuICAvLyBEbyBub3QgbWF0Y2ggYm94ZWQgb2JqZWN0cyAoZS5nLiBTdHJpbmcsIEJvb2xlYW4pXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdHlwZW9mQ2hlY2tzLmxlbmd0aDsgKytpKSB7XG4gICAgaWYgKHBhdHRlcm4gPT09IHR5cGVvZkNoZWNrc1tpXVswXSkge1xuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gdHlwZW9mQ2hlY2tzW2ldWzFdKVxuICAgICAgICByZXR1cm47XG4gICAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJFeHBlY3RlZCBcIiArIHR5cGVvZkNoZWNrc1tpXVsxXSArIFwiLCBnb3QgXCIgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGVvZiB2YWx1ZSk7XG4gICAgfVxuICB9XG4gIGlmIChwYXR0ZXJuID09PSBudWxsKSB7XG4gICAgaWYgKHZhbHVlID09PSBudWxsKVxuICAgICAgcmV0dXJuO1xuICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIG51bGwsIGdvdCBcIiArIEpTT04uc3RyaW5naWZ5KHZhbHVlKSk7XG4gIH1cblxuICAvLyBNYXRjaC5JbnRlZ2VyIGlzIHNwZWNpYWwgdHlwZSBlbmNvZGVkIHdpdGggYXJyYXlcbiAgaWYgKHBhdHRlcm4gPT09IE1hdGNoLkludGVnZXIpIHtcbiAgICAvLyBUaGVyZSBpcyBubyBjb25zaXN0ZW50IGFuZCByZWxpYWJsZSB3YXkgdG8gY2hlY2sgaWYgdmFyaWFibGUgaXMgYSA2NC1iaXRcbiAgICAvLyBpbnRlZ2VyLiBPbmUgb2YgdGhlIHBvcHVsYXIgc29sdXRpb25zIGlzIHRvIGdldCByZW1pbmRlciBvZiBkaXZpc2lvbiBieSAxXG4gICAgLy8gYnV0IHRoaXMgbWV0aG9kIGZhaWxzIG9uIHJlYWxseSBsYXJnZSBmbG9hdHMgd2l0aCBiaWcgcHJlY2lzaW9uLlxuICAgIC8vIEUuZy46IDEuMzQ4MTkyMzA4NDkxODI0ZSsyMyAlIDEgPT09IDAgaW4gVjhcbiAgICAvLyBCaXR3aXNlIG9wZXJhdG9ycyB3b3JrIGNvbnNpc3RhbnRseSBidXQgYWx3YXlzIGNhc3QgdmFyaWFibGUgdG8gMzItYml0XG4gICAgLy8gc2lnbmVkIGludGVnZXIgYWNjb3JkaW5nIHRvIEphdmFTY3JpcHQgc3BlY3MuXG4gICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJudW1iZXJcIiAmJiAodmFsdWUgfCAwKSA9PT0gdmFsdWUpXG4gICAgICByZXR1cm5cbiAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJFeHBlY3RlZCBJbnRlZ2VyLCBnb3QgXCJcbiAgICAgICAgICAgICAgICArICh2YWx1ZSBpbnN0YW5jZW9mIE9iamVjdCA/IEpTT04uc3RyaW5naWZ5KHZhbHVlKSA6IHZhbHVlKSk7XG4gIH1cblxuICAvLyBcIk9iamVjdFwiIGlzIHNob3J0aGFuZCBmb3IgTWF0Y2guT2JqZWN0SW5jbHVkaW5nKHt9KTtcbiAgaWYgKHBhdHRlcm4gPT09IE9iamVjdClcbiAgICBwYXR0ZXJuID0gTWF0Y2guT2JqZWN0SW5jbHVkaW5nKHt9KTtcblxuICAvLyBBcnJheSAoY2hlY2tlZCBBRlRFUiBBbnksIHdoaWNoIGlzIGltcGxlbWVudGVkIGFzIGFuIEFycmF5KS5cbiAgaWYgKHBhdHRlcm4gaW5zdGFuY2VvZiBBcnJheSkge1xuICAgIGlmIChwYXR0ZXJuLmxlbmd0aCAhPT0gMSlcbiAgICAgIHRocm93IEVycm9yKFwiQmFkIHBhdHRlcm46IGFycmF5cyBtdXN0IGhhdmUgb25lIHR5cGUgZWxlbWVudFwiICtcbiAgICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHBhdHRlcm4pKTtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJFeHBlY3RlZCBhcnJheSwgZ290IFwiICsgSlNPTi5zdHJpbmdpZnkodmFsdWUpKTtcbiAgICB9XG5cbiAgICB2YWx1ZS5mb3JFYWNoKGZ1bmN0aW9uICh2YWx1ZUVsZW1lbnQsIGluZGV4KSB7XG4gICAgICB0cnkge1xuICAgICAgICBjaGVja1N1YnRyZWUodmFsdWVFbGVtZW50LCBwYXR0ZXJuWzBdKTtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICBpZiAoZXJyIGluc3RhbmNlb2YgTWF0Y2guRXJyb3IpIHtcbiAgICAgICAgICBlcnIucGF0aCA9IF9wcmVwZW5kUGF0aChpbmRleCwgZXJyLnBhdGgpO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IGVycjtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBBcmJpdHJhcnkgdmFsaWRhdGlvbiBjaGVja3MuIFRoZSBjb25kaXRpb24gY2FuIHJldHVybiBmYWxzZSBvciB0aHJvdyBhXG4gIC8vIE1hdGNoLkVycm9yIChpZSwgaXQgY2FuIGludGVybmFsbHkgdXNlIGNoZWNrKCkpIHRvIGZhaWwuXG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgV2hlcmUpIHtcbiAgICBpZiAocGF0dGVybi5jb25kaXRpb24odmFsdWUpKVxuICAgICAgcmV0dXJuO1xuICAgIC8vIFhYWCB0aGlzIGVycm9yIGlzIHRlcnJpYmxlXG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRmFpbGVkIE1hdGNoLldoZXJlIHZhbGlkYXRpb25cIik7XG4gIH1cblxuXG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgT3B0aW9uYWwpXG4gICAgcGF0dGVybiA9IE1hdGNoLk9uZU9mKHVuZGVmaW5lZCwgcGF0dGVybi5wYXR0ZXJuKTtcblxuICBpZiAocGF0dGVybiBpbnN0YW5jZW9mIE9uZU9mKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXR0ZXJuLmNob2ljZXMubGVuZ3RoOyArK2kpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNoZWNrU3VidHJlZSh2YWx1ZSwgcGF0dGVybi5jaG9pY2VzW2ldKTtcbiAgICAgICAgLy8gTm8gZXJyb3I/IFlheSwgcmV0dXJuLlxuICAgICAgICByZXR1cm47XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgLy8gT3RoZXIgZXJyb3JzIHNob3VsZCBiZSB0aHJvd24uIE1hdGNoIGVycm9ycyBqdXN0IG1lYW4gdHJ5IGFub3RoZXJcbiAgICAgICAgLy8gY2hvaWNlLlxuICAgICAgICBpZiAoIShlcnIgaW5zdGFuY2VvZiBNYXRjaC5FcnJvcikpXG4gICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBYWFggdGhpcyBlcnJvciBpcyB0ZXJyaWJsZVxuICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkZhaWxlZCBNYXRjaC5PbmVPZiBvciBNYXRjaC5PcHRpb25hbCB2YWxpZGF0aW9uXCIpO1xuICB9XG5cbiAgLy8gQSBmdW5jdGlvbiB0aGF0IGlzbid0IHNvbWV0aGluZyB3ZSBzcGVjaWFsLWNhc2UgaXMgYXNzdW1lZCB0byBiZSBhXG4gIC8vIGNvbnN0cnVjdG9yLlxuICBpZiAocGF0dGVybiBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgcGF0dGVybilcbiAgICAgIHJldHVybjtcbiAgICAvLyBYWFggd2hhdCBpZiAubmFtZSBpc24ndCBkZWZpbmVkXG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgXCIgKyBwYXR0ZXJuLmNvbnN0cnVjdG9yLm5hbWUpO1xuICB9XG5cbiAgdmFyIHVua25vd25LZXlzQWxsb3dlZCA9IGZhbHNlO1xuICBpZiAocGF0dGVybiBpbnN0YW5jZW9mIE9iamVjdEluY2x1ZGluZykge1xuICAgIHVua25vd25LZXlzQWxsb3dlZCA9IHRydWU7XG4gICAgcGF0dGVybiA9IHBhdHRlcm4ucGF0dGVybjtcbiAgfVxuXG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgT2JqZWN0SGFzaCkge1xuICAgIHZhciBrZXlQYXR0ZXJuID0gcGF0dGVybi5wYXR0ZXJuO1xuICAgIHZhciBlbXB0eUhhc2ggPSB0cnVlO1xuICAgIGZvciAodmFyIGtleSBpbiB2YWx1ZSkge1xuICAgICAgZW1wdHlIYXNoID0gZmFsc2U7XG4gICAgICBjaGVjayh2YWx1ZVtrZXldLCBrZXlQYXR0ZXJuKTtcbiAgICB9XG4gICAgaWYgKGVtcHR5SGFzaClcbiAgICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIFwiICsgcGF0dGVybi5jb25zdHJ1Y3Rvci5uYW1lKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAocGF0dGVybiBpbnN0YW5jZW9mIFN1YmNsYXNzKSB7XG4gICAgdmFyIFN1cGVyY2xhc3MgPSBwYXR0ZXJuLlN1cGVyY2xhc3M7XG4gICAgaWYgKHBhdHRlcm4ubWF0Y2hTdXBlcmNsYXNzICYmIHZhbHVlID09IFN1cGVyY2xhc3MpIFxuICAgICAgcmV0dXJuO1xuICAgIGlmICghICh2YWx1ZS5wcm90b3R5cGUgaW5zdGFuY2VvZiBTdXBlcmNsYXNzKSlcbiAgICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIFwiICsgcGF0dGVybi5jb25zdHJ1Y3Rvci5uYW1lICsgXCIgb2YgXCIgKyBTdXBlcmNsYXNzLm5hbWUpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmICh0eXBlb2YgcGF0dGVybiAhPT0gXCJvYmplY3RcIilcbiAgICB0aHJvdyBFcnJvcihcIkJhZCBwYXR0ZXJuOiB1bmtub3duIHBhdHRlcm4gdHlwZVwiKTtcblxuICAvLyBBbiBvYmplY3QsIHdpdGggcmVxdWlyZWQgYW5kIG9wdGlvbmFsIGtleXMuIE5vdGUgdGhhdCB0aGlzIGRvZXMgTk9UIGRvXG4gIC8vIHN0cnVjdHVyYWwgbWF0Y2hlcyBhZ2FpbnN0IG9iamVjdHMgb2Ygc3BlY2lhbCB0eXBlcyB0aGF0IGhhcHBlbiB0byBtYXRjaFxuICAvLyB0aGUgcGF0dGVybjogdGhpcyByZWFsbHkgbmVlZHMgdG8gYmUgYSBwbGFpbiBvbGQge09iamVjdH0hXG4gIGlmICh0eXBlb2YgdmFsdWUgIT09ICdvYmplY3QnKVxuICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIG9iamVjdCwgZ290IFwiICsgdHlwZW9mIHZhbHVlKTtcbiAgaWYgKHZhbHVlID09PSBudWxsKVxuICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIG9iamVjdCwgZ290IG51bGxcIik7XG5cbiAgdmFyIHJlcXVpcmVkUGF0dGVybnMgPSB7fTtcbiAgdmFyIG9wdGlvbmFsUGF0dGVybnMgPSB7fTtcblxuICBfLmVhY2hLZXkocGF0dGVybiwgZnVuY3Rpb24oc3ViUGF0dGVybiwga2V5KSB7XG4gICAgaWYgKHBhdHRlcm5ba2V5XSBpbnN0YW5jZW9mIE9wdGlvbmFsKVxuICAgICAgb3B0aW9uYWxQYXR0ZXJuc1trZXldID0gcGF0dGVybltrZXldLnBhdHRlcm47XG4gICAgZWxzZVxuICAgICAgcmVxdWlyZWRQYXR0ZXJuc1trZXldID0gcGF0dGVybltrZXldO1xuICB9LCB0aGlzLCB0cnVlKTtcblxuICBfLmVhY2hLZXkodmFsdWUsIGZ1bmN0aW9uKHN1YlZhbHVlLCBrZXkpIHtcbiAgICB2YXIgc3ViVmFsdWUgPSB2YWx1ZVtrZXldO1xuICAgIHRyeSB7XG4gICAgICBpZiAocmVxdWlyZWRQYXR0ZXJucy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgIGNoZWNrU3VidHJlZShzdWJWYWx1ZSwgcmVxdWlyZWRQYXR0ZXJuc1trZXldKTtcbiAgICAgICAgZGVsZXRlIHJlcXVpcmVkUGF0dGVybnNba2V5XTtcbiAgICAgIH0gZWxzZSBpZiAob3B0aW9uYWxQYXR0ZXJucy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgIGNoZWNrU3VidHJlZShzdWJWYWx1ZSwgb3B0aW9uYWxQYXR0ZXJuc1trZXldKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICghdW5rbm93bktleXNBbGxvd2VkKVxuICAgICAgICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIlVua25vd24ga2V5XCIpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgaWYgKGVyciBpbnN0YW5jZW9mIE1hdGNoLkVycm9yKVxuICAgICAgICBlcnIucGF0aCA9IF9wcmVwZW5kUGF0aChrZXksIGVyci5wYXRoKTtcbiAgICAgIHRocm93IGVycjtcbiAgICB9XG4gIH0sIHRoaXMsIHRydWUpO1xuXG4gIF8uZWFjaEtleShyZXF1aXJlZFBhdHRlcm5zLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiTWlzc2luZyBrZXkgJ1wiICsga2V5ICsgXCInXCIpO1xuICB9LCB0aGlzLCB0cnVlKTtcbn07XG5cblxudmFyIF9qc0tleXdvcmRzID0gW1wiZG9cIiwgXCJpZlwiLCBcImluXCIsIFwiZm9yXCIsIFwibGV0XCIsIFwibmV3XCIsIFwidHJ5XCIsIFwidmFyXCIsIFwiY2FzZVwiLFxuICBcImVsc2VcIiwgXCJlbnVtXCIsIFwiZXZhbFwiLCBcImZhbHNlXCIsIFwibnVsbFwiLCBcInRoaXNcIiwgXCJ0cnVlXCIsIFwidm9pZFwiLCBcIndpdGhcIixcbiAgXCJicmVha1wiLCBcImNhdGNoXCIsIFwiY2xhc3NcIiwgXCJjb25zdFwiLCBcInN1cGVyXCIsIFwidGhyb3dcIiwgXCJ3aGlsZVwiLCBcInlpZWxkXCIsXG4gIFwiZGVsZXRlXCIsIFwiZXhwb3J0XCIsIFwiaW1wb3J0XCIsIFwicHVibGljXCIsIFwicmV0dXJuXCIsIFwic3RhdGljXCIsIFwic3dpdGNoXCIsXG4gIFwidHlwZW9mXCIsIFwiZGVmYXVsdFwiLCBcImV4dGVuZHNcIiwgXCJmaW5hbGx5XCIsIFwicGFja2FnZVwiLCBcInByaXZhdGVcIiwgXCJjb250aW51ZVwiLFxuICBcImRlYnVnZ2VyXCIsIFwiZnVuY3Rpb25cIiwgXCJhcmd1bWVudHNcIiwgXCJpbnRlcmZhY2VcIiwgXCJwcm90ZWN0ZWRcIiwgXCJpbXBsZW1lbnRzXCIsXG4gIFwiaW5zdGFuY2VvZlwiXTtcblxuLy8gQXNzdW1lcyB0aGUgYmFzZSBvZiBwYXRoIGlzIGFscmVhZHkgZXNjYXBlZCBwcm9wZXJseVxuLy8gcmV0dXJucyBrZXkgKyBiYXNlXG5mdW5jdGlvbiBfcHJlcGVuZFBhdGgoa2V5LCBiYXNlKSB7XG4gIGlmICgodHlwZW9mIGtleSkgPT09IFwibnVtYmVyXCIgfHwga2V5Lm1hdGNoKC9eWzAtOV0rJC8pKVxuICAgIGtleSA9IFwiW1wiICsga2V5ICsgXCJdXCI7XG4gIGVsc2UgaWYgKCFrZXkubWF0Y2goL15bYS16XyRdWzAtOWEtel8kXSokL2kpIHx8IF9qc0tleXdvcmRzLmluZGV4T2Yoa2V5KSAhPSAtMSlcbiAgICBrZXkgPSBKU09OLnN0cmluZ2lmeShba2V5XSk7XG5cbiAgaWYgKGJhc2UgJiYgYmFzZVswXSAhPT0gXCJbXCIpXG4gICAgcmV0dXJuIGtleSArICcuJyArIGJhc2U7XG4gIHJldHVybiBrZXkgKyBiYXNlO1xufTtcblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpO1xuXG5cbi8vIG1vZHVsZSBleHBvcnRzIGVycm9yIGNsYXNzZXMgZm9yIGFsbCBuYW1lcyBkZWZpbmVkIGluIHRoaXMgYXJyYXlcbnZhciBlcnJvckNsYXNzTmFtZXMgPSBbJ0Fic3RyYWN0Q2xhc3MnLCAnTWl4aW4nLCAnTWVzc2VuZ2VyJywgJ0NvbXBvbmVudERhdGFTb3VyY2UnLFxuXHRcdFx0XHRcdCAgICdBdHRyaWJ1dGUnLCAnQmluZGVyJywgJ0xvYWRlcicsICdNYWlsTWVzc2FnZVNvdXJjZScsICdGYWNldCddO1xuXG52YXIgZXJyb3IgPSB7XG5cdHRvQmVJbXBsZW1lbnRlZDogdG9CZUltcGxlbWVudGVkLFxuXHRjcmVhdGVDbGFzczogY3JlYXRlRXJyb3JDbGFzc1xufTtcblxuZXJyb3JDbGFzc05hbWVzLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuXHRlcnJvcltuYW1lXSA9IGNyZWF0ZUVycm9yQ2xhc3MobmFtZSArICdFcnJvcicpO1xufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gZXJyb3I7XG5cblxuZnVuY3Rpb24gY3JlYXRlRXJyb3JDbGFzcyhlcnJvckNsYXNzTmFtZSkge1xuXHR2YXIgRXJyb3JDbGFzcztcblx0ZXZhbCgnRXJyb3JDbGFzcyA9IGZ1bmN0aW9uICcgKyBlcnJvckNsYXNzTmFtZSArICcobWVzc2FnZSkgeyBcXFxuXHRcdFx0dGhpcy5uYW1lID0gXCInICsgZXJyb3JDbGFzc05hbWUgKyAnXCI7IFxcXG5cdFx0XHR0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlIHx8IFwiVGhlcmUgd2FzIGFuIGVycm9yXCI7IFxcXG5cdFx0fScpO1xuXHRfLm1ha2VTdWJjbGFzcyhFcnJvckNsYXNzLCBFcnJvcik7XG5cblx0cmV0dXJuIEVycm9yQ2xhc3M7XG59XG5cblxuZnVuY3Rpb24gdG9CZUltcGxlbWVudGVkKCkge1xuXHR0aHJvdyBuZXcgZXJyb3IuQWJzdHJhY3RDbGFzcygnY2FsbGluZyB0aGUgbWV0aG9kIG9mIGFuIGFic2N0cmFjdCBjbGFzcyBNZXNzYWdlU291cmNlJyk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlsID0ge1xuXHRsb2dnZXI6IHJlcXVpcmUoJy4vbG9nZ2VyJyksXG5cdHJlcXVlc3Q6IHJlcXVpcmUoJy4vcmVxdWVzdCcpLFxuXHRjaGVjazogcmVxdWlyZSgnLi9jaGVjaycpLFxuXHRlcnJvcjogcmVxdWlyZSgnLi9lcnJvcicpXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHV0aWw7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBMb2dnZXIgPSByZXF1aXJlKCcuL2xvZ2dlcl9jbGFzcycpO1xuXG52YXIgbG9nZ2VyID0gbmV3IExvZ2dlcih7IGxldmVsOiAzIH0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGxvZ2dlcjtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKTtcblxuXG4vKipcbiAqIExvZyBsZXZlbHMuXG4gKi9cblxudmFyIGxldmVscyA9IFtcbiAgICAnZXJyb3InLFxuICAgICd3YXJuJyxcbiAgICAnaW5mbycsXG4gICAgJ2RlYnVnJ1xuXTtcblxudmFyIG1heExldmVsTGVuZ3RoID0gTWF0aC5tYXguYXBwbHkoTWF0aCwgbGV2ZWxzLm1hcChmdW5jdGlvbihsZXZlbCkgeyByZXR1cm4gbGV2ZWwubGVuZ3RoOyB9KSk7XG5cbi8qKlxuICogQ29sb3JzIGZvciBsb2cgbGV2ZWxzLlxuICovXG5cbnZhciBjb2xvcnMgPSBbXG4gICAgMzEsXG4gICAgMzMsXG4gICAgMzYsXG4gICAgOTBcbl07XG5cbi8qKlxuICogUGFkcyB0aGUgbmljZSBvdXRwdXQgdG8gdGhlIGxvbmdlc3QgbG9nIGxldmVsLlxuICovXG5cbmZ1bmN0aW9uIHBhZCAoc3RyKSB7XG4gICAgaWYgKHN0ci5sZW5ndGggPCBtYXhMZXZlbExlbmd0aClcbiAgICAgICAgcmV0dXJuIHN0ciArIG5ldyBBcnJheShtYXhMZXZlbExlbmd0aCAtIHN0ci5sZW5ndGggKyAxKS5qb2luKCcgJyk7XG5cbiAgICByZXR1cm4gc3RyO1xufTtcblxuLyoqXG4gKiBMb2dnZXIgKGNvbnNvbGUpLlxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cblxudmFyIExvZ2dlciA9IGZ1bmN0aW9uIChvcHRzKSB7XG4gICAgb3B0cyA9IG9wdHMgfHwge31cbiAgICB0aGlzLmNvbG9ycyA9IG9wdHMuY29sb3JzO1xuICAgIHRoaXMubGV2ZWwgPSBvcHRzLmxldmVsIHx8IDM7XG4gICAgdGhpcy5lbmFibGVkID0gb3B0cy5lbmFibGVkIHx8IHRydWU7XG4gICAgdGhpcy5sb2dQcmVmaXggPSBvcHRzLmxvZ1ByZWZpeCB8fCAnJztcbiAgICB0aGlzLmxvZ1ByZWZpeENvbG9yID0gb3B0cy5sb2dQcmVmaXhDb2xvcjtcbn07XG5cblxuLyoqXG4gKiBMb2cgbWV0aG9kLlxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuTG9nZ2VyLnByb3RvdHlwZS5sb2cgPSBmdW5jdGlvbiAodHlwZSkge1xuICAgIHZhciBpbmRleCA9IGxldmVscy5pbmRleE9mKHR5cGUpO1xuXG4gICAgaWYgKGluZGV4ID4gdGhpcy5sZXZlbCB8fCAhIHRoaXMuZW5hYmxlZClcbiAgICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICBjb25zb2xlLmxvZy5hcHBseShcbiAgICAgICAgICBjb25zb2xlXG4gICAgICAgICwgW3RoaXMubG9nUHJlZml4Q29sb3JcbiAgICAgICAgICAgICA/ICcgICBcXHgxQlsnICsgdGhpcy5sb2dQcmVmaXhDb2xvciArICdtJyArIHRoaXMubG9nUHJlZml4ICsgJyAgLVxceDFCWzM5bSdcbiAgICAgICAgICAgICA6IHRoaXMubG9nUHJlZml4XG4gICAgICAgICAgLHRoaXMuY29sb3JzXG4gICAgICAgICAgICAgPyAnIFxceDFCWycgKyBjb2xvcnNbaW5kZXhdICsgJ20nICsgcGFkKHR5cGUpICsgJyAtXFx4MUJbMzltJ1xuICAgICAgICAgICAgIDogdHlwZSArICc6J1xuICAgICAgICAgIF0uY29uY2F0KF8udG9BcnJheShhcmd1bWVudHMpLnNsaWNlKDEpKVxuICAgICk7XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogR2VuZXJhdGUgbWV0aG9kcy5cbiAqL1xuXG5sZXZlbHMuZm9yRWFjaChmdW5jdGlvbiAobmFtZSkge1xuICAgIExvZ2dlci5wcm90b3R5cGVbbmFtZV0gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMubG9nLmFwcGx5KHRoaXMsIFtuYW1lXS5jb25jYXQoXy50b0FycmF5KGFyZ3VtZW50cykpKTtcbiAgICB9O1xufSk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBMb2dnZXI7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgnbW9sLXByb3RvJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gcmVxdWVzdDtcblxuXG4vLyBUT0RPIGFkZCBlcnJvciBzdGF0dXNlc1xudmFyIG9rU3RhdHVzZXMgPSBbJzIwMCcsICczMDQnXTtcblxuXG5mdW5jdGlvbiByZXF1ZXN0KHVybCwgb3B0cywgY2FsbGJhY2spIHtcblx0dmFyIHJlcSA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXHRyZXEub3BlbihvcHRzLm1ldGhvZCwgdXJsLCB0cnVlKTsgLy8gd2hhdCB0cnVlIG1lYW5zP1xuXHRyZXEub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24gKCkge1xuXHRcdGlmIChyZXEucmVhZHlTdGF0ZSA9PSA0ICYmIHJlcS5zdGF0dXNUZXh0LnRvVXBwZXJDYXNlKCkgPT0gJ09LJyApXG5cdFx0XHRjYWxsYmFjayhudWxsLCByZXEucmVzcG9uc2VUZXh0LCByZXEpO1xuXHRcdC8vIGVsc2Vcblx0XHQvLyBcdGNhbGxiYWNrKHJlcS5zdGF0dXMsIHJlcS5yZXNwb25zZVRleHQsIHJlcSk7XG5cdH07XG5cdHJlcS5zZW5kKG51bGwpO1xufVxuXG5fLmV4dGVuZChyZXF1ZXN0LCB7XG5cdGdldDogZ2V0XG59KTtcblxuXG5mdW5jdGlvbiBnZXQodXJsLCBjYWxsYmFjaykge1xuXHRyZXF1ZXN0KHVybCwgeyBtZXRob2Q6ICdHRVQnIH0sIGNhbGxiYWNrKTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIF87XG52YXIgcHJvdG8gPSBfID0ge1xuXHRleHRlbmRQcm90bzogZXh0ZW5kUHJvdG8sXG5cdGNyZWF0ZVN1YmNsYXNzOiBjcmVhdGVTdWJjbGFzcyxcblx0bWFrZVN1YmNsYXNzOiBtYWtlU3ViY2xhc3MsXG5cdGV4dGVuZDogZXh0ZW5kLFxuXHRjbG9uZTogY2xvbmUsXG5cdGRlZXBFeHRlbmQ6IGRlZXBFeHRlbmQsXG5cdGFsbEtleXM6IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzLmJpbmQoT2JqZWN0KSxcblx0a2V5T2Y6IGtleU9mLFxuXHRhbGxLZXlzT2Y6IGFsbEtleXNPZixcblx0ZWFjaEtleTogZWFjaEtleSxcblx0bWFwS2V5czogbWFwS2V5cyxcblx0YXBwZW5kQXJyYXk6IGFwcGVuZEFycmF5LFxuXHRwcmVwZW5kQXJyYXk6IHByZXBlbmRBcnJheSxcblx0dG9BcnJheTogdG9BcnJheSxcblx0Zmlyc3RVcHBlckNhc2U6IGZpcnN0VXBwZXJDYXNlLFxuXHRmaXJzdExvd2VyQ2FzZTogZmlyc3RMb3dlckNhc2Vcbn07XG5cblxuaWYgKHR5cGVvZiB3aW5kb3cgPT0gJ29iamVjdCcpIHtcblx0Ly8gcHJlc2VydmUgZXhpc3RpbmcgXyBvYmplY3Rcblx0aWYgKHdpbmRvdy5fKVxuXHRcdHByb3RvLnVuZGVyc2NvcmUgPSB3aW5kb3cuX1xuXG5cdC8vIGV4cG9zZSBnbG9iYWwgX1xuXHR3aW5kb3cuXyA9IHByb3RvO1xufVxuXG5pZiAodHlwZW9mIG1vZHVsZSA9PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cylcblx0Ly8gZXhwb3J0IGZvciBub2RlL2Jyb3dzZXJpZnlcblx0bW9kdWxlLmV4cG9ydHMgPSBwcm90bztcblx0XG5cbmZ1bmN0aW9uIGV4dGVuZFByb3RvKHNlbGYsIG1ldGhvZHMpIHtcblx0dmFyIHByb3BEZXNjcmlwdG9ycyA9IHt9O1xuXG5cdF8uZWFjaEtleShtZXRob2RzLCBmdW5jdGlvbihtZXRob2QsIG5hbWUpIHtcblx0XHRwcm9wRGVzY3JpcHRvcnNbbmFtZV0gPSB7XG5cdFx0XHRlbnVtZXJhYmxlOiBmYWxzZSxcblx0XHRcdGNvbmZpZ3VyYWJsZTogZmFsc2UsXG5cdFx0XHR3cml0YWJsZTogZmFsc2UsXG5cdFx0XHR2YWx1ZTogbWV0aG9kXG5cdFx0fTtcblx0fSk7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnRpZXMoc2VsZi5wcm90b3R5cGUsIHByb3BEZXNjcmlwdG9ycyk7XG5cdHJldHVybiBzZWxmO1xufVxuXG5cbmZ1bmN0aW9uIGV4dGVuZChzZWxmLCBvYmosIG9ubHlFbnVtZXJhYmxlKSB7XG5cdHZhciBwcm9wRGVzY3JpcHRvcnMgPSB7fTtcblxuXHRfLmVhY2hLZXkob2JqLCBmdW5jdGlvbih2YWx1ZSwgcHJvcCkge1xuXHRcdHZhciBkZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmosIHByb3ApO1xuXHRcdHByb3BEZXNjcmlwdG9yc1twcm9wXSA9IGRlc2NyaXB0b3I7XG5cdH0sIHRoaXMsIG9ubHlFbnVtZXJhYmxlKTtcblxuXHRPYmplY3QuZGVmaW5lUHJvcGVydGllcyhzZWxmLCBwcm9wRGVzY3JpcHRvcnMpO1xuXG5cdHJldHVybiBzZWxmO1xufVxuXG5cbmZ1bmN0aW9uIGRlZXBFeHRlbmQoc2VsZiwgb2JqLCBvbmx5RW51bWVyYWJsZSkge1xuXHRyZXR1cm4gX2V4dGVuZFRyZWUoc2VsZiwgb2JqLCBvbmx5RW51bWVyYWJsZSwgW10pO1xufVxuXG5cbmZ1bmN0aW9uIF9leHRlbmRUcmVlKHNlbGZOb2RlLCBvYmpOb2RlLCBvbmx5RW51bWVyYWJsZSwgb2JqVHJhdmVyc2VkKSB7XG5cdGlmIChvYmpUcmF2ZXJzZWQuaW5kZXhPZihvYmpOb2RlKSA+PSAwKSByZXR1cm47IC8vIG5vZGUgYWxyZWFkeSB0cmF2ZXJzZWRcblx0b2JqVHJhdmVyc2VkLnB1c2gob2JqTm9kZSk7XG5cblx0Xy5lYWNoS2V5KG9iak5vZGUsIGZ1bmN0aW9uKHZhbHVlLCBwcm9wKSB7XG5cdFx0dmFyIGRlc2NyaXB0b3IgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG9iak5vZGUsIHByb3ApO1xuXHRcdGlmICh0eXBlb2YgdmFsdWUgPT0gJ29iamVjdCcpIHtcblx0XHRcdGlmIChzZWxmTm9kZS5oYXNPd25Qcm9wZXJ0eShwcm9wKSAmJiB0eXBlb2Ygc2VsZk5vZGVbcHJvcF0gPT0gJ29iamVjdCcpXG5cdFx0XHRcdF9leHRlbmRUcmVlKHNlbGZOb2RlW3Byb3BdLCB2YWx1ZSwgb25seUVudW1lcmFibGUsIG9ialRyYXZlcnNlZClcblx0XHRcdGVsc2Vcblx0XHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHNlbGZOb2RlLCBwcm9wLCBkZXNjcmlwdG9yKTtcblx0XHR9IGVsc2Vcblx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShzZWxmTm9kZSwgcHJvcCwgZGVzY3JpcHRvcik7XG5cdH0sIHRoaXMsIG9ubHlFbnVtZXJhYmxlKTtcblxuXHRyZXR1cm4gc2VsZk5vZGU7XG59XG5cblxuZnVuY3Rpb24gY2xvbmUob2JqKSB7XG5cdHZhciBjbG9uZWRPYmplY3QgPSBPYmplY3QuY3JlYXRlKG9iai5jb25zdHJ1Y3Rvci5wcm90b3R5cGUpO1xuXHRfLmV4dGVuZChjbG9uZWRPYmplY3QsIG9iaik7XG5cdHJldHVybiBjbG9uZWRPYmplY3Q7XG59XG5cblxuZnVuY3Rpb24gY3JlYXRlU3ViY2xhc3ModGhpc0NsYXNzLCBuYW1lLCBhcHBseUNvbnN0cnVjdG9yKSB7XG5cdHZhciBzdWJjbGFzcztcblxuXHQvLyBuYW1lIGlzIG9wdGlvbmFsXG5cdG5hbWUgPSBuYW1lIHx8ICcnO1xuXG5cdC8vIGFwcGx5IHN1cGVyY2xhc3MgY29uc3RydWN0b3Jcblx0dmFyIGNvbnN0cnVjdG9yQ29kZSA9IGFwcGx5Q29uc3RydWN0b3IgPT09IGZhbHNlXG5cdFx0XHQ/ICcnXG5cdFx0XHQ6ICd0aGlzQ2xhc3MuYXBwbHkodGhpcywgYXJndW1lbnRzKTsnO1xuXG5cdGV2YWwoJ3N1YmNsYXNzID0gZnVuY3Rpb24gJyArIG5hbWUgKyAnKCl7ICcgKyBjb25zdHJ1Y3RvckNvZGUgKyAnIH0nKTtcblxuXHRfLm1ha2VTdWJjbGFzcyhzdWJjbGFzcywgdGhpc0NsYXNzKTtcblxuXHQvLyBjb3B5IGNsYXNzIG1ldGhvZHNcblx0Ly8gLSBmb3IgdGhlbSB0byB3b3JrIGNvcnJlY3RseSB0aGV5IHNob3VsZCBub3QgZXhwbGljdGx5IHVzZSBzdXBlcmNsYXNzIG5hbWVcblx0Ly8gYW5kIHVzZSBcInRoaXNcIiBpbnN0ZWFkXG5cdF8uZXh0ZW5kKHN1YmNsYXNzLCB0aGlzQ2xhc3MsIHRydWUpO1xuXG5cdHJldHVybiBzdWJjbGFzcztcbn1cblxuXG5mdW5jdGlvbiBtYWtlU3ViY2xhc3ModGhpc0NsYXNzLCBTdXBlcmNsYXNzKSB7XG5cdC8vIHByb3RvdHlwZSBjaGFpblxuXHR0aGlzQ2xhc3MucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShTdXBlcmNsYXNzLnByb3RvdHlwZSk7XG5cdFxuXHQvLyBzdWJjbGFzcyBpZGVudGl0eVxuXHRfLmV4dGVuZFByb3RvKHRoaXNDbGFzcywge1xuXHRcdGNvbnN0cnVjdG9yOiB0aGlzQ2xhc3Ncblx0fSk7XG5cdHJldHVybiB0aGlzQ2xhc3M7XG59XG5cblxuZnVuY3Rpb24ga2V5T2Yoc2VsZiwgc2VhcmNoRWxlbWVudCwgb25seUVudW1lcmFibGUpIHtcblx0dmFyIHByb3BlcnRpZXMgPSBvbmx5RW51bWVyYWJsZSBcblx0XHRcdFx0XHRcdD8gT2JqZWN0LmtleXMoc2VsZilcblx0XHRcdFx0XHRcdDogXy5hbGxLZXlzKHNlbGYpO1xuXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgcHJvcGVydGllcy5sZW5ndGg7IGkrKylcblx0XHRpZiAoc2VhcmNoRWxlbWVudCA9PT0gc2VsZltwcm9wZXJ0aWVzW2ldXSlcblx0XHRcdHJldHVybiBwcm9wZXJ0aWVzW2ldO1xuXHRcblx0cmV0dXJuIHVuZGVmaW5lZDtcbn1cblxuXG5mdW5jdGlvbiBhbGxLZXlzT2Yoc2VsZiwgc2VhcmNoRWxlbWVudCwgb25seUVudW1lcmFibGUpIHtcblx0dmFyIHByb3BlcnRpZXMgPSBvbmx5RW51bWVyYWJsZSBcblx0XHRcdFx0XHRcdD8gT2JqZWN0LmtleXMoc2VsZilcblx0XHRcdFx0XHRcdDogXy5hbGxLZXlzKHNlbGYpO1xuXG5cdHZhciBrZXlzID0gcHJvcGVydGllcy5maWx0ZXIoZnVuY3Rpb24ocHJvcCkge1xuXHRcdHJldHVybiBzZWFyY2hFbGVtZW50ID09PSBzZWxmW3Byb3BdO1xuXHR9KTtcblxuXHRyZXR1cm4ga2V5cztcbn1cblxuXG5mdW5jdGlvbiBlYWNoS2V5KHNlbGYsIGNhbGxiYWNrLCB0aGlzQXJnLCBvbmx5RW51bWVyYWJsZSkge1xuXHR2YXIgcHJvcGVydGllcyA9IG9ubHlFbnVtZXJhYmxlIFxuXHRcdFx0XHRcdFx0PyBPYmplY3Qua2V5cyhzZWxmKVxuXHRcdFx0XHRcdFx0OiBfLmFsbEtleXMoc2VsZik7XG5cblx0cHJvcGVydGllcy5mb3JFYWNoKGZ1bmN0aW9uKHByb3ApIHtcblx0XHRjYWxsYmFjay5jYWxsKHRoaXNBcmcsIHNlbGZbcHJvcF0sIHByb3AsIHNlbGYpO1xuXHR9KTtcbn1cblxuXG5mdW5jdGlvbiBtYXBLZXlzKHNlbGYsIGNhbGxiYWNrLCB0aGlzQXJnLCBvbmx5RW51bWVyYWJsZSkge1xuXHR2YXIgbWFwUmVzdWx0ID0ge307XG5cdF8uZWFjaEtleShzZWxmLCBtYXBQcm9wZXJ0eSwgdGhpc0FyZywgb25seUVudW1lcmFibGUpO1xuXHRyZXR1cm4gbWFwUmVzdWx0O1xuXG5cdGZ1bmN0aW9uIG1hcFByb3BlcnR5KHZhbHVlLCBrZXkpIHtcblx0XHR2YXIgZGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Ioc2VsZiwga2V5KTtcblx0XHRpZiAoZGVzY3JpcHRvci5lbnVtZXJhYmxlIHx8ICEgb25seUVudW1lcmFibGUpIHtcblx0XHRcdGRlc2NyaXB0b3IudmFsdWUgPSBjYWxsYmFjay5jYWxsKHRoaXMsIHZhbHVlLCBrZXksIHNlbGYpO1xuXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KG1hcFJlc3VsdCwga2V5LCBkZXNjcmlwdG9yKTtcblx0XHR9XG5cdH1cbn1cblxuXG5mdW5jdGlvbiBhcHBlbmRBcnJheShzZWxmLCBhcnJheVRvQXBwZW5kKSB7XG5cdGlmICghIGFycmF5VG9BcHBlbmQubGVuZ3RoKSByZXR1cm4gc2VsZjtcblxuICAgIHZhciBhcmdzID0gW3NlbGYubGVuZ3RoLCAwXS5jb25jYXQoYXJyYXlUb0FwcGVuZCk7XG4gICAgQXJyYXkucHJvdG90eXBlLnNwbGljZS5hcHBseShzZWxmLCBhcmdzKTtcblxuICAgIHJldHVybiBzZWxmO1xufVxuXG5cbmZ1bmN0aW9uIHByZXBlbmRBcnJheShzZWxmLCBhcnJheVRvUHJlcGVuZCkge1xuXHRpZiAoISBhcnJheVRvUHJlcGVuZC5sZW5ndGgpIHJldHVybiBzZWxmO1xuXG4gICAgdmFyIGFyZ3MgPSBbMCwgMF0uY29uY2F0KGFycmF5VG9QcmVwZW5kKTtcbiAgICBBcnJheS5wcm90b3R5cGUuc3BsaWNlLmFwcGx5KHNlbGYsIGFyZ3MpO1xuXG4gICAgcmV0dXJuIHNlbGY7XG59XG5cblxuZnVuY3Rpb24gdG9BcnJheShhcnJheUxpa2UpIHtcblx0dmFyIGFyciA9IFtdO1xuXHRBcnJheS5wcm90b3R5cGUuZm9yRWFjaC5jYWxsKGFycmF5TGlrZSwgZnVuY3Rpb24oaXRlbSkge1xuXHRcdGFyci5wdXNoKGl0ZW0pXG5cdH0pO1xuXG5cdHJldHVybiBhcnI7XG59XG5cblxuZnVuY3Rpb24gZmlyc3RVcHBlckNhc2Uoc3RyKSB7XG5cdHJldHVybiBzdHJbMF0udG9VcHBlckNhc2UoKSArIHN0ci5zbGljZSgxKTtcbn1cblxuXG5mdW5jdGlvbiBmaXJzdExvd2VyQ2FzZShzdHIpIHtcblx0cmV0dXJuIHN0clswXS50b0xvd2VyQ2FzZSgpICsgc3RyLnNsaWNlKDEpO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5kZXNjcmliZSgnbWlsbyBiaW5kZXInLCBmdW5jdGlvbigpIHtcbiAgICBpdCgnc2hvdWxkIGJpbmQgY29tcG9uZW50cyBiYXNlZCBvbiBtbC1iaW5kIGF0dHJpYnV0ZScsIGZ1bmN0aW9uKCkge1xuICAgIFx0dmFyIG1pbG8gPSByZXF1aXJlKCcuLi8uLi9saWIvbWlsbycpO1xuXG5cdFx0ZXhwZWN0KHtwOiAxfSkucHJvcGVydHkoJ3AnLCAxKTtcblxuICAgIFx0dmFyIGN0cmwgPSBtaWxvLmJpbmRlcigpO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKGN0cmwpO1xuXG4gICAgXHRjdHJsLmFydGljbGVCdXR0b24uZXZlbnRzLm9uKCdjbGljayBtb3VzZWVudGVyJywgZnVuY3Rpb24oZVR5cGUsIGV2dCkge1xuICAgIFx0XHRjb25zb2xlLmxvZygnYnV0dG9uJywgZVR5cGUsIGV2dCk7XG4gICAgXHR9KTtcblxuICAgICAgICBjdHJsLm1haW4uZXZlbnRzLm9uKCdjbGljayBtb3VzZWVudGVyIGlucHV0IGtleXByZXNzJywgZnVuY3Rpb24oZVR5cGUsIGV2dCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2RpdicsIGVUeXBlLCBldnQpO1xuICAgICAgICB9KTtcblxuICAgIFx0Y3RybC5hcnRpY2xlSWRJbnB1dC5kYXRhLm9uKCdkYXRhY2hhbmdlZCcsIGxvZ0RhdGEpO1xuXG4gICAgXHRmdW5jdGlvbiBsb2dEYXRhKG1lc3NhZ2UsIGRhdGEpIHtcbiAgICBcdFx0Y29uc29sZS5sb2cobWVzc2FnZSwgZGF0YSk7XG4gICAgXHR9XG5cbiAgICAgICAgdmFyIG15VG1wbENvbXBzID0gY3RybC5teVRlbXBsYXRlLnRlbXBsYXRlXG4gICAgICAgICAgICAgICAgLnNldCgnPHAgbWwtYmluZD1cIjppbm5lclBhcmFcIj5JIGFtIHJlbmRlcmVkIGZyb20gdGVtcGxhdGU8L3A+JylcbiAgICAgICAgICAgICAgICAucmVuZGVyKClcbiAgICAgICAgICAgICAgICAuYmluZGVyKCk7XG5cbiAgICAgICAgXy5leHRlbmQoY3RybCwgbXlUbXBsQ29tcHMpOyAvLyBzaG91bGQgYmUgc29tZSBmdW5jdGlvbiB0byBhZGQgdG8gY29udHJvbGxlclxuXG4gICAgICAgIGN0cmwuaW5uZXJQYXJhLmVsLmlubmVySFRNTCArPSAnLCB0aGVuIGJvdW5kIGFuZCBjaGFuZ2VkIHZpYSBjb21wb25lbnQgaW5zaWRlIHRlbXBsYXRlJztcbiAgICB9KTtcbn0pO1xuIl19
;