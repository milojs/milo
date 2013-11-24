;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var _ = require('proto')
	, check = require('../check')
	, Match = check.Match
	, BindError = require('./error');


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
		var bindTo = value.split(':');

	switch (bindTo && bindTo.length) {
		case 1:
			this.compName = bindTo[0];
			this.compClass = 'Component';
			return this;

		case 2:
			this.compName = bindTo[1];
			this.compClass = bindTo[0];
			return this;

		default:
			throw new BindError('invalid bind attribute ' + value);
	}
}

function validateAttribute() {
	var compName = this.compName;
	check(compName, Match.Where(function() {
  		return typeof compName == 'string' && compName != '';
	}), 'empty component name');

	if (! this.compClass)
		throw new BindError('empty component class name ' + this.compClass);
}

},{"../check":4,"./error":3,"proto":19}],2:[function(require,module,exports){
'use strict';

var componentsRegistry = require('../components/c_registry')
	, Component = componentsRegistry.get('Component')
	, Attribute = require('./attribute')
	, BindError = require('./error')
	, _ = require('proto')
	, check = require('../check')
	, Match =  check.Match;


var opts = {
	BIND_ATTR: 'ml-bind'
}

module.exports = binder;

function binder(scopeEl, bindScopeEl) {
	var scopeEl = scopeEl // || document.body
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
			return new ComponentClass({}, el);
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

},{"../check":4,"../components/c_registry":12,"./attribute":1,"./error":3,"proto":19}],3:[function(require,module,exports){
'use strict';

var _ = require('proto');

function BindError(msg) {
	this.message = msg;
}

_.makeSubclass(BindError, Error);

module.exports = BindError;

},{"proto":19}],4:[function(require,module,exports){
'use strict';

// XXX docs

// Things we explicitly do NOT support:
//    - heterogenous arrays
var _ = require('proto');

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
  // or false (unless an error other than Match.Error was thrown). It does not
  // interact with _failIfArgumentsAreNotAllChecked.
  // XXX maybe also implement a Match.match which returns more information about
  //     failures but without using exception handling or doing what check()
  //     does with _failIfArgumentsAreNotAllChecked and Meteor.Error conversion
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
  },

  // Runs `f.apply(context, args)`. If check() is not called on every element of
  // `args` (either directly or in the first level of an array), throws an error
  // (using `description` in the message).
  //
  _failIfArgumentsAreNotAllChecked: function (f, context, args, description) {
    var argChecker = new ArgumentChecker(args, description);
    var result = currentArgumentChecker.withValue(argChecker, function () {
      return f.apply(context, args);
    });
    // If f didn't itself throw, make sure it checked all of its arguments.
    argChecker.throwUnlessAllArgumentsHaveBeenChecked();
    return result;
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
  // While we don't allow undefined in EJSON, this is good for optional
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
    throw new Match.Error("Expected null, got " + EJSON.stringify(value));
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
                + (value instanceof Object ? EJSON.stringify(value) : value));
  }

  // "Object" is shorthand for Match.ObjectIncluding({});
  if (pattern === Object)
    pattern = Match.ObjectIncluding({});

  // Array (checked AFTER Any, which is implemented as an Array).
  if (pattern instanceof Array) {
    if (pattern.length !== 1)
      throw Error("Bad pattern: arrays must have one type element" +
                  EJSON.stringify(pattern));
    if (!_.isArray(value) && !_.isArguments(value)) {
      throw new Match.Error("Expected array, got " + EJSON.stringify(value));
    }

    _.each(value, function (valueElement, index) {
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
  if (value.constructor !== Object)
    throw new Match.Error("Expected plain object");

  var requiredPatterns = {};
  var optionalPatterns = {};

  Object.keys(pattern).forEach(function(key) {
    var subPattern = pattern[key];
    if (pattern[key] instanceof Optional)
      optionalPatterns[key] = pattern[key].pattern;
    else
      requiredPatterns[key] = pattern[key];
  });

  Object.keys(value).forEach(function(key) {
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
  });

  Object.keys(requiredPatterns).forEach(function(key) {
    throw new Match.Error("Missing key '" + key + "'");
  });
};

function ArgumentChecker(args, description) {
  var self = this;
  // Make a SHALLOW copy of the arguments. (We'll be doing identity checks
  // against its contents.)
  self.args = _.clone(args);
  // Since the common case will be to check arguments in order, and we splice
  // out arguments when we check them, make it so we splice out from the end
  // rather than the beginning.
  self.args.reverse();
  self.description = description;
};

_.extendProto(ArgumentChecker, {
  checking: function (value) {
    var self = this;
    if (self._checkingOneValue(value))
      return;
    // Allow check(arguments, [String]) or check(arguments.slice(1), [String])
    // or check([foo, bar], [String]) to count... but only if value wasn't
    // itself an argument.
    if (_.isArray(value) || _.isArguments(value)) {
      _.each(value, _.bind(self._checkingOneValue, self));
    }
  },
  _checkingOneValue: function (value) {
    var self = this;
    for (var i = 0; i < self.args.length; ++i) {
      // Is this value one of the arguments? (This can have a false positive if
      // the argument is an interned primitive, but it's still a good enough
      // check.)
      if (value === self.args[i]) {
        self.args.splice(i, 1);
        return true;
      }
    }
    return false;
  },
  throwUnlessAllArgumentsHaveBeenChecked: function () {
    var self = this;
    if (!_.isEmpty(self.args))
      throw new Error("Did not check() all arguments during " +
                      self.description);
  }
});

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
  else if (!key.match(/^[a-z_$][0-9a-z_$]*$/i) || _jsKeywords.indexOf(key) != -1)//_.contains(_jsKeywords, key))
    key = JSON.stringify([key]);

  if (base && base[0] !== "[")
    return key + '.' + base;
  return key + base;
};


},{"proto":19}],5:[function(require,module,exports){
'use strict';

var FacetedObject = require('../facets/f_object')
	, facetsRegistry = require('./c_facets/cf_registry')
	, ComponentFacet = require('./c_facet')
	, messengerMixin = require('./messenger')
	, _ = require('proto');

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

_.extendProto(Component, messengerMixin);


function initComponent(facetsOptions, element) {
	this.el = element;
	this.initMessenger();
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

	facetName = facetName || FacetClass.name;

	FacetedObject.prototype.addFacet.call(this, FacetClass, facetOpts, facetName);
}

},{"../facets/f_object":16,"./c_facet":6,"./c_facets/cf_registry":10,"./messenger":14,"proto":19}],6:[function(require,module,exports){
'use strict';

var Facet = require('../facets/f_class')
	, messengerMixin = require('./messenger')
	, _ = require('proto');

var ComponentFacet = _.createSubclass(Facet, 'ComponentFacet');

module.exports = ComponentFacet;


_.extendProto(ComponentFacet, {
	init: initComponentFacet,
});

_.extendProto(ComponentFacet, messengerMixin);


function initComponentFacet() {
	this.initMessenger();
}

},{"../facets/f_class":15,"./messenger":14,"proto":19}],7:[function(require,module,exports){
'use strict';

var ComponentFacet = require('../c_facet')
	, binder = require('../../binder/binder')
	, _ = require('proto')
	, facetsRegistry = require('./cf_registry');

// container facet
var Container = _.createSubclass(ComponentFacet, 'Container');

_.extendProto(Container, {
	init: initContainer,
	_bind: _bindComponents,
	add: addChildComponents
});

facetsRegistry.add(Container);


function initContainer() {
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

},{"../../binder/binder":2,"../c_facet":6,"./cf_registry":10,"proto":19}],8:[function(require,module,exports){
'use strict';

var ComponentFacet = require('../c_facet')
	, FacetError = ComponentFacet.Error
	, _ = require('proto')
	, facetsRegistry = require('./cf_registry')
	, messengerMixin = require('../messenger')
	, domEventsConstructors = require('./dom_events');

// events facet
var Events = _.createSubclass(ComponentFacet, 'Events');

_.extendProto(Events, {
	init: initEventsFacet,
	dom: getDomElement,
	handleEvent: handleEvent, // event dispatcher - as defined by Event DOM API
	on: addListener,
	off: removeListener,
	onEvents: addListenersToEvents,
	offEvents: removeListenersFromEvents,
	trigger: triggerEvent,
	getListeners: getListeners,
	// _reattach: _reattachEventsOnElementChange
});

facetsRegistry.add(Events);


var useCaptureSuffix = '__capture'
	, wrongEventPattern = /__capture/;


function initEventsFacet() {
	// dependency
	if (! this.owner.facets.El)
		throw new FacetError('Events facet require El facet');

	// initialize listeners map
	this._eventsListeners = {};
}


function getDomElement() {
	return this.owner.El.dom;
}


function handleEvent(event) {
	isCapturePhase = event.eventPhase == window.Event.CAPTURING_PHASE;

	var eventKey = event.type + (isCapturePhase ? useCaptureSuffix : '')
		, eventListeners = this._eventsListeners[eventKey];

	if (eventListeners)
		eventListeners.forEach(function(listener) {
			listener(event);
		});
}


function addListener(eventTypes, listener, useCapture) {
	check(events, String);
	check(listener, Function);

	var eventsArray = eventTypes.split(/\s*\,?\s*/)
		, wasAttached = false;

	eventsArray.forEach(function(eventType) {
		if (wrongEventPattern.test(eventType))
			throw new RangeError('event type cannot contain ' + useCaptureSuffix);

		var eventKey = eventType + (useCapture ? useCaptureSuffix : '')
			, eventListeners = this._eventsListeners[eventKey]
				= this._eventsListeners[eventKey] || [];

		if (! _hasEventListeners(eventKey)) {
			// true = use capture, for particular listener it is determined in handleEvent
			this.dom().addEventListener(eventKey, this, true);
			var notYetAttached = true;
		} else
			notYetAttached = eventListeners.indexOf(listener) == -1;

		if (notYetAttached) {
			wasAttached = true;
			eventListeners.push(listener);
		}
	});

	return wasAttached;
}


function addListenersToEvents(eventsListeners, useCapture) {
	check(eventsListeners, Match.Object);

	var wasAttachedMap = _.mapKeys(eventsListeners, function(listener, eventTypes) {
		return this.addListener(eventTypes, listener, useCapture)
	}, this);

	return wasAttachedMap;	
}


function removeListener(eventTypes, listener, useCapture) {
	check(eventTypes, String);
	check(listener, Function);

	var eventsArray = eventTypes.split(/\s*\,?\s*/)
		, wasRemoved = false;

	eventsArray.forEach(function(eventType) {
		if (wrongEventPattern.test(eventType))
			throw new RangeError('event type cannot contain ' + useCaptureSuffix);

		var eventKey = eventType + (useCapture ? useCaptureSuffix : '')
			, eventListeners = this._eventsListeners[eventKey];

		if (! (eventListeners && eventListeners.length)) return;

		if (listener) {
			listenerIndex = eventListeners.indexOf(listener);
			if (listenerIndex == -1)
				return;
			eventListeners.splice(listenerIndex, 1);
			if (! eventListeners.length)
				delete this._eventsListeners[eventKey];
		} else
			delete this._eventsListeners[eventKey];

		wasRemoved = true;

		if (! _hasEventListeners(eventType))
			// true = use capture, for particular listener it is determined in handleEvent
			this.dom().removeEventListener(eventType, this, true);
	});

	return wasRemoved;
}


function removeListenersFromEvents(eventsListeners, useCapture) {
	check(eventsListeners, Match.Object);

	var wasRemovedMap = _.mapKeys(eventsListeners, function(listener, eventTypes) {
		return this.removeListener(eventTypes, listener, useCapture);
	}, this);

	return wasRemovedMap;
}


function triggerEvent(eventType, properties) {
	check(eventType, String);

	var EventConstructor = domEventsConstructors[eventType];

	if (typeof eventConstructor != 'function')
		throw new Error('unsupported event type');

	var domEvent = EventConstructor(eventType, properties);
	// ??? properties.type = eventType;
	// ??? EventConstructor(properties);
	var notCancelled = this.dom().dispatchEvent(domEvent);

	return notCancelled;
}


function getListeners(eventType, useCapture) {
	check(eventType, String);

	var eventKey = eventType + (useCapture ? useCaptureSuffix : '')
		, eventListeners = this._eventsListeners[eventKey];

	return eventListeners && eventListeners.length
				 ? [].concat(eventListeners)
				 : undefined;
}


function _hasEventListeners(eventType) {
	var notCapturedEvents = this._eventsListeners[eventType]
		, capturedEvents = this._eventsListeners[eventType + useCaptureSuffix];

	return (notCapturedEvents && notCapturedEvents.length)
		    || (capturedEvents && capturedEvents.length);
}

},{"../c_facet":6,"../messenger":14,"./cf_registry":10,"./dom_events":11,"proto":19}],9:[function(require,module,exports){
'use strict';

},{}],10:[function(require,module,exports){
'use strict';

var ClassRegistry = require('../../registry')
	, ComponentFacet = require('../c_facet');

var facetsRegistry = new ClassRegistry(ComponentFacet);

facetsRegistry.add(ComponentFacet);

module.exports = facetsRegistry;

// TODO - refactor components registry test into a function
// that tests a registry with a given foundation class
// Make test for this registry based on this function
},{"../../registry":18,"../c_facet":6}],11:[function(require,module,exports){
'use strict';

var _ = require('proto');


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

},{"proto":19}],12:[function(require,module,exports){
'use strict';

var ClassRegistry = require('../registry')
	, Component = require('./c_class');

var componentsRegistry = new ClassRegistry(Component);

componentsRegistry.add(Component);

module.exports = componentsRegistry;

},{"../registry":18,"./c_class":5}],13:[function(require,module,exports){
'use strict';

var Component = require('../c_class')
	, componentsRegistry = require('../c_registry');


var View = Component.createComponentClass('View', ['container']);

componentsRegistry.add(View);

module.exports = View;

},{"../c_class":5,"../c_registry":12}],14:[function(require,module,exports){
'use strict';

var _ = require('proto')
	, check = require('../check')
	, Match = check.Match;

var messengerMixin =  {
	initMessenger: initMessenger,
	onMessage: registerSubscriber,
	offMessage: removeSubscriber,
	onMessages: registerSubscribers,
	offMessages: removeSubscribers,
	postMessage: postMessage,
	getMessageSubscribers: getMessageSubscribers,
	_chooseSubscribersHash: _chooseSubscribersHash
};

module.exports = messengerMixin;


function initMessenger() {
	Object.defineProperties(this, {
		_messageSubscribers: {
			writable: true,
			value: {}
		},
		_patternMessageSubscribers: {
			writable: true,
			value: {}
		}
	});
}


function registerSubscriber(message, subscriber) {
	check(message, Match.OneOf(String, RegExp));
	check(subscriber, Function); 

	var subscribersHash = this._chooseSubscribersHash(message);
	var msgSubscribers = subscribersHash[message] = subscribersHash[message] || [];
	var notYetRegistered = msgSubscribers.indexOf(subscriber) == -1;

	if (notYetRegistered)
		msgSubscribers.push(subscriber);

	return notYetRegistered;
}


function registerSubscribers(messageSubscribers) {
	check(messageSubscribers, Match.Object);

	var notYetRegisteredMap = _.mapKeys(messageSubscribers, function(subscriber, message) {
		return this.registerSubscriber(message, subscriber)
	}, this);

	return notYetRegisteredMap;
}


// removes all subscribers for the message if subscriber isn't supplied
function removeSubscriber(message, subscriber) {
	check(message, Match.OneOf(String, RegExp));
	check(subscriber, Match.Optional(Function)); 

	var subscribersHash = this._chooseSubscribersHash(message);
	var msgSubscribers = subscribersHash[message];
	if (! msgSubscribers || ! msgSubscribers.length) return false;

	if (subscriber) {
		subscriberIndex = msgSubscribers.indexOf(subscriber);
		if (subscriberIndex == -1) return false;
		msgSubscribers.splice(subscriberIndex, 1);
		if (! msgSubscribers.length)
			delete subscribersHash[message];
	} else
		delete subscribersHash[message];

	return true; // subscriber(s) removed
}


function removeSubscribers(messageSubscribers) {
	check(messageSubscribers, Match.Object);

	var subscriberRemovedMap = _.mapKeys(messageSubscribers, function(subscriber, message) {
		return this.registerSubscriber(message, subscriber)
	}, this);

	return subscriberRemovedMap;	
}


function postMessage(message, data) {
	check(message, Match.OneOf(String, RegExp));

	var subscribersHash = this._chooseSubscribersHash(message);
	var msgSubscribers = subscribersHash[message];

	callSubscribers(msgSubscribers);

	if (message instanceof String) {
		_.eachKey(this._patternMessageSubscribers, 
			function(patternSubscribers, pattern) {
				if (pattern.test(message))
					callSubscribers(patternSubscribers);
			}
		);
	}

	function callSubscribers(msgSubscribers) {
		msgSubscribers.forEach(function(subscriber) {
			subscriber(message, data);
		});
	}
}


function getMessageSubscribers(message, includePatternSubscribers) {
	check(message, Match.OneOf(String, RegExp));

	var subscribersHash = this._chooseSubscribersHash(message);
	var msgSubscribers = msgSubscribers
							? [].concat(subscribersHash[message])
							: [];

	// pattern subscribers are incuded by default
	if (includePatternSubscribers != false && message instanceof String) {
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

},{"../check":4,"proto":19}],15:[function(require,module,exports){
'use strict';

var _ = require('proto');

module.exports = Facet;

function Facet(owner, options) {
	this.owner = owner;
	this.options = options || {};
	this.init.apply(this, arguments);
}

_.extendProto(Facet, {
	init: function() {}
});

},{"proto":19}],16:[function(require,module,exports){
'use strict';

var Facet = require('./f_class')
	, _ = require('proto')
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

	if (this.constructor.prototype.facets[facetName])
		throw new Error('facet ' + facetName + ' is already part of the class ' + this.constructor.name);

	if (this.facets[facetName])
		throw new Error('facet ' + facetName + ' is already present in object');

	this.facets[facetName] = FacetClass;

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


},{"../check":4,"./f_class":15,"proto":19}],17:[function(require,module,exports){
'use strict';

var milo = {
	binder: require('./binder/binder')
}


// used facets
require('./components/c_facets/Container');
require('./components/c_facets/Events');
require('./components/c_facets/Model');

// used components
require('./components/classes/View');


if (typeof module == 'object' && module.exports)
	// export for node/browserify
	module.exports = milo;

if (typeof window == 'object')
	window.milo = milo;

},{"./binder/binder":2,"./components/c_facets/Container":7,"./components/c_facets/Events":8,"./components/c_facets/Model":9,"./components/classes/View":13}],18:[function(require,module,exports){
'use strict';

var _ = require('proto')
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

},{"./check":4,"proto":19}],19:[function(require,module,exports){
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


function firstUpperCase(str) {
	return str[0].toUpperCase() + str.slice(1);
}


function firstLowerCase(str) {
	return str[0].toLowerCase() + str.slice(1);
}

},{}],20:[function(require,module,exports){
'use strict';

describe('milo binder', function() {
    it('should bind components based on ml-bind attribute', function() {
    	var milo = require('../../lib/milo');

		expect({p: 1}).property('p', 1);

    	var components = milo.binder(document.getElementById('viewToBind'));
    	
		console.log(components);
    });
});

},{"../../lib/milo":17}]},{},[20])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2JpbmRlci9hdHRyaWJ1dGUuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2JpbmRlci9iaW5kZXIuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2JpbmRlci9lcnJvci5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY2hlY2suanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19jbGFzcy5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX2ZhY2V0LmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfZmFjZXRzL0NvbnRhaW5lci5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX2ZhY2V0cy9FdmVudHMuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19mYWNldHMvTW9kZWwuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19mYWNldHMvY2ZfcmVnaXN0cnkuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19mYWNldHMvZG9tX2V2ZW50cy5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX3JlZ2lzdHJ5LmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NsYXNzZXMvVmlldy5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9tZXNzZW5nZXIuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2ZhY2V0cy9mX2NsYXNzLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9mYWNldHMvZl9vYmplY3QuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL21pbG8uanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL3JlZ2lzdHJ5LmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL25vZGVfbW9kdWxlcy9wcm90by9saWIvcHJvdG8uanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vdGVzdF9odG1sL2JpbmRfdGVzdC9iaW5kX3Rlc3QuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDblhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0xBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgncHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vY2hlY2snKVxuXHQsIE1hdGNoID0gY2hlY2suTWF0Y2hcblx0LCBCaW5kRXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yJyk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBBdHRyaWJ1dGU7XG5cbmZ1bmN0aW9uIEF0dHJpYnV0ZShlbCwgbmFtZSkge1xuXHR0aGlzLm5hbWUgPSBuYW1lO1xuXHR0aGlzLmVsID0gZWw7XG5cdHRoaXMubm9kZSA9IGVsLmF0dHJpYnV0ZXNbbmFtZV07XG59XG5cbl8uZXh0ZW5kUHJvdG8oQXR0cmlidXRlLCB7XG5cdGdldDogZ2V0QXR0cmlidXRlVmFsdWUsXG5cdHNldDogc2V0QXR0cmlidXRlVmFsdWUsXG5cdHBhcnNlOiBwYXJzZUF0dHJpYnV0ZSxcblx0dmFsaWRhdGU6IHZhbGlkYXRlQXR0cmlidXRlXG59KTtcblxuXG5mdW5jdGlvbiBnZXRBdHRyaWJ1dGVWYWx1ZSgpIHtcblx0cmV0dXJuIHRoaXMuZWwuZ2V0QXR0cmlidXRlKHRoaXMubmFtZSk7XG59XG5cbmZ1bmN0aW9uIHNldEF0dHJpYnV0ZVZhbHVlKHZhbHVlKSB7XG5cdHRoaXMuZWwuc2V0QXR0cmlidXRlKHRoaXMubmFtZSwgdmFsdWUpO1xufVxuXG5mdW5jdGlvbiBwYXJzZUF0dHJpYnV0ZSgpIHtcblx0aWYgKCEgdGhpcy5ub2RlKSByZXR1cm47XG5cblx0dmFyIHZhbHVlID0gdGhpcy5nZXQoKTtcblxuXHRpZiAodmFsdWUpXG5cdFx0dmFyIGJpbmRUbyA9IHZhbHVlLnNwbGl0KCc6Jyk7XG5cblx0c3dpdGNoIChiaW5kVG8gJiYgYmluZFRvLmxlbmd0aCkge1xuXHRcdGNhc2UgMTpcblx0XHRcdHRoaXMuY29tcE5hbWUgPSBiaW5kVG9bMF07XG5cdFx0XHR0aGlzLmNvbXBDbGFzcyA9ICdDb21wb25lbnQnO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cblx0XHRjYXNlIDI6XG5cdFx0XHR0aGlzLmNvbXBOYW1lID0gYmluZFRvWzFdO1xuXHRcdFx0dGhpcy5jb21wQ2xhc3MgPSBiaW5kVG9bMF07XG5cdFx0XHRyZXR1cm4gdGhpcztcblxuXHRcdGRlZmF1bHQ6XG5cdFx0XHR0aHJvdyBuZXcgQmluZEVycm9yKCdpbnZhbGlkIGJpbmQgYXR0cmlidXRlICcgKyB2YWx1ZSk7XG5cdH1cbn1cblxuZnVuY3Rpb24gdmFsaWRhdGVBdHRyaWJ1dGUoKSB7XG5cdHZhciBjb21wTmFtZSA9IHRoaXMuY29tcE5hbWU7XG5cdGNoZWNrKGNvbXBOYW1lLCBNYXRjaC5XaGVyZShmdW5jdGlvbigpIHtcbiAgXHRcdHJldHVybiB0eXBlb2YgY29tcE5hbWUgPT0gJ3N0cmluZycgJiYgY29tcE5hbWUgIT0gJyc7XG5cdH0pLCAnZW1wdHkgY29tcG9uZW50IG5hbWUnKTtcblxuXHRpZiAoISB0aGlzLmNvbXBDbGFzcylcblx0XHR0aHJvdyBuZXcgQmluZEVycm9yKCdlbXB0eSBjb21wb25lbnQgY2xhc3MgbmFtZSAnICsgdGhpcy5jb21wQ2xhc3MpO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgY29tcG9uZW50c1JlZ2lzdHJ5ID0gcmVxdWlyZSgnLi4vY29tcG9uZW50cy9jX3JlZ2lzdHJ5Jylcblx0LCBDb21wb25lbnQgPSBjb21wb25lbnRzUmVnaXN0cnkuZ2V0KCdDb21wb25lbnQnKVxuXHQsIEF0dHJpYnV0ZSA9IHJlcXVpcmUoJy4vYXR0cmlidXRlJylcblx0LCBCaW5kRXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yJylcblx0LCBfID0gcmVxdWlyZSgncHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vY2hlY2snKVxuXHQsIE1hdGNoID0gIGNoZWNrLk1hdGNoO1xuXG5cbnZhciBvcHRzID0ge1xuXHRCSU5EX0FUVFI6ICdtbC1iaW5kJ1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGJpbmRlcjtcblxuZnVuY3Rpb24gYmluZGVyKHNjb3BlRWwsIGJpbmRTY29wZUVsKSB7XG5cdHZhciBzY29wZUVsID0gc2NvcGVFbCAvLyB8fCBkb2N1bWVudC5ib2R5XG5cdFx0LCBjb21wb25lbnRzID0ge307XG5cblx0Ly8gaXRlcmF0ZSBjaGlsZHJlbiBvZiBzY29wZUVsXG5cdEFycmF5LnByb3RvdHlwZS5mb3JFYWNoLmNhbGwoc2NvcGVFbC5jaGlsZHJlbiwgYmluZEVsZW1lbnQpO1xuXG5cdHJldHVybiBjb21wb25lbnRzO1xuXG5cdGZ1bmN0aW9uIGJpbmRFbGVtZW50KGVsKXtcblx0XHR2YXIgYXR0ciA9IG5ldyBBdHRyaWJ1dGUoZWwsIG9wdHMuQklORF9BVFRSKTtcblxuXHRcdHZhciBhQ29tcG9uZW50ID0gY3JlYXRlQ29tcG9uZW50KGVsLCBhdHRyKTtcblxuXHRcdC8vIGJpbmQgaW5uZXIgZWxlbWVudHMgdG8gY29tcG9uZW50c1xuXHRcdGlmIChlbC5jaGlsZHJlbiAmJiBlbC5jaGlsZHJlbi5sZW5ndGgpIHtcblx0XHRcdHZhciBpbm5lckNvbXBvbmVudHMgPSBiaW5kZXIoZWwpO1xuXG5cdFx0XHRpZiAoT2JqZWN0LmtleXMoaW5uZXJDb21wb25lbnRzKS5sZW5ndGgpIHtcblx0XHRcdFx0Ly8gYXR0YWNoIGlubmVyIGNvbXBvbmVudHMgdG8gdGhlIGN1cnJlbnQgb25lIChjcmVhdGUgYSBuZXcgc2NvcGUpIC4uLlxuXHRcdFx0XHRpZiAodHlwZW9mIGFDb21wb25lbnQgIT0gJ3VuZGVmaW5lZCcgJiYgYUNvbXBvbmVudC5jb250YWluZXIpXG5cdFx0XHRcdFx0YUNvbXBvbmVudC5jb250YWluZXIuYWRkKGlubmVyQ29tcG9uZW50cyk7XG5cdFx0XHRcdGVsc2UgLy8gb3Iga2VlcCB0aGVtIGluIHRoZSBjdXJyZW50IHNjb3BlXG5cdFx0XHRcdFx0Xy5lYWNoS2V5KGlubmVyQ29tcG9uZW50cywgc3RvcmVDb21wb25lbnQpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmIChhQ29tcG9uZW50KVxuXHRcdFx0c3RvcmVDb21wb25lbnQoYUNvbXBvbmVudCwgYXR0ci5jb21wTmFtZSk7XG5cdH1cblxuXHRmdW5jdGlvbiBjcmVhdGVDb21wb25lbnQoZWwsIGF0dHIpIHtcblx0XHRpZiAoYXR0ci5ub2RlKSB7IC8vIGVsZW1lbnQgd2lsbCBiZSBib3VuZCB0byBhIGNvbXBvbmVudFxuXHRcdFx0YXR0ci5wYXJzZSgpLnZhbGlkYXRlKCk7XG5cblx0XHRcdC8vIGdldCBjb21wb25lbnQgY2xhc3MgZnJvbSByZWdpc3RyeSBhbmQgdmFsaWRhdGVcblx0XHRcdHZhciBDb21wb25lbnRDbGFzcyA9IGNvbXBvbmVudHNSZWdpc3RyeS5nZXQoYXR0ci5jb21wQ2xhc3MpO1xuXG5cdFx0XHRpZiAoISBDb21wb25lbnRDbGFzcylcblx0XHRcdFx0dGhyb3cgbmV3IEJpbmRFcnJvcignY2xhc3MgJyArIGF0dHIuY29tcENsYXNzICsgJyBpcyBub3QgcmVnaXN0ZXJlZCcpO1xuXG5cdFx0XHRjaGVjayhDb21wb25lbnRDbGFzcywgTWF0Y2guU3ViY2xhc3MoQ29tcG9uZW50LCB0cnVlKSk7XG5cdFxuXHRcdFx0Ly8gY3JlYXRlIG5ldyBjb21wb25lbnRcblx0XHRcdHJldHVybiBuZXcgQ29tcG9uZW50Q2xhc3Moe30sIGVsKTtcblx0XHR9XG5cdH1cblxuXG5cdGZ1bmN0aW9uIHN0b3JlQ29tcG9uZW50KGFDb21wb25lbnQsIG5hbWUpIHtcblx0XHRpZiAoY29tcG9uZW50c1tuYW1lXSlcblx0XHRcdHRocm93IG5ldyBCaW5kRXJyb3IoJ2R1cGxpY2F0ZSBjb21wb25lbnQgbmFtZTogJyArIG5hbWUpO1xuXG5cdFx0Y29tcG9uZW50c1tuYW1lXSA9IGFDb21wb25lbnQ7XG5cdH1cbn1cblxuXG5iaW5kZXIuY29uZmlnID0gZnVuY3Rpb24ob3B0aW9ucykge1xuXHRvcHRzLmV4dGVuZChvcHRpb25zKTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgncHJvdG8nKTtcblxuZnVuY3Rpb24gQmluZEVycm9yKG1zZykge1xuXHR0aGlzLm1lc3NhZ2UgPSBtc2c7XG59XG5cbl8ubWFrZVN1YmNsYXNzKEJpbmRFcnJvciwgRXJyb3IpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJpbmRFcnJvcjtcbiIsIid1c2Ugc3RyaWN0JztcblxuLy8gWFhYIGRvY3NcblxuLy8gVGhpbmdzIHdlIGV4cGxpY2l0bHkgZG8gTk9UIHN1cHBvcnQ6XG4vLyAgICAtIGhldGVyb2dlbm91cyBhcnJheXNcbnZhciBfID0gcmVxdWlyZSgncHJvdG8nKTtcblxudmFyIGNoZWNrID0gZnVuY3Rpb24gKHZhbHVlLCBwYXR0ZXJuKSB7XG4gIC8vIFJlY29yZCB0aGF0IGNoZWNrIGdvdCBjYWxsZWQsIGlmIHNvbWVib2R5IGNhcmVkLlxuICB0cnkge1xuICAgIGNoZWNrU3VidHJlZSh2YWx1ZSwgcGF0dGVybik7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGlmICgoZXJyIGluc3RhbmNlb2YgTWF0Y2guRXJyb3IpICYmIGVyci5wYXRoKVxuICAgICAgZXJyLm1lc3NhZ2UgKz0gXCIgaW4gZmllbGQgXCIgKyBlcnIucGF0aDtcbiAgICB0aHJvdyBlcnI7XG4gIH1cbn07XG5tb2R1bGUuZXhwb3J0cyA9IGNoZWNrO1xuXG52YXIgTWF0Y2ggPSBjaGVjay5NYXRjaCA9IHtcbiAgT3B0aW9uYWw6IGZ1bmN0aW9uIChwYXR0ZXJuKSB7XG4gICAgcmV0dXJuIG5ldyBPcHRpb25hbChwYXR0ZXJuKTtcbiAgfSxcbiAgT25lT2Y6IGZ1bmN0aW9uICgvKmFyZ3VtZW50cyovKSB7XG4gICAgcmV0dXJuIG5ldyBPbmVPZihhcmd1bWVudHMpO1xuICB9LFxuICBBbnk6IFsnX19hbnlfXyddLFxuICBXaGVyZTogZnVuY3Rpb24gKGNvbmRpdGlvbikge1xuICAgIHJldHVybiBuZXcgV2hlcmUoY29uZGl0aW9uKTtcbiAgfSxcbiAgT2JqZWN0SW5jbHVkaW5nOiBmdW5jdGlvbiAocGF0dGVybikge1xuICAgIHJldHVybiBuZXcgT2JqZWN0SW5jbHVkaW5nKHBhdHRlcm4pO1xuICB9LFxuICAvLyBNYXRjaGVzIG9ubHkgc2lnbmVkIDMyLWJpdCBpbnRlZ2Vyc1xuICBJbnRlZ2VyOiBbJ19faW50ZWdlcl9fJ10sXG5cbiAgLy8gTWF0Y2hlcyBoYXNoIChvYmplY3QpIHdpdGggdmFsdWVzIG1hdGNoaW5nIHBhdHRlcm5cbiAgT2JqZWN0SGFzaDogZnVuY3Rpb24ocGF0dGVybikge1xuICAgIHJldHVybiBuZXcgT2JqZWN0SGFzaChwYXR0ZXJuKTtcbiAgfSxcblxuICBTdWJjbGFzczogZnVuY3Rpb24oU3VwZXJjbGFzcywgbWF0Y2hTdXBlcmNsYXNzVG9vKSB7XG4gICAgcmV0dXJuIG5ldyBTdWJjbGFzcyhTdXBlcmNsYXNzLCBtYXRjaFN1cGVyY2xhc3NUb28pO1xuICB9LFxuXG4gIC8vIFhYWCBtYXRjaGVycyBzaG91bGQga25vdyBob3cgdG8gZGVzY3JpYmUgdGhlbXNlbHZlcyBmb3IgZXJyb3JzXG4gIEVycm9yOiBUeXBlRXJyb3IsXG5cbiAgLy8gTWV0ZW9yLm1ha2VFcnJvclR5cGUoXCJNYXRjaC5FcnJvclwiLCBmdW5jdGlvbiAobXNnKSB7XG4gICAgLy8gdGhpcy5tZXNzYWdlID0gXCJNYXRjaCBlcnJvcjogXCIgKyBtc2c7XG4gICAgLy8gVGhlIHBhdGggb2YgdGhlIHZhbHVlIHRoYXQgZmFpbGVkIHRvIG1hdGNoLiBJbml0aWFsbHkgZW1wdHksIHRoaXMgZ2V0c1xuICAgIC8vIHBvcHVsYXRlZCBieSBjYXRjaGluZyBhbmQgcmV0aHJvd2luZyB0aGUgZXhjZXB0aW9uIGFzIGl0IGdvZXMgYmFjayB1cCB0aGVcbiAgICAvLyBzdGFjay5cbiAgICAvLyBFLmcuOiBcInZhbHNbM10uZW50aXR5LmNyZWF0ZWRcIlxuICAgIC8vIHRoaXMucGF0aCA9IFwiXCI7XG4gICAgLy8gSWYgdGhpcyBnZXRzIHNlbnQgb3ZlciBERFAsIGRvbid0IGdpdmUgZnVsbCBpbnRlcm5hbCBkZXRhaWxzIGJ1dCBhdCBsZWFzdFxuICAgIC8vIHByb3ZpZGUgc29tZXRoaW5nIGJldHRlciB0aGFuIDUwMCBJbnRlcm5hbCBzZXJ2ZXIgZXJyb3IuXG4gIC8vICAgdGhpcy5zYW5pdGl6ZWRFcnJvciA9IG5ldyBNZXRlb3IuRXJyb3IoNDAwLCBcIk1hdGNoIGZhaWxlZFwiKTtcbiAgLy8gfSksXG5cbiAgLy8gVGVzdHMgdG8gc2VlIGlmIHZhbHVlIG1hdGNoZXMgcGF0dGVybi4gVW5saWtlIGNoZWNrLCBpdCBtZXJlbHkgcmV0dXJucyB0cnVlXG4gIC8vIG9yIGZhbHNlICh1bmxlc3MgYW4gZXJyb3Igb3RoZXIgdGhhbiBNYXRjaC5FcnJvciB3YXMgdGhyb3duKS4gSXQgZG9lcyBub3RcbiAgLy8gaW50ZXJhY3Qgd2l0aCBfZmFpbElmQXJndW1lbnRzQXJlTm90QWxsQ2hlY2tlZC5cbiAgLy8gWFhYIG1heWJlIGFsc28gaW1wbGVtZW50IGEgTWF0Y2gubWF0Y2ggd2hpY2ggcmV0dXJucyBtb3JlIGluZm9ybWF0aW9uIGFib3V0XG4gIC8vICAgICBmYWlsdXJlcyBidXQgd2l0aG91dCB1c2luZyBleGNlcHRpb24gaGFuZGxpbmcgb3IgZG9pbmcgd2hhdCBjaGVjaygpXG4gIC8vICAgICBkb2VzIHdpdGggX2ZhaWxJZkFyZ3VtZW50c0FyZU5vdEFsbENoZWNrZWQgYW5kIE1ldGVvci5FcnJvciBjb252ZXJzaW9uXG4gIHRlc3Q6IGZ1bmN0aW9uICh2YWx1ZSwgcGF0dGVybikge1xuICAgIHRyeSB7XG4gICAgICBjaGVja1N1YnRyZWUodmFsdWUsIHBhdHRlcm4pO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKGUgaW5zdGFuY2VvZiBNYXRjaC5FcnJvcilcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgLy8gUmV0aHJvdyBvdGhlciBlcnJvcnMuXG4gICAgICB0aHJvdyBlO1xuICAgIH1cbiAgfSxcblxuICAvLyBSdW5zIGBmLmFwcGx5KGNvbnRleHQsIGFyZ3MpYC4gSWYgY2hlY2soKSBpcyBub3QgY2FsbGVkIG9uIGV2ZXJ5IGVsZW1lbnQgb2ZcbiAgLy8gYGFyZ3NgIChlaXRoZXIgZGlyZWN0bHkgb3IgaW4gdGhlIGZpcnN0IGxldmVsIG9mIGFuIGFycmF5KSwgdGhyb3dzIGFuIGVycm9yXG4gIC8vICh1c2luZyBgZGVzY3JpcHRpb25gIGluIHRoZSBtZXNzYWdlKS5cbiAgLy9cbiAgX2ZhaWxJZkFyZ3VtZW50c0FyZU5vdEFsbENoZWNrZWQ6IGZ1bmN0aW9uIChmLCBjb250ZXh0LCBhcmdzLCBkZXNjcmlwdGlvbikge1xuICAgIHZhciBhcmdDaGVja2VyID0gbmV3IEFyZ3VtZW50Q2hlY2tlcihhcmdzLCBkZXNjcmlwdGlvbik7XG4gICAgdmFyIHJlc3VsdCA9IGN1cnJlbnRBcmd1bWVudENoZWNrZXIud2l0aFZhbHVlKGFyZ0NoZWNrZXIsIGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBmLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgIH0pO1xuICAgIC8vIElmIGYgZGlkbid0IGl0c2VsZiB0aHJvdywgbWFrZSBzdXJlIGl0IGNoZWNrZWQgYWxsIG9mIGl0cyBhcmd1bWVudHMuXG4gICAgYXJnQ2hlY2tlci50aHJvd1VubGVzc0FsbEFyZ3VtZW50c0hhdmVCZWVuQ2hlY2tlZCgpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIE9wdGlvbmFsKHBhdHRlcm4pIHtcbiAgdGhpcy5wYXR0ZXJuID0gcGF0dGVybjtcbn07XG5cbmZ1bmN0aW9uIE9uZU9mKGNob2ljZXMpIHtcbiAgaWYgKGNob2ljZXMubGVuZ3RoID09IDApXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTXVzdCBwcm92aWRlIGF0IGxlYXN0IG9uZSBjaG9pY2UgdG8gTWF0Y2guT25lT2ZcIik7XG4gIHRoaXMuY2hvaWNlcyA9IGNob2ljZXM7XG59O1xuXG5mdW5jdGlvbiBXaGVyZShjb25kaXRpb24pIHtcbiAgdGhpcy5jb25kaXRpb24gPSBjb25kaXRpb247XG59O1xuXG5mdW5jdGlvbiBPYmplY3RJbmNsdWRpbmcocGF0dGVybikge1xuICB0aGlzLnBhdHRlcm4gPSBwYXR0ZXJuO1xufTtcblxuZnVuY3Rpb24gT2JqZWN0SGFzaChwYXR0ZXJuKSB7XG4gIHRoaXMucGF0dGVybiA9IHBhdHRlcm47XG59O1xuXG5mdW5jdGlvbiBTdWJjbGFzcyhTdXBlcmNsYXNzLCBtYXRjaFN1cGVyY2xhc3NUb28pIHtcbiAgdGhpcy5TdXBlcmNsYXNzID0gU3VwZXJjbGFzcztcbiAgdGhpcy5tYXRjaFN1cGVyY2xhc3MgPSBtYXRjaFN1cGVyY2xhc3NUb287XG59O1xuXG52YXIgdHlwZW9mQ2hlY2tzID0gW1xuICBbU3RyaW5nLCBcInN0cmluZ1wiXSxcbiAgW051bWJlciwgXCJudW1iZXJcIl0sXG4gIFtCb29sZWFuLCBcImJvb2xlYW5cIl0sXG4gIC8vIFdoaWxlIHdlIGRvbid0IGFsbG93IHVuZGVmaW5lZCBpbiBFSlNPTiwgdGhpcyBpcyBnb29kIGZvciBvcHRpb25hbFxuICAvLyBhcmd1bWVudHMgd2l0aCBPbmVPZi5cbiAgW3VuZGVmaW5lZCwgXCJ1bmRlZmluZWRcIl1cbl07XG5cbmZ1bmN0aW9uIGNoZWNrU3VidHJlZSh2YWx1ZSwgcGF0dGVybikge1xuICAvLyBNYXRjaCBhbnl0aGluZyFcbiAgaWYgKHBhdHRlcm4gPT09IE1hdGNoLkFueSlcbiAgICByZXR1cm47XG5cbiAgLy8gQmFzaWMgYXRvbWljIHR5cGVzLlxuICAvLyBEbyBub3QgbWF0Y2ggYm94ZWQgb2JqZWN0cyAoZS5nLiBTdHJpbmcsIEJvb2xlYW4pXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdHlwZW9mQ2hlY2tzLmxlbmd0aDsgKytpKSB7XG4gICAgaWYgKHBhdHRlcm4gPT09IHR5cGVvZkNoZWNrc1tpXVswXSkge1xuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gdHlwZW9mQ2hlY2tzW2ldWzFdKVxuICAgICAgICByZXR1cm47XG4gICAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJFeHBlY3RlZCBcIiArIHR5cGVvZkNoZWNrc1tpXVsxXSArIFwiLCBnb3QgXCIgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGVvZiB2YWx1ZSk7XG4gICAgfVxuICB9XG4gIGlmIChwYXR0ZXJuID09PSBudWxsKSB7XG4gICAgaWYgKHZhbHVlID09PSBudWxsKVxuICAgICAgcmV0dXJuO1xuICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIG51bGwsIGdvdCBcIiArIEVKU09OLnN0cmluZ2lmeSh2YWx1ZSkpO1xuICB9XG5cbiAgLy8gTWF0Y2guSW50ZWdlciBpcyBzcGVjaWFsIHR5cGUgZW5jb2RlZCB3aXRoIGFycmF5XG4gIGlmIChwYXR0ZXJuID09PSBNYXRjaC5JbnRlZ2VyKSB7XG4gICAgLy8gVGhlcmUgaXMgbm8gY29uc2lzdGVudCBhbmQgcmVsaWFibGUgd2F5IHRvIGNoZWNrIGlmIHZhcmlhYmxlIGlzIGEgNjQtYml0XG4gICAgLy8gaW50ZWdlci4gT25lIG9mIHRoZSBwb3B1bGFyIHNvbHV0aW9ucyBpcyB0byBnZXQgcmVtaW5kZXIgb2YgZGl2aXNpb24gYnkgMVxuICAgIC8vIGJ1dCB0aGlzIG1ldGhvZCBmYWlscyBvbiByZWFsbHkgbGFyZ2UgZmxvYXRzIHdpdGggYmlnIHByZWNpc2lvbi5cbiAgICAvLyBFLmcuOiAxLjM0ODE5MjMwODQ5MTgyNGUrMjMgJSAxID09PSAwIGluIFY4XG4gICAgLy8gQml0d2lzZSBvcGVyYXRvcnMgd29yayBjb25zaXN0YW50bHkgYnV0IGFsd2F5cyBjYXN0IHZhcmlhYmxlIHRvIDMyLWJpdFxuICAgIC8vIHNpZ25lZCBpbnRlZ2VyIGFjY29yZGluZyB0byBKYXZhU2NyaXB0IHNwZWNzLlxuICAgIGlmICh0eXBlb2YgdmFsdWUgPT09IFwibnVtYmVyXCIgJiYgKHZhbHVlIHwgMCkgPT09IHZhbHVlKVxuICAgICAgcmV0dXJuXG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgSW50ZWdlciwgZ290IFwiXG4gICAgICAgICAgICAgICAgKyAodmFsdWUgaW5zdGFuY2VvZiBPYmplY3QgPyBFSlNPTi5zdHJpbmdpZnkodmFsdWUpIDogdmFsdWUpKTtcbiAgfVxuXG4gIC8vIFwiT2JqZWN0XCIgaXMgc2hvcnRoYW5kIGZvciBNYXRjaC5PYmplY3RJbmNsdWRpbmcoe30pO1xuICBpZiAocGF0dGVybiA9PT0gT2JqZWN0KVxuICAgIHBhdHRlcm4gPSBNYXRjaC5PYmplY3RJbmNsdWRpbmcoe30pO1xuXG4gIC8vIEFycmF5IChjaGVja2VkIEFGVEVSIEFueSwgd2hpY2ggaXMgaW1wbGVtZW50ZWQgYXMgYW4gQXJyYXkpLlxuICBpZiAocGF0dGVybiBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgaWYgKHBhdHRlcm4ubGVuZ3RoICE9PSAxKVxuICAgICAgdGhyb3cgRXJyb3IoXCJCYWQgcGF0dGVybjogYXJyYXlzIG11c3QgaGF2ZSBvbmUgdHlwZSBlbGVtZW50XCIgK1xuICAgICAgICAgICAgICAgICAgRUpTT04uc3RyaW5naWZ5KHBhdHRlcm4pKTtcbiAgICBpZiAoIV8uaXNBcnJheSh2YWx1ZSkgJiYgIV8uaXNBcmd1bWVudHModmFsdWUpKSB7XG4gICAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJFeHBlY3RlZCBhcnJheSwgZ290IFwiICsgRUpTT04uc3RyaW5naWZ5KHZhbHVlKSk7XG4gICAgfVxuXG4gICAgXy5lYWNoKHZhbHVlLCBmdW5jdGlvbiAodmFsdWVFbGVtZW50LCBpbmRleCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY2hlY2tTdWJ0cmVlKHZhbHVlRWxlbWVudCwgcGF0dGVyblswXSk7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgaWYgKGVyciBpbnN0YW5jZW9mIE1hdGNoLkVycm9yKSB7XG4gICAgICAgICAgZXJyLnBhdGggPSBfcHJlcGVuZFBhdGgoaW5kZXgsIGVyci5wYXRoKTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBlcnI7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gQXJiaXRyYXJ5IHZhbGlkYXRpb24gY2hlY2tzLiBUaGUgY29uZGl0aW9uIGNhbiByZXR1cm4gZmFsc2Ugb3IgdGhyb3cgYVxuICAvLyBNYXRjaC5FcnJvciAoaWUsIGl0IGNhbiBpbnRlcm5hbGx5IHVzZSBjaGVjaygpKSB0byBmYWlsLlxuICBpZiAocGF0dGVybiBpbnN0YW5jZW9mIFdoZXJlKSB7XG4gICAgaWYgKHBhdHRlcm4uY29uZGl0aW9uKHZhbHVlKSlcbiAgICAgIHJldHVybjtcbiAgICAvLyBYWFggdGhpcyBlcnJvciBpcyB0ZXJyaWJsZVxuICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkZhaWxlZCBNYXRjaC5XaGVyZSB2YWxpZGF0aW9uXCIpO1xuICB9XG5cblxuICBpZiAocGF0dGVybiBpbnN0YW5jZW9mIE9wdGlvbmFsKVxuICAgIHBhdHRlcm4gPSBNYXRjaC5PbmVPZih1bmRlZmluZWQsIHBhdHRlcm4ucGF0dGVybik7XG5cbiAgaWYgKHBhdHRlcm4gaW5zdGFuY2VvZiBPbmVPZikge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGF0dGVybi5jaG9pY2VzLmxlbmd0aDsgKytpKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjaGVja1N1YnRyZWUodmFsdWUsIHBhdHRlcm4uY2hvaWNlc1tpXSk7XG4gICAgICAgIC8vIE5vIGVycm9yPyBZYXksIHJldHVybi5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIC8vIE90aGVyIGVycm9ycyBzaG91bGQgYmUgdGhyb3duLiBNYXRjaCBlcnJvcnMganVzdCBtZWFuIHRyeSBhbm90aGVyXG4gICAgICAgIC8vIGNob2ljZS5cbiAgICAgICAgaWYgKCEoZXJyIGluc3RhbmNlb2YgTWF0Y2guRXJyb3IpKVxuICAgICAgICAgIHRocm93IGVycjtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gWFhYIHRoaXMgZXJyb3IgaXMgdGVycmlibGVcbiAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJGYWlsZWQgTWF0Y2guT25lT2Ygb3IgTWF0Y2guT3B0aW9uYWwgdmFsaWRhdGlvblwiKTtcbiAgfVxuXG4gIC8vIEEgZnVuY3Rpb24gdGhhdCBpc24ndCBzb21ldGhpbmcgd2Ugc3BlY2lhbC1jYXNlIGlzIGFzc3VtZWQgdG8gYmUgYVxuICAvLyBjb25zdHJ1Y3Rvci5cbiAgaWYgKHBhdHRlcm4gaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIHBhdHRlcm4pXG4gICAgICByZXR1cm47XG4gICAgLy8gWFhYIHdoYXQgaWYgLm5hbWUgaXNuJ3QgZGVmaW5lZFxuICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIFwiICsgcGF0dGVybi5jb25zdHJ1Y3Rvci5uYW1lKTtcbiAgfVxuXG4gIHZhciB1bmtub3duS2V5c0FsbG93ZWQgPSBmYWxzZTtcbiAgaWYgKHBhdHRlcm4gaW5zdGFuY2VvZiBPYmplY3RJbmNsdWRpbmcpIHtcbiAgICB1bmtub3duS2V5c0FsbG93ZWQgPSB0cnVlO1xuICAgIHBhdHRlcm4gPSBwYXR0ZXJuLnBhdHRlcm47XG4gIH1cblxuICBpZiAocGF0dGVybiBpbnN0YW5jZW9mIE9iamVjdEhhc2gpIHtcbiAgICB2YXIga2V5UGF0dGVybiA9IHBhdHRlcm4ucGF0dGVybjtcbiAgICB2YXIgZW1wdHlIYXNoID0gdHJ1ZTtcbiAgICBmb3IgKHZhciBrZXkgaW4gdmFsdWUpIHtcbiAgICAgIGVtcHR5SGFzaCA9IGZhbHNlO1xuICAgICAgY2hlY2sodmFsdWVba2V5XSwga2V5UGF0dGVybik7XG4gICAgfVxuICAgIGlmIChlbXB0eUhhc2gpXG4gICAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJFeHBlY3RlZCBcIiArIHBhdHRlcm4uY29uc3RydWN0b3IubmFtZSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKHBhdHRlcm4gaW5zdGFuY2VvZiBTdWJjbGFzcykge1xuICAgIHZhciBTdXBlcmNsYXNzID0gcGF0dGVybi5TdXBlcmNsYXNzO1xuICAgIGlmIChwYXR0ZXJuLm1hdGNoU3VwZXJjbGFzcyAmJiB2YWx1ZSA9PSBTdXBlcmNsYXNzKVxuICAgICAgcmV0dXJuO1xuICAgIGlmICghICh2YWx1ZS5wcm90b3R5cGUgaW5zdGFuY2VvZiBTdXBlcmNsYXNzKSlcbiAgICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIFwiICsgcGF0dGVybi5jb25zdHJ1Y3Rvci5uYW1lICsgXCIgb2YgXCIgKyBTdXBlcmNsYXNzLm5hbWUpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmICh0eXBlb2YgcGF0dGVybiAhPT0gXCJvYmplY3RcIilcbiAgICB0aHJvdyBFcnJvcihcIkJhZCBwYXR0ZXJuOiB1bmtub3duIHBhdHRlcm4gdHlwZVwiKTtcblxuICAvLyBBbiBvYmplY3QsIHdpdGggcmVxdWlyZWQgYW5kIG9wdGlvbmFsIGtleXMuIE5vdGUgdGhhdCB0aGlzIGRvZXMgTk9UIGRvXG4gIC8vIHN0cnVjdHVyYWwgbWF0Y2hlcyBhZ2FpbnN0IG9iamVjdHMgb2Ygc3BlY2lhbCB0eXBlcyB0aGF0IGhhcHBlbiB0byBtYXRjaFxuICAvLyB0aGUgcGF0dGVybjogdGhpcyByZWFsbHkgbmVlZHMgdG8gYmUgYSBwbGFpbiBvbGQge09iamVjdH0hXG4gIGlmICh0eXBlb2YgdmFsdWUgIT09ICdvYmplY3QnKVxuICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIG9iamVjdCwgZ290IFwiICsgdHlwZW9mIHZhbHVlKTtcbiAgaWYgKHZhbHVlID09PSBudWxsKVxuICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIG9iamVjdCwgZ290IG51bGxcIik7XG4gIGlmICh2YWx1ZS5jb25zdHJ1Y3RvciAhPT0gT2JqZWN0KVxuICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIHBsYWluIG9iamVjdFwiKTtcblxuICB2YXIgcmVxdWlyZWRQYXR0ZXJucyA9IHt9O1xuICB2YXIgb3B0aW9uYWxQYXR0ZXJucyA9IHt9O1xuXG4gIE9iamVjdC5rZXlzKHBhdHRlcm4pLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgdmFyIHN1YlBhdHRlcm4gPSBwYXR0ZXJuW2tleV07XG4gICAgaWYgKHBhdHRlcm5ba2V5XSBpbnN0YW5jZW9mIE9wdGlvbmFsKVxuICAgICAgb3B0aW9uYWxQYXR0ZXJuc1trZXldID0gcGF0dGVybltrZXldLnBhdHRlcm47XG4gICAgZWxzZVxuICAgICAgcmVxdWlyZWRQYXR0ZXJuc1trZXldID0gcGF0dGVybltrZXldO1xuICB9KTtcblxuICBPYmplY3Qua2V5cyh2YWx1ZSkuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICB2YXIgc3ViVmFsdWUgPSB2YWx1ZVtrZXldO1xuICAgIHRyeSB7XG4gICAgICBpZiAocmVxdWlyZWRQYXR0ZXJucy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgIGNoZWNrU3VidHJlZShzdWJWYWx1ZSwgcmVxdWlyZWRQYXR0ZXJuc1trZXldKTtcbiAgICAgICAgZGVsZXRlIHJlcXVpcmVkUGF0dGVybnNba2V5XTtcbiAgICAgIH0gZWxzZSBpZiAob3B0aW9uYWxQYXR0ZXJucy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgIGNoZWNrU3VidHJlZShzdWJWYWx1ZSwgb3B0aW9uYWxQYXR0ZXJuc1trZXldKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICghdW5rbm93bktleXNBbGxvd2VkKVxuICAgICAgICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIlVua25vd24ga2V5XCIpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgaWYgKGVyciBpbnN0YW5jZW9mIE1hdGNoLkVycm9yKVxuICAgICAgICBlcnIucGF0aCA9IF9wcmVwZW5kUGF0aChrZXksIGVyci5wYXRoKTtcbiAgICAgIHRocm93IGVycjtcbiAgICB9XG4gIH0pO1xuXG4gIE9iamVjdC5rZXlzKHJlcXVpcmVkUGF0dGVybnMpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiTWlzc2luZyBrZXkgJ1wiICsga2V5ICsgXCInXCIpO1xuICB9KTtcbn07XG5cbmZ1bmN0aW9uIEFyZ3VtZW50Q2hlY2tlcihhcmdzLCBkZXNjcmlwdGlvbikge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIC8vIE1ha2UgYSBTSEFMTE9XIGNvcHkgb2YgdGhlIGFyZ3VtZW50cy4gKFdlJ2xsIGJlIGRvaW5nIGlkZW50aXR5IGNoZWNrc1xuICAvLyBhZ2FpbnN0IGl0cyBjb250ZW50cy4pXG4gIHNlbGYuYXJncyA9IF8uY2xvbmUoYXJncyk7XG4gIC8vIFNpbmNlIHRoZSBjb21tb24gY2FzZSB3aWxsIGJlIHRvIGNoZWNrIGFyZ3VtZW50cyBpbiBvcmRlciwgYW5kIHdlIHNwbGljZVxuICAvLyBvdXQgYXJndW1lbnRzIHdoZW4gd2UgY2hlY2sgdGhlbSwgbWFrZSBpdCBzbyB3ZSBzcGxpY2Ugb3V0IGZyb20gdGhlIGVuZFxuICAvLyByYXRoZXIgdGhhbiB0aGUgYmVnaW5uaW5nLlxuICBzZWxmLmFyZ3MucmV2ZXJzZSgpO1xuICBzZWxmLmRlc2NyaXB0aW9uID0gZGVzY3JpcHRpb247XG59O1xuXG5fLmV4dGVuZFByb3RvKEFyZ3VtZW50Q2hlY2tlciwge1xuICBjaGVja2luZzogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLl9jaGVja2luZ09uZVZhbHVlKHZhbHVlKSlcbiAgICAgIHJldHVybjtcbiAgICAvLyBBbGxvdyBjaGVjayhhcmd1bWVudHMsIFtTdHJpbmddKSBvciBjaGVjayhhcmd1bWVudHMuc2xpY2UoMSksIFtTdHJpbmddKVxuICAgIC8vIG9yIGNoZWNrKFtmb28sIGJhcl0sIFtTdHJpbmddKSB0byBjb3VudC4uLiBidXQgb25seSBpZiB2YWx1ZSB3YXNuJ3RcbiAgICAvLyBpdHNlbGYgYW4gYXJndW1lbnQuXG4gICAgaWYgKF8uaXNBcnJheSh2YWx1ZSkgfHwgXy5pc0FyZ3VtZW50cyh2YWx1ZSkpIHtcbiAgICAgIF8uZWFjaCh2YWx1ZSwgXy5iaW5kKHNlbGYuX2NoZWNraW5nT25lVmFsdWUsIHNlbGYpKTtcbiAgICB9XG4gIH0sXG4gIF9jaGVja2luZ09uZVZhbHVlOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzZWxmLmFyZ3MubGVuZ3RoOyArK2kpIHtcbiAgICAgIC8vIElzIHRoaXMgdmFsdWUgb25lIG9mIHRoZSBhcmd1bWVudHM/IChUaGlzIGNhbiBoYXZlIGEgZmFsc2UgcG9zaXRpdmUgaWZcbiAgICAgIC8vIHRoZSBhcmd1bWVudCBpcyBhbiBpbnRlcm5lZCBwcmltaXRpdmUsIGJ1dCBpdCdzIHN0aWxsIGEgZ29vZCBlbm91Z2hcbiAgICAgIC8vIGNoZWNrLilcbiAgICAgIGlmICh2YWx1ZSA9PT0gc2VsZi5hcmdzW2ldKSB7XG4gICAgICAgIHNlbGYuYXJncy5zcGxpY2UoaSwgMSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0sXG4gIHRocm93VW5sZXNzQWxsQXJndW1lbnRzSGF2ZUJlZW5DaGVja2VkOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmICghXy5pc0VtcHR5KHNlbGYuYXJncykpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJEaWQgbm90IGNoZWNrKCkgYWxsIGFyZ3VtZW50cyBkdXJpbmcgXCIgK1xuICAgICAgICAgICAgICAgICAgICAgIHNlbGYuZGVzY3JpcHRpb24pO1xuICB9XG59KTtcblxudmFyIF9qc0tleXdvcmRzID0gW1wiZG9cIiwgXCJpZlwiLCBcImluXCIsIFwiZm9yXCIsIFwibGV0XCIsIFwibmV3XCIsIFwidHJ5XCIsIFwidmFyXCIsIFwiY2FzZVwiLFxuICBcImVsc2VcIiwgXCJlbnVtXCIsIFwiZXZhbFwiLCBcImZhbHNlXCIsIFwibnVsbFwiLCBcInRoaXNcIiwgXCJ0cnVlXCIsIFwidm9pZFwiLCBcIndpdGhcIixcbiAgXCJicmVha1wiLCBcImNhdGNoXCIsIFwiY2xhc3NcIiwgXCJjb25zdFwiLCBcInN1cGVyXCIsIFwidGhyb3dcIiwgXCJ3aGlsZVwiLCBcInlpZWxkXCIsXG4gIFwiZGVsZXRlXCIsIFwiZXhwb3J0XCIsIFwiaW1wb3J0XCIsIFwicHVibGljXCIsIFwicmV0dXJuXCIsIFwic3RhdGljXCIsIFwic3dpdGNoXCIsXG4gIFwidHlwZW9mXCIsIFwiZGVmYXVsdFwiLCBcImV4dGVuZHNcIiwgXCJmaW5hbGx5XCIsIFwicGFja2FnZVwiLCBcInByaXZhdGVcIiwgXCJjb250aW51ZVwiLFxuICBcImRlYnVnZ2VyXCIsIFwiZnVuY3Rpb25cIiwgXCJhcmd1bWVudHNcIiwgXCJpbnRlcmZhY2VcIiwgXCJwcm90ZWN0ZWRcIiwgXCJpbXBsZW1lbnRzXCIsXG4gIFwiaW5zdGFuY2VvZlwiXTtcblxuLy8gQXNzdW1lcyB0aGUgYmFzZSBvZiBwYXRoIGlzIGFscmVhZHkgZXNjYXBlZCBwcm9wZXJseVxuLy8gcmV0dXJucyBrZXkgKyBiYXNlXG5mdW5jdGlvbiBfcHJlcGVuZFBhdGgoa2V5LCBiYXNlKSB7XG4gIGlmICgodHlwZW9mIGtleSkgPT09IFwibnVtYmVyXCIgfHwga2V5Lm1hdGNoKC9eWzAtOV0rJC8pKVxuICAgIGtleSA9IFwiW1wiICsga2V5ICsgXCJdXCI7XG4gIGVsc2UgaWYgKCFrZXkubWF0Y2goL15bYS16XyRdWzAtOWEtel8kXSokL2kpIHx8IF9qc0tleXdvcmRzLmluZGV4T2Yoa2V5KSAhPSAtMSkvL18uY29udGFpbnMoX2pzS2V5d29yZHMsIGtleSkpXG4gICAga2V5ID0gSlNPTi5zdHJpbmdpZnkoW2tleV0pO1xuXG4gIGlmIChiYXNlICYmIGJhc2VbMF0gIT09IFwiW1wiKVxuICAgIHJldHVybiBrZXkgKyAnLicgKyBiYXNlO1xuICByZXR1cm4ga2V5ICsgYmFzZTtcbn07XG5cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIEZhY2V0ZWRPYmplY3QgPSByZXF1aXJlKCcuLi9mYWNldHMvZl9vYmplY3QnKVxuXHQsIGZhY2V0c1JlZ2lzdHJ5ID0gcmVxdWlyZSgnLi9jX2ZhY2V0cy9jZl9yZWdpc3RyeScpXG5cdCwgQ29tcG9uZW50RmFjZXQgPSByZXF1aXJlKCcuL2NfZmFjZXQnKVxuXHQsIG1lc3Nlbmdlck1peGluID0gcmVxdWlyZSgnLi9tZXNzZW5nZXInKVxuXHQsIF8gPSByZXF1aXJlKCdwcm90bycpO1xuXG52YXIgQ29tcG9uZW50ID0gXy5jcmVhdGVTdWJjbGFzcyhGYWNldGVkT2JqZWN0LCAnQ29tcG9uZW50JywgdHJ1ZSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ29tcG9uZW50O1xuXG5cbkNvbXBvbmVudC5jcmVhdGVDb21wb25lbnRDbGFzcyA9IGZ1bmN0aW9uKG5hbWUsIGZhY2V0cykge1xuXHR2YXIgZmFjZXRzQ2xhc3NlcyA9IHt9O1xuXG5cdGZhY2V0cy5mb3JFYWNoKGZ1bmN0aW9uKGZjdCkge1xuXHRcdHZhciBmY3ROYW1lID0gXy5maXJzdExvd2VyQ2FzZShmY3QpO1xuXHRcdHZhciBmY3RDbGFzc05hbWUgPSBfLmZpcnN0VXBwZXJDYXNlKGZjdCk7XG5cdFx0ZmFjZXRzQ2xhc3Nlc1tmY3ROYW1lXSA9IGZhY2V0c1JlZ2lzdHJ5LmdldChmY3RDbGFzc05hbWUpXG5cdH0pO1xuXG5cdHJldHVybiBGYWNldGVkT2JqZWN0LmNyZWF0ZUZhY2V0ZWRDbGFzcy5jYWxsKHRoaXMsIG5hbWUsIGZhY2V0c0NsYXNzZXMpO1xufTtcblxuZGVsZXRlIENvbXBvbmVudC5jcmVhdGVGYWNldGVkQ2xhc3M7XG5cblxuXy5leHRlbmRQcm90byhDb21wb25lbnQsIHtcblx0aW5pdDogaW5pdENvbXBvbmVudCxcblx0YWRkRmFjZXQ6IGFkZEZhY2V0XG59KTtcblxuXy5leHRlbmRQcm90byhDb21wb25lbnQsIG1lc3Nlbmdlck1peGluKTtcblxuXG5mdW5jdGlvbiBpbml0Q29tcG9uZW50KGZhY2V0c09wdGlvbnMsIGVsZW1lbnQpIHtcblx0dGhpcy5lbCA9IGVsZW1lbnQ7XG5cdHRoaXMuaW5pdE1lc3NlbmdlcigpO1xufVxuXG5cbmZ1bmN0aW9uIGFkZEZhY2V0KGZhY2V0TmFtZU9yQ2xhc3MsIGZhY2V0T3B0cywgZmFjZXROYW1lKSB7XG5cdGNoZWNrKGZhY2V0TmFtZU9yQ2xhc3MsIE1hdGNoLk9uZU9mKFN0cmluZywgTWF0Y2guU3ViY2xhc3MoQ29tcG9uZW50RmFjZXQpKSk7XG5cdGNoZWNrKGZhY2V0T3B0cywgTWF0Y2guT3B0aW9uYWwoT2JqZWN0KSk7XG5cdGNoZWNrKGZhY2V0TmFtZSwgTWF0Y2guT3B0aW9uYWwoU3RyaW5nKSk7XG5cblx0aWYgKHR5cGVvZiBmYWNldE5hbWVPckNsYXNzID09ICdzdHJpbmcnKSB7XG5cdFx0dmFyIGZhY2V0Q2xhc3NOYW1lID0gXy5maXJzdFVwcGVyQ2FzZShmYWNldE5hbWVPckNsYXNzKTtcblx0XHR2YXIgRmFjZXRDbGFzcyA9IGZhY2V0c1JlZ2lzdHJ5LmdldChmYWNldENsYXNzTmFtZSk7XG5cdH0gZWxzZSBcblx0XHRGYWNldENsYXNzID0gZmFjZXROYW1lT3JDbGFzcztcblxuXHRmYWNldE5hbWUgPSBmYWNldE5hbWUgfHwgRmFjZXRDbGFzcy5uYW1lO1xuXG5cdEZhY2V0ZWRPYmplY3QucHJvdG90eXBlLmFkZEZhY2V0LmNhbGwodGhpcywgRmFjZXRDbGFzcywgZmFjZXRPcHRzLCBmYWNldE5hbWUpO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgRmFjZXQgPSByZXF1aXJlKCcuLi9mYWNldHMvZl9jbGFzcycpXG5cdCwgbWVzc2VuZ2VyTWl4aW4gPSByZXF1aXJlKCcuL21lc3NlbmdlcicpXG5cdCwgXyA9IHJlcXVpcmUoJ3Byb3RvJyk7XG5cbnZhciBDb21wb25lbnRGYWNldCA9IF8uY3JlYXRlU3ViY2xhc3MoRmFjZXQsICdDb21wb25lbnRGYWNldCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbXBvbmVudEZhY2V0O1xuXG5cbl8uZXh0ZW5kUHJvdG8oQ29tcG9uZW50RmFjZXQsIHtcblx0aW5pdDogaW5pdENvbXBvbmVudEZhY2V0LFxufSk7XG5cbl8uZXh0ZW5kUHJvdG8oQ29tcG9uZW50RmFjZXQsIG1lc3Nlbmdlck1peGluKTtcblxuXG5mdW5jdGlvbiBpbml0Q29tcG9uZW50RmFjZXQoKSB7XG5cdHRoaXMuaW5pdE1lc3NlbmdlcigpO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ29tcG9uZW50RmFjZXQgPSByZXF1aXJlKCcuLi9jX2ZhY2V0Jylcblx0LCBiaW5kZXIgPSByZXF1aXJlKCcuLi8uLi9iaW5kZXIvYmluZGVyJylcblx0LCBfID0gcmVxdWlyZSgncHJvdG8nKVxuXHQsIGZhY2V0c1JlZ2lzdHJ5ID0gcmVxdWlyZSgnLi9jZl9yZWdpc3RyeScpO1xuXG4vLyBjb250YWluZXIgZmFjZXRcbnZhciBDb250YWluZXIgPSBfLmNyZWF0ZVN1YmNsYXNzKENvbXBvbmVudEZhY2V0LCAnQ29udGFpbmVyJyk7XG5cbl8uZXh0ZW5kUHJvdG8oQ29udGFpbmVyLCB7XG5cdGluaXQ6IGluaXRDb250YWluZXIsXG5cdF9iaW5kOiBfYmluZENvbXBvbmVudHMsXG5cdGFkZDogYWRkQ2hpbGRDb21wb25lbnRzXG59KTtcblxuZmFjZXRzUmVnaXN0cnkuYWRkKENvbnRhaW5lcik7XG5cblxuZnVuY3Rpb24gaW5pdENvbnRhaW5lcigpIHtcblx0dGhpcy5jaGlsZHJlbiA9IHt9O1xufVxuXG5cbmZ1bmN0aW9uIF9iaW5kQ29tcG9uZW50cygpIHtcblx0Ly8gVE9ET1xuXHQvLyB0aGlzIGZ1bmN0aW9uIHNob3VsZCByZS1iaW5kIHJhdGhlciB0aGFuIGJpbmQgYWxsIGludGVybmFsIGVsZW1lbnRzXG5cdHRoaXMuY2hpbGRyZW4gPSBiaW5kZXIodGhpcy5vd25lci5lbCk7XG59XG5cblxuZnVuY3Rpb24gYWRkQ2hpbGRDb21wb25lbnRzKGNoaWxkQ29tcG9uZW50cykge1xuXHQvLyBUT0RPXG5cdC8vIHRoaXMgZnVuY3Rpb24gc2hvdWxkIGludGVsbGlnZW50bHkgcmUtYmluZCBleGlzdGluZyBjb21wb25lbnRzIHRvXG5cdC8vIG5ldyBlbGVtZW50cyAoaWYgdGhleSBjaGFuZ2VkKSBhbmQgcmUtYmluZCBwcmV2aW91c2x5IGJvdW5kIGV2ZW50cyB0byB0aGUgc2FtZVxuXHQvLyBldmVudCBoYW5kbGVyc1xuXHQvLyBvciBtYXliZSBub3QsIGlmIHRoaXMgZnVuY3Rpb24gaXMgb25seSB1c2VkIGJ5IGJpbmRlciB0byBhZGQgbmV3IGVsZW1lbnRzLi4uXG5cdF8uZXh0ZW5kKHRoaXMuY2hpbGRyZW4sIGNoaWxkQ29tcG9uZW50cyk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBDb21wb25lbnRGYWNldCA9IHJlcXVpcmUoJy4uL2NfZmFjZXQnKVxuXHQsIEZhY2V0RXJyb3IgPSBDb21wb25lbnRGYWNldC5FcnJvclxuXHQsIF8gPSByZXF1aXJlKCdwcm90bycpXG5cdCwgZmFjZXRzUmVnaXN0cnkgPSByZXF1aXJlKCcuL2NmX3JlZ2lzdHJ5Jylcblx0LCBtZXNzZW5nZXJNaXhpbiA9IHJlcXVpcmUoJy4uL21lc3NlbmdlcicpXG5cdCwgZG9tRXZlbnRzQ29uc3RydWN0b3JzID0gcmVxdWlyZSgnLi9kb21fZXZlbnRzJyk7XG5cbi8vIGV2ZW50cyBmYWNldFxudmFyIEV2ZW50cyA9IF8uY3JlYXRlU3ViY2xhc3MoQ29tcG9uZW50RmFjZXQsICdFdmVudHMnKTtcblxuXy5leHRlbmRQcm90byhFdmVudHMsIHtcblx0aW5pdDogaW5pdEV2ZW50c0ZhY2V0LFxuXHRkb206IGdldERvbUVsZW1lbnQsXG5cdGhhbmRsZUV2ZW50OiBoYW5kbGVFdmVudCwgLy8gZXZlbnQgZGlzcGF0Y2hlciAtIGFzIGRlZmluZWQgYnkgRXZlbnQgRE9NIEFQSVxuXHRvbjogYWRkTGlzdGVuZXIsXG5cdG9mZjogcmVtb3ZlTGlzdGVuZXIsXG5cdG9uRXZlbnRzOiBhZGRMaXN0ZW5lcnNUb0V2ZW50cyxcblx0b2ZmRXZlbnRzOiByZW1vdmVMaXN0ZW5lcnNGcm9tRXZlbnRzLFxuXHR0cmlnZ2VyOiB0cmlnZ2VyRXZlbnQsXG5cdGdldExpc3RlbmVyczogZ2V0TGlzdGVuZXJzLFxuXHQvLyBfcmVhdHRhY2g6IF9yZWF0dGFjaEV2ZW50c09uRWxlbWVudENoYW5nZVxufSk7XG5cbmZhY2V0c1JlZ2lzdHJ5LmFkZChFdmVudHMpO1xuXG5cbnZhciB1c2VDYXB0dXJlU3VmZml4ID0gJ19fY2FwdHVyZSdcblx0LCB3cm9uZ0V2ZW50UGF0dGVybiA9IC9fX2NhcHR1cmUvO1xuXG5cbmZ1bmN0aW9uIGluaXRFdmVudHNGYWNldCgpIHtcblx0Ly8gZGVwZW5kZW5jeVxuXHRpZiAoISB0aGlzLm93bmVyLmZhY2V0cy5FbClcblx0XHR0aHJvdyBuZXcgRmFjZXRFcnJvcignRXZlbnRzIGZhY2V0IHJlcXVpcmUgRWwgZmFjZXQnKTtcblxuXHQvLyBpbml0aWFsaXplIGxpc3RlbmVycyBtYXBcblx0dGhpcy5fZXZlbnRzTGlzdGVuZXJzID0ge307XG59XG5cblxuZnVuY3Rpb24gZ2V0RG9tRWxlbWVudCgpIHtcblx0cmV0dXJuIHRoaXMub3duZXIuRWwuZG9tO1xufVxuXG5cbmZ1bmN0aW9uIGhhbmRsZUV2ZW50KGV2ZW50KSB7XG5cdGlzQ2FwdHVyZVBoYXNlID0gZXZlbnQuZXZlbnRQaGFzZSA9PSB3aW5kb3cuRXZlbnQuQ0FQVFVSSU5HX1BIQVNFO1xuXG5cdHZhciBldmVudEtleSA9IGV2ZW50LnR5cGUgKyAoaXNDYXB0dXJlUGhhc2UgPyB1c2VDYXB0dXJlU3VmZml4IDogJycpXG5cdFx0LCBldmVudExpc3RlbmVycyA9IHRoaXMuX2V2ZW50c0xpc3RlbmVyc1tldmVudEtleV07XG5cblx0aWYgKGV2ZW50TGlzdGVuZXJzKVxuXHRcdGV2ZW50TGlzdGVuZXJzLmZvckVhY2goZnVuY3Rpb24obGlzdGVuZXIpIHtcblx0XHRcdGxpc3RlbmVyKGV2ZW50KTtcblx0XHR9KTtcbn1cblxuXG5mdW5jdGlvbiBhZGRMaXN0ZW5lcihldmVudFR5cGVzLCBsaXN0ZW5lciwgdXNlQ2FwdHVyZSkge1xuXHRjaGVjayhldmVudHMsIFN0cmluZyk7XG5cdGNoZWNrKGxpc3RlbmVyLCBGdW5jdGlvbik7XG5cblx0dmFyIGV2ZW50c0FycmF5ID0gZXZlbnRUeXBlcy5zcGxpdCgvXFxzKlxcLD9cXHMqLylcblx0XHQsIHdhc0F0dGFjaGVkID0gZmFsc2U7XG5cblx0ZXZlbnRzQXJyYXkuZm9yRWFjaChmdW5jdGlvbihldmVudFR5cGUpIHtcblx0XHRpZiAod3JvbmdFdmVudFBhdHRlcm4udGVzdChldmVudFR5cGUpKVxuXHRcdFx0dGhyb3cgbmV3IFJhbmdlRXJyb3IoJ2V2ZW50IHR5cGUgY2Fubm90IGNvbnRhaW4gJyArIHVzZUNhcHR1cmVTdWZmaXgpO1xuXG5cdFx0dmFyIGV2ZW50S2V5ID0gZXZlbnRUeXBlICsgKHVzZUNhcHR1cmUgPyB1c2VDYXB0dXJlU3VmZml4IDogJycpXG5cdFx0XHQsIGV2ZW50TGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzTGlzdGVuZXJzW2V2ZW50S2V5XVxuXHRcdFx0XHQ9IHRoaXMuX2V2ZW50c0xpc3RlbmVyc1tldmVudEtleV0gfHwgW107XG5cblx0XHRpZiAoISBfaGFzRXZlbnRMaXN0ZW5lcnMoZXZlbnRLZXkpKSB7XG5cdFx0XHQvLyB0cnVlID0gdXNlIGNhcHR1cmUsIGZvciBwYXJ0aWN1bGFyIGxpc3RlbmVyIGl0IGlzIGRldGVybWluZWQgaW4gaGFuZGxlRXZlbnRcblx0XHRcdHRoaXMuZG9tKCkuYWRkRXZlbnRMaXN0ZW5lcihldmVudEtleSwgdGhpcywgdHJ1ZSk7XG5cdFx0XHR2YXIgbm90WWV0QXR0YWNoZWQgPSB0cnVlO1xuXHRcdH0gZWxzZVxuXHRcdFx0bm90WWV0QXR0YWNoZWQgPSBldmVudExpc3RlbmVycy5pbmRleE9mKGxpc3RlbmVyKSA9PSAtMTtcblxuXHRcdGlmIChub3RZZXRBdHRhY2hlZCkge1xuXHRcdFx0d2FzQXR0YWNoZWQgPSB0cnVlO1xuXHRcdFx0ZXZlbnRMaXN0ZW5lcnMucHVzaChsaXN0ZW5lcik7XG5cdFx0fVxuXHR9KTtcblxuXHRyZXR1cm4gd2FzQXR0YWNoZWQ7XG59XG5cblxuZnVuY3Rpb24gYWRkTGlzdGVuZXJzVG9FdmVudHMoZXZlbnRzTGlzdGVuZXJzLCB1c2VDYXB0dXJlKSB7XG5cdGNoZWNrKGV2ZW50c0xpc3RlbmVycywgTWF0Y2guT2JqZWN0KTtcblxuXHR2YXIgd2FzQXR0YWNoZWRNYXAgPSBfLm1hcEtleXMoZXZlbnRzTGlzdGVuZXJzLCBmdW5jdGlvbihsaXN0ZW5lciwgZXZlbnRUeXBlcykge1xuXHRcdHJldHVybiB0aGlzLmFkZExpc3RlbmVyKGV2ZW50VHlwZXMsIGxpc3RlbmVyLCB1c2VDYXB0dXJlKVxuXHR9LCB0aGlzKTtcblxuXHRyZXR1cm4gd2FzQXR0YWNoZWRNYXA7XHRcbn1cblxuXG5mdW5jdGlvbiByZW1vdmVMaXN0ZW5lcihldmVudFR5cGVzLCBsaXN0ZW5lciwgdXNlQ2FwdHVyZSkge1xuXHRjaGVjayhldmVudFR5cGVzLCBTdHJpbmcpO1xuXHRjaGVjayhsaXN0ZW5lciwgRnVuY3Rpb24pO1xuXG5cdHZhciBldmVudHNBcnJheSA9IGV2ZW50VHlwZXMuc3BsaXQoL1xccypcXCw/XFxzKi8pXG5cdFx0LCB3YXNSZW1vdmVkID0gZmFsc2U7XG5cblx0ZXZlbnRzQXJyYXkuZm9yRWFjaChmdW5jdGlvbihldmVudFR5cGUpIHtcblx0XHRpZiAod3JvbmdFdmVudFBhdHRlcm4udGVzdChldmVudFR5cGUpKVxuXHRcdFx0dGhyb3cgbmV3IFJhbmdlRXJyb3IoJ2V2ZW50IHR5cGUgY2Fubm90IGNvbnRhaW4gJyArIHVzZUNhcHR1cmVTdWZmaXgpO1xuXG5cdFx0dmFyIGV2ZW50S2V5ID0gZXZlbnRUeXBlICsgKHVzZUNhcHR1cmUgPyB1c2VDYXB0dXJlU3VmZml4IDogJycpXG5cdFx0XHQsIGV2ZW50TGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzTGlzdGVuZXJzW2V2ZW50S2V5XTtcblxuXHRcdGlmICghIChldmVudExpc3RlbmVycyAmJiBldmVudExpc3RlbmVycy5sZW5ndGgpKSByZXR1cm47XG5cblx0XHRpZiAobGlzdGVuZXIpIHtcblx0XHRcdGxpc3RlbmVySW5kZXggPSBldmVudExpc3RlbmVycy5pbmRleE9mKGxpc3RlbmVyKTtcblx0XHRcdGlmIChsaXN0ZW5lckluZGV4ID09IC0xKVxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHRldmVudExpc3RlbmVycy5zcGxpY2UobGlzdGVuZXJJbmRleCwgMSk7XG5cdFx0XHRpZiAoISBldmVudExpc3RlbmVycy5sZW5ndGgpXG5cdFx0XHRcdGRlbGV0ZSB0aGlzLl9ldmVudHNMaXN0ZW5lcnNbZXZlbnRLZXldO1xuXHRcdH0gZWxzZVxuXHRcdFx0ZGVsZXRlIHRoaXMuX2V2ZW50c0xpc3RlbmVyc1tldmVudEtleV07XG5cblx0XHR3YXNSZW1vdmVkID0gdHJ1ZTtcblxuXHRcdGlmICghIF9oYXNFdmVudExpc3RlbmVycyhldmVudFR5cGUpKVxuXHRcdFx0Ly8gdHJ1ZSA9IHVzZSBjYXB0dXJlLCBmb3IgcGFydGljdWxhciBsaXN0ZW5lciBpdCBpcyBkZXRlcm1pbmVkIGluIGhhbmRsZUV2ZW50XG5cdFx0XHR0aGlzLmRvbSgpLnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlLCB0aGlzLCB0cnVlKTtcblx0fSk7XG5cblx0cmV0dXJuIHdhc1JlbW92ZWQ7XG59XG5cblxuZnVuY3Rpb24gcmVtb3ZlTGlzdGVuZXJzRnJvbUV2ZW50cyhldmVudHNMaXN0ZW5lcnMsIHVzZUNhcHR1cmUpIHtcblx0Y2hlY2soZXZlbnRzTGlzdGVuZXJzLCBNYXRjaC5PYmplY3QpO1xuXG5cdHZhciB3YXNSZW1vdmVkTWFwID0gXy5tYXBLZXlzKGV2ZW50c0xpc3RlbmVycywgZnVuY3Rpb24obGlzdGVuZXIsIGV2ZW50VHlwZXMpIHtcblx0XHRyZXR1cm4gdGhpcy5yZW1vdmVMaXN0ZW5lcihldmVudFR5cGVzLCBsaXN0ZW5lciwgdXNlQ2FwdHVyZSk7XG5cdH0sIHRoaXMpO1xuXG5cdHJldHVybiB3YXNSZW1vdmVkTWFwO1xufVxuXG5cbmZ1bmN0aW9uIHRyaWdnZXJFdmVudChldmVudFR5cGUsIHByb3BlcnRpZXMpIHtcblx0Y2hlY2soZXZlbnRUeXBlLCBTdHJpbmcpO1xuXG5cdHZhciBFdmVudENvbnN0cnVjdG9yID0gZG9tRXZlbnRzQ29uc3RydWN0b3JzW2V2ZW50VHlwZV07XG5cblx0aWYgKHR5cGVvZiBldmVudENvbnN0cnVjdG9yICE9ICdmdW5jdGlvbicpXG5cdFx0dGhyb3cgbmV3IEVycm9yKCd1bnN1cHBvcnRlZCBldmVudCB0eXBlJyk7XG5cblx0dmFyIGRvbUV2ZW50ID0gRXZlbnRDb25zdHJ1Y3RvcihldmVudFR5cGUsIHByb3BlcnRpZXMpO1xuXHQvLyA/Pz8gcHJvcGVydGllcy50eXBlID0gZXZlbnRUeXBlO1xuXHQvLyA/Pz8gRXZlbnRDb25zdHJ1Y3Rvcihwcm9wZXJ0aWVzKTtcblx0dmFyIG5vdENhbmNlbGxlZCA9IHRoaXMuZG9tKCkuZGlzcGF0Y2hFdmVudChkb21FdmVudCk7XG5cblx0cmV0dXJuIG5vdENhbmNlbGxlZDtcbn1cblxuXG5mdW5jdGlvbiBnZXRMaXN0ZW5lcnMoZXZlbnRUeXBlLCB1c2VDYXB0dXJlKSB7XG5cdGNoZWNrKGV2ZW50VHlwZSwgU3RyaW5nKTtcblxuXHR2YXIgZXZlbnRLZXkgPSBldmVudFR5cGUgKyAodXNlQ2FwdHVyZSA/IHVzZUNhcHR1cmVTdWZmaXggOiAnJylcblx0XHQsIGV2ZW50TGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzTGlzdGVuZXJzW2V2ZW50S2V5XTtcblxuXHRyZXR1cm4gZXZlbnRMaXN0ZW5lcnMgJiYgZXZlbnRMaXN0ZW5lcnMubGVuZ3RoXG5cdFx0XHRcdCA/IFtdLmNvbmNhdChldmVudExpc3RlbmVycylcblx0XHRcdFx0IDogdW5kZWZpbmVkO1xufVxuXG5cbmZ1bmN0aW9uIF9oYXNFdmVudExpc3RlbmVycyhldmVudFR5cGUpIHtcblx0dmFyIG5vdENhcHR1cmVkRXZlbnRzID0gdGhpcy5fZXZlbnRzTGlzdGVuZXJzW2V2ZW50VHlwZV1cblx0XHQsIGNhcHR1cmVkRXZlbnRzID0gdGhpcy5fZXZlbnRzTGlzdGVuZXJzW2V2ZW50VHlwZSArIHVzZUNhcHR1cmVTdWZmaXhdO1xuXG5cdHJldHVybiAobm90Q2FwdHVyZWRFdmVudHMgJiYgbm90Q2FwdHVyZWRFdmVudHMubGVuZ3RoKVxuXHRcdCAgICB8fCAoY2FwdHVyZWRFdmVudHMgJiYgY2FwdHVyZWRFdmVudHMubGVuZ3RoKTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIENsYXNzUmVnaXN0cnkgPSByZXF1aXJlKCcuLi8uLi9yZWdpc3RyeScpXG5cdCwgQ29tcG9uZW50RmFjZXQgPSByZXF1aXJlKCcuLi9jX2ZhY2V0Jyk7XG5cbnZhciBmYWNldHNSZWdpc3RyeSA9IG5ldyBDbGFzc1JlZ2lzdHJ5KENvbXBvbmVudEZhY2V0KTtcblxuZmFjZXRzUmVnaXN0cnkuYWRkKENvbXBvbmVudEZhY2V0KTtcblxubW9kdWxlLmV4cG9ydHMgPSBmYWNldHNSZWdpc3RyeTtcblxuLy8gVE9ETyAtIHJlZmFjdG9yIGNvbXBvbmVudHMgcmVnaXN0cnkgdGVzdCBpbnRvIGEgZnVuY3Rpb25cbi8vIHRoYXQgdGVzdHMgYSByZWdpc3RyeSB3aXRoIGEgZ2l2ZW4gZm91bmRhdGlvbiBjbGFzc1xuLy8gTWFrZSB0ZXN0IGZvciB0aGlzIHJlZ2lzdHJ5IGJhc2VkIG9uIHRoaXMgZnVuY3Rpb24iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgncHJvdG8nKTtcblxuXG4vLyBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9SZWZlcmVuY2UvRXZlbnRzXG5cbnZhciBldmVudFR5cGVzID0ge1xuXHRDbGlwYm9hcmRFdmVudDogWydjb3B5JywgJ2N1dCcsICdwYXN0ZScsICdiZWZvcmVjb3B5JywgJ2JlZm9yZWN1dCcsICdiZWZvcmVwYXN0ZSddLFxuXHRFdmVudDogWydpbnB1dCddLFxuXHRGb2N1c0V2ZW50OiBbJ2ZvY3VzJywgJ2JsdXInLCAnZm9jdXNpbicsICdmb2N1c291dCddLFxuXHRLZXlib2FyZEV2ZW50OiBbJ2tleWRvd24nLCAna2V5cHJlc3MnLCAgJ2tleXVwJ10sXG5cdE1vdXNlRXZlbnQ6IFsnY2xpY2snLCAnY29udGV4dG1lbnUnLCAnZGJsY2xpY2snLCAnbW91c2Vkb3duJywgJ21vdXNldXAnLFxuXHRcdFx0XHQgJ21vdXNlZW50ZXInLCAnbW91c2VsZWF2ZScsICdtb3VzZW1vdmUnLCAnbW91c2VvdXQnLCAnbW91c2VvdmVyJyxcblx0XHRcdFx0ICdzaG93JyAvKiBjb250ZXh0IG1lbnUgKi9dLFxuXHRUb3VjaEV2ZW50OiBbJ3RvdWNoc3RhcnQnLCAndG91Y2hlbmQnLCAndG91Y2htb3ZlJywgJ3RvdWNoZW50ZXInLCAndG91Y2hsZWF2ZScsICd0b3VjaGNhbmNlbCddLFxufTtcblxuXG4vLyBtb2NrIHdpbmRvdyBhbmQgZXZlbnQgY29uc3RydWN0b3JzIGZvciB0ZXN0aW5nXG5pZiAodHlwZW9mIHdpbmRvdyAhPSAndW5kZWZpbmVkJylcblx0dmFyIGdsb2JhbCA9IHdpbmRvdztcbmVsc2Uge1xuXHRnbG9iYWwgPSB7fTtcblx0Xy5lYWNoS2V5KGV2ZW50VHlwZXMsIGZ1bmN0aW9uKGVUeXBlcywgZXZlbnRDb25zdHJ1Y3Rvck5hbWUpIHtcblx0XHR2YXIgZXZlbnRzQ29uc3RydWN0b3I7XG5cdFx0ZXZhbChcblx0XHRcdCdldmVudHNDb25zdHJ1Y3RvciA9IGZ1bmN0aW9uICcgKyBldmVudENvbnN0cnVjdG9yTmFtZSArICcodHlwZSwgcHJvcGVydGllcykgeyBcXFxuXHRcdFx0XHR0aGlzLnR5cGUgPSB0eXBlOyBcXFxuXHRcdFx0XHRfLmV4dGVuZCh0aGlzLCBwcm9wZXJ0aWVzKTsgXFxcblx0XHRcdH07J1xuXHRcdCk7XG5cdFx0Z2xvYmFsW2V2ZW50Q29uc3RydWN0b3JOYW1lXSA9IGV2ZW50c0NvbnN0cnVjdG9yO1xuXHR9KTtcbn1cblxuXG52YXIgZG9tRXZlbnRzQ29uc3RydWN0b3JzID0ge307XG5cbl8uZWFjaEtleShldmVudFR5cGVzLCBmdW5jdGlvbihlVHlwZXMsIGV2ZW50Q29uc3RydWN0b3JOYW1lKSB7XG5cdGVUeXBlcy5mb3JFYWNoKGZ1bmN0aW9uKHR5cGUpIHtcblx0XHRpZiAoT2JqZWN0Lmhhc093blByb3BlcnR5KGRvbUV2ZW50c0NvbnN0cnVjdG9ycywgdHlwZSkpXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ2R1cGxpY2F0ZSBldmVudCB0eXBlICcgKyB0eXBlKTtcblxuXHRcdGRvbUV2ZW50c0NvbnN0cnVjdG9yc1t0eXBlXSA9IGdsb2JhbFtldmVudENvbnN0cnVjdG9yTmFtZV07XG5cdH0pO1xufSk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBkb21FdmVudHNDb25zdHJ1Y3RvcnM7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBDbGFzc1JlZ2lzdHJ5ID0gcmVxdWlyZSgnLi4vcmVnaXN0cnknKVxuXHQsIENvbXBvbmVudCA9IHJlcXVpcmUoJy4vY19jbGFzcycpO1xuXG52YXIgY29tcG9uZW50c1JlZ2lzdHJ5ID0gbmV3IENsYXNzUmVnaXN0cnkoQ29tcG9uZW50KTtcblxuY29tcG9uZW50c1JlZ2lzdHJ5LmFkZChDb21wb25lbnQpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNvbXBvbmVudHNSZWdpc3RyeTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIENvbXBvbmVudCA9IHJlcXVpcmUoJy4uL2NfY2xhc3MnKVxuXHQsIGNvbXBvbmVudHNSZWdpc3RyeSA9IHJlcXVpcmUoJy4uL2NfcmVnaXN0cnknKTtcblxuXG52YXIgVmlldyA9IENvbXBvbmVudC5jcmVhdGVDb21wb25lbnRDbGFzcygnVmlldycsIFsnY29udGFpbmVyJ10pO1xuXG5jb21wb25lbnRzUmVnaXN0cnkuYWRkKFZpZXcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZpZXc7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgncHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vY2hlY2snKVxuXHQsIE1hdGNoID0gY2hlY2suTWF0Y2g7XG5cbnZhciBtZXNzZW5nZXJNaXhpbiA9ICB7XG5cdGluaXRNZXNzZW5nZXI6IGluaXRNZXNzZW5nZXIsXG5cdG9uTWVzc2FnZTogcmVnaXN0ZXJTdWJzY3JpYmVyLFxuXHRvZmZNZXNzYWdlOiByZW1vdmVTdWJzY3JpYmVyLFxuXHRvbk1lc3NhZ2VzOiByZWdpc3RlclN1YnNjcmliZXJzLFxuXHRvZmZNZXNzYWdlczogcmVtb3ZlU3Vic2NyaWJlcnMsXG5cdHBvc3RNZXNzYWdlOiBwb3N0TWVzc2FnZSxcblx0Z2V0TWVzc2FnZVN1YnNjcmliZXJzOiBnZXRNZXNzYWdlU3Vic2NyaWJlcnMsXG5cdF9jaG9vc2VTdWJzY3JpYmVyc0hhc2g6IF9jaG9vc2VTdWJzY3JpYmVyc0hhc2hcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gbWVzc2VuZ2VyTWl4aW47XG5cblxuZnVuY3Rpb24gaW5pdE1lc3NlbmdlcigpIHtcblx0T2JqZWN0LmRlZmluZVByb3BlcnRpZXModGhpcywge1xuXHRcdF9tZXNzYWdlU3Vic2NyaWJlcnM6IHtcblx0XHRcdHdyaXRhYmxlOiB0cnVlLFxuXHRcdFx0dmFsdWU6IHt9XG5cdFx0fSxcblx0XHRfcGF0dGVybk1lc3NhZ2VTdWJzY3JpYmVyczoge1xuXHRcdFx0d3JpdGFibGU6IHRydWUsXG5cdFx0XHR2YWx1ZToge31cblx0XHR9XG5cdH0pO1xufVxuXG5cbmZ1bmN0aW9uIHJlZ2lzdGVyU3Vic2NyaWJlcihtZXNzYWdlLCBzdWJzY3JpYmVyKSB7XG5cdGNoZWNrKG1lc3NhZ2UsIE1hdGNoLk9uZU9mKFN0cmluZywgUmVnRXhwKSk7XG5cdGNoZWNrKHN1YnNjcmliZXIsIEZ1bmN0aW9uKTsgXG5cblx0dmFyIHN1YnNjcmliZXJzSGFzaCA9IHRoaXMuX2Nob29zZVN1YnNjcmliZXJzSGFzaChtZXNzYWdlKTtcblx0dmFyIG1zZ1N1YnNjcmliZXJzID0gc3Vic2NyaWJlcnNIYXNoW21lc3NhZ2VdID0gc3Vic2NyaWJlcnNIYXNoW21lc3NhZ2VdIHx8IFtdO1xuXHR2YXIgbm90WWV0UmVnaXN0ZXJlZCA9IG1zZ1N1YnNjcmliZXJzLmluZGV4T2Yoc3Vic2NyaWJlcikgPT0gLTE7XG5cblx0aWYgKG5vdFlldFJlZ2lzdGVyZWQpXG5cdFx0bXNnU3Vic2NyaWJlcnMucHVzaChzdWJzY3JpYmVyKTtcblxuXHRyZXR1cm4gbm90WWV0UmVnaXN0ZXJlZDtcbn1cblxuXG5mdW5jdGlvbiByZWdpc3RlclN1YnNjcmliZXJzKG1lc3NhZ2VTdWJzY3JpYmVycykge1xuXHRjaGVjayhtZXNzYWdlU3Vic2NyaWJlcnMsIE1hdGNoLk9iamVjdCk7XG5cblx0dmFyIG5vdFlldFJlZ2lzdGVyZWRNYXAgPSBfLm1hcEtleXMobWVzc2FnZVN1YnNjcmliZXJzLCBmdW5jdGlvbihzdWJzY3JpYmVyLCBtZXNzYWdlKSB7XG5cdFx0cmV0dXJuIHRoaXMucmVnaXN0ZXJTdWJzY3JpYmVyKG1lc3NhZ2UsIHN1YnNjcmliZXIpXG5cdH0sIHRoaXMpO1xuXG5cdHJldHVybiBub3RZZXRSZWdpc3RlcmVkTWFwO1xufVxuXG5cbi8vIHJlbW92ZXMgYWxsIHN1YnNjcmliZXJzIGZvciB0aGUgbWVzc2FnZSBpZiBzdWJzY3JpYmVyIGlzbid0IHN1cHBsaWVkXG5mdW5jdGlvbiByZW1vdmVTdWJzY3JpYmVyKG1lc3NhZ2UsIHN1YnNjcmliZXIpIHtcblx0Y2hlY2sobWVzc2FnZSwgTWF0Y2guT25lT2YoU3RyaW5nLCBSZWdFeHApKTtcblx0Y2hlY2soc3Vic2NyaWJlciwgTWF0Y2guT3B0aW9uYWwoRnVuY3Rpb24pKTsgXG5cblx0dmFyIHN1YnNjcmliZXJzSGFzaCA9IHRoaXMuX2Nob29zZVN1YnNjcmliZXJzSGFzaChtZXNzYWdlKTtcblx0dmFyIG1zZ1N1YnNjcmliZXJzID0gc3Vic2NyaWJlcnNIYXNoW21lc3NhZ2VdO1xuXHRpZiAoISBtc2dTdWJzY3JpYmVycyB8fCAhIG1zZ1N1YnNjcmliZXJzLmxlbmd0aCkgcmV0dXJuIGZhbHNlO1xuXG5cdGlmIChzdWJzY3JpYmVyKSB7XG5cdFx0c3Vic2NyaWJlckluZGV4ID0gbXNnU3Vic2NyaWJlcnMuaW5kZXhPZihzdWJzY3JpYmVyKTtcblx0XHRpZiAoc3Vic2NyaWJlckluZGV4ID09IC0xKSByZXR1cm4gZmFsc2U7XG5cdFx0bXNnU3Vic2NyaWJlcnMuc3BsaWNlKHN1YnNjcmliZXJJbmRleCwgMSk7XG5cdFx0aWYgKCEgbXNnU3Vic2NyaWJlcnMubGVuZ3RoKVxuXHRcdFx0ZGVsZXRlIHN1YnNjcmliZXJzSGFzaFttZXNzYWdlXTtcblx0fSBlbHNlXG5cdFx0ZGVsZXRlIHN1YnNjcmliZXJzSGFzaFttZXNzYWdlXTtcblxuXHRyZXR1cm4gdHJ1ZTsgLy8gc3Vic2NyaWJlcihzKSByZW1vdmVkXG59XG5cblxuZnVuY3Rpb24gcmVtb3ZlU3Vic2NyaWJlcnMobWVzc2FnZVN1YnNjcmliZXJzKSB7XG5cdGNoZWNrKG1lc3NhZ2VTdWJzY3JpYmVycywgTWF0Y2guT2JqZWN0KTtcblxuXHR2YXIgc3Vic2NyaWJlclJlbW92ZWRNYXAgPSBfLm1hcEtleXMobWVzc2FnZVN1YnNjcmliZXJzLCBmdW5jdGlvbihzdWJzY3JpYmVyLCBtZXNzYWdlKSB7XG5cdFx0cmV0dXJuIHRoaXMucmVnaXN0ZXJTdWJzY3JpYmVyKG1lc3NhZ2UsIHN1YnNjcmliZXIpXG5cdH0sIHRoaXMpO1xuXG5cdHJldHVybiBzdWJzY3JpYmVyUmVtb3ZlZE1hcDtcdFxufVxuXG5cbmZ1bmN0aW9uIHBvc3RNZXNzYWdlKG1lc3NhZ2UsIGRhdGEpIHtcblx0Y2hlY2sobWVzc2FnZSwgTWF0Y2guT25lT2YoU3RyaW5nLCBSZWdFeHApKTtcblxuXHR2YXIgc3Vic2NyaWJlcnNIYXNoID0gdGhpcy5fY2hvb3NlU3Vic2NyaWJlcnNIYXNoKG1lc3NhZ2UpO1xuXHR2YXIgbXNnU3Vic2NyaWJlcnMgPSBzdWJzY3JpYmVyc0hhc2hbbWVzc2FnZV07XG5cblx0Y2FsbFN1YnNjcmliZXJzKG1zZ1N1YnNjcmliZXJzKTtcblxuXHRpZiAobWVzc2FnZSBpbnN0YW5jZW9mIFN0cmluZykge1xuXHRcdF8uZWFjaEtleSh0aGlzLl9wYXR0ZXJuTWVzc2FnZVN1YnNjcmliZXJzLCBcblx0XHRcdGZ1bmN0aW9uKHBhdHRlcm5TdWJzY3JpYmVycywgcGF0dGVybikge1xuXHRcdFx0XHRpZiAocGF0dGVybi50ZXN0KG1lc3NhZ2UpKVxuXHRcdFx0XHRcdGNhbGxTdWJzY3JpYmVycyhwYXR0ZXJuU3Vic2NyaWJlcnMpO1xuXHRcdFx0fVxuXHRcdCk7XG5cdH1cblxuXHRmdW5jdGlvbiBjYWxsU3Vic2NyaWJlcnMobXNnU3Vic2NyaWJlcnMpIHtcblx0XHRtc2dTdWJzY3JpYmVycy5mb3JFYWNoKGZ1bmN0aW9uKHN1YnNjcmliZXIpIHtcblx0XHRcdHN1YnNjcmliZXIobWVzc2FnZSwgZGF0YSk7XG5cdFx0fSk7XG5cdH1cbn1cblxuXG5mdW5jdGlvbiBnZXRNZXNzYWdlU3Vic2NyaWJlcnMobWVzc2FnZSwgaW5jbHVkZVBhdHRlcm5TdWJzY3JpYmVycykge1xuXHRjaGVjayhtZXNzYWdlLCBNYXRjaC5PbmVPZihTdHJpbmcsIFJlZ0V4cCkpO1xuXG5cdHZhciBzdWJzY3JpYmVyc0hhc2ggPSB0aGlzLl9jaG9vc2VTdWJzY3JpYmVyc0hhc2gobWVzc2FnZSk7XG5cdHZhciBtc2dTdWJzY3JpYmVycyA9IG1zZ1N1YnNjcmliZXJzXG5cdFx0XHRcdFx0XHRcdD8gW10uY29uY2F0KHN1YnNjcmliZXJzSGFzaFttZXNzYWdlXSlcblx0XHRcdFx0XHRcdFx0OiBbXTtcblxuXHQvLyBwYXR0ZXJuIHN1YnNjcmliZXJzIGFyZSBpbmN1ZGVkIGJ5IGRlZmF1bHRcblx0aWYgKGluY2x1ZGVQYXR0ZXJuU3Vic2NyaWJlcnMgIT0gZmFsc2UgJiYgbWVzc2FnZSBpbnN0YW5jZW9mIFN0cmluZykge1xuXHRcdF8uZWFjaEtleSh0aGlzLl9wYXR0ZXJuTWVzc2FnZVN1YnNjcmliZXJzLCBcblx0XHRcdGZ1bmN0aW9uKHBhdHRlcm5TdWJzY3JpYmVycywgcGF0dGVybikge1xuXHRcdFx0XHRpZiAocGF0dGVyblN1YnNjcmliZXJzICYmIHBhdHRlcm5TdWJzY3JpYmVycy5sZW5ndGhcblx0XHRcdFx0XHRcdCYmIHBhdHRlcm4udGVzdChtZXNzYWdlKSlcblx0XHRcdFx0XHRfLmFwcGVuZEFycmF5KG1zZ1N1YnNjcmliZXJzLCBwYXR0ZXJuU3Vic2NyaWJlcnMpO1xuXHRcdFx0fVxuXHRcdCk7XG5cdH1cblxuXHRyZXR1cm4gbXNnU3Vic2NyaWJlcnMubGVuZ3RoXG5cdFx0XHRcdD8gbXNnU3Vic2NyaWJlcnNcblx0XHRcdFx0OiB1bmRlZmluZWQ7XG59XG5cblxuZnVuY3Rpb24gX2Nob29zZVN1YnNjcmliZXJzSGFzaChtZXNzYWdlKSB7XG5cdHJldHVybiBtZXNzYWdlIGluc3RhbmNlb2YgUmVnRXhwXG5cdFx0XHRcdD8gdGhpcy5fcGF0dGVybk1lc3NhZ2VTdWJzY3JpYmVyc1xuXHRcdFx0XHQ6IHRoaXMuX21lc3NhZ2VTdWJzY3JpYmVycztcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCdwcm90bycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEZhY2V0O1xuXG5mdW5jdGlvbiBGYWNldChvd25lciwgb3B0aW9ucykge1xuXHR0aGlzLm93bmVyID0gb3duZXI7XG5cdHRoaXMub3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cdHRoaXMuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufVxuXG5fLmV4dGVuZFByb3RvKEZhY2V0LCB7XG5cdGluaXQ6IGZ1bmN0aW9uKCkge31cbn0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgRmFjZXQgPSByZXF1aXJlKCcuL2ZfY2xhc3MnKVxuXHQsIF8gPSByZXF1aXJlKCdwcm90bycpXG5cdCwgY2hlY2sgPSByZXF1aXJlKCcuLi9jaGVjaycpXG5cdCwgTWF0Y2ggPSBjaGVjay5NYXRjaDtcblxubW9kdWxlLmV4cG9ydHMgPSBGYWNldGVkT2JqZWN0O1xuXG4vLyBhYnN0cmFjdCBjbGFzcyBmb3IgZmFjZXRlZCBvYmplY3RcbmZ1bmN0aW9uIEZhY2V0ZWRPYmplY3QoZmFjZXRzT3B0aW9ucyAvKiwgb3RoZXIgYXJncyAtIHBhc3NlZCB0byBpbml0IG1ldGhvZCAqLykge1xuXHQvLyBUT0RPIGluc3RhbnRpYXRlIGZhY2V0cyBpZiBjb25maWd1cmF0aW9uIGlzbid0IHBhc3NlZFxuXHQvLyB3cml0ZSBhIHRlc3QgdG8gY2hlY2sgaXRcblx0ZmFjZXRzT3B0aW9ucyA9IGZhY2V0c09wdGlvbnMgPyBfLmNsb25lKGZhY2V0c09wdGlvbnMpIDoge307XG5cblx0dmFyIHRoaXNDbGFzcyA9IHRoaXMuY29uc3RydWN0b3Jcblx0XHQsIGZhY2V0cyA9IHt9O1xuXG5cdGlmICh0aGlzLmNvbnN0cnVjdG9yID09IEZhY2V0ZWRPYmplY3QpXHRcdFxuXHRcdHRocm93IG5ldyBFcnJvcignRmFjZXRlZE9iamVjdCBpcyBhbiBhYnN0cmFjdCBjbGFzcywgY2FuXFwndCBiZSBpbnN0YW50aWF0ZWQnKTtcblx0Ly9pZiAoISB0aGlzQ2xhc3MucHJvdG90eXBlLmZhY2V0cylcblx0Ly9cdHRocm93IG5ldyBFcnJvcignTm8gZmFjZXRzIGRlZmluZWQgaW4gY2xhc3MgJyArIHRoaXMuY29uc3RydWN0b3IubmFtZSk7XG5cdFxuXHQvLyBfLmVhY2hLZXkoZmFjZXRzT3B0aW9ucywgaW5zdGFudGlhdGVGYWNldCwgdGhpcywgdHJ1ZSk7XG5cblx0aWYgKHRoaXMuZmFjZXRzKVxuXHRcdF8uZWFjaEtleSh0aGlzLmZhY2V0cywgaW5zdGFudGlhdGVGYWNldCwgdGhpcywgdHJ1ZSk7XG5cblx0dmFyIHVudXNlZEZhY2V0c05hbWVzID0gT2JqZWN0LmtleXMoZmFjZXRzT3B0aW9ucyk7XG5cdGlmICh1bnVzZWRGYWNldHNOYW1lcy5sZW5ndGgpXG5cdFx0dGhyb3cgbmV3IEVycm9yKCdDb25maWd1cmF0aW9uIGZvciB1bmtub3duIGZhY2V0KHMpIHBhc3NlZDogJyArIHVudXNlZEZhY2V0c05hbWVzLmpvaW4oJywgJykpO1xuXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRoaXMsIGZhY2V0cyk7XG5cblx0Ly8gY2FsbGluZyBpbml0IGlmIGl0IGlzIGRlZmluZWQgaW4gdGhlIGNsYXNzXG5cdGlmICh0aGlzLmluaXQpXG5cdFx0dGhpcy5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cblx0ZnVuY3Rpb24gaW5zdGFudGlhdGVGYWNldCgvKiBmYWNldE9wdHMgKi8gRmFjZXRDbGFzcywgZmN0KSB7XG5cdFx0Ly8gdmFyIEZhY2V0Q2xhc3MgPSB0aGlzLmZhY2V0c1tmY3RdO1xuXHRcdHZhciBmYWNldE9wdHMgPSBmYWNldHNPcHRpb25zW2ZjdF07XG5cdFx0ZGVsZXRlIGZhY2V0c09wdGlvbnNbZmN0XTtcblxuXHRcdGZhY2V0c1tmY3RdID0ge1xuXHRcdFx0ZW51bWVyYWJsZTogZmFsc2UsXG5cdFx0XHR2YWx1ZTogbmV3IEZhY2V0Q2xhc3ModGhpcywgZmFjZXRPcHRzKVxuXHRcdH07XG5cdH1cbn1cblxuXG5fLmV4dGVuZFByb3RvKEZhY2V0ZWRPYmplY3QsIHtcblx0YWRkRmFjZXQ6IGFkZEZhY2V0XG59KTtcblxuXG5mdW5jdGlvbiBhZGRGYWNldChGYWNldENsYXNzLCBmYWNldE9wdHMsIGZhY2V0TmFtZSkge1xuXHRjaGVjayhGYWNldENsYXNzLCBGdW5jdGlvbik7XG5cdGNoZWNrKGZhY2V0TmFtZSwgTWF0Y2guT3B0aW9uYWwoU3RyaW5nKSk7XG5cblx0ZmFjZXROYW1lID0gXy5maXJzdExvd2VyQ2FzZShmYWNldE5hbWUgfHwgRmFjZXRDbGFzcy5uYW1lKTtcblxuXHRpZiAodGhpcy5jb25zdHJ1Y3Rvci5wcm90b3R5cGUuZmFjZXRzW2ZhY2V0TmFtZV0pXG5cdFx0dGhyb3cgbmV3IEVycm9yKCdmYWNldCAnICsgZmFjZXROYW1lICsgJyBpcyBhbHJlYWR5IHBhcnQgb2YgdGhlIGNsYXNzICcgKyB0aGlzLmNvbnN0cnVjdG9yLm5hbWUpO1xuXG5cdGlmICh0aGlzLmZhY2V0c1tmYWNldE5hbWVdKVxuXHRcdHRocm93IG5ldyBFcnJvcignZmFjZXQgJyArIGZhY2V0TmFtZSArICcgaXMgYWxyZWFkeSBwcmVzZW50IGluIG9iamVjdCcpO1xuXG5cdHRoaXMuZmFjZXRzW2ZhY2V0TmFtZV0gPSBGYWNldENsYXNzO1xuXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBmYWNldE5hbWUsIHtcblx0XHRlbnVtZXJhYmxlOiBmYWxzZSxcblx0XHR2YWx1ZTogbmV3IEZhY2V0Q2xhc3ModGhpcywgZmFjZXRPcHRzKVxuXHR9KTtcbn1cblxuXG4vLyBmYWN0b3J5IHRoYXQgY3JlYXRlcyBjbGFzc2VzIChjb25zdHJ1Y3RvcnMpIGZyb20gdGhlIG1hcCBvZiBmYWNldHNcbi8vIHRoZXNlIGNsYXNzZXMgaW5oZXJpdCBmcm9tIEZhY2V0ZWRPYmplY3RcbkZhY2V0ZWRPYmplY3QuY3JlYXRlRmFjZXRlZENsYXNzID0gZnVuY3Rpb24gKG5hbWUsIGZhY2V0c0NsYXNzZXMpIHtcblx0Y2hlY2sobmFtZSwgU3RyaW5nKTtcblx0Y2hlY2soZmFjZXRzQ2xhc3NlcywgTWF0Y2guT2JqZWN0SGFzaChGdW5jdGlvbiAvKiBNYXRjaC5TdWJjbGFzcyhGYWNldCwgdHJ1ZSkgVE9ETyAtIGZpeCAqLykpO1xuXG5cdHZhciBGYWNldGVkQ2xhc3MgPSBfLmNyZWF0ZVN1YmNsYXNzKHRoaXMsIG5hbWUsIHRydWUpO1xuXG5cdF8uZXh0ZW5kUHJvdG8oRmFjZXRlZENsYXNzLCB7XG5cdFx0ZmFjZXRzOiBmYWNldHNDbGFzc2VzXG5cdH0pO1xuXHRyZXR1cm4gRmFjZXRlZENsYXNzO1xufTtcblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgbWlsbyA9IHtcblx0YmluZGVyOiByZXF1aXJlKCcuL2JpbmRlci9iaW5kZXInKVxufVxuXG5cbi8vIHVzZWQgZmFjZXRzXG5yZXF1aXJlKCcuL2NvbXBvbmVudHMvY19mYWNldHMvQ29udGFpbmVyJyk7XG5yZXF1aXJlKCcuL2NvbXBvbmVudHMvY19mYWNldHMvRXZlbnRzJyk7XG5yZXF1aXJlKCcuL2NvbXBvbmVudHMvY19mYWNldHMvTW9kZWwnKTtcblxuLy8gdXNlZCBjb21wb25lbnRzXG5yZXF1aXJlKCcuL2NvbXBvbmVudHMvY2xhc3Nlcy9WaWV3Jyk7XG5cblxuaWYgKHR5cGVvZiBtb2R1bGUgPT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpXG5cdC8vIGV4cG9ydCBmb3Igbm9kZS9icm93c2VyaWZ5XG5cdG1vZHVsZS5leHBvcnRzID0gbWlsbztcblxuaWYgKHR5cGVvZiB3aW5kb3cgPT0gJ29iamVjdCcpXG5cdHdpbmRvdy5taWxvID0gbWlsbztcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCdwcm90bycpXG5cdCwgY2hlY2sgPSByZXF1aXJlKCcuL2NoZWNrJylcblx0LCBNYXRjaCA9IGNoZWNrLk1hdGNoO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENsYXNzUmVnaXN0cnk7XG5cbmZ1bmN0aW9uIENsYXNzUmVnaXN0cnkgKEZvdW5kYXRpb25DbGFzcykge1xuXHRpZiAoRm91bmRhdGlvbkNsYXNzKVxuXHRcdHRoaXMuc2V0Q2xhc3MoRm91bmRhdGlvbkNsYXNzKTtcblxuXHQvLyBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ19fcmVnaXN0ZXJlZENsYXNzZXMnLCB7XG5cdC8vIFx0XHRlbnVtZXJhYmxlOiBmYWxzZSxcblx0Ly8gXHRcdHdyaXRhYmxlOiB0cnVlLFxuXHQvLyBcdFx0Y29uZmlndXJhYmxlOiB0cnVlLFxuXHQvLyBcdFx0dmFsdWU6IHt9XG5cdC8vIH0pO1xuXG5cdHRoaXMuX19yZWdpc3RlcmVkQ2xhc3NlcyA9IHt9O1xufVxuXG5fLmV4dGVuZFByb3RvKENsYXNzUmVnaXN0cnksIHtcblx0YWRkOiByZWdpc3RlckNsYXNzLFxuXHRnZXQ6IGdldENsYXNzLFxuXHRyZW1vdmU6IHVucmVnaXN0ZXJDbGFzcyxcblx0Y2xlYW46IHVucmVnaXN0ZXJBbGxDbGFzc2VzLFxuXHRzZXRDbGFzczogc2V0Rm91bmRhdGlvbkNsYXNzXG59KTtcblxuXG5mdW5jdGlvbiBzZXRGb3VuZGF0aW9uQ2xhc3MoRm91bmRhdGlvbkNsYXNzKSB7XG5cdGNoZWNrKEZvdW5kYXRpb25DbGFzcywgRnVuY3Rpb24pO1xuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ0ZvdW5kYXRpb25DbGFzcycsIHtcblx0XHRlbnVtZXJhYmxlOiB0cnVlLFxuXHRcdHZhbHVlOiBGb3VuZGF0aW9uQ2xhc3Ncblx0fSk7XG59XG5cbmZ1bmN0aW9uIHJlZ2lzdGVyQ2xhc3MoYUNsYXNzLCBuYW1lKSB7XG5cdG5hbWUgPSBuYW1lIHx8IGFDbGFzcy5uYW1lO1xuXG5cdGNoZWNrKG5hbWUsIFN0cmluZywgJ2NsYXNzIG5hbWUgbXVzdCBiZSBzdHJpbmcnKTtcblx0Y2hlY2sobmFtZSwgTWF0Y2guV2hlcmUoZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHR5cGVvZiBuYW1lID09ICdzdHJpbmcnICYmIG5hbWUgIT0gJyc7XG5cdH0pLCAnY2xhc3MgbmFtZSBtdXN0IGJlIHN0cmluZycpO1xuXHRpZiAodGhpcy5Gb3VuZGF0aW9uQ2xhc3MpIHtcblx0XHRpZiAoYUNsYXNzICE9IHRoaXMuRm91bmRhdGlvbkNsYXNzKVxuXHRcdFx0Y2hlY2soYUNsYXNzLCBNYXRjaC5TdWJjbGFzcyh0aGlzLkZvdW5kYXRpb25DbGFzcyksICdjbGFzcyBtdXN0IGJlIGEgc3ViKGNsYXNzKSBvZiBhIGZvdW5kYXRpb24gY2xhc3MnKTtcblx0fSBlbHNlXG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignZm91bmRhdGlvbiBjbGFzcyBtdXN0IGJlIHNldCBiZWZvcmUgYWRkaW5nIGNsYXNzZXMgdG8gcmVnaXN0cnknKTtcblxuXHRpZiAodGhpcy5fX3JlZ2lzdGVyZWRDbGFzc2VzW25hbWVdKVxuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ2lzIGFscmVhZHkgcmVnaXN0ZXJlZCcpO1xuXG5cdHRoaXMuX19yZWdpc3RlcmVkQ2xhc3Nlc1tuYW1lXSA9IGFDbGFzcztcbn07XG5cblxuZnVuY3Rpb24gZ2V0Q2xhc3MobmFtZSkge1xuXHRjaGVjayhuYW1lLCBTdHJpbmcsICdjbGFzcyBuYW1lIG11c3QgYmUgc3RyaW5nJyk7XG5cdHJldHVybiB0aGlzLl9fcmVnaXN0ZXJlZENsYXNzZXNbbmFtZV07XG59O1xuXG5cbmZ1bmN0aW9uIHVucmVnaXN0ZXJDbGFzcyhuYW1lT3JDbGFzcykge1xuXHRjaGVjayhuYW1lT3JDbGFzcywgTWF0Y2guT25lT2YoU3RyaW5nLCBGdW5jdGlvbiksICdjbGFzcyBvciBuYW1lIG11c3QgYmUgc3VwcGxpZWQnKTtcblxuXHR2YXIgbmFtZSA9IHR5cGVvZiBuYW1lT3JDbGFzcyA9PSAnc3RyaW5nJ1xuXHRcdFx0XHRcdFx0PyBuYW1lT3JDbGFzc1xuXHRcdFx0XHRcdFx0OiBuYW1lT3JDbGFzcy5uYW1lO1xuXHRcdFx0XHRcdFx0XG5cdGlmICghIHRoaXMuX19yZWdpc3RlcmVkQ2xhc3Nlc1tuYW1lXSlcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdjbGFzcyBpcyBub3QgcmVnaXN0ZXJlZCcpO1xuXG5cdGRlbGV0ZSB0aGlzLl9fcmVnaXN0ZXJlZENsYXNzZXNbbmFtZV07XG59O1xuXG5cbmZ1bmN0aW9uIHVucmVnaXN0ZXJBbGxDbGFzc2VzKCkge1xuXHR0aGlzLl9fcmVnaXN0ZXJlZENsYXNzZXMgPSB7fTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfO1xudmFyIHByb3RvID0gXyA9IHtcblx0ZXh0ZW5kUHJvdG86IGV4dGVuZFByb3RvLFxuXHRleHRlbmQ6IGV4dGVuZCxcblx0Y2xvbmU6IGNsb25lLFxuXHRjcmVhdGVTdWJjbGFzczogY3JlYXRlU3ViY2xhc3MsXG5cdG1ha2VTdWJjbGFzczogbWFrZVN1YmNsYXNzLFxuXHRhbGxLZXlzOiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcy5iaW5kKE9iamVjdCksXG5cdGtleU9mOiBrZXlPZixcblx0YWxsS2V5c09mOiBhbGxLZXlzT2YsXG5cdGVhY2hLZXk6IGVhY2hLZXksXG5cdG1hcEtleXM6IG1hcEtleXMsXG5cdGFwcGVuZEFycmF5OiBhcHBlbmRBcnJheSxcblx0cHJlcGVuZEFycmF5OiBwcmVwZW5kQXJyYXksXG5cdGZpcnN0VXBwZXJDYXNlOiBmaXJzdFVwcGVyQ2FzZSxcblx0Zmlyc3RMb3dlckNhc2U6IGZpcnN0TG93ZXJDYXNlXG59O1xuXG5cbmlmICh0eXBlb2Ygd2luZG93ID09ICdvYmplY3QnKSB7XG5cdC8vIHByZXNlcnZlIGV4aXN0aW5nIF8gb2JqZWN0XG5cdGlmICh3aW5kb3cuXylcblx0XHRwcm90by51bmRlcnNjb3JlID0gd2luZG93Ll9cblxuXHQvLyBleHBvc2UgZ2xvYmFsIF9cblx0d2luZG93Ll8gPSBwcm90bztcbn1cblxuaWYgKHR5cGVvZiBtb2R1bGUgPT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpXG5cdC8vIGV4cG9ydCBmb3Igbm9kZS9icm93c2VyaWZ5XG5cdG1vZHVsZS5leHBvcnRzID0gcHJvdG87XG5cdFxuXG5mdW5jdGlvbiBleHRlbmRQcm90byhzZWxmLCBtZXRob2RzKSB7XG5cdHZhciBwcm9wRGVzY3JpcHRvcnMgPSB7fTtcblxuXHRfLmVhY2hLZXkobWV0aG9kcywgZnVuY3Rpb24obWV0aG9kLCBuYW1lKSB7XG5cdFx0cHJvcERlc2NyaXB0b3JzW25hbWVdID0ge1xuXHRcdFx0ZW51bWVyYWJsZTogZmFsc2UsXG5cdFx0XHRjb25maWd1cmFibGU6IGZhbHNlLFxuXHRcdFx0d3JpdGFibGU6IGZhbHNlLFxuXHRcdFx0dmFsdWU6IG1ldGhvZFxuXHRcdH07XG5cdH0pO1xuXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHNlbGYucHJvdG90eXBlLCBwcm9wRGVzY3JpcHRvcnMpO1xuXHRyZXR1cm4gc2VsZjtcbn1cblxuXG5mdW5jdGlvbiBleHRlbmQoc2VsZiwgb2JqLCBvbmx5RW51bWVyYWJsZSkge1xuXHR2YXIgcHJvcERlc2NyaXB0b3JzID0ge307XG5cblx0Xy5lYWNoS2V5KG9iaiwgZnVuY3Rpb24odmFsdWUsIHByb3ApIHtcblx0XHR2YXIgZGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Iob2JqLCBwcm9wKTtcblx0XHRwcm9wRGVzY3JpcHRvcnNbcHJvcF0gPSBkZXNjcmlwdG9yO1xuXHR9LCB0aGlzLCBvbmx5RW51bWVyYWJsZSk7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnRpZXMoc2VsZiwgcHJvcERlc2NyaXB0b3JzKTtcblxuXHRyZXR1cm4gc2VsZjtcbn1cblxuXG5mdW5jdGlvbiBjbG9uZShvYmopIHtcblx0dmFyIGNsb25lZE9iamVjdCA9IE9iamVjdC5jcmVhdGUob2JqLmNvbnN0cnVjdG9yLnByb3RvdHlwZSk7XG5cdF8uZXh0ZW5kKGNsb25lZE9iamVjdCwgb2JqKTtcblx0cmV0dXJuIGNsb25lZE9iamVjdDtcbn1cblxuXG5mdW5jdGlvbiBjcmVhdGVTdWJjbGFzcyh0aGlzQ2xhc3MsIG5hbWUsIGFwcGx5Q29uc3RydWN0b3IpIHtcblx0dmFyIHN1YmNsYXNzO1xuXG5cdC8vIG5hbWUgaXMgb3B0aW9uYWxcblx0bmFtZSA9IG5hbWUgfHwgJyc7XG5cblx0Ly8gYXBwbHkgc3VwZXJjbGFzcyBjb25zdHJ1Y3RvclxuXHR2YXIgY29uc3RydWN0b3JDb2RlID0gYXBwbHlDb25zdHJ1Y3RvciA9PT0gZmFsc2Vcblx0XHRcdD8gJydcblx0XHRcdDogJ3RoaXNDbGFzcy5hcHBseSh0aGlzLCBhcmd1bWVudHMpOyc7XG5cblx0ZXZhbCgnc3ViY2xhc3MgPSBmdW5jdGlvbiAnICsgbmFtZSArICcoKXsgJyArIGNvbnN0cnVjdG9yQ29kZSArICcgfScpO1xuXG5cdC8vIHBwcm90b3R5cGUgY2hhaW5cblx0c3ViY2xhc3MucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSh0aGlzQ2xhc3MucHJvdG90eXBlKTtcblx0XG5cdC8vIHN1YmNsYXNzIGlkZW50aXR5XG5cdF8uZXh0ZW5kUHJvdG8oc3ViY2xhc3MsIHtcblx0XHRjb25zdHJ1Y3Rvcjogc3ViY2xhc3Ncblx0fSk7XG5cblx0Ly8gY29weSBjbGFzcyBtZXRob2RzXG5cdC8vIC0gZm9yIHRoZW0gdG8gd29yayBjb3JyZWN0bHkgdGhleSBzaG91bGQgbm90IGV4cGxpY3RseSB1c2Ugc3VwZXJjbGFzcyBuYW1lXG5cdC8vIGFuZCB1c2UgXCJ0aGlzXCIgaW5zdGVhZFxuXHRfLmV4dGVuZChzdWJjbGFzcywgdGhpc0NsYXNzLCB0cnVlKTtcblxuXHRyZXR1cm4gc3ViY2xhc3M7XG59XG5cblxuZnVuY3Rpb24gbWFrZVN1YmNsYXNzKHRoaXNDbGFzcywgU3VwZXJjbGFzcykge1xuXHR0aGlzQ2xhc3MucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShTdXBlcmNsYXNzLnByb3RvdHlwZSk7XG5cdHRoaXNDbGFzcy5wcm90b3R5cGUuY29uc3RydWN0b3IgPSB0aGlzQ2xhc3M7XG5cdHJldHVybiB0aGlzQ2xhc3M7XG59XG5cblxuZnVuY3Rpb24ga2V5T2Yoc2VsZiwgc2VhcmNoRWxlbWVudCwgb25seUVudW1lcmFibGUpIHtcblx0dmFyIHByb3BlcnRpZXMgPSBvbmx5RW51bWVyYWJsZSBcblx0XHRcdFx0XHRcdD8gT2JqZWN0LmtleXMoc2VsZilcblx0XHRcdFx0XHRcdDogXy5hbGxLZXlzKHNlbGYpO1xuXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgcHJvcGVydGllcy5sZW5ndGg7IGkrKylcblx0XHRpZiAoc2VhcmNoRWxlbWVudCA9PT0gc2VsZltwcm9wZXJ0aWVzW2ldXSlcblx0XHRcdHJldHVybiBwcm9wZXJ0aWVzW2ldO1xuXHRcblx0cmV0dXJuIHVuZGVmaW5lZDtcbn1cblxuXG5mdW5jdGlvbiBhbGxLZXlzT2Yoc2VsZiwgc2VhcmNoRWxlbWVudCwgb25seUVudW1lcmFibGUpIHtcblx0dmFyIHByb3BlcnRpZXMgPSBvbmx5RW51bWVyYWJsZSBcblx0XHRcdFx0XHRcdD8gT2JqZWN0LmtleXMoc2VsZilcblx0XHRcdFx0XHRcdDogXy5hbGxLZXlzKHNlbGYpO1xuXG5cdHZhciBrZXlzID0gcHJvcGVydGllcy5maWx0ZXIoZnVuY3Rpb24ocHJvcCkge1xuXHRcdHJldHVybiBzZWFyY2hFbGVtZW50ID09PSBzZWxmW3Byb3BdO1xuXHR9KTtcblxuXHRyZXR1cm4ga2V5cztcbn1cblxuXG5mdW5jdGlvbiBlYWNoS2V5KHNlbGYsIGNhbGxiYWNrLCB0aGlzQXJnLCBvbmx5RW51bWVyYWJsZSkge1xuXHR2YXIgcHJvcGVydGllcyA9IG9ubHlFbnVtZXJhYmxlIFxuXHRcdFx0XHRcdFx0PyBPYmplY3Qua2V5cyhzZWxmKVxuXHRcdFx0XHRcdFx0OiBfLmFsbEtleXMoc2VsZik7XG5cblx0cHJvcGVydGllcy5mb3JFYWNoKGZ1bmN0aW9uKHByb3ApIHtcblx0XHRjYWxsYmFjay5jYWxsKHRoaXNBcmcsIHNlbGZbcHJvcF0sIHByb3AsIHNlbGYpO1xuXHR9KTtcbn1cblxuXG5mdW5jdGlvbiBtYXBLZXlzKHNlbGYsIGNhbGxiYWNrLCB0aGlzQXJnLCBvbmx5RW51bWVyYWJsZSkge1xuXHR2YXIgbWFwUmVzdWx0ID0ge307XG5cdF8uZWFjaEtleShzZWxmLCBtYXBQcm9wZXJ0eSwgdGhpc0FyZywgb25seUVudW1lcmFibGUpO1xuXHRyZXR1cm4gbWFwUmVzdWx0O1xuXG5cdGZ1bmN0aW9uIG1hcFByb3BlcnR5KHZhbHVlLCBrZXkpIHtcblx0XHR2YXIgZGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Ioc2VsZiwga2V5KTtcblx0XHRpZiAoZGVzY3JpcHRvci5lbnVtZXJhYmxlIHx8ICEgb25seUVudW1lcmFibGUpIHtcblx0XHRcdGRlc2NyaXB0b3IudmFsdWUgPSBjYWxsYmFjay5jYWxsKHRoaXMsIHZhbHVlLCBrZXksIHNlbGYpO1xuXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KG1hcFJlc3VsdCwga2V5LCBkZXNjcmlwdG9yKTtcblx0XHR9XG5cdH1cbn1cblxuXG5mdW5jdGlvbiBhcHBlbmRBcnJheShzZWxmLCBhcnJheVRvQXBwZW5kKSB7XG5cdGlmICghIGFycmF5VG9BcHBlbmQubGVuZ3RoKSByZXR1cm4gc2VsZjtcblxuICAgIHZhciBhcmdzID0gW3NlbGYubGVuZ3RoLCAwXS5jb25jYXQoYXJyYXlUb0FwcGVuZCk7XG4gICAgQXJyYXkucHJvdG90eXBlLnNwbGljZS5hcHBseShzZWxmLCBhcmdzKTtcblxuICAgIHJldHVybiBzZWxmO1xufVxuXG5cbmZ1bmN0aW9uIHByZXBlbmRBcnJheShzZWxmLCBhcnJheVRvUHJlcGVuZCkge1xuXHRpZiAoISBhcnJheVRvUHJlcGVuZC5sZW5ndGgpIHJldHVybiBzZWxmO1xuXG4gICAgdmFyIGFyZ3MgPSBbMCwgMF0uY29uY2F0KGFycmF5VG9QcmVwZW5kKTtcbiAgICBBcnJheS5wcm90b3R5cGUuc3BsaWNlLmFwcGx5KHNlbGYsIGFyZ3MpO1xuXG4gICAgcmV0dXJuIHNlbGY7XG59XG5cblxuZnVuY3Rpb24gZmlyc3RVcHBlckNhc2Uoc3RyKSB7XG5cdHJldHVybiBzdHJbMF0udG9VcHBlckNhc2UoKSArIHN0ci5zbGljZSgxKTtcbn1cblxuXG5mdW5jdGlvbiBmaXJzdExvd2VyQ2FzZShzdHIpIHtcblx0cmV0dXJuIHN0clswXS50b0xvd2VyQ2FzZSgpICsgc3RyLnNsaWNlKDEpO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5kZXNjcmliZSgnbWlsbyBiaW5kZXInLCBmdW5jdGlvbigpIHtcbiAgICBpdCgnc2hvdWxkIGJpbmQgY29tcG9uZW50cyBiYXNlZCBvbiBtbC1iaW5kIGF0dHJpYnV0ZScsIGZ1bmN0aW9uKCkge1xuICAgIFx0dmFyIG1pbG8gPSByZXF1aXJlKCcuLi8uLi9saWIvbWlsbycpO1xuXG5cdFx0ZXhwZWN0KHtwOiAxfSkucHJvcGVydHkoJ3AnLCAxKTtcblxuICAgIFx0dmFyIGNvbXBvbmVudHMgPSBtaWxvLmJpbmRlcihkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndmlld1RvQmluZCcpKTtcbiAgICBcdFxuXHRcdGNvbnNvbGUubG9nKGNvbXBvbmVudHMpO1xuICAgIH0pO1xufSk7XG4iXX0=
;