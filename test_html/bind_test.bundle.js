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
			storeComponent(aComponent, attr.name);
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
  _.each(pattern, function (subPattern, key) {
    if (subPattern instanceof Optional)
      optionalPatterns[key] = subPattern.pattern;
    else
      requiredPatterns[key] = subPattern;
  });

  _.each(value, function (subValue, key) {
    try {
      if (_.has(requiredPatterns, key)) {
        checkSubtree(subValue, requiredPatterns[key]);
        delete requiredPatterns[key];
      } else if (_.has(optionalPatterns, key)) {
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

  _.each(requiredPatterns, function (subPattern, key) {
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
  else if (!key.match(/^[a-z_$][0-9a-z_$]*$/i) || _.contains(_jsKeywords, key))
    key = JSON.stringify([key]);

  if (base && base[0] !== "[")
    return key + '.' + base;
  return key + base;
};


},{"proto":19}],5:[function(require,module,exports){
'use strict';

var FacetedObject = require('../facets/f_object')
	, messengerMixin = require('./messenger')
	, _ = require('proto');

var Component = _.createSubclass(FacetedObject, 'Component', true);

module.exports = Component;


Component.createComponentClass = FacetedObject.createFacetedClass;
delete Component.createFacetedClass;

_.extendProto(Component, {
	init: initComponent
});

_.extendProto(Component, messengerMixin);

function initComponent(facetsOptions, element) {
	this.el = element;
	this.initMessenger();
}

},{"../facets/f_object":16,"./messenger":14,"proto":19}],6:[function(require,module,exports){
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
	, facetsRegistry = require('../c_facets/cf_registry')
	, componentsRegistry = require('../c_registry');


var View = Component.createComponentClass('View', {
	container: facetsRegistry.get('Container')
});

componentsRegistry.add(View);

module.exports = View;

},{"../c_class":5,"../c_facets/cf_registry":10,"../c_registry":12}],14:[function(require,module,exports){
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
	this._messageSubscribers = {};
	this._patternMessageSubscribers = {};
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
	this.options = options;
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
	if (! thisClass.prototype.facets)
		throw new Error('No facets defined in class ' + this.constructor.name);
	
	// _.eachKey(facetsOptions, instantiateFacet, this, true);

	_.eachKey(this.facets, instantiateFacet, this, true);

	var unusedFacetsNames = Object.keys(facetsOptions);
	if (unusedFacetsNames.length)
		throw new Error('Configuration for unknown facet(s) passed: ' + unusedFacetsNames.join(', '));

	Object.defineProperties(this, facets);

	// calling init if it is defined in the class
	if (this.init)
		this.init.apply(this, arguments);

	function instantiateFacet(/* facetOpts */ facetClass, fct) {
		// var facetClass = this.facets[fct];
		var facetOpts = facetsOptions[fct];
		delete facetsOptions[fct];

		facets[fct] = {
			enumerable: false,
			value: new facetClass(this, facetOpts)
		};
	}
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
	prependArray: prependArray
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
	subclass.prototype.constructor = subclass;
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


function appendArray(self, arrToAppend) {
	if (! arrToAppend.length) return self;

    var args = [self.length, 0].concat(arrToAppend);
    Array.prototype.splice.apply(self, args);

    return self;
}


function prependArray(self, arrToPrepend) {
	if (! arrToPrepend.length) return self;

    var args = [0, 0].concat(arrToPrepend);
    Array.prototype.splice.apply(self, args);

    return self;
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
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2JpbmRlci9hdHRyaWJ1dGUuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2JpbmRlci9iaW5kZXIuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2JpbmRlci9lcnJvci5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY2hlY2suanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19jbGFzcy5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX2ZhY2V0LmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfZmFjZXRzL0NvbnRhaW5lci5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX2ZhY2V0cy9FdmVudHMuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19mYWNldHMvTW9kZWwuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19mYWNldHMvY2ZfcmVnaXN0cnkuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19mYWNldHMvZG9tX2V2ZW50cy5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX3JlZ2lzdHJ5LmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NsYXNzZXMvVmlldy5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9tZXNzZW5nZXIuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2ZhY2V0cy9mX2NsYXNzLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9mYWNldHMvZl9vYmplY3QuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL21pbG8uanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL3JlZ2lzdHJ5LmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL25vZGVfbW9kdWxlcy9wcm90by9saWIvcHJvdG8uanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vdGVzdF9odG1sL2JpbmRfdGVzdC9iaW5kX3Rlc3QuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0xBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgncHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vY2hlY2snKVxuXHQsIE1hdGNoID0gY2hlY2suTWF0Y2hcblx0LCBCaW5kRXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yJyk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBBdHRyaWJ1dGU7XG5cbmZ1bmN0aW9uIEF0dHJpYnV0ZShlbCwgbmFtZSkge1xuXHR0aGlzLm5hbWUgPSBuYW1lO1xuXHR0aGlzLmVsID0gZWw7XG5cdHRoaXMubm9kZSA9IGVsLmF0dHJpYnV0ZXNbbmFtZV07XG59XG5cbl8uZXh0ZW5kUHJvdG8oQXR0cmlidXRlLCB7XG5cdGdldDogZ2V0QXR0cmlidXRlVmFsdWUsXG5cdHNldDogc2V0QXR0cmlidXRlVmFsdWUsXG5cdHBhcnNlOiBwYXJzZUF0dHJpYnV0ZSxcblx0dmFsaWRhdGU6IHZhbGlkYXRlQXR0cmlidXRlXG59KTtcblxuXG5mdW5jdGlvbiBnZXRBdHRyaWJ1dGVWYWx1ZSgpIHtcblx0cmV0dXJuIHRoaXMuZWwuZ2V0QXR0cmlidXRlKHRoaXMubmFtZSk7XG59XG5cbmZ1bmN0aW9uIHNldEF0dHJpYnV0ZVZhbHVlKHZhbHVlKSB7XG5cdHRoaXMuZWwuc2V0QXR0cmlidXRlKHRoaXMubmFtZSwgdmFsdWUpO1xufVxuXG5mdW5jdGlvbiBwYXJzZUF0dHJpYnV0ZSgpIHtcblx0aWYgKCEgdGhpcy5ub2RlKSByZXR1cm47XG5cblx0dmFyIHZhbHVlID0gdGhpcy5nZXQoKTtcblxuXHRpZiAodmFsdWUpXG5cdFx0dmFyIGJpbmRUbyA9IHZhbHVlLnNwbGl0KCc6Jyk7XG5cblx0c3dpdGNoIChiaW5kVG8gJiYgYmluZFRvLmxlbmd0aCkge1xuXHRcdGNhc2UgMTpcblx0XHRcdHRoaXMuY29tcE5hbWUgPSBiaW5kVG9bMF07XG5cdFx0XHR0aGlzLmNvbXBDbGFzcyA9ICdDb21wb25lbnQnO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cblx0XHRjYXNlIDI6XG5cdFx0XHR0aGlzLmNvbXBOYW1lID0gYmluZFRvWzFdO1xuXHRcdFx0dGhpcy5jb21wQ2xhc3MgPSBiaW5kVG9bMF07XG5cdFx0XHRyZXR1cm4gdGhpcztcblxuXHRcdGRlZmF1bHQ6XG5cdFx0XHR0aHJvdyBuZXcgQmluZEVycm9yKCdpbnZhbGlkIGJpbmQgYXR0cmlidXRlICcgKyB2YWx1ZSk7XG5cdH1cbn1cblxuZnVuY3Rpb24gdmFsaWRhdGVBdHRyaWJ1dGUoKSB7XG5cdHZhciBjb21wTmFtZSA9IHRoaXMuY29tcE5hbWU7XG5cdGNoZWNrKGNvbXBOYW1lLCBNYXRjaC5XaGVyZShmdW5jdGlvbigpIHtcbiAgXHRcdHJldHVybiB0eXBlb2YgY29tcE5hbWUgPT0gJ3N0cmluZycgJiYgY29tcE5hbWUgIT0gJyc7XG5cdH0pLCAnZW1wdHkgY29tcG9uZW50IG5hbWUnKTtcblxuXHRpZiAoISB0aGlzLmNvbXBDbGFzcylcblx0XHR0aHJvdyBuZXcgQmluZEVycm9yKCdlbXB0eSBjb21wb25lbnQgY2xhc3MgbmFtZSAnICsgdGhpcy5jb21wQ2xhc3MpO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgY29tcG9uZW50c1JlZ2lzdHJ5ID0gcmVxdWlyZSgnLi4vY29tcG9uZW50cy9jX3JlZ2lzdHJ5Jylcblx0LCBDb21wb25lbnQgPSBjb21wb25lbnRzUmVnaXN0cnkuZ2V0KCdDb21wb25lbnQnKVxuXHQsIEF0dHJpYnV0ZSA9IHJlcXVpcmUoJy4vYXR0cmlidXRlJylcblx0LCBCaW5kRXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yJylcblx0LCBfID0gcmVxdWlyZSgncHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vY2hlY2snKVxuXHQsIE1hdGNoID0gIGNoZWNrLk1hdGNoO1xuXG5cbnZhciBvcHRzID0ge1xuXHRCSU5EX0FUVFI6ICdtbC1iaW5kJ1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGJpbmRlcjtcblxuZnVuY3Rpb24gYmluZGVyKHNjb3BlRWwsIGJpbmRTY29wZUVsKSB7XG5cdHZhciBzY29wZUVsID0gc2NvcGVFbCAvLyB8fCBkb2N1bWVudC5ib2R5XG5cdFx0LCBjb21wb25lbnRzID0ge307XG5cblx0Ly8gaXRlcmF0ZSBjaGlsZHJlbiBvZiBzY29wZUVsXG5cdEFycmF5LnByb3RvdHlwZS5mb3JFYWNoLmNhbGwoc2NvcGVFbC5jaGlsZHJlbiwgYmluZEVsZW1lbnQpO1xuXG5cdHJldHVybiBjb21wb25lbnRzO1xuXG5cdGZ1bmN0aW9uIGJpbmRFbGVtZW50KGVsKXtcblx0XHR2YXIgYXR0ciA9IG5ldyBBdHRyaWJ1dGUoZWwsIG9wdHMuQklORF9BVFRSKTtcblxuXHRcdHZhciBhQ29tcG9uZW50ID0gY3JlYXRlQ29tcG9uZW50KGVsLCBhdHRyKTtcblxuXHRcdC8vIGJpbmQgaW5uZXIgZWxlbWVudHMgdG8gY29tcG9uZW50c1xuXHRcdGlmIChlbC5jaGlsZHJlbiAmJiBlbC5jaGlsZHJlbi5sZW5ndGgpIHtcblx0XHRcdHZhciBpbm5lckNvbXBvbmVudHMgPSBiaW5kZXIoZWwpO1xuXG5cdFx0XHRpZiAoT2JqZWN0LmtleXMoaW5uZXJDb21wb25lbnRzKS5sZW5ndGgpIHtcblx0XHRcdFx0Ly8gYXR0YWNoIGlubmVyIGNvbXBvbmVudHMgdG8gdGhlIGN1cnJlbnQgb25lIChjcmVhdGUgYSBuZXcgc2NvcGUpIC4uLlxuXHRcdFx0XHRpZiAodHlwZW9mIGFDb21wb25lbnQgIT0gJ3VuZGVmaW5lZCcgJiYgYUNvbXBvbmVudC5jb250YWluZXIpXG5cdFx0XHRcdFx0YUNvbXBvbmVudC5jb250YWluZXIuYWRkKGlubmVyQ29tcG9uZW50cyk7XG5cdFx0XHRcdGVsc2UgLy8gb3Iga2VlcCB0aGVtIGluIHRoZSBjdXJyZW50IHNjb3BlXG5cdFx0XHRcdFx0Xy5lYWNoS2V5KGlubmVyQ29tcG9uZW50cywgc3RvcmVDb21wb25lbnQpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmIChhQ29tcG9uZW50KVxuXHRcdFx0c3RvcmVDb21wb25lbnQoYUNvbXBvbmVudCwgYXR0ci5uYW1lKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGNyZWF0ZUNvbXBvbmVudChlbCwgYXR0cikge1xuXHRcdGlmIChhdHRyLm5vZGUpIHsgLy8gZWxlbWVudCB3aWxsIGJlIGJvdW5kIHRvIGEgY29tcG9uZW50XG5cdFx0XHRhdHRyLnBhcnNlKCkudmFsaWRhdGUoKTtcblxuXHRcdFx0Ly8gZ2V0IGNvbXBvbmVudCBjbGFzcyBmcm9tIHJlZ2lzdHJ5IGFuZCB2YWxpZGF0ZVxuXHRcdFx0dmFyIENvbXBvbmVudENsYXNzID0gY29tcG9uZW50c1JlZ2lzdHJ5LmdldChhdHRyLmNvbXBDbGFzcyk7XG5cblx0XHRcdGlmICghIENvbXBvbmVudENsYXNzKVxuXHRcdFx0XHR0aHJvdyBuZXcgQmluZEVycm9yKCdjbGFzcyAnICsgYXR0ci5jb21wQ2xhc3MgKyAnIGlzIG5vdCByZWdpc3RlcmVkJyk7XG5cblx0XHRcdGNoZWNrKENvbXBvbmVudENsYXNzLCBNYXRjaC5TdWJjbGFzcyhDb21wb25lbnQsIHRydWUpKTtcblx0XG5cdFx0XHQvLyBjcmVhdGUgbmV3IGNvbXBvbmVudFxuXHRcdFx0cmV0dXJuIG5ldyBDb21wb25lbnRDbGFzcyh7fSwgZWwpO1xuXHRcdH1cblx0fVxuXG5cblx0ZnVuY3Rpb24gc3RvcmVDb21wb25lbnQoYUNvbXBvbmVudCwgbmFtZSkge1xuXHRcdGlmIChjb21wb25lbnRzW25hbWVdKVxuXHRcdFx0dGhyb3cgbmV3IEJpbmRFcnJvcignZHVwbGljYXRlIGNvbXBvbmVudCBuYW1lOiAnICsgbmFtZSk7XG5cblx0XHRjb21wb25lbnRzW25hbWVdID0gYUNvbXBvbmVudDtcblx0fVxufVxuXG5cbmJpbmRlci5jb25maWcgPSBmdW5jdGlvbihvcHRpb25zKSB7XG5cdG9wdHMuZXh0ZW5kKG9wdGlvbnMpO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCdwcm90bycpO1xuXG5mdW5jdGlvbiBCaW5kRXJyb3IobXNnKSB7XG5cdHRoaXMubWVzc2FnZSA9IG1zZztcbn1cblxuXy5tYWtlU3ViY2xhc3MoQmluZEVycm9yLCBFcnJvcik7XG5cbm1vZHVsZS5leHBvcnRzID0gQmluZEVycm9yO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyBYWFggZG9jc1xuXG4vLyBUaGluZ3Mgd2UgZXhwbGljaXRseSBkbyBOT1Qgc3VwcG9ydDpcbi8vICAgIC0gaGV0ZXJvZ2Vub3VzIGFycmF5c1xudmFyIF8gPSByZXF1aXJlKCdwcm90bycpO1xuXG52YXIgY2hlY2sgPSBmdW5jdGlvbiAodmFsdWUsIHBhdHRlcm4pIHtcbiAgLy8gUmVjb3JkIHRoYXQgY2hlY2sgZ290IGNhbGxlZCwgaWYgc29tZWJvZHkgY2FyZWQuXG4gIHRyeSB7XG4gICAgY2hlY2tTdWJ0cmVlKHZhbHVlLCBwYXR0ZXJuKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgaWYgKChlcnIgaW5zdGFuY2VvZiBNYXRjaC5FcnJvcikgJiYgZXJyLnBhdGgpXG4gICAgICBlcnIubWVzc2FnZSArPSBcIiBpbiBmaWVsZCBcIiArIGVyci5wYXRoO1xuICAgIHRocm93IGVycjtcbiAgfVxufTtcbm1vZHVsZS5leHBvcnRzID0gY2hlY2s7XG5cbnZhciBNYXRjaCA9IGNoZWNrLk1hdGNoID0ge1xuICBPcHRpb25hbDogZnVuY3Rpb24gKHBhdHRlcm4pIHtcbiAgICByZXR1cm4gbmV3IE9wdGlvbmFsKHBhdHRlcm4pO1xuICB9LFxuICBPbmVPZjogZnVuY3Rpb24gKC8qYXJndW1lbnRzKi8pIHtcbiAgICByZXR1cm4gbmV3IE9uZU9mKGFyZ3VtZW50cyk7XG4gIH0sXG4gIEFueTogWydfX2FueV9fJ10sXG4gIFdoZXJlOiBmdW5jdGlvbiAoY29uZGl0aW9uKSB7XG4gICAgcmV0dXJuIG5ldyBXaGVyZShjb25kaXRpb24pO1xuICB9LFxuICBPYmplY3RJbmNsdWRpbmc6IGZ1bmN0aW9uIChwYXR0ZXJuKSB7XG4gICAgcmV0dXJuIG5ldyBPYmplY3RJbmNsdWRpbmcocGF0dGVybik7XG4gIH0sXG4gIC8vIE1hdGNoZXMgb25seSBzaWduZWQgMzItYml0IGludGVnZXJzXG4gIEludGVnZXI6IFsnX19pbnRlZ2VyX18nXSxcblxuICAvLyBNYXRjaGVzIGhhc2ggKG9iamVjdCkgd2l0aCB2YWx1ZXMgbWF0Y2hpbmcgcGF0dGVyblxuICBPYmplY3RIYXNoOiBmdW5jdGlvbihwYXR0ZXJuKSB7XG4gICAgcmV0dXJuIG5ldyBPYmplY3RIYXNoKHBhdHRlcm4pO1xuICB9LFxuXG4gIFN1YmNsYXNzOiBmdW5jdGlvbihTdXBlcmNsYXNzLCBtYXRjaFN1cGVyY2xhc3NUb28pIHtcbiAgICByZXR1cm4gbmV3IFN1YmNsYXNzKFN1cGVyY2xhc3MsIG1hdGNoU3VwZXJjbGFzc1Rvbyk7XG4gIH0sXG5cbiAgLy8gWFhYIG1hdGNoZXJzIHNob3VsZCBrbm93IGhvdyB0byBkZXNjcmliZSB0aGVtc2VsdmVzIGZvciBlcnJvcnNcbiAgRXJyb3I6IFR5cGVFcnJvcixcblxuICAvLyBNZXRlb3IubWFrZUVycm9yVHlwZShcIk1hdGNoLkVycm9yXCIsIGZ1bmN0aW9uIChtc2cpIHtcbiAgICAvLyB0aGlzLm1lc3NhZ2UgPSBcIk1hdGNoIGVycm9yOiBcIiArIG1zZztcbiAgICAvLyBUaGUgcGF0aCBvZiB0aGUgdmFsdWUgdGhhdCBmYWlsZWQgdG8gbWF0Y2guIEluaXRpYWxseSBlbXB0eSwgdGhpcyBnZXRzXG4gICAgLy8gcG9wdWxhdGVkIGJ5IGNhdGNoaW5nIGFuZCByZXRocm93aW5nIHRoZSBleGNlcHRpb24gYXMgaXQgZ29lcyBiYWNrIHVwIHRoZVxuICAgIC8vIHN0YWNrLlxuICAgIC8vIEUuZy46IFwidmFsc1szXS5lbnRpdHkuY3JlYXRlZFwiXG4gICAgLy8gdGhpcy5wYXRoID0gXCJcIjtcbiAgICAvLyBJZiB0aGlzIGdldHMgc2VudCBvdmVyIEREUCwgZG9uJ3QgZ2l2ZSBmdWxsIGludGVybmFsIGRldGFpbHMgYnV0IGF0IGxlYXN0XG4gICAgLy8gcHJvdmlkZSBzb21ldGhpbmcgYmV0dGVyIHRoYW4gNTAwIEludGVybmFsIHNlcnZlciBlcnJvci5cbiAgLy8gICB0aGlzLnNhbml0aXplZEVycm9yID0gbmV3IE1ldGVvci5FcnJvcig0MDAsIFwiTWF0Y2ggZmFpbGVkXCIpO1xuICAvLyB9KSxcblxuICAvLyBUZXN0cyB0byBzZWUgaWYgdmFsdWUgbWF0Y2hlcyBwYXR0ZXJuLiBVbmxpa2UgY2hlY2ssIGl0IG1lcmVseSByZXR1cm5zIHRydWVcbiAgLy8gb3IgZmFsc2UgKHVubGVzcyBhbiBlcnJvciBvdGhlciB0aGFuIE1hdGNoLkVycm9yIHdhcyB0aHJvd24pLiBJdCBkb2VzIG5vdFxuICAvLyBpbnRlcmFjdCB3aXRoIF9mYWlsSWZBcmd1bWVudHNBcmVOb3RBbGxDaGVja2VkLlxuICAvLyBYWFggbWF5YmUgYWxzbyBpbXBsZW1lbnQgYSBNYXRjaC5tYXRjaCB3aGljaCByZXR1cm5zIG1vcmUgaW5mb3JtYXRpb24gYWJvdXRcbiAgLy8gICAgIGZhaWx1cmVzIGJ1dCB3aXRob3V0IHVzaW5nIGV4Y2VwdGlvbiBoYW5kbGluZyBvciBkb2luZyB3aGF0IGNoZWNrKClcbiAgLy8gICAgIGRvZXMgd2l0aCBfZmFpbElmQXJndW1lbnRzQXJlTm90QWxsQ2hlY2tlZCBhbmQgTWV0ZW9yLkVycm9yIGNvbnZlcnNpb25cbiAgdGVzdDogZnVuY3Rpb24gKHZhbHVlLCBwYXR0ZXJuKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNoZWNrU3VidHJlZSh2YWx1ZSwgcGF0dGVybik7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoZSBpbnN0YW5jZW9mIE1hdGNoLkVycm9yKVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAvLyBSZXRocm93IG90aGVyIGVycm9ycy5cbiAgICAgIHRocm93IGU7XG4gICAgfVxuICB9LFxuXG4gIC8vIFJ1bnMgYGYuYXBwbHkoY29udGV4dCwgYXJncylgLiBJZiBjaGVjaygpIGlzIG5vdCBjYWxsZWQgb24gZXZlcnkgZWxlbWVudCBvZlxuICAvLyBgYXJnc2AgKGVpdGhlciBkaXJlY3RseSBvciBpbiB0aGUgZmlyc3QgbGV2ZWwgb2YgYW4gYXJyYXkpLCB0aHJvd3MgYW4gZXJyb3JcbiAgLy8gKHVzaW5nIGBkZXNjcmlwdGlvbmAgaW4gdGhlIG1lc3NhZ2UpLlxuICAvL1xuICBfZmFpbElmQXJndW1lbnRzQXJlTm90QWxsQ2hlY2tlZDogZnVuY3Rpb24gKGYsIGNvbnRleHQsIGFyZ3MsIGRlc2NyaXB0aW9uKSB7XG4gICAgdmFyIGFyZ0NoZWNrZXIgPSBuZXcgQXJndW1lbnRDaGVja2VyKGFyZ3MsIGRlc2NyaXB0aW9uKTtcbiAgICB2YXIgcmVzdWx0ID0gY3VycmVudEFyZ3VtZW50Q2hlY2tlci53aXRoVmFsdWUoYXJnQ2hlY2tlciwgZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIGYuYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgfSk7XG4gICAgLy8gSWYgZiBkaWRuJ3QgaXRzZWxmIHRocm93LCBtYWtlIHN1cmUgaXQgY2hlY2tlZCBhbGwgb2YgaXRzIGFyZ3VtZW50cy5cbiAgICBhcmdDaGVja2VyLnRocm93VW5sZXNzQWxsQXJndW1lbnRzSGF2ZUJlZW5DaGVja2VkKCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxufTtcblxuZnVuY3Rpb24gT3B0aW9uYWwocGF0dGVybikge1xuICB0aGlzLnBhdHRlcm4gPSBwYXR0ZXJuO1xufTtcblxuZnVuY3Rpb24gT25lT2YoY2hvaWNlcykge1xuICBpZiAoY2hvaWNlcy5sZW5ndGggPT0gMClcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJNdXN0IHByb3ZpZGUgYXQgbGVhc3Qgb25lIGNob2ljZSB0byBNYXRjaC5PbmVPZlwiKTtcbiAgdGhpcy5jaG9pY2VzID0gY2hvaWNlcztcbn07XG5cbmZ1bmN0aW9uIFdoZXJlKGNvbmRpdGlvbikge1xuICB0aGlzLmNvbmRpdGlvbiA9IGNvbmRpdGlvbjtcbn07XG5cbmZ1bmN0aW9uIE9iamVjdEluY2x1ZGluZyhwYXR0ZXJuKSB7XG4gIHRoaXMucGF0dGVybiA9IHBhdHRlcm47XG59O1xuXG5mdW5jdGlvbiBPYmplY3RIYXNoKHBhdHRlcm4pIHtcbiAgdGhpcy5wYXR0ZXJuID0gcGF0dGVybjtcbn07XG5cbmZ1bmN0aW9uIFN1YmNsYXNzKFN1cGVyY2xhc3MsIG1hdGNoU3VwZXJjbGFzc1Rvbykge1xuICB0aGlzLlN1cGVyY2xhc3MgPSBTdXBlcmNsYXNzO1xuICB0aGlzLm1hdGNoU3VwZXJjbGFzcyA9IG1hdGNoU3VwZXJjbGFzc1Rvbztcbn07XG5cbnZhciB0eXBlb2ZDaGVja3MgPSBbXG4gIFtTdHJpbmcsIFwic3RyaW5nXCJdLFxuICBbTnVtYmVyLCBcIm51bWJlclwiXSxcbiAgW0Jvb2xlYW4sIFwiYm9vbGVhblwiXSxcbiAgLy8gV2hpbGUgd2UgZG9uJ3QgYWxsb3cgdW5kZWZpbmVkIGluIEVKU09OLCB0aGlzIGlzIGdvb2QgZm9yIG9wdGlvbmFsXG4gIC8vIGFyZ3VtZW50cyB3aXRoIE9uZU9mLlxuICBbdW5kZWZpbmVkLCBcInVuZGVmaW5lZFwiXVxuXTtcblxuZnVuY3Rpb24gY2hlY2tTdWJ0cmVlKHZhbHVlLCBwYXR0ZXJuKSB7XG4gIC8vIE1hdGNoIGFueXRoaW5nIVxuICBpZiAocGF0dGVybiA9PT0gTWF0Y2guQW55KVxuICAgIHJldHVybjtcblxuICAvLyBCYXNpYyBhdG9taWMgdHlwZXMuXG4gIC8vIERvIG5vdCBtYXRjaCBib3hlZCBvYmplY3RzIChlLmcuIFN0cmluZywgQm9vbGVhbilcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0eXBlb2ZDaGVja3MubGVuZ3RoOyArK2kpIHtcbiAgICBpZiAocGF0dGVybiA9PT0gdHlwZW9mQ2hlY2tzW2ldWzBdKSB7XG4gICAgICBpZiAodHlwZW9mIHZhbHVlID09PSB0eXBlb2ZDaGVja3NbaV1bMV0pXG4gICAgICAgIHJldHVybjtcbiAgICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIFwiICsgdHlwZW9mQ2hlY2tzW2ldWzFdICsgXCIsIGdvdCBcIiArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZW9mIHZhbHVlKTtcbiAgICB9XG4gIH1cbiAgaWYgKHBhdHRlcm4gPT09IG51bGwpIHtcbiAgICBpZiAodmFsdWUgPT09IG51bGwpXG4gICAgICByZXR1cm47XG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgbnVsbCwgZ290IFwiICsgRUpTT04uc3RyaW5naWZ5KHZhbHVlKSk7XG4gIH1cblxuICAvLyBNYXRjaC5JbnRlZ2VyIGlzIHNwZWNpYWwgdHlwZSBlbmNvZGVkIHdpdGggYXJyYXlcbiAgaWYgKHBhdHRlcm4gPT09IE1hdGNoLkludGVnZXIpIHtcbiAgICAvLyBUaGVyZSBpcyBubyBjb25zaXN0ZW50IGFuZCByZWxpYWJsZSB3YXkgdG8gY2hlY2sgaWYgdmFyaWFibGUgaXMgYSA2NC1iaXRcbiAgICAvLyBpbnRlZ2VyLiBPbmUgb2YgdGhlIHBvcHVsYXIgc29sdXRpb25zIGlzIHRvIGdldCByZW1pbmRlciBvZiBkaXZpc2lvbiBieSAxXG4gICAgLy8gYnV0IHRoaXMgbWV0aG9kIGZhaWxzIG9uIHJlYWxseSBsYXJnZSBmbG9hdHMgd2l0aCBiaWcgcHJlY2lzaW9uLlxuICAgIC8vIEUuZy46IDEuMzQ4MTkyMzA4NDkxODI0ZSsyMyAlIDEgPT09IDAgaW4gVjhcbiAgICAvLyBCaXR3aXNlIG9wZXJhdG9ycyB3b3JrIGNvbnNpc3RhbnRseSBidXQgYWx3YXlzIGNhc3QgdmFyaWFibGUgdG8gMzItYml0XG4gICAgLy8gc2lnbmVkIGludGVnZXIgYWNjb3JkaW5nIHRvIEphdmFTY3JpcHQgc3BlY3MuXG4gICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJudW1iZXJcIiAmJiAodmFsdWUgfCAwKSA9PT0gdmFsdWUpXG4gICAgICByZXR1cm5cbiAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJFeHBlY3RlZCBJbnRlZ2VyLCBnb3QgXCJcbiAgICAgICAgICAgICAgICArICh2YWx1ZSBpbnN0YW5jZW9mIE9iamVjdCA/IEVKU09OLnN0cmluZ2lmeSh2YWx1ZSkgOiB2YWx1ZSkpO1xuICB9XG5cbiAgLy8gXCJPYmplY3RcIiBpcyBzaG9ydGhhbmQgZm9yIE1hdGNoLk9iamVjdEluY2x1ZGluZyh7fSk7XG4gIGlmIChwYXR0ZXJuID09PSBPYmplY3QpXG4gICAgcGF0dGVybiA9IE1hdGNoLk9iamVjdEluY2x1ZGluZyh7fSk7XG5cbiAgLy8gQXJyYXkgKGNoZWNrZWQgQUZURVIgQW55LCB3aGljaCBpcyBpbXBsZW1lbnRlZCBhcyBhbiBBcnJheSkuXG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICBpZiAocGF0dGVybi5sZW5ndGggIT09IDEpXG4gICAgICB0aHJvdyBFcnJvcihcIkJhZCBwYXR0ZXJuOiBhcnJheXMgbXVzdCBoYXZlIG9uZSB0eXBlIGVsZW1lbnRcIiArXG4gICAgICAgICAgICAgICAgICBFSlNPTi5zdHJpbmdpZnkocGF0dGVybikpO1xuICAgIGlmICghXy5pc0FycmF5KHZhbHVlKSAmJiAhXy5pc0FyZ3VtZW50cyh2YWx1ZSkpIHtcbiAgICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIGFycmF5LCBnb3QgXCIgKyBFSlNPTi5zdHJpbmdpZnkodmFsdWUpKTtcbiAgICB9XG5cbiAgICBfLmVhY2godmFsdWUsIGZ1bmN0aW9uICh2YWx1ZUVsZW1lbnQsIGluZGV4KSB7XG4gICAgICB0cnkge1xuICAgICAgICBjaGVja1N1YnRyZWUodmFsdWVFbGVtZW50LCBwYXR0ZXJuWzBdKTtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICBpZiAoZXJyIGluc3RhbmNlb2YgTWF0Y2guRXJyb3IpIHtcbiAgICAgICAgICBlcnIucGF0aCA9IF9wcmVwZW5kUGF0aChpbmRleCwgZXJyLnBhdGgpO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IGVycjtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBBcmJpdHJhcnkgdmFsaWRhdGlvbiBjaGVja3MuIFRoZSBjb25kaXRpb24gY2FuIHJldHVybiBmYWxzZSBvciB0aHJvdyBhXG4gIC8vIE1hdGNoLkVycm9yIChpZSwgaXQgY2FuIGludGVybmFsbHkgdXNlIGNoZWNrKCkpIHRvIGZhaWwuXG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgV2hlcmUpIHtcbiAgICBpZiAocGF0dGVybi5jb25kaXRpb24odmFsdWUpKVxuICAgICAgcmV0dXJuO1xuICAgIC8vIFhYWCB0aGlzIGVycm9yIGlzIHRlcnJpYmxlXG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRmFpbGVkIE1hdGNoLldoZXJlIHZhbGlkYXRpb25cIik7XG4gIH1cblxuXG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgT3B0aW9uYWwpXG4gICAgcGF0dGVybiA9IE1hdGNoLk9uZU9mKHVuZGVmaW5lZCwgcGF0dGVybi5wYXR0ZXJuKTtcblxuICBpZiAocGF0dGVybiBpbnN0YW5jZW9mIE9uZU9mKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXR0ZXJuLmNob2ljZXMubGVuZ3RoOyArK2kpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNoZWNrU3VidHJlZSh2YWx1ZSwgcGF0dGVybi5jaG9pY2VzW2ldKTtcbiAgICAgICAgLy8gTm8gZXJyb3I/IFlheSwgcmV0dXJuLlxuICAgICAgICByZXR1cm47XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgLy8gT3RoZXIgZXJyb3JzIHNob3VsZCBiZSB0aHJvd24uIE1hdGNoIGVycm9ycyBqdXN0IG1lYW4gdHJ5IGFub3RoZXJcbiAgICAgICAgLy8gY2hvaWNlLlxuICAgICAgICBpZiAoIShlcnIgaW5zdGFuY2VvZiBNYXRjaC5FcnJvcikpXG4gICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBYWFggdGhpcyBlcnJvciBpcyB0ZXJyaWJsZVxuICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkZhaWxlZCBNYXRjaC5PbmVPZiBvciBNYXRjaC5PcHRpb25hbCB2YWxpZGF0aW9uXCIpO1xuICB9XG5cbiAgLy8gQSBmdW5jdGlvbiB0aGF0IGlzbid0IHNvbWV0aGluZyB3ZSBzcGVjaWFsLWNhc2UgaXMgYXNzdW1lZCB0byBiZSBhXG4gIC8vIGNvbnN0cnVjdG9yLlxuICBpZiAocGF0dGVybiBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgcGF0dGVybilcbiAgICAgIHJldHVybjtcbiAgICAvLyBYWFggd2hhdCBpZiAubmFtZSBpc24ndCBkZWZpbmVkXG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgXCIgKyBwYXR0ZXJuLmNvbnN0cnVjdG9yLm5hbWUpO1xuICB9XG5cbiAgdmFyIHVua25vd25LZXlzQWxsb3dlZCA9IGZhbHNlO1xuICBpZiAocGF0dGVybiBpbnN0YW5jZW9mIE9iamVjdEluY2x1ZGluZykge1xuICAgIHVua25vd25LZXlzQWxsb3dlZCA9IHRydWU7XG4gICAgcGF0dGVybiA9IHBhdHRlcm4ucGF0dGVybjtcbiAgfVxuXG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgT2JqZWN0SGFzaCkge1xuICAgIHZhciBrZXlQYXR0ZXJuID0gcGF0dGVybi5wYXR0ZXJuO1xuICAgIHZhciBlbXB0eUhhc2ggPSB0cnVlO1xuICAgIGZvciAodmFyIGtleSBpbiB2YWx1ZSkge1xuICAgICAgZW1wdHlIYXNoID0gZmFsc2U7XG4gICAgICBjaGVjayh2YWx1ZVtrZXldLCBrZXlQYXR0ZXJuKTtcbiAgICB9XG4gICAgaWYgKGVtcHR5SGFzaClcbiAgICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIFwiICsgcGF0dGVybi5jb25zdHJ1Y3Rvci5uYW1lKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAocGF0dGVybiBpbnN0YW5jZW9mIFN1YmNsYXNzKSB7XG4gICAgdmFyIFN1cGVyY2xhc3MgPSBwYXR0ZXJuLlN1cGVyY2xhc3M7XG4gICAgaWYgKHBhdHRlcm4ubWF0Y2hTdXBlcmNsYXNzICYmIHZhbHVlID09IFN1cGVyY2xhc3MpXG4gICAgICByZXR1cm47XG4gICAgaWYgKCEgKHZhbHVlLnByb3RvdHlwZSBpbnN0YW5jZW9mIFN1cGVyY2xhc3MpKVxuICAgICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgXCIgKyBwYXR0ZXJuLmNvbnN0cnVjdG9yLm5hbWUgKyBcIiBvZiBcIiArIFN1cGVyY2xhc3MubmFtZSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBwYXR0ZXJuICE9PSBcIm9iamVjdFwiKVxuICAgIHRocm93IEVycm9yKFwiQmFkIHBhdHRlcm46IHVua25vd24gcGF0dGVybiB0eXBlXCIpO1xuXG4gIC8vIEFuIG9iamVjdCwgd2l0aCByZXF1aXJlZCBhbmQgb3B0aW9uYWwga2V5cy4gTm90ZSB0aGF0IHRoaXMgZG9lcyBOT1QgZG9cbiAgLy8gc3RydWN0dXJhbCBtYXRjaGVzIGFnYWluc3Qgb2JqZWN0cyBvZiBzcGVjaWFsIHR5cGVzIHRoYXQgaGFwcGVuIHRvIG1hdGNoXG4gIC8vIHRoZSBwYXR0ZXJuOiB0aGlzIHJlYWxseSBuZWVkcyB0byBiZSBhIHBsYWluIG9sZCB7T2JqZWN0fSFcbiAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ29iamVjdCcpXG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgb2JqZWN0LCBnb3QgXCIgKyB0eXBlb2YgdmFsdWUpO1xuICBpZiAodmFsdWUgPT09IG51bGwpXG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgb2JqZWN0LCBnb3QgbnVsbFwiKTtcbiAgaWYgKHZhbHVlLmNvbnN0cnVjdG9yICE9PSBPYmplY3QpXG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgcGxhaW4gb2JqZWN0XCIpO1xuXG4gIHZhciByZXF1aXJlZFBhdHRlcm5zID0ge307XG4gIHZhciBvcHRpb25hbFBhdHRlcm5zID0ge307XG4gIF8uZWFjaChwYXR0ZXJuLCBmdW5jdGlvbiAoc3ViUGF0dGVybiwga2V5KSB7XG4gICAgaWYgKHN1YlBhdHRlcm4gaW5zdGFuY2VvZiBPcHRpb25hbClcbiAgICAgIG9wdGlvbmFsUGF0dGVybnNba2V5XSA9IHN1YlBhdHRlcm4ucGF0dGVybjtcbiAgICBlbHNlXG4gICAgICByZXF1aXJlZFBhdHRlcm5zW2tleV0gPSBzdWJQYXR0ZXJuO1xuICB9KTtcblxuICBfLmVhY2godmFsdWUsIGZ1bmN0aW9uIChzdWJWYWx1ZSwga2V5KSB7XG4gICAgdHJ5IHtcbiAgICAgIGlmIChfLmhhcyhyZXF1aXJlZFBhdHRlcm5zLCBrZXkpKSB7XG4gICAgICAgIGNoZWNrU3VidHJlZShzdWJWYWx1ZSwgcmVxdWlyZWRQYXR0ZXJuc1trZXldKTtcbiAgICAgICAgZGVsZXRlIHJlcXVpcmVkUGF0dGVybnNba2V5XTtcbiAgICAgIH0gZWxzZSBpZiAoXy5oYXMob3B0aW9uYWxQYXR0ZXJucywga2V5KSkge1xuICAgICAgICBjaGVja1N1YnRyZWUoc3ViVmFsdWUsIG9wdGlvbmFsUGF0dGVybnNba2V5XSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoIXVua25vd25LZXlzQWxsb3dlZClcbiAgICAgICAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJVbmtub3duIGtleVwiKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGlmIChlcnIgaW5zdGFuY2VvZiBNYXRjaC5FcnJvcilcbiAgICAgICAgZXJyLnBhdGggPSBfcHJlcGVuZFBhdGgoa2V5LCBlcnIucGF0aCk7XG4gICAgICB0aHJvdyBlcnI7XG4gICAgfVxuICB9KTtcblxuICBfLmVhY2gocmVxdWlyZWRQYXR0ZXJucywgZnVuY3Rpb24gKHN1YlBhdHRlcm4sIGtleSkge1xuICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIk1pc3Npbmcga2V5ICdcIiArIGtleSArIFwiJ1wiKTtcbiAgfSk7XG59O1xuXG5mdW5jdGlvbiBBcmd1bWVudENoZWNrZXIoYXJncywgZGVzY3JpcHRpb24pIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICAvLyBNYWtlIGEgU0hBTExPVyBjb3B5IG9mIHRoZSBhcmd1bWVudHMuIChXZSdsbCBiZSBkb2luZyBpZGVudGl0eSBjaGVja3NcbiAgLy8gYWdhaW5zdCBpdHMgY29udGVudHMuKVxuICBzZWxmLmFyZ3MgPSBfLmNsb25lKGFyZ3MpO1xuICAvLyBTaW5jZSB0aGUgY29tbW9uIGNhc2Ugd2lsbCBiZSB0byBjaGVjayBhcmd1bWVudHMgaW4gb3JkZXIsIGFuZCB3ZSBzcGxpY2VcbiAgLy8gb3V0IGFyZ3VtZW50cyB3aGVuIHdlIGNoZWNrIHRoZW0sIG1ha2UgaXQgc28gd2Ugc3BsaWNlIG91dCBmcm9tIHRoZSBlbmRcbiAgLy8gcmF0aGVyIHRoYW4gdGhlIGJlZ2lubmluZy5cbiAgc2VsZi5hcmdzLnJldmVyc2UoKTtcbiAgc2VsZi5kZXNjcmlwdGlvbiA9IGRlc2NyaXB0aW9uO1xufTtcblxuXy5leHRlbmRQcm90byhBcmd1bWVudENoZWNrZXIsIHtcbiAgY2hlY2tpbmc6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoc2VsZi5fY2hlY2tpbmdPbmVWYWx1ZSh2YWx1ZSkpXG4gICAgICByZXR1cm47XG4gICAgLy8gQWxsb3cgY2hlY2soYXJndW1lbnRzLCBbU3RyaW5nXSkgb3IgY2hlY2soYXJndW1lbnRzLnNsaWNlKDEpLCBbU3RyaW5nXSlcbiAgICAvLyBvciBjaGVjayhbZm9vLCBiYXJdLCBbU3RyaW5nXSkgdG8gY291bnQuLi4gYnV0IG9ubHkgaWYgdmFsdWUgd2Fzbid0XG4gICAgLy8gaXRzZWxmIGFuIGFyZ3VtZW50LlxuICAgIGlmIChfLmlzQXJyYXkodmFsdWUpIHx8IF8uaXNBcmd1bWVudHModmFsdWUpKSB7XG4gICAgICBfLmVhY2godmFsdWUsIF8uYmluZChzZWxmLl9jaGVja2luZ09uZVZhbHVlLCBzZWxmKSk7XG4gICAgfVxuICB9LFxuICBfY2hlY2tpbmdPbmVWYWx1ZTogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZi5hcmdzLmxlbmd0aDsgKytpKSB7XG4gICAgICAvLyBJcyB0aGlzIHZhbHVlIG9uZSBvZiB0aGUgYXJndW1lbnRzPyAoVGhpcyBjYW4gaGF2ZSBhIGZhbHNlIHBvc2l0aXZlIGlmXG4gICAgICAvLyB0aGUgYXJndW1lbnQgaXMgYW4gaW50ZXJuZWQgcHJpbWl0aXZlLCBidXQgaXQncyBzdGlsbCBhIGdvb2QgZW5vdWdoXG4gICAgICAvLyBjaGVjay4pXG4gICAgICBpZiAodmFsdWUgPT09IHNlbGYuYXJnc1tpXSkge1xuICAgICAgICBzZWxmLmFyZ3Muc3BsaWNlKGksIDEpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9LFxuICB0aHJvd1VubGVzc0FsbEFyZ3VtZW50c0hhdmVCZWVuQ2hlY2tlZDogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoIV8uaXNFbXB0eShzZWxmLmFyZ3MpKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRGlkIG5vdCBjaGVjaygpIGFsbCBhcmd1bWVudHMgZHVyaW5nIFwiICtcbiAgICAgICAgICAgICAgICAgICAgICBzZWxmLmRlc2NyaXB0aW9uKTtcbiAgfVxufSk7XG5cbnZhciBfanNLZXl3b3JkcyA9IFtcImRvXCIsIFwiaWZcIiwgXCJpblwiLCBcImZvclwiLCBcImxldFwiLCBcIm5ld1wiLCBcInRyeVwiLCBcInZhclwiLCBcImNhc2VcIixcbiAgXCJlbHNlXCIsIFwiZW51bVwiLCBcImV2YWxcIiwgXCJmYWxzZVwiLCBcIm51bGxcIiwgXCJ0aGlzXCIsIFwidHJ1ZVwiLCBcInZvaWRcIiwgXCJ3aXRoXCIsXG4gIFwiYnJlYWtcIiwgXCJjYXRjaFwiLCBcImNsYXNzXCIsIFwiY29uc3RcIiwgXCJzdXBlclwiLCBcInRocm93XCIsIFwid2hpbGVcIiwgXCJ5aWVsZFwiLFxuICBcImRlbGV0ZVwiLCBcImV4cG9ydFwiLCBcImltcG9ydFwiLCBcInB1YmxpY1wiLCBcInJldHVyblwiLCBcInN0YXRpY1wiLCBcInN3aXRjaFwiLFxuICBcInR5cGVvZlwiLCBcImRlZmF1bHRcIiwgXCJleHRlbmRzXCIsIFwiZmluYWxseVwiLCBcInBhY2thZ2VcIiwgXCJwcml2YXRlXCIsIFwiY29udGludWVcIixcbiAgXCJkZWJ1Z2dlclwiLCBcImZ1bmN0aW9uXCIsIFwiYXJndW1lbnRzXCIsIFwiaW50ZXJmYWNlXCIsIFwicHJvdGVjdGVkXCIsIFwiaW1wbGVtZW50c1wiLFxuICBcImluc3RhbmNlb2ZcIl07XG5cbi8vIEFzc3VtZXMgdGhlIGJhc2Ugb2YgcGF0aCBpcyBhbHJlYWR5IGVzY2FwZWQgcHJvcGVybHlcbi8vIHJldHVybnMga2V5ICsgYmFzZVxuZnVuY3Rpb24gX3ByZXBlbmRQYXRoKGtleSwgYmFzZSkge1xuICBpZiAoKHR5cGVvZiBrZXkpID09PSBcIm51bWJlclwiIHx8IGtleS5tYXRjaCgvXlswLTldKyQvKSlcbiAgICBrZXkgPSBcIltcIiArIGtleSArIFwiXVwiO1xuICBlbHNlIGlmICgha2V5Lm1hdGNoKC9eW2Etel8kXVswLTlhLXpfJF0qJC9pKSB8fCBfLmNvbnRhaW5zKF9qc0tleXdvcmRzLCBrZXkpKVxuICAgIGtleSA9IEpTT04uc3RyaW5naWZ5KFtrZXldKTtcblxuICBpZiAoYmFzZSAmJiBiYXNlWzBdICE9PSBcIltcIilcbiAgICByZXR1cm4ga2V5ICsgJy4nICsgYmFzZTtcbiAgcmV0dXJuIGtleSArIGJhc2U7XG59O1xuXG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBGYWNldGVkT2JqZWN0ID0gcmVxdWlyZSgnLi4vZmFjZXRzL2Zfb2JqZWN0Jylcblx0LCBtZXNzZW5nZXJNaXhpbiA9IHJlcXVpcmUoJy4vbWVzc2VuZ2VyJylcblx0LCBfID0gcmVxdWlyZSgncHJvdG8nKTtcblxudmFyIENvbXBvbmVudCA9IF8uY3JlYXRlU3ViY2xhc3MoRmFjZXRlZE9iamVjdCwgJ0NvbXBvbmVudCcsIHRydWUpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbXBvbmVudDtcblxuXG5Db21wb25lbnQuY3JlYXRlQ29tcG9uZW50Q2xhc3MgPSBGYWNldGVkT2JqZWN0LmNyZWF0ZUZhY2V0ZWRDbGFzcztcbmRlbGV0ZSBDb21wb25lbnQuY3JlYXRlRmFjZXRlZENsYXNzO1xuXG5fLmV4dGVuZFByb3RvKENvbXBvbmVudCwge1xuXHRpbml0OiBpbml0Q29tcG9uZW50XG59KTtcblxuXy5leHRlbmRQcm90byhDb21wb25lbnQsIG1lc3Nlbmdlck1peGluKTtcblxuZnVuY3Rpb24gaW5pdENvbXBvbmVudChmYWNldHNPcHRpb25zLCBlbGVtZW50KSB7XG5cdHRoaXMuZWwgPSBlbGVtZW50O1xuXHR0aGlzLmluaXRNZXNzZW5nZXIoKTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIEZhY2V0ID0gcmVxdWlyZSgnLi4vZmFjZXRzL2ZfY2xhc3MnKVxuXHQsIG1lc3Nlbmdlck1peGluID0gcmVxdWlyZSgnLi9tZXNzZW5nZXInKVxuXHQsIF8gPSByZXF1aXJlKCdwcm90bycpO1xuXG52YXIgQ29tcG9uZW50RmFjZXQgPSBfLmNyZWF0ZVN1YmNsYXNzKEZhY2V0LCAnQ29tcG9uZW50RmFjZXQnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb25lbnRGYWNldDtcblxuXG5fLmV4dGVuZFByb3RvKENvbXBvbmVudEZhY2V0LCB7XG5cdGluaXQ6IGluaXRDb21wb25lbnRGYWNldCxcbn0pO1xuXG5fLmV4dGVuZFByb3RvKENvbXBvbmVudEZhY2V0LCBtZXNzZW5nZXJNaXhpbik7XG5cblxuZnVuY3Rpb24gaW5pdENvbXBvbmVudEZhY2V0KCkge1xuXHR0aGlzLmluaXRNZXNzZW5nZXIoKTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIENvbXBvbmVudEZhY2V0ID0gcmVxdWlyZSgnLi4vY19mYWNldCcpXG5cdCwgYmluZGVyID0gcmVxdWlyZSgnLi4vLi4vYmluZGVyL2JpbmRlcicpXG5cdCwgXyA9IHJlcXVpcmUoJ3Byb3RvJylcblx0LCBmYWNldHNSZWdpc3RyeSA9IHJlcXVpcmUoJy4vY2ZfcmVnaXN0cnknKTtcblxuLy8gY29udGFpbmVyIGZhY2V0XG52YXIgQ29udGFpbmVyID0gXy5jcmVhdGVTdWJjbGFzcyhDb21wb25lbnRGYWNldCwgJ0NvbnRhaW5lcicpO1xuXG5fLmV4dGVuZFByb3RvKENvbnRhaW5lciwge1xuXHRpbml0OiBpbml0Q29udGFpbmVyLFxuXHRfYmluZDogX2JpbmRDb21wb25lbnRzLFxuXHRhZGQ6IGFkZENoaWxkQ29tcG9uZW50c1xufSk7XG5cbmZhY2V0c1JlZ2lzdHJ5LmFkZChDb250YWluZXIpO1xuXG5cbmZ1bmN0aW9uIGluaXRDb250YWluZXIoKSB7XG5cdHRoaXMuY2hpbGRyZW4gPSB7fTtcbn1cblxuXG5mdW5jdGlvbiBfYmluZENvbXBvbmVudHMoKSB7XG5cdC8vIFRPRE9cblx0Ly8gdGhpcyBmdW5jdGlvbiBzaG91bGQgcmUtYmluZCByYXRoZXIgdGhhbiBiaW5kIGFsbCBpbnRlcm5hbCBlbGVtZW50c1xuXHR0aGlzLmNoaWxkcmVuID0gYmluZGVyKHRoaXMub3duZXIuZWwpO1xufVxuXG5cbmZ1bmN0aW9uIGFkZENoaWxkQ29tcG9uZW50cyhjaGlsZENvbXBvbmVudHMpIHtcblx0Ly8gVE9ET1xuXHQvLyB0aGlzIGZ1bmN0aW9uIHNob3VsZCBpbnRlbGxpZ2VudGx5IHJlLWJpbmQgZXhpc3RpbmcgY29tcG9uZW50cyB0b1xuXHQvLyBuZXcgZWxlbWVudHMgKGlmIHRoZXkgY2hhbmdlZCkgYW5kIHJlLWJpbmQgcHJldmlvdXNseSBib3VuZCBldmVudHMgdG8gdGhlIHNhbWVcblx0Ly8gZXZlbnQgaGFuZGxlcnNcblx0Ly8gb3IgbWF5YmUgbm90LCBpZiB0aGlzIGZ1bmN0aW9uIGlzIG9ubHkgdXNlZCBieSBiaW5kZXIgdG8gYWRkIG5ldyBlbGVtZW50cy4uLlxuXHRfLmV4dGVuZCh0aGlzLmNoaWxkcmVuLCBjaGlsZENvbXBvbmVudHMpO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ29tcG9uZW50RmFjZXQgPSByZXF1aXJlKCcuLi9jX2ZhY2V0Jylcblx0LCBGYWNldEVycm9yID0gQ29tcG9uZW50RmFjZXQuRXJyb3Jcblx0LCBfID0gcmVxdWlyZSgncHJvdG8nKVxuXHQsIGZhY2V0c1JlZ2lzdHJ5ID0gcmVxdWlyZSgnLi9jZl9yZWdpc3RyeScpXG5cdCwgbWVzc2VuZ2VyTWl4aW4gPSByZXF1aXJlKCcuLi9tZXNzZW5nZXInKVxuXHQsIGRvbUV2ZW50c0NvbnN0cnVjdG9ycyA9IHJlcXVpcmUoJy4vZG9tX2V2ZW50cycpO1xuXG4vLyBldmVudHMgZmFjZXRcbnZhciBFdmVudHMgPSBfLmNyZWF0ZVN1YmNsYXNzKENvbXBvbmVudEZhY2V0LCAnRXZlbnRzJyk7XG5cbl8uZXh0ZW5kUHJvdG8oRXZlbnRzLCB7XG5cdGluaXQ6IGluaXRFdmVudHNGYWNldCxcblx0ZG9tOiBnZXREb21FbGVtZW50LFxuXHRoYW5kbGVFdmVudDogaGFuZGxlRXZlbnQsIC8vIGV2ZW50IGRpc3BhdGNoZXIgLSBhcyBkZWZpbmVkIGJ5IEV2ZW50IERPTSBBUElcblx0b246IGFkZExpc3RlbmVyLFxuXHRvZmY6IHJlbW92ZUxpc3RlbmVyLFxuXHRvbkV2ZW50czogYWRkTGlzdGVuZXJzVG9FdmVudHMsXG5cdG9mZkV2ZW50czogcmVtb3ZlTGlzdGVuZXJzRnJvbUV2ZW50cyxcblx0dHJpZ2dlcjogdHJpZ2dlckV2ZW50LFxuXHRnZXRMaXN0ZW5lcnM6IGdldExpc3RlbmVycyxcblx0Ly8gX3JlYXR0YWNoOiBfcmVhdHRhY2hFdmVudHNPbkVsZW1lbnRDaGFuZ2Vcbn0pO1xuXG5mYWNldHNSZWdpc3RyeS5hZGQoRXZlbnRzKTtcblxuXG52YXIgdXNlQ2FwdHVyZVN1ZmZpeCA9ICdfX2NhcHR1cmUnXG5cdCwgd3JvbmdFdmVudFBhdHRlcm4gPSAvX19jYXB0dXJlLztcblxuXG5mdW5jdGlvbiBpbml0RXZlbnRzRmFjZXQoKSB7XG5cdC8vIGRlcGVuZGVuY3lcblx0aWYgKCEgdGhpcy5vd25lci5mYWNldHMuRWwpXG5cdFx0dGhyb3cgbmV3IEZhY2V0RXJyb3IoJ0V2ZW50cyBmYWNldCByZXF1aXJlIEVsIGZhY2V0Jyk7XG5cblx0Ly8gaW5pdGlhbGl6ZSBsaXN0ZW5lcnMgbWFwXG5cdHRoaXMuX2V2ZW50c0xpc3RlbmVycyA9IHt9O1xufVxuXG5cbmZ1bmN0aW9uIGdldERvbUVsZW1lbnQoKSB7XG5cdHJldHVybiB0aGlzLm93bmVyLkVsLmRvbTtcbn1cblxuXG5mdW5jdGlvbiBoYW5kbGVFdmVudChldmVudCkge1xuXHRpc0NhcHR1cmVQaGFzZSA9IGV2ZW50LmV2ZW50UGhhc2UgPT0gd2luZG93LkV2ZW50LkNBUFRVUklOR19QSEFTRTtcblxuXHR2YXIgZXZlbnRLZXkgPSBldmVudC50eXBlICsgKGlzQ2FwdHVyZVBoYXNlID8gdXNlQ2FwdHVyZVN1ZmZpeCA6ICcnKVxuXHRcdCwgZXZlbnRMaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNMaXN0ZW5lcnNbZXZlbnRLZXldO1xuXG5cdGlmIChldmVudExpc3RlbmVycylcblx0XHRldmVudExpc3RlbmVycy5mb3JFYWNoKGZ1bmN0aW9uKGxpc3RlbmVyKSB7XG5cdFx0XHRsaXN0ZW5lcihldmVudCk7XG5cdFx0fSk7XG59XG5cblxuZnVuY3Rpb24gYWRkTGlzdGVuZXIoZXZlbnRUeXBlcywgbGlzdGVuZXIsIHVzZUNhcHR1cmUpIHtcblx0Y2hlY2soZXZlbnRzLCBTdHJpbmcpO1xuXHRjaGVjayhsaXN0ZW5lciwgRnVuY3Rpb24pO1xuXG5cdHZhciBldmVudHNBcnJheSA9IGV2ZW50VHlwZXMuc3BsaXQoL1xccypcXCw/XFxzKi8pXG5cdFx0LCB3YXNBdHRhY2hlZCA9IGZhbHNlO1xuXG5cdGV2ZW50c0FycmF5LmZvckVhY2goZnVuY3Rpb24oZXZlbnRUeXBlKSB7XG5cdFx0aWYgKHdyb25nRXZlbnRQYXR0ZXJuLnRlc3QoZXZlbnRUeXBlKSlcblx0XHRcdHRocm93IG5ldyBSYW5nZUVycm9yKCdldmVudCB0eXBlIGNhbm5vdCBjb250YWluICcgKyB1c2VDYXB0dXJlU3VmZml4KTtcblxuXHRcdHZhciBldmVudEtleSA9IGV2ZW50VHlwZSArICh1c2VDYXB0dXJlID8gdXNlQ2FwdHVyZVN1ZmZpeCA6ICcnKVxuXHRcdFx0LCBldmVudExpc3RlbmVycyA9IHRoaXMuX2V2ZW50c0xpc3RlbmVyc1tldmVudEtleV1cblx0XHRcdFx0PSB0aGlzLl9ldmVudHNMaXN0ZW5lcnNbZXZlbnRLZXldIHx8IFtdO1xuXG5cdFx0aWYgKCEgX2hhc0V2ZW50TGlzdGVuZXJzKGV2ZW50S2V5KSkge1xuXHRcdFx0Ly8gdHJ1ZSA9IHVzZSBjYXB0dXJlLCBmb3IgcGFydGljdWxhciBsaXN0ZW5lciBpdCBpcyBkZXRlcm1pbmVkIGluIGhhbmRsZUV2ZW50XG5cdFx0XHR0aGlzLmRvbSgpLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRLZXksIHRoaXMsIHRydWUpO1xuXHRcdFx0dmFyIG5vdFlldEF0dGFjaGVkID0gdHJ1ZTtcblx0XHR9IGVsc2Vcblx0XHRcdG5vdFlldEF0dGFjaGVkID0gZXZlbnRMaXN0ZW5lcnMuaW5kZXhPZihsaXN0ZW5lcikgPT0gLTE7XG5cblx0XHRpZiAobm90WWV0QXR0YWNoZWQpIHtcblx0XHRcdHdhc0F0dGFjaGVkID0gdHJ1ZTtcblx0XHRcdGV2ZW50TGlzdGVuZXJzLnB1c2gobGlzdGVuZXIpO1xuXHRcdH1cblx0fSk7XG5cblx0cmV0dXJuIHdhc0F0dGFjaGVkO1xufVxuXG5cbmZ1bmN0aW9uIGFkZExpc3RlbmVyc1RvRXZlbnRzKGV2ZW50c0xpc3RlbmVycywgdXNlQ2FwdHVyZSkge1xuXHRjaGVjayhldmVudHNMaXN0ZW5lcnMsIE1hdGNoLk9iamVjdCk7XG5cblx0dmFyIHdhc0F0dGFjaGVkTWFwID0gXy5tYXBLZXlzKGV2ZW50c0xpc3RlbmVycywgZnVuY3Rpb24obGlzdGVuZXIsIGV2ZW50VHlwZXMpIHtcblx0XHRyZXR1cm4gdGhpcy5hZGRMaXN0ZW5lcihldmVudFR5cGVzLCBsaXN0ZW5lciwgdXNlQ2FwdHVyZSlcblx0fSwgdGhpcyk7XG5cblx0cmV0dXJuIHdhc0F0dGFjaGVkTWFwO1x0XG59XG5cblxuZnVuY3Rpb24gcmVtb3ZlTGlzdGVuZXIoZXZlbnRUeXBlcywgbGlzdGVuZXIsIHVzZUNhcHR1cmUpIHtcblx0Y2hlY2soZXZlbnRUeXBlcywgU3RyaW5nKTtcblx0Y2hlY2sobGlzdGVuZXIsIEZ1bmN0aW9uKTtcblxuXHR2YXIgZXZlbnRzQXJyYXkgPSBldmVudFR5cGVzLnNwbGl0KC9cXHMqXFwsP1xccyovKVxuXHRcdCwgd2FzUmVtb3ZlZCA9IGZhbHNlO1xuXG5cdGV2ZW50c0FycmF5LmZvckVhY2goZnVuY3Rpb24oZXZlbnRUeXBlKSB7XG5cdFx0aWYgKHdyb25nRXZlbnRQYXR0ZXJuLnRlc3QoZXZlbnRUeXBlKSlcblx0XHRcdHRocm93IG5ldyBSYW5nZUVycm9yKCdldmVudCB0eXBlIGNhbm5vdCBjb250YWluICcgKyB1c2VDYXB0dXJlU3VmZml4KTtcblxuXHRcdHZhciBldmVudEtleSA9IGV2ZW50VHlwZSArICh1c2VDYXB0dXJlID8gdXNlQ2FwdHVyZVN1ZmZpeCA6ICcnKVxuXHRcdFx0LCBldmVudExpc3RlbmVycyA9IHRoaXMuX2V2ZW50c0xpc3RlbmVyc1tldmVudEtleV07XG5cblx0XHRpZiAoISAoZXZlbnRMaXN0ZW5lcnMgJiYgZXZlbnRMaXN0ZW5lcnMubGVuZ3RoKSkgcmV0dXJuO1xuXG5cdFx0aWYgKGxpc3RlbmVyKSB7XG5cdFx0XHRsaXN0ZW5lckluZGV4ID0gZXZlbnRMaXN0ZW5lcnMuaW5kZXhPZihsaXN0ZW5lcik7XG5cdFx0XHRpZiAobGlzdGVuZXJJbmRleCA9PSAtMSlcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0ZXZlbnRMaXN0ZW5lcnMuc3BsaWNlKGxpc3RlbmVySW5kZXgsIDEpO1xuXHRcdFx0aWYgKCEgZXZlbnRMaXN0ZW5lcnMubGVuZ3RoKVxuXHRcdFx0XHRkZWxldGUgdGhpcy5fZXZlbnRzTGlzdGVuZXJzW2V2ZW50S2V5XTtcblx0XHR9IGVsc2Vcblx0XHRcdGRlbGV0ZSB0aGlzLl9ldmVudHNMaXN0ZW5lcnNbZXZlbnRLZXldO1xuXG5cdFx0d2FzUmVtb3ZlZCA9IHRydWU7XG5cblx0XHRpZiAoISBfaGFzRXZlbnRMaXN0ZW5lcnMoZXZlbnRUeXBlKSlcblx0XHRcdC8vIHRydWUgPSB1c2UgY2FwdHVyZSwgZm9yIHBhcnRpY3VsYXIgbGlzdGVuZXIgaXQgaXMgZGV0ZXJtaW5lZCBpbiBoYW5kbGVFdmVudFxuXHRcdFx0dGhpcy5kb20oKS5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50VHlwZSwgdGhpcywgdHJ1ZSk7XG5cdH0pO1xuXG5cdHJldHVybiB3YXNSZW1vdmVkO1xufVxuXG5cbmZ1bmN0aW9uIHJlbW92ZUxpc3RlbmVyc0Zyb21FdmVudHMoZXZlbnRzTGlzdGVuZXJzLCB1c2VDYXB0dXJlKSB7XG5cdGNoZWNrKGV2ZW50c0xpc3RlbmVycywgTWF0Y2guT2JqZWN0KTtcblxuXHR2YXIgd2FzUmVtb3ZlZE1hcCA9IF8ubWFwS2V5cyhldmVudHNMaXN0ZW5lcnMsIGZ1bmN0aW9uKGxpc3RlbmVyLCBldmVudFR5cGVzKSB7XG5cdFx0cmV0dXJuIHRoaXMucmVtb3ZlTGlzdGVuZXIoZXZlbnRUeXBlcywgbGlzdGVuZXIsIHVzZUNhcHR1cmUpO1xuXHR9LCB0aGlzKTtcblxuXHRyZXR1cm4gd2FzUmVtb3ZlZE1hcDtcbn1cblxuXG5mdW5jdGlvbiB0cmlnZ2VyRXZlbnQoZXZlbnRUeXBlLCBwcm9wZXJ0aWVzKSB7XG5cdGNoZWNrKGV2ZW50VHlwZSwgU3RyaW5nKTtcblxuXHR2YXIgRXZlbnRDb25zdHJ1Y3RvciA9IGRvbUV2ZW50c0NvbnN0cnVjdG9yc1tldmVudFR5cGVdO1xuXG5cdGlmICh0eXBlb2YgZXZlbnRDb25zdHJ1Y3RvciAhPSAnZnVuY3Rpb24nKVxuXHRcdHRocm93IG5ldyBFcnJvcigndW5zdXBwb3J0ZWQgZXZlbnQgdHlwZScpO1xuXG5cdHZhciBkb21FdmVudCA9IEV2ZW50Q29uc3RydWN0b3IoZXZlbnRUeXBlLCBwcm9wZXJ0aWVzKTtcblx0Ly8gPz8/IHByb3BlcnRpZXMudHlwZSA9IGV2ZW50VHlwZTtcblx0Ly8gPz8/IEV2ZW50Q29uc3RydWN0b3IocHJvcGVydGllcyk7XG5cdHZhciBub3RDYW5jZWxsZWQgPSB0aGlzLmRvbSgpLmRpc3BhdGNoRXZlbnQoZG9tRXZlbnQpO1xuXG5cdHJldHVybiBub3RDYW5jZWxsZWQ7XG59XG5cblxuZnVuY3Rpb24gZ2V0TGlzdGVuZXJzKGV2ZW50VHlwZSwgdXNlQ2FwdHVyZSkge1xuXHRjaGVjayhldmVudFR5cGUsIFN0cmluZyk7XG5cblx0dmFyIGV2ZW50S2V5ID0gZXZlbnRUeXBlICsgKHVzZUNhcHR1cmUgPyB1c2VDYXB0dXJlU3VmZml4IDogJycpXG5cdFx0LCBldmVudExpc3RlbmVycyA9IHRoaXMuX2V2ZW50c0xpc3RlbmVyc1tldmVudEtleV07XG5cblx0cmV0dXJuIGV2ZW50TGlzdGVuZXJzICYmIGV2ZW50TGlzdGVuZXJzLmxlbmd0aFxuXHRcdFx0XHQgPyBbXS5jb25jYXQoZXZlbnRMaXN0ZW5lcnMpXG5cdFx0XHRcdCA6IHVuZGVmaW5lZDtcbn1cblxuXG5mdW5jdGlvbiBfaGFzRXZlbnRMaXN0ZW5lcnMoZXZlbnRUeXBlKSB7XG5cdHZhciBub3RDYXB0dXJlZEV2ZW50cyA9IHRoaXMuX2V2ZW50c0xpc3RlbmVyc1tldmVudFR5cGVdXG5cdFx0LCBjYXB0dXJlZEV2ZW50cyA9IHRoaXMuX2V2ZW50c0xpc3RlbmVyc1tldmVudFR5cGUgKyB1c2VDYXB0dXJlU3VmZml4XTtcblxuXHRyZXR1cm4gKG5vdENhcHR1cmVkRXZlbnRzICYmIG5vdENhcHR1cmVkRXZlbnRzLmxlbmd0aClcblx0XHQgICAgfHwgKGNhcHR1cmVkRXZlbnRzICYmIGNhcHR1cmVkRXZlbnRzLmxlbmd0aCk7XG59XG4iLCIndXNlIHN0cmljdCc7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBDbGFzc1JlZ2lzdHJ5ID0gcmVxdWlyZSgnLi4vLi4vcmVnaXN0cnknKVxuXHQsIENvbXBvbmVudEZhY2V0ID0gcmVxdWlyZSgnLi4vY19mYWNldCcpO1xuXG52YXIgZmFjZXRzUmVnaXN0cnkgPSBuZXcgQ2xhc3NSZWdpc3RyeShDb21wb25lbnRGYWNldCk7XG5cbmZhY2V0c1JlZ2lzdHJ5LmFkZChDb21wb25lbnRGYWNldCk7XG5cbm1vZHVsZS5leHBvcnRzID0gZmFjZXRzUmVnaXN0cnk7XG5cbi8vIFRPRE8gLSByZWZhY3RvciBjb21wb25lbnRzIHJlZ2lzdHJ5IHRlc3QgaW50byBhIGZ1bmN0aW9uXG4vLyB0aGF0IHRlc3RzIGEgcmVnaXN0cnkgd2l0aCBhIGdpdmVuIGZvdW5kYXRpb24gY2xhc3Ncbi8vIE1ha2UgdGVzdCBmb3IgdGhpcyByZWdpc3RyeSBiYXNlZCBvbiB0aGlzIGZ1bmN0aW9uIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ3Byb3RvJyk7XG5cblxuLy8gaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvUmVmZXJlbmNlL0V2ZW50c1xuXG52YXIgZXZlbnRUeXBlcyA9IHtcblx0Q2xpcGJvYXJkRXZlbnQ6IFsnY29weScsICdjdXQnLCAncGFzdGUnLCAnYmVmb3JlY29weScsICdiZWZvcmVjdXQnLCAnYmVmb3JlcGFzdGUnXSxcblx0RXZlbnQ6IFsnaW5wdXQnXSxcblx0Rm9jdXNFdmVudDogWydmb2N1cycsICdibHVyJywgJ2ZvY3VzaW4nLCAnZm9jdXNvdXQnXSxcblx0S2V5Ym9hcmRFdmVudDogWydrZXlkb3duJywgJ2tleXByZXNzJywgICdrZXl1cCddLFxuXHRNb3VzZUV2ZW50OiBbJ2NsaWNrJywgJ2NvbnRleHRtZW51JywgJ2RibGNsaWNrJywgJ21vdXNlZG93bicsICdtb3VzZXVwJyxcblx0XHRcdFx0ICdtb3VzZWVudGVyJywgJ21vdXNlbGVhdmUnLCAnbW91c2Vtb3ZlJywgJ21vdXNlb3V0JywgJ21vdXNlb3ZlcicsXG5cdFx0XHRcdCAnc2hvdycgLyogY29udGV4dCBtZW51ICovXSxcblx0VG91Y2hFdmVudDogWyd0b3VjaHN0YXJ0JywgJ3RvdWNoZW5kJywgJ3RvdWNobW92ZScsICd0b3VjaGVudGVyJywgJ3RvdWNobGVhdmUnLCAndG91Y2hjYW5jZWwnXSxcbn07XG5cblxuLy8gbW9jayB3aW5kb3cgYW5kIGV2ZW50IGNvbnN0cnVjdG9ycyBmb3IgdGVzdGluZ1xuaWYgKHR5cGVvZiB3aW5kb3cgIT0gJ3VuZGVmaW5lZCcpXG5cdHZhciBnbG9iYWwgPSB3aW5kb3c7XG5lbHNlIHtcblx0Z2xvYmFsID0ge307XG5cdF8uZWFjaEtleShldmVudFR5cGVzLCBmdW5jdGlvbihlVHlwZXMsIGV2ZW50Q29uc3RydWN0b3JOYW1lKSB7XG5cdFx0dmFyIGV2ZW50c0NvbnN0cnVjdG9yO1xuXHRcdGV2YWwoXG5cdFx0XHQnZXZlbnRzQ29uc3RydWN0b3IgPSBmdW5jdGlvbiAnICsgZXZlbnRDb25zdHJ1Y3Rvck5hbWUgKyAnKHR5cGUsIHByb3BlcnRpZXMpIHsgXFxcblx0XHRcdFx0dGhpcy50eXBlID0gdHlwZTsgXFxcblx0XHRcdFx0Xy5leHRlbmQodGhpcywgcHJvcGVydGllcyk7IFxcXG5cdFx0XHR9Oydcblx0XHQpO1xuXHRcdGdsb2JhbFtldmVudENvbnN0cnVjdG9yTmFtZV0gPSBldmVudHNDb25zdHJ1Y3Rvcjtcblx0fSk7XG59XG5cblxudmFyIGRvbUV2ZW50c0NvbnN0cnVjdG9ycyA9IHt9O1xuXG5fLmVhY2hLZXkoZXZlbnRUeXBlcywgZnVuY3Rpb24oZVR5cGVzLCBldmVudENvbnN0cnVjdG9yTmFtZSkge1xuXHRlVHlwZXMuZm9yRWFjaChmdW5jdGlvbih0eXBlKSB7XG5cdFx0aWYgKE9iamVjdC5oYXNPd25Qcm9wZXJ0eShkb21FdmVudHNDb25zdHJ1Y3RvcnMsIHR5cGUpKVxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdkdXBsaWNhdGUgZXZlbnQgdHlwZSAnICsgdHlwZSk7XG5cblx0XHRkb21FdmVudHNDb25zdHJ1Y3RvcnNbdHlwZV0gPSBnbG9iYWxbZXZlbnRDb25zdHJ1Y3Rvck5hbWVdO1xuXHR9KTtcbn0pO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gZG9tRXZlbnRzQ29uc3RydWN0b3JzO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ2xhc3NSZWdpc3RyeSA9IHJlcXVpcmUoJy4uL3JlZ2lzdHJ5Jylcblx0LCBDb21wb25lbnQgPSByZXF1aXJlKCcuL2NfY2xhc3MnKTtcblxudmFyIGNvbXBvbmVudHNSZWdpc3RyeSA9IG5ldyBDbGFzc1JlZ2lzdHJ5KENvbXBvbmVudCk7XG5cbmNvbXBvbmVudHNSZWdpc3RyeS5hZGQoQ29tcG9uZW50KTtcblxubW9kdWxlLmV4cG9ydHMgPSBjb21wb25lbnRzUmVnaXN0cnk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBDb21wb25lbnQgPSByZXF1aXJlKCcuLi9jX2NsYXNzJylcblx0LCBmYWNldHNSZWdpc3RyeSA9IHJlcXVpcmUoJy4uL2NfZmFjZXRzL2NmX3JlZ2lzdHJ5Jylcblx0LCBjb21wb25lbnRzUmVnaXN0cnkgPSByZXF1aXJlKCcuLi9jX3JlZ2lzdHJ5Jyk7XG5cblxudmFyIFZpZXcgPSBDb21wb25lbnQuY3JlYXRlQ29tcG9uZW50Q2xhc3MoJ1ZpZXcnLCB7XG5cdGNvbnRhaW5lcjogZmFjZXRzUmVnaXN0cnkuZ2V0KCdDb250YWluZXInKVxufSk7XG5cbmNvbXBvbmVudHNSZWdpc3RyeS5hZGQoVmlldyk7XG5cbm1vZHVsZS5leHBvcnRzID0gVmlldztcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCdwcm90bycpXG5cdCwgY2hlY2sgPSByZXF1aXJlKCcuLi9jaGVjaycpXG5cdCwgTWF0Y2ggPSBjaGVjay5NYXRjaDtcblxudmFyIG1lc3Nlbmdlck1peGluID0gIHtcblx0aW5pdE1lc3NlbmdlcjogaW5pdE1lc3Nlbmdlcixcblx0b25NZXNzYWdlOiByZWdpc3RlclN1YnNjcmliZXIsXG5cdG9mZk1lc3NhZ2U6IHJlbW92ZVN1YnNjcmliZXIsXG5cdG9uTWVzc2FnZXM6IHJlZ2lzdGVyU3Vic2NyaWJlcnMsXG5cdG9mZk1lc3NhZ2VzOiByZW1vdmVTdWJzY3JpYmVycyxcblx0cG9zdE1lc3NhZ2U6IHBvc3RNZXNzYWdlLFxuXHRnZXRNZXNzYWdlU3Vic2NyaWJlcnM6IGdldE1lc3NhZ2VTdWJzY3JpYmVycyxcblx0X2Nob29zZVN1YnNjcmliZXJzSGFzaDogX2Nob29zZVN1YnNjcmliZXJzSGFzaFxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBtZXNzZW5nZXJNaXhpbjtcblxuXG5mdW5jdGlvbiBpbml0TWVzc2VuZ2VyKCkge1xuXHR0aGlzLl9tZXNzYWdlU3Vic2NyaWJlcnMgPSB7fTtcblx0dGhpcy5fcGF0dGVybk1lc3NhZ2VTdWJzY3JpYmVycyA9IHt9O1xufVxuXG5cbmZ1bmN0aW9uIHJlZ2lzdGVyU3Vic2NyaWJlcihtZXNzYWdlLCBzdWJzY3JpYmVyKSB7XG5cdGNoZWNrKG1lc3NhZ2UsIE1hdGNoLk9uZU9mKFN0cmluZywgUmVnRXhwKSk7XG5cdGNoZWNrKHN1YnNjcmliZXIsIEZ1bmN0aW9uKTsgXG5cblx0dmFyIHN1YnNjcmliZXJzSGFzaCA9IHRoaXMuX2Nob29zZVN1YnNjcmliZXJzSGFzaChtZXNzYWdlKTtcblx0dmFyIG1zZ1N1YnNjcmliZXJzID0gc3Vic2NyaWJlcnNIYXNoW21lc3NhZ2VdID0gc3Vic2NyaWJlcnNIYXNoW21lc3NhZ2VdIHx8IFtdO1xuXHR2YXIgbm90WWV0UmVnaXN0ZXJlZCA9IG1zZ1N1YnNjcmliZXJzLmluZGV4T2Yoc3Vic2NyaWJlcikgPT0gLTE7XG5cblx0aWYgKG5vdFlldFJlZ2lzdGVyZWQpXG5cdFx0bXNnU3Vic2NyaWJlcnMucHVzaChzdWJzY3JpYmVyKTtcblxuXHRyZXR1cm4gbm90WWV0UmVnaXN0ZXJlZDtcbn1cblxuXG5mdW5jdGlvbiByZWdpc3RlclN1YnNjcmliZXJzKG1lc3NhZ2VTdWJzY3JpYmVycykge1xuXHRjaGVjayhtZXNzYWdlU3Vic2NyaWJlcnMsIE1hdGNoLk9iamVjdCk7XG5cblx0dmFyIG5vdFlldFJlZ2lzdGVyZWRNYXAgPSBfLm1hcEtleXMobWVzc2FnZVN1YnNjcmliZXJzLCBmdW5jdGlvbihzdWJzY3JpYmVyLCBtZXNzYWdlKSB7XG5cdFx0cmV0dXJuIHRoaXMucmVnaXN0ZXJTdWJzY3JpYmVyKG1lc3NhZ2UsIHN1YnNjcmliZXIpXG5cdH0sIHRoaXMpO1xuXG5cdHJldHVybiBub3RZZXRSZWdpc3RlcmVkTWFwO1xufVxuXG5cbi8vIHJlbW92ZXMgYWxsIHN1YnNjcmliZXJzIGZvciB0aGUgbWVzc2FnZSBpZiBzdWJzY3JpYmVyIGlzbid0IHN1cHBsaWVkXG5mdW5jdGlvbiByZW1vdmVTdWJzY3JpYmVyKG1lc3NhZ2UsIHN1YnNjcmliZXIpIHtcblx0Y2hlY2sobWVzc2FnZSwgTWF0Y2guT25lT2YoU3RyaW5nLCBSZWdFeHApKTtcblx0Y2hlY2soc3Vic2NyaWJlciwgTWF0Y2guT3B0aW9uYWwoRnVuY3Rpb24pKTsgXG5cblx0dmFyIHN1YnNjcmliZXJzSGFzaCA9IHRoaXMuX2Nob29zZVN1YnNjcmliZXJzSGFzaChtZXNzYWdlKTtcblx0dmFyIG1zZ1N1YnNjcmliZXJzID0gc3Vic2NyaWJlcnNIYXNoW21lc3NhZ2VdO1xuXHRpZiAoISBtc2dTdWJzY3JpYmVycyB8fCAhIG1zZ1N1YnNjcmliZXJzLmxlbmd0aCkgcmV0dXJuIGZhbHNlO1xuXG5cdGlmIChzdWJzY3JpYmVyKSB7XG5cdFx0c3Vic2NyaWJlckluZGV4ID0gbXNnU3Vic2NyaWJlcnMuaW5kZXhPZihzdWJzY3JpYmVyKTtcblx0XHRpZiAoc3Vic2NyaWJlckluZGV4ID09IC0xKSByZXR1cm4gZmFsc2U7XG5cdFx0bXNnU3Vic2NyaWJlcnMuc3BsaWNlKHN1YnNjcmliZXJJbmRleCwgMSk7XG5cdFx0aWYgKCEgbXNnU3Vic2NyaWJlcnMubGVuZ3RoKVxuXHRcdFx0ZGVsZXRlIHN1YnNjcmliZXJzSGFzaFttZXNzYWdlXTtcblx0fSBlbHNlXG5cdFx0ZGVsZXRlIHN1YnNjcmliZXJzSGFzaFttZXNzYWdlXTtcblxuXHRyZXR1cm4gdHJ1ZTsgLy8gc3Vic2NyaWJlcihzKSByZW1vdmVkXG59XG5cblxuZnVuY3Rpb24gcmVtb3ZlU3Vic2NyaWJlcnMobWVzc2FnZVN1YnNjcmliZXJzKSB7XG5cdGNoZWNrKG1lc3NhZ2VTdWJzY3JpYmVycywgTWF0Y2guT2JqZWN0KTtcblxuXHR2YXIgc3Vic2NyaWJlclJlbW92ZWRNYXAgPSBfLm1hcEtleXMobWVzc2FnZVN1YnNjcmliZXJzLCBmdW5jdGlvbihzdWJzY3JpYmVyLCBtZXNzYWdlKSB7XG5cdFx0cmV0dXJuIHRoaXMucmVnaXN0ZXJTdWJzY3JpYmVyKG1lc3NhZ2UsIHN1YnNjcmliZXIpXG5cdH0sIHRoaXMpO1xuXG5cdHJldHVybiBzdWJzY3JpYmVyUmVtb3ZlZE1hcDtcdFxufVxuXG5cbmZ1bmN0aW9uIHBvc3RNZXNzYWdlKG1lc3NhZ2UsIGRhdGEpIHtcblx0Y2hlY2sobWVzc2FnZSwgTWF0Y2guT25lT2YoU3RyaW5nLCBSZWdFeHApKTtcblxuXHR2YXIgc3Vic2NyaWJlcnNIYXNoID0gdGhpcy5fY2hvb3NlU3Vic2NyaWJlcnNIYXNoKG1lc3NhZ2UpO1xuXHR2YXIgbXNnU3Vic2NyaWJlcnMgPSBzdWJzY3JpYmVyc0hhc2hbbWVzc2FnZV07XG5cblx0Y2FsbFN1YnNjcmliZXJzKG1zZ1N1YnNjcmliZXJzKTtcblxuXHRpZiAobWVzc2FnZSBpbnN0YW5jZW9mIFN0cmluZykge1xuXHRcdF8uZWFjaEtleSh0aGlzLl9wYXR0ZXJuTWVzc2FnZVN1YnNjcmliZXJzLCBcblx0XHRcdGZ1bmN0aW9uKHBhdHRlcm5TdWJzY3JpYmVycywgcGF0dGVybikge1xuXHRcdFx0XHRpZiAocGF0dGVybi50ZXN0KG1lc3NhZ2UpKVxuXHRcdFx0XHRcdGNhbGxTdWJzY3JpYmVycyhwYXR0ZXJuU3Vic2NyaWJlcnMpO1xuXHRcdFx0fVxuXHRcdCk7XG5cdH1cblxuXHRmdW5jdGlvbiBjYWxsU3Vic2NyaWJlcnMobXNnU3Vic2NyaWJlcnMpIHtcblx0XHRtc2dTdWJzY3JpYmVycy5mb3JFYWNoKGZ1bmN0aW9uKHN1YnNjcmliZXIpIHtcblx0XHRcdHN1YnNjcmliZXIobWVzc2FnZSwgZGF0YSk7XG5cdFx0fSk7XG5cdH1cbn1cblxuXG5mdW5jdGlvbiBnZXRNZXNzYWdlU3Vic2NyaWJlcnMobWVzc2FnZSwgaW5jbHVkZVBhdHRlcm5TdWJzY3JpYmVycykge1xuXHRjaGVjayhtZXNzYWdlLCBNYXRjaC5PbmVPZihTdHJpbmcsIFJlZ0V4cCkpO1xuXG5cdHZhciBzdWJzY3JpYmVyc0hhc2ggPSB0aGlzLl9jaG9vc2VTdWJzY3JpYmVyc0hhc2gobWVzc2FnZSk7XG5cdHZhciBtc2dTdWJzY3JpYmVycyA9IG1zZ1N1YnNjcmliZXJzXG5cdFx0XHRcdFx0XHRcdD8gW10uY29uY2F0KHN1YnNjcmliZXJzSGFzaFttZXNzYWdlXSlcblx0XHRcdFx0XHRcdFx0OiBbXTtcblxuXHQvLyBwYXR0ZXJuIHN1YnNjcmliZXJzIGFyZSBpbmN1ZGVkIGJ5IGRlZmF1bHRcblx0aWYgKGluY2x1ZGVQYXR0ZXJuU3Vic2NyaWJlcnMgIT0gZmFsc2UgJiYgbWVzc2FnZSBpbnN0YW5jZW9mIFN0cmluZykge1xuXHRcdF8uZWFjaEtleSh0aGlzLl9wYXR0ZXJuTWVzc2FnZVN1YnNjcmliZXJzLCBcblx0XHRcdGZ1bmN0aW9uKHBhdHRlcm5TdWJzY3JpYmVycywgcGF0dGVybikge1xuXHRcdFx0XHRpZiAocGF0dGVyblN1YnNjcmliZXJzICYmIHBhdHRlcm5TdWJzY3JpYmVycy5sZW5ndGhcblx0XHRcdFx0XHRcdCYmIHBhdHRlcm4udGVzdChtZXNzYWdlKSlcblx0XHRcdFx0XHRfLmFwcGVuZEFycmF5KG1zZ1N1YnNjcmliZXJzLCBwYXR0ZXJuU3Vic2NyaWJlcnMpO1xuXHRcdFx0fVxuXHRcdCk7XG5cdH1cblxuXHRyZXR1cm4gbXNnU3Vic2NyaWJlcnMubGVuZ3RoXG5cdFx0XHRcdD8gbXNnU3Vic2NyaWJlcnNcblx0XHRcdFx0OiB1bmRlZmluZWQ7XG59XG5cblxuZnVuY3Rpb24gX2Nob29zZVN1YnNjcmliZXJzSGFzaChtZXNzYWdlKSB7XG5cdHJldHVybiBtZXNzYWdlIGluc3RhbmNlb2YgUmVnRXhwXG5cdFx0XHRcdD8gdGhpcy5fcGF0dGVybk1lc3NhZ2VTdWJzY3JpYmVyc1xuXHRcdFx0XHQ6IHRoaXMuX21lc3NhZ2VTdWJzY3JpYmVycztcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCdwcm90bycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEZhY2V0O1xuXG5mdW5jdGlvbiBGYWNldChvd25lciwgb3B0aW9ucykge1xuXHR0aGlzLm93bmVyID0gb3duZXI7XG5cdHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG5cdHRoaXMuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufVxuXG5fLmV4dGVuZFByb3RvKEZhY2V0LCB7XG5cdGluaXQ6IGZ1bmN0aW9uKCkge31cbn0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgRmFjZXQgPSByZXF1aXJlKCcuL2ZfY2xhc3MnKVxuXHQsIF8gPSByZXF1aXJlKCdwcm90bycpXG5cdCwgY2hlY2sgPSByZXF1aXJlKCcuLi9jaGVjaycpXG5cdCwgTWF0Y2ggPSBjaGVjay5NYXRjaDtcblxubW9kdWxlLmV4cG9ydHMgPSBGYWNldGVkT2JqZWN0O1xuXG4vLyBhYnN0cmFjdCBjbGFzcyBmb3IgZmFjZXRlZCBvYmplY3RcbmZ1bmN0aW9uIEZhY2V0ZWRPYmplY3QoZmFjZXRzT3B0aW9ucyAvKiwgb3RoZXIgYXJncyAtIHBhc3NlZCB0byBpbml0IG1ldGhvZCAqLykge1xuXHQvLyBUT0RPIGluc3RhbnRpYXRlIGZhY2V0cyBpZiBjb25maWd1cmF0aW9uIGlzbid0IHBhc3NlZFxuXHQvLyB3cml0ZSBhIHRlc3QgdG8gY2hlY2sgaXRcblx0ZmFjZXRzT3B0aW9ucyA9IGZhY2V0c09wdGlvbnMgPyBfLmNsb25lKGZhY2V0c09wdGlvbnMpIDoge307XG5cblx0dmFyIHRoaXNDbGFzcyA9IHRoaXMuY29uc3RydWN0b3Jcblx0XHQsIGZhY2V0cyA9IHt9O1xuXG5cdGlmICh0aGlzLmNvbnN0cnVjdG9yID09IEZhY2V0ZWRPYmplY3QpXHRcdFxuXHRcdHRocm93IG5ldyBFcnJvcignRmFjZXRlZE9iamVjdCBpcyBhbiBhYnN0cmFjdCBjbGFzcywgY2FuXFwndCBiZSBpbnN0YW50aWF0ZWQnKTtcblx0aWYgKCEgdGhpc0NsYXNzLnByb3RvdHlwZS5mYWNldHMpXG5cdFx0dGhyb3cgbmV3IEVycm9yKCdObyBmYWNldHMgZGVmaW5lZCBpbiBjbGFzcyAnICsgdGhpcy5jb25zdHJ1Y3Rvci5uYW1lKTtcblx0XG5cdC8vIF8uZWFjaEtleShmYWNldHNPcHRpb25zLCBpbnN0YW50aWF0ZUZhY2V0LCB0aGlzLCB0cnVlKTtcblxuXHRfLmVhY2hLZXkodGhpcy5mYWNldHMsIGluc3RhbnRpYXRlRmFjZXQsIHRoaXMsIHRydWUpO1xuXG5cdHZhciB1bnVzZWRGYWNldHNOYW1lcyA9IE9iamVjdC5rZXlzKGZhY2V0c09wdGlvbnMpO1xuXHRpZiAodW51c2VkRmFjZXRzTmFtZXMubGVuZ3RoKVxuXHRcdHRocm93IG5ldyBFcnJvcignQ29uZmlndXJhdGlvbiBmb3IgdW5rbm93biBmYWNldChzKSBwYXNzZWQ6ICcgKyB1bnVzZWRGYWNldHNOYW1lcy5qb2luKCcsICcpKTtcblxuXHRPYmplY3QuZGVmaW5lUHJvcGVydGllcyh0aGlzLCBmYWNldHMpO1xuXG5cdC8vIGNhbGxpbmcgaW5pdCBpZiBpdCBpcyBkZWZpbmVkIGluIHRoZSBjbGFzc1xuXHRpZiAodGhpcy5pbml0KVxuXHRcdHRoaXMuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG5cdGZ1bmN0aW9uIGluc3RhbnRpYXRlRmFjZXQoLyogZmFjZXRPcHRzICovIGZhY2V0Q2xhc3MsIGZjdCkge1xuXHRcdC8vIHZhciBmYWNldENsYXNzID0gdGhpcy5mYWNldHNbZmN0XTtcblx0XHR2YXIgZmFjZXRPcHRzID0gZmFjZXRzT3B0aW9uc1tmY3RdO1xuXHRcdGRlbGV0ZSBmYWNldHNPcHRpb25zW2ZjdF07XG5cblx0XHRmYWNldHNbZmN0XSA9IHtcblx0XHRcdGVudW1lcmFibGU6IGZhbHNlLFxuXHRcdFx0dmFsdWU6IG5ldyBmYWNldENsYXNzKHRoaXMsIGZhY2V0T3B0cylcblx0XHR9O1xuXHR9XG59XG5cblxuLy8gZmFjdG9yeSB0aGF0IGNyZWF0ZXMgY2xhc3NlcyAoY29uc3RydWN0b3JzKSBmcm9tIHRoZSBtYXAgb2YgZmFjZXRzXG4vLyB0aGVzZSBjbGFzc2VzIGluaGVyaXQgZnJvbSBGYWNldGVkT2JqZWN0XG5GYWNldGVkT2JqZWN0LmNyZWF0ZUZhY2V0ZWRDbGFzcyA9IGZ1bmN0aW9uIChuYW1lLCBmYWNldHNDbGFzc2VzKSB7XG5cdGNoZWNrKG5hbWUsIFN0cmluZyk7XG5cdGNoZWNrKGZhY2V0c0NsYXNzZXMsIE1hdGNoLk9iamVjdEhhc2goRnVuY3Rpb24gLyogTWF0Y2guU3ViY2xhc3MoRmFjZXQsIHRydWUpIFRPRE8gLSBmaXggKi8pKTtcblxuXHR2YXIgRmFjZXRlZENsYXNzID0gXy5jcmVhdGVTdWJjbGFzcyh0aGlzLCBuYW1lLCB0cnVlKTtcblxuXHRfLmV4dGVuZFByb3RvKEZhY2V0ZWRDbGFzcywge1xuXHRcdGZhY2V0czogZmFjZXRzQ2xhc3Nlc1xuXHR9KTtcblx0cmV0dXJuIEZhY2V0ZWRDbGFzcztcbn07XG5cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIG1pbG8gPSB7XG5cdGJpbmRlcjogcmVxdWlyZSgnLi9iaW5kZXIvYmluZGVyJylcbn1cblxuXG4vLyB1c2VkIGZhY2V0c1xucmVxdWlyZSgnLi9jb21wb25lbnRzL2NfZmFjZXRzL0NvbnRhaW5lcicpO1xucmVxdWlyZSgnLi9jb21wb25lbnRzL2NfZmFjZXRzL0V2ZW50cycpO1xucmVxdWlyZSgnLi9jb21wb25lbnRzL2NfZmFjZXRzL01vZGVsJyk7XG5cbi8vIHVzZWQgY29tcG9uZW50c1xucmVxdWlyZSgnLi9jb21wb25lbnRzL2NsYXNzZXMvVmlldycpO1xuXG5cbmlmICh0eXBlb2YgbW9kdWxlID09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKVxuXHQvLyBleHBvcnQgZm9yIG5vZGUvYnJvd3NlcmlmeVxuXHRtb2R1bGUuZXhwb3J0cyA9IG1pbG87XG5cbmlmICh0eXBlb2Ygd2luZG93ID09ICdvYmplY3QnKVxuXHR3aW5kb3cubWlsbyA9IG1pbG87XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgncHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi9jaGVjaycpXG5cdCwgTWF0Y2ggPSBjaGVjay5NYXRjaDtcblxubW9kdWxlLmV4cG9ydHMgPSBDbGFzc1JlZ2lzdHJ5O1xuXG5mdW5jdGlvbiBDbGFzc1JlZ2lzdHJ5IChGb3VuZGF0aW9uQ2xhc3MpIHtcblx0aWYgKEZvdW5kYXRpb25DbGFzcylcblx0XHR0aGlzLnNldENsYXNzKEZvdW5kYXRpb25DbGFzcyk7XG5cblx0Ly8gT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdfX3JlZ2lzdGVyZWRDbGFzc2VzJywge1xuXHQvLyBcdFx0ZW51bWVyYWJsZTogZmFsc2UsXG5cdC8vIFx0XHR3cml0YWJsZTogdHJ1ZSxcblx0Ly8gXHRcdGNvbmZpZ3VyYWJsZTogdHJ1ZSxcblx0Ly8gXHRcdHZhbHVlOiB7fVxuXHQvLyB9KTtcblxuXHR0aGlzLl9fcmVnaXN0ZXJlZENsYXNzZXMgPSB7fTtcbn1cblxuXy5leHRlbmRQcm90byhDbGFzc1JlZ2lzdHJ5LCB7XG5cdGFkZDogcmVnaXN0ZXJDbGFzcyxcblx0Z2V0OiBnZXRDbGFzcyxcblx0cmVtb3ZlOiB1bnJlZ2lzdGVyQ2xhc3MsXG5cdGNsZWFuOiB1bnJlZ2lzdGVyQWxsQ2xhc3Nlcyxcblx0c2V0Q2xhc3M6IHNldEZvdW5kYXRpb25DbGFzc1xufSk7XG5cblxuZnVuY3Rpb24gc2V0Rm91bmRhdGlvbkNsYXNzKEZvdW5kYXRpb25DbGFzcykge1xuXHRjaGVjayhGb3VuZGF0aW9uQ2xhc3MsIEZ1bmN0aW9uKTtcblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdGb3VuZGF0aW9uQ2xhc3MnLCB7XG5cdFx0ZW51bWVyYWJsZTogdHJ1ZSxcblx0XHR2YWx1ZTogRm91bmRhdGlvbkNsYXNzXG5cdH0pO1xufVxuXG5mdW5jdGlvbiByZWdpc3RlckNsYXNzKGFDbGFzcywgbmFtZSkge1xuXHRuYW1lID0gbmFtZSB8fCBhQ2xhc3MubmFtZTtcblxuXHRjaGVjayhuYW1lLCBTdHJpbmcsICdjbGFzcyBuYW1lIG11c3QgYmUgc3RyaW5nJyk7XG5cdGNoZWNrKG5hbWUsIE1hdGNoLldoZXJlKGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiB0eXBlb2YgbmFtZSA9PSAnc3RyaW5nJyAmJiBuYW1lICE9ICcnO1xuXHR9KSwgJ2NsYXNzIG5hbWUgbXVzdCBiZSBzdHJpbmcnKTtcblx0aWYgKHRoaXMuRm91bmRhdGlvbkNsYXNzKSB7XG5cdFx0aWYgKGFDbGFzcyAhPSB0aGlzLkZvdW5kYXRpb25DbGFzcylcblx0XHRcdGNoZWNrKGFDbGFzcywgTWF0Y2guU3ViY2xhc3ModGhpcy5Gb3VuZGF0aW9uQ2xhc3MpLCAnY2xhc3MgbXVzdCBiZSBhIHN1YihjbGFzcykgb2YgYSBmb3VuZGF0aW9uIGNsYXNzJyk7XG5cdH0gZWxzZVxuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ2ZvdW5kYXRpb24gY2xhc3MgbXVzdCBiZSBzZXQgYmVmb3JlIGFkZGluZyBjbGFzc2VzIHRvIHJlZ2lzdHJ5Jyk7XG5cblx0aWYgKHRoaXMuX19yZWdpc3RlcmVkQ2xhc3Nlc1tuYW1lXSlcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdpcyBhbHJlYWR5IHJlZ2lzdGVyZWQnKTtcblxuXHR0aGlzLl9fcmVnaXN0ZXJlZENsYXNzZXNbbmFtZV0gPSBhQ2xhc3M7XG59O1xuXG5cbmZ1bmN0aW9uIGdldENsYXNzKG5hbWUpIHtcblx0Y2hlY2sobmFtZSwgU3RyaW5nLCAnY2xhc3MgbmFtZSBtdXN0IGJlIHN0cmluZycpO1xuXHRyZXR1cm4gdGhpcy5fX3JlZ2lzdGVyZWRDbGFzc2VzW25hbWVdO1xufTtcblxuXG5mdW5jdGlvbiB1bnJlZ2lzdGVyQ2xhc3MobmFtZU9yQ2xhc3MpIHtcblx0Y2hlY2sobmFtZU9yQ2xhc3MsIE1hdGNoLk9uZU9mKFN0cmluZywgRnVuY3Rpb24pLCAnY2xhc3Mgb3IgbmFtZSBtdXN0IGJlIHN1cHBsaWVkJyk7XG5cblx0dmFyIG5hbWUgPSB0eXBlb2YgbmFtZU9yQ2xhc3MgPT0gJ3N0cmluZydcblx0XHRcdFx0XHRcdD8gbmFtZU9yQ2xhc3Ncblx0XHRcdFx0XHRcdDogbmFtZU9yQ2xhc3MubmFtZTtcblx0XHRcdFx0XHRcdFxuXHRpZiAoISB0aGlzLl9fcmVnaXN0ZXJlZENsYXNzZXNbbmFtZV0pXG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignY2xhc3MgaXMgbm90IHJlZ2lzdGVyZWQnKTtcblxuXHRkZWxldGUgdGhpcy5fX3JlZ2lzdGVyZWRDbGFzc2VzW25hbWVdO1xufTtcblxuXG5mdW5jdGlvbiB1bnJlZ2lzdGVyQWxsQ2xhc3NlcygpIHtcblx0dGhpcy5fX3JlZ2lzdGVyZWRDbGFzc2VzID0ge307XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXztcbnZhciBwcm90byA9IF8gPSB7XG5cdGV4dGVuZFByb3RvOiBleHRlbmRQcm90byxcblx0ZXh0ZW5kOiBleHRlbmQsXG5cdGNsb25lOiBjbG9uZSxcblx0Y3JlYXRlU3ViY2xhc3M6IGNyZWF0ZVN1YmNsYXNzLFxuXHRtYWtlU3ViY2xhc3M6IG1ha2VTdWJjbGFzcyxcblx0YWxsS2V5czogT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMuYmluZChPYmplY3QpLFxuXHRrZXlPZjoga2V5T2YsXG5cdGFsbEtleXNPZjogYWxsS2V5c09mLFxuXHRlYWNoS2V5OiBlYWNoS2V5LFxuXHRtYXBLZXlzOiBtYXBLZXlzLFxuXHRhcHBlbmRBcnJheTogYXBwZW5kQXJyYXksXG5cdHByZXBlbmRBcnJheTogcHJlcGVuZEFycmF5XG59O1xuXG5cbmlmICh0eXBlb2Ygd2luZG93ID09ICdvYmplY3QnKSB7XG5cdC8vIHByZXNlcnZlIGV4aXN0aW5nIF8gb2JqZWN0XG5cdGlmICh3aW5kb3cuXylcblx0XHRwcm90by51bmRlcnNjb3JlID0gd2luZG93Ll9cblxuXHQvLyBleHBvc2UgZ2xvYmFsIF9cblx0d2luZG93Ll8gPSBwcm90bztcbn1cblxuaWYgKHR5cGVvZiBtb2R1bGUgPT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpXG5cdC8vIGV4cG9ydCBmb3Igbm9kZS9icm93c2VyaWZ5XG5cdG1vZHVsZS5leHBvcnRzID0gcHJvdG87XG5cdFxuXG5mdW5jdGlvbiBleHRlbmRQcm90byhzZWxmLCBtZXRob2RzKSB7XG5cdHZhciBwcm9wRGVzY3JpcHRvcnMgPSB7fTtcblxuXHRfLmVhY2hLZXkobWV0aG9kcywgZnVuY3Rpb24obWV0aG9kLCBuYW1lKSB7XG5cdFx0cHJvcERlc2NyaXB0b3JzW25hbWVdID0ge1xuXHRcdFx0ZW51bWVyYWJsZTogZmFsc2UsXG5cdFx0XHRjb25maWd1cmFibGU6IGZhbHNlLFxuXHRcdFx0d3JpdGFibGU6IGZhbHNlLFxuXHRcdFx0dmFsdWU6IG1ldGhvZFxuXHRcdH07XG5cdH0pO1xuXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHNlbGYucHJvdG90eXBlLCBwcm9wRGVzY3JpcHRvcnMpO1xuXHRyZXR1cm4gc2VsZjtcbn1cblxuXG5mdW5jdGlvbiBleHRlbmQoc2VsZiwgb2JqLCBvbmx5RW51bWVyYWJsZSkge1xuXHR2YXIgcHJvcERlc2NyaXB0b3JzID0ge307XG5cblx0Xy5lYWNoS2V5KG9iaiwgZnVuY3Rpb24odmFsdWUsIHByb3ApIHtcblx0XHR2YXIgZGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Iob2JqLCBwcm9wKTtcblx0XHRwcm9wRGVzY3JpcHRvcnNbcHJvcF0gPSBkZXNjcmlwdG9yO1xuXHR9LCB0aGlzLCBvbmx5RW51bWVyYWJsZSk7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnRpZXMoc2VsZiwgcHJvcERlc2NyaXB0b3JzKTtcblxuXHRyZXR1cm4gc2VsZjtcbn1cblxuXG5mdW5jdGlvbiBjbG9uZShvYmopIHtcblx0dmFyIGNsb25lZE9iamVjdCA9IE9iamVjdC5jcmVhdGUob2JqLmNvbnN0cnVjdG9yLnByb3RvdHlwZSk7XG5cdF8uZXh0ZW5kKGNsb25lZE9iamVjdCwgb2JqKTtcblx0cmV0dXJuIGNsb25lZE9iamVjdDtcbn1cblxuXG5mdW5jdGlvbiBjcmVhdGVTdWJjbGFzcyh0aGlzQ2xhc3MsIG5hbWUsIGFwcGx5Q29uc3RydWN0b3IpIHtcblx0dmFyIHN1YmNsYXNzO1xuXG5cdC8vIG5hbWUgaXMgb3B0aW9uYWxcblx0bmFtZSA9IG5hbWUgfHwgJyc7XG5cblx0Ly8gYXBwbHkgc3VwZXJjbGFzcyBjb25zdHJ1Y3RvclxuXHR2YXIgY29uc3RydWN0b3JDb2RlID0gYXBwbHlDb25zdHJ1Y3RvciA9PT0gZmFsc2Vcblx0XHRcdD8gJydcblx0XHRcdDogJ3RoaXNDbGFzcy5hcHBseSh0aGlzLCBhcmd1bWVudHMpOyc7XG5cblx0ZXZhbCgnc3ViY2xhc3MgPSBmdW5jdGlvbiAnICsgbmFtZSArICcoKXsgJyArIGNvbnN0cnVjdG9yQ29kZSArICcgfScpO1xuXG5cdC8vIHBwcm90b3R5cGUgY2hhaW5cblx0c3ViY2xhc3MucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSh0aGlzQ2xhc3MucHJvdG90eXBlKTtcblx0Ly8gc3ViY2xhc3MgaWRlbnRpdHlcblx0c3ViY2xhc3MucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gc3ViY2xhc3M7XG5cdC8vIGNvcHkgY2xhc3MgbWV0aG9kc1xuXHQvLyAtIGZvciB0aGVtIHRvIHdvcmsgY29ycmVjdGx5IHRoZXkgc2hvdWxkIG5vdCBleHBsaWN0bHkgdXNlIHN1cGVyY2xhc3MgbmFtZVxuXHQvLyBhbmQgdXNlIFwidGhpc1wiIGluc3RlYWRcblx0Xy5leHRlbmQoc3ViY2xhc3MsIHRoaXNDbGFzcywgdHJ1ZSk7XG5cblx0cmV0dXJuIHN1YmNsYXNzO1xufVxuXG5cbmZ1bmN0aW9uIG1ha2VTdWJjbGFzcyh0aGlzQ2xhc3MsIFN1cGVyY2xhc3MpIHtcblx0dGhpc0NsYXNzLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoU3VwZXJjbGFzcy5wcm90b3R5cGUpO1xuXHR0aGlzQ2xhc3MucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gdGhpc0NsYXNzO1xuXHRyZXR1cm4gdGhpc0NsYXNzO1xufVxuXG5cbmZ1bmN0aW9uIGtleU9mKHNlbGYsIHNlYXJjaEVsZW1lbnQsIG9ubHlFbnVtZXJhYmxlKSB7XG5cdHZhciBwcm9wZXJ0aWVzID0gb25seUVudW1lcmFibGUgXG5cdFx0XHRcdFx0XHQ/IE9iamVjdC5rZXlzKHNlbGYpXG5cdFx0XHRcdFx0XHQ6IF8uYWxsS2V5cyhzZWxmKTtcblxuXHRmb3IgKHZhciBpID0gMDsgaSA8IHByb3BlcnRpZXMubGVuZ3RoOyBpKyspXG5cdFx0aWYgKHNlYXJjaEVsZW1lbnQgPT09IHNlbGZbcHJvcGVydGllc1tpXV0pXG5cdFx0XHRyZXR1cm4gcHJvcGVydGllc1tpXTtcblx0XG5cdHJldHVybiB1bmRlZmluZWQ7XG59XG5cblxuZnVuY3Rpb24gYWxsS2V5c09mKHNlbGYsIHNlYXJjaEVsZW1lbnQsIG9ubHlFbnVtZXJhYmxlKSB7XG5cdHZhciBwcm9wZXJ0aWVzID0gb25seUVudW1lcmFibGUgXG5cdFx0XHRcdFx0XHQ/IE9iamVjdC5rZXlzKHNlbGYpXG5cdFx0XHRcdFx0XHQ6IF8uYWxsS2V5cyhzZWxmKTtcblxuXHR2YXIga2V5cyA9IHByb3BlcnRpZXMuZmlsdGVyKGZ1bmN0aW9uKHByb3ApIHtcblx0XHRyZXR1cm4gc2VhcmNoRWxlbWVudCA9PT0gc2VsZltwcm9wXTtcblx0fSk7XG5cblx0cmV0dXJuIGtleXM7XG59XG5cblxuZnVuY3Rpb24gZWFjaEtleShzZWxmLCBjYWxsYmFjaywgdGhpc0FyZywgb25seUVudW1lcmFibGUpIHtcblx0dmFyIHByb3BlcnRpZXMgPSBvbmx5RW51bWVyYWJsZSBcblx0XHRcdFx0XHRcdD8gT2JqZWN0LmtleXMoc2VsZilcblx0XHRcdFx0XHRcdDogXy5hbGxLZXlzKHNlbGYpO1xuXG5cdHByb3BlcnRpZXMuZm9yRWFjaChmdW5jdGlvbihwcm9wKSB7XG5cdFx0Y2FsbGJhY2suY2FsbCh0aGlzQXJnLCBzZWxmW3Byb3BdLCBwcm9wLCBzZWxmKTtcblx0fSk7XG59XG5cblxuZnVuY3Rpb24gbWFwS2V5cyhzZWxmLCBjYWxsYmFjaywgdGhpc0FyZywgb25seUVudW1lcmFibGUpIHtcblx0dmFyIG1hcFJlc3VsdCA9IHt9O1xuXHRfLmVhY2hLZXkoc2VsZiwgbWFwUHJvcGVydHksIHRoaXNBcmcsIG9ubHlFbnVtZXJhYmxlKTtcblx0cmV0dXJuIG1hcFJlc3VsdDtcblxuXHRmdW5jdGlvbiBtYXBQcm9wZXJ0eSh2YWx1ZSwga2V5KSB7XG5cdFx0dmFyIGRlc2NyaXB0b3IgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHNlbGYsIGtleSk7XG5cdFx0aWYgKGRlc2NyaXB0b3IuZW51bWVyYWJsZSB8fCAhIG9ubHlFbnVtZXJhYmxlKSB7XG5cdFx0XHRkZXNjcmlwdG9yLnZhbHVlID0gY2FsbGJhY2suY2FsbCh0aGlzLCB2YWx1ZSwga2V5LCBzZWxmKTtcblx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShtYXBSZXN1bHQsIGtleSwgZGVzY3JpcHRvcik7XG5cdFx0fVxuXHR9XG59XG5cblxuZnVuY3Rpb24gYXBwZW5kQXJyYXkoc2VsZiwgYXJyVG9BcHBlbmQpIHtcblx0aWYgKCEgYXJyVG9BcHBlbmQubGVuZ3RoKSByZXR1cm4gc2VsZjtcblxuICAgIHZhciBhcmdzID0gW3NlbGYubGVuZ3RoLCAwXS5jb25jYXQoYXJyVG9BcHBlbmQpO1xuICAgIEFycmF5LnByb3RvdHlwZS5zcGxpY2UuYXBwbHkoc2VsZiwgYXJncyk7XG5cbiAgICByZXR1cm4gc2VsZjtcbn1cblxuXG5mdW5jdGlvbiBwcmVwZW5kQXJyYXkoc2VsZiwgYXJyVG9QcmVwZW5kKSB7XG5cdGlmICghIGFyclRvUHJlcGVuZC5sZW5ndGgpIHJldHVybiBzZWxmO1xuXG4gICAgdmFyIGFyZ3MgPSBbMCwgMF0uY29uY2F0KGFyclRvUHJlcGVuZCk7XG4gICAgQXJyYXkucHJvdG90eXBlLnNwbGljZS5hcHBseShzZWxmLCBhcmdzKTtcblxuICAgIHJldHVybiBzZWxmO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5kZXNjcmliZSgnbWlsbyBiaW5kZXInLCBmdW5jdGlvbigpIHtcbiAgICBpdCgnc2hvdWxkIGJpbmQgY29tcG9uZW50cyBiYXNlZCBvbiBtbC1iaW5kIGF0dHJpYnV0ZScsIGZ1bmN0aW9uKCkge1xuICAgIFx0dmFyIG1pbG8gPSByZXF1aXJlKCcuLi8uLi9saWIvbWlsbycpO1xuXG5cdFx0ZXhwZWN0KHtwOiAxfSkucHJvcGVydHkoJ3AnLCAxKTtcblxuICAgIFx0dmFyIGNvbXBvbmVudHMgPSBtaWxvLmJpbmRlcihkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndmlld1RvQmluZCcpKTtcbiAgICBcdFxuXHRcdGNvbnNvbGUubG9nKGNvbXBvbmVudHMpO1xuICAgIH0pO1xufSk7XG4iXX0=
;