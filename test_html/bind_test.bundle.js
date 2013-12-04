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

},{"../util/check":36,"../util/error":37,"mol-proto":42}],2:[function(require,module,exports){
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

},{"../util/check":36,"mol-proto":42}],3:[function(require,module,exports){
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

},{"../config":27,"../util/check":36,"../util/error":37,"./index":5,"mol-proto":42}],4:[function(require,module,exports){
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
},{"../config":27,"../util/error":37,"./index":5,"mol-proto":42}],5:[function(require,module,exports){
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

},{"../util/check":36,"../util/error":37,"mol-proto":42}],6:[function(require,module,exports){
'use strict';

var miloMail = require('./mail')
	, componentsRegistry = require('./components/c_registry')
	, facetsRegistry = require('./components/c_facets/cf_registry')
	, Component = componentsRegistry.get('Component')
	, Scope = require('./components/scope')
	, BindAttribute = require('./attribute/a_bind')
	, BinderError = require('./util/error').Binder
	, _ = require('mol-proto')
	, check = require('./util/check')
	, Match =  check.Match;


binder.scan = scanDomForBindAttribute;
binder.create = createBoundComponents;
binder.twoPass = binderTwoPass;


module.exports = binder;


function binder(scopeEl) {
	return createBinderScope(scopeEl, function(scope, el, attr) {
		var info = new ComponentInfo(scope, el, attr);
		return Component.create(info);
	});
}


function binderTwoPass(scopeEl) {
	var scopeEl = scopeEl || document.body;
	var scanScope = binder.scan(scopeEl);
	return binder.create(scanScope);
}


function scanDomForBindAttribute(scopeEl) {
	return createBinderScope(scopeEl, function(scope, el, attr) {
		return new ComponentInfo(scope, el, attr);
	});
}


function createBoundComponents(scanScope) {
	var scope = new Scope;

	if (scanScope)
		scanScope._each(function(compInfo) {
			var aComponent = Component.create(compInfo);

			scope._add(aComponent, aComponent.name);
			if (aComponent.container)
				aComponent.container.scope = createBoundComponents(compInfo.container.scope);
		});

	return scope;
}


function createBinderScope(scopeEl, scopeObjectFactory) {
	var scopeEl = scopeEl || document.body
		, scope = new Scope;

	createScopeForElement(scope, scopeEl);
	return scope;


	function createScopeForElement(scope, el) {
		// get element's binding attribute (ml-bind by default)
		var attr = new BindAttribute(el);

		if (attr.node)
			var scopeObject = scopeObjectFactory(scope, el, attr);

		if (el.children && el.children.length) {
			var innerScope = createScopeForChildren(el);

			if (innerScope._length()) {
				// attach inner attributes to the current one (create a new scope) ...
				if (typeof scopeObject != 'undefined' && scopeObject.container)
					scopeObject.container.scope = innerScope;
				else // or keep them in the current scope
					scope._copy(innerScope);;
			}
		}

		if (scopeObject)
			scope._add(scopeObject, attr.compName);
	}


	function createScopeForChildren(containerEl) {
		var scope = new Scope;
		Array.prototype.forEach.call(containerEl.children, function(el) {
			createScopeForElement(scope, el)
		});
		return scope;
	}
}


// class used to hold information about component
function ComponentInfo(scope, el, attr) {
	attr.parse().validate();

	this.scope = scope;
	this.name = attr.compName;
	this.el = el;
	this.ComponentClass = getComponentClass(attr);
	this.extraFacetsClasses = getComponentExtraFacets(this.ComponentClass, attr);

	if (hasContainerFacet(this.ComponentClass, attr))
		this.container = {};

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
}

},{"./attribute/a_bind":3,"./components/c_facets/cf_registry":19,"./components/c_registry":24,"./components/scope":26,"./mail":31,"./util/check":36,"./util/error":37,"mol-proto":42}],7:[function(require,module,exports){
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

},{"./abstract/registry":2,"./components/c_class":8,"./components/c_facet":9,"./components/c_facets/cf_registry":19,"./components/c_registry":24,"./facets/f_class":28}],8:[function(require,module,exports){
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


Component.createComponentClass = createComponentClass;
delete Component.createFacetedClass;


Component.create = createComponent;


_.extendProto(Component, {
	init: initComponent,
	addFacet: addFacet,
	allFacets: envokeMethodOnAllFacets,
	remove: removeComponentFromScope
});


//
// class methods
//
function createComponent(info) {
	var ComponentClass = info.ComponentClass;
	var aComponent = new ComponentClass(info.scope, info.el, info.name);

	if (info.extraFacetsClasses)
		_.eachKey(info.extraFacetsClasses, function(FacetClass) {
			aComponent.addFacet(FacetClass);
		});

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
function initComponent(scope, element, name) {
	this.el = element;
	this.name = name;
	this.scope = scope;

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


function removeComponentFromScope() {
	if (this.scope)
		delete this.scope[this.name];
}

},{"../facets/f_object":29,"../messenger":33,"../util/check":36,"./c_facet":9,"./c_facets/cf_registry":19,"mol-proto":42}],9:[function(require,module,exports){
'use strict';

var Facet = require('../facets/f_class')
	, Messenger = require('../messenger')
	, FacetError = require('../util/error').Facet
	, _ = require('mol-proto');

var ComponentFacet = _.createSubclass(Facet, 'ComponentFacet');

module.exports = ComponentFacet;


_.extendProto(ComponentFacet, {
	init: initComponentFacet,
	start: startComponentFacet,
	check: checkDependencies,
	_setMessageSource: _setMessageSource,
	_createMessageSource: _createMessageSource
});


function initComponentFacet() {
	var messenger = new Messenger(this, Messenger.defaultMethods, undefined /* no messageSource */);

	Object.defineProperties(this, {
		_messenger: { value: messenger },
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


function _setMessageSource(messageSource) {
	this._messenger._setMessageSource(messageSource);
}


function _createMessageSource(MessageSourceClass) {
	var messageSource = new MessageSourceClass(this, undefined, this.owner);
	this._setMessageSource(messageSource)

	Object.defineProperty(this, '_messageSource', { value: messageSource });
}
},{"../facets/f_class":28,"../messenger":33,"../util/error":37,"mol-proto":42}],10:[function(require,module,exports){
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

},{"../../binder":6,"../c_facet":9,"./cf_registry":19,"mol-proto":42}],11:[function(require,module,exports){
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
	this._setMessageSource(compDataSource);

	Object.defineProperties(this, {
		_compDataSource: { value: compDataSource }
	});
}

},{"../../messenger":33,"../c_facet":9,"../c_message_sources/component_data_source":20,"./cf_registry":19,"mol-proto":42}],12:[function(require,module,exports){
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


},{"../../binder":6,"../../util/check":36,"../c_facet":9,"./cf_registry":19,"mol-proto":42}],13:[function(require,module,exports){
'use strict';

var ComponentFacet = require('../c_facet')
	, facetsRegistry = require('./cf_registry')
	, DOMEventsSource = require('../c_message_sources/dom_events_source')

	, _ = require('mol-proto');


// generic drag handler, should be overridden
var Drag = _.createSubclass(ComponentFacet, 'Drag');

_.extendProto(Drag, {
	init: initDragFacet,
	start: startDragFacet,

	setHandle: setDragHandle
	// _reattach: _reattachEventsOnElementChange
});

facetsRegistry.add(Drag);

module.exports = Drag;


function initDragFacet() {
	ComponentFacet.prototype.init.apply(this, arguments);	
	this._createMessageSource(DOMEventsSource);
}


function setDragHandle(handleEl) {
	if (! this.owner.el.contains(handleEl))
		return logger.warn('drag handle should be inside element to be dragged')
	this._dragHandle = handleEl;
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
		if (targetInDragHandle(event))
			window.getSelection().empty();
	}

	function onMouseMovement(eventType, event) {
		var shouldBeDraggable = targetInDragHandle(event);
		self.owner.el.setAttribute('draggable', shouldBeDraggable);
	}

	function onDragging(eventType, event) {
		if (targetInDragHandle(event)) {
			var dt = event.dataTransfer;
			dt.setData('text/html', self.owner.el.outerHTML);
			dt.setData('x-application/milo-component', self.owner);
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

},{"../c_facet":9,"../c_message_sources/dom_events_source":22,"./cf_registry":19,"mol-proto":42}],14:[function(require,module,exports){
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
				|| dataTypes.indexOf('x-application/milo-component') >= 0) {
			event.dataTransfer.dropEffect = 'move';
			event.preventDefault();
		}
	}
}
},{"../c_facet":9,"./cf_registry":19,"mol-proto":42}],15:[function(require,module,exports){
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
	this._onkeypress = this.config.onkeypress;
	this._onkeydown = this.config.onkeydown;
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
	eventsFacet.onMessages({
		'mousedown': onMouseDown,
		'blur': onBlur,
		'keypress': onKeyPress,
		'keydown': callConfiguredHandler
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

		callConfiguredHandler(eventType, event);
	}
}

},{"../c_facet":9,"./cf_registry":19,"mol-proto":42}],16:[function(require,module,exports){
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

	this._setMessageSource(domEventsSource)

	Object.defineProperties(this, {
		_domEventsSource: { value: domEventsSource }
	});
}

},{"../../messenger":33,"../c_facet":9,"../c_message_sources/dom_events_source":22,"./cf_registry":19,"mol-proto":42}],17:[function(require,module,exports){
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

	this._setMessageSource(messageSource);

	Object.defineProperties(this, {
		_messageSource: { value: messageSource }
	});
}
},{"../../messenger":33,"../c_facet":9,"../c_message_sources/iframe_message_source":23,"./cf_registry":19,"mol-proto":42}],18:[function(require,module,exports){
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

	return thisScope;
}

},{"../../binder":6,"../../util/check":36,"../c_facet":9,"./cf_registry":19,"mol-proto":42}],19:[function(require,module,exports){
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

},{"../../util/check":36,"../../util/error":37,"../c_class":8,"./dom_events_source":22,"mol-proto":42}],21:[function(require,module,exports){
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

},{"mol-proto":42}],22:[function(require,module,exports){
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
},{"../../messenger/message_source":34,"../../util/check":36,"../c_class":8,"./dom_events_constructors":21,"mol-proto":42}],23:[function(require,module,exports){
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

},{"../../messenger/message_source":34,"../../util/check":36,"mol-proto":42}],24:[function(require,module,exports){
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

var _ = require('mol-proto')
	, check = require('../util/check')
	, Match = check.Match
	, ScopeError = require('../util/error').Scope;


// Scope class
function Scope(parent) {
	check(parent, Match.Optional(Scope));

	Object.defineProperties(this, {
		_parent: { value: parent }
	})
};

_.extendProto(Scope, {
	_add: _addToScope,
	_copy: _copyFromScope,
	_each: _each,
	_uniqueName: _uniqueName,
	_length: _getScopeLength,
});

module.exports = Scope;


var allowedNamePattern = /^[A-Za-z][A-Za-z0-9\_\$]*$/;

function _addToScope(object, name) {
	if (this[name])
		throw new ScopeError('duplicate object name: ' + name);

	checkName(name);

	this[name] = object;
}


function _copyFromScope(aScope) {
	check(aScope, Scope);

	aScope._each(_addToScope, this);
}


function _each(callback, thisArg) {
	_.eachKey(this, callback, thisArg || this, true); // enumerates enumerable properties only
}


function checkName(name) {
	if (! allowedNamePattern.test(name))
		throw new ScopeError('name should start from letter, this name is not allowed: ' + name);
}


function _uniqueName(prefix) {
	var prefixes = uniqueName.prefixes || (uniqueName.prefixes = {})
		, prefixStr = prefix + '_';
	
	if (prefixes[prefix])
		return prefixStr + prefixes[prefix]++;

	var uniqueNum = 0
		, prefixLen = prefixStr.length;

	_.eachKey(this, function(obj, name) {
		if (name.indexOf(prefixStr) == -1) return;
		var num = name.slice(prefixLen);
		if (num == uniqueNum) uniqueNum++ ;
	});
}


function _getScopeLength() {
	return Object.keys(this).length;
}

},{"../util/check":36,"../util/error":37,"mol-proto":42}],27:[function(require,module,exports){
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

},{"mol-proto":42}],28:[function(require,module,exports){
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

},{"mol-proto":42}],29:[function(require,module,exports){
'use strict';

var Facet = require('./f_class')
	, _ = require('mol-proto')
	, check = require('../util/check')
	, Match = check.Match
	, FacetError = require('../util/error').Facet;

module.exports = FacetedObject;


// abstract class for faceted object
function FacetedObject() {
	// TODO write a test to check that facets are created if configuration isn't passed
	var facetsConfig = this.facetsConfig || {};

	var facetsDescriptors = {}
		, facets = {};

	if (this.constructor == FacetedObject)		
		throw new FacetError('FacetedObject is an abstract class, can\'t be instantiated');

	if (this.facetsClasses)
		_.eachKey(this.facetsClasses, instantiateFacet, this, true);

	Object.defineProperties(this, facetsDescriptors);
	Object.defineProperty(this, 'facets', { value: facets });	

	// calling init if it is defined in the class
	if (this.init)
		this.init.apply(this, arguments);

	function instantiateFacet(FacetClass, fct) {
		var facetOpts = facetsConfig[fct];

		facets[fct] = new FacetClass(this, facetOpts);

		facetsDescriptors[fct] = {
			enumerable: true,
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

	var protoFacets = this.constructor.prototype.facetsClasses;

	if (protoFacets && protoFacets[facetName])
		throw new FacetError('facet ' + facetName + ' is already part of the class ' + this.constructor.name);

	if (this[facetName])
		throw new FacetError('facet ' + facetName + ' is already present in object');

	var newFacet = this.facets[facetName] = new FacetClass(this, facetOpts);

	Object.defineProperty(this, facetName, {
		enumerable: true,
		value: newFacet
	});

	return newFacet;
}


FacetedObject.hasFacet = function hasFacet(facetName) {
	var protoFacets = this.prototype.facetsClasses;
	return protoFacets && protoFacets[facetName];
}



// factory that creates classes (constructors) from the map of facets
// these classes inherit from FacetedObject
FacetedObject.createFacetedClass = function (name, facetsClasses, facetsConfig) {
	check(name, String);
	check(facetsClasses, Match.ObjectHash(Match.Subclass(Facet, true)));
	check(facetsConfig, Match.Optional(Object));

	if (facetsConfig)
		_.eachKey(facetsConfig, function(fctConfig, fctName) {
			if (! facetsClasses.hasOwnProperty(fctName))
				throw new FacetError('configuration for facet (' + fctName + ') passed that is not in class');
		});

	var FacetedClass = _.createSubclass(this, name, true);

	_.extendProto(FacetedClass, {
		facetsClasses: facetsClasses,
		facetsConfig: facetsConfig
	});
	return FacetedClass;
};

},{"../util/check":36,"../util/error":37,"./f_class":28,"mol-proto":42}],30:[function(require,module,exports){
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

},{"./attribute/a_load":4,"./config":27,"./mail":31,"./util/error":37,"./util/logger":39,"./util/request":41}],31:[function(require,module,exports){
'use strict';

var Messenger = require('../messenger')
	, MailMessageSource = require('./mail_source');


var mailMsgSource = new MailMessageSource();

var miloMail = new Messenger(undefined, undefined, mailMsgSource);

module.exports = miloMail;

},{"../messenger":33,"./mail_source":32}],32:[function(require,module,exports){
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

},{"../components/c_message_sources/dom_events_constructors":21,"../messenger/message_source":34,"../util/check":36,"../util/error":37,"mol-proto":42}],33:[function(require,module,exports){
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
	_callSubscribers: _callSubscribers,
	_setMessageSource: _setMessageSource
});


Messenger.defaultMethods = {
	on: 'onMessage',
	off: 'offMessage',
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
 		_messageSource: { value: messageSource, writable: true }
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
			subscriber.call(this._hostObject, message, data);
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


function _setMessageSource(messageSource) {
	check(messageSource, MessageSource);

 	Object.defineProperties(this, {
 		_messageSource: { value: messageSource }
 	});
 	messageSource.messenger = this;
}


},{"../abstract/mixin":1,"../util/check":36,"../util/error":37,"./message_source":34,"mol-proto":42}],34:[function(require,module,exports){
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

},{"../abstract/mixin":1,"../util/error":37,"../util/logger":39,"mol-proto":42}],35:[function(require,module,exports){
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

},{"./binder":6,"./classes":7,"./components/c_facets/Container":10,"./components/c_facets/Data":11,"./components/c_facets/Dom":12,"./components/c_facets/Drag":13,"./components/c_facets/Drop":14,"./components/c_facets/Editable":15,"./components/c_facets/Events":16,"./components/c_facets/Frame":17,"./components/c_facets/Template":18,"./components/classes/View":25,"./config":27,"./loader":30,"./mail":31,"./util":38}],36:[function(require,module,exports){
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


},{"mol-proto":42}],37:[function(require,module,exports){
'use strict';

var _ = require('mol-proto');


// module exports error classes for all names defined in this array
var errorClassNames = ['AbstractClass', 'Mixin', 'Messenger', 'ComponentDataSource',
					   'Attribute', 'Binder', 'Loader', 'MailMessageSource', 'Facet',
					   'Scope'];

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

},{"mol-proto":42}],38:[function(require,module,exports){
'use strict';

var util = {
	logger: require('./logger'),
	request: require('./request'),
	check: require('./check'),
	error: require('./error')
};

module.exports = util;

},{"./check":36,"./error":37,"./logger":39,"./request":41}],39:[function(require,module,exports){
'use strict';

var Logger = require('./logger_class');

var logger = new Logger({ level: 3 });

module.exports = logger;

},{"./logger_class":40}],40:[function(require,module,exports){
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

},{"mol-proto":42}],41:[function(require,module,exports){
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

},{"mol-proto":42}],42:[function(require,module,exports){
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

},{}],43:[function(require,module,exports){
'use strict';

describe('milo binder', function() {
    it('should bind components based on ml-bind attribute', function() {
    	var milo = require('../../lib/milo');

		expect({p: 1}).property('p', 1);

        console.log(milo.binder.scan());

        console.log('one pass binding');
    	var ctrl1 = milo.binder();
        console.log(ctrl1);

        console.log('two pass binding');
        var ctrl = milo.binder.twoPass();
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

        var innerPara = ctrl.myTemplate.container.scope.innerPara;
        innerPara.el.innerHTML += ', then bound and changed via component inside template';
    });
});

},{"../../lib/milo":35}]},{},[43])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2Fic3RyYWN0L21peGluLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9hYnN0cmFjdC9yZWdpc3RyeS5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvYXR0cmlidXRlL2FfYmluZC5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvYXR0cmlidXRlL2FfbG9hZC5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvYXR0cmlidXRlL2luZGV4LmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9iaW5kZXIuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NsYXNzZXMuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19jbGFzcy5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX2ZhY2V0LmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfZmFjZXRzL0NvbnRhaW5lci5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX2ZhY2V0cy9EYXRhLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfZmFjZXRzL0RvbS5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX2ZhY2V0cy9EcmFnLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfZmFjZXRzL0Ryb3AuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19mYWNldHMvRWRpdGFibGUuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19mYWNldHMvRXZlbnRzLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfZmFjZXRzL0ZyYW1lLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfZmFjZXRzL1RlbXBsYXRlLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfZmFjZXRzL2NmX3JlZ2lzdHJ5LmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfbWVzc2FnZV9zb3VyY2VzL2NvbXBvbmVudF9kYXRhX3NvdXJjZS5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX21lc3NhZ2Vfc291cmNlcy9kb21fZXZlbnRzX2NvbnN0cnVjdG9ycy5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX21lc3NhZ2Vfc291cmNlcy9kb21fZXZlbnRzX3NvdXJjZS5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX21lc3NhZ2Vfc291cmNlcy9pZnJhbWVfbWVzc2FnZV9zb3VyY2UuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19yZWdpc3RyeS5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jbGFzc2VzL1ZpZXcuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvc2NvcGUuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbmZpZy5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvZmFjZXRzL2ZfY2xhc3MuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2ZhY2V0cy9mX29iamVjdC5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvbG9hZGVyLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9tYWlsL2luZGV4LmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9tYWlsL21haWxfc291cmNlLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9tZXNzZW5nZXIvaW5kZXguanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL21lc3Nlbmdlci9tZXNzYWdlX3NvdXJjZS5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvbWlsby5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvdXRpbC9jaGVjay5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvdXRpbC9lcnJvci5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvdXRpbC9pbmRleC5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvdXRpbC9sb2dnZXIuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL3V0aWwvbG9nZ2VyX2NsYXNzLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi91dGlsL3JlcXVlc3QuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbm9kZV9tb2R1bGVzL21vbC1wcm90by9saWIvcHJvdG8uanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vdGVzdF9odG1sL2JpbmRfdGVzdC9iaW5kX3Rlc3QuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9QQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpXG5cdCwgY2hlY2sgPSByZXF1aXJlKCcuLi91dGlsL2NoZWNrJylcblx0LCBNYXRjaCA9IGNoZWNrLk1hdGNoXG5cdCwgTWl4aW5FcnJvciA9IHJlcXVpcmUoJy4uL3V0aWwvZXJyb3InKS5NaXhpbjtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IE1peGluO1xuXG4vLyBhbiBhYnN0cmFjdCBjbGFzcyBmb3IgbWl4aW4gcGF0dGVybiAtIGFkZGluZyBwcm94eSBtZXRob2RzIHRvIGhvc3Qgb2JqZWN0c1xuZnVuY3Rpb24gTWl4aW4oaG9zdE9iamVjdCwgcHJveHlNZXRob2RzIC8qLCBvdGhlciBhcmdzIC0gcGFzc2VkIHRvIGluaXQgbWV0aG9kICovKSB7XG5cdC8vIFRPRE8gLSBtb2NlIGNoZWNrcyBmcm9tIE1lc3NlbmdlciBoZXJlXG5cdGNoZWNrKGhvc3RPYmplY3QsIE1hdGNoLk9wdGlvbmFsKE9iamVjdCkpO1xuXHRjaGVjayhwcm94eU1ldGhvZHMsIE1hdGNoLk9wdGlvbmFsKE1hdGNoLk9iamVjdEhhc2goU3RyaW5nKSkpO1xuXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnX2hvc3RPYmplY3QnLCB7IHZhbHVlOiBob3N0T2JqZWN0IH0pO1xuXHRpZiAocHJveHlNZXRob2RzKVxuXHRcdHRoaXMuX2NyZWF0ZVByb3h5TWV0aG9kcyhwcm94eU1ldGhvZHMpO1xuXG5cdC8vIGNhbGxpbmcgaW5pdCBpZiBpdCBpcyBkZWZpbmVkIGluIHRoZSBjbGFzc1xuXHRpZiAodGhpcy5pbml0KVxuXHRcdHRoaXMuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufVxuXG5fLmV4dGVuZFByb3RvKE1peGluLCB7XG5cdF9jcmVhdGVQcm94eU1ldGhvZDogX2NyZWF0ZVByb3h5TWV0aG9kLFxuXHRfY3JlYXRlUHJveHlNZXRob2RzOiBfY3JlYXRlUHJveHlNZXRob2RzXG59KTtcblxuXG5mdW5jdGlvbiBfY3JlYXRlUHJveHlNZXRob2QobWl4aW5NZXRob2ROYW1lLCBwcm94eU1ldGhvZE5hbWUpIHtcblx0aWYgKHRoaXMuX2hvc3RPYmplY3RbcHJveHlNZXRob2ROYW1lXSlcblx0XHR0aHJvdyBuZXcgTWl4aW5FcnJvcignbWV0aG9kICcgKyBwcm94eU1ldGhvZE5hbWUgK1xuXHRcdFx0XHRcdFx0XHRcdCAnIGFscmVhZHkgZGVmaW5lZCBpbiBob3N0IG9iamVjdCcpO1xuXG5cdGNoZWNrKHRoaXNbbWl4aW5NZXRob2ROYW1lXSwgRnVuY3Rpb24pO1xuXG5cdHZhciBib3VuZE1ldGhvZCA9IHRoaXNbbWl4aW5NZXRob2ROYW1lXS5iaW5kKHRoaXMpO1xuXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLl9ob3N0T2JqZWN0LCBwcm94eU1ldGhvZE5hbWUsXG5cdFx0eyB2YWx1ZTogYm91bmRNZXRob2QgfSk7XG59XG5cblxuZnVuY3Rpb24gX2NyZWF0ZVByb3h5TWV0aG9kcyhwcm94eU1ldGhvZHMpIHtcblx0Ly8gY3JlYXRpbmcgYW5kIGJpbmRpbmcgcHJveHkgbWV0aG9kcyBvbiB0aGUgaG9zdCBvYmplY3Rcblx0Xy5lYWNoS2V5KHByb3h5TWV0aG9kcywgX2NyZWF0ZVByb3h5TWV0aG9kLCB0aGlzKTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vdXRpbC9jaGVjaycpXG5cdCwgTWF0Y2ggPSBjaGVjay5NYXRjaDtcblxubW9kdWxlLmV4cG9ydHMgPSBDbGFzc1JlZ2lzdHJ5O1xuXG5mdW5jdGlvbiBDbGFzc1JlZ2lzdHJ5IChGb3VuZGF0aW9uQ2xhc3MpIHtcblx0aWYgKEZvdW5kYXRpb25DbGFzcylcblx0XHR0aGlzLnNldENsYXNzKEZvdW5kYXRpb25DbGFzcyk7XG5cblx0Ly8gT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdfX3JlZ2lzdGVyZWRDbGFzc2VzJywge1xuXHQvLyBcdFx0ZW51bWVyYWJsZTogZmFsc2UsXG5cdC8vIFx0XHR3cml0YWJsZTogdHJ1ZSxcblx0Ly8gXHRcdGNvbmZpZ3VyYWJsZTogdHJ1ZSxcblx0Ly8gXHRcdHZhbHVlOiB7fVxuXHQvLyB9KTtcblxuXHR0aGlzLl9fcmVnaXN0ZXJlZENsYXNzZXMgPSB7fTtcbn1cblxuXy5leHRlbmRQcm90byhDbGFzc1JlZ2lzdHJ5LCB7XG5cdGFkZDogcmVnaXN0ZXJDbGFzcyxcblx0Z2V0OiBnZXRDbGFzcyxcblx0cmVtb3ZlOiB1bnJlZ2lzdGVyQ2xhc3MsXG5cdGNsZWFuOiB1bnJlZ2lzdGVyQWxsQ2xhc3Nlcyxcblx0c2V0Q2xhc3M6IHNldEZvdW5kYXRpb25DbGFzc1xufSk7XG5cblxuZnVuY3Rpb24gc2V0Rm91bmRhdGlvbkNsYXNzKEZvdW5kYXRpb25DbGFzcykge1xuXHRjaGVjayhGb3VuZGF0aW9uQ2xhc3MsIEZ1bmN0aW9uKTtcblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdGb3VuZGF0aW9uQ2xhc3MnLCB7XG5cdFx0ZW51bWVyYWJsZTogdHJ1ZSxcblx0XHR2YWx1ZTogRm91bmRhdGlvbkNsYXNzXG5cdH0pO1xufVxuXG5mdW5jdGlvbiByZWdpc3RlckNsYXNzKGFDbGFzcywgbmFtZSkge1xuXHRuYW1lID0gbmFtZSB8fCBhQ2xhc3MubmFtZTtcblxuXHRjaGVjayhuYW1lLCBTdHJpbmcsICdjbGFzcyBuYW1lIG11c3QgYmUgc3RyaW5nJyk7XG5cdGNoZWNrKG5hbWUsIE1hdGNoLldoZXJlKGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiB0eXBlb2YgbmFtZSA9PSAnc3RyaW5nJyAmJiBuYW1lICE9ICcnO1xuXHR9KSwgJ2NsYXNzIG5hbWUgbXVzdCBiZSBzdHJpbmcnKTtcblx0aWYgKHRoaXMuRm91bmRhdGlvbkNsYXNzKSB7XG5cdFx0aWYgKGFDbGFzcyAhPSB0aGlzLkZvdW5kYXRpb25DbGFzcylcblx0XHRcdGNoZWNrKGFDbGFzcywgTWF0Y2guU3ViY2xhc3ModGhpcy5Gb3VuZGF0aW9uQ2xhc3MpLCAnY2xhc3MgbXVzdCBiZSBhIHN1YihjbGFzcykgb2YgYSBmb3VuZGF0aW9uIGNsYXNzJyk7XG5cdH0gZWxzZVxuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ2ZvdW5kYXRpb24gY2xhc3MgbXVzdCBiZSBzZXQgYmVmb3JlIGFkZGluZyBjbGFzc2VzIHRvIHJlZ2lzdHJ5Jyk7XG5cblx0aWYgKHRoaXMuX19yZWdpc3RlcmVkQ2xhc3Nlc1tuYW1lXSlcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdpcyBhbHJlYWR5IHJlZ2lzdGVyZWQnKTtcblxuXHR0aGlzLl9fcmVnaXN0ZXJlZENsYXNzZXNbbmFtZV0gPSBhQ2xhc3M7XG59O1xuXG5cbmZ1bmN0aW9uIGdldENsYXNzKG5hbWUpIHtcblx0Y2hlY2sobmFtZSwgU3RyaW5nLCAnY2xhc3MgbmFtZSBtdXN0IGJlIHN0cmluZycpO1xuXHRyZXR1cm4gdGhpcy5fX3JlZ2lzdGVyZWRDbGFzc2VzW25hbWVdO1xufTtcblxuXG5mdW5jdGlvbiB1bnJlZ2lzdGVyQ2xhc3MobmFtZU9yQ2xhc3MpIHtcblx0Y2hlY2sobmFtZU9yQ2xhc3MsIE1hdGNoLk9uZU9mKFN0cmluZywgRnVuY3Rpb24pLCAnY2xhc3Mgb3IgbmFtZSBtdXN0IGJlIHN1cHBsaWVkJyk7XG5cblx0dmFyIG5hbWUgPSB0eXBlb2YgbmFtZU9yQ2xhc3MgPT0gJ3N0cmluZydcblx0XHRcdFx0XHRcdD8gbmFtZU9yQ2xhc3Ncblx0XHRcdFx0XHRcdDogbmFtZU9yQ2xhc3MubmFtZTtcblx0XHRcdFx0XHRcdFxuXHRpZiAoISB0aGlzLl9fcmVnaXN0ZXJlZENsYXNzZXNbbmFtZV0pXG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignY2xhc3MgaXMgbm90IHJlZ2lzdGVyZWQnKTtcblxuXHRkZWxldGUgdGhpcy5fX3JlZ2lzdGVyZWRDbGFzc2VzW25hbWVdO1xufTtcblxuXG5mdW5jdGlvbiB1bnJlZ2lzdGVyQWxsQ2xhc3NlcygpIHtcblx0dGhpcy5fX3JlZ2lzdGVyZWRDbGFzc2VzID0ge307XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQXR0cmlidXRlID0gcmVxdWlyZSgnLi9pbmRleCcpXG5cdCwgQXR0cmlidXRlRXJyb3IgPSByZXF1aXJlKCcuLi91dGlsL2Vycm9yJykuQXR0cmlidXRlXG5cdCwgY29uZmlnID0gcmVxdWlyZSgnLi4vY29uZmlnJylcblx0LCBfID0gcmVxdWlyZSgnbW9sLXByb3RvJylcblx0LCBjaGVjayA9IHJlcXVpcmUoJy4uL3V0aWwvY2hlY2snKVxuXHQsIE1hdGNoID0gY2hlY2suTWF0Y2g7XG5cblxuLy8gTWF0Y2hlcztcbi8vIDpteVZpZXcgLSBvbmx5IGNvbXBvbmVudCBuYW1lXG4vLyBWaWV3Om15VmlldyAtIGNsYXNzIGFuZCBjb21wb25lbnQgbmFtZVxuLy8gW0V2ZW50cywgRGF0YV06bXlWaWV3IC0gZmFjZXRzIGFuZCBjb21wb25lbnQgbmFtZVxuLy8gVmlld1tFdmVudHNdOm15VmlldyAtIGNsYXNzLCBmYWNldChzKSBhbmQgY29tcG9uZW50IG5hbWVcblxudmFyIGF0dHJSZWdFeHA9IC9eKFteXFw6XFxbXFxdXSopKD86XFxbKFteXFw6XFxbXFxdXSopXFxdKT9cXDo/KFteOl0qKSQvXG5cdCwgZmFjZXRzU3BsaXRSZWdFeHAgPSAvXFxzKig/OlxcLHxcXHMpXFxzKi87XG5cblxudmFyIEJpbmRBdHRyaWJ1dGUgPSBfLmNyZWF0ZVN1YmNsYXNzKEF0dHJpYnV0ZSwgJ0JpbmRBdHRyaWJ1dGUnLCB0cnVlKTtcblxuXy5leHRlbmRQcm90byhCaW5kQXR0cmlidXRlLCB7XG5cdGF0dHJOYW1lOiBnZXRBdHRyaWJ1dGVOYW1lLFxuXHRwYXJzZTogcGFyc2VBdHRyaWJ1dGUsXG5cdHZhbGlkYXRlOiB2YWxpZGF0ZUF0dHJpYnV0ZVxufSk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBCaW5kQXR0cmlidXRlO1xuXG5cbmZ1bmN0aW9uIGdldEF0dHJpYnV0ZU5hbWUoKSB7XG5cdHJldHVybiBjb25maWcuYXR0cnNbJ2JpbmQnXTtcbn1cblxuXG5mdW5jdGlvbiBwYXJzZUF0dHJpYnV0ZSgpIHtcblx0aWYgKCEgdGhpcy5ub2RlKSByZXR1cm47XG5cblx0dmFyIHZhbHVlID0gdGhpcy5nZXQoKTtcblxuXHRpZiAodmFsdWUpXG5cdFx0dmFyIGJpbmRUbyA9IHZhbHVlLm1hdGNoKGF0dHJSZWdFeHApO1xuXG5cdGlmICghIGJpbmRUbylcblx0XHR0aHJvdyBuZXcgQXR0cmlidXRlRXJyb3IoJ2ludmFsaWQgYmluZCBhdHRyaWJ1dGUgJyArIHZhbHVlKTtcblxuXHR0aGlzLmNvbXBDbGFzcyA9IGJpbmRUb1sxXSB8fCAnQ29tcG9uZW50Jztcblx0dGhpcy5jb21wRmFjZXRzID0gKGJpbmRUb1syXSAmJiBiaW5kVG9bMl0uc3BsaXQoZmFjZXRzU3BsaXRSZWdFeHApKSB8fCB1bmRlZmluZWQ7XG5cdHRoaXMuY29tcE5hbWUgPSBiaW5kVG9bM10gfHwgdW5kZWZpbmVkO1xuXG5cdHJldHVybiB0aGlzO1xufVxuXG5cbmZ1bmN0aW9uIHZhbGlkYXRlQXR0cmlidXRlKCkge1xuXHR2YXIgY29tcE5hbWUgPSB0aGlzLmNvbXBOYW1lO1xuXHRjaGVjayhjb21wTmFtZSwgTWF0Y2guV2hlcmUoZnVuY3Rpb24oKSB7XG4gIFx0XHRyZXR1cm4gdHlwZW9mIGNvbXBOYW1lID09ICdzdHJpbmcnICYmIGNvbXBOYW1lICE9ICcnO1xuXHR9KSwgJ2VtcHR5IGNvbXBvbmVudCBuYW1lJyk7XG5cblx0aWYgKCEgdGhpcy5jb21wQ2xhc3MpXG5cdFx0dGhyb3cgbmV3IEF0dHJpYnV0ZUVycm9yKCdlbXB0eSBjb21wb25lbnQgY2xhc3MgbmFtZSAnICsgdGhpcy5jb21wQ2xhc3MpO1xuXG5cdHJldHVybiB0aGlzO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQXR0cmlidXRlID0gcmVxdWlyZSgnLi9pbmRleCcpXG5cdCwgQXR0cmlidXRlRXJyb3IgPSByZXF1aXJlKCcuLi91dGlsL2Vycm9yJykuQXR0cmlidXRlXG5cdCwgY29uZmlnID0gcmVxdWlyZSgnLi4vY29uZmlnJylcblx0LCBfID0gcmVxdWlyZSgnbW9sLXByb3RvJyk7XG5cblxudmFyIExvYWRBdHRyaWJ1dGUgPSBfLmNyZWF0ZVN1YmNsYXNzKEF0dHJpYnV0ZSwgJ0xvYWRBdHRyaWJ1dGUnLCB0cnVlKTtcblxuXy5leHRlbmRQcm90byhMb2FkQXR0cmlidXRlLCB7XG5cdGF0dHJOYW1lOiBnZXRBdHRyaWJ1dGVOYW1lLFxuXHRwYXJzZTogcGFyc2VBdHRyaWJ1dGUsXG5cdHZhbGlkYXRlOiB2YWxpZGF0ZUF0dHJpYnV0ZVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gTG9hZEF0dHJpYnV0ZTtcblxuXG5mdW5jdGlvbiBnZXRBdHRyaWJ1dGVOYW1lKCkge1xuXHRyZXR1cm4gY29uZmlnLmF0dHJzLmxvYWQ7XG59XG5cblxuZnVuY3Rpb24gcGFyc2VBdHRyaWJ1dGUoKSB7XG5cdGlmICghIHRoaXMubm9kZSkgcmV0dXJuO1xuXG5cdHZhciB2YWx1ZSA9IHRoaXMuZ2V0KCk7XG5cblx0dGhpcy5sb2FkVXJsID0gdmFsdWU7XG5cblx0cmV0dXJuIHRoaXM7XG59XG5cblxuZnVuY3Rpb24gdmFsaWRhdGVBdHRyaWJ1dGUoKSB7XG5cdC8vIFRPRE8gdXJsIHZhbGlkYXRpb25cblxuXHRyZXR1cm4gdGhpcztcbn0iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgnbW9sLXByb3RvJylcblx0LCBjaGVjayA9IHJlcXVpcmUoJy4uL3V0aWwvY2hlY2snKVxuXHQsIE1hdGNoID0gY2hlY2suTWF0Y2hcblx0LCB0b0JlSW1wbGVtZW50ZWQgPSByZXF1aXJlKCcuLi91dGlsL2Vycm9yJykudG9CZUltcGxlbWVudGVkO1xuXG5cbi8vIGFuIGFic3RyYWN0IGF0dHJpYnV0ZSBjbGFzcyBmb3IgYXR0cmlidXRlIHBhcnNpbmcgYW5kIHZhbGlkYXRpb25cblxubW9kdWxlLmV4cG9ydHMgPSBBdHRyaWJ1dGU7XG5cbmZ1bmN0aW9uIEF0dHJpYnV0ZShlbCwgbmFtZSkge1xuXHR0aGlzLm5hbWUgPSBuYW1lIHx8IHRoaXMuYXR0ck5hbWUoKTtcblx0dGhpcy5lbCA9IGVsO1xuXHR0aGlzLm5vZGUgPSBlbC5hdHRyaWJ1dGVzW3RoaXMubmFtZV07XG59XG5cbl8uZXh0ZW5kUHJvdG8oQXR0cmlidXRlLCB7XG5cdGdldDogZ2V0QXR0cmlidXRlVmFsdWUsXG5cdHNldDogc2V0QXR0cmlidXRlVmFsdWUsXG5cblx0Ly8gc2hvdWxkIGJlIGRlZmluZWQgaW4gc3ViY2xhc3Ncblx0YXR0ck5hbWU6IHRvQmVJbXBsZW1lbnRlZCxcblx0cGFyc2U6IHRvQmVJbXBsZW1lbnRlZCxcblx0dmFsaWRhdGU6IHRvQmVJbXBsZW1lbnRlZCxcbn0pO1xuXG5cbmZ1bmN0aW9uIGdldEF0dHJpYnV0ZVZhbHVlKCkge1xuXHRyZXR1cm4gdGhpcy5lbC5nZXRBdHRyaWJ1dGUodGhpcy5uYW1lKTtcbn1cblxuZnVuY3Rpb24gc2V0QXR0cmlidXRlVmFsdWUodmFsdWUpIHtcblx0dGhpcy5lbC5zZXRBdHRyaWJ1dGUodGhpcy5uYW1lLCB2YWx1ZSk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBtaWxvTWFpbCA9IHJlcXVpcmUoJy4vbWFpbCcpXG5cdCwgY29tcG9uZW50c1JlZ2lzdHJ5ID0gcmVxdWlyZSgnLi9jb21wb25lbnRzL2NfcmVnaXN0cnknKVxuXHQsIGZhY2V0c1JlZ2lzdHJ5ID0gcmVxdWlyZSgnLi9jb21wb25lbnRzL2NfZmFjZXRzL2NmX3JlZ2lzdHJ5Jylcblx0LCBDb21wb25lbnQgPSBjb21wb25lbnRzUmVnaXN0cnkuZ2V0KCdDb21wb25lbnQnKVxuXHQsIFNjb3BlID0gcmVxdWlyZSgnLi9jb21wb25lbnRzL3Njb3BlJylcblx0LCBCaW5kQXR0cmlidXRlID0gcmVxdWlyZSgnLi9hdHRyaWJ1dGUvYV9iaW5kJylcblx0LCBCaW5kZXJFcnJvciA9IHJlcXVpcmUoJy4vdXRpbC9lcnJvcicpLkJpbmRlclxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi91dGlsL2NoZWNrJylcblx0LCBNYXRjaCA9ICBjaGVjay5NYXRjaDtcblxuXG5iaW5kZXIuc2NhbiA9IHNjYW5Eb21Gb3JCaW5kQXR0cmlidXRlO1xuYmluZGVyLmNyZWF0ZSA9IGNyZWF0ZUJvdW5kQ29tcG9uZW50cztcbmJpbmRlci50d29QYXNzID0gYmluZGVyVHdvUGFzcztcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGJpbmRlcjtcblxuXG5mdW5jdGlvbiBiaW5kZXIoc2NvcGVFbCkge1xuXHRyZXR1cm4gY3JlYXRlQmluZGVyU2NvcGUoc2NvcGVFbCwgZnVuY3Rpb24oc2NvcGUsIGVsLCBhdHRyKSB7XG5cdFx0dmFyIGluZm8gPSBuZXcgQ29tcG9uZW50SW5mbyhzY29wZSwgZWwsIGF0dHIpO1xuXHRcdHJldHVybiBDb21wb25lbnQuY3JlYXRlKGluZm8pO1xuXHR9KTtcbn1cblxuXG5mdW5jdGlvbiBiaW5kZXJUd29QYXNzKHNjb3BlRWwpIHtcblx0dmFyIHNjb3BlRWwgPSBzY29wZUVsIHx8IGRvY3VtZW50LmJvZHk7XG5cdHZhciBzY2FuU2NvcGUgPSBiaW5kZXIuc2NhbihzY29wZUVsKTtcblx0cmV0dXJuIGJpbmRlci5jcmVhdGUoc2NhblNjb3BlKTtcbn1cblxuXG5mdW5jdGlvbiBzY2FuRG9tRm9yQmluZEF0dHJpYnV0ZShzY29wZUVsKSB7XG5cdHJldHVybiBjcmVhdGVCaW5kZXJTY29wZShzY29wZUVsLCBmdW5jdGlvbihzY29wZSwgZWwsIGF0dHIpIHtcblx0XHRyZXR1cm4gbmV3IENvbXBvbmVudEluZm8oc2NvcGUsIGVsLCBhdHRyKTtcblx0fSk7XG59XG5cblxuZnVuY3Rpb24gY3JlYXRlQm91bmRDb21wb25lbnRzKHNjYW5TY29wZSkge1xuXHR2YXIgc2NvcGUgPSBuZXcgU2NvcGU7XG5cblx0aWYgKHNjYW5TY29wZSlcblx0XHRzY2FuU2NvcGUuX2VhY2goZnVuY3Rpb24oY29tcEluZm8pIHtcblx0XHRcdHZhciBhQ29tcG9uZW50ID0gQ29tcG9uZW50LmNyZWF0ZShjb21wSW5mbyk7XG5cblx0XHRcdHNjb3BlLl9hZGQoYUNvbXBvbmVudCwgYUNvbXBvbmVudC5uYW1lKTtcblx0XHRcdGlmIChhQ29tcG9uZW50LmNvbnRhaW5lcilcblx0XHRcdFx0YUNvbXBvbmVudC5jb250YWluZXIuc2NvcGUgPSBjcmVhdGVCb3VuZENvbXBvbmVudHMoY29tcEluZm8uY29udGFpbmVyLnNjb3BlKTtcblx0XHR9KTtcblxuXHRyZXR1cm4gc2NvcGU7XG59XG5cblxuZnVuY3Rpb24gY3JlYXRlQmluZGVyU2NvcGUoc2NvcGVFbCwgc2NvcGVPYmplY3RGYWN0b3J5KSB7XG5cdHZhciBzY29wZUVsID0gc2NvcGVFbCB8fCBkb2N1bWVudC5ib2R5XG5cdFx0LCBzY29wZSA9IG5ldyBTY29wZTtcblxuXHRjcmVhdGVTY29wZUZvckVsZW1lbnQoc2NvcGUsIHNjb3BlRWwpO1xuXHRyZXR1cm4gc2NvcGU7XG5cblxuXHRmdW5jdGlvbiBjcmVhdGVTY29wZUZvckVsZW1lbnQoc2NvcGUsIGVsKSB7XG5cdFx0Ly8gZ2V0IGVsZW1lbnQncyBiaW5kaW5nIGF0dHJpYnV0ZSAobWwtYmluZCBieSBkZWZhdWx0KVxuXHRcdHZhciBhdHRyID0gbmV3IEJpbmRBdHRyaWJ1dGUoZWwpO1xuXG5cdFx0aWYgKGF0dHIubm9kZSlcblx0XHRcdHZhciBzY29wZU9iamVjdCA9IHNjb3BlT2JqZWN0RmFjdG9yeShzY29wZSwgZWwsIGF0dHIpO1xuXG5cdFx0aWYgKGVsLmNoaWxkcmVuICYmIGVsLmNoaWxkcmVuLmxlbmd0aCkge1xuXHRcdFx0dmFyIGlubmVyU2NvcGUgPSBjcmVhdGVTY29wZUZvckNoaWxkcmVuKGVsKTtcblxuXHRcdFx0aWYgKGlubmVyU2NvcGUuX2xlbmd0aCgpKSB7XG5cdFx0XHRcdC8vIGF0dGFjaCBpbm5lciBhdHRyaWJ1dGVzIHRvIHRoZSBjdXJyZW50IG9uZSAoY3JlYXRlIGEgbmV3IHNjb3BlKSAuLi5cblx0XHRcdFx0aWYgKHR5cGVvZiBzY29wZU9iamVjdCAhPSAndW5kZWZpbmVkJyAmJiBzY29wZU9iamVjdC5jb250YWluZXIpXG5cdFx0XHRcdFx0c2NvcGVPYmplY3QuY29udGFpbmVyLnNjb3BlID0gaW5uZXJTY29wZTtcblx0XHRcdFx0ZWxzZSAvLyBvciBrZWVwIHRoZW0gaW4gdGhlIGN1cnJlbnQgc2NvcGVcblx0XHRcdFx0XHRzY29wZS5fY29weShpbm5lclNjb3BlKTs7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKHNjb3BlT2JqZWN0KVxuXHRcdFx0c2NvcGUuX2FkZChzY29wZU9iamVjdCwgYXR0ci5jb21wTmFtZSk7XG5cdH1cblxuXG5cdGZ1bmN0aW9uIGNyZWF0ZVNjb3BlRm9yQ2hpbGRyZW4oY29udGFpbmVyRWwpIHtcblx0XHR2YXIgc2NvcGUgPSBuZXcgU2NvcGU7XG5cdFx0QXJyYXkucHJvdG90eXBlLmZvckVhY2guY2FsbChjb250YWluZXJFbC5jaGlsZHJlbiwgZnVuY3Rpb24oZWwpIHtcblx0XHRcdGNyZWF0ZVNjb3BlRm9yRWxlbWVudChzY29wZSwgZWwpXG5cdFx0fSk7XG5cdFx0cmV0dXJuIHNjb3BlO1xuXHR9XG59XG5cblxuLy8gY2xhc3MgdXNlZCB0byBob2xkIGluZm9ybWF0aW9uIGFib3V0IGNvbXBvbmVudFxuZnVuY3Rpb24gQ29tcG9uZW50SW5mbyhzY29wZSwgZWwsIGF0dHIpIHtcblx0YXR0ci5wYXJzZSgpLnZhbGlkYXRlKCk7XG5cblx0dGhpcy5zY29wZSA9IHNjb3BlO1xuXHR0aGlzLm5hbWUgPSBhdHRyLmNvbXBOYW1lO1xuXHR0aGlzLmVsID0gZWw7XG5cdHRoaXMuQ29tcG9uZW50Q2xhc3MgPSBnZXRDb21wb25lbnRDbGFzcyhhdHRyKTtcblx0dGhpcy5leHRyYUZhY2V0c0NsYXNzZXMgPSBnZXRDb21wb25lbnRFeHRyYUZhY2V0cyh0aGlzLkNvbXBvbmVudENsYXNzLCBhdHRyKTtcblxuXHRpZiAoaGFzQ29udGFpbmVyRmFjZXQodGhpcy5Db21wb25lbnRDbGFzcywgYXR0cikpXG5cdFx0dGhpcy5jb250YWluZXIgPSB7fTtcblxuXHRmdW5jdGlvbiBnZXRDb21wb25lbnRDbGFzcyhhdHRyKSB7XG5cdFx0dmFyIENvbXBvbmVudENsYXNzID0gY29tcG9uZW50c1JlZ2lzdHJ5LmdldChhdHRyLmNvbXBDbGFzcyk7XG5cdFx0aWYgKCEgQ29tcG9uZW50Q2xhc3MpXG5cdFx0XHR0aHJvdyBuZXcgQmluZGVyRXJyb3IoJ2NsYXNzICcgKyBhdHRyLmNvbXBDbGFzcyArICcgaXMgbm90IHJlZ2lzdGVyZWQnKTtcblx0XHRyZXR1cm4gQ29tcG9uZW50Q2xhc3M7XG5cdH1cblxuXHRmdW5jdGlvbiBnZXRDb21wb25lbnRFeHRyYUZhY2V0cyhDb21wb25lbnRDbGFzcywgYXR0cikge1xuXHRcdHZhciBmYWNldHMgPSBhdHRyLmNvbXBGYWNldHNcblx0XHRcdCwgZXh0cmFGYWNldHNDbGFzc2VzID0ge307XG5cblx0XHRpZiAoQXJyYXkuaXNBcnJheShmYWNldHMpKVxuXHRcdFx0ZmFjZXRzLmZvckVhY2goZnVuY3Rpb24oZmN0TmFtZSkge1xuXHRcdFx0XHRpZiAoQ29tcG9uZW50Q2xhc3MuaGFzRmFjZXQoZmN0TmFtZSkpXG5cdFx0XHRcdFx0dGhyb3cgbmV3IEJpbmRlckVycm9yKCdjbGFzcyAnICsgQ29tcG9uZW50Q2xhc3MubmFtZVxuXHRcdFx0XHRcdFx0XHRcdFx0XHQgICsgJyBhbHJlYWR5IGhhcyBmYWNldCAnICsgZmN0TmFtZSk7XG5cdFx0XHRcdGlmIChleHRyYUZhY2V0c0NsYXNzZXNbZmN0TmFtZV0pXG5cdFx0XHRcdFx0dGhyb3cgbmV3IEJpbmRlckVycm9yKCdjb21wb25lbnQgJyArIGF0dHIuY29tcE5hbWVcblx0XHRcdFx0XHRcdFx0XHRcdFx0ICArICcgYWxyZWFkeSBoYXMgZmFjZXQgJyArIGZjdE5hbWUpO1xuXHRcdFx0XHR2YXIgRmFjZXRDbGFzcyA9IGZhY2V0c1JlZ2lzdHJ5LmdldChmY3ROYW1lKTtcblx0XHRcdFx0ZXh0cmFGYWNldHNDbGFzc2VzW2ZjdE5hbWVdID0gRmFjZXRDbGFzcztcblx0XHRcdH0pO1xuXG5cdFx0cmV0dXJuIGV4dHJhRmFjZXRzQ2xhc3Nlcztcblx0fVxuXG5cdGZ1bmN0aW9uIGhhc0NvbnRhaW5lckZhY2V0KENvbXBvbmVudENsYXNzLCBhdHRyKSB7XG5cdFx0cmV0dXJuIChDb21wb25lbnRDbGFzcy5oYXNGYWNldCgnY29udGFpbmVyJylcblx0XHRcdHx8IChBcnJheS5pc0FycmF5KGF0dHIuY29tcEZhY2V0cykgJiYgYXR0ci5jb21wRmFjZXRzLmluZGV4T2YoJ0NvbnRhaW5lcicpID49IDApKTtcblx0fVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgY2xhc3NlcyA9IHtcblx0RmFjZXQ6IHJlcXVpcmUoJy4vZmFjZXRzL2ZfY2xhc3MnKSxcblx0Q29tcG9uZW50OiByZXF1aXJlKCcuL2NvbXBvbmVudHMvY19jbGFzcycpLFxuXHRDb21wb25lbnRGYWNldDogcmVxdWlyZSgnLi9jb21wb25lbnRzL2NfZmFjZXQnKSxcblx0Q2xhc3NSZWdpc3RyeTogcmVxdWlyZSgnLi9hYnN0cmFjdC9yZWdpc3RyeScpLFxuXHRmYWNldHNSZWdpc3RyeTogcmVxdWlyZSgnLi9jb21wb25lbnRzL2NfZmFjZXRzL2NmX3JlZ2lzdHJ5JyksXG5cdGNvbXBvbmVudHNSZWdpc3RyeTogcmVxdWlyZSgnLi9jb21wb25lbnRzL2NfcmVnaXN0cnknKVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzc2VzO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgRmFjZXRlZE9iamVjdCA9IHJlcXVpcmUoJy4uL2ZhY2V0cy9mX29iamVjdCcpXG5cdCwgZmFjZXRzUmVnaXN0cnkgPSByZXF1aXJlKCcuL2NfZmFjZXRzL2NmX3JlZ2lzdHJ5Jylcblx0LCBDb21wb25lbnRGYWNldCA9IHJlcXVpcmUoJy4vY19mYWNldCcpXG5cdCwgTWVzc2VuZ2VyID0gcmVxdWlyZSgnLi4vbWVzc2VuZ2VyJylcblx0LCBfID0gcmVxdWlyZSgnbW9sLXByb3RvJylcblx0LCBjaGVjayA9IHJlcXVpcmUoJy4uL3V0aWwvY2hlY2snKVxuXHQsIE1hdGNoID0gY2hlY2suTWF0Y2g7XG5cbnZhciBDb21wb25lbnQgPSBfLmNyZWF0ZVN1YmNsYXNzKEZhY2V0ZWRPYmplY3QsICdDb21wb25lbnQnLCB0cnVlKTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb25lbnQ7XG5cblxuQ29tcG9uZW50LmNyZWF0ZUNvbXBvbmVudENsYXNzID0gY3JlYXRlQ29tcG9uZW50Q2xhc3M7XG5kZWxldGUgQ29tcG9uZW50LmNyZWF0ZUZhY2V0ZWRDbGFzcztcblxuXG5Db21wb25lbnQuY3JlYXRlID0gY3JlYXRlQ29tcG9uZW50O1xuXG5cbl8uZXh0ZW5kUHJvdG8oQ29tcG9uZW50LCB7XG5cdGluaXQ6IGluaXRDb21wb25lbnQsXG5cdGFkZEZhY2V0OiBhZGRGYWNldCxcblx0YWxsRmFjZXRzOiBlbnZva2VNZXRob2RPbkFsbEZhY2V0cyxcblx0cmVtb3ZlOiByZW1vdmVDb21wb25lbnRGcm9tU2NvcGVcbn0pO1xuXG5cbi8vXG4vLyBjbGFzcyBtZXRob2RzXG4vL1xuZnVuY3Rpb24gY3JlYXRlQ29tcG9uZW50KGluZm8pIHtcblx0dmFyIENvbXBvbmVudENsYXNzID0gaW5mby5Db21wb25lbnRDbGFzcztcblx0dmFyIGFDb21wb25lbnQgPSBuZXcgQ29tcG9uZW50Q2xhc3MoaW5mby5zY29wZSwgaW5mby5lbCwgaW5mby5uYW1lKTtcblxuXHRpZiAoaW5mby5leHRyYUZhY2V0c0NsYXNzZXMpXG5cdFx0Xy5lYWNoS2V5KGluZm8uZXh0cmFGYWNldHNDbGFzc2VzLCBmdW5jdGlvbihGYWNldENsYXNzKSB7XG5cdFx0XHRhQ29tcG9uZW50LmFkZEZhY2V0KEZhY2V0Q2xhc3MpO1xuXHRcdH0pO1xuXG5cdHJldHVybiBhQ29tcG9uZW50O1xufVxuXG5cbmZ1bmN0aW9uIGNyZWF0ZUNvbXBvbmVudENsYXNzKG5hbWUsIGZhY2V0c0NvbmZpZykge1xuXHR2YXIgZmFjZXRzQ2xhc3NlcyA9IHt9O1xuXG5cdGlmIChBcnJheS5pc0FycmF5KGZhY2V0c0NvbmZpZykpIHtcblx0XHR2YXIgY29uZmlnTWFwID0ge307XG5cdFx0ZmFjZXRzQ29uZmlnLmZvckVhY2goZnVuY3Rpb24oZmN0KSB7XG5cdFx0XHR2YXIgZmN0TmFtZSA9IF8uZmlyc3RMb3dlckNhc2UoZmN0KTtcblx0XHRcdGNvbmZpZ01hcFtmY3ROYW1lXSA9IHt9O1xuXHRcdH0pO1xuXHRcdGZhY2V0c0NvbmZpZyA9IGNvbmZpZ01hcDtcblx0fVxuXG5cdF8uZWFjaEtleShmYWNldHNDb25maWcsIGZ1bmN0aW9uKGZjdENvbmZpZywgZmN0KSB7XG5cdFx0dmFyIGZjdE5hbWUgPSBfLmZpcnN0TG93ZXJDYXNlKGZjdCk7XG5cdFx0dmFyIGZjdENsYXNzTmFtZSA9IF8uZmlyc3RVcHBlckNhc2UoZmN0KTtcblx0XHRmYWNldHNDbGFzc2VzW2ZjdE5hbWVdID0gZmFjZXRzUmVnaXN0cnkuZ2V0KGZjdENsYXNzTmFtZSk7XG5cdH0pO1xuXG5cdHZhciBDb21wb25lbnRDbGFzcyA9IEZhY2V0ZWRPYmplY3QuY3JlYXRlRmFjZXRlZENsYXNzLmNhbGwodGhpcywgbmFtZSwgZmFjZXRzQ2xhc3NlcywgZmFjZXRzQ29uZmlnKTtcblx0XG5cdHJldHVybiBDb21wb25lbnRDbGFzcztcbn07XG5cblxuLy9cbi8vIGluc3RhbmNlIG1ldGhvZHNcbi8vXG5mdW5jdGlvbiBpbml0Q29tcG9uZW50KHNjb3BlLCBlbGVtZW50LCBuYW1lKSB7XG5cdHRoaXMuZWwgPSBlbGVtZW50O1xuXHR0aGlzLm5hbWUgPSBuYW1lO1xuXHR0aGlzLnNjb3BlID0gc2NvcGU7XG5cblx0dmFyIG1lc3NlbmdlciA9IG5ldyBNZXNzZW5nZXIodGhpcywgTWVzc2VuZ2VyLmRlZmF1bHRNZXRob2RzLCB1bmRlZmluZWQgLyogbm8gbWVzc2FnZVNvdXJjZSAqLyk7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnRpZXModGhpcywge1xuXHRcdF9tZXNzZW5nZXI6IHsgdmFsdWU6IG1lc3NlbmdlciB9LFxuXHR9KTtcdFxuXG5cdC8vIHN0YXJ0IGFsbCBmYWNldHNcblx0dGhpcy5hbGxGYWNldHMoJ2NoZWNrJyk7XG5cdHRoaXMuYWxsRmFjZXRzKCdzdGFydCcpO1xufVxuXG5cbmZ1bmN0aW9uIGFkZEZhY2V0KGZhY2V0TmFtZU9yQ2xhc3MsIGZhY2V0T3B0cywgZmFjZXROYW1lKSB7XG5cdGNoZWNrKGZhY2V0TmFtZU9yQ2xhc3MsIE1hdGNoLk9uZU9mKFN0cmluZywgTWF0Y2guU3ViY2xhc3MoQ29tcG9uZW50RmFjZXQpKSk7XG5cdGNoZWNrKGZhY2V0T3B0cywgTWF0Y2guT3B0aW9uYWwoT2JqZWN0KSk7XG5cdGNoZWNrKGZhY2V0TmFtZSwgTWF0Y2guT3B0aW9uYWwoU3RyaW5nKSk7XG5cblx0aWYgKHR5cGVvZiBmYWNldE5hbWVPckNsYXNzID09ICdzdHJpbmcnKSB7XG5cdFx0dmFyIGZhY2V0Q2xhc3NOYW1lID0gXy5maXJzdFVwcGVyQ2FzZShmYWNldE5hbWVPckNsYXNzKTtcblx0XHR2YXIgRmFjZXRDbGFzcyA9IGZhY2V0c1JlZ2lzdHJ5LmdldChmYWNldENsYXNzTmFtZSk7XG5cdH0gZWxzZSBcblx0XHRGYWNldENsYXNzID0gZmFjZXROYW1lT3JDbGFzcztcblxuXHRmYWNldE5hbWUgPSBmYWNldE5hbWUgfHwgXy5maXJzdExvd2VyQ2FzZShGYWNldENsYXNzLm5hbWUpO1xuXG5cdHZhciBuZXdGYWNldCA9IEZhY2V0ZWRPYmplY3QucHJvdG90eXBlLmFkZEZhY2V0LmNhbGwodGhpcywgRmFjZXRDbGFzcywgZmFjZXRPcHRzLCBmYWNldE5hbWUpO1xuXG5cdC8vIHN0YXJ0IGZhY2V0XG5cdG5ld0ZhY2V0LmNoZWNrICYmIG5ld0ZhY2V0LmNoZWNrKCk7XG5cdG5ld0ZhY2V0LnN0YXJ0ICYmIG5ld0ZhY2V0LnN0YXJ0KCk7XG59XG5cblxuZnVuY3Rpb24gZW52b2tlTWV0aG9kT25BbGxGYWNldHMobWV0aG9kIC8qICwgLi4uICovKSB7XG5cdHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcblxuXHRfLmVhY2hLZXkodGhpcy5mYWNldHMsIGZ1bmN0aW9uKGZhY2V0LCBmY3ROYW1lKSB7XG5cdFx0aWYgKGZhY2V0ICYmIHR5cGVvZiBmYWNldFttZXRob2RdID09ICdmdW5jdGlvbicpXG5cdFx0XHRmYWNldFttZXRob2RdLmFwcGx5KGZhY2V0LCBhcmdzKTtcblx0fSk7XG59XG5cblxuZnVuY3Rpb24gcmVtb3ZlQ29tcG9uZW50RnJvbVNjb3BlKCkge1xuXHRpZiAodGhpcy5zY29wZSlcblx0XHRkZWxldGUgdGhpcy5zY29wZVt0aGlzLm5hbWVdO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgRmFjZXQgPSByZXF1aXJlKCcuLi9mYWNldHMvZl9jbGFzcycpXG5cdCwgTWVzc2VuZ2VyID0gcmVxdWlyZSgnLi4vbWVzc2VuZ2VyJylcblx0LCBGYWNldEVycm9yID0gcmVxdWlyZSgnLi4vdXRpbC9lcnJvcicpLkZhY2V0XG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpO1xuXG52YXIgQ29tcG9uZW50RmFjZXQgPSBfLmNyZWF0ZVN1YmNsYXNzKEZhY2V0LCAnQ29tcG9uZW50RmFjZXQnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb25lbnRGYWNldDtcblxuXG5fLmV4dGVuZFByb3RvKENvbXBvbmVudEZhY2V0LCB7XG5cdGluaXQ6IGluaXRDb21wb25lbnRGYWNldCxcblx0c3RhcnQ6IHN0YXJ0Q29tcG9uZW50RmFjZXQsXG5cdGNoZWNrOiBjaGVja0RlcGVuZGVuY2llcyxcblx0X3NldE1lc3NhZ2VTb3VyY2U6IF9zZXRNZXNzYWdlU291cmNlLFxuXHRfY3JlYXRlTWVzc2FnZVNvdXJjZTogX2NyZWF0ZU1lc3NhZ2VTb3VyY2Vcbn0pO1xuXG5cbmZ1bmN0aW9uIGluaXRDb21wb25lbnRGYWNldCgpIHtcblx0dmFyIG1lc3NlbmdlciA9IG5ldyBNZXNzZW5nZXIodGhpcywgTWVzc2VuZ2VyLmRlZmF1bHRNZXRob2RzLCB1bmRlZmluZWQgLyogbm8gbWVzc2FnZVNvdXJjZSAqLyk7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnRpZXModGhpcywge1xuXHRcdF9tZXNzZW5nZXI6IHsgdmFsdWU6IG1lc3NlbmdlciB9LFxuXHR9KTtcbn1cblxuXG5mdW5jdGlvbiBzdGFydENvbXBvbmVudEZhY2V0KCkge1xuXHRpZiAodGhpcy5jb25maWcubWVzc2FnZXMpXG5cdFx0dGhpcy5vbk1lc3NhZ2VzKHRoaXMuY29uZmlnLm1lc3NhZ2VzKTtcbn1cblxuXG5mdW5jdGlvbiBjaGVja0RlcGVuZGVuY2llcygpIHtcblx0aWYgKHRoaXMucmVxdWlyZSkge1xuXHRcdHRoaXMucmVxdWlyZS5mb3JFYWNoKGZ1bmN0aW9uKHJlcUZhY2V0KSB7XG5cdFx0XHR2YXIgZmFjZXROYW1lID0gXy5maXJzdExvd2VyQ2FzZShyZXFGYWNldCk7XG5cdFx0XHRpZiAoISAodGhpcy5vd25lcltmYWNldE5hbWVdIGluc3RhbmNlb2YgQ29tcG9uZW50RmFjZXQpKVxuXHRcdFx0XHR0aHJvdyBuZXcgRmFjZXRFcnJvcignZmFjZXQgJyArIHRoaXMuY29uc3RydWN0b3IubmFtZSArICcgcmVxdWlyZXMgZmFjZXQgJyArIHJlcUZhY2V0KTtcblx0XHR9LCB0aGlzKTtcblx0fVxufVxuXG5cbmZ1bmN0aW9uIF9zZXRNZXNzYWdlU291cmNlKG1lc3NhZ2VTb3VyY2UpIHtcblx0dGhpcy5fbWVzc2VuZ2VyLl9zZXRNZXNzYWdlU291cmNlKG1lc3NhZ2VTb3VyY2UpO1xufVxuXG5cbmZ1bmN0aW9uIF9jcmVhdGVNZXNzYWdlU291cmNlKE1lc3NhZ2VTb3VyY2VDbGFzcykge1xuXHR2YXIgbWVzc2FnZVNvdXJjZSA9IG5ldyBNZXNzYWdlU291cmNlQ2xhc3ModGhpcywgdW5kZWZpbmVkLCB0aGlzLm93bmVyKTtcblx0dGhpcy5fc2V0TWVzc2FnZVNvdXJjZShtZXNzYWdlU291cmNlKVxuXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnX21lc3NhZ2VTb3VyY2UnLCB7IHZhbHVlOiBtZXNzYWdlU291cmNlIH0pO1xufSIsIid1c2Ugc3RyaWN0JztcblxudmFyIENvbXBvbmVudEZhY2V0ID0gcmVxdWlyZSgnLi4vY19mYWNldCcpXG5cdCwgYmluZGVyID0gcmVxdWlyZSgnLi4vLi4vYmluZGVyJylcblx0LCBfID0gcmVxdWlyZSgnbW9sLXByb3RvJylcblx0LCBmYWNldHNSZWdpc3RyeSA9IHJlcXVpcmUoJy4vY2ZfcmVnaXN0cnknKTtcblxuLy8gY29udGFpbmVyIGZhY2V0XG52YXIgQ29udGFpbmVyID0gXy5jcmVhdGVTdWJjbGFzcyhDb21wb25lbnRGYWNldCwgJ0NvbnRhaW5lcicpO1xuXG5fLmV4dGVuZFByb3RvKENvbnRhaW5lciwge1xuXHRpbml0OiBpbml0Q29udGFpbmVyLFxuXHRfYmluZDogX2JpbmRDb21wb25lbnRzLFxuXHQvLyBhZGQ6IGFkZENoaWxkQ29tcG9uZW50c1xufSk7XG5cbmZhY2V0c1JlZ2lzdHJ5LmFkZChDb250YWluZXIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbnRhaW5lcjtcblxuXG5mdW5jdGlvbiBpbml0Q29udGFpbmVyKCkge1xuXHRDb21wb25lbnRGYWNldC5wcm90b3R5cGUuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXHR0aGlzLnNjb3BlID0ge307XG59XG5cblxuZnVuY3Rpb24gX2JpbmRDb21wb25lbnRzKCkge1xuXHQvLyBUT0RPXG5cdC8vIHRoaXMgZnVuY3Rpb24gc2hvdWxkIHJlLWJpbmQgcmF0aGVyIHRoYW4gYmluZCBhbGwgaW50ZXJuYWwgZWxlbWVudHNcblx0dGhpcy5zY29wZSA9IGJpbmRlcih0aGlzLm93bmVyLmVsKTtcbn1cblxuXG5mdW5jdGlvbiBhZGRDaGlsZENvbXBvbmVudHMoY2hpbGRDb21wb25lbnRzKSB7XG5cdC8vIFRPRE9cblx0Ly8gdGhpcyBmdW5jdGlvbiBzaG91bGQgaW50ZWxsaWdlbnRseSByZS1iaW5kIGV4aXN0aW5nIGNvbXBvbmVudHMgdG9cblx0Ly8gbmV3IGVsZW1lbnRzIChpZiB0aGV5IGNoYW5nZWQpIGFuZCByZS1iaW5kIHByZXZpb3VzbHkgYm91bmQgZXZlbnRzIHRvIHRoZSBzYW1lXG5cdC8vIGV2ZW50IGhhbmRsZXJzXG5cdC8vIG9yIG1heWJlIG5vdCwgaWYgdGhpcyBmdW5jdGlvbiBpcyBvbmx5IHVzZWQgYnkgYmluZGVyIHRvIGFkZCBuZXcgZWxlbWVudHMuLi5cblx0Xy5leHRlbmQodGhpcy5zY29wZSwgY2hpbGRDb21wb25lbnRzKTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIENvbXBvbmVudEZhY2V0ID0gcmVxdWlyZSgnLi4vY19mYWNldCcpXG5cdCwgZmFjZXRzUmVnaXN0cnkgPSByZXF1aXJlKCcuL2NmX3JlZ2lzdHJ5JylcblxuXHQsIE1lc3NlbmdlciA9IHJlcXVpcmUoJy4uLy4uL21lc3NlbmdlcicpXG5cdCwgQ29tcG9uZW50RGF0YVNvdXJjZSA9IHJlcXVpcmUoJy4uL2NfbWVzc2FnZV9zb3VyY2VzL2NvbXBvbmVudF9kYXRhX3NvdXJjZScpXG5cblx0LCBfID0gcmVxdWlyZSgnbW9sLXByb3RvJyk7XG5cblxuLy8gZGF0YSBtb2RlbCBjb25uZWN0aW9uIGZhY2V0XG52YXIgRGF0YSA9IF8uY3JlYXRlU3ViY2xhc3MoQ29tcG9uZW50RmFjZXQsICdEYXRhJyk7XG5cbl8uZXh0ZW5kUHJvdG8oRGF0YSwge1xuXHRpbml0OiBpbml0RGF0YUZhY2V0LFxuXG5cdC8vIF9yZWF0dGFjaDogX3JlYXR0YWNoRXZlbnRzT25FbGVtZW50Q2hhbmdlXG59KTtcblxuZmFjZXRzUmVnaXN0cnkuYWRkKERhdGEpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IERhdGE7XG5cblxuZnVuY3Rpb24gaW5pdERhdGFGYWNldCgpIHtcblx0Q29tcG9uZW50RmFjZXQucHJvdG90eXBlLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuXHR2YXIgcHJveHlDb21wRGF0YVNvdXJjZU1ldGhvZHMgPSB7XG5cdFx0dmFsdWU6ICd2YWx1ZScsXG5cdFx0dHJpZ2dlcjogJ3RyaWdnZXInXG5cdH07XG5cblx0Ly8gaW5zdGVhZCBvZiB0aGlzLm93bmVyIHNob3VsZCBwYXNzIG1vZGVsPyBXaGVyZSBpdCBpcyBzZXQ/XG5cdHZhciBjb21wRGF0YVNvdXJjZSA9IG5ldyBDb21wb25lbnREYXRhU291cmNlKHRoaXMsIHByb3h5Q29tcERhdGFTb3VyY2VNZXRob2RzLCB0aGlzLm93bmVyKTtcblx0dGhpcy5fc2V0TWVzc2FnZVNvdXJjZShjb21wRGF0YVNvdXJjZSk7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnRpZXModGhpcywge1xuXHRcdF9jb21wRGF0YVNvdXJjZTogeyB2YWx1ZTogY29tcERhdGFTb3VyY2UgfVxuXHR9KTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIENvbXBvbmVudEZhY2V0ID0gcmVxdWlyZSgnLi4vY19mYWNldCcpXG5cdCwgZmFjZXRzUmVnaXN0cnkgPSByZXF1aXJlKCcuL2NmX3JlZ2lzdHJ5JylcdFxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vLi4vdXRpbC9jaGVjaycpXG5cdCwgTWF0Y2ggPSBjaGVjay5NYXRjaFxuXHQsIGJpbmRlciA9IHJlcXVpcmUoJy4uLy4uL2JpbmRlcicpO1xuXG5cbi8vIGRhdGEgbW9kZWwgY29ubmVjdGlvbiBmYWNldFxudmFyIERvbSA9IF8uY3JlYXRlU3ViY2xhc3MoQ29tcG9uZW50RmFjZXQsICdEb20nKTtcblxuXy5leHRlbmRQcm90byhEb20sIHtcblx0aW5pdDogaW5pdERvbUZhY2V0LFxuXHRzdGFydDogc3RhcnREb21GYWNldCxcblxuXHRzaG93OiBzaG93RWxlbWVudCxcblx0aGlkZTogaGlkZUVsZW1lbnQsXG5cdHJlbW92ZTogcmVtb3ZlRWxlbWVudCxcblx0YXBwZW5kOiBhcHBlbmRJbnNpZGVFbGVtZW50LFxuXHRwcmVwZW5kOiBwcmVwZW5kSW5zaWRlRWxlbWVudCxcblxuXHQvLyBfcmVhdHRhY2g6IF9yZWF0dGFjaEV2ZW50c09uRWxlbWVudENoYW5nZVxufSk7XG5cbmZhY2V0c1JlZ2lzdHJ5LmFkZChEb20pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IERvbTtcblxuXG5mdW5jdGlvbiBpbml0RG9tRmFjZXQoKSB7XG5cdENvbXBvbmVudEZhY2V0LnByb3RvdHlwZS5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59XG5cbmZ1bmN0aW9uIHN0YXJ0RG9tRmFjZXQoKSB7XG5cdGlmICh0aGlzLmNvbmZpZy5jbHMpXG5cdFx0dGhpcy5vd25lci5lbC5jbGFzc0xpc3QuYWRkKHRoaXMuY29uZmlnLmNscyk7XG59XG5cbmZ1bmN0aW9uIHNob3dFbGVtZW50KCkge1xuXHR0aGlzLm93bmVyLmVsLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xufVxuXG5mdW5jdGlvbiBoaWRlRWxlbWVudCgpIHtcblx0dGhpcy5vd25lci5lbC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xufVxuXG5mdW5jdGlvbiByZW1vdmVFbGVtZW50KCkge1xuXHR2YXIgdGhpc0VsID0gdGhpcy5vd25lci5lbDtcblx0dGhpc0VsLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGhpc0VsKTtcbn1cblxuZnVuY3Rpb24gYXBwZW5kSW5zaWRlRWxlbWVudChlbCkge1xuXHR0aGlzLm93bmVyLmVsLmFwcGVuZENoaWxkKGVsKVxufVxuXG5mdW5jdGlvbiBwcmVwZW5kSW5zaWRlRWxlbWVudChlbCkge1xuXHR2YXIgdGhpc0VsID0gdGhpcy5vd25lci5lbFxuXHRcdCwgZmlyc3RDaGlsZCA9IHRoaXNFbC5maXJzdENoaWxkO1xuXHRpZiAoZmlyc3RDaGlsZClcblx0XHR0aGlzRWwuaW5zZXJ0QmVmb3JlKGVsLCBmaXJzdENoaWxkKTtcblx0ZWxzZVxuXHRcdHRoaXNFbC5hcHBlbmRDaGlsZChlbCk7XG59XG5cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIENvbXBvbmVudEZhY2V0ID0gcmVxdWlyZSgnLi4vY19mYWNldCcpXG5cdCwgZmFjZXRzUmVnaXN0cnkgPSByZXF1aXJlKCcuL2NmX3JlZ2lzdHJ5Jylcblx0LCBET01FdmVudHNTb3VyY2UgPSByZXF1aXJlKCcuLi9jX21lc3NhZ2Vfc291cmNlcy9kb21fZXZlbnRzX3NvdXJjZScpXG5cblx0LCBfID0gcmVxdWlyZSgnbW9sLXByb3RvJyk7XG5cblxuLy8gZ2VuZXJpYyBkcmFnIGhhbmRsZXIsIHNob3VsZCBiZSBvdmVycmlkZGVuXG52YXIgRHJhZyA9IF8uY3JlYXRlU3ViY2xhc3MoQ29tcG9uZW50RmFjZXQsICdEcmFnJyk7XG5cbl8uZXh0ZW5kUHJvdG8oRHJhZywge1xuXHRpbml0OiBpbml0RHJhZ0ZhY2V0LFxuXHRzdGFydDogc3RhcnREcmFnRmFjZXQsXG5cblx0c2V0SGFuZGxlOiBzZXREcmFnSGFuZGxlXG5cdC8vIF9yZWF0dGFjaDogX3JlYXR0YWNoRXZlbnRzT25FbGVtZW50Q2hhbmdlXG59KTtcblxuZmFjZXRzUmVnaXN0cnkuYWRkKERyYWcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IERyYWc7XG5cblxuZnVuY3Rpb24gaW5pdERyYWdGYWNldCgpIHtcblx0Q29tcG9uZW50RmFjZXQucHJvdG90eXBlLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcdFxuXHR0aGlzLl9jcmVhdGVNZXNzYWdlU291cmNlKERPTUV2ZW50c1NvdXJjZSk7XG59XG5cblxuZnVuY3Rpb24gc2V0RHJhZ0hhbmRsZShoYW5kbGVFbCkge1xuXHRpZiAoISB0aGlzLm93bmVyLmVsLmNvbnRhaW5zKGhhbmRsZUVsKSlcblx0XHRyZXR1cm4gbG9nZ2VyLndhcm4oJ2RyYWcgaGFuZGxlIHNob3VsZCBiZSBpbnNpZGUgZWxlbWVudCB0byBiZSBkcmFnZ2VkJylcblx0dGhpcy5fZHJhZ0hhbmRsZSA9IGhhbmRsZUVsO1xufVxuXG5cbmZ1bmN0aW9uIHN0YXJ0RHJhZ0ZhY2V0KCkge1xuXHRDb21wb25lbnRGYWNldC5wcm90b3R5cGUuc3RhcnQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblx0dGhpcy5vd25lci5lbC5zZXRBdHRyaWJ1dGUoJ2RyYWdnYWJsZScsIHRydWUpO1xuXG5cdHRoaXMub24oJ21vdXNlZG93bicsIG9uTW91c2VEb3duKTtcblx0dGhpcy5vbignbW91c2VlbnRlciBtb3VzZWxlYXZlIG1vdXNlbW92ZScsIG9uTW91c2VNb3ZlbWVudCk7XG5cdHRoaXMub24oJ2RyYWdzdGFydCBkcmFnJywgb25EcmFnZ2luZyk7XG5cblx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdGZ1bmN0aW9uIG9uTW91c2VEb3duKGV2ZW50VHlwZSwgZXZlbnQpIHtcblx0XHRzZWxmLl90YXJnZXQgPSBldmVudC50YXJnZXQ7XG5cdFx0aWYgKHRhcmdldEluRHJhZ0hhbmRsZShldmVudCkpXG5cdFx0XHR3aW5kb3cuZ2V0U2VsZWN0aW9uKCkuZW1wdHkoKTtcblx0fVxuXG5cdGZ1bmN0aW9uIG9uTW91c2VNb3ZlbWVudChldmVudFR5cGUsIGV2ZW50KSB7XG5cdFx0dmFyIHNob3VsZEJlRHJhZ2dhYmxlID0gdGFyZ2V0SW5EcmFnSGFuZGxlKGV2ZW50KTtcblx0XHRzZWxmLm93bmVyLmVsLnNldEF0dHJpYnV0ZSgnZHJhZ2dhYmxlJywgc2hvdWxkQmVEcmFnZ2FibGUpO1xuXHR9XG5cblx0ZnVuY3Rpb24gb25EcmFnZ2luZyhldmVudFR5cGUsIGV2ZW50KSB7XG5cdFx0aWYgKHRhcmdldEluRHJhZ0hhbmRsZShldmVudCkpIHtcblx0XHRcdHZhciBkdCA9IGV2ZW50LmRhdGFUcmFuc2Zlcjtcblx0XHRcdGR0LnNldERhdGEoJ3RleHQvaHRtbCcsIHNlbGYub3duZXIuZWwub3V0ZXJIVE1MKTtcblx0XHRcdGR0LnNldERhdGEoJ3gtYXBwbGljYXRpb24vbWlsby1jb21wb25lbnQnLCBzZWxmLm93bmVyKTtcblx0XHR9IGVsc2Vcblx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdH1cblxuXHRmdW5jdGlvbiBjYWxsQ29uZmlndXJlZEhhbmRsZXIoZXZlbnRUeXBlLCBldmVudCkge1xuXHRcdHZhciBoYW5kbGVyUHJvcGVydHkgPSAnX29uJyArIGV2ZW50VHlwZVxuXHRcdFx0LCBoYW5kbGVyID0gc2VsZltoYW5kbGVyUHJvcGVydHldO1xuXHRcdGlmIChoYW5kbGVyKVxuXHRcdFx0aGFuZGxlci5jYWxsKHNlbGYub3duZXIsIGV2ZW50VHlwZSwgZXZlbnQpO1xuXHR9XG5cblx0ZnVuY3Rpb24gdGFyZ2V0SW5EcmFnSGFuZGxlKGV2ZW50KSB7XG5cdFx0cmV0dXJuICEgc2VsZi5fZHJhZ0hhbmRsZSB8fCBzZWxmLl9kcmFnSGFuZGxlLmNvbnRhaW5zKHNlbGYuX3RhcmdldCk7XG5cdH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIENvbXBvbmVudEZhY2V0ID0gcmVxdWlyZSgnLi4vY19mYWNldCcpXG5cdCwgZmFjZXRzUmVnaXN0cnkgPSByZXF1aXJlKCcuL2NmX3JlZ2lzdHJ5JylcblxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKTtcblxuXG4vLyBnZW5lcmljIGRyYWcgaGFuZGxlciwgc2hvdWxkIGJlIG92ZXJyaWRkZW5cbnZhciBEcm9wID0gXy5jcmVhdGVTdWJjbGFzcyhDb21wb25lbnRGYWNldCwgJ0Ryb3AnKTtcblxuXy5leHRlbmRQcm90byhEcm9wLCB7XG5cdGluaXQ6IGluaXREcm9wRmFjZXQsXG5cdHN0YXJ0OiBzdGFydERyb3BGYWNldCxcblx0cmVxdWlyZTogWydFdmVudHMnXSAvLyBUT0RPIGltcGxlbWVudCBmYWNldCBkZXBlbmRlbmNpZXNcblxuXHQvLyBfcmVhdHRhY2g6IF9yZWF0dGFjaEV2ZW50c09uRWxlbWVudENoYW5nZVxufSk7XG5cbmZhY2V0c1JlZ2lzdHJ5LmFkZChEcm9wKTtcblxubW9kdWxlLmV4cG9ydHMgPSBEcm9wO1xuXG5cbmZ1bmN0aW9uIGluaXREcm9wRmFjZXQoKSB7XG5cdENvbXBvbmVudEZhY2V0LnByb3RvdHlwZS5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cblx0dGhpcy5fb25kcmFnZW50ZXIgPSB0aGlzLmNvbmZpZy5vbmRyYWdlbnRlcjtcblx0dGhpcy5fb25kcmFnb3ZlciA9IHRoaXMuY29uZmlnLm9uZHJhZ292ZXI7XG5cdHRoaXMuX29uZHJhZ2xlYXZlID0gdGhpcy5jb25maWcub25kcmFnbGVhdmU7XG5cdHRoaXMuX29uZHJvcCA9IHRoaXMuY29uZmlnLm9uZHJvcDtcbn1cblxuXG5mdW5jdGlvbiBzdGFydERyb3BGYWNldCgpIHtcblx0dmFyIGV2ZW50c0ZhY2V0ID0gdGhpcy5vd25lci5ldmVudHM7XG5cdGV2ZW50c0ZhY2V0Lm9uKCdkcmFnZW50ZXIgZHJhZ292ZXInLCBvbkRyYWdnaW5nKTtcblx0ZXZlbnRzRmFjZXQub24oJ2RyYWdlbnRlciBkcmFnb3ZlciBkcmFnbGVhdmUgZHJvcCcsIGNhbGxDb25maWd1cmVkSGFuZGxlcik7XG5cblx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdGZ1bmN0aW9uIGNhbGxDb25maWd1cmVkSGFuZGxlcihldmVudFR5cGUsIGV2ZW50KSB7XG5cdFx0dmFyIGhhbmRsZXJQcm9wZXJ0eSA9ICdfb24nICsgZXZlbnRUeXBlXG5cdFx0XHQsIGhhbmRsZXIgPSBzZWxmW2hhbmRsZXJQcm9wZXJ0eV07XG5cdFx0aWYgKGhhbmRsZXIpXG5cdFx0XHRoYW5kbGVyLmNhbGwoc2VsZi5vd25lciwgZXZlbnRUeXBlLCBldmVudCk7XG5cdH1cblxuXG5cdGZ1bmN0aW9uIG9uRHJhZ2dpbmcoZXZlbnRUeXBlLCBldmVudCkge1xuXHRcdHZhciBkYXRhVHlwZXMgPSBldmVudC5kYXRhVHJhbnNmZXIudHlwZXNcblx0XHRpZiAoZGF0YVR5cGVzLmluZGV4T2YoJ3RleHQvaHRtbCcpID49IDBcblx0XHRcdFx0fHwgZGF0YVR5cGVzLmluZGV4T2YoJ3gtYXBwbGljYXRpb24vbWlsby1jb21wb25lbnQnKSA+PSAwKSB7XG5cdFx0XHRldmVudC5kYXRhVHJhbnNmZXIuZHJvcEVmZmVjdCA9ICdtb3ZlJztcblx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0fVxuXHR9XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ29tcG9uZW50RmFjZXQgPSByZXF1aXJlKCcuLi9jX2ZhY2V0Jylcblx0LCBmYWNldHNSZWdpc3RyeSA9IHJlcXVpcmUoJy4vY2ZfcmVnaXN0cnknKVxuXG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpO1xuXG5cbi8vIGdlbmVyaWMgZHJhZyBoYW5kbGVyLCBzaG91bGQgYmUgb3ZlcnJpZGRlblxudmFyIEVkaXRhYmxlID0gXy5jcmVhdGVTdWJjbGFzcyhDb21wb25lbnRGYWNldCwgJ0VkaXRhYmxlJyk7XG5cbl8uZXh0ZW5kUHJvdG8oRWRpdGFibGUsIHtcblx0aW5pdDogaW5pdEVkaXRhYmxlRmFjZXQsXG5cdHN0YXJ0OiBzdGFydEVkaXRhYmxlRmFjZXQsXG5cdG1ha2VFZGl0YWJsZTogbWFrZUVkaXRhYmxlLFxuXHRyZXF1aXJlOiBbJ0V2ZW50cyddIC8vIFRPRE8gaW1wbGVtZW50IGZhY2V0IGRlcGVuZGVuY2llc1xuXG5cdC8vIF9yZWF0dGFjaDogX3JlYXR0YWNoRXZlbnRzT25FbGVtZW50Q2hhbmdlXG59KTtcblxuZmFjZXRzUmVnaXN0cnkuYWRkKEVkaXRhYmxlKTtcblxubW9kdWxlLmV4cG9ydHMgPSBFZGl0YWJsZTtcblxuXG5mdW5jdGlvbiBpbml0RWRpdGFibGVGYWNldCgpIHtcblx0Q29tcG9uZW50RmFjZXQucHJvdG90eXBlLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuXHR0aGlzLl9lZGl0YWJsZSA9IHR5cGVvZiB0aGlzLmNvbmZpZy5lZGl0YWJsZSAhPSAndW5kZWZpbmVkJ1xuXHRcdFx0XHRcdFx0PyB0aGlzLmNvbmZpZy5lZGl0YWJsZVxuXHRcdFx0XHRcdFx0OiB0cnVlO1xuXG5cdHRoaXMuX2VkaXRhYmxlT25DbGljayA9IHRoaXMuY29uZmlnLmVkaXRhYmxlT25DbGljaztcblxuXHR0aGlzLl9vbmVkaXRhYmxlID0gdGhpcy5jb25maWcub25lZGl0YWJsZTtcblx0dGhpcy5fb25lbnRlcmtleSA9IHRoaXMuY29uZmlnLm9uZW50ZXJrZXk7XG5cdHRoaXMuX29ua2V5cHJlc3MgPSB0aGlzLmNvbmZpZy5vbmtleXByZXNzO1xuXHR0aGlzLl9vbmtleWRvd24gPSB0aGlzLmNvbmZpZy5vbmtleWRvd247XG59XG5cblxuZnVuY3Rpb24gbWFrZUVkaXRhYmxlKGVkaXRhYmxlKSB7XG5cdHRoaXMub3duZXIuZWwuc2V0QXR0cmlidXRlKCdjb250ZW50ZWRpdGFibGUnLCBlZGl0YWJsZSk7XG5cdGlmIChlZGl0YWJsZSAmJiB0aGlzLl9vbmVkaXRhYmxlKVxuXHRcdHRoaXMuX29uZWRpdGFibGUuY2FsbCh0aGlzLm93bmVyLCAnZWRpdGFibGUnKVxufVxuXG5cbmZ1bmN0aW9uIHN0YXJ0RWRpdGFibGVGYWNldCgpIHtcblx0aWYgKHRoaXMuX2VkaXRhYmxlKVxuXHRcdHRoaXMubWFrZUVkaXRhYmxlKHRydWUpO1xuXHRcblx0dmFyIGV2ZW50c0ZhY2V0ID0gdGhpcy5vd25lci5ldmVudHM7XG5cdGV2ZW50c0ZhY2V0Lm9uTWVzc2FnZXMoe1xuXHRcdCdtb3VzZWRvd24nOiBvbk1vdXNlRG93bixcblx0XHQnYmx1cic6IG9uQmx1cixcblx0XHQna2V5cHJlc3MnOiBvbktleVByZXNzLFxuXHRcdCdrZXlkb3duJzogY2FsbENvbmZpZ3VyZWRIYW5kbGVyXG5cdH0pO1xuXG5cdHZhciBzZWxmID0gdGhpcztcblxuXHRmdW5jdGlvbiBjYWxsQ29uZmlndXJlZEhhbmRsZXIoZXZlbnRUeXBlLCBldmVudCkge1xuXHRcdHZhciBoYW5kbGVyUHJvcGVydHkgPSAnX29uJyArIGV2ZW50VHlwZVxuXHRcdFx0LCBoYW5kbGVyID0gc2VsZltoYW5kbGVyUHJvcGVydHldO1xuXHRcdGlmIChoYW5kbGVyKVxuXHRcdFx0aGFuZGxlci5jYWxsKHNlbGYub3duZXIsIGV2ZW50VHlwZSwgZXZlbnQpO1xuXHR9XG5cblx0ZnVuY3Rpb24gb25Nb3VzZURvd24oZXZlbnRUeXBlLCBldmVudCkge1xuXHRcdGlmIChzZWxmLl9lZGl0YWJsZU9uQ2xpY2spXG5cdFx0XHRzZWxmLm1ha2VFZGl0YWJsZSh0cnVlKTtcblx0fVxuXG5cdGZ1bmN0aW9uIG9uQmx1cihldmVudFR5cGUsIGV2ZW50KSB7XG5cdFx0aWYgKHNlbGYuX2VkaXRhYmxlT25DbGljaylcblx0XHRcdHNlbGYubWFrZUVkaXRhYmxlKGZhbHNlKTtcblx0fVxuXG5cdGZ1bmN0aW9uIG9uS2V5UHJlc3MoZXZlbnRUeXBlLCBldmVudCkge1xuXHRcdGlmIChldmVudC5rZXlDb2RlID09IDEzICYmIHNlbGYuX29uZW50ZXJrZXkpXG5cdFx0XHRzZWxmLl9vbmVudGVya2V5LmNhbGwoc2VsZi5vd25lciwgJ29uZW50ZXJrZXknLCBldmVudCk7XG5cblx0XHRjYWxsQ29uZmlndXJlZEhhbmRsZXIoZXZlbnRUeXBlLCBldmVudCk7XG5cdH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIENvbXBvbmVudEZhY2V0ID0gcmVxdWlyZSgnLi4vY19mYWNldCcpXG5cdCwgZmFjZXRzUmVnaXN0cnkgPSByZXF1aXJlKCcuL2NmX3JlZ2lzdHJ5JylcblxuXHQsIE1lc3NlbmdlciA9IHJlcXVpcmUoJy4uLy4uL21lc3NlbmdlcicpXG5cdCwgRE9NRXZlbnRzU291cmNlID0gcmVxdWlyZSgnLi4vY19tZXNzYWdlX3NvdXJjZXMvZG9tX2V2ZW50c19zb3VyY2UnKVxuXG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpO1xuXG5cbi8vIGV2ZW50cyBmYWNldFxudmFyIEV2ZW50cyA9IF8uY3JlYXRlU3ViY2xhc3MoQ29tcG9uZW50RmFjZXQsICdFdmVudHMnKTtcblxuXy5leHRlbmRQcm90byhFdmVudHMsIHtcblx0aW5pdDogaW5pdEV2ZW50c0ZhY2V0LFxuXG5cdC8vIF9yZWF0dGFjaDogX3JlYXR0YWNoRXZlbnRzT25FbGVtZW50Q2hhbmdlXG59KTtcblxuZmFjZXRzUmVnaXN0cnkuYWRkKEV2ZW50cyk7XG5cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRzO1xuXG5cbmZ1bmN0aW9uIGluaXRFdmVudHNGYWNldCgpIHtcblx0Q29tcG9uZW50RmFjZXQucHJvdG90eXBlLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuXHR2YXIgZG9tRXZlbnRzU291cmNlID0gbmV3IERPTUV2ZW50c1NvdXJjZSh0aGlzLCB7IHRyaWdnZXI6ICd0cmlnZ2VyJyB9LCB0aGlzLm93bmVyKTtcblxuXHR0aGlzLl9zZXRNZXNzYWdlU291cmNlKGRvbUV2ZW50c1NvdXJjZSlcblxuXHRPYmplY3QuZGVmaW5lUHJvcGVydGllcyh0aGlzLCB7XG5cdFx0X2RvbUV2ZW50c1NvdXJjZTogeyB2YWx1ZTogZG9tRXZlbnRzU291cmNlIH1cblx0fSk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBDb21wb25lbnRGYWNldCA9IHJlcXVpcmUoJy4uL2NfZmFjZXQnKVxuXHQsIGZhY2V0c1JlZ2lzdHJ5ID0gcmVxdWlyZSgnLi9jZl9yZWdpc3RyeScpXG5cblx0LCBNZXNzZW5nZXIgPSByZXF1aXJlKCcuLi8uLi9tZXNzZW5nZXInKVxuXHQsIGlGcmFtZU1lc3NhZ2VTb3VyY2UgPSByZXF1aXJlKCcuLi9jX21lc3NhZ2Vfc291cmNlcy9pZnJhbWVfbWVzc2FnZV9zb3VyY2UnKVxuXG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpO1xuXG5cbi8vIGRhdGEgbW9kZWwgY29ubmVjdGlvbiBmYWNldFxudmFyIEZyYW1lID0gXy5jcmVhdGVTdWJjbGFzcyhDb21wb25lbnRGYWNldCwgJ0ZyYW1lJyk7XG5cbl8uZXh0ZW5kUHJvdG8oRnJhbWUsIHtcblx0aW5pdDogaW5pdEZyYW1lRmFjZXRcblxuXHQvLyBfcmVhdHRhY2g6IF9yZWF0dGFjaEV2ZW50c09uRWxlbWVudENoYW5nZVxufSk7XG5cblxuZmFjZXRzUmVnaXN0cnkuYWRkKEZyYW1lKTtcblxubW9kdWxlLmV4cG9ydHMgPSBGcmFtZTtcblxuXG5mdW5jdGlvbiBpbml0RnJhbWVGYWNldCgpIHtcblx0Q29tcG9uZW50RmFjZXQucHJvdG90eXBlLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblx0XG5cdHZhciBpRnJhbWVNZXNzYWdlU291cmNlUHJveHkgPSB7XG5cdFx0cG9zdDogJ3Bvc3QnXG5cdH07XG5cdHZhciBtZXNzYWdlU291cmNlID0gbmV3IGlGcmFtZU1lc3NhZ2VTb3VyY2UodGhpcywgaUZyYW1lTWVzc2FnZVNvdXJjZVByb3h5KTtcblxuXHR0aGlzLl9zZXRNZXNzYWdlU291cmNlKG1lc3NhZ2VTb3VyY2UpO1xuXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRoaXMsIHtcblx0XHRfbWVzc2FnZVNvdXJjZTogeyB2YWx1ZTogbWVzc2FnZVNvdXJjZSB9XG5cdH0pO1xufSIsIid1c2Ugc3RyaWN0JztcblxudmFyIENvbXBvbmVudEZhY2V0ID0gcmVxdWlyZSgnLi4vY19mYWNldCcpXG5cdCwgZmFjZXRzUmVnaXN0cnkgPSByZXF1aXJlKCcuL2NmX3JlZ2lzdHJ5JylcdFxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vLi4vdXRpbC9jaGVjaycpXG5cdCwgTWF0Y2ggPSBjaGVjay5NYXRjaFxuXHQsIGJpbmRlciA9IHJlcXVpcmUoJy4uLy4uL2JpbmRlcicpO1xuXG5cbi8vIGRhdGEgbW9kZWwgY29ubmVjdGlvbiBmYWNldFxudmFyIFRlbXBsYXRlID0gXy5jcmVhdGVTdWJjbGFzcyhDb21wb25lbnRGYWNldCwgJ1RlbXBsYXRlJyk7XG5cbl8uZXh0ZW5kUHJvdG8oVGVtcGxhdGUsIHtcblx0aW5pdDogaW5pdFRlbXBsYXRlRmFjZXQsXG5cdHNldDogc2V0VGVtcGxhdGUsXG5cdHJlbmRlcjogcmVuZGVyVGVtcGxhdGUsXG5cdGJpbmRlcjogYmluZElubmVyQ29tcG9uZW50cyxcblx0cmVxdWlyZTogWydDb250YWluZXInXVxuXG5cdC8vIF9yZWF0dGFjaDogX3JlYXR0YWNoRXZlbnRzT25FbGVtZW50Q2hhbmdlXG59KTtcblxuZmFjZXRzUmVnaXN0cnkuYWRkKFRlbXBsYXRlKTtcblxubW9kdWxlLmV4cG9ydHMgPSBUZW1wbGF0ZTtcblxuXG5mdW5jdGlvbiBpbml0VGVtcGxhdGVGYWNldCgpIHtcblx0Q29tcG9uZW50RmFjZXQucHJvdG90eXBlLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuXHR0aGlzLl90ZW1wbGF0ZVN0ciA9IHRoaXMuY29uZmlnLnRlbXBsYXRlO1xufVxuXG5cbmZ1bmN0aW9uIHNldFRlbXBsYXRlKHRlbXBsYXRlU3RyLCBjb21waWxlKSB7XG5cdGNoZWNrKHRlbXBsYXRlU3RyLCBTdHJpbmcpO1xuXHRjaGVjayhjb21waWxlLCBNYXRjaC5PcHRpb25hbChGdW5jdGlvbikpO1xuXG5cdHRoaXMuX3RlbXBsYXRlU3RyID0gdGVtcGxhdGVTdHI7XG5cdGlmIChjb21waWxlKVxuXHRcdHRoaXMuX2NvbXBpbGUgPSBjb21waWxlXG5cblx0Y29tcGlsZSA9IGNvbXBpbGUgfHwgdGhpcy5fY29tcGlsZTsgLy8gfHwgbWlsby5jb25maWcudGVtcGxhdGUuY29tcGlsZTtcblxuXHRpZiAoY29tcGlsZSlcblx0XHR0aGlzLl90ZW1wbGF0ZSA9IGNvbXBpbGUodGVtcGxhdGVTdHIpO1xuXG5cdHJldHVybiB0aGlzO1xufVxuXG5cbmZ1bmN0aW9uIHJlbmRlclRlbXBsYXRlKGRhdGEpIHsgLy8gd2UgbmVlZCBkYXRhIG9ubHkgaWYgdXNlIHRlbXBsYXRpbmcgZW5naW5lXG5cdHRoaXMub3duZXIuZWwuaW5uZXJIVE1MID0gdGhpcy5fdGVtcGxhdGVcblx0XHRcdFx0XHRcdFx0XHQ/IHRoaXMuX3RlbXBsYXRlKGRhdGEpXG5cdFx0XHRcdFx0XHRcdFx0OiB0aGlzLl90ZW1wbGF0ZVN0cjtcblxuXHRyZXR1cm4gdGhpcztcbn1cblxuXG5mdW5jdGlvbiBiaW5kSW5uZXJDb21wb25lbnRzKCkge1xuXHR2YXIgdGhpc1Njb3BlID0gYmluZGVyKHRoaXMub3duZXIuZWwpO1xuXG5cdC8vIFRPRE8gc2hvdWxkIGJlIGNoYW5nZWQgdG8gcmVjb25jaWxsYXRpb24gb2YgZXhpc3RpbmcgY2hpbGRyZW4gd2l0aCBuZXdcblx0dGhpcy5vd25lci5jb250YWluZXIuc2NvcGUgPSB0aGlzU2NvcGVbdGhpcy5vd25lci5uYW1lXS5jb250YWluZXIuc2NvcGU7XG5cblx0cmV0dXJuIHRoaXNTY29wZTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIENsYXNzUmVnaXN0cnkgPSByZXF1aXJlKCcuLi8uLi9hYnN0cmFjdC9yZWdpc3RyeScpXG5cdCwgQ29tcG9uZW50RmFjZXQgPSByZXF1aXJlKCcuLi9jX2ZhY2V0Jyk7XG5cbnZhciBmYWNldHNSZWdpc3RyeSA9IG5ldyBDbGFzc1JlZ2lzdHJ5KENvbXBvbmVudEZhY2V0KTtcblxuZmFjZXRzUmVnaXN0cnkuYWRkKENvbXBvbmVudEZhY2V0KTtcblxubW9kdWxlLmV4cG9ydHMgPSBmYWNldHNSZWdpc3RyeTtcblxuLy8gVE9ETyAtIHJlZmFjdG9yIGNvbXBvbmVudHMgcmVnaXN0cnkgdGVzdCBpbnRvIGEgZnVuY3Rpb25cbi8vIHRoYXQgdGVzdHMgYSByZWdpc3RyeSB3aXRoIGEgZ2l2ZW4gZm91bmRhdGlvbiBjbGFzc1xuLy8gTWFrZSB0ZXN0IGZvciB0aGlzIHJlZ2lzdHJ5IGJhc2VkIG9uIHRoaXMgZnVuY3Rpb24iLCIndXNlIHN0cmljdCc7XG5cbnZhciBET01FdmVudHNTb3VyY2UgPSByZXF1aXJlKCcuL2RvbV9ldmVudHNfc291cmNlJylcblx0LCBDb21wb25lbnQgPSByZXF1aXJlKCcuLi9jX2NsYXNzJylcblx0LCBDb21wb25lbnREYXRhU291cmNlRXJyb3IgPSByZXF1aXJlKCcuLi8uLi91dGlsL2Vycm9yJykuQ29tcG9uZW50RGF0YVNvdXJjZVxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vLi4vdXRpbC9jaGVjaycpXG5cdCwgTWF0Y2ggPSBjaGVjay5NYXRjaDtcblxuXG4vLyBjbGFzcyB0byBoYW5kbGUgc3Vic2NyaWJ0aW9ucyB0byBjaGFuZ2VzIGluIERPTSBmb3IgVUkgKG1heWJlIGFsc28gY29udGVudCBlZGl0YWJsZSkgZWxlbWVudHNcbnZhciBDb21wb25lbnREYXRhU291cmNlID0gXy5jcmVhdGVTdWJjbGFzcyhET01FdmVudHNTb3VyY2UsICdDb21wb25lbnREYXRhU291cmNlJywgdHJ1ZSk7XG5cblxuXy5leHRlbmRQcm90byhDb21wb25lbnREYXRhU291cmNlLCB7XG5cdC8vIGltcGxlbWVudGluZyBNZXNzYWdlU291cmNlIGludGVyZmFjZVxuXHRpbml0OiBpbml0Q29tcG9uZW50RGF0YVNvdXJjZSxcblx0dHJhbnNsYXRlVG9Tb3VyY2VNZXNzYWdlOiB0cmFuc2xhdGVUb0RvbUV2ZW50LFxuIFx0YWRkU291cmNlTGlzdGVuZXI6IGFkZERvbUV2ZW50TGlzdGVuZXIsXG4gXHRyZW1vdmVTb3VyY2VMaXN0ZW5lcjogcmVtb3ZlRG9tRXZlbnRMaXN0ZW5lcixcbiBcdGZpbHRlclNvdXJjZU1lc3NhZ2U6IGZpbHRlckRhdGFNZXNzYWdlLFxuXG4gXHQvLyBjbGFzcyBzcGVjaWZpYyBtZXRob2RzXG4gXHQvLyBkb206IGltcGxlbWVudGVkIGluIERPTUV2ZW50c1NvdXJjZVxuIFx0dmFsdWU6IGdldERvbUVsZW1lbnREYXRhVmFsdWUsXG4gXHRoYW5kbGVFdmVudDogaGFuZGxlRXZlbnQsICAvLyBldmVudCBkaXNwYXRjaGVyIC0gYXMgZGVmaW5lZCBieSBFdmVudCBET00gQVBJXG4gXHR0cmlnZ2VyOiB0cmlnZ2VyRGF0YU1lc3NhZ2UgLy8gcmVkZWZpbmVzIG1ldGhvZCBvZiBzdXBlcmNsYXNzIERPTUV2ZW50c1NvdXJjZVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ29tcG9uZW50RGF0YVNvdXJjZTtcblxuXG5mdW5jdGlvbiBpbml0Q29tcG9uZW50RGF0YVNvdXJjZSgpIHtcblx0RE9NRXZlbnRzU291cmNlLnByb3RvdHlwZS5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cblx0dGhpcy52YWx1ZSgpOyAvLyBzdG9yZXMgY3VycmVudCBjb21wb25lbnQgZGF0YSB2YWx1ZSBpbiB0aGlzLl92YWx1ZVxufVxuXG5cbi8vIFRPRE86IHNob3VsZCByZXR1cm4gdmFsdWUgZGVwZW5kZW50IG9uIGVsZW1lbnQgdGFnXG5mdW5jdGlvbiBnZXREb21FbGVtZW50RGF0YVZhbHVlKCkgeyAvLyB2YWx1ZSBtZXRob2Rcblx0dmFyIG5ld1ZhbHVlID0gdGhpcy5jb21wb25lbnQuZWwudmFsdWU7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdfdmFsdWUnLCB7XG5cdFx0Y29uZmlndXJhYmxlOiB0cnVlLFxuXHRcdHZhbHVlOiBuZXdWYWx1ZVxuXHR9KTtcblxuXHRyZXR1cm4gbmV3VmFsdWU7XG59XG5cblxuLy8gVE9ETzogdGhpcyBmdW5jdGlvbiBzaG91bGQgcmV0dXJuIHJlbGV2YW50IERPTSBldmVudCBkZXBlbmRlbnQgb24gZWxlbWVudCB0YWdcbi8vIENhbiBhbHNvIGltcGxlbWVudCBiZWZvcmVkYXRhY2hhbmdlZCBldmVudCB0byBhbGxvdyBwcmV2ZW50aW5nIHRoZSBjaGFuZ2VcbmZ1bmN0aW9uIHRyYW5zbGF0ZVRvRG9tRXZlbnQobWVzc2FnZSkge1xuXHRpZiAobWVzc2FnZSA9PSAnZGF0YWNoYW5nZWQnKVxuXHRcdHJldHVybiAnaW5wdXQnO1xuXHRlbHNlXG5cdFx0dGhyb3cgbmV3IENvbXBvbmVudERhdGFTb3VyY2VFcnJvcigndW5rbm93biBjb21wb25lbnQgZGF0YSBldmVudCcpO1xufVxuXG5cbmZ1bmN0aW9uIGFkZERvbUV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlKSB7XG5cdHRoaXMuZG9tKCkuYWRkRXZlbnRMaXN0ZW5lcihldmVudFR5cGUsIHRoaXMsIGZhbHNlKTsgLy8gbm8gY2FwdHVyaW5nXG59XG5cblxuZnVuY3Rpb24gcmVtb3ZlRG9tRXZlbnRMaXN0ZW5lcihldmVudFR5cGUpIHtcblx0dGhpcy5kb20oKS5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50VHlwZSwgdGhpcywgZmFsc2UpOyAvLyBubyBjYXB0dXJpbmdcbn1cblxuXG5mdW5jdGlvbiBmaWx0ZXJEYXRhTWVzc2FnZShldmVudFR5cGUsIG1lc3NhZ2UsIGRhdGEpIHtcblx0cmV0dXJuIGRhdGEubmV3VmFsdWUgIT0gZGF0YS5vbGRWYWx1ZTtcbn07XG5cblxuIC8vIGV2ZW50IGRpc3BhdGNoZXIgLSBhcyBkZWZpbmVkIGJ5IEV2ZW50IERPTSBBUElcbmZ1bmN0aW9uIGhhbmRsZUV2ZW50KGV2ZW50KSB7XG5cdHZhciBvbGRWYWx1ZSA9IHRoaXMuX3ZhbHVlO1xuXG5cdHRoaXMuZGlzcGF0Y2hNZXNzYWdlKGV2ZW50LnR5cGUsIHtcblx0XHRvbGRWYWx1ZTogb2xkVmFsdWUsXG5cdFx0bmV3VmFsdWU6IHRoaXMudmFsdWUoKVxuXHR9KTtcbn1cblxuXG5mdW5jdGlvbiB0cmlnZ2VyRGF0YU1lc3NhZ2UobWVzc2FnZSwgZGF0YSkge1xuXHQvLyBUT0RPIC0gb3Bwb3NpdGUgdHJhbnNsYXRpb24gKyBldmVudCB0cmlnZ2VyIFxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpO1xuXG5cbi8vIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL1JlZmVyZW5jZS9FdmVudHNcblxudmFyIGV2ZW50VHlwZXMgPSB7XG5cdENsaXBib2FyZEV2ZW50OiBbJ2NvcHknLCAnY3V0JywgJ3Bhc3RlJywgJ2JlZm9yZWNvcHknLCAnYmVmb3JlY3V0JywgJ2JlZm9yZXBhc3RlJ10sXG5cdEV2ZW50OiBbJ2lucHV0JywgJ3JlYWR5c3RhdGVjaGFuZ2UnXSxcblx0Rm9jdXNFdmVudDogWydmb2N1cycsICdibHVyJywgJ2ZvY3VzaW4nLCAnZm9jdXNvdXQnXSxcblx0S2V5Ym9hcmRFdmVudDogWydrZXlkb3duJywgJ2tleXByZXNzJywgICdrZXl1cCddLFxuXHRNb3VzZUV2ZW50OiBbJ2NsaWNrJywgJ2NvbnRleHRtZW51JywgJ2RibGNsaWNrJywgJ21vdXNlZG93bicsICdtb3VzZXVwJyxcblx0XHRcdFx0ICdtb3VzZWVudGVyJywgJ21vdXNlbGVhdmUnLCAnbW91c2Vtb3ZlJywgJ21vdXNlb3V0JywgJ21vdXNlb3ZlcicsXG5cdFx0XHRcdCAnc2hvdycgLyogY29udGV4dCBtZW51ICovXSxcblx0VG91Y2hFdmVudDogWyd0b3VjaHN0YXJ0JywgJ3RvdWNoZW5kJywgJ3RvdWNobW92ZScsICd0b3VjaGVudGVyJywgJ3RvdWNobGVhdmUnLCAndG91Y2hjYW5jZWwnXSxcbn07XG5cblxuLy8gbW9jayB3aW5kb3cgYW5kIGV2ZW50IGNvbnN0cnVjdG9ycyBmb3IgdGVzdGluZ1xuaWYgKHR5cGVvZiB3aW5kb3cgIT0gJ3VuZGVmaW5lZCcpXG5cdHZhciBnbG9iYWwgPSB3aW5kb3c7XG5lbHNlIHtcblx0Z2xvYmFsID0ge307XG5cdF8uZWFjaEtleShldmVudFR5cGVzLCBmdW5jdGlvbihlVHlwZXMsIGV2ZW50Q29uc3RydWN0b3JOYW1lKSB7XG5cdFx0dmFyIGV2ZW50c0NvbnN0cnVjdG9yO1xuXHRcdGV2YWwoXG5cdFx0XHQnZXZlbnRzQ29uc3RydWN0b3IgPSBmdW5jdGlvbiAnICsgZXZlbnRDb25zdHJ1Y3Rvck5hbWUgKyAnKHR5cGUsIHByb3BlcnRpZXMpIHsgXFxcblx0XHRcdFx0dGhpcy50eXBlID0gdHlwZTsgXFxcblx0XHRcdFx0Xy5leHRlbmQodGhpcywgcHJvcGVydGllcyk7IFxcXG5cdFx0XHR9Oydcblx0XHQpO1xuXHRcdGdsb2JhbFtldmVudENvbnN0cnVjdG9yTmFtZV0gPSBldmVudHNDb25zdHJ1Y3Rvcjtcblx0fSk7XG59XG5cblxudmFyIGRvbUV2ZW50c0NvbnN0cnVjdG9ycyA9IHt9O1xuXG5fLmVhY2hLZXkoZXZlbnRUeXBlcywgZnVuY3Rpb24oZVR5cGVzLCBldmVudENvbnN0cnVjdG9yTmFtZSkge1xuXHRlVHlwZXMuZm9yRWFjaChmdW5jdGlvbih0eXBlKSB7XG5cdFx0aWYgKE9iamVjdC5oYXNPd25Qcm9wZXJ0eShkb21FdmVudHNDb25zdHJ1Y3RvcnMsIHR5cGUpKVxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdkdXBsaWNhdGUgZXZlbnQgdHlwZSAnICsgdHlwZSk7XG5cblx0XHRkb21FdmVudHNDb25zdHJ1Y3RvcnNbdHlwZV0gPSBnbG9iYWxbZXZlbnRDb25zdHJ1Y3Rvck5hbWVdO1xuXHR9KTtcbn0pO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gZG9tRXZlbnRzQ29uc3RydWN0b3JzO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgTWVzc2FnZVNvdXJjZSA9IHJlcXVpcmUoJy4uLy4uL21lc3Nlbmdlci9tZXNzYWdlX3NvdXJjZScpXG5cdCwgQ29tcG9uZW50ID0gcmVxdWlyZSgnLi4vY19jbGFzcycpXG5cdCwgZG9tRXZlbnRzQ29uc3RydWN0b3JzID0gcmVxdWlyZSgnLi9kb21fZXZlbnRzX2NvbnN0cnVjdG9ycycpIC8vIFRPRE8gbWVyZ2Ugd2l0aCBET01FdmVudFNvdXJjZSA/P1xuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vLi4vdXRpbC9jaGVjaycpXG5cdCwgTWF0Y2ggPSBjaGVjay5NYXRjaDtcblxudmFyIERPTUV2ZW50c1NvdXJjZSA9IF8uY3JlYXRlU3ViY2xhc3MoTWVzc2FnZVNvdXJjZSwgJ0RPTU1lc3NhZ2VTb3VyY2UnLCB0cnVlKTtcblxuXG5fLmV4dGVuZFByb3RvKERPTUV2ZW50c1NvdXJjZSwge1xuXHQvLyBpbXBsZW1lbnRpbmcgTWVzc2FnZVNvdXJjZSBpbnRlcmZhY2Vcblx0aW5pdDogaW5pdERvbUV2ZW50c1NvdXJjZSxcblx0dHJhbnNsYXRlVG9Tb3VyY2VNZXNzYWdlOiB0cmFuc2xhdGVUb0RvbUV2ZW50LFxuIFx0YWRkU291cmNlTGlzdGVuZXI6IGFkZERvbUV2ZW50TGlzdGVuZXIsXG4gXHRyZW1vdmVTb3VyY2VMaXN0ZW5lcjogcmVtb3ZlRG9tRXZlbnRMaXN0ZW5lcixcbiBcdGZpbHRlclNvdXJjZU1lc3NhZ2U6IGZpbHRlckNhcHR1cmVkRG9tRXZlbnQsXG5cbiBcdC8vIGNsYXNzIHNwZWNpZmljIG1ldGhvZHNcbiBcdGRvbTogZ2V0RG9tRWxlbWVudCxcbiBcdGhhbmRsZUV2ZW50OiBoYW5kbGVFdmVudCwgIC8vIGV2ZW50IGRpc3BhdGNoZXIgLSBhcyBkZWZpbmVkIGJ5IEV2ZW50IERPTSBBUElcbiBcdHRyaWdnZXI6IHRyaWdnZXJEb21FdmVudFxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gRE9NRXZlbnRzU291cmNlO1xuXG5cbnZhciB1c2VDYXB0dXJlUGF0dGVybiA9IC9fX2NhcHR1cmUkLztcblxuXG5mdW5jdGlvbiBpbml0RG9tRXZlbnRzU291cmNlKGhvc3RPYmplY3QsIHByb3h5TWV0aG9kcywgY29tcG9uZW50KSB7XG5cdGNoZWNrKGNvbXBvbmVudCwgQ29tcG9uZW50KTtcblx0TWVzc2FnZVNvdXJjZS5wcm90b3R5cGUuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG5cdHRoaXMuY29tcG9uZW50ID0gY29tcG9uZW50O1xuXG5cdC8vIHRoaXMubWVzc2VuZ2VyIGlzIHNldCBieSBNZXNzZW5nZXIgY2xhc3Ncbn1cblxuXG5mdW5jdGlvbiBnZXREb21FbGVtZW50KCkge1xuXHRyZXR1cm4gdGhpcy5jb21wb25lbnQuZWw7XG59XG5cblxuZnVuY3Rpb24gdHJhbnNsYXRlVG9Eb21FdmVudChtZXNzYWdlKSB7XG5cdGlmICh1c2VDYXB0dXJlUGF0dGVybi50ZXN0KG1lc3NhZ2UpKVxuXHRcdG1lc3NhZ2UgPSBtZXNzYWdlLnJlcGxhY2UodXNlQ2FwdHVyZVBhdHRlcm4sICcnKTtcblx0cmV0dXJuIG1lc3NhZ2U7XG59XG5cblxuZnVuY3Rpb24gYWRkRG9tRXZlbnRMaXN0ZW5lcihldmVudFR5cGUpIHtcblx0dGhpcy5kb20oKS5hZGRFdmVudExpc3RlbmVyKGV2ZW50VHlwZSwgdGhpcywgZmFsc2UpO1xufVxuXG5cbmZ1bmN0aW9uIHJlbW92ZURvbUV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlKSB7XG5cdHRoaXMuZG9tKCkucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudFR5cGUsIHRoaXMsIGZhbHNlKTtcbn1cblxuXG5mdW5jdGlvbiBmaWx0ZXJDYXB0dXJlZERvbUV2ZW50KGV2ZW50VHlwZSwgbWVzc2FnZSwgZXZlbnQpIHtcblx0dmFyIGlzQ2FwdHVyZVBoYXNlO1xuXHRpZiAodHlwZW9mIHdpbmRvdyAhPSAndW5kZWZpbmVkJylcblx0XHRpc0NhcHR1cmVQaGFzZSA9IGV2ZW50LmV2ZW50UGhhc2UgPT0gd2luZG93LkV2ZW50LkNBUFRVUklOR19QSEFTRTtcblxuXHRyZXR1cm4gKCEgaXNDYXB0dXJlUGhhc2UgfHwgKGlzQ2FwdHVyZVBoYXNlICYmIHVzZUNhcHR1cmVQYXR0ZXJuLnRlc3QobWVzc2FnZSkpKTtcbn1cblxuXG4vLyBldmVudCBkaXNwYXRjaGVyIC0gYXMgZGVmaW5lZCBieSBFdmVudCBET00gQVBJXG5mdW5jdGlvbiBoYW5kbGVFdmVudChldmVudCkge1xuXHR0aGlzLmRpc3BhdGNoTWVzc2FnZShldmVudC50eXBlLCBldmVudCk7XG59XG5cblxuLy8gVE9ETyBtYWtlIHdvcmsgd2l0aCBtZXNzYWdlcyAod2l0aCBfY2FwdHVyZSlcbmZ1bmN0aW9uIHRyaWdnZXJEb21FdmVudChldmVudFR5cGUsIHByb3BlcnRpZXMpIHtcblx0Y2hlY2soZXZlbnRUeXBlLCBTdHJpbmcpO1xuXHRjaGVjayhwcm9wZXJ0aWVzLCBNYXRjaC5PcHRpb25hbChPYmplY3QpKTtcblxuXHR2YXIgRXZlbnRDb25zdHJ1Y3RvciA9IGRvbUV2ZW50c0NvbnN0cnVjdG9yc1tldmVudFR5cGVdO1xuXG5cdGlmICh0eXBlb2YgZXZlbnRDb25zdHJ1Y3RvciAhPSAnZnVuY3Rpb24nKVxuXHRcdHRocm93IG5ldyBFcnJvcigndW5zdXBwb3J0ZWQgZXZlbnQgdHlwZScpO1xuXG5cdC8vIGNoZWNrIGlmIGl0IGlzIGNvcnJlY3Rcblx0aWYgKHR5cGVvZiBwcm9wZXJ0aWVzICE9ICd1bmRlZmluZWQnKVxuXHRcdHByb3BlcnRpZXMudHlwZSA9IGV2ZW50VHlwZTtcblxuXHR2YXIgZG9tRXZlbnQgPSBFdmVudENvbnN0cnVjdG9yKGV2ZW50VHlwZSwgcHJvcGVydGllcyk7XG5cblx0dmFyIG5vdENhbmNlbGxlZCA9IHRoaXMuZG9tKCkuZGlzcGF0Y2hFdmVudChkb21FdmVudCk7XG5cblx0cmV0dXJuIG5vdENhbmNlbGxlZDtcbn0iLCIndXNlIHN0cmljdCc7XG5cbnZhciBNZXNzYWdlU291cmNlID0gcmVxdWlyZSgnLi4vLi4vbWVzc2VuZ2VyL21lc3NhZ2Vfc291cmNlJylcblx0LCBfID0gcmVxdWlyZSgnbW9sLXByb3RvJylcblx0LCBjaGVjayA9IHJlcXVpcmUoJy4uLy4uL3V0aWwvY2hlY2snKVxuXHQsIE1hdGNoID0gY2hlY2suTWF0Y2g7XG5cbnZhciBpRnJhbWVNZXNzYWdlU291cmNlID0gXy5jcmVhdGVTdWJjbGFzcyhNZXNzYWdlU291cmNlLCAnaUZyYW1lTWVzc2FnZVNvdXJjZScsIHRydWUpO1xuXG5cbl8uZXh0ZW5kUHJvdG8oaUZyYW1lTWVzc2FnZVNvdXJjZSwge1xuXHQvLyBpbXBsZW1lbnRpbmcgTWVzc2FnZVNvdXJjZSBpbnRlcmZhY2Vcblx0aW5pdDogaW5pdElGcmFtZU1lc3NhZ2VTb3VyY2UsXG5cdHRyYW5zbGF0ZVRvU291cmNlTWVzc2FnZTogdHJhbnNsYXRlVG9JRnJhbWVNZXNzYWdlLFxuIFx0YWRkU291cmNlTGlzdGVuZXI6IGFkZElGcmFtZU1lc3NhZ2VMaXN0ZW5lcixcbiBcdHJlbW92ZVNvdXJjZUxpc3RlbmVyOiByZW1vdmVJRnJhbWVNZXNzYWdlTGlzdGVuZXIsXG4gXHRmaWx0ZXJTb3VyY2VNZXNzYWdlOiBmaWx0ZXJSZWNpZXZlZElGcmFtZU1lc3NhZ2UsXG5cbiBcdC8vY2xhc3Mgc3BlY2lmaWMgbWV0aG9kc1xuIFx0cG9zdDogcG9zdFRvT3RoZXJXaW5kb3csXG4gXHRoYW5kbGVFdmVudDogaGFuZGxlRXZlbnQgIC8vIGV2ZW50IGRpc3BhdGNoZXIgLSBhcyBkZWZpbmVkIGJ5IEV2ZW50IERPTSBBUElcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGlGcmFtZU1lc3NhZ2VTb3VyY2U7XG5cblxuZnVuY3Rpb24gaW5pdElGcmFtZU1lc3NhZ2VTb3VyY2UoaG9zdE9iamVjdCwgcHJveHlNZXRob2RzKSB7XG5cdGNoZWNrKGhvc3RPYmplY3QsIE9iamVjdCk7XG5cdE1lc3NhZ2VTb3VyY2UucHJvdG90eXBlLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuXHRpZiAoaG9zdE9iamVjdC5vd25lci5lbC5ub2RlTmFtZSA9PSAnSUZSQU1FJylcblx0XHR0aGlzLl9wb3N0VG8gPSBob3N0T2JqZWN0Lm93bmVyLmVsLmNvbnRlbnRXaW5kb3c7XG5cdGVsc2Vcblx0XHR0aGlzLl9wb3N0VG8gPSB3aW5kb3cucGFyZW50O1xuXG5cdHRoaXMuX2xpc3RlblRvID0gd2luZG93O1xufVxuXG5cbmZ1bmN0aW9uIHRyYW5zbGF0ZVRvSUZyYW1lTWVzc2FnZShtZXNzYWdlKSB7XG5cdHJldHVybiAnbWVzc2FnZSc7IC8vIHNvdXJjZU1lc3NhZ2Vcbn1cblxuXG5mdW5jdGlvbiBhZGRJRnJhbWVNZXNzYWdlTGlzdGVuZXIoZXZlbnRUeXBlKSB7XG5cdHRoaXMuX2xpc3RlblRvLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlLCB0aGlzLCBmYWxzZSk7XG59XG5cblxuZnVuY3Rpb24gcmVtb3ZlSUZyYW1lTWVzc2FnZUxpc3RlbmVyKGV2ZW50VHlwZSkge1xuXHR0aGlzLl9saXN0ZW5Uby5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50VHlwZSwgdGhpcywgZmFsc2UpO1xufVxuXG5cbmZ1bmN0aW9uIGZpbHRlclJlY2lldmVkSUZyYW1lTWVzc2FnZShldmVudFR5cGUsIG1lc3NhZ2UsIGV2ZW50KSB7XG5cdHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBwb3N0VG9PdGhlcldpbmRvdyhldmVudFR5cGUsIG1lc3NhZ2UpIHtcblx0bWVzc2FnZS50eXBlID0gZXZlbnRUeXBlO1xuXHR0aGlzLl9wb3N0VG8ucG9zdE1lc3NhZ2UobWVzc2FnZSwgJyonKTtcbn1cblxuZnVuY3Rpb24gaGFuZGxlRXZlbnQoZXZlbnQpIHtcblx0dGhpcy5kaXNwYXRjaE1lc3NhZ2UoZXZlbnQudHlwZSwgZXZlbnQpO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ2xhc3NSZWdpc3RyeSA9IHJlcXVpcmUoJy4uL2Fic3RyYWN0L3JlZ2lzdHJ5Jylcblx0LCBDb21wb25lbnQgPSByZXF1aXJlKCcuL2NfY2xhc3MnKTtcblxudmFyIGNvbXBvbmVudHNSZWdpc3RyeSA9IG5ldyBDbGFzc1JlZ2lzdHJ5KENvbXBvbmVudCk7XG5cbmNvbXBvbmVudHNSZWdpc3RyeS5hZGQoQ29tcG9uZW50KTtcblxubW9kdWxlLmV4cG9ydHMgPSBjb21wb25lbnRzUmVnaXN0cnk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBDb21wb25lbnQgPSByZXF1aXJlKCcuLi9jX2NsYXNzJylcblx0LCBjb21wb25lbnRzUmVnaXN0cnkgPSByZXF1aXJlKCcuLi9jX3JlZ2lzdHJ5Jyk7XG5cblxudmFyIFZpZXcgPSBDb21wb25lbnQuY3JlYXRlQ29tcG9uZW50Q2xhc3MoJ1ZpZXcnLCBbJ2NvbnRhaW5lciddKTtcblxuY29tcG9uZW50c1JlZ2lzdHJ5LmFkZChWaWV3KTtcblxubW9kdWxlLmV4cG9ydHMgPSBWaWV3O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpXG5cdCwgY2hlY2sgPSByZXF1aXJlKCcuLi91dGlsL2NoZWNrJylcblx0LCBNYXRjaCA9IGNoZWNrLk1hdGNoXG5cdCwgU2NvcGVFcnJvciA9IHJlcXVpcmUoJy4uL3V0aWwvZXJyb3InKS5TY29wZTtcblxuXG4vLyBTY29wZSBjbGFzc1xuZnVuY3Rpb24gU2NvcGUocGFyZW50KSB7XG5cdGNoZWNrKHBhcmVudCwgTWF0Y2guT3B0aW9uYWwoU2NvcGUpKTtcblxuXHRPYmplY3QuZGVmaW5lUHJvcGVydGllcyh0aGlzLCB7XG5cdFx0X3BhcmVudDogeyB2YWx1ZTogcGFyZW50IH1cblx0fSlcbn07XG5cbl8uZXh0ZW5kUHJvdG8oU2NvcGUsIHtcblx0X2FkZDogX2FkZFRvU2NvcGUsXG5cdF9jb3B5OiBfY29weUZyb21TY29wZSxcblx0X2VhY2g6IF9lYWNoLFxuXHRfdW5pcXVlTmFtZTogX3VuaXF1ZU5hbWUsXG5cdF9sZW5ndGg6IF9nZXRTY29wZUxlbmd0aCxcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNjb3BlO1xuXG5cbnZhciBhbGxvd2VkTmFtZVBhdHRlcm4gPSAvXltBLVphLXpdW0EtWmEtejAtOVxcX1xcJF0qJC87XG5cbmZ1bmN0aW9uIF9hZGRUb1Njb3BlKG9iamVjdCwgbmFtZSkge1xuXHRpZiAodGhpc1tuYW1lXSlcblx0XHR0aHJvdyBuZXcgU2NvcGVFcnJvcignZHVwbGljYXRlIG9iamVjdCBuYW1lOiAnICsgbmFtZSk7XG5cblx0Y2hlY2tOYW1lKG5hbWUpO1xuXG5cdHRoaXNbbmFtZV0gPSBvYmplY3Q7XG59XG5cblxuZnVuY3Rpb24gX2NvcHlGcm9tU2NvcGUoYVNjb3BlKSB7XG5cdGNoZWNrKGFTY29wZSwgU2NvcGUpO1xuXG5cdGFTY29wZS5fZWFjaChfYWRkVG9TY29wZSwgdGhpcyk7XG59XG5cblxuZnVuY3Rpb24gX2VhY2goY2FsbGJhY2ssIHRoaXNBcmcpIHtcblx0Xy5lYWNoS2V5KHRoaXMsIGNhbGxiYWNrLCB0aGlzQXJnIHx8IHRoaXMsIHRydWUpOyAvLyBlbnVtZXJhdGVzIGVudW1lcmFibGUgcHJvcGVydGllcyBvbmx5XG59XG5cblxuZnVuY3Rpb24gY2hlY2tOYW1lKG5hbWUpIHtcblx0aWYgKCEgYWxsb3dlZE5hbWVQYXR0ZXJuLnRlc3QobmFtZSkpXG5cdFx0dGhyb3cgbmV3IFNjb3BlRXJyb3IoJ25hbWUgc2hvdWxkIHN0YXJ0IGZyb20gbGV0dGVyLCB0aGlzIG5hbWUgaXMgbm90IGFsbG93ZWQ6ICcgKyBuYW1lKTtcbn1cblxuXG5mdW5jdGlvbiBfdW5pcXVlTmFtZShwcmVmaXgpIHtcblx0dmFyIHByZWZpeGVzID0gdW5pcXVlTmFtZS5wcmVmaXhlcyB8fCAodW5pcXVlTmFtZS5wcmVmaXhlcyA9IHt9KVxuXHRcdCwgcHJlZml4U3RyID0gcHJlZml4ICsgJ18nO1xuXHRcblx0aWYgKHByZWZpeGVzW3ByZWZpeF0pXG5cdFx0cmV0dXJuIHByZWZpeFN0ciArIHByZWZpeGVzW3ByZWZpeF0rKztcblxuXHR2YXIgdW5pcXVlTnVtID0gMFxuXHRcdCwgcHJlZml4TGVuID0gcHJlZml4U3RyLmxlbmd0aDtcblxuXHRfLmVhY2hLZXkodGhpcywgZnVuY3Rpb24ob2JqLCBuYW1lKSB7XG5cdFx0aWYgKG5hbWUuaW5kZXhPZihwcmVmaXhTdHIpID09IC0xKSByZXR1cm47XG5cdFx0dmFyIG51bSA9IG5hbWUuc2xpY2UocHJlZml4TGVuKTtcblx0XHRpZiAobnVtID09IHVuaXF1ZU51bSkgdW5pcXVlTnVtKysgO1xuXHR9KTtcbn1cblxuXG5mdW5jdGlvbiBfZ2V0U2NvcGVMZW5ndGgoKSB7XG5cdHJldHVybiBPYmplY3Qua2V5cyh0aGlzKS5sZW5ndGg7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgnbW9sLXByb3RvJyk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBjb25maWc7XG5cbmZ1bmN0aW9uIGNvbmZpZyhvcHRpb25zKSB7XG5cdF8uZGVlcEV4dGVuZChjb25maWcsIG9wdGlvbnMpO1xufVxuXG5jb25maWcoe1xuXHRhdHRyczoge1xuXHRcdGJpbmQ6ICdtbC1iaW5kJyxcblx0XHRsb2FkOiAnbWwtbG9hZCdcblx0fVxufSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgnbW9sLXByb3RvJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gRmFjZXQ7XG5cbmZ1bmN0aW9uIEZhY2V0KG93bmVyLCBjb25maWcpIHtcblx0dGhpcy5vd25lciA9IG93bmVyO1xuXHR0aGlzLmNvbmZpZyA9IGNvbmZpZyB8fCB7fTtcblx0dGhpcy5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59XG5cbl8uZXh0ZW5kUHJvdG8oRmFjZXQsIHtcblx0aW5pdDogZnVuY3Rpb24oKSB7fVxufSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBGYWNldCA9IHJlcXVpcmUoJy4vZl9jbGFzcycpXG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpXG5cdCwgY2hlY2sgPSByZXF1aXJlKCcuLi91dGlsL2NoZWNrJylcblx0LCBNYXRjaCA9IGNoZWNrLk1hdGNoXG5cdCwgRmFjZXRFcnJvciA9IHJlcXVpcmUoJy4uL3V0aWwvZXJyb3InKS5GYWNldDtcblxubW9kdWxlLmV4cG9ydHMgPSBGYWNldGVkT2JqZWN0O1xuXG5cbi8vIGFic3RyYWN0IGNsYXNzIGZvciBmYWNldGVkIG9iamVjdFxuZnVuY3Rpb24gRmFjZXRlZE9iamVjdCgpIHtcblx0Ly8gVE9ETyB3cml0ZSBhIHRlc3QgdG8gY2hlY2sgdGhhdCBmYWNldHMgYXJlIGNyZWF0ZWQgaWYgY29uZmlndXJhdGlvbiBpc24ndCBwYXNzZWRcblx0dmFyIGZhY2V0c0NvbmZpZyA9IHRoaXMuZmFjZXRzQ29uZmlnIHx8IHt9O1xuXG5cdHZhciBmYWNldHNEZXNjcmlwdG9ycyA9IHt9XG5cdFx0LCBmYWNldHMgPSB7fTtcblxuXHRpZiAodGhpcy5jb25zdHJ1Y3RvciA9PSBGYWNldGVkT2JqZWN0KVx0XHRcblx0XHR0aHJvdyBuZXcgRmFjZXRFcnJvcignRmFjZXRlZE9iamVjdCBpcyBhbiBhYnN0cmFjdCBjbGFzcywgY2FuXFwndCBiZSBpbnN0YW50aWF0ZWQnKTtcblxuXHRpZiAodGhpcy5mYWNldHNDbGFzc2VzKVxuXHRcdF8uZWFjaEtleSh0aGlzLmZhY2V0c0NsYXNzZXMsIGluc3RhbnRpYXRlRmFjZXQsIHRoaXMsIHRydWUpO1xuXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRoaXMsIGZhY2V0c0Rlc2NyaXB0b3JzKTtcblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdmYWNldHMnLCB7IHZhbHVlOiBmYWNldHMgfSk7XHRcblxuXHQvLyBjYWxsaW5nIGluaXQgaWYgaXQgaXMgZGVmaW5lZCBpbiB0aGUgY2xhc3Ncblx0aWYgKHRoaXMuaW5pdClcblx0XHR0aGlzLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuXHRmdW5jdGlvbiBpbnN0YW50aWF0ZUZhY2V0KEZhY2V0Q2xhc3MsIGZjdCkge1xuXHRcdHZhciBmYWNldE9wdHMgPSBmYWNldHNDb25maWdbZmN0XTtcblxuXHRcdGZhY2V0c1tmY3RdID0gbmV3IEZhY2V0Q2xhc3ModGhpcywgZmFjZXRPcHRzKTtcblxuXHRcdGZhY2V0c0Rlc2NyaXB0b3JzW2ZjdF0gPSB7XG5cdFx0XHRlbnVtZXJhYmxlOiB0cnVlLFxuXHRcdFx0dmFsdWU6IGZhY2V0c1tmY3RdXG5cdFx0fTtcblx0fVxufVxuXG5fLmV4dGVuZFByb3RvKEZhY2V0ZWRPYmplY3QsIHtcblx0YWRkRmFjZXQ6IGFkZEZhY2V0XG59KTtcblxuXG5mdW5jdGlvbiBhZGRGYWNldChGYWNldENsYXNzLCBmYWNldE9wdHMsIGZhY2V0TmFtZSkge1xuXHRjaGVjayhGYWNldENsYXNzLCBGdW5jdGlvbik7XG5cdGNoZWNrKGZhY2V0TmFtZSwgTWF0Y2guT3B0aW9uYWwoU3RyaW5nKSk7XG5cblx0ZmFjZXROYW1lID0gXy5maXJzdExvd2VyQ2FzZShmYWNldE5hbWUgfHwgRmFjZXRDbGFzcy5uYW1lKTtcblxuXHR2YXIgcHJvdG9GYWNldHMgPSB0aGlzLmNvbnN0cnVjdG9yLnByb3RvdHlwZS5mYWNldHNDbGFzc2VzO1xuXG5cdGlmIChwcm90b0ZhY2V0cyAmJiBwcm90b0ZhY2V0c1tmYWNldE5hbWVdKVxuXHRcdHRocm93IG5ldyBGYWNldEVycm9yKCdmYWNldCAnICsgZmFjZXROYW1lICsgJyBpcyBhbHJlYWR5IHBhcnQgb2YgdGhlIGNsYXNzICcgKyB0aGlzLmNvbnN0cnVjdG9yLm5hbWUpO1xuXG5cdGlmICh0aGlzW2ZhY2V0TmFtZV0pXG5cdFx0dGhyb3cgbmV3IEZhY2V0RXJyb3IoJ2ZhY2V0ICcgKyBmYWNldE5hbWUgKyAnIGlzIGFscmVhZHkgcHJlc2VudCBpbiBvYmplY3QnKTtcblxuXHR2YXIgbmV3RmFjZXQgPSB0aGlzLmZhY2V0c1tmYWNldE5hbWVdID0gbmV3IEZhY2V0Q2xhc3ModGhpcywgZmFjZXRPcHRzKTtcblxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgZmFjZXROYW1lLCB7XG5cdFx0ZW51bWVyYWJsZTogdHJ1ZSxcblx0XHR2YWx1ZTogbmV3RmFjZXRcblx0fSk7XG5cblx0cmV0dXJuIG5ld0ZhY2V0O1xufVxuXG5cbkZhY2V0ZWRPYmplY3QuaGFzRmFjZXQgPSBmdW5jdGlvbiBoYXNGYWNldChmYWNldE5hbWUpIHtcblx0dmFyIHByb3RvRmFjZXRzID0gdGhpcy5wcm90b3R5cGUuZmFjZXRzQ2xhc3Nlcztcblx0cmV0dXJuIHByb3RvRmFjZXRzICYmIHByb3RvRmFjZXRzW2ZhY2V0TmFtZV07XG59XG5cblxuXG4vLyBmYWN0b3J5IHRoYXQgY3JlYXRlcyBjbGFzc2VzIChjb25zdHJ1Y3RvcnMpIGZyb20gdGhlIG1hcCBvZiBmYWNldHNcbi8vIHRoZXNlIGNsYXNzZXMgaW5oZXJpdCBmcm9tIEZhY2V0ZWRPYmplY3RcbkZhY2V0ZWRPYmplY3QuY3JlYXRlRmFjZXRlZENsYXNzID0gZnVuY3Rpb24gKG5hbWUsIGZhY2V0c0NsYXNzZXMsIGZhY2V0c0NvbmZpZykge1xuXHRjaGVjayhuYW1lLCBTdHJpbmcpO1xuXHRjaGVjayhmYWNldHNDbGFzc2VzLCBNYXRjaC5PYmplY3RIYXNoKE1hdGNoLlN1YmNsYXNzKEZhY2V0LCB0cnVlKSkpO1xuXHRjaGVjayhmYWNldHNDb25maWcsIE1hdGNoLk9wdGlvbmFsKE9iamVjdCkpO1xuXG5cdGlmIChmYWNldHNDb25maWcpXG5cdFx0Xy5lYWNoS2V5KGZhY2V0c0NvbmZpZywgZnVuY3Rpb24oZmN0Q29uZmlnLCBmY3ROYW1lKSB7XG5cdFx0XHRpZiAoISBmYWNldHNDbGFzc2VzLmhhc093blByb3BlcnR5KGZjdE5hbWUpKVxuXHRcdFx0XHR0aHJvdyBuZXcgRmFjZXRFcnJvcignY29uZmlndXJhdGlvbiBmb3IgZmFjZXQgKCcgKyBmY3ROYW1lICsgJykgcGFzc2VkIHRoYXQgaXMgbm90IGluIGNsYXNzJyk7XG5cdFx0fSk7XG5cblx0dmFyIEZhY2V0ZWRDbGFzcyA9IF8uY3JlYXRlU3ViY2xhc3ModGhpcywgbmFtZSwgdHJ1ZSk7XG5cblx0Xy5leHRlbmRQcm90byhGYWNldGVkQ2xhc3MsIHtcblx0XHRmYWNldHNDbGFzc2VzOiBmYWNldHNDbGFzc2VzLFxuXHRcdGZhY2V0c0NvbmZpZzogZmFjZXRzQ29uZmlnXG5cdH0pO1xuXHRyZXR1cm4gRmFjZXRlZENsYXNzO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIG1pbG9NYWlsID0gcmVxdWlyZSgnLi9tYWlsJylcblx0LCByZXF1ZXN0ID0gcmVxdWlyZSgnLi91dGlsL3JlcXVlc3QnKVxuXHQsIGxvZ2dlciA9IHJlcXVpcmUoJy4vdXRpbC9sb2dnZXInKVxuXHQsIGNvbmZpZyA9IHJlcXVpcmUoJy4vY29uZmlnJylcblx0LCBMb2FkQXR0cmlidXRlID0gcmVxdWlyZSgnLi9hdHRyaWJ1dGUvYV9sb2FkJylcblx0LCBMb2FkZXJFcnJvciA9IHJlcXVpcmUoJy4vdXRpbC9lcnJvcicpLkxvYWRlcjtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGxvYWRlcjtcblxuXG5mdW5jdGlvbiBsb2FkZXIocm9vdEVsLCBjYWxsYmFjaykge1x0XG5cdG1pbG9NYWlsLm9uTWVzc2FnZSgnZG9tcmVhZHknLCBmdW5jdGlvbigpIHtcblx0XHRpZiAodHlwZW9mIHJvb3RFbCA9PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRjYWxsYmFjayA9IHJvb3RFbDtcblx0XHRcdHJvb3RFbCA9IHVuZGVmaW5lZDtcblx0XHR9XG5cblx0XHRyb290RWwgPSByb290RWwgfHwgZG9jdW1lbnQuYm9keTtcblxuXHRcdG1pbG9NYWlsLnBvc3RNZXNzYWdlKCdsb2FkZXInLCB7IHN0YXRlOiAnc3RhcnRlZCcgfSk7XG5cdFx0X2xvYWRlcihyb290RWwsIGZ1bmN0aW9uKHZpZXdzKSB7XG5cdFx0XHRtaWxvTWFpbC5wb3N0TWVzc2FnZSgnbG9hZGVyJywgeyBcblx0XHRcdFx0c3RhdGU6ICdmaW5pc2hlZCcsXG5cdFx0XHRcdHZpZXdzOiB2aWV3c1xuXHRcdFx0fSk7XG5cdFx0XHRjYWxsYmFjayh2aWV3cyk7XG5cdFx0fSk7XG5cdH0pO1xufVxuXG5cbmZ1bmN0aW9uIF9sb2FkZXIocm9vdEVsLCBjYWxsYmFjaykge1xuXHR2YXIgbG9hZEVsZW1lbnRzID0gcm9vdEVsLnF1ZXJ5U2VsZWN0b3JBbGwoJ1snICsgY29uZmlnLmF0dHJzLmxvYWQgKyAnXScpO1xuXG5cdHZhciB2aWV3cyA9IHt9XG5cdFx0LCB0b3RhbENvdW50ID0gbG9hZEVsZW1lbnRzLmxlbmd0aFxuXHRcdCwgbG9hZGVkQ291bnQgPSAwO1xuXG5cdEFycmF5LnByb3RvdHlwZS5mb3JFYWNoLmNhbGwobG9hZEVsZW1lbnRzLCBmdW5jdGlvbiAoZWwpIHtcblx0XHRsb2FkVmlldyhlbCwgZnVuY3Rpb24oZXJyKSB7XG5cdFx0XHR2aWV3c1tlbC5pZF0gPSBlcnIgfHwgZWw7XG5cdFx0XHRsb2FkZWRDb3VudCsrO1xuXHRcdFx0aWYgKGxvYWRlZENvdW50ID09IHRvdGFsQ291bnQpXG5cdFx0XHRcdGNhbGxiYWNrKHZpZXdzKTtcblx0XHR9KTtcblx0fSk7XG59O1xuXG5cbmZ1bmN0aW9uIGxvYWRWaWV3KGVsLCBjYWxsYmFjaykge1xuXHRpZiAoZWwuY2hpbGRyZW4ubGVuZ3RoKVxuXHRcdHRocm93IG5ldyBMb2FkZXJFcnJvcignY2FuXFwndCBsb2FkIGh0bWwgaW50byBlbGVtZW50IHRoYXQgaXMgbm90IGVtcHR5Jyk7XG5cblx0dmFyIGF0dHIgPSBuZXcgTG9hZEF0dHJpYnV0ZShlbCk7XG5cblx0YXR0ci5wYXJzZSgpLnZhbGlkYXRlKCk7XG5cblx0cmVxdWVzdC5nZXQoYXR0ci5sb2FkVXJsLCBmdW5jdGlvbihlcnIsIGh0bWwpIHtcblx0XHRpZiAoZXJyKSB7XG5cdFx0XHRlcnIubWVzc2FnZSA9IGVyci5tZXNzYWdlIHx8ICdjYW5cXCd0IGxvYWQgZmlsZSAnICsgYXR0ci5sb2FkVXJsO1xuXHRcdFx0Ly8gbG9nZ2VyLmVycm9yKGVyci5tZXNzYWdlKTtcblx0XHRcdGNhbGxiYWNrKGVycik7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0ZWwuaW5uZXJIVE1MID0gaHRtbDtcblx0XHRjYWxsYmFjayhudWxsKTtcblx0fSk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBNZXNzZW5nZXIgPSByZXF1aXJlKCcuLi9tZXNzZW5nZXInKVxuXHQsIE1haWxNZXNzYWdlU291cmNlID0gcmVxdWlyZSgnLi9tYWlsX3NvdXJjZScpO1xuXG5cbnZhciBtYWlsTXNnU291cmNlID0gbmV3IE1haWxNZXNzYWdlU291cmNlKCk7XG5cbnZhciBtaWxvTWFpbCA9IG5ldyBNZXNzZW5nZXIodW5kZWZpbmVkLCB1bmRlZmluZWQsIG1haWxNc2dTb3VyY2UpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG1pbG9NYWlsO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgTWVzc2FnZVNvdXJjZSA9IHJlcXVpcmUoJy4uL21lc3Nlbmdlci9tZXNzYWdlX3NvdXJjZScpXG5cdCwgZG9tRXZlbnRzQ29uc3RydWN0b3JzID0gcmVxdWlyZSgnLi4vY29tcG9uZW50cy9jX21lc3NhZ2Vfc291cmNlcy9kb21fZXZlbnRzX2NvbnN0cnVjdG9ycycpXG5cdCwgTWFpbE1lc3NhZ2VTb3VyY2VFcnJvciA9IHJlcXVpcmUoJy4uL3V0aWwvZXJyb3InKS5NYWlsTWVzc2FnZVNvdXJjZVxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vdXRpbC9jaGVjaycpXG5cdCwgTWF0Y2ggPSBjaGVjay5NYXRjaDtcblxuXG52YXIgTWFpbE1lc3NhZ2VTb3VyY2UgPSBfLmNyZWF0ZVN1YmNsYXNzKE1lc3NhZ2VTb3VyY2UsICdNYWlsTWVzc2FnZVNvdXJjZScsIHRydWUpO1xuXG5cbl8uZXh0ZW5kUHJvdG8oTWFpbE1lc3NhZ2VTb3VyY2UsIHtcblx0Ly8gaW1wbGVtZW50aW5nIE1lc3NhZ2VTb3VyY2UgaW50ZXJmYWNlXG5cdC8vIGluaXQ6IGRlZmluZWQgaW4gTWVzc2FnZVNvdXJjZVxuXHR0cmFuc2xhdGVUb1NvdXJjZU1lc3NhZ2U6IHRyYW5zbGF0ZVRvRG9tRXZlbnQsXG4gXHRhZGRTb3VyY2VMaXN0ZW5lcjogYWRkRG9tRXZlbnRMaXN0ZW5lcixcbiBcdHJlbW92ZVNvdXJjZUxpc3RlbmVyOiByZW1vdmVEb21FdmVudExpc3RlbmVyLFxuIFx0ZmlsdGVyU291cmNlTWVzc2FnZTogZmlsdGVyRG9tRXZlbnQsXG5cbiBcdC8vIGNsYXNzIHNwZWNpZmljIG1ldGhvZHNcbiBcdGhhbmRsZUV2ZW50OiBoYW5kbGVFdmVudCwgIC8vIGV2ZW50IGRpc3BhdGNoZXIgLSBhcyBkZWZpbmVkIGJ5IEV2ZW50IERPTSBBUElcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1haWxNZXNzYWdlU291cmNlO1xuXG5cbi8vIFRPRE86IHRoaXMgZnVuY3Rpb24gc2hvdWxkIHJldHVybiByZWxldmFudCBET00gZXZlbnQgZGVwZW5kZW50IG9uIGVsZW1lbnQgdGFnXG4vLyBDYW4gYWxzbyBpbXBsZW1lbnQgYmVmb3JlZGF0YWNoYW5nZWQgZXZlbnQgdG8gYWxsb3cgcHJldmVudGluZyB0aGUgY2hhbmdlXG5mdW5jdGlvbiB0cmFuc2xhdGVUb0RvbUV2ZW50KG1lc3NhZ2UpIHtcblx0aWYgKG1lc3NhZ2UgPT0gJ2RvbXJlYWR5Jylcblx0XHRyZXR1cm4gJ3JlYWR5c3RhdGVjaGFuZ2UnO1xufVxuXG5cbmZ1bmN0aW9uIGFkZERvbUV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlKSB7XG5cdGlmICh0eXBlb2YgZG9jdW1lbnQgPT0gJ29iamVjdCcpIHtcblx0XHRpZiAoZXZlbnRUeXBlID09ICdyZWFkeXN0YXRlY2hhbmdlJykge1xuXHRcdFx0aWYgKGRvY3VtZW50LnJlYWR5U3RhdGUgPT0gJ2xvYWRpbmcnKVxuXHRcdFx0XHRkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50VHlwZSwgdGhpcywgZmFsc2UpOyAvLyBubyBjYXB0dXJpbmdcblx0XHRcdGVsc2Uge1xuXHRcdFx0XHR2YXIgZG9tRXZlbnQgPSBFdmVudENvbnN0cnVjdG9yKGV2ZW50VHlwZSwgeyB0YXJnZXQ6IGRvY3VtZW50IH0pO1xuXHRcdFx0XHR0aGlzLmRpc3BhdGNoTWVzc2FnZShldmVudFR5cGUsIGV2ZW50KTtcblx0XHRcdH1cblx0XHR9XG5cdH1cbn1cblxuXG5mdW5jdGlvbiByZW1vdmVEb21FdmVudExpc3RlbmVyKGV2ZW50VHlwZSkge1xuXHRpZiAodHlwZW9mIGRvY3VtZW50ID09ICdvYmplY3QnKVxuXHRcdGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlLCB0aGlzLCBmYWxzZSk7IC8vIG5vIGNhcHR1cmluZ1xufVxuXG5cbmZ1bmN0aW9uIGZpbHRlckRvbUV2ZW50KGV2ZW50VHlwZSwgbWVzc2FnZSwgZXZlbnQpIHtcblx0aWYgKGV2ZW50VHlwZSA9PSAncmVhZHlzdGF0ZWNoYW5nZScpIHtcblx0XHRpZiAodGhpcy5fZG9tUmVhZHlGaXJlZCkgcmV0dXJuIGZhbHNlO1xuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnX2RvbVJlYWR5RmlyZWQnLCB7XG5cdFx0XHR3cml0YWJsZTogdHJ1ZSxcblx0XHRcdHZhbHVlOiB0cnVlXG5cdFx0fSk7XG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cbn07XG5cblxuIC8vIGV2ZW50IGRpc3BhdGNoZXIgLSBhcyBkZWZpbmVkIGJ5IEV2ZW50IERPTSBBUElcbmZ1bmN0aW9uIGhhbmRsZUV2ZW50KGV2ZW50KSB7XG5cdHRoaXMuZGlzcGF0Y2hNZXNzYWdlKGV2ZW50LnR5cGUsIGV2ZW50KTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIE1peGluID0gcmVxdWlyZSgnLi4vYWJzdHJhY3QvbWl4aW4nKVxuXHQsIE1lc3NhZ2VTb3VyY2UgPSByZXF1aXJlKCcuL21lc3NhZ2Vfc291cmNlJylcblx0LCBfID0gcmVxdWlyZSgnbW9sLXByb3RvJylcblx0LCBjaGVjayA9IHJlcXVpcmUoJy4uL3V0aWwvY2hlY2snKVxuXHQsIE1hdGNoID0gY2hlY2suTWF0Y2hcblx0LCBNZXNzZW5nZXJFcnJvciA9IHJlcXVpcmUoJy4uL3V0aWwvZXJyb3InKS5NZXNzZW5nZXI7XG5cblxudmFyIGV2ZW50c1NwbGl0UmVnRXhwID0gL1xccyooPzpcXCx8XFxzKVxccyovO1xuXG5cbnZhciBNZXNzZW5nZXIgPSBfLmNyZWF0ZVN1YmNsYXNzKE1peGluLCAnTWVzc2VuZ2VyJyk7XG5cbl8uZXh0ZW5kUHJvdG8oTWVzc2VuZ2VyLCB7XG5cdGluaXQ6IGluaXRNZXNzZW5nZXIsIC8vIGNhbGxlZCBieSBNaXhpbiAoc3VwZXJjbGFzcylcblx0b25NZXNzYWdlOiByZWdpc3RlclN1YnNjcmliZXIsXG5cdG9mZk1lc3NhZ2U6IHJlbW92ZVN1YnNjcmliZXIsXG5cdG9uTWVzc2FnZXM6IHJlZ2lzdGVyU3Vic2NyaWJlcnMsXG5cdG9mZk1lc3NhZ2VzOiByZW1vdmVTdWJzY3JpYmVycyxcblx0cG9zdE1lc3NhZ2U6IHBvc3RNZXNzYWdlLFxuXHRnZXRTdWJzY3JpYmVyczogZ2V0TWVzc2FnZVN1YnNjcmliZXJzLFxuXHRfY2hvb3NlU3Vic2NyaWJlcnNIYXNoOiBfY2hvb3NlU3Vic2NyaWJlcnNIYXNoLFxuXHRfcmVnaXN0ZXJTdWJzY3JpYmVyOiBfcmVnaXN0ZXJTdWJzY3JpYmVyLFxuXHRfcmVtb3ZlU3Vic2NyaWJlcjogX3JlbW92ZVN1YnNjcmliZXIsXG5cdF9yZW1vdmVBbGxTdWJzY3JpYmVyczogX3JlbW92ZUFsbFN1YnNjcmliZXJzLFxuXHRfY2FsbFBhdHRlcm5TdWJzY3JpYmVyczogX2NhbGxQYXR0ZXJuU3Vic2NyaWJlcnMsXG5cdF9jYWxsU3Vic2NyaWJlcnM6IF9jYWxsU3Vic2NyaWJlcnMsXG5cdF9zZXRNZXNzYWdlU291cmNlOiBfc2V0TWVzc2FnZVNvdXJjZVxufSk7XG5cblxuTWVzc2VuZ2VyLmRlZmF1bHRNZXRob2RzID0ge1xuXHRvbjogJ29uTWVzc2FnZScsXG5cdG9mZjogJ29mZk1lc3NhZ2UnLFxuXHRvbk1lc3NhZ2VzOiAnb25NZXNzYWdlcycsXG5cdG9mZk1lc3NhZ2VzOiAnb2ZmTWVzc2FnZXMnLFxuXHRwb3N0TWVzc2FnZTogJ3Bvc3RNZXNzYWdlJyxcblx0Z2V0U3Vic2NyaWJlcnM6ICdnZXRTdWJzY3JpYmVycydcbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBNZXNzZW5nZXI7XG5cblxuZnVuY3Rpb24gaW5pdE1lc3Nlbmdlcihob3N0T2JqZWN0LCBwcm94eU1ldGhvZHMsIG1lc3NhZ2VTb3VyY2UpIHtcblx0Y2hlY2sobWVzc2FnZVNvdXJjZSwgTWF0Y2guT3B0aW9uYWwoTWVzc2FnZVNvdXJjZSkpO1xuXG5cdC8vIGhvc3RPYmplY3QgYW5kIHByb3h5TWV0aG9kcyBhcmUgdXNlZCBpbiBNaXhpblxuIFx0Ly8gbWVzc2VuZ2VyIGRhdGFcbiBcdE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRoaXMsIHtcbiBcdFx0X21lc3NhZ2VTdWJzY3JpYmVyczogeyB2YWx1ZToge30gfSxcbiBcdFx0X3BhdHRlcm5NZXNzYWdlU3Vic2NyaWJlcnM6IHsgdmFsdWU6IHt9IH0sXG4gXHRcdF9tZXNzYWdlU291cmNlOiB7IHZhbHVlOiBtZXNzYWdlU291cmNlLCB3cml0YWJsZTogdHJ1ZSB9XG4gXHR9KTtcblxuIFx0aWYgKG1lc3NhZ2VTb3VyY2UpXG4gXHRcdG1lc3NhZ2VTb3VyY2UubWVzc2VuZ2VyID0gdGhpcztcbn1cblxuXG5mdW5jdGlvbiByZWdpc3RlclN1YnNjcmliZXIobWVzc2FnZXMsIHN1YnNjcmliZXIpIHtcblx0Y2hlY2sobWVzc2FnZXMsIE1hdGNoLk9uZU9mKFN0cmluZywgW1N0cmluZ10sIFJlZ0V4cCkpO1xuXHRjaGVjayhzdWJzY3JpYmVyLCBGdW5jdGlvbik7IFxuXG5cdGlmICh0eXBlb2YgbWVzc2FnZXMgPT0gJ3N0cmluZycpXG5cdFx0bWVzc2FnZXMgPSBtZXNzYWdlcy5zcGxpdChldmVudHNTcGxpdFJlZ0V4cCk7XG5cblx0dmFyIHN1YnNjcmliZXJzSGFzaCA9IHRoaXMuX2Nob29zZVN1YnNjcmliZXJzSGFzaChtZXNzYWdlcyk7XG5cblx0aWYgKG1lc3NhZ2VzIGluc3RhbmNlb2YgUmVnRXhwKVxuXHRcdHJldHVybiB0aGlzLl9yZWdpc3RlclN1YnNjcmliZXIoc3Vic2NyaWJlcnNIYXNoLCBtZXNzYWdlcywgc3Vic2NyaWJlcik7XG5cblx0ZWxzZSB7XG5cdFx0dmFyIHdhc1JlZ2lzdGVyZWQgPSBmYWxzZTtcblxuXHRcdG1lc3NhZ2VzLmZvckVhY2goZnVuY3Rpb24obWVzc2FnZSkge1xuXHRcdFx0dmFyIG5vdFlldFJlZ2lzdGVyZWQgPSB0aGlzLl9yZWdpc3RlclN1YnNjcmliZXIoc3Vic2NyaWJlcnNIYXNoLCBtZXNzYWdlLCBzdWJzY3JpYmVyKTtcdFx0XHRcblx0XHRcdHdhc1JlZ2lzdGVyZWQgPSB3YXNSZWdpc3RlcmVkIHx8IG5vdFlldFJlZ2lzdGVyZWQ7XHRcdFx0XG5cdFx0fSwgdGhpcyk7XG5cblx0XHRyZXR1cm4gd2FzUmVnaXN0ZXJlZDtcblx0fVxufVxuXG5cbmZ1bmN0aW9uIF9yZWdpc3RlclN1YnNjcmliZXIoc3Vic2NyaWJlcnNIYXNoLCBtZXNzYWdlLCBzdWJzY3JpYmVyKSB7XG5cdGlmICghIChzdWJzY3JpYmVyc0hhc2hbbWVzc2FnZV0gJiYgc3Vic2NyaWJlcnNIYXNoW21lc3NhZ2VdLmxlbmd0aCkpIHtcblx0XHRzdWJzY3JpYmVyc0hhc2hbbWVzc2FnZV0gPSBbXTtcblx0XHR2YXIgbm9TdWJzY3JpYmVycyA9IHRydWU7XG5cdFx0aWYgKHRoaXMuX21lc3NhZ2VTb3VyY2UpXG5cdFx0XHR0aGlzLl9tZXNzYWdlU291cmNlLm9uU3Vic2NyaWJlckFkZGVkKG1lc3NhZ2UpO1xuXHR9XG5cblx0dmFyIG1zZ1N1YnNjcmliZXJzID0gc3Vic2NyaWJlcnNIYXNoW21lc3NhZ2VdO1xuXHR2YXIgbm90WWV0UmVnaXN0ZXJlZCA9IG5vU3Vic2NyaWJlcnMgfHwgbXNnU3Vic2NyaWJlcnMuaW5kZXhPZihzdWJzY3JpYmVyKSA9PSAtMTtcblxuXHRpZiAobm90WWV0UmVnaXN0ZXJlZClcblx0XHRtc2dTdWJzY3JpYmVycy5wdXNoKHN1YnNjcmliZXIpO1xuXG5cdHJldHVybiBub3RZZXRSZWdpc3RlcmVkO1xufVxuXG5cbmZ1bmN0aW9uIHJlZ2lzdGVyU3Vic2NyaWJlcnMobWVzc2FnZVN1YnNjcmliZXJzKSB7XG5cdGNoZWNrKG1lc3NhZ2VTdWJzY3JpYmVycywgTWF0Y2guT2JqZWN0SGFzaChGdW5jdGlvbikpO1xuXG5cdHZhciBub3RZZXRSZWdpc3RlcmVkTWFwID0gXy5tYXBLZXlzKG1lc3NhZ2VTdWJzY3JpYmVycywgZnVuY3Rpb24oc3Vic2NyaWJlciwgbWVzc2FnZXMpIHtcblx0XHRyZXR1cm4gdGhpcy5vbk1lc3NhZ2UobWVzc2FnZXMsIHN1YnNjcmliZXIpXG5cdH0sIHRoaXMpO1xuXG5cdHJldHVybiBub3RZZXRSZWdpc3RlcmVkTWFwO1xufVxuXG5cbi8vIHJlbW92ZXMgYWxsIHN1YnNjcmliZXJzIGZvciB0aGUgbWVzc2FnZSBpZiBzdWJzY3JpYmVyIGlzbid0IHN1cHBsaWVkXG5mdW5jdGlvbiByZW1vdmVTdWJzY3JpYmVyKG1lc3NhZ2VzLCBzdWJzY3JpYmVyKSB7XG5cdGNoZWNrKG1lc3NhZ2VzLCBNYXRjaC5PbmVPZihTdHJpbmcsIFtTdHJpbmddLCBSZWdFeHApKTtcblx0Y2hlY2soc3Vic2NyaWJlciwgTWF0Y2guT3B0aW9uYWwoRnVuY3Rpb24pKTsgXG5cblx0aWYgKHR5cGVvZiBtZXNzYWdlcyA9PSAnc3RyaW5nJylcblx0XHRtZXNzYWdlcyA9IG1lc3NhZ2VzLnNwbGl0KGV2ZW50c1NwbGl0UmVnRXhwKTtcblxuXHR2YXIgc3Vic2NyaWJlcnNIYXNoID0gdGhpcy5fY2hvb3NlU3Vic2NyaWJlcnNIYXNoKG1lc3NhZ2VzKTtcblxuXHRpZiAobWVzc2FnZXMgaW5zdGFuY2VvZiBSZWdFeHApXG5cdFx0cmV0dXJuIHRoaXMuX3JlbW92ZVN1YnNjcmliZXIoc3Vic2NyaWJlcnNIYXNoLCBtZXNzYWdlcywgc3Vic2NyaWJlcik7XG5cblx0ZWxzZSB7XG5cdFx0dmFyIHdhc1JlbW92ZWQgPSBmYWxzZTtcblxuXHRcdG1lc3NhZ2VzLmZvckVhY2goZnVuY3Rpb24obWVzc2FnZSkge1xuXHRcdFx0dmFyIHN1YnNjcmliZXJSZW1vdmVkID0gdGhpcy5fcmVtb3ZlU3Vic2NyaWJlcihzdWJzY3JpYmVyc0hhc2gsIG1lc3NhZ2UsIHN1YnNjcmliZXIpO1x0XHRcdFxuXHRcdFx0d2FzUmVtb3ZlZCA9IHdhc1JlbW92ZWQgfHwgc3Vic2NyaWJlclJlbW92ZWQ7XHRcdFx0XG5cdFx0fSwgdGhpcyk7XG5cblx0XHRyZXR1cm4gd2FzUmVtb3ZlZDtcblx0fVxufVxuXG5cbmZ1bmN0aW9uIF9yZW1vdmVTdWJzY3JpYmVyKHN1YnNjcmliZXJzSGFzaCwgbWVzc2FnZSwgc3Vic2NyaWJlcikge1xuXHR2YXIgbXNnU3Vic2NyaWJlcnMgPSBzdWJzY3JpYmVyc0hhc2hbbWVzc2FnZV07XG5cdGlmICghIG1zZ1N1YnNjcmliZXJzIHx8ICEgbXNnU3Vic2NyaWJlcnMubGVuZ3RoKVxuXHRcdHJldHVybiBmYWxzZTsgLy8gbm90aGluZyByZW1vdmVkXG5cblx0aWYgKHN1YnNjcmliZXIpIHtcblx0XHR2YXIgc3Vic2NyaWJlckluZGV4ID0gbXNnU3Vic2NyaWJlcnMuaW5kZXhPZihzdWJzY3JpYmVyKTtcblx0XHRpZiAoc3Vic2NyaWJlckluZGV4ID09IC0xKSBcblx0XHRcdHJldHVybiBmYWxzZTsgLy8gbm90aGluZyByZW1vdmVkXG5cdFx0bXNnU3Vic2NyaWJlcnMuc3BsaWNlKHN1YnNjcmliZXJJbmRleCwgMSk7XG5cdFx0aWYgKCEgbXNnU3Vic2NyaWJlcnMubGVuZ3RoKVxuXHRcdFx0dGhpcy5fcmVtb3ZlQWxsU3Vic2NyaWJlcnMoc3Vic2NyaWJlcnNIYXNoLCBtZXNzYWdlKTtcblxuXHR9IGVsc2UgXG5cdFx0dGhpcy5fcmVtb3ZlQWxsU3Vic2NyaWJlcnMoc3Vic2NyaWJlcnNIYXNoLCBtZXNzYWdlKTtcblxuXHRyZXR1cm4gdHJ1ZTsgLy8gc3Vic2NyaWJlcihzKSByZW1vdmVkXG59XG5cblxuZnVuY3Rpb24gX3JlbW92ZUFsbFN1YnNjcmliZXJzKHN1YnNjcmliZXJzSGFzaCwgbWVzc2FnZSkge1xuXHRkZWxldGUgc3Vic2NyaWJlcnNIYXNoW21lc3NhZ2VdO1xuXHRpZiAodGhpcy5fbWVzc2FnZVNvdXJjZSlcblx0XHR0aGlzLl9tZXNzYWdlU291cmNlLm9uU3Vic2NyaWJlclJlbW92ZWQobWVzc2FnZSk7XG59XG5cblxuZnVuY3Rpb24gcmVtb3ZlU3Vic2NyaWJlcnMobWVzc2FnZVN1YnNjcmliZXJzKSB7XG5cdGNoZWNrKG1lc3NhZ2VTdWJzY3JpYmVycywgTWF0Y2guT2JqZWN0SGFzaChGdW5jdGlvbikpO1xuXG5cdHZhciBzdWJzY3JpYmVyUmVtb3ZlZE1hcCA9IF8ubWFwS2V5cyhtZXNzYWdlU3Vic2NyaWJlcnMsIGZ1bmN0aW9uKHN1YnNjcmliZXIsIG1lc3NhZ2VzKSB7XG5cdFx0cmV0dXJuIHRoaXMub2ZmTWVzc2FnZXMobWVzc2FnZXMsIHN1YnNjcmliZXIpXG5cdH0sIHRoaXMpO1xuXG5cdHJldHVybiBzdWJzY3JpYmVyUmVtb3ZlZE1hcDtcdFxufVxuXG5cbi8vIFRPRE8gLSBzZW5kIGV2ZW50IHRvIG1lc3NhZ2VTb3VyY2VcblxuXG5mdW5jdGlvbiBwb3N0TWVzc2FnZShtZXNzYWdlLCBkYXRhKSB7XG5cdGNoZWNrKG1lc3NhZ2UsIE1hdGNoLk9uZU9mKFN0cmluZywgUmVnRXhwKSk7XG5cblx0dmFyIHN1YnNjcmliZXJzSGFzaCA9IHRoaXMuX2Nob29zZVN1YnNjcmliZXJzSGFzaChtZXNzYWdlKTtcblx0dmFyIG1zZ1N1YnNjcmliZXJzID0gc3Vic2NyaWJlcnNIYXNoW21lc3NhZ2VdO1xuXG5cdHRoaXMuX2NhbGxTdWJzY3JpYmVycyhtZXNzYWdlLCBkYXRhLCBtc2dTdWJzY3JpYmVycyk7XG5cblx0aWYgKHR5cGVvZiBtZXNzYWdlID09ICdzdHJpbmcnKVxuXHRcdHRoaXMuX2NhbGxQYXR0ZXJuU3Vic2NyaWJlcnMobWVzc2FnZSwgZGF0YSk7XG59XG5cblxuZnVuY3Rpb24gX2NhbGxQYXR0ZXJuU3Vic2NyaWJlcnMobWVzc2FnZSwgZGF0YSkge1xuXHRfLmVhY2hLZXkodGhpcy5fcGF0dGVybk1lc3NhZ2VTdWJzY3JpYmVycywgXG5cdFx0ZnVuY3Rpb24ocGF0dGVyblN1YnNjcmliZXJzLCBwYXR0ZXJuKSB7XG5cdFx0XHRpZiAocGF0dGVybi50ZXN0KG1lc3NhZ2UpKVxuXHRcdFx0XHR0aGlzLl9jYWxsU3Vic2NyaWJlcnMobWVzc2FnZSwgZGF0YSwgcGF0dGVyblN1YnNjcmliZXJzKTtcblx0XHR9XG5cdCwgdGhpcyk7XG59XG5cblxuZnVuY3Rpb24gX2NhbGxTdWJzY3JpYmVycyhtZXNzYWdlLCBkYXRhLCBtc2dTdWJzY3JpYmVycykge1xuXHRpZiAobXNnU3Vic2NyaWJlcnMgJiYgbXNnU3Vic2NyaWJlcnMubGVuZ3RoKVxuXHRcdG1zZ1N1YnNjcmliZXJzLmZvckVhY2goZnVuY3Rpb24oc3Vic2NyaWJlcikge1xuXHRcdFx0c3Vic2NyaWJlci5jYWxsKHRoaXMuX2hvc3RPYmplY3QsIG1lc3NhZ2UsIGRhdGEpO1xuXHRcdH0sIHRoaXMpO1xufVxuXG5cbmZ1bmN0aW9uIGdldE1lc3NhZ2VTdWJzY3JpYmVycyhtZXNzYWdlLCBpbmNsdWRlUGF0dGVyblN1YnNjcmliZXJzKSB7XG5cdGNoZWNrKG1lc3NhZ2UsIE1hdGNoLk9uZU9mKFN0cmluZywgUmVnRXhwKSk7XG5cblx0dmFyIHN1YnNjcmliZXJzSGFzaCA9IHRoaXMuX2Nob29zZVN1YnNjcmliZXJzSGFzaChtZXNzYWdlKTtcblx0dmFyIG1zZ1N1YnNjcmliZXJzID0gc3Vic2NyaWJlcnNIYXNoW21lc3NhZ2VdXG5cdFx0XHRcdFx0XHRcdD8gW10uY29uY2F0KHN1YnNjcmliZXJzSGFzaFttZXNzYWdlXSlcblx0XHRcdFx0XHRcdFx0OiBbXTtcblxuXHQvLyBwYXR0ZXJuIHN1YnNjcmliZXJzIGFyZSBpbmN1ZGVkIGJ5IGRlZmF1bHRcblx0aWYgKGluY2x1ZGVQYXR0ZXJuU3Vic2NyaWJlcnMgIT09IGZhbHNlICYmIHR5cGVvZiBtZXNzYWdlID09ICdzdHJpbmcnKSB7XG5cdFx0Xy5lYWNoS2V5KHRoaXMuX3BhdHRlcm5NZXNzYWdlU3Vic2NyaWJlcnMsIFxuXHRcdFx0ZnVuY3Rpb24ocGF0dGVyblN1YnNjcmliZXJzLCBwYXR0ZXJuKSB7XG5cdFx0XHRcdGlmIChwYXR0ZXJuU3Vic2NyaWJlcnMgJiYgcGF0dGVyblN1YnNjcmliZXJzLmxlbmd0aFxuXHRcdFx0XHRcdFx0JiYgcGF0dGVybi50ZXN0KG1lc3NhZ2UpKVxuXHRcdFx0XHRcdF8uYXBwZW5kQXJyYXkobXNnU3Vic2NyaWJlcnMsIHBhdHRlcm5TdWJzY3JpYmVycyk7XG5cdFx0XHR9XG5cdFx0KTtcblx0fVxuXG5cdHJldHVybiBtc2dTdWJzY3JpYmVycy5sZW5ndGhcblx0XHRcdFx0PyBtc2dTdWJzY3JpYmVyc1xuXHRcdFx0XHQ6IHVuZGVmaW5lZDtcbn1cblxuXG5mdW5jdGlvbiBfY2hvb3NlU3Vic2NyaWJlcnNIYXNoKG1lc3NhZ2UpIHtcblx0cmV0dXJuIG1lc3NhZ2UgaW5zdGFuY2VvZiBSZWdFeHBcblx0XHRcdFx0PyB0aGlzLl9wYXR0ZXJuTWVzc2FnZVN1YnNjcmliZXJzXG5cdFx0XHRcdDogdGhpcy5fbWVzc2FnZVN1YnNjcmliZXJzO1xufVxuXG5cbmZ1bmN0aW9uIF9zZXRNZXNzYWdlU291cmNlKG1lc3NhZ2VTb3VyY2UpIHtcblx0Y2hlY2sobWVzc2FnZVNvdXJjZSwgTWVzc2FnZVNvdXJjZSk7XG5cbiBcdE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRoaXMsIHtcbiBcdFx0X21lc3NhZ2VTb3VyY2U6IHsgdmFsdWU6IG1lc3NhZ2VTb3VyY2UgfVxuIFx0fSk7XG4gXHRtZXNzYWdlU291cmNlLm1lc3NlbmdlciA9IHRoaXM7XG59XG5cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIE1peGluID0gcmVxdWlyZSgnLi4vYWJzdHJhY3QvbWl4aW4nKVxuXHQsIGxvZ2dlciA9IHJlcXVpcmUoJy4uL3V0aWwvbG9nZ2VyJylcblx0LCB0b0JlSW1wbGVtZW50ZWQgPSByZXF1aXJlKCcuLi91dGlsL2Vycm9yJykudG9CZUltcGxlbWVudGVkXG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpO1xuXG4vLyBhbiBhYnN0cmFjdCBjbGFzcyBmb3IgZGlzcGF0Y2hpbmcgZXh0ZXJuYWwgdG8gaW50ZXJuYWwgZXZlbnRzXG52YXIgTWVzc2FnZVNvdXJjZSA9IF8uY3JlYXRlU3ViY2xhc3MoTWl4aW4sICdNZXNzYWdlU291cmNlJywgdHJ1ZSk7XG5cbm1vZHVsZS5leHBvcnRzID0gTWVzc2FnZVNvdXJjZTtcblxuXG5fLmV4dGVuZFByb3RvKE1lc3NhZ2VTb3VyY2UsIHtcblx0Ly8gaW5pdGlhbGl6ZXMgbWVzc2FnZVNvdXJjZSAtIGNhbGxlZCBieSBNaXhpbiBzdXBlcmNsYXNzXG5cdGluaXQ6IGluaXRNZXNzYWdlU291cmNlLFxuXG5cdC8vIGNhbGxlZCBieSBNZXNzZW5nZXIgdG8gbm90aWZ5IHdoZW4gdGhlIGZpcnN0IHN1YnNjcmliZXIgZm9yIGFuIGludGVybmFsIG1lc3NhZ2Ugd2FzIGFkZGVkXG5cdG9uU3Vic2NyaWJlckFkZGVkOiBvblN1YnNjcmliZXJBZGRlZCxcblxuXHQvLyBjYWxsZWQgYnkgTWVzc2VuZ2VyIHRvIG5vdGlmeSB3aGVuIHRoZSBsYXN0IHN1YnNjcmliZXIgZm9yIGFuIGludGVybmFsIG1lc3NhZ2Ugd2FzIHJlbW92ZWRcbiBcdG9uU3Vic2NyaWJlclJlbW92ZWQ6IG9uU3Vic2NyaWJlclJlbW92ZWQsIFxuXG4gXHQvLyBkaXNwYXRjaGVzIHNvdXJjZSBtZXNzYWdlXG4gXHRkaXNwYXRjaE1lc3NhZ2U6IGRpc3BhdGNoU291cmNlTWVzc2FnZSxcblxuXHQvLyBmaWx0ZXJzIHNvdXJjZSBtZXNzYWdlIGJhc2VkIG9uIHRoZSBkYXRhIG9mIHRoZSBtZXNzYWdlIC0gc2hvdWxkIGJlIGltcGxlbWVudGVkIGluIHN1YmNsYXNzXG5cdGZpbHRlclNvdXJjZU1lc3NhZ2U6IGRpc3BhdGNoQWxsU291cmNlTWVzc2FnZXMsXG5cbiBcdC8vICoqKlxuIFx0Ly8gTWV0aG9kcyBiZWxvdyBtdXN0IGJlIGltcGxlbWVudGVkIGluIHN1YmNsYXNzXG4gXHRcblx0Ly8gY29udmVydHMgaW50ZXJuYWwgbWVzc2FnZSB0eXBlIHRvIGV4dGVybmFsIG1lc3NhZ2UgdHlwZSAtIHNob3VsZCBiZSBpbXBsZW1lbnRlZCBpbiBzdWJjbGFzc1xuXHR0cmFuc2xhdGVUb1NvdXJjZU1lc3NhZ2U6IHRvQmVJbXBsZW1lbnRlZCxcblxuIFx0Ly8gYWRkcyBsaXN0ZW5lciB0byBleHRlcm5hbCBtZXNzYWdlIC0gc2hvdWxkIGJlIGltcGxlbWVudGVkIGJ5IHN1YmNsYXNzXG4gXHRhZGRTb3VyY2VMaXN0ZW5lcjogdG9CZUltcGxlbWVudGVkLFxuXG4gXHQvLyByZW1vdmVzIGxpc3RlbmVyIGZyb20gZXh0ZXJuYWwgbWVzc2FnZSAtIHNob3VsZCBiZSBpbXBsZW1lbnRlZCBieSBzdWJjbGFzc1xuIFx0cmVtb3ZlU291cmNlTGlzdGVuZXI6IHRvQmVJbXBsZW1lbnRlZCxcbn0pO1xuXG5cbmZ1bmN0aW9uIGluaXRNZXNzYWdlU291cmNlKCkge1xuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ19pbnRlcm5hbE1lc3NhZ2VzJywgeyB2YWx1ZToge30gfSk7XG59XG5cblxuZnVuY3Rpb24gb25TdWJzY3JpYmVyQWRkZWQobWVzc2FnZSkge1xuXHR2YXIgc291cmNlTWVzc2FnZSA9IHRoaXMudHJhbnNsYXRlVG9Tb3VyY2VNZXNzYWdlKG1lc3NhZ2UpO1xuXG5cdGlmICghIHNvdXJjZU1lc3NhZ2UpIHJldHVybjtcblxuXHRpZiAoISB0aGlzLl9pbnRlcm5hbE1lc3NhZ2VzLmhhc093blByb3BlcnR5KHNvdXJjZU1lc3NhZ2UpKSB7XG5cdFx0dGhpcy5hZGRTb3VyY2VMaXN0ZW5lcihzb3VyY2VNZXNzYWdlKTtcblx0XHR0aGlzLl9pbnRlcm5hbE1lc3NhZ2VzW3NvdXJjZU1lc3NhZ2VdID0gW107XG5cdH1cblx0dmFyIGludGVybmFsTXNncyA9IHRoaXMuX2ludGVybmFsTWVzc2FnZXNbc291cmNlTWVzc2FnZV07XG5cblx0aWYgKGludGVybmFsTXNncy5pbmRleE9mKG1lc3NhZ2UpID09IC0xKVxuXHRcdGludGVybmFsTXNncy5wdXNoKG1lc3NhZ2UpO1xuXHRlbHNlXG5cdFx0bG9nZ2VyLndhcm4oJ0R1cGxpY2F0ZSBub3RpZmljYXRpb24gcmVjZWl2ZWQ6IGZvciBzdWJzY3JpYmUgdG8gaW50ZXJuYWwgbWVzc2FnZSAnICsgbWVzc2FnZSk7XG59XG5cblxuZnVuY3Rpb24gb25TdWJzY3JpYmVyUmVtb3ZlZChtZXNzYWdlKSB7XG5cdHZhciBzb3VyY2VNZXNzYWdlID0gdGhpcy50cmFuc2xhdGVUb1NvdXJjZU1lc3NhZ2UobWVzc2FnZSk7XG5cblx0aWYgKCEgc291cmNlTWVzc2FnZSkgcmV0dXJuO1xuXG5cdHZhciBpbnRlcm5hbE1zZ3MgPSB0aGlzLl9pbnRlcm5hbE1lc3NhZ2VzW3NvdXJjZU1lc3NhZ2VdO1xuXG5cdGlmIChpbnRlcm5hbE1zZ3MgJiYgaW50ZXJuYWxNc2dzLmxlbmd0aCkge1xuXHRcdG1lc3NhZ2VJbmRleCA9IGludGVybmFsTXNncy5pbmRleE9mKG1lc3NhZ2UpO1xuXHRcdGlmIChtZXNzYWdlSW5kZXggPj0gMCkge1xuXHRcdFx0aW50ZXJuYWxNc2dzLnNwbGljZShtZXNzYWdlSW5kZXgsIDEpO1xuXHRcdFx0aWYgKGludGVybmFsTXNncy5sZW5ndGggPT0gMCkge1xuXHRcdFx0XHRkZWxldGUgdGhpcy5faW50ZXJuYWxNZXNzYWdlc1tzb3VyY2VNZXNzYWdlXTtcblx0XHRcdFx0dGhpcy5yZW1vdmVTb3VyY2VMaXN0ZW5lcihzb3VyY2VNZXNzYWdlKTtcblx0XHRcdH1cblx0XHR9IGVsc2Vcblx0XHRcdHVuZXhwZWN0ZWROb3RpZmljYXRpb25XYXJuaW5nKCk7XG5cdH0gZWxzZVxuXHRcdHVuZXhwZWN0ZWROb3RpZmljYXRpb25XYXJuaW5nKCk7XG5cblxuXHRmdW5jdGlvbiB1bmV4cGVjdGVkTm90aWZpY2F0aW9uV2FybmluZygpIHtcblx0XHRsb2dnZXIud2Fybignbm90aWZpY2F0aW9uIHJlY2VpdmVkOiB1bi1zdWJzY3JpYmUgZnJvbSBpbnRlcm5hbCBtZXNzYWdlICcgKyBtZXNzYWdlXG5cdFx0XHRcdFx0ICsgJyB3aXRob3V0IHByZXZpb3VzIHN1YnNjcmlwdGlvbiBub3RpZmljYXRpb24nKTtcblx0fVxufVxuXG5cbmZ1bmN0aW9uIGRpc3BhdGNoU291cmNlTWVzc2FnZShzb3VyY2VNZXNzYWdlLCBkYXRhKSB7XG5cdHZhciBpbnRlcm5hbE1zZ3MgPSB0aGlzLl9pbnRlcm5hbE1lc3NhZ2VzW3NvdXJjZU1lc3NhZ2VdO1xuXG5cdGlmIChpbnRlcm5hbE1zZ3MgJiYgaW50ZXJuYWxNc2dzLmxlbmd0aClcblx0XHRpbnRlcm5hbE1zZ3MuZm9yRWFjaChmdW5jdGlvbihtZXNzYWdlKSB7XG5cdFx0XHRpZiAodGhpcy5maWx0ZXJTb3VyY2VNZXNzYWdlXG5cdFx0XHRcdFx0JiYgdGhpcy5maWx0ZXJTb3VyY2VNZXNzYWdlKHNvdXJjZU1lc3NhZ2UsIG1lc3NhZ2UsIGRhdGEpKVxuXHRcdFx0XHR0aGlzLm1lc3Nlbmdlci5wb3N0TWVzc2FnZShtZXNzYWdlLCBkYXRhKTtcblx0XHR9LCB0aGlzKTtcblx0ZWxzZVxuXHRcdGxvZ2dlci53YXJuKCdzb3VyY2UgbWVzc2FnZSByZWNlaXZlZCBmb3Igd2hpY2ggdGhlcmUgaXMgbm8gbWFwcGVkIGludGVybmFsIG1lc3NhZ2UnKTtcbn1cblxuXG4vLyBjYW4gYmUgb3ZlcnJpZGRlbiBpbiBzdWJjbGFzcyB0byBpbXBsZW1lbnQgZmlsdGVyaW5nIGJhc2VkIG9uIG1lc3NhZ2UgZGF0YVxuZnVuY3Rpb24gZGlzcGF0Y2hBbGxTb3VyY2VNZXNzYWdlcyhzb3VyY2VNZXNzYWdlLCBtZXNzYWdlLCBkYXRhKSB7XG5cdHJldHVybiB0cnVlO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgbWlsbyA9IHtcblx0bG9hZGVyOiByZXF1aXJlKCcuL2xvYWRlcicpLFxuXHRiaW5kZXI6IHJlcXVpcmUoJy4vYmluZGVyJyksXG5cdG1haWw6IHJlcXVpcmUoJy4vbWFpbCcpLFxuXHRjb25maWc6IHJlcXVpcmUoJy4vY29uZmlnJyksXG5cdHV0aWw6IHJlcXVpcmUoJy4vdXRpbCcpLFxuXHRjbGFzc2VzOiByZXF1aXJlKCcuL2NsYXNzZXMnKVxufVxuXG5cbi8vIHVzZWQgZmFjZXRzXG5yZXF1aXJlKCcuL2NvbXBvbmVudHMvY19mYWNldHMvRG9tJyk7XG5yZXF1aXJlKCcuL2NvbXBvbmVudHMvY19mYWNldHMvRGF0YScpO1xucmVxdWlyZSgnLi9jb21wb25lbnRzL2NfZmFjZXRzL0ZyYW1lJyk7XG5yZXF1aXJlKCcuL2NvbXBvbmVudHMvY19mYWNldHMvRXZlbnRzJyk7XG5yZXF1aXJlKCcuL2NvbXBvbmVudHMvY19mYWNldHMvVGVtcGxhdGUnKTtcbnJlcXVpcmUoJy4vY29tcG9uZW50cy9jX2ZhY2V0cy9Db250YWluZXInKTtcbnJlcXVpcmUoJy4vY29tcG9uZW50cy9jX2ZhY2V0cy9EcmFnJyk7XG5yZXF1aXJlKCcuL2NvbXBvbmVudHMvY19mYWNldHMvRHJvcCcpO1xucmVxdWlyZSgnLi9jb21wb25lbnRzL2NfZmFjZXRzL0VkaXRhYmxlJyk7XG5cbi8vIHVzZWQgY29tcG9uZW50c1xucmVxdWlyZSgnLi9jb21wb25lbnRzL2NsYXNzZXMvVmlldycpO1xuXG5cbi8vIGV4cG9ydCBmb3Igbm9kZS9icm93c2VyaWZ5XG5pZiAodHlwZW9mIG1vZHVsZSA9PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cylcdFxuXHRtb2R1bGUuZXhwb3J0cyA9IG1pbG87XG5cbi8vIGdsb2JhbCBtaWxvIGZvciBicm93c2VyXG5pZiAodHlwZW9mIHdpbmRvdyA9PSAnb2JqZWN0Jylcblx0d2luZG93Lm1pbG8gPSBtaWxvO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyBYWFggZG9jc1xuXG4vLyBUaGluZ3Mgd2UgZXhwbGljaXRseSBkbyBOT1Qgc3VwcG9ydDpcbi8vICAgIC0gaGV0ZXJvZ2Vub3VzIGFycmF5c1xudmFyIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKTtcblxudmFyIGNoZWNrID0gZnVuY3Rpb24gKHZhbHVlLCBwYXR0ZXJuKSB7XG4gIC8vIFJlY29yZCB0aGF0IGNoZWNrIGdvdCBjYWxsZWQsIGlmIHNvbWVib2R5IGNhcmVkLlxuICB0cnkge1xuICAgIGNoZWNrU3VidHJlZSh2YWx1ZSwgcGF0dGVybik7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGlmICgoZXJyIGluc3RhbmNlb2YgTWF0Y2guRXJyb3IpICYmIGVyci5wYXRoKVxuICAgICAgZXJyLm1lc3NhZ2UgKz0gXCIgaW4gZmllbGQgXCIgKyBlcnIucGF0aDtcbiAgICB0aHJvdyBlcnI7XG4gIH1cbn07XG5tb2R1bGUuZXhwb3J0cyA9IGNoZWNrO1xuXG52YXIgTWF0Y2ggPSBjaGVjay5NYXRjaCA9IHtcbiAgT3B0aW9uYWw6IGZ1bmN0aW9uIChwYXR0ZXJuKSB7XG4gICAgcmV0dXJuIG5ldyBPcHRpb25hbChwYXR0ZXJuKTtcbiAgfSxcbiAgT25lT2Y6IGZ1bmN0aW9uICgvKmFyZ3VtZW50cyovKSB7XG4gICAgcmV0dXJuIG5ldyBPbmVPZihhcmd1bWVudHMpO1xuICB9LFxuICBBbnk6IFsnX19hbnlfXyddLFxuICBXaGVyZTogZnVuY3Rpb24gKGNvbmRpdGlvbikge1xuICAgIHJldHVybiBuZXcgV2hlcmUoY29uZGl0aW9uKTtcbiAgfSxcbiAgT2JqZWN0SW5jbHVkaW5nOiBmdW5jdGlvbiAocGF0dGVybikge1xuICAgIHJldHVybiBuZXcgT2JqZWN0SW5jbHVkaW5nKHBhdHRlcm4pO1xuICB9LFxuICAvLyBNYXRjaGVzIG9ubHkgc2lnbmVkIDMyLWJpdCBpbnRlZ2Vyc1xuICBJbnRlZ2VyOiBbJ19faW50ZWdlcl9fJ10sXG5cbiAgLy8gTWF0Y2hlcyBoYXNoIChvYmplY3QpIHdpdGggdmFsdWVzIG1hdGNoaW5nIHBhdHRlcm5cbiAgT2JqZWN0SGFzaDogZnVuY3Rpb24ocGF0dGVybikge1xuICAgIHJldHVybiBuZXcgT2JqZWN0SGFzaChwYXR0ZXJuKTtcbiAgfSxcblxuICBTdWJjbGFzczogZnVuY3Rpb24oU3VwZXJjbGFzcywgbWF0Y2hTdXBlcmNsYXNzVG9vKSB7XG4gICAgcmV0dXJuIG5ldyBTdWJjbGFzcyhTdXBlcmNsYXNzLCBtYXRjaFN1cGVyY2xhc3NUb28pO1xuICB9LFxuXG4gIC8vIFhYWCBtYXRjaGVycyBzaG91bGQga25vdyBob3cgdG8gZGVzY3JpYmUgdGhlbXNlbHZlcyBmb3IgZXJyb3JzXG4gIEVycm9yOiBUeXBlRXJyb3IsXG5cbiAgLy8gTWV0ZW9yLm1ha2VFcnJvclR5cGUoXCJNYXRjaC5FcnJvclwiLCBmdW5jdGlvbiAobXNnKSB7XG4gICAgLy8gdGhpcy5tZXNzYWdlID0gXCJNYXRjaCBlcnJvcjogXCIgKyBtc2c7XG4gICAgLy8gVGhlIHBhdGggb2YgdGhlIHZhbHVlIHRoYXQgZmFpbGVkIHRvIG1hdGNoLiBJbml0aWFsbHkgZW1wdHksIHRoaXMgZ2V0c1xuICAgIC8vIHBvcHVsYXRlZCBieSBjYXRjaGluZyBhbmQgcmV0aHJvd2luZyB0aGUgZXhjZXB0aW9uIGFzIGl0IGdvZXMgYmFjayB1cCB0aGVcbiAgICAvLyBzdGFjay5cbiAgICAvLyBFLmcuOiBcInZhbHNbM10uZW50aXR5LmNyZWF0ZWRcIlxuICAgIC8vIHRoaXMucGF0aCA9IFwiXCI7XG4gICAgLy8gSWYgdGhpcyBnZXRzIHNlbnQgb3ZlciBERFAsIGRvbid0IGdpdmUgZnVsbCBpbnRlcm5hbCBkZXRhaWxzIGJ1dCBhdCBsZWFzdFxuICAgIC8vIHByb3ZpZGUgc29tZXRoaW5nIGJldHRlciB0aGFuIDUwMCBJbnRlcm5hbCBzZXJ2ZXIgZXJyb3IuXG4gIC8vICAgdGhpcy5zYW5pdGl6ZWRFcnJvciA9IG5ldyBNZXRlb3IuRXJyb3IoNDAwLCBcIk1hdGNoIGZhaWxlZFwiKTtcbiAgLy8gfSksXG5cbiAgLy8gVGVzdHMgdG8gc2VlIGlmIHZhbHVlIG1hdGNoZXMgcGF0dGVybi4gVW5saWtlIGNoZWNrLCBpdCBtZXJlbHkgcmV0dXJucyB0cnVlXG4gIC8vIG9yIGZhbHNlICh1bmxlc3MgYW4gZXJyb3Igb3RoZXIgdGhhbiBNYXRjaC5FcnJvciB3YXMgdGhyb3duKS5cbiAgdGVzdDogZnVuY3Rpb24gKHZhbHVlLCBwYXR0ZXJuKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNoZWNrU3VidHJlZSh2YWx1ZSwgcGF0dGVybik7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoZSBpbnN0YW5jZW9mIE1hdGNoLkVycm9yKVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAvLyBSZXRocm93IG90aGVyIGVycm9ycy5cbiAgICAgIHRocm93IGU7XG4gICAgfVxuICB9XG59O1xuXG5mdW5jdGlvbiBPcHRpb25hbChwYXR0ZXJuKSB7XG4gIHRoaXMucGF0dGVybiA9IHBhdHRlcm47XG59O1xuXG5mdW5jdGlvbiBPbmVPZihjaG9pY2VzKSB7XG4gIGlmIChjaG9pY2VzLmxlbmd0aCA9PSAwKVxuICAgIHRocm93IG5ldyBFcnJvcihcIk11c3QgcHJvdmlkZSBhdCBsZWFzdCBvbmUgY2hvaWNlIHRvIE1hdGNoLk9uZU9mXCIpO1xuICB0aGlzLmNob2ljZXMgPSBjaG9pY2VzO1xufTtcblxuZnVuY3Rpb24gV2hlcmUoY29uZGl0aW9uKSB7XG4gIHRoaXMuY29uZGl0aW9uID0gY29uZGl0aW9uO1xufTtcblxuZnVuY3Rpb24gT2JqZWN0SW5jbHVkaW5nKHBhdHRlcm4pIHtcbiAgdGhpcy5wYXR0ZXJuID0gcGF0dGVybjtcbn07XG5cbmZ1bmN0aW9uIE9iamVjdEhhc2gocGF0dGVybikge1xuICB0aGlzLnBhdHRlcm4gPSBwYXR0ZXJuO1xufTtcblxuZnVuY3Rpb24gU3ViY2xhc3MoU3VwZXJjbGFzcywgbWF0Y2hTdXBlcmNsYXNzVG9vKSB7XG4gIHRoaXMuU3VwZXJjbGFzcyA9IFN1cGVyY2xhc3M7XG4gIHRoaXMubWF0Y2hTdXBlcmNsYXNzID0gbWF0Y2hTdXBlcmNsYXNzVG9vO1xufTtcblxudmFyIHR5cGVvZkNoZWNrcyA9IFtcbiAgW1N0cmluZywgXCJzdHJpbmdcIl0sXG4gIFtOdW1iZXIsIFwibnVtYmVyXCJdLFxuICBbQm9vbGVhbiwgXCJib29sZWFuXCJdLFxuICAvLyBXaGlsZSB3ZSBkb24ndCBhbGxvdyB1bmRlZmluZWQgaW4gSlNPTiwgdGhpcyBpcyBnb29kIGZvciBvcHRpb25hbFxuICAvLyBhcmd1bWVudHMgd2l0aCBPbmVPZi5cbiAgW3VuZGVmaW5lZCwgXCJ1bmRlZmluZWRcIl1cbl07XG5cbmZ1bmN0aW9uIGNoZWNrU3VidHJlZSh2YWx1ZSwgcGF0dGVybikge1xuICAvLyBNYXRjaCBhbnl0aGluZyFcbiAgaWYgKHBhdHRlcm4gPT09IE1hdGNoLkFueSlcbiAgICByZXR1cm47XG5cbiAgLy8gQmFzaWMgYXRvbWljIHR5cGVzLlxuICAvLyBEbyBub3QgbWF0Y2ggYm94ZWQgb2JqZWN0cyAoZS5nLiBTdHJpbmcsIEJvb2xlYW4pXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdHlwZW9mQ2hlY2tzLmxlbmd0aDsgKytpKSB7XG4gICAgaWYgKHBhdHRlcm4gPT09IHR5cGVvZkNoZWNrc1tpXVswXSkge1xuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gdHlwZW9mQ2hlY2tzW2ldWzFdKVxuICAgICAgICByZXR1cm47XG4gICAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJFeHBlY3RlZCBcIiArIHR5cGVvZkNoZWNrc1tpXVsxXSArIFwiLCBnb3QgXCIgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGVvZiB2YWx1ZSk7XG4gICAgfVxuICB9XG4gIGlmIChwYXR0ZXJuID09PSBudWxsKSB7XG4gICAgaWYgKHZhbHVlID09PSBudWxsKVxuICAgICAgcmV0dXJuO1xuICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIG51bGwsIGdvdCBcIiArIEpTT04uc3RyaW5naWZ5KHZhbHVlKSk7XG4gIH1cblxuICAvLyBNYXRjaC5JbnRlZ2VyIGlzIHNwZWNpYWwgdHlwZSBlbmNvZGVkIHdpdGggYXJyYXlcbiAgaWYgKHBhdHRlcm4gPT09IE1hdGNoLkludGVnZXIpIHtcbiAgICAvLyBUaGVyZSBpcyBubyBjb25zaXN0ZW50IGFuZCByZWxpYWJsZSB3YXkgdG8gY2hlY2sgaWYgdmFyaWFibGUgaXMgYSA2NC1iaXRcbiAgICAvLyBpbnRlZ2VyLiBPbmUgb2YgdGhlIHBvcHVsYXIgc29sdXRpb25zIGlzIHRvIGdldCByZW1pbmRlciBvZiBkaXZpc2lvbiBieSAxXG4gICAgLy8gYnV0IHRoaXMgbWV0aG9kIGZhaWxzIG9uIHJlYWxseSBsYXJnZSBmbG9hdHMgd2l0aCBiaWcgcHJlY2lzaW9uLlxuICAgIC8vIEUuZy46IDEuMzQ4MTkyMzA4NDkxODI0ZSsyMyAlIDEgPT09IDAgaW4gVjhcbiAgICAvLyBCaXR3aXNlIG9wZXJhdG9ycyB3b3JrIGNvbnNpc3RhbnRseSBidXQgYWx3YXlzIGNhc3QgdmFyaWFibGUgdG8gMzItYml0XG4gICAgLy8gc2lnbmVkIGludGVnZXIgYWNjb3JkaW5nIHRvIEphdmFTY3JpcHQgc3BlY3MuXG4gICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJudW1iZXJcIiAmJiAodmFsdWUgfCAwKSA9PT0gdmFsdWUpXG4gICAgICByZXR1cm5cbiAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJFeHBlY3RlZCBJbnRlZ2VyLCBnb3QgXCJcbiAgICAgICAgICAgICAgICArICh2YWx1ZSBpbnN0YW5jZW9mIE9iamVjdCA/IEpTT04uc3RyaW5naWZ5KHZhbHVlKSA6IHZhbHVlKSk7XG4gIH1cblxuICAvLyBcIk9iamVjdFwiIGlzIHNob3J0aGFuZCBmb3IgTWF0Y2guT2JqZWN0SW5jbHVkaW5nKHt9KTtcbiAgaWYgKHBhdHRlcm4gPT09IE9iamVjdClcbiAgICBwYXR0ZXJuID0gTWF0Y2guT2JqZWN0SW5jbHVkaW5nKHt9KTtcblxuICAvLyBBcnJheSAoY2hlY2tlZCBBRlRFUiBBbnksIHdoaWNoIGlzIGltcGxlbWVudGVkIGFzIGFuIEFycmF5KS5cbiAgaWYgKHBhdHRlcm4gaW5zdGFuY2VvZiBBcnJheSkge1xuICAgIGlmIChwYXR0ZXJuLmxlbmd0aCAhPT0gMSlcbiAgICAgIHRocm93IEVycm9yKFwiQmFkIHBhdHRlcm46IGFycmF5cyBtdXN0IGhhdmUgb25lIHR5cGUgZWxlbWVudFwiICtcbiAgICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHBhdHRlcm4pKTtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJFeHBlY3RlZCBhcnJheSwgZ290IFwiICsgSlNPTi5zdHJpbmdpZnkodmFsdWUpKTtcbiAgICB9XG5cbiAgICB2YWx1ZS5mb3JFYWNoKGZ1bmN0aW9uICh2YWx1ZUVsZW1lbnQsIGluZGV4KSB7XG4gICAgICB0cnkge1xuICAgICAgICBjaGVja1N1YnRyZWUodmFsdWVFbGVtZW50LCBwYXR0ZXJuWzBdKTtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICBpZiAoZXJyIGluc3RhbmNlb2YgTWF0Y2guRXJyb3IpIHtcbiAgICAgICAgICBlcnIucGF0aCA9IF9wcmVwZW5kUGF0aChpbmRleCwgZXJyLnBhdGgpO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IGVycjtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBBcmJpdHJhcnkgdmFsaWRhdGlvbiBjaGVja3MuIFRoZSBjb25kaXRpb24gY2FuIHJldHVybiBmYWxzZSBvciB0aHJvdyBhXG4gIC8vIE1hdGNoLkVycm9yIChpZSwgaXQgY2FuIGludGVybmFsbHkgdXNlIGNoZWNrKCkpIHRvIGZhaWwuXG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgV2hlcmUpIHtcbiAgICBpZiAocGF0dGVybi5jb25kaXRpb24odmFsdWUpKVxuICAgICAgcmV0dXJuO1xuICAgIC8vIFhYWCB0aGlzIGVycm9yIGlzIHRlcnJpYmxlXG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRmFpbGVkIE1hdGNoLldoZXJlIHZhbGlkYXRpb25cIik7XG4gIH1cblxuXG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgT3B0aW9uYWwpXG4gICAgcGF0dGVybiA9IE1hdGNoLk9uZU9mKHVuZGVmaW5lZCwgcGF0dGVybi5wYXR0ZXJuKTtcblxuICBpZiAocGF0dGVybiBpbnN0YW5jZW9mIE9uZU9mKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXR0ZXJuLmNob2ljZXMubGVuZ3RoOyArK2kpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNoZWNrU3VidHJlZSh2YWx1ZSwgcGF0dGVybi5jaG9pY2VzW2ldKTtcbiAgICAgICAgLy8gTm8gZXJyb3I/IFlheSwgcmV0dXJuLlxuICAgICAgICByZXR1cm47XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgLy8gT3RoZXIgZXJyb3JzIHNob3VsZCBiZSB0aHJvd24uIE1hdGNoIGVycm9ycyBqdXN0IG1lYW4gdHJ5IGFub3RoZXJcbiAgICAgICAgLy8gY2hvaWNlLlxuICAgICAgICBpZiAoIShlcnIgaW5zdGFuY2VvZiBNYXRjaC5FcnJvcikpXG4gICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBYWFggdGhpcyBlcnJvciBpcyB0ZXJyaWJsZVxuICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkZhaWxlZCBNYXRjaC5PbmVPZiBvciBNYXRjaC5PcHRpb25hbCB2YWxpZGF0aW9uXCIpO1xuICB9XG5cbiAgLy8gQSBmdW5jdGlvbiB0aGF0IGlzbid0IHNvbWV0aGluZyB3ZSBzcGVjaWFsLWNhc2UgaXMgYXNzdW1lZCB0byBiZSBhXG4gIC8vIGNvbnN0cnVjdG9yLlxuICBpZiAocGF0dGVybiBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgcGF0dGVybilcbiAgICAgIHJldHVybjtcbiAgICAvLyBYWFggd2hhdCBpZiAubmFtZSBpc24ndCBkZWZpbmVkXG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgXCIgKyBwYXR0ZXJuLmNvbnN0cnVjdG9yLm5hbWUpO1xuICB9XG5cbiAgdmFyIHVua25vd25LZXlzQWxsb3dlZCA9IGZhbHNlO1xuICBpZiAocGF0dGVybiBpbnN0YW5jZW9mIE9iamVjdEluY2x1ZGluZykge1xuICAgIHVua25vd25LZXlzQWxsb3dlZCA9IHRydWU7XG4gICAgcGF0dGVybiA9IHBhdHRlcm4ucGF0dGVybjtcbiAgfVxuXG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgT2JqZWN0SGFzaCkge1xuICAgIHZhciBrZXlQYXR0ZXJuID0gcGF0dGVybi5wYXR0ZXJuO1xuICAgIHZhciBlbXB0eUhhc2ggPSB0cnVlO1xuICAgIGZvciAodmFyIGtleSBpbiB2YWx1ZSkge1xuICAgICAgZW1wdHlIYXNoID0gZmFsc2U7XG4gICAgICBjaGVjayh2YWx1ZVtrZXldLCBrZXlQYXR0ZXJuKTtcbiAgICB9XG4gICAgaWYgKGVtcHR5SGFzaClcbiAgICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIFwiICsgcGF0dGVybi5jb25zdHJ1Y3Rvci5uYW1lKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAocGF0dGVybiBpbnN0YW5jZW9mIFN1YmNsYXNzKSB7XG4gICAgdmFyIFN1cGVyY2xhc3MgPSBwYXR0ZXJuLlN1cGVyY2xhc3M7XG4gICAgaWYgKHBhdHRlcm4ubWF0Y2hTdXBlcmNsYXNzICYmIHZhbHVlID09IFN1cGVyY2xhc3MpIFxuICAgICAgcmV0dXJuO1xuICAgIGlmICghICh2YWx1ZS5wcm90b3R5cGUgaW5zdGFuY2VvZiBTdXBlcmNsYXNzKSlcbiAgICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIFwiICsgcGF0dGVybi5jb25zdHJ1Y3Rvci5uYW1lICsgXCIgb2YgXCIgKyBTdXBlcmNsYXNzLm5hbWUpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmICh0eXBlb2YgcGF0dGVybiAhPT0gXCJvYmplY3RcIilcbiAgICB0aHJvdyBFcnJvcihcIkJhZCBwYXR0ZXJuOiB1bmtub3duIHBhdHRlcm4gdHlwZVwiKTtcblxuICAvLyBBbiBvYmplY3QsIHdpdGggcmVxdWlyZWQgYW5kIG9wdGlvbmFsIGtleXMuIE5vdGUgdGhhdCB0aGlzIGRvZXMgTk9UIGRvXG4gIC8vIHN0cnVjdHVyYWwgbWF0Y2hlcyBhZ2FpbnN0IG9iamVjdHMgb2Ygc3BlY2lhbCB0eXBlcyB0aGF0IGhhcHBlbiB0byBtYXRjaFxuICAvLyB0aGUgcGF0dGVybjogdGhpcyByZWFsbHkgbmVlZHMgdG8gYmUgYSBwbGFpbiBvbGQge09iamVjdH0hXG4gIGlmICh0eXBlb2YgdmFsdWUgIT09ICdvYmplY3QnKVxuICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIG9iamVjdCwgZ290IFwiICsgdHlwZW9mIHZhbHVlKTtcbiAgaWYgKHZhbHVlID09PSBudWxsKVxuICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIG9iamVjdCwgZ290IG51bGxcIik7XG5cbiAgdmFyIHJlcXVpcmVkUGF0dGVybnMgPSB7fTtcbiAgdmFyIG9wdGlvbmFsUGF0dGVybnMgPSB7fTtcblxuICBfLmVhY2hLZXkocGF0dGVybiwgZnVuY3Rpb24oc3ViUGF0dGVybiwga2V5KSB7XG4gICAgaWYgKHBhdHRlcm5ba2V5XSBpbnN0YW5jZW9mIE9wdGlvbmFsKVxuICAgICAgb3B0aW9uYWxQYXR0ZXJuc1trZXldID0gcGF0dGVybltrZXldLnBhdHRlcm47XG4gICAgZWxzZVxuICAgICAgcmVxdWlyZWRQYXR0ZXJuc1trZXldID0gcGF0dGVybltrZXldO1xuICB9LCB0aGlzLCB0cnVlKTtcblxuICBfLmVhY2hLZXkodmFsdWUsIGZ1bmN0aW9uKHN1YlZhbHVlLCBrZXkpIHtcbiAgICB2YXIgc3ViVmFsdWUgPSB2YWx1ZVtrZXldO1xuICAgIHRyeSB7XG4gICAgICBpZiAocmVxdWlyZWRQYXR0ZXJucy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgIGNoZWNrU3VidHJlZShzdWJWYWx1ZSwgcmVxdWlyZWRQYXR0ZXJuc1trZXldKTtcbiAgICAgICAgZGVsZXRlIHJlcXVpcmVkUGF0dGVybnNba2V5XTtcbiAgICAgIH0gZWxzZSBpZiAob3B0aW9uYWxQYXR0ZXJucy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgIGNoZWNrU3VidHJlZShzdWJWYWx1ZSwgb3B0aW9uYWxQYXR0ZXJuc1trZXldKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICghdW5rbm93bktleXNBbGxvd2VkKVxuICAgICAgICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIlVua25vd24ga2V5XCIpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgaWYgKGVyciBpbnN0YW5jZW9mIE1hdGNoLkVycm9yKVxuICAgICAgICBlcnIucGF0aCA9IF9wcmVwZW5kUGF0aChrZXksIGVyci5wYXRoKTtcbiAgICAgIHRocm93IGVycjtcbiAgICB9XG4gIH0sIHRoaXMsIHRydWUpO1xuXG4gIF8uZWFjaEtleShyZXF1aXJlZFBhdHRlcm5zLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiTWlzc2luZyBrZXkgJ1wiICsga2V5ICsgXCInXCIpO1xuICB9LCB0aGlzLCB0cnVlKTtcbn07XG5cblxudmFyIF9qc0tleXdvcmRzID0gW1wiZG9cIiwgXCJpZlwiLCBcImluXCIsIFwiZm9yXCIsIFwibGV0XCIsIFwibmV3XCIsIFwidHJ5XCIsIFwidmFyXCIsIFwiY2FzZVwiLFxuICBcImVsc2VcIiwgXCJlbnVtXCIsIFwiZXZhbFwiLCBcImZhbHNlXCIsIFwibnVsbFwiLCBcInRoaXNcIiwgXCJ0cnVlXCIsIFwidm9pZFwiLCBcIndpdGhcIixcbiAgXCJicmVha1wiLCBcImNhdGNoXCIsIFwiY2xhc3NcIiwgXCJjb25zdFwiLCBcInN1cGVyXCIsIFwidGhyb3dcIiwgXCJ3aGlsZVwiLCBcInlpZWxkXCIsXG4gIFwiZGVsZXRlXCIsIFwiZXhwb3J0XCIsIFwiaW1wb3J0XCIsIFwicHVibGljXCIsIFwicmV0dXJuXCIsIFwic3RhdGljXCIsIFwic3dpdGNoXCIsXG4gIFwidHlwZW9mXCIsIFwiZGVmYXVsdFwiLCBcImV4dGVuZHNcIiwgXCJmaW5hbGx5XCIsIFwicGFja2FnZVwiLCBcInByaXZhdGVcIiwgXCJjb250aW51ZVwiLFxuICBcImRlYnVnZ2VyXCIsIFwiZnVuY3Rpb25cIiwgXCJhcmd1bWVudHNcIiwgXCJpbnRlcmZhY2VcIiwgXCJwcm90ZWN0ZWRcIiwgXCJpbXBsZW1lbnRzXCIsXG4gIFwiaW5zdGFuY2VvZlwiXTtcblxuLy8gQXNzdW1lcyB0aGUgYmFzZSBvZiBwYXRoIGlzIGFscmVhZHkgZXNjYXBlZCBwcm9wZXJseVxuLy8gcmV0dXJucyBrZXkgKyBiYXNlXG5mdW5jdGlvbiBfcHJlcGVuZFBhdGgoa2V5LCBiYXNlKSB7XG4gIGlmICgodHlwZW9mIGtleSkgPT09IFwibnVtYmVyXCIgfHwga2V5Lm1hdGNoKC9eWzAtOV0rJC8pKVxuICAgIGtleSA9IFwiW1wiICsga2V5ICsgXCJdXCI7XG4gIGVsc2UgaWYgKCFrZXkubWF0Y2goL15bYS16XyRdWzAtOWEtel8kXSokL2kpIHx8IF9qc0tleXdvcmRzLmluZGV4T2Yoa2V5KSAhPSAtMSlcbiAgICBrZXkgPSBKU09OLnN0cmluZ2lmeShba2V5XSk7XG5cbiAgaWYgKGJhc2UgJiYgYmFzZVswXSAhPT0gXCJbXCIpXG4gICAgcmV0dXJuIGtleSArICcuJyArIGJhc2U7XG4gIHJldHVybiBrZXkgKyBiYXNlO1xufTtcblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpO1xuXG5cbi8vIG1vZHVsZSBleHBvcnRzIGVycm9yIGNsYXNzZXMgZm9yIGFsbCBuYW1lcyBkZWZpbmVkIGluIHRoaXMgYXJyYXlcbnZhciBlcnJvckNsYXNzTmFtZXMgPSBbJ0Fic3RyYWN0Q2xhc3MnLCAnTWl4aW4nLCAnTWVzc2VuZ2VyJywgJ0NvbXBvbmVudERhdGFTb3VyY2UnLFxuXHRcdFx0XHRcdCAgICdBdHRyaWJ1dGUnLCAnQmluZGVyJywgJ0xvYWRlcicsICdNYWlsTWVzc2FnZVNvdXJjZScsICdGYWNldCcsXG5cdFx0XHRcdFx0ICAgJ1Njb3BlJ107XG5cbnZhciBlcnJvciA9IHtcblx0dG9CZUltcGxlbWVudGVkOiB0b0JlSW1wbGVtZW50ZWQsXG5cdGNyZWF0ZUNsYXNzOiBjcmVhdGVFcnJvckNsYXNzXG59O1xuXG5lcnJvckNsYXNzTmFtZXMuZm9yRWFjaChmdW5jdGlvbihuYW1lKSB7XG5cdGVycm9yW25hbWVdID0gY3JlYXRlRXJyb3JDbGFzcyhuYW1lICsgJ0Vycm9yJyk7XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBlcnJvcjtcblxuXG5mdW5jdGlvbiBjcmVhdGVFcnJvckNsYXNzKGVycm9yQ2xhc3NOYW1lKSB7XG5cdHZhciBFcnJvckNsYXNzO1xuXHRldmFsKCdFcnJvckNsYXNzID0gZnVuY3Rpb24gJyArIGVycm9yQ2xhc3NOYW1lICsgJyhtZXNzYWdlKSB7IFxcXG5cdFx0XHR0aGlzLm5hbWUgPSBcIicgKyBlcnJvckNsYXNzTmFtZSArICdcIjsgXFxcblx0XHRcdHRoaXMubWVzc2FnZSA9IG1lc3NhZ2UgfHwgXCJUaGVyZSB3YXMgYW4gZXJyb3JcIjsgXFxcblx0XHR9Jyk7XG5cdF8ubWFrZVN1YmNsYXNzKEVycm9yQ2xhc3MsIEVycm9yKTtcblxuXHRyZXR1cm4gRXJyb3JDbGFzcztcbn1cblxuXG5mdW5jdGlvbiB0b0JlSW1wbGVtZW50ZWQoKSB7XG5cdHRocm93IG5ldyBlcnJvci5BYnN0cmFjdENsYXNzKCdjYWxsaW5nIHRoZSBtZXRob2Qgb2YgYW4gYWJzY3RyYWN0IGNsYXNzIE1lc3NhZ2VTb3VyY2UnKTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWwgPSB7XG5cdGxvZ2dlcjogcmVxdWlyZSgnLi9sb2dnZXInKSxcblx0cmVxdWVzdDogcmVxdWlyZSgnLi9yZXF1ZXN0JyksXG5cdGNoZWNrOiByZXF1aXJlKCcuL2NoZWNrJyksXG5cdGVycm9yOiByZXF1aXJlKCcuL2Vycm9yJylcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gdXRpbDtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIExvZ2dlciA9IHJlcXVpcmUoJy4vbG9nZ2VyX2NsYXNzJyk7XG5cbnZhciBsb2dnZXIgPSBuZXcgTG9nZ2VyKHsgbGV2ZWw6IDMgfSk7XG5cbm1vZHVsZS5leHBvcnRzID0gbG9nZ2VyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpO1xuXG5cbi8qKlxuICogTG9nIGxldmVscy5cbiAqL1xuXG52YXIgbGV2ZWxzID0gW1xuICAgICdlcnJvcicsXG4gICAgJ3dhcm4nLFxuICAgICdpbmZvJyxcbiAgICAnZGVidWcnXG5dO1xuXG52YXIgbWF4TGV2ZWxMZW5ndGggPSBNYXRoLm1heC5hcHBseShNYXRoLCBsZXZlbHMubWFwKGZ1bmN0aW9uKGxldmVsKSB7IHJldHVybiBsZXZlbC5sZW5ndGg7IH0pKTtcblxuLyoqXG4gKiBDb2xvcnMgZm9yIGxvZyBsZXZlbHMuXG4gKi9cblxudmFyIGNvbG9ycyA9IFtcbiAgICAzMSxcbiAgICAzMyxcbiAgICAzNixcbiAgICA5MFxuXTtcblxuLyoqXG4gKiBQYWRzIHRoZSBuaWNlIG91dHB1dCB0byB0aGUgbG9uZ2VzdCBsb2cgbGV2ZWwuXG4gKi9cblxuZnVuY3Rpb24gcGFkIChzdHIpIHtcbiAgICBpZiAoc3RyLmxlbmd0aCA8IG1heExldmVsTGVuZ3RoKVxuICAgICAgICByZXR1cm4gc3RyICsgbmV3IEFycmF5KG1heExldmVsTGVuZ3RoIC0gc3RyLmxlbmd0aCArIDEpLmpvaW4oJyAnKTtcblxuICAgIHJldHVybiBzdHI7XG59O1xuXG4vKipcbiAqIExvZ2dlciAoY29uc29sZSkuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG52YXIgTG9nZ2VyID0gZnVuY3Rpb24gKG9wdHMpIHtcbiAgICBvcHRzID0gb3B0cyB8fCB7fVxuICAgIHRoaXMuY29sb3JzID0gb3B0cy5jb2xvcnM7XG4gICAgdGhpcy5sZXZlbCA9IG9wdHMubGV2ZWwgfHwgMztcbiAgICB0aGlzLmVuYWJsZWQgPSBvcHRzLmVuYWJsZWQgfHwgdHJ1ZTtcbiAgICB0aGlzLmxvZ1ByZWZpeCA9IG9wdHMubG9nUHJlZml4IHx8ICcnO1xuICAgIHRoaXMubG9nUHJlZml4Q29sb3IgPSBvcHRzLmxvZ1ByZWZpeENvbG9yO1xufTtcblxuXG4vKipcbiAqIExvZyBtZXRob2QuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5Mb2dnZXIucHJvdG90eXBlLmxvZyA9IGZ1bmN0aW9uICh0eXBlKSB7XG4gICAgdmFyIGluZGV4ID0gbGV2ZWxzLmluZGV4T2YodHlwZSk7XG5cbiAgICBpZiAoaW5kZXggPiB0aGlzLmxldmVsIHx8ICEgdGhpcy5lbmFibGVkKVxuICAgICAgICByZXR1cm4gdGhpcztcblxuICAgIGNvbnNvbGUubG9nLmFwcGx5KFxuICAgICAgICAgIGNvbnNvbGVcbiAgICAgICAgLCBbdGhpcy5sb2dQcmVmaXhDb2xvclxuICAgICAgICAgICAgID8gJyAgIFxceDFCWycgKyB0aGlzLmxvZ1ByZWZpeENvbG9yICsgJ20nICsgdGhpcy5sb2dQcmVmaXggKyAnICAtXFx4MUJbMzltJ1xuICAgICAgICAgICAgIDogdGhpcy5sb2dQcmVmaXhcbiAgICAgICAgICAsdGhpcy5jb2xvcnNcbiAgICAgICAgICAgICA/ICcgXFx4MUJbJyArIGNvbG9yc1tpbmRleF0gKyAnbScgKyBwYWQodHlwZSkgKyAnIC1cXHgxQlszOW0nXG4gICAgICAgICAgICAgOiB0eXBlICsgJzonXG4gICAgICAgICAgXS5jb25jYXQoXy50b0FycmF5KGFyZ3VtZW50cykuc2xpY2UoMSkpXG4gICAgKTtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBHZW5lcmF0ZSBtZXRob2RzLlxuICovXG5cbmxldmVscy5mb3JFYWNoKGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgTG9nZ2VyLnByb3RvdHlwZVtuYW1lXSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5sb2cuYXBwbHkodGhpcywgW25hbWVdLmNvbmNhdChfLnRvQXJyYXkoYXJndW1lbnRzKSkpO1xuICAgIH07XG59KTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IExvZ2dlcjtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKTtcblxubW9kdWxlLmV4cG9ydHMgPSByZXF1ZXN0O1xuXG5cbi8vIFRPRE8gYWRkIGVycm9yIHN0YXR1c2VzXG52YXIgb2tTdGF0dXNlcyA9IFsnMjAwJywgJzMwNCddO1xuXG5cbmZ1bmN0aW9uIHJlcXVlc3QodXJsLCBvcHRzLCBjYWxsYmFjaykge1xuXHR2YXIgcmVxID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cdHJlcS5vcGVuKG9wdHMubWV0aG9kLCB1cmwsIHRydWUpOyAvLyB3aGF0IHRydWUgbWVhbnM/XG5cdHJlcS5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG5cdFx0aWYgKHJlcS5yZWFkeVN0YXRlID09IDQgJiYgcmVxLnN0YXR1c1RleHQudG9VcHBlckNhc2UoKSA9PSAnT0snIClcblx0XHRcdGNhbGxiYWNrKG51bGwsIHJlcS5yZXNwb25zZVRleHQsIHJlcSk7XG5cdFx0Ly8gZWxzZVxuXHRcdC8vIFx0Y2FsbGJhY2socmVxLnN0YXR1cywgcmVxLnJlc3BvbnNlVGV4dCwgcmVxKTtcblx0fTtcblx0cmVxLnNlbmQobnVsbCk7XG59XG5cbl8uZXh0ZW5kKHJlcXVlc3QsIHtcblx0Z2V0OiBnZXRcbn0pO1xuXG5cbmZ1bmN0aW9uIGdldCh1cmwsIGNhbGxiYWNrKSB7XG5cdHJlcXVlc3QodXJsLCB7IG1ldGhvZDogJ0dFVCcgfSwgY2FsbGJhY2spO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXztcbnZhciBwcm90byA9IF8gPSB7XG5cdGV4dGVuZFByb3RvOiBleHRlbmRQcm90byxcblx0Y3JlYXRlU3ViY2xhc3M6IGNyZWF0ZVN1YmNsYXNzLFxuXHRtYWtlU3ViY2xhc3M6IG1ha2VTdWJjbGFzcyxcblx0ZXh0ZW5kOiBleHRlbmQsXG5cdGNsb25lOiBjbG9uZSxcblx0ZGVlcEV4dGVuZDogZGVlcEV4dGVuZCxcblx0YWxsS2V5czogT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMuYmluZChPYmplY3QpLFxuXHRrZXlPZjoga2V5T2YsXG5cdGFsbEtleXNPZjogYWxsS2V5c09mLFxuXHRlYWNoS2V5OiBlYWNoS2V5LFxuXHRtYXBLZXlzOiBtYXBLZXlzLFxuXHRhcHBlbmRBcnJheTogYXBwZW5kQXJyYXksXG5cdHByZXBlbmRBcnJheTogcHJlcGVuZEFycmF5LFxuXHR0b0FycmF5OiB0b0FycmF5LFxuXHRmaXJzdFVwcGVyQ2FzZTogZmlyc3RVcHBlckNhc2UsXG5cdGZpcnN0TG93ZXJDYXNlOiBmaXJzdExvd2VyQ2FzZVxufTtcblxuXG5pZiAodHlwZW9mIHdpbmRvdyA9PSAnb2JqZWN0Jykge1xuXHQvLyBwcmVzZXJ2ZSBleGlzdGluZyBfIG9iamVjdFxuXHRpZiAod2luZG93Ll8pXG5cdFx0cHJvdG8udW5kZXJzY29yZSA9IHdpbmRvdy5fXG5cblx0Ly8gZXhwb3NlIGdsb2JhbCBfXG5cdHdpbmRvdy5fID0gcHJvdG87XG59XG5cbmlmICh0eXBlb2YgbW9kdWxlID09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKVxuXHQvLyBleHBvcnQgZm9yIG5vZGUvYnJvd3NlcmlmeVxuXHRtb2R1bGUuZXhwb3J0cyA9IHByb3RvO1xuXHRcblxuZnVuY3Rpb24gZXh0ZW5kUHJvdG8oc2VsZiwgbWV0aG9kcykge1xuXHR2YXIgcHJvcERlc2NyaXB0b3JzID0ge307XG5cblx0Xy5lYWNoS2V5KG1ldGhvZHMsIGZ1bmN0aW9uKG1ldGhvZCwgbmFtZSkge1xuXHRcdHByb3BEZXNjcmlwdG9yc1tuYW1lXSA9IHtcblx0XHRcdGVudW1lcmFibGU6IGZhbHNlLFxuXHRcdFx0Y29uZmlndXJhYmxlOiBmYWxzZSxcblx0XHRcdHdyaXRhYmxlOiBmYWxzZSxcblx0XHRcdHZhbHVlOiBtZXRob2Rcblx0XHR9O1xuXHR9KTtcblxuXHRPYmplY3QuZGVmaW5lUHJvcGVydGllcyhzZWxmLnByb3RvdHlwZSwgcHJvcERlc2NyaXB0b3JzKTtcblx0cmV0dXJuIHNlbGY7XG59XG5cblxuZnVuY3Rpb24gZXh0ZW5kKHNlbGYsIG9iaiwgb25seUVudW1lcmFibGUpIHtcblx0dmFyIHByb3BEZXNjcmlwdG9ycyA9IHt9O1xuXG5cdF8uZWFjaEtleShvYmosIGZ1bmN0aW9uKHZhbHVlLCBwcm9wKSB7XG5cdFx0dmFyIGRlc2NyaXB0b3IgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG9iaiwgcHJvcCk7XG5cdFx0cHJvcERlc2NyaXB0b3JzW3Byb3BdID0gZGVzY3JpcHRvcjtcblx0fSwgdGhpcywgb25seUVudW1lcmFibGUpO1xuXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHNlbGYsIHByb3BEZXNjcmlwdG9ycyk7XG5cblx0cmV0dXJuIHNlbGY7XG59XG5cblxuZnVuY3Rpb24gZGVlcEV4dGVuZChzZWxmLCBvYmosIG9ubHlFbnVtZXJhYmxlKSB7XG5cdHJldHVybiBfZXh0ZW5kVHJlZShzZWxmLCBvYmosIG9ubHlFbnVtZXJhYmxlLCBbXSk7XG59XG5cblxuZnVuY3Rpb24gX2V4dGVuZFRyZWUoc2VsZk5vZGUsIG9iak5vZGUsIG9ubHlFbnVtZXJhYmxlLCBvYmpUcmF2ZXJzZWQpIHtcblx0aWYgKG9ialRyYXZlcnNlZC5pbmRleE9mKG9iak5vZGUpID49IDApIHJldHVybjsgLy8gbm9kZSBhbHJlYWR5IHRyYXZlcnNlZFxuXHRvYmpUcmF2ZXJzZWQucHVzaChvYmpOb2RlKTtcblxuXHRfLmVhY2hLZXkob2JqTm9kZSwgZnVuY3Rpb24odmFsdWUsIHByb3ApIHtcblx0XHR2YXIgZGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Iob2JqTm9kZSwgcHJvcCk7XG5cdFx0aWYgKHR5cGVvZiB2YWx1ZSA9PSAnb2JqZWN0Jykge1xuXHRcdFx0aWYgKHNlbGZOb2RlLmhhc093blByb3BlcnR5KHByb3ApICYmIHR5cGVvZiBzZWxmTm9kZVtwcm9wXSA9PSAnb2JqZWN0Jylcblx0XHRcdFx0X2V4dGVuZFRyZWUoc2VsZk5vZGVbcHJvcF0sIHZhbHVlLCBvbmx5RW51bWVyYWJsZSwgb2JqVHJhdmVyc2VkKVxuXHRcdFx0ZWxzZVxuXHRcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoc2VsZk5vZGUsIHByb3AsIGRlc2NyaXB0b3IpO1xuXHRcdH0gZWxzZVxuXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHNlbGZOb2RlLCBwcm9wLCBkZXNjcmlwdG9yKTtcblx0fSwgdGhpcywgb25seUVudW1lcmFibGUpO1xuXG5cdHJldHVybiBzZWxmTm9kZTtcbn1cblxuXG5mdW5jdGlvbiBjbG9uZShvYmopIHtcblx0dmFyIGNsb25lZE9iamVjdCA9IE9iamVjdC5jcmVhdGUob2JqLmNvbnN0cnVjdG9yLnByb3RvdHlwZSk7XG5cdF8uZXh0ZW5kKGNsb25lZE9iamVjdCwgb2JqKTtcblx0cmV0dXJuIGNsb25lZE9iamVjdDtcbn1cblxuXG5mdW5jdGlvbiBjcmVhdGVTdWJjbGFzcyh0aGlzQ2xhc3MsIG5hbWUsIGFwcGx5Q29uc3RydWN0b3IpIHtcblx0dmFyIHN1YmNsYXNzO1xuXG5cdC8vIG5hbWUgaXMgb3B0aW9uYWxcblx0bmFtZSA9IG5hbWUgfHwgJyc7XG5cblx0Ly8gYXBwbHkgc3VwZXJjbGFzcyBjb25zdHJ1Y3RvclxuXHR2YXIgY29uc3RydWN0b3JDb2RlID0gYXBwbHlDb25zdHJ1Y3RvciA9PT0gZmFsc2Vcblx0XHRcdD8gJydcblx0XHRcdDogJ3RoaXNDbGFzcy5hcHBseSh0aGlzLCBhcmd1bWVudHMpOyc7XG5cblx0ZXZhbCgnc3ViY2xhc3MgPSBmdW5jdGlvbiAnICsgbmFtZSArICcoKXsgJyArIGNvbnN0cnVjdG9yQ29kZSArICcgfScpO1xuXG5cdF8ubWFrZVN1YmNsYXNzKHN1YmNsYXNzLCB0aGlzQ2xhc3MpO1xuXG5cdC8vIGNvcHkgY2xhc3MgbWV0aG9kc1xuXHQvLyAtIGZvciB0aGVtIHRvIHdvcmsgY29ycmVjdGx5IHRoZXkgc2hvdWxkIG5vdCBleHBsaWN0bHkgdXNlIHN1cGVyY2xhc3MgbmFtZVxuXHQvLyBhbmQgdXNlIFwidGhpc1wiIGluc3RlYWRcblx0Xy5leHRlbmQoc3ViY2xhc3MsIHRoaXNDbGFzcywgdHJ1ZSk7XG5cblx0cmV0dXJuIHN1YmNsYXNzO1xufVxuXG5cbmZ1bmN0aW9uIG1ha2VTdWJjbGFzcyh0aGlzQ2xhc3MsIFN1cGVyY2xhc3MpIHtcblx0Ly8gcHJvdG90eXBlIGNoYWluXG5cdHRoaXNDbGFzcy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFN1cGVyY2xhc3MucHJvdG90eXBlKTtcblx0XG5cdC8vIHN1YmNsYXNzIGlkZW50aXR5XG5cdF8uZXh0ZW5kUHJvdG8odGhpc0NsYXNzLCB7XG5cdFx0Y29uc3RydWN0b3I6IHRoaXNDbGFzc1xuXHR9KTtcblx0cmV0dXJuIHRoaXNDbGFzcztcbn1cblxuXG5mdW5jdGlvbiBrZXlPZihzZWxmLCBzZWFyY2hFbGVtZW50LCBvbmx5RW51bWVyYWJsZSkge1xuXHR2YXIgcHJvcGVydGllcyA9IG9ubHlFbnVtZXJhYmxlIFxuXHRcdFx0XHRcdFx0PyBPYmplY3Qua2V5cyhzZWxmKVxuXHRcdFx0XHRcdFx0OiBfLmFsbEtleXMoc2VsZik7XG5cblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wZXJ0aWVzLmxlbmd0aDsgaSsrKVxuXHRcdGlmIChzZWFyY2hFbGVtZW50ID09PSBzZWxmW3Byb3BlcnRpZXNbaV1dKVxuXHRcdFx0cmV0dXJuIHByb3BlcnRpZXNbaV07XG5cdFxuXHRyZXR1cm4gdW5kZWZpbmVkO1xufVxuXG5cbmZ1bmN0aW9uIGFsbEtleXNPZihzZWxmLCBzZWFyY2hFbGVtZW50LCBvbmx5RW51bWVyYWJsZSkge1xuXHR2YXIgcHJvcGVydGllcyA9IG9ubHlFbnVtZXJhYmxlIFxuXHRcdFx0XHRcdFx0PyBPYmplY3Qua2V5cyhzZWxmKVxuXHRcdFx0XHRcdFx0OiBfLmFsbEtleXMoc2VsZik7XG5cblx0dmFyIGtleXMgPSBwcm9wZXJ0aWVzLmZpbHRlcihmdW5jdGlvbihwcm9wKSB7XG5cdFx0cmV0dXJuIHNlYXJjaEVsZW1lbnQgPT09IHNlbGZbcHJvcF07XG5cdH0pO1xuXG5cdHJldHVybiBrZXlzO1xufVxuXG5cbmZ1bmN0aW9uIGVhY2hLZXkoc2VsZiwgY2FsbGJhY2ssIHRoaXNBcmcsIG9ubHlFbnVtZXJhYmxlKSB7XG5cdHZhciBwcm9wZXJ0aWVzID0gb25seUVudW1lcmFibGUgXG5cdFx0XHRcdFx0XHQ/IE9iamVjdC5rZXlzKHNlbGYpXG5cdFx0XHRcdFx0XHQ6IF8uYWxsS2V5cyhzZWxmKTtcblxuXHRwcm9wZXJ0aWVzLmZvckVhY2goZnVuY3Rpb24ocHJvcCkge1xuXHRcdGNhbGxiYWNrLmNhbGwodGhpc0FyZywgc2VsZltwcm9wXSwgcHJvcCwgc2VsZik7XG5cdH0pO1xufVxuXG5cbmZ1bmN0aW9uIG1hcEtleXMoc2VsZiwgY2FsbGJhY2ssIHRoaXNBcmcsIG9ubHlFbnVtZXJhYmxlKSB7XG5cdHZhciBtYXBSZXN1bHQgPSB7fTtcblx0Xy5lYWNoS2V5KHNlbGYsIG1hcFByb3BlcnR5LCB0aGlzQXJnLCBvbmx5RW51bWVyYWJsZSk7XG5cdHJldHVybiBtYXBSZXN1bHQ7XG5cblx0ZnVuY3Rpb24gbWFwUHJvcGVydHkodmFsdWUsIGtleSkge1xuXHRcdHZhciBkZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihzZWxmLCBrZXkpO1xuXHRcdGlmIChkZXNjcmlwdG9yLmVudW1lcmFibGUgfHwgISBvbmx5RW51bWVyYWJsZSkge1xuXHRcdFx0ZGVzY3JpcHRvci52YWx1ZSA9IGNhbGxiYWNrLmNhbGwodGhpcywgdmFsdWUsIGtleSwgc2VsZik7XG5cdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkobWFwUmVzdWx0LCBrZXksIGRlc2NyaXB0b3IpO1xuXHRcdH1cblx0fVxufVxuXG5cbmZ1bmN0aW9uIGFwcGVuZEFycmF5KHNlbGYsIGFycmF5VG9BcHBlbmQpIHtcblx0aWYgKCEgYXJyYXlUb0FwcGVuZC5sZW5ndGgpIHJldHVybiBzZWxmO1xuXG4gICAgdmFyIGFyZ3MgPSBbc2VsZi5sZW5ndGgsIDBdLmNvbmNhdChhcnJheVRvQXBwZW5kKTtcbiAgICBBcnJheS5wcm90b3R5cGUuc3BsaWNlLmFwcGx5KHNlbGYsIGFyZ3MpO1xuXG4gICAgcmV0dXJuIHNlbGY7XG59XG5cblxuZnVuY3Rpb24gcHJlcGVuZEFycmF5KHNlbGYsIGFycmF5VG9QcmVwZW5kKSB7XG5cdGlmICghIGFycmF5VG9QcmVwZW5kLmxlbmd0aCkgcmV0dXJuIHNlbGY7XG5cbiAgICB2YXIgYXJncyA9IFswLCAwXS5jb25jYXQoYXJyYXlUb1ByZXBlbmQpO1xuICAgIEFycmF5LnByb3RvdHlwZS5zcGxpY2UuYXBwbHkoc2VsZiwgYXJncyk7XG5cbiAgICByZXR1cm4gc2VsZjtcbn1cblxuXG5mdW5jdGlvbiB0b0FycmF5KGFycmF5TGlrZSkge1xuXHR2YXIgYXJyID0gW107XG5cdEFycmF5LnByb3RvdHlwZS5mb3JFYWNoLmNhbGwoYXJyYXlMaWtlLCBmdW5jdGlvbihpdGVtKSB7XG5cdFx0YXJyLnB1c2goaXRlbSlcblx0fSk7XG5cblx0cmV0dXJuIGFycjtcbn1cblxuXG5mdW5jdGlvbiBmaXJzdFVwcGVyQ2FzZShzdHIpIHtcblx0cmV0dXJuIHN0clswXS50b1VwcGVyQ2FzZSgpICsgc3RyLnNsaWNlKDEpO1xufVxuXG5cbmZ1bmN0aW9uIGZpcnN0TG93ZXJDYXNlKHN0cikge1xuXHRyZXR1cm4gc3RyWzBdLnRvTG93ZXJDYXNlKCkgKyBzdHIuc2xpY2UoMSk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmRlc2NyaWJlKCdtaWxvIGJpbmRlcicsIGZ1bmN0aW9uKCkge1xuICAgIGl0KCdzaG91bGQgYmluZCBjb21wb25lbnRzIGJhc2VkIG9uIG1sLWJpbmQgYXR0cmlidXRlJywgZnVuY3Rpb24oKSB7XG4gICAgXHR2YXIgbWlsbyA9IHJlcXVpcmUoJy4uLy4uL2xpYi9taWxvJyk7XG5cblx0XHRleHBlY3Qoe3A6IDF9KS5wcm9wZXJ0eSgncCcsIDEpO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKG1pbG8uYmluZGVyLnNjYW4oKSk7XG5cbiAgICAgICAgY29uc29sZS5sb2coJ29uZSBwYXNzIGJpbmRpbmcnKTtcbiAgICBcdHZhciBjdHJsMSA9IG1pbG8uYmluZGVyKCk7XG4gICAgICAgIGNvbnNvbGUubG9nKGN0cmwxKTtcblxuICAgICAgICBjb25zb2xlLmxvZygndHdvIHBhc3MgYmluZGluZycpO1xuICAgICAgICB2YXIgY3RybCA9IG1pbG8uYmluZGVyLnR3b1Bhc3MoKTtcbiAgICAgICAgY29uc29sZS5sb2coY3RybCk7XG5cbiAgICBcdGN0cmwuYXJ0aWNsZUJ1dHRvbi5ldmVudHMub24oJ2NsaWNrIG1vdXNlZW50ZXInLCBmdW5jdGlvbihlVHlwZSwgZXZ0KSB7XG4gICAgXHRcdGNvbnNvbGUubG9nKCdidXR0b24nLCBlVHlwZSwgZXZ0KTtcbiAgICBcdH0pO1xuXG4gICAgICAgIGN0cmwubWFpbi5ldmVudHMub24oJ2NsaWNrIG1vdXNlZW50ZXIgaW5wdXQga2V5cHJlc3MnLCBmdW5jdGlvbihlVHlwZSwgZXZ0KSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZGl2JywgZVR5cGUsIGV2dCk7XG4gICAgICAgIH0pO1xuXG4gICAgXHRjdHJsLmFydGljbGVJZElucHV0LmRhdGEub24oJ2RhdGFjaGFuZ2VkJywgbG9nRGF0YSk7XG5cbiAgICBcdGZ1bmN0aW9uIGxvZ0RhdGEobWVzc2FnZSwgZGF0YSkge1xuICAgIFx0XHRjb25zb2xlLmxvZyhtZXNzYWdlLCBkYXRhKTtcbiAgICBcdH1cblxuICAgICAgICB2YXIgbXlUbXBsQ29tcHMgPSBjdHJsLm15VGVtcGxhdGUudGVtcGxhdGVcbiAgICAgICAgICAgICAgICAuc2V0KCc8cCBtbC1iaW5kPVwiOmlubmVyUGFyYVwiPkkgYW0gcmVuZGVyZWQgZnJvbSB0ZW1wbGF0ZTwvcD4nKVxuICAgICAgICAgICAgICAgIC5yZW5kZXIoKVxuICAgICAgICAgICAgICAgIC5iaW5kZXIoKTtcblxuICAgICAgICBfLmV4dGVuZChjdHJsLCBteVRtcGxDb21wcyk7IC8vIHNob3VsZCBiZSBzb21lIGZ1bmN0aW9uIHRvIGFkZCB0byBjb250cm9sbGVyXG5cbiAgICAgICAgdmFyIGlubmVyUGFyYSA9IGN0cmwubXlUZW1wbGF0ZS5jb250YWluZXIuc2NvcGUuaW5uZXJQYXJhO1xuICAgICAgICBpbm5lclBhcmEuZWwuaW5uZXJIVE1MICs9ICcsIHRoZW4gYm91bmQgYW5kIGNoYW5nZWQgdmlhIGNvbXBvbmVudCBpbnNpZGUgdGVtcGxhdGUnO1xuICAgIH0pO1xufSk7XG4iXX0=
;