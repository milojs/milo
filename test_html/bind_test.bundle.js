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

},{"../util/check":35,"../util/error":36,"mol-proto":41}],2:[function(require,module,exports){
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

},{"../util/check":35,"mol-proto":41}],3:[function(require,module,exports){
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

},{"../config":26,"../util/check":35,"../util/error":36,"./index":5,"mol-proto":41}],4:[function(require,module,exports){
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
},{"../config":26,"../util/error":36,"./index":5,"mol-proto":41}],5:[function(require,module,exports){
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

},{"../util/check":35,"../util/error":36,"mol-proto":41}],6:[function(require,module,exports){
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


},{"./attribute/a_bind":3,"./components/c_registry":24,"./mail":30,"./util/check":35,"./util/error":36,"mol-proto":41}],7:[function(require,module,exports){
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

},{"./abstract/registry":2,"./components/c_class":8,"./components/c_facet":9,"./components/c_facets/cf_registry":19,"./components/c_registry":24,"./facets/f_class":27}],8:[function(require,module,exports){
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

},{"../facets/f_object":28,"../messenger":32,"../util/check":35,"./c_facet":9,"./c_facets/cf_registry":19,"mol-proto":41}],9:[function(require,module,exports){
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

},{"../facets/f_class":27,"../messenger":32,"../util/error":36,"mol-proto":41}],10:[function(require,module,exports){
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

},{"../../binder":6,"../c_facet":9,"./cf_registry":19,"mol-proto":41}],11:[function(require,module,exports){
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

},{"../../messenger":32,"../c_facet":9,"../c_message_sources/component_data_source":20,"./cf_registry":19,"mol-proto":41}],12:[function(require,module,exports){
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


},{"../../binder":6,"../../util/check":35,"../c_facet":9,"./cf_registry":19,"mol-proto":41}],13:[function(require,module,exports){
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
	this._ondragend = this.config.ondragend;
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
		'dragstart drag': onDragging,
		'dragstart drag dragend': callConfiguredHandler
	});


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


	function onDragging(eventType, event) {
		if (targetInDragHandle(event)) {
			event.dataTransfer.setData('text/html', self.owner.el.outerHTML);
			event.dataTransfer.setData('x-application/milo-component', self.owner);
		} else
			event.preventDefault();
	}


	function callConfiguredHandler(eventType, event) {
		var handlerProperty = '_on' + eventType
			, handler = self[handlerProperty];
		if (handler)
			handler.call(self.owner, eventType, event);
	}


	function targetInDragHandle(event) {
		return ! self._dragHandle || self._dragHandle.contains(self._target);
	}
}

},{"../c_facet":9,"./cf_registry":19,"mol-proto":41}],14:[function(require,module,exports){
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
			handler.call(self.owner, eventType, event);
	}


	function onDragging(eventType, event) {
		var dataTypes = event.dataTransfer.types
		if (dataTypes.indexOf('text/html') >= 0
				|| dataTypes.indexOf('x-application/milo-component') >= 0)
			event.preventDefault();
	}
}
},{"../c_facet":9,"./cf_registry":19,"mol-proto":41}],15:[function(require,module,exports){
'use strict';

var ComponentFacet = require('../c_facet')
	, facetsRegistry = require('./cf_registry')

	, _ = require('mol-proto');


// generic drag handler, should be overridden
var Editable = _.createSubclass(ComponentFacet, 'Editable');

_.extendProto(Editable, {
	init: initEditableFacet,
	start: startEditableFacet,
	makeEditable: makeEditable,
	require: ['Events'] // TODO implement facet dependencies

	// _reattach: _reattachEventsOnElementChange
});

facetsRegistry.add(Editable);

module.exports = Editable;


function initEditableFacet() {
	ComponentFacet.prototype.init.apply(this, arguments);

	this._editable = typeof this.config.editable != 'undefined'
						? this.config.editable
						: true;

	this._editableOnClick = this.config.editableOnClick;

	this._oneditable = this.config.oneditable;
	this._onenterkey = this.config.onenterkey;
}


function makeEditable(editable) {
	this.owner.el.setAttribute('contenteditable', editable);
	if (editable && this._oneditable)
		this._oneditable.call(this.owner, 'editable')
}


function startEditableFacet() {
	if (this._editable)
		this.makeEditable(true);
	
	var eventsFacet = this.owner.events;
	eventsFacet.onEvents({
		'mousedown': onMouseDown,
		'blur': onBlur,
		'keypress': onKeyPress
	});

	var self = this;

	function callConfiguredHandler(eventType, event) {
		var handlerProperty = '_on' + eventType
			, handler = self[handlerProperty];
		if (handler)
			handler.call(self.owner, eventType, event);
	}

	function onMouseDown(eventType, event) {
		if (self._editableOnClick)
			self.makeEditable(true);
	}

	function onBlur(eventType, event) {
		if (self._editableOnClick)
			self.makeEditable(false);
	}

	function onKeyPress(eventType, event) {
		if (event.keyCode == 13 && self._onenterkey)
			self._onenterkey.call(self.owner, 'onenterkey', event);
	}
}

},{"../c_facet":9,"./cf_registry":19,"mol-proto":41}],16:[function(require,module,exports){
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

},{"../../messenger":32,"../c_facet":9,"../c_message_sources/dom_events_source":22,"./cf_registry":19,"mol-proto":41}],17:[function(require,module,exports){
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
},{"../../messenger":32,"../c_facet":9,"../c_message_sources/iframe_message_source":23,"./cf_registry":19,"mol-proto":41}],18:[function(require,module,exports){
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

},{"../../binder":6,"../../util/check":35,"../c_facet":9,"./cf_registry":19,"mol-proto":41}],19:[function(require,module,exports){
'use strict';

var ClassRegistry = require('../../abstract/registry')
	, ComponentFacet = require('../c_facet');

var facetsRegistry = new ClassRegistry(ComponentFacet);

facetsRegistry.add(ComponentFacet);

module.exports = facetsRegistry;

// TODO - refactor components registry test into a function
// that tests a registry with a given foundation class
// Make test for this registry based on this function
},{"../../abstract/registry":2,"../c_facet":9}],20:[function(require,module,exports){
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

},{"../../util/check":35,"../../util/error":36,"../c_class":8,"./dom_events_source":22,"mol-proto":41}],21:[function(require,module,exports){
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

},{"mol-proto":41}],22:[function(require,module,exports){
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
},{"../../messenger/message_source":33,"../../util/check":35,"../c_class":8,"./dom_events_constructors":21,"mol-proto":41}],23:[function(require,module,exports){
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

},{"../../messenger/message_source":33,"../../util/check":35,"mol-proto":41}],24:[function(require,module,exports){
'use strict';

var ClassRegistry = require('../abstract/registry')
	, Component = require('./c_class');

var componentsRegistry = new ClassRegistry(Component);

componentsRegistry.add(Component);

module.exports = componentsRegistry;

},{"../abstract/registry":2,"./c_class":8}],25:[function(require,module,exports){
'use strict';

var Component = require('../c_class')
	, componentsRegistry = require('../c_registry');


var View = Component.createComponentClass('View', ['container']);

componentsRegistry.add(View);

module.exports = View;

},{"../c_class":8,"../c_registry":24}],26:[function(require,module,exports){
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

},{"mol-proto":41}],27:[function(require,module,exports){
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

},{"mol-proto":41}],28:[function(require,module,exports){
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


},{"../util/check":35,"./f_class":27,"mol-proto":41}],29:[function(require,module,exports){
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

},{"./attribute/a_load":4,"./config":26,"./mail":30,"./util/error":36,"./util/logger":38,"./util/request":40}],30:[function(require,module,exports){
'use strict';

var Messenger = require('../messenger')
	, MailMessageSource = require('./mail_source');


var mailMsgSource = new MailMessageSource();

var miloMail = new Messenger(undefined, undefined, mailMsgSource);

module.exports = miloMail;

},{"../messenger":32,"./mail_source":31}],31:[function(require,module,exports){
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

},{"../components/c_message_sources/dom_events_constructors":21,"../messenger/message_source":33,"../util/check":35,"../util/error":36,"mol-proto":41}],32:[function(require,module,exports){
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

},{"../abstract/mixin":1,"../util/check":35,"../util/error":36,"./message_source":33,"mol-proto":41}],33:[function(require,module,exports){
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

},{"../abstract/mixin":1,"../util/error":36,"../util/logger":38,"mol-proto":41}],34:[function(require,module,exports){
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
require('./components/c_facets/Editable');

// used components
require('./components/classes/View');


// export for node/browserify
if (typeof module == 'object' && module.exports)	
	module.exports = milo;

// global milo for browser
if (typeof window == 'object')
	window.milo = milo;

},{"./binder":6,"./classes":7,"./components/c_facets/Container":10,"./components/c_facets/Data":11,"./components/c_facets/Dom":12,"./components/c_facets/Drag":13,"./components/c_facets/Drop":14,"./components/c_facets/Editable":15,"./components/c_facets/Events":16,"./components/c_facets/Frame":17,"./components/c_facets/Template":18,"./components/classes/View":25,"./config":26,"./loader":29,"./mail":30,"./util":37}],35:[function(require,module,exports){
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


},{"mol-proto":41}],36:[function(require,module,exports){
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

},{"mol-proto":41}],37:[function(require,module,exports){
'use strict';

var util = {
	logger: require('./logger'),
	request: require('./request'),
	check: require('./check'),
	error: require('./error')
};

module.exports = util;

},{"./check":35,"./error":36,"./logger":38,"./request":40}],38:[function(require,module,exports){
'use strict';

var Logger = require('./logger_class');

var logger = new Logger({ level: 3 });

module.exports = logger;

},{"./logger_class":39}],39:[function(require,module,exports){
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

},{"mol-proto":41}],40:[function(require,module,exports){
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

},{"mol-proto":41}],41:[function(require,module,exports){
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

},{}],42:[function(require,module,exports){
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

},{"../../lib/milo":34}]},{},[42])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2Fic3RyYWN0L21peGluLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9hYnN0cmFjdC9yZWdpc3RyeS5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvYXR0cmlidXRlL2FfYmluZC5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvYXR0cmlidXRlL2FfbG9hZC5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvYXR0cmlidXRlL2luZGV4LmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9iaW5kZXIuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NsYXNzZXMuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19jbGFzcy5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX2ZhY2V0LmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfZmFjZXRzL0NvbnRhaW5lci5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX2ZhY2V0cy9EYXRhLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfZmFjZXRzL0RvbS5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX2ZhY2V0cy9EcmFnLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfZmFjZXRzL0Ryb3AuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19mYWNldHMvRWRpdGFibGUuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19mYWNldHMvRXZlbnRzLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfZmFjZXRzL0ZyYW1lLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfZmFjZXRzL1RlbXBsYXRlLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfZmFjZXRzL2NmX3JlZ2lzdHJ5LmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfbWVzc2FnZV9zb3VyY2VzL2NvbXBvbmVudF9kYXRhX3NvdXJjZS5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX21lc3NhZ2Vfc291cmNlcy9kb21fZXZlbnRzX2NvbnN0cnVjdG9ycy5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX21lc3NhZ2Vfc291cmNlcy9kb21fZXZlbnRzX3NvdXJjZS5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX21lc3NhZ2Vfc291cmNlcy9pZnJhbWVfbWVzc2FnZV9zb3VyY2UuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19yZWdpc3RyeS5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jbGFzc2VzL1ZpZXcuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbmZpZy5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvZmFjZXRzL2ZfY2xhc3MuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2ZhY2V0cy9mX29iamVjdC5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvbG9hZGVyLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9tYWlsL2luZGV4LmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9tYWlsL21haWxfc291cmNlLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9tZXNzZW5nZXIvaW5kZXguanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL21lc3Nlbmdlci9tZXNzYWdlX3NvdXJjZS5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvbWlsby5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvdXRpbC9jaGVjay5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvdXRpbC9lcnJvci5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvdXRpbC9pbmRleC5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvdXRpbC9sb2dnZXIuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL3V0aWwvbG9nZ2VyX2NsYXNzLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi91dGlsL3JlcXVlc3QuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbm9kZV9tb2R1bGVzL21vbC1wcm90by9saWIvcHJvdG8uanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vdGVzdF9odG1sL2JpbmRfdGVzdC9iaW5kX3Rlc3QuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDblBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vdXRpbC9jaGVjaycpXG5cdCwgTWF0Y2ggPSBjaGVjay5NYXRjaFxuXHQsIE1peGluRXJyb3IgPSByZXF1aXJlKCcuLi91dGlsL2Vycm9yJykuTWl4aW47XG5cblxubW9kdWxlLmV4cG9ydHMgPSBNaXhpbjtcblxuLy8gYW4gYWJzdHJhY3QgY2xhc3MgZm9yIG1peGluIHBhdHRlcm4gLSBhZGRpbmcgcHJveHkgbWV0aG9kcyB0byBob3N0IG9iamVjdHNcbmZ1bmN0aW9uIE1peGluKGhvc3RPYmplY3QsIHByb3h5TWV0aG9kcyAvKiwgb3RoZXIgYXJncyAtIHBhc3NlZCB0byBpbml0IG1ldGhvZCAqLykge1xuXHQvLyBUT0RPIC0gbW9jZSBjaGVja3MgZnJvbSBNZXNzZW5nZXIgaGVyZVxuXHRjaGVjayhob3N0T2JqZWN0LCBNYXRjaC5PcHRpb25hbChPYmplY3QpKTtcblx0Y2hlY2socHJveHlNZXRob2RzLCBNYXRjaC5PcHRpb25hbChNYXRjaC5PYmplY3RIYXNoKFN0cmluZykpKTtcblxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ19ob3N0T2JqZWN0JywgeyB2YWx1ZTogaG9zdE9iamVjdCB9KTtcblx0aWYgKHByb3h5TWV0aG9kcylcblx0XHR0aGlzLl9jcmVhdGVQcm94eU1ldGhvZHMocHJveHlNZXRob2RzKTtcblxuXHQvLyBjYWxsaW5nIGluaXQgaWYgaXQgaXMgZGVmaW5lZCBpbiB0aGUgY2xhc3Ncblx0aWYgKHRoaXMuaW5pdClcblx0XHR0aGlzLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn1cblxuXy5leHRlbmRQcm90byhNaXhpbiwge1xuXHRfY3JlYXRlUHJveHlNZXRob2Q6IF9jcmVhdGVQcm94eU1ldGhvZCxcblx0X2NyZWF0ZVByb3h5TWV0aG9kczogX2NyZWF0ZVByb3h5TWV0aG9kc1xufSk7XG5cblxuZnVuY3Rpb24gX2NyZWF0ZVByb3h5TWV0aG9kKG1peGluTWV0aG9kTmFtZSwgcHJveHlNZXRob2ROYW1lKSB7XG5cdGlmICh0aGlzLl9ob3N0T2JqZWN0W3Byb3h5TWV0aG9kTmFtZV0pXG5cdFx0dGhyb3cgbmV3IE1peGluRXJyb3IoJ21ldGhvZCAnICsgcHJveHlNZXRob2ROYW1lICtcblx0XHRcdFx0XHRcdFx0XHQgJyBhbHJlYWR5IGRlZmluZWQgaW4gaG9zdCBvYmplY3QnKTtcblxuXHRjaGVjayh0aGlzW21peGluTWV0aG9kTmFtZV0sIEZ1bmN0aW9uKTtcblxuXHR2YXIgYm91bmRNZXRob2QgPSB0aGlzW21peGluTWV0aG9kTmFtZV0uYmluZCh0aGlzKTtcblxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcy5faG9zdE9iamVjdCwgcHJveHlNZXRob2ROYW1lLFxuXHRcdHsgdmFsdWU6IGJvdW5kTWV0aG9kIH0pO1xufVxuXG5cbmZ1bmN0aW9uIF9jcmVhdGVQcm94eU1ldGhvZHMocHJveHlNZXRob2RzKSB7XG5cdC8vIGNyZWF0aW5nIGFuZCBiaW5kaW5nIHByb3h5IG1ldGhvZHMgb24gdGhlIGhvc3Qgb2JqZWN0XG5cdF8uZWFjaEtleShwcm94eU1ldGhvZHMsIF9jcmVhdGVQcm94eU1ldGhvZCwgdGhpcyk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgnbW9sLXByb3RvJylcblx0LCBjaGVjayA9IHJlcXVpcmUoJy4uL3V0aWwvY2hlY2snKVxuXHQsIE1hdGNoID0gY2hlY2suTWF0Y2g7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2xhc3NSZWdpc3RyeTtcblxuZnVuY3Rpb24gQ2xhc3NSZWdpc3RyeSAoRm91bmRhdGlvbkNsYXNzKSB7XG5cdGlmIChGb3VuZGF0aW9uQ2xhc3MpXG5cdFx0dGhpcy5zZXRDbGFzcyhGb3VuZGF0aW9uQ2xhc3MpO1xuXG5cdC8vIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnX19yZWdpc3RlcmVkQ2xhc3NlcycsIHtcblx0Ly8gXHRcdGVudW1lcmFibGU6IGZhbHNlLFxuXHQvLyBcdFx0d3JpdGFibGU6IHRydWUsXG5cdC8vIFx0XHRjb25maWd1cmFibGU6IHRydWUsXG5cdC8vIFx0XHR2YWx1ZToge31cblx0Ly8gfSk7XG5cblx0dGhpcy5fX3JlZ2lzdGVyZWRDbGFzc2VzID0ge307XG59XG5cbl8uZXh0ZW5kUHJvdG8oQ2xhc3NSZWdpc3RyeSwge1xuXHRhZGQ6IHJlZ2lzdGVyQ2xhc3MsXG5cdGdldDogZ2V0Q2xhc3MsXG5cdHJlbW92ZTogdW5yZWdpc3RlckNsYXNzLFxuXHRjbGVhbjogdW5yZWdpc3RlckFsbENsYXNzZXMsXG5cdHNldENsYXNzOiBzZXRGb3VuZGF0aW9uQ2xhc3Ncbn0pO1xuXG5cbmZ1bmN0aW9uIHNldEZvdW5kYXRpb25DbGFzcyhGb3VuZGF0aW9uQ2xhc3MpIHtcblx0Y2hlY2soRm91bmRhdGlvbkNsYXNzLCBGdW5jdGlvbik7XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnRm91bmRhdGlvbkNsYXNzJywge1xuXHRcdGVudW1lcmFibGU6IHRydWUsXG5cdFx0dmFsdWU6IEZvdW5kYXRpb25DbGFzc1xuXHR9KTtcbn1cblxuZnVuY3Rpb24gcmVnaXN0ZXJDbGFzcyhhQ2xhc3MsIG5hbWUpIHtcblx0bmFtZSA9IG5hbWUgfHwgYUNsYXNzLm5hbWU7XG5cblx0Y2hlY2sobmFtZSwgU3RyaW5nLCAnY2xhc3MgbmFtZSBtdXN0IGJlIHN0cmluZycpO1xuXHRjaGVjayhuYW1lLCBNYXRjaC5XaGVyZShmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gdHlwZW9mIG5hbWUgPT0gJ3N0cmluZycgJiYgbmFtZSAhPSAnJztcblx0fSksICdjbGFzcyBuYW1lIG11c3QgYmUgc3RyaW5nJyk7XG5cdGlmICh0aGlzLkZvdW5kYXRpb25DbGFzcykge1xuXHRcdGlmIChhQ2xhc3MgIT0gdGhpcy5Gb3VuZGF0aW9uQ2xhc3MpXG5cdFx0XHRjaGVjayhhQ2xhc3MsIE1hdGNoLlN1YmNsYXNzKHRoaXMuRm91bmRhdGlvbkNsYXNzKSwgJ2NsYXNzIG11c3QgYmUgYSBzdWIoY2xhc3MpIG9mIGEgZm91bmRhdGlvbiBjbGFzcycpO1xuXHR9IGVsc2Vcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdmb3VuZGF0aW9uIGNsYXNzIG11c3QgYmUgc2V0IGJlZm9yZSBhZGRpbmcgY2xhc3NlcyB0byByZWdpc3RyeScpO1xuXG5cdGlmICh0aGlzLl9fcmVnaXN0ZXJlZENsYXNzZXNbbmFtZV0pXG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignaXMgYWxyZWFkeSByZWdpc3RlcmVkJyk7XG5cblx0dGhpcy5fX3JlZ2lzdGVyZWRDbGFzc2VzW25hbWVdID0gYUNsYXNzO1xufTtcblxuXG5mdW5jdGlvbiBnZXRDbGFzcyhuYW1lKSB7XG5cdGNoZWNrKG5hbWUsIFN0cmluZywgJ2NsYXNzIG5hbWUgbXVzdCBiZSBzdHJpbmcnKTtcblx0cmV0dXJuIHRoaXMuX19yZWdpc3RlcmVkQ2xhc3Nlc1tuYW1lXTtcbn07XG5cblxuZnVuY3Rpb24gdW5yZWdpc3RlckNsYXNzKG5hbWVPckNsYXNzKSB7XG5cdGNoZWNrKG5hbWVPckNsYXNzLCBNYXRjaC5PbmVPZihTdHJpbmcsIEZ1bmN0aW9uKSwgJ2NsYXNzIG9yIG5hbWUgbXVzdCBiZSBzdXBwbGllZCcpO1xuXG5cdHZhciBuYW1lID0gdHlwZW9mIG5hbWVPckNsYXNzID09ICdzdHJpbmcnXG5cdFx0XHRcdFx0XHQ/IG5hbWVPckNsYXNzXG5cdFx0XHRcdFx0XHQ6IG5hbWVPckNsYXNzLm5hbWU7XG5cdFx0XHRcdFx0XHRcblx0aWYgKCEgdGhpcy5fX3JlZ2lzdGVyZWRDbGFzc2VzW25hbWVdKVxuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ2NsYXNzIGlzIG5vdCByZWdpc3RlcmVkJyk7XG5cblx0ZGVsZXRlIHRoaXMuX19yZWdpc3RlcmVkQ2xhc3Nlc1tuYW1lXTtcbn07XG5cblxuZnVuY3Rpb24gdW5yZWdpc3RlckFsbENsYXNzZXMoKSB7XG5cdHRoaXMuX19yZWdpc3RlcmVkQ2xhc3NlcyA9IHt9O1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIEF0dHJpYnV0ZSA9IHJlcXVpcmUoJy4vaW5kZXgnKVxuXHQsIEF0dHJpYnV0ZUVycm9yID0gcmVxdWlyZSgnLi4vdXRpbC9lcnJvcicpLkF0dHJpYnV0ZVxuXHQsIGNvbmZpZyA9IHJlcXVpcmUoJy4uL2NvbmZpZycpXG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpXG5cdCwgY2hlY2sgPSByZXF1aXJlKCcuLi91dGlsL2NoZWNrJylcblx0LCBNYXRjaCA9IGNoZWNrLk1hdGNoO1xuXG5cbi8vIE1hdGNoZXM7XG4vLyA6bXlWaWV3IC0gb25seSBjb21wb25lbnQgbmFtZVxuLy8gVmlldzpteVZpZXcgLSBjbGFzcyBhbmQgY29tcG9uZW50IG5hbWVcbi8vIFtFdmVudHMsIERhdGFdOm15VmlldyAtIGZhY2V0cyBhbmQgY29tcG9uZW50IG5hbWVcbi8vIFZpZXdbRXZlbnRzXTpteVZpZXcgLSBjbGFzcywgZmFjZXQocykgYW5kIGNvbXBvbmVudCBuYW1lXG5cbnZhciBhdHRyUmVnRXhwPSAvXihbXlxcOlxcW1xcXV0qKSg/OlxcWyhbXlxcOlxcW1xcXV0qKVxcXSk/XFw6PyhbXjpdKikkL1xuXHQsIGZhY2V0c1NwbGl0UmVnRXhwID0gL1xccyooPzpcXCx8XFxzKVxccyovO1xuXG5cbnZhciBCaW5kQXR0cmlidXRlID0gXy5jcmVhdGVTdWJjbGFzcyhBdHRyaWJ1dGUsICdCaW5kQXR0cmlidXRlJywgdHJ1ZSk7XG5cbl8uZXh0ZW5kUHJvdG8oQmluZEF0dHJpYnV0ZSwge1xuXHRhdHRyTmFtZTogZ2V0QXR0cmlidXRlTmFtZSxcblx0cGFyc2U6IHBhcnNlQXR0cmlidXRlLFxuXHR2YWxpZGF0ZTogdmFsaWRhdGVBdHRyaWJ1dGVcbn0pO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gQmluZEF0dHJpYnV0ZTtcblxuXG5mdW5jdGlvbiBnZXRBdHRyaWJ1dGVOYW1lKCkge1xuXHRyZXR1cm4gY29uZmlnLmF0dHJzWydiaW5kJ107XG59XG5cblxuZnVuY3Rpb24gcGFyc2VBdHRyaWJ1dGUoKSB7XG5cdGlmICghIHRoaXMubm9kZSkgcmV0dXJuO1xuXG5cdHZhciB2YWx1ZSA9IHRoaXMuZ2V0KCk7XG5cblx0aWYgKHZhbHVlKVxuXHRcdHZhciBiaW5kVG8gPSB2YWx1ZS5tYXRjaChhdHRyUmVnRXhwKTtcblxuXHRpZiAoISBiaW5kVG8pXG5cdFx0dGhyb3cgbmV3IEF0dHJpYnV0ZUVycm9yKCdpbnZhbGlkIGJpbmQgYXR0cmlidXRlICcgKyB2YWx1ZSk7XG5cblx0dGhpcy5jb21wQ2xhc3MgPSBiaW5kVG9bMV0gfHwgJ0NvbXBvbmVudCc7XG5cdHRoaXMuY29tcEZhY2V0cyA9IChiaW5kVG9bMl0gJiYgYmluZFRvWzJdLnNwbGl0KGZhY2V0c1NwbGl0UmVnRXhwKSkgfHwgdW5kZWZpbmVkO1xuXHR0aGlzLmNvbXBOYW1lID0gYmluZFRvWzNdIHx8IHVuZGVmaW5lZDtcblxuXHRyZXR1cm4gdGhpcztcbn1cblxuXG5mdW5jdGlvbiB2YWxpZGF0ZUF0dHJpYnV0ZSgpIHtcblx0dmFyIGNvbXBOYW1lID0gdGhpcy5jb21wTmFtZTtcblx0Y2hlY2soY29tcE5hbWUsIE1hdGNoLldoZXJlKGZ1bmN0aW9uKCkge1xuICBcdFx0cmV0dXJuIHR5cGVvZiBjb21wTmFtZSA9PSAnc3RyaW5nJyAmJiBjb21wTmFtZSAhPSAnJztcblx0fSksICdlbXB0eSBjb21wb25lbnQgbmFtZScpO1xuXG5cdGlmICghIHRoaXMuY29tcENsYXNzKVxuXHRcdHRocm93IG5ldyBBdHRyaWJ1dGVFcnJvcignZW1wdHkgY29tcG9uZW50IGNsYXNzIG5hbWUgJyArIHRoaXMuY29tcENsYXNzKTtcblxuXHRyZXR1cm4gdGhpcztcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIEF0dHJpYnV0ZSA9IHJlcXVpcmUoJy4vaW5kZXgnKVxuXHQsIEF0dHJpYnV0ZUVycm9yID0gcmVxdWlyZSgnLi4vdXRpbC9lcnJvcicpLkF0dHJpYnV0ZVxuXHQsIGNvbmZpZyA9IHJlcXVpcmUoJy4uL2NvbmZpZycpXG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpO1xuXG5cbnZhciBMb2FkQXR0cmlidXRlID0gXy5jcmVhdGVTdWJjbGFzcyhBdHRyaWJ1dGUsICdMb2FkQXR0cmlidXRlJywgdHJ1ZSk7XG5cbl8uZXh0ZW5kUHJvdG8oTG9hZEF0dHJpYnV0ZSwge1xuXHRhdHRyTmFtZTogZ2V0QXR0cmlidXRlTmFtZSxcblx0cGFyc2U6IHBhcnNlQXR0cmlidXRlLFxuXHR2YWxpZGF0ZTogdmFsaWRhdGVBdHRyaWJ1dGVcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IExvYWRBdHRyaWJ1dGU7XG5cblxuZnVuY3Rpb24gZ2V0QXR0cmlidXRlTmFtZSgpIHtcblx0cmV0dXJuIGNvbmZpZy5hdHRycy5sb2FkO1xufVxuXG5cbmZ1bmN0aW9uIHBhcnNlQXR0cmlidXRlKCkge1xuXHRpZiAoISB0aGlzLm5vZGUpIHJldHVybjtcblxuXHR2YXIgdmFsdWUgPSB0aGlzLmdldCgpO1xuXG5cdHRoaXMubG9hZFVybCA9IHZhbHVlO1xuXG5cdHJldHVybiB0aGlzO1xufVxuXG5cbmZ1bmN0aW9uIHZhbGlkYXRlQXR0cmlidXRlKCkge1xuXHQvLyBUT0RPIHVybCB2YWxpZGF0aW9uXG5cblx0cmV0dXJuIHRoaXM7XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpXG5cdCwgY2hlY2sgPSByZXF1aXJlKCcuLi91dGlsL2NoZWNrJylcblx0LCBNYXRjaCA9IGNoZWNrLk1hdGNoXG5cdCwgdG9CZUltcGxlbWVudGVkID0gcmVxdWlyZSgnLi4vdXRpbC9lcnJvcicpLnRvQmVJbXBsZW1lbnRlZDtcblxuXG4vLyBhbiBhYnN0cmFjdCBhdHRyaWJ1dGUgY2xhc3MgZm9yIGF0dHJpYnV0ZSBwYXJzaW5nIGFuZCB2YWxpZGF0aW9uXG5cbm1vZHVsZS5leHBvcnRzID0gQXR0cmlidXRlO1xuXG5mdW5jdGlvbiBBdHRyaWJ1dGUoZWwsIG5hbWUpIHtcblx0dGhpcy5uYW1lID0gbmFtZSB8fCB0aGlzLmF0dHJOYW1lKCk7XG5cdHRoaXMuZWwgPSBlbDtcblx0dGhpcy5ub2RlID0gZWwuYXR0cmlidXRlc1t0aGlzLm5hbWVdO1xufVxuXG5fLmV4dGVuZFByb3RvKEF0dHJpYnV0ZSwge1xuXHRnZXQ6IGdldEF0dHJpYnV0ZVZhbHVlLFxuXHRzZXQ6IHNldEF0dHJpYnV0ZVZhbHVlLFxuXG5cdC8vIHNob3VsZCBiZSBkZWZpbmVkIGluIHN1YmNsYXNzXG5cdGF0dHJOYW1lOiB0b0JlSW1wbGVtZW50ZWQsXG5cdHBhcnNlOiB0b0JlSW1wbGVtZW50ZWQsXG5cdHZhbGlkYXRlOiB0b0JlSW1wbGVtZW50ZWQsXG59KTtcblxuXG5mdW5jdGlvbiBnZXRBdHRyaWJ1dGVWYWx1ZSgpIHtcblx0cmV0dXJuIHRoaXMuZWwuZ2V0QXR0cmlidXRlKHRoaXMubmFtZSk7XG59XG5cbmZ1bmN0aW9uIHNldEF0dHJpYnV0ZVZhbHVlKHZhbHVlKSB7XG5cdHRoaXMuZWwuc2V0QXR0cmlidXRlKHRoaXMubmFtZSwgdmFsdWUpO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgbWlsb01haWwgPSByZXF1aXJlKCcuL21haWwnKVxuXHQsIG1pbG9Db21wb25lbnRzUmVnaXN0cnkgPSByZXF1aXJlKCcuL2NvbXBvbmVudHMvY19yZWdpc3RyeScpXG5cdCwgQ29tcG9uZW50ID0gbWlsb0NvbXBvbmVudHNSZWdpc3RyeS5nZXQoJ0NvbXBvbmVudCcpXG5cdCwgQmluZEF0dHJpYnV0ZSA9IHJlcXVpcmUoJy4vYXR0cmlidXRlL2FfYmluZCcpXG5cdCwgQmluZGVyRXJyb3IgPSByZXF1aXJlKCcuL3V0aWwvZXJyb3InKS5CaW5kZXJcblx0LCBfID0gcmVxdWlyZSgnbW9sLXByb3RvJylcblx0LCBjaGVjayA9IHJlcXVpcmUoJy4vdXRpbC9jaGVjaycpXG5cdCwgTWF0Y2ggPSAgY2hlY2suTWF0Y2g7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBiaW5kZXI7XG5cblxuZnVuY3Rpb24gYmluZGVyKHNjb3BlRWwsIGNvbXBvbmVudHNSZWdpc3RyeSkge1xuXHR2YXIgY29tcG9uZW50c1JlZ2lzdHJ5ID0gY29tcG9uZW50c1JlZ2lzdHJ5IHx8IG1pbG9Db21wb25lbnRzUmVnaXN0cnlcblx0XHQsIHNjb3BlRWwgPSBzY29wZUVsIHx8IGRvY3VtZW50LmJvZHlcblx0XHQsIGNvbXBvbmVudHMgPSB7fTtcblxuXHRiaW5kRWxlbWVudChjb21wb25lbnRzLCBzY29wZUVsKTtcblx0cmV0dXJuIGNvbXBvbmVudHM7XG5cblxuXHRmdW5jdGlvbiBiaW5kRWxlbWVudChjb21wb25lbnRzLCBlbCl7XG5cdFx0dmFyIGF0dHIgPSBuZXcgQmluZEF0dHJpYnV0ZShlbCk7XG5cblx0XHRpZiAoYXR0ci5ub2RlKVxuXHRcdFx0dmFyIGFDb21wb25lbnQgPSBjcmVhdGVDb21wb25lbnQoZWwsIGF0dHIpO1xuXG5cdFx0Ly8gYmluZCBpbm5lciBlbGVtZW50cyB0byBjb21wb25lbnRzXG5cdFx0aWYgKGVsLmNoaWxkcmVuICYmIGVsLmNoaWxkcmVuLmxlbmd0aCkge1xuXHRcdFx0dmFyIGlubmVyQ29tcG9uZW50cyA9IGJpbmRDaGlsZHJlbihlbCk7XG5cblx0XHRcdGlmIChPYmplY3Qua2V5cyhpbm5lckNvbXBvbmVudHMpLmxlbmd0aCkge1xuXHRcdFx0XHQvLyBhdHRhY2ggaW5uZXIgY29tcG9uZW50cyB0byB0aGUgY3VycmVudCBvbmUgKGNyZWF0ZSBhIG5ldyBzY29wZSkgLi4uXG5cdFx0XHRcdGlmICh0eXBlb2YgYUNvbXBvbmVudCAhPSAndW5kZWZpbmVkJyAmJiBhQ29tcG9uZW50LmNvbnRhaW5lcilcblx0XHRcdFx0XHRhQ29tcG9uZW50LmNvbnRhaW5lci5hZGQoaW5uZXJDb21wb25lbnRzKTtcblx0XHRcdFx0ZWxzZSAvLyBvciBrZWVwIHRoZW0gaW4gdGhlIGN1cnJlbnQgc2NvcGVcblx0XHRcdFx0XHRfLmVhY2hLZXkoaW5uZXJDb21wb25lbnRzLCBmdW5jdGlvbihhQ29tcCwgbmFtZSkge1xuXHRcdFx0XHRcdFx0c3RvcmVDb21wb25lbnQoY29tcG9uZW50cywgYUNvbXAsIG5hbWUpO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmIChhQ29tcG9uZW50KVxuXHRcdFx0c3RvcmVDb21wb25lbnQoY29tcG9uZW50cywgYUNvbXBvbmVudCwgYXR0ci5jb21wTmFtZSk7XG5cdH1cblxuXG5cdGZ1bmN0aW9uIGJpbmRDaGlsZHJlbihvd25lckVsKSB7XG5cdFx0dmFyIGNvbXBvbmVudHMgPSB7fTtcblx0XHRBcnJheS5wcm90b3R5cGUuZm9yRWFjaC5jYWxsKG93bmVyRWwuY2hpbGRyZW4sIGZ1bmN0aW9uKGVsKSB7XG5cdFx0XHRiaW5kRWxlbWVudChjb21wb25lbnRzLCBlbClcblx0XHR9KTtcblx0XHRyZXR1cm4gY29tcG9uZW50cztcblx0fVxuXG5cblx0ZnVuY3Rpb24gY3JlYXRlQ29tcG9uZW50KGVsLCBhdHRyKSB7XG5cdFx0Ly8gZWxlbWVudCB3aWxsIGJlIGJvdW5kIHRvIGEgY29tcG9uZW50XG5cdFx0YXR0ci5wYXJzZSgpLnZhbGlkYXRlKCk7XG5cblx0XHQvLyBnZXQgY29tcG9uZW50IGNsYXNzIGZyb20gcmVnaXN0cnkgYW5kIHZhbGlkYXRlXG5cdFx0dmFyIENvbXBvbmVudENsYXNzID0gY29tcG9uZW50c1JlZ2lzdHJ5LmdldChhdHRyLmNvbXBDbGFzcyk7XG5cblx0XHRpZiAoISBDb21wb25lbnRDbGFzcylcblx0XHRcdHRocm93IG5ldyBCaW5kZXJFcnJvcignY2xhc3MgJyArIGF0dHIuY29tcENsYXNzICsgJyBpcyBub3QgcmVnaXN0ZXJlZCcpO1xuXG5cdFx0Y2hlY2soQ29tcG9uZW50Q2xhc3MsIE1hdGNoLlN1YmNsYXNzKENvbXBvbmVudCwgdHJ1ZSkpO1xuXG5cdFx0Ly8gY3JlYXRlIG5ldyBjb21wb25lbnRcblx0XHR2YXIgYUNvbXBvbmVudCA9IG5ldyBDb21wb25lbnRDbGFzcyhlbCwgYXR0ci5jb21wTmFtZSk7XG5cblx0XHQvLyBhZGQgZXh0cmEgZmFjZXRzXG5cdFx0dmFyIGZhY2V0cyA9IGF0dHIuY29tcEZhY2V0cztcblx0XHRpZiAoZmFjZXRzKVxuXHRcdFx0ZmFjZXRzLmZvckVhY2goZnVuY3Rpb24oZmN0KSB7XG5cdFx0XHRcdGFDb21wb25lbnQuYWRkRmFjZXQoZmN0KTtcblx0XHRcdH0pO1xuXG5cdFx0cmV0dXJuIGFDb21wb25lbnQ7XG5cdH1cblxuXG5cdGZ1bmN0aW9uIHN0b3JlQ29tcG9uZW50KGNvbXBvbmVudHMsIGFDb21wb25lbnQsIG5hbWUpIHtcblx0XHRpZiAoY29tcG9uZW50c1tuYW1lXSlcblx0XHRcdHRocm93IG5ldyBCaW5kZXJFcnJvcignZHVwbGljYXRlIGNvbXBvbmVudCBuYW1lOiAnICsgbmFtZSk7XG5cblx0XHRjb21wb25lbnRzW25hbWVdID0gYUNvbXBvbmVudDtcblx0fVxufVxuXG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBjbGFzc2VzID0ge1xuXHRGYWNldDogcmVxdWlyZSgnLi9mYWNldHMvZl9jbGFzcycpLFxuXHRDb21wb25lbnQ6IHJlcXVpcmUoJy4vY29tcG9uZW50cy9jX2NsYXNzJyksXG5cdENvbXBvbmVudEZhY2V0OiByZXF1aXJlKCcuL2NvbXBvbmVudHMvY19mYWNldCcpLFxuXHRDbGFzc1JlZ2lzdHJ5OiByZXF1aXJlKCcuL2Fic3RyYWN0L3JlZ2lzdHJ5JyksXG5cdGZhY2V0c1JlZ2lzdHJ5OiByZXF1aXJlKCcuL2NvbXBvbmVudHMvY19mYWNldHMvY2ZfcmVnaXN0cnknKSxcblx0Y29tcG9uZW50c1JlZ2lzdHJ5OiByZXF1aXJlKCcuL2NvbXBvbmVudHMvY19yZWdpc3RyeScpXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzZXM7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBGYWNldGVkT2JqZWN0ID0gcmVxdWlyZSgnLi4vZmFjZXRzL2Zfb2JqZWN0Jylcblx0LCBmYWNldHNSZWdpc3RyeSA9IHJlcXVpcmUoJy4vY19mYWNldHMvY2ZfcmVnaXN0cnknKVxuXHQsIENvbXBvbmVudEZhY2V0ID0gcmVxdWlyZSgnLi9jX2ZhY2V0Jylcblx0LCBNZXNzZW5nZXIgPSByZXF1aXJlKCcuLi9tZXNzZW5nZXInKVxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vdXRpbC9jaGVjaycpXG5cdCwgTWF0Y2ggPSBjaGVjay5NYXRjaDtcblxudmFyIENvbXBvbmVudCA9IF8uY3JlYXRlU3ViY2xhc3MoRmFjZXRlZE9iamVjdCwgJ0NvbXBvbmVudCcsIHRydWUpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbXBvbmVudDtcblxuXG5Db21wb25lbnQuY3JlYXRlQ29tcG9uZW50Q2xhc3MgPSBmdW5jdGlvbihuYW1lLCBmYWNldHNDb25maWcpIHtcblx0dmFyIGZhY2V0c0NsYXNzZXMgPSB7fTtcblxuXHRpZiAoQXJyYXkuaXNBcnJheShmYWNldHNDb25maWcpKSB7XG5cdFx0dmFyIGNvbmZpZ01hcCA9IHt9O1xuXHRcdGZhY2V0c0NvbmZpZy5mb3JFYWNoKGZ1bmN0aW9uKGZjdCkge1xuXHRcdFx0dmFyIGZjdE5hbWUgPSBfLmZpcnN0TG93ZXJDYXNlKGZjdCk7XG5cdFx0XHRjb25maWdNYXBbZmN0TmFtZV0gPSB7fTtcblx0XHR9KTtcblx0XHRmYWNldHNDb25maWcgPSBjb25maWdNYXA7XG5cdH1cblxuXHRfLmVhY2hLZXkoZmFjZXRzQ29uZmlnLCBmdW5jdGlvbihmY3RDb25maWcsIGZjdCkge1xuXHRcdHZhciBmY3ROYW1lID0gXy5maXJzdExvd2VyQ2FzZShmY3QpO1xuXHRcdHZhciBmY3RDbGFzc05hbWUgPSBfLmZpcnN0VXBwZXJDYXNlKGZjdCk7XG5cdFx0ZmFjZXRzQ2xhc3Nlc1tmY3ROYW1lXSA9IGZhY2V0c1JlZ2lzdHJ5LmdldChmY3RDbGFzc05hbWUpO1xuXHR9KTtcblxuXHR2YXIgQ29tcG9uZW50Q2xhc3MgPSBGYWNldGVkT2JqZWN0LmNyZWF0ZUZhY2V0ZWRDbGFzcy5jYWxsKHRoaXMsIG5hbWUsIGZhY2V0c0NsYXNzZXMsIGZhY2V0c0NvbmZpZyk7XG5cdFxuXHRyZXR1cm4gQ29tcG9uZW50Q2xhc3M7XG59O1xuXG5kZWxldGUgQ29tcG9uZW50LmNyZWF0ZUZhY2V0ZWRDbGFzcztcblxuXG5fLmV4dGVuZFByb3RvKENvbXBvbmVudCwge1xuXHRpbml0OiBpbml0Q29tcG9uZW50LFxuXHRhZGRGYWNldDogYWRkRmFjZXQsXG5cdGFsbEZhY2V0czogZW52b2tlTWV0aG9kT25BbGxGYWNldHNcbn0pO1xuXG5cbmZ1bmN0aW9uIGluaXRDb21wb25lbnQoZWxlbWVudCwgbmFtZSkge1xuXHR0aGlzLmVsID0gZWxlbWVudDtcblx0dGhpcy5uYW1lID0gbmFtZTtcblxuXHR2YXIgbWVzc2VuZ2VyID0gbmV3IE1lc3Nlbmdlcih0aGlzLCBNZXNzZW5nZXIuZGVmYXVsdE1ldGhvZHMsIHVuZGVmaW5lZCAvKiBubyBtZXNzYWdlU291cmNlICovKTtcblxuXHRPYmplY3QuZGVmaW5lUHJvcGVydGllcyh0aGlzLCB7XG5cdFx0X21lc3NlbmdlcjogeyB2YWx1ZTogbWVzc2VuZ2VyIH0sXG5cdH0pO1x0XG5cblx0Ly8gc3RhcnQgYWxsIGZhY2V0c1xuXHR0aGlzLmFsbEZhY2V0cygnY2hlY2snKTtcblx0dGhpcy5hbGxGYWNldHMoJ3N0YXJ0Jyk7XG59XG5cblxuZnVuY3Rpb24gYWRkRmFjZXQoZmFjZXROYW1lT3JDbGFzcywgZmFjZXRPcHRzLCBmYWNldE5hbWUpIHtcblx0Y2hlY2soZmFjZXROYW1lT3JDbGFzcywgTWF0Y2guT25lT2YoU3RyaW5nLCBNYXRjaC5TdWJjbGFzcyhDb21wb25lbnRGYWNldCkpKTtcblx0Y2hlY2soZmFjZXRPcHRzLCBNYXRjaC5PcHRpb25hbChPYmplY3QpKTtcblx0Y2hlY2soZmFjZXROYW1lLCBNYXRjaC5PcHRpb25hbChTdHJpbmcpKTtcblxuXHRpZiAodHlwZW9mIGZhY2V0TmFtZU9yQ2xhc3MgPT0gJ3N0cmluZycpIHtcblx0XHR2YXIgZmFjZXRDbGFzc05hbWUgPSBfLmZpcnN0VXBwZXJDYXNlKGZhY2V0TmFtZU9yQ2xhc3MpO1xuXHRcdHZhciBGYWNldENsYXNzID0gZmFjZXRzUmVnaXN0cnkuZ2V0KGZhY2V0Q2xhc3NOYW1lKTtcblx0fSBlbHNlIFxuXHRcdEZhY2V0Q2xhc3MgPSBmYWNldE5hbWVPckNsYXNzO1xuXG5cdGZhY2V0TmFtZSA9IGZhY2V0TmFtZSB8fCBfLmZpcnN0TG93ZXJDYXNlKEZhY2V0Q2xhc3MubmFtZSk7XG5cblx0dmFyIG5ld0ZhY2V0ID0gRmFjZXRlZE9iamVjdC5wcm90b3R5cGUuYWRkRmFjZXQuY2FsbCh0aGlzLCBGYWNldENsYXNzLCBmYWNldE9wdHMsIGZhY2V0TmFtZSk7XG5cblx0Ly8gc3RhcnQgZmFjZXRcblx0bmV3RmFjZXQuY2hlY2sgJiYgbmV3RmFjZXQuY2hlY2soKTtcblx0bmV3RmFjZXQuc3RhcnQgJiYgbmV3RmFjZXQuc3RhcnQoKTtcbn1cblxuXG5mdW5jdGlvbiBlbnZva2VNZXRob2RPbkFsbEZhY2V0cyhtZXRob2QgLyogLCAuLi4gKi8pIHtcblx0dmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuXG5cdF8uZWFjaEtleSh0aGlzLmZhY2V0cywgZnVuY3Rpb24oZmFjZXQsIGZjdE5hbWUpIHtcblx0XHRpZiAoZmFjZXQgJiYgdHlwZW9mIGZhY2V0W21ldGhvZF0gPT0gJ2Z1bmN0aW9uJylcblx0XHRcdGZhY2V0W21ldGhvZF0uYXBwbHkoZmFjZXQsIGFyZ3MpO1xuXHR9KTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIEZhY2V0ID0gcmVxdWlyZSgnLi4vZmFjZXRzL2ZfY2xhc3MnKVxuXHQsIE1lc3NlbmdlciA9IHJlcXVpcmUoJy4uL21lc3NlbmdlcicpXG5cdCwgRmFjZXRFcnJvciA9IHJlcXVpcmUoJy4uL3V0aWwvZXJyb3InKS5GYWNldFxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKTtcblxudmFyIENvbXBvbmVudEZhY2V0ID0gXy5jcmVhdGVTdWJjbGFzcyhGYWNldCwgJ0NvbXBvbmVudEZhY2V0Jyk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ29tcG9uZW50RmFjZXQ7XG5cblxuXy5leHRlbmRQcm90byhDb21wb25lbnRGYWNldCwge1xuXHRpbml0OiBpbml0Q29tcG9uZW50RmFjZXQsXG5cdGNoZWNrOiBjaGVja0RlcGVuZGVuY2llc1xufSk7XG5cblxuZnVuY3Rpb24gaW5pdENvbXBvbmVudEZhY2V0KCkge1xuXHQvLyB2YXIgbWVzc2VuZ2VyID0gbmV3IE1lc3Nlbmdlcih0aGlzLCBNZXNzZW5nZXIuZGVmYXVsdE1ldGhvZHMsIHVuZGVmaW5lZCAvKiBubyBtZXNzYWdlU291cmNlICovKTtcblxuXHQvLyBPYmplY3QuZGVmaW5lUHJvcGVydGllcyh0aGlzLCB7XG5cdC8vIFx0X2ZhY2V0TWVzc2VuZ2VyOiB7IHZhbHVlOiBtZXNzZW5nZXIgfSxcblx0Ly8gfSk7XG59XG5cblxuZnVuY3Rpb24gY2hlY2tEZXBlbmRlbmNpZXMoKSB7XG5cdGlmICh0aGlzLnJlcXVpcmUpIHtcblx0XHR0aGlzLnJlcXVpcmUuZm9yRWFjaChmdW5jdGlvbihyZXFGYWNldCkge1xuXHRcdFx0dmFyIGZhY2V0TmFtZSA9IF8uZmlyc3RMb3dlckNhc2UocmVxRmFjZXQpO1xuXHRcdFx0aWYgKCEgKHRoaXMub3duZXJbZmFjZXROYW1lXSBpbnN0YW5jZW9mIENvbXBvbmVudEZhY2V0KSlcblx0XHRcdFx0dGhyb3cgbmV3IEZhY2V0RXJyb3IoJ2ZhY2V0ICcgKyB0aGlzLmNvbnN0cnVjdG9yLm5hbWUgKyAnIHJlcXVpcmVzIGZhY2V0ICcgKyByZXFGYWNldCk7XG5cdFx0fSwgdGhpcyk7XG5cdH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIENvbXBvbmVudEZhY2V0ID0gcmVxdWlyZSgnLi4vY19mYWNldCcpXG5cdCwgYmluZGVyID0gcmVxdWlyZSgnLi4vLi4vYmluZGVyJylcblx0LCBfID0gcmVxdWlyZSgnbW9sLXByb3RvJylcblx0LCBmYWNldHNSZWdpc3RyeSA9IHJlcXVpcmUoJy4vY2ZfcmVnaXN0cnknKTtcblxuLy8gY29udGFpbmVyIGZhY2V0XG52YXIgQ29udGFpbmVyID0gXy5jcmVhdGVTdWJjbGFzcyhDb21wb25lbnRGYWNldCwgJ0NvbnRhaW5lcicpO1xuXG5fLmV4dGVuZFByb3RvKENvbnRhaW5lciwge1xuXHRpbml0OiBpbml0Q29udGFpbmVyLFxuXHRfYmluZDogX2JpbmRDb21wb25lbnRzLFxuXHRhZGQ6IGFkZENoaWxkQ29tcG9uZW50c1xufSk7XG5cbmZhY2V0c1JlZ2lzdHJ5LmFkZChDb250YWluZXIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbnRhaW5lcjtcblxuXG5mdW5jdGlvbiBpbml0Q29udGFpbmVyKCkge1xuXHRDb21wb25lbnRGYWNldC5wcm90b3R5cGUuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXHR0aGlzLmNoaWxkcmVuID0ge307XG59XG5cblxuZnVuY3Rpb24gX2JpbmRDb21wb25lbnRzKCkge1xuXHQvLyBUT0RPXG5cdC8vIHRoaXMgZnVuY3Rpb24gc2hvdWxkIHJlLWJpbmQgcmF0aGVyIHRoYW4gYmluZCBhbGwgaW50ZXJuYWwgZWxlbWVudHNcblx0dGhpcy5jaGlsZHJlbiA9IGJpbmRlcih0aGlzLm93bmVyLmVsKTtcbn1cblxuXG5mdW5jdGlvbiBhZGRDaGlsZENvbXBvbmVudHMoY2hpbGRDb21wb25lbnRzKSB7XG5cdC8vIFRPRE9cblx0Ly8gdGhpcyBmdW5jdGlvbiBzaG91bGQgaW50ZWxsaWdlbnRseSByZS1iaW5kIGV4aXN0aW5nIGNvbXBvbmVudHMgdG9cblx0Ly8gbmV3IGVsZW1lbnRzIChpZiB0aGV5IGNoYW5nZWQpIGFuZCByZS1iaW5kIHByZXZpb3VzbHkgYm91bmQgZXZlbnRzIHRvIHRoZSBzYW1lXG5cdC8vIGV2ZW50IGhhbmRsZXJzXG5cdC8vIG9yIG1heWJlIG5vdCwgaWYgdGhpcyBmdW5jdGlvbiBpcyBvbmx5IHVzZWQgYnkgYmluZGVyIHRvIGFkZCBuZXcgZWxlbWVudHMuLi5cblx0Xy5leHRlbmQodGhpcy5jaGlsZHJlbiwgY2hpbGRDb21wb25lbnRzKTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIENvbXBvbmVudEZhY2V0ID0gcmVxdWlyZSgnLi4vY19mYWNldCcpXG5cdCwgZmFjZXRzUmVnaXN0cnkgPSByZXF1aXJlKCcuL2NmX3JlZ2lzdHJ5JylcblxuXHQsIE1lc3NlbmdlciA9IHJlcXVpcmUoJy4uLy4uL21lc3NlbmdlcicpXG5cdCwgQ29tcG9uZW50RGF0YVNvdXJjZSA9IHJlcXVpcmUoJy4uL2NfbWVzc2FnZV9zb3VyY2VzL2NvbXBvbmVudF9kYXRhX3NvdXJjZScpXG5cblx0LCBfID0gcmVxdWlyZSgnbW9sLXByb3RvJyk7XG5cblxuLy8gZGF0YSBtb2RlbCBjb25uZWN0aW9uIGZhY2V0XG52YXIgRGF0YSA9IF8uY3JlYXRlU3ViY2xhc3MoQ29tcG9uZW50RmFjZXQsICdEYXRhJyk7XG5cbl8uZXh0ZW5kUHJvdG8oRGF0YSwge1xuXHRpbml0OiBpbml0RGF0YUZhY2V0LFxuXG5cdC8vIF9yZWF0dGFjaDogX3JlYXR0YWNoRXZlbnRzT25FbGVtZW50Q2hhbmdlXG59KTtcblxuZmFjZXRzUmVnaXN0cnkuYWRkKERhdGEpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IERhdGE7XG5cblxuZnVuY3Rpb24gaW5pdERhdGFGYWNldCgpIHtcblx0Q29tcG9uZW50RmFjZXQucHJvdG90eXBlLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuXHR2YXIgcHJveHlDb21wRGF0YVNvdXJjZU1ldGhvZHMgPSB7XG5cdFx0dmFsdWU6ICd2YWx1ZScsXG5cdFx0dHJpZ2dlcjogJ3RyaWdnZXInXG5cdH07XG5cblx0Ly8gaW5zdGVhZCBvZiB0aGlzLm93bmVyIHNob3VsZCBwYXNzIG1vZGVsPyBXaGVyZSBpdCBpcyBzZXQ/XG5cdHZhciBjb21wRGF0YVNvdXJjZSA9IG5ldyBDb21wb25lbnREYXRhU291cmNlKHRoaXMsIHByb3h5Q29tcERhdGFTb3VyY2VNZXRob2RzLCB0aGlzLm93bmVyKTtcblxuXHR2YXIgcHJveHlNZXNzZW5nZXJNZXRob2RzID0ge1xuXHRcdG9uOiAnb25NZXNzYWdlJyxcblx0XHRvZmY6ICdvZmZNZXNzYWdlJyxcblx0XHRvbk1lc3NhZ2VzOiAnb25NZXNzYWdlcycsXG5cdFx0b2ZmTWVzc2FnZXM6ICdvZmZNZXNzYWdlcycsXG5cdFx0Z2V0U3Vic2NyaWJlcnM6ICdnZXRTdWJzY3JpYmVycydcblx0fTtcblxuXHR2YXIgZGF0YU1lc3NlbmdlciA9IG5ldyBNZXNzZW5nZXIodGhpcywgcHJveHlNZXNzZW5nZXJNZXRob2RzLCBjb21wRGF0YVNvdXJjZSk7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnRpZXModGhpcywge1xuXHRcdF9kYXRhTWVzc2VuZ2VyOiB7IHZhbHVlOiBkYXRhTWVzc2VuZ2VyIH0sXG5cdFx0X2NvbXBEYXRhU291cmNlOiB7IHZhbHVlOiBjb21wRGF0YVNvdXJjZSB9XG5cdH0pO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ29tcG9uZW50RmFjZXQgPSByZXF1aXJlKCcuLi9jX2ZhY2V0Jylcblx0LCBmYWNldHNSZWdpc3RyeSA9IHJlcXVpcmUoJy4vY2ZfcmVnaXN0cnknKVx0XG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpXG5cdCwgY2hlY2sgPSByZXF1aXJlKCcuLi8uLi91dGlsL2NoZWNrJylcblx0LCBNYXRjaCA9IGNoZWNrLk1hdGNoXG5cdCwgYmluZGVyID0gcmVxdWlyZSgnLi4vLi4vYmluZGVyJyk7XG5cblxuLy8gZGF0YSBtb2RlbCBjb25uZWN0aW9uIGZhY2V0XG52YXIgRG9tID0gXy5jcmVhdGVTdWJjbGFzcyhDb21wb25lbnRGYWNldCwgJ0RvbScpO1xuXG5fLmV4dGVuZFByb3RvKERvbSwge1xuXHRpbml0OiBpbml0RG9tRmFjZXQsXG5cdHN0YXJ0OiBzdGFydERvbUZhY2V0LFxuXG5cdHNob3c6IHNob3dFbGVtZW50LFxuXHRoaWRlOiBoaWRlRWxlbWVudCxcblx0cmVtb3ZlOiByZW1vdmVFbGVtZW50LFxuXHRhcHBlbmQ6IGFwcGVuZEluc2lkZUVsZW1lbnQsXG5cdHByZXBlbmQ6IHByZXBlbmRJbnNpZGVFbGVtZW50LFxuXG5cdC8vIF9yZWF0dGFjaDogX3JlYXR0YWNoRXZlbnRzT25FbGVtZW50Q2hhbmdlXG59KTtcblxuZmFjZXRzUmVnaXN0cnkuYWRkKERvbSk7XG5cbm1vZHVsZS5leHBvcnRzID0gRG9tO1xuXG5cbmZ1bmN0aW9uIGluaXREb21GYWNldCgpIHtcblx0Q29tcG9uZW50RmFjZXQucHJvdG90eXBlLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn1cblxuZnVuY3Rpb24gc3RhcnREb21GYWNldCgpIHtcblx0aWYgKHRoaXMuY29uZmlnLmNscylcblx0XHR0aGlzLm93bmVyLmVsLmNsYXNzTGlzdC5hZGQodGhpcy5jb25maWcuY2xzKTtcbn1cblxuZnVuY3Rpb24gc2hvd0VsZW1lbnQoKSB7XG5cdHRoaXMub3duZXIuZWwuc3R5bGUuZGlzcGxheSA9ICdibG9jayc7XG59XG5cbmZ1bmN0aW9uIGhpZGVFbGVtZW50KCkge1xuXHR0aGlzLm93bmVyLmVsLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG59XG5cbmZ1bmN0aW9uIHJlbW92ZUVsZW1lbnQoKSB7XG5cdHZhciB0aGlzRWwgPSB0aGlzLm93bmVyLmVsO1xuXHR0aGlzRWwucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0aGlzRWwpO1xufVxuXG5mdW5jdGlvbiBhcHBlbmRJbnNpZGVFbGVtZW50KGVsKSB7XG5cdHRoaXMub3duZXIuZWwuYXBwZW5kQ2hpbGQoZWwpXG59XG5cbmZ1bmN0aW9uIHByZXBlbmRJbnNpZGVFbGVtZW50KGVsKSB7XG5cdHZhciB0aGlzRWwgPSB0aGlzLm93bmVyLmVsXG5cdFx0LCBmaXJzdENoaWxkID0gdGhpc0VsLmZpcnN0Q2hpbGQ7XG5cdGlmIChmaXJzdENoaWxkKVxuXHRcdHRoaXNFbC5pbnNlcnRCZWZvcmUoZWwsIGZpcnN0Q2hpbGQpO1xuXHRlbHNlXG5cdFx0dGhpc0VsLmFwcGVuZENoaWxkKGVsKTtcbn1cblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ29tcG9uZW50RmFjZXQgPSByZXF1aXJlKCcuLi9jX2ZhY2V0Jylcblx0LCBmYWNldHNSZWdpc3RyeSA9IHJlcXVpcmUoJy4vY2ZfcmVnaXN0cnknKVxuXG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpO1xuXG5cbi8vIGdlbmVyaWMgZHJhZyBoYW5kbGVyLCBzaG91bGQgYmUgb3ZlcnJpZGRlblxudmFyIERyYWcgPSBfLmNyZWF0ZVN1YmNsYXNzKENvbXBvbmVudEZhY2V0LCAnRHJhZycpO1xuXG5fLmV4dGVuZFByb3RvKERyYWcsIHtcblx0aW5pdDogaW5pdERyYWdGYWNldCxcblx0c3RhcnQ6IHN0YXJ0RHJhZ0ZhY2V0LFxuXHRyZXF1aXJlOiBbJ0V2ZW50cyddLCAvLyBUT0RPIGltcGxlbWVudCBmYWNldCBkZXBlbmRlbmNpZXNcblxuXHRzZXRIYW5kbGU6IHNldERyYWdIYW5kbGVcblx0Ly8gX3JlYXR0YWNoOiBfcmVhdHRhY2hFdmVudHNPbkVsZW1lbnRDaGFuZ2Vcbn0pO1xuXG5mYWNldHNSZWdpc3RyeS5hZGQoRHJhZyk7XG5cbm1vZHVsZS5leHBvcnRzID0gRHJhZztcblxuXG5mdW5jdGlvbiBpbml0RHJhZ0ZhY2V0KCkge1xuXHRDb21wb25lbnRGYWNldC5wcm90b3R5cGUuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXHR0aGlzLl9vbmRyYWdzdGFydCA9IHRoaXMuY29uZmlnLm9uZHJhZ3N0YXJ0O1xuXHR0aGlzLl9vbmRyYWcgPSB0aGlzLmNvbmZpZy5vbmRyYWc7XG5cdHRoaXMuX29uZHJhZ2VuZCA9IHRoaXMuY29uZmlnLm9uZHJhZ2VuZDtcbn1cblxuXG5mdW5jdGlvbiBzZXREcmFnSGFuZGxlKGhhbmRsZUVsKSB7XG5cdGlmICghIHRoaXMub3duZXIuZWwuY29udGFpbnMoaGFuZGxlRWwpKVxuXHRcdHJldHVybiBsb2dnZXIud2FybignZHJhZyBoYW5kbGUgc2hvdWxkIGJlIGluc2lkZSBlbGVtZW50IHRvIGJlIGRyYWdnZWQnKVxuXHR0aGlzLl9kcmFnSGFuZGxlID0gaGFuZGxlRWw7XG59XG5cblxuZnVuY3Rpb24gc3RhcnREcmFnRmFjZXQoKSB7XG5cdHRoaXMub3duZXIuZWwuc2V0QXR0cmlidXRlKCdkcmFnZ2FibGUnLCB0cnVlKTtcblxuXHR2YXIgZXZlbnRzRmFjZXQgPSB0aGlzLm93bmVyLmV2ZW50cztcblx0ZXZlbnRzRmFjZXQub25FdmVudHMoe1xuXHRcdCdtb3VzZWRvd24nOiBvbk1vdXNlRG93bixcblx0XHQnbW91c2VlbnRlciBtb3VzZWxlYXZlIG1vdXNlbW92ZSc6IG9uTW91c2VNb3ZlbWVudCxcblx0XHQnZHJhZ3N0YXJ0IGRyYWcnOiBvbkRyYWdnaW5nLFxuXHRcdCdkcmFnc3RhcnQgZHJhZyBkcmFnZW5kJzogY2FsbENvbmZpZ3VyZWRIYW5kbGVyXG5cdH0pO1xuXG5cblx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cblx0ZnVuY3Rpb24gb25Nb3VzZURvd24oZXZlbnRUeXBlLCBldmVudCkge1xuXHRcdHNlbGYuX3RhcmdldCA9IGV2ZW50LnRhcmdldDtcblx0XHRpZiAodGFyZ2V0SW5EcmFnSGFuZGxlKGV2ZW50KSlcblx0XHRcdHdpbmRvdy5nZXRTZWxlY3Rpb24oKS5lbXB0eSgpO1xuXHR9XG5cblxuXHRmdW5jdGlvbiBvbk1vdXNlTW92ZW1lbnQoZXZlbnRUeXBlLCBldmVudCkge1xuXHRcdHZhciBzaG91bGRCZURyYWdnYWJsZSA9IHRhcmdldEluRHJhZ0hhbmRsZShldmVudCk7XG5cdFx0c2VsZi5vd25lci5lbC5zZXRBdHRyaWJ1dGUoJ2RyYWdnYWJsZScsIHNob3VsZEJlRHJhZ2dhYmxlKTtcblx0fVxuXG5cblx0ZnVuY3Rpb24gb25EcmFnZ2luZyhldmVudFR5cGUsIGV2ZW50KSB7XG5cdFx0aWYgKHRhcmdldEluRHJhZ0hhbmRsZShldmVudCkpIHtcblx0XHRcdGV2ZW50LmRhdGFUcmFuc2Zlci5zZXREYXRhKCd0ZXh0L2h0bWwnLCBzZWxmLm93bmVyLmVsLm91dGVySFRNTCk7XG5cdFx0XHRldmVudC5kYXRhVHJhbnNmZXIuc2V0RGF0YSgneC1hcHBsaWNhdGlvbi9taWxvLWNvbXBvbmVudCcsIHNlbGYub3duZXIpO1xuXHRcdH0gZWxzZVxuXHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0fVxuXG5cblx0ZnVuY3Rpb24gY2FsbENvbmZpZ3VyZWRIYW5kbGVyKGV2ZW50VHlwZSwgZXZlbnQpIHtcblx0XHR2YXIgaGFuZGxlclByb3BlcnR5ID0gJ19vbicgKyBldmVudFR5cGVcblx0XHRcdCwgaGFuZGxlciA9IHNlbGZbaGFuZGxlclByb3BlcnR5XTtcblx0XHRpZiAoaGFuZGxlcilcblx0XHRcdGhhbmRsZXIuY2FsbChzZWxmLm93bmVyLCBldmVudFR5cGUsIGV2ZW50KTtcblx0fVxuXG5cblx0ZnVuY3Rpb24gdGFyZ2V0SW5EcmFnSGFuZGxlKGV2ZW50KSB7XG5cdFx0cmV0dXJuICEgc2VsZi5fZHJhZ0hhbmRsZSB8fCBzZWxmLl9kcmFnSGFuZGxlLmNvbnRhaW5zKHNlbGYuX3RhcmdldCk7XG5cdH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIENvbXBvbmVudEZhY2V0ID0gcmVxdWlyZSgnLi4vY19mYWNldCcpXG5cdCwgZmFjZXRzUmVnaXN0cnkgPSByZXF1aXJlKCcuL2NmX3JlZ2lzdHJ5JylcblxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKTtcblxuXG4vLyBnZW5lcmljIGRyYWcgaGFuZGxlciwgc2hvdWxkIGJlIG92ZXJyaWRkZW5cbnZhciBEcm9wID0gXy5jcmVhdGVTdWJjbGFzcyhDb21wb25lbnRGYWNldCwgJ0Ryb3AnKTtcblxuXy5leHRlbmRQcm90byhEcm9wLCB7XG5cdGluaXQ6IGluaXREcm9wRmFjZXQsXG5cdHN0YXJ0OiBzdGFydERyb3BGYWNldCxcblx0cmVxdWlyZTogWydFdmVudHMnXSAvLyBUT0RPIGltcGxlbWVudCBmYWNldCBkZXBlbmRlbmNpZXNcblxuXHQvLyBfcmVhdHRhY2g6IF9yZWF0dGFjaEV2ZW50c09uRWxlbWVudENoYW5nZVxufSk7XG5cbmZhY2V0c1JlZ2lzdHJ5LmFkZChEcm9wKTtcblxubW9kdWxlLmV4cG9ydHMgPSBEcm9wO1xuXG5cbmZ1bmN0aW9uIGluaXREcm9wRmFjZXQoKSB7XG5cdENvbXBvbmVudEZhY2V0LnByb3RvdHlwZS5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cblx0dGhpcy5fb25kcmFnZW50ZXIgPSB0aGlzLmNvbmZpZy5vbmRyYWdlbnRlcjtcblx0dGhpcy5fb25kcmFnb3ZlciA9IHRoaXMuY29uZmlnLm9uZHJhZ292ZXI7XG5cdHRoaXMuX29uZHJhZ2xlYXZlID0gdGhpcy5jb25maWcub25kcmFnbGVhdmU7XG5cdHRoaXMuX29uZHJvcCA9IHRoaXMuY29uZmlnLm9uZHJvcDtcbn1cblxuXG5mdW5jdGlvbiBzdGFydERyb3BGYWNldCgpIHtcblx0dmFyIGV2ZW50c0ZhY2V0ID0gdGhpcy5vd25lci5ldmVudHM7XG5cdGV2ZW50c0ZhY2V0Lm9uKCdkcmFnZW50ZXIgZHJhZ292ZXInLCBvbkRyYWdnaW5nKTtcblx0ZXZlbnRzRmFjZXQub24oJ2RyYWdlbnRlciBkcmFnb3ZlciBkcmFnbGVhdmUgZHJvcCcsIGNhbGxDb25maWd1cmVkSGFuZGxlcik7XG5cblx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdGZ1bmN0aW9uIGNhbGxDb25maWd1cmVkSGFuZGxlcihldmVudFR5cGUsIGV2ZW50KSB7XG5cdFx0dmFyIGhhbmRsZXJQcm9wZXJ0eSA9ICdfb24nICsgZXZlbnRUeXBlXG5cdFx0XHQsIGhhbmRsZXIgPSBzZWxmW2hhbmRsZXJQcm9wZXJ0eV07XG5cdFx0aWYgKGhhbmRsZXIpXG5cdFx0XHRoYW5kbGVyLmNhbGwoc2VsZi5vd25lciwgZXZlbnRUeXBlLCBldmVudCk7XG5cdH1cblxuXG5cdGZ1bmN0aW9uIG9uRHJhZ2dpbmcoZXZlbnRUeXBlLCBldmVudCkge1xuXHRcdHZhciBkYXRhVHlwZXMgPSBldmVudC5kYXRhVHJhbnNmZXIudHlwZXNcblx0XHRpZiAoZGF0YVR5cGVzLmluZGV4T2YoJ3RleHQvaHRtbCcpID49IDBcblx0XHRcdFx0fHwgZGF0YVR5cGVzLmluZGV4T2YoJ3gtYXBwbGljYXRpb24vbWlsby1jb21wb25lbnQnKSA+PSAwKVxuXHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0fVxufSIsIid1c2Ugc3RyaWN0JztcblxudmFyIENvbXBvbmVudEZhY2V0ID0gcmVxdWlyZSgnLi4vY19mYWNldCcpXG5cdCwgZmFjZXRzUmVnaXN0cnkgPSByZXF1aXJlKCcuL2NmX3JlZ2lzdHJ5JylcblxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKTtcblxuXG4vLyBnZW5lcmljIGRyYWcgaGFuZGxlciwgc2hvdWxkIGJlIG92ZXJyaWRkZW5cbnZhciBFZGl0YWJsZSA9IF8uY3JlYXRlU3ViY2xhc3MoQ29tcG9uZW50RmFjZXQsICdFZGl0YWJsZScpO1xuXG5fLmV4dGVuZFByb3RvKEVkaXRhYmxlLCB7XG5cdGluaXQ6IGluaXRFZGl0YWJsZUZhY2V0LFxuXHRzdGFydDogc3RhcnRFZGl0YWJsZUZhY2V0LFxuXHRtYWtlRWRpdGFibGU6IG1ha2VFZGl0YWJsZSxcblx0cmVxdWlyZTogWydFdmVudHMnXSAvLyBUT0RPIGltcGxlbWVudCBmYWNldCBkZXBlbmRlbmNpZXNcblxuXHQvLyBfcmVhdHRhY2g6IF9yZWF0dGFjaEV2ZW50c09uRWxlbWVudENoYW5nZVxufSk7XG5cbmZhY2V0c1JlZ2lzdHJ5LmFkZChFZGl0YWJsZSk7XG5cbm1vZHVsZS5leHBvcnRzID0gRWRpdGFibGU7XG5cblxuZnVuY3Rpb24gaW5pdEVkaXRhYmxlRmFjZXQoKSB7XG5cdENvbXBvbmVudEZhY2V0LnByb3RvdHlwZS5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cblx0dGhpcy5fZWRpdGFibGUgPSB0eXBlb2YgdGhpcy5jb25maWcuZWRpdGFibGUgIT0gJ3VuZGVmaW5lZCdcblx0XHRcdFx0XHRcdD8gdGhpcy5jb25maWcuZWRpdGFibGVcblx0XHRcdFx0XHRcdDogdHJ1ZTtcblxuXHR0aGlzLl9lZGl0YWJsZU9uQ2xpY2sgPSB0aGlzLmNvbmZpZy5lZGl0YWJsZU9uQ2xpY2s7XG5cblx0dGhpcy5fb25lZGl0YWJsZSA9IHRoaXMuY29uZmlnLm9uZWRpdGFibGU7XG5cdHRoaXMuX29uZW50ZXJrZXkgPSB0aGlzLmNvbmZpZy5vbmVudGVya2V5O1xufVxuXG5cbmZ1bmN0aW9uIG1ha2VFZGl0YWJsZShlZGl0YWJsZSkge1xuXHR0aGlzLm93bmVyLmVsLnNldEF0dHJpYnV0ZSgnY29udGVudGVkaXRhYmxlJywgZWRpdGFibGUpO1xuXHRpZiAoZWRpdGFibGUgJiYgdGhpcy5fb25lZGl0YWJsZSlcblx0XHR0aGlzLl9vbmVkaXRhYmxlLmNhbGwodGhpcy5vd25lciwgJ2VkaXRhYmxlJylcbn1cblxuXG5mdW5jdGlvbiBzdGFydEVkaXRhYmxlRmFjZXQoKSB7XG5cdGlmICh0aGlzLl9lZGl0YWJsZSlcblx0XHR0aGlzLm1ha2VFZGl0YWJsZSh0cnVlKTtcblx0XG5cdHZhciBldmVudHNGYWNldCA9IHRoaXMub3duZXIuZXZlbnRzO1xuXHRldmVudHNGYWNldC5vbkV2ZW50cyh7XG5cdFx0J21vdXNlZG93bic6IG9uTW91c2VEb3duLFxuXHRcdCdibHVyJzogb25CbHVyLFxuXHRcdCdrZXlwcmVzcyc6IG9uS2V5UHJlc3Ncblx0fSk7XG5cblx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdGZ1bmN0aW9uIGNhbGxDb25maWd1cmVkSGFuZGxlcihldmVudFR5cGUsIGV2ZW50KSB7XG5cdFx0dmFyIGhhbmRsZXJQcm9wZXJ0eSA9ICdfb24nICsgZXZlbnRUeXBlXG5cdFx0XHQsIGhhbmRsZXIgPSBzZWxmW2hhbmRsZXJQcm9wZXJ0eV07XG5cdFx0aWYgKGhhbmRsZXIpXG5cdFx0XHRoYW5kbGVyLmNhbGwoc2VsZi5vd25lciwgZXZlbnRUeXBlLCBldmVudCk7XG5cdH1cblxuXHRmdW5jdGlvbiBvbk1vdXNlRG93bihldmVudFR5cGUsIGV2ZW50KSB7XG5cdFx0aWYgKHNlbGYuX2VkaXRhYmxlT25DbGljaylcblx0XHRcdHNlbGYubWFrZUVkaXRhYmxlKHRydWUpO1xuXHR9XG5cblx0ZnVuY3Rpb24gb25CbHVyKGV2ZW50VHlwZSwgZXZlbnQpIHtcblx0XHRpZiAoc2VsZi5fZWRpdGFibGVPbkNsaWNrKVxuXHRcdFx0c2VsZi5tYWtlRWRpdGFibGUoZmFsc2UpO1xuXHR9XG5cblx0ZnVuY3Rpb24gb25LZXlQcmVzcyhldmVudFR5cGUsIGV2ZW50KSB7XG5cdFx0aWYgKGV2ZW50LmtleUNvZGUgPT0gMTMgJiYgc2VsZi5fb25lbnRlcmtleSlcblx0XHRcdHNlbGYuX29uZW50ZXJrZXkuY2FsbChzZWxmLm93bmVyLCAnb25lbnRlcmtleScsIGV2ZW50KTtcblx0fVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ29tcG9uZW50RmFjZXQgPSByZXF1aXJlKCcuLi9jX2ZhY2V0Jylcblx0LCBmYWNldHNSZWdpc3RyeSA9IHJlcXVpcmUoJy4vY2ZfcmVnaXN0cnknKVxuXG5cdCwgTWVzc2VuZ2VyID0gcmVxdWlyZSgnLi4vLi4vbWVzc2VuZ2VyJylcblx0LCBET01FdmVudHNTb3VyY2UgPSByZXF1aXJlKCcuLi9jX21lc3NhZ2Vfc291cmNlcy9kb21fZXZlbnRzX3NvdXJjZScpXG5cblx0LCBfID0gcmVxdWlyZSgnbW9sLXByb3RvJyk7XG5cblxuLy8gZXZlbnRzIGZhY2V0XG52YXIgRXZlbnRzID0gXy5jcmVhdGVTdWJjbGFzcyhDb21wb25lbnRGYWNldCwgJ0V2ZW50cycpO1xuXG5fLmV4dGVuZFByb3RvKEV2ZW50cywge1xuXHRpbml0OiBpbml0RXZlbnRzRmFjZXQsXG5cblx0Ly8gX3JlYXR0YWNoOiBfcmVhdHRhY2hFdmVudHNPbkVsZW1lbnRDaGFuZ2Vcbn0pO1xuXG5mYWNldHNSZWdpc3RyeS5hZGQoRXZlbnRzKTtcblxubW9kdWxlLmV4cG9ydHMgPSBFdmVudHM7XG5cblxuZnVuY3Rpb24gaW5pdEV2ZW50c0ZhY2V0KCkge1xuXHRDb21wb25lbnRGYWNldC5wcm90b3R5cGUuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG5cdHZhciBkb21FdmVudHNTb3VyY2UgPSBuZXcgRE9NRXZlbnRzU291cmNlKHRoaXMsIHsgdHJpZ2dlcjogJ3RyaWdnZXInIH0sIHRoaXMub3duZXIpO1xuXG5cdHZhciBwcm94eU1lc3Nlbmdlck1ldGhvZHMgPSB7XG5cdFx0b246ICdvbk1lc3NhZ2UnLFxuXHRcdG9mZjogJ29mZk1lc3NhZ2UnLFxuXHRcdG9uRXZlbnRzOiAnb25NZXNzYWdlcycsXG5cdFx0b2ZmRXZlbnRzOiAnb2ZmTWVzc2FnZXMnLFxuXHRcdGdldExpc3RlbmVyczogJ2dldFN1YnNjcmliZXJzJ1xuXHR9O1xuXG5cdHZhciBtZXNzZW5nZXIgPSBuZXcgTWVzc2VuZ2VyKHRoaXMsIHByb3h5TWVzc2VuZ2VyTWV0aG9kcywgZG9tRXZlbnRzU291cmNlKTtcblxuXHRPYmplY3QuZGVmaW5lUHJvcGVydGllcyh0aGlzLCB7XG5cdFx0X2V2ZW50c01lc3NlbmdlcjogeyB2YWx1ZTogbWVzc2VuZ2VyIH0sXG5cdFx0X2RvbUV2ZW50c1NvdXJjZTogeyB2YWx1ZTogZG9tRXZlbnRzU291cmNlIH1cblx0fSk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBDb21wb25lbnRGYWNldCA9IHJlcXVpcmUoJy4uL2NfZmFjZXQnKVxuXHQsIGZhY2V0c1JlZ2lzdHJ5ID0gcmVxdWlyZSgnLi9jZl9yZWdpc3RyeScpXG5cblx0LCBNZXNzZW5nZXIgPSByZXF1aXJlKCcuLi8uLi9tZXNzZW5nZXInKVxuXHQsIGlGcmFtZU1lc3NhZ2VTb3VyY2UgPSByZXF1aXJlKCcuLi9jX21lc3NhZ2Vfc291cmNlcy9pZnJhbWVfbWVzc2FnZV9zb3VyY2UnKVxuXG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpO1xuXG5cbi8vIGRhdGEgbW9kZWwgY29ubmVjdGlvbiBmYWNldFxudmFyIEZyYW1lID0gXy5jcmVhdGVTdWJjbGFzcyhDb21wb25lbnRGYWNldCwgJ0ZyYW1lJyk7XG5cbl8uZXh0ZW5kUHJvdG8oRnJhbWUsIHtcblx0aW5pdDogaW5pdEZyYW1lRmFjZXRcblxuXHQvLyBfcmVhdHRhY2g6IF9yZWF0dGFjaEV2ZW50c09uRWxlbWVudENoYW5nZVxufSk7XG5cblxuZmFjZXRzUmVnaXN0cnkuYWRkKEZyYW1lKTtcblxubW9kdWxlLmV4cG9ydHMgPSBGcmFtZTtcblxuXG5mdW5jdGlvbiBpbml0RnJhbWVGYWNldCgpIHtcblx0Q29tcG9uZW50RmFjZXQucHJvdG90eXBlLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblx0XG5cdHZhciBpRnJhbWVNZXNzYWdlU291cmNlUHJveHkgPSB7XG5cdFx0cG9zdDogJ3Bvc3QnXG5cdH07XG5cdHZhciBtZXNzYWdlU291cmNlID0gbmV3IGlGcmFtZU1lc3NhZ2VTb3VyY2UodGhpcywgaUZyYW1lTWVzc2FnZVNvdXJjZVByb3h5KTtcblxuXHR2YXIgcHJveHlNZXNzZW5nZXJNZXRob2RzID0ge1xuXHRcdG9uOiAnb25NZXNzYWdlJyxcblx0XHRvZmY6ICdvZmZNZXNzYWdlJyxcblx0XHRvbk1lc3NhZ2VzOiAnb25NZXNzYWdlcycsXG5cdFx0b2ZmTWVzc2FnZXM6ICdvZmZNZXNzYWdlcycsXG5cdFx0Z2V0U3Vic2NyaWJlcnM6ICdnZXRTdWJzY3JpYmVycydcblx0fTtcblxuXHR2YXIgaUZyYW1lTWVzc2VuZ2VyID0gbmV3IE1lc3Nlbmdlcih0aGlzLCBwcm94eU1lc3Nlbmdlck1ldGhvZHMsIG1lc3NhZ2VTb3VyY2UpO1xuXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRoaXMsIHtcblx0XHRfaUZyYW1lTWVzc2VuZ2VyOiB7IHZhbHVlOiBpRnJhbWVNZXNzZW5nZXIgfSxcblx0XHRfbWVzc2FnZVNvdXJjZTogeyB2YWx1ZTogbWVzc2FnZVNvdXJjZSB9XG5cdH0pO1xufSIsIid1c2Ugc3RyaWN0JztcblxudmFyIENvbXBvbmVudEZhY2V0ID0gcmVxdWlyZSgnLi4vY19mYWNldCcpXG5cdCwgZmFjZXRzUmVnaXN0cnkgPSByZXF1aXJlKCcuL2NmX3JlZ2lzdHJ5JylcdFxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vLi4vdXRpbC9jaGVjaycpXG5cdCwgTWF0Y2ggPSBjaGVjay5NYXRjaFxuXHQsIGJpbmRlciA9IHJlcXVpcmUoJy4uLy4uL2JpbmRlcicpO1xuXG5cbi8vIGRhdGEgbW9kZWwgY29ubmVjdGlvbiBmYWNldFxudmFyIFRlbXBsYXRlID0gXy5jcmVhdGVTdWJjbGFzcyhDb21wb25lbnRGYWNldCwgJ1RlbXBsYXRlJyk7XG5cbl8uZXh0ZW5kUHJvdG8oVGVtcGxhdGUsIHtcblx0aW5pdDogaW5pdFRlbXBsYXRlRmFjZXQsXG5cdHNldDogc2V0VGVtcGxhdGUsXG5cdHJlbmRlcjogcmVuZGVyVGVtcGxhdGUsXG5cdGJpbmRlcjogYmluZElubmVyQ29tcG9uZW50c1xuXG5cdC8vIF9yZWF0dGFjaDogX3JlYXR0YWNoRXZlbnRzT25FbGVtZW50Q2hhbmdlXG59KTtcblxuZmFjZXRzUmVnaXN0cnkuYWRkKFRlbXBsYXRlKTtcblxubW9kdWxlLmV4cG9ydHMgPSBUZW1wbGF0ZTtcblxuXG5mdW5jdGlvbiBpbml0VGVtcGxhdGVGYWNldCgpIHtcblx0Q29tcG9uZW50RmFjZXQucHJvdG90eXBlLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuXHR0aGlzLl90ZW1wbGF0ZVN0ciA9IHRoaXMuY29uZmlnLnRlbXBsYXRlO1xufVxuXG5cbmZ1bmN0aW9uIHNldFRlbXBsYXRlKHRlbXBsYXRlU3RyLCBjb21waWxlKSB7XG5cdGNoZWNrKHRlbXBsYXRlU3RyLCBTdHJpbmcpO1xuXHRjaGVjayhjb21waWxlLCBNYXRjaC5PcHRpb25hbChGdW5jdGlvbikpO1xuXG5cdHRoaXMuX3RlbXBsYXRlU3RyID0gdGVtcGxhdGVTdHI7XG5cdGlmIChjb21waWxlKVxuXHRcdHRoaXMuX2NvbXBpbGUgPSBjb21waWxlXG5cblx0Y29tcGlsZSA9IGNvbXBpbGUgfHwgdGhpcy5fY29tcGlsZTsgLy8gfHwgbWlsby5jb25maWcudGVtcGxhdGUuY29tcGlsZTtcblxuXHRpZiAoY29tcGlsZSlcblx0XHR0aGlzLl90ZW1wbGF0ZSA9IGNvbXBpbGUodGVtcGxhdGVTdHIpO1xuXG5cdHJldHVybiB0aGlzO1xufVxuXG5cbmZ1bmN0aW9uIHJlbmRlclRlbXBsYXRlKGRhdGEpIHsgLy8gd2UgbmVlZCBkYXRhIG9ubHkgaWYgdXNlIHRlbXBsYXRpbmcgZW5naW5lXG5cdHRoaXMub3duZXIuZWwuaW5uZXJIVE1MID0gdGhpcy5fdGVtcGxhdGVcblx0XHRcdFx0XHRcdFx0XHQ/IHRoaXMuX3RlbXBsYXRlKGRhdGEpXG5cdFx0XHRcdFx0XHRcdFx0OiB0aGlzLl90ZW1wbGF0ZVN0cjtcblxuXHRyZXR1cm4gdGhpcztcbn1cblxuXG5mdW5jdGlvbiBiaW5kSW5uZXJDb21wb25lbnRzKHJlZ2lzdHJ5KSB7XG5cdHZhciB0aGlzQ29tcG9uZW50ID0gYmluZGVyKHRoaXMub3duZXIuZWwsIHJlZ2lzdHJ5KTtcblxuXHRpZiAodGhpcy5vd25lci5jb250YWluZXIpIC8vIFRPRE8gc2hvdWxkIGJlIGNoYW5nZWQgdG8gcmVjb25jaWxsYXRpb24gb2YgZXhpc3RpbmcgY2hpbGRyZW4gd2l0aCBuZXdcblx0XHR0aGlzLm93bmVyLmNvbnRhaW5lci5jaGlsZHJlbiA9IHRoaXNDb21wb25lbnRbdGhpcy5vd25lci5uYW1lXS5jb250YWluZXIuY2hpbGRyZW47XG5cblx0cmV0dXJuIHRoaXNDb21wb25lbnQ7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBDbGFzc1JlZ2lzdHJ5ID0gcmVxdWlyZSgnLi4vLi4vYWJzdHJhY3QvcmVnaXN0cnknKVxuXHQsIENvbXBvbmVudEZhY2V0ID0gcmVxdWlyZSgnLi4vY19mYWNldCcpO1xuXG52YXIgZmFjZXRzUmVnaXN0cnkgPSBuZXcgQ2xhc3NSZWdpc3RyeShDb21wb25lbnRGYWNldCk7XG5cbmZhY2V0c1JlZ2lzdHJ5LmFkZChDb21wb25lbnRGYWNldCk7XG5cbm1vZHVsZS5leHBvcnRzID0gZmFjZXRzUmVnaXN0cnk7XG5cbi8vIFRPRE8gLSByZWZhY3RvciBjb21wb25lbnRzIHJlZ2lzdHJ5IHRlc3QgaW50byBhIGZ1bmN0aW9uXG4vLyB0aGF0IHRlc3RzIGEgcmVnaXN0cnkgd2l0aCBhIGdpdmVuIGZvdW5kYXRpb24gY2xhc3Ncbi8vIE1ha2UgdGVzdCBmb3IgdGhpcyByZWdpc3RyeSBiYXNlZCBvbiB0aGlzIGZ1bmN0aW9uIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgRE9NRXZlbnRzU291cmNlID0gcmVxdWlyZSgnLi9kb21fZXZlbnRzX3NvdXJjZScpXG5cdCwgQ29tcG9uZW50ID0gcmVxdWlyZSgnLi4vY19jbGFzcycpXG5cdCwgQ29tcG9uZW50RGF0YVNvdXJjZUVycm9yID0gcmVxdWlyZSgnLi4vLi4vdXRpbC9lcnJvcicpLkNvbXBvbmVudERhdGFTb3VyY2Vcblx0LCBfID0gcmVxdWlyZSgnbW9sLXByb3RvJylcblx0LCBjaGVjayA9IHJlcXVpcmUoJy4uLy4uL3V0aWwvY2hlY2snKVxuXHQsIE1hdGNoID0gY2hlY2suTWF0Y2g7XG5cblxuLy8gY2xhc3MgdG8gaGFuZGxlIHN1YnNjcmlidGlvbnMgdG8gY2hhbmdlcyBpbiBET00gZm9yIFVJIChtYXliZSBhbHNvIGNvbnRlbnQgZWRpdGFibGUpIGVsZW1lbnRzXG52YXIgQ29tcG9uZW50RGF0YVNvdXJjZSA9IF8uY3JlYXRlU3ViY2xhc3MoRE9NRXZlbnRzU291cmNlLCAnQ29tcG9uZW50RGF0YVNvdXJjZScsIHRydWUpO1xuXG5cbl8uZXh0ZW5kUHJvdG8oQ29tcG9uZW50RGF0YVNvdXJjZSwge1xuXHQvLyBpbXBsZW1lbnRpbmcgTWVzc2FnZVNvdXJjZSBpbnRlcmZhY2Vcblx0aW5pdDogaW5pdENvbXBvbmVudERhdGFTb3VyY2UsXG5cdHRyYW5zbGF0ZVRvU291cmNlTWVzc2FnZTogdHJhbnNsYXRlVG9Eb21FdmVudCxcbiBcdGFkZFNvdXJjZUxpc3RlbmVyOiBhZGREb21FdmVudExpc3RlbmVyLFxuIFx0cmVtb3ZlU291cmNlTGlzdGVuZXI6IHJlbW92ZURvbUV2ZW50TGlzdGVuZXIsXG4gXHRmaWx0ZXJTb3VyY2VNZXNzYWdlOiBmaWx0ZXJEYXRhTWVzc2FnZSxcblxuIFx0Ly8gY2xhc3Mgc3BlY2lmaWMgbWV0aG9kc1xuIFx0Ly8gZG9tOiBpbXBsZW1lbnRlZCBpbiBET01FdmVudHNTb3VyY2VcbiBcdHZhbHVlOiBnZXREb21FbGVtZW50RGF0YVZhbHVlLFxuIFx0aGFuZGxlRXZlbnQ6IGhhbmRsZUV2ZW50LCAgLy8gZXZlbnQgZGlzcGF0Y2hlciAtIGFzIGRlZmluZWQgYnkgRXZlbnQgRE9NIEFQSVxuIFx0dHJpZ2dlcjogdHJpZ2dlckRhdGFNZXNzYWdlIC8vIHJlZGVmaW5lcyBtZXRob2Qgb2Ygc3VwZXJjbGFzcyBET01FdmVudHNTb3VyY2Vcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbXBvbmVudERhdGFTb3VyY2U7XG5cblxuZnVuY3Rpb24gaW5pdENvbXBvbmVudERhdGFTb3VyY2UoKSB7XG5cdERPTUV2ZW50c1NvdXJjZS5wcm90b3R5cGUuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG5cdHRoaXMudmFsdWUoKTsgLy8gc3RvcmVzIGN1cnJlbnQgY29tcG9uZW50IGRhdGEgdmFsdWUgaW4gdGhpcy5fdmFsdWVcbn1cblxuXG4vLyBUT0RPOiBzaG91bGQgcmV0dXJuIHZhbHVlIGRlcGVuZGVudCBvbiBlbGVtZW50IHRhZ1xuZnVuY3Rpb24gZ2V0RG9tRWxlbWVudERhdGFWYWx1ZSgpIHsgLy8gdmFsdWUgbWV0aG9kXG5cdHZhciBuZXdWYWx1ZSA9IHRoaXMuY29tcG9uZW50LmVsLnZhbHVlO1xuXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnX3ZhbHVlJywge1xuXHRcdGNvbmZpZ3VyYWJsZTogdHJ1ZSxcblx0XHR2YWx1ZTogbmV3VmFsdWVcblx0fSk7XG5cblx0cmV0dXJuIG5ld1ZhbHVlO1xufVxuXG5cbi8vIFRPRE86IHRoaXMgZnVuY3Rpb24gc2hvdWxkIHJldHVybiByZWxldmFudCBET00gZXZlbnQgZGVwZW5kZW50IG9uIGVsZW1lbnQgdGFnXG4vLyBDYW4gYWxzbyBpbXBsZW1lbnQgYmVmb3JlZGF0YWNoYW5nZWQgZXZlbnQgdG8gYWxsb3cgcHJldmVudGluZyB0aGUgY2hhbmdlXG5mdW5jdGlvbiB0cmFuc2xhdGVUb0RvbUV2ZW50KG1lc3NhZ2UpIHtcblx0aWYgKG1lc3NhZ2UgPT0gJ2RhdGFjaGFuZ2VkJylcblx0XHRyZXR1cm4gJ2lucHV0Jztcblx0ZWxzZVxuXHRcdHRocm93IG5ldyBDb21wb25lbnREYXRhU291cmNlRXJyb3IoJ3Vua25vd24gY29tcG9uZW50IGRhdGEgZXZlbnQnKTtcbn1cblxuXG5mdW5jdGlvbiBhZGREb21FdmVudExpc3RlbmVyKGV2ZW50VHlwZSkge1xuXHR0aGlzLmRvbSgpLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlLCB0aGlzLCBmYWxzZSk7IC8vIG5vIGNhcHR1cmluZ1xufVxuXG5cbmZ1bmN0aW9uIHJlbW92ZURvbUV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlKSB7XG5cdHRoaXMuZG9tKCkucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudFR5cGUsIHRoaXMsIGZhbHNlKTsgLy8gbm8gY2FwdHVyaW5nXG59XG5cblxuZnVuY3Rpb24gZmlsdGVyRGF0YU1lc3NhZ2UoZXZlbnRUeXBlLCBtZXNzYWdlLCBkYXRhKSB7XG5cdHJldHVybiBkYXRhLm5ld1ZhbHVlICE9IGRhdGEub2xkVmFsdWU7XG59O1xuXG5cbiAvLyBldmVudCBkaXNwYXRjaGVyIC0gYXMgZGVmaW5lZCBieSBFdmVudCBET00gQVBJXG5mdW5jdGlvbiBoYW5kbGVFdmVudChldmVudCkge1xuXHR2YXIgb2xkVmFsdWUgPSB0aGlzLl92YWx1ZTtcblxuXHR0aGlzLmRpc3BhdGNoTWVzc2FnZShldmVudC50eXBlLCB7XG5cdFx0b2xkVmFsdWU6IG9sZFZhbHVlLFxuXHRcdG5ld1ZhbHVlOiB0aGlzLnZhbHVlKClcblx0fSk7XG59XG5cblxuZnVuY3Rpb24gdHJpZ2dlckRhdGFNZXNzYWdlKG1lc3NhZ2UsIGRhdGEpIHtcblx0Ly8gVE9ETyAtIG9wcG9zaXRlIHRyYW5zbGF0aW9uICsgZXZlbnQgdHJpZ2dlciBcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKTtcblxuXG4vLyBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9SZWZlcmVuY2UvRXZlbnRzXG5cbnZhciBldmVudFR5cGVzID0ge1xuXHRDbGlwYm9hcmRFdmVudDogWydjb3B5JywgJ2N1dCcsICdwYXN0ZScsICdiZWZvcmVjb3B5JywgJ2JlZm9yZWN1dCcsICdiZWZvcmVwYXN0ZSddLFxuXHRFdmVudDogWydpbnB1dCcsICdyZWFkeXN0YXRlY2hhbmdlJ10sXG5cdEZvY3VzRXZlbnQ6IFsnZm9jdXMnLCAnYmx1cicsICdmb2N1c2luJywgJ2ZvY3Vzb3V0J10sXG5cdEtleWJvYXJkRXZlbnQ6IFsna2V5ZG93bicsICdrZXlwcmVzcycsICAna2V5dXAnXSxcblx0TW91c2VFdmVudDogWydjbGljaycsICdjb250ZXh0bWVudScsICdkYmxjbGljaycsICdtb3VzZWRvd24nLCAnbW91c2V1cCcsXG5cdFx0XHRcdCAnbW91c2VlbnRlcicsICdtb3VzZWxlYXZlJywgJ21vdXNlbW92ZScsICdtb3VzZW91dCcsICdtb3VzZW92ZXInLFxuXHRcdFx0XHQgJ3Nob3cnIC8qIGNvbnRleHQgbWVudSAqL10sXG5cdFRvdWNoRXZlbnQ6IFsndG91Y2hzdGFydCcsICd0b3VjaGVuZCcsICd0b3VjaG1vdmUnLCAndG91Y2hlbnRlcicsICd0b3VjaGxlYXZlJywgJ3RvdWNoY2FuY2VsJ10sXG59O1xuXG5cbi8vIG1vY2sgd2luZG93IGFuZCBldmVudCBjb25zdHJ1Y3RvcnMgZm9yIHRlc3RpbmdcbmlmICh0eXBlb2Ygd2luZG93ICE9ICd1bmRlZmluZWQnKVxuXHR2YXIgZ2xvYmFsID0gd2luZG93O1xuZWxzZSB7XG5cdGdsb2JhbCA9IHt9O1xuXHRfLmVhY2hLZXkoZXZlbnRUeXBlcywgZnVuY3Rpb24oZVR5cGVzLCBldmVudENvbnN0cnVjdG9yTmFtZSkge1xuXHRcdHZhciBldmVudHNDb25zdHJ1Y3Rvcjtcblx0XHRldmFsKFxuXHRcdFx0J2V2ZW50c0NvbnN0cnVjdG9yID0gZnVuY3Rpb24gJyArIGV2ZW50Q29uc3RydWN0b3JOYW1lICsgJyh0eXBlLCBwcm9wZXJ0aWVzKSB7IFxcXG5cdFx0XHRcdHRoaXMudHlwZSA9IHR5cGU7IFxcXG5cdFx0XHRcdF8uZXh0ZW5kKHRoaXMsIHByb3BlcnRpZXMpOyBcXFxuXHRcdFx0fTsnXG5cdFx0KTtcblx0XHRnbG9iYWxbZXZlbnRDb25zdHJ1Y3Rvck5hbWVdID0gZXZlbnRzQ29uc3RydWN0b3I7XG5cdH0pO1xufVxuXG5cbnZhciBkb21FdmVudHNDb25zdHJ1Y3RvcnMgPSB7fTtcblxuXy5lYWNoS2V5KGV2ZW50VHlwZXMsIGZ1bmN0aW9uKGVUeXBlcywgZXZlbnRDb25zdHJ1Y3Rvck5hbWUpIHtcblx0ZVR5cGVzLmZvckVhY2goZnVuY3Rpb24odHlwZSkge1xuXHRcdGlmIChPYmplY3QuaGFzT3duUHJvcGVydHkoZG9tRXZlbnRzQ29uc3RydWN0b3JzLCB0eXBlKSlcblx0XHRcdHRocm93IG5ldyBFcnJvcignZHVwbGljYXRlIGV2ZW50IHR5cGUgJyArIHR5cGUpO1xuXG5cdFx0ZG9tRXZlbnRzQ29uc3RydWN0b3JzW3R5cGVdID0gZ2xvYmFsW2V2ZW50Q29uc3RydWN0b3JOYW1lXTtcblx0fSk7XG59KTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGRvbUV2ZW50c0NvbnN0cnVjdG9ycztcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIE1lc3NhZ2VTb3VyY2UgPSByZXF1aXJlKCcuLi8uLi9tZXNzZW5nZXIvbWVzc2FnZV9zb3VyY2UnKVxuXHQsIENvbXBvbmVudCA9IHJlcXVpcmUoJy4uL2NfY2xhc3MnKVxuXHQsIGRvbUV2ZW50c0NvbnN0cnVjdG9ycyA9IHJlcXVpcmUoJy4vZG9tX2V2ZW50c19jb25zdHJ1Y3RvcnMnKSAvLyBUT0RPIG1lcmdlIHdpdGggRE9NRXZlbnRTb3VyY2UgPz9cblx0LCBfID0gcmVxdWlyZSgnbW9sLXByb3RvJylcblx0LCBjaGVjayA9IHJlcXVpcmUoJy4uLy4uL3V0aWwvY2hlY2snKVxuXHQsIE1hdGNoID0gY2hlY2suTWF0Y2g7XG5cbnZhciBET01FdmVudHNTb3VyY2UgPSBfLmNyZWF0ZVN1YmNsYXNzKE1lc3NhZ2VTb3VyY2UsICdET01NZXNzYWdlU291cmNlJywgdHJ1ZSk7XG5cblxuXy5leHRlbmRQcm90byhET01FdmVudHNTb3VyY2UsIHtcblx0Ly8gaW1wbGVtZW50aW5nIE1lc3NhZ2VTb3VyY2UgaW50ZXJmYWNlXG5cdGluaXQ6IGluaXREb21FdmVudHNTb3VyY2UsXG5cdHRyYW5zbGF0ZVRvU291cmNlTWVzc2FnZTogdHJhbnNsYXRlVG9Eb21FdmVudCxcbiBcdGFkZFNvdXJjZUxpc3RlbmVyOiBhZGREb21FdmVudExpc3RlbmVyLFxuIFx0cmVtb3ZlU291cmNlTGlzdGVuZXI6IHJlbW92ZURvbUV2ZW50TGlzdGVuZXIsXG4gXHRmaWx0ZXJTb3VyY2VNZXNzYWdlOiBmaWx0ZXJDYXB0dXJlZERvbUV2ZW50LFxuXG4gXHQvLyBjbGFzcyBzcGVjaWZpYyBtZXRob2RzXG4gXHRkb206IGdldERvbUVsZW1lbnQsXG4gXHRoYW5kbGVFdmVudDogaGFuZGxlRXZlbnQsICAvLyBldmVudCBkaXNwYXRjaGVyIC0gYXMgZGVmaW5lZCBieSBFdmVudCBET00gQVBJXG4gXHR0cmlnZ2VyOiB0cmlnZ2VyRG9tRXZlbnRcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IERPTUV2ZW50c1NvdXJjZTtcblxuXG52YXIgdXNlQ2FwdHVyZVBhdHRlcm4gPSAvX19jYXB0dXJlJC87XG5cblxuZnVuY3Rpb24gaW5pdERvbUV2ZW50c1NvdXJjZShob3N0T2JqZWN0LCBwcm94eU1ldGhvZHMsIGNvbXBvbmVudCkge1xuXHRjaGVjayhjb21wb25lbnQsIENvbXBvbmVudCk7XG5cdE1lc3NhZ2VTb3VyY2UucHJvdG90eXBlLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuXHR0aGlzLmNvbXBvbmVudCA9IGNvbXBvbmVudDtcblxuXHQvLyB0aGlzLm1lc3NlbmdlciBpcyBzZXQgYnkgTWVzc2VuZ2VyIGNsYXNzXG59XG5cblxuZnVuY3Rpb24gZ2V0RG9tRWxlbWVudCgpIHtcblx0cmV0dXJuIHRoaXMuY29tcG9uZW50LmVsO1xufVxuXG5cbmZ1bmN0aW9uIHRyYW5zbGF0ZVRvRG9tRXZlbnQobWVzc2FnZSkge1xuXHRpZiAodXNlQ2FwdHVyZVBhdHRlcm4udGVzdChtZXNzYWdlKSlcblx0XHRtZXNzYWdlID0gbWVzc2FnZS5yZXBsYWNlKHVzZUNhcHR1cmVQYXR0ZXJuLCAnJyk7XG5cdHJldHVybiBtZXNzYWdlO1xufVxuXG5cbmZ1bmN0aW9uIGFkZERvbUV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlKSB7XG5cdHRoaXMuZG9tKCkuYWRkRXZlbnRMaXN0ZW5lcihldmVudFR5cGUsIHRoaXMsIGZhbHNlKTtcbn1cblxuXG5mdW5jdGlvbiByZW1vdmVEb21FdmVudExpc3RlbmVyKGV2ZW50VHlwZSkge1xuXHR0aGlzLmRvbSgpLnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlLCB0aGlzLCBmYWxzZSk7XG59XG5cblxuZnVuY3Rpb24gZmlsdGVyQ2FwdHVyZWREb21FdmVudChldmVudFR5cGUsIG1lc3NhZ2UsIGV2ZW50KSB7XG5cdHZhciBpc0NhcHR1cmVQaGFzZTtcblx0aWYgKHR5cGVvZiB3aW5kb3cgIT0gJ3VuZGVmaW5lZCcpXG5cdFx0aXNDYXB0dXJlUGhhc2UgPSBldmVudC5ldmVudFBoYXNlID09IHdpbmRvdy5FdmVudC5DQVBUVVJJTkdfUEhBU0U7XG5cblx0cmV0dXJuICghIGlzQ2FwdHVyZVBoYXNlIHx8IChpc0NhcHR1cmVQaGFzZSAmJiB1c2VDYXB0dXJlUGF0dGVybi50ZXN0KG1lc3NhZ2UpKSk7XG59XG5cblxuLy8gZXZlbnQgZGlzcGF0Y2hlciAtIGFzIGRlZmluZWQgYnkgRXZlbnQgRE9NIEFQSVxuZnVuY3Rpb24gaGFuZGxlRXZlbnQoZXZlbnQpIHtcblx0dGhpcy5kaXNwYXRjaE1lc3NhZ2UoZXZlbnQudHlwZSwgZXZlbnQpO1xufVxuXG5cbi8vIFRPRE8gbWFrZSB3b3JrIHdpdGggbWVzc2FnZXMgKHdpdGggX2NhcHR1cmUpXG5mdW5jdGlvbiB0cmlnZ2VyRG9tRXZlbnQoZXZlbnRUeXBlLCBwcm9wZXJ0aWVzKSB7XG5cdGNoZWNrKGV2ZW50VHlwZSwgU3RyaW5nKTtcblx0Y2hlY2socHJvcGVydGllcywgTWF0Y2guT3B0aW9uYWwoT2JqZWN0KSk7XG5cblx0dmFyIEV2ZW50Q29uc3RydWN0b3IgPSBkb21FdmVudHNDb25zdHJ1Y3RvcnNbZXZlbnRUeXBlXTtcblxuXHRpZiAodHlwZW9mIGV2ZW50Q29uc3RydWN0b3IgIT0gJ2Z1bmN0aW9uJylcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ3Vuc3VwcG9ydGVkIGV2ZW50IHR5cGUnKTtcblxuXHQvLyBjaGVjayBpZiBpdCBpcyBjb3JyZWN0XG5cdGlmICh0eXBlb2YgcHJvcGVydGllcyAhPSAndW5kZWZpbmVkJylcblx0XHRwcm9wZXJ0aWVzLnR5cGUgPSBldmVudFR5cGU7XG5cblx0dmFyIGRvbUV2ZW50ID0gRXZlbnRDb25zdHJ1Y3RvcihldmVudFR5cGUsIHByb3BlcnRpZXMpO1xuXG5cdHZhciBub3RDYW5jZWxsZWQgPSB0aGlzLmRvbSgpLmRpc3BhdGNoRXZlbnQoZG9tRXZlbnQpO1xuXG5cdHJldHVybiBub3RDYW5jZWxsZWQ7XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgTWVzc2FnZVNvdXJjZSA9IHJlcXVpcmUoJy4uLy4uL21lc3Nlbmdlci9tZXNzYWdlX3NvdXJjZScpXG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpXG5cdCwgY2hlY2sgPSByZXF1aXJlKCcuLi8uLi91dGlsL2NoZWNrJylcblx0LCBNYXRjaCA9IGNoZWNrLk1hdGNoO1xuXG52YXIgaUZyYW1lTWVzc2FnZVNvdXJjZSA9IF8uY3JlYXRlU3ViY2xhc3MoTWVzc2FnZVNvdXJjZSwgJ2lGcmFtZU1lc3NhZ2VTb3VyY2UnLCB0cnVlKTtcblxuXG5fLmV4dGVuZFByb3RvKGlGcmFtZU1lc3NhZ2VTb3VyY2UsIHtcblx0Ly8gaW1wbGVtZW50aW5nIE1lc3NhZ2VTb3VyY2UgaW50ZXJmYWNlXG5cdGluaXQ6IGluaXRJRnJhbWVNZXNzYWdlU291cmNlLFxuXHR0cmFuc2xhdGVUb1NvdXJjZU1lc3NhZ2U6IHRyYW5zbGF0ZVRvSUZyYW1lTWVzc2FnZSxcbiBcdGFkZFNvdXJjZUxpc3RlbmVyOiBhZGRJRnJhbWVNZXNzYWdlTGlzdGVuZXIsXG4gXHRyZW1vdmVTb3VyY2VMaXN0ZW5lcjogcmVtb3ZlSUZyYW1lTWVzc2FnZUxpc3RlbmVyLFxuIFx0ZmlsdGVyU291cmNlTWVzc2FnZTogZmlsdGVyUmVjaWV2ZWRJRnJhbWVNZXNzYWdlLFxuXG4gXHQvL2NsYXNzIHNwZWNpZmljIG1ldGhvZHNcbiBcdHBvc3Q6IHBvc3RUb090aGVyV2luZG93LFxuIFx0aGFuZGxlRXZlbnQ6IGhhbmRsZUV2ZW50ICAvLyBldmVudCBkaXNwYXRjaGVyIC0gYXMgZGVmaW5lZCBieSBFdmVudCBET00gQVBJXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBpRnJhbWVNZXNzYWdlU291cmNlO1xuXG5cbmZ1bmN0aW9uIGluaXRJRnJhbWVNZXNzYWdlU291cmNlKGhvc3RPYmplY3QsIHByb3h5TWV0aG9kcykge1xuXHRjaGVjayhob3N0T2JqZWN0LCBPYmplY3QpO1xuXHRNZXNzYWdlU291cmNlLnByb3RvdHlwZS5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cblx0aWYgKGhvc3RPYmplY3Qub3duZXIuZWwubm9kZU5hbWUgPT0gJ0lGUkFNRScpXG5cdFx0dGhpcy5fcG9zdFRvID0gaG9zdE9iamVjdC5vd25lci5lbC5jb250ZW50V2luZG93O1xuXHRlbHNlXG5cdFx0dGhpcy5fcG9zdFRvID0gd2luZG93LnBhcmVudDtcblxuXHR0aGlzLl9saXN0ZW5UbyA9IHdpbmRvdztcbn1cblxuXG5mdW5jdGlvbiB0cmFuc2xhdGVUb0lGcmFtZU1lc3NhZ2UobWVzc2FnZSkge1xuXHRyZXR1cm4gJ21lc3NhZ2UnOyAvLyBzb3VyY2VNZXNzYWdlXG59XG5cblxuZnVuY3Rpb24gYWRkSUZyYW1lTWVzc2FnZUxpc3RlbmVyKGV2ZW50VHlwZSkge1xuXHR0aGlzLl9saXN0ZW5Uby5hZGRFdmVudExpc3RlbmVyKGV2ZW50VHlwZSwgdGhpcywgZmFsc2UpO1xufVxuXG5cbmZ1bmN0aW9uIHJlbW92ZUlGcmFtZU1lc3NhZ2VMaXN0ZW5lcihldmVudFR5cGUpIHtcblx0dGhpcy5fbGlzdGVuVG8ucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudFR5cGUsIHRoaXMsIGZhbHNlKTtcbn1cblxuXG5mdW5jdGlvbiBmaWx0ZXJSZWNpZXZlZElGcmFtZU1lc3NhZ2UoZXZlbnRUeXBlLCBtZXNzYWdlLCBldmVudCkge1xuXHRyZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gcG9zdFRvT3RoZXJXaW5kb3coZXZlbnRUeXBlLCBtZXNzYWdlKSB7XG5cdG1lc3NhZ2UudHlwZSA9IGV2ZW50VHlwZTtcblx0dGhpcy5fcG9zdFRvLnBvc3RNZXNzYWdlKG1lc3NhZ2UsICcqJyk7XG59XG5cbmZ1bmN0aW9uIGhhbmRsZUV2ZW50KGV2ZW50KSB7XG5cdHRoaXMuZGlzcGF0Y2hNZXNzYWdlKGV2ZW50LnR5cGUsIGV2ZW50KTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIENsYXNzUmVnaXN0cnkgPSByZXF1aXJlKCcuLi9hYnN0cmFjdC9yZWdpc3RyeScpXG5cdCwgQ29tcG9uZW50ID0gcmVxdWlyZSgnLi9jX2NsYXNzJyk7XG5cbnZhciBjb21wb25lbnRzUmVnaXN0cnkgPSBuZXcgQ2xhc3NSZWdpc3RyeShDb21wb25lbnQpO1xuXG5jb21wb25lbnRzUmVnaXN0cnkuYWRkKENvbXBvbmVudCk7XG5cbm1vZHVsZS5leHBvcnRzID0gY29tcG9uZW50c1JlZ2lzdHJ5O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ29tcG9uZW50ID0gcmVxdWlyZSgnLi4vY19jbGFzcycpXG5cdCwgY29tcG9uZW50c1JlZ2lzdHJ5ID0gcmVxdWlyZSgnLi4vY19yZWdpc3RyeScpO1xuXG5cbnZhciBWaWV3ID0gQ29tcG9uZW50LmNyZWF0ZUNvbXBvbmVudENsYXNzKCdWaWV3JywgWydjb250YWluZXInXSk7XG5cbmNvbXBvbmVudHNSZWdpc3RyeS5hZGQoVmlldyk7XG5cbm1vZHVsZS5leHBvcnRzID0gVmlldztcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGNvbmZpZztcblxuZnVuY3Rpb24gY29uZmlnKG9wdGlvbnMpIHtcblx0Xy5kZWVwRXh0ZW5kKGNvbmZpZywgb3B0aW9ucyk7XG59XG5cbmNvbmZpZyh7XG5cdGF0dHJzOiB7XG5cdFx0YmluZDogJ21sLWJpbmQnLFxuXHRcdGxvYWQ6ICdtbC1sb2FkJ1xuXHR9XG59KTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKTtcblxubW9kdWxlLmV4cG9ydHMgPSBGYWNldDtcblxuZnVuY3Rpb24gRmFjZXQob3duZXIsIGNvbmZpZykge1xuXHR0aGlzLm93bmVyID0gb3duZXI7XG5cdHRoaXMuY29uZmlnID0gY29uZmlnIHx8IHt9O1xuXHR0aGlzLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn1cblxuXy5leHRlbmRQcm90byhGYWNldCwge1xuXHRpbml0OiBmdW5jdGlvbigpIHt9XG59KTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIEZhY2V0ID0gcmVxdWlyZSgnLi9mX2NsYXNzJylcblx0LCBfID0gcmVxdWlyZSgnbW9sLXByb3RvJylcblx0LCBjaGVjayA9IHJlcXVpcmUoJy4uL3V0aWwvY2hlY2snKVxuXHQsIE1hdGNoID0gY2hlY2suTWF0Y2g7XG5cbm1vZHVsZS5leHBvcnRzID0gRmFjZXRlZE9iamVjdDtcblxuLy8gYWJzdHJhY3QgY2xhc3MgZm9yIGZhY2V0ZWQgb2JqZWN0XG5mdW5jdGlvbiBGYWNldGVkT2JqZWN0KCkge1xuXHQvLyBUT0RPIGluc3RhbnRpYXRlIGZhY2V0cyBpZiBjb25maWd1cmF0aW9uIGlzbid0IHBhc3NlZFxuXHQvLyB3cml0ZSBhIHRlc3QgdG8gY2hlY2sgaXRcblx0dmFyIGZhY2V0c0NvbmZpZyA9IF8uY2xvbmUodGhpcy5mYWNldHNDb25maWcgfHwge30pO1xuXG5cdHZhciB0aGlzQ2xhc3MgPSB0aGlzLmNvbnN0cnVjdG9yXG5cdFx0LCBmYWNldHNEZXNjcmlwdG9ycyA9IHt9XG5cdFx0LCBmYWNldHMgPSB7fTtcblxuXHRpZiAodGhpcy5jb25zdHJ1Y3RvciA9PSBGYWNldGVkT2JqZWN0KVx0XHRcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ0ZhY2V0ZWRPYmplY3QgaXMgYW4gYWJzdHJhY3QgY2xhc3MsIGNhblxcJ3QgYmUgaW5zdGFudGlhdGVkJyk7XG5cblx0aWYgKHRoaXMuZmFjZXRzKVxuXHRcdF8uZWFjaEtleSh0aGlzLmZhY2V0cywgaW5zdGFudGlhdGVGYWNldCwgdGhpcywgdHJ1ZSk7XG5cblx0dmFyIHVudXNlZEZhY2V0c05hbWVzID0gT2JqZWN0LmtleXMoZmFjZXRzQ29uZmlnKTtcblx0aWYgKHVudXNlZEZhY2V0c05hbWVzLmxlbmd0aClcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ0NvbmZpZ3VyYXRpb24gZm9yIHVua25vd24gZmFjZXQocykgcGFzc2VkOiAnICsgdW51c2VkRmFjZXRzTmFtZXMuam9pbignLCAnKSk7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnRpZXModGhpcywgZmFjZXRzRGVzY3JpcHRvcnMpO1xuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ2ZhY2V0cycsIHsgdmFsdWU6IGZhY2V0cyB9KTtcdFxuXG5cdC8vIGNhbGxpbmcgaW5pdCBpZiBpdCBpcyBkZWZpbmVkIGluIHRoZSBjbGFzc1xuXHRpZiAodGhpcy5pbml0KVxuXHRcdHRoaXMuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG5cdGZ1bmN0aW9uIGluc3RhbnRpYXRlRmFjZXQoRmFjZXRDbGFzcywgZmN0KSB7XG5cdFx0dmFyIGZhY2V0T3B0cyA9IGZhY2V0c0NvbmZpZ1tmY3RdO1xuXHRcdGRlbGV0ZSBmYWNldHNDb25maWdbZmN0XTtcblxuXHRcdGZhY2V0c1tmY3RdID0gbmV3IEZhY2V0Q2xhc3ModGhpcywgZmFjZXRPcHRzKTtcblxuXHRcdGZhY2V0c0Rlc2NyaXB0b3JzW2ZjdF0gPSB7XG5cdFx0XHRlbnVtZXJhYmxlOiBmYWxzZSxcblx0XHRcdHZhbHVlOiBmYWNldHNbZmN0XVxuXHRcdH07XG5cdH1cbn1cblxuXG5fLmV4dGVuZFByb3RvKEZhY2V0ZWRPYmplY3QsIHtcblx0YWRkRmFjZXQ6IGFkZEZhY2V0XG59KTtcblxuXG5mdW5jdGlvbiBhZGRGYWNldChGYWNldENsYXNzLCBmYWNldE9wdHMsIGZhY2V0TmFtZSkge1xuXHRjaGVjayhGYWNldENsYXNzLCBGdW5jdGlvbik7XG5cdGNoZWNrKGZhY2V0TmFtZSwgTWF0Y2guT3B0aW9uYWwoU3RyaW5nKSk7XG5cblx0ZmFjZXROYW1lID0gXy5maXJzdExvd2VyQ2FzZShmYWNldE5hbWUgfHwgRmFjZXRDbGFzcy5uYW1lKTtcblxuXHR2YXIgcHJvdG9GYWNldHMgPSB0aGlzLmNvbnN0cnVjdG9yLnByb3RvdHlwZS5mYWNldHM7XG5cblx0aWYgKHByb3RvRmFjZXRzICYmIHByb3RvRmFjZXRzW2ZhY2V0TmFtZV0pXG5cdFx0dGhyb3cgbmV3IEVycm9yKCdmYWNldCAnICsgZmFjZXROYW1lICsgJyBpcyBhbHJlYWR5IHBhcnQgb2YgdGhlIGNsYXNzICcgKyB0aGlzLmNvbnN0cnVjdG9yLm5hbWUpO1xuXG5cdGlmICh0aGlzW2ZhY2V0TmFtZV0pXG5cdFx0dGhyb3cgbmV3IEVycm9yKCdmYWNldCAnICsgZmFjZXROYW1lICsgJyBpcyBhbHJlYWR5IHByZXNlbnQgaW4gb2JqZWN0Jyk7XG5cblx0dmFyIG5ld0ZhY2V0ID0gdGhpcy5mYWNldHNbZmFjZXROYW1lXSA9IG5ldyBGYWNldENsYXNzKHRoaXMsIGZhY2V0T3B0cyk7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIGZhY2V0TmFtZSwge1xuXHRcdGVudW1lcmFibGU6IGZhbHNlLFxuXHRcdHZhbHVlOiBuZXdGYWNldFxuXHR9KTtcblxuXHRyZXR1cm4gbmV3RmFjZXQ7XG59XG5cblxuLy8gZmFjdG9yeSB0aGF0IGNyZWF0ZXMgY2xhc3NlcyAoY29uc3RydWN0b3JzKSBmcm9tIHRoZSBtYXAgb2YgZmFjZXRzXG4vLyB0aGVzZSBjbGFzc2VzIGluaGVyaXQgZnJvbSBGYWNldGVkT2JqZWN0XG5GYWNldGVkT2JqZWN0LmNyZWF0ZUZhY2V0ZWRDbGFzcyA9IGZ1bmN0aW9uIChuYW1lLCBmYWNldHNDbGFzc2VzLCBmYWNldHNDb25maWcpIHtcblx0Y2hlY2sobmFtZSwgU3RyaW5nKTtcblx0Y2hlY2soZmFjZXRzQ2xhc3NlcywgTWF0Y2guT2JqZWN0SGFzaChGdW5jdGlvbiAvKiBNYXRjaC5TdWJjbGFzcyhGYWNldCwgdHJ1ZSkgVE9ETyAtIGZpeCAqLykpO1xuXG5cdHZhciBGYWNldGVkQ2xhc3MgPSBfLmNyZWF0ZVN1YmNsYXNzKHRoaXMsIG5hbWUsIHRydWUpO1xuXG5cdF8uZXh0ZW5kUHJvdG8oRmFjZXRlZENsYXNzLCB7XG5cdFx0ZmFjZXRzOiBmYWNldHNDbGFzc2VzLFxuXHRcdGZhY2V0c0NvbmZpZzogZmFjZXRzQ29uZmlnXG5cdH0pO1xuXHRyZXR1cm4gRmFjZXRlZENsYXNzO1xufTtcblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgbWlsb01haWwgPSByZXF1aXJlKCcuL21haWwnKVxuXHQsIHJlcXVlc3QgPSByZXF1aXJlKCcuL3V0aWwvcmVxdWVzdCcpXG5cdCwgbG9nZ2VyID0gcmVxdWlyZSgnLi91dGlsL2xvZ2dlcicpXG5cdCwgY29uZmlnID0gcmVxdWlyZSgnLi9jb25maWcnKVxuXHQsIExvYWRBdHRyaWJ1dGUgPSByZXF1aXJlKCcuL2F0dHJpYnV0ZS9hX2xvYWQnKVxuXHQsIExvYWRlckVycm9yID0gcmVxdWlyZSgnLi91dGlsL2Vycm9yJykuTG9hZGVyO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gbG9hZGVyO1xuXG5cbmZ1bmN0aW9uIGxvYWRlcihyb290RWwsIGNhbGxiYWNrKSB7XHRcblx0bWlsb01haWwub25NZXNzYWdlKCdkb21yZWFkeScsIGZ1bmN0aW9uKCkge1xuXHRcdGlmICh0eXBlb2Ygcm9vdEVsID09ICdmdW5jdGlvbicpIHtcblx0XHRcdGNhbGxiYWNrID0gcm9vdEVsO1xuXHRcdFx0cm9vdEVsID0gdW5kZWZpbmVkO1xuXHRcdH1cblxuXHRcdHJvb3RFbCA9IHJvb3RFbCB8fCBkb2N1bWVudC5ib2R5O1xuXG5cdFx0bWlsb01haWwucG9zdE1lc3NhZ2UoJ2xvYWRlcicsIHsgc3RhdGU6ICdzdGFydGVkJyB9KTtcblx0XHRfbG9hZGVyKHJvb3RFbCwgZnVuY3Rpb24odmlld3MpIHtcblx0XHRcdG1pbG9NYWlsLnBvc3RNZXNzYWdlKCdsb2FkZXInLCB7IFxuXHRcdFx0XHRzdGF0ZTogJ2ZpbmlzaGVkJyxcblx0XHRcdFx0dmlld3M6IHZpZXdzXG5cdFx0XHR9KTtcblx0XHRcdGNhbGxiYWNrKHZpZXdzKTtcblx0XHR9KTtcblx0fSk7XG59XG5cblxuZnVuY3Rpb24gX2xvYWRlcihyb290RWwsIGNhbGxiYWNrKSB7XG5cdHZhciBsb2FkRWxlbWVudHMgPSByb290RWwucXVlcnlTZWxlY3RvckFsbCgnWycgKyBjb25maWcuYXR0cnMubG9hZCArICddJyk7XG5cblx0dmFyIHZpZXdzID0ge31cblx0XHQsIHRvdGFsQ291bnQgPSBsb2FkRWxlbWVudHMubGVuZ3RoXG5cdFx0LCBsb2FkZWRDb3VudCA9IDA7XG5cblx0QXJyYXkucHJvdG90eXBlLmZvckVhY2guY2FsbChsb2FkRWxlbWVudHMsIGZ1bmN0aW9uIChlbCkge1xuXHRcdGxvYWRWaWV3KGVsLCBmdW5jdGlvbihlcnIpIHtcblx0XHRcdHZpZXdzW2VsLmlkXSA9IGVyciB8fCBlbDtcblx0XHRcdGxvYWRlZENvdW50Kys7XG5cdFx0XHRpZiAobG9hZGVkQ291bnQgPT0gdG90YWxDb3VudClcblx0XHRcdFx0Y2FsbGJhY2sodmlld3MpO1xuXHRcdH0pO1xuXHR9KTtcbn07XG5cblxuZnVuY3Rpb24gbG9hZFZpZXcoZWwsIGNhbGxiYWNrKSB7XG5cdGlmIChlbC5jaGlsZHJlbi5sZW5ndGgpXG5cdFx0dGhyb3cgbmV3IExvYWRlckVycm9yKCdjYW5cXCd0IGxvYWQgaHRtbCBpbnRvIGVsZW1lbnQgdGhhdCBpcyBub3QgZW1wdHknKTtcblxuXHR2YXIgYXR0ciA9IG5ldyBMb2FkQXR0cmlidXRlKGVsKTtcblxuXHRhdHRyLnBhcnNlKCkudmFsaWRhdGUoKTtcblxuXHRyZXF1ZXN0LmdldChhdHRyLmxvYWRVcmwsIGZ1bmN0aW9uKGVyciwgaHRtbCkge1xuXHRcdGlmIChlcnIpIHtcblx0XHRcdGVyci5tZXNzYWdlID0gZXJyLm1lc3NhZ2UgfHwgJ2NhblxcJ3QgbG9hZCBmaWxlICcgKyBhdHRyLmxvYWRVcmw7XG5cdFx0XHQvLyBsb2dnZXIuZXJyb3IoZXJyLm1lc3NhZ2UpO1xuXHRcdFx0Y2FsbGJhY2soZXJyKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRlbC5pbm5lckhUTUwgPSBodG1sO1xuXHRcdGNhbGxiYWNrKG51bGwpO1xuXHR9KTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIE1lc3NlbmdlciA9IHJlcXVpcmUoJy4uL21lc3NlbmdlcicpXG5cdCwgTWFpbE1lc3NhZ2VTb3VyY2UgPSByZXF1aXJlKCcuL21haWxfc291cmNlJyk7XG5cblxudmFyIG1haWxNc2dTb3VyY2UgPSBuZXcgTWFpbE1lc3NhZ2VTb3VyY2UoKTtcblxudmFyIG1pbG9NYWlsID0gbmV3IE1lc3Nlbmdlcih1bmRlZmluZWQsIHVuZGVmaW5lZCwgbWFpbE1zZ1NvdXJjZSk7XG5cbm1vZHVsZS5leHBvcnRzID0gbWlsb01haWw7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBNZXNzYWdlU291cmNlID0gcmVxdWlyZSgnLi4vbWVzc2VuZ2VyL21lc3NhZ2Vfc291cmNlJylcblx0LCBkb21FdmVudHNDb25zdHJ1Y3RvcnMgPSByZXF1aXJlKCcuLi9jb21wb25lbnRzL2NfbWVzc2FnZV9zb3VyY2VzL2RvbV9ldmVudHNfY29uc3RydWN0b3JzJylcblx0LCBNYWlsTWVzc2FnZVNvdXJjZUVycm9yID0gcmVxdWlyZSgnLi4vdXRpbC9lcnJvcicpLk1haWxNZXNzYWdlU291cmNlXG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpXG5cdCwgY2hlY2sgPSByZXF1aXJlKCcuLi91dGlsL2NoZWNrJylcblx0LCBNYXRjaCA9IGNoZWNrLk1hdGNoO1xuXG5cbnZhciBNYWlsTWVzc2FnZVNvdXJjZSA9IF8uY3JlYXRlU3ViY2xhc3MoTWVzc2FnZVNvdXJjZSwgJ01haWxNZXNzYWdlU291cmNlJywgdHJ1ZSk7XG5cblxuXy5leHRlbmRQcm90byhNYWlsTWVzc2FnZVNvdXJjZSwge1xuXHQvLyBpbXBsZW1lbnRpbmcgTWVzc2FnZVNvdXJjZSBpbnRlcmZhY2Vcblx0Ly8gaW5pdDogZGVmaW5lZCBpbiBNZXNzYWdlU291cmNlXG5cdHRyYW5zbGF0ZVRvU291cmNlTWVzc2FnZTogdHJhbnNsYXRlVG9Eb21FdmVudCxcbiBcdGFkZFNvdXJjZUxpc3RlbmVyOiBhZGREb21FdmVudExpc3RlbmVyLFxuIFx0cmVtb3ZlU291cmNlTGlzdGVuZXI6IHJlbW92ZURvbUV2ZW50TGlzdGVuZXIsXG4gXHRmaWx0ZXJTb3VyY2VNZXNzYWdlOiBmaWx0ZXJEb21FdmVudCxcblxuIFx0Ly8gY2xhc3Mgc3BlY2lmaWMgbWV0aG9kc1xuIFx0aGFuZGxlRXZlbnQ6IGhhbmRsZUV2ZW50LCAgLy8gZXZlbnQgZGlzcGF0Y2hlciAtIGFzIGRlZmluZWQgYnkgRXZlbnQgRE9NIEFQSVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gTWFpbE1lc3NhZ2VTb3VyY2U7XG5cblxuLy8gVE9ETzogdGhpcyBmdW5jdGlvbiBzaG91bGQgcmV0dXJuIHJlbGV2YW50IERPTSBldmVudCBkZXBlbmRlbnQgb24gZWxlbWVudCB0YWdcbi8vIENhbiBhbHNvIGltcGxlbWVudCBiZWZvcmVkYXRhY2hhbmdlZCBldmVudCB0byBhbGxvdyBwcmV2ZW50aW5nIHRoZSBjaGFuZ2VcbmZ1bmN0aW9uIHRyYW5zbGF0ZVRvRG9tRXZlbnQobWVzc2FnZSkge1xuXHRpZiAobWVzc2FnZSA9PSAnZG9tcmVhZHknKVxuXHRcdHJldHVybiAncmVhZHlzdGF0ZWNoYW5nZSc7XG59XG5cblxuZnVuY3Rpb24gYWRkRG9tRXZlbnRMaXN0ZW5lcihldmVudFR5cGUpIHtcblx0aWYgKHR5cGVvZiBkb2N1bWVudCA9PSAnb2JqZWN0Jykge1xuXHRcdGlmIChldmVudFR5cGUgPT0gJ3JlYWR5c3RhdGVjaGFuZ2UnKSB7XG5cdFx0XHRpZiAoZG9jdW1lbnQucmVhZHlTdGF0ZSA9PSAnbG9hZGluZycpXG5cdFx0XHRcdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlLCB0aGlzLCBmYWxzZSk7IC8vIG5vIGNhcHR1cmluZ1xuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdHZhciBkb21FdmVudCA9IEV2ZW50Q29uc3RydWN0b3IoZXZlbnRUeXBlLCB7IHRhcmdldDogZG9jdW1lbnQgfSk7XG5cdFx0XHRcdHRoaXMuZGlzcGF0Y2hNZXNzYWdlKGV2ZW50VHlwZSwgZXZlbnQpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxufVxuXG5cbmZ1bmN0aW9uIHJlbW92ZURvbUV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlKSB7XG5cdGlmICh0eXBlb2YgZG9jdW1lbnQgPT0gJ29iamVjdCcpXG5cdFx0ZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudFR5cGUsIHRoaXMsIGZhbHNlKTsgLy8gbm8gY2FwdHVyaW5nXG59XG5cblxuZnVuY3Rpb24gZmlsdGVyRG9tRXZlbnQoZXZlbnRUeXBlLCBtZXNzYWdlLCBldmVudCkge1xuXHRpZiAoZXZlbnRUeXBlID09ICdyZWFkeXN0YXRlY2hhbmdlJykge1xuXHRcdGlmICh0aGlzLl9kb21SZWFkeUZpcmVkKSByZXR1cm4gZmFsc2U7XG5cdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdfZG9tUmVhZHlGaXJlZCcsIHtcblx0XHRcdHdyaXRhYmxlOiB0cnVlLFxuXHRcdFx0dmFsdWU6IHRydWVcblx0XHR9KTtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxufTtcblxuXG4gLy8gZXZlbnQgZGlzcGF0Y2hlciAtIGFzIGRlZmluZWQgYnkgRXZlbnQgRE9NIEFQSVxuZnVuY3Rpb24gaGFuZGxlRXZlbnQoZXZlbnQpIHtcblx0dGhpcy5kaXNwYXRjaE1lc3NhZ2UoZXZlbnQudHlwZSwgZXZlbnQpO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgTWl4aW4gPSByZXF1aXJlKCcuLi9hYnN0cmFjdC9taXhpbicpXG5cdCwgTWVzc2FnZVNvdXJjZSA9IHJlcXVpcmUoJy4vbWVzc2FnZV9zb3VyY2UnKVxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vdXRpbC9jaGVjaycpXG5cdCwgTWF0Y2ggPSBjaGVjay5NYXRjaFxuXHQsIE1lc3NlbmdlckVycm9yID0gcmVxdWlyZSgnLi4vdXRpbC9lcnJvcicpLk1lc3NlbmdlcjtcblxuXG52YXIgZXZlbnRzU3BsaXRSZWdFeHAgPSAvXFxzKig/OlxcLHxcXHMpXFxzKi87XG5cblxudmFyIE1lc3NlbmdlciA9IF8uY3JlYXRlU3ViY2xhc3MoTWl4aW4sICdNZXNzZW5nZXInKTtcblxuXy5leHRlbmRQcm90byhNZXNzZW5nZXIsIHtcblx0aW5pdDogaW5pdE1lc3NlbmdlciwgLy8gY2FsbGVkIGJ5IE1peGluIChzdXBlcmNsYXNzKVxuXHRvbk1lc3NhZ2U6IHJlZ2lzdGVyU3Vic2NyaWJlcixcblx0b2ZmTWVzc2FnZTogcmVtb3ZlU3Vic2NyaWJlcixcblx0b25NZXNzYWdlczogcmVnaXN0ZXJTdWJzY3JpYmVycyxcblx0b2ZmTWVzc2FnZXM6IHJlbW92ZVN1YnNjcmliZXJzLFxuXHRwb3N0TWVzc2FnZTogcG9zdE1lc3NhZ2UsXG5cdGdldFN1YnNjcmliZXJzOiBnZXRNZXNzYWdlU3Vic2NyaWJlcnMsXG5cdF9jaG9vc2VTdWJzY3JpYmVyc0hhc2g6IF9jaG9vc2VTdWJzY3JpYmVyc0hhc2gsXG5cdF9yZWdpc3RlclN1YnNjcmliZXI6IF9yZWdpc3RlclN1YnNjcmliZXIsXG5cdF9yZW1vdmVTdWJzY3JpYmVyOiBfcmVtb3ZlU3Vic2NyaWJlcixcblx0X3JlbW92ZUFsbFN1YnNjcmliZXJzOiBfcmVtb3ZlQWxsU3Vic2NyaWJlcnMsXG5cdF9jYWxsUGF0dGVyblN1YnNjcmliZXJzOiBfY2FsbFBhdHRlcm5TdWJzY3JpYmVycyxcblx0X2NhbGxTdWJzY3JpYmVyczogX2NhbGxTdWJzY3JpYmVyc1xufSk7XG5cblxuTWVzc2VuZ2VyLmRlZmF1bHRNZXRob2RzID0ge1xuXHRvbk1lc3NhZ2U6ICdvbk1lc3NhZ2UnLFxuXHRvZmZNZXNzYWdlOiAnb2ZmTWVzc2FnZScsXG5cdG9uTWVzc2FnZXM6ICdvbk1lc3NhZ2VzJyxcblx0b2ZmTWVzc2FnZXM6ICdvZmZNZXNzYWdlcycsXG5cdHBvc3RNZXNzYWdlOiAncG9zdE1lc3NhZ2UnLFxuXHRnZXRTdWJzY3JpYmVyczogJ2dldFN1YnNjcmliZXJzJ1xufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IE1lc3NlbmdlcjtcblxuXG5mdW5jdGlvbiBpbml0TWVzc2VuZ2VyKGhvc3RPYmplY3QsIHByb3h5TWV0aG9kcywgbWVzc2FnZVNvdXJjZSkge1xuXHRjaGVjayhtZXNzYWdlU291cmNlLCBNYXRjaC5PcHRpb25hbChNZXNzYWdlU291cmNlKSk7XG5cblx0Ly8gaG9zdE9iamVjdCBhbmQgcHJveHlNZXRob2RzIGFyZSB1c2VkIGluIE1peGluXG4gXHQvLyBtZXNzZW5nZXIgZGF0YVxuIFx0T2JqZWN0LmRlZmluZVByb3BlcnRpZXModGhpcywge1xuIFx0XHRfbWVzc2FnZVN1YnNjcmliZXJzOiB7IHZhbHVlOiB7fSB9LFxuIFx0XHRfcGF0dGVybk1lc3NhZ2VTdWJzY3JpYmVyczogeyB2YWx1ZToge30gfSxcbiBcdFx0X21lc3NhZ2VTb3VyY2U6IHsgdmFsdWU6IG1lc3NhZ2VTb3VyY2UgfVxuIFx0fSk7XG5cbiBcdGlmIChtZXNzYWdlU291cmNlKVxuIFx0XHRtZXNzYWdlU291cmNlLm1lc3NlbmdlciA9IHRoaXM7XG59XG5cblxuZnVuY3Rpb24gcmVnaXN0ZXJTdWJzY3JpYmVyKG1lc3NhZ2VzLCBzdWJzY3JpYmVyKSB7XG5cdGNoZWNrKG1lc3NhZ2VzLCBNYXRjaC5PbmVPZihTdHJpbmcsIFtTdHJpbmddLCBSZWdFeHApKTtcblx0Y2hlY2soc3Vic2NyaWJlciwgRnVuY3Rpb24pOyBcblxuXHRpZiAodHlwZW9mIG1lc3NhZ2VzID09ICdzdHJpbmcnKVxuXHRcdG1lc3NhZ2VzID0gbWVzc2FnZXMuc3BsaXQoZXZlbnRzU3BsaXRSZWdFeHApO1xuXG5cdHZhciBzdWJzY3JpYmVyc0hhc2ggPSB0aGlzLl9jaG9vc2VTdWJzY3JpYmVyc0hhc2gobWVzc2FnZXMpO1xuXG5cdGlmIChtZXNzYWdlcyBpbnN0YW5jZW9mIFJlZ0V4cClcblx0XHRyZXR1cm4gdGhpcy5fcmVnaXN0ZXJTdWJzY3JpYmVyKHN1YnNjcmliZXJzSGFzaCwgbWVzc2FnZXMsIHN1YnNjcmliZXIpO1xuXG5cdGVsc2Uge1xuXHRcdHZhciB3YXNSZWdpc3RlcmVkID0gZmFsc2U7XG5cblx0XHRtZXNzYWdlcy5mb3JFYWNoKGZ1bmN0aW9uKG1lc3NhZ2UpIHtcblx0XHRcdHZhciBub3RZZXRSZWdpc3RlcmVkID0gdGhpcy5fcmVnaXN0ZXJTdWJzY3JpYmVyKHN1YnNjcmliZXJzSGFzaCwgbWVzc2FnZSwgc3Vic2NyaWJlcik7XHRcdFx0XG5cdFx0XHR3YXNSZWdpc3RlcmVkID0gd2FzUmVnaXN0ZXJlZCB8fCBub3RZZXRSZWdpc3RlcmVkO1x0XHRcdFxuXHRcdH0sIHRoaXMpO1xuXG5cdFx0cmV0dXJuIHdhc1JlZ2lzdGVyZWQ7XG5cdH1cbn1cblxuXG5mdW5jdGlvbiBfcmVnaXN0ZXJTdWJzY3JpYmVyKHN1YnNjcmliZXJzSGFzaCwgbWVzc2FnZSwgc3Vic2NyaWJlcikge1xuXHRpZiAoISAoc3Vic2NyaWJlcnNIYXNoW21lc3NhZ2VdICYmIHN1YnNjcmliZXJzSGFzaFttZXNzYWdlXS5sZW5ndGgpKSB7XG5cdFx0c3Vic2NyaWJlcnNIYXNoW21lc3NhZ2VdID0gW107XG5cdFx0dmFyIG5vU3Vic2NyaWJlcnMgPSB0cnVlO1xuXHRcdGlmICh0aGlzLl9tZXNzYWdlU291cmNlKVxuXHRcdFx0dGhpcy5fbWVzc2FnZVNvdXJjZS5vblN1YnNjcmliZXJBZGRlZChtZXNzYWdlKTtcblx0fVxuXG5cdHZhciBtc2dTdWJzY3JpYmVycyA9IHN1YnNjcmliZXJzSGFzaFttZXNzYWdlXTtcblx0dmFyIG5vdFlldFJlZ2lzdGVyZWQgPSBub1N1YnNjcmliZXJzIHx8IG1zZ1N1YnNjcmliZXJzLmluZGV4T2Yoc3Vic2NyaWJlcikgPT0gLTE7XG5cblx0aWYgKG5vdFlldFJlZ2lzdGVyZWQpXG5cdFx0bXNnU3Vic2NyaWJlcnMucHVzaChzdWJzY3JpYmVyKTtcblxuXHRyZXR1cm4gbm90WWV0UmVnaXN0ZXJlZDtcbn1cblxuXG5mdW5jdGlvbiByZWdpc3RlclN1YnNjcmliZXJzKG1lc3NhZ2VTdWJzY3JpYmVycykge1xuXHRjaGVjayhtZXNzYWdlU3Vic2NyaWJlcnMsIE1hdGNoLk9iamVjdEhhc2goRnVuY3Rpb24pKTtcblxuXHR2YXIgbm90WWV0UmVnaXN0ZXJlZE1hcCA9IF8ubWFwS2V5cyhtZXNzYWdlU3Vic2NyaWJlcnMsIGZ1bmN0aW9uKHN1YnNjcmliZXIsIG1lc3NhZ2VzKSB7XG5cdFx0cmV0dXJuIHRoaXMub25NZXNzYWdlKG1lc3NhZ2VzLCBzdWJzY3JpYmVyKVxuXHR9LCB0aGlzKTtcblxuXHRyZXR1cm4gbm90WWV0UmVnaXN0ZXJlZE1hcDtcbn1cblxuXG4vLyByZW1vdmVzIGFsbCBzdWJzY3JpYmVycyBmb3IgdGhlIG1lc3NhZ2UgaWYgc3Vic2NyaWJlciBpc24ndCBzdXBwbGllZFxuZnVuY3Rpb24gcmVtb3ZlU3Vic2NyaWJlcihtZXNzYWdlcywgc3Vic2NyaWJlcikge1xuXHRjaGVjayhtZXNzYWdlcywgTWF0Y2guT25lT2YoU3RyaW5nLCBbU3RyaW5nXSwgUmVnRXhwKSk7XG5cdGNoZWNrKHN1YnNjcmliZXIsIE1hdGNoLk9wdGlvbmFsKEZ1bmN0aW9uKSk7IFxuXG5cdGlmICh0eXBlb2YgbWVzc2FnZXMgPT0gJ3N0cmluZycpXG5cdFx0bWVzc2FnZXMgPSBtZXNzYWdlcy5zcGxpdChldmVudHNTcGxpdFJlZ0V4cCk7XG5cblx0dmFyIHN1YnNjcmliZXJzSGFzaCA9IHRoaXMuX2Nob29zZVN1YnNjcmliZXJzSGFzaChtZXNzYWdlcyk7XG5cblx0aWYgKG1lc3NhZ2VzIGluc3RhbmNlb2YgUmVnRXhwKVxuXHRcdHJldHVybiB0aGlzLl9yZW1vdmVTdWJzY3JpYmVyKHN1YnNjcmliZXJzSGFzaCwgbWVzc2FnZXMsIHN1YnNjcmliZXIpO1xuXG5cdGVsc2Uge1xuXHRcdHZhciB3YXNSZW1vdmVkID0gZmFsc2U7XG5cblx0XHRtZXNzYWdlcy5mb3JFYWNoKGZ1bmN0aW9uKG1lc3NhZ2UpIHtcblx0XHRcdHZhciBzdWJzY3JpYmVyUmVtb3ZlZCA9IHRoaXMuX3JlbW92ZVN1YnNjcmliZXIoc3Vic2NyaWJlcnNIYXNoLCBtZXNzYWdlLCBzdWJzY3JpYmVyKTtcdFx0XHRcblx0XHRcdHdhc1JlbW92ZWQgPSB3YXNSZW1vdmVkIHx8IHN1YnNjcmliZXJSZW1vdmVkO1x0XHRcdFxuXHRcdH0sIHRoaXMpO1xuXG5cdFx0cmV0dXJuIHdhc1JlbW92ZWQ7XG5cdH1cbn1cblxuXG5mdW5jdGlvbiBfcmVtb3ZlU3Vic2NyaWJlcihzdWJzY3JpYmVyc0hhc2gsIG1lc3NhZ2UsIHN1YnNjcmliZXIpIHtcblx0dmFyIG1zZ1N1YnNjcmliZXJzID0gc3Vic2NyaWJlcnNIYXNoW21lc3NhZ2VdO1xuXHRpZiAoISBtc2dTdWJzY3JpYmVycyB8fCAhIG1zZ1N1YnNjcmliZXJzLmxlbmd0aClcblx0XHRyZXR1cm4gZmFsc2U7IC8vIG5vdGhpbmcgcmVtb3ZlZFxuXG5cdGlmIChzdWJzY3JpYmVyKSB7XG5cdFx0dmFyIHN1YnNjcmliZXJJbmRleCA9IG1zZ1N1YnNjcmliZXJzLmluZGV4T2Yoc3Vic2NyaWJlcik7XG5cdFx0aWYgKHN1YnNjcmliZXJJbmRleCA9PSAtMSkgXG5cdFx0XHRyZXR1cm4gZmFsc2U7IC8vIG5vdGhpbmcgcmVtb3ZlZFxuXHRcdG1zZ1N1YnNjcmliZXJzLnNwbGljZShzdWJzY3JpYmVySW5kZXgsIDEpO1xuXHRcdGlmICghIG1zZ1N1YnNjcmliZXJzLmxlbmd0aClcblx0XHRcdHRoaXMuX3JlbW92ZUFsbFN1YnNjcmliZXJzKHN1YnNjcmliZXJzSGFzaCwgbWVzc2FnZSk7XG5cblx0fSBlbHNlIFxuXHRcdHRoaXMuX3JlbW92ZUFsbFN1YnNjcmliZXJzKHN1YnNjcmliZXJzSGFzaCwgbWVzc2FnZSk7XG5cblx0cmV0dXJuIHRydWU7IC8vIHN1YnNjcmliZXIocykgcmVtb3ZlZFxufVxuXG5cbmZ1bmN0aW9uIF9yZW1vdmVBbGxTdWJzY3JpYmVycyhzdWJzY3JpYmVyc0hhc2gsIG1lc3NhZ2UpIHtcblx0ZGVsZXRlIHN1YnNjcmliZXJzSGFzaFttZXNzYWdlXTtcblx0aWYgKHRoaXMuX21lc3NhZ2VTb3VyY2UpXG5cdFx0dGhpcy5fbWVzc2FnZVNvdXJjZS5vblN1YnNjcmliZXJSZW1vdmVkKG1lc3NhZ2UpO1xufVxuXG5cbmZ1bmN0aW9uIHJlbW92ZVN1YnNjcmliZXJzKG1lc3NhZ2VTdWJzY3JpYmVycykge1xuXHRjaGVjayhtZXNzYWdlU3Vic2NyaWJlcnMsIE1hdGNoLk9iamVjdEhhc2goRnVuY3Rpb24pKTtcblxuXHR2YXIgc3Vic2NyaWJlclJlbW92ZWRNYXAgPSBfLm1hcEtleXMobWVzc2FnZVN1YnNjcmliZXJzLCBmdW5jdGlvbihzdWJzY3JpYmVyLCBtZXNzYWdlcykge1xuXHRcdHJldHVybiB0aGlzLm9mZk1lc3NhZ2VzKG1lc3NhZ2VzLCBzdWJzY3JpYmVyKVxuXHR9LCB0aGlzKTtcblxuXHRyZXR1cm4gc3Vic2NyaWJlclJlbW92ZWRNYXA7XHRcbn1cblxuXG4vLyBUT0RPIC0gc2VuZCBldmVudCB0byBtZXNzYWdlU291cmNlXG5cblxuZnVuY3Rpb24gcG9zdE1lc3NhZ2UobWVzc2FnZSwgZGF0YSkge1xuXHRjaGVjayhtZXNzYWdlLCBNYXRjaC5PbmVPZihTdHJpbmcsIFJlZ0V4cCkpO1xuXG5cdHZhciBzdWJzY3JpYmVyc0hhc2ggPSB0aGlzLl9jaG9vc2VTdWJzY3JpYmVyc0hhc2gobWVzc2FnZSk7XG5cdHZhciBtc2dTdWJzY3JpYmVycyA9IHN1YnNjcmliZXJzSGFzaFttZXNzYWdlXTtcblxuXHR0aGlzLl9jYWxsU3Vic2NyaWJlcnMobWVzc2FnZSwgZGF0YSwgbXNnU3Vic2NyaWJlcnMpO1xuXG5cdGlmICh0eXBlb2YgbWVzc2FnZSA9PSAnc3RyaW5nJylcblx0XHR0aGlzLl9jYWxsUGF0dGVyblN1YnNjcmliZXJzKG1lc3NhZ2UsIGRhdGEpO1xufVxuXG5cbmZ1bmN0aW9uIF9jYWxsUGF0dGVyblN1YnNjcmliZXJzKG1lc3NhZ2UsIGRhdGEpIHtcblx0Xy5lYWNoS2V5KHRoaXMuX3BhdHRlcm5NZXNzYWdlU3Vic2NyaWJlcnMsIFxuXHRcdGZ1bmN0aW9uKHBhdHRlcm5TdWJzY3JpYmVycywgcGF0dGVybikge1xuXHRcdFx0aWYgKHBhdHRlcm4udGVzdChtZXNzYWdlKSlcblx0XHRcdFx0dGhpcy5fY2FsbFN1YnNjcmliZXJzKG1lc3NhZ2UsIGRhdGEsIHBhdHRlcm5TdWJzY3JpYmVycyk7XG5cdFx0fVxuXHQsIHRoaXMpO1xufVxuXG5cbmZ1bmN0aW9uIF9jYWxsU3Vic2NyaWJlcnMobWVzc2FnZSwgZGF0YSwgbXNnU3Vic2NyaWJlcnMpIHtcblx0aWYgKG1zZ1N1YnNjcmliZXJzICYmIG1zZ1N1YnNjcmliZXJzLmxlbmd0aClcblx0XHRtc2dTdWJzY3JpYmVycy5mb3JFYWNoKGZ1bmN0aW9uKHN1YnNjcmliZXIpIHtcblx0XHRcdHN1YnNjcmliZXIuY2FsbCh0aGlzLCBtZXNzYWdlLCBkYXRhKTtcblx0XHR9LCB0aGlzKTtcbn1cblxuXG5mdW5jdGlvbiBnZXRNZXNzYWdlU3Vic2NyaWJlcnMobWVzc2FnZSwgaW5jbHVkZVBhdHRlcm5TdWJzY3JpYmVycykge1xuXHRjaGVjayhtZXNzYWdlLCBNYXRjaC5PbmVPZihTdHJpbmcsIFJlZ0V4cCkpO1xuXG5cdHZhciBzdWJzY3JpYmVyc0hhc2ggPSB0aGlzLl9jaG9vc2VTdWJzY3JpYmVyc0hhc2gobWVzc2FnZSk7XG5cdHZhciBtc2dTdWJzY3JpYmVycyA9IHN1YnNjcmliZXJzSGFzaFttZXNzYWdlXVxuXHRcdFx0XHRcdFx0XHQ/IFtdLmNvbmNhdChzdWJzY3JpYmVyc0hhc2hbbWVzc2FnZV0pXG5cdFx0XHRcdFx0XHRcdDogW107XG5cblx0Ly8gcGF0dGVybiBzdWJzY3JpYmVycyBhcmUgaW5jdWRlZCBieSBkZWZhdWx0XG5cdGlmIChpbmNsdWRlUGF0dGVyblN1YnNjcmliZXJzICE9PSBmYWxzZSAmJiB0eXBlb2YgbWVzc2FnZSA9PSAnc3RyaW5nJykge1xuXHRcdF8uZWFjaEtleSh0aGlzLl9wYXR0ZXJuTWVzc2FnZVN1YnNjcmliZXJzLCBcblx0XHRcdGZ1bmN0aW9uKHBhdHRlcm5TdWJzY3JpYmVycywgcGF0dGVybikge1xuXHRcdFx0XHRpZiAocGF0dGVyblN1YnNjcmliZXJzICYmIHBhdHRlcm5TdWJzY3JpYmVycy5sZW5ndGhcblx0XHRcdFx0XHRcdCYmIHBhdHRlcm4udGVzdChtZXNzYWdlKSlcblx0XHRcdFx0XHRfLmFwcGVuZEFycmF5KG1zZ1N1YnNjcmliZXJzLCBwYXR0ZXJuU3Vic2NyaWJlcnMpO1xuXHRcdFx0fVxuXHRcdCk7XG5cdH1cblxuXHRyZXR1cm4gbXNnU3Vic2NyaWJlcnMubGVuZ3RoXG5cdFx0XHRcdD8gbXNnU3Vic2NyaWJlcnNcblx0XHRcdFx0OiB1bmRlZmluZWQ7XG59XG5cblxuZnVuY3Rpb24gX2Nob29zZVN1YnNjcmliZXJzSGFzaChtZXNzYWdlKSB7XG5cdHJldHVybiBtZXNzYWdlIGluc3RhbmNlb2YgUmVnRXhwXG5cdFx0XHRcdD8gdGhpcy5fcGF0dGVybk1lc3NhZ2VTdWJzY3JpYmVyc1xuXHRcdFx0XHQ6IHRoaXMuX21lc3NhZ2VTdWJzY3JpYmVycztcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIE1peGluID0gcmVxdWlyZSgnLi4vYWJzdHJhY3QvbWl4aW4nKVxuXHQsIGxvZ2dlciA9IHJlcXVpcmUoJy4uL3V0aWwvbG9nZ2VyJylcblx0LCB0b0JlSW1wbGVtZW50ZWQgPSByZXF1aXJlKCcuLi91dGlsL2Vycm9yJykudG9CZUltcGxlbWVudGVkXG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpO1xuXG4vLyBhbiBhYnN0cmFjdCBjbGFzcyBmb3IgZGlzcGF0Y2hpbmcgZXh0ZXJuYWwgdG8gaW50ZXJuYWwgZXZlbnRzXG52YXIgTWVzc2FnZVNvdXJjZSA9IF8uY3JlYXRlU3ViY2xhc3MoTWl4aW4sICdNZXNzYWdlU291cmNlJywgdHJ1ZSk7XG5cbm1vZHVsZS5leHBvcnRzID0gTWVzc2FnZVNvdXJjZTtcblxuXG5fLmV4dGVuZFByb3RvKE1lc3NhZ2VTb3VyY2UsIHtcblx0Ly8gaW5pdGlhbGl6ZXMgbWVzc2FnZVNvdXJjZSAtIGNhbGxlZCBieSBNaXhpbiBzdXBlcmNsYXNzXG5cdGluaXQ6IGluaXRNZXNzYWdlU291cmNlLFxuXG5cdC8vIGNhbGxlZCBieSBNZXNzZW5nZXIgdG8gbm90aWZ5IHdoZW4gdGhlIGZpcnN0IHN1YnNjcmliZXIgZm9yIGFuIGludGVybmFsIG1lc3NhZ2Ugd2FzIGFkZGVkXG5cdG9uU3Vic2NyaWJlckFkZGVkOiBvblN1YnNjcmliZXJBZGRlZCxcblxuXHQvLyBjYWxsZWQgYnkgTWVzc2VuZ2VyIHRvIG5vdGlmeSB3aGVuIHRoZSBsYXN0IHN1YnNjcmliZXIgZm9yIGFuIGludGVybmFsIG1lc3NhZ2Ugd2FzIHJlbW92ZWRcbiBcdG9uU3Vic2NyaWJlclJlbW92ZWQ6IG9uU3Vic2NyaWJlclJlbW92ZWQsIFxuXG4gXHQvLyBkaXNwYXRjaGVzIHNvdXJjZSBtZXNzYWdlXG4gXHRkaXNwYXRjaE1lc3NhZ2U6IGRpc3BhdGNoU291cmNlTWVzc2FnZSxcblxuXHQvLyBmaWx0ZXJzIHNvdXJjZSBtZXNzYWdlIGJhc2VkIG9uIHRoZSBkYXRhIG9mIHRoZSBtZXNzYWdlIC0gc2hvdWxkIGJlIGltcGxlbWVudGVkIGluIHN1YmNsYXNzXG5cdGZpbHRlclNvdXJjZU1lc3NhZ2U6IGRpc3BhdGNoQWxsU291cmNlTWVzc2FnZXMsXG5cbiBcdC8vICoqKlxuIFx0Ly8gTWV0aG9kcyBiZWxvdyBtdXN0IGJlIGltcGxlbWVudGVkIGluIHN1YmNsYXNzXG4gXHRcblx0Ly8gY29udmVydHMgaW50ZXJuYWwgbWVzc2FnZSB0eXBlIHRvIGV4dGVybmFsIG1lc3NhZ2UgdHlwZSAtIHNob3VsZCBiZSBpbXBsZW1lbnRlZCBpbiBzdWJjbGFzc1xuXHR0cmFuc2xhdGVUb1NvdXJjZU1lc3NhZ2U6IHRvQmVJbXBsZW1lbnRlZCxcblxuIFx0Ly8gYWRkcyBsaXN0ZW5lciB0byBleHRlcm5hbCBtZXNzYWdlIC0gc2hvdWxkIGJlIGltcGxlbWVudGVkIGJ5IHN1YmNsYXNzXG4gXHRhZGRTb3VyY2VMaXN0ZW5lcjogdG9CZUltcGxlbWVudGVkLFxuXG4gXHQvLyByZW1vdmVzIGxpc3RlbmVyIGZyb20gZXh0ZXJuYWwgbWVzc2FnZSAtIHNob3VsZCBiZSBpbXBsZW1lbnRlZCBieSBzdWJjbGFzc1xuIFx0cmVtb3ZlU291cmNlTGlzdGVuZXI6IHRvQmVJbXBsZW1lbnRlZCxcbn0pO1xuXG5cbmZ1bmN0aW9uIGluaXRNZXNzYWdlU291cmNlKCkge1xuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ19pbnRlcm5hbE1lc3NhZ2VzJywgeyB2YWx1ZToge30gfSk7XG59XG5cblxuZnVuY3Rpb24gb25TdWJzY3JpYmVyQWRkZWQobWVzc2FnZSkge1xuXHR2YXIgc291cmNlTWVzc2FnZSA9IHRoaXMudHJhbnNsYXRlVG9Tb3VyY2VNZXNzYWdlKG1lc3NhZ2UpO1xuXG5cdGlmICghIHNvdXJjZU1lc3NhZ2UpIHJldHVybjtcblxuXHRpZiAoISB0aGlzLl9pbnRlcm5hbE1lc3NhZ2VzLmhhc093blByb3BlcnR5KHNvdXJjZU1lc3NhZ2UpKSB7XG5cdFx0dGhpcy5hZGRTb3VyY2VMaXN0ZW5lcihzb3VyY2VNZXNzYWdlKTtcblx0XHR0aGlzLl9pbnRlcm5hbE1lc3NhZ2VzW3NvdXJjZU1lc3NhZ2VdID0gW107XG5cdH1cblx0dmFyIGludGVybmFsTXNncyA9IHRoaXMuX2ludGVybmFsTWVzc2FnZXNbc291cmNlTWVzc2FnZV07XG5cblx0aWYgKGludGVybmFsTXNncy5pbmRleE9mKG1lc3NhZ2UpID09IC0xKVxuXHRcdGludGVybmFsTXNncy5wdXNoKG1lc3NhZ2UpO1xuXHRlbHNlXG5cdFx0bG9nZ2VyLndhcm4oJ0R1cGxpY2F0ZSBub3RpZmljYXRpb24gcmVjZWl2ZWQ6IGZvciBzdWJzY3JpYmUgdG8gaW50ZXJuYWwgbWVzc2FnZSAnICsgbWVzc2FnZSk7XG59XG5cblxuZnVuY3Rpb24gb25TdWJzY3JpYmVyUmVtb3ZlZChtZXNzYWdlKSB7XG5cdHZhciBzb3VyY2VNZXNzYWdlID0gdGhpcy50cmFuc2xhdGVUb1NvdXJjZU1lc3NhZ2UobWVzc2FnZSk7XG5cblx0aWYgKCEgc291cmNlTWVzc2FnZSkgcmV0dXJuO1xuXG5cdHZhciBpbnRlcm5hbE1zZ3MgPSB0aGlzLl9pbnRlcm5hbE1lc3NhZ2VzW3NvdXJjZU1lc3NhZ2VdO1xuXG5cdGlmIChpbnRlcm5hbE1zZ3MgJiYgaW50ZXJuYWxNc2dzLmxlbmd0aCkge1xuXHRcdG1lc3NhZ2VJbmRleCA9IGludGVybmFsTXNncy5pbmRleE9mKG1lc3NhZ2UpO1xuXHRcdGlmIChtZXNzYWdlSW5kZXggPj0gMCkge1xuXHRcdFx0aW50ZXJuYWxNc2dzLnNwbGljZShtZXNzYWdlSW5kZXgsIDEpO1xuXHRcdFx0aWYgKGludGVybmFsTXNncy5sZW5ndGggPT0gMCkge1xuXHRcdFx0XHRkZWxldGUgdGhpcy5faW50ZXJuYWxNZXNzYWdlc1tzb3VyY2VNZXNzYWdlXTtcblx0XHRcdFx0dGhpcy5yZW1vdmVTb3VyY2VMaXN0ZW5lcihzb3VyY2VNZXNzYWdlKTtcblx0XHRcdH1cblx0XHR9IGVsc2Vcblx0XHRcdHVuZXhwZWN0ZWROb3RpZmljYXRpb25XYXJuaW5nKCk7XG5cdH0gZWxzZVxuXHRcdHVuZXhwZWN0ZWROb3RpZmljYXRpb25XYXJuaW5nKCk7XG5cblxuXHRmdW5jdGlvbiB1bmV4cGVjdGVkTm90aWZpY2F0aW9uV2FybmluZygpIHtcblx0XHRsb2dnZXIud2Fybignbm90aWZpY2F0aW9uIHJlY2VpdmVkOiB1bi1zdWJzY3JpYmUgZnJvbSBpbnRlcm5hbCBtZXNzYWdlICcgKyBtZXNzYWdlXG5cdFx0XHRcdFx0ICsgJyB3aXRob3V0IHByZXZpb3VzIHN1YnNjcmlwdGlvbiBub3RpZmljYXRpb24nKTtcblx0fVxufVxuXG5cbmZ1bmN0aW9uIGRpc3BhdGNoU291cmNlTWVzc2FnZShzb3VyY2VNZXNzYWdlLCBkYXRhKSB7XG5cdHZhciBpbnRlcm5hbE1zZ3MgPSB0aGlzLl9pbnRlcm5hbE1lc3NhZ2VzW3NvdXJjZU1lc3NhZ2VdO1xuXG5cdGlmIChpbnRlcm5hbE1zZ3MgJiYgaW50ZXJuYWxNc2dzLmxlbmd0aClcblx0XHRpbnRlcm5hbE1zZ3MuZm9yRWFjaChmdW5jdGlvbihtZXNzYWdlKSB7XG5cdFx0XHRpZiAodGhpcy5maWx0ZXJTb3VyY2VNZXNzYWdlXG5cdFx0XHRcdFx0JiYgdGhpcy5maWx0ZXJTb3VyY2VNZXNzYWdlKHNvdXJjZU1lc3NhZ2UsIG1lc3NhZ2UsIGRhdGEpKVxuXHRcdFx0XHR0aGlzLm1lc3Nlbmdlci5wb3N0TWVzc2FnZShtZXNzYWdlLCBkYXRhKTtcblx0XHR9LCB0aGlzKTtcblx0ZWxzZVxuXHRcdGxvZ2dlci53YXJuKCdzb3VyY2UgbWVzc2FnZSByZWNlaXZlZCBmb3Igd2hpY2ggdGhlcmUgaXMgbm8gbWFwcGVkIGludGVybmFsIG1lc3NhZ2UnKTtcbn1cblxuXG4vLyBjYW4gYmUgb3ZlcnJpZGRlbiBpbiBzdWJjbGFzcyB0byBpbXBsZW1lbnQgZmlsdGVyaW5nIGJhc2VkIG9uIG1lc3NhZ2UgZGF0YVxuZnVuY3Rpb24gZGlzcGF0Y2hBbGxTb3VyY2VNZXNzYWdlcyhzb3VyY2VNZXNzYWdlLCBtZXNzYWdlLCBkYXRhKSB7XG5cdHJldHVybiB0cnVlO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgbWlsbyA9IHtcblx0bG9hZGVyOiByZXF1aXJlKCcuL2xvYWRlcicpLFxuXHRiaW5kZXI6IHJlcXVpcmUoJy4vYmluZGVyJyksXG5cdG1haWw6IHJlcXVpcmUoJy4vbWFpbCcpLFxuXHRjb25maWc6IHJlcXVpcmUoJy4vY29uZmlnJyksXG5cdHV0aWw6IHJlcXVpcmUoJy4vdXRpbCcpLFxuXHRjbGFzc2VzOiByZXF1aXJlKCcuL2NsYXNzZXMnKVxufVxuXG5cbi8vIHVzZWQgZmFjZXRzXG5yZXF1aXJlKCcuL2NvbXBvbmVudHMvY19mYWNldHMvRG9tJyk7XG5yZXF1aXJlKCcuL2NvbXBvbmVudHMvY19mYWNldHMvRGF0YScpO1xucmVxdWlyZSgnLi9jb21wb25lbnRzL2NfZmFjZXRzL0ZyYW1lJyk7XG5yZXF1aXJlKCcuL2NvbXBvbmVudHMvY19mYWNldHMvRXZlbnRzJyk7XG5yZXF1aXJlKCcuL2NvbXBvbmVudHMvY19mYWNldHMvVGVtcGxhdGUnKTtcbnJlcXVpcmUoJy4vY29tcG9uZW50cy9jX2ZhY2V0cy9Db250YWluZXInKTtcbnJlcXVpcmUoJy4vY29tcG9uZW50cy9jX2ZhY2V0cy9EcmFnJyk7XG5yZXF1aXJlKCcuL2NvbXBvbmVudHMvY19mYWNldHMvRHJvcCcpO1xucmVxdWlyZSgnLi9jb21wb25lbnRzL2NfZmFjZXRzL0VkaXRhYmxlJyk7XG5cbi8vIHVzZWQgY29tcG9uZW50c1xucmVxdWlyZSgnLi9jb21wb25lbnRzL2NsYXNzZXMvVmlldycpO1xuXG5cbi8vIGV4cG9ydCBmb3Igbm9kZS9icm93c2VyaWZ5XG5pZiAodHlwZW9mIG1vZHVsZSA9PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cylcdFxuXHRtb2R1bGUuZXhwb3J0cyA9IG1pbG87XG5cbi8vIGdsb2JhbCBtaWxvIGZvciBicm93c2VyXG5pZiAodHlwZW9mIHdpbmRvdyA9PSAnb2JqZWN0Jylcblx0d2luZG93Lm1pbG8gPSBtaWxvO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyBYWFggZG9jc1xuXG4vLyBUaGluZ3Mgd2UgZXhwbGljaXRseSBkbyBOT1Qgc3VwcG9ydDpcbi8vICAgIC0gaGV0ZXJvZ2Vub3VzIGFycmF5c1xudmFyIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKTtcblxudmFyIGNoZWNrID0gZnVuY3Rpb24gKHZhbHVlLCBwYXR0ZXJuKSB7XG4gIC8vIFJlY29yZCB0aGF0IGNoZWNrIGdvdCBjYWxsZWQsIGlmIHNvbWVib2R5IGNhcmVkLlxuICB0cnkge1xuICAgIGNoZWNrU3VidHJlZSh2YWx1ZSwgcGF0dGVybik7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGlmICgoZXJyIGluc3RhbmNlb2YgTWF0Y2guRXJyb3IpICYmIGVyci5wYXRoKVxuICAgICAgZXJyLm1lc3NhZ2UgKz0gXCIgaW4gZmllbGQgXCIgKyBlcnIucGF0aDtcbiAgICB0aHJvdyBlcnI7XG4gIH1cbn07XG5tb2R1bGUuZXhwb3J0cyA9IGNoZWNrO1xuXG52YXIgTWF0Y2ggPSBjaGVjay5NYXRjaCA9IHtcbiAgT3B0aW9uYWw6IGZ1bmN0aW9uIChwYXR0ZXJuKSB7XG4gICAgcmV0dXJuIG5ldyBPcHRpb25hbChwYXR0ZXJuKTtcbiAgfSxcbiAgT25lT2Y6IGZ1bmN0aW9uICgvKmFyZ3VtZW50cyovKSB7XG4gICAgcmV0dXJuIG5ldyBPbmVPZihhcmd1bWVudHMpO1xuICB9LFxuICBBbnk6IFsnX19hbnlfXyddLFxuICBXaGVyZTogZnVuY3Rpb24gKGNvbmRpdGlvbikge1xuICAgIHJldHVybiBuZXcgV2hlcmUoY29uZGl0aW9uKTtcbiAgfSxcbiAgT2JqZWN0SW5jbHVkaW5nOiBmdW5jdGlvbiAocGF0dGVybikge1xuICAgIHJldHVybiBuZXcgT2JqZWN0SW5jbHVkaW5nKHBhdHRlcm4pO1xuICB9LFxuICAvLyBNYXRjaGVzIG9ubHkgc2lnbmVkIDMyLWJpdCBpbnRlZ2Vyc1xuICBJbnRlZ2VyOiBbJ19faW50ZWdlcl9fJ10sXG5cbiAgLy8gTWF0Y2hlcyBoYXNoIChvYmplY3QpIHdpdGggdmFsdWVzIG1hdGNoaW5nIHBhdHRlcm5cbiAgT2JqZWN0SGFzaDogZnVuY3Rpb24ocGF0dGVybikge1xuICAgIHJldHVybiBuZXcgT2JqZWN0SGFzaChwYXR0ZXJuKTtcbiAgfSxcblxuICBTdWJjbGFzczogZnVuY3Rpb24oU3VwZXJjbGFzcywgbWF0Y2hTdXBlcmNsYXNzVG9vKSB7XG4gICAgcmV0dXJuIG5ldyBTdWJjbGFzcyhTdXBlcmNsYXNzLCBtYXRjaFN1cGVyY2xhc3NUb28pO1xuICB9LFxuXG4gIC8vIFhYWCBtYXRjaGVycyBzaG91bGQga25vdyBob3cgdG8gZGVzY3JpYmUgdGhlbXNlbHZlcyBmb3IgZXJyb3JzXG4gIEVycm9yOiBUeXBlRXJyb3IsXG5cbiAgLy8gTWV0ZW9yLm1ha2VFcnJvclR5cGUoXCJNYXRjaC5FcnJvclwiLCBmdW5jdGlvbiAobXNnKSB7XG4gICAgLy8gdGhpcy5tZXNzYWdlID0gXCJNYXRjaCBlcnJvcjogXCIgKyBtc2c7XG4gICAgLy8gVGhlIHBhdGggb2YgdGhlIHZhbHVlIHRoYXQgZmFpbGVkIHRvIG1hdGNoLiBJbml0aWFsbHkgZW1wdHksIHRoaXMgZ2V0c1xuICAgIC8vIHBvcHVsYXRlZCBieSBjYXRjaGluZyBhbmQgcmV0aHJvd2luZyB0aGUgZXhjZXB0aW9uIGFzIGl0IGdvZXMgYmFjayB1cCB0aGVcbiAgICAvLyBzdGFjay5cbiAgICAvLyBFLmcuOiBcInZhbHNbM10uZW50aXR5LmNyZWF0ZWRcIlxuICAgIC8vIHRoaXMucGF0aCA9IFwiXCI7XG4gICAgLy8gSWYgdGhpcyBnZXRzIHNlbnQgb3ZlciBERFAsIGRvbid0IGdpdmUgZnVsbCBpbnRlcm5hbCBkZXRhaWxzIGJ1dCBhdCBsZWFzdFxuICAgIC8vIHByb3ZpZGUgc29tZXRoaW5nIGJldHRlciB0aGFuIDUwMCBJbnRlcm5hbCBzZXJ2ZXIgZXJyb3IuXG4gIC8vICAgdGhpcy5zYW5pdGl6ZWRFcnJvciA9IG5ldyBNZXRlb3IuRXJyb3IoNDAwLCBcIk1hdGNoIGZhaWxlZFwiKTtcbiAgLy8gfSksXG5cbiAgLy8gVGVzdHMgdG8gc2VlIGlmIHZhbHVlIG1hdGNoZXMgcGF0dGVybi4gVW5saWtlIGNoZWNrLCBpdCBtZXJlbHkgcmV0dXJucyB0cnVlXG4gIC8vIG9yIGZhbHNlICh1bmxlc3MgYW4gZXJyb3Igb3RoZXIgdGhhbiBNYXRjaC5FcnJvciB3YXMgdGhyb3duKS5cbiAgdGVzdDogZnVuY3Rpb24gKHZhbHVlLCBwYXR0ZXJuKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNoZWNrU3VidHJlZSh2YWx1ZSwgcGF0dGVybik7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoZSBpbnN0YW5jZW9mIE1hdGNoLkVycm9yKVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAvLyBSZXRocm93IG90aGVyIGVycm9ycy5cbiAgICAgIHRocm93IGU7XG4gICAgfVxuICB9XG59O1xuXG5mdW5jdGlvbiBPcHRpb25hbChwYXR0ZXJuKSB7XG4gIHRoaXMucGF0dGVybiA9IHBhdHRlcm47XG59O1xuXG5mdW5jdGlvbiBPbmVPZihjaG9pY2VzKSB7XG4gIGlmIChjaG9pY2VzLmxlbmd0aCA9PSAwKVxuICAgIHRocm93IG5ldyBFcnJvcihcIk11c3QgcHJvdmlkZSBhdCBsZWFzdCBvbmUgY2hvaWNlIHRvIE1hdGNoLk9uZU9mXCIpO1xuICB0aGlzLmNob2ljZXMgPSBjaG9pY2VzO1xufTtcblxuZnVuY3Rpb24gV2hlcmUoY29uZGl0aW9uKSB7XG4gIHRoaXMuY29uZGl0aW9uID0gY29uZGl0aW9uO1xufTtcblxuZnVuY3Rpb24gT2JqZWN0SW5jbHVkaW5nKHBhdHRlcm4pIHtcbiAgdGhpcy5wYXR0ZXJuID0gcGF0dGVybjtcbn07XG5cbmZ1bmN0aW9uIE9iamVjdEhhc2gocGF0dGVybikge1xuICB0aGlzLnBhdHRlcm4gPSBwYXR0ZXJuO1xufTtcblxuZnVuY3Rpb24gU3ViY2xhc3MoU3VwZXJjbGFzcywgbWF0Y2hTdXBlcmNsYXNzVG9vKSB7XG4gIHRoaXMuU3VwZXJjbGFzcyA9IFN1cGVyY2xhc3M7XG4gIHRoaXMubWF0Y2hTdXBlcmNsYXNzID0gbWF0Y2hTdXBlcmNsYXNzVG9vO1xufTtcblxudmFyIHR5cGVvZkNoZWNrcyA9IFtcbiAgW1N0cmluZywgXCJzdHJpbmdcIl0sXG4gIFtOdW1iZXIsIFwibnVtYmVyXCJdLFxuICBbQm9vbGVhbiwgXCJib29sZWFuXCJdLFxuICAvLyBXaGlsZSB3ZSBkb24ndCBhbGxvdyB1bmRlZmluZWQgaW4gSlNPTiwgdGhpcyBpcyBnb29kIGZvciBvcHRpb25hbFxuICAvLyBhcmd1bWVudHMgd2l0aCBPbmVPZi5cbiAgW3VuZGVmaW5lZCwgXCJ1bmRlZmluZWRcIl1cbl07XG5cbmZ1bmN0aW9uIGNoZWNrU3VidHJlZSh2YWx1ZSwgcGF0dGVybikge1xuICAvLyBNYXRjaCBhbnl0aGluZyFcbiAgaWYgKHBhdHRlcm4gPT09IE1hdGNoLkFueSlcbiAgICByZXR1cm47XG5cbiAgLy8gQmFzaWMgYXRvbWljIHR5cGVzLlxuICAvLyBEbyBub3QgbWF0Y2ggYm94ZWQgb2JqZWN0cyAoZS5nLiBTdHJpbmcsIEJvb2xlYW4pXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdHlwZW9mQ2hlY2tzLmxlbmd0aDsgKytpKSB7XG4gICAgaWYgKHBhdHRlcm4gPT09IHR5cGVvZkNoZWNrc1tpXVswXSkge1xuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gdHlwZW9mQ2hlY2tzW2ldWzFdKVxuICAgICAgICByZXR1cm47XG4gICAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJFeHBlY3RlZCBcIiArIHR5cGVvZkNoZWNrc1tpXVsxXSArIFwiLCBnb3QgXCIgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGVvZiB2YWx1ZSk7XG4gICAgfVxuICB9XG4gIGlmIChwYXR0ZXJuID09PSBudWxsKSB7XG4gICAgaWYgKHZhbHVlID09PSBudWxsKVxuICAgICAgcmV0dXJuO1xuICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIG51bGwsIGdvdCBcIiArIEpTT04uc3RyaW5naWZ5KHZhbHVlKSk7XG4gIH1cblxuICAvLyBNYXRjaC5JbnRlZ2VyIGlzIHNwZWNpYWwgdHlwZSBlbmNvZGVkIHdpdGggYXJyYXlcbiAgaWYgKHBhdHRlcm4gPT09IE1hdGNoLkludGVnZXIpIHtcbiAgICAvLyBUaGVyZSBpcyBubyBjb25zaXN0ZW50IGFuZCByZWxpYWJsZSB3YXkgdG8gY2hlY2sgaWYgdmFyaWFibGUgaXMgYSA2NC1iaXRcbiAgICAvLyBpbnRlZ2VyLiBPbmUgb2YgdGhlIHBvcHVsYXIgc29sdXRpb25zIGlzIHRvIGdldCByZW1pbmRlciBvZiBkaXZpc2lvbiBieSAxXG4gICAgLy8gYnV0IHRoaXMgbWV0aG9kIGZhaWxzIG9uIHJlYWxseSBsYXJnZSBmbG9hdHMgd2l0aCBiaWcgcHJlY2lzaW9uLlxuICAgIC8vIEUuZy46IDEuMzQ4MTkyMzA4NDkxODI0ZSsyMyAlIDEgPT09IDAgaW4gVjhcbiAgICAvLyBCaXR3aXNlIG9wZXJhdG9ycyB3b3JrIGNvbnNpc3RhbnRseSBidXQgYWx3YXlzIGNhc3QgdmFyaWFibGUgdG8gMzItYml0XG4gICAgLy8gc2lnbmVkIGludGVnZXIgYWNjb3JkaW5nIHRvIEphdmFTY3JpcHQgc3BlY3MuXG4gICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJudW1iZXJcIiAmJiAodmFsdWUgfCAwKSA9PT0gdmFsdWUpXG4gICAgICByZXR1cm5cbiAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJFeHBlY3RlZCBJbnRlZ2VyLCBnb3QgXCJcbiAgICAgICAgICAgICAgICArICh2YWx1ZSBpbnN0YW5jZW9mIE9iamVjdCA/IEpTT04uc3RyaW5naWZ5KHZhbHVlKSA6IHZhbHVlKSk7XG4gIH1cblxuICAvLyBcIk9iamVjdFwiIGlzIHNob3J0aGFuZCBmb3IgTWF0Y2guT2JqZWN0SW5jbHVkaW5nKHt9KTtcbiAgaWYgKHBhdHRlcm4gPT09IE9iamVjdClcbiAgICBwYXR0ZXJuID0gTWF0Y2guT2JqZWN0SW5jbHVkaW5nKHt9KTtcblxuICAvLyBBcnJheSAoY2hlY2tlZCBBRlRFUiBBbnksIHdoaWNoIGlzIGltcGxlbWVudGVkIGFzIGFuIEFycmF5KS5cbiAgaWYgKHBhdHRlcm4gaW5zdGFuY2VvZiBBcnJheSkge1xuICAgIGlmIChwYXR0ZXJuLmxlbmd0aCAhPT0gMSlcbiAgICAgIHRocm93IEVycm9yKFwiQmFkIHBhdHRlcm46IGFycmF5cyBtdXN0IGhhdmUgb25lIHR5cGUgZWxlbWVudFwiICtcbiAgICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHBhdHRlcm4pKTtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJFeHBlY3RlZCBhcnJheSwgZ290IFwiICsgSlNPTi5zdHJpbmdpZnkodmFsdWUpKTtcbiAgICB9XG5cbiAgICB2YWx1ZS5mb3JFYWNoKGZ1bmN0aW9uICh2YWx1ZUVsZW1lbnQsIGluZGV4KSB7XG4gICAgICB0cnkge1xuICAgICAgICBjaGVja1N1YnRyZWUodmFsdWVFbGVtZW50LCBwYXR0ZXJuWzBdKTtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICBpZiAoZXJyIGluc3RhbmNlb2YgTWF0Y2guRXJyb3IpIHtcbiAgICAgICAgICBlcnIucGF0aCA9IF9wcmVwZW5kUGF0aChpbmRleCwgZXJyLnBhdGgpO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IGVycjtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBBcmJpdHJhcnkgdmFsaWRhdGlvbiBjaGVja3MuIFRoZSBjb25kaXRpb24gY2FuIHJldHVybiBmYWxzZSBvciB0aHJvdyBhXG4gIC8vIE1hdGNoLkVycm9yIChpZSwgaXQgY2FuIGludGVybmFsbHkgdXNlIGNoZWNrKCkpIHRvIGZhaWwuXG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgV2hlcmUpIHtcbiAgICBpZiAocGF0dGVybi5jb25kaXRpb24odmFsdWUpKVxuICAgICAgcmV0dXJuO1xuICAgIC8vIFhYWCB0aGlzIGVycm9yIGlzIHRlcnJpYmxlXG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRmFpbGVkIE1hdGNoLldoZXJlIHZhbGlkYXRpb25cIik7XG4gIH1cblxuXG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgT3B0aW9uYWwpXG4gICAgcGF0dGVybiA9IE1hdGNoLk9uZU9mKHVuZGVmaW5lZCwgcGF0dGVybi5wYXR0ZXJuKTtcblxuICBpZiAocGF0dGVybiBpbnN0YW5jZW9mIE9uZU9mKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXR0ZXJuLmNob2ljZXMubGVuZ3RoOyArK2kpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNoZWNrU3VidHJlZSh2YWx1ZSwgcGF0dGVybi5jaG9pY2VzW2ldKTtcbiAgICAgICAgLy8gTm8gZXJyb3I/IFlheSwgcmV0dXJuLlxuICAgICAgICByZXR1cm47XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgLy8gT3RoZXIgZXJyb3JzIHNob3VsZCBiZSB0aHJvd24uIE1hdGNoIGVycm9ycyBqdXN0IG1lYW4gdHJ5IGFub3RoZXJcbiAgICAgICAgLy8gY2hvaWNlLlxuICAgICAgICBpZiAoIShlcnIgaW5zdGFuY2VvZiBNYXRjaC5FcnJvcikpXG4gICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBYWFggdGhpcyBlcnJvciBpcyB0ZXJyaWJsZVxuICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkZhaWxlZCBNYXRjaC5PbmVPZiBvciBNYXRjaC5PcHRpb25hbCB2YWxpZGF0aW9uXCIpO1xuICB9XG5cbiAgLy8gQSBmdW5jdGlvbiB0aGF0IGlzbid0IHNvbWV0aGluZyB3ZSBzcGVjaWFsLWNhc2UgaXMgYXNzdW1lZCB0byBiZSBhXG4gIC8vIGNvbnN0cnVjdG9yLlxuICBpZiAocGF0dGVybiBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgcGF0dGVybilcbiAgICAgIHJldHVybjtcbiAgICAvLyBYWFggd2hhdCBpZiAubmFtZSBpc24ndCBkZWZpbmVkXG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgXCIgKyBwYXR0ZXJuLmNvbnN0cnVjdG9yLm5hbWUpO1xuICB9XG5cbiAgdmFyIHVua25vd25LZXlzQWxsb3dlZCA9IGZhbHNlO1xuICBpZiAocGF0dGVybiBpbnN0YW5jZW9mIE9iamVjdEluY2x1ZGluZykge1xuICAgIHVua25vd25LZXlzQWxsb3dlZCA9IHRydWU7XG4gICAgcGF0dGVybiA9IHBhdHRlcm4ucGF0dGVybjtcbiAgfVxuXG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgT2JqZWN0SGFzaCkge1xuICAgIHZhciBrZXlQYXR0ZXJuID0gcGF0dGVybi5wYXR0ZXJuO1xuICAgIHZhciBlbXB0eUhhc2ggPSB0cnVlO1xuICAgIGZvciAodmFyIGtleSBpbiB2YWx1ZSkge1xuICAgICAgZW1wdHlIYXNoID0gZmFsc2U7XG4gICAgICBjaGVjayh2YWx1ZVtrZXldLCBrZXlQYXR0ZXJuKTtcbiAgICB9XG4gICAgaWYgKGVtcHR5SGFzaClcbiAgICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIFwiICsgcGF0dGVybi5jb25zdHJ1Y3Rvci5uYW1lKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAocGF0dGVybiBpbnN0YW5jZW9mIFN1YmNsYXNzKSB7XG4gICAgdmFyIFN1cGVyY2xhc3MgPSBwYXR0ZXJuLlN1cGVyY2xhc3M7XG4gICAgaWYgKHBhdHRlcm4ubWF0Y2hTdXBlcmNsYXNzICYmIHZhbHVlID09IFN1cGVyY2xhc3MpIFxuICAgICAgcmV0dXJuO1xuICAgIGlmICghICh2YWx1ZS5wcm90b3R5cGUgaW5zdGFuY2VvZiBTdXBlcmNsYXNzKSlcbiAgICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIFwiICsgcGF0dGVybi5jb25zdHJ1Y3Rvci5uYW1lICsgXCIgb2YgXCIgKyBTdXBlcmNsYXNzLm5hbWUpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmICh0eXBlb2YgcGF0dGVybiAhPT0gXCJvYmplY3RcIilcbiAgICB0aHJvdyBFcnJvcihcIkJhZCBwYXR0ZXJuOiB1bmtub3duIHBhdHRlcm4gdHlwZVwiKTtcblxuICAvLyBBbiBvYmplY3QsIHdpdGggcmVxdWlyZWQgYW5kIG9wdGlvbmFsIGtleXMuIE5vdGUgdGhhdCB0aGlzIGRvZXMgTk9UIGRvXG4gIC8vIHN0cnVjdHVyYWwgbWF0Y2hlcyBhZ2FpbnN0IG9iamVjdHMgb2Ygc3BlY2lhbCB0eXBlcyB0aGF0IGhhcHBlbiB0byBtYXRjaFxuICAvLyB0aGUgcGF0dGVybjogdGhpcyByZWFsbHkgbmVlZHMgdG8gYmUgYSBwbGFpbiBvbGQge09iamVjdH0hXG4gIGlmICh0eXBlb2YgdmFsdWUgIT09ICdvYmplY3QnKVxuICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIG9iamVjdCwgZ290IFwiICsgdHlwZW9mIHZhbHVlKTtcbiAgaWYgKHZhbHVlID09PSBudWxsKVxuICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIG9iamVjdCwgZ290IG51bGxcIik7XG5cbiAgdmFyIHJlcXVpcmVkUGF0dGVybnMgPSB7fTtcbiAgdmFyIG9wdGlvbmFsUGF0dGVybnMgPSB7fTtcblxuICBfLmVhY2hLZXkocGF0dGVybiwgZnVuY3Rpb24oc3ViUGF0dGVybiwga2V5KSB7XG4gICAgaWYgKHBhdHRlcm5ba2V5XSBpbnN0YW5jZW9mIE9wdGlvbmFsKVxuICAgICAgb3B0aW9uYWxQYXR0ZXJuc1trZXldID0gcGF0dGVybltrZXldLnBhdHRlcm47XG4gICAgZWxzZVxuICAgICAgcmVxdWlyZWRQYXR0ZXJuc1trZXldID0gcGF0dGVybltrZXldO1xuICB9LCB0aGlzLCB0cnVlKTtcblxuICBfLmVhY2hLZXkodmFsdWUsIGZ1bmN0aW9uKHN1YlZhbHVlLCBrZXkpIHtcbiAgICB2YXIgc3ViVmFsdWUgPSB2YWx1ZVtrZXldO1xuICAgIHRyeSB7XG4gICAgICBpZiAocmVxdWlyZWRQYXR0ZXJucy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgIGNoZWNrU3VidHJlZShzdWJWYWx1ZSwgcmVxdWlyZWRQYXR0ZXJuc1trZXldKTtcbiAgICAgICAgZGVsZXRlIHJlcXVpcmVkUGF0dGVybnNba2V5XTtcbiAgICAgIH0gZWxzZSBpZiAob3B0aW9uYWxQYXR0ZXJucy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgIGNoZWNrU3VidHJlZShzdWJWYWx1ZSwgb3B0aW9uYWxQYXR0ZXJuc1trZXldKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICghdW5rbm93bktleXNBbGxvd2VkKVxuICAgICAgICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIlVua25vd24ga2V5XCIpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgaWYgKGVyciBpbnN0YW5jZW9mIE1hdGNoLkVycm9yKVxuICAgICAgICBlcnIucGF0aCA9IF9wcmVwZW5kUGF0aChrZXksIGVyci5wYXRoKTtcbiAgICAgIHRocm93IGVycjtcbiAgICB9XG4gIH0sIHRoaXMsIHRydWUpO1xuXG4gIF8uZWFjaEtleShyZXF1aXJlZFBhdHRlcm5zLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiTWlzc2luZyBrZXkgJ1wiICsga2V5ICsgXCInXCIpO1xuICB9LCB0aGlzLCB0cnVlKTtcbn07XG5cblxudmFyIF9qc0tleXdvcmRzID0gW1wiZG9cIiwgXCJpZlwiLCBcImluXCIsIFwiZm9yXCIsIFwibGV0XCIsIFwibmV3XCIsIFwidHJ5XCIsIFwidmFyXCIsIFwiY2FzZVwiLFxuICBcImVsc2VcIiwgXCJlbnVtXCIsIFwiZXZhbFwiLCBcImZhbHNlXCIsIFwibnVsbFwiLCBcInRoaXNcIiwgXCJ0cnVlXCIsIFwidm9pZFwiLCBcIndpdGhcIixcbiAgXCJicmVha1wiLCBcImNhdGNoXCIsIFwiY2xhc3NcIiwgXCJjb25zdFwiLCBcInN1cGVyXCIsIFwidGhyb3dcIiwgXCJ3aGlsZVwiLCBcInlpZWxkXCIsXG4gIFwiZGVsZXRlXCIsIFwiZXhwb3J0XCIsIFwiaW1wb3J0XCIsIFwicHVibGljXCIsIFwicmV0dXJuXCIsIFwic3RhdGljXCIsIFwic3dpdGNoXCIsXG4gIFwidHlwZW9mXCIsIFwiZGVmYXVsdFwiLCBcImV4dGVuZHNcIiwgXCJmaW5hbGx5XCIsIFwicGFja2FnZVwiLCBcInByaXZhdGVcIiwgXCJjb250aW51ZVwiLFxuICBcImRlYnVnZ2VyXCIsIFwiZnVuY3Rpb25cIiwgXCJhcmd1bWVudHNcIiwgXCJpbnRlcmZhY2VcIiwgXCJwcm90ZWN0ZWRcIiwgXCJpbXBsZW1lbnRzXCIsXG4gIFwiaW5zdGFuY2VvZlwiXTtcblxuLy8gQXNzdW1lcyB0aGUgYmFzZSBvZiBwYXRoIGlzIGFscmVhZHkgZXNjYXBlZCBwcm9wZXJseVxuLy8gcmV0dXJucyBrZXkgKyBiYXNlXG5mdW5jdGlvbiBfcHJlcGVuZFBhdGgoa2V5LCBiYXNlKSB7XG4gIGlmICgodHlwZW9mIGtleSkgPT09IFwibnVtYmVyXCIgfHwga2V5Lm1hdGNoKC9eWzAtOV0rJC8pKVxuICAgIGtleSA9IFwiW1wiICsga2V5ICsgXCJdXCI7XG4gIGVsc2UgaWYgKCFrZXkubWF0Y2goL15bYS16XyRdWzAtOWEtel8kXSokL2kpIHx8IF9qc0tleXdvcmRzLmluZGV4T2Yoa2V5KSAhPSAtMSlcbiAgICBrZXkgPSBKU09OLnN0cmluZ2lmeShba2V5XSk7XG5cbiAgaWYgKGJhc2UgJiYgYmFzZVswXSAhPT0gXCJbXCIpXG4gICAgcmV0dXJuIGtleSArICcuJyArIGJhc2U7XG4gIHJldHVybiBrZXkgKyBiYXNlO1xufTtcblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpO1xuXG5cbi8vIG1vZHVsZSBleHBvcnRzIGVycm9yIGNsYXNzZXMgZm9yIGFsbCBuYW1lcyBkZWZpbmVkIGluIHRoaXMgYXJyYXlcbnZhciBlcnJvckNsYXNzTmFtZXMgPSBbJ0Fic3RyYWN0Q2xhc3MnLCAnTWl4aW4nLCAnTWVzc2VuZ2VyJywgJ0NvbXBvbmVudERhdGFTb3VyY2UnLFxuXHRcdFx0XHRcdCAgICdBdHRyaWJ1dGUnLCAnQmluZGVyJywgJ0xvYWRlcicsICdNYWlsTWVzc2FnZVNvdXJjZScsICdGYWNldCddO1xuXG52YXIgZXJyb3IgPSB7XG5cdHRvQmVJbXBsZW1lbnRlZDogdG9CZUltcGxlbWVudGVkLFxuXHRjcmVhdGVDbGFzczogY3JlYXRlRXJyb3JDbGFzc1xufTtcblxuZXJyb3JDbGFzc05hbWVzLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuXHRlcnJvcltuYW1lXSA9IGNyZWF0ZUVycm9yQ2xhc3MobmFtZSArICdFcnJvcicpO1xufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gZXJyb3I7XG5cblxuZnVuY3Rpb24gY3JlYXRlRXJyb3JDbGFzcyhlcnJvckNsYXNzTmFtZSkge1xuXHR2YXIgRXJyb3JDbGFzcztcblx0ZXZhbCgnRXJyb3JDbGFzcyA9IGZ1bmN0aW9uICcgKyBlcnJvckNsYXNzTmFtZSArICcobWVzc2FnZSkgeyBcXFxuXHRcdFx0dGhpcy5uYW1lID0gXCInICsgZXJyb3JDbGFzc05hbWUgKyAnXCI7IFxcXG5cdFx0XHR0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlIHx8IFwiVGhlcmUgd2FzIGFuIGVycm9yXCI7IFxcXG5cdFx0fScpO1xuXHRfLm1ha2VTdWJjbGFzcyhFcnJvckNsYXNzLCBFcnJvcik7XG5cblx0cmV0dXJuIEVycm9yQ2xhc3M7XG59XG5cblxuZnVuY3Rpb24gdG9CZUltcGxlbWVudGVkKCkge1xuXHR0aHJvdyBuZXcgZXJyb3IuQWJzdHJhY3RDbGFzcygnY2FsbGluZyB0aGUgbWV0aG9kIG9mIGFuIGFic2N0cmFjdCBjbGFzcyBNZXNzYWdlU291cmNlJyk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlsID0ge1xuXHRsb2dnZXI6IHJlcXVpcmUoJy4vbG9nZ2VyJyksXG5cdHJlcXVlc3Q6IHJlcXVpcmUoJy4vcmVxdWVzdCcpLFxuXHRjaGVjazogcmVxdWlyZSgnLi9jaGVjaycpLFxuXHRlcnJvcjogcmVxdWlyZSgnLi9lcnJvcicpXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHV0aWw7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBMb2dnZXIgPSByZXF1aXJlKCcuL2xvZ2dlcl9jbGFzcycpO1xuXG52YXIgbG9nZ2VyID0gbmV3IExvZ2dlcih7IGxldmVsOiAzIH0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGxvZ2dlcjtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKTtcblxuXG4vKipcbiAqIExvZyBsZXZlbHMuXG4gKi9cblxudmFyIGxldmVscyA9IFtcbiAgICAnZXJyb3InLFxuICAgICd3YXJuJyxcbiAgICAnaW5mbycsXG4gICAgJ2RlYnVnJ1xuXTtcblxudmFyIG1heExldmVsTGVuZ3RoID0gTWF0aC5tYXguYXBwbHkoTWF0aCwgbGV2ZWxzLm1hcChmdW5jdGlvbihsZXZlbCkgeyByZXR1cm4gbGV2ZWwubGVuZ3RoOyB9KSk7XG5cbi8qKlxuICogQ29sb3JzIGZvciBsb2cgbGV2ZWxzLlxuICovXG5cbnZhciBjb2xvcnMgPSBbXG4gICAgMzEsXG4gICAgMzMsXG4gICAgMzYsXG4gICAgOTBcbl07XG5cbi8qKlxuICogUGFkcyB0aGUgbmljZSBvdXRwdXQgdG8gdGhlIGxvbmdlc3QgbG9nIGxldmVsLlxuICovXG5cbmZ1bmN0aW9uIHBhZCAoc3RyKSB7XG4gICAgaWYgKHN0ci5sZW5ndGggPCBtYXhMZXZlbExlbmd0aClcbiAgICAgICAgcmV0dXJuIHN0ciArIG5ldyBBcnJheShtYXhMZXZlbExlbmd0aCAtIHN0ci5sZW5ndGggKyAxKS5qb2luKCcgJyk7XG5cbiAgICByZXR1cm4gc3RyO1xufTtcblxuLyoqXG4gKiBMb2dnZXIgKGNvbnNvbGUpLlxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cblxudmFyIExvZ2dlciA9IGZ1bmN0aW9uIChvcHRzKSB7XG4gICAgb3B0cyA9IG9wdHMgfHwge31cbiAgICB0aGlzLmNvbG9ycyA9IG9wdHMuY29sb3JzO1xuICAgIHRoaXMubGV2ZWwgPSBvcHRzLmxldmVsIHx8IDM7XG4gICAgdGhpcy5lbmFibGVkID0gb3B0cy5lbmFibGVkIHx8IHRydWU7XG4gICAgdGhpcy5sb2dQcmVmaXggPSBvcHRzLmxvZ1ByZWZpeCB8fCAnJztcbiAgICB0aGlzLmxvZ1ByZWZpeENvbG9yID0gb3B0cy5sb2dQcmVmaXhDb2xvcjtcbn07XG5cblxuLyoqXG4gKiBMb2cgbWV0aG9kLlxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuTG9nZ2VyLnByb3RvdHlwZS5sb2cgPSBmdW5jdGlvbiAodHlwZSkge1xuICAgIHZhciBpbmRleCA9IGxldmVscy5pbmRleE9mKHR5cGUpO1xuXG4gICAgaWYgKGluZGV4ID4gdGhpcy5sZXZlbCB8fCAhIHRoaXMuZW5hYmxlZClcbiAgICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICBjb25zb2xlLmxvZy5hcHBseShcbiAgICAgICAgICBjb25zb2xlXG4gICAgICAgICwgW3RoaXMubG9nUHJlZml4Q29sb3JcbiAgICAgICAgICAgICA/ICcgICBcXHgxQlsnICsgdGhpcy5sb2dQcmVmaXhDb2xvciArICdtJyArIHRoaXMubG9nUHJlZml4ICsgJyAgLVxceDFCWzM5bSdcbiAgICAgICAgICAgICA6IHRoaXMubG9nUHJlZml4XG4gICAgICAgICAgLHRoaXMuY29sb3JzXG4gICAgICAgICAgICAgPyAnIFxceDFCWycgKyBjb2xvcnNbaW5kZXhdICsgJ20nICsgcGFkKHR5cGUpICsgJyAtXFx4MUJbMzltJ1xuICAgICAgICAgICAgIDogdHlwZSArICc6J1xuICAgICAgICAgIF0uY29uY2F0KF8udG9BcnJheShhcmd1bWVudHMpLnNsaWNlKDEpKVxuICAgICk7XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogR2VuZXJhdGUgbWV0aG9kcy5cbiAqL1xuXG5sZXZlbHMuZm9yRWFjaChmdW5jdGlvbiAobmFtZSkge1xuICAgIExvZ2dlci5wcm90b3R5cGVbbmFtZV0gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMubG9nLmFwcGx5KHRoaXMsIFtuYW1lXS5jb25jYXQoXy50b0FycmF5KGFyZ3VtZW50cykpKTtcbiAgICB9O1xufSk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBMb2dnZXI7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgnbW9sLXByb3RvJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gcmVxdWVzdDtcblxuXG4vLyBUT0RPIGFkZCBlcnJvciBzdGF0dXNlc1xudmFyIG9rU3RhdHVzZXMgPSBbJzIwMCcsICczMDQnXTtcblxuXG5mdW5jdGlvbiByZXF1ZXN0KHVybCwgb3B0cywgY2FsbGJhY2spIHtcblx0dmFyIHJlcSA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXHRyZXEub3BlbihvcHRzLm1ldGhvZCwgdXJsLCB0cnVlKTsgLy8gd2hhdCB0cnVlIG1lYW5zP1xuXHRyZXEub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24gKCkge1xuXHRcdGlmIChyZXEucmVhZHlTdGF0ZSA9PSA0ICYmIHJlcS5zdGF0dXNUZXh0LnRvVXBwZXJDYXNlKCkgPT0gJ09LJyApXG5cdFx0XHRjYWxsYmFjayhudWxsLCByZXEucmVzcG9uc2VUZXh0LCByZXEpO1xuXHRcdC8vIGVsc2Vcblx0XHQvLyBcdGNhbGxiYWNrKHJlcS5zdGF0dXMsIHJlcS5yZXNwb25zZVRleHQsIHJlcSk7XG5cdH07XG5cdHJlcS5zZW5kKG51bGwpO1xufVxuXG5fLmV4dGVuZChyZXF1ZXN0LCB7XG5cdGdldDogZ2V0XG59KTtcblxuXG5mdW5jdGlvbiBnZXQodXJsLCBjYWxsYmFjaykge1xuXHRyZXF1ZXN0KHVybCwgeyBtZXRob2Q6ICdHRVQnIH0sIGNhbGxiYWNrKTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIF87XG52YXIgcHJvdG8gPSBfID0ge1xuXHRleHRlbmRQcm90bzogZXh0ZW5kUHJvdG8sXG5cdGNyZWF0ZVN1YmNsYXNzOiBjcmVhdGVTdWJjbGFzcyxcblx0bWFrZVN1YmNsYXNzOiBtYWtlU3ViY2xhc3MsXG5cdGV4dGVuZDogZXh0ZW5kLFxuXHRjbG9uZTogY2xvbmUsXG5cdGRlZXBFeHRlbmQ6IGRlZXBFeHRlbmQsXG5cdGFsbEtleXM6IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzLmJpbmQoT2JqZWN0KSxcblx0a2V5T2Y6IGtleU9mLFxuXHRhbGxLZXlzT2Y6IGFsbEtleXNPZixcblx0ZWFjaEtleTogZWFjaEtleSxcblx0bWFwS2V5czogbWFwS2V5cyxcblx0YXBwZW5kQXJyYXk6IGFwcGVuZEFycmF5LFxuXHRwcmVwZW5kQXJyYXk6IHByZXBlbmRBcnJheSxcblx0dG9BcnJheTogdG9BcnJheSxcblx0Zmlyc3RVcHBlckNhc2U6IGZpcnN0VXBwZXJDYXNlLFxuXHRmaXJzdExvd2VyQ2FzZTogZmlyc3RMb3dlckNhc2Vcbn07XG5cblxuaWYgKHR5cGVvZiB3aW5kb3cgPT0gJ29iamVjdCcpIHtcblx0Ly8gcHJlc2VydmUgZXhpc3RpbmcgXyBvYmplY3Rcblx0aWYgKHdpbmRvdy5fKVxuXHRcdHByb3RvLnVuZGVyc2NvcmUgPSB3aW5kb3cuX1xuXG5cdC8vIGV4cG9zZSBnbG9iYWwgX1xuXHR3aW5kb3cuXyA9IHByb3RvO1xufVxuXG5pZiAodHlwZW9mIG1vZHVsZSA9PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cylcblx0Ly8gZXhwb3J0IGZvciBub2RlL2Jyb3dzZXJpZnlcblx0bW9kdWxlLmV4cG9ydHMgPSBwcm90bztcblx0XG5cbmZ1bmN0aW9uIGV4dGVuZFByb3RvKHNlbGYsIG1ldGhvZHMpIHtcblx0dmFyIHByb3BEZXNjcmlwdG9ycyA9IHt9O1xuXG5cdF8uZWFjaEtleShtZXRob2RzLCBmdW5jdGlvbihtZXRob2QsIG5hbWUpIHtcblx0XHRwcm9wRGVzY3JpcHRvcnNbbmFtZV0gPSB7XG5cdFx0XHRlbnVtZXJhYmxlOiBmYWxzZSxcblx0XHRcdGNvbmZpZ3VyYWJsZTogZmFsc2UsXG5cdFx0XHR3cml0YWJsZTogZmFsc2UsXG5cdFx0XHR2YWx1ZTogbWV0aG9kXG5cdFx0fTtcblx0fSk7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnRpZXMoc2VsZi5wcm90b3R5cGUsIHByb3BEZXNjcmlwdG9ycyk7XG5cdHJldHVybiBzZWxmO1xufVxuXG5cbmZ1bmN0aW9uIGV4dGVuZChzZWxmLCBvYmosIG9ubHlFbnVtZXJhYmxlKSB7XG5cdHZhciBwcm9wRGVzY3JpcHRvcnMgPSB7fTtcblxuXHRfLmVhY2hLZXkob2JqLCBmdW5jdGlvbih2YWx1ZSwgcHJvcCkge1xuXHRcdHZhciBkZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmosIHByb3ApO1xuXHRcdHByb3BEZXNjcmlwdG9yc1twcm9wXSA9IGRlc2NyaXB0b3I7XG5cdH0sIHRoaXMsIG9ubHlFbnVtZXJhYmxlKTtcblxuXHRPYmplY3QuZGVmaW5lUHJvcGVydGllcyhzZWxmLCBwcm9wRGVzY3JpcHRvcnMpO1xuXG5cdHJldHVybiBzZWxmO1xufVxuXG5cbmZ1bmN0aW9uIGRlZXBFeHRlbmQoc2VsZiwgb2JqLCBvbmx5RW51bWVyYWJsZSkge1xuXHRyZXR1cm4gX2V4dGVuZFRyZWUoc2VsZiwgb2JqLCBvbmx5RW51bWVyYWJsZSwgW10pO1xufVxuXG5cbmZ1bmN0aW9uIF9leHRlbmRUcmVlKHNlbGZOb2RlLCBvYmpOb2RlLCBvbmx5RW51bWVyYWJsZSwgb2JqVHJhdmVyc2VkKSB7XG5cdGlmIChvYmpUcmF2ZXJzZWQuaW5kZXhPZihvYmpOb2RlKSA+PSAwKSByZXR1cm47IC8vIG5vZGUgYWxyZWFkeSB0cmF2ZXJzZWRcblx0b2JqVHJhdmVyc2VkLnB1c2gob2JqTm9kZSk7XG5cblx0Xy5lYWNoS2V5KG9iak5vZGUsIGZ1bmN0aW9uKHZhbHVlLCBwcm9wKSB7XG5cdFx0dmFyIGRlc2NyaXB0b3IgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG9iak5vZGUsIHByb3ApO1xuXHRcdGlmICh0eXBlb2YgdmFsdWUgPT0gJ29iamVjdCcpIHtcblx0XHRcdGlmIChzZWxmTm9kZS5oYXNPd25Qcm9wZXJ0eShwcm9wKSAmJiB0eXBlb2Ygc2VsZk5vZGVbcHJvcF0gPT0gJ29iamVjdCcpXG5cdFx0XHRcdF9leHRlbmRUcmVlKHNlbGZOb2RlW3Byb3BdLCB2YWx1ZSwgb25seUVudW1lcmFibGUsIG9ialRyYXZlcnNlZClcblx0XHRcdGVsc2Vcblx0XHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHNlbGZOb2RlLCBwcm9wLCBkZXNjcmlwdG9yKTtcblx0XHR9IGVsc2Vcblx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShzZWxmTm9kZSwgcHJvcCwgZGVzY3JpcHRvcik7XG5cdH0sIHRoaXMsIG9ubHlFbnVtZXJhYmxlKTtcblxuXHRyZXR1cm4gc2VsZk5vZGU7XG59XG5cblxuZnVuY3Rpb24gY2xvbmUob2JqKSB7XG5cdHZhciBjbG9uZWRPYmplY3QgPSBPYmplY3QuY3JlYXRlKG9iai5jb25zdHJ1Y3Rvci5wcm90b3R5cGUpO1xuXHRfLmV4dGVuZChjbG9uZWRPYmplY3QsIG9iaik7XG5cdHJldHVybiBjbG9uZWRPYmplY3Q7XG59XG5cblxuZnVuY3Rpb24gY3JlYXRlU3ViY2xhc3ModGhpc0NsYXNzLCBuYW1lLCBhcHBseUNvbnN0cnVjdG9yKSB7XG5cdHZhciBzdWJjbGFzcztcblxuXHQvLyBuYW1lIGlzIG9wdGlvbmFsXG5cdG5hbWUgPSBuYW1lIHx8ICcnO1xuXG5cdC8vIGFwcGx5IHN1cGVyY2xhc3MgY29uc3RydWN0b3Jcblx0dmFyIGNvbnN0cnVjdG9yQ29kZSA9IGFwcGx5Q29uc3RydWN0b3IgPT09IGZhbHNlXG5cdFx0XHQ/ICcnXG5cdFx0XHQ6ICd0aGlzQ2xhc3MuYXBwbHkodGhpcywgYXJndW1lbnRzKTsnO1xuXG5cdGV2YWwoJ3N1YmNsYXNzID0gZnVuY3Rpb24gJyArIG5hbWUgKyAnKCl7ICcgKyBjb25zdHJ1Y3RvckNvZGUgKyAnIH0nKTtcblxuXHRfLm1ha2VTdWJjbGFzcyhzdWJjbGFzcywgdGhpc0NsYXNzKTtcblxuXHQvLyBjb3B5IGNsYXNzIG1ldGhvZHNcblx0Ly8gLSBmb3IgdGhlbSB0byB3b3JrIGNvcnJlY3RseSB0aGV5IHNob3VsZCBub3QgZXhwbGljdGx5IHVzZSBzdXBlcmNsYXNzIG5hbWVcblx0Ly8gYW5kIHVzZSBcInRoaXNcIiBpbnN0ZWFkXG5cdF8uZXh0ZW5kKHN1YmNsYXNzLCB0aGlzQ2xhc3MsIHRydWUpO1xuXG5cdHJldHVybiBzdWJjbGFzcztcbn1cblxuXG5mdW5jdGlvbiBtYWtlU3ViY2xhc3ModGhpc0NsYXNzLCBTdXBlcmNsYXNzKSB7XG5cdC8vIHByb3RvdHlwZSBjaGFpblxuXHR0aGlzQ2xhc3MucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShTdXBlcmNsYXNzLnByb3RvdHlwZSk7XG5cdFxuXHQvLyBzdWJjbGFzcyBpZGVudGl0eVxuXHRfLmV4dGVuZFByb3RvKHRoaXNDbGFzcywge1xuXHRcdGNvbnN0cnVjdG9yOiB0aGlzQ2xhc3Ncblx0fSk7XG5cdHJldHVybiB0aGlzQ2xhc3M7XG59XG5cblxuZnVuY3Rpb24ga2V5T2Yoc2VsZiwgc2VhcmNoRWxlbWVudCwgb25seUVudW1lcmFibGUpIHtcblx0dmFyIHByb3BlcnRpZXMgPSBvbmx5RW51bWVyYWJsZSBcblx0XHRcdFx0XHRcdD8gT2JqZWN0LmtleXMoc2VsZilcblx0XHRcdFx0XHRcdDogXy5hbGxLZXlzKHNlbGYpO1xuXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgcHJvcGVydGllcy5sZW5ndGg7IGkrKylcblx0XHRpZiAoc2VhcmNoRWxlbWVudCA9PT0gc2VsZltwcm9wZXJ0aWVzW2ldXSlcblx0XHRcdHJldHVybiBwcm9wZXJ0aWVzW2ldO1xuXHRcblx0cmV0dXJuIHVuZGVmaW5lZDtcbn1cblxuXG5mdW5jdGlvbiBhbGxLZXlzT2Yoc2VsZiwgc2VhcmNoRWxlbWVudCwgb25seUVudW1lcmFibGUpIHtcblx0dmFyIHByb3BlcnRpZXMgPSBvbmx5RW51bWVyYWJsZSBcblx0XHRcdFx0XHRcdD8gT2JqZWN0LmtleXMoc2VsZilcblx0XHRcdFx0XHRcdDogXy5hbGxLZXlzKHNlbGYpO1xuXG5cdHZhciBrZXlzID0gcHJvcGVydGllcy5maWx0ZXIoZnVuY3Rpb24ocHJvcCkge1xuXHRcdHJldHVybiBzZWFyY2hFbGVtZW50ID09PSBzZWxmW3Byb3BdO1xuXHR9KTtcblxuXHRyZXR1cm4ga2V5cztcbn1cblxuXG5mdW5jdGlvbiBlYWNoS2V5KHNlbGYsIGNhbGxiYWNrLCB0aGlzQXJnLCBvbmx5RW51bWVyYWJsZSkge1xuXHR2YXIgcHJvcGVydGllcyA9IG9ubHlFbnVtZXJhYmxlIFxuXHRcdFx0XHRcdFx0PyBPYmplY3Qua2V5cyhzZWxmKVxuXHRcdFx0XHRcdFx0OiBfLmFsbEtleXMoc2VsZik7XG5cblx0cHJvcGVydGllcy5mb3JFYWNoKGZ1bmN0aW9uKHByb3ApIHtcblx0XHRjYWxsYmFjay5jYWxsKHRoaXNBcmcsIHNlbGZbcHJvcF0sIHByb3AsIHNlbGYpO1xuXHR9KTtcbn1cblxuXG5mdW5jdGlvbiBtYXBLZXlzKHNlbGYsIGNhbGxiYWNrLCB0aGlzQXJnLCBvbmx5RW51bWVyYWJsZSkge1xuXHR2YXIgbWFwUmVzdWx0ID0ge307XG5cdF8uZWFjaEtleShzZWxmLCBtYXBQcm9wZXJ0eSwgdGhpc0FyZywgb25seUVudW1lcmFibGUpO1xuXHRyZXR1cm4gbWFwUmVzdWx0O1xuXG5cdGZ1bmN0aW9uIG1hcFByb3BlcnR5KHZhbHVlLCBrZXkpIHtcblx0XHR2YXIgZGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Ioc2VsZiwga2V5KTtcblx0XHRpZiAoZGVzY3JpcHRvci5lbnVtZXJhYmxlIHx8ICEgb25seUVudW1lcmFibGUpIHtcblx0XHRcdGRlc2NyaXB0b3IudmFsdWUgPSBjYWxsYmFjay5jYWxsKHRoaXMsIHZhbHVlLCBrZXksIHNlbGYpO1xuXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KG1hcFJlc3VsdCwga2V5LCBkZXNjcmlwdG9yKTtcblx0XHR9XG5cdH1cbn1cblxuXG5mdW5jdGlvbiBhcHBlbmRBcnJheShzZWxmLCBhcnJheVRvQXBwZW5kKSB7XG5cdGlmICghIGFycmF5VG9BcHBlbmQubGVuZ3RoKSByZXR1cm4gc2VsZjtcblxuICAgIHZhciBhcmdzID0gW3NlbGYubGVuZ3RoLCAwXS5jb25jYXQoYXJyYXlUb0FwcGVuZCk7XG4gICAgQXJyYXkucHJvdG90eXBlLnNwbGljZS5hcHBseShzZWxmLCBhcmdzKTtcblxuICAgIHJldHVybiBzZWxmO1xufVxuXG5cbmZ1bmN0aW9uIHByZXBlbmRBcnJheShzZWxmLCBhcnJheVRvUHJlcGVuZCkge1xuXHRpZiAoISBhcnJheVRvUHJlcGVuZC5sZW5ndGgpIHJldHVybiBzZWxmO1xuXG4gICAgdmFyIGFyZ3MgPSBbMCwgMF0uY29uY2F0KGFycmF5VG9QcmVwZW5kKTtcbiAgICBBcnJheS5wcm90b3R5cGUuc3BsaWNlLmFwcGx5KHNlbGYsIGFyZ3MpO1xuXG4gICAgcmV0dXJuIHNlbGY7XG59XG5cblxuZnVuY3Rpb24gdG9BcnJheShhcnJheUxpa2UpIHtcblx0dmFyIGFyciA9IFtdO1xuXHRBcnJheS5wcm90b3R5cGUuZm9yRWFjaC5jYWxsKGFycmF5TGlrZSwgZnVuY3Rpb24oaXRlbSkge1xuXHRcdGFyci5wdXNoKGl0ZW0pXG5cdH0pO1xuXG5cdHJldHVybiBhcnI7XG59XG5cblxuZnVuY3Rpb24gZmlyc3RVcHBlckNhc2Uoc3RyKSB7XG5cdHJldHVybiBzdHJbMF0udG9VcHBlckNhc2UoKSArIHN0ci5zbGljZSgxKTtcbn1cblxuXG5mdW5jdGlvbiBmaXJzdExvd2VyQ2FzZShzdHIpIHtcblx0cmV0dXJuIHN0clswXS50b0xvd2VyQ2FzZSgpICsgc3RyLnNsaWNlKDEpO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5kZXNjcmliZSgnbWlsbyBiaW5kZXInLCBmdW5jdGlvbigpIHtcbiAgICBpdCgnc2hvdWxkIGJpbmQgY29tcG9uZW50cyBiYXNlZCBvbiBtbC1iaW5kIGF0dHJpYnV0ZScsIGZ1bmN0aW9uKCkge1xuICAgIFx0dmFyIG1pbG8gPSByZXF1aXJlKCcuLi8uLi9saWIvbWlsbycpO1xuXG5cdFx0ZXhwZWN0KHtwOiAxfSkucHJvcGVydHkoJ3AnLCAxKTtcblxuICAgIFx0dmFyIGN0cmwgPSBtaWxvLmJpbmRlcigpO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKGN0cmwpO1xuXG4gICAgXHRjdHJsLmFydGljbGVCdXR0b24uZXZlbnRzLm9uKCdjbGljayBtb3VzZWVudGVyJywgZnVuY3Rpb24oZVR5cGUsIGV2dCkge1xuICAgIFx0XHRjb25zb2xlLmxvZygnYnV0dG9uJywgZVR5cGUsIGV2dCk7XG4gICAgXHR9KTtcblxuICAgICAgICBjdHJsLm1haW4uZXZlbnRzLm9uKCdjbGljayBtb3VzZWVudGVyIGlucHV0IGtleXByZXNzJywgZnVuY3Rpb24oZVR5cGUsIGV2dCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2RpdicsIGVUeXBlLCBldnQpO1xuICAgICAgICB9KTtcblxuICAgIFx0Y3RybC5hcnRpY2xlSWRJbnB1dC5kYXRhLm9uKCdkYXRhY2hhbmdlZCcsIGxvZ0RhdGEpO1xuXG4gICAgXHRmdW5jdGlvbiBsb2dEYXRhKG1lc3NhZ2UsIGRhdGEpIHtcbiAgICBcdFx0Y29uc29sZS5sb2cobWVzc2FnZSwgZGF0YSk7XG4gICAgXHR9XG5cbiAgICAgICAgdmFyIG15VG1wbENvbXBzID0gY3RybC5teVRlbXBsYXRlLnRlbXBsYXRlXG4gICAgICAgICAgICAgICAgLnNldCgnPHAgbWwtYmluZD1cIjppbm5lclBhcmFcIj5JIGFtIHJlbmRlcmVkIGZyb20gdGVtcGxhdGU8L3A+JylcbiAgICAgICAgICAgICAgICAucmVuZGVyKClcbiAgICAgICAgICAgICAgICAuYmluZGVyKCk7XG5cbiAgICAgICAgXy5leHRlbmQoY3RybCwgbXlUbXBsQ29tcHMpOyAvLyBzaG91bGQgYmUgc29tZSBmdW5jdGlvbiB0byBhZGQgdG8gY29udHJvbGxlclxuXG4gICAgICAgIGN0cmwuaW5uZXJQYXJhLmVsLmlubmVySFRNTCArPSAnLCB0aGVuIGJvdW5kIGFuZCBjaGFuZ2VkIHZpYSBjb21wb25lbnQgaW5zaWRlIHRlbXBsYXRlJztcbiAgICB9KTtcbn0pO1xuIl19
;