;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var _ = require('mol-proto')
	, check = require('../check')
	, Match = check.Match
	, BindError = require('./error');

// Matches;
// :myView - only component name
// View:myView - class and component name
// [Events, Data]:myView - facets and component name
// View[Events]:myView - class, facet(s) and component name
var attrRegExp= /^([^\:\[\]]*)(?:\[([^\:\[\]]*)\])?\:?([^:]*)$/
	, facetsSplitRegExp = /\s*(?:\,|\s)\s*/;


module.exports = Attribute;

function Attribute(el, name) {
	this.name = name;
	this.el = el;
	this.node = el.attributes[name];
}

_.extendProto(Attribute, {
	get: getAttributeValue,
	set: setAttributeValue,
	parse: parseAttribute,
	validate: validateAttribute
});


function getAttributeValue() {
	return this.el.getAttribute(this.name);
}

function setAttributeValue(value) {
	this.el.setAttribute(this.name, value);
}

function parseAttribute() {
	if (! this.node) return;

	var value = this.get();

	if (value)
		var bindTo = value.match(attrRegExp);

	if (! bindTo)
		throw new BindError('invalid bind attribute ' + value);

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
		throw new BindError('empty component class name ' + this.compClass);

	return this;
}

},{"../check":4,"./error":2,"mol-proto":26}],2:[function(require,module,exports){
'use strict';

var _ = require('mol-proto');

function BindError(msg) {
	this.message = msg;
}

_.makeSubclass(BindError, Error);

module.exports = BindError;

},{"mol-proto":26}],3:[function(require,module,exports){
'use strict';

var componentsRegistry = require('../components/c_registry')
	, Component = componentsRegistry.get('Component')
	, Attribute = require('./attribute')
	, BindError = require('./error')
	, _ = require('mol-proto')
	, check = require('../check')
	, Match =  check.Match;


var opts = {
	BIND_ATTR: 'ml-bind'
}

module.exports = binder;

function binder(scopeEl, bindScopeEl) {
	var scopeEl = scopeEl || document.body
		, components = {};

	// iterate children of scopeEl
	Array.prototype.forEach.call(scopeEl.children, bindElement);

	return components;

	function bindElement(el){
		var attr = new Attribute(el, opts.BIND_ATTR);

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
				throw new BindError('class ' + attr.compClass + ' is not registered');

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
			throw new BindError('duplicate component name: ' + name);

		components[name] = aComponent;
	}
}


binder.config = function(options) {
	opts.extend(options);
};

},{"../check":4,"../components/c_registry":14,"./attribute":1,"./error":2,"mol-proto":26}],4:[function(require,module,exports){
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


},{"mol-proto":26}],5:[function(require,module,exports){
'use strict';

var FacetedObject = require('../facets/f_object')
	, facetsRegistry = require('./c_facets/cf_registry')
	, ComponentFacet = require('./c_facet')
	, Messenger = require('../messenger')
	, _ = require('mol-proto')
	, check = require('../check')
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

},{"../check":4,"../facets/f_object":18,"../messenger":21,"./c_facet":6,"./c_facets/cf_registry":10,"mol-proto":26}],6:[function(require,module,exports){
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

},{"../facets/f_class":17,"../messenger":21,"mol-proto":26}],7:[function(require,module,exports){
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

},{"../../binder":3,"../c_facet":6,"./cf_registry":10,"mol-proto":26}],8:[function(require,module,exports){
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

},{"../../messenger":21,"../c_facet":6,"../c_message_sources/component_data_source":11,"./cf_registry":10,"mol-proto":26}],9:[function(require,module,exports){
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

},{"../../messenger":21,"../c_facet":6,"../c_message_sources/dom_events_source":13,"./cf_registry":10,"mol-proto":26}],10:[function(require,module,exports){
'use strict';

var ClassRegistry = require('../../registry')
	, ComponentFacet = require('../c_facet');

var facetsRegistry = new ClassRegistry(ComponentFacet);

facetsRegistry.add(ComponentFacet);

module.exports = facetsRegistry;

// TODO - refactor components registry test into a function
// that tests a registry with a given foundation class
// Make test for this registry based on this function
},{"../../registry":25,"../c_facet":6}],11:[function(require,module,exports){
'use strict';

var DOMEventsSource = require('./dom_events_source')
	, Component = require('../c_class')
	, ComponentDataSourceError = require('../../error').ComponentDataSource
	, _ = require('mol-proto')
	, check = require('../../check')
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
 	value: getDomElementData,
 	handleEvent: handleEvent,  // event dispatcher - as defined by Event DOM API
 	trigger: triggerDataMessage // redefines method of superclass DOMEventsSource
});

module.exports = ComponentDataSource;


function initComponentDataSource() {
	DOMEventsSource.prototype.init.apply(this, arguments);

	this.value(); // stores current component data value in this._value
}


// TODO: should return value dependent on element tag
function getDomElementData() { // value method
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

},{"../../check":4,"../../error":16,"../c_class":5,"./dom_events_source":13,"mol-proto":26}],12:[function(require,module,exports){
'use strict';

var _ = require('mol-proto');


// https://developer.mozilla.org/en-US/docs/Web/Reference/Events

var eventTypes = {
	ClipboardEvent: ['copy', 'cut', 'paste', 'beforecopy', 'beforecut', 'beforepaste'],
	Event: ['input'],
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

},{"mol-proto":26}],13:[function(require,module,exports){
'use strict';

var MessageSource = require('../../messenger/message_source')
	, Component = require('../c_class')
	, domEventsConstructors = require('./dom_events_constructors') // TODO merge with DOMEventSource ??
	, _ = require('mol-proto')
	, check = require('../../check')
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
	return true;
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
},{"../../check":4,"../../messenger/message_source":22,"../c_class":5,"./dom_events_constructors":12,"mol-proto":26}],14:[function(require,module,exports){
'use strict';

var ClassRegistry = require('../registry')
	, Component = require('./c_class');

var componentsRegistry = new ClassRegistry(Component);

componentsRegistry.add(Component);

module.exports = componentsRegistry;

},{"../registry":25,"./c_class":5}],15:[function(require,module,exports){
'use strict';

var Component = require('../c_class')
	, componentsRegistry = require('../c_registry');


var View = Component.createComponentClass('View', ['container']);

componentsRegistry.add(View);

module.exports = View;

},{"../c_class":5,"../c_registry":14}],16:[function(require,module,exports){
'use strict';

var _ = require('mol-proto');


// module exports error classes for all names defined in this array
var errorClassNames = ['AbstractClass', 'Mixin', 'Messenger', 'ComponentDataSource']
	, errorClasses = {};

errorClassNames.forEach(function(name) {
	errorClasses[name] = createErrorClass(name + 'Error');
});

module.exports = errorClasses;


function createErrorClass(errorClassName) {
	var ErrorClass;
	eval('ErrorClass = function ' + errorClassName + '(message) { \
			this.name = "' + errorClassName + '"; \
			this.message = message || "There was an error"; \
		}');
	_.makeSubclass(ErrorClass, Error);

	return ErrorClass;
}

},{"mol-proto":26}],17:[function(require,module,exports){
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

},{"mol-proto":26}],18:[function(require,module,exports){
'use strict';

var Facet = require('./f_class')
	, _ = require('mol-proto')
	, check = require('../check')
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


},{"../check":4,"./f_class":17,"mol-proto":26}],19:[function(require,module,exports){
'use strict';

var Logger = require('./logger_class');

var logger = new Logger({ level: 3 });

module.exports = logger;

},{"./logger_class":20}],20:[function(require,module,exports){
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
    this.colors = false !== opts.colors;
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

},{"mol-proto":26}],21:[function(require,module,exports){
'use strict';

var Mixin = require('../mixin')
	, MessageSource = require('./message_source')
	, _ = require('mol-proto')
	, check = require('../check')
	, Match = check.Match
	, MessengerError = require('../error').Messenger;


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

},{"../check":4,"../error":16,"../mixin":24,"./message_source":22,"mol-proto":26}],22:[function(require,module,exports){
'use strict';

var Mixin = require('../mixin')
	, logger = require('../logger')
	, AbsctractClassError = require('../error').AbsctractClass
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


function toBeImplemented() {
	throw new AbsctractClassError('calling the method of an absctract class MessageSource');
}

},{"../error":16,"../logger":19,"../mixin":24,"mol-proto":26}],23:[function(require,module,exports){
'use strict';

var milo = {
	binder: require('./binder')
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

},{"./binder":3,"./components/c_facets/Container":7,"./components/c_facets/Data":8,"./components/c_facets/Events":9,"./components/classes/View":15}],24:[function(require,module,exports){
'use strict';

var _ = require('mol-proto')
	, check = require('./check')
	, Match = check.Match
	, MixinError = require('./error').Mixin;


module.exports = Mixin;

// an abstract class for mixin pattern - adding proxy methods to host objects
function Mixin(hostObject, proxyMethods /*, other args - passed to init method */) {
	// TODO - moce checks from Messenger here
	check(hostObject, Object);
	check(proxyMethods, Match.ObjectHash(String));

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

},{"./check":4,"./error":16,"mol-proto":26}],25:[function(require,module,exports){
'use strict';

var _ = require('mol-proto')
	, check = require('./check')
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

},{"./check":4,"mol-proto":26}],26:[function(require,module,exports){
'use strict';

var _;
var proto = _ = {
	extendProto: extendProto,
	extend: extend,
	clone: clone,
	createSubclass: createSubclass,
	makeSubclass: makeSubclass,
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

	// pprototype chain
	subclass.prototype = Object.create(thisClass.prototype);
	
	// subclass identity
	_.extendProto(subclass, {
		constructor: subclass
	});

	// copy class methods
	// - for them to work correctly they should not explictly use superclass name
	// and use "this" instead
	_.extend(subclass, thisClass, true);

	return subclass;
}


function makeSubclass(thisClass, Superclass) {
	thisClass.prototype = Object.create(Superclass.prototype);
	thisClass.prototype.constructor = thisClass;
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

},{}],27:[function(require,module,exports){
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

},{"../../lib/milo":23}]},{},[27])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2JpbmRlci9hdHRyaWJ1dGUuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2JpbmRlci9lcnJvci5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvYmluZGVyL2luZGV4LmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jaGVjay5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX2NsYXNzLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfZmFjZXQuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19mYWNldHMvQ29udGFpbmVyLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfZmFjZXRzL0RhdGEuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19mYWNldHMvRXZlbnRzLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfZmFjZXRzL2NmX3JlZ2lzdHJ5LmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfbWVzc2FnZV9zb3VyY2VzL2NvbXBvbmVudF9kYXRhX3NvdXJjZS5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX21lc3NhZ2Vfc291cmNlcy9kb21fZXZlbnRzX2NvbnN0cnVjdG9ycy5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX21lc3NhZ2Vfc291cmNlcy9kb21fZXZlbnRzX3NvdXJjZS5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX3JlZ2lzdHJ5LmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NsYXNzZXMvVmlldy5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvZXJyb3IuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2ZhY2V0cy9mX2NsYXNzLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9mYWNldHMvZl9vYmplY3QuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2xvZ2dlci5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvbG9nZ2VyX2NsYXNzLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9tZXNzZW5nZXIvaW5kZXguanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL21lc3Nlbmdlci9tZXNzYWdlX3NvdXJjZS5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvbWlsby5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvbWl4aW4uanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL3JlZ2lzdHJ5LmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL25vZGVfbW9kdWxlcy9tb2wtcHJvdG8vbGliL3Byb3RvLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL3Rlc3RfaHRtbC9iaW5kX3Rlc3QvYmluZF90ZXN0LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25QQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vY2hlY2snKVxuXHQsIE1hdGNoID0gY2hlY2suTWF0Y2hcblx0LCBCaW5kRXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yJyk7XG5cbi8vIE1hdGNoZXM7XG4vLyA6bXlWaWV3IC0gb25seSBjb21wb25lbnQgbmFtZVxuLy8gVmlldzpteVZpZXcgLSBjbGFzcyBhbmQgY29tcG9uZW50IG5hbWVcbi8vIFtFdmVudHMsIERhdGFdOm15VmlldyAtIGZhY2V0cyBhbmQgY29tcG9uZW50IG5hbWVcbi8vIFZpZXdbRXZlbnRzXTpteVZpZXcgLSBjbGFzcywgZmFjZXQocykgYW5kIGNvbXBvbmVudCBuYW1lXG52YXIgYXR0clJlZ0V4cD0gL14oW15cXDpcXFtcXF1dKikoPzpcXFsoW15cXDpcXFtcXF1dKilcXF0pP1xcOj8oW146XSopJC9cblx0LCBmYWNldHNTcGxpdFJlZ0V4cCA9IC9cXHMqKD86XFwsfFxccylcXHMqLztcblxuXG5tb2R1bGUuZXhwb3J0cyA9IEF0dHJpYnV0ZTtcblxuZnVuY3Rpb24gQXR0cmlidXRlKGVsLCBuYW1lKSB7XG5cdHRoaXMubmFtZSA9IG5hbWU7XG5cdHRoaXMuZWwgPSBlbDtcblx0dGhpcy5ub2RlID0gZWwuYXR0cmlidXRlc1tuYW1lXTtcbn1cblxuXy5leHRlbmRQcm90byhBdHRyaWJ1dGUsIHtcblx0Z2V0OiBnZXRBdHRyaWJ1dGVWYWx1ZSxcblx0c2V0OiBzZXRBdHRyaWJ1dGVWYWx1ZSxcblx0cGFyc2U6IHBhcnNlQXR0cmlidXRlLFxuXHR2YWxpZGF0ZTogdmFsaWRhdGVBdHRyaWJ1dGVcbn0pO1xuXG5cbmZ1bmN0aW9uIGdldEF0dHJpYnV0ZVZhbHVlKCkge1xuXHRyZXR1cm4gdGhpcy5lbC5nZXRBdHRyaWJ1dGUodGhpcy5uYW1lKTtcbn1cblxuZnVuY3Rpb24gc2V0QXR0cmlidXRlVmFsdWUodmFsdWUpIHtcblx0dGhpcy5lbC5zZXRBdHRyaWJ1dGUodGhpcy5uYW1lLCB2YWx1ZSk7XG59XG5cbmZ1bmN0aW9uIHBhcnNlQXR0cmlidXRlKCkge1xuXHRpZiAoISB0aGlzLm5vZGUpIHJldHVybjtcblxuXHR2YXIgdmFsdWUgPSB0aGlzLmdldCgpO1xuXG5cdGlmICh2YWx1ZSlcblx0XHR2YXIgYmluZFRvID0gdmFsdWUubWF0Y2goYXR0clJlZ0V4cCk7XG5cblx0aWYgKCEgYmluZFRvKVxuXHRcdHRocm93IG5ldyBCaW5kRXJyb3IoJ2ludmFsaWQgYmluZCBhdHRyaWJ1dGUgJyArIHZhbHVlKTtcblxuXHR0aGlzLmNvbXBDbGFzcyA9IGJpbmRUb1sxXSB8fCAnQ29tcG9uZW50Jztcblx0dGhpcy5jb21wRmFjZXRzID0gKGJpbmRUb1syXSAmJiBiaW5kVG9bMl0uc3BsaXQoZmFjZXRzU3BsaXRSZWdFeHApKSB8fCB1bmRlZmluZWQ7XG5cdHRoaXMuY29tcE5hbWUgPSBiaW5kVG9bM10gfHwgdW5kZWZpbmVkO1xuXG5cdHJldHVybiB0aGlzO1xufVxuXG5mdW5jdGlvbiB2YWxpZGF0ZUF0dHJpYnV0ZSgpIHtcblx0dmFyIGNvbXBOYW1lID0gdGhpcy5jb21wTmFtZTtcblx0Y2hlY2soY29tcE5hbWUsIE1hdGNoLldoZXJlKGZ1bmN0aW9uKCkge1xuICBcdFx0cmV0dXJuIHR5cGVvZiBjb21wTmFtZSA9PSAnc3RyaW5nJyAmJiBjb21wTmFtZSAhPSAnJztcblx0fSksICdlbXB0eSBjb21wb25lbnQgbmFtZScpO1xuXG5cdGlmICghIHRoaXMuY29tcENsYXNzKVxuXHRcdHRocm93IG5ldyBCaW5kRXJyb3IoJ2VtcHR5IGNvbXBvbmVudCBjbGFzcyBuYW1lICcgKyB0aGlzLmNvbXBDbGFzcyk7XG5cblx0cmV0dXJuIHRoaXM7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgnbW9sLXByb3RvJyk7XG5cbmZ1bmN0aW9uIEJpbmRFcnJvcihtc2cpIHtcblx0dGhpcy5tZXNzYWdlID0gbXNnO1xufVxuXG5fLm1ha2VTdWJjbGFzcyhCaW5kRXJyb3IsIEVycm9yKTtcblxubW9kdWxlLmV4cG9ydHMgPSBCaW5kRXJyb3I7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBjb21wb25lbnRzUmVnaXN0cnkgPSByZXF1aXJlKCcuLi9jb21wb25lbnRzL2NfcmVnaXN0cnknKVxuXHQsIENvbXBvbmVudCA9IGNvbXBvbmVudHNSZWdpc3RyeS5nZXQoJ0NvbXBvbmVudCcpXG5cdCwgQXR0cmlidXRlID0gcmVxdWlyZSgnLi9hdHRyaWJ1dGUnKVxuXHQsIEJpbmRFcnJvciA9IHJlcXVpcmUoJy4vZXJyb3InKVxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vY2hlY2snKVxuXHQsIE1hdGNoID0gIGNoZWNrLk1hdGNoO1xuXG5cbnZhciBvcHRzID0ge1xuXHRCSU5EX0FUVFI6ICdtbC1iaW5kJ1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGJpbmRlcjtcblxuZnVuY3Rpb24gYmluZGVyKHNjb3BlRWwsIGJpbmRTY29wZUVsKSB7XG5cdHZhciBzY29wZUVsID0gc2NvcGVFbCB8fCBkb2N1bWVudC5ib2R5XG5cdFx0LCBjb21wb25lbnRzID0ge307XG5cblx0Ly8gaXRlcmF0ZSBjaGlsZHJlbiBvZiBzY29wZUVsXG5cdEFycmF5LnByb3RvdHlwZS5mb3JFYWNoLmNhbGwoc2NvcGVFbC5jaGlsZHJlbiwgYmluZEVsZW1lbnQpO1xuXG5cdHJldHVybiBjb21wb25lbnRzO1xuXG5cdGZ1bmN0aW9uIGJpbmRFbGVtZW50KGVsKXtcblx0XHR2YXIgYXR0ciA9IG5ldyBBdHRyaWJ1dGUoZWwsIG9wdHMuQklORF9BVFRSKTtcblxuXHRcdHZhciBhQ29tcG9uZW50ID0gY3JlYXRlQ29tcG9uZW50KGVsLCBhdHRyKTtcblxuXHRcdC8vIGJpbmQgaW5uZXIgZWxlbWVudHMgdG8gY29tcG9uZW50c1xuXHRcdGlmIChlbC5jaGlsZHJlbiAmJiBlbC5jaGlsZHJlbi5sZW5ndGgpIHtcblx0XHRcdHZhciBpbm5lckNvbXBvbmVudHMgPSBiaW5kZXIoZWwpO1xuXG5cdFx0XHRpZiAoT2JqZWN0LmtleXMoaW5uZXJDb21wb25lbnRzKS5sZW5ndGgpIHtcblx0XHRcdFx0Ly8gYXR0YWNoIGlubmVyIGNvbXBvbmVudHMgdG8gdGhlIGN1cnJlbnQgb25lIChjcmVhdGUgYSBuZXcgc2NvcGUpIC4uLlxuXHRcdFx0XHRpZiAodHlwZW9mIGFDb21wb25lbnQgIT0gJ3VuZGVmaW5lZCcgJiYgYUNvbXBvbmVudC5jb250YWluZXIpXG5cdFx0XHRcdFx0YUNvbXBvbmVudC5jb250YWluZXIuYWRkKGlubmVyQ29tcG9uZW50cyk7XG5cdFx0XHRcdGVsc2UgLy8gb3Iga2VlcCB0aGVtIGluIHRoZSBjdXJyZW50IHNjb3BlXG5cdFx0XHRcdFx0Xy5lYWNoS2V5KGlubmVyQ29tcG9uZW50cywgc3RvcmVDb21wb25lbnQpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmIChhQ29tcG9uZW50KVxuXHRcdFx0c3RvcmVDb21wb25lbnQoYUNvbXBvbmVudCwgYXR0ci5jb21wTmFtZSk7XG5cdH1cblxuXHRmdW5jdGlvbiBjcmVhdGVDb21wb25lbnQoZWwsIGF0dHIpIHtcblx0XHRpZiAoYXR0ci5ub2RlKSB7IC8vIGVsZW1lbnQgd2lsbCBiZSBib3VuZCB0byBhIGNvbXBvbmVudFxuXHRcdFx0YXR0ci5wYXJzZSgpLnZhbGlkYXRlKCk7XG5cblx0XHRcdC8vIGdldCBjb21wb25lbnQgY2xhc3MgZnJvbSByZWdpc3RyeSBhbmQgdmFsaWRhdGVcblx0XHRcdHZhciBDb21wb25lbnRDbGFzcyA9IGNvbXBvbmVudHNSZWdpc3RyeS5nZXQoYXR0ci5jb21wQ2xhc3MpO1xuXG5cdFx0XHRpZiAoISBDb21wb25lbnRDbGFzcylcblx0XHRcdFx0dGhyb3cgbmV3IEJpbmRFcnJvcignY2xhc3MgJyArIGF0dHIuY29tcENsYXNzICsgJyBpcyBub3QgcmVnaXN0ZXJlZCcpO1xuXG5cdFx0XHRjaGVjayhDb21wb25lbnRDbGFzcywgTWF0Y2guU3ViY2xhc3MoQ29tcG9uZW50LCB0cnVlKSk7XG5cdFxuXHRcdFx0Ly8gY3JlYXRlIG5ldyBjb21wb25lbnRcblx0XHRcdHZhciBhQ29tcG9uZW50ID0gbmV3IENvbXBvbmVudENsYXNzKHt9LCBlbCk7XG5cblx0XHRcdC8vIGFkZCBleHRyYSBmYWNldHNcblx0XHRcdHZhciBmYWNldHMgPSBhdHRyLmNvbXBGYWNldHM7XG5cdFx0XHRpZiAoZmFjZXRzKVxuXHRcdFx0XHRmYWNldHMuZm9yRWFjaChmdW5jdGlvbihmY3QpIHtcblx0XHRcdFx0XHRhQ29tcG9uZW50LmFkZEZhY2V0KGZjdCk7XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRyZXR1cm4gYUNvbXBvbmVudDtcblx0XHR9XG5cdH1cblxuXG5cdGZ1bmN0aW9uIHN0b3JlQ29tcG9uZW50KGFDb21wb25lbnQsIG5hbWUpIHtcblx0XHRpZiAoY29tcG9uZW50c1tuYW1lXSlcblx0XHRcdHRocm93IG5ldyBCaW5kRXJyb3IoJ2R1cGxpY2F0ZSBjb21wb25lbnQgbmFtZTogJyArIG5hbWUpO1xuXG5cdFx0Y29tcG9uZW50c1tuYW1lXSA9IGFDb21wb25lbnQ7XG5cdH1cbn1cblxuXG5iaW5kZXIuY29uZmlnID0gZnVuY3Rpb24ob3B0aW9ucykge1xuXHRvcHRzLmV4dGVuZChvcHRpb25zKTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbi8vIFhYWCBkb2NzXG5cbi8vIFRoaW5ncyB3ZSBleHBsaWNpdGx5IGRvIE5PVCBzdXBwb3J0OlxuLy8gICAgLSBoZXRlcm9nZW5vdXMgYXJyYXlzXG52YXIgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpO1xuXG52YXIgY2hlY2sgPSBmdW5jdGlvbiAodmFsdWUsIHBhdHRlcm4pIHtcbiAgLy8gUmVjb3JkIHRoYXQgY2hlY2sgZ290IGNhbGxlZCwgaWYgc29tZWJvZHkgY2FyZWQuXG4gIHRyeSB7XG4gICAgY2hlY2tTdWJ0cmVlKHZhbHVlLCBwYXR0ZXJuKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgaWYgKChlcnIgaW5zdGFuY2VvZiBNYXRjaC5FcnJvcikgJiYgZXJyLnBhdGgpXG4gICAgICBlcnIubWVzc2FnZSArPSBcIiBpbiBmaWVsZCBcIiArIGVyci5wYXRoO1xuICAgIHRocm93IGVycjtcbiAgfVxufTtcbm1vZHVsZS5leHBvcnRzID0gY2hlY2s7XG5cbnZhciBNYXRjaCA9IGNoZWNrLk1hdGNoID0ge1xuICBPcHRpb25hbDogZnVuY3Rpb24gKHBhdHRlcm4pIHtcbiAgICByZXR1cm4gbmV3IE9wdGlvbmFsKHBhdHRlcm4pO1xuICB9LFxuICBPbmVPZjogZnVuY3Rpb24gKC8qYXJndW1lbnRzKi8pIHtcbiAgICByZXR1cm4gbmV3IE9uZU9mKGFyZ3VtZW50cyk7XG4gIH0sXG4gIEFueTogWydfX2FueV9fJ10sXG4gIFdoZXJlOiBmdW5jdGlvbiAoY29uZGl0aW9uKSB7XG4gICAgcmV0dXJuIG5ldyBXaGVyZShjb25kaXRpb24pO1xuICB9LFxuICBPYmplY3RJbmNsdWRpbmc6IGZ1bmN0aW9uIChwYXR0ZXJuKSB7XG4gICAgcmV0dXJuIG5ldyBPYmplY3RJbmNsdWRpbmcocGF0dGVybik7XG4gIH0sXG4gIC8vIE1hdGNoZXMgb25seSBzaWduZWQgMzItYml0IGludGVnZXJzXG4gIEludGVnZXI6IFsnX19pbnRlZ2VyX18nXSxcblxuICAvLyBNYXRjaGVzIGhhc2ggKG9iamVjdCkgd2l0aCB2YWx1ZXMgbWF0Y2hpbmcgcGF0dGVyblxuICBPYmplY3RIYXNoOiBmdW5jdGlvbihwYXR0ZXJuKSB7XG4gICAgcmV0dXJuIG5ldyBPYmplY3RIYXNoKHBhdHRlcm4pO1xuICB9LFxuXG4gIFN1YmNsYXNzOiBmdW5jdGlvbihTdXBlcmNsYXNzLCBtYXRjaFN1cGVyY2xhc3NUb28pIHtcbiAgICByZXR1cm4gbmV3IFN1YmNsYXNzKFN1cGVyY2xhc3MsIG1hdGNoU3VwZXJjbGFzc1Rvbyk7XG4gIH0sXG5cbiAgLy8gWFhYIG1hdGNoZXJzIHNob3VsZCBrbm93IGhvdyB0byBkZXNjcmliZSB0aGVtc2VsdmVzIGZvciBlcnJvcnNcbiAgRXJyb3I6IFR5cGVFcnJvcixcblxuICAvLyBNZXRlb3IubWFrZUVycm9yVHlwZShcIk1hdGNoLkVycm9yXCIsIGZ1bmN0aW9uIChtc2cpIHtcbiAgICAvLyB0aGlzLm1lc3NhZ2UgPSBcIk1hdGNoIGVycm9yOiBcIiArIG1zZztcbiAgICAvLyBUaGUgcGF0aCBvZiB0aGUgdmFsdWUgdGhhdCBmYWlsZWQgdG8gbWF0Y2guIEluaXRpYWxseSBlbXB0eSwgdGhpcyBnZXRzXG4gICAgLy8gcG9wdWxhdGVkIGJ5IGNhdGNoaW5nIGFuZCByZXRocm93aW5nIHRoZSBleGNlcHRpb24gYXMgaXQgZ29lcyBiYWNrIHVwIHRoZVxuICAgIC8vIHN0YWNrLlxuICAgIC8vIEUuZy46IFwidmFsc1szXS5lbnRpdHkuY3JlYXRlZFwiXG4gICAgLy8gdGhpcy5wYXRoID0gXCJcIjtcbiAgICAvLyBJZiB0aGlzIGdldHMgc2VudCBvdmVyIEREUCwgZG9uJ3QgZ2l2ZSBmdWxsIGludGVybmFsIGRldGFpbHMgYnV0IGF0IGxlYXN0XG4gICAgLy8gcHJvdmlkZSBzb21ldGhpbmcgYmV0dGVyIHRoYW4gNTAwIEludGVybmFsIHNlcnZlciBlcnJvci5cbiAgLy8gICB0aGlzLnNhbml0aXplZEVycm9yID0gbmV3IE1ldGVvci5FcnJvcig0MDAsIFwiTWF0Y2ggZmFpbGVkXCIpO1xuICAvLyB9KSxcblxuICAvLyBUZXN0cyB0byBzZWUgaWYgdmFsdWUgbWF0Y2hlcyBwYXR0ZXJuLiBVbmxpa2UgY2hlY2ssIGl0IG1lcmVseSByZXR1cm5zIHRydWVcbiAgLy8gb3IgZmFsc2UgKHVubGVzcyBhbiBlcnJvciBvdGhlciB0aGFuIE1hdGNoLkVycm9yIHdhcyB0aHJvd24pLlxuICB0ZXN0OiBmdW5jdGlvbiAodmFsdWUsIHBhdHRlcm4pIHtcbiAgICB0cnkge1xuICAgICAgY2hlY2tTdWJ0cmVlKHZhbHVlLCBwYXR0ZXJuKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChlIGluc3RhbmNlb2YgTWF0Y2guRXJyb3IpXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIC8vIFJldGhyb3cgb3RoZXIgZXJyb3JzLlxuICAgICAgdGhyb3cgZTtcbiAgICB9XG4gIH1cbn07XG5cbmZ1bmN0aW9uIE9wdGlvbmFsKHBhdHRlcm4pIHtcbiAgdGhpcy5wYXR0ZXJuID0gcGF0dGVybjtcbn07XG5cbmZ1bmN0aW9uIE9uZU9mKGNob2ljZXMpIHtcbiAgaWYgKGNob2ljZXMubGVuZ3RoID09IDApXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTXVzdCBwcm92aWRlIGF0IGxlYXN0IG9uZSBjaG9pY2UgdG8gTWF0Y2guT25lT2ZcIik7XG4gIHRoaXMuY2hvaWNlcyA9IGNob2ljZXM7XG59O1xuXG5mdW5jdGlvbiBXaGVyZShjb25kaXRpb24pIHtcbiAgdGhpcy5jb25kaXRpb24gPSBjb25kaXRpb247XG59O1xuXG5mdW5jdGlvbiBPYmplY3RJbmNsdWRpbmcocGF0dGVybikge1xuICB0aGlzLnBhdHRlcm4gPSBwYXR0ZXJuO1xufTtcblxuZnVuY3Rpb24gT2JqZWN0SGFzaChwYXR0ZXJuKSB7XG4gIHRoaXMucGF0dGVybiA9IHBhdHRlcm47XG59O1xuXG5mdW5jdGlvbiBTdWJjbGFzcyhTdXBlcmNsYXNzLCBtYXRjaFN1cGVyY2xhc3NUb28pIHtcbiAgdGhpcy5TdXBlcmNsYXNzID0gU3VwZXJjbGFzcztcbiAgdGhpcy5tYXRjaFN1cGVyY2xhc3MgPSBtYXRjaFN1cGVyY2xhc3NUb287XG59O1xuXG52YXIgdHlwZW9mQ2hlY2tzID0gW1xuICBbU3RyaW5nLCBcInN0cmluZ1wiXSxcbiAgW051bWJlciwgXCJudW1iZXJcIl0sXG4gIFtCb29sZWFuLCBcImJvb2xlYW5cIl0sXG4gIC8vIFdoaWxlIHdlIGRvbid0IGFsbG93IHVuZGVmaW5lZCBpbiBKU09OLCB0aGlzIGlzIGdvb2QgZm9yIG9wdGlvbmFsXG4gIC8vIGFyZ3VtZW50cyB3aXRoIE9uZU9mLlxuICBbdW5kZWZpbmVkLCBcInVuZGVmaW5lZFwiXVxuXTtcblxuZnVuY3Rpb24gY2hlY2tTdWJ0cmVlKHZhbHVlLCBwYXR0ZXJuKSB7XG4gIC8vIE1hdGNoIGFueXRoaW5nIVxuICBpZiAocGF0dGVybiA9PT0gTWF0Y2guQW55KVxuICAgIHJldHVybjtcblxuICAvLyBCYXNpYyBhdG9taWMgdHlwZXMuXG4gIC8vIERvIG5vdCBtYXRjaCBib3hlZCBvYmplY3RzIChlLmcuIFN0cmluZywgQm9vbGVhbilcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0eXBlb2ZDaGVja3MubGVuZ3RoOyArK2kpIHtcbiAgICBpZiAocGF0dGVybiA9PT0gdHlwZW9mQ2hlY2tzW2ldWzBdKSB7XG4gICAgICBpZiAodHlwZW9mIHZhbHVlID09PSB0eXBlb2ZDaGVja3NbaV1bMV0pXG4gICAgICAgIHJldHVybjtcbiAgICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIFwiICsgdHlwZW9mQ2hlY2tzW2ldWzFdICsgXCIsIGdvdCBcIiArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZW9mIHZhbHVlKTtcbiAgICB9XG4gIH1cbiAgaWYgKHBhdHRlcm4gPT09IG51bGwpIHtcbiAgICBpZiAodmFsdWUgPT09IG51bGwpXG4gICAgICByZXR1cm47XG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgbnVsbCwgZ290IFwiICsgSlNPTi5zdHJpbmdpZnkodmFsdWUpKTtcbiAgfVxuXG4gIC8vIE1hdGNoLkludGVnZXIgaXMgc3BlY2lhbCB0eXBlIGVuY29kZWQgd2l0aCBhcnJheVxuICBpZiAocGF0dGVybiA9PT0gTWF0Y2guSW50ZWdlcikge1xuICAgIC8vIFRoZXJlIGlzIG5vIGNvbnNpc3RlbnQgYW5kIHJlbGlhYmxlIHdheSB0byBjaGVjayBpZiB2YXJpYWJsZSBpcyBhIDY0LWJpdFxuICAgIC8vIGludGVnZXIuIE9uZSBvZiB0aGUgcG9wdWxhciBzb2x1dGlvbnMgaXMgdG8gZ2V0IHJlbWluZGVyIG9mIGRpdmlzaW9uIGJ5IDFcbiAgICAvLyBidXQgdGhpcyBtZXRob2QgZmFpbHMgb24gcmVhbGx5IGxhcmdlIGZsb2F0cyB3aXRoIGJpZyBwcmVjaXNpb24uXG4gICAgLy8gRS5nLjogMS4zNDgxOTIzMDg0OTE4MjRlKzIzICUgMSA9PT0gMCBpbiBWOFxuICAgIC8vIEJpdHdpc2Ugb3BlcmF0b3JzIHdvcmsgY29uc2lzdGFudGx5IGJ1dCBhbHdheXMgY2FzdCB2YXJpYWJsZSB0byAzMi1iaXRcbiAgICAvLyBzaWduZWQgaW50ZWdlciBhY2NvcmRpbmcgdG8gSmF2YVNjcmlwdCBzcGVjcy5cbiAgICBpZiAodHlwZW9mIHZhbHVlID09PSBcIm51bWJlclwiICYmICh2YWx1ZSB8IDApID09PSB2YWx1ZSlcbiAgICAgIHJldHVyblxuICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIEludGVnZXIsIGdvdCBcIlxuICAgICAgICAgICAgICAgICsgKHZhbHVlIGluc3RhbmNlb2YgT2JqZWN0ID8gSlNPTi5zdHJpbmdpZnkodmFsdWUpIDogdmFsdWUpKTtcbiAgfVxuXG4gIC8vIFwiT2JqZWN0XCIgaXMgc2hvcnRoYW5kIGZvciBNYXRjaC5PYmplY3RJbmNsdWRpbmcoe30pO1xuICBpZiAocGF0dGVybiA9PT0gT2JqZWN0KVxuICAgIHBhdHRlcm4gPSBNYXRjaC5PYmplY3RJbmNsdWRpbmcoe30pO1xuXG4gIC8vIEFycmF5IChjaGVja2VkIEFGVEVSIEFueSwgd2hpY2ggaXMgaW1wbGVtZW50ZWQgYXMgYW4gQXJyYXkpLlxuICBpZiAocGF0dGVybiBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgaWYgKHBhdHRlcm4ubGVuZ3RoICE9PSAxKVxuICAgICAgdGhyb3cgRXJyb3IoXCJCYWQgcGF0dGVybjogYXJyYXlzIG11c3QgaGF2ZSBvbmUgdHlwZSBlbGVtZW50XCIgK1xuICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkocGF0dGVybikpO1xuICAgIGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIGFycmF5LCBnb3QgXCIgKyBKU09OLnN0cmluZ2lmeSh2YWx1ZSkpO1xuICAgIH1cblxuICAgIHZhbHVlLmZvckVhY2goZnVuY3Rpb24gKHZhbHVlRWxlbWVudCwgaW5kZXgpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNoZWNrU3VidHJlZSh2YWx1ZUVsZW1lbnQsIHBhdHRlcm5bMF0pO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIGlmIChlcnIgaW5zdGFuY2VvZiBNYXRjaC5FcnJvcikge1xuICAgICAgICAgIGVyci5wYXRoID0gX3ByZXBlbmRQYXRoKGluZGV4LCBlcnIucGF0aCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIEFyYml0cmFyeSB2YWxpZGF0aW9uIGNoZWNrcy4gVGhlIGNvbmRpdGlvbiBjYW4gcmV0dXJuIGZhbHNlIG9yIHRocm93IGFcbiAgLy8gTWF0Y2guRXJyb3IgKGllLCBpdCBjYW4gaW50ZXJuYWxseSB1c2UgY2hlY2soKSkgdG8gZmFpbC5cbiAgaWYgKHBhdHRlcm4gaW5zdGFuY2VvZiBXaGVyZSkge1xuICAgIGlmIChwYXR0ZXJuLmNvbmRpdGlvbih2YWx1ZSkpXG4gICAgICByZXR1cm47XG4gICAgLy8gWFhYIHRoaXMgZXJyb3IgaXMgdGVycmlibGVcbiAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJGYWlsZWQgTWF0Y2guV2hlcmUgdmFsaWRhdGlvblwiKTtcbiAgfVxuXG5cbiAgaWYgKHBhdHRlcm4gaW5zdGFuY2VvZiBPcHRpb25hbClcbiAgICBwYXR0ZXJuID0gTWF0Y2guT25lT2YodW5kZWZpbmVkLCBwYXR0ZXJuLnBhdHRlcm4pO1xuXG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgT25lT2YpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhdHRlcm4uY2hvaWNlcy5sZW5ndGg7ICsraSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY2hlY2tTdWJ0cmVlKHZhbHVlLCBwYXR0ZXJuLmNob2ljZXNbaV0pO1xuICAgICAgICAvLyBObyBlcnJvcj8gWWF5LCByZXR1cm4uXG4gICAgICAgIHJldHVybjtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAvLyBPdGhlciBlcnJvcnMgc2hvdWxkIGJlIHRocm93bi4gTWF0Y2ggZXJyb3JzIGp1c3QgbWVhbiB0cnkgYW5vdGhlclxuICAgICAgICAvLyBjaG9pY2UuXG4gICAgICAgIGlmICghKGVyciBpbnN0YW5jZW9mIE1hdGNoLkVycm9yKSlcbiAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIFhYWCB0aGlzIGVycm9yIGlzIHRlcnJpYmxlXG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRmFpbGVkIE1hdGNoLk9uZU9mIG9yIE1hdGNoLk9wdGlvbmFsIHZhbGlkYXRpb25cIik7XG4gIH1cblxuICAvLyBBIGZ1bmN0aW9uIHRoYXQgaXNuJ3Qgc29tZXRoaW5nIHdlIHNwZWNpYWwtY2FzZSBpcyBhc3N1bWVkIHRvIGJlIGFcbiAgLy8gY29uc3RydWN0b3IuXG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBwYXR0ZXJuKVxuICAgICAgcmV0dXJuO1xuICAgIC8vIFhYWCB3aGF0IGlmIC5uYW1lIGlzbid0IGRlZmluZWRcbiAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJFeHBlY3RlZCBcIiArIHBhdHRlcm4uY29uc3RydWN0b3IubmFtZSk7XG4gIH1cblxuICB2YXIgdW5rbm93bktleXNBbGxvd2VkID0gZmFsc2U7XG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgT2JqZWN0SW5jbHVkaW5nKSB7XG4gICAgdW5rbm93bktleXNBbGxvd2VkID0gdHJ1ZTtcbiAgICBwYXR0ZXJuID0gcGF0dGVybi5wYXR0ZXJuO1xuICB9XG5cbiAgaWYgKHBhdHRlcm4gaW5zdGFuY2VvZiBPYmplY3RIYXNoKSB7XG4gICAgdmFyIGtleVBhdHRlcm4gPSBwYXR0ZXJuLnBhdHRlcm47XG4gICAgdmFyIGVtcHR5SGFzaCA9IHRydWU7XG4gICAgZm9yICh2YXIga2V5IGluIHZhbHVlKSB7XG4gICAgICBlbXB0eUhhc2ggPSBmYWxzZTtcbiAgICAgIGNoZWNrKHZhbHVlW2tleV0sIGtleVBhdHRlcm4pO1xuICAgIH1cbiAgICBpZiAoZW1wdHlIYXNoKVxuICAgICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgXCIgKyBwYXR0ZXJuLmNvbnN0cnVjdG9yLm5hbWUpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgU3ViY2xhc3MpIHtcbiAgICB2YXIgU3VwZXJjbGFzcyA9IHBhdHRlcm4uU3VwZXJjbGFzcztcbiAgICBpZiAocGF0dGVybi5tYXRjaFN1cGVyY2xhc3MgJiYgdmFsdWUgPT0gU3VwZXJjbGFzcykgXG4gICAgICByZXR1cm47XG4gICAgaWYgKCEgKHZhbHVlLnByb3RvdHlwZSBpbnN0YW5jZW9mIFN1cGVyY2xhc3MpKVxuICAgICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgXCIgKyBwYXR0ZXJuLmNvbnN0cnVjdG9yLm5hbWUgKyBcIiBvZiBcIiArIFN1cGVyY2xhc3MubmFtZSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBwYXR0ZXJuICE9PSBcIm9iamVjdFwiKVxuICAgIHRocm93IEVycm9yKFwiQmFkIHBhdHRlcm46IHVua25vd24gcGF0dGVybiB0eXBlXCIpO1xuXG4gIC8vIEFuIG9iamVjdCwgd2l0aCByZXF1aXJlZCBhbmQgb3B0aW9uYWwga2V5cy4gTm90ZSB0aGF0IHRoaXMgZG9lcyBOT1QgZG9cbiAgLy8gc3RydWN0dXJhbCBtYXRjaGVzIGFnYWluc3Qgb2JqZWN0cyBvZiBzcGVjaWFsIHR5cGVzIHRoYXQgaGFwcGVuIHRvIG1hdGNoXG4gIC8vIHRoZSBwYXR0ZXJuOiB0aGlzIHJlYWxseSBuZWVkcyB0byBiZSBhIHBsYWluIG9sZCB7T2JqZWN0fSFcbiAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ29iamVjdCcpXG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgb2JqZWN0LCBnb3QgXCIgKyB0eXBlb2YgdmFsdWUpO1xuICBpZiAodmFsdWUgPT09IG51bGwpXG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgb2JqZWN0LCBnb3QgbnVsbFwiKTtcblxuICB2YXIgcmVxdWlyZWRQYXR0ZXJucyA9IHt9O1xuICB2YXIgb3B0aW9uYWxQYXR0ZXJucyA9IHt9O1xuXG4gIF8uZWFjaEtleShwYXR0ZXJuLCBmdW5jdGlvbihzdWJQYXR0ZXJuLCBrZXkpIHtcbiAgICBpZiAocGF0dGVybltrZXldIGluc3RhbmNlb2YgT3B0aW9uYWwpXG4gICAgICBvcHRpb25hbFBhdHRlcm5zW2tleV0gPSBwYXR0ZXJuW2tleV0ucGF0dGVybjtcbiAgICBlbHNlXG4gICAgICByZXF1aXJlZFBhdHRlcm5zW2tleV0gPSBwYXR0ZXJuW2tleV07XG4gIH0sIHRoaXMsIHRydWUpO1xuXG4gIF8uZWFjaEtleSh2YWx1ZSwgZnVuY3Rpb24oc3ViVmFsdWUsIGtleSkge1xuICAgIHZhciBzdWJWYWx1ZSA9IHZhbHVlW2tleV07XG4gICAgdHJ5IHtcbiAgICAgIGlmIChyZXF1aXJlZFBhdHRlcm5zLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgY2hlY2tTdWJ0cmVlKHN1YlZhbHVlLCByZXF1aXJlZFBhdHRlcm5zW2tleV0pO1xuICAgICAgICBkZWxldGUgcmVxdWlyZWRQYXR0ZXJuc1trZXldO1xuICAgICAgfSBlbHNlIGlmIChvcHRpb25hbFBhdHRlcm5zLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgY2hlY2tTdWJ0cmVlKHN1YlZhbHVlLCBvcHRpb25hbFBhdHRlcm5zW2tleV0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKCF1bmtub3duS2V5c0FsbG93ZWQpXG4gICAgICAgICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiVW5rbm93biBrZXlcIik7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBpZiAoZXJyIGluc3RhbmNlb2YgTWF0Y2guRXJyb3IpXG4gICAgICAgIGVyci5wYXRoID0gX3ByZXBlbmRQYXRoKGtleSwgZXJyLnBhdGgpO1xuICAgICAgdGhyb3cgZXJyO1xuICAgIH1cbiAgfSwgdGhpcywgdHJ1ZSk7XG5cbiAgXy5lYWNoS2V5KHJlcXVpcmVkUGF0dGVybnMsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJNaXNzaW5nIGtleSAnXCIgKyBrZXkgKyBcIidcIik7XG4gIH0sIHRoaXMsIHRydWUpO1xufTtcblxuXG52YXIgX2pzS2V5d29yZHMgPSBbXCJkb1wiLCBcImlmXCIsIFwiaW5cIiwgXCJmb3JcIiwgXCJsZXRcIiwgXCJuZXdcIiwgXCJ0cnlcIiwgXCJ2YXJcIiwgXCJjYXNlXCIsXG4gIFwiZWxzZVwiLCBcImVudW1cIiwgXCJldmFsXCIsIFwiZmFsc2VcIiwgXCJudWxsXCIsIFwidGhpc1wiLCBcInRydWVcIiwgXCJ2b2lkXCIsIFwid2l0aFwiLFxuICBcImJyZWFrXCIsIFwiY2F0Y2hcIiwgXCJjbGFzc1wiLCBcImNvbnN0XCIsIFwic3VwZXJcIiwgXCJ0aHJvd1wiLCBcIndoaWxlXCIsIFwieWllbGRcIixcbiAgXCJkZWxldGVcIiwgXCJleHBvcnRcIiwgXCJpbXBvcnRcIiwgXCJwdWJsaWNcIiwgXCJyZXR1cm5cIiwgXCJzdGF0aWNcIiwgXCJzd2l0Y2hcIixcbiAgXCJ0eXBlb2ZcIiwgXCJkZWZhdWx0XCIsIFwiZXh0ZW5kc1wiLCBcImZpbmFsbHlcIiwgXCJwYWNrYWdlXCIsIFwicHJpdmF0ZVwiLCBcImNvbnRpbnVlXCIsXG4gIFwiZGVidWdnZXJcIiwgXCJmdW5jdGlvblwiLCBcImFyZ3VtZW50c1wiLCBcImludGVyZmFjZVwiLCBcInByb3RlY3RlZFwiLCBcImltcGxlbWVudHNcIixcbiAgXCJpbnN0YW5jZW9mXCJdO1xuXG4vLyBBc3N1bWVzIHRoZSBiYXNlIG9mIHBhdGggaXMgYWxyZWFkeSBlc2NhcGVkIHByb3Blcmx5XG4vLyByZXR1cm5zIGtleSArIGJhc2VcbmZ1bmN0aW9uIF9wcmVwZW5kUGF0aChrZXksIGJhc2UpIHtcbiAgaWYgKCh0eXBlb2Yga2V5KSA9PT0gXCJudW1iZXJcIiB8fCBrZXkubWF0Y2goL15bMC05XSskLykpXG4gICAga2V5ID0gXCJbXCIgKyBrZXkgKyBcIl1cIjtcbiAgZWxzZSBpZiAoIWtleS5tYXRjaCgvXlthLXpfJF1bMC05YS16XyRdKiQvaSkgfHwgX2pzS2V5d29yZHMuaW5kZXhPZihrZXkpICE9IC0xKVxuICAgIGtleSA9IEpTT04uc3RyaW5naWZ5KFtrZXldKTtcblxuICBpZiAoYmFzZSAmJiBiYXNlWzBdICE9PSBcIltcIilcbiAgICByZXR1cm4ga2V5ICsgJy4nICsgYmFzZTtcbiAgcmV0dXJuIGtleSArIGJhc2U7XG59O1xuXG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBGYWNldGVkT2JqZWN0ID0gcmVxdWlyZSgnLi4vZmFjZXRzL2Zfb2JqZWN0Jylcblx0LCBmYWNldHNSZWdpc3RyeSA9IHJlcXVpcmUoJy4vY19mYWNldHMvY2ZfcmVnaXN0cnknKVxuXHQsIENvbXBvbmVudEZhY2V0ID0gcmVxdWlyZSgnLi9jX2ZhY2V0Jylcblx0LCBNZXNzZW5nZXIgPSByZXF1aXJlKCcuLi9tZXNzZW5nZXInKVxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vY2hlY2snKVxuXHQsIE1hdGNoID0gY2hlY2suTWF0Y2g7XG5cbnZhciBDb21wb25lbnQgPSBfLmNyZWF0ZVN1YmNsYXNzKEZhY2V0ZWRPYmplY3QsICdDb21wb25lbnQnLCB0cnVlKTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb25lbnQ7XG5cblxuQ29tcG9uZW50LmNyZWF0ZUNvbXBvbmVudENsYXNzID0gZnVuY3Rpb24obmFtZSwgZmFjZXRzKSB7XG5cdHZhciBmYWNldHNDbGFzc2VzID0ge307XG5cblx0ZmFjZXRzLmZvckVhY2goZnVuY3Rpb24oZmN0KSB7XG5cdFx0dmFyIGZjdE5hbWUgPSBfLmZpcnN0TG93ZXJDYXNlKGZjdCk7XG5cdFx0dmFyIGZjdENsYXNzTmFtZSA9IF8uZmlyc3RVcHBlckNhc2UoZmN0KTtcblx0XHRmYWNldHNDbGFzc2VzW2ZjdE5hbWVdID0gZmFjZXRzUmVnaXN0cnkuZ2V0KGZjdENsYXNzTmFtZSlcblx0fSk7XG5cblx0cmV0dXJuIEZhY2V0ZWRPYmplY3QuY3JlYXRlRmFjZXRlZENsYXNzLmNhbGwodGhpcywgbmFtZSwgZmFjZXRzQ2xhc3Nlcyk7XG59O1xuXG5kZWxldGUgQ29tcG9uZW50LmNyZWF0ZUZhY2V0ZWRDbGFzcztcblxuXG5fLmV4dGVuZFByb3RvKENvbXBvbmVudCwge1xuXHRpbml0OiBpbml0Q29tcG9uZW50LFxuXHRhZGRGYWNldDogYWRkRmFjZXRcbn0pO1xuXG5cbmZ1bmN0aW9uIGluaXRDb21wb25lbnQoZmFjZXRzT3B0aW9ucywgZWxlbWVudCkge1xuXHR0aGlzLmVsID0gZWxlbWVudDtcblxuXHR2YXIgbWVzc2VuZ2VyID0gbmV3IE1lc3Nlbmdlcih0aGlzLCBNZXNzZW5nZXIuZGVmYXVsdE1ldGhvZHMsIHVuZGVmaW5lZCAvKiBubyBtZXNzYWdlU291cmNlICovKTtcblxuXHRPYmplY3QuZGVmaW5lUHJvcGVydGllcyh0aGlzLCB7XG5cdFx0X21lc3NlbmdlcjogeyB2YWx1ZTogbWVzc2VuZ2VyIH0sXG5cdH0pO1x0XG59XG5cblxuZnVuY3Rpb24gYWRkRmFjZXQoZmFjZXROYW1lT3JDbGFzcywgZmFjZXRPcHRzLCBmYWNldE5hbWUpIHtcblx0Y2hlY2soZmFjZXROYW1lT3JDbGFzcywgTWF0Y2guT25lT2YoU3RyaW5nLCBNYXRjaC5TdWJjbGFzcyhDb21wb25lbnRGYWNldCkpKTtcblx0Y2hlY2soZmFjZXRPcHRzLCBNYXRjaC5PcHRpb25hbChPYmplY3QpKTtcblx0Y2hlY2soZmFjZXROYW1lLCBNYXRjaC5PcHRpb25hbChTdHJpbmcpKTtcblxuXHRpZiAodHlwZW9mIGZhY2V0TmFtZU9yQ2xhc3MgPT0gJ3N0cmluZycpIHtcblx0XHR2YXIgZmFjZXRDbGFzc05hbWUgPSBfLmZpcnN0VXBwZXJDYXNlKGZhY2V0TmFtZU9yQ2xhc3MpO1xuXHRcdHZhciBGYWNldENsYXNzID0gZmFjZXRzUmVnaXN0cnkuZ2V0KGZhY2V0Q2xhc3NOYW1lKTtcblx0fSBlbHNlIFxuXHRcdEZhY2V0Q2xhc3MgPSBmYWNldE5hbWVPckNsYXNzO1xuXG5cdGZhY2V0TmFtZSA9IGZhY2V0TmFtZSB8fCBfLmZpcnN0TG93ZXJDYXNlKEZhY2V0Q2xhc3MubmFtZSk7XG5cblx0RmFjZXRlZE9iamVjdC5wcm90b3R5cGUuYWRkRmFjZXQuY2FsbCh0aGlzLCBGYWNldENsYXNzLCBmYWNldE9wdHMsIGZhY2V0TmFtZSk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBGYWNldCA9IHJlcXVpcmUoJy4uL2ZhY2V0cy9mX2NsYXNzJylcblx0LCBNZXNzZW5nZXIgPSByZXF1aXJlKCcuLi9tZXNzZW5nZXInKVxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKTtcblxudmFyIENvbXBvbmVudEZhY2V0ID0gXy5jcmVhdGVTdWJjbGFzcyhGYWNldCwgJ0NvbXBvbmVudEZhY2V0Jyk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ29tcG9uZW50RmFjZXQ7XG5cblxuXy5leHRlbmRQcm90byhDb21wb25lbnRGYWNldCwge1xuXHRpbml0OiBpbml0Q29tcG9uZW50RmFjZXQsXG59KTtcblxuXG5mdW5jdGlvbiBpbml0Q29tcG9uZW50RmFjZXQoKSB7XG5cdC8vIHZhciBtZXNzZW5nZXIgPSBuZXcgTWVzc2VuZ2VyKHRoaXMsIE1lc3Nlbmdlci5kZWZhdWx0TWV0aG9kcywgdW5kZWZpbmVkIC8qIG5vIG1lc3NhZ2VTb3VyY2UgKi8pO1xuXG5cdC8vIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRoaXMsIHtcblx0Ly8gXHRfZmFjZXRNZXNzZW5nZXI6IHsgdmFsdWU6IG1lc3NlbmdlciB9LFxuXHQvLyB9KTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIENvbXBvbmVudEZhY2V0ID0gcmVxdWlyZSgnLi4vY19mYWNldCcpXG5cdCwgYmluZGVyID0gcmVxdWlyZSgnLi4vLi4vYmluZGVyJylcblx0LCBfID0gcmVxdWlyZSgnbW9sLXByb3RvJylcblx0LCBmYWNldHNSZWdpc3RyeSA9IHJlcXVpcmUoJy4vY2ZfcmVnaXN0cnknKTtcblxuLy8gY29udGFpbmVyIGZhY2V0XG52YXIgQ29udGFpbmVyID0gXy5jcmVhdGVTdWJjbGFzcyhDb21wb25lbnRGYWNldCwgJ0NvbnRhaW5lcicpO1xuXG5fLmV4dGVuZFByb3RvKENvbnRhaW5lciwge1xuXHRpbml0OiBpbml0Q29udGFpbmVyLFxuXHRfYmluZDogX2JpbmRDb21wb25lbnRzLFxuXHRhZGQ6IGFkZENoaWxkQ29tcG9uZW50c1xufSk7XG5cbmZhY2V0c1JlZ2lzdHJ5LmFkZChDb250YWluZXIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbnRhaW5lcjtcblxuXG5mdW5jdGlvbiBpbml0Q29udGFpbmVyKCkge1xuXHRDb21wb25lbnRGYWNldC5wcm90b3R5cGUuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXHR0aGlzLmNoaWxkcmVuID0ge307XG59XG5cblxuZnVuY3Rpb24gX2JpbmRDb21wb25lbnRzKCkge1xuXHQvLyBUT0RPXG5cdC8vIHRoaXMgZnVuY3Rpb24gc2hvdWxkIHJlLWJpbmQgcmF0aGVyIHRoYW4gYmluZCBhbGwgaW50ZXJuYWwgZWxlbWVudHNcblx0dGhpcy5jaGlsZHJlbiA9IGJpbmRlcih0aGlzLm93bmVyLmVsKTtcbn1cblxuXG5mdW5jdGlvbiBhZGRDaGlsZENvbXBvbmVudHMoY2hpbGRDb21wb25lbnRzKSB7XG5cdC8vIFRPRE9cblx0Ly8gdGhpcyBmdW5jdGlvbiBzaG91bGQgaW50ZWxsaWdlbnRseSByZS1iaW5kIGV4aXN0aW5nIGNvbXBvbmVudHMgdG9cblx0Ly8gbmV3IGVsZW1lbnRzIChpZiB0aGV5IGNoYW5nZWQpIGFuZCByZS1iaW5kIHByZXZpb3VzbHkgYm91bmQgZXZlbnRzIHRvIHRoZSBzYW1lXG5cdC8vIGV2ZW50IGhhbmRsZXJzXG5cdC8vIG9yIG1heWJlIG5vdCwgaWYgdGhpcyBmdW5jdGlvbiBpcyBvbmx5IHVzZWQgYnkgYmluZGVyIHRvIGFkZCBuZXcgZWxlbWVudHMuLi5cblx0Xy5leHRlbmQodGhpcy5jaGlsZHJlbiwgY2hpbGRDb21wb25lbnRzKTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIENvbXBvbmVudEZhY2V0ID0gcmVxdWlyZSgnLi4vY19mYWNldCcpXG5cdCwgZmFjZXRzUmVnaXN0cnkgPSByZXF1aXJlKCcuL2NmX3JlZ2lzdHJ5JylcblxuXHQsIE1lc3NlbmdlciA9IHJlcXVpcmUoJy4uLy4uL21lc3NlbmdlcicpXG5cdCwgQ29tcG9uZW50RGF0YVNvdXJjZSA9IHJlcXVpcmUoJy4uL2NfbWVzc2FnZV9zb3VyY2VzL2NvbXBvbmVudF9kYXRhX3NvdXJjZScpXG5cblx0LCBfID0gcmVxdWlyZSgnbW9sLXByb3RvJyk7XG5cblxuLy8gZGF0YSBtb2RlbCBjb25uZWN0aW9uIGZhY2V0XG52YXIgRGF0YSA9IF8uY3JlYXRlU3ViY2xhc3MoQ29tcG9uZW50RmFjZXQsICdEYXRhJyk7XG5cbl8uZXh0ZW5kUHJvdG8oRGF0YSwge1xuXHRpbml0OiBpbml0RGF0YUZhY2V0LFxuXG5cdC8vIF9yZWF0dGFjaDogX3JlYXR0YWNoRXZlbnRzT25FbGVtZW50Q2hhbmdlXG59KTtcblxuZmFjZXRzUmVnaXN0cnkuYWRkKERhdGEpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IERhdGE7XG5cblxuZnVuY3Rpb24gaW5pdERhdGFGYWNldCgpIHtcblx0Q29tcG9uZW50RmFjZXQucHJvdG90eXBlLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuXHR2YXIgcHJveHlDb21wRGF0YVNvdXJjZU1ldGhvZHMgPSB7XG5cdFx0dmFsdWU6ICd2YWx1ZScsXG5cdFx0dHJpZ2dlcjogJ3RyaWdnZXInXG5cdH07XG5cblx0Ly8gaW5zdGVhZCBvZiB0aGlzLm93bmVyIHNob3VsZCBwYXNzIG1vZGVsPyBXaGVyZSBpdCBpcyBzZXQ/XG5cdHZhciBjb21wRGF0YVNvdXJjZSA9IG5ldyBDb21wb25lbnREYXRhU291cmNlKHRoaXMsIHByb3h5Q29tcERhdGFTb3VyY2VNZXRob2RzLCB0aGlzLm93bmVyKTtcblxuXHR2YXIgcHJveHlNZXNzZW5nZXJNZXRob2RzID0ge1xuXHRcdG9uOiAnb25NZXNzYWdlJyxcblx0XHRvZmY6ICdvZmZNZXNzYWdlJyxcblx0XHRvbk1lc3NhZ2VzOiAnb25NZXNzYWdlcycsXG5cdFx0b2ZmTWVzc2FnZXM6ICdvZmZNZXNzYWdlcycsXG5cdFx0Z2V0U3Vic2NyaWJlcnM6ICdnZXRTdWJzY3JpYmVycydcblx0fTtcblxuXHR2YXIgZGF0YU1lc3NlbmdlciA9IG5ldyBNZXNzZW5nZXIodGhpcywgcHJveHlNZXNzZW5nZXJNZXRob2RzLCBjb21wRGF0YVNvdXJjZSk7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnRpZXModGhpcywge1xuXHRcdF9kYXRhTWVzc2VuZ2VyOiB7IHZhbHVlOiBkYXRhTWVzc2VuZ2VyIH0sXG5cdFx0X2NvbXBEYXRhU291cmNlOiB7IHZhbHVlOiBjb21wRGF0YVNvdXJjZSB9XG5cdH0pO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ29tcG9uZW50RmFjZXQgPSByZXF1aXJlKCcuLi9jX2ZhY2V0Jylcblx0LCBmYWNldHNSZWdpc3RyeSA9IHJlcXVpcmUoJy4vY2ZfcmVnaXN0cnknKVxuXG5cdCwgTWVzc2VuZ2VyID0gcmVxdWlyZSgnLi4vLi4vbWVzc2VuZ2VyJylcblx0LCBET01FdmVudHNTb3VyY2UgPSByZXF1aXJlKCcuLi9jX21lc3NhZ2Vfc291cmNlcy9kb21fZXZlbnRzX3NvdXJjZScpXG5cblx0LCBfID0gcmVxdWlyZSgnbW9sLXByb3RvJyk7XG5cblxuLy8gZXZlbnRzIGZhY2V0XG52YXIgRXZlbnRzID0gXy5jcmVhdGVTdWJjbGFzcyhDb21wb25lbnRGYWNldCwgJ0V2ZW50cycpO1xuXG5fLmV4dGVuZFByb3RvKEV2ZW50cywge1xuXHRpbml0OiBpbml0RXZlbnRzRmFjZXQsXG5cblx0Ly8gX3JlYXR0YWNoOiBfcmVhdHRhY2hFdmVudHNPbkVsZW1lbnRDaGFuZ2Vcbn0pO1xuXG5mYWNldHNSZWdpc3RyeS5hZGQoRXZlbnRzKTtcblxubW9kdWxlLmV4cG9ydHMgPSBFdmVudHM7XG5cblxuZnVuY3Rpb24gaW5pdEV2ZW50c0ZhY2V0KCkge1xuXHRDb21wb25lbnRGYWNldC5wcm90b3R5cGUuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG5cdHZhciBkb21FdmVudHNTb3VyY2UgPSBuZXcgRE9NRXZlbnRzU291cmNlKHRoaXMsIHsgdHJpZ2dlcjogJ3RyaWdnZXInIH0sIHRoaXMub3duZXIpO1xuXG5cdHZhciBwcm94eU1lc3Nlbmdlck1ldGhvZHMgPSB7XG5cdFx0b246ICdvbk1lc3NhZ2UnLFxuXHRcdG9mZjogJ29mZk1lc3NhZ2UnLFxuXHRcdG9uRXZlbnRzOiAnb25NZXNzYWdlcycsXG5cdFx0b2ZmRXZlbnRzOiAnb2ZmTWVzc2FnZXMnLFxuXHRcdGdldExpc3RlbmVyczogJ2dldFN1YnNjcmliZXJzJ1xuXHR9O1xuXG5cdHZhciBtZXNzZW5nZXIgPSBuZXcgTWVzc2VuZ2VyKHRoaXMsIHByb3h5TWVzc2VuZ2VyTWV0aG9kcywgZG9tRXZlbnRzU291cmNlKTtcblxuXHRPYmplY3QuZGVmaW5lUHJvcGVydGllcyh0aGlzLCB7XG5cdFx0X2V2ZW50c01lc3NlbmdlcjogeyB2YWx1ZTogbWVzc2VuZ2VyIH0sXG5cdFx0X2RvbUV2ZW50c1NvdXJjZTogeyB2YWx1ZTogZG9tRXZlbnRzU291cmNlIH1cblx0fSk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBDbGFzc1JlZ2lzdHJ5ID0gcmVxdWlyZSgnLi4vLi4vcmVnaXN0cnknKVxuXHQsIENvbXBvbmVudEZhY2V0ID0gcmVxdWlyZSgnLi4vY19mYWNldCcpO1xuXG52YXIgZmFjZXRzUmVnaXN0cnkgPSBuZXcgQ2xhc3NSZWdpc3RyeShDb21wb25lbnRGYWNldCk7XG5cbmZhY2V0c1JlZ2lzdHJ5LmFkZChDb21wb25lbnRGYWNldCk7XG5cbm1vZHVsZS5leHBvcnRzID0gZmFjZXRzUmVnaXN0cnk7XG5cbi8vIFRPRE8gLSByZWZhY3RvciBjb21wb25lbnRzIHJlZ2lzdHJ5IHRlc3QgaW50byBhIGZ1bmN0aW9uXG4vLyB0aGF0IHRlc3RzIGEgcmVnaXN0cnkgd2l0aCBhIGdpdmVuIGZvdW5kYXRpb24gY2xhc3Ncbi8vIE1ha2UgdGVzdCBmb3IgdGhpcyByZWdpc3RyeSBiYXNlZCBvbiB0aGlzIGZ1bmN0aW9uIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgRE9NRXZlbnRzU291cmNlID0gcmVxdWlyZSgnLi9kb21fZXZlbnRzX3NvdXJjZScpXG5cdCwgQ29tcG9uZW50ID0gcmVxdWlyZSgnLi4vY19jbGFzcycpXG5cdCwgQ29tcG9uZW50RGF0YVNvdXJjZUVycm9yID0gcmVxdWlyZSgnLi4vLi4vZXJyb3InKS5Db21wb25lbnREYXRhU291cmNlXG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpXG5cdCwgY2hlY2sgPSByZXF1aXJlKCcuLi8uLi9jaGVjaycpXG5cdCwgTWF0Y2ggPSBjaGVjay5NYXRjaDtcblxuXG4vLyBjbGFzcyB0byBoYW5kbGUgc3Vic2NyaWJ0aW9ucyB0byBjaGFuZ2VzIGluIERPTSBmb3IgVUkgKG1heWJlIGFsc28gY29udGVudCBlZGl0YWJsZSkgZWxlbWVudHNcbnZhciBDb21wb25lbnREYXRhU291cmNlID0gXy5jcmVhdGVTdWJjbGFzcyhET01FdmVudHNTb3VyY2UsICdDb21wb25lbnREYXRhU291cmNlJywgdHJ1ZSk7XG5cblxuXy5leHRlbmRQcm90byhDb21wb25lbnREYXRhU291cmNlLCB7XG5cdC8vIGltcGxlbWVudGluZyBNZXNzYWdlU291cmNlIGludGVyZmFjZVxuXHRpbml0OiBpbml0Q29tcG9uZW50RGF0YVNvdXJjZSxcblx0dHJhbnNsYXRlVG9Tb3VyY2VNZXNzYWdlOiB0cmFuc2xhdGVUb0RvbUV2ZW50LFxuIFx0YWRkU291cmNlTGlzdGVuZXI6IGFkZERvbUV2ZW50TGlzdGVuZXIsXG4gXHRyZW1vdmVTb3VyY2VMaXN0ZW5lcjogcmVtb3ZlRG9tRXZlbnRMaXN0ZW5lcixcbiBcdGZpbHRlclNvdXJjZU1lc3NhZ2U6IGZpbHRlckRhdGFNZXNzYWdlLFxuXG4gXHQvLyBjbGFzcyBzcGVjaWZpYyBtZXRob2RzXG4gXHQvLyBkb206IGltcGxlbWVudGVkIGluIERPTUV2ZW50c1NvdXJjZVxuIFx0dmFsdWU6IGdldERvbUVsZW1lbnREYXRhLFxuIFx0aGFuZGxlRXZlbnQ6IGhhbmRsZUV2ZW50LCAgLy8gZXZlbnQgZGlzcGF0Y2hlciAtIGFzIGRlZmluZWQgYnkgRXZlbnQgRE9NIEFQSVxuIFx0dHJpZ2dlcjogdHJpZ2dlckRhdGFNZXNzYWdlIC8vIHJlZGVmaW5lcyBtZXRob2Qgb2Ygc3VwZXJjbGFzcyBET01FdmVudHNTb3VyY2Vcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbXBvbmVudERhdGFTb3VyY2U7XG5cblxuZnVuY3Rpb24gaW5pdENvbXBvbmVudERhdGFTb3VyY2UoKSB7XG5cdERPTUV2ZW50c1NvdXJjZS5wcm90b3R5cGUuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG5cdHRoaXMudmFsdWUoKTsgLy8gc3RvcmVzIGN1cnJlbnQgY29tcG9uZW50IGRhdGEgdmFsdWUgaW4gdGhpcy5fdmFsdWVcbn1cblxuXG4vLyBUT0RPOiBzaG91bGQgcmV0dXJuIHZhbHVlIGRlcGVuZGVudCBvbiBlbGVtZW50IHRhZ1xuZnVuY3Rpb24gZ2V0RG9tRWxlbWVudERhdGEoKSB7IC8vIHZhbHVlIG1ldGhvZFxuXHR2YXIgbmV3VmFsdWUgPSB0aGlzLmNvbXBvbmVudC5lbC52YWx1ZTtcblxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ192YWx1ZScsIHtcblx0XHRjb25maWd1cmFibGU6IHRydWUsXG5cdFx0dmFsdWU6IG5ld1ZhbHVlXG5cdH0pO1xuXG5cdHJldHVybiBuZXdWYWx1ZTtcbn1cblxuXG4vLyBUT0RPOiB0aGlzIGZ1bmN0aW9uIHNob3VsZCByZXR1cm4gcmVsZXZhbnQgRE9NIGV2ZW50IGRlcGVuZGVudCBvbiBlbGVtZW50IHRhZ1xuLy8gQ2FuIGFsc28gaW1wbGVtZW50IGJlZm9yZWRhdGFjaGFuZ2VkIGV2ZW50IHRvIGFsbG93IHByZXZlbnRpbmcgdGhlIGNoYW5nZVxuZnVuY3Rpb24gdHJhbnNsYXRlVG9Eb21FdmVudChtZXNzYWdlKSB7XG5cdGlmIChtZXNzYWdlID09ICdkYXRhY2hhbmdlZCcpXG5cdFx0cmV0dXJuICdpbnB1dCc7XG5cdGVsc2Vcblx0XHR0aHJvdyBuZXcgQ29tcG9uZW50RGF0YVNvdXJjZUVycm9yKCd1bmtub3duIGNvbXBvbmVudCBkYXRhIGV2ZW50Jyk7XG59XG5cblxuZnVuY3Rpb24gYWRkRG9tRXZlbnRMaXN0ZW5lcihldmVudFR5cGUpIHtcblx0dGhpcy5kb20oKS5hZGRFdmVudExpc3RlbmVyKGV2ZW50VHlwZSwgdGhpcywgZmFsc2UpOyAvLyBubyBjYXB0dXJpbmdcbn1cblxuXG5mdW5jdGlvbiByZW1vdmVEb21FdmVudExpc3RlbmVyKGV2ZW50VHlwZSkge1xuXHR0aGlzLmRvbSgpLnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlLCB0aGlzLCBmYWxzZSk7IC8vIG5vIGNhcHR1cmluZ1xufVxuXG5cbmZ1bmN0aW9uIGZpbHRlckRhdGFNZXNzYWdlKGV2ZW50VHlwZSwgbWVzc2FnZSwgZGF0YSkge1xuXHRyZXR1cm4gZGF0YS5uZXdWYWx1ZSAhPSBkYXRhLm9sZFZhbHVlO1xufTtcblxuXG4gLy8gZXZlbnQgZGlzcGF0Y2hlciAtIGFzIGRlZmluZWQgYnkgRXZlbnQgRE9NIEFQSVxuZnVuY3Rpb24gaGFuZGxlRXZlbnQoZXZlbnQpIHtcblx0dmFyIG9sZFZhbHVlID0gdGhpcy5fdmFsdWU7XG5cblx0dGhpcy5kaXNwYXRjaE1lc3NhZ2UoZXZlbnQudHlwZSwge1xuXHRcdG9sZFZhbHVlOiBvbGRWYWx1ZSxcblx0XHRuZXdWYWx1ZTogdGhpcy52YWx1ZSgpXG5cdH0pO1xufVxuXG5cbmZ1bmN0aW9uIHRyaWdnZXJEYXRhTWVzc2FnZShtZXNzYWdlLCBkYXRhKSB7XG5cdC8vIFRPRE8gLSBvcHBvc2l0ZSB0cmFuc2xhdGlvbiArIGV2ZW50IHRyaWdnZXIgXG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgnbW9sLXByb3RvJyk7XG5cblxuLy8gaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvUmVmZXJlbmNlL0V2ZW50c1xuXG52YXIgZXZlbnRUeXBlcyA9IHtcblx0Q2xpcGJvYXJkRXZlbnQ6IFsnY29weScsICdjdXQnLCAncGFzdGUnLCAnYmVmb3JlY29weScsICdiZWZvcmVjdXQnLCAnYmVmb3JlcGFzdGUnXSxcblx0RXZlbnQ6IFsnaW5wdXQnXSxcblx0Rm9jdXNFdmVudDogWydmb2N1cycsICdibHVyJywgJ2ZvY3VzaW4nLCAnZm9jdXNvdXQnXSxcblx0S2V5Ym9hcmRFdmVudDogWydrZXlkb3duJywgJ2tleXByZXNzJywgICdrZXl1cCddLFxuXHRNb3VzZUV2ZW50OiBbJ2NsaWNrJywgJ2NvbnRleHRtZW51JywgJ2RibGNsaWNrJywgJ21vdXNlZG93bicsICdtb3VzZXVwJyxcblx0XHRcdFx0ICdtb3VzZWVudGVyJywgJ21vdXNlbGVhdmUnLCAnbW91c2Vtb3ZlJywgJ21vdXNlb3V0JywgJ21vdXNlb3ZlcicsXG5cdFx0XHRcdCAnc2hvdycgLyogY29udGV4dCBtZW51ICovXSxcblx0VG91Y2hFdmVudDogWyd0b3VjaHN0YXJ0JywgJ3RvdWNoZW5kJywgJ3RvdWNobW92ZScsICd0b3VjaGVudGVyJywgJ3RvdWNobGVhdmUnLCAndG91Y2hjYW5jZWwnXSxcbn07XG5cblxuLy8gbW9jayB3aW5kb3cgYW5kIGV2ZW50IGNvbnN0cnVjdG9ycyBmb3IgdGVzdGluZ1xuaWYgKHR5cGVvZiB3aW5kb3cgIT0gJ3VuZGVmaW5lZCcpXG5cdHZhciBnbG9iYWwgPSB3aW5kb3c7XG5lbHNlIHtcblx0Z2xvYmFsID0ge307XG5cdF8uZWFjaEtleShldmVudFR5cGVzLCBmdW5jdGlvbihlVHlwZXMsIGV2ZW50Q29uc3RydWN0b3JOYW1lKSB7XG5cdFx0dmFyIGV2ZW50c0NvbnN0cnVjdG9yO1xuXHRcdGV2YWwoXG5cdFx0XHQnZXZlbnRzQ29uc3RydWN0b3IgPSBmdW5jdGlvbiAnICsgZXZlbnRDb25zdHJ1Y3Rvck5hbWUgKyAnKHR5cGUsIHByb3BlcnRpZXMpIHsgXFxcblx0XHRcdFx0dGhpcy50eXBlID0gdHlwZTsgXFxcblx0XHRcdFx0Xy5leHRlbmQodGhpcywgcHJvcGVydGllcyk7IFxcXG5cdFx0XHR9Oydcblx0XHQpO1xuXHRcdGdsb2JhbFtldmVudENvbnN0cnVjdG9yTmFtZV0gPSBldmVudHNDb25zdHJ1Y3Rvcjtcblx0fSk7XG59XG5cblxudmFyIGRvbUV2ZW50c0NvbnN0cnVjdG9ycyA9IHt9O1xuXG5fLmVhY2hLZXkoZXZlbnRUeXBlcywgZnVuY3Rpb24oZVR5cGVzLCBldmVudENvbnN0cnVjdG9yTmFtZSkge1xuXHRlVHlwZXMuZm9yRWFjaChmdW5jdGlvbih0eXBlKSB7XG5cdFx0aWYgKE9iamVjdC5oYXNPd25Qcm9wZXJ0eShkb21FdmVudHNDb25zdHJ1Y3RvcnMsIHR5cGUpKVxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdkdXBsaWNhdGUgZXZlbnQgdHlwZSAnICsgdHlwZSk7XG5cblx0XHRkb21FdmVudHNDb25zdHJ1Y3RvcnNbdHlwZV0gPSBnbG9iYWxbZXZlbnRDb25zdHJ1Y3Rvck5hbWVdO1xuXHR9KTtcbn0pO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gZG9tRXZlbnRzQ29uc3RydWN0b3JzO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgTWVzc2FnZVNvdXJjZSA9IHJlcXVpcmUoJy4uLy4uL21lc3Nlbmdlci9tZXNzYWdlX3NvdXJjZScpXG5cdCwgQ29tcG9uZW50ID0gcmVxdWlyZSgnLi4vY19jbGFzcycpXG5cdCwgZG9tRXZlbnRzQ29uc3RydWN0b3JzID0gcmVxdWlyZSgnLi9kb21fZXZlbnRzX2NvbnN0cnVjdG9ycycpIC8vIFRPRE8gbWVyZ2Ugd2l0aCBET01FdmVudFNvdXJjZSA/P1xuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vLi4vY2hlY2snKVxuXHQsIE1hdGNoID0gY2hlY2suTWF0Y2g7XG5cbnZhciBET01FdmVudHNTb3VyY2UgPSBfLmNyZWF0ZVN1YmNsYXNzKE1lc3NhZ2VTb3VyY2UsICdET01NZXNzYWdlU291cmNlJywgdHJ1ZSk7XG5cblxuXy5leHRlbmRQcm90byhET01FdmVudHNTb3VyY2UsIHtcblx0Ly8gaW1wbGVtZW50aW5nIE1lc3NhZ2VTb3VyY2UgaW50ZXJmYWNlXG5cdGluaXQ6IGluaXREb21FdmVudHNTb3VyY2UsXG5cdHRyYW5zbGF0ZVRvU291cmNlTWVzc2FnZTogdHJhbnNsYXRlVG9Eb21FdmVudCxcbiBcdGFkZFNvdXJjZUxpc3RlbmVyOiBhZGREb21FdmVudExpc3RlbmVyLFxuIFx0cmVtb3ZlU291cmNlTGlzdGVuZXI6IHJlbW92ZURvbUV2ZW50TGlzdGVuZXIsXG4gXHRmaWx0ZXJTb3VyY2VNZXNzYWdlOiBmaWx0ZXJDYXB0dXJlZERvbUV2ZW50LFxuXG4gXHQvLyBjbGFzcyBzcGVjaWZpYyBtZXRob2RzXG4gXHRkb206IGdldERvbUVsZW1lbnQsXG4gXHRoYW5kbGVFdmVudDogaGFuZGxlRXZlbnQsICAvLyBldmVudCBkaXNwYXRjaGVyIC0gYXMgZGVmaW5lZCBieSBFdmVudCBET00gQVBJXG4gXHR0cmlnZ2VyOiB0cmlnZ2VyRG9tRXZlbnRcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IERPTUV2ZW50c1NvdXJjZTtcblxuXG52YXIgdXNlQ2FwdHVyZVBhdHRlcm4gPSAvX19jYXB0dXJlJC87XG5cblxuZnVuY3Rpb24gaW5pdERvbUV2ZW50c1NvdXJjZShob3N0T2JqZWN0LCBwcm94eU1ldGhvZHMsIGNvbXBvbmVudCkge1xuXHRjaGVjayhjb21wb25lbnQsIENvbXBvbmVudCk7XG5cdE1lc3NhZ2VTb3VyY2UucHJvdG90eXBlLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuXHR0aGlzLmNvbXBvbmVudCA9IGNvbXBvbmVudDtcblxuXHQvLyB0aGlzLm1lc3NlbmdlciBpcyBzZXQgYnkgTWVzc2VuZ2VyIGNsYXNzXG59XG5cblxuZnVuY3Rpb24gZ2V0RG9tRWxlbWVudCgpIHtcblx0cmV0dXJuIHRoaXMuY29tcG9uZW50LmVsO1xufVxuXG5cbmZ1bmN0aW9uIHRyYW5zbGF0ZVRvRG9tRXZlbnQobWVzc2FnZSkge1xuXHRpZiAodXNlQ2FwdHVyZVBhdHRlcm4udGVzdChtZXNzYWdlKSlcblx0XHRtZXNzYWdlID0gbWVzc2FnZS5yZXBsYWNlKHVzZUNhcHR1cmVQYXR0ZXJuLCAnJyk7XG5cdHJldHVybiBtZXNzYWdlO1xufVxuXG5cbmZ1bmN0aW9uIGFkZERvbUV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlKSB7XG5cdHRoaXMuZG9tKCkuYWRkRXZlbnRMaXN0ZW5lcihldmVudFR5cGUsIHRoaXMsIHRydWUpO1xufVxuXG5cbmZ1bmN0aW9uIHJlbW92ZURvbUV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlKSB7XG5cdHRoaXMuZG9tKCkucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudFR5cGUsIHRoaXMsIHRydWUpO1xufVxuXG5cbmZ1bmN0aW9uIGZpbHRlckNhcHR1cmVkRG9tRXZlbnQoZXZlbnRUeXBlLCBtZXNzYWdlLCBldmVudCkge1xuXHR2YXIgaXNDYXB0dXJlUGhhc2U7XG5cdGlmICh0eXBlb2Ygd2luZG93ICE9ICd1bmRlZmluZWQnKVxuXHRcdGlzQ2FwdHVyZVBoYXNlID0gZXZlbnQuZXZlbnRQaGFzZSA9PSB3aW5kb3cuRXZlbnQuQ0FQVFVSSU5HX1BIQVNFO1xuXG5cdHJldHVybiAoISBpc0NhcHR1cmVQaGFzZSB8fCAoaXNDYXB0dXJlUGhhc2UgJiYgdXNlQ2FwdHVyZVBhdHRlcm4udGVzdChtZXNzYWdlKSkpO1xufVxuXG5cbi8vIGV2ZW50IGRpc3BhdGNoZXIgLSBhcyBkZWZpbmVkIGJ5IEV2ZW50IERPTSBBUElcbmZ1bmN0aW9uIGhhbmRsZUV2ZW50KGV2ZW50KSB7XG5cdHRoaXMuZGlzcGF0Y2hNZXNzYWdlKGV2ZW50LnR5cGUsIGV2ZW50KTtcblx0cmV0dXJuIHRydWU7XG59XG5cblxuLy8gVE9ETyBtYWtlIHdvcmsgd2l0aCBtZXNzYWdlcyAod2l0aCBfY2FwdHVyZSlcbmZ1bmN0aW9uIHRyaWdnZXJEb21FdmVudChldmVudFR5cGUsIHByb3BlcnRpZXMpIHtcblx0Y2hlY2soZXZlbnRUeXBlLCBTdHJpbmcpO1xuXHRjaGVjayhwcm9wZXJ0aWVzLCBNYXRjaC5PcHRpb25hbChPYmplY3QpKTtcblxuXHR2YXIgRXZlbnRDb25zdHJ1Y3RvciA9IGRvbUV2ZW50c0NvbnN0cnVjdG9yc1tldmVudFR5cGVdO1xuXG5cdGlmICh0eXBlb2YgZXZlbnRDb25zdHJ1Y3RvciAhPSAnZnVuY3Rpb24nKVxuXHRcdHRocm93IG5ldyBFcnJvcigndW5zdXBwb3J0ZWQgZXZlbnQgdHlwZScpO1xuXG5cdC8vIGNoZWNrIGlmIGl0IGlzIGNvcnJlY3Rcblx0aWYgKHR5cGVvZiBwcm9wZXJ0aWVzICE9ICd1bmRlZmluZWQnKVxuXHRcdHByb3BlcnRpZXMudHlwZSA9IGV2ZW50VHlwZTtcblxuXHR2YXIgZG9tRXZlbnQgPSBFdmVudENvbnN0cnVjdG9yKGV2ZW50VHlwZSwgcHJvcGVydGllcyk7XG5cblx0dmFyIG5vdENhbmNlbGxlZCA9IHRoaXMuZG9tKCkuZGlzcGF0Y2hFdmVudChkb21FdmVudCk7XG5cblx0cmV0dXJuIG5vdENhbmNlbGxlZDtcbn0iLCIndXNlIHN0cmljdCc7XG5cbnZhciBDbGFzc1JlZ2lzdHJ5ID0gcmVxdWlyZSgnLi4vcmVnaXN0cnknKVxuXHQsIENvbXBvbmVudCA9IHJlcXVpcmUoJy4vY19jbGFzcycpO1xuXG52YXIgY29tcG9uZW50c1JlZ2lzdHJ5ID0gbmV3IENsYXNzUmVnaXN0cnkoQ29tcG9uZW50KTtcblxuY29tcG9uZW50c1JlZ2lzdHJ5LmFkZChDb21wb25lbnQpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNvbXBvbmVudHNSZWdpc3RyeTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIENvbXBvbmVudCA9IHJlcXVpcmUoJy4uL2NfY2xhc3MnKVxuXHQsIGNvbXBvbmVudHNSZWdpc3RyeSA9IHJlcXVpcmUoJy4uL2NfcmVnaXN0cnknKTtcblxuXG52YXIgVmlldyA9IENvbXBvbmVudC5jcmVhdGVDb21wb25lbnRDbGFzcygnVmlldycsIFsnY29udGFpbmVyJ10pO1xuXG5jb21wb25lbnRzUmVnaXN0cnkuYWRkKFZpZXcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZpZXc7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgnbW9sLXByb3RvJyk7XG5cblxuLy8gbW9kdWxlIGV4cG9ydHMgZXJyb3IgY2xhc3NlcyBmb3IgYWxsIG5hbWVzIGRlZmluZWQgaW4gdGhpcyBhcnJheVxudmFyIGVycm9yQ2xhc3NOYW1lcyA9IFsnQWJzdHJhY3RDbGFzcycsICdNaXhpbicsICdNZXNzZW5nZXInLCAnQ29tcG9uZW50RGF0YVNvdXJjZSddXG5cdCwgZXJyb3JDbGFzc2VzID0ge307XG5cbmVycm9yQ2xhc3NOYW1lcy5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUpIHtcblx0ZXJyb3JDbGFzc2VzW25hbWVdID0gY3JlYXRlRXJyb3JDbGFzcyhuYW1lICsgJ0Vycm9yJyk7XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBlcnJvckNsYXNzZXM7XG5cblxuZnVuY3Rpb24gY3JlYXRlRXJyb3JDbGFzcyhlcnJvckNsYXNzTmFtZSkge1xuXHR2YXIgRXJyb3JDbGFzcztcblx0ZXZhbCgnRXJyb3JDbGFzcyA9IGZ1bmN0aW9uICcgKyBlcnJvckNsYXNzTmFtZSArICcobWVzc2FnZSkgeyBcXFxuXHRcdFx0dGhpcy5uYW1lID0gXCInICsgZXJyb3JDbGFzc05hbWUgKyAnXCI7IFxcXG5cdFx0XHR0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlIHx8IFwiVGhlcmUgd2FzIGFuIGVycm9yXCI7IFxcXG5cdFx0fScpO1xuXHRfLm1ha2VTdWJjbGFzcyhFcnJvckNsYXNzLCBFcnJvcik7XG5cblx0cmV0dXJuIEVycm9yQ2xhc3M7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgnbW9sLXByb3RvJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gRmFjZXQ7XG5cbmZ1bmN0aW9uIEZhY2V0KG93bmVyLCBvcHRpb25zKSB7XG5cdHRoaXMub3duZXIgPSBvd25lcjtcblx0dGhpcy5vcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblx0dGhpcy5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59XG5cbl8uZXh0ZW5kUHJvdG8oRmFjZXQsIHtcblx0aW5pdDogZnVuY3Rpb24oKSB7fVxufSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBGYWNldCA9IHJlcXVpcmUoJy4vZl9jbGFzcycpXG5cdCwgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpXG5cdCwgY2hlY2sgPSByZXF1aXJlKCcuLi9jaGVjaycpXG5cdCwgTWF0Y2ggPSBjaGVjay5NYXRjaDtcblxubW9kdWxlLmV4cG9ydHMgPSBGYWNldGVkT2JqZWN0O1xuXG4vLyBhYnN0cmFjdCBjbGFzcyBmb3IgZmFjZXRlZCBvYmplY3RcbmZ1bmN0aW9uIEZhY2V0ZWRPYmplY3QoZmFjZXRzT3B0aW9ucyAvKiwgb3RoZXIgYXJncyAtIHBhc3NlZCB0byBpbml0IG1ldGhvZCAqLykge1xuXHQvLyBUT0RPIGluc3RhbnRpYXRlIGZhY2V0cyBpZiBjb25maWd1cmF0aW9uIGlzbid0IHBhc3NlZFxuXHQvLyB3cml0ZSBhIHRlc3QgdG8gY2hlY2sgaXRcblx0ZmFjZXRzT3B0aW9ucyA9IGZhY2V0c09wdGlvbnMgPyBfLmNsb25lKGZhY2V0c09wdGlvbnMpIDoge307XG5cblx0dmFyIHRoaXNDbGFzcyA9IHRoaXMuY29uc3RydWN0b3Jcblx0XHQsIGZhY2V0cyA9IHt9O1xuXG5cdGlmICh0aGlzLmNvbnN0cnVjdG9yID09IEZhY2V0ZWRPYmplY3QpXHRcdFxuXHRcdHRocm93IG5ldyBFcnJvcignRmFjZXRlZE9iamVjdCBpcyBhbiBhYnN0cmFjdCBjbGFzcywgY2FuXFwndCBiZSBpbnN0YW50aWF0ZWQnKTtcblx0Ly9pZiAoISB0aGlzQ2xhc3MucHJvdG90eXBlLmZhY2V0cylcblx0Ly9cdHRocm93IG5ldyBFcnJvcignTm8gZmFjZXRzIGRlZmluZWQgaW4gY2xhc3MgJyArIHRoaXMuY29uc3RydWN0b3IubmFtZSk7XG5cdFxuXHQvLyBfLmVhY2hLZXkoZmFjZXRzT3B0aW9ucywgaW5zdGFudGlhdGVGYWNldCwgdGhpcywgdHJ1ZSk7XG5cblx0aWYgKHRoaXMuZmFjZXRzKVxuXHRcdF8uZWFjaEtleSh0aGlzLmZhY2V0cywgaW5zdGFudGlhdGVGYWNldCwgdGhpcywgdHJ1ZSk7XG5cblx0dmFyIHVudXNlZEZhY2V0c05hbWVzID0gT2JqZWN0LmtleXMoZmFjZXRzT3B0aW9ucyk7XG5cdGlmICh1bnVzZWRGYWNldHNOYW1lcy5sZW5ndGgpXG5cdFx0dGhyb3cgbmV3IEVycm9yKCdDb25maWd1cmF0aW9uIGZvciB1bmtub3duIGZhY2V0KHMpIHBhc3NlZDogJyArIHVudXNlZEZhY2V0c05hbWVzLmpvaW4oJywgJykpO1xuXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRoaXMsIGZhY2V0cyk7XG5cblx0Ly8gY2FsbGluZyBpbml0IGlmIGl0IGlzIGRlZmluZWQgaW4gdGhlIGNsYXNzXG5cdGlmICh0aGlzLmluaXQpXG5cdFx0dGhpcy5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cblx0ZnVuY3Rpb24gaW5zdGFudGlhdGVGYWNldCgvKiBmYWNldE9wdHMgKi8gRmFjZXRDbGFzcywgZmN0KSB7XG5cdFx0Ly8gdmFyIEZhY2V0Q2xhc3MgPSB0aGlzLmZhY2V0c1tmY3RdO1xuXHRcdHZhciBmYWNldE9wdHMgPSBmYWNldHNPcHRpb25zW2ZjdF07XG5cdFx0ZGVsZXRlIGZhY2V0c09wdGlvbnNbZmN0XTtcblxuXHRcdGZhY2V0c1tmY3RdID0ge1xuXHRcdFx0ZW51bWVyYWJsZTogZmFsc2UsXG5cdFx0XHR2YWx1ZTogbmV3IEZhY2V0Q2xhc3ModGhpcywgZmFjZXRPcHRzKVxuXHRcdH07XG5cdH1cbn1cblxuXG5fLmV4dGVuZFByb3RvKEZhY2V0ZWRPYmplY3QsIHtcblx0YWRkRmFjZXQ6IGFkZEZhY2V0XG59KTtcblxuXG5mdW5jdGlvbiBhZGRGYWNldChGYWNldENsYXNzLCBmYWNldE9wdHMsIGZhY2V0TmFtZSkge1xuXHRjaGVjayhGYWNldENsYXNzLCBGdW5jdGlvbik7XG5cdGNoZWNrKGZhY2V0TmFtZSwgTWF0Y2guT3B0aW9uYWwoU3RyaW5nKSk7XG5cblx0ZmFjZXROYW1lID0gXy5maXJzdExvd2VyQ2FzZShmYWNldE5hbWUgfHwgRmFjZXRDbGFzcy5uYW1lKTtcblxuXHR2YXIgcHJvdG9GYWNldHMgPSB0aGlzLmNvbnN0cnVjdG9yLnByb3RvdHlwZS5mYWNldHM7XG5cblx0aWYgKHByb3RvRmFjZXRzICYmIHByb3RvRmFjZXRzW2ZhY2V0TmFtZV0pXG5cdFx0dGhyb3cgbmV3IEVycm9yKCdmYWNldCAnICsgZmFjZXROYW1lICsgJyBpcyBhbHJlYWR5IHBhcnQgb2YgdGhlIGNsYXNzICcgKyB0aGlzLmNvbnN0cnVjdG9yLm5hbWUpO1xuXG5cdGlmICh0aGlzW2ZhY2V0TmFtZV0pXG5cdFx0dGhyb3cgbmV3IEVycm9yKCdmYWNldCAnICsgZmFjZXROYW1lICsgJyBpcyBhbHJlYWR5IHByZXNlbnQgaW4gb2JqZWN0Jyk7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIGZhY2V0TmFtZSwge1xuXHRcdGVudW1lcmFibGU6IGZhbHNlLFxuXHRcdHZhbHVlOiBuZXcgRmFjZXRDbGFzcyh0aGlzLCBmYWNldE9wdHMpXG5cdH0pO1xufVxuXG5cbi8vIGZhY3RvcnkgdGhhdCBjcmVhdGVzIGNsYXNzZXMgKGNvbnN0cnVjdG9ycykgZnJvbSB0aGUgbWFwIG9mIGZhY2V0c1xuLy8gdGhlc2UgY2xhc3NlcyBpbmhlcml0IGZyb20gRmFjZXRlZE9iamVjdFxuRmFjZXRlZE9iamVjdC5jcmVhdGVGYWNldGVkQ2xhc3MgPSBmdW5jdGlvbiAobmFtZSwgZmFjZXRzQ2xhc3Nlcykge1xuXHRjaGVjayhuYW1lLCBTdHJpbmcpO1xuXHRjaGVjayhmYWNldHNDbGFzc2VzLCBNYXRjaC5PYmplY3RIYXNoKEZ1bmN0aW9uIC8qIE1hdGNoLlN1YmNsYXNzKEZhY2V0LCB0cnVlKSBUT0RPIC0gZml4ICovKSk7XG5cblx0dmFyIEZhY2V0ZWRDbGFzcyA9IF8uY3JlYXRlU3ViY2xhc3ModGhpcywgbmFtZSwgdHJ1ZSk7XG5cblx0Xy5leHRlbmRQcm90byhGYWNldGVkQ2xhc3MsIHtcblx0XHRmYWNldHM6IGZhY2V0c0NsYXNzZXNcblx0fSk7XG5cdHJldHVybiBGYWNldGVkQ2xhc3M7XG59O1xuXG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBMb2dnZXIgPSByZXF1aXJlKCcuL2xvZ2dlcl9jbGFzcycpO1xuXG52YXIgbG9nZ2VyID0gbmV3IExvZ2dlcih7IGxldmVsOiAzIH0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGxvZ2dlcjtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKTtcblxuXG4vKipcbiAqIExvZyBsZXZlbHMuXG4gKi9cblxudmFyIGxldmVscyA9IFtcbiAgICAnZXJyb3InLFxuICAgICd3YXJuJyxcbiAgICAnaW5mbycsXG4gICAgJ2RlYnVnJ1xuXTtcblxudmFyIG1heExldmVsTGVuZ3RoID0gTWF0aC5tYXguYXBwbHkoTWF0aCwgbGV2ZWxzLm1hcChmdW5jdGlvbihsZXZlbCkgeyByZXR1cm4gbGV2ZWwubGVuZ3RoOyB9KSk7XG5cbi8qKlxuICogQ29sb3JzIGZvciBsb2cgbGV2ZWxzLlxuICovXG5cbnZhciBjb2xvcnMgPSBbXG4gICAgMzEsXG4gICAgMzMsXG4gICAgMzYsXG4gICAgOTBcbl07XG5cbi8qKlxuICogUGFkcyB0aGUgbmljZSBvdXRwdXQgdG8gdGhlIGxvbmdlc3QgbG9nIGxldmVsLlxuICovXG5cbmZ1bmN0aW9uIHBhZCAoc3RyKSB7XG4gICAgaWYgKHN0ci5sZW5ndGggPCBtYXhMZXZlbExlbmd0aClcbiAgICAgICAgcmV0dXJuIHN0ciArIG5ldyBBcnJheShtYXhMZXZlbExlbmd0aCAtIHN0ci5sZW5ndGggKyAxKS5qb2luKCcgJyk7XG5cbiAgICByZXR1cm4gc3RyO1xufTtcblxuLyoqXG4gKiBMb2dnZXIgKGNvbnNvbGUpLlxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cblxudmFyIExvZ2dlciA9IGZ1bmN0aW9uIChvcHRzKSB7XG4gICAgb3B0cyA9IG9wdHMgfHwge31cbiAgICB0aGlzLmNvbG9ycyA9IGZhbHNlICE9PSBvcHRzLmNvbG9ycztcbiAgICB0aGlzLmxldmVsID0gb3B0cy5sZXZlbCB8fCAzO1xuICAgIHRoaXMuZW5hYmxlZCA9IG9wdHMuZW5hYmxlZCB8fCB0cnVlO1xuICAgIHRoaXMubG9nUHJlZml4ID0gb3B0cy5sb2dQcmVmaXggfHwgJyc7XG4gICAgdGhpcy5sb2dQcmVmaXhDb2xvciA9IG9wdHMubG9nUHJlZml4Q29sb3I7XG59O1xuXG5cbi8qKlxuICogTG9nIG1ldGhvZC5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkxvZ2dlci5wcm90b3R5cGUubG9nID0gZnVuY3Rpb24gKHR5cGUpIHtcbiAgICB2YXIgaW5kZXggPSBsZXZlbHMuaW5kZXhPZih0eXBlKTtcblxuICAgIGlmIChpbmRleCA+IHRoaXMubGV2ZWwgfHwgISB0aGlzLmVuYWJsZWQpXG4gICAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgY29uc29sZS5sb2cuYXBwbHkoXG4gICAgICAgICAgY29uc29sZVxuICAgICAgICAsIFt0aGlzLmxvZ1ByZWZpeENvbG9yXG4gICAgICAgICAgICAgPyAnICAgXFx4MUJbJyArIHRoaXMubG9nUHJlZml4Q29sb3IgKyAnbScgKyB0aGlzLmxvZ1ByZWZpeCArICcgIC1cXHgxQlszOW0nXG4gICAgICAgICAgICAgOiB0aGlzLmxvZ1ByZWZpeFxuICAgICAgICAgICx0aGlzLmNvbG9yc1xuICAgICAgICAgICAgID8gJyBcXHgxQlsnICsgY29sb3JzW2luZGV4XSArICdtJyArIHBhZCh0eXBlKSArICcgLVxceDFCWzM5bSdcbiAgICAgICAgICAgICA6IHR5cGUgKyAnOidcbiAgICAgICAgICBdLmNvbmNhdChfLnRvQXJyYXkoYXJndW1lbnRzKS5zbGljZSgxKSlcbiAgICApO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEdlbmVyYXRlIG1ldGhvZHMuXG4gKi9cblxubGV2ZWxzLmZvckVhY2goZnVuY3Rpb24gKG5hbWUpIHtcbiAgICBMb2dnZXIucHJvdG90eXBlW25hbWVdID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmxvZy5hcHBseSh0aGlzLCBbbmFtZV0uY29uY2F0KF8udG9BcnJheShhcmd1bWVudHMpKSk7XG4gICAgfTtcbn0pO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gTG9nZ2VyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgTWl4aW4gPSByZXF1aXJlKCcuLi9taXhpbicpXG5cdCwgTWVzc2FnZVNvdXJjZSA9IHJlcXVpcmUoJy4vbWVzc2FnZV9zb3VyY2UnKVxuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vY2hlY2snKVxuXHQsIE1hdGNoID0gY2hlY2suTWF0Y2hcblx0LCBNZXNzZW5nZXJFcnJvciA9IHJlcXVpcmUoJy4uL2Vycm9yJykuTWVzc2VuZ2VyO1xuXG5cbnZhciBldmVudHNTcGxpdFJlZ0V4cCA9IC9cXHMqKD86XFwsfFxccylcXHMqLztcblxuXG52YXIgTWVzc2VuZ2VyID0gXy5jcmVhdGVTdWJjbGFzcyhNaXhpbiwgJ01lc3NlbmdlcicpO1xuXG5fLmV4dGVuZFByb3RvKE1lc3Nlbmdlciwge1xuXHRpbml0OiBpbml0TWVzc2VuZ2VyLCAvLyBjYWxsZWQgYnkgTWl4aW4gKHN1cGVyY2xhc3MpXG5cdG9uTWVzc2FnZTogcmVnaXN0ZXJTdWJzY3JpYmVyLFxuXHRvZmZNZXNzYWdlOiByZW1vdmVTdWJzY3JpYmVyLFxuXHRvbk1lc3NhZ2VzOiByZWdpc3RlclN1YnNjcmliZXJzLFxuXHRvZmZNZXNzYWdlczogcmVtb3ZlU3Vic2NyaWJlcnMsXG5cdHBvc3RNZXNzYWdlOiBwb3N0TWVzc2FnZSxcblx0Z2V0U3Vic2NyaWJlcnM6IGdldE1lc3NhZ2VTdWJzY3JpYmVycyxcblx0X2Nob29zZVN1YnNjcmliZXJzSGFzaDogX2Nob29zZVN1YnNjcmliZXJzSGFzaCxcblx0X3JlZ2lzdGVyU3Vic2NyaWJlcjogX3JlZ2lzdGVyU3Vic2NyaWJlcixcblx0X3JlbW92ZVN1YnNjcmliZXI6IF9yZW1vdmVTdWJzY3JpYmVyLFxuXHRfcmVtb3ZlQWxsU3Vic2NyaWJlcnM6IF9yZW1vdmVBbGxTdWJzY3JpYmVycyxcblx0X2NhbGxQYXR0ZXJuU3Vic2NyaWJlcnM6IF9jYWxsUGF0dGVyblN1YnNjcmliZXJzLFxuXHRfY2FsbFN1YnNjcmliZXJzOiBfY2FsbFN1YnNjcmliZXJzXG59KTtcblxuXG5NZXNzZW5nZXIuZGVmYXVsdE1ldGhvZHMgPSB7XG5cdG9uTWVzc2FnZTogJ29uTWVzc2FnZScsXG5cdG9mZk1lc3NhZ2U6ICdvZmZNZXNzYWdlJyxcblx0b25NZXNzYWdlczogJ29uTWVzc2FnZXMnLFxuXHRvZmZNZXNzYWdlczogJ29mZk1lc3NhZ2VzJyxcblx0cG9zdE1lc3NhZ2U6ICdwb3N0TWVzc2FnZScsXG5cdGdldFN1YnNjcmliZXJzOiAnZ2V0U3Vic2NyaWJlcnMnXG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gTWVzc2VuZ2VyO1xuXG5cbmZ1bmN0aW9uIGluaXRNZXNzZW5nZXIoaG9zdE9iamVjdCwgcHJveHlNZXRob2RzLCBtZXNzYWdlU291cmNlKSB7XG5cdGNoZWNrKG1lc3NhZ2VTb3VyY2UsIE1hdGNoLk9wdGlvbmFsKE1lc3NhZ2VTb3VyY2UpKTtcblxuXHQvLyBob3N0T2JqZWN0IGFuZCBwcm94eU1ldGhvZHMgYXJlIHVzZWQgaW4gTWl4aW5cbiBcdC8vIG1lc3NlbmdlciBkYXRhXG4gXHRPYmplY3QuZGVmaW5lUHJvcGVydGllcyh0aGlzLCB7XG4gXHRcdF9tZXNzYWdlU3Vic2NyaWJlcnM6IHsgdmFsdWU6IHt9IH0sXG4gXHRcdF9wYXR0ZXJuTWVzc2FnZVN1YnNjcmliZXJzOiB7IHZhbHVlOiB7fSB9LFxuIFx0XHRfbWVzc2FnZVNvdXJjZTogeyB2YWx1ZTogbWVzc2FnZVNvdXJjZSB9XG4gXHR9KTtcblxuIFx0aWYgKG1lc3NhZ2VTb3VyY2UpXG4gXHRcdG1lc3NhZ2VTb3VyY2UubWVzc2VuZ2VyID0gdGhpcztcbn1cblxuXG5mdW5jdGlvbiByZWdpc3RlclN1YnNjcmliZXIobWVzc2FnZXMsIHN1YnNjcmliZXIpIHtcblx0Y2hlY2sobWVzc2FnZXMsIE1hdGNoLk9uZU9mKFN0cmluZywgW1N0cmluZ10sIFJlZ0V4cCkpO1xuXHRjaGVjayhzdWJzY3JpYmVyLCBGdW5jdGlvbik7IFxuXG5cdGlmICh0eXBlb2YgbWVzc2FnZXMgPT0gJ3N0cmluZycpXG5cdFx0bWVzc2FnZXMgPSBtZXNzYWdlcy5zcGxpdChldmVudHNTcGxpdFJlZ0V4cCk7XG5cblx0dmFyIHN1YnNjcmliZXJzSGFzaCA9IHRoaXMuX2Nob29zZVN1YnNjcmliZXJzSGFzaChtZXNzYWdlcyk7XG5cblx0aWYgKG1lc3NhZ2VzIGluc3RhbmNlb2YgUmVnRXhwKVxuXHRcdHJldHVybiB0aGlzLl9yZWdpc3RlclN1YnNjcmliZXIoc3Vic2NyaWJlcnNIYXNoLCBtZXNzYWdlcywgc3Vic2NyaWJlcik7XG5cblx0ZWxzZSB7XG5cdFx0dmFyIHdhc1JlZ2lzdGVyZWQgPSBmYWxzZTtcblxuXHRcdG1lc3NhZ2VzLmZvckVhY2goZnVuY3Rpb24obWVzc2FnZSkge1xuXHRcdFx0dmFyIG5vdFlldFJlZ2lzdGVyZWQgPSB0aGlzLl9yZWdpc3RlclN1YnNjcmliZXIoc3Vic2NyaWJlcnNIYXNoLCBtZXNzYWdlLCBzdWJzY3JpYmVyKTtcdFx0XHRcblx0XHRcdHdhc1JlZ2lzdGVyZWQgPSB3YXNSZWdpc3RlcmVkIHx8IG5vdFlldFJlZ2lzdGVyZWQ7XHRcdFx0XG5cdFx0fSwgdGhpcyk7XG5cblx0XHRyZXR1cm4gd2FzUmVnaXN0ZXJlZDtcblx0fVxufVxuXG5cbmZ1bmN0aW9uIF9yZWdpc3RlclN1YnNjcmliZXIoc3Vic2NyaWJlcnNIYXNoLCBtZXNzYWdlLCBzdWJzY3JpYmVyKSB7XG5cdGlmICghIChzdWJzY3JpYmVyc0hhc2hbbWVzc2FnZV0gJiYgc3Vic2NyaWJlcnNIYXNoW21lc3NhZ2VdLmxlbmd0aCkpIHtcblx0XHRzdWJzY3JpYmVyc0hhc2hbbWVzc2FnZV0gPSBbXTtcblx0XHR2YXIgbm9TdWJzY3JpYmVycyA9IHRydWU7XG5cdFx0aWYgKHRoaXMuX21lc3NhZ2VTb3VyY2UpXG5cdFx0XHR0aGlzLl9tZXNzYWdlU291cmNlLm9uU3Vic2NyaWJlckFkZGVkKG1lc3NhZ2UpO1xuXHR9XG5cblx0dmFyIG1zZ1N1YnNjcmliZXJzID0gc3Vic2NyaWJlcnNIYXNoW21lc3NhZ2VdO1xuXHR2YXIgbm90WWV0UmVnaXN0ZXJlZCA9IG5vU3Vic2NyaWJlcnMgfHwgbXNnU3Vic2NyaWJlcnMuaW5kZXhPZihzdWJzY3JpYmVyKSA9PSAtMTtcblxuXHRpZiAobm90WWV0UmVnaXN0ZXJlZClcblx0XHRtc2dTdWJzY3JpYmVycy5wdXNoKHN1YnNjcmliZXIpO1xuXG5cdHJldHVybiBub3RZZXRSZWdpc3RlcmVkO1xufVxuXG5cbmZ1bmN0aW9uIHJlZ2lzdGVyU3Vic2NyaWJlcnMobWVzc2FnZVN1YnNjcmliZXJzKSB7XG5cdGNoZWNrKG1lc3NhZ2VTdWJzY3JpYmVycywgTWF0Y2guT2JqZWN0SGFzaChGdW5jdGlvbikpO1xuXG5cdHZhciBub3RZZXRSZWdpc3RlcmVkTWFwID0gXy5tYXBLZXlzKG1lc3NhZ2VTdWJzY3JpYmVycywgZnVuY3Rpb24oc3Vic2NyaWJlciwgbWVzc2FnZXMpIHtcblx0XHRyZXR1cm4gdGhpcy5vbk1lc3NhZ2UobWVzc2FnZXMsIHN1YnNjcmliZXIpXG5cdH0sIHRoaXMpO1xuXG5cdHJldHVybiBub3RZZXRSZWdpc3RlcmVkTWFwO1xufVxuXG5cbi8vIHJlbW92ZXMgYWxsIHN1YnNjcmliZXJzIGZvciB0aGUgbWVzc2FnZSBpZiBzdWJzY3JpYmVyIGlzbid0IHN1cHBsaWVkXG5mdW5jdGlvbiByZW1vdmVTdWJzY3JpYmVyKG1lc3NhZ2VzLCBzdWJzY3JpYmVyKSB7XG5cdGNoZWNrKG1lc3NhZ2VzLCBNYXRjaC5PbmVPZihTdHJpbmcsIFtTdHJpbmddLCBSZWdFeHApKTtcblx0Y2hlY2soc3Vic2NyaWJlciwgTWF0Y2guT3B0aW9uYWwoRnVuY3Rpb24pKTsgXG5cblx0aWYgKHR5cGVvZiBtZXNzYWdlcyA9PSAnc3RyaW5nJylcblx0XHRtZXNzYWdlcyA9IG1lc3NhZ2VzLnNwbGl0KGV2ZW50c1NwbGl0UmVnRXhwKTtcblxuXHR2YXIgc3Vic2NyaWJlcnNIYXNoID0gdGhpcy5fY2hvb3NlU3Vic2NyaWJlcnNIYXNoKG1lc3NhZ2VzKTtcblxuXHRpZiAobWVzc2FnZXMgaW5zdGFuY2VvZiBSZWdFeHApXG5cdFx0cmV0dXJuIHRoaXMuX3JlbW92ZVN1YnNjcmliZXIoc3Vic2NyaWJlcnNIYXNoLCBtZXNzYWdlcywgc3Vic2NyaWJlcik7XG5cblx0ZWxzZSB7XG5cdFx0dmFyIHdhc1JlbW92ZWQgPSBmYWxzZTtcblxuXHRcdG1lc3NhZ2VzLmZvckVhY2goZnVuY3Rpb24obWVzc2FnZSkge1xuXHRcdFx0dmFyIHN1YnNjcmliZXJSZW1vdmVkID0gdGhpcy5fcmVtb3ZlU3Vic2NyaWJlcihzdWJzY3JpYmVyc0hhc2gsIG1lc3NhZ2UsIHN1YnNjcmliZXIpO1x0XHRcdFxuXHRcdFx0d2FzUmVtb3ZlZCA9IHdhc1JlbW92ZWQgfHwgc3Vic2NyaWJlclJlbW92ZWQ7XHRcdFx0XG5cdFx0fSwgdGhpcyk7XG5cblx0XHRyZXR1cm4gd2FzUmVtb3ZlZDtcblx0fVxufVxuXG5cbmZ1bmN0aW9uIF9yZW1vdmVTdWJzY3JpYmVyKHN1YnNjcmliZXJzSGFzaCwgbWVzc2FnZSwgc3Vic2NyaWJlcikge1xuXHR2YXIgbXNnU3Vic2NyaWJlcnMgPSBzdWJzY3JpYmVyc0hhc2hbbWVzc2FnZV07XG5cdGlmICghIG1zZ1N1YnNjcmliZXJzIHx8ICEgbXNnU3Vic2NyaWJlcnMubGVuZ3RoKVxuXHRcdHJldHVybiBmYWxzZTsgLy8gbm90aGluZyByZW1vdmVkXG5cblx0aWYgKHN1YnNjcmliZXIpIHtcblx0XHR2YXIgc3Vic2NyaWJlckluZGV4ID0gbXNnU3Vic2NyaWJlcnMuaW5kZXhPZihzdWJzY3JpYmVyKTtcblx0XHRpZiAoc3Vic2NyaWJlckluZGV4ID09IC0xKSBcblx0XHRcdHJldHVybiBmYWxzZTsgLy8gbm90aGluZyByZW1vdmVkXG5cdFx0bXNnU3Vic2NyaWJlcnMuc3BsaWNlKHN1YnNjcmliZXJJbmRleCwgMSk7XG5cdFx0aWYgKCEgbXNnU3Vic2NyaWJlcnMubGVuZ3RoKVxuXHRcdFx0dGhpcy5fcmVtb3ZlQWxsU3Vic2NyaWJlcnMoc3Vic2NyaWJlcnNIYXNoLCBtZXNzYWdlKTtcblxuXHR9IGVsc2UgXG5cdFx0dGhpcy5fcmVtb3ZlQWxsU3Vic2NyaWJlcnMoc3Vic2NyaWJlcnNIYXNoLCBtZXNzYWdlKTtcblxuXHRyZXR1cm4gdHJ1ZTsgLy8gc3Vic2NyaWJlcihzKSByZW1vdmVkXG59XG5cblxuZnVuY3Rpb24gX3JlbW92ZUFsbFN1YnNjcmliZXJzKHN1YnNjcmliZXJzSGFzaCwgbWVzc2FnZSkge1xuXHRkZWxldGUgc3Vic2NyaWJlcnNIYXNoW21lc3NhZ2VdO1xuXHRpZiAodGhpcy5fbWVzc2FnZVNvdXJjZSlcblx0XHR0aGlzLl9tZXNzYWdlU291cmNlLm9uU3Vic2NyaWJlclJlbW92ZWQobWVzc2FnZSk7XG59XG5cblxuZnVuY3Rpb24gcmVtb3ZlU3Vic2NyaWJlcnMobWVzc2FnZVN1YnNjcmliZXJzKSB7XG5cdGNoZWNrKG1lc3NhZ2VTdWJzY3JpYmVycywgTWF0Y2guT2JqZWN0SGFzaChGdW5jdGlvbikpO1xuXG5cdHZhciBzdWJzY3JpYmVyUmVtb3ZlZE1hcCA9IF8ubWFwS2V5cyhtZXNzYWdlU3Vic2NyaWJlcnMsIGZ1bmN0aW9uKHN1YnNjcmliZXIsIG1lc3NhZ2VzKSB7XG5cdFx0cmV0dXJuIHRoaXMub2ZmTWVzc2FnZXMobWVzc2FnZXMsIHN1YnNjcmliZXIpXG5cdH0sIHRoaXMpO1xuXG5cdHJldHVybiBzdWJzY3JpYmVyUmVtb3ZlZE1hcDtcdFxufVxuXG5cbi8vIFRPRE8gLSBzZW5kIGV2ZW50IHRvIG1lc3NhZ2VTb3VyY2VcblxuXG5mdW5jdGlvbiBwb3N0TWVzc2FnZShtZXNzYWdlLCBkYXRhKSB7XG5cdGNoZWNrKG1lc3NhZ2UsIE1hdGNoLk9uZU9mKFN0cmluZywgUmVnRXhwKSk7XG5cblx0dmFyIHN1YnNjcmliZXJzSGFzaCA9IHRoaXMuX2Nob29zZVN1YnNjcmliZXJzSGFzaChtZXNzYWdlKTtcblx0dmFyIG1zZ1N1YnNjcmliZXJzID0gc3Vic2NyaWJlcnNIYXNoW21lc3NhZ2VdO1xuXG5cdHRoaXMuX2NhbGxTdWJzY3JpYmVycyhtZXNzYWdlLCBkYXRhLCBtc2dTdWJzY3JpYmVycyk7XG5cblx0aWYgKHR5cGVvZiBtZXNzYWdlID09ICdzdHJpbmcnKVxuXHRcdHRoaXMuX2NhbGxQYXR0ZXJuU3Vic2NyaWJlcnMobWVzc2FnZSwgZGF0YSk7XG59XG5cblxuZnVuY3Rpb24gX2NhbGxQYXR0ZXJuU3Vic2NyaWJlcnMobWVzc2FnZSwgZGF0YSkge1xuXHRfLmVhY2hLZXkodGhpcy5fcGF0dGVybk1lc3NhZ2VTdWJzY3JpYmVycywgXG5cdFx0ZnVuY3Rpb24ocGF0dGVyblN1YnNjcmliZXJzLCBwYXR0ZXJuKSB7XG5cdFx0XHRpZiAocGF0dGVybi50ZXN0KG1lc3NhZ2UpKVxuXHRcdFx0XHR0aGlzLl9jYWxsU3Vic2NyaWJlcnMobWVzc2FnZSwgZGF0YSwgcGF0dGVyblN1YnNjcmliZXJzKTtcblx0XHR9XG5cdCwgdGhpcyk7XG59XG5cblxuZnVuY3Rpb24gX2NhbGxTdWJzY3JpYmVycyhtZXNzYWdlLCBkYXRhLCBtc2dTdWJzY3JpYmVycykge1xuXHRpZiAobXNnU3Vic2NyaWJlcnMgJiYgbXNnU3Vic2NyaWJlcnMubGVuZ3RoKVxuXHRcdG1zZ1N1YnNjcmliZXJzLmZvckVhY2goZnVuY3Rpb24oc3Vic2NyaWJlcikge1xuXHRcdFx0c3Vic2NyaWJlci5jYWxsKHRoaXMsIG1lc3NhZ2UsIGRhdGEpO1xuXHRcdH0sIHRoaXMpO1xufVxuXG5cbmZ1bmN0aW9uIGdldE1lc3NhZ2VTdWJzY3JpYmVycyhtZXNzYWdlLCBpbmNsdWRlUGF0dGVyblN1YnNjcmliZXJzKSB7XG5cdGNoZWNrKG1lc3NhZ2UsIE1hdGNoLk9uZU9mKFN0cmluZywgUmVnRXhwKSk7XG5cblx0dmFyIHN1YnNjcmliZXJzSGFzaCA9IHRoaXMuX2Nob29zZVN1YnNjcmliZXJzSGFzaChtZXNzYWdlKTtcblx0dmFyIG1zZ1N1YnNjcmliZXJzID0gc3Vic2NyaWJlcnNIYXNoW21lc3NhZ2VdXG5cdFx0XHRcdFx0XHRcdD8gW10uY29uY2F0KHN1YnNjcmliZXJzSGFzaFttZXNzYWdlXSlcblx0XHRcdFx0XHRcdFx0OiBbXTtcblxuXHQvLyBwYXR0ZXJuIHN1YnNjcmliZXJzIGFyZSBpbmN1ZGVkIGJ5IGRlZmF1bHRcblx0aWYgKGluY2x1ZGVQYXR0ZXJuU3Vic2NyaWJlcnMgIT09IGZhbHNlICYmIHR5cGVvZiBtZXNzYWdlID09ICdzdHJpbmcnKSB7XG5cdFx0Xy5lYWNoS2V5KHRoaXMuX3BhdHRlcm5NZXNzYWdlU3Vic2NyaWJlcnMsIFxuXHRcdFx0ZnVuY3Rpb24ocGF0dGVyblN1YnNjcmliZXJzLCBwYXR0ZXJuKSB7XG5cdFx0XHRcdGlmIChwYXR0ZXJuU3Vic2NyaWJlcnMgJiYgcGF0dGVyblN1YnNjcmliZXJzLmxlbmd0aFxuXHRcdFx0XHRcdFx0JiYgcGF0dGVybi50ZXN0KG1lc3NhZ2UpKVxuXHRcdFx0XHRcdF8uYXBwZW5kQXJyYXkobXNnU3Vic2NyaWJlcnMsIHBhdHRlcm5TdWJzY3JpYmVycyk7XG5cdFx0XHR9XG5cdFx0KTtcblx0fVxuXG5cdHJldHVybiBtc2dTdWJzY3JpYmVycy5sZW5ndGhcblx0XHRcdFx0PyBtc2dTdWJzY3JpYmVyc1xuXHRcdFx0XHQ6IHVuZGVmaW5lZDtcbn1cblxuXG5mdW5jdGlvbiBfY2hvb3NlU3Vic2NyaWJlcnNIYXNoKG1lc3NhZ2UpIHtcblx0cmV0dXJuIG1lc3NhZ2UgaW5zdGFuY2VvZiBSZWdFeHBcblx0XHRcdFx0PyB0aGlzLl9wYXR0ZXJuTWVzc2FnZVN1YnNjcmliZXJzXG5cdFx0XHRcdDogdGhpcy5fbWVzc2FnZVN1YnNjcmliZXJzO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgTWl4aW4gPSByZXF1aXJlKCcuLi9taXhpbicpXG5cdCwgbG9nZ2VyID0gcmVxdWlyZSgnLi4vbG9nZ2VyJylcblx0LCBBYnNjdHJhY3RDbGFzc0Vycm9yID0gcmVxdWlyZSgnLi4vZXJyb3InKS5BYnNjdHJhY3RDbGFzc1xuXHQsIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKTtcblxuLy8gYW4gYWJzdHJhY3QgY2xhc3MgZm9yIGRpc3BhdGNoaW5nIGV4dGVybmFsIHRvIGludGVybmFsIGV2ZW50c1xudmFyIE1lc3NhZ2VTb3VyY2UgPSBfLmNyZWF0ZVN1YmNsYXNzKE1peGluLCAnTWVzc2FnZVNvdXJjZScsIHRydWUpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1lc3NhZ2VTb3VyY2U7XG5cblxuXy5leHRlbmRQcm90byhNZXNzYWdlU291cmNlLCB7XG5cdC8vIGluaXRpYWxpemVzIG1lc3NhZ2VTb3VyY2UgLSBjYWxsZWQgYnkgTWl4aW4gc3VwZXJjbGFzc1xuXHRpbml0OiBpbml0TWVzc2FnZVNvdXJjZSxcblxuXHQvLyBjYWxsZWQgYnkgTWVzc2VuZ2VyIHRvIG5vdGlmeSB3aGVuIHRoZSBmaXJzdCBzdWJzY3JpYmVyIGZvciBhbiBpbnRlcm5hbCBtZXNzYWdlIHdhcyBhZGRlZFxuXHRvblN1YnNjcmliZXJBZGRlZDogb25TdWJzY3JpYmVyQWRkZWQsXG5cblx0Ly8gY2FsbGVkIGJ5IE1lc3NlbmdlciB0byBub3RpZnkgd2hlbiB0aGUgbGFzdCBzdWJzY3JpYmVyIGZvciBhbiBpbnRlcm5hbCBtZXNzYWdlIHdhcyByZW1vdmVkXG4gXHRvblN1YnNjcmliZXJSZW1vdmVkOiBvblN1YnNjcmliZXJSZW1vdmVkLCBcblxuIFx0Ly8gZGlzcGF0Y2hlcyBzb3VyY2UgbWVzc2FnZVxuIFx0ZGlzcGF0Y2hNZXNzYWdlOiBkaXNwYXRjaFNvdXJjZU1lc3NhZ2UsXG5cblx0Ly8gZmlsdGVycyBzb3VyY2UgbWVzc2FnZSBiYXNlZCBvbiB0aGUgZGF0YSBvZiB0aGUgbWVzc2FnZSAtIHNob3VsZCBiZSBpbXBsZW1lbnRlZCBpbiBzdWJjbGFzc1xuXHRmaWx0ZXJTb3VyY2VNZXNzYWdlOiBkaXNwYXRjaEFsbFNvdXJjZU1lc3NhZ2VzLFxuXG4gXHQvLyAqKipcbiBcdC8vIE1ldGhvZHMgYmVsb3cgbXVzdCBiZSBpbXBsZW1lbnRlZCBpbiBzdWJjbGFzc1xuIFx0XG5cdC8vIGNvbnZlcnRzIGludGVybmFsIG1lc3NhZ2UgdHlwZSB0byBleHRlcm5hbCBtZXNzYWdlIHR5cGUgLSBzaG91bGQgYmUgaW1wbGVtZW50ZWQgaW4gc3ViY2xhc3Ncblx0dHJhbnNsYXRlVG9Tb3VyY2VNZXNzYWdlOiB0b0JlSW1wbGVtZW50ZWQsXG5cbiBcdC8vIGFkZHMgbGlzdGVuZXIgdG8gZXh0ZXJuYWwgbWVzc2FnZSAtIHNob3VsZCBiZSBpbXBsZW1lbnRlZCBieSBzdWJjbGFzc1xuIFx0YWRkU291cmNlTGlzdGVuZXI6IHRvQmVJbXBsZW1lbnRlZCxcblxuIFx0Ly8gcmVtb3ZlcyBsaXN0ZW5lciBmcm9tIGV4dGVybmFsIG1lc3NhZ2UgLSBzaG91bGQgYmUgaW1wbGVtZW50ZWQgYnkgc3ViY2xhc3NcbiBcdHJlbW92ZVNvdXJjZUxpc3RlbmVyOiB0b0JlSW1wbGVtZW50ZWQsXG59KTtcblxuXG5mdW5jdGlvbiBpbml0TWVzc2FnZVNvdXJjZSgpIHtcblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdfaW50ZXJuYWxNZXNzYWdlcycsIHsgdmFsdWU6IHt9IH0pO1xufVxuXG5cbmZ1bmN0aW9uIG9uU3Vic2NyaWJlckFkZGVkKG1lc3NhZ2UpIHtcblx0dmFyIHNvdXJjZU1lc3NhZ2UgPSB0aGlzLnRyYW5zbGF0ZVRvU291cmNlTWVzc2FnZShtZXNzYWdlKTtcblxuXHRpZiAoISB0aGlzLl9pbnRlcm5hbE1lc3NhZ2VzLmhhc093blByb3BlcnR5KHNvdXJjZU1lc3NhZ2UpKSB7XG5cdFx0dGhpcy5hZGRTb3VyY2VMaXN0ZW5lcihzb3VyY2VNZXNzYWdlKTtcblx0XHR0aGlzLl9pbnRlcm5hbE1lc3NhZ2VzW3NvdXJjZU1lc3NhZ2VdID0gW107XG5cdH1cblx0dmFyIGludGVybmFsTXNncyA9IHRoaXMuX2ludGVybmFsTWVzc2FnZXNbc291cmNlTWVzc2FnZV07XG5cblx0aWYgKGludGVybmFsTXNncy5pbmRleE9mKG1lc3NhZ2UpID09IC0xKVxuXHRcdGludGVybmFsTXNncy5wdXNoKG1lc3NhZ2UpO1xuXHRlbHNlXG5cdFx0bG9nZ2VyLndhcm4oJ0R1cGxpY2F0ZSBub3RpZmljYXRpb24gcmVjZWl2ZWQ6IGZvciBzdWJzY3JpYmUgdG8gaW50ZXJuYWwgbWVzc2FnZSAnICsgbWVzc2FnZSk7XG59XG5cblxuZnVuY3Rpb24gb25TdWJzY3JpYmVyUmVtb3ZlZChtZXNzYWdlKSB7XG5cdHZhciBzb3VyY2VNZXNzYWdlID0gdGhpcy50cmFuc2xhdGVUb1NvdXJjZU1lc3NhZ2UobWVzc2FnZSk7XG5cblx0dmFyIGludGVybmFsTXNncyA9IHRoaXMuX2ludGVybmFsTWVzc2FnZXNbc291cmNlTWVzc2FnZV07XG5cblx0aWYgKGludGVybmFsTXNncyAmJiBpbnRlcm5hbE1zZ3MubGVuZ3RoKSB7XG5cdFx0bWVzc2FnZUluZGV4ID0gaW50ZXJuYWxNc2dzLmluZGV4T2YobWVzc2FnZSk7XG5cdFx0aWYgKG1lc3NhZ2VJbmRleCA+PSAwKSB7XG5cdFx0XHRpbnRlcm5hbE1zZ3Muc3BsaWNlKG1lc3NhZ2VJbmRleCwgMSk7XG5cdFx0XHRpZiAoaW50ZXJuYWxNc2dzLmxlbmd0aCA9PSAwKSB7XG5cdFx0XHRcdGRlbGV0ZSB0aGlzLl9pbnRlcm5hbE1lc3NhZ2VzW3NvdXJjZU1lc3NhZ2VdO1xuXHRcdFx0XHR0aGlzLnJlbW92ZVNvdXJjZUxpc3RlbmVyKHNvdXJjZU1lc3NhZ2UpO1xuXHRcdFx0fVxuXHRcdH0gZWxzZVxuXHRcdFx0dW5leHBlY3RlZE5vdGlmaWNhdGlvbldhcm5pbmcoKTtcblx0fSBlbHNlXG5cdFx0dW5leHBlY3RlZE5vdGlmaWNhdGlvbldhcm5pbmcoKTtcblxuXG5cdGZ1bmN0aW9uIHVuZXhwZWN0ZWROb3RpZmljYXRpb25XYXJuaW5nKCkge1xuXHRcdGxvZ2dlci53YXJuKCdub3RpZmljYXRpb24gcmVjZWl2ZWQ6IHVuLXN1YnNjcmliZSBmcm9tIGludGVybmFsIG1lc3NhZ2UgJyArIG1lc3NhZ2Vcblx0XHRcdFx0XHQgKyAnIHdpdGhvdXQgcHJldmlvdXMgc3Vic2NyaXB0aW9uIG5vdGlmaWNhdGlvbicpO1xuXHR9XG59XG5cblxuZnVuY3Rpb24gZGlzcGF0Y2hTb3VyY2VNZXNzYWdlKHNvdXJjZU1lc3NhZ2UsIGRhdGEpIHtcblx0dmFyIGludGVybmFsTXNncyA9IHRoaXMuX2ludGVybmFsTWVzc2FnZXNbc291cmNlTWVzc2FnZV07XG5cblx0aWYgKGludGVybmFsTXNncyAmJiBpbnRlcm5hbE1zZ3MubGVuZ3RoKVxuXHRcdGludGVybmFsTXNncy5mb3JFYWNoKGZ1bmN0aW9uKG1lc3NhZ2UpIHtcblx0XHRcdGlmICh0aGlzLmZpbHRlclNvdXJjZU1lc3NhZ2Vcblx0XHRcdFx0XHQmJiB0aGlzLmZpbHRlclNvdXJjZU1lc3NhZ2Uoc291cmNlTWVzc2FnZSwgbWVzc2FnZSwgZGF0YSkpXG5cdFx0XHRcdHRoaXMubWVzc2VuZ2VyLnBvc3RNZXNzYWdlKG1lc3NhZ2UsIGRhdGEpO1xuXHRcdH0sIHRoaXMpO1xuXHRlbHNlXG5cdFx0bG9nZ2VyLndhcm4oJ3NvdXJjZSBtZXNzYWdlIHJlY2VpdmVkIGZvciB3aGljaCB0aGVyZSBpcyBubyBtYXBwZWQgaW50ZXJuYWwgbWVzc2FnZScpO1xufVxuXG5cbi8vIGNhbiBiZSBvdmVycmlkZGVuIGluIHN1YmNsYXNzIHRvIGltcGxlbWVudCBmaWx0ZXJpbmcgYmFzZWQgb24gbWVzc2FnZSBkYXRhXG5mdW5jdGlvbiBkaXNwYXRjaEFsbFNvdXJjZU1lc3NhZ2VzKHNvdXJjZU1lc3NhZ2UsIG1lc3NhZ2UsIGRhdGEpIHtcblx0cmV0dXJuIHRydWU7XG59XG5cblxuZnVuY3Rpb24gdG9CZUltcGxlbWVudGVkKCkge1xuXHR0aHJvdyBuZXcgQWJzY3RyYWN0Q2xhc3NFcnJvcignY2FsbGluZyB0aGUgbWV0aG9kIG9mIGFuIGFic2N0cmFjdCBjbGFzcyBNZXNzYWdlU291cmNlJyk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBtaWxvID0ge1xuXHRiaW5kZXI6IHJlcXVpcmUoJy4vYmluZGVyJylcbn1cblxuXG4vLyB1c2VkIGZhY2V0c1xucmVxdWlyZSgnLi9jb21wb25lbnRzL2NfZmFjZXRzL0NvbnRhaW5lcicpO1xucmVxdWlyZSgnLi9jb21wb25lbnRzL2NfZmFjZXRzL0V2ZW50cycpO1xucmVxdWlyZSgnLi9jb21wb25lbnRzL2NfZmFjZXRzL0RhdGEnKTtcblxuLy8gdXNlZCBjb21wb25lbnRzXG5yZXF1aXJlKCcuL2NvbXBvbmVudHMvY2xhc3Nlcy9WaWV3Jyk7XG5cblxuaWYgKHR5cGVvZiBtb2R1bGUgPT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpXG5cdC8vIGV4cG9ydCBmb3Igbm9kZS9icm93c2VyaWZ5XG5cdG1vZHVsZS5leHBvcnRzID0gbWlsbztcblxuaWYgKHR5cGVvZiB3aW5kb3cgPT0gJ29iamVjdCcpXG5cdHdpbmRvdy5taWxvID0gbWlsbztcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCdtb2wtcHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi9jaGVjaycpXG5cdCwgTWF0Y2ggPSBjaGVjay5NYXRjaFxuXHQsIE1peGluRXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yJykuTWl4aW47XG5cblxubW9kdWxlLmV4cG9ydHMgPSBNaXhpbjtcblxuLy8gYW4gYWJzdHJhY3QgY2xhc3MgZm9yIG1peGluIHBhdHRlcm4gLSBhZGRpbmcgcHJveHkgbWV0aG9kcyB0byBob3N0IG9iamVjdHNcbmZ1bmN0aW9uIE1peGluKGhvc3RPYmplY3QsIHByb3h5TWV0aG9kcyAvKiwgb3RoZXIgYXJncyAtIHBhc3NlZCB0byBpbml0IG1ldGhvZCAqLykge1xuXHQvLyBUT0RPIC0gbW9jZSBjaGVja3MgZnJvbSBNZXNzZW5nZXIgaGVyZVxuXHRjaGVjayhob3N0T2JqZWN0LCBPYmplY3QpO1xuXHRjaGVjayhwcm94eU1ldGhvZHMsIE1hdGNoLk9iamVjdEhhc2goU3RyaW5nKSk7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdfaG9zdE9iamVjdCcsIHsgdmFsdWU6IGhvc3RPYmplY3QgfSk7XG5cdGlmIChwcm94eU1ldGhvZHMpXG5cdFx0dGhpcy5fY3JlYXRlUHJveHlNZXRob2RzKHByb3h5TWV0aG9kcyk7XG5cblx0Ly8gY2FsbGluZyBpbml0IGlmIGl0IGlzIGRlZmluZWQgaW4gdGhlIGNsYXNzXG5cdGlmICh0aGlzLmluaXQpXG5cdFx0dGhpcy5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59XG5cbl8uZXh0ZW5kUHJvdG8oTWl4aW4sIHtcblx0X2NyZWF0ZVByb3h5TWV0aG9kOiBfY3JlYXRlUHJveHlNZXRob2QsXG5cdF9jcmVhdGVQcm94eU1ldGhvZHM6IF9jcmVhdGVQcm94eU1ldGhvZHNcbn0pO1xuXG5cbmZ1bmN0aW9uIF9jcmVhdGVQcm94eU1ldGhvZChtaXhpbk1ldGhvZE5hbWUsIHByb3h5TWV0aG9kTmFtZSkge1xuXHRpZiAodGhpcy5faG9zdE9iamVjdFtwcm94eU1ldGhvZE5hbWVdKVxuXHRcdHRocm93IG5ldyBNaXhpbkVycm9yKCdtZXRob2QgJyArIHByb3h5TWV0aG9kTmFtZSArXG5cdFx0XHRcdFx0XHRcdFx0ICcgYWxyZWFkeSBkZWZpbmVkIGluIGhvc3Qgb2JqZWN0Jyk7XG5cblx0Y2hlY2sodGhpc1ttaXhpbk1ldGhvZE5hbWVdLCBGdW5jdGlvbik7XG5cblx0dmFyIGJvdW5kTWV0aG9kID0gdGhpc1ttaXhpbk1ldGhvZE5hbWVdLmJpbmQodGhpcyk7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMuX2hvc3RPYmplY3QsIHByb3h5TWV0aG9kTmFtZSxcblx0XHR7IHZhbHVlOiBib3VuZE1ldGhvZCB9KTtcbn1cblxuXG5mdW5jdGlvbiBfY3JlYXRlUHJveHlNZXRob2RzKHByb3h5TWV0aG9kcykge1xuXHQvLyBjcmVhdGluZyBhbmQgYmluZGluZyBwcm94eSBtZXRob2RzIG9uIHRoZSBob3N0IG9iamVjdFxuXHRfLmVhY2hLZXkocHJveHlNZXRob2RzLCBfY3JlYXRlUHJveHlNZXRob2QsIHRoaXMpO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ21vbC1wcm90bycpXG5cdCwgY2hlY2sgPSByZXF1aXJlKCcuL2NoZWNrJylcblx0LCBNYXRjaCA9IGNoZWNrLk1hdGNoO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENsYXNzUmVnaXN0cnk7XG5cbmZ1bmN0aW9uIENsYXNzUmVnaXN0cnkgKEZvdW5kYXRpb25DbGFzcykge1xuXHRpZiAoRm91bmRhdGlvbkNsYXNzKVxuXHRcdHRoaXMuc2V0Q2xhc3MoRm91bmRhdGlvbkNsYXNzKTtcblxuXHQvLyBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ19fcmVnaXN0ZXJlZENsYXNzZXMnLCB7XG5cdC8vIFx0XHRlbnVtZXJhYmxlOiBmYWxzZSxcblx0Ly8gXHRcdHdyaXRhYmxlOiB0cnVlLFxuXHQvLyBcdFx0Y29uZmlndXJhYmxlOiB0cnVlLFxuXHQvLyBcdFx0dmFsdWU6IHt9XG5cdC8vIH0pO1xuXG5cdHRoaXMuX19yZWdpc3RlcmVkQ2xhc3NlcyA9IHt9O1xufVxuXG5fLmV4dGVuZFByb3RvKENsYXNzUmVnaXN0cnksIHtcblx0YWRkOiByZWdpc3RlckNsYXNzLFxuXHRnZXQ6IGdldENsYXNzLFxuXHRyZW1vdmU6IHVucmVnaXN0ZXJDbGFzcyxcblx0Y2xlYW46IHVucmVnaXN0ZXJBbGxDbGFzc2VzLFxuXHRzZXRDbGFzczogc2V0Rm91bmRhdGlvbkNsYXNzXG59KTtcblxuXG5mdW5jdGlvbiBzZXRGb3VuZGF0aW9uQ2xhc3MoRm91bmRhdGlvbkNsYXNzKSB7XG5cdGNoZWNrKEZvdW5kYXRpb25DbGFzcywgRnVuY3Rpb24pO1xuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ0ZvdW5kYXRpb25DbGFzcycsIHtcblx0XHRlbnVtZXJhYmxlOiB0cnVlLFxuXHRcdHZhbHVlOiBGb3VuZGF0aW9uQ2xhc3Ncblx0fSk7XG59XG5cbmZ1bmN0aW9uIHJlZ2lzdGVyQ2xhc3MoYUNsYXNzLCBuYW1lKSB7XG5cdG5hbWUgPSBuYW1lIHx8IGFDbGFzcy5uYW1lO1xuXG5cdGNoZWNrKG5hbWUsIFN0cmluZywgJ2NsYXNzIG5hbWUgbXVzdCBiZSBzdHJpbmcnKTtcblx0Y2hlY2sobmFtZSwgTWF0Y2guV2hlcmUoZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHR5cGVvZiBuYW1lID09ICdzdHJpbmcnICYmIG5hbWUgIT0gJyc7XG5cdH0pLCAnY2xhc3MgbmFtZSBtdXN0IGJlIHN0cmluZycpO1xuXHRpZiAodGhpcy5Gb3VuZGF0aW9uQ2xhc3MpIHtcblx0XHRpZiAoYUNsYXNzICE9IHRoaXMuRm91bmRhdGlvbkNsYXNzKVxuXHRcdFx0Y2hlY2soYUNsYXNzLCBNYXRjaC5TdWJjbGFzcyh0aGlzLkZvdW5kYXRpb25DbGFzcyksICdjbGFzcyBtdXN0IGJlIGEgc3ViKGNsYXNzKSBvZiBhIGZvdW5kYXRpb24gY2xhc3MnKTtcblx0fSBlbHNlXG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignZm91bmRhdGlvbiBjbGFzcyBtdXN0IGJlIHNldCBiZWZvcmUgYWRkaW5nIGNsYXNzZXMgdG8gcmVnaXN0cnknKTtcblxuXHRpZiAodGhpcy5fX3JlZ2lzdGVyZWRDbGFzc2VzW25hbWVdKVxuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ2lzIGFscmVhZHkgcmVnaXN0ZXJlZCcpO1xuXG5cdHRoaXMuX19yZWdpc3RlcmVkQ2xhc3Nlc1tuYW1lXSA9IGFDbGFzcztcbn07XG5cblxuZnVuY3Rpb24gZ2V0Q2xhc3MobmFtZSkge1xuXHRjaGVjayhuYW1lLCBTdHJpbmcsICdjbGFzcyBuYW1lIG11c3QgYmUgc3RyaW5nJyk7XG5cdHJldHVybiB0aGlzLl9fcmVnaXN0ZXJlZENsYXNzZXNbbmFtZV07XG59O1xuXG5cbmZ1bmN0aW9uIHVucmVnaXN0ZXJDbGFzcyhuYW1lT3JDbGFzcykge1xuXHRjaGVjayhuYW1lT3JDbGFzcywgTWF0Y2guT25lT2YoU3RyaW5nLCBGdW5jdGlvbiksICdjbGFzcyBvciBuYW1lIG11c3QgYmUgc3VwcGxpZWQnKTtcblxuXHR2YXIgbmFtZSA9IHR5cGVvZiBuYW1lT3JDbGFzcyA9PSAnc3RyaW5nJ1xuXHRcdFx0XHRcdFx0PyBuYW1lT3JDbGFzc1xuXHRcdFx0XHRcdFx0OiBuYW1lT3JDbGFzcy5uYW1lO1xuXHRcdFx0XHRcdFx0XG5cdGlmICghIHRoaXMuX19yZWdpc3RlcmVkQ2xhc3Nlc1tuYW1lXSlcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdjbGFzcyBpcyBub3QgcmVnaXN0ZXJlZCcpO1xuXG5cdGRlbGV0ZSB0aGlzLl9fcmVnaXN0ZXJlZENsYXNzZXNbbmFtZV07XG59O1xuXG5cbmZ1bmN0aW9uIHVucmVnaXN0ZXJBbGxDbGFzc2VzKCkge1xuXHR0aGlzLl9fcmVnaXN0ZXJlZENsYXNzZXMgPSB7fTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfO1xudmFyIHByb3RvID0gXyA9IHtcblx0ZXh0ZW5kUHJvdG86IGV4dGVuZFByb3RvLFxuXHRleHRlbmQ6IGV4dGVuZCxcblx0Y2xvbmU6IGNsb25lLFxuXHRjcmVhdGVTdWJjbGFzczogY3JlYXRlU3ViY2xhc3MsXG5cdG1ha2VTdWJjbGFzczogbWFrZVN1YmNsYXNzLFxuXHRhbGxLZXlzOiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcy5iaW5kKE9iamVjdCksXG5cdGtleU9mOiBrZXlPZixcblx0YWxsS2V5c09mOiBhbGxLZXlzT2YsXG5cdGVhY2hLZXk6IGVhY2hLZXksXG5cdG1hcEtleXM6IG1hcEtleXMsXG5cdGFwcGVuZEFycmF5OiBhcHBlbmRBcnJheSxcblx0cHJlcGVuZEFycmF5OiBwcmVwZW5kQXJyYXksXG5cdHRvQXJyYXk6IHRvQXJyYXksXG5cdGZpcnN0VXBwZXJDYXNlOiBmaXJzdFVwcGVyQ2FzZSxcblx0Zmlyc3RMb3dlckNhc2U6IGZpcnN0TG93ZXJDYXNlXG59O1xuXG5cbmlmICh0eXBlb2Ygd2luZG93ID09ICdvYmplY3QnKSB7XG5cdC8vIHByZXNlcnZlIGV4aXN0aW5nIF8gb2JqZWN0XG5cdGlmICh3aW5kb3cuXylcblx0XHRwcm90by51bmRlcnNjb3JlID0gd2luZG93Ll9cblxuXHQvLyBleHBvc2UgZ2xvYmFsIF9cblx0d2luZG93Ll8gPSBwcm90bztcbn1cblxuaWYgKHR5cGVvZiBtb2R1bGUgPT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpXG5cdC8vIGV4cG9ydCBmb3Igbm9kZS9icm93c2VyaWZ5XG5cdG1vZHVsZS5leHBvcnRzID0gcHJvdG87XG5cdFxuXG5mdW5jdGlvbiBleHRlbmRQcm90byhzZWxmLCBtZXRob2RzKSB7XG5cdHZhciBwcm9wRGVzY3JpcHRvcnMgPSB7fTtcblxuXHRfLmVhY2hLZXkobWV0aG9kcywgZnVuY3Rpb24obWV0aG9kLCBuYW1lKSB7XG5cdFx0cHJvcERlc2NyaXB0b3JzW25hbWVdID0ge1xuXHRcdFx0ZW51bWVyYWJsZTogZmFsc2UsXG5cdFx0XHRjb25maWd1cmFibGU6IGZhbHNlLFxuXHRcdFx0d3JpdGFibGU6IGZhbHNlLFxuXHRcdFx0dmFsdWU6IG1ldGhvZFxuXHRcdH07XG5cdH0pO1xuXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHNlbGYucHJvdG90eXBlLCBwcm9wRGVzY3JpcHRvcnMpO1xuXHRyZXR1cm4gc2VsZjtcbn1cblxuXG5mdW5jdGlvbiBleHRlbmQoc2VsZiwgb2JqLCBvbmx5RW51bWVyYWJsZSkge1xuXHR2YXIgcHJvcERlc2NyaXB0b3JzID0ge307XG5cblx0Xy5lYWNoS2V5KG9iaiwgZnVuY3Rpb24odmFsdWUsIHByb3ApIHtcblx0XHR2YXIgZGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Iob2JqLCBwcm9wKTtcblx0XHRwcm9wRGVzY3JpcHRvcnNbcHJvcF0gPSBkZXNjcmlwdG9yO1xuXHR9LCB0aGlzLCBvbmx5RW51bWVyYWJsZSk7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnRpZXMoc2VsZiwgcHJvcERlc2NyaXB0b3JzKTtcblxuXHRyZXR1cm4gc2VsZjtcbn1cblxuXG5mdW5jdGlvbiBjbG9uZShvYmopIHtcblx0dmFyIGNsb25lZE9iamVjdCA9IE9iamVjdC5jcmVhdGUob2JqLmNvbnN0cnVjdG9yLnByb3RvdHlwZSk7XG5cdF8uZXh0ZW5kKGNsb25lZE9iamVjdCwgb2JqKTtcblx0cmV0dXJuIGNsb25lZE9iamVjdDtcbn1cblxuXG5mdW5jdGlvbiBjcmVhdGVTdWJjbGFzcyh0aGlzQ2xhc3MsIG5hbWUsIGFwcGx5Q29uc3RydWN0b3IpIHtcblx0dmFyIHN1YmNsYXNzO1xuXG5cdC8vIG5hbWUgaXMgb3B0aW9uYWxcblx0bmFtZSA9IG5hbWUgfHwgJyc7XG5cblx0Ly8gYXBwbHkgc3VwZXJjbGFzcyBjb25zdHJ1Y3RvclxuXHR2YXIgY29uc3RydWN0b3JDb2RlID0gYXBwbHlDb25zdHJ1Y3RvciA9PT0gZmFsc2Vcblx0XHRcdD8gJydcblx0XHRcdDogJ3RoaXNDbGFzcy5hcHBseSh0aGlzLCBhcmd1bWVudHMpOyc7XG5cblx0ZXZhbCgnc3ViY2xhc3MgPSBmdW5jdGlvbiAnICsgbmFtZSArICcoKXsgJyArIGNvbnN0cnVjdG9yQ29kZSArICcgfScpO1xuXG5cdC8vIHBwcm90b3R5cGUgY2hhaW5cblx0c3ViY2xhc3MucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSh0aGlzQ2xhc3MucHJvdG90eXBlKTtcblx0XG5cdC8vIHN1YmNsYXNzIGlkZW50aXR5XG5cdF8uZXh0ZW5kUHJvdG8oc3ViY2xhc3MsIHtcblx0XHRjb25zdHJ1Y3Rvcjogc3ViY2xhc3Ncblx0fSk7XG5cblx0Ly8gY29weSBjbGFzcyBtZXRob2RzXG5cdC8vIC0gZm9yIHRoZW0gdG8gd29yayBjb3JyZWN0bHkgdGhleSBzaG91bGQgbm90IGV4cGxpY3RseSB1c2Ugc3VwZXJjbGFzcyBuYW1lXG5cdC8vIGFuZCB1c2UgXCJ0aGlzXCIgaW5zdGVhZFxuXHRfLmV4dGVuZChzdWJjbGFzcywgdGhpc0NsYXNzLCB0cnVlKTtcblxuXHRyZXR1cm4gc3ViY2xhc3M7XG59XG5cblxuZnVuY3Rpb24gbWFrZVN1YmNsYXNzKHRoaXNDbGFzcywgU3VwZXJjbGFzcykge1xuXHR0aGlzQ2xhc3MucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShTdXBlcmNsYXNzLnByb3RvdHlwZSk7XG5cdHRoaXNDbGFzcy5wcm90b3R5cGUuY29uc3RydWN0b3IgPSB0aGlzQ2xhc3M7XG5cdHJldHVybiB0aGlzQ2xhc3M7XG59XG5cblxuZnVuY3Rpb24ga2V5T2Yoc2VsZiwgc2VhcmNoRWxlbWVudCwgb25seUVudW1lcmFibGUpIHtcblx0dmFyIHByb3BlcnRpZXMgPSBvbmx5RW51bWVyYWJsZSBcblx0XHRcdFx0XHRcdD8gT2JqZWN0LmtleXMoc2VsZilcblx0XHRcdFx0XHRcdDogXy5hbGxLZXlzKHNlbGYpO1xuXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgcHJvcGVydGllcy5sZW5ndGg7IGkrKylcblx0XHRpZiAoc2VhcmNoRWxlbWVudCA9PT0gc2VsZltwcm9wZXJ0aWVzW2ldXSlcblx0XHRcdHJldHVybiBwcm9wZXJ0aWVzW2ldO1xuXHRcblx0cmV0dXJuIHVuZGVmaW5lZDtcbn1cblxuXG5mdW5jdGlvbiBhbGxLZXlzT2Yoc2VsZiwgc2VhcmNoRWxlbWVudCwgb25seUVudW1lcmFibGUpIHtcblx0dmFyIHByb3BlcnRpZXMgPSBvbmx5RW51bWVyYWJsZSBcblx0XHRcdFx0XHRcdD8gT2JqZWN0LmtleXMoc2VsZilcblx0XHRcdFx0XHRcdDogXy5hbGxLZXlzKHNlbGYpO1xuXG5cdHZhciBrZXlzID0gcHJvcGVydGllcy5maWx0ZXIoZnVuY3Rpb24ocHJvcCkge1xuXHRcdHJldHVybiBzZWFyY2hFbGVtZW50ID09PSBzZWxmW3Byb3BdO1xuXHR9KTtcblxuXHRyZXR1cm4ga2V5cztcbn1cblxuXG5mdW5jdGlvbiBlYWNoS2V5KHNlbGYsIGNhbGxiYWNrLCB0aGlzQXJnLCBvbmx5RW51bWVyYWJsZSkge1xuXHR2YXIgcHJvcGVydGllcyA9IG9ubHlFbnVtZXJhYmxlIFxuXHRcdFx0XHRcdFx0PyBPYmplY3Qua2V5cyhzZWxmKVxuXHRcdFx0XHRcdFx0OiBfLmFsbEtleXMoc2VsZik7XG5cblx0cHJvcGVydGllcy5mb3JFYWNoKGZ1bmN0aW9uKHByb3ApIHtcblx0XHRjYWxsYmFjay5jYWxsKHRoaXNBcmcsIHNlbGZbcHJvcF0sIHByb3AsIHNlbGYpO1xuXHR9KTtcbn1cblxuXG5mdW5jdGlvbiBtYXBLZXlzKHNlbGYsIGNhbGxiYWNrLCB0aGlzQXJnLCBvbmx5RW51bWVyYWJsZSkge1xuXHR2YXIgbWFwUmVzdWx0ID0ge307XG5cdF8uZWFjaEtleShzZWxmLCBtYXBQcm9wZXJ0eSwgdGhpc0FyZywgb25seUVudW1lcmFibGUpO1xuXHRyZXR1cm4gbWFwUmVzdWx0O1xuXG5cdGZ1bmN0aW9uIG1hcFByb3BlcnR5KHZhbHVlLCBrZXkpIHtcblx0XHR2YXIgZGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Ioc2VsZiwga2V5KTtcblx0XHRpZiAoZGVzY3JpcHRvci5lbnVtZXJhYmxlIHx8ICEgb25seUVudW1lcmFibGUpIHtcblx0XHRcdGRlc2NyaXB0b3IudmFsdWUgPSBjYWxsYmFjay5jYWxsKHRoaXMsIHZhbHVlLCBrZXksIHNlbGYpO1xuXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KG1hcFJlc3VsdCwga2V5LCBkZXNjcmlwdG9yKTtcblx0XHR9XG5cdH1cbn1cblxuXG5mdW5jdGlvbiBhcHBlbmRBcnJheShzZWxmLCBhcnJheVRvQXBwZW5kKSB7XG5cdGlmICghIGFycmF5VG9BcHBlbmQubGVuZ3RoKSByZXR1cm4gc2VsZjtcblxuICAgIHZhciBhcmdzID0gW3NlbGYubGVuZ3RoLCAwXS5jb25jYXQoYXJyYXlUb0FwcGVuZCk7XG4gICAgQXJyYXkucHJvdG90eXBlLnNwbGljZS5hcHBseShzZWxmLCBhcmdzKTtcblxuICAgIHJldHVybiBzZWxmO1xufVxuXG5cbmZ1bmN0aW9uIHByZXBlbmRBcnJheShzZWxmLCBhcnJheVRvUHJlcGVuZCkge1xuXHRpZiAoISBhcnJheVRvUHJlcGVuZC5sZW5ndGgpIHJldHVybiBzZWxmO1xuXG4gICAgdmFyIGFyZ3MgPSBbMCwgMF0uY29uY2F0KGFycmF5VG9QcmVwZW5kKTtcbiAgICBBcnJheS5wcm90b3R5cGUuc3BsaWNlLmFwcGx5KHNlbGYsIGFyZ3MpO1xuXG4gICAgcmV0dXJuIHNlbGY7XG59XG5cblxuZnVuY3Rpb24gdG9BcnJheShhcnJheUxpa2UpIHtcblx0dmFyIGFyciA9IFtdO1xuXHRBcnJheS5wcm90b3R5cGUuZm9yRWFjaC5jYWxsKGFycmF5TGlrZSwgZnVuY3Rpb24oaXRlbSkge1xuXHRcdGFyci5wdXNoKGl0ZW0pXG5cdH0pO1xuXG5cdHJldHVybiBhcnI7XG59XG5cblxuZnVuY3Rpb24gZmlyc3RVcHBlckNhc2Uoc3RyKSB7XG5cdHJldHVybiBzdHJbMF0udG9VcHBlckNhc2UoKSArIHN0ci5zbGljZSgxKTtcbn1cblxuXG5mdW5jdGlvbiBmaXJzdExvd2VyQ2FzZShzdHIpIHtcblx0cmV0dXJuIHN0clswXS50b0xvd2VyQ2FzZSgpICsgc3RyLnNsaWNlKDEpO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5kZXNjcmliZSgnbWlsbyBiaW5kZXInLCBmdW5jdGlvbigpIHtcbiAgICBpdCgnc2hvdWxkIGJpbmQgY29tcG9uZW50cyBiYXNlZCBvbiBtbC1iaW5kIGF0dHJpYnV0ZScsIGZ1bmN0aW9uKCkge1xuICAgIFx0dmFyIG1pbG8gPSByZXF1aXJlKCcuLi8uLi9saWIvbWlsbycpO1xuXG5cdFx0ZXhwZWN0KHtwOiAxfSkucHJvcGVydHkoJ3AnLCAxKTtcblxuICAgIFx0dmFyIGN0cmwgPSBtaWxvLmJpbmRlcigpO1xuXG4gICAgXHRjdHJsLmFydGljbGVCdXR0b24uZXZlbnRzLm9uKCdjbGljayBtb3VzZWVudGVyJywgZnVuY3Rpb24oZVR5cGUsIGV2dCkge1xuICAgIFx0XHRjb25zb2xlLmxvZygnYnV0dG9uJywgZVR5cGUsIGV2dCk7XG4gICAgXHR9KTtcblxuICAgICAgICBjdHJsLm1haW4uZXZlbnRzLm9uKCdjbGljayBtb3VzZWVudGVyIGlucHV0IGtleXByZXNzJywgZnVuY3Rpb24oZVR5cGUsIGV2dCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2RpdicsIGVUeXBlLCBldnQpO1xuICAgICAgICB9KTtcblxuICAgIFx0Y3RybC5hcnRpY2xlSWRJbnB1dC5kYXRhLm9uKCdkYXRhY2hhbmdlZCcsIGxvZ0RhdGEpO1xuXG4gICAgXHRmdW5jdGlvbiBsb2dEYXRhKG1lc3NhZ2UsIGRhdGEpIHtcbiAgICBcdFx0Y29uc29sZS5sb2cobWVzc2FnZSwgZGF0YSk7XG4gICAgXHR9XG4gICAgXHRcblx0XHRjb25zb2xlLmxvZyhjdHJsKTtcbiAgICB9KTtcbn0pO1xuIl19
;