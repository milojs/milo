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
	, miloComponentsRegistry = require('./components/c_registry')
	, facetsRegistry = require('./components/c_facets/cf_registry')
	, Component = miloComponentsRegistry.get('Component')
	, Scope = require('./components/scope')
	, BindAttribute = require('./attribute/a_bind')
	, BinderError = require('./util/error').Binder
	, _ = require('mol-proto')
	, check = require('./util/check')
	, Match =  check.Match;


module.exports = binder;


function binder(scopeEl, componentsRegistry) {
	var componentsRegistry = componentsRegistry || miloComponentsRegistry
		, scopeEl = scopeEl || document.body
		, scope = new Scope;

	bindElement(scope, scopeEl);
	return scope;


	function bindElement(scope, el){
		var attr = new BindAttribute(el);

		if (attr.node)
			var aComponent = createComponent(scope, el, attr);

		// bind inner elements to components
		if (el.children && el.children.length) {
			var innerScope = bindChildren(el);

			if (innerScope._length()) {
				// attach inner components to the current one (create a new scope) ...
				if (typeof aComponent != 'undefined' && aComponent.container)
					aComponent.container.scope = innerScope;
				else // or keep them in the current scope
					scope._copy(innerScope);;
			}
		}

		if (aComponent)
			scope._add(aComponent, attr.compName);
	}


	function bindChildren(ownerEl) {
		var scope = new Scope;
		Array.prototype.forEach.call(ownerEl.children, function(el) {
			bindElement(scope, el)
		});
		return scope;
	}


	function createComponent(scope, el, attr) {
		// element will be bound to a component
		attr.parse().validate();

		// get component class from registry and validate
		var ComponentClass = componentsRegistry.get(attr.compClass);

		if (! ComponentClass)
			throw new BinderError('class ' + attr.compClass + ' is not registered');

		check(ComponentClass, Match.Subclass(Component, true));

		// create new component
		var aComponent = new ComponentClass(scope, el, attr.compName);

		// add extra facets
		var facets = attr.compFacets;
		if (facets)
			facets.forEach(function(fct) {
				aComponent.addFacet(fct);
			});

		return aComponent;
	}
}


function scan(scopeEl) {
	var scope = new Scope;

	var attr = new BindAttribute(scopeEl);

	attr.parse().validate();

	// get component class from registry and validate
	var ComponentClass = miloFacetsRegistry.get(attr.compClass);
	if (! ComponentClass)
		throw new BinderError('class ' + attr.compClass + ' is not registered');
	check(ComponentClass, Match.Subclass(Component, true));
	attr.ComponentClass = ComponentClass;

	// add extra facets
	var facets = attr.compFacets;
	if (facets && facets.length) {
		var facetsClasses = [];
		facets.forEach(function(fct) {
			var FacetClass = 
			aComponent.addFacet(fct);
		});
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
	allFacets: envokeMethodOnAllFacets,
	remove: removeComponentFromScope
});


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


function bindInnerComponents(registry) {
	var thisScope = binder(this.owner.el, registry);

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

	var protoFacets = this.constructor.prototype.facets;

	if (protoFacets && protoFacets[facetName])
		throw new Error('facet ' + facetName + ' is already part of the class ' + this.constructor.name);

	if (this[facetName])
		throw new Error('facet ' + facetName + ' is already present in object');

	var newFacet = this.facets[facetName] = new FacetClass(this, facetOpts);

	Object.defineProperty(this, facetName, {
		enumerable: true,
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


},{"../util/check":36,"./f_class":28,"mol-proto":42}],30:[function(require,module,exports){
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

        var innerPara = ctrl.myTemplate.container.scope.innerPara;
        innerPara.el.innerHTML += ', then bound and changed via component inside template';
    });
});

},{"../../lib/milo":35}]},{},[43])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvamFzb25pYW5ncmVlbi93b3JrL0NDL21pbG8vbGliL2Fic3RyYWN0L21peGluLmpzIiwiL1VzZXJzL2phc29uaWFuZ3JlZW4vd29yay9DQy9taWxvL2xpYi9hYnN0cmFjdC9yZWdpc3RyeS5qcyIsIi9Vc2Vycy9qYXNvbmlhbmdyZWVuL3dvcmsvQ0MvbWlsby9saWIvYXR0cmlidXRlL2FfYmluZC5qcyIsIi9Vc2Vycy9qYXNvbmlhbmdyZWVuL3dvcmsvQ0MvbWlsby9saWIvYXR0cmlidXRlL2FfbG9hZC5qcyIsIi9Vc2Vycy9qYXNvbmlhbmdyZWVuL3dvcmsvQ0MvbWlsby9saWIvYXR0cmlidXRlL2luZGV4LmpzIiwiL1VzZXJzL2phc29uaWFuZ3JlZW4vd29yay9DQy9taWxvL2xpYi9iaW5kZXIuanMiLCIvVXNlcnMvamFzb25pYW5ncmVlbi93b3JrL0NDL21pbG8vbGliL2NsYXNzZXMuanMiLCIvVXNlcnMvamFzb25pYW5ncmVlbi93b3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19jbGFzcy5qcyIsIi9Vc2Vycy9qYXNvbmlhbmdyZWVuL3dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX2ZhY2V0LmpzIiwiL1VzZXJzL2phc29uaWFuZ3JlZW4vd29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfZmFjZXRzL0NvbnRhaW5lci5qcyIsIi9Vc2Vycy9qYXNvbmlhbmdyZWVuL3dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX2ZhY2V0cy9EYXRhLmpzIiwiL1VzZXJzL2phc29uaWFuZ3JlZW4vd29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfZmFjZXRzL0RvbS5qcyIsIi9Vc2Vycy9qYXNvbmlhbmdyZWVuL3dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX2ZhY2V0cy9EcmFnLmpzIiwiL1VzZXJzL2phc29uaWFuZ3JlZW4vd29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfZmFjZXRzL0Ryb3AuanMiLCIvVXNlcnMvamFzb25pYW5ncmVlbi93b3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19mYWNldHMvRWRpdGFibGUuanMiLCIvVXNlcnMvamFzb25pYW5ncmVlbi93b3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19mYWNldHMvRXZlbnRzLmpzIiwiL1VzZXJzL2phc29uaWFuZ3JlZW4vd29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfZmFjZXRzL0ZyYW1lLmpzIiwiL1VzZXJzL2phc29uaWFuZ3JlZW4vd29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfZmFjZXRzL1RlbXBsYXRlLmpzIiwiL1VzZXJzL2phc29uaWFuZ3JlZW4vd29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfZmFjZXRzL2NmX3JlZ2lzdHJ5LmpzIiwiL1VzZXJzL2phc29uaWFuZ3JlZW4vd29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfbWVzc2FnZV9zb3VyY2VzL2NvbXBvbmVudF9kYXRhX3NvdXJjZS5qcyIsIi9Vc2Vycy9qYXNvbmlhbmdyZWVuL3dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX21lc3NhZ2Vfc291cmNlcy9kb21fZXZlbnRzX2NvbnN0cnVjdG9ycy5qcyIsIi9Vc2Vycy9qYXNvbmlhbmdyZWVuL3dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX21lc3NhZ2Vfc291cmNlcy9kb21fZXZlbnRzX3NvdXJjZS5qcyIsIi9Vc2Vycy9qYXNvbmlhbmdyZWVuL3dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX21lc3NhZ2Vfc291cmNlcy9pZnJhbWVfbWVzc2FnZV9zb3VyY2UuanMiLCIvVXNlcnMvamFzb25pYW5ncmVlbi93b3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19yZWdpc3RyeS5qcyIsIi9Vc2Vycy9qYXNvbmlhbmdyZWVuL3dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jbGFzc2VzL1ZpZXcuanMiLCIvVXNlcnMvamFzb25pYW5ncmVlbi93b3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvc2NvcGUuanMiLCIvVXNlcnMvamFzb25pYW5ncmVlbi93b3JrL0NDL21pbG8vbGliL2NvbmZpZy5qcyIsIi9Vc2Vycy9qYXNvbmlhbmdyZWVuL3dvcmsvQ0MvbWlsby9saWIvZmFjZXRzL2ZfY2xhc3MuanMiLCIvVXNlcnMvamFzb25pYW5ncmVlbi93b3JrL0NDL21pbG8vbGliL2ZhY2V0cy9mX29iamVjdC5qcyIsIi9Vc2Vycy9qYXNvbmlhbmdyZWVuL3dvcmsvQ0MvbWlsby9saWIvbG9hZGVyLmpzIiwiL1VzZXJzL2phc29uaWFuZ3JlZW4vd29yay9DQy9taWxvL2xpYi9tYWlsL2luZGV4LmpzIiwiL1VzZXJzL2phc29uaWFuZ3JlZW4vd29yay9DQy9taWxvL2xpYi9tYWlsL21haWxfc291cmNlLmpzIiwiL1VzZXJzL2phc29uaWFuZ3JlZW4vd29yay9DQy9taWxvL2xpYi9tZXNzZW5nZXIvaW5kZXguanMiLCIvVXNlcnMvamFzb25pYW5ncmVlbi93b3JrL0NDL21pbG8vbGliL21lc3Nlbmdlci9tZXNzYWdlX3NvdXJjZS5qcyIsIi9Vc2Vycy9qYXNvbmlhbmdyZWVuL3dvcmsvQ0MvbWlsby9saWIvbWlsby5qcyIsIi9Vc2Vycy9qYXNvbmlhbmdyZWVuL3dvcmsvQ0MvbWlsby9saWIvdXRpbC9jaGVjay5qcyIsIi9Vc2Vycy9qYXNvbmlhbmdyZWVuL3dvcmsvQ0MvbWlsby9saWIvdXRpbC9lcnJvci5qcyIsIi9Vc2Vycy9qYXNvbmlhbmdyZWVuL3dvcmsvQ0MvbWlsby9saWIvdXRpbC9pbmRleC5qcyIsIi9Vc2Vycy9qYXNvbmlhbmdyZWVuL3dvcmsvQ0MvbWlsby9saWIvdXRpbC9sb2dnZXIuanMiLCIvVXNlcnMvamFzb25pYW5ncmVlbi93b3JrL0NDL21pbG8vbGliL3V0aWwvbG9nZ2VyX2NsYXNzLmpzIiwiL1VzZXJzL2phc29uaWFuZ3JlZW4vd29yay9DQy9taWxvL2xpYi91dGlsL3JlcXVlc3QuanMiLCIvVXNlcnMvamFzb25pYW5ncmVlbi93b3JrL0NDL21pbG8vbm9kZV9tb2R1bGVzL21vbC1wcm90by9saWIvcHJvdG8uanMiLCIvVXNlcnMvamFzb25pYW5ncmVlbi93b3JrL0NDL21pbG8vdGVzdF9odG1sL2JpbmRfdGVzdC9iaW5kX3Rlc3QuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9GQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbFRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vdXRpbC9jaGVjaycpXG5cdCwgTWF0Y2ggPSBjaGVjay5NYXRjaFxuXHQsIE1peGluRXJyb3IgPSByZXF1aXJlKCcuLi91dGlsL2Vycm9yJykuTWl4aW47XG5cblxubW9kdWxlLmV4cG9ydHMgPSBNaXhpbjtcblxuLy8gYW4gYWJzdHJhY3QgY2xhc3MgZm9yIG1peGluIHBhdHRlcm4gLSBhZGRpbmcgcHJveHkgbWV0aG9kcyB0byBob3N0IG9iamVjdHNcbmZ1bmN0aW9uIE1peGluKGhvc3RPYmplY3QsIHByb3h5TWV0aG9kcyAvKiwgb3RoZXIgYXJncyAtIHBhc3NlZCB0byBpbml0IG1ldGhvZCAqLykge1xuXHQvLyBUT0RPIC0gbW9jZSBjaGVja3MgZnJvbSBNZXNzZW5nZXIgaGVyZVxuXHRjaGVjayhob3N0T2JqZWN0LCBNYXRjaC5PcHRpb25hbChPYmplY3QpKTtcblx0Y2hlY2socHJveHlNZXRob2RzLCBNYXRjaC5PcHRpb25hbChNYXRjaC5PYmplY3RIYXNoKFN0cmluZykpKTtcblxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ19ob3N0T2JqZWN0JywgeyB2YWx1ZTogaG9zdE9iamVjdCB9KTtcblx0aWYgKHByb3h5TWV0aG9kcylcblx0XHR0aGlzLl9jcmVhdGVQcm94eU1ldGhvZHMocHJveHlNZXRob2RzKTtcblxuXHQvLyBjYWxsaW5nIGluaXQgaWYgaXQgaXMgZGVmaW5lZCBpbiB0aGUgY2xhc3Ncblx0aWYgKHRoaXMuaW5pdClcblx0XHR0aGlzLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn1cblxuXy5leHRlbmRQcm90byhNaXhpbiwge1xuXHRfY3JlYXRlUHJveHlNZXRob2Q6IF9jcmVhdGVQcm94eU1ldGhvZCxcblx0X2NyZWF0ZVByb3h5TWV0aG9kczogX2NyZWF0ZVByb3h5TWV0aG9kc1xufSk7XG5cblxuZnVuY3Rpb24gX2NyZWF0ZVByb3h5TWV0aG9kKG1peGluTWV0aG9kTmFtZSwgcHJveHlNZXRob2ROYW1lKSB7XG5cdGlmICh0aGlzLl9ob3N0T2JqZWN0W3Byb3h5TWV0aG9kTmFtZV0pXG5cdFx0dGhyb3cgbmV3IE1peGluRXJyb3IoJ21ldGhvZCAnICsgcHJveHlNZXRob2ROYW1lICtcblx0XHRcdFx0XHRcdFx0XHQgJyBhbHJlYWR5IGRlZmluZWQgaW4gaG9zdCBvYmplY3QnKTtcblxuXHRjaGVjayh0aGlzW21peGluTWV0aG9kTmFtZV0sIEZ1bmN0aW9uKTtcblxuXHR2YXIgYm91bmRNZXRob2QgPSB0aGlzW21peGluTWV0aG9kTmFtZV0uYmluZCh0aGlzKTtcblxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcy5faG9zdE9iamVjdCwgcHJveHlNZXRob2ROYW1lLFxuXHRcdHsgdmFsdWU6IGJvdW5kTWV0aG9kIH0pO1xufVxuXG5cbmZ1bmN0aW9uIF9jcmVhdGVQcm94eU1ldGhvZHMocHJveHlNZXRob2RzKSB7XG5cdC8vIGNyZWF0aW5nIGFuZCBiaW5kaW5nIHByb3h5IG1ldGhvZHMgb24gdGhlIGhvc3Qgb2JqZWN0XG5cdF8uZWFjaEtleShwcm94eU1ldGhvZHMsIF9jcmVhdGVQcm94eU1ldGhvZCwgdGhpcyk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgnbW9sLXByb3RvJylcblx0LCBjaGVjayA9IHJlcXVpcmUoJy4uL3V0aWwvY2hlY2snKVxuXHQsIE1hdGNoID0gY2hlY2suTWF0Y2g7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2xhc3NSZWdpc3RyeTtcblxuZnVuY3Rpb24gQ2xhc3NSZWdpc3RyeSAoRm91bmRhdGlvbkNsYXNzKSB7XG5cdGlmIChGb3VuZGF0aW9uQ2xhc3MpXG5cdFx0dGhpcy5zZXRDbGFzcyhGb3VuZGF0aW9uQ2xhc3MpO1xuXG5cdC8vIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnX19yZWdpc3RlcmVkQ2xhc3NlcycsIHtcblx0Ly8gXHRcdGVudW1lcmFibGU6IGZhbHNlLFxuXHQvLyBcdFx0d3JpdGFibGU6IHRydWUsXG5cdC8vIFx0XHRjb25maWd1cmFibGU6IHRydWUsXG5cdC8vIFx0XHR2YWx1ZToge31cblx0Ly8gfSk7XG5cblx0dGhpcy5fX3JlZ2lzdGVyZWRDbGFzc2VzID0ge307XG59XG5cbl8uZXh0ZW5kUHJvdG8oQ2xhc3NSZWdpc3RyeSwge1xuXHRhZGQ6IHJlZ2lzdGVyQ2xhc3MsXG5cdGdldDogZ2V0Q2xhc3MsXG5cdHJlbW92ZTogdW5yZWdpc3RlckNsYXNzLFxuXHRjbGVhbjogdW5yZWdpc3RlckFsbENsYXNzZXMsXG5cdHNldENsYXNzOiBzZXRGb3VuZGF0aW9uQ2xhc3Ncbn0pO1xuXG5cbmZ1bmN0aW9uIHNldEZvdW5kYXRpb25DbGFzcyhGb3VuZGF0aW9uQ2xhc3MpIHtcblx0Y2hlY2soRm91bmRhdGlvbkNsYXNzLCBGdW5jdGlvbik7XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnRm91bmRhdGlvbkNsYXNzJywge1xuXHRcdGVudW1lcmFibGU6IHRydWUsXG5cdFx0dmFsdWU6IEZvdW5kYXRpb25DbGFzc1xuXHR9KTtcbn1cblxuZnVuY3Rpb24gcmVnaXN0ZXJDbGFzcyhhQ2xhc3MsIG5hbWUpIHtcblx0bmFtZSA9IG5hbWUgfHwgYUNsYXNzLm5hbWU7XG5cblx0Y2hlY2sobmFtZSwgU3RyaW5nLCAnY2xhc3MgbmFtZSBtdXN0IGJlIHN0cmluZycpO1xuXHRjaGVjayhuYW1lLCBNYXRjaC5XaGVyZShmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gdHlwZW9mIG5hbWUgPT0gJ3N0cmluZycgJiYgbmFtZSAhPSAnJztcblx0fSksICdjbGFzcyBuYW1lIG11c3QgYmUgc3RyaW5nJyk7XG5cdGlmICh0aGlzLkZvdW5kYXRpb25DbGFzcykge1xuXHRcdGlmIChhQ2xhc3MgIT0gdGhpcy5Gb3VuZGF0aW9uQ2xhc3MpXG5cdFx0XHRjaGVjayhhQ2xhc3MsIE1hdGNoLlN1YmNsYXNzKHRoaXMuRm91bmRhdGlvbkNsYXNzKSwgJ2NsYXNzIG11c3QgYmUgYSBzdWIoY2xhc3MpIG9mIGEgZm91bmRhdGlvbiBjbGFzcycpO1xuXHR9IGVsc2Vcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdmb3VuZGF0aW9uIGNsYXNzIG11c3QgYmUgc2V0IGJlZm9yZSBhZGRpbmcgY2xhc3NlcyB0byByZWdpc3RyeScpO1xuXG5cdGlmICh0aGlzLl9fcmVnaXN0ZXJlZENsYXNzZXNbbmFtZV0pXG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignaXMgYWxyZWFkeSByZWdpc3RlcmVkJyk7XG5cblx0dGhpcy5fX3JlZ2lzdGVyZWRDbGFzc2VzW25hbWVdID0gYUNsYXNzO1xufTtcblxuXG5mdW5jdGlvbiBnZXRDbGFzcyhuYW1lKSB7XG5cdGNoZWNrKG5hbWUsIFN0cmluZywgJ2NsYXNzIG5hbWUgbXVzdCBiZSBzdHJpbmcnKTtcblx0cmV0dXJuIHRoaXMuX19yZWdpc3RlcmVkQ2xhc3Nlc1tuYW1lXTtcbn07XG5cblxuZnVuY3Rpb24gdW5yZWdpc3RlckNsYXNzKG5hbWVPckNsYXNzKSB7XG5cdGNoZWNrKG5hbWVPckNsYXNzLCBNYXRjaC5PbmVPZihTdHJpbmcsIEZ1bmN0aW9uKSwgJ2NsYXNzIG9yIG5hbWUgbXVzdCBiZSBzdXBwbGllZCcpO1xuXG5cdHZhciBuYW1lID0gdHlwZW9mIG5hbWVPckNsYXNzID09ICdzdHJpbmcnXG5cdFx0XHRcdFx0XHQ/IG5hbWVPckNsYXNzXG5cdFx0XHRcdFx0XHQ6IG5hbWVPckNsYXNzLm5hbWU7XG5cdFx0XHRcdFx0XHRcblx0aWYgKCEgdGhpcy5fX3JlZ2lzdGVyZWRDbGFzc2VzW25hbWVdKVxuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ2NsYXNzIGlzIG5vdCByZWdpc3RlcmVkJyk7XG5cblx0ZGVsZXRlIHRoaXMuX19yZWdpc3RlcmVkQ2xhc3Nlc1tuYW1lXTtcbn07XG5cblxuZnVuY3Rpb24gdW5yZWdpc3RlckFsbENsYXNzZXMoKSB7XG5cdHRoaXMuX19yZWdpc3RlcmVkQ2xhc3NlcyA9IHt9O1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIEF0dHJpYnV0ZSA9IHJlcXVpcmUoJy4vaW5kZXgnKVxuXHQsIEF0dHJpYnV0ZUVycm9yID0gcmVxdWlyZSgnLi4vdXRpbC9lcnJvcicpLkF0dHJpYnV0ZVxuXHQsIGNvbmZpZyA9IHJlcXVpcmUoJy4uL2NvbmZpZycpXG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpXG5cdCwgY2hlY2sgPSByZXF1aXJlKCcuLi91dGlsL2NoZWNrJylcblx0LCBNYXRjaCA9IGNoZWNrLk1hdGNoO1xuXG5cbi8vIE1hdGNoZXM7XG4vLyA6bXlWaWV3IC0gb25seSBjb21wb25lbnQgbmFtZVxuLy8gVmlldzpteVZpZXcgLSBjbGFzcyBhbmQgY29tcG9uZW50IG5hbWVcbi8vIFtFdmVudHMsIERhdGFdOm15VmlldyAtIGZhY2V0cyBhbmQgY29tcG9uZW50IG5hbWVcbi8vIFZpZXdbRXZlbnRzXTpteVZpZXcgLSBjbGFzcywgZmFjZXQocykgYW5kIGNvbXBvbmVudCBuYW1lXG5cbnZhciBhdHRyUmVnRXhwPSAvXihbXlxcOlxcW1xcXV0qKSg/OlxcWyhbXlxcOlxcW1xcXV0qKVxcXSk/XFw6PyhbXjpdKikkL1xuXHQsIGZhY2V0c1NwbGl0UmVnRXhwID0gL1xccyooPzpcXCx8XFxzKVxccyovO1xuXG5cbnZhciBCaW5kQXR0cmlidXRlID0gXy5jcmVhdGVTdWJjbGFzcyhBdHRyaWJ1dGUsICdCaW5kQXR0cmlidXRlJywgdHJ1ZSk7XG5cbl8uZXh0ZW5kUHJvdG8oQmluZEF0dHJpYnV0ZSwge1xuXHRhdHRyTmFtZTogZ2V0QXR0cmlidXRlTmFtZSxcblx0cGFyc2U6IHBhcnNlQXR0cmlidXRlLFxuXHR2YWxpZGF0ZTogdmFsaWRhdGVBdHRyaWJ1dGVcbn0pO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gQmluZEF0dHJpYnV0ZTtcblxuXG5mdW5jdGlvbiBnZXRBdHRyaWJ1dGVOYW1lKCkge1xuXHRyZXR1cm4gY29uZmlnLmF0dHJzWydiaW5kJ107XG59XG5cblxuZnVuY3Rpb24gcGFyc2VBdHRyaWJ1dGUoKSB7XG5cdGlmICghIHRoaXMubm9kZSkgcmV0dXJuO1xuXG5cdHZhciB2YWx1ZSA9IHRoaXMuZ2V0KCk7XG5cblx0aWYgKHZhbHVlKVxuXHRcdHZhciBiaW5kVG8gPSB2YWx1ZS5tYXRjaChhdHRyUmVnRXhwKTtcblxuXHRpZiAoISBiaW5kVG8pXG5cdFx0dGhyb3cgbmV3IEF0dHJpYnV0ZUVycm9yKCdpbnZhbGlkIGJpbmQgYXR0cmlidXRlICcgKyB2YWx1ZSk7XG5cblx0dGhpcy5jb21wQ2xhc3MgPSBiaW5kVG9bMV0gfHwgJ0NvbXBvbmVudCc7XG5cdHRoaXMuY29tcEZhY2V0cyA9IChiaW5kVG9bMl0gJiYgYmluZFRvWzJdLnNwbGl0KGZhY2V0c1NwbGl0UmVnRXhwKSkgfHwgdW5kZWZpbmVkO1xuXHR0aGlzLmNvbXBOYW1lID0gYmluZFRvWzNdIHx8IHVuZGVmaW5lZDtcblxuXHRyZXR1cm4gdGhpcztcbn1cblxuXG5mdW5jdGlvbiB2YWxpZGF0ZUF0dHJpYnV0ZSgpIHtcblx0dmFyIGNvbXBOYW1lID0gdGhpcy5jb21wTmFtZTtcblx0Y2hlY2soY29tcE5hbWUsIE1hdGNoLldoZXJlKGZ1bmN0aW9uKCkge1xuICBcdFx0cmV0dXJuIHR5cGVvZiBjb21wTmFtZSA9PSAnc3RyaW5nJyAmJiBjb21wTmFtZSAhPSAnJztcblx0fSksICdlbXB0eSBjb21wb25lbnQgbmFtZScpO1xuXG5cdGlmICghIHRoaXMuY29tcENsYXNzKVxuXHRcdHRocm93IG5ldyBBdHRyaWJ1dGVFcnJvcignZW1wdHkgY29tcG9uZW50IGNsYXNzIG5hbWUgJyArIHRoaXMuY29tcENsYXNzKTtcblxuXHRyZXR1cm4gdGhpcztcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIEF0dHJpYnV0ZSA9IHJlcXVpcmUoJy4vaW5kZXgnKVxuXHQsIEF0dHJpYnV0ZUVycm9yID0gcmVxdWlyZSgnLi4vdXRpbC9lcnJvcicpLkF0dHJpYnV0ZVxuXHQsIGNvbmZpZyA9IHJlcXVpcmUoJy4uL2NvbmZpZycpXG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpO1xuXG5cbnZhciBMb2FkQXR0cmlidXRlID0gXy5jcmVhdGVTdWJjbGFzcyhBdHRyaWJ1dGUsICdMb2FkQXR0cmlidXRlJywgdHJ1ZSk7XG5cbl8uZXh0ZW5kUHJvdG8oTG9hZEF0dHJpYnV0ZSwge1xuXHRhdHRyTmFtZTogZ2V0QXR0cmlidXRlTmFtZSxcblx0cGFyc2U6IHBhcnNlQXR0cmlidXRlLFxuXHR2YWxpZGF0ZTogdmFsaWRhdGVBdHRyaWJ1dGVcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IExvYWRBdHRyaWJ1dGU7XG5cblxuZnVuY3Rpb24gZ2V0QXR0cmlidXRlTmFtZSgpIHtcblx0cmV0dXJuIGNvbmZpZy5hdHRycy5sb2FkO1xufVxuXG5cbmZ1bmN0aW9uIHBhcnNlQXR0cmlidXRlKCkge1xuXHRpZiAoISB0aGlzLm5vZGUpIHJldHVybjtcblxuXHR2YXIgdmFsdWUgPSB0aGlzLmdldCgpO1xuXG5cdHRoaXMubG9hZFVybCA9IHZhbHVlO1xuXG5cdHJldHVybiB0aGlzO1xufVxuXG5cbmZ1bmN0aW9uIHZhbGlkYXRlQXR0cmlidXRlKCkge1xuXHQvLyBUT0RPIHVybCB2YWxpZGF0aW9uXG5cblx0cmV0dXJuIHRoaXM7XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpXG5cdCwgY2hlY2sgPSByZXF1aXJlKCcuLi91dGlsL2NoZWNrJylcblx0LCBNYXRjaCA9IGNoZWNrLk1hdGNoXG5cdCwgdG9CZUltcGxlbWVudGVkID0gcmVxdWlyZSgnLi4vdXRpbC9lcnJvcicpLnRvQmVJbXBsZW1lbnRlZDtcblxuXG4vLyBhbiBhYnN0cmFjdCBhdHRyaWJ1dGUgY2xhc3MgZm9yIGF0dHJpYnV0ZSBwYXJzaW5nIGFuZCB2YWxpZGF0aW9uXG5cbm1vZHVsZS5leHBvcnRzID0gQXR0cmlidXRlO1xuXG5mdW5jdGlvbiBBdHRyaWJ1dGUoZWwsIG5hbWUpIHtcblx0dGhpcy5uYW1lID0gbmFtZSB8fCB0aGlzLmF0dHJOYW1lKCk7XG5cdHRoaXMuZWwgPSBlbDtcblx0dGhpcy5ub2RlID0gZWwuYXR0cmlidXRlc1t0aGlzLm5hbWVdO1xufVxuXG5fLmV4dGVuZFByb3RvKEF0dHJpYnV0ZSwge1xuXHRnZXQ6IGdldEF0dHJpYnV0ZVZhbHVlLFxuXHRzZXQ6IHNldEF0dHJpYnV0ZVZhbHVlLFxuXG5cdC8vIHNob3VsZCBiZSBkZWZpbmVkIGluIHN1YmNsYXNzXG5cdGF0dHJOYW1lOiB0b0JlSW1wbGVtZW50ZWQsXG5cdHBhcnNlOiB0b0JlSW1wbGVtZW50ZWQsXG5cdHZhbGlkYXRlOiB0b0JlSW1wbGVtZW50ZWQsXG59KTtcblxuXG5mdW5jdGlvbiBnZXRBdHRyaWJ1dGVWYWx1ZSgpIHtcblx0cmV0dXJuIHRoaXMuZWwuZ2V0QXR0cmlidXRlKHRoaXMubmFtZSk7XG59XG5cbmZ1bmN0aW9uIHNldEF0dHJpYnV0ZVZhbHVlKHZhbHVlKSB7XG5cdHRoaXMuZWwuc2V0QXR0cmlidXRlKHRoaXMubmFtZSwgdmFsdWUpO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgbWlsb01haWwgPSByZXF1aXJlKCcuL21haWwnKVxuXHQsIG1pbG9Db21wb25lbnRzUmVnaXN0cnkgPSByZXF1aXJlKCcuL2NvbXBvbmVudHMvY19yZWdpc3RyeScpXG5cdCwgZmFjZXRzUmVnaXN0cnkgPSByZXF1aXJlKCcuL2NvbXBvbmVudHMvY19mYWNldHMvY2ZfcmVnaXN0cnknKVxuXHQsIENvbXBvbmVudCA9IG1pbG9Db21wb25lbnRzUmVnaXN0cnkuZ2V0KCdDb21wb25lbnQnKVxuXHQsIFNjb3BlID0gcmVxdWlyZSgnLi9jb21wb25lbnRzL3Njb3BlJylcblx0LCBCaW5kQXR0cmlidXRlID0gcmVxdWlyZSgnLi9hdHRyaWJ1dGUvYV9iaW5kJylcblx0LCBCaW5kZXJFcnJvciA9IHJlcXVpcmUoJy4vdXRpbC9lcnJvcicpLkJpbmRlclxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi91dGlsL2NoZWNrJylcblx0LCBNYXRjaCA9ICBjaGVjay5NYXRjaDtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGJpbmRlcjtcblxuXG5mdW5jdGlvbiBiaW5kZXIoc2NvcGVFbCwgY29tcG9uZW50c1JlZ2lzdHJ5KSB7XG5cdHZhciBjb21wb25lbnRzUmVnaXN0cnkgPSBjb21wb25lbnRzUmVnaXN0cnkgfHwgbWlsb0NvbXBvbmVudHNSZWdpc3RyeVxuXHRcdCwgc2NvcGVFbCA9IHNjb3BlRWwgfHwgZG9jdW1lbnQuYm9keVxuXHRcdCwgc2NvcGUgPSBuZXcgU2NvcGU7XG5cblx0YmluZEVsZW1lbnQoc2NvcGUsIHNjb3BlRWwpO1xuXHRyZXR1cm4gc2NvcGU7XG5cblxuXHRmdW5jdGlvbiBiaW5kRWxlbWVudChzY29wZSwgZWwpe1xuXHRcdHZhciBhdHRyID0gbmV3IEJpbmRBdHRyaWJ1dGUoZWwpO1xuXG5cdFx0aWYgKGF0dHIubm9kZSlcblx0XHRcdHZhciBhQ29tcG9uZW50ID0gY3JlYXRlQ29tcG9uZW50KHNjb3BlLCBlbCwgYXR0cik7XG5cblx0XHQvLyBiaW5kIGlubmVyIGVsZW1lbnRzIHRvIGNvbXBvbmVudHNcblx0XHRpZiAoZWwuY2hpbGRyZW4gJiYgZWwuY2hpbGRyZW4ubGVuZ3RoKSB7XG5cdFx0XHR2YXIgaW5uZXJTY29wZSA9IGJpbmRDaGlsZHJlbihlbCk7XG5cblx0XHRcdGlmIChpbm5lclNjb3BlLl9sZW5ndGgoKSkge1xuXHRcdFx0XHQvLyBhdHRhY2ggaW5uZXIgY29tcG9uZW50cyB0byB0aGUgY3VycmVudCBvbmUgKGNyZWF0ZSBhIG5ldyBzY29wZSkgLi4uXG5cdFx0XHRcdGlmICh0eXBlb2YgYUNvbXBvbmVudCAhPSAndW5kZWZpbmVkJyAmJiBhQ29tcG9uZW50LmNvbnRhaW5lcilcblx0XHRcdFx0XHRhQ29tcG9uZW50LmNvbnRhaW5lci5zY29wZSA9IGlubmVyU2NvcGU7XG5cdFx0XHRcdGVsc2UgLy8gb3Iga2VlcCB0aGVtIGluIHRoZSBjdXJyZW50IHNjb3BlXG5cdFx0XHRcdFx0c2NvcGUuX2NvcHkoaW5uZXJTY29wZSk7O1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmIChhQ29tcG9uZW50KVxuXHRcdFx0c2NvcGUuX2FkZChhQ29tcG9uZW50LCBhdHRyLmNvbXBOYW1lKTtcblx0fVxuXG5cblx0ZnVuY3Rpb24gYmluZENoaWxkcmVuKG93bmVyRWwpIHtcblx0XHR2YXIgc2NvcGUgPSBuZXcgU2NvcGU7XG5cdFx0QXJyYXkucHJvdG90eXBlLmZvckVhY2guY2FsbChvd25lckVsLmNoaWxkcmVuLCBmdW5jdGlvbihlbCkge1xuXHRcdFx0YmluZEVsZW1lbnQoc2NvcGUsIGVsKVxuXHRcdH0pO1xuXHRcdHJldHVybiBzY29wZTtcblx0fVxuXG5cblx0ZnVuY3Rpb24gY3JlYXRlQ29tcG9uZW50KHNjb3BlLCBlbCwgYXR0cikge1xuXHRcdC8vIGVsZW1lbnQgd2lsbCBiZSBib3VuZCB0byBhIGNvbXBvbmVudFxuXHRcdGF0dHIucGFyc2UoKS52YWxpZGF0ZSgpO1xuXG5cdFx0Ly8gZ2V0IGNvbXBvbmVudCBjbGFzcyBmcm9tIHJlZ2lzdHJ5IGFuZCB2YWxpZGF0ZVxuXHRcdHZhciBDb21wb25lbnRDbGFzcyA9IGNvbXBvbmVudHNSZWdpc3RyeS5nZXQoYXR0ci5jb21wQ2xhc3MpO1xuXG5cdFx0aWYgKCEgQ29tcG9uZW50Q2xhc3MpXG5cdFx0XHR0aHJvdyBuZXcgQmluZGVyRXJyb3IoJ2NsYXNzICcgKyBhdHRyLmNvbXBDbGFzcyArICcgaXMgbm90IHJlZ2lzdGVyZWQnKTtcblxuXHRcdGNoZWNrKENvbXBvbmVudENsYXNzLCBNYXRjaC5TdWJjbGFzcyhDb21wb25lbnQsIHRydWUpKTtcblxuXHRcdC8vIGNyZWF0ZSBuZXcgY29tcG9uZW50XG5cdFx0dmFyIGFDb21wb25lbnQgPSBuZXcgQ29tcG9uZW50Q2xhc3Moc2NvcGUsIGVsLCBhdHRyLmNvbXBOYW1lKTtcblxuXHRcdC8vIGFkZCBleHRyYSBmYWNldHNcblx0XHR2YXIgZmFjZXRzID0gYXR0ci5jb21wRmFjZXRzO1xuXHRcdGlmIChmYWNldHMpXG5cdFx0XHRmYWNldHMuZm9yRWFjaChmdW5jdGlvbihmY3QpIHtcblx0XHRcdFx0YUNvbXBvbmVudC5hZGRGYWNldChmY3QpO1xuXHRcdFx0fSk7XG5cblx0XHRyZXR1cm4gYUNvbXBvbmVudDtcblx0fVxufVxuXG5cbmZ1bmN0aW9uIHNjYW4oc2NvcGVFbCkge1xuXHR2YXIgc2NvcGUgPSBuZXcgU2NvcGU7XG5cblx0dmFyIGF0dHIgPSBuZXcgQmluZEF0dHJpYnV0ZShzY29wZUVsKTtcblxuXHRhdHRyLnBhcnNlKCkudmFsaWRhdGUoKTtcblxuXHQvLyBnZXQgY29tcG9uZW50IGNsYXNzIGZyb20gcmVnaXN0cnkgYW5kIHZhbGlkYXRlXG5cdHZhciBDb21wb25lbnRDbGFzcyA9IG1pbG9GYWNldHNSZWdpc3RyeS5nZXQoYXR0ci5jb21wQ2xhc3MpO1xuXHRpZiAoISBDb21wb25lbnRDbGFzcylcblx0XHR0aHJvdyBuZXcgQmluZGVyRXJyb3IoJ2NsYXNzICcgKyBhdHRyLmNvbXBDbGFzcyArICcgaXMgbm90IHJlZ2lzdGVyZWQnKTtcblx0Y2hlY2soQ29tcG9uZW50Q2xhc3MsIE1hdGNoLlN1YmNsYXNzKENvbXBvbmVudCwgdHJ1ZSkpO1xuXHRhdHRyLkNvbXBvbmVudENsYXNzID0gQ29tcG9uZW50Q2xhc3M7XG5cblx0Ly8gYWRkIGV4dHJhIGZhY2V0c1xuXHR2YXIgZmFjZXRzID0gYXR0ci5jb21wRmFjZXRzO1xuXHRpZiAoZmFjZXRzICYmIGZhY2V0cy5sZW5ndGgpIHtcblx0XHR2YXIgZmFjZXRzQ2xhc3NlcyA9IFtdO1xuXHRcdGZhY2V0cy5mb3JFYWNoKGZ1bmN0aW9uKGZjdCkge1xuXHRcdFx0dmFyIEZhY2V0Q2xhc3MgPSBcblx0XHRcdGFDb21wb25lbnQuYWRkRmFjZXQoZmN0KTtcblx0XHR9KTtcblx0fVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgY2xhc3NlcyA9IHtcblx0RmFjZXQ6IHJlcXVpcmUoJy4vZmFjZXRzL2ZfY2xhc3MnKSxcblx0Q29tcG9uZW50OiByZXF1aXJlKCcuL2NvbXBvbmVudHMvY19jbGFzcycpLFxuXHRDb21wb25lbnRGYWNldDogcmVxdWlyZSgnLi9jb21wb25lbnRzL2NfZmFjZXQnKSxcblx0Q2xhc3NSZWdpc3RyeTogcmVxdWlyZSgnLi9hYnN0cmFjdC9yZWdpc3RyeScpLFxuXHRmYWNldHNSZWdpc3RyeTogcmVxdWlyZSgnLi9jb21wb25lbnRzL2NfZmFjZXRzL2NmX3JlZ2lzdHJ5JyksXG5cdGNvbXBvbmVudHNSZWdpc3RyeTogcmVxdWlyZSgnLi9jb21wb25lbnRzL2NfcmVnaXN0cnknKVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzc2VzO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgRmFjZXRlZE9iamVjdCA9IHJlcXVpcmUoJy4uL2ZhY2V0cy9mX29iamVjdCcpXG5cdCwgZmFjZXRzUmVnaXN0cnkgPSByZXF1aXJlKCcuL2NfZmFjZXRzL2NmX3JlZ2lzdHJ5Jylcblx0LCBDb21wb25lbnRGYWNldCA9IHJlcXVpcmUoJy4vY19mYWNldCcpXG5cdCwgTWVzc2VuZ2VyID0gcmVxdWlyZSgnLi4vbWVzc2VuZ2VyJylcblx0LCBfID0gcmVxdWlyZSgnbW9sLXByb3RvJylcblx0LCBjaGVjayA9IHJlcXVpcmUoJy4uL3V0aWwvY2hlY2snKVxuXHQsIE1hdGNoID0gY2hlY2suTWF0Y2g7XG5cbnZhciBDb21wb25lbnQgPSBfLmNyZWF0ZVN1YmNsYXNzKEZhY2V0ZWRPYmplY3QsICdDb21wb25lbnQnLCB0cnVlKTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb25lbnQ7XG5cblxuQ29tcG9uZW50LmNyZWF0ZUNvbXBvbmVudENsYXNzID0gZnVuY3Rpb24obmFtZSwgZmFjZXRzQ29uZmlnKSB7XG5cdHZhciBmYWNldHNDbGFzc2VzID0ge307XG5cblx0aWYgKEFycmF5LmlzQXJyYXkoZmFjZXRzQ29uZmlnKSkge1xuXHRcdHZhciBjb25maWdNYXAgPSB7fTtcblx0XHRmYWNldHNDb25maWcuZm9yRWFjaChmdW5jdGlvbihmY3QpIHtcblx0XHRcdHZhciBmY3ROYW1lID0gXy5maXJzdExvd2VyQ2FzZShmY3QpO1xuXHRcdFx0Y29uZmlnTWFwW2ZjdE5hbWVdID0ge307XG5cdFx0fSk7XG5cdFx0ZmFjZXRzQ29uZmlnID0gY29uZmlnTWFwO1xuXHR9XG5cblx0Xy5lYWNoS2V5KGZhY2V0c0NvbmZpZywgZnVuY3Rpb24oZmN0Q29uZmlnLCBmY3QpIHtcblx0XHR2YXIgZmN0TmFtZSA9IF8uZmlyc3RMb3dlckNhc2UoZmN0KTtcblx0XHR2YXIgZmN0Q2xhc3NOYW1lID0gXy5maXJzdFVwcGVyQ2FzZShmY3QpO1xuXHRcdGZhY2V0c0NsYXNzZXNbZmN0TmFtZV0gPSBmYWNldHNSZWdpc3RyeS5nZXQoZmN0Q2xhc3NOYW1lKTtcblx0fSk7XG5cblx0dmFyIENvbXBvbmVudENsYXNzID0gRmFjZXRlZE9iamVjdC5jcmVhdGVGYWNldGVkQ2xhc3MuY2FsbCh0aGlzLCBuYW1lLCBmYWNldHNDbGFzc2VzLCBmYWNldHNDb25maWcpO1xuXHRcblx0cmV0dXJuIENvbXBvbmVudENsYXNzO1xufTtcblxuZGVsZXRlIENvbXBvbmVudC5jcmVhdGVGYWNldGVkQ2xhc3M7XG5cblxuXy5leHRlbmRQcm90byhDb21wb25lbnQsIHtcblx0aW5pdDogaW5pdENvbXBvbmVudCxcblx0YWRkRmFjZXQ6IGFkZEZhY2V0LFxuXHRhbGxGYWNldHM6IGVudm9rZU1ldGhvZE9uQWxsRmFjZXRzLFxuXHRyZW1vdmU6IHJlbW92ZUNvbXBvbmVudEZyb21TY29wZVxufSk7XG5cblxuZnVuY3Rpb24gaW5pdENvbXBvbmVudChzY29wZSwgZWxlbWVudCwgbmFtZSkge1xuXHR0aGlzLmVsID0gZWxlbWVudDtcblx0dGhpcy5uYW1lID0gbmFtZTtcblx0dGhpcy5zY29wZSA9IHNjb3BlO1xuXG5cdHZhciBtZXNzZW5nZXIgPSBuZXcgTWVzc2VuZ2VyKHRoaXMsIE1lc3Nlbmdlci5kZWZhdWx0TWV0aG9kcywgdW5kZWZpbmVkIC8qIG5vIG1lc3NhZ2VTb3VyY2UgKi8pO1xuXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRoaXMsIHtcblx0XHRfbWVzc2VuZ2VyOiB7IHZhbHVlOiBtZXNzZW5nZXIgfSxcblx0fSk7XHRcblxuXHQvLyBzdGFydCBhbGwgZmFjZXRzXG5cdHRoaXMuYWxsRmFjZXRzKCdjaGVjaycpO1xuXHR0aGlzLmFsbEZhY2V0cygnc3RhcnQnKTtcbn1cblxuXG5mdW5jdGlvbiBhZGRGYWNldChmYWNldE5hbWVPckNsYXNzLCBmYWNldE9wdHMsIGZhY2V0TmFtZSkge1xuXHRjaGVjayhmYWNldE5hbWVPckNsYXNzLCBNYXRjaC5PbmVPZihTdHJpbmcsIE1hdGNoLlN1YmNsYXNzKENvbXBvbmVudEZhY2V0KSkpO1xuXHRjaGVjayhmYWNldE9wdHMsIE1hdGNoLk9wdGlvbmFsKE9iamVjdCkpO1xuXHRjaGVjayhmYWNldE5hbWUsIE1hdGNoLk9wdGlvbmFsKFN0cmluZykpO1xuXG5cdGlmICh0eXBlb2YgZmFjZXROYW1lT3JDbGFzcyA9PSAnc3RyaW5nJykge1xuXHRcdHZhciBmYWNldENsYXNzTmFtZSA9IF8uZmlyc3RVcHBlckNhc2UoZmFjZXROYW1lT3JDbGFzcyk7XG5cdFx0dmFyIEZhY2V0Q2xhc3MgPSBmYWNldHNSZWdpc3RyeS5nZXQoZmFjZXRDbGFzc05hbWUpO1xuXHR9IGVsc2UgXG5cdFx0RmFjZXRDbGFzcyA9IGZhY2V0TmFtZU9yQ2xhc3M7XG5cblx0ZmFjZXROYW1lID0gZmFjZXROYW1lIHx8IF8uZmlyc3RMb3dlckNhc2UoRmFjZXRDbGFzcy5uYW1lKTtcblxuXHR2YXIgbmV3RmFjZXQgPSBGYWNldGVkT2JqZWN0LnByb3RvdHlwZS5hZGRGYWNldC5jYWxsKHRoaXMsIEZhY2V0Q2xhc3MsIGZhY2V0T3B0cywgZmFjZXROYW1lKTtcblxuXHQvLyBzdGFydCBmYWNldFxuXHRuZXdGYWNldC5jaGVjayAmJiBuZXdGYWNldC5jaGVjaygpO1xuXHRuZXdGYWNldC5zdGFydCAmJiBuZXdGYWNldC5zdGFydCgpO1xufVxuXG5cbmZ1bmN0aW9uIGVudm9rZU1ldGhvZE9uQWxsRmFjZXRzKG1ldGhvZCAvKiAsIC4uLiAqLykge1xuXHR2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG5cblx0Xy5lYWNoS2V5KHRoaXMuZmFjZXRzLCBmdW5jdGlvbihmYWNldCwgZmN0TmFtZSkge1xuXHRcdGlmIChmYWNldCAmJiB0eXBlb2YgZmFjZXRbbWV0aG9kXSA9PSAnZnVuY3Rpb24nKVxuXHRcdFx0ZmFjZXRbbWV0aG9kXS5hcHBseShmYWNldCwgYXJncyk7XG5cdH0pO1xufVxuXG5cbmZ1bmN0aW9uIHJlbW92ZUNvbXBvbmVudEZyb21TY29wZSgpIHtcblx0aWYgKHRoaXMuc2NvcGUpXG5cdFx0ZGVsZXRlIHRoaXMuc2NvcGVbdGhpcy5uYW1lXTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIEZhY2V0ID0gcmVxdWlyZSgnLi4vZmFjZXRzL2ZfY2xhc3MnKVxuXHQsIE1lc3NlbmdlciA9IHJlcXVpcmUoJy4uL21lc3NlbmdlcicpXG5cdCwgRmFjZXRFcnJvciA9IHJlcXVpcmUoJy4uL3V0aWwvZXJyb3InKS5GYWNldFxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKTtcblxudmFyIENvbXBvbmVudEZhY2V0ID0gXy5jcmVhdGVTdWJjbGFzcyhGYWNldCwgJ0NvbXBvbmVudEZhY2V0Jyk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ29tcG9uZW50RmFjZXQ7XG5cblxuXy5leHRlbmRQcm90byhDb21wb25lbnRGYWNldCwge1xuXHRpbml0OiBpbml0Q29tcG9uZW50RmFjZXQsXG5cdHN0YXJ0OiBzdGFydENvbXBvbmVudEZhY2V0LFxuXHRjaGVjazogY2hlY2tEZXBlbmRlbmNpZXMsXG5cdF9zZXRNZXNzYWdlU291cmNlOiBfc2V0TWVzc2FnZVNvdXJjZSxcblx0X2NyZWF0ZU1lc3NhZ2VTb3VyY2U6IF9jcmVhdGVNZXNzYWdlU291cmNlXG59KTtcblxuXG5mdW5jdGlvbiBpbml0Q29tcG9uZW50RmFjZXQoKSB7XG5cdHZhciBtZXNzZW5nZXIgPSBuZXcgTWVzc2VuZ2VyKHRoaXMsIE1lc3Nlbmdlci5kZWZhdWx0TWV0aG9kcywgdW5kZWZpbmVkIC8qIG5vIG1lc3NhZ2VTb3VyY2UgKi8pO1xuXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRoaXMsIHtcblx0XHRfbWVzc2VuZ2VyOiB7IHZhbHVlOiBtZXNzZW5nZXIgfSxcblx0fSk7XG59XG5cblxuZnVuY3Rpb24gc3RhcnRDb21wb25lbnRGYWNldCgpIHtcblx0aWYgKHRoaXMuY29uZmlnLm1lc3NhZ2VzKVxuXHRcdHRoaXMub25NZXNzYWdlcyh0aGlzLmNvbmZpZy5tZXNzYWdlcyk7XG59XG5cblxuZnVuY3Rpb24gY2hlY2tEZXBlbmRlbmNpZXMoKSB7XG5cdGlmICh0aGlzLnJlcXVpcmUpIHtcblx0XHR0aGlzLnJlcXVpcmUuZm9yRWFjaChmdW5jdGlvbihyZXFGYWNldCkge1xuXHRcdFx0dmFyIGZhY2V0TmFtZSA9IF8uZmlyc3RMb3dlckNhc2UocmVxRmFjZXQpO1xuXHRcdFx0aWYgKCEgKHRoaXMub3duZXJbZmFjZXROYW1lXSBpbnN0YW5jZW9mIENvbXBvbmVudEZhY2V0KSlcblx0XHRcdFx0dGhyb3cgbmV3IEZhY2V0RXJyb3IoJ2ZhY2V0ICcgKyB0aGlzLmNvbnN0cnVjdG9yLm5hbWUgKyAnIHJlcXVpcmVzIGZhY2V0ICcgKyByZXFGYWNldCk7XG5cdFx0fSwgdGhpcyk7XG5cdH1cbn1cblxuXG5mdW5jdGlvbiBfc2V0TWVzc2FnZVNvdXJjZShtZXNzYWdlU291cmNlKSB7XG5cdHRoaXMuX21lc3Nlbmdlci5fc2V0TWVzc2FnZVNvdXJjZShtZXNzYWdlU291cmNlKTtcbn1cblxuXG5mdW5jdGlvbiBfY3JlYXRlTWVzc2FnZVNvdXJjZShNZXNzYWdlU291cmNlQ2xhc3MpIHtcblx0dmFyIG1lc3NhZ2VTb3VyY2UgPSBuZXcgTWVzc2FnZVNvdXJjZUNsYXNzKHRoaXMsIHVuZGVmaW5lZCwgdGhpcy5vd25lcik7XG5cdHRoaXMuX3NldE1lc3NhZ2VTb3VyY2UobWVzc2FnZVNvdXJjZSlcblxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ19tZXNzYWdlU291cmNlJywgeyB2YWx1ZTogbWVzc2FnZVNvdXJjZSB9KTtcbn0iLCIndXNlIHN0cmljdCc7XG5cbnZhciBDb21wb25lbnRGYWNldCA9IHJlcXVpcmUoJy4uL2NfZmFjZXQnKVxuXHQsIGJpbmRlciA9IHJlcXVpcmUoJy4uLy4uL2JpbmRlcicpXG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpXG5cdCwgZmFjZXRzUmVnaXN0cnkgPSByZXF1aXJlKCcuL2NmX3JlZ2lzdHJ5Jyk7XG5cbi8vIGNvbnRhaW5lciBmYWNldFxudmFyIENvbnRhaW5lciA9IF8uY3JlYXRlU3ViY2xhc3MoQ29tcG9uZW50RmFjZXQsICdDb250YWluZXInKTtcblxuXy5leHRlbmRQcm90byhDb250YWluZXIsIHtcblx0aW5pdDogaW5pdENvbnRhaW5lcixcblx0X2JpbmQ6IF9iaW5kQ29tcG9uZW50cyxcblx0Ly8gYWRkOiBhZGRDaGlsZENvbXBvbmVudHNcbn0pO1xuXG5mYWNldHNSZWdpc3RyeS5hZGQoQ29udGFpbmVyKTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb250YWluZXI7XG5cblxuZnVuY3Rpb24gaW5pdENvbnRhaW5lcigpIHtcblx0Q29tcG9uZW50RmFjZXQucHJvdG90eXBlLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblx0dGhpcy5zY29wZSA9IHt9O1xufVxuXG5cbmZ1bmN0aW9uIF9iaW5kQ29tcG9uZW50cygpIHtcblx0Ly8gVE9ET1xuXHQvLyB0aGlzIGZ1bmN0aW9uIHNob3VsZCByZS1iaW5kIHJhdGhlciB0aGFuIGJpbmQgYWxsIGludGVybmFsIGVsZW1lbnRzXG5cdHRoaXMuc2NvcGUgPSBiaW5kZXIodGhpcy5vd25lci5lbCk7XG59XG5cblxuZnVuY3Rpb24gYWRkQ2hpbGRDb21wb25lbnRzKGNoaWxkQ29tcG9uZW50cykge1xuXHQvLyBUT0RPXG5cdC8vIHRoaXMgZnVuY3Rpb24gc2hvdWxkIGludGVsbGlnZW50bHkgcmUtYmluZCBleGlzdGluZyBjb21wb25lbnRzIHRvXG5cdC8vIG5ldyBlbGVtZW50cyAoaWYgdGhleSBjaGFuZ2VkKSBhbmQgcmUtYmluZCBwcmV2aW91c2x5IGJvdW5kIGV2ZW50cyB0byB0aGUgc2FtZVxuXHQvLyBldmVudCBoYW5kbGVyc1xuXHQvLyBvciBtYXliZSBub3QsIGlmIHRoaXMgZnVuY3Rpb24gaXMgb25seSB1c2VkIGJ5IGJpbmRlciB0byBhZGQgbmV3IGVsZW1lbnRzLi4uXG5cdF8uZXh0ZW5kKHRoaXMuc2NvcGUsIGNoaWxkQ29tcG9uZW50cyk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBDb21wb25lbnRGYWNldCA9IHJlcXVpcmUoJy4uL2NfZmFjZXQnKVxuXHQsIGZhY2V0c1JlZ2lzdHJ5ID0gcmVxdWlyZSgnLi9jZl9yZWdpc3RyeScpXG5cblx0LCBNZXNzZW5nZXIgPSByZXF1aXJlKCcuLi8uLi9tZXNzZW5nZXInKVxuXHQsIENvbXBvbmVudERhdGFTb3VyY2UgPSByZXF1aXJlKCcuLi9jX21lc3NhZ2Vfc291cmNlcy9jb21wb25lbnRfZGF0YV9zb3VyY2UnKVxuXG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpO1xuXG5cbi8vIGRhdGEgbW9kZWwgY29ubmVjdGlvbiBmYWNldFxudmFyIERhdGEgPSBfLmNyZWF0ZVN1YmNsYXNzKENvbXBvbmVudEZhY2V0LCAnRGF0YScpO1xuXG5fLmV4dGVuZFByb3RvKERhdGEsIHtcblx0aW5pdDogaW5pdERhdGFGYWNldCxcblxuXHQvLyBfcmVhdHRhY2g6IF9yZWF0dGFjaEV2ZW50c09uRWxlbWVudENoYW5nZVxufSk7XG5cbmZhY2V0c1JlZ2lzdHJ5LmFkZChEYXRhKTtcblxubW9kdWxlLmV4cG9ydHMgPSBEYXRhO1xuXG5cbmZ1bmN0aW9uIGluaXREYXRhRmFjZXQoKSB7XG5cdENvbXBvbmVudEZhY2V0LnByb3RvdHlwZS5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cblx0dmFyIHByb3h5Q29tcERhdGFTb3VyY2VNZXRob2RzID0ge1xuXHRcdHZhbHVlOiAndmFsdWUnLFxuXHRcdHRyaWdnZXI6ICd0cmlnZ2VyJ1xuXHR9O1xuXG5cdC8vIGluc3RlYWQgb2YgdGhpcy5vd25lciBzaG91bGQgcGFzcyBtb2RlbD8gV2hlcmUgaXQgaXMgc2V0P1xuXHR2YXIgY29tcERhdGFTb3VyY2UgPSBuZXcgQ29tcG9uZW50RGF0YVNvdXJjZSh0aGlzLCBwcm94eUNvbXBEYXRhU291cmNlTWV0aG9kcywgdGhpcy5vd25lcik7XG5cdHRoaXMuX3NldE1lc3NhZ2VTb3VyY2UoY29tcERhdGFTb3VyY2UpO1xuXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRoaXMsIHtcblx0XHRfY29tcERhdGFTb3VyY2U6IHsgdmFsdWU6IGNvbXBEYXRhU291cmNlIH1cblx0fSk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBDb21wb25lbnRGYWNldCA9IHJlcXVpcmUoJy4uL2NfZmFjZXQnKVxuXHQsIGZhY2V0c1JlZ2lzdHJ5ID0gcmVxdWlyZSgnLi9jZl9yZWdpc3RyeScpXHRcblx0LCBfID0gcmVxdWlyZSgnbW9sLXByb3RvJylcblx0LCBjaGVjayA9IHJlcXVpcmUoJy4uLy4uL3V0aWwvY2hlY2snKVxuXHQsIE1hdGNoID0gY2hlY2suTWF0Y2hcblx0LCBiaW5kZXIgPSByZXF1aXJlKCcuLi8uLi9iaW5kZXInKTtcblxuXG4vLyBkYXRhIG1vZGVsIGNvbm5lY3Rpb24gZmFjZXRcbnZhciBEb20gPSBfLmNyZWF0ZVN1YmNsYXNzKENvbXBvbmVudEZhY2V0LCAnRG9tJyk7XG5cbl8uZXh0ZW5kUHJvdG8oRG9tLCB7XG5cdGluaXQ6IGluaXREb21GYWNldCxcblx0c3RhcnQ6IHN0YXJ0RG9tRmFjZXQsXG5cblx0c2hvdzogc2hvd0VsZW1lbnQsXG5cdGhpZGU6IGhpZGVFbGVtZW50LFxuXHRyZW1vdmU6IHJlbW92ZUVsZW1lbnQsXG5cdGFwcGVuZDogYXBwZW5kSW5zaWRlRWxlbWVudCxcblx0cHJlcGVuZDogcHJlcGVuZEluc2lkZUVsZW1lbnQsXG5cblx0Ly8gX3JlYXR0YWNoOiBfcmVhdHRhY2hFdmVudHNPbkVsZW1lbnRDaGFuZ2Vcbn0pO1xuXG5mYWNldHNSZWdpc3RyeS5hZGQoRG9tKTtcblxubW9kdWxlLmV4cG9ydHMgPSBEb207XG5cblxuZnVuY3Rpb24gaW5pdERvbUZhY2V0KCkge1xuXHRDb21wb25lbnRGYWNldC5wcm90b3R5cGUuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufVxuXG5mdW5jdGlvbiBzdGFydERvbUZhY2V0KCkge1xuXHRpZiAodGhpcy5jb25maWcuY2xzKVxuXHRcdHRoaXMub3duZXIuZWwuY2xhc3NMaXN0LmFkZCh0aGlzLmNvbmZpZy5jbHMpO1xufVxuXG5mdW5jdGlvbiBzaG93RWxlbWVudCgpIHtcblx0dGhpcy5vd25lci5lbC5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcbn1cblxuZnVuY3Rpb24gaGlkZUVsZW1lbnQoKSB7XG5cdHRoaXMub3duZXIuZWwuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbn1cblxuZnVuY3Rpb24gcmVtb3ZlRWxlbWVudCgpIHtcblx0dmFyIHRoaXNFbCA9IHRoaXMub3duZXIuZWw7XG5cdHRoaXNFbC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRoaXNFbCk7XG59XG5cbmZ1bmN0aW9uIGFwcGVuZEluc2lkZUVsZW1lbnQoZWwpIHtcblx0dGhpcy5vd25lci5lbC5hcHBlbmRDaGlsZChlbClcbn1cblxuZnVuY3Rpb24gcHJlcGVuZEluc2lkZUVsZW1lbnQoZWwpIHtcblx0dmFyIHRoaXNFbCA9IHRoaXMub3duZXIuZWxcblx0XHQsIGZpcnN0Q2hpbGQgPSB0aGlzRWwuZmlyc3RDaGlsZDtcblx0aWYgKGZpcnN0Q2hpbGQpXG5cdFx0dGhpc0VsLmluc2VydEJlZm9yZShlbCwgZmlyc3RDaGlsZCk7XG5cdGVsc2Vcblx0XHR0aGlzRWwuYXBwZW5kQ2hpbGQoZWwpO1xufVxuXG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBDb21wb25lbnRGYWNldCA9IHJlcXVpcmUoJy4uL2NfZmFjZXQnKVxuXHQsIGZhY2V0c1JlZ2lzdHJ5ID0gcmVxdWlyZSgnLi9jZl9yZWdpc3RyeScpXG5cdCwgRE9NRXZlbnRzU291cmNlID0gcmVxdWlyZSgnLi4vY19tZXNzYWdlX3NvdXJjZXMvZG9tX2V2ZW50c19zb3VyY2UnKVxuXG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpO1xuXG5cbi8vIGdlbmVyaWMgZHJhZyBoYW5kbGVyLCBzaG91bGQgYmUgb3ZlcnJpZGRlblxudmFyIERyYWcgPSBfLmNyZWF0ZVN1YmNsYXNzKENvbXBvbmVudEZhY2V0LCAnRHJhZycpO1xuXG5fLmV4dGVuZFByb3RvKERyYWcsIHtcblx0aW5pdDogaW5pdERyYWdGYWNldCxcblx0c3RhcnQ6IHN0YXJ0RHJhZ0ZhY2V0LFxuXG5cdHNldEhhbmRsZTogc2V0RHJhZ0hhbmRsZVxuXHQvLyBfcmVhdHRhY2g6IF9yZWF0dGFjaEV2ZW50c09uRWxlbWVudENoYW5nZVxufSk7XG5cbmZhY2V0c1JlZ2lzdHJ5LmFkZChEcmFnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBEcmFnO1xuXG5cbmZ1bmN0aW9uIGluaXREcmFnRmFjZXQoKSB7XG5cdENvbXBvbmVudEZhY2V0LnByb3RvdHlwZS5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XHRcblx0dGhpcy5fY3JlYXRlTWVzc2FnZVNvdXJjZShET01FdmVudHNTb3VyY2UpO1xufVxuXG5cbmZ1bmN0aW9uIHNldERyYWdIYW5kbGUoaGFuZGxlRWwpIHtcblx0aWYgKCEgdGhpcy5vd25lci5lbC5jb250YWlucyhoYW5kbGVFbCkpXG5cdFx0cmV0dXJuIGxvZ2dlci53YXJuKCdkcmFnIGhhbmRsZSBzaG91bGQgYmUgaW5zaWRlIGVsZW1lbnQgdG8gYmUgZHJhZ2dlZCcpXG5cdHRoaXMuX2RyYWdIYW5kbGUgPSBoYW5kbGVFbDtcbn1cblxuXG5mdW5jdGlvbiBzdGFydERyYWdGYWNldCgpIHtcblx0Q29tcG9uZW50RmFjZXQucHJvdG90eXBlLnN0YXJ0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cdHRoaXMub3duZXIuZWwuc2V0QXR0cmlidXRlKCdkcmFnZ2FibGUnLCB0cnVlKTtcblxuXHR0aGlzLm9uKCdtb3VzZWRvd24nLCBvbk1vdXNlRG93bik7XG5cdHRoaXMub24oJ21vdXNlZW50ZXIgbW91c2VsZWF2ZSBtb3VzZW1vdmUnLCBvbk1vdXNlTW92ZW1lbnQpO1xuXHR0aGlzLm9uKCdkcmFnc3RhcnQgZHJhZycsIG9uRHJhZ2dpbmcpO1xuXG5cdHZhciBzZWxmID0gdGhpcztcblxuXHRmdW5jdGlvbiBvbk1vdXNlRG93bihldmVudFR5cGUsIGV2ZW50KSB7XG5cdFx0c2VsZi5fdGFyZ2V0ID0gZXZlbnQudGFyZ2V0O1xuXHRcdGlmICh0YXJnZXRJbkRyYWdIYW5kbGUoZXZlbnQpKVxuXHRcdFx0d2luZG93LmdldFNlbGVjdGlvbigpLmVtcHR5KCk7XG5cdH1cblxuXHRmdW5jdGlvbiBvbk1vdXNlTW92ZW1lbnQoZXZlbnRUeXBlLCBldmVudCkge1xuXHRcdHZhciBzaG91bGRCZURyYWdnYWJsZSA9IHRhcmdldEluRHJhZ0hhbmRsZShldmVudCk7XG5cdFx0c2VsZi5vd25lci5lbC5zZXRBdHRyaWJ1dGUoJ2RyYWdnYWJsZScsIHNob3VsZEJlRHJhZ2dhYmxlKTtcblx0fVxuXG5cdGZ1bmN0aW9uIG9uRHJhZ2dpbmcoZXZlbnRUeXBlLCBldmVudCkge1xuXHRcdGlmICh0YXJnZXRJbkRyYWdIYW5kbGUoZXZlbnQpKSB7XG5cdFx0XHR2YXIgZHQgPSBldmVudC5kYXRhVHJhbnNmZXI7XG5cdFx0XHRkdC5zZXREYXRhKCd0ZXh0L2h0bWwnLCBzZWxmLm93bmVyLmVsLm91dGVySFRNTCk7XG5cdFx0XHRkdC5zZXREYXRhKCd4LWFwcGxpY2F0aW9uL21pbG8tY29tcG9uZW50Jywgc2VsZi5vd25lcik7XG5cdFx0fSBlbHNlXG5cdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHR9XG5cblx0ZnVuY3Rpb24gY2FsbENvbmZpZ3VyZWRIYW5kbGVyKGV2ZW50VHlwZSwgZXZlbnQpIHtcblx0XHR2YXIgaGFuZGxlclByb3BlcnR5ID0gJ19vbicgKyBldmVudFR5cGVcblx0XHRcdCwgaGFuZGxlciA9IHNlbGZbaGFuZGxlclByb3BlcnR5XTtcblx0XHRpZiAoaGFuZGxlcilcblx0XHRcdGhhbmRsZXIuY2FsbChzZWxmLm93bmVyLCBldmVudFR5cGUsIGV2ZW50KTtcblx0fVxuXG5cdGZ1bmN0aW9uIHRhcmdldEluRHJhZ0hhbmRsZShldmVudCkge1xuXHRcdHJldHVybiAhIHNlbGYuX2RyYWdIYW5kbGUgfHwgc2VsZi5fZHJhZ0hhbmRsZS5jb250YWlucyhzZWxmLl90YXJnZXQpO1xuXHR9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBDb21wb25lbnRGYWNldCA9IHJlcXVpcmUoJy4uL2NfZmFjZXQnKVxuXHQsIGZhY2V0c1JlZ2lzdHJ5ID0gcmVxdWlyZSgnLi9jZl9yZWdpc3RyeScpXG5cblx0LCBfID0gcmVxdWlyZSgnbW9sLXByb3RvJyk7XG5cblxuLy8gZ2VuZXJpYyBkcmFnIGhhbmRsZXIsIHNob3VsZCBiZSBvdmVycmlkZGVuXG52YXIgRHJvcCA9IF8uY3JlYXRlU3ViY2xhc3MoQ29tcG9uZW50RmFjZXQsICdEcm9wJyk7XG5cbl8uZXh0ZW5kUHJvdG8oRHJvcCwge1xuXHRpbml0OiBpbml0RHJvcEZhY2V0LFxuXHRzdGFydDogc3RhcnREcm9wRmFjZXQsXG5cdHJlcXVpcmU6IFsnRXZlbnRzJ10gLy8gVE9ETyBpbXBsZW1lbnQgZmFjZXQgZGVwZW5kZW5jaWVzXG5cblx0Ly8gX3JlYXR0YWNoOiBfcmVhdHRhY2hFdmVudHNPbkVsZW1lbnRDaGFuZ2Vcbn0pO1xuXG5mYWNldHNSZWdpc3RyeS5hZGQoRHJvcCk7XG5cbm1vZHVsZS5leHBvcnRzID0gRHJvcDtcblxuXG5mdW5jdGlvbiBpbml0RHJvcEZhY2V0KCkge1xuXHRDb21wb25lbnRGYWNldC5wcm90b3R5cGUuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG5cdHRoaXMuX29uZHJhZ2VudGVyID0gdGhpcy5jb25maWcub25kcmFnZW50ZXI7XG5cdHRoaXMuX29uZHJhZ292ZXIgPSB0aGlzLmNvbmZpZy5vbmRyYWdvdmVyO1xuXHR0aGlzLl9vbmRyYWdsZWF2ZSA9IHRoaXMuY29uZmlnLm9uZHJhZ2xlYXZlO1xuXHR0aGlzLl9vbmRyb3AgPSB0aGlzLmNvbmZpZy5vbmRyb3A7XG59XG5cblxuZnVuY3Rpb24gc3RhcnREcm9wRmFjZXQoKSB7XG5cdHZhciBldmVudHNGYWNldCA9IHRoaXMub3duZXIuZXZlbnRzO1xuXHRldmVudHNGYWNldC5vbignZHJhZ2VudGVyIGRyYWdvdmVyJywgb25EcmFnZ2luZyk7XG5cdGV2ZW50c0ZhY2V0Lm9uKCdkcmFnZW50ZXIgZHJhZ292ZXIgZHJhZ2xlYXZlIGRyb3AnLCBjYWxsQ29uZmlndXJlZEhhbmRsZXIpO1xuXG5cdHZhciBzZWxmID0gdGhpcztcblxuXHRmdW5jdGlvbiBjYWxsQ29uZmlndXJlZEhhbmRsZXIoZXZlbnRUeXBlLCBldmVudCkge1xuXHRcdHZhciBoYW5kbGVyUHJvcGVydHkgPSAnX29uJyArIGV2ZW50VHlwZVxuXHRcdFx0LCBoYW5kbGVyID0gc2VsZltoYW5kbGVyUHJvcGVydHldO1xuXHRcdGlmIChoYW5kbGVyKVxuXHRcdFx0aGFuZGxlci5jYWxsKHNlbGYub3duZXIsIGV2ZW50VHlwZSwgZXZlbnQpO1xuXHR9XG5cblxuXHRmdW5jdGlvbiBvbkRyYWdnaW5nKGV2ZW50VHlwZSwgZXZlbnQpIHtcblx0XHR2YXIgZGF0YVR5cGVzID0gZXZlbnQuZGF0YVRyYW5zZmVyLnR5cGVzXG5cdFx0aWYgKGRhdGFUeXBlcy5pbmRleE9mKCd0ZXh0L2h0bWwnKSA+PSAwXG5cdFx0XHRcdHx8IGRhdGFUeXBlcy5pbmRleE9mKCd4LWFwcGxpY2F0aW9uL21pbG8tY29tcG9uZW50JykgPj0gMCkge1xuXHRcdFx0ZXZlbnQuZGF0YVRyYW5zZmVyLmRyb3BFZmZlY3QgPSAnbW92ZSc7XG5cdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdH1cblx0fVxufSIsIid1c2Ugc3RyaWN0JztcblxudmFyIENvbXBvbmVudEZhY2V0ID0gcmVxdWlyZSgnLi4vY19mYWNldCcpXG5cdCwgZmFjZXRzUmVnaXN0cnkgPSByZXF1aXJlKCcuL2NmX3JlZ2lzdHJ5JylcblxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKTtcblxuXG4vLyBnZW5lcmljIGRyYWcgaGFuZGxlciwgc2hvdWxkIGJlIG92ZXJyaWRkZW5cbnZhciBFZGl0YWJsZSA9IF8uY3JlYXRlU3ViY2xhc3MoQ29tcG9uZW50RmFjZXQsICdFZGl0YWJsZScpO1xuXG5fLmV4dGVuZFByb3RvKEVkaXRhYmxlLCB7XG5cdGluaXQ6IGluaXRFZGl0YWJsZUZhY2V0LFxuXHRzdGFydDogc3RhcnRFZGl0YWJsZUZhY2V0LFxuXHRtYWtlRWRpdGFibGU6IG1ha2VFZGl0YWJsZSxcblx0cmVxdWlyZTogWydFdmVudHMnXSAvLyBUT0RPIGltcGxlbWVudCBmYWNldCBkZXBlbmRlbmNpZXNcblxuXHQvLyBfcmVhdHRhY2g6IF9yZWF0dGFjaEV2ZW50c09uRWxlbWVudENoYW5nZVxufSk7XG5cbmZhY2V0c1JlZ2lzdHJ5LmFkZChFZGl0YWJsZSk7XG5cbm1vZHVsZS5leHBvcnRzID0gRWRpdGFibGU7XG5cblxuZnVuY3Rpb24gaW5pdEVkaXRhYmxlRmFjZXQoKSB7XG5cdENvbXBvbmVudEZhY2V0LnByb3RvdHlwZS5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cblx0dGhpcy5fZWRpdGFibGUgPSB0eXBlb2YgdGhpcy5jb25maWcuZWRpdGFibGUgIT0gJ3VuZGVmaW5lZCdcblx0XHRcdFx0XHRcdD8gdGhpcy5jb25maWcuZWRpdGFibGVcblx0XHRcdFx0XHRcdDogdHJ1ZTtcblxuXHR0aGlzLl9lZGl0YWJsZU9uQ2xpY2sgPSB0aGlzLmNvbmZpZy5lZGl0YWJsZU9uQ2xpY2s7XG5cblx0dGhpcy5fb25lZGl0YWJsZSA9IHRoaXMuY29uZmlnLm9uZWRpdGFibGU7XG5cdHRoaXMuX29uZW50ZXJrZXkgPSB0aGlzLmNvbmZpZy5vbmVudGVya2V5O1xuXHR0aGlzLl9vbmtleXByZXNzID0gdGhpcy5jb25maWcub25rZXlwcmVzcztcblx0dGhpcy5fb25rZXlkb3duID0gdGhpcy5jb25maWcub25rZXlkb3duO1xufVxuXG5cbmZ1bmN0aW9uIG1ha2VFZGl0YWJsZShlZGl0YWJsZSkge1xuXHR0aGlzLm93bmVyLmVsLnNldEF0dHJpYnV0ZSgnY29udGVudGVkaXRhYmxlJywgZWRpdGFibGUpO1xuXHRpZiAoZWRpdGFibGUgJiYgdGhpcy5fb25lZGl0YWJsZSlcblx0XHR0aGlzLl9vbmVkaXRhYmxlLmNhbGwodGhpcy5vd25lciwgJ2VkaXRhYmxlJylcbn1cblxuXG5mdW5jdGlvbiBzdGFydEVkaXRhYmxlRmFjZXQoKSB7XG5cdGlmICh0aGlzLl9lZGl0YWJsZSlcblx0XHR0aGlzLm1ha2VFZGl0YWJsZSh0cnVlKTtcblx0XG5cdHZhciBldmVudHNGYWNldCA9IHRoaXMub3duZXIuZXZlbnRzO1xuXHRldmVudHNGYWNldC5vbk1lc3NhZ2VzKHtcblx0XHQnbW91c2Vkb3duJzogb25Nb3VzZURvd24sXG5cdFx0J2JsdXInOiBvbkJsdXIsXG5cdFx0J2tleXByZXNzJzogb25LZXlQcmVzcyxcblx0XHQna2V5ZG93bic6IGNhbGxDb25maWd1cmVkSGFuZGxlclxuXHR9KTtcblxuXHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0ZnVuY3Rpb24gY2FsbENvbmZpZ3VyZWRIYW5kbGVyKGV2ZW50VHlwZSwgZXZlbnQpIHtcblx0XHR2YXIgaGFuZGxlclByb3BlcnR5ID0gJ19vbicgKyBldmVudFR5cGVcblx0XHRcdCwgaGFuZGxlciA9IHNlbGZbaGFuZGxlclByb3BlcnR5XTtcblx0XHRpZiAoaGFuZGxlcilcblx0XHRcdGhhbmRsZXIuY2FsbChzZWxmLm93bmVyLCBldmVudFR5cGUsIGV2ZW50KTtcblx0fVxuXG5cdGZ1bmN0aW9uIG9uTW91c2VEb3duKGV2ZW50VHlwZSwgZXZlbnQpIHtcblx0XHRpZiAoc2VsZi5fZWRpdGFibGVPbkNsaWNrKVxuXHRcdFx0c2VsZi5tYWtlRWRpdGFibGUodHJ1ZSk7XG5cdH1cblxuXHRmdW5jdGlvbiBvbkJsdXIoZXZlbnRUeXBlLCBldmVudCkge1xuXHRcdGlmIChzZWxmLl9lZGl0YWJsZU9uQ2xpY2spXG5cdFx0XHRzZWxmLm1ha2VFZGl0YWJsZShmYWxzZSk7XG5cdH1cblxuXHRmdW5jdGlvbiBvbktleVByZXNzKGV2ZW50VHlwZSwgZXZlbnQpIHtcblx0XHRpZiAoZXZlbnQua2V5Q29kZSA9PSAxMyAmJiBzZWxmLl9vbmVudGVya2V5KVxuXHRcdFx0c2VsZi5fb25lbnRlcmtleS5jYWxsKHNlbGYub3duZXIsICdvbmVudGVya2V5JywgZXZlbnQpO1xuXG5cdFx0Y2FsbENvbmZpZ3VyZWRIYW5kbGVyKGV2ZW50VHlwZSwgZXZlbnQpO1xuXHR9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBDb21wb25lbnRGYWNldCA9IHJlcXVpcmUoJy4uL2NfZmFjZXQnKVxuXHQsIGZhY2V0c1JlZ2lzdHJ5ID0gcmVxdWlyZSgnLi9jZl9yZWdpc3RyeScpXG5cblx0LCBNZXNzZW5nZXIgPSByZXF1aXJlKCcuLi8uLi9tZXNzZW5nZXInKVxuXHQsIERPTUV2ZW50c1NvdXJjZSA9IHJlcXVpcmUoJy4uL2NfbWVzc2FnZV9zb3VyY2VzL2RvbV9ldmVudHNfc291cmNlJylcblxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKTtcblxuXG4vLyBldmVudHMgZmFjZXRcbnZhciBFdmVudHMgPSBfLmNyZWF0ZVN1YmNsYXNzKENvbXBvbmVudEZhY2V0LCAnRXZlbnRzJyk7XG5cbl8uZXh0ZW5kUHJvdG8oRXZlbnRzLCB7XG5cdGluaXQ6IGluaXRFdmVudHNGYWNldCxcblxuXHQvLyBfcmVhdHRhY2g6IF9yZWF0dGFjaEV2ZW50c09uRWxlbWVudENoYW5nZVxufSk7XG5cbmZhY2V0c1JlZ2lzdHJ5LmFkZChFdmVudHMpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50cztcblxuXG5mdW5jdGlvbiBpbml0RXZlbnRzRmFjZXQoKSB7XG5cdENvbXBvbmVudEZhY2V0LnByb3RvdHlwZS5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cblx0dmFyIGRvbUV2ZW50c1NvdXJjZSA9IG5ldyBET01FdmVudHNTb3VyY2UodGhpcywgeyB0cmlnZ2VyOiAndHJpZ2dlcicgfSwgdGhpcy5vd25lcik7XG5cblx0dGhpcy5fc2V0TWVzc2FnZVNvdXJjZShkb21FdmVudHNTb3VyY2UpXG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnRpZXModGhpcywge1xuXHRcdF9kb21FdmVudHNTb3VyY2U6IHsgdmFsdWU6IGRvbUV2ZW50c1NvdXJjZSB9XG5cdH0pO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ29tcG9uZW50RmFjZXQgPSByZXF1aXJlKCcuLi9jX2ZhY2V0Jylcblx0LCBmYWNldHNSZWdpc3RyeSA9IHJlcXVpcmUoJy4vY2ZfcmVnaXN0cnknKVxuXG5cdCwgTWVzc2VuZ2VyID0gcmVxdWlyZSgnLi4vLi4vbWVzc2VuZ2VyJylcblx0LCBpRnJhbWVNZXNzYWdlU291cmNlID0gcmVxdWlyZSgnLi4vY19tZXNzYWdlX3NvdXJjZXMvaWZyYW1lX21lc3NhZ2Vfc291cmNlJylcblxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKTtcblxuXG4vLyBkYXRhIG1vZGVsIGNvbm5lY3Rpb24gZmFjZXRcbnZhciBGcmFtZSA9IF8uY3JlYXRlU3ViY2xhc3MoQ29tcG9uZW50RmFjZXQsICdGcmFtZScpO1xuXG5fLmV4dGVuZFByb3RvKEZyYW1lLCB7XG5cdGluaXQ6IGluaXRGcmFtZUZhY2V0XG5cblx0Ly8gX3JlYXR0YWNoOiBfcmVhdHRhY2hFdmVudHNPbkVsZW1lbnRDaGFuZ2Vcbn0pO1xuXG5cbmZhY2V0c1JlZ2lzdHJ5LmFkZChGcmFtZSk7XG5cbm1vZHVsZS5leHBvcnRzID0gRnJhbWU7XG5cblxuZnVuY3Rpb24gaW5pdEZyYW1lRmFjZXQoKSB7XG5cdENvbXBvbmVudEZhY2V0LnByb3RvdHlwZS5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cdFxuXHR2YXIgaUZyYW1lTWVzc2FnZVNvdXJjZVByb3h5ID0ge1xuXHRcdHBvc3Q6ICdwb3N0J1xuXHR9O1xuXHR2YXIgbWVzc2FnZVNvdXJjZSA9IG5ldyBpRnJhbWVNZXNzYWdlU291cmNlKHRoaXMsIGlGcmFtZU1lc3NhZ2VTb3VyY2VQcm94eSk7XG5cblx0dGhpcy5fc2V0TWVzc2FnZVNvdXJjZShtZXNzYWdlU291cmNlKTtcblxuXHRPYmplY3QuZGVmaW5lUHJvcGVydGllcyh0aGlzLCB7XG5cdFx0X21lc3NhZ2VTb3VyY2U6IHsgdmFsdWU6IG1lc3NhZ2VTb3VyY2UgfVxuXHR9KTtcbn0iLCIndXNlIHN0cmljdCc7XG5cbnZhciBDb21wb25lbnRGYWNldCA9IHJlcXVpcmUoJy4uL2NfZmFjZXQnKVxuXHQsIGZhY2V0c1JlZ2lzdHJ5ID0gcmVxdWlyZSgnLi9jZl9yZWdpc3RyeScpXHRcblx0LCBfID0gcmVxdWlyZSgnbW9sLXByb3RvJylcblx0LCBjaGVjayA9IHJlcXVpcmUoJy4uLy4uL3V0aWwvY2hlY2snKVxuXHQsIE1hdGNoID0gY2hlY2suTWF0Y2hcblx0LCBiaW5kZXIgPSByZXF1aXJlKCcuLi8uLi9iaW5kZXInKTtcblxuXG4vLyBkYXRhIG1vZGVsIGNvbm5lY3Rpb24gZmFjZXRcbnZhciBUZW1wbGF0ZSA9IF8uY3JlYXRlU3ViY2xhc3MoQ29tcG9uZW50RmFjZXQsICdUZW1wbGF0ZScpO1xuXG5fLmV4dGVuZFByb3RvKFRlbXBsYXRlLCB7XG5cdGluaXQ6IGluaXRUZW1wbGF0ZUZhY2V0LFxuXHRzZXQ6IHNldFRlbXBsYXRlLFxuXHRyZW5kZXI6IHJlbmRlclRlbXBsYXRlLFxuXHRiaW5kZXI6IGJpbmRJbm5lckNvbXBvbmVudHMsXG5cdHJlcXVpcmU6IFsnQ29udGFpbmVyJ11cblxuXHQvLyBfcmVhdHRhY2g6IF9yZWF0dGFjaEV2ZW50c09uRWxlbWVudENoYW5nZVxufSk7XG5cbmZhY2V0c1JlZ2lzdHJ5LmFkZChUZW1wbGF0ZSk7XG5cbm1vZHVsZS5leHBvcnRzID0gVGVtcGxhdGU7XG5cblxuZnVuY3Rpb24gaW5pdFRlbXBsYXRlRmFjZXQoKSB7XG5cdENvbXBvbmVudEZhY2V0LnByb3RvdHlwZS5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cblx0dGhpcy5fdGVtcGxhdGVTdHIgPSB0aGlzLmNvbmZpZy50ZW1wbGF0ZTtcbn1cblxuXG5mdW5jdGlvbiBzZXRUZW1wbGF0ZSh0ZW1wbGF0ZVN0ciwgY29tcGlsZSkge1xuXHRjaGVjayh0ZW1wbGF0ZVN0ciwgU3RyaW5nKTtcblx0Y2hlY2soY29tcGlsZSwgTWF0Y2guT3B0aW9uYWwoRnVuY3Rpb24pKTtcblxuXHR0aGlzLl90ZW1wbGF0ZVN0ciA9IHRlbXBsYXRlU3RyO1xuXHRpZiAoY29tcGlsZSlcblx0XHR0aGlzLl9jb21waWxlID0gY29tcGlsZVxuXG5cdGNvbXBpbGUgPSBjb21waWxlIHx8IHRoaXMuX2NvbXBpbGU7IC8vIHx8IG1pbG8uY29uZmlnLnRlbXBsYXRlLmNvbXBpbGU7XG5cblx0aWYgKGNvbXBpbGUpXG5cdFx0dGhpcy5fdGVtcGxhdGUgPSBjb21waWxlKHRlbXBsYXRlU3RyKTtcblxuXHRyZXR1cm4gdGhpcztcbn1cblxuXG5mdW5jdGlvbiByZW5kZXJUZW1wbGF0ZShkYXRhKSB7IC8vIHdlIG5lZWQgZGF0YSBvbmx5IGlmIHVzZSB0ZW1wbGF0aW5nIGVuZ2luZVxuXHR0aGlzLm93bmVyLmVsLmlubmVySFRNTCA9IHRoaXMuX3RlbXBsYXRlXG5cdFx0XHRcdFx0XHRcdFx0PyB0aGlzLl90ZW1wbGF0ZShkYXRhKVxuXHRcdFx0XHRcdFx0XHRcdDogdGhpcy5fdGVtcGxhdGVTdHI7XG5cblx0cmV0dXJuIHRoaXM7XG59XG5cblxuZnVuY3Rpb24gYmluZElubmVyQ29tcG9uZW50cyhyZWdpc3RyeSkge1xuXHR2YXIgdGhpc1Njb3BlID0gYmluZGVyKHRoaXMub3duZXIuZWwsIHJlZ2lzdHJ5KTtcblxuXHQvLyBUT0RPIHNob3VsZCBiZSBjaGFuZ2VkIHRvIHJlY29uY2lsbGF0aW9uIG9mIGV4aXN0aW5nIGNoaWxkcmVuIHdpdGggbmV3XG5cdHRoaXMub3duZXIuY29udGFpbmVyLnNjb3BlID0gdGhpc1Njb3BlW3RoaXMub3duZXIubmFtZV0uY29udGFpbmVyLnNjb3BlO1xuXG5cdHJldHVybiB0aGlzU2NvcGU7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBDbGFzc1JlZ2lzdHJ5ID0gcmVxdWlyZSgnLi4vLi4vYWJzdHJhY3QvcmVnaXN0cnknKVxuXHQsIENvbXBvbmVudEZhY2V0ID0gcmVxdWlyZSgnLi4vY19mYWNldCcpO1xuXG52YXIgZmFjZXRzUmVnaXN0cnkgPSBuZXcgQ2xhc3NSZWdpc3RyeShDb21wb25lbnRGYWNldCk7XG5cbmZhY2V0c1JlZ2lzdHJ5LmFkZChDb21wb25lbnRGYWNldCk7XG5cbm1vZHVsZS5leHBvcnRzID0gZmFjZXRzUmVnaXN0cnk7XG5cbi8vIFRPRE8gLSByZWZhY3RvciBjb21wb25lbnRzIHJlZ2lzdHJ5IHRlc3QgaW50byBhIGZ1bmN0aW9uXG4vLyB0aGF0IHRlc3RzIGEgcmVnaXN0cnkgd2l0aCBhIGdpdmVuIGZvdW5kYXRpb24gY2xhc3Ncbi8vIE1ha2UgdGVzdCBmb3IgdGhpcyByZWdpc3RyeSBiYXNlZCBvbiB0aGlzIGZ1bmN0aW9uIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgRE9NRXZlbnRzU291cmNlID0gcmVxdWlyZSgnLi9kb21fZXZlbnRzX3NvdXJjZScpXG5cdCwgQ29tcG9uZW50ID0gcmVxdWlyZSgnLi4vY19jbGFzcycpXG5cdCwgQ29tcG9uZW50RGF0YVNvdXJjZUVycm9yID0gcmVxdWlyZSgnLi4vLi4vdXRpbC9lcnJvcicpLkNvbXBvbmVudERhdGFTb3VyY2Vcblx0LCBfID0gcmVxdWlyZSgnbW9sLXByb3RvJylcblx0LCBjaGVjayA9IHJlcXVpcmUoJy4uLy4uL3V0aWwvY2hlY2snKVxuXHQsIE1hdGNoID0gY2hlY2suTWF0Y2g7XG5cblxuLy8gY2xhc3MgdG8gaGFuZGxlIHN1YnNjcmlidGlvbnMgdG8gY2hhbmdlcyBpbiBET00gZm9yIFVJIChtYXliZSBhbHNvIGNvbnRlbnQgZWRpdGFibGUpIGVsZW1lbnRzXG52YXIgQ29tcG9uZW50RGF0YVNvdXJjZSA9IF8uY3JlYXRlU3ViY2xhc3MoRE9NRXZlbnRzU291cmNlLCAnQ29tcG9uZW50RGF0YVNvdXJjZScsIHRydWUpO1xuXG5cbl8uZXh0ZW5kUHJvdG8oQ29tcG9uZW50RGF0YVNvdXJjZSwge1xuXHQvLyBpbXBsZW1lbnRpbmcgTWVzc2FnZVNvdXJjZSBpbnRlcmZhY2Vcblx0aW5pdDogaW5pdENvbXBvbmVudERhdGFTb3VyY2UsXG5cdHRyYW5zbGF0ZVRvU291cmNlTWVzc2FnZTogdHJhbnNsYXRlVG9Eb21FdmVudCxcbiBcdGFkZFNvdXJjZUxpc3RlbmVyOiBhZGREb21FdmVudExpc3RlbmVyLFxuIFx0cmVtb3ZlU291cmNlTGlzdGVuZXI6IHJlbW92ZURvbUV2ZW50TGlzdGVuZXIsXG4gXHRmaWx0ZXJTb3VyY2VNZXNzYWdlOiBmaWx0ZXJEYXRhTWVzc2FnZSxcblxuIFx0Ly8gY2xhc3Mgc3BlY2lmaWMgbWV0aG9kc1xuIFx0Ly8gZG9tOiBpbXBsZW1lbnRlZCBpbiBET01FdmVudHNTb3VyY2VcbiBcdHZhbHVlOiBnZXREb21FbGVtZW50RGF0YVZhbHVlLFxuIFx0aGFuZGxlRXZlbnQ6IGhhbmRsZUV2ZW50LCAgLy8gZXZlbnQgZGlzcGF0Y2hlciAtIGFzIGRlZmluZWQgYnkgRXZlbnQgRE9NIEFQSVxuIFx0dHJpZ2dlcjogdHJpZ2dlckRhdGFNZXNzYWdlIC8vIHJlZGVmaW5lcyBtZXRob2Qgb2Ygc3VwZXJjbGFzcyBET01FdmVudHNTb3VyY2Vcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbXBvbmVudERhdGFTb3VyY2U7XG5cblxuZnVuY3Rpb24gaW5pdENvbXBvbmVudERhdGFTb3VyY2UoKSB7XG5cdERPTUV2ZW50c1NvdXJjZS5wcm90b3R5cGUuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG5cdHRoaXMudmFsdWUoKTsgLy8gc3RvcmVzIGN1cnJlbnQgY29tcG9uZW50IGRhdGEgdmFsdWUgaW4gdGhpcy5fdmFsdWVcbn1cblxuXG4vLyBUT0RPOiBzaG91bGQgcmV0dXJuIHZhbHVlIGRlcGVuZGVudCBvbiBlbGVtZW50IHRhZ1xuZnVuY3Rpb24gZ2V0RG9tRWxlbWVudERhdGFWYWx1ZSgpIHsgLy8gdmFsdWUgbWV0aG9kXG5cdHZhciBuZXdWYWx1ZSA9IHRoaXMuY29tcG9uZW50LmVsLnZhbHVlO1xuXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnX3ZhbHVlJywge1xuXHRcdGNvbmZpZ3VyYWJsZTogdHJ1ZSxcblx0XHR2YWx1ZTogbmV3VmFsdWVcblx0fSk7XG5cblx0cmV0dXJuIG5ld1ZhbHVlO1xufVxuXG5cbi8vIFRPRE86IHRoaXMgZnVuY3Rpb24gc2hvdWxkIHJldHVybiByZWxldmFudCBET00gZXZlbnQgZGVwZW5kZW50IG9uIGVsZW1lbnQgdGFnXG4vLyBDYW4gYWxzbyBpbXBsZW1lbnQgYmVmb3JlZGF0YWNoYW5nZWQgZXZlbnQgdG8gYWxsb3cgcHJldmVudGluZyB0aGUgY2hhbmdlXG5mdW5jdGlvbiB0cmFuc2xhdGVUb0RvbUV2ZW50KG1lc3NhZ2UpIHtcblx0aWYgKG1lc3NhZ2UgPT0gJ2RhdGFjaGFuZ2VkJylcblx0XHRyZXR1cm4gJ2lucHV0Jztcblx0ZWxzZVxuXHRcdHRocm93IG5ldyBDb21wb25lbnREYXRhU291cmNlRXJyb3IoJ3Vua25vd24gY29tcG9uZW50IGRhdGEgZXZlbnQnKTtcbn1cblxuXG5mdW5jdGlvbiBhZGREb21FdmVudExpc3RlbmVyKGV2ZW50VHlwZSkge1xuXHR0aGlzLmRvbSgpLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlLCB0aGlzLCBmYWxzZSk7IC8vIG5vIGNhcHR1cmluZ1xufVxuXG5cbmZ1bmN0aW9uIHJlbW92ZURvbUV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlKSB7XG5cdHRoaXMuZG9tKCkucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudFR5cGUsIHRoaXMsIGZhbHNlKTsgLy8gbm8gY2FwdHVyaW5nXG59XG5cblxuZnVuY3Rpb24gZmlsdGVyRGF0YU1lc3NhZ2UoZXZlbnRUeXBlLCBtZXNzYWdlLCBkYXRhKSB7XG5cdHJldHVybiBkYXRhLm5ld1ZhbHVlICE9IGRhdGEub2xkVmFsdWU7XG59O1xuXG5cbiAvLyBldmVudCBkaXNwYXRjaGVyIC0gYXMgZGVmaW5lZCBieSBFdmVudCBET00gQVBJXG5mdW5jdGlvbiBoYW5kbGVFdmVudChldmVudCkge1xuXHR2YXIgb2xkVmFsdWUgPSB0aGlzLl92YWx1ZTtcblxuXHR0aGlzLmRpc3BhdGNoTWVzc2FnZShldmVudC50eXBlLCB7XG5cdFx0b2xkVmFsdWU6IG9sZFZhbHVlLFxuXHRcdG5ld1ZhbHVlOiB0aGlzLnZhbHVlKClcblx0fSk7XG59XG5cblxuZnVuY3Rpb24gdHJpZ2dlckRhdGFNZXNzYWdlKG1lc3NhZ2UsIGRhdGEpIHtcblx0Ly8gVE9ETyAtIG9wcG9zaXRlIHRyYW5zbGF0aW9uICsgZXZlbnQgdHJpZ2dlciBcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKTtcblxuXG4vLyBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9SZWZlcmVuY2UvRXZlbnRzXG5cbnZhciBldmVudFR5cGVzID0ge1xuXHRDbGlwYm9hcmRFdmVudDogWydjb3B5JywgJ2N1dCcsICdwYXN0ZScsICdiZWZvcmVjb3B5JywgJ2JlZm9yZWN1dCcsICdiZWZvcmVwYXN0ZSddLFxuXHRFdmVudDogWydpbnB1dCcsICdyZWFkeXN0YXRlY2hhbmdlJ10sXG5cdEZvY3VzRXZlbnQ6IFsnZm9jdXMnLCAnYmx1cicsICdmb2N1c2luJywgJ2ZvY3Vzb3V0J10sXG5cdEtleWJvYXJkRXZlbnQ6IFsna2V5ZG93bicsICdrZXlwcmVzcycsICAna2V5dXAnXSxcblx0TW91c2VFdmVudDogWydjbGljaycsICdjb250ZXh0bWVudScsICdkYmxjbGljaycsICdtb3VzZWRvd24nLCAnbW91c2V1cCcsXG5cdFx0XHRcdCAnbW91c2VlbnRlcicsICdtb3VzZWxlYXZlJywgJ21vdXNlbW92ZScsICdtb3VzZW91dCcsICdtb3VzZW92ZXInLFxuXHRcdFx0XHQgJ3Nob3cnIC8qIGNvbnRleHQgbWVudSAqL10sXG5cdFRvdWNoRXZlbnQ6IFsndG91Y2hzdGFydCcsICd0b3VjaGVuZCcsICd0b3VjaG1vdmUnLCAndG91Y2hlbnRlcicsICd0b3VjaGxlYXZlJywgJ3RvdWNoY2FuY2VsJ10sXG59O1xuXG5cbi8vIG1vY2sgd2luZG93IGFuZCBldmVudCBjb25zdHJ1Y3RvcnMgZm9yIHRlc3RpbmdcbmlmICh0eXBlb2Ygd2luZG93ICE9ICd1bmRlZmluZWQnKVxuXHR2YXIgZ2xvYmFsID0gd2luZG93O1xuZWxzZSB7XG5cdGdsb2JhbCA9IHt9O1xuXHRfLmVhY2hLZXkoZXZlbnRUeXBlcywgZnVuY3Rpb24oZVR5cGVzLCBldmVudENvbnN0cnVjdG9yTmFtZSkge1xuXHRcdHZhciBldmVudHNDb25zdHJ1Y3Rvcjtcblx0XHRldmFsKFxuXHRcdFx0J2V2ZW50c0NvbnN0cnVjdG9yID0gZnVuY3Rpb24gJyArIGV2ZW50Q29uc3RydWN0b3JOYW1lICsgJyh0eXBlLCBwcm9wZXJ0aWVzKSB7IFxcXG5cdFx0XHRcdHRoaXMudHlwZSA9IHR5cGU7IFxcXG5cdFx0XHRcdF8uZXh0ZW5kKHRoaXMsIHByb3BlcnRpZXMpOyBcXFxuXHRcdFx0fTsnXG5cdFx0KTtcblx0XHRnbG9iYWxbZXZlbnRDb25zdHJ1Y3Rvck5hbWVdID0gZXZlbnRzQ29uc3RydWN0b3I7XG5cdH0pO1xufVxuXG5cbnZhciBkb21FdmVudHNDb25zdHJ1Y3RvcnMgPSB7fTtcblxuXy5lYWNoS2V5KGV2ZW50VHlwZXMsIGZ1bmN0aW9uKGVUeXBlcywgZXZlbnRDb25zdHJ1Y3Rvck5hbWUpIHtcblx0ZVR5cGVzLmZvckVhY2goZnVuY3Rpb24odHlwZSkge1xuXHRcdGlmIChPYmplY3QuaGFzT3duUHJvcGVydHkoZG9tRXZlbnRzQ29uc3RydWN0b3JzLCB0eXBlKSlcblx0XHRcdHRocm93IG5ldyBFcnJvcignZHVwbGljYXRlIGV2ZW50IHR5cGUgJyArIHR5cGUpO1xuXG5cdFx0ZG9tRXZlbnRzQ29uc3RydWN0b3JzW3R5cGVdID0gZ2xvYmFsW2V2ZW50Q29uc3RydWN0b3JOYW1lXTtcblx0fSk7XG59KTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGRvbUV2ZW50c0NvbnN0cnVjdG9ycztcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIE1lc3NhZ2VTb3VyY2UgPSByZXF1aXJlKCcuLi8uLi9tZXNzZW5nZXIvbWVzc2FnZV9zb3VyY2UnKVxuXHQsIENvbXBvbmVudCA9IHJlcXVpcmUoJy4uL2NfY2xhc3MnKVxuXHQsIGRvbUV2ZW50c0NvbnN0cnVjdG9ycyA9IHJlcXVpcmUoJy4vZG9tX2V2ZW50c19jb25zdHJ1Y3RvcnMnKSAvLyBUT0RPIG1lcmdlIHdpdGggRE9NRXZlbnRTb3VyY2UgPz9cblx0LCBfID0gcmVxdWlyZSgnbW9sLXByb3RvJylcblx0LCBjaGVjayA9IHJlcXVpcmUoJy4uLy4uL3V0aWwvY2hlY2snKVxuXHQsIE1hdGNoID0gY2hlY2suTWF0Y2g7XG5cbnZhciBET01FdmVudHNTb3VyY2UgPSBfLmNyZWF0ZVN1YmNsYXNzKE1lc3NhZ2VTb3VyY2UsICdET01NZXNzYWdlU291cmNlJywgdHJ1ZSk7XG5cblxuXy5leHRlbmRQcm90byhET01FdmVudHNTb3VyY2UsIHtcblx0Ly8gaW1wbGVtZW50aW5nIE1lc3NhZ2VTb3VyY2UgaW50ZXJmYWNlXG5cdGluaXQ6IGluaXREb21FdmVudHNTb3VyY2UsXG5cdHRyYW5zbGF0ZVRvU291cmNlTWVzc2FnZTogdHJhbnNsYXRlVG9Eb21FdmVudCxcbiBcdGFkZFNvdXJjZUxpc3RlbmVyOiBhZGREb21FdmVudExpc3RlbmVyLFxuIFx0cmVtb3ZlU291cmNlTGlzdGVuZXI6IHJlbW92ZURvbUV2ZW50TGlzdGVuZXIsXG4gXHRmaWx0ZXJTb3VyY2VNZXNzYWdlOiBmaWx0ZXJDYXB0dXJlZERvbUV2ZW50LFxuXG4gXHQvLyBjbGFzcyBzcGVjaWZpYyBtZXRob2RzXG4gXHRkb206IGdldERvbUVsZW1lbnQsXG4gXHRoYW5kbGVFdmVudDogaGFuZGxlRXZlbnQsICAvLyBldmVudCBkaXNwYXRjaGVyIC0gYXMgZGVmaW5lZCBieSBFdmVudCBET00gQVBJXG4gXHR0cmlnZ2VyOiB0cmlnZ2VyRG9tRXZlbnRcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IERPTUV2ZW50c1NvdXJjZTtcblxuXG52YXIgdXNlQ2FwdHVyZVBhdHRlcm4gPSAvX19jYXB0dXJlJC87XG5cblxuZnVuY3Rpb24gaW5pdERvbUV2ZW50c1NvdXJjZShob3N0T2JqZWN0LCBwcm94eU1ldGhvZHMsIGNvbXBvbmVudCkge1xuXHRjaGVjayhjb21wb25lbnQsIENvbXBvbmVudCk7XG5cdE1lc3NhZ2VTb3VyY2UucHJvdG90eXBlLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuXHR0aGlzLmNvbXBvbmVudCA9IGNvbXBvbmVudDtcblxuXHQvLyB0aGlzLm1lc3NlbmdlciBpcyBzZXQgYnkgTWVzc2VuZ2VyIGNsYXNzXG59XG5cblxuZnVuY3Rpb24gZ2V0RG9tRWxlbWVudCgpIHtcblx0cmV0dXJuIHRoaXMuY29tcG9uZW50LmVsO1xufVxuXG5cbmZ1bmN0aW9uIHRyYW5zbGF0ZVRvRG9tRXZlbnQobWVzc2FnZSkge1xuXHRpZiAodXNlQ2FwdHVyZVBhdHRlcm4udGVzdChtZXNzYWdlKSlcblx0XHRtZXNzYWdlID0gbWVzc2FnZS5yZXBsYWNlKHVzZUNhcHR1cmVQYXR0ZXJuLCAnJyk7XG5cdHJldHVybiBtZXNzYWdlO1xufVxuXG5cbmZ1bmN0aW9uIGFkZERvbUV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlKSB7XG5cdHRoaXMuZG9tKCkuYWRkRXZlbnRMaXN0ZW5lcihldmVudFR5cGUsIHRoaXMsIGZhbHNlKTtcbn1cblxuXG5mdW5jdGlvbiByZW1vdmVEb21FdmVudExpc3RlbmVyKGV2ZW50VHlwZSkge1xuXHR0aGlzLmRvbSgpLnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlLCB0aGlzLCBmYWxzZSk7XG59XG5cblxuZnVuY3Rpb24gZmlsdGVyQ2FwdHVyZWREb21FdmVudChldmVudFR5cGUsIG1lc3NhZ2UsIGV2ZW50KSB7XG5cdHZhciBpc0NhcHR1cmVQaGFzZTtcblx0aWYgKHR5cGVvZiB3aW5kb3cgIT0gJ3VuZGVmaW5lZCcpXG5cdFx0aXNDYXB0dXJlUGhhc2UgPSBldmVudC5ldmVudFBoYXNlID09IHdpbmRvdy5FdmVudC5DQVBUVVJJTkdfUEhBU0U7XG5cblx0cmV0dXJuICghIGlzQ2FwdHVyZVBoYXNlIHx8IChpc0NhcHR1cmVQaGFzZSAmJiB1c2VDYXB0dXJlUGF0dGVybi50ZXN0KG1lc3NhZ2UpKSk7XG59XG5cblxuLy8gZXZlbnQgZGlzcGF0Y2hlciAtIGFzIGRlZmluZWQgYnkgRXZlbnQgRE9NIEFQSVxuZnVuY3Rpb24gaGFuZGxlRXZlbnQoZXZlbnQpIHtcblx0dGhpcy5kaXNwYXRjaE1lc3NhZ2UoZXZlbnQudHlwZSwgZXZlbnQpO1xufVxuXG5cbi8vIFRPRE8gbWFrZSB3b3JrIHdpdGggbWVzc2FnZXMgKHdpdGggX2NhcHR1cmUpXG5mdW5jdGlvbiB0cmlnZ2VyRG9tRXZlbnQoZXZlbnRUeXBlLCBwcm9wZXJ0aWVzKSB7XG5cdGNoZWNrKGV2ZW50VHlwZSwgU3RyaW5nKTtcblx0Y2hlY2socHJvcGVydGllcywgTWF0Y2guT3B0aW9uYWwoT2JqZWN0KSk7XG5cblx0dmFyIEV2ZW50Q29uc3RydWN0b3IgPSBkb21FdmVudHNDb25zdHJ1Y3RvcnNbZXZlbnRUeXBlXTtcblxuXHRpZiAodHlwZW9mIGV2ZW50Q29uc3RydWN0b3IgIT0gJ2Z1bmN0aW9uJylcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ3Vuc3VwcG9ydGVkIGV2ZW50IHR5cGUnKTtcblxuXHQvLyBjaGVjayBpZiBpdCBpcyBjb3JyZWN0XG5cdGlmICh0eXBlb2YgcHJvcGVydGllcyAhPSAndW5kZWZpbmVkJylcblx0XHRwcm9wZXJ0aWVzLnR5cGUgPSBldmVudFR5cGU7XG5cblx0dmFyIGRvbUV2ZW50ID0gRXZlbnRDb25zdHJ1Y3RvcihldmVudFR5cGUsIHByb3BlcnRpZXMpO1xuXG5cdHZhciBub3RDYW5jZWxsZWQgPSB0aGlzLmRvbSgpLmRpc3BhdGNoRXZlbnQoZG9tRXZlbnQpO1xuXG5cdHJldHVybiBub3RDYW5jZWxsZWQ7XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgTWVzc2FnZVNvdXJjZSA9IHJlcXVpcmUoJy4uLy4uL21lc3Nlbmdlci9tZXNzYWdlX3NvdXJjZScpXG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpXG5cdCwgY2hlY2sgPSByZXF1aXJlKCcuLi8uLi91dGlsL2NoZWNrJylcblx0LCBNYXRjaCA9IGNoZWNrLk1hdGNoO1xuXG52YXIgaUZyYW1lTWVzc2FnZVNvdXJjZSA9IF8uY3JlYXRlU3ViY2xhc3MoTWVzc2FnZVNvdXJjZSwgJ2lGcmFtZU1lc3NhZ2VTb3VyY2UnLCB0cnVlKTtcblxuXG5fLmV4dGVuZFByb3RvKGlGcmFtZU1lc3NhZ2VTb3VyY2UsIHtcblx0Ly8gaW1wbGVtZW50aW5nIE1lc3NhZ2VTb3VyY2UgaW50ZXJmYWNlXG5cdGluaXQ6IGluaXRJRnJhbWVNZXNzYWdlU291cmNlLFxuXHR0cmFuc2xhdGVUb1NvdXJjZU1lc3NhZ2U6IHRyYW5zbGF0ZVRvSUZyYW1lTWVzc2FnZSxcbiBcdGFkZFNvdXJjZUxpc3RlbmVyOiBhZGRJRnJhbWVNZXNzYWdlTGlzdGVuZXIsXG4gXHRyZW1vdmVTb3VyY2VMaXN0ZW5lcjogcmVtb3ZlSUZyYW1lTWVzc2FnZUxpc3RlbmVyLFxuIFx0ZmlsdGVyU291cmNlTWVzc2FnZTogZmlsdGVyUmVjaWV2ZWRJRnJhbWVNZXNzYWdlLFxuXG4gXHQvL2NsYXNzIHNwZWNpZmljIG1ldGhvZHNcbiBcdHBvc3Q6IHBvc3RUb090aGVyV2luZG93LFxuIFx0aGFuZGxlRXZlbnQ6IGhhbmRsZUV2ZW50ICAvLyBldmVudCBkaXNwYXRjaGVyIC0gYXMgZGVmaW5lZCBieSBFdmVudCBET00gQVBJXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBpRnJhbWVNZXNzYWdlU291cmNlO1xuXG5cbmZ1bmN0aW9uIGluaXRJRnJhbWVNZXNzYWdlU291cmNlKGhvc3RPYmplY3QsIHByb3h5TWV0aG9kcykge1xuXHRjaGVjayhob3N0T2JqZWN0LCBPYmplY3QpO1xuXHRNZXNzYWdlU291cmNlLnByb3RvdHlwZS5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cblx0aWYgKGhvc3RPYmplY3Qub3duZXIuZWwubm9kZU5hbWUgPT0gJ0lGUkFNRScpXG5cdFx0dGhpcy5fcG9zdFRvID0gaG9zdE9iamVjdC5vd25lci5lbC5jb250ZW50V2luZG93O1xuXHRlbHNlXG5cdFx0dGhpcy5fcG9zdFRvID0gd2luZG93LnBhcmVudDtcblxuXHR0aGlzLl9saXN0ZW5UbyA9IHdpbmRvdztcbn1cblxuXG5mdW5jdGlvbiB0cmFuc2xhdGVUb0lGcmFtZU1lc3NhZ2UobWVzc2FnZSkge1xuXHRyZXR1cm4gJ21lc3NhZ2UnOyAvLyBzb3VyY2VNZXNzYWdlXG59XG5cblxuZnVuY3Rpb24gYWRkSUZyYW1lTWVzc2FnZUxpc3RlbmVyKGV2ZW50VHlwZSkge1xuXHR0aGlzLl9saXN0ZW5Uby5hZGRFdmVudExpc3RlbmVyKGV2ZW50VHlwZSwgdGhpcywgZmFsc2UpO1xufVxuXG5cbmZ1bmN0aW9uIHJlbW92ZUlGcmFtZU1lc3NhZ2VMaXN0ZW5lcihldmVudFR5cGUpIHtcblx0dGhpcy5fbGlzdGVuVG8ucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudFR5cGUsIHRoaXMsIGZhbHNlKTtcbn1cblxuXG5mdW5jdGlvbiBmaWx0ZXJSZWNpZXZlZElGcmFtZU1lc3NhZ2UoZXZlbnRUeXBlLCBtZXNzYWdlLCBldmVudCkge1xuXHRyZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gcG9zdFRvT3RoZXJXaW5kb3coZXZlbnRUeXBlLCBtZXNzYWdlKSB7XG5cdG1lc3NhZ2UudHlwZSA9IGV2ZW50VHlwZTtcblx0dGhpcy5fcG9zdFRvLnBvc3RNZXNzYWdlKG1lc3NhZ2UsICcqJyk7XG59XG5cbmZ1bmN0aW9uIGhhbmRsZUV2ZW50KGV2ZW50KSB7XG5cdHRoaXMuZGlzcGF0Y2hNZXNzYWdlKGV2ZW50LnR5cGUsIGV2ZW50KTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIENsYXNzUmVnaXN0cnkgPSByZXF1aXJlKCcuLi9hYnN0cmFjdC9yZWdpc3RyeScpXG5cdCwgQ29tcG9uZW50ID0gcmVxdWlyZSgnLi9jX2NsYXNzJyk7XG5cbnZhciBjb21wb25lbnRzUmVnaXN0cnkgPSBuZXcgQ2xhc3NSZWdpc3RyeShDb21wb25lbnQpO1xuXG5jb21wb25lbnRzUmVnaXN0cnkuYWRkKENvbXBvbmVudCk7XG5cbm1vZHVsZS5leHBvcnRzID0gY29tcG9uZW50c1JlZ2lzdHJ5O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ29tcG9uZW50ID0gcmVxdWlyZSgnLi4vY19jbGFzcycpXG5cdCwgY29tcG9uZW50c1JlZ2lzdHJ5ID0gcmVxdWlyZSgnLi4vY19yZWdpc3RyeScpO1xuXG5cbnZhciBWaWV3ID0gQ29tcG9uZW50LmNyZWF0ZUNvbXBvbmVudENsYXNzKCdWaWV3JywgWydjb250YWluZXInXSk7XG5cbmNvbXBvbmVudHNSZWdpc3RyeS5hZGQoVmlldyk7XG5cbm1vZHVsZS5leHBvcnRzID0gVmlldztcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vdXRpbC9jaGVjaycpXG5cdCwgTWF0Y2ggPSBjaGVjay5NYXRjaFxuXHQsIFNjb3BlRXJyb3IgPSByZXF1aXJlKCcuLi91dGlsL2Vycm9yJykuU2NvcGU7XG5cblxuLy8gU2NvcGUgY2xhc3NcbmZ1bmN0aW9uIFNjb3BlKHBhcmVudCkge1xuXHRjaGVjayhwYXJlbnQsIE1hdGNoLk9wdGlvbmFsKFNjb3BlKSk7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnRpZXModGhpcywge1xuXHRcdF9wYXJlbnQ6IHsgdmFsdWU6IHBhcmVudCB9XG5cdH0pXG59O1xuXG5fLmV4dGVuZFByb3RvKFNjb3BlLCB7XG5cdF9hZGQ6IF9hZGRUb1Njb3BlLFxuXHRfY29weTogX2NvcHlGcm9tU2NvcGUsXG5cdF9lYWNoOiBfZWFjaCxcblx0X3VuaXF1ZU5hbWU6IF91bmlxdWVOYW1lLFxuXHRfbGVuZ3RoOiBfZ2V0U2NvcGVMZW5ndGgsXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBTY29wZTtcblxuXG52YXIgYWxsb3dlZE5hbWVQYXR0ZXJuID0gL15bQS1aYS16XVtBLVphLXowLTlcXF9cXCRdKiQvO1xuXG5mdW5jdGlvbiBfYWRkVG9TY29wZShvYmplY3QsIG5hbWUpIHtcblx0aWYgKHRoaXNbbmFtZV0pXG5cdFx0dGhyb3cgbmV3IFNjb3BlRXJyb3IoJ2R1cGxpY2F0ZSBvYmplY3QgbmFtZTogJyArIG5hbWUpO1xuXG5cdGNoZWNrTmFtZShuYW1lKTtcblxuXHR0aGlzW25hbWVdID0gb2JqZWN0O1xufVxuXG5cbmZ1bmN0aW9uIF9jb3B5RnJvbVNjb3BlKGFTY29wZSkge1xuXHRjaGVjayhhU2NvcGUsIFNjb3BlKTtcblxuXHRhU2NvcGUuX2VhY2goX2FkZFRvU2NvcGUsIHRoaXMpO1xufVxuXG5cbmZ1bmN0aW9uIF9lYWNoKGNhbGxiYWNrLCB0aGlzQXJnKSB7XG5cdF8uZWFjaEtleSh0aGlzLCBjYWxsYmFjaywgdGhpc0FyZyB8fCB0aGlzLCB0cnVlKTsgLy8gZW51bWVyYXRlcyBlbnVtZXJhYmxlIHByb3BlcnRpZXMgb25seVxufVxuXG5cbmZ1bmN0aW9uIGNoZWNrTmFtZShuYW1lKSB7XG5cdGlmICghIGFsbG93ZWROYW1lUGF0dGVybi50ZXN0KG5hbWUpKVxuXHRcdHRocm93IG5ldyBTY29wZUVycm9yKCduYW1lIHNob3VsZCBzdGFydCBmcm9tIGxldHRlciwgdGhpcyBuYW1lIGlzIG5vdCBhbGxvd2VkOiAnICsgbmFtZSk7XG59XG5cblxuZnVuY3Rpb24gX3VuaXF1ZU5hbWUocHJlZml4KSB7XG5cdHZhciBwcmVmaXhlcyA9IHVuaXF1ZU5hbWUucHJlZml4ZXMgfHwgKHVuaXF1ZU5hbWUucHJlZml4ZXMgPSB7fSlcblx0XHQsIHByZWZpeFN0ciA9IHByZWZpeCArICdfJztcblx0XG5cdGlmIChwcmVmaXhlc1twcmVmaXhdKVxuXHRcdHJldHVybiBwcmVmaXhTdHIgKyBwcmVmaXhlc1twcmVmaXhdKys7XG5cblx0dmFyIHVuaXF1ZU51bSA9IDBcblx0XHQsIHByZWZpeExlbiA9IHByZWZpeFN0ci5sZW5ndGg7XG5cblx0Xy5lYWNoS2V5KHRoaXMsIGZ1bmN0aW9uKG9iaiwgbmFtZSkge1xuXHRcdGlmIChuYW1lLmluZGV4T2YocHJlZml4U3RyKSA9PSAtMSkgcmV0dXJuO1xuXHRcdHZhciBudW0gPSBuYW1lLnNsaWNlKHByZWZpeExlbik7XG5cdFx0aWYgKG51bSA9PSB1bmlxdWVOdW0pIHVuaXF1ZU51bSsrIDtcblx0fSk7XG59XG5cblxuZnVuY3Rpb24gX2dldFNjb3BlTGVuZ3RoKCkge1xuXHRyZXR1cm4gT2JqZWN0LmtleXModGhpcykubGVuZ3RoO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gY29uZmlnO1xuXG5mdW5jdGlvbiBjb25maWcob3B0aW9ucykge1xuXHRfLmRlZXBFeHRlbmQoY29uZmlnLCBvcHRpb25zKTtcbn1cblxuY29uZmlnKHtcblx0YXR0cnM6IHtcblx0XHRiaW5kOiAnbWwtYmluZCcsXG5cdFx0bG9hZDogJ21sLWxvYWQnXG5cdH1cbn0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEZhY2V0O1xuXG5mdW5jdGlvbiBGYWNldChvd25lciwgY29uZmlnKSB7XG5cdHRoaXMub3duZXIgPSBvd25lcjtcblx0dGhpcy5jb25maWcgPSBjb25maWcgfHwge307XG5cdHRoaXMuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufVxuXG5fLmV4dGVuZFByb3RvKEZhY2V0LCB7XG5cdGluaXQ6IGZ1bmN0aW9uKCkge31cbn0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgRmFjZXQgPSByZXF1aXJlKCcuL2ZfY2xhc3MnKVxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vdXRpbC9jaGVjaycpXG5cdCwgTWF0Y2ggPSBjaGVjay5NYXRjaDtcblxubW9kdWxlLmV4cG9ydHMgPSBGYWNldGVkT2JqZWN0O1xuXG4vLyBhYnN0cmFjdCBjbGFzcyBmb3IgZmFjZXRlZCBvYmplY3RcbmZ1bmN0aW9uIEZhY2V0ZWRPYmplY3QoKSB7XG5cdC8vIFRPRE8gaW5zdGFudGlhdGUgZmFjZXRzIGlmIGNvbmZpZ3VyYXRpb24gaXNuJ3QgcGFzc2VkXG5cdC8vIHdyaXRlIGEgdGVzdCB0byBjaGVjayBpdFxuXHR2YXIgZmFjZXRzQ29uZmlnID0gXy5jbG9uZSh0aGlzLmZhY2V0c0NvbmZpZyB8fCB7fSk7XG5cblx0dmFyIHRoaXNDbGFzcyA9IHRoaXMuY29uc3RydWN0b3Jcblx0XHQsIGZhY2V0c0Rlc2NyaXB0b3JzID0ge31cblx0XHQsIGZhY2V0cyA9IHt9O1xuXG5cdGlmICh0aGlzLmNvbnN0cnVjdG9yID09IEZhY2V0ZWRPYmplY3QpXHRcdFxuXHRcdHRocm93IG5ldyBFcnJvcignRmFjZXRlZE9iamVjdCBpcyBhbiBhYnN0cmFjdCBjbGFzcywgY2FuXFwndCBiZSBpbnN0YW50aWF0ZWQnKTtcblxuXHRpZiAodGhpcy5mYWNldHMpXG5cdFx0Xy5lYWNoS2V5KHRoaXMuZmFjZXRzLCBpbnN0YW50aWF0ZUZhY2V0LCB0aGlzLCB0cnVlKTtcblxuXHR2YXIgdW51c2VkRmFjZXRzTmFtZXMgPSBPYmplY3Qua2V5cyhmYWNldHNDb25maWcpO1xuXHRpZiAodW51c2VkRmFjZXRzTmFtZXMubGVuZ3RoKVxuXHRcdHRocm93IG5ldyBFcnJvcignQ29uZmlndXJhdGlvbiBmb3IgdW5rbm93biBmYWNldChzKSBwYXNzZWQ6ICcgKyB1bnVzZWRGYWNldHNOYW1lcy5qb2luKCcsICcpKTtcblxuXHRPYmplY3QuZGVmaW5lUHJvcGVydGllcyh0aGlzLCBmYWNldHNEZXNjcmlwdG9ycyk7XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnZmFjZXRzJywgeyB2YWx1ZTogZmFjZXRzIH0pO1x0XG5cblx0Ly8gY2FsbGluZyBpbml0IGlmIGl0IGlzIGRlZmluZWQgaW4gdGhlIGNsYXNzXG5cdGlmICh0aGlzLmluaXQpXG5cdFx0dGhpcy5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cblx0ZnVuY3Rpb24gaW5zdGFudGlhdGVGYWNldChGYWNldENsYXNzLCBmY3QpIHtcblx0XHR2YXIgZmFjZXRPcHRzID0gZmFjZXRzQ29uZmlnW2ZjdF07XG5cdFx0ZGVsZXRlIGZhY2V0c0NvbmZpZ1tmY3RdO1xuXG5cdFx0ZmFjZXRzW2ZjdF0gPSBuZXcgRmFjZXRDbGFzcyh0aGlzLCBmYWNldE9wdHMpO1xuXG5cdFx0ZmFjZXRzRGVzY3JpcHRvcnNbZmN0XSA9IHtcblx0XHRcdGVudW1lcmFibGU6IHRydWUsXG5cdFx0XHR2YWx1ZTogZmFjZXRzW2ZjdF1cblx0XHR9O1xuXHR9XG59XG5cblxuXy5leHRlbmRQcm90byhGYWNldGVkT2JqZWN0LCB7XG5cdGFkZEZhY2V0OiBhZGRGYWNldFxufSk7XG5cblxuZnVuY3Rpb24gYWRkRmFjZXQoRmFjZXRDbGFzcywgZmFjZXRPcHRzLCBmYWNldE5hbWUpIHtcblx0Y2hlY2soRmFjZXRDbGFzcywgRnVuY3Rpb24pO1xuXHRjaGVjayhmYWNldE5hbWUsIE1hdGNoLk9wdGlvbmFsKFN0cmluZykpO1xuXG5cdGZhY2V0TmFtZSA9IF8uZmlyc3RMb3dlckNhc2UoZmFjZXROYW1lIHx8IEZhY2V0Q2xhc3MubmFtZSk7XG5cblx0dmFyIHByb3RvRmFjZXRzID0gdGhpcy5jb25zdHJ1Y3Rvci5wcm90b3R5cGUuZmFjZXRzO1xuXG5cdGlmIChwcm90b0ZhY2V0cyAmJiBwcm90b0ZhY2V0c1tmYWNldE5hbWVdKVxuXHRcdHRocm93IG5ldyBFcnJvcignZmFjZXQgJyArIGZhY2V0TmFtZSArICcgaXMgYWxyZWFkeSBwYXJ0IG9mIHRoZSBjbGFzcyAnICsgdGhpcy5jb25zdHJ1Y3Rvci5uYW1lKTtcblxuXHRpZiAodGhpc1tmYWNldE5hbWVdKVxuXHRcdHRocm93IG5ldyBFcnJvcignZmFjZXQgJyArIGZhY2V0TmFtZSArICcgaXMgYWxyZWFkeSBwcmVzZW50IGluIG9iamVjdCcpO1xuXG5cdHZhciBuZXdGYWNldCA9IHRoaXMuZmFjZXRzW2ZhY2V0TmFtZV0gPSBuZXcgRmFjZXRDbGFzcyh0aGlzLCBmYWNldE9wdHMpO1xuXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBmYWNldE5hbWUsIHtcblx0XHRlbnVtZXJhYmxlOiB0cnVlLFxuXHRcdHZhbHVlOiBuZXdGYWNldFxuXHR9KTtcblxuXHRyZXR1cm4gbmV3RmFjZXQ7XG59XG5cblxuLy8gZmFjdG9yeSB0aGF0IGNyZWF0ZXMgY2xhc3NlcyAoY29uc3RydWN0b3JzKSBmcm9tIHRoZSBtYXAgb2YgZmFjZXRzXG4vLyB0aGVzZSBjbGFzc2VzIGluaGVyaXQgZnJvbSBGYWNldGVkT2JqZWN0XG5GYWNldGVkT2JqZWN0LmNyZWF0ZUZhY2V0ZWRDbGFzcyA9IGZ1bmN0aW9uIChuYW1lLCBmYWNldHNDbGFzc2VzLCBmYWNldHNDb25maWcpIHtcblx0Y2hlY2sobmFtZSwgU3RyaW5nKTtcblx0Y2hlY2soZmFjZXRzQ2xhc3NlcywgTWF0Y2guT2JqZWN0SGFzaChGdW5jdGlvbiAvKiBNYXRjaC5TdWJjbGFzcyhGYWNldCwgdHJ1ZSkgVE9ETyAtIGZpeCAqLykpO1xuXG5cdHZhciBGYWNldGVkQ2xhc3MgPSBfLmNyZWF0ZVN1YmNsYXNzKHRoaXMsIG5hbWUsIHRydWUpO1xuXG5cdF8uZXh0ZW5kUHJvdG8oRmFjZXRlZENsYXNzLCB7XG5cdFx0ZmFjZXRzOiBmYWNldHNDbGFzc2VzLFxuXHRcdGZhY2V0c0NvbmZpZzogZmFjZXRzQ29uZmlnXG5cdH0pO1xuXHRyZXR1cm4gRmFjZXRlZENsYXNzO1xufTtcblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgbWlsb01haWwgPSByZXF1aXJlKCcuL21haWwnKVxuXHQsIHJlcXVlc3QgPSByZXF1aXJlKCcuL3V0aWwvcmVxdWVzdCcpXG5cdCwgbG9nZ2VyID0gcmVxdWlyZSgnLi91dGlsL2xvZ2dlcicpXG5cdCwgY29uZmlnID0gcmVxdWlyZSgnLi9jb25maWcnKVxuXHQsIExvYWRBdHRyaWJ1dGUgPSByZXF1aXJlKCcuL2F0dHJpYnV0ZS9hX2xvYWQnKVxuXHQsIExvYWRlckVycm9yID0gcmVxdWlyZSgnLi91dGlsL2Vycm9yJykuTG9hZGVyO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gbG9hZGVyO1xuXG5cbmZ1bmN0aW9uIGxvYWRlcihyb290RWwsIGNhbGxiYWNrKSB7XHRcblx0bWlsb01haWwub25NZXNzYWdlKCdkb21yZWFkeScsIGZ1bmN0aW9uKCkge1xuXHRcdGlmICh0eXBlb2Ygcm9vdEVsID09ICdmdW5jdGlvbicpIHtcblx0XHRcdGNhbGxiYWNrID0gcm9vdEVsO1xuXHRcdFx0cm9vdEVsID0gdW5kZWZpbmVkO1xuXHRcdH1cblxuXHRcdHJvb3RFbCA9IHJvb3RFbCB8fCBkb2N1bWVudC5ib2R5O1xuXG5cdFx0bWlsb01haWwucG9zdE1lc3NhZ2UoJ2xvYWRlcicsIHsgc3RhdGU6ICdzdGFydGVkJyB9KTtcblx0XHRfbG9hZGVyKHJvb3RFbCwgZnVuY3Rpb24odmlld3MpIHtcblx0XHRcdG1pbG9NYWlsLnBvc3RNZXNzYWdlKCdsb2FkZXInLCB7IFxuXHRcdFx0XHRzdGF0ZTogJ2ZpbmlzaGVkJyxcblx0XHRcdFx0dmlld3M6IHZpZXdzXG5cdFx0XHR9KTtcblx0XHRcdGNhbGxiYWNrKHZpZXdzKTtcblx0XHR9KTtcblx0fSk7XG59XG5cblxuZnVuY3Rpb24gX2xvYWRlcihyb290RWwsIGNhbGxiYWNrKSB7XG5cdHZhciBsb2FkRWxlbWVudHMgPSByb290RWwucXVlcnlTZWxlY3RvckFsbCgnWycgKyBjb25maWcuYXR0cnMubG9hZCArICddJyk7XG5cblx0dmFyIHZpZXdzID0ge31cblx0XHQsIHRvdGFsQ291bnQgPSBsb2FkRWxlbWVudHMubGVuZ3RoXG5cdFx0LCBsb2FkZWRDb3VudCA9IDA7XG5cblx0QXJyYXkucHJvdG90eXBlLmZvckVhY2guY2FsbChsb2FkRWxlbWVudHMsIGZ1bmN0aW9uIChlbCkge1xuXHRcdGxvYWRWaWV3KGVsLCBmdW5jdGlvbihlcnIpIHtcblx0XHRcdHZpZXdzW2VsLmlkXSA9IGVyciB8fCBlbDtcblx0XHRcdGxvYWRlZENvdW50Kys7XG5cdFx0XHRpZiAobG9hZGVkQ291bnQgPT0gdG90YWxDb3VudClcblx0XHRcdFx0Y2FsbGJhY2sodmlld3MpO1xuXHRcdH0pO1xuXHR9KTtcbn07XG5cblxuZnVuY3Rpb24gbG9hZFZpZXcoZWwsIGNhbGxiYWNrKSB7XG5cdGlmIChlbC5jaGlsZHJlbi5sZW5ndGgpXG5cdFx0dGhyb3cgbmV3IExvYWRlckVycm9yKCdjYW5cXCd0IGxvYWQgaHRtbCBpbnRvIGVsZW1lbnQgdGhhdCBpcyBub3QgZW1wdHknKTtcblxuXHR2YXIgYXR0ciA9IG5ldyBMb2FkQXR0cmlidXRlKGVsKTtcblxuXHRhdHRyLnBhcnNlKCkudmFsaWRhdGUoKTtcblxuXHRyZXF1ZXN0LmdldChhdHRyLmxvYWRVcmwsIGZ1bmN0aW9uKGVyciwgaHRtbCkge1xuXHRcdGlmIChlcnIpIHtcblx0XHRcdGVyci5tZXNzYWdlID0gZXJyLm1lc3NhZ2UgfHwgJ2NhblxcJ3QgbG9hZCBmaWxlICcgKyBhdHRyLmxvYWRVcmw7XG5cdFx0XHQvLyBsb2dnZXIuZXJyb3IoZXJyLm1lc3NhZ2UpO1xuXHRcdFx0Y2FsbGJhY2soZXJyKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRlbC5pbm5lckhUTUwgPSBodG1sO1xuXHRcdGNhbGxiYWNrKG51bGwpO1xuXHR9KTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIE1lc3NlbmdlciA9IHJlcXVpcmUoJy4uL21lc3NlbmdlcicpXG5cdCwgTWFpbE1lc3NhZ2VTb3VyY2UgPSByZXF1aXJlKCcuL21haWxfc291cmNlJyk7XG5cblxudmFyIG1haWxNc2dTb3VyY2UgPSBuZXcgTWFpbE1lc3NhZ2VTb3VyY2UoKTtcblxudmFyIG1pbG9NYWlsID0gbmV3IE1lc3Nlbmdlcih1bmRlZmluZWQsIHVuZGVmaW5lZCwgbWFpbE1zZ1NvdXJjZSk7XG5cbm1vZHVsZS5leHBvcnRzID0gbWlsb01haWw7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBNZXNzYWdlU291cmNlID0gcmVxdWlyZSgnLi4vbWVzc2VuZ2VyL21lc3NhZ2Vfc291cmNlJylcblx0LCBkb21FdmVudHNDb25zdHJ1Y3RvcnMgPSByZXF1aXJlKCcuLi9jb21wb25lbnRzL2NfbWVzc2FnZV9zb3VyY2VzL2RvbV9ldmVudHNfY29uc3RydWN0b3JzJylcblx0LCBNYWlsTWVzc2FnZVNvdXJjZUVycm9yID0gcmVxdWlyZSgnLi4vdXRpbC9lcnJvcicpLk1haWxNZXNzYWdlU291cmNlXG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpXG5cdCwgY2hlY2sgPSByZXF1aXJlKCcuLi91dGlsL2NoZWNrJylcblx0LCBNYXRjaCA9IGNoZWNrLk1hdGNoO1xuXG5cbnZhciBNYWlsTWVzc2FnZVNvdXJjZSA9IF8uY3JlYXRlU3ViY2xhc3MoTWVzc2FnZVNvdXJjZSwgJ01haWxNZXNzYWdlU291cmNlJywgdHJ1ZSk7XG5cblxuXy5leHRlbmRQcm90byhNYWlsTWVzc2FnZVNvdXJjZSwge1xuXHQvLyBpbXBsZW1lbnRpbmcgTWVzc2FnZVNvdXJjZSBpbnRlcmZhY2Vcblx0Ly8gaW5pdDogZGVmaW5lZCBpbiBNZXNzYWdlU291cmNlXG5cdHRyYW5zbGF0ZVRvU291cmNlTWVzc2FnZTogdHJhbnNsYXRlVG9Eb21FdmVudCxcbiBcdGFkZFNvdXJjZUxpc3RlbmVyOiBhZGREb21FdmVudExpc3RlbmVyLFxuIFx0cmVtb3ZlU291cmNlTGlzdGVuZXI6IHJlbW92ZURvbUV2ZW50TGlzdGVuZXIsXG4gXHRmaWx0ZXJTb3VyY2VNZXNzYWdlOiBmaWx0ZXJEb21FdmVudCxcblxuIFx0Ly8gY2xhc3Mgc3BlY2lmaWMgbWV0aG9kc1xuIFx0aGFuZGxlRXZlbnQ6IGhhbmRsZUV2ZW50LCAgLy8gZXZlbnQgZGlzcGF0Y2hlciAtIGFzIGRlZmluZWQgYnkgRXZlbnQgRE9NIEFQSVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gTWFpbE1lc3NhZ2VTb3VyY2U7XG5cblxuLy8gVE9ETzogdGhpcyBmdW5jdGlvbiBzaG91bGQgcmV0dXJuIHJlbGV2YW50IERPTSBldmVudCBkZXBlbmRlbnQgb24gZWxlbWVudCB0YWdcbi8vIENhbiBhbHNvIGltcGxlbWVudCBiZWZvcmVkYXRhY2hhbmdlZCBldmVudCB0byBhbGxvdyBwcmV2ZW50aW5nIHRoZSBjaGFuZ2VcbmZ1bmN0aW9uIHRyYW5zbGF0ZVRvRG9tRXZlbnQobWVzc2FnZSkge1xuXHRpZiAobWVzc2FnZSA9PSAnZG9tcmVhZHknKVxuXHRcdHJldHVybiAncmVhZHlzdGF0ZWNoYW5nZSc7XG59XG5cblxuZnVuY3Rpb24gYWRkRG9tRXZlbnRMaXN0ZW5lcihldmVudFR5cGUpIHtcblx0aWYgKHR5cGVvZiBkb2N1bWVudCA9PSAnb2JqZWN0Jykge1xuXHRcdGlmIChldmVudFR5cGUgPT0gJ3JlYWR5c3RhdGVjaGFuZ2UnKSB7XG5cdFx0XHRpZiAoZG9jdW1lbnQucmVhZHlTdGF0ZSA9PSAnbG9hZGluZycpXG5cdFx0XHRcdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlLCB0aGlzLCBmYWxzZSk7IC8vIG5vIGNhcHR1cmluZ1xuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdHZhciBkb21FdmVudCA9IEV2ZW50Q29uc3RydWN0b3IoZXZlbnRUeXBlLCB7IHRhcmdldDogZG9jdW1lbnQgfSk7XG5cdFx0XHRcdHRoaXMuZGlzcGF0Y2hNZXNzYWdlKGV2ZW50VHlwZSwgZXZlbnQpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxufVxuXG5cbmZ1bmN0aW9uIHJlbW92ZURvbUV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlKSB7XG5cdGlmICh0eXBlb2YgZG9jdW1lbnQgPT0gJ29iamVjdCcpXG5cdFx0ZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudFR5cGUsIHRoaXMsIGZhbHNlKTsgLy8gbm8gY2FwdHVyaW5nXG59XG5cblxuZnVuY3Rpb24gZmlsdGVyRG9tRXZlbnQoZXZlbnRUeXBlLCBtZXNzYWdlLCBldmVudCkge1xuXHRpZiAoZXZlbnRUeXBlID09ICdyZWFkeXN0YXRlY2hhbmdlJykge1xuXHRcdGlmICh0aGlzLl9kb21SZWFkeUZpcmVkKSByZXR1cm4gZmFsc2U7XG5cdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdfZG9tUmVhZHlGaXJlZCcsIHtcblx0XHRcdHdyaXRhYmxlOiB0cnVlLFxuXHRcdFx0dmFsdWU6IHRydWVcblx0XHR9KTtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxufTtcblxuXG4gLy8gZXZlbnQgZGlzcGF0Y2hlciAtIGFzIGRlZmluZWQgYnkgRXZlbnQgRE9NIEFQSVxuZnVuY3Rpb24gaGFuZGxlRXZlbnQoZXZlbnQpIHtcblx0dGhpcy5kaXNwYXRjaE1lc3NhZ2UoZXZlbnQudHlwZSwgZXZlbnQpO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgTWl4aW4gPSByZXF1aXJlKCcuLi9hYnN0cmFjdC9taXhpbicpXG5cdCwgTWVzc2FnZVNvdXJjZSA9IHJlcXVpcmUoJy4vbWVzc2FnZV9zb3VyY2UnKVxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vdXRpbC9jaGVjaycpXG5cdCwgTWF0Y2ggPSBjaGVjay5NYXRjaFxuXHQsIE1lc3NlbmdlckVycm9yID0gcmVxdWlyZSgnLi4vdXRpbC9lcnJvcicpLk1lc3NlbmdlcjtcblxuXG52YXIgZXZlbnRzU3BsaXRSZWdFeHAgPSAvXFxzKig/OlxcLHxcXHMpXFxzKi87XG5cblxudmFyIE1lc3NlbmdlciA9IF8uY3JlYXRlU3ViY2xhc3MoTWl4aW4sICdNZXNzZW5nZXInKTtcblxuXy5leHRlbmRQcm90byhNZXNzZW5nZXIsIHtcblx0aW5pdDogaW5pdE1lc3NlbmdlciwgLy8gY2FsbGVkIGJ5IE1peGluIChzdXBlcmNsYXNzKVxuXHRvbk1lc3NhZ2U6IHJlZ2lzdGVyU3Vic2NyaWJlcixcblx0b2ZmTWVzc2FnZTogcmVtb3ZlU3Vic2NyaWJlcixcblx0b25NZXNzYWdlczogcmVnaXN0ZXJTdWJzY3JpYmVycyxcblx0b2ZmTWVzc2FnZXM6IHJlbW92ZVN1YnNjcmliZXJzLFxuXHRwb3N0TWVzc2FnZTogcG9zdE1lc3NhZ2UsXG5cdGdldFN1YnNjcmliZXJzOiBnZXRNZXNzYWdlU3Vic2NyaWJlcnMsXG5cdF9jaG9vc2VTdWJzY3JpYmVyc0hhc2g6IF9jaG9vc2VTdWJzY3JpYmVyc0hhc2gsXG5cdF9yZWdpc3RlclN1YnNjcmliZXI6IF9yZWdpc3RlclN1YnNjcmliZXIsXG5cdF9yZW1vdmVTdWJzY3JpYmVyOiBfcmVtb3ZlU3Vic2NyaWJlcixcblx0X3JlbW92ZUFsbFN1YnNjcmliZXJzOiBfcmVtb3ZlQWxsU3Vic2NyaWJlcnMsXG5cdF9jYWxsUGF0dGVyblN1YnNjcmliZXJzOiBfY2FsbFBhdHRlcm5TdWJzY3JpYmVycyxcblx0X2NhbGxTdWJzY3JpYmVyczogX2NhbGxTdWJzY3JpYmVycyxcblx0X3NldE1lc3NhZ2VTb3VyY2U6IF9zZXRNZXNzYWdlU291cmNlXG59KTtcblxuXG5NZXNzZW5nZXIuZGVmYXVsdE1ldGhvZHMgPSB7XG5cdG9uOiAnb25NZXNzYWdlJyxcblx0b2ZmOiAnb2ZmTWVzc2FnZScsXG5cdG9uTWVzc2FnZXM6ICdvbk1lc3NhZ2VzJyxcblx0b2ZmTWVzc2FnZXM6ICdvZmZNZXNzYWdlcycsXG5cdHBvc3RNZXNzYWdlOiAncG9zdE1lc3NhZ2UnLFxuXHRnZXRTdWJzY3JpYmVyczogJ2dldFN1YnNjcmliZXJzJ1xufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IE1lc3NlbmdlcjtcblxuXG5mdW5jdGlvbiBpbml0TWVzc2VuZ2VyKGhvc3RPYmplY3QsIHByb3h5TWV0aG9kcywgbWVzc2FnZVNvdXJjZSkge1xuXHRjaGVjayhtZXNzYWdlU291cmNlLCBNYXRjaC5PcHRpb25hbChNZXNzYWdlU291cmNlKSk7XG5cblx0Ly8gaG9zdE9iamVjdCBhbmQgcHJveHlNZXRob2RzIGFyZSB1c2VkIGluIE1peGluXG4gXHQvLyBtZXNzZW5nZXIgZGF0YVxuIFx0T2JqZWN0LmRlZmluZVByb3BlcnRpZXModGhpcywge1xuIFx0XHRfbWVzc2FnZVN1YnNjcmliZXJzOiB7IHZhbHVlOiB7fSB9LFxuIFx0XHRfcGF0dGVybk1lc3NhZ2VTdWJzY3JpYmVyczogeyB2YWx1ZToge30gfSxcbiBcdFx0X21lc3NhZ2VTb3VyY2U6IHsgdmFsdWU6IG1lc3NhZ2VTb3VyY2UsIHdyaXRhYmxlOiB0cnVlIH1cbiBcdH0pO1xuXG4gXHRpZiAobWVzc2FnZVNvdXJjZSlcbiBcdFx0bWVzc2FnZVNvdXJjZS5tZXNzZW5nZXIgPSB0aGlzO1xufVxuXG5cbmZ1bmN0aW9uIHJlZ2lzdGVyU3Vic2NyaWJlcihtZXNzYWdlcywgc3Vic2NyaWJlcikge1xuXHRjaGVjayhtZXNzYWdlcywgTWF0Y2guT25lT2YoU3RyaW5nLCBbU3RyaW5nXSwgUmVnRXhwKSk7XG5cdGNoZWNrKHN1YnNjcmliZXIsIEZ1bmN0aW9uKTsgXG5cblx0aWYgKHR5cGVvZiBtZXNzYWdlcyA9PSAnc3RyaW5nJylcblx0XHRtZXNzYWdlcyA9IG1lc3NhZ2VzLnNwbGl0KGV2ZW50c1NwbGl0UmVnRXhwKTtcblxuXHR2YXIgc3Vic2NyaWJlcnNIYXNoID0gdGhpcy5fY2hvb3NlU3Vic2NyaWJlcnNIYXNoKG1lc3NhZ2VzKTtcblxuXHRpZiAobWVzc2FnZXMgaW5zdGFuY2VvZiBSZWdFeHApXG5cdFx0cmV0dXJuIHRoaXMuX3JlZ2lzdGVyU3Vic2NyaWJlcihzdWJzY3JpYmVyc0hhc2gsIG1lc3NhZ2VzLCBzdWJzY3JpYmVyKTtcblxuXHRlbHNlIHtcblx0XHR2YXIgd2FzUmVnaXN0ZXJlZCA9IGZhbHNlO1xuXG5cdFx0bWVzc2FnZXMuZm9yRWFjaChmdW5jdGlvbihtZXNzYWdlKSB7XG5cdFx0XHR2YXIgbm90WWV0UmVnaXN0ZXJlZCA9IHRoaXMuX3JlZ2lzdGVyU3Vic2NyaWJlcihzdWJzY3JpYmVyc0hhc2gsIG1lc3NhZ2UsIHN1YnNjcmliZXIpO1x0XHRcdFxuXHRcdFx0d2FzUmVnaXN0ZXJlZCA9IHdhc1JlZ2lzdGVyZWQgfHwgbm90WWV0UmVnaXN0ZXJlZDtcdFx0XHRcblx0XHR9LCB0aGlzKTtcblxuXHRcdHJldHVybiB3YXNSZWdpc3RlcmVkO1xuXHR9XG59XG5cblxuZnVuY3Rpb24gX3JlZ2lzdGVyU3Vic2NyaWJlcihzdWJzY3JpYmVyc0hhc2gsIG1lc3NhZ2UsIHN1YnNjcmliZXIpIHtcblx0aWYgKCEgKHN1YnNjcmliZXJzSGFzaFttZXNzYWdlXSAmJiBzdWJzY3JpYmVyc0hhc2hbbWVzc2FnZV0ubGVuZ3RoKSkge1xuXHRcdHN1YnNjcmliZXJzSGFzaFttZXNzYWdlXSA9IFtdO1xuXHRcdHZhciBub1N1YnNjcmliZXJzID0gdHJ1ZTtcblx0XHRpZiAodGhpcy5fbWVzc2FnZVNvdXJjZSlcblx0XHRcdHRoaXMuX21lc3NhZ2VTb3VyY2Uub25TdWJzY3JpYmVyQWRkZWQobWVzc2FnZSk7XG5cdH1cblxuXHR2YXIgbXNnU3Vic2NyaWJlcnMgPSBzdWJzY3JpYmVyc0hhc2hbbWVzc2FnZV07XG5cdHZhciBub3RZZXRSZWdpc3RlcmVkID0gbm9TdWJzY3JpYmVycyB8fCBtc2dTdWJzY3JpYmVycy5pbmRleE9mKHN1YnNjcmliZXIpID09IC0xO1xuXG5cdGlmIChub3RZZXRSZWdpc3RlcmVkKVxuXHRcdG1zZ1N1YnNjcmliZXJzLnB1c2goc3Vic2NyaWJlcik7XG5cblx0cmV0dXJuIG5vdFlldFJlZ2lzdGVyZWQ7XG59XG5cblxuZnVuY3Rpb24gcmVnaXN0ZXJTdWJzY3JpYmVycyhtZXNzYWdlU3Vic2NyaWJlcnMpIHtcblx0Y2hlY2sobWVzc2FnZVN1YnNjcmliZXJzLCBNYXRjaC5PYmplY3RIYXNoKEZ1bmN0aW9uKSk7XG5cblx0dmFyIG5vdFlldFJlZ2lzdGVyZWRNYXAgPSBfLm1hcEtleXMobWVzc2FnZVN1YnNjcmliZXJzLCBmdW5jdGlvbihzdWJzY3JpYmVyLCBtZXNzYWdlcykge1xuXHRcdHJldHVybiB0aGlzLm9uTWVzc2FnZShtZXNzYWdlcywgc3Vic2NyaWJlcilcblx0fSwgdGhpcyk7XG5cblx0cmV0dXJuIG5vdFlldFJlZ2lzdGVyZWRNYXA7XG59XG5cblxuLy8gcmVtb3ZlcyBhbGwgc3Vic2NyaWJlcnMgZm9yIHRoZSBtZXNzYWdlIGlmIHN1YnNjcmliZXIgaXNuJ3Qgc3VwcGxpZWRcbmZ1bmN0aW9uIHJlbW92ZVN1YnNjcmliZXIobWVzc2FnZXMsIHN1YnNjcmliZXIpIHtcblx0Y2hlY2sobWVzc2FnZXMsIE1hdGNoLk9uZU9mKFN0cmluZywgW1N0cmluZ10sIFJlZ0V4cCkpO1xuXHRjaGVjayhzdWJzY3JpYmVyLCBNYXRjaC5PcHRpb25hbChGdW5jdGlvbikpOyBcblxuXHRpZiAodHlwZW9mIG1lc3NhZ2VzID09ICdzdHJpbmcnKVxuXHRcdG1lc3NhZ2VzID0gbWVzc2FnZXMuc3BsaXQoZXZlbnRzU3BsaXRSZWdFeHApO1xuXG5cdHZhciBzdWJzY3JpYmVyc0hhc2ggPSB0aGlzLl9jaG9vc2VTdWJzY3JpYmVyc0hhc2gobWVzc2FnZXMpO1xuXG5cdGlmIChtZXNzYWdlcyBpbnN0YW5jZW9mIFJlZ0V4cClcblx0XHRyZXR1cm4gdGhpcy5fcmVtb3ZlU3Vic2NyaWJlcihzdWJzY3JpYmVyc0hhc2gsIG1lc3NhZ2VzLCBzdWJzY3JpYmVyKTtcblxuXHRlbHNlIHtcblx0XHR2YXIgd2FzUmVtb3ZlZCA9IGZhbHNlO1xuXG5cdFx0bWVzc2FnZXMuZm9yRWFjaChmdW5jdGlvbihtZXNzYWdlKSB7XG5cdFx0XHR2YXIgc3Vic2NyaWJlclJlbW92ZWQgPSB0aGlzLl9yZW1vdmVTdWJzY3JpYmVyKHN1YnNjcmliZXJzSGFzaCwgbWVzc2FnZSwgc3Vic2NyaWJlcik7XHRcdFx0XG5cdFx0XHR3YXNSZW1vdmVkID0gd2FzUmVtb3ZlZCB8fCBzdWJzY3JpYmVyUmVtb3ZlZDtcdFx0XHRcblx0XHR9LCB0aGlzKTtcblxuXHRcdHJldHVybiB3YXNSZW1vdmVkO1xuXHR9XG59XG5cblxuZnVuY3Rpb24gX3JlbW92ZVN1YnNjcmliZXIoc3Vic2NyaWJlcnNIYXNoLCBtZXNzYWdlLCBzdWJzY3JpYmVyKSB7XG5cdHZhciBtc2dTdWJzY3JpYmVycyA9IHN1YnNjcmliZXJzSGFzaFttZXNzYWdlXTtcblx0aWYgKCEgbXNnU3Vic2NyaWJlcnMgfHwgISBtc2dTdWJzY3JpYmVycy5sZW5ndGgpXG5cdFx0cmV0dXJuIGZhbHNlOyAvLyBub3RoaW5nIHJlbW92ZWRcblxuXHRpZiAoc3Vic2NyaWJlcikge1xuXHRcdHZhciBzdWJzY3JpYmVySW5kZXggPSBtc2dTdWJzY3JpYmVycy5pbmRleE9mKHN1YnNjcmliZXIpO1xuXHRcdGlmIChzdWJzY3JpYmVySW5kZXggPT0gLTEpIFxuXHRcdFx0cmV0dXJuIGZhbHNlOyAvLyBub3RoaW5nIHJlbW92ZWRcblx0XHRtc2dTdWJzY3JpYmVycy5zcGxpY2Uoc3Vic2NyaWJlckluZGV4LCAxKTtcblx0XHRpZiAoISBtc2dTdWJzY3JpYmVycy5sZW5ndGgpXG5cdFx0XHR0aGlzLl9yZW1vdmVBbGxTdWJzY3JpYmVycyhzdWJzY3JpYmVyc0hhc2gsIG1lc3NhZ2UpO1xuXG5cdH0gZWxzZSBcblx0XHR0aGlzLl9yZW1vdmVBbGxTdWJzY3JpYmVycyhzdWJzY3JpYmVyc0hhc2gsIG1lc3NhZ2UpO1xuXG5cdHJldHVybiB0cnVlOyAvLyBzdWJzY3JpYmVyKHMpIHJlbW92ZWRcbn1cblxuXG5mdW5jdGlvbiBfcmVtb3ZlQWxsU3Vic2NyaWJlcnMoc3Vic2NyaWJlcnNIYXNoLCBtZXNzYWdlKSB7XG5cdGRlbGV0ZSBzdWJzY3JpYmVyc0hhc2hbbWVzc2FnZV07XG5cdGlmICh0aGlzLl9tZXNzYWdlU291cmNlKVxuXHRcdHRoaXMuX21lc3NhZ2VTb3VyY2Uub25TdWJzY3JpYmVyUmVtb3ZlZChtZXNzYWdlKTtcbn1cblxuXG5mdW5jdGlvbiByZW1vdmVTdWJzY3JpYmVycyhtZXNzYWdlU3Vic2NyaWJlcnMpIHtcblx0Y2hlY2sobWVzc2FnZVN1YnNjcmliZXJzLCBNYXRjaC5PYmplY3RIYXNoKEZ1bmN0aW9uKSk7XG5cblx0dmFyIHN1YnNjcmliZXJSZW1vdmVkTWFwID0gXy5tYXBLZXlzKG1lc3NhZ2VTdWJzY3JpYmVycywgZnVuY3Rpb24oc3Vic2NyaWJlciwgbWVzc2FnZXMpIHtcblx0XHRyZXR1cm4gdGhpcy5vZmZNZXNzYWdlcyhtZXNzYWdlcywgc3Vic2NyaWJlcilcblx0fSwgdGhpcyk7XG5cblx0cmV0dXJuIHN1YnNjcmliZXJSZW1vdmVkTWFwO1x0XG59XG5cblxuLy8gVE9ETyAtIHNlbmQgZXZlbnQgdG8gbWVzc2FnZVNvdXJjZVxuXG5cbmZ1bmN0aW9uIHBvc3RNZXNzYWdlKG1lc3NhZ2UsIGRhdGEpIHtcblx0Y2hlY2sobWVzc2FnZSwgTWF0Y2guT25lT2YoU3RyaW5nLCBSZWdFeHApKTtcblxuXHR2YXIgc3Vic2NyaWJlcnNIYXNoID0gdGhpcy5fY2hvb3NlU3Vic2NyaWJlcnNIYXNoKG1lc3NhZ2UpO1xuXHR2YXIgbXNnU3Vic2NyaWJlcnMgPSBzdWJzY3JpYmVyc0hhc2hbbWVzc2FnZV07XG5cblx0dGhpcy5fY2FsbFN1YnNjcmliZXJzKG1lc3NhZ2UsIGRhdGEsIG1zZ1N1YnNjcmliZXJzKTtcblxuXHRpZiAodHlwZW9mIG1lc3NhZ2UgPT0gJ3N0cmluZycpXG5cdFx0dGhpcy5fY2FsbFBhdHRlcm5TdWJzY3JpYmVycyhtZXNzYWdlLCBkYXRhKTtcbn1cblxuXG5mdW5jdGlvbiBfY2FsbFBhdHRlcm5TdWJzY3JpYmVycyhtZXNzYWdlLCBkYXRhKSB7XG5cdF8uZWFjaEtleSh0aGlzLl9wYXR0ZXJuTWVzc2FnZVN1YnNjcmliZXJzLCBcblx0XHRmdW5jdGlvbihwYXR0ZXJuU3Vic2NyaWJlcnMsIHBhdHRlcm4pIHtcblx0XHRcdGlmIChwYXR0ZXJuLnRlc3QobWVzc2FnZSkpXG5cdFx0XHRcdHRoaXMuX2NhbGxTdWJzY3JpYmVycyhtZXNzYWdlLCBkYXRhLCBwYXR0ZXJuU3Vic2NyaWJlcnMpO1xuXHRcdH1cblx0LCB0aGlzKTtcbn1cblxuXG5mdW5jdGlvbiBfY2FsbFN1YnNjcmliZXJzKG1lc3NhZ2UsIGRhdGEsIG1zZ1N1YnNjcmliZXJzKSB7XG5cdGlmIChtc2dTdWJzY3JpYmVycyAmJiBtc2dTdWJzY3JpYmVycy5sZW5ndGgpXG5cdFx0bXNnU3Vic2NyaWJlcnMuZm9yRWFjaChmdW5jdGlvbihzdWJzY3JpYmVyKSB7XG5cdFx0XHRzdWJzY3JpYmVyLmNhbGwodGhpcy5faG9zdE9iamVjdCwgbWVzc2FnZSwgZGF0YSk7XG5cdFx0fSwgdGhpcyk7XG59XG5cblxuZnVuY3Rpb24gZ2V0TWVzc2FnZVN1YnNjcmliZXJzKG1lc3NhZ2UsIGluY2x1ZGVQYXR0ZXJuU3Vic2NyaWJlcnMpIHtcblx0Y2hlY2sobWVzc2FnZSwgTWF0Y2guT25lT2YoU3RyaW5nLCBSZWdFeHApKTtcblxuXHR2YXIgc3Vic2NyaWJlcnNIYXNoID0gdGhpcy5fY2hvb3NlU3Vic2NyaWJlcnNIYXNoKG1lc3NhZ2UpO1xuXHR2YXIgbXNnU3Vic2NyaWJlcnMgPSBzdWJzY3JpYmVyc0hhc2hbbWVzc2FnZV1cblx0XHRcdFx0XHRcdFx0PyBbXS5jb25jYXQoc3Vic2NyaWJlcnNIYXNoW21lc3NhZ2VdKVxuXHRcdFx0XHRcdFx0XHQ6IFtdO1xuXG5cdC8vIHBhdHRlcm4gc3Vic2NyaWJlcnMgYXJlIGluY3VkZWQgYnkgZGVmYXVsdFxuXHRpZiAoaW5jbHVkZVBhdHRlcm5TdWJzY3JpYmVycyAhPT0gZmFsc2UgJiYgdHlwZW9mIG1lc3NhZ2UgPT0gJ3N0cmluZycpIHtcblx0XHRfLmVhY2hLZXkodGhpcy5fcGF0dGVybk1lc3NhZ2VTdWJzY3JpYmVycywgXG5cdFx0XHRmdW5jdGlvbihwYXR0ZXJuU3Vic2NyaWJlcnMsIHBhdHRlcm4pIHtcblx0XHRcdFx0aWYgKHBhdHRlcm5TdWJzY3JpYmVycyAmJiBwYXR0ZXJuU3Vic2NyaWJlcnMubGVuZ3RoXG5cdFx0XHRcdFx0XHQmJiBwYXR0ZXJuLnRlc3QobWVzc2FnZSkpXG5cdFx0XHRcdFx0Xy5hcHBlbmRBcnJheShtc2dTdWJzY3JpYmVycywgcGF0dGVyblN1YnNjcmliZXJzKTtcblx0XHRcdH1cblx0XHQpO1xuXHR9XG5cblx0cmV0dXJuIG1zZ1N1YnNjcmliZXJzLmxlbmd0aFxuXHRcdFx0XHQ/IG1zZ1N1YnNjcmliZXJzXG5cdFx0XHRcdDogdW5kZWZpbmVkO1xufVxuXG5cbmZ1bmN0aW9uIF9jaG9vc2VTdWJzY3JpYmVyc0hhc2gobWVzc2FnZSkge1xuXHRyZXR1cm4gbWVzc2FnZSBpbnN0YW5jZW9mIFJlZ0V4cFxuXHRcdFx0XHQ/IHRoaXMuX3BhdHRlcm5NZXNzYWdlU3Vic2NyaWJlcnNcblx0XHRcdFx0OiB0aGlzLl9tZXNzYWdlU3Vic2NyaWJlcnM7XG59XG5cblxuZnVuY3Rpb24gX3NldE1lc3NhZ2VTb3VyY2UobWVzc2FnZVNvdXJjZSkge1xuXHRjaGVjayhtZXNzYWdlU291cmNlLCBNZXNzYWdlU291cmNlKTtcblxuIFx0T2JqZWN0LmRlZmluZVByb3BlcnRpZXModGhpcywge1xuIFx0XHRfbWVzc2FnZVNvdXJjZTogeyB2YWx1ZTogbWVzc2FnZVNvdXJjZSB9XG4gXHR9KTtcbiBcdG1lc3NhZ2VTb3VyY2UubWVzc2VuZ2VyID0gdGhpcztcbn1cblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgTWl4aW4gPSByZXF1aXJlKCcuLi9hYnN0cmFjdC9taXhpbicpXG5cdCwgbG9nZ2VyID0gcmVxdWlyZSgnLi4vdXRpbC9sb2dnZXInKVxuXHQsIHRvQmVJbXBsZW1lbnRlZCA9IHJlcXVpcmUoJy4uL3V0aWwvZXJyb3InKS50b0JlSW1wbGVtZW50ZWRcblx0LCBfID0gcmVxdWlyZSgnbW9sLXByb3RvJyk7XG5cbi8vIGFuIGFic3RyYWN0IGNsYXNzIGZvciBkaXNwYXRjaGluZyBleHRlcm5hbCB0byBpbnRlcm5hbCBldmVudHNcbnZhciBNZXNzYWdlU291cmNlID0gXy5jcmVhdGVTdWJjbGFzcyhNaXhpbiwgJ01lc3NhZ2VTb3VyY2UnLCB0cnVlKTtcblxubW9kdWxlLmV4cG9ydHMgPSBNZXNzYWdlU291cmNlO1xuXG5cbl8uZXh0ZW5kUHJvdG8oTWVzc2FnZVNvdXJjZSwge1xuXHQvLyBpbml0aWFsaXplcyBtZXNzYWdlU291cmNlIC0gY2FsbGVkIGJ5IE1peGluIHN1cGVyY2xhc3Ncblx0aW5pdDogaW5pdE1lc3NhZ2VTb3VyY2UsXG5cblx0Ly8gY2FsbGVkIGJ5IE1lc3NlbmdlciB0byBub3RpZnkgd2hlbiB0aGUgZmlyc3Qgc3Vic2NyaWJlciBmb3IgYW4gaW50ZXJuYWwgbWVzc2FnZSB3YXMgYWRkZWRcblx0b25TdWJzY3JpYmVyQWRkZWQ6IG9uU3Vic2NyaWJlckFkZGVkLFxuXG5cdC8vIGNhbGxlZCBieSBNZXNzZW5nZXIgdG8gbm90aWZ5IHdoZW4gdGhlIGxhc3Qgc3Vic2NyaWJlciBmb3IgYW4gaW50ZXJuYWwgbWVzc2FnZSB3YXMgcmVtb3ZlZFxuIFx0b25TdWJzY3JpYmVyUmVtb3ZlZDogb25TdWJzY3JpYmVyUmVtb3ZlZCwgXG5cbiBcdC8vIGRpc3BhdGNoZXMgc291cmNlIG1lc3NhZ2VcbiBcdGRpc3BhdGNoTWVzc2FnZTogZGlzcGF0Y2hTb3VyY2VNZXNzYWdlLFxuXG5cdC8vIGZpbHRlcnMgc291cmNlIG1lc3NhZ2UgYmFzZWQgb24gdGhlIGRhdGEgb2YgdGhlIG1lc3NhZ2UgLSBzaG91bGQgYmUgaW1wbGVtZW50ZWQgaW4gc3ViY2xhc3Ncblx0ZmlsdGVyU291cmNlTWVzc2FnZTogZGlzcGF0Y2hBbGxTb3VyY2VNZXNzYWdlcyxcblxuIFx0Ly8gKioqXG4gXHQvLyBNZXRob2RzIGJlbG93IG11c3QgYmUgaW1wbGVtZW50ZWQgaW4gc3ViY2xhc3NcbiBcdFxuXHQvLyBjb252ZXJ0cyBpbnRlcm5hbCBtZXNzYWdlIHR5cGUgdG8gZXh0ZXJuYWwgbWVzc2FnZSB0eXBlIC0gc2hvdWxkIGJlIGltcGxlbWVudGVkIGluIHN1YmNsYXNzXG5cdHRyYW5zbGF0ZVRvU291cmNlTWVzc2FnZTogdG9CZUltcGxlbWVudGVkLFxuXG4gXHQvLyBhZGRzIGxpc3RlbmVyIHRvIGV4dGVybmFsIG1lc3NhZ2UgLSBzaG91bGQgYmUgaW1wbGVtZW50ZWQgYnkgc3ViY2xhc3NcbiBcdGFkZFNvdXJjZUxpc3RlbmVyOiB0b0JlSW1wbGVtZW50ZWQsXG5cbiBcdC8vIHJlbW92ZXMgbGlzdGVuZXIgZnJvbSBleHRlcm5hbCBtZXNzYWdlIC0gc2hvdWxkIGJlIGltcGxlbWVudGVkIGJ5IHN1YmNsYXNzXG4gXHRyZW1vdmVTb3VyY2VMaXN0ZW5lcjogdG9CZUltcGxlbWVudGVkLFxufSk7XG5cblxuZnVuY3Rpb24gaW5pdE1lc3NhZ2VTb3VyY2UoKSB7XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnX2ludGVybmFsTWVzc2FnZXMnLCB7IHZhbHVlOiB7fSB9KTtcbn1cblxuXG5mdW5jdGlvbiBvblN1YnNjcmliZXJBZGRlZChtZXNzYWdlKSB7XG5cdHZhciBzb3VyY2VNZXNzYWdlID0gdGhpcy50cmFuc2xhdGVUb1NvdXJjZU1lc3NhZ2UobWVzc2FnZSk7XG5cblx0aWYgKCEgc291cmNlTWVzc2FnZSkgcmV0dXJuO1xuXG5cdGlmICghIHRoaXMuX2ludGVybmFsTWVzc2FnZXMuaGFzT3duUHJvcGVydHkoc291cmNlTWVzc2FnZSkpIHtcblx0XHR0aGlzLmFkZFNvdXJjZUxpc3RlbmVyKHNvdXJjZU1lc3NhZ2UpO1xuXHRcdHRoaXMuX2ludGVybmFsTWVzc2FnZXNbc291cmNlTWVzc2FnZV0gPSBbXTtcblx0fVxuXHR2YXIgaW50ZXJuYWxNc2dzID0gdGhpcy5faW50ZXJuYWxNZXNzYWdlc1tzb3VyY2VNZXNzYWdlXTtcblxuXHRpZiAoaW50ZXJuYWxNc2dzLmluZGV4T2YobWVzc2FnZSkgPT0gLTEpXG5cdFx0aW50ZXJuYWxNc2dzLnB1c2gobWVzc2FnZSk7XG5cdGVsc2Vcblx0XHRsb2dnZXIud2FybignRHVwbGljYXRlIG5vdGlmaWNhdGlvbiByZWNlaXZlZDogZm9yIHN1YnNjcmliZSB0byBpbnRlcm5hbCBtZXNzYWdlICcgKyBtZXNzYWdlKTtcbn1cblxuXG5mdW5jdGlvbiBvblN1YnNjcmliZXJSZW1vdmVkKG1lc3NhZ2UpIHtcblx0dmFyIHNvdXJjZU1lc3NhZ2UgPSB0aGlzLnRyYW5zbGF0ZVRvU291cmNlTWVzc2FnZShtZXNzYWdlKTtcblxuXHRpZiAoISBzb3VyY2VNZXNzYWdlKSByZXR1cm47XG5cblx0dmFyIGludGVybmFsTXNncyA9IHRoaXMuX2ludGVybmFsTWVzc2FnZXNbc291cmNlTWVzc2FnZV07XG5cblx0aWYgKGludGVybmFsTXNncyAmJiBpbnRlcm5hbE1zZ3MubGVuZ3RoKSB7XG5cdFx0bWVzc2FnZUluZGV4ID0gaW50ZXJuYWxNc2dzLmluZGV4T2YobWVzc2FnZSk7XG5cdFx0aWYgKG1lc3NhZ2VJbmRleCA+PSAwKSB7XG5cdFx0XHRpbnRlcm5hbE1zZ3Muc3BsaWNlKG1lc3NhZ2VJbmRleCwgMSk7XG5cdFx0XHRpZiAoaW50ZXJuYWxNc2dzLmxlbmd0aCA9PSAwKSB7XG5cdFx0XHRcdGRlbGV0ZSB0aGlzLl9pbnRlcm5hbE1lc3NhZ2VzW3NvdXJjZU1lc3NhZ2VdO1xuXHRcdFx0XHR0aGlzLnJlbW92ZVNvdXJjZUxpc3RlbmVyKHNvdXJjZU1lc3NhZ2UpO1xuXHRcdFx0fVxuXHRcdH0gZWxzZVxuXHRcdFx0dW5leHBlY3RlZE5vdGlmaWNhdGlvbldhcm5pbmcoKTtcblx0fSBlbHNlXG5cdFx0dW5leHBlY3RlZE5vdGlmaWNhdGlvbldhcm5pbmcoKTtcblxuXG5cdGZ1bmN0aW9uIHVuZXhwZWN0ZWROb3RpZmljYXRpb25XYXJuaW5nKCkge1xuXHRcdGxvZ2dlci53YXJuKCdub3RpZmljYXRpb24gcmVjZWl2ZWQ6IHVuLXN1YnNjcmliZSBmcm9tIGludGVybmFsIG1lc3NhZ2UgJyArIG1lc3NhZ2Vcblx0XHRcdFx0XHQgKyAnIHdpdGhvdXQgcHJldmlvdXMgc3Vic2NyaXB0aW9uIG5vdGlmaWNhdGlvbicpO1xuXHR9XG59XG5cblxuZnVuY3Rpb24gZGlzcGF0Y2hTb3VyY2VNZXNzYWdlKHNvdXJjZU1lc3NhZ2UsIGRhdGEpIHtcblx0dmFyIGludGVybmFsTXNncyA9IHRoaXMuX2ludGVybmFsTWVzc2FnZXNbc291cmNlTWVzc2FnZV07XG5cblx0aWYgKGludGVybmFsTXNncyAmJiBpbnRlcm5hbE1zZ3MubGVuZ3RoKVxuXHRcdGludGVybmFsTXNncy5mb3JFYWNoKGZ1bmN0aW9uKG1lc3NhZ2UpIHtcblx0XHRcdGlmICh0aGlzLmZpbHRlclNvdXJjZU1lc3NhZ2Vcblx0XHRcdFx0XHQmJiB0aGlzLmZpbHRlclNvdXJjZU1lc3NhZ2Uoc291cmNlTWVzc2FnZSwgbWVzc2FnZSwgZGF0YSkpXG5cdFx0XHRcdHRoaXMubWVzc2VuZ2VyLnBvc3RNZXNzYWdlKG1lc3NhZ2UsIGRhdGEpO1xuXHRcdH0sIHRoaXMpO1xuXHRlbHNlXG5cdFx0bG9nZ2VyLndhcm4oJ3NvdXJjZSBtZXNzYWdlIHJlY2VpdmVkIGZvciB3aGljaCB0aGVyZSBpcyBubyBtYXBwZWQgaW50ZXJuYWwgbWVzc2FnZScpO1xufVxuXG5cbi8vIGNhbiBiZSBvdmVycmlkZGVuIGluIHN1YmNsYXNzIHRvIGltcGxlbWVudCBmaWx0ZXJpbmcgYmFzZWQgb24gbWVzc2FnZSBkYXRhXG5mdW5jdGlvbiBkaXNwYXRjaEFsbFNvdXJjZU1lc3NhZ2VzKHNvdXJjZU1lc3NhZ2UsIG1lc3NhZ2UsIGRhdGEpIHtcblx0cmV0dXJuIHRydWU7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBtaWxvID0ge1xuXHRsb2FkZXI6IHJlcXVpcmUoJy4vbG9hZGVyJyksXG5cdGJpbmRlcjogcmVxdWlyZSgnLi9iaW5kZXInKSxcblx0bWFpbDogcmVxdWlyZSgnLi9tYWlsJyksXG5cdGNvbmZpZzogcmVxdWlyZSgnLi9jb25maWcnKSxcblx0dXRpbDogcmVxdWlyZSgnLi91dGlsJyksXG5cdGNsYXNzZXM6IHJlcXVpcmUoJy4vY2xhc3NlcycpXG59XG5cblxuLy8gdXNlZCBmYWNldHNcbnJlcXVpcmUoJy4vY29tcG9uZW50cy9jX2ZhY2V0cy9Eb20nKTtcbnJlcXVpcmUoJy4vY29tcG9uZW50cy9jX2ZhY2V0cy9EYXRhJyk7XG5yZXF1aXJlKCcuL2NvbXBvbmVudHMvY19mYWNldHMvRnJhbWUnKTtcbnJlcXVpcmUoJy4vY29tcG9uZW50cy9jX2ZhY2V0cy9FdmVudHMnKTtcbnJlcXVpcmUoJy4vY29tcG9uZW50cy9jX2ZhY2V0cy9UZW1wbGF0ZScpO1xucmVxdWlyZSgnLi9jb21wb25lbnRzL2NfZmFjZXRzL0NvbnRhaW5lcicpO1xucmVxdWlyZSgnLi9jb21wb25lbnRzL2NfZmFjZXRzL0RyYWcnKTtcbnJlcXVpcmUoJy4vY29tcG9uZW50cy9jX2ZhY2V0cy9Ecm9wJyk7XG5yZXF1aXJlKCcuL2NvbXBvbmVudHMvY19mYWNldHMvRWRpdGFibGUnKTtcblxuLy8gdXNlZCBjb21wb25lbnRzXG5yZXF1aXJlKCcuL2NvbXBvbmVudHMvY2xhc3Nlcy9WaWV3Jyk7XG5cblxuLy8gZXhwb3J0IGZvciBub2RlL2Jyb3dzZXJpZnlcbmlmICh0eXBlb2YgbW9kdWxlID09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKVx0XG5cdG1vZHVsZS5leHBvcnRzID0gbWlsbztcblxuLy8gZ2xvYmFsIG1pbG8gZm9yIGJyb3dzZXJcbmlmICh0eXBlb2Ygd2luZG93ID09ICdvYmplY3QnKVxuXHR3aW5kb3cubWlsbyA9IG1pbG87XG4iLCIndXNlIHN0cmljdCc7XG5cbi8vIFhYWCBkb2NzXG5cbi8vIFRoaW5ncyB3ZSBleHBsaWNpdGx5IGRvIE5PVCBzdXBwb3J0OlxuLy8gICAgLSBoZXRlcm9nZW5vdXMgYXJyYXlzXG52YXIgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpO1xuXG52YXIgY2hlY2sgPSBmdW5jdGlvbiAodmFsdWUsIHBhdHRlcm4pIHtcbiAgLy8gUmVjb3JkIHRoYXQgY2hlY2sgZ290IGNhbGxlZCwgaWYgc29tZWJvZHkgY2FyZWQuXG4gIHRyeSB7XG4gICAgY2hlY2tTdWJ0cmVlKHZhbHVlLCBwYXR0ZXJuKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgaWYgKChlcnIgaW5zdGFuY2VvZiBNYXRjaC5FcnJvcikgJiYgZXJyLnBhdGgpXG4gICAgICBlcnIubWVzc2FnZSArPSBcIiBpbiBmaWVsZCBcIiArIGVyci5wYXRoO1xuICAgIHRocm93IGVycjtcbiAgfVxufTtcbm1vZHVsZS5leHBvcnRzID0gY2hlY2s7XG5cbnZhciBNYXRjaCA9IGNoZWNrLk1hdGNoID0ge1xuICBPcHRpb25hbDogZnVuY3Rpb24gKHBhdHRlcm4pIHtcbiAgICByZXR1cm4gbmV3IE9wdGlvbmFsKHBhdHRlcm4pO1xuICB9LFxuICBPbmVPZjogZnVuY3Rpb24gKC8qYXJndW1lbnRzKi8pIHtcbiAgICByZXR1cm4gbmV3IE9uZU9mKGFyZ3VtZW50cyk7XG4gIH0sXG4gIEFueTogWydfX2FueV9fJ10sXG4gIFdoZXJlOiBmdW5jdGlvbiAoY29uZGl0aW9uKSB7XG4gICAgcmV0dXJuIG5ldyBXaGVyZShjb25kaXRpb24pO1xuICB9LFxuICBPYmplY3RJbmNsdWRpbmc6IGZ1bmN0aW9uIChwYXR0ZXJuKSB7XG4gICAgcmV0dXJuIG5ldyBPYmplY3RJbmNsdWRpbmcocGF0dGVybik7XG4gIH0sXG4gIC8vIE1hdGNoZXMgb25seSBzaWduZWQgMzItYml0IGludGVnZXJzXG4gIEludGVnZXI6IFsnX19pbnRlZ2VyX18nXSxcblxuICAvLyBNYXRjaGVzIGhhc2ggKG9iamVjdCkgd2l0aCB2YWx1ZXMgbWF0Y2hpbmcgcGF0dGVyblxuICBPYmplY3RIYXNoOiBmdW5jdGlvbihwYXR0ZXJuKSB7XG4gICAgcmV0dXJuIG5ldyBPYmplY3RIYXNoKHBhdHRlcm4pO1xuICB9LFxuXG4gIFN1YmNsYXNzOiBmdW5jdGlvbihTdXBlcmNsYXNzLCBtYXRjaFN1cGVyY2xhc3NUb28pIHtcbiAgICByZXR1cm4gbmV3IFN1YmNsYXNzKFN1cGVyY2xhc3MsIG1hdGNoU3VwZXJjbGFzc1Rvbyk7XG4gIH0sXG5cbiAgLy8gWFhYIG1hdGNoZXJzIHNob3VsZCBrbm93IGhvdyB0byBkZXNjcmliZSB0aGVtc2VsdmVzIGZvciBlcnJvcnNcbiAgRXJyb3I6IFR5cGVFcnJvcixcblxuICAvLyBNZXRlb3IubWFrZUVycm9yVHlwZShcIk1hdGNoLkVycm9yXCIsIGZ1bmN0aW9uIChtc2cpIHtcbiAgICAvLyB0aGlzLm1lc3NhZ2UgPSBcIk1hdGNoIGVycm9yOiBcIiArIG1zZztcbiAgICAvLyBUaGUgcGF0aCBvZiB0aGUgdmFsdWUgdGhhdCBmYWlsZWQgdG8gbWF0Y2guIEluaXRpYWxseSBlbXB0eSwgdGhpcyBnZXRzXG4gICAgLy8gcG9wdWxhdGVkIGJ5IGNhdGNoaW5nIGFuZCByZXRocm93aW5nIHRoZSBleGNlcHRpb24gYXMgaXQgZ29lcyBiYWNrIHVwIHRoZVxuICAgIC8vIHN0YWNrLlxuICAgIC8vIEUuZy46IFwidmFsc1szXS5lbnRpdHkuY3JlYXRlZFwiXG4gICAgLy8gdGhpcy5wYXRoID0gXCJcIjtcbiAgICAvLyBJZiB0aGlzIGdldHMgc2VudCBvdmVyIEREUCwgZG9uJ3QgZ2l2ZSBmdWxsIGludGVybmFsIGRldGFpbHMgYnV0IGF0IGxlYXN0XG4gICAgLy8gcHJvdmlkZSBzb21ldGhpbmcgYmV0dGVyIHRoYW4gNTAwIEludGVybmFsIHNlcnZlciBlcnJvci5cbiAgLy8gICB0aGlzLnNhbml0aXplZEVycm9yID0gbmV3IE1ldGVvci5FcnJvcig0MDAsIFwiTWF0Y2ggZmFpbGVkXCIpO1xuICAvLyB9KSxcblxuICAvLyBUZXN0cyB0byBzZWUgaWYgdmFsdWUgbWF0Y2hlcyBwYXR0ZXJuLiBVbmxpa2UgY2hlY2ssIGl0IG1lcmVseSByZXR1cm5zIHRydWVcbiAgLy8gb3IgZmFsc2UgKHVubGVzcyBhbiBlcnJvciBvdGhlciB0aGFuIE1hdGNoLkVycm9yIHdhcyB0aHJvd24pLlxuICB0ZXN0OiBmdW5jdGlvbiAodmFsdWUsIHBhdHRlcm4pIHtcbiAgICB0cnkge1xuICAgICAgY2hlY2tTdWJ0cmVlKHZhbHVlLCBwYXR0ZXJuKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChlIGluc3RhbmNlb2YgTWF0Y2guRXJyb3IpXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIC8vIFJldGhyb3cgb3RoZXIgZXJyb3JzLlxuICAgICAgdGhyb3cgZTtcbiAgICB9XG4gIH1cbn07XG5cbmZ1bmN0aW9uIE9wdGlvbmFsKHBhdHRlcm4pIHtcbiAgdGhpcy5wYXR0ZXJuID0gcGF0dGVybjtcbn07XG5cbmZ1bmN0aW9uIE9uZU9mKGNob2ljZXMpIHtcbiAgaWYgKGNob2ljZXMubGVuZ3RoID09IDApXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTXVzdCBwcm92aWRlIGF0IGxlYXN0IG9uZSBjaG9pY2UgdG8gTWF0Y2guT25lT2ZcIik7XG4gIHRoaXMuY2hvaWNlcyA9IGNob2ljZXM7XG59O1xuXG5mdW5jdGlvbiBXaGVyZShjb25kaXRpb24pIHtcbiAgdGhpcy5jb25kaXRpb24gPSBjb25kaXRpb247XG59O1xuXG5mdW5jdGlvbiBPYmplY3RJbmNsdWRpbmcocGF0dGVybikge1xuICB0aGlzLnBhdHRlcm4gPSBwYXR0ZXJuO1xufTtcblxuZnVuY3Rpb24gT2JqZWN0SGFzaChwYXR0ZXJuKSB7XG4gIHRoaXMucGF0dGVybiA9IHBhdHRlcm47XG59O1xuXG5mdW5jdGlvbiBTdWJjbGFzcyhTdXBlcmNsYXNzLCBtYXRjaFN1cGVyY2xhc3NUb28pIHtcbiAgdGhpcy5TdXBlcmNsYXNzID0gU3VwZXJjbGFzcztcbiAgdGhpcy5tYXRjaFN1cGVyY2xhc3MgPSBtYXRjaFN1cGVyY2xhc3NUb287XG59O1xuXG52YXIgdHlwZW9mQ2hlY2tzID0gW1xuICBbU3RyaW5nLCBcInN0cmluZ1wiXSxcbiAgW051bWJlciwgXCJudW1iZXJcIl0sXG4gIFtCb29sZWFuLCBcImJvb2xlYW5cIl0sXG4gIC8vIFdoaWxlIHdlIGRvbid0IGFsbG93IHVuZGVmaW5lZCBpbiBKU09OLCB0aGlzIGlzIGdvb2QgZm9yIG9wdGlvbmFsXG4gIC8vIGFyZ3VtZW50cyB3aXRoIE9uZU9mLlxuICBbdW5kZWZpbmVkLCBcInVuZGVmaW5lZFwiXVxuXTtcblxuZnVuY3Rpb24gY2hlY2tTdWJ0cmVlKHZhbHVlLCBwYXR0ZXJuKSB7XG4gIC8vIE1hdGNoIGFueXRoaW5nIVxuICBpZiAocGF0dGVybiA9PT0gTWF0Y2guQW55KVxuICAgIHJldHVybjtcblxuICAvLyBCYXNpYyBhdG9taWMgdHlwZXMuXG4gIC8vIERvIG5vdCBtYXRjaCBib3hlZCBvYmplY3RzIChlLmcuIFN0cmluZywgQm9vbGVhbilcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0eXBlb2ZDaGVja3MubGVuZ3RoOyArK2kpIHtcbiAgICBpZiAocGF0dGVybiA9PT0gdHlwZW9mQ2hlY2tzW2ldWzBdKSB7XG4gICAgICBpZiAodHlwZW9mIHZhbHVlID09PSB0eXBlb2ZDaGVja3NbaV1bMV0pXG4gICAgICAgIHJldHVybjtcbiAgICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIFwiICsgdHlwZW9mQ2hlY2tzW2ldWzFdICsgXCIsIGdvdCBcIiArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZW9mIHZhbHVlKTtcbiAgICB9XG4gIH1cbiAgaWYgKHBhdHRlcm4gPT09IG51bGwpIHtcbiAgICBpZiAodmFsdWUgPT09IG51bGwpXG4gICAgICByZXR1cm47XG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgbnVsbCwgZ290IFwiICsgSlNPTi5zdHJpbmdpZnkodmFsdWUpKTtcbiAgfVxuXG4gIC8vIE1hdGNoLkludGVnZXIgaXMgc3BlY2lhbCB0eXBlIGVuY29kZWQgd2l0aCBhcnJheVxuICBpZiAocGF0dGVybiA9PT0gTWF0Y2guSW50ZWdlcikge1xuICAgIC8vIFRoZXJlIGlzIG5vIGNvbnNpc3RlbnQgYW5kIHJlbGlhYmxlIHdheSB0byBjaGVjayBpZiB2YXJpYWJsZSBpcyBhIDY0LWJpdFxuICAgIC8vIGludGVnZXIuIE9uZSBvZiB0aGUgcG9wdWxhciBzb2x1dGlvbnMgaXMgdG8gZ2V0IHJlbWluZGVyIG9mIGRpdmlzaW9uIGJ5IDFcbiAgICAvLyBidXQgdGhpcyBtZXRob2QgZmFpbHMgb24gcmVhbGx5IGxhcmdlIGZsb2F0cyB3aXRoIGJpZyBwcmVjaXNpb24uXG4gICAgLy8gRS5nLjogMS4zNDgxOTIzMDg0OTE4MjRlKzIzICUgMSA9PT0gMCBpbiBWOFxuICAgIC8vIEJpdHdpc2Ugb3BlcmF0b3JzIHdvcmsgY29uc2lzdGFudGx5IGJ1dCBhbHdheXMgY2FzdCB2YXJpYWJsZSB0byAzMi1iaXRcbiAgICAvLyBzaWduZWQgaW50ZWdlciBhY2NvcmRpbmcgdG8gSmF2YVNjcmlwdCBzcGVjcy5cbiAgICBpZiAodHlwZW9mIHZhbHVlID09PSBcIm51bWJlclwiICYmICh2YWx1ZSB8IDApID09PSB2YWx1ZSlcbiAgICAgIHJldHVyblxuICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIEludGVnZXIsIGdvdCBcIlxuICAgICAgICAgICAgICAgICsgKHZhbHVlIGluc3RhbmNlb2YgT2JqZWN0ID8gSlNPTi5zdHJpbmdpZnkodmFsdWUpIDogdmFsdWUpKTtcbiAgfVxuXG4gIC8vIFwiT2JqZWN0XCIgaXMgc2hvcnRoYW5kIGZvciBNYXRjaC5PYmplY3RJbmNsdWRpbmcoe30pO1xuICBpZiAocGF0dGVybiA9PT0gT2JqZWN0KVxuICAgIHBhdHRlcm4gPSBNYXRjaC5PYmplY3RJbmNsdWRpbmcoe30pO1xuXG4gIC8vIEFycmF5IChjaGVja2VkIEFGVEVSIEFueSwgd2hpY2ggaXMgaW1wbGVtZW50ZWQgYXMgYW4gQXJyYXkpLlxuICBpZiAocGF0dGVybiBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgaWYgKHBhdHRlcm4ubGVuZ3RoICE9PSAxKVxuICAgICAgdGhyb3cgRXJyb3IoXCJCYWQgcGF0dGVybjogYXJyYXlzIG11c3QgaGF2ZSBvbmUgdHlwZSBlbGVtZW50XCIgK1xuICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkocGF0dGVybikpO1xuICAgIGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIGFycmF5LCBnb3QgXCIgKyBKU09OLnN0cmluZ2lmeSh2YWx1ZSkpO1xuICAgIH1cblxuICAgIHZhbHVlLmZvckVhY2goZnVuY3Rpb24gKHZhbHVlRWxlbWVudCwgaW5kZXgpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNoZWNrU3VidHJlZSh2YWx1ZUVsZW1lbnQsIHBhdHRlcm5bMF0pO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIGlmIChlcnIgaW5zdGFuY2VvZiBNYXRjaC5FcnJvcikge1xuICAgICAgICAgIGVyci5wYXRoID0gX3ByZXBlbmRQYXRoKGluZGV4LCBlcnIucGF0aCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIEFyYml0cmFyeSB2YWxpZGF0aW9uIGNoZWNrcy4gVGhlIGNvbmRpdGlvbiBjYW4gcmV0dXJuIGZhbHNlIG9yIHRocm93IGFcbiAgLy8gTWF0Y2guRXJyb3IgKGllLCBpdCBjYW4gaW50ZXJuYWxseSB1c2UgY2hlY2soKSkgdG8gZmFpbC5cbiAgaWYgKHBhdHRlcm4gaW5zdGFuY2VvZiBXaGVyZSkge1xuICAgIGlmIChwYXR0ZXJuLmNvbmRpdGlvbih2YWx1ZSkpXG4gICAgICByZXR1cm47XG4gICAgLy8gWFhYIHRoaXMgZXJyb3IgaXMgdGVycmlibGVcbiAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJGYWlsZWQgTWF0Y2guV2hlcmUgdmFsaWRhdGlvblwiKTtcbiAgfVxuXG5cbiAgaWYgKHBhdHRlcm4gaW5zdGFuY2VvZiBPcHRpb25hbClcbiAgICBwYXR0ZXJuID0gTWF0Y2guT25lT2YodW5kZWZpbmVkLCBwYXR0ZXJuLnBhdHRlcm4pO1xuXG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgT25lT2YpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhdHRlcm4uY2hvaWNlcy5sZW5ndGg7ICsraSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY2hlY2tTdWJ0cmVlKHZhbHVlLCBwYXR0ZXJuLmNob2ljZXNbaV0pO1xuICAgICAgICAvLyBObyBlcnJvcj8gWWF5LCByZXR1cm4uXG4gICAgICAgIHJldHVybjtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAvLyBPdGhlciBlcnJvcnMgc2hvdWxkIGJlIHRocm93bi4gTWF0Y2ggZXJyb3JzIGp1c3QgbWVhbiB0cnkgYW5vdGhlclxuICAgICAgICAvLyBjaG9pY2UuXG4gICAgICAgIGlmICghKGVyciBpbnN0YW5jZW9mIE1hdGNoLkVycm9yKSlcbiAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIFhYWCB0aGlzIGVycm9yIGlzIHRlcnJpYmxlXG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRmFpbGVkIE1hdGNoLk9uZU9mIG9yIE1hdGNoLk9wdGlvbmFsIHZhbGlkYXRpb25cIik7XG4gIH1cblxuICAvLyBBIGZ1bmN0aW9uIHRoYXQgaXNuJ3Qgc29tZXRoaW5nIHdlIHNwZWNpYWwtY2FzZSBpcyBhc3N1bWVkIHRvIGJlIGFcbiAgLy8gY29uc3RydWN0b3IuXG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBwYXR0ZXJuKVxuICAgICAgcmV0dXJuO1xuICAgIC8vIFhYWCB3aGF0IGlmIC5uYW1lIGlzbid0IGRlZmluZWRcbiAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJFeHBlY3RlZCBcIiArIHBhdHRlcm4uY29uc3RydWN0b3IubmFtZSk7XG4gIH1cblxuICB2YXIgdW5rbm93bktleXNBbGxvd2VkID0gZmFsc2U7XG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgT2JqZWN0SW5jbHVkaW5nKSB7XG4gICAgdW5rbm93bktleXNBbGxvd2VkID0gdHJ1ZTtcbiAgICBwYXR0ZXJuID0gcGF0dGVybi5wYXR0ZXJuO1xuICB9XG5cbiAgaWYgKHBhdHRlcm4gaW5zdGFuY2VvZiBPYmplY3RIYXNoKSB7XG4gICAgdmFyIGtleVBhdHRlcm4gPSBwYXR0ZXJuLnBhdHRlcm47XG4gICAgdmFyIGVtcHR5SGFzaCA9IHRydWU7XG4gICAgZm9yICh2YXIga2V5IGluIHZhbHVlKSB7XG4gICAgICBlbXB0eUhhc2ggPSBmYWxzZTtcbiAgICAgIGNoZWNrKHZhbHVlW2tleV0sIGtleVBhdHRlcm4pO1xuICAgIH1cbiAgICBpZiAoZW1wdHlIYXNoKVxuICAgICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgXCIgKyBwYXR0ZXJuLmNvbnN0cnVjdG9yLm5hbWUpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgU3ViY2xhc3MpIHtcbiAgICB2YXIgU3VwZXJjbGFzcyA9IHBhdHRlcm4uU3VwZXJjbGFzcztcbiAgICBpZiAocGF0dGVybi5tYXRjaFN1cGVyY2xhc3MgJiYgdmFsdWUgPT0gU3VwZXJjbGFzcykgXG4gICAgICByZXR1cm47XG4gICAgaWYgKCEgKHZhbHVlLnByb3RvdHlwZSBpbnN0YW5jZW9mIFN1cGVyY2xhc3MpKVxuICAgICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgXCIgKyBwYXR0ZXJuLmNvbnN0cnVjdG9yLm5hbWUgKyBcIiBvZiBcIiArIFN1cGVyY2xhc3MubmFtZSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBwYXR0ZXJuICE9PSBcIm9iamVjdFwiKVxuICAgIHRocm93IEVycm9yKFwiQmFkIHBhdHRlcm46IHVua25vd24gcGF0dGVybiB0eXBlXCIpO1xuXG4gIC8vIEFuIG9iamVjdCwgd2l0aCByZXF1aXJlZCBhbmQgb3B0aW9uYWwga2V5cy4gTm90ZSB0aGF0IHRoaXMgZG9lcyBOT1QgZG9cbiAgLy8gc3RydWN0dXJhbCBtYXRjaGVzIGFnYWluc3Qgb2JqZWN0cyBvZiBzcGVjaWFsIHR5cGVzIHRoYXQgaGFwcGVuIHRvIG1hdGNoXG4gIC8vIHRoZSBwYXR0ZXJuOiB0aGlzIHJlYWxseSBuZWVkcyB0byBiZSBhIHBsYWluIG9sZCB7T2JqZWN0fSFcbiAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ29iamVjdCcpXG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgb2JqZWN0LCBnb3QgXCIgKyB0eXBlb2YgdmFsdWUpO1xuICBpZiAodmFsdWUgPT09IG51bGwpXG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgb2JqZWN0LCBnb3QgbnVsbFwiKTtcblxuICB2YXIgcmVxdWlyZWRQYXR0ZXJucyA9IHt9O1xuICB2YXIgb3B0aW9uYWxQYXR0ZXJucyA9IHt9O1xuXG4gIF8uZWFjaEtleShwYXR0ZXJuLCBmdW5jdGlvbihzdWJQYXR0ZXJuLCBrZXkpIHtcbiAgICBpZiAocGF0dGVybltrZXldIGluc3RhbmNlb2YgT3B0aW9uYWwpXG4gICAgICBvcHRpb25hbFBhdHRlcm5zW2tleV0gPSBwYXR0ZXJuW2tleV0ucGF0dGVybjtcbiAgICBlbHNlXG4gICAgICByZXF1aXJlZFBhdHRlcm5zW2tleV0gPSBwYXR0ZXJuW2tleV07XG4gIH0sIHRoaXMsIHRydWUpO1xuXG4gIF8uZWFjaEtleSh2YWx1ZSwgZnVuY3Rpb24oc3ViVmFsdWUsIGtleSkge1xuICAgIHZhciBzdWJWYWx1ZSA9IHZhbHVlW2tleV07XG4gICAgdHJ5IHtcbiAgICAgIGlmIChyZXF1aXJlZFBhdHRlcm5zLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgY2hlY2tTdWJ0cmVlKHN1YlZhbHVlLCByZXF1aXJlZFBhdHRlcm5zW2tleV0pO1xuICAgICAgICBkZWxldGUgcmVxdWlyZWRQYXR0ZXJuc1trZXldO1xuICAgICAgfSBlbHNlIGlmIChvcHRpb25hbFBhdHRlcm5zLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgY2hlY2tTdWJ0cmVlKHN1YlZhbHVlLCBvcHRpb25hbFBhdHRlcm5zW2tleV0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKCF1bmtub3duS2V5c0FsbG93ZWQpXG4gICAgICAgICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiVW5rbm93biBrZXlcIik7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBpZiAoZXJyIGluc3RhbmNlb2YgTWF0Y2guRXJyb3IpXG4gICAgICAgIGVyci5wYXRoID0gX3ByZXBlbmRQYXRoKGtleSwgZXJyLnBhdGgpO1xuICAgICAgdGhyb3cgZXJyO1xuICAgIH1cbiAgfSwgdGhpcywgdHJ1ZSk7XG5cbiAgXy5lYWNoS2V5KHJlcXVpcmVkUGF0dGVybnMsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJNaXNzaW5nIGtleSAnXCIgKyBrZXkgKyBcIidcIik7XG4gIH0sIHRoaXMsIHRydWUpO1xufTtcblxuXG52YXIgX2pzS2V5d29yZHMgPSBbXCJkb1wiLCBcImlmXCIsIFwiaW5cIiwgXCJmb3JcIiwgXCJsZXRcIiwgXCJuZXdcIiwgXCJ0cnlcIiwgXCJ2YXJcIiwgXCJjYXNlXCIsXG4gIFwiZWxzZVwiLCBcImVudW1cIiwgXCJldmFsXCIsIFwiZmFsc2VcIiwgXCJudWxsXCIsIFwidGhpc1wiLCBcInRydWVcIiwgXCJ2b2lkXCIsIFwid2l0aFwiLFxuICBcImJyZWFrXCIsIFwiY2F0Y2hcIiwgXCJjbGFzc1wiLCBcImNvbnN0XCIsIFwic3VwZXJcIiwgXCJ0aHJvd1wiLCBcIndoaWxlXCIsIFwieWllbGRcIixcbiAgXCJkZWxldGVcIiwgXCJleHBvcnRcIiwgXCJpbXBvcnRcIiwgXCJwdWJsaWNcIiwgXCJyZXR1cm5cIiwgXCJzdGF0aWNcIiwgXCJzd2l0Y2hcIixcbiAgXCJ0eXBlb2ZcIiwgXCJkZWZhdWx0XCIsIFwiZXh0ZW5kc1wiLCBcImZpbmFsbHlcIiwgXCJwYWNrYWdlXCIsIFwicHJpdmF0ZVwiLCBcImNvbnRpbnVlXCIsXG4gIFwiZGVidWdnZXJcIiwgXCJmdW5jdGlvblwiLCBcImFyZ3VtZW50c1wiLCBcImludGVyZmFjZVwiLCBcInByb3RlY3RlZFwiLCBcImltcGxlbWVudHNcIixcbiAgXCJpbnN0YW5jZW9mXCJdO1xuXG4vLyBBc3N1bWVzIHRoZSBiYXNlIG9mIHBhdGggaXMgYWxyZWFkeSBlc2NhcGVkIHByb3Blcmx5XG4vLyByZXR1cm5zIGtleSArIGJhc2VcbmZ1bmN0aW9uIF9wcmVwZW5kUGF0aChrZXksIGJhc2UpIHtcbiAgaWYgKCh0eXBlb2Yga2V5KSA9PT0gXCJudW1iZXJcIiB8fCBrZXkubWF0Y2goL15bMC05XSskLykpXG4gICAga2V5ID0gXCJbXCIgKyBrZXkgKyBcIl1cIjtcbiAgZWxzZSBpZiAoIWtleS5tYXRjaCgvXlthLXpfJF1bMC05YS16XyRdKiQvaSkgfHwgX2pzS2V5d29yZHMuaW5kZXhPZihrZXkpICE9IC0xKVxuICAgIGtleSA9IEpTT04uc3RyaW5naWZ5KFtrZXldKTtcblxuICBpZiAoYmFzZSAmJiBiYXNlWzBdICE9PSBcIltcIilcbiAgICByZXR1cm4ga2V5ICsgJy4nICsgYmFzZTtcbiAgcmV0dXJuIGtleSArIGJhc2U7XG59O1xuXG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgnbW9sLXByb3RvJyk7XG5cblxuLy8gbW9kdWxlIGV4cG9ydHMgZXJyb3IgY2xhc3NlcyBmb3IgYWxsIG5hbWVzIGRlZmluZWQgaW4gdGhpcyBhcnJheVxudmFyIGVycm9yQ2xhc3NOYW1lcyA9IFsnQWJzdHJhY3RDbGFzcycsICdNaXhpbicsICdNZXNzZW5nZXInLCAnQ29tcG9uZW50RGF0YVNvdXJjZScsXG5cdFx0XHRcdFx0ICAgJ0F0dHJpYnV0ZScsICdCaW5kZXInLCAnTG9hZGVyJywgJ01haWxNZXNzYWdlU291cmNlJywgJ0ZhY2V0Jyxcblx0XHRcdFx0XHQgICAnU2NvcGUnXTtcblxudmFyIGVycm9yID0ge1xuXHR0b0JlSW1wbGVtZW50ZWQ6IHRvQmVJbXBsZW1lbnRlZCxcblx0Y3JlYXRlQ2xhc3M6IGNyZWF0ZUVycm9yQ2xhc3Ncbn07XG5cbmVycm9yQ2xhc3NOYW1lcy5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUpIHtcblx0ZXJyb3JbbmFtZV0gPSBjcmVhdGVFcnJvckNsYXNzKG5hbWUgKyAnRXJyb3InKTtcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGVycm9yO1xuXG5cbmZ1bmN0aW9uIGNyZWF0ZUVycm9yQ2xhc3MoZXJyb3JDbGFzc05hbWUpIHtcblx0dmFyIEVycm9yQ2xhc3M7XG5cdGV2YWwoJ0Vycm9yQ2xhc3MgPSBmdW5jdGlvbiAnICsgZXJyb3JDbGFzc05hbWUgKyAnKG1lc3NhZ2UpIHsgXFxcblx0XHRcdHRoaXMubmFtZSA9IFwiJyArIGVycm9yQ2xhc3NOYW1lICsgJ1wiOyBcXFxuXHRcdFx0dGhpcy5tZXNzYWdlID0gbWVzc2FnZSB8fCBcIlRoZXJlIHdhcyBhbiBlcnJvclwiOyBcXFxuXHRcdH0nKTtcblx0Xy5tYWtlU3ViY2xhc3MoRXJyb3JDbGFzcywgRXJyb3IpO1xuXG5cdHJldHVybiBFcnJvckNsYXNzO1xufVxuXG5cbmZ1bmN0aW9uIHRvQmVJbXBsZW1lbnRlZCgpIHtcblx0dGhyb3cgbmV3IGVycm9yLkFic3RyYWN0Q2xhc3MoJ2NhbGxpbmcgdGhlIG1ldGhvZCBvZiBhbiBhYnNjdHJhY3QgY2xhc3MgTWVzc2FnZVNvdXJjZScpO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbCA9IHtcblx0bG9nZ2VyOiByZXF1aXJlKCcuL2xvZ2dlcicpLFxuXHRyZXF1ZXN0OiByZXF1aXJlKCcuL3JlcXVlc3QnKSxcblx0Y2hlY2s6IHJlcXVpcmUoJy4vY2hlY2snKSxcblx0ZXJyb3I6IHJlcXVpcmUoJy4vZXJyb3InKVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSB1dGlsO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgTG9nZ2VyID0gcmVxdWlyZSgnLi9sb2dnZXJfY2xhc3MnKTtcblxudmFyIGxvZ2dlciA9IG5ldyBMb2dnZXIoeyBsZXZlbDogMyB9KTtcblxubW9kdWxlLmV4cG9ydHMgPSBsb2dnZXI7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgnbW9sLXByb3RvJyk7XG5cblxuLyoqXG4gKiBMb2cgbGV2ZWxzLlxuICovXG5cbnZhciBsZXZlbHMgPSBbXG4gICAgJ2Vycm9yJyxcbiAgICAnd2FybicsXG4gICAgJ2luZm8nLFxuICAgICdkZWJ1Zydcbl07XG5cbnZhciBtYXhMZXZlbExlbmd0aCA9IE1hdGgubWF4LmFwcGx5KE1hdGgsIGxldmVscy5tYXAoZnVuY3Rpb24obGV2ZWwpIHsgcmV0dXJuIGxldmVsLmxlbmd0aDsgfSkpO1xuXG4vKipcbiAqIENvbG9ycyBmb3IgbG9nIGxldmVscy5cbiAqL1xuXG52YXIgY29sb3JzID0gW1xuICAgIDMxLFxuICAgIDMzLFxuICAgIDM2LFxuICAgIDkwXG5dO1xuXG4vKipcbiAqIFBhZHMgdGhlIG5pY2Ugb3V0cHV0IHRvIHRoZSBsb25nZXN0IGxvZyBsZXZlbC5cbiAqL1xuXG5mdW5jdGlvbiBwYWQgKHN0cikge1xuICAgIGlmIChzdHIubGVuZ3RoIDwgbWF4TGV2ZWxMZW5ndGgpXG4gICAgICAgIHJldHVybiBzdHIgKyBuZXcgQXJyYXkobWF4TGV2ZWxMZW5ndGggLSBzdHIubGVuZ3RoICsgMSkuam9pbignICcpO1xuXG4gICAgcmV0dXJuIHN0cjtcbn07XG5cbi8qKlxuICogTG9nZ2VyIChjb25zb2xlKS5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbnZhciBMb2dnZXIgPSBmdW5jdGlvbiAob3B0cykge1xuICAgIG9wdHMgPSBvcHRzIHx8IHt9XG4gICAgdGhpcy5jb2xvcnMgPSBvcHRzLmNvbG9ycztcbiAgICB0aGlzLmxldmVsID0gb3B0cy5sZXZlbCB8fCAzO1xuICAgIHRoaXMuZW5hYmxlZCA9IG9wdHMuZW5hYmxlZCB8fCB0cnVlO1xuICAgIHRoaXMubG9nUHJlZml4ID0gb3B0cy5sb2dQcmVmaXggfHwgJyc7XG4gICAgdGhpcy5sb2dQcmVmaXhDb2xvciA9IG9wdHMubG9nUHJlZml4Q29sb3I7XG59O1xuXG5cbi8qKlxuICogTG9nIG1ldGhvZC5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkxvZ2dlci5wcm90b3R5cGUubG9nID0gZnVuY3Rpb24gKHR5cGUpIHtcbiAgICB2YXIgaW5kZXggPSBsZXZlbHMuaW5kZXhPZih0eXBlKTtcblxuICAgIGlmIChpbmRleCA+IHRoaXMubGV2ZWwgfHwgISB0aGlzLmVuYWJsZWQpXG4gICAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgY29uc29sZS5sb2cuYXBwbHkoXG4gICAgICAgICAgY29uc29sZVxuICAgICAgICAsIFt0aGlzLmxvZ1ByZWZpeENvbG9yXG4gICAgICAgICAgICAgPyAnICAgXFx4MUJbJyArIHRoaXMubG9nUHJlZml4Q29sb3IgKyAnbScgKyB0aGlzLmxvZ1ByZWZpeCArICcgIC1cXHgxQlszOW0nXG4gICAgICAgICAgICAgOiB0aGlzLmxvZ1ByZWZpeFxuICAgICAgICAgICx0aGlzLmNvbG9yc1xuICAgICAgICAgICAgID8gJyBcXHgxQlsnICsgY29sb3JzW2luZGV4XSArICdtJyArIHBhZCh0eXBlKSArICcgLVxceDFCWzM5bSdcbiAgICAgICAgICAgICA6IHR5cGUgKyAnOidcbiAgICAgICAgICBdLmNvbmNhdChfLnRvQXJyYXkoYXJndW1lbnRzKS5zbGljZSgxKSlcbiAgICApO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEdlbmVyYXRlIG1ldGhvZHMuXG4gKi9cblxubGV2ZWxzLmZvckVhY2goZnVuY3Rpb24gKG5hbWUpIHtcbiAgICBMb2dnZXIucHJvdG90eXBlW25hbWVdID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmxvZy5hcHBseSh0aGlzLCBbbmFtZV0uY29uY2F0KF8udG9BcnJheShhcmd1bWVudHMpKSk7XG4gICAgfTtcbn0pO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gTG9nZ2VyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVlc3Q7XG5cblxuLy8gVE9ETyBhZGQgZXJyb3Igc3RhdHVzZXNcbnZhciBva1N0YXR1c2VzID0gWycyMDAnLCAnMzA0J107XG5cblxuZnVuY3Rpb24gcmVxdWVzdCh1cmwsIG9wdHMsIGNhbGxiYWNrKSB7XG5cdHZhciByZXEgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblx0cmVxLm9wZW4ob3B0cy5tZXRob2QsIHVybCwgdHJ1ZSk7IC8vIHdoYXQgdHJ1ZSBtZWFucz9cblx0cmVxLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcblx0XHRpZiAocmVxLnJlYWR5U3RhdGUgPT0gNCAmJiByZXEuc3RhdHVzVGV4dC50b1VwcGVyQ2FzZSgpID09ICdPSycgKVxuXHRcdFx0Y2FsbGJhY2sobnVsbCwgcmVxLnJlc3BvbnNlVGV4dCwgcmVxKTtcblx0XHQvLyBlbHNlXG5cdFx0Ly8gXHRjYWxsYmFjayhyZXEuc3RhdHVzLCByZXEucmVzcG9uc2VUZXh0LCByZXEpO1xuXHR9O1xuXHRyZXEuc2VuZChudWxsKTtcbn1cblxuXy5leHRlbmQocmVxdWVzdCwge1xuXHRnZXQ6IGdldFxufSk7XG5cblxuZnVuY3Rpb24gZ2V0KHVybCwgY2FsbGJhY2spIHtcblx0cmVxdWVzdCh1cmwsIHsgbWV0aG9kOiAnR0VUJyB9LCBjYWxsYmFjayk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfO1xudmFyIHByb3RvID0gXyA9IHtcblx0ZXh0ZW5kUHJvdG86IGV4dGVuZFByb3RvLFxuXHRjcmVhdGVTdWJjbGFzczogY3JlYXRlU3ViY2xhc3MsXG5cdG1ha2VTdWJjbGFzczogbWFrZVN1YmNsYXNzLFxuXHRleHRlbmQ6IGV4dGVuZCxcblx0Y2xvbmU6IGNsb25lLFxuXHRkZWVwRXh0ZW5kOiBkZWVwRXh0ZW5kLFxuXHRhbGxLZXlzOiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcy5iaW5kKE9iamVjdCksXG5cdGtleU9mOiBrZXlPZixcblx0YWxsS2V5c09mOiBhbGxLZXlzT2YsXG5cdGVhY2hLZXk6IGVhY2hLZXksXG5cdG1hcEtleXM6IG1hcEtleXMsXG5cdGFwcGVuZEFycmF5OiBhcHBlbmRBcnJheSxcblx0cHJlcGVuZEFycmF5OiBwcmVwZW5kQXJyYXksXG5cdHRvQXJyYXk6IHRvQXJyYXksXG5cdGZpcnN0VXBwZXJDYXNlOiBmaXJzdFVwcGVyQ2FzZSxcblx0Zmlyc3RMb3dlckNhc2U6IGZpcnN0TG93ZXJDYXNlXG59O1xuXG5cbmlmICh0eXBlb2Ygd2luZG93ID09ICdvYmplY3QnKSB7XG5cdC8vIHByZXNlcnZlIGV4aXN0aW5nIF8gb2JqZWN0XG5cdGlmICh3aW5kb3cuXylcblx0XHRwcm90by51bmRlcnNjb3JlID0gd2luZG93Ll9cblxuXHQvLyBleHBvc2UgZ2xvYmFsIF9cblx0d2luZG93Ll8gPSBwcm90bztcbn1cblxuaWYgKHR5cGVvZiBtb2R1bGUgPT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpXG5cdC8vIGV4cG9ydCBmb3Igbm9kZS9icm93c2VyaWZ5XG5cdG1vZHVsZS5leHBvcnRzID0gcHJvdG87XG5cdFxuXG5mdW5jdGlvbiBleHRlbmRQcm90byhzZWxmLCBtZXRob2RzKSB7XG5cdHZhciBwcm9wRGVzY3JpcHRvcnMgPSB7fTtcblxuXHRfLmVhY2hLZXkobWV0aG9kcywgZnVuY3Rpb24obWV0aG9kLCBuYW1lKSB7XG5cdFx0cHJvcERlc2NyaXB0b3JzW25hbWVdID0ge1xuXHRcdFx0ZW51bWVyYWJsZTogZmFsc2UsXG5cdFx0XHRjb25maWd1cmFibGU6IGZhbHNlLFxuXHRcdFx0d3JpdGFibGU6IGZhbHNlLFxuXHRcdFx0dmFsdWU6IG1ldGhvZFxuXHRcdH07XG5cdH0pO1xuXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHNlbGYucHJvdG90eXBlLCBwcm9wRGVzY3JpcHRvcnMpO1xuXHRyZXR1cm4gc2VsZjtcbn1cblxuXG5mdW5jdGlvbiBleHRlbmQoc2VsZiwgb2JqLCBvbmx5RW51bWVyYWJsZSkge1xuXHR2YXIgcHJvcERlc2NyaXB0b3JzID0ge307XG5cblx0Xy5lYWNoS2V5KG9iaiwgZnVuY3Rpb24odmFsdWUsIHByb3ApIHtcblx0XHR2YXIgZGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Iob2JqLCBwcm9wKTtcblx0XHRwcm9wRGVzY3JpcHRvcnNbcHJvcF0gPSBkZXNjcmlwdG9yO1xuXHR9LCB0aGlzLCBvbmx5RW51bWVyYWJsZSk7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnRpZXMoc2VsZiwgcHJvcERlc2NyaXB0b3JzKTtcblxuXHRyZXR1cm4gc2VsZjtcbn1cblxuXG5mdW5jdGlvbiBkZWVwRXh0ZW5kKHNlbGYsIG9iaiwgb25seUVudW1lcmFibGUpIHtcblx0cmV0dXJuIF9leHRlbmRUcmVlKHNlbGYsIG9iaiwgb25seUVudW1lcmFibGUsIFtdKTtcbn1cblxuXG5mdW5jdGlvbiBfZXh0ZW5kVHJlZShzZWxmTm9kZSwgb2JqTm9kZSwgb25seUVudW1lcmFibGUsIG9ialRyYXZlcnNlZCkge1xuXHRpZiAob2JqVHJhdmVyc2VkLmluZGV4T2Yob2JqTm9kZSkgPj0gMCkgcmV0dXJuOyAvLyBub2RlIGFscmVhZHkgdHJhdmVyc2VkXG5cdG9ialRyYXZlcnNlZC5wdXNoKG9iak5vZGUpO1xuXG5cdF8uZWFjaEtleShvYmpOb2RlLCBmdW5jdGlvbih2YWx1ZSwgcHJvcCkge1xuXHRcdHZhciBkZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmpOb2RlLCBwcm9wKTtcblx0XHRpZiAodHlwZW9mIHZhbHVlID09ICdvYmplY3QnKSB7XG5cdFx0XHRpZiAoc2VsZk5vZGUuaGFzT3duUHJvcGVydHkocHJvcCkgJiYgdHlwZW9mIHNlbGZOb2RlW3Byb3BdID09ICdvYmplY3QnKVxuXHRcdFx0XHRfZXh0ZW5kVHJlZShzZWxmTm9kZVtwcm9wXSwgdmFsdWUsIG9ubHlFbnVtZXJhYmxlLCBvYmpUcmF2ZXJzZWQpXG5cdFx0XHRlbHNlXG5cdFx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShzZWxmTm9kZSwgcHJvcCwgZGVzY3JpcHRvcik7XG5cdFx0fSBlbHNlXG5cdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoc2VsZk5vZGUsIHByb3AsIGRlc2NyaXB0b3IpO1xuXHR9LCB0aGlzLCBvbmx5RW51bWVyYWJsZSk7XG5cblx0cmV0dXJuIHNlbGZOb2RlO1xufVxuXG5cbmZ1bmN0aW9uIGNsb25lKG9iaikge1xuXHR2YXIgY2xvbmVkT2JqZWN0ID0gT2JqZWN0LmNyZWF0ZShvYmouY29uc3RydWN0b3IucHJvdG90eXBlKTtcblx0Xy5leHRlbmQoY2xvbmVkT2JqZWN0LCBvYmopO1xuXHRyZXR1cm4gY2xvbmVkT2JqZWN0O1xufVxuXG5cbmZ1bmN0aW9uIGNyZWF0ZVN1YmNsYXNzKHRoaXNDbGFzcywgbmFtZSwgYXBwbHlDb25zdHJ1Y3Rvcikge1xuXHR2YXIgc3ViY2xhc3M7XG5cblx0Ly8gbmFtZSBpcyBvcHRpb25hbFxuXHRuYW1lID0gbmFtZSB8fCAnJztcblxuXHQvLyBhcHBseSBzdXBlcmNsYXNzIGNvbnN0cnVjdG9yXG5cdHZhciBjb25zdHJ1Y3RvckNvZGUgPSBhcHBseUNvbnN0cnVjdG9yID09PSBmYWxzZVxuXHRcdFx0PyAnJ1xuXHRcdFx0OiAndGhpc0NsYXNzLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7JztcblxuXHRldmFsKCdzdWJjbGFzcyA9IGZ1bmN0aW9uICcgKyBuYW1lICsgJygpeyAnICsgY29uc3RydWN0b3JDb2RlICsgJyB9Jyk7XG5cblx0Xy5tYWtlU3ViY2xhc3Moc3ViY2xhc3MsIHRoaXNDbGFzcyk7XG5cblx0Ly8gY29weSBjbGFzcyBtZXRob2RzXG5cdC8vIC0gZm9yIHRoZW0gdG8gd29yayBjb3JyZWN0bHkgdGhleSBzaG91bGQgbm90IGV4cGxpY3RseSB1c2Ugc3VwZXJjbGFzcyBuYW1lXG5cdC8vIGFuZCB1c2UgXCJ0aGlzXCIgaW5zdGVhZFxuXHRfLmV4dGVuZChzdWJjbGFzcywgdGhpc0NsYXNzLCB0cnVlKTtcblxuXHRyZXR1cm4gc3ViY2xhc3M7XG59XG5cblxuZnVuY3Rpb24gbWFrZVN1YmNsYXNzKHRoaXNDbGFzcywgU3VwZXJjbGFzcykge1xuXHQvLyBwcm90b3R5cGUgY2hhaW5cblx0dGhpc0NsYXNzLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoU3VwZXJjbGFzcy5wcm90b3R5cGUpO1xuXHRcblx0Ly8gc3ViY2xhc3MgaWRlbnRpdHlcblx0Xy5leHRlbmRQcm90byh0aGlzQ2xhc3MsIHtcblx0XHRjb25zdHJ1Y3RvcjogdGhpc0NsYXNzXG5cdH0pO1xuXHRyZXR1cm4gdGhpc0NsYXNzO1xufVxuXG5cbmZ1bmN0aW9uIGtleU9mKHNlbGYsIHNlYXJjaEVsZW1lbnQsIG9ubHlFbnVtZXJhYmxlKSB7XG5cdHZhciBwcm9wZXJ0aWVzID0gb25seUVudW1lcmFibGUgXG5cdFx0XHRcdFx0XHQ/IE9iamVjdC5rZXlzKHNlbGYpXG5cdFx0XHRcdFx0XHQ6IF8uYWxsS2V5cyhzZWxmKTtcblxuXHRmb3IgKHZhciBpID0gMDsgaSA8IHByb3BlcnRpZXMubGVuZ3RoOyBpKyspXG5cdFx0aWYgKHNlYXJjaEVsZW1lbnQgPT09IHNlbGZbcHJvcGVydGllc1tpXV0pXG5cdFx0XHRyZXR1cm4gcHJvcGVydGllc1tpXTtcblx0XG5cdHJldHVybiB1bmRlZmluZWQ7XG59XG5cblxuZnVuY3Rpb24gYWxsS2V5c09mKHNlbGYsIHNlYXJjaEVsZW1lbnQsIG9ubHlFbnVtZXJhYmxlKSB7XG5cdHZhciBwcm9wZXJ0aWVzID0gb25seUVudW1lcmFibGUgXG5cdFx0XHRcdFx0XHQ/IE9iamVjdC5rZXlzKHNlbGYpXG5cdFx0XHRcdFx0XHQ6IF8uYWxsS2V5cyhzZWxmKTtcblxuXHR2YXIga2V5cyA9IHByb3BlcnRpZXMuZmlsdGVyKGZ1bmN0aW9uKHByb3ApIHtcblx0XHRyZXR1cm4gc2VhcmNoRWxlbWVudCA9PT0gc2VsZltwcm9wXTtcblx0fSk7XG5cblx0cmV0dXJuIGtleXM7XG59XG5cblxuZnVuY3Rpb24gZWFjaEtleShzZWxmLCBjYWxsYmFjaywgdGhpc0FyZywgb25seUVudW1lcmFibGUpIHtcblx0dmFyIHByb3BlcnRpZXMgPSBvbmx5RW51bWVyYWJsZSBcblx0XHRcdFx0XHRcdD8gT2JqZWN0LmtleXMoc2VsZilcblx0XHRcdFx0XHRcdDogXy5hbGxLZXlzKHNlbGYpO1xuXG5cdHByb3BlcnRpZXMuZm9yRWFjaChmdW5jdGlvbihwcm9wKSB7XG5cdFx0Y2FsbGJhY2suY2FsbCh0aGlzQXJnLCBzZWxmW3Byb3BdLCBwcm9wLCBzZWxmKTtcblx0fSk7XG59XG5cblxuZnVuY3Rpb24gbWFwS2V5cyhzZWxmLCBjYWxsYmFjaywgdGhpc0FyZywgb25seUVudW1lcmFibGUpIHtcblx0dmFyIG1hcFJlc3VsdCA9IHt9O1xuXHRfLmVhY2hLZXkoc2VsZiwgbWFwUHJvcGVydHksIHRoaXNBcmcsIG9ubHlFbnVtZXJhYmxlKTtcblx0cmV0dXJuIG1hcFJlc3VsdDtcblxuXHRmdW5jdGlvbiBtYXBQcm9wZXJ0eSh2YWx1ZSwga2V5KSB7XG5cdFx0dmFyIGRlc2NyaXB0b3IgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHNlbGYsIGtleSk7XG5cdFx0aWYgKGRlc2NyaXB0b3IuZW51bWVyYWJsZSB8fCAhIG9ubHlFbnVtZXJhYmxlKSB7XG5cdFx0XHRkZXNjcmlwdG9yLnZhbHVlID0gY2FsbGJhY2suY2FsbCh0aGlzLCB2YWx1ZSwga2V5LCBzZWxmKTtcblx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShtYXBSZXN1bHQsIGtleSwgZGVzY3JpcHRvcik7XG5cdFx0fVxuXHR9XG59XG5cblxuZnVuY3Rpb24gYXBwZW5kQXJyYXkoc2VsZiwgYXJyYXlUb0FwcGVuZCkge1xuXHRpZiAoISBhcnJheVRvQXBwZW5kLmxlbmd0aCkgcmV0dXJuIHNlbGY7XG5cbiAgICB2YXIgYXJncyA9IFtzZWxmLmxlbmd0aCwgMF0uY29uY2F0KGFycmF5VG9BcHBlbmQpO1xuICAgIEFycmF5LnByb3RvdHlwZS5zcGxpY2UuYXBwbHkoc2VsZiwgYXJncyk7XG5cbiAgICByZXR1cm4gc2VsZjtcbn1cblxuXG5mdW5jdGlvbiBwcmVwZW5kQXJyYXkoc2VsZiwgYXJyYXlUb1ByZXBlbmQpIHtcblx0aWYgKCEgYXJyYXlUb1ByZXBlbmQubGVuZ3RoKSByZXR1cm4gc2VsZjtcblxuICAgIHZhciBhcmdzID0gWzAsIDBdLmNvbmNhdChhcnJheVRvUHJlcGVuZCk7XG4gICAgQXJyYXkucHJvdG90eXBlLnNwbGljZS5hcHBseShzZWxmLCBhcmdzKTtcblxuICAgIHJldHVybiBzZWxmO1xufVxuXG5cbmZ1bmN0aW9uIHRvQXJyYXkoYXJyYXlMaWtlKSB7XG5cdHZhciBhcnIgPSBbXTtcblx0QXJyYXkucHJvdG90eXBlLmZvckVhY2guY2FsbChhcnJheUxpa2UsIGZ1bmN0aW9uKGl0ZW0pIHtcblx0XHRhcnIucHVzaChpdGVtKVxuXHR9KTtcblxuXHRyZXR1cm4gYXJyO1xufVxuXG5cbmZ1bmN0aW9uIGZpcnN0VXBwZXJDYXNlKHN0cikge1xuXHRyZXR1cm4gc3RyWzBdLnRvVXBwZXJDYXNlKCkgKyBzdHIuc2xpY2UoMSk7XG59XG5cblxuZnVuY3Rpb24gZmlyc3RMb3dlckNhc2Uoc3RyKSB7XG5cdHJldHVybiBzdHJbMF0udG9Mb3dlckNhc2UoKSArIHN0ci5zbGljZSgxKTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuZGVzY3JpYmUoJ21pbG8gYmluZGVyJywgZnVuY3Rpb24oKSB7XG4gICAgaXQoJ3Nob3VsZCBiaW5kIGNvbXBvbmVudHMgYmFzZWQgb24gbWwtYmluZCBhdHRyaWJ1dGUnLCBmdW5jdGlvbigpIHtcbiAgICBcdHZhciBtaWxvID0gcmVxdWlyZSgnLi4vLi4vbGliL21pbG8nKTtcblxuXHRcdGV4cGVjdCh7cDogMX0pLnByb3BlcnR5KCdwJywgMSk7XG5cbiAgICBcdHZhciBjdHJsID0gbWlsby5iaW5kZXIoKTtcblxuICAgICAgICBjb25zb2xlLmxvZyhjdHJsKTtcblxuICAgIFx0Y3RybC5hcnRpY2xlQnV0dG9uLmV2ZW50cy5vbignY2xpY2sgbW91c2VlbnRlcicsIGZ1bmN0aW9uKGVUeXBlLCBldnQpIHtcbiAgICBcdFx0Y29uc29sZS5sb2coJ2J1dHRvbicsIGVUeXBlLCBldnQpO1xuICAgIFx0fSk7XG5cbiAgICAgICAgY3RybC5tYWluLmV2ZW50cy5vbignY2xpY2sgbW91c2VlbnRlciBpbnB1dCBrZXlwcmVzcycsIGZ1bmN0aW9uKGVUeXBlLCBldnQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdkaXYnLCBlVHlwZSwgZXZ0KTtcbiAgICAgICAgfSk7XG5cbiAgICBcdGN0cmwuYXJ0aWNsZUlkSW5wdXQuZGF0YS5vbignZGF0YWNoYW5nZWQnLCBsb2dEYXRhKTtcblxuICAgIFx0ZnVuY3Rpb24gbG9nRGF0YShtZXNzYWdlLCBkYXRhKSB7XG4gICAgXHRcdGNvbnNvbGUubG9nKG1lc3NhZ2UsIGRhdGEpO1xuICAgIFx0fVxuXG4gICAgICAgIHZhciBteVRtcGxDb21wcyA9IGN0cmwubXlUZW1wbGF0ZS50ZW1wbGF0ZVxuICAgICAgICAgICAgICAgIC5zZXQoJzxwIG1sLWJpbmQ9XCI6aW5uZXJQYXJhXCI+SSBhbSByZW5kZXJlZCBmcm9tIHRlbXBsYXRlPC9wPicpXG4gICAgICAgICAgICAgICAgLnJlbmRlcigpXG4gICAgICAgICAgICAgICAgLmJpbmRlcigpO1xuXG4gICAgICAgIF8uZXh0ZW5kKGN0cmwsIG15VG1wbENvbXBzKTsgLy8gc2hvdWxkIGJlIHNvbWUgZnVuY3Rpb24gdG8gYWRkIHRvIGNvbnRyb2xsZXJcblxuICAgICAgICB2YXIgaW5uZXJQYXJhID0gY3RybC5teVRlbXBsYXRlLmNvbnRhaW5lci5zY29wZS5pbm5lclBhcmE7XG4gICAgICAgIGlubmVyUGFyYS5lbC5pbm5lckhUTUwgKz0gJywgdGhlbiBib3VuZCBhbmQgY2hhbmdlZCB2aWEgY29tcG9uZW50IGluc2lkZSB0ZW1wbGF0ZSc7XG4gICAgfSk7XG59KTtcbiJdfQ==
;