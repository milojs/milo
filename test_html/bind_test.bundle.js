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

},{"../check":4,"./error":3,"proto":20}],2:[function(require,module,exports){
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

},{"../check":4,"../components/c_registry":12,"./attribute":1,"./error":3,"proto":20}],3:[function(require,module,exports){
'use strict';

var _ = require('proto');

function BindError(msg) {
	this.message = msg;
}

_.makeSubclass(BindError, Error);

module.exports = BindError;

},{"proto":20}],4:[function(require,module,exports){
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


},{"proto":20}],5:[function(require,module,exports){
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

},{"../facets/f_object":17,"./messenger":15,"proto":20}],6:[function(require,module,exports){
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

},{"../facets/f_class":16,"./messenger":15,"proto":20}],7:[function(require,module,exports){
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

},{"../../binder/binder":2,"../c_facet":6,"./cf_registry":10,"proto":20}],8:[function(require,module,exports){
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

},{"../c_facet":6,"../messenger":15,"./cf_registry":10,"./dom_events":11,"proto":20}],9:[function(require,module,exports){
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
},{"../../registry":19,"../c_facet":6}],11:[function(require,module,exports){
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

},{"proto":20}],12:[function(require,module,exports){
'use strict';

var ClassRegistry = require('../registry')
	, Component = require('./c_class');

var componentsRegistry = new ClassRegistry(Component);

componentsRegistry.add(Component);

module.exports = componentsRegistry;

},{"../registry":19,"./c_class":5}],13:[function(require,module,exports){
module.exports=require(9)
},{}],14:[function(require,module,exports){
'use strict';

var Component = require('../c_class')
	, facetsRegistry = require('../c_facets/cf_registry')
	, componentsRegistry = require('../c_registry');


var View = Component.createComponentClass('View', {
	container: facetsRegistry.get('Container')
});

componentsRegistry.add(View);

module.exports = View;

},{"../c_class":5,"../c_facets/cf_registry":10,"../c_registry":12}],15:[function(require,module,exports){
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

},{"../check":4,"proto":20}],16:[function(require,module,exports){
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

},{"proto":20}],17:[function(require,module,exports){
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


},{"../check":4,"./f_class":16,"proto":20}],18:[function(require,module,exports){
'use strict';

var milo = {
	binder: require('./binder/binder')
}


// used facets
require('./components/c_facets/Container');
require('./components/c_facets/Events');
require('./components/c_facets/Model');

// used components
require('./components/classes/Element');
require('./components/classes/View');


if (typeof module == 'object' && module.exports)
	// export for node/browserify
	module.exports = milo;

if (typeof window == 'object')
	window.milo = milo;

},{"./binder/binder":2,"./components/c_facets/Container":7,"./components/c_facets/Events":8,"./components/c_facets/Model":9,"./components/classes/Element":13,"./components/classes/View":14}],19:[function(require,module,exports){
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

},{"./check":4,"proto":20}],20:[function(require,module,exports){
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

},{}],21:[function(require,module,exports){
'use strict';

describe('milo binder', function() {
    it('should bind components based on ml-bind attribute', function() {
    	var milo = require('../../lib/milo');

		expect({p: 1}).property('p', 1);

    	var components = milo.binder(document.getElementById('viewToBind'));
    	
		console.log(components);
    });
});

},{"../../lib/milo":18}]},{},[21])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2JpbmRlci9hdHRyaWJ1dGUuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2JpbmRlci9iaW5kZXIuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2JpbmRlci9lcnJvci5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY2hlY2suanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19jbGFzcy5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX2ZhY2V0LmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfZmFjZXRzL0NvbnRhaW5lci5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX2ZhY2V0cy9FdmVudHMuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19mYWNldHMvTW9kZWwuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19mYWNldHMvY2ZfcmVnaXN0cnkuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19mYWNldHMvZG9tX2V2ZW50cy5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX3JlZ2lzdHJ5LmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NsYXNzZXMvVmlldy5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9tZXNzZW5nZXIuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2ZhY2V0cy9mX2NsYXNzLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9mYWNldHMvZl9vYmplY3QuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL21pbG8uanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL3JlZ2lzdHJ5LmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL25vZGVfbW9kdWxlcy9wcm90by9saWIvcHJvdG8uanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vdGVzdF9odG1sL2JpbmRfdGVzdC9iaW5kX3Rlc3QuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0xBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ3Byb3RvJylcblx0LCBjaGVjayA9IHJlcXVpcmUoJy4uL2NoZWNrJylcblx0LCBNYXRjaCA9IGNoZWNrLk1hdGNoXG5cdCwgQmluZEVycm9yID0gcmVxdWlyZSgnLi9lcnJvcicpO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gQXR0cmlidXRlO1xuXG5mdW5jdGlvbiBBdHRyaWJ1dGUoZWwsIG5hbWUpIHtcblx0dGhpcy5uYW1lID0gbmFtZTtcblx0dGhpcy5lbCA9IGVsO1xuXHR0aGlzLm5vZGUgPSBlbC5hdHRyaWJ1dGVzW25hbWVdO1xufVxuXG5fLmV4dGVuZFByb3RvKEF0dHJpYnV0ZSwge1xuXHRnZXQ6IGdldEF0dHJpYnV0ZVZhbHVlLFxuXHRzZXQ6IHNldEF0dHJpYnV0ZVZhbHVlLFxuXHRwYXJzZTogcGFyc2VBdHRyaWJ1dGUsXG5cdHZhbGlkYXRlOiB2YWxpZGF0ZUF0dHJpYnV0ZVxufSk7XG5cblxuZnVuY3Rpb24gZ2V0QXR0cmlidXRlVmFsdWUoKSB7XG5cdHJldHVybiB0aGlzLmVsLmdldEF0dHJpYnV0ZSh0aGlzLm5hbWUpO1xufVxuXG5mdW5jdGlvbiBzZXRBdHRyaWJ1dGVWYWx1ZSh2YWx1ZSkge1xuXHR0aGlzLmVsLnNldEF0dHJpYnV0ZSh0aGlzLm5hbWUsIHZhbHVlKTtcbn1cblxuZnVuY3Rpb24gcGFyc2VBdHRyaWJ1dGUoKSB7XG5cdGlmICghIHRoaXMubm9kZSkgcmV0dXJuO1xuXG5cdHZhciB2YWx1ZSA9IHRoaXMuZ2V0KCk7XG5cblx0aWYgKHZhbHVlKVxuXHRcdHZhciBiaW5kVG8gPSB2YWx1ZS5zcGxpdCgnOicpO1xuXG5cdHN3aXRjaCAoYmluZFRvICYmIGJpbmRUby5sZW5ndGgpIHtcblx0XHRjYXNlIDE6XG5cdFx0XHR0aGlzLmNvbXBOYW1lID0gYmluZFRvWzBdO1xuXHRcdFx0dGhpcy5jb21wQ2xhc3MgPSAnQ29tcG9uZW50Jztcblx0XHRcdHJldHVybiB0aGlzO1xuXG5cdFx0Y2FzZSAyOlxuXHRcdFx0dGhpcy5jb21wTmFtZSA9IGJpbmRUb1sxXTtcblx0XHRcdHRoaXMuY29tcENsYXNzID0gYmluZFRvWzBdO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cblx0XHRkZWZhdWx0OlxuXHRcdFx0dGhyb3cgbmV3IEJpbmRFcnJvcignaW52YWxpZCBiaW5kIGF0dHJpYnV0ZSAnICsgdmFsdWUpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHZhbGlkYXRlQXR0cmlidXRlKCkge1xuXHR2YXIgY29tcE5hbWUgPSB0aGlzLmNvbXBOYW1lO1xuXHRjaGVjayhjb21wTmFtZSwgTWF0Y2guV2hlcmUoZnVuY3Rpb24oKSB7XG4gIFx0XHRyZXR1cm4gdHlwZW9mIGNvbXBOYW1lID09ICdzdHJpbmcnICYmIGNvbXBOYW1lICE9ICcnO1xuXHR9KSwgJ2VtcHR5IGNvbXBvbmVudCBuYW1lJyk7XG5cblx0aWYgKCEgdGhpcy5jb21wQ2xhc3MpXG5cdFx0dGhyb3cgbmV3IEJpbmRFcnJvcignZW1wdHkgY29tcG9uZW50IGNsYXNzIG5hbWUgJyArIHRoaXMuY29tcENsYXNzKTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGNvbXBvbmVudHNSZWdpc3RyeSA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudHMvY19yZWdpc3RyeScpXG5cdCwgQ29tcG9uZW50ID0gY29tcG9uZW50c1JlZ2lzdHJ5LmdldCgnQ29tcG9uZW50Jylcblx0LCBBdHRyaWJ1dGUgPSByZXF1aXJlKCcuL2F0dHJpYnV0ZScpXG5cdCwgQmluZEVycm9yID0gcmVxdWlyZSgnLi9lcnJvcicpXG5cdCwgXyA9IHJlcXVpcmUoJ3Byb3RvJylcblx0LCBjaGVjayA9IHJlcXVpcmUoJy4uL2NoZWNrJylcblx0LCBNYXRjaCA9ICBjaGVjay5NYXRjaDtcblxuXG52YXIgb3B0cyA9IHtcblx0QklORF9BVFRSOiAnbWwtYmluZCdcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBiaW5kZXI7XG5cbmZ1bmN0aW9uIGJpbmRlcihzY29wZUVsLCBiaW5kU2NvcGVFbCkge1xuXHR2YXIgc2NvcGVFbCA9IHNjb3BlRWwgLy8gfHwgZG9jdW1lbnQuYm9keVxuXHRcdCwgY29tcG9uZW50cyA9IHt9O1xuXG5cdC8vIGl0ZXJhdGUgY2hpbGRyZW4gb2Ygc2NvcGVFbFxuXHRBcnJheS5wcm90b3R5cGUuZm9yRWFjaC5jYWxsKHNjb3BlRWwuY2hpbGRyZW4sIGJpbmRFbGVtZW50KTtcblxuXHRyZXR1cm4gY29tcG9uZW50cztcblxuXHRmdW5jdGlvbiBiaW5kRWxlbWVudChlbCl7XG5cdFx0dmFyIGF0dHIgPSBuZXcgQXR0cmlidXRlKGVsLCBvcHRzLkJJTkRfQVRUUik7XG5cblx0XHR2YXIgYUNvbXBvbmVudCA9IGNyZWF0ZUNvbXBvbmVudChlbCwgYXR0cik7XG5cblx0XHQvLyBiaW5kIGlubmVyIGVsZW1lbnRzIHRvIGNvbXBvbmVudHNcblx0XHRpZiAoZWwuY2hpbGRyZW4gJiYgZWwuY2hpbGRyZW4ubGVuZ3RoKSB7XG5cdFx0XHR2YXIgaW5uZXJDb21wb25lbnRzID0gYmluZGVyKGVsKTtcblxuXHRcdFx0aWYgKE9iamVjdC5rZXlzKGlubmVyQ29tcG9uZW50cykubGVuZ3RoKSB7XG5cdFx0XHRcdC8vIGF0dGFjaCBpbm5lciBjb21wb25lbnRzIHRvIHRoZSBjdXJyZW50IG9uZSAoY3JlYXRlIGEgbmV3IHNjb3BlKSAuLi5cblx0XHRcdFx0aWYgKHR5cGVvZiBhQ29tcG9uZW50ICE9ICd1bmRlZmluZWQnICYmIGFDb21wb25lbnQuY29udGFpbmVyKVxuXHRcdFx0XHRcdGFDb21wb25lbnQuY29udGFpbmVyLmFkZChpbm5lckNvbXBvbmVudHMpO1xuXHRcdFx0XHRlbHNlIC8vIG9yIGtlZXAgdGhlbSBpbiB0aGUgY3VycmVudCBzY29wZVxuXHRcdFx0XHRcdF8uZWFjaEtleShpbm5lckNvbXBvbmVudHMsIHN0b3JlQ29tcG9uZW50KTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAoYUNvbXBvbmVudClcblx0XHRcdHN0b3JlQ29tcG9uZW50KGFDb21wb25lbnQsIGF0dHIubmFtZSk7XG5cdH1cblxuXHRmdW5jdGlvbiBjcmVhdGVDb21wb25lbnQoZWwsIGF0dHIpIHtcblx0XHRpZiAoYXR0ci5ub2RlKSB7IC8vIGVsZW1lbnQgd2lsbCBiZSBib3VuZCB0byBhIGNvbXBvbmVudFxuXHRcdFx0YXR0ci5wYXJzZSgpLnZhbGlkYXRlKCk7XG5cblx0XHRcdC8vIGdldCBjb21wb25lbnQgY2xhc3MgZnJvbSByZWdpc3RyeSBhbmQgdmFsaWRhdGVcblx0XHRcdHZhciBDb21wb25lbnRDbGFzcyA9IGNvbXBvbmVudHNSZWdpc3RyeS5nZXQoYXR0ci5jb21wQ2xhc3MpO1xuXG5cdFx0XHRpZiAoISBDb21wb25lbnRDbGFzcylcblx0XHRcdFx0dGhyb3cgbmV3IEJpbmRFcnJvcignY2xhc3MgJyArIGF0dHIuY29tcENsYXNzICsgJyBpcyBub3QgcmVnaXN0ZXJlZCcpO1xuXG5cdFx0XHRjaGVjayhDb21wb25lbnRDbGFzcywgTWF0Y2guU3ViY2xhc3MoQ29tcG9uZW50LCB0cnVlKSk7XG5cdFxuXHRcdFx0Ly8gY3JlYXRlIG5ldyBjb21wb25lbnRcblx0XHRcdHJldHVybiBuZXcgQ29tcG9uZW50Q2xhc3Moe30sIGVsKTtcblx0XHR9XG5cdH1cblxuXG5cdGZ1bmN0aW9uIHN0b3JlQ29tcG9uZW50KGFDb21wb25lbnQsIG5hbWUpIHtcblx0XHRpZiAoY29tcG9uZW50c1tuYW1lXSlcblx0XHRcdHRocm93IG5ldyBCaW5kRXJyb3IoJ2R1cGxpY2F0ZSBjb21wb25lbnQgbmFtZTogJyArIG5hbWUpO1xuXG5cdFx0Y29tcG9uZW50c1tuYW1lXSA9IGFDb21wb25lbnQ7XG5cdH1cbn1cblxuXG5iaW5kZXIuY29uZmlnID0gZnVuY3Rpb24ob3B0aW9ucykge1xuXHRvcHRzLmV4dGVuZChvcHRpb25zKTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgncHJvdG8nKTtcblxuZnVuY3Rpb24gQmluZEVycm9yKG1zZykge1xuXHR0aGlzLm1lc3NhZ2UgPSBtc2c7XG59XG5cbl8ubWFrZVN1YmNsYXNzKEJpbmRFcnJvciwgRXJyb3IpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJpbmRFcnJvcjtcbiIsIid1c2Ugc3RyaWN0JztcblxuLy8gWFhYIGRvY3NcblxuLy8gVGhpbmdzIHdlIGV4cGxpY2l0bHkgZG8gTk9UIHN1cHBvcnQ6XG4vLyAgICAtIGhldGVyb2dlbm91cyBhcnJheXNcbnZhciBfID0gcmVxdWlyZSgncHJvdG8nKTtcblxudmFyIGNoZWNrID0gZnVuY3Rpb24gKHZhbHVlLCBwYXR0ZXJuKSB7XG4gIC8vIFJlY29yZCB0aGF0IGNoZWNrIGdvdCBjYWxsZWQsIGlmIHNvbWVib2R5IGNhcmVkLlxuICB0cnkge1xuICAgIGNoZWNrU3VidHJlZSh2YWx1ZSwgcGF0dGVybik7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGlmICgoZXJyIGluc3RhbmNlb2YgTWF0Y2guRXJyb3IpICYmIGVyci5wYXRoKVxuICAgICAgZXJyLm1lc3NhZ2UgKz0gXCIgaW4gZmllbGQgXCIgKyBlcnIucGF0aDtcbiAgICB0aHJvdyBlcnI7XG4gIH1cbn07XG5tb2R1bGUuZXhwb3J0cyA9IGNoZWNrO1xuXG52YXIgTWF0Y2ggPSBjaGVjay5NYXRjaCA9IHtcbiAgT3B0aW9uYWw6IGZ1bmN0aW9uIChwYXR0ZXJuKSB7XG4gICAgcmV0dXJuIG5ldyBPcHRpb25hbChwYXR0ZXJuKTtcbiAgfSxcbiAgT25lT2Y6IGZ1bmN0aW9uICgvKmFyZ3VtZW50cyovKSB7XG4gICAgcmV0dXJuIG5ldyBPbmVPZihhcmd1bWVudHMpO1xuICB9LFxuICBBbnk6IFsnX19hbnlfXyddLFxuICBXaGVyZTogZnVuY3Rpb24gKGNvbmRpdGlvbikge1xuICAgIHJldHVybiBuZXcgV2hlcmUoY29uZGl0aW9uKTtcbiAgfSxcbiAgT2JqZWN0SW5jbHVkaW5nOiBmdW5jdGlvbiAocGF0dGVybikge1xuICAgIHJldHVybiBuZXcgT2JqZWN0SW5jbHVkaW5nKHBhdHRlcm4pO1xuICB9LFxuICAvLyBNYXRjaGVzIG9ubHkgc2lnbmVkIDMyLWJpdCBpbnRlZ2Vyc1xuICBJbnRlZ2VyOiBbJ19faW50ZWdlcl9fJ10sXG5cbiAgLy8gTWF0Y2hlcyBoYXNoIChvYmplY3QpIHdpdGggdmFsdWVzIG1hdGNoaW5nIHBhdHRlcm5cbiAgT2JqZWN0SGFzaDogZnVuY3Rpb24ocGF0dGVybikge1xuICAgIHJldHVybiBuZXcgT2JqZWN0SGFzaChwYXR0ZXJuKTtcbiAgfSxcblxuICBTdWJjbGFzczogZnVuY3Rpb24oU3VwZXJjbGFzcywgbWF0Y2hTdXBlcmNsYXNzVG9vKSB7XG4gICAgcmV0dXJuIG5ldyBTdWJjbGFzcyhTdXBlcmNsYXNzLCBtYXRjaFN1cGVyY2xhc3NUb28pO1xuICB9LFxuXG4gIC8vIFhYWCBtYXRjaGVycyBzaG91bGQga25vdyBob3cgdG8gZGVzY3JpYmUgdGhlbXNlbHZlcyBmb3IgZXJyb3JzXG4gIEVycm9yOiBUeXBlRXJyb3IsXG5cbiAgLy8gTWV0ZW9yLm1ha2VFcnJvclR5cGUoXCJNYXRjaC5FcnJvclwiLCBmdW5jdGlvbiAobXNnKSB7XG4gICAgLy8gdGhpcy5tZXNzYWdlID0gXCJNYXRjaCBlcnJvcjogXCIgKyBtc2c7XG4gICAgLy8gVGhlIHBhdGggb2YgdGhlIHZhbHVlIHRoYXQgZmFpbGVkIHRvIG1hdGNoLiBJbml0aWFsbHkgZW1wdHksIHRoaXMgZ2V0c1xuICAgIC8vIHBvcHVsYXRlZCBieSBjYXRjaGluZyBhbmQgcmV0aHJvd2luZyB0aGUgZXhjZXB0aW9uIGFzIGl0IGdvZXMgYmFjayB1cCB0aGVcbiAgICAvLyBzdGFjay5cbiAgICAvLyBFLmcuOiBcInZhbHNbM10uZW50aXR5LmNyZWF0ZWRcIlxuICAgIC8vIHRoaXMucGF0aCA9IFwiXCI7XG4gICAgLy8gSWYgdGhpcyBnZXRzIHNlbnQgb3ZlciBERFAsIGRvbid0IGdpdmUgZnVsbCBpbnRlcm5hbCBkZXRhaWxzIGJ1dCBhdCBsZWFzdFxuICAgIC8vIHByb3ZpZGUgc29tZXRoaW5nIGJldHRlciB0aGFuIDUwMCBJbnRlcm5hbCBzZXJ2ZXIgZXJyb3IuXG4gIC8vICAgdGhpcy5zYW5pdGl6ZWRFcnJvciA9IG5ldyBNZXRlb3IuRXJyb3IoNDAwLCBcIk1hdGNoIGZhaWxlZFwiKTtcbiAgLy8gfSksXG5cbiAgLy8gVGVzdHMgdG8gc2VlIGlmIHZhbHVlIG1hdGNoZXMgcGF0dGVybi4gVW5saWtlIGNoZWNrLCBpdCBtZXJlbHkgcmV0dXJucyB0cnVlXG4gIC8vIG9yIGZhbHNlICh1bmxlc3MgYW4gZXJyb3Igb3RoZXIgdGhhbiBNYXRjaC5FcnJvciB3YXMgdGhyb3duKS4gSXQgZG9lcyBub3RcbiAgLy8gaW50ZXJhY3Qgd2l0aCBfZmFpbElmQXJndW1lbnRzQXJlTm90QWxsQ2hlY2tlZC5cbiAgLy8gWFhYIG1heWJlIGFsc28gaW1wbGVtZW50IGEgTWF0Y2gubWF0Y2ggd2hpY2ggcmV0dXJucyBtb3JlIGluZm9ybWF0aW9uIGFib3V0XG4gIC8vICAgICBmYWlsdXJlcyBidXQgd2l0aG91dCB1c2luZyBleGNlcHRpb24gaGFuZGxpbmcgb3IgZG9pbmcgd2hhdCBjaGVjaygpXG4gIC8vICAgICBkb2VzIHdpdGggX2ZhaWxJZkFyZ3VtZW50c0FyZU5vdEFsbENoZWNrZWQgYW5kIE1ldGVvci5FcnJvciBjb252ZXJzaW9uXG4gIHRlc3Q6IGZ1bmN0aW9uICh2YWx1ZSwgcGF0dGVybikge1xuICAgIHRyeSB7XG4gICAgICBjaGVja1N1YnRyZWUodmFsdWUsIHBhdHRlcm4pO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKGUgaW5zdGFuY2VvZiBNYXRjaC5FcnJvcilcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgLy8gUmV0aHJvdyBvdGhlciBlcnJvcnMuXG4gICAgICB0aHJvdyBlO1xuICAgIH1cbiAgfSxcblxuICAvLyBSdW5zIGBmLmFwcGx5KGNvbnRleHQsIGFyZ3MpYC4gSWYgY2hlY2soKSBpcyBub3QgY2FsbGVkIG9uIGV2ZXJ5IGVsZW1lbnQgb2ZcbiAgLy8gYGFyZ3NgIChlaXRoZXIgZGlyZWN0bHkgb3IgaW4gdGhlIGZpcnN0IGxldmVsIG9mIGFuIGFycmF5KSwgdGhyb3dzIGFuIGVycm9yXG4gIC8vICh1c2luZyBgZGVzY3JpcHRpb25gIGluIHRoZSBtZXNzYWdlKS5cbiAgLy9cbiAgX2ZhaWxJZkFyZ3VtZW50c0FyZU5vdEFsbENoZWNrZWQ6IGZ1bmN0aW9uIChmLCBjb250ZXh0LCBhcmdzLCBkZXNjcmlwdGlvbikge1xuICAgIHZhciBhcmdDaGVja2VyID0gbmV3IEFyZ3VtZW50Q2hlY2tlcihhcmdzLCBkZXNjcmlwdGlvbik7XG4gICAgdmFyIHJlc3VsdCA9IGN1cnJlbnRBcmd1bWVudENoZWNrZXIud2l0aFZhbHVlKGFyZ0NoZWNrZXIsIGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBmLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgIH0pO1xuICAgIC8vIElmIGYgZGlkbid0IGl0c2VsZiB0aHJvdywgbWFrZSBzdXJlIGl0IGNoZWNrZWQgYWxsIG9mIGl0cyBhcmd1bWVudHMuXG4gICAgYXJnQ2hlY2tlci50aHJvd1VubGVzc0FsbEFyZ3VtZW50c0hhdmVCZWVuQ2hlY2tlZCgpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIE9wdGlvbmFsKHBhdHRlcm4pIHtcbiAgdGhpcy5wYXR0ZXJuID0gcGF0dGVybjtcbn07XG5cbmZ1bmN0aW9uIE9uZU9mKGNob2ljZXMpIHtcbiAgaWYgKGNob2ljZXMubGVuZ3RoID09IDApXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTXVzdCBwcm92aWRlIGF0IGxlYXN0IG9uZSBjaG9pY2UgdG8gTWF0Y2guT25lT2ZcIik7XG4gIHRoaXMuY2hvaWNlcyA9IGNob2ljZXM7XG59O1xuXG5mdW5jdGlvbiBXaGVyZShjb25kaXRpb24pIHtcbiAgdGhpcy5jb25kaXRpb24gPSBjb25kaXRpb247XG59O1xuXG5mdW5jdGlvbiBPYmplY3RJbmNsdWRpbmcocGF0dGVybikge1xuICB0aGlzLnBhdHRlcm4gPSBwYXR0ZXJuO1xufTtcblxuZnVuY3Rpb24gT2JqZWN0SGFzaChwYXR0ZXJuKSB7XG4gIHRoaXMucGF0dGVybiA9IHBhdHRlcm47XG59O1xuXG5mdW5jdGlvbiBTdWJjbGFzcyhTdXBlcmNsYXNzLCBtYXRjaFN1cGVyY2xhc3NUb28pIHtcbiAgdGhpcy5TdXBlcmNsYXNzID0gU3VwZXJjbGFzcztcbiAgdGhpcy5tYXRjaFN1cGVyY2xhc3MgPSBtYXRjaFN1cGVyY2xhc3NUb287XG59O1xuXG52YXIgdHlwZW9mQ2hlY2tzID0gW1xuICBbU3RyaW5nLCBcInN0cmluZ1wiXSxcbiAgW051bWJlciwgXCJudW1iZXJcIl0sXG4gIFtCb29sZWFuLCBcImJvb2xlYW5cIl0sXG4gIC8vIFdoaWxlIHdlIGRvbid0IGFsbG93IHVuZGVmaW5lZCBpbiBFSlNPTiwgdGhpcyBpcyBnb29kIGZvciBvcHRpb25hbFxuICAvLyBhcmd1bWVudHMgd2l0aCBPbmVPZi5cbiAgW3VuZGVmaW5lZCwgXCJ1bmRlZmluZWRcIl1cbl07XG5cbmZ1bmN0aW9uIGNoZWNrU3VidHJlZSh2YWx1ZSwgcGF0dGVybikge1xuICAvLyBNYXRjaCBhbnl0aGluZyFcbiAgaWYgKHBhdHRlcm4gPT09IE1hdGNoLkFueSlcbiAgICByZXR1cm47XG5cbiAgLy8gQmFzaWMgYXRvbWljIHR5cGVzLlxuICAvLyBEbyBub3QgbWF0Y2ggYm94ZWQgb2JqZWN0cyAoZS5nLiBTdHJpbmcsIEJvb2xlYW4pXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdHlwZW9mQ2hlY2tzLmxlbmd0aDsgKytpKSB7XG4gICAgaWYgKHBhdHRlcm4gPT09IHR5cGVvZkNoZWNrc1tpXVswXSkge1xuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gdHlwZW9mQ2hlY2tzW2ldWzFdKVxuICAgICAgICByZXR1cm47XG4gICAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJFeHBlY3RlZCBcIiArIHR5cGVvZkNoZWNrc1tpXVsxXSArIFwiLCBnb3QgXCIgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGVvZiB2YWx1ZSk7XG4gICAgfVxuICB9XG4gIGlmIChwYXR0ZXJuID09PSBudWxsKSB7XG4gICAgaWYgKHZhbHVlID09PSBudWxsKVxuICAgICAgcmV0dXJuO1xuICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIG51bGwsIGdvdCBcIiArIEVKU09OLnN0cmluZ2lmeSh2YWx1ZSkpO1xuICB9XG5cbiAgLy8gTWF0Y2guSW50ZWdlciBpcyBzcGVjaWFsIHR5cGUgZW5jb2RlZCB3aXRoIGFycmF5XG4gIGlmIChwYXR0ZXJuID09PSBNYXRjaC5JbnRlZ2VyKSB7XG4gICAgLy8gVGhlcmUgaXMgbm8gY29uc2lzdGVudCBhbmQgcmVsaWFibGUgd2F5IHRvIGNoZWNrIGlmIHZhcmlhYmxlIGlzIGEgNjQtYml0XG4gICAgLy8gaW50ZWdlci4gT25lIG9mIHRoZSBwb3B1bGFyIHNvbHV0aW9ucyBpcyB0byBnZXQgcmVtaW5kZXIgb2YgZGl2aXNpb24gYnkgMVxuICAgIC8vIGJ1dCB0aGlzIG1ldGhvZCBmYWlscyBvbiByZWFsbHkgbGFyZ2UgZmxvYXRzIHdpdGggYmlnIHByZWNpc2lvbi5cbiAgICAvLyBFLmcuOiAxLjM0ODE5MjMwODQ5MTgyNGUrMjMgJSAxID09PSAwIGluIFY4XG4gICAgLy8gQml0d2lzZSBvcGVyYXRvcnMgd29yayBjb25zaXN0YW50bHkgYnV0IGFsd2F5cyBjYXN0IHZhcmlhYmxlIHRvIDMyLWJpdFxuICAgIC8vIHNpZ25lZCBpbnRlZ2VyIGFjY29yZGluZyB0byBKYXZhU2NyaXB0IHNwZWNzLlxuICAgIGlmICh0eXBlb2YgdmFsdWUgPT09IFwibnVtYmVyXCIgJiYgKHZhbHVlIHwgMCkgPT09IHZhbHVlKVxuICAgICAgcmV0dXJuXG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgSW50ZWdlciwgZ290IFwiXG4gICAgICAgICAgICAgICAgKyAodmFsdWUgaW5zdGFuY2VvZiBPYmplY3QgPyBFSlNPTi5zdHJpbmdpZnkodmFsdWUpIDogdmFsdWUpKTtcbiAgfVxuXG4gIC8vIFwiT2JqZWN0XCIgaXMgc2hvcnRoYW5kIGZvciBNYXRjaC5PYmplY3RJbmNsdWRpbmcoe30pO1xuICBpZiAocGF0dGVybiA9PT0gT2JqZWN0KVxuICAgIHBhdHRlcm4gPSBNYXRjaC5PYmplY3RJbmNsdWRpbmcoe30pO1xuXG4gIC8vIEFycmF5IChjaGVja2VkIEFGVEVSIEFueSwgd2hpY2ggaXMgaW1wbGVtZW50ZWQgYXMgYW4gQXJyYXkpLlxuICBpZiAocGF0dGVybiBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgaWYgKHBhdHRlcm4ubGVuZ3RoICE9PSAxKVxuICAgICAgdGhyb3cgRXJyb3IoXCJCYWQgcGF0dGVybjogYXJyYXlzIG11c3QgaGF2ZSBvbmUgdHlwZSBlbGVtZW50XCIgK1xuICAgICAgICAgICAgICAgICAgRUpTT04uc3RyaW5naWZ5KHBhdHRlcm4pKTtcbiAgICBpZiAoIV8uaXNBcnJheSh2YWx1ZSkgJiYgIV8uaXNBcmd1bWVudHModmFsdWUpKSB7XG4gICAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJFeHBlY3RlZCBhcnJheSwgZ290IFwiICsgRUpTT04uc3RyaW5naWZ5KHZhbHVlKSk7XG4gICAgfVxuXG4gICAgXy5lYWNoKHZhbHVlLCBmdW5jdGlvbiAodmFsdWVFbGVtZW50LCBpbmRleCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY2hlY2tTdWJ0cmVlKHZhbHVlRWxlbWVudCwgcGF0dGVyblswXSk7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgaWYgKGVyciBpbnN0YW5jZW9mIE1hdGNoLkVycm9yKSB7XG4gICAgICAgICAgZXJyLnBhdGggPSBfcHJlcGVuZFBhdGgoaW5kZXgsIGVyci5wYXRoKTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBlcnI7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gQXJiaXRyYXJ5IHZhbGlkYXRpb24gY2hlY2tzLiBUaGUgY29uZGl0aW9uIGNhbiByZXR1cm4gZmFsc2Ugb3IgdGhyb3cgYVxuICAvLyBNYXRjaC5FcnJvciAoaWUsIGl0IGNhbiBpbnRlcm5hbGx5IHVzZSBjaGVjaygpKSB0byBmYWlsLlxuICBpZiAocGF0dGVybiBpbnN0YW5jZW9mIFdoZXJlKSB7XG4gICAgaWYgKHBhdHRlcm4uY29uZGl0aW9uKHZhbHVlKSlcbiAgICAgIHJldHVybjtcbiAgICAvLyBYWFggdGhpcyBlcnJvciBpcyB0ZXJyaWJsZVxuICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkZhaWxlZCBNYXRjaC5XaGVyZSB2YWxpZGF0aW9uXCIpO1xuICB9XG5cblxuICBpZiAocGF0dGVybiBpbnN0YW5jZW9mIE9wdGlvbmFsKVxuICAgIHBhdHRlcm4gPSBNYXRjaC5PbmVPZih1bmRlZmluZWQsIHBhdHRlcm4ucGF0dGVybik7XG5cbiAgaWYgKHBhdHRlcm4gaW5zdGFuY2VvZiBPbmVPZikge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGF0dGVybi5jaG9pY2VzLmxlbmd0aDsgKytpKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjaGVja1N1YnRyZWUodmFsdWUsIHBhdHRlcm4uY2hvaWNlc1tpXSk7XG4gICAgICAgIC8vIE5vIGVycm9yPyBZYXksIHJldHVybi5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIC8vIE90aGVyIGVycm9ycyBzaG91bGQgYmUgdGhyb3duLiBNYXRjaCBlcnJvcnMganVzdCBtZWFuIHRyeSBhbm90aGVyXG4gICAgICAgIC8vIGNob2ljZS5cbiAgICAgICAgaWYgKCEoZXJyIGluc3RhbmNlb2YgTWF0Y2guRXJyb3IpKVxuICAgICAgICAgIHRocm93IGVycjtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gWFhYIHRoaXMgZXJyb3IgaXMgdGVycmlibGVcbiAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJGYWlsZWQgTWF0Y2guT25lT2Ygb3IgTWF0Y2guT3B0aW9uYWwgdmFsaWRhdGlvblwiKTtcbiAgfVxuXG4gIC8vIEEgZnVuY3Rpb24gdGhhdCBpc24ndCBzb21ldGhpbmcgd2Ugc3BlY2lhbC1jYXNlIGlzIGFzc3VtZWQgdG8gYmUgYVxuICAvLyBjb25zdHJ1Y3Rvci5cbiAgaWYgKHBhdHRlcm4gaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIHBhdHRlcm4pXG4gICAgICByZXR1cm47XG4gICAgLy8gWFhYIHdoYXQgaWYgLm5hbWUgaXNuJ3QgZGVmaW5lZFxuICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIFwiICsgcGF0dGVybi5jb25zdHJ1Y3Rvci5uYW1lKTtcbiAgfVxuXG4gIHZhciB1bmtub3duS2V5c0FsbG93ZWQgPSBmYWxzZTtcbiAgaWYgKHBhdHRlcm4gaW5zdGFuY2VvZiBPYmplY3RJbmNsdWRpbmcpIHtcbiAgICB1bmtub3duS2V5c0FsbG93ZWQgPSB0cnVlO1xuICAgIHBhdHRlcm4gPSBwYXR0ZXJuLnBhdHRlcm47XG4gIH1cblxuICBpZiAocGF0dGVybiBpbnN0YW5jZW9mIE9iamVjdEhhc2gpIHtcbiAgICB2YXIga2V5UGF0dGVybiA9IHBhdHRlcm4ucGF0dGVybjtcbiAgICB2YXIgZW1wdHlIYXNoID0gdHJ1ZTtcbiAgICBmb3IgKHZhciBrZXkgaW4gdmFsdWUpIHtcbiAgICAgIGVtcHR5SGFzaCA9IGZhbHNlO1xuICAgICAgY2hlY2sodmFsdWVba2V5XSwga2V5UGF0dGVybik7XG4gICAgfVxuICAgIGlmIChlbXB0eUhhc2gpXG4gICAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJFeHBlY3RlZCBcIiArIHBhdHRlcm4uY29uc3RydWN0b3IubmFtZSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKHBhdHRlcm4gaW5zdGFuY2VvZiBTdWJjbGFzcykge1xuICAgIHZhciBTdXBlcmNsYXNzID0gcGF0dGVybi5TdXBlcmNsYXNzO1xuICAgIGlmIChwYXR0ZXJuLm1hdGNoU3VwZXJjbGFzcyAmJiB2YWx1ZSA9PSBTdXBlcmNsYXNzKVxuICAgICAgcmV0dXJuO1xuICAgIGlmICghICh2YWx1ZS5wcm90b3R5cGUgaW5zdGFuY2VvZiBTdXBlcmNsYXNzKSlcbiAgICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIFwiICsgcGF0dGVybi5jb25zdHJ1Y3Rvci5uYW1lICsgXCIgb2YgXCIgKyBTdXBlcmNsYXNzLm5hbWUpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmICh0eXBlb2YgcGF0dGVybiAhPT0gXCJvYmplY3RcIilcbiAgICB0aHJvdyBFcnJvcihcIkJhZCBwYXR0ZXJuOiB1bmtub3duIHBhdHRlcm4gdHlwZVwiKTtcblxuICAvLyBBbiBvYmplY3QsIHdpdGggcmVxdWlyZWQgYW5kIG9wdGlvbmFsIGtleXMuIE5vdGUgdGhhdCB0aGlzIGRvZXMgTk9UIGRvXG4gIC8vIHN0cnVjdHVyYWwgbWF0Y2hlcyBhZ2FpbnN0IG9iamVjdHMgb2Ygc3BlY2lhbCB0eXBlcyB0aGF0IGhhcHBlbiB0byBtYXRjaFxuICAvLyB0aGUgcGF0dGVybjogdGhpcyByZWFsbHkgbmVlZHMgdG8gYmUgYSBwbGFpbiBvbGQge09iamVjdH0hXG4gIGlmICh0eXBlb2YgdmFsdWUgIT09ICdvYmplY3QnKVxuICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIG9iamVjdCwgZ290IFwiICsgdHlwZW9mIHZhbHVlKTtcbiAgaWYgKHZhbHVlID09PSBudWxsKVxuICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIG9iamVjdCwgZ290IG51bGxcIik7XG4gIGlmICh2YWx1ZS5jb25zdHJ1Y3RvciAhPT0gT2JqZWN0KVxuICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIHBsYWluIG9iamVjdFwiKTtcblxuICB2YXIgcmVxdWlyZWRQYXR0ZXJucyA9IHt9O1xuICB2YXIgb3B0aW9uYWxQYXR0ZXJucyA9IHt9O1xuICBfLmVhY2gocGF0dGVybiwgZnVuY3Rpb24gKHN1YlBhdHRlcm4sIGtleSkge1xuICAgIGlmIChzdWJQYXR0ZXJuIGluc3RhbmNlb2YgT3B0aW9uYWwpXG4gICAgICBvcHRpb25hbFBhdHRlcm5zW2tleV0gPSBzdWJQYXR0ZXJuLnBhdHRlcm47XG4gICAgZWxzZVxuICAgICAgcmVxdWlyZWRQYXR0ZXJuc1trZXldID0gc3ViUGF0dGVybjtcbiAgfSk7XG5cbiAgXy5lYWNoKHZhbHVlLCBmdW5jdGlvbiAoc3ViVmFsdWUsIGtleSkge1xuICAgIHRyeSB7XG4gICAgICBpZiAoXy5oYXMocmVxdWlyZWRQYXR0ZXJucywga2V5KSkge1xuICAgICAgICBjaGVja1N1YnRyZWUoc3ViVmFsdWUsIHJlcXVpcmVkUGF0dGVybnNba2V5XSk7XG4gICAgICAgIGRlbGV0ZSByZXF1aXJlZFBhdHRlcm5zW2tleV07XG4gICAgICB9IGVsc2UgaWYgKF8uaGFzKG9wdGlvbmFsUGF0dGVybnMsIGtleSkpIHtcbiAgICAgICAgY2hlY2tTdWJ0cmVlKHN1YlZhbHVlLCBvcHRpb25hbFBhdHRlcm5zW2tleV0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKCF1bmtub3duS2V5c0FsbG93ZWQpXG4gICAgICAgICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiVW5rbm93biBrZXlcIik7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBpZiAoZXJyIGluc3RhbmNlb2YgTWF0Y2guRXJyb3IpXG4gICAgICAgIGVyci5wYXRoID0gX3ByZXBlbmRQYXRoKGtleSwgZXJyLnBhdGgpO1xuICAgICAgdGhyb3cgZXJyO1xuICAgIH1cbiAgfSk7XG5cbiAgXy5lYWNoKHJlcXVpcmVkUGF0dGVybnMsIGZ1bmN0aW9uIChzdWJQYXR0ZXJuLCBrZXkpIHtcbiAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJNaXNzaW5nIGtleSAnXCIgKyBrZXkgKyBcIidcIik7XG4gIH0pO1xufTtcblxuZnVuY3Rpb24gQXJndW1lbnRDaGVja2VyKGFyZ3MsIGRlc2NyaXB0aW9uKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgLy8gTWFrZSBhIFNIQUxMT1cgY29weSBvZiB0aGUgYXJndW1lbnRzLiAoV2UnbGwgYmUgZG9pbmcgaWRlbnRpdHkgY2hlY2tzXG4gIC8vIGFnYWluc3QgaXRzIGNvbnRlbnRzLilcbiAgc2VsZi5hcmdzID0gXy5jbG9uZShhcmdzKTtcbiAgLy8gU2luY2UgdGhlIGNvbW1vbiBjYXNlIHdpbGwgYmUgdG8gY2hlY2sgYXJndW1lbnRzIGluIG9yZGVyLCBhbmQgd2Ugc3BsaWNlXG4gIC8vIG91dCBhcmd1bWVudHMgd2hlbiB3ZSBjaGVjayB0aGVtLCBtYWtlIGl0IHNvIHdlIHNwbGljZSBvdXQgZnJvbSB0aGUgZW5kXG4gIC8vIHJhdGhlciB0aGFuIHRoZSBiZWdpbm5pbmcuXG4gIHNlbGYuYXJncy5yZXZlcnNlKCk7XG4gIHNlbGYuZGVzY3JpcHRpb24gPSBkZXNjcmlwdGlvbjtcbn07XG5cbl8uZXh0ZW5kUHJvdG8oQXJndW1lbnRDaGVja2VyLCB7XG4gIGNoZWNraW5nOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKHNlbGYuX2NoZWNraW5nT25lVmFsdWUodmFsdWUpKVxuICAgICAgcmV0dXJuO1xuICAgIC8vIEFsbG93IGNoZWNrKGFyZ3VtZW50cywgW1N0cmluZ10pIG9yIGNoZWNrKGFyZ3VtZW50cy5zbGljZSgxKSwgW1N0cmluZ10pXG4gICAgLy8gb3IgY2hlY2soW2ZvbywgYmFyXSwgW1N0cmluZ10pIHRvIGNvdW50Li4uIGJ1dCBvbmx5IGlmIHZhbHVlIHdhc24ndFxuICAgIC8vIGl0c2VsZiBhbiBhcmd1bWVudC5cbiAgICBpZiAoXy5pc0FycmF5KHZhbHVlKSB8fCBfLmlzQXJndW1lbnRzKHZhbHVlKSkge1xuICAgICAgXy5lYWNoKHZhbHVlLCBfLmJpbmQoc2VsZi5fY2hlY2tpbmdPbmVWYWx1ZSwgc2VsZikpO1xuICAgIH1cbiAgfSxcbiAgX2NoZWNraW5nT25lVmFsdWU6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNlbGYuYXJncy5sZW5ndGg7ICsraSkge1xuICAgICAgLy8gSXMgdGhpcyB2YWx1ZSBvbmUgb2YgdGhlIGFyZ3VtZW50cz8gKFRoaXMgY2FuIGhhdmUgYSBmYWxzZSBwb3NpdGl2ZSBpZlxuICAgICAgLy8gdGhlIGFyZ3VtZW50IGlzIGFuIGludGVybmVkIHByaW1pdGl2ZSwgYnV0IGl0J3Mgc3RpbGwgYSBnb29kIGVub3VnaFxuICAgICAgLy8gY2hlY2suKVxuICAgICAgaWYgKHZhbHVlID09PSBzZWxmLmFyZ3NbaV0pIHtcbiAgICAgICAgc2VsZi5hcmdzLnNwbGljZShpLCAxKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfSxcbiAgdGhyb3dVbmxlc3NBbGxBcmd1bWVudHNIYXZlQmVlbkNoZWNrZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKCFfLmlzRW1wdHkoc2VsZi5hcmdzKSlcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkRpZCBub3QgY2hlY2soKSBhbGwgYXJndW1lbnRzIGR1cmluZyBcIiArXG4gICAgICAgICAgICAgICAgICAgICAgc2VsZi5kZXNjcmlwdGlvbik7XG4gIH1cbn0pO1xuXG52YXIgX2pzS2V5d29yZHMgPSBbXCJkb1wiLCBcImlmXCIsIFwiaW5cIiwgXCJmb3JcIiwgXCJsZXRcIiwgXCJuZXdcIiwgXCJ0cnlcIiwgXCJ2YXJcIiwgXCJjYXNlXCIsXG4gIFwiZWxzZVwiLCBcImVudW1cIiwgXCJldmFsXCIsIFwiZmFsc2VcIiwgXCJudWxsXCIsIFwidGhpc1wiLCBcInRydWVcIiwgXCJ2b2lkXCIsIFwid2l0aFwiLFxuICBcImJyZWFrXCIsIFwiY2F0Y2hcIiwgXCJjbGFzc1wiLCBcImNvbnN0XCIsIFwic3VwZXJcIiwgXCJ0aHJvd1wiLCBcIndoaWxlXCIsIFwieWllbGRcIixcbiAgXCJkZWxldGVcIiwgXCJleHBvcnRcIiwgXCJpbXBvcnRcIiwgXCJwdWJsaWNcIiwgXCJyZXR1cm5cIiwgXCJzdGF0aWNcIiwgXCJzd2l0Y2hcIixcbiAgXCJ0eXBlb2ZcIiwgXCJkZWZhdWx0XCIsIFwiZXh0ZW5kc1wiLCBcImZpbmFsbHlcIiwgXCJwYWNrYWdlXCIsIFwicHJpdmF0ZVwiLCBcImNvbnRpbnVlXCIsXG4gIFwiZGVidWdnZXJcIiwgXCJmdW5jdGlvblwiLCBcImFyZ3VtZW50c1wiLCBcImludGVyZmFjZVwiLCBcInByb3RlY3RlZFwiLCBcImltcGxlbWVudHNcIixcbiAgXCJpbnN0YW5jZW9mXCJdO1xuXG4vLyBBc3N1bWVzIHRoZSBiYXNlIG9mIHBhdGggaXMgYWxyZWFkeSBlc2NhcGVkIHByb3Blcmx5XG4vLyByZXR1cm5zIGtleSArIGJhc2VcbmZ1bmN0aW9uIF9wcmVwZW5kUGF0aChrZXksIGJhc2UpIHtcbiAgaWYgKCh0eXBlb2Yga2V5KSA9PT0gXCJudW1iZXJcIiB8fCBrZXkubWF0Y2goL15bMC05XSskLykpXG4gICAga2V5ID0gXCJbXCIgKyBrZXkgKyBcIl1cIjtcbiAgZWxzZSBpZiAoIWtleS5tYXRjaCgvXlthLXpfJF1bMC05YS16XyRdKiQvaSkgfHwgXy5jb250YWlucyhfanNLZXl3b3Jkcywga2V5KSlcbiAgICBrZXkgPSBKU09OLnN0cmluZ2lmeShba2V5XSk7XG5cbiAgaWYgKGJhc2UgJiYgYmFzZVswXSAhPT0gXCJbXCIpXG4gICAgcmV0dXJuIGtleSArICcuJyArIGJhc2U7XG4gIHJldHVybiBrZXkgKyBiYXNlO1xufTtcblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgRmFjZXRlZE9iamVjdCA9IHJlcXVpcmUoJy4uL2ZhY2V0cy9mX29iamVjdCcpXG5cdCwgbWVzc2VuZ2VyTWl4aW4gPSByZXF1aXJlKCcuL21lc3NlbmdlcicpXG5cdCwgXyA9IHJlcXVpcmUoJ3Byb3RvJyk7XG5cbnZhciBDb21wb25lbnQgPSBfLmNyZWF0ZVN1YmNsYXNzKEZhY2V0ZWRPYmplY3QsICdDb21wb25lbnQnLCB0cnVlKTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb25lbnQ7XG5cblxuQ29tcG9uZW50LmNyZWF0ZUNvbXBvbmVudENsYXNzID0gRmFjZXRlZE9iamVjdC5jcmVhdGVGYWNldGVkQ2xhc3M7XG5kZWxldGUgQ29tcG9uZW50LmNyZWF0ZUZhY2V0ZWRDbGFzcztcblxuXy5leHRlbmRQcm90byhDb21wb25lbnQsIHtcblx0aW5pdDogaW5pdENvbXBvbmVudFxufSk7XG5cbl8uZXh0ZW5kUHJvdG8oQ29tcG9uZW50LCBtZXNzZW5nZXJNaXhpbik7XG5cbmZ1bmN0aW9uIGluaXRDb21wb25lbnQoZmFjZXRzT3B0aW9ucywgZWxlbWVudCkge1xuXHR0aGlzLmVsID0gZWxlbWVudDtcblx0dGhpcy5pbml0TWVzc2VuZ2VyKCk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBGYWNldCA9IHJlcXVpcmUoJy4uL2ZhY2V0cy9mX2NsYXNzJylcblx0LCBtZXNzZW5nZXJNaXhpbiA9IHJlcXVpcmUoJy4vbWVzc2VuZ2VyJylcblx0LCBfID0gcmVxdWlyZSgncHJvdG8nKTtcblxudmFyIENvbXBvbmVudEZhY2V0ID0gXy5jcmVhdGVTdWJjbGFzcyhGYWNldCwgJ0NvbXBvbmVudEZhY2V0Jyk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ29tcG9uZW50RmFjZXQ7XG5cblxuXy5leHRlbmRQcm90byhDb21wb25lbnRGYWNldCwge1xuXHRpbml0OiBpbml0Q29tcG9uZW50RmFjZXQsXG59KTtcblxuXy5leHRlbmRQcm90byhDb21wb25lbnRGYWNldCwgbWVzc2VuZ2VyTWl4aW4pO1xuXG5cbmZ1bmN0aW9uIGluaXRDb21wb25lbnRGYWNldCgpIHtcblx0dGhpcy5pbml0TWVzc2VuZ2VyKCk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBDb21wb25lbnRGYWNldCA9IHJlcXVpcmUoJy4uL2NfZmFjZXQnKVxuXHQsIGJpbmRlciA9IHJlcXVpcmUoJy4uLy4uL2JpbmRlci9iaW5kZXInKVxuXHQsIF8gPSByZXF1aXJlKCdwcm90bycpXG5cdCwgZmFjZXRzUmVnaXN0cnkgPSByZXF1aXJlKCcuL2NmX3JlZ2lzdHJ5Jyk7XG5cbi8vIGNvbnRhaW5lciBmYWNldFxudmFyIENvbnRhaW5lciA9IF8uY3JlYXRlU3ViY2xhc3MoQ29tcG9uZW50RmFjZXQsICdDb250YWluZXInKTtcblxuXy5leHRlbmRQcm90byhDb250YWluZXIsIHtcblx0aW5pdDogaW5pdENvbnRhaW5lcixcblx0X2JpbmQ6IF9iaW5kQ29tcG9uZW50cyxcblx0YWRkOiBhZGRDaGlsZENvbXBvbmVudHNcbn0pO1xuXG5mYWNldHNSZWdpc3RyeS5hZGQoQ29udGFpbmVyKTtcblxuXG5mdW5jdGlvbiBpbml0Q29udGFpbmVyKCkge1xuXHR0aGlzLmNoaWxkcmVuID0ge307XG59XG5cblxuZnVuY3Rpb24gX2JpbmRDb21wb25lbnRzKCkge1xuXHQvLyBUT0RPXG5cdC8vIHRoaXMgZnVuY3Rpb24gc2hvdWxkIHJlLWJpbmQgcmF0aGVyIHRoYW4gYmluZCBhbGwgaW50ZXJuYWwgZWxlbWVudHNcblx0dGhpcy5jaGlsZHJlbiA9IGJpbmRlcih0aGlzLm93bmVyLmVsKTtcbn1cblxuXG5mdW5jdGlvbiBhZGRDaGlsZENvbXBvbmVudHMoY2hpbGRDb21wb25lbnRzKSB7XG5cdC8vIFRPRE9cblx0Ly8gdGhpcyBmdW5jdGlvbiBzaG91bGQgaW50ZWxsaWdlbnRseSByZS1iaW5kIGV4aXN0aW5nIGNvbXBvbmVudHMgdG9cblx0Ly8gbmV3IGVsZW1lbnRzIChpZiB0aGV5IGNoYW5nZWQpIGFuZCByZS1iaW5kIHByZXZpb3VzbHkgYm91bmQgZXZlbnRzIHRvIHRoZSBzYW1lXG5cdC8vIGV2ZW50IGhhbmRsZXJzXG5cdC8vIG9yIG1heWJlIG5vdCwgaWYgdGhpcyBmdW5jdGlvbiBpcyBvbmx5IHVzZWQgYnkgYmluZGVyIHRvIGFkZCBuZXcgZWxlbWVudHMuLi5cblx0Xy5leHRlbmQodGhpcy5jaGlsZHJlbiwgY2hpbGRDb21wb25lbnRzKTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIENvbXBvbmVudEZhY2V0ID0gcmVxdWlyZSgnLi4vY19mYWNldCcpXG5cdCwgRmFjZXRFcnJvciA9IENvbXBvbmVudEZhY2V0LkVycm9yXG5cdCwgXyA9IHJlcXVpcmUoJ3Byb3RvJylcblx0LCBmYWNldHNSZWdpc3RyeSA9IHJlcXVpcmUoJy4vY2ZfcmVnaXN0cnknKVxuXHQsIG1lc3Nlbmdlck1peGluID0gcmVxdWlyZSgnLi4vbWVzc2VuZ2VyJylcblx0LCBkb21FdmVudHNDb25zdHJ1Y3RvcnMgPSByZXF1aXJlKCcuL2RvbV9ldmVudHMnKTtcblxuLy8gZXZlbnRzIGZhY2V0XG52YXIgRXZlbnRzID0gXy5jcmVhdGVTdWJjbGFzcyhDb21wb25lbnRGYWNldCwgJ0V2ZW50cycpO1xuXG5fLmV4dGVuZFByb3RvKEV2ZW50cywge1xuXHRpbml0OiBpbml0RXZlbnRzRmFjZXQsXG5cdGRvbTogZ2V0RG9tRWxlbWVudCxcblx0aGFuZGxlRXZlbnQ6IGhhbmRsZUV2ZW50LCAvLyBldmVudCBkaXNwYXRjaGVyIC0gYXMgZGVmaW5lZCBieSBFdmVudCBET00gQVBJXG5cdG9uOiBhZGRMaXN0ZW5lcixcblx0b2ZmOiByZW1vdmVMaXN0ZW5lcixcblx0b25FdmVudHM6IGFkZExpc3RlbmVyc1RvRXZlbnRzLFxuXHRvZmZFdmVudHM6IHJlbW92ZUxpc3RlbmVyc0Zyb21FdmVudHMsXG5cdHRyaWdnZXI6IHRyaWdnZXJFdmVudCxcblx0Z2V0TGlzdGVuZXJzOiBnZXRMaXN0ZW5lcnMsXG5cdC8vIF9yZWF0dGFjaDogX3JlYXR0YWNoRXZlbnRzT25FbGVtZW50Q2hhbmdlXG59KTtcblxuZmFjZXRzUmVnaXN0cnkuYWRkKEV2ZW50cyk7XG5cblxudmFyIHVzZUNhcHR1cmVTdWZmaXggPSAnX19jYXB0dXJlJ1xuXHQsIHdyb25nRXZlbnRQYXR0ZXJuID0gL19fY2FwdHVyZS87XG5cblxuZnVuY3Rpb24gaW5pdEV2ZW50c0ZhY2V0KCkge1xuXHQvLyBkZXBlbmRlbmN5XG5cdGlmICghIHRoaXMub3duZXIuZmFjZXRzLkVsKVxuXHRcdHRocm93IG5ldyBGYWNldEVycm9yKCdFdmVudHMgZmFjZXQgcmVxdWlyZSBFbCBmYWNldCcpO1xuXG5cdC8vIGluaXRpYWxpemUgbGlzdGVuZXJzIG1hcFxuXHR0aGlzLl9ldmVudHNMaXN0ZW5lcnMgPSB7fTtcbn1cblxuXG5mdW5jdGlvbiBnZXREb21FbGVtZW50KCkge1xuXHRyZXR1cm4gdGhpcy5vd25lci5FbC5kb207XG59XG5cblxuZnVuY3Rpb24gaGFuZGxlRXZlbnQoZXZlbnQpIHtcblx0aXNDYXB0dXJlUGhhc2UgPSBldmVudC5ldmVudFBoYXNlID09IHdpbmRvdy5FdmVudC5DQVBUVVJJTkdfUEhBU0U7XG5cblx0dmFyIGV2ZW50S2V5ID0gZXZlbnQudHlwZSArIChpc0NhcHR1cmVQaGFzZSA/IHVzZUNhcHR1cmVTdWZmaXggOiAnJylcblx0XHQsIGV2ZW50TGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzTGlzdGVuZXJzW2V2ZW50S2V5XTtcblxuXHRpZiAoZXZlbnRMaXN0ZW5lcnMpXG5cdFx0ZXZlbnRMaXN0ZW5lcnMuZm9yRWFjaChmdW5jdGlvbihsaXN0ZW5lcikge1xuXHRcdFx0bGlzdGVuZXIoZXZlbnQpO1xuXHRcdH0pO1xufVxuXG5cbmZ1bmN0aW9uIGFkZExpc3RlbmVyKGV2ZW50VHlwZXMsIGxpc3RlbmVyLCB1c2VDYXB0dXJlKSB7XG5cdGNoZWNrKGV2ZW50cywgU3RyaW5nKTtcblx0Y2hlY2sobGlzdGVuZXIsIEZ1bmN0aW9uKTtcblxuXHR2YXIgZXZlbnRzQXJyYXkgPSBldmVudFR5cGVzLnNwbGl0KC9cXHMqXFwsP1xccyovKVxuXHRcdCwgd2FzQXR0YWNoZWQgPSBmYWxzZTtcblxuXHRldmVudHNBcnJheS5mb3JFYWNoKGZ1bmN0aW9uKGV2ZW50VHlwZSkge1xuXHRcdGlmICh3cm9uZ0V2ZW50UGF0dGVybi50ZXN0KGV2ZW50VHlwZSkpXG5cdFx0XHR0aHJvdyBuZXcgUmFuZ2VFcnJvcignZXZlbnQgdHlwZSBjYW5ub3QgY29udGFpbiAnICsgdXNlQ2FwdHVyZVN1ZmZpeCk7XG5cblx0XHR2YXIgZXZlbnRLZXkgPSBldmVudFR5cGUgKyAodXNlQ2FwdHVyZSA/IHVzZUNhcHR1cmVTdWZmaXggOiAnJylcblx0XHRcdCwgZXZlbnRMaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNMaXN0ZW5lcnNbZXZlbnRLZXldXG5cdFx0XHRcdD0gdGhpcy5fZXZlbnRzTGlzdGVuZXJzW2V2ZW50S2V5XSB8fCBbXTtcblxuXHRcdGlmICghIF9oYXNFdmVudExpc3RlbmVycyhldmVudEtleSkpIHtcblx0XHRcdC8vIHRydWUgPSB1c2UgY2FwdHVyZSwgZm9yIHBhcnRpY3VsYXIgbGlzdGVuZXIgaXQgaXMgZGV0ZXJtaW5lZCBpbiBoYW5kbGVFdmVudFxuXHRcdFx0dGhpcy5kb20oKS5hZGRFdmVudExpc3RlbmVyKGV2ZW50S2V5LCB0aGlzLCB0cnVlKTtcblx0XHRcdHZhciBub3RZZXRBdHRhY2hlZCA9IHRydWU7XG5cdFx0fSBlbHNlXG5cdFx0XHRub3RZZXRBdHRhY2hlZCA9IGV2ZW50TGlzdGVuZXJzLmluZGV4T2YobGlzdGVuZXIpID09IC0xO1xuXG5cdFx0aWYgKG5vdFlldEF0dGFjaGVkKSB7XG5cdFx0XHR3YXNBdHRhY2hlZCA9IHRydWU7XG5cdFx0XHRldmVudExpc3RlbmVycy5wdXNoKGxpc3RlbmVyKTtcblx0XHR9XG5cdH0pO1xuXG5cdHJldHVybiB3YXNBdHRhY2hlZDtcbn1cblxuXG5mdW5jdGlvbiBhZGRMaXN0ZW5lcnNUb0V2ZW50cyhldmVudHNMaXN0ZW5lcnMsIHVzZUNhcHR1cmUpIHtcblx0Y2hlY2soZXZlbnRzTGlzdGVuZXJzLCBNYXRjaC5PYmplY3QpO1xuXG5cdHZhciB3YXNBdHRhY2hlZE1hcCA9IF8ubWFwS2V5cyhldmVudHNMaXN0ZW5lcnMsIGZ1bmN0aW9uKGxpc3RlbmVyLCBldmVudFR5cGVzKSB7XG5cdFx0cmV0dXJuIHRoaXMuYWRkTGlzdGVuZXIoZXZlbnRUeXBlcywgbGlzdGVuZXIsIHVzZUNhcHR1cmUpXG5cdH0sIHRoaXMpO1xuXG5cdHJldHVybiB3YXNBdHRhY2hlZE1hcDtcdFxufVxuXG5cbmZ1bmN0aW9uIHJlbW92ZUxpc3RlbmVyKGV2ZW50VHlwZXMsIGxpc3RlbmVyLCB1c2VDYXB0dXJlKSB7XG5cdGNoZWNrKGV2ZW50VHlwZXMsIFN0cmluZyk7XG5cdGNoZWNrKGxpc3RlbmVyLCBGdW5jdGlvbik7XG5cblx0dmFyIGV2ZW50c0FycmF5ID0gZXZlbnRUeXBlcy5zcGxpdCgvXFxzKlxcLD9cXHMqLylcblx0XHQsIHdhc1JlbW92ZWQgPSBmYWxzZTtcblxuXHRldmVudHNBcnJheS5mb3JFYWNoKGZ1bmN0aW9uKGV2ZW50VHlwZSkge1xuXHRcdGlmICh3cm9uZ0V2ZW50UGF0dGVybi50ZXN0KGV2ZW50VHlwZSkpXG5cdFx0XHR0aHJvdyBuZXcgUmFuZ2VFcnJvcignZXZlbnQgdHlwZSBjYW5ub3QgY29udGFpbiAnICsgdXNlQ2FwdHVyZVN1ZmZpeCk7XG5cblx0XHR2YXIgZXZlbnRLZXkgPSBldmVudFR5cGUgKyAodXNlQ2FwdHVyZSA/IHVzZUNhcHR1cmVTdWZmaXggOiAnJylcblx0XHRcdCwgZXZlbnRMaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNMaXN0ZW5lcnNbZXZlbnRLZXldO1xuXG5cdFx0aWYgKCEgKGV2ZW50TGlzdGVuZXJzICYmIGV2ZW50TGlzdGVuZXJzLmxlbmd0aCkpIHJldHVybjtcblxuXHRcdGlmIChsaXN0ZW5lcikge1xuXHRcdFx0bGlzdGVuZXJJbmRleCA9IGV2ZW50TGlzdGVuZXJzLmluZGV4T2YobGlzdGVuZXIpO1xuXHRcdFx0aWYgKGxpc3RlbmVySW5kZXggPT0gLTEpXG5cdFx0XHRcdHJldHVybjtcblx0XHRcdGV2ZW50TGlzdGVuZXJzLnNwbGljZShsaXN0ZW5lckluZGV4LCAxKTtcblx0XHRcdGlmICghIGV2ZW50TGlzdGVuZXJzLmxlbmd0aClcblx0XHRcdFx0ZGVsZXRlIHRoaXMuX2V2ZW50c0xpc3RlbmVyc1tldmVudEtleV07XG5cdFx0fSBlbHNlXG5cdFx0XHRkZWxldGUgdGhpcy5fZXZlbnRzTGlzdGVuZXJzW2V2ZW50S2V5XTtcblxuXHRcdHdhc1JlbW92ZWQgPSB0cnVlO1xuXG5cdFx0aWYgKCEgX2hhc0V2ZW50TGlzdGVuZXJzKGV2ZW50VHlwZSkpXG5cdFx0XHQvLyB0cnVlID0gdXNlIGNhcHR1cmUsIGZvciBwYXJ0aWN1bGFyIGxpc3RlbmVyIGl0IGlzIGRldGVybWluZWQgaW4gaGFuZGxlRXZlbnRcblx0XHRcdHRoaXMuZG9tKCkucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudFR5cGUsIHRoaXMsIHRydWUpO1xuXHR9KTtcblxuXHRyZXR1cm4gd2FzUmVtb3ZlZDtcbn1cblxuXG5mdW5jdGlvbiByZW1vdmVMaXN0ZW5lcnNGcm9tRXZlbnRzKGV2ZW50c0xpc3RlbmVycywgdXNlQ2FwdHVyZSkge1xuXHRjaGVjayhldmVudHNMaXN0ZW5lcnMsIE1hdGNoLk9iamVjdCk7XG5cblx0dmFyIHdhc1JlbW92ZWRNYXAgPSBfLm1hcEtleXMoZXZlbnRzTGlzdGVuZXJzLCBmdW5jdGlvbihsaXN0ZW5lciwgZXZlbnRUeXBlcykge1xuXHRcdHJldHVybiB0aGlzLnJlbW92ZUxpc3RlbmVyKGV2ZW50VHlwZXMsIGxpc3RlbmVyLCB1c2VDYXB0dXJlKTtcblx0fSwgdGhpcyk7XG5cblx0cmV0dXJuIHdhc1JlbW92ZWRNYXA7XG59XG5cblxuZnVuY3Rpb24gdHJpZ2dlckV2ZW50KGV2ZW50VHlwZSwgcHJvcGVydGllcykge1xuXHRjaGVjayhldmVudFR5cGUsIFN0cmluZyk7XG5cblx0dmFyIEV2ZW50Q29uc3RydWN0b3IgPSBkb21FdmVudHNDb25zdHJ1Y3RvcnNbZXZlbnRUeXBlXTtcblxuXHRpZiAodHlwZW9mIGV2ZW50Q29uc3RydWN0b3IgIT0gJ2Z1bmN0aW9uJylcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ3Vuc3VwcG9ydGVkIGV2ZW50IHR5cGUnKTtcblxuXHR2YXIgZG9tRXZlbnQgPSBFdmVudENvbnN0cnVjdG9yKGV2ZW50VHlwZSwgcHJvcGVydGllcyk7XG5cdC8vID8/PyBwcm9wZXJ0aWVzLnR5cGUgPSBldmVudFR5cGU7XG5cdC8vID8/PyBFdmVudENvbnN0cnVjdG9yKHByb3BlcnRpZXMpO1xuXHR2YXIgbm90Q2FuY2VsbGVkID0gdGhpcy5kb20oKS5kaXNwYXRjaEV2ZW50KGRvbUV2ZW50KTtcblxuXHRyZXR1cm4gbm90Q2FuY2VsbGVkO1xufVxuXG5cbmZ1bmN0aW9uIGdldExpc3RlbmVycyhldmVudFR5cGUsIHVzZUNhcHR1cmUpIHtcblx0Y2hlY2soZXZlbnRUeXBlLCBTdHJpbmcpO1xuXG5cdHZhciBldmVudEtleSA9IGV2ZW50VHlwZSArICh1c2VDYXB0dXJlID8gdXNlQ2FwdHVyZVN1ZmZpeCA6ICcnKVxuXHRcdCwgZXZlbnRMaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNMaXN0ZW5lcnNbZXZlbnRLZXldO1xuXG5cdHJldHVybiBldmVudExpc3RlbmVycyAmJiBldmVudExpc3RlbmVycy5sZW5ndGhcblx0XHRcdFx0ID8gW10uY29uY2F0KGV2ZW50TGlzdGVuZXJzKVxuXHRcdFx0XHQgOiB1bmRlZmluZWQ7XG59XG5cblxuZnVuY3Rpb24gX2hhc0V2ZW50TGlzdGVuZXJzKGV2ZW50VHlwZSkge1xuXHR2YXIgbm90Q2FwdHVyZWRFdmVudHMgPSB0aGlzLl9ldmVudHNMaXN0ZW5lcnNbZXZlbnRUeXBlXVxuXHRcdCwgY2FwdHVyZWRFdmVudHMgPSB0aGlzLl9ldmVudHNMaXN0ZW5lcnNbZXZlbnRUeXBlICsgdXNlQ2FwdHVyZVN1ZmZpeF07XG5cblx0cmV0dXJuIChub3RDYXB0dXJlZEV2ZW50cyAmJiBub3RDYXB0dXJlZEV2ZW50cy5sZW5ndGgpXG5cdFx0ICAgIHx8IChjYXB0dXJlZEV2ZW50cyAmJiBjYXB0dXJlZEV2ZW50cy5sZW5ndGgpO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ2xhc3NSZWdpc3RyeSA9IHJlcXVpcmUoJy4uLy4uL3JlZ2lzdHJ5Jylcblx0LCBDb21wb25lbnRGYWNldCA9IHJlcXVpcmUoJy4uL2NfZmFjZXQnKTtcblxudmFyIGZhY2V0c1JlZ2lzdHJ5ID0gbmV3IENsYXNzUmVnaXN0cnkoQ29tcG9uZW50RmFjZXQpO1xuXG5mYWNldHNSZWdpc3RyeS5hZGQoQ29tcG9uZW50RmFjZXQpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZhY2V0c1JlZ2lzdHJ5O1xuXG4vLyBUT0RPIC0gcmVmYWN0b3IgY29tcG9uZW50cyByZWdpc3RyeSB0ZXN0IGludG8gYSBmdW5jdGlvblxuLy8gdGhhdCB0ZXN0cyBhIHJlZ2lzdHJ5IHdpdGggYSBnaXZlbiBmb3VuZGF0aW9uIGNsYXNzXG4vLyBNYWtlIHRlc3QgZm9yIHRoaXMgcmVnaXN0cnkgYmFzZWQgb24gdGhpcyBmdW5jdGlvbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCdwcm90bycpO1xuXG5cbi8vIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL1JlZmVyZW5jZS9FdmVudHNcblxudmFyIGV2ZW50VHlwZXMgPSB7XG5cdENsaXBib2FyZEV2ZW50OiBbJ2NvcHknLCAnY3V0JywgJ3Bhc3RlJywgJ2JlZm9yZWNvcHknLCAnYmVmb3JlY3V0JywgJ2JlZm9yZXBhc3RlJ10sXG5cdEV2ZW50OiBbJ2lucHV0J10sXG5cdEZvY3VzRXZlbnQ6IFsnZm9jdXMnLCAnYmx1cicsICdmb2N1c2luJywgJ2ZvY3Vzb3V0J10sXG5cdEtleWJvYXJkRXZlbnQ6IFsna2V5ZG93bicsICdrZXlwcmVzcycsICAna2V5dXAnXSxcblx0TW91c2VFdmVudDogWydjbGljaycsICdjb250ZXh0bWVudScsICdkYmxjbGljaycsICdtb3VzZWRvd24nLCAnbW91c2V1cCcsXG5cdFx0XHRcdCAnbW91c2VlbnRlcicsICdtb3VzZWxlYXZlJywgJ21vdXNlbW92ZScsICdtb3VzZW91dCcsICdtb3VzZW92ZXInLFxuXHRcdFx0XHQgJ3Nob3cnIC8qIGNvbnRleHQgbWVudSAqL10sXG5cdFRvdWNoRXZlbnQ6IFsndG91Y2hzdGFydCcsICd0b3VjaGVuZCcsICd0b3VjaG1vdmUnLCAndG91Y2hlbnRlcicsICd0b3VjaGxlYXZlJywgJ3RvdWNoY2FuY2VsJ10sXG59O1xuXG5cbi8vIG1vY2sgd2luZG93IGFuZCBldmVudCBjb25zdHJ1Y3RvcnMgZm9yIHRlc3RpbmdcbmlmICh0eXBlb2Ygd2luZG93ICE9ICd1bmRlZmluZWQnKVxuXHR2YXIgZ2xvYmFsID0gd2luZG93O1xuZWxzZSB7XG5cdGdsb2JhbCA9IHt9O1xuXHRfLmVhY2hLZXkoZXZlbnRUeXBlcywgZnVuY3Rpb24oZVR5cGVzLCBldmVudENvbnN0cnVjdG9yTmFtZSkge1xuXHRcdHZhciBldmVudHNDb25zdHJ1Y3Rvcjtcblx0XHRldmFsKFxuXHRcdFx0J2V2ZW50c0NvbnN0cnVjdG9yID0gZnVuY3Rpb24gJyArIGV2ZW50Q29uc3RydWN0b3JOYW1lICsgJyh0eXBlLCBwcm9wZXJ0aWVzKSB7IFxcXG5cdFx0XHRcdHRoaXMudHlwZSA9IHR5cGU7IFxcXG5cdFx0XHRcdF8uZXh0ZW5kKHRoaXMsIHByb3BlcnRpZXMpOyBcXFxuXHRcdFx0fTsnXG5cdFx0KTtcblx0XHRnbG9iYWxbZXZlbnRDb25zdHJ1Y3Rvck5hbWVdID0gZXZlbnRzQ29uc3RydWN0b3I7XG5cdH0pO1xufVxuXG5cbnZhciBkb21FdmVudHNDb25zdHJ1Y3RvcnMgPSB7fTtcblxuXy5lYWNoS2V5KGV2ZW50VHlwZXMsIGZ1bmN0aW9uKGVUeXBlcywgZXZlbnRDb25zdHJ1Y3Rvck5hbWUpIHtcblx0ZVR5cGVzLmZvckVhY2goZnVuY3Rpb24odHlwZSkge1xuXHRcdGlmIChPYmplY3QuaGFzT3duUHJvcGVydHkoZG9tRXZlbnRzQ29uc3RydWN0b3JzLCB0eXBlKSlcblx0XHRcdHRocm93IG5ldyBFcnJvcignZHVwbGljYXRlIGV2ZW50IHR5cGUgJyArIHR5cGUpO1xuXG5cdFx0ZG9tRXZlbnRzQ29uc3RydWN0b3JzW3R5cGVdID0gZ2xvYmFsW2V2ZW50Q29uc3RydWN0b3JOYW1lXTtcblx0fSk7XG59KTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGRvbUV2ZW50c0NvbnN0cnVjdG9ycztcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIENsYXNzUmVnaXN0cnkgPSByZXF1aXJlKCcuLi9yZWdpc3RyeScpXG5cdCwgQ29tcG9uZW50ID0gcmVxdWlyZSgnLi9jX2NsYXNzJyk7XG5cbnZhciBjb21wb25lbnRzUmVnaXN0cnkgPSBuZXcgQ2xhc3NSZWdpc3RyeShDb21wb25lbnQpO1xuXG5jb21wb25lbnRzUmVnaXN0cnkuYWRkKENvbXBvbmVudCk7XG5cbm1vZHVsZS5leHBvcnRzID0gY29tcG9uZW50c1JlZ2lzdHJ5O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ29tcG9uZW50ID0gcmVxdWlyZSgnLi4vY19jbGFzcycpXG5cdCwgZmFjZXRzUmVnaXN0cnkgPSByZXF1aXJlKCcuLi9jX2ZhY2V0cy9jZl9yZWdpc3RyeScpXG5cdCwgY29tcG9uZW50c1JlZ2lzdHJ5ID0gcmVxdWlyZSgnLi4vY19yZWdpc3RyeScpO1xuXG5cbnZhciBWaWV3ID0gQ29tcG9uZW50LmNyZWF0ZUNvbXBvbmVudENsYXNzKCdWaWV3Jywge1xuXHRjb250YWluZXI6IGZhY2V0c1JlZ2lzdHJ5LmdldCgnQ29udGFpbmVyJylcbn0pO1xuXG5jb21wb25lbnRzUmVnaXN0cnkuYWRkKFZpZXcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZpZXc7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgncHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vY2hlY2snKVxuXHQsIE1hdGNoID0gY2hlY2suTWF0Y2g7XG5cbnZhciBtZXNzZW5nZXJNaXhpbiA9ICB7XG5cdGluaXRNZXNzZW5nZXI6IGluaXRNZXNzZW5nZXIsXG5cdG9uTWVzc2FnZTogcmVnaXN0ZXJTdWJzY3JpYmVyLFxuXHRvZmZNZXNzYWdlOiByZW1vdmVTdWJzY3JpYmVyLFxuXHRvbk1lc3NhZ2VzOiByZWdpc3RlclN1YnNjcmliZXJzLFxuXHRvZmZNZXNzYWdlczogcmVtb3ZlU3Vic2NyaWJlcnMsXG5cdHBvc3RNZXNzYWdlOiBwb3N0TWVzc2FnZSxcblx0Z2V0TWVzc2FnZVN1YnNjcmliZXJzOiBnZXRNZXNzYWdlU3Vic2NyaWJlcnMsXG5cdF9jaG9vc2VTdWJzY3JpYmVyc0hhc2g6IF9jaG9vc2VTdWJzY3JpYmVyc0hhc2hcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gbWVzc2VuZ2VyTWl4aW47XG5cblxuZnVuY3Rpb24gaW5pdE1lc3NlbmdlcigpIHtcblx0dGhpcy5fbWVzc2FnZVN1YnNjcmliZXJzID0ge307XG5cdHRoaXMuX3BhdHRlcm5NZXNzYWdlU3Vic2NyaWJlcnMgPSB7fTtcbn1cblxuXG5mdW5jdGlvbiByZWdpc3RlclN1YnNjcmliZXIobWVzc2FnZSwgc3Vic2NyaWJlcikge1xuXHRjaGVjayhtZXNzYWdlLCBNYXRjaC5PbmVPZihTdHJpbmcsIFJlZ0V4cCkpO1xuXHRjaGVjayhzdWJzY3JpYmVyLCBGdW5jdGlvbik7IFxuXG5cdHZhciBzdWJzY3JpYmVyc0hhc2ggPSB0aGlzLl9jaG9vc2VTdWJzY3JpYmVyc0hhc2gobWVzc2FnZSk7XG5cdHZhciBtc2dTdWJzY3JpYmVycyA9IHN1YnNjcmliZXJzSGFzaFttZXNzYWdlXSA9IHN1YnNjcmliZXJzSGFzaFttZXNzYWdlXSB8fCBbXTtcblx0dmFyIG5vdFlldFJlZ2lzdGVyZWQgPSBtc2dTdWJzY3JpYmVycy5pbmRleE9mKHN1YnNjcmliZXIpID09IC0xO1xuXG5cdGlmIChub3RZZXRSZWdpc3RlcmVkKVxuXHRcdG1zZ1N1YnNjcmliZXJzLnB1c2goc3Vic2NyaWJlcik7XG5cblx0cmV0dXJuIG5vdFlldFJlZ2lzdGVyZWQ7XG59XG5cblxuZnVuY3Rpb24gcmVnaXN0ZXJTdWJzY3JpYmVycyhtZXNzYWdlU3Vic2NyaWJlcnMpIHtcblx0Y2hlY2sobWVzc2FnZVN1YnNjcmliZXJzLCBNYXRjaC5PYmplY3QpO1xuXG5cdHZhciBub3RZZXRSZWdpc3RlcmVkTWFwID0gXy5tYXBLZXlzKG1lc3NhZ2VTdWJzY3JpYmVycywgZnVuY3Rpb24oc3Vic2NyaWJlciwgbWVzc2FnZSkge1xuXHRcdHJldHVybiB0aGlzLnJlZ2lzdGVyU3Vic2NyaWJlcihtZXNzYWdlLCBzdWJzY3JpYmVyKVxuXHR9LCB0aGlzKTtcblxuXHRyZXR1cm4gbm90WWV0UmVnaXN0ZXJlZE1hcDtcbn1cblxuXG4vLyByZW1vdmVzIGFsbCBzdWJzY3JpYmVycyBmb3IgdGhlIG1lc3NhZ2UgaWYgc3Vic2NyaWJlciBpc24ndCBzdXBwbGllZFxuZnVuY3Rpb24gcmVtb3ZlU3Vic2NyaWJlcihtZXNzYWdlLCBzdWJzY3JpYmVyKSB7XG5cdGNoZWNrKG1lc3NhZ2UsIE1hdGNoLk9uZU9mKFN0cmluZywgUmVnRXhwKSk7XG5cdGNoZWNrKHN1YnNjcmliZXIsIE1hdGNoLk9wdGlvbmFsKEZ1bmN0aW9uKSk7IFxuXG5cdHZhciBzdWJzY3JpYmVyc0hhc2ggPSB0aGlzLl9jaG9vc2VTdWJzY3JpYmVyc0hhc2gobWVzc2FnZSk7XG5cdHZhciBtc2dTdWJzY3JpYmVycyA9IHN1YnNjcmliZXJzSGFzaFttZXNzYWdlXTtcblx0aWYgKCEgbXNnU3Vic2NyaWJlcnMgfHwgISBtc2dTdWJzY3JpYmVycy5sZW5ndGgpIHJldHVybiBmYWxzZTtcblxuXHRpZiAoc3Vic2NyaWJlcikge1xuXHRcdHN1YnNjcmliZXJJbmRleCA9IG1zZ1N1YnNjcmliZXJzLmluZGV4T2Yoc3Vic2NyaWJlcik7XG5cdFx0aWYgKHN1YnNjcmliZXJJbmRleCA9PSAtMSkgcmV0dXJuIGZhbHNlO1xuXHRcdG1zZ1N1YnNjcmliZXJzLnNwbGljZShzdWJzY3JpYmVySW5kZXgsIDEpO1xuXHRcdGlmICghIG1zZ1N1YnNjcmliZXJzLmxlbmd0aClcblx0XHRcdGRlbGV0ZSBzdWJzY3JpYmVyc0hhc2hbbWVzc2FnZV07XG5cdH0gZWxzZVxuXHRcdGRlbGV0ZSBzdWJzY3JpYmVyc0hhc2hbbWVzc2FnZV07XG5cblx0cmV0dXJuIHRydWU7IC8vIHN1YnNjcmliZXIocykgcmVtb3ZlZFxufVxuXG5cbmZ1bmN0aW9uIHJlbW92ZVN1YnNjcmliZXJzKG1lc3NhZ2VTdWJzY3JpYmVycykge1xuXHRjaGVjayhtZXNzYWdlU3Vic2NyaWJlcnMsIE1hdGNoLk9iamVjdCk7XG5cblx0dmFyIHN1YnNjcmliZXJSZW1vdmVkTWFwID0gXy5tYXBLZXlzKG1lc3NhZ2VTdWJzY3JpYmVycywgZnVuY3Rpb24oc3Vic2NyaWJlciwgbWVzc2FnZSkge1xuXHRcdHJldHVybiB0aGlzLnJlZ2lzdGVyU3Vic2NyaWJlcihtZXNzYWdlLCBzdWJzY3JpYmVyKVxuXHR9LCB0aGlzKTtcblxuXHRyZXR1cm4gc3Vic2NyaWJlclJlbW92ZWRNYXA7XHRcbn1cblxuXG5mdW5jdGlvbiBwb3N0TWVzc2FnZShtZXNzYWdlLCBkYXRhKSB7XG5cdGNoZWNrKG1lc3NhZ2UsIE1hdGNoLk9uZU9mKFN0cmluZywgUmVnRXhwKSk7XG5cblx0dmFyIHN1YnNjcmliZXJzSGFzaCA9IHRoaXMuX2Nob29zZVN1YnNjcmliZXJzSGFzaChtZXNzYWdlKTtcblx0dmFyIG1zZ1N1YnNjcmliZXJzID0gc3Vic2NyaWJlcnNIYXNoW21lc3NhZ2VdO1xuXG5cdGNhbGxTdWJzY3JpYmVycyhtc2dTdWJzY3JpYmVycyk7XG5cblx0aWYgKG1lc3NhZ2UgaW5zdGFuY2VvZiBTdHJpbmcpIHtcblx0XHRfLmVhY2hLZXkodGhpcy5fcGF0dGVybk1lc3NhZ2VTdWJzY3JpYmVycywgXG5cdFx0XHRmdW5jdGlvbihwYXR0ZXJuU3Vic2NyaWJlcnMsIHBhdHRlcm4pIHtcblx0XHRcdFx0aWYgKHBhdHRlcm4udGVzdChtZXNzYWdlKSlcblx0XHRcdFx0XHRjYWxsU3Vic2NyaWJlcnMocGF0dGVyblN1YnNjcmliZXJzKTtcblx0XHRcdH1cblx0XHQpO1xuXHR9XG5cblx0ZnVuY3Rpb24gY2FsbFN1YnNjcmliZXJzKG1zZ1N1YnNjcmliZXJzKSB7XG5cdFx0bXNnU3Vic2NyaWJlcnMuZm9yRWFjaChmdW5jdGlvbihzdWJzY3JpYmVyKSB7XG5cdFx0XHRzdWJzY3JpYmVyKG1lc3NhZ2UsIGRhdGEpO1xuXHRcdH0pO1xuXHR9XG59XG5cblxuZnVuY3Rpb24gZ2V0TWVzc2FnZVN1YnNjcmliZXJzKG1lc3NhZ2UsIGluY2x1ZGVQYXR0ZXJuU3Vic2NyaWJlcnMpIHtcblx0Y2hlY2sobWVzc2FnZSwgTWF0Y2guT25lT2YoU3RyaW5nLCBSZWdFeHApKTtcblxuXHR2YXIgc3Vic2NyaWJlcnNIYXNoID0gdGhpcy5fY2hvb3NlU3Vic2NyaWJlcnNIYXNoKG1lc3NhZ2UpO1xuXHR2YXIgbXNnU3Vic2NyaWJlcnMgPSBtc2dTdWJzY3JpYmVyc1xuXHRcdFx0XHRcdFx0XHQ/IFtdLmNvbmNhdChzdWJzY3JpYmVyc0hhc2hbbWVzc2FnZV0pXG5cdFx0XHRcdFx0XHRcdDogW107XG5cblx0Ly8gcGF0dGVybiBzdWJzY3JpYmVycyBhcmUgaW5jdWRlZCBieSBkZWZhdWx0XG5cdGlmIChpbmNsdWRlUGF0dGVyblN1YnNjcmliZXJzICE9IGZhbHNlICYmIG1lc3NhZ2UgaW5zdGFuY2VvZiBTdHJpbmcpIHtcblx0XHRfLmVhY2hLZXkodGhpcy5fcGF0dGVybk1lc3NhZ2VTdWJzY3JpYmVycywgXG5cdFx0XHRmdW5jdGlvbihwYXR0ZXJuU3Vic2NyaWJlcnMsIHBhdHRlcm4pIHtcblx0XHRcdFx0aWYgKHBhdHRlcm5TdWJzY3JpYmVycyAmJiBwYXR0ZXJuU3Vic2NyaWJlcnMubGVuZ3RoXG5cdFx0XHRcdFx0XHQmJiBwYXR0ZXJuLnRlc3QobWVzc2FnZSkpXG5cdFx0XHRcdFx0Xy5hcHBlbmRBcnJheShtc2dTdWJzY3JpYmVycywgcGF0dGVyblN1YnNjcmliZXJzKTtcblx0XHRcdH1cblx0XHQpO1xuXHR9XG5cblx0cmV0dXJuIG1zZ1N1YnNjcmliZXJzLmxlbmd0aFxuXHRcdFx0XHQ/IG1zZ1N1YnNjcmliZXJzXG5cdFx0XHRcdDogdW5kZWZpbmVkO1xufVxuXG5cbmZ1bmN0aW9uIF9jaG9vc2VTdWJzY3JpYmVyc0hhc2gobWVzc2FnZSkge1xuXHRyZXR1cm4gbWVzc2FnZSBpbnN0YW5jZW9mIFJlZ0V4cFxuXHRcdFx0XHQ/IHRoaXMuX3BhdHRlcm5NZXNzYWdlU3Vic2NyaWJlcnNcblx0XHRcdFx0OiB0aGlzLl9tZXNzYWdlU3Vic2NyaWJlcnM7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgncHJvdG8nKTtcblxubW9kdWxlLmV4cG9ydHMgPSBGYWNldDtcblxuZnVuY3Rpb24gRmFjZXQob3duZXIsIG9wdGlvbnMpIHtcblx0dGhpcy5vd25lciA9IG93bmVyO1xuXHR0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuXHR0aGlzLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn1cblxuXy5leHRlbmRQcm90byhGYWNldCwge1xuXHRpbml0OiBmdW5jdGlvbigpIHt9XG59KTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIEZhY2V0ID0gcmVxdWlyZSgnLi9mX2NsYXNzJylcblx0LCBfID0gcmVxdWlyZSgncHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vY2hlY2snKVxuXHQsIE1hdGNoID0gY2hlY2suTWF0Y2g7XG5cbm1vZHVsZS5leHBvcnRzID0gRmFjZXRlZE9iamVjdDtcblxuLy8gYWJzdHJhY3QgY2xhc3MgZm9yIGZhY2V0ZWQgb2JqZWN0XG5mdW5jdGlvbiBGYWNldGVkT2JqZWN0KGZhY2V0c09wdGlvbnMgLyosIG90aGVyIGFyZ3MgLSBwYXNzZWQgdG8gaW5pdCBtZXRob2QgKi8pIHtcblx0Ly8gVE9ETyBpbnN0YW50aWF0ZSBmYWNldHMgaWYgY29uZmlndXJhdGlvbiBpc24ndCBwYXNzZWRcblx0Ly8gd3JpdGUgYSB0ZXN0IHRvIGNoZWNrIGl0XG5cdGZhY2V0c09wdGlvbnMgPSBmYWNldHNPcHRpb25zID8gXy5jbG9uZShmYWNldHNPcHRpb25zKSA6IHt9O1xuXG5cdHZhciB0aGlzQ2xhc3MgPSB0aGlzLmNvbnN0cnVjdG9yXG5cdFx0LCBmYWNldHMgPSB7fTtcblxuXHRpZiAodGhpcy5jb25zdHJ1Y3RvciA9PSBGYWNldGVkT2JqZWN0KVx0XHRcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ0ZhY2V0ZWRPYmplY3QgaXMgYW4gYWJzdHJhY3QgY2xhc3MsIGNhblxcJ3QgYmUgaW5zdGFudGlhdGVkJyk7XG5cdGlmICghIHRoaXNDbGFzcy5wcm90b3R5cGUuZmFjZXRzKVxuXHRcdHRocm93IG5ldyBFcnJvcignTm8gZmFjZXRzIGRlZmluZWQgaW4gY2xhc3MgJyArIHRoaXMuY29uc3RydWN0b3IubmFtZSk7XG5cdFxuXHQvLyBfLmVhY2hLZXkoZmFjZXRzT3B0aW9ucywgaW5zdGFudGlhdGVGYWNldCwgdGhpcywgdHJ1ZSk7XG5cblx0Xy5lYWNoS2V5KHRoaXMuZmFjZXRzLCBpbnN0YW50aWF0ZUZhY2V0LCB0aGlzLCB0cnVlKTtcblxuXHR2YXIgdW51c2VkRmFjZXRzTmFtZXMgPSBPYmplY3Qua2V5cyhmYWNldHNPcHRpb25zKTtcblx0aWYgKHVudXNlZEZhY2V0c05hbWVzLmxlbmd0aClcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ0NvbmZpZ3VyYXRpb24gZm9yIHVua25vd24gZmFjZXQocykgcGFzc2VkOiAnICsgdW51c2VkRmFjZXRzTmFtZXMuam9pbignLCAnKSk7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnRpZXModGhpcywgZmFjZXRzKTtcblxuXHQvLyBjYWxsaW5nIGluaXQgaWYgaXQgaXMgZGVmaW5lZCBpbiB0aGUgY2xhc3Ncblx0aWYgKHRoaXMuaW5pdClcblx0XHR0aGlzLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuXHRmdW5jdGlvbiBpbnN0YW50aWF0ZUZhY2V0KC8qIGZhY2V0T3B0cyAqLyBmYWNldENsYXNzLCBmY3QpIHtcblx0XHQvLyB2YXIgZmFjZXRDbGFzcyA9IHRoaXMuZmFjZXRzW2ZjdF07XG5cdFx0dmFyIGZhY2V0T3B0cyA9IGZhY2V0c09wdGlvbnNbZmN0XTtcblx0XHRkZWxldGUgZmFjZXRzT3B0aW9uc1tmY3RdO1xuXG5cdFx0ZmFjZXRzW2ZjdF0gPSB7XG5cdFx0XHRlbnVtZXJhYmxlOiBmYWxzZSxcblx0XHRcdHZhbHVlOiBuZXcgZmFjZXRDbGFzcyh0aGlzLCBmYWNldE9wdHMpXG5cdFx0fTtcblx0fVxufVxuXG5cbi8vIGZhY3RvcnkgdGhhdCBjcmVhdGVzIGNsYXNzZXMgKGNvbnN0cnVjdG9ycykgZnJvbSB0aGUgbWFwIG9mIGZhY2V0c1xuLy8gdGhlc2UgY2xhc3NlcyBpbmhlcml0IGZyb20gRmFjZXRlZE9iamVjdFxuRmFjZXRlZE9iamVjdC5jcmVhdGVGYWNldGVkQ2xhc3MgPSBmdW5jdGlvbiAobmFtZSwgZmFjZXRzQ2xhc3Nlcykge1xuXHRjaGVjayhuYW1lLCBTdHJpbmcpO1xuXHRjaGVjayhmYWNldHNDbGFzc2VzLCBNYXRjaC5PYmplY3RIYXNoKEZ1bmN0aW9uIC8qIE1hdGNoLlN1YmNsYXNzKEZhY2V0LCB0cnVlKSBUT0RPIC0gZml4ICovKSk7XG5cblx0dmFyIEZhY2V0ZWRDbGFzcyA9IF8uY3JlYXRlU3ViY2xhc3ModGhpcywgbmFtZSwgdHJ1ZSk7XG5cblx0Xy5leHRlbmRQcm90byhGYWNldGVkQ2xhc3MsIHtcblx0XHRmYWNldHM6IGZhY2V0c0NsYXNzZXNcblx0fSk7XG5cdHJldHVybiBGYWNldGVkQ2xhc3M7XG59O1xuXG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBtaWxvID0ge1xuXHRiaW5kZXI6IHJlcXVpcmUoJy4vYmluZGVyL2JpbmRlcicpXG59XG5cblxuLy8gdXNlZCBmYWNldHNcbnJlcXVpcmUoJy4vY29tcG9uZW50cy9jX2ZhY2V0cy9Db250YWluZXInKTtcbnJlcXVpcmUoJy4vY29tcG9uZW50cy9jX2ZhY2V0cy9FdmVudHMnKTtcbnJlcXVpcmUoJy4vY29tcG9uZW50cy9jX2ZhY2V0cy9Nb2RlbCcpO1xuXG4vLyB1c2VkIGNvbXBvbmVudHNcbnJlcXVpcmUoJy4vY29tcG9uZW50cy9jbGFzc2VzL0VsZW1lbnQnKTtcbnJlcXVpcmUoJy4vY29tcG9uZW50cy9jbGFzc2VzL1ZpZXcnKTtcblxuXG5pZiAodHlwZW9mIG1vZHVsZSA9PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cylcblx0Ly8gZXhwb3J0IGZvciBub2RlL2Jyb3dzZXJpZnlcblx0bW9kdWxlLmV4cG9ydHMgPSBtaWxvO1xuXG5pZiAodHlwZW9mIHdpbmRvdyA9PSAnb2JqZWN0Jylcblx0d2luZG93Lm1pbG8gPSBtaWxvO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ3Byb3RvJylcblx0LCBjaGVjayA9IHJlcXVpcmUoJy4vY2hlY2snKVxuXHQsIE1hdGNoID0gY2hlY2suTWF0Y2g7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2xhc3NSZWdpc3RyeTtcblxuZnVuY3Rpb24gQ2xhc3NSZWdpc3RyeSAoRm91bmRhdGlvbkNsYXNzKSB7XG5cdGlmIChGb3VuZGF0aW9uQ2xhc3MpXG5cdFx0dGhpcy5zZXRDbGFzcyhGb3VuZGF0aW9uQ2xhc3MpO1xuXG5cdC8vIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnX19yZWdpc3RlcmVkQ2xhc3NlcycsIHtcblx0Ly8gXHRcdGVudW1lcmFibGU6IGZhbHNlLFxuXHQvLyBcdFx0d3JpdGFibGU6IHRydWUsXG5cdC8vIFx0XHRjb25maWd1cmFibGU6IHRydWUsXG5cdC8vIFx0XHR2YWx1ZToge31cblx0Ly8gfSk7XG5cblx0dGhpcy5fX3JlZ2lzdGVyZWRDbGFzc2VzID0ge307XG59XG5cbl8uZXh0ZW5kUHJvdG8oQ2xhc3NSZWdpc3RyeSwge1xuXHRhZGQ6IHJlZ2lzdGVyQ2xhc3MsXG5cdGdldDogZ2V0Q2xhc3MsXG5cdHJlbW92ZTogdW5yZWdpc3RlckNsYXNzLFxuXHRjbGVhbjogdW5yZWdpc3RlckFsbENsYXNzZXMsXG5cdHNldENsYXNzOiBzZXRGb3VuZGF0aW9uQ2xhc3Ncbn0pO1xuXG5cbmZ1bmN0aW9uIHNldEZvdW5kYXRpb25DbGFzcyhGb3VuZGF0aW9uQ2xhc3MpIHtcblx0Y2hlY2soRm91bmRhdGlvbkNsYXNzLCBGdW5jdGlvbik7XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnRm91bmRhdGlvbkNsYXNzJywge1xuXHRcdGVudW1lcmFibGU6IHRydWUsXG5cdFx0dmFsdWU6IEZvdW5kYXRpb25DbGFzc1xuXHR9KTtcbn1cblxuZnVuY3Rpb24gcmVnaXN0ZXJDbGFzcyhhQ2xhc3MsIG5hbWUpIHtcblx0bmFtZSA9IG5hbWUgfHwgYUNsYXNzLm5hbWU7XG5cblx0Y2hlY2sobmFtZSwgU3RyaW5nLCAnY2xhc3MgbmFtZSBtdXN0IGJlIHN0cmluZycpO1xuXHRjaGVjayhuYW1lLCBNYXRjaC5XaGVyZShmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gdHlwZW9mIG5hbWUgPT0gJ3N0cmluZycgJiYgbmFtZSAhPSAnJztcblx0fSksICdjbGFzcyBuYW1lIG11c3QgYmUgc3RyaW5nJyk7XG5cdGlmICh0aGlzLkZvdW5kYXRpb25DbGFzcykge1xuXHRcdGlmIChhQ2xhc3MgIT0gdGhpcy5Gb3VuZGF0aW9uQ2xhc3MpXG5cdFx0XHRjaGVjayhhQ2xhc3MsIE1hdGNoLlN1YmNsYXNzKHRoaXMuRm91bmRhdGlvbkNsYXNzKSwgJ2NsYXNzIG11c3QgYmUgYSBzdWIoY2xhc3MpIG9mIGEgZm91bmRhdGlvbiBjbGFzcycpO1xuXHR9IGVsc2Vcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdmb3VuZGF0aW9uIGNsYXNzIG11c3QgYmUgc2V0IGJlZm9yZSBhZGRpbmcgY2xhc3NlcyB0byByZWdpc3RyeScpO1xuXG5cdGlmICh0aGlzLl9fcmVnaXN0ZXJlZENsYXNzZXNbbmFtZV0pXG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignaXMgYWxyZWFkeSByZWdpc3RlcmVkJyk7XG5cblx0dGhpcy5fX3JlZ2lzdGVyZWRDbGFzc2VzW25hbWVdID0gYUNsYXNzO1xufTtcblxuXG5mdW5jdGlvbiBnZXRDbGFzcyhuYW1lKSB7XG5cdGNoZWNrKG5hbWUsIFN0cmluZywgJ2NsYXNzIG5hbWUgbXVzdCBiZSBzdHJpbmcnKTtcblx0cmV0dXJuIHRoaXMuX19yZWdpc3RlcmVkQ2xhc3Nlc1tuYW1lXTtcbn07XG5cblxuZnVuY3Rpb24gdW5yZWdpc3RlckNsYXNzKG5hbWVPckNsYXNzKSB7XG5cdGNoZWNrKG5hbWVPckNsYXNzLCBNYXRjaC5PbmVPZihTdHJpbmcsIEZ1bmN0aW9uKSwgJ2NsYXNzIG9yIG5hbWUgbXVzdCBiZSBzdXBwbGllZCcpO1xuXG5cdHZhciBuYW1lID0gdHlwZW9mIG5hbWVPckNsYXNzID09ICdzdHJpbmcnXG5cdFx0XHRcdFx0XHQ/IG5hbWVPckNsYXNzXG5cdFx0XHRcdFx0XHQ6IG5hbWVPckNsYXNzLm5hbWU7XG5cdFx0XHRcdFx0XHRcblx0aWYgKCEgdGhpcy5fX3JlZ2lzdGVyZWRDbGFzc2VzW25hbWVdKVxuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ2NsYXNzIGlzIG5vdCByZWdpc3RlcmVkJyk7XG5cblx0ZGVsZXRlIHRoaXMuX19yZWdpc3RlcmVkQ2xhc3Nlc1tuYW1lXTtcbn07XG5cblxuZnVuY3Rpb24gdW5yZWdpc3RlckFsbENsYXNzZXMoKSB7XG5cdHRoaXMuX19yZWdpc3RlcmVkQ2xhc3NlcyA9IHt9O1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIF87XG52YXIgcHJvdG8gPSBfID0ge1xuXHRleHRlbmRQcm90bzogZXh0ZW5kUHJvdG8sXG5cdGV4dGVuZDogZXh0ZW5kLFxuXHRjbG9uZTogY2xvbmUsXG5cdGNyZWF0ZVN1YmNsYXNzOiBjcmVhdGVTdWJjbGFzcyxcblx0bWFrZVN1YmNsYXNzOiBtYWtlU3ViY2xhc3MsXG5cdGFsbEtleXM6IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzLmJpbmQoT2JqZWN0KSxcblx0a2V5T2Y6IGtleU9mLFxuXHRhbGxLZXlzT2Y6IGFsbEtleXNPZixcblx0ZWFjaEtleTogZWFjaEtleSxcblx0bWFwS2V5czogbWFwS2V5cyxcblx0YXBwZW5kQXJyYXk6IGFwcGVuZEFycmF5LFxuXHRwcmVwZW5kQXJyYXk6IHByZXBlbmRBcnJheVxufTtcblxuXG5pZiAodHlwZW9mIHdpbmRvdyA9PSAnb2JqZWN0Jykge1xuXHQvLyBwcmVzZXJ2ZSBleGlzdGluZyBfIG9iamVjdFxuXHRpZiAod2luZG93Ll8pXG5cdFx0cHJvdG8udW5kZXJzY29yZSA9IHdpbmRvdy5fXG5cblx0Ly8gZXhwb3NlIGdsb2JhbCBfXG5cdHdpbmRvdy5fID0gcHJvdG87XG59XG5cbmlmICh0eXBlb2YgbW9kdWxlID09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKVxuXHQvLyBleHBvcnQgZm9yIG5vZGUvYnJvd3NlcmlmeVxuXHRtb2R1bGUuZXhwb3J0cyA9IHByb3RvO1xuXHRcblxuZnVuY3Rpb24gZXh0ZW5kUHJvdG8oc2VsZiwgbWV0aG9kcykge1xuXHR2YXIgcHJvcERlc2NyaXB0b3JzID0ge307XG5cblx0Xy5lYWNoS2V5KG1ldGhvZHMsIGZ1bmN0aW9uKG1ldGhvZCwgbmFtZSkge1xuXHRcdHByb3BEZXNjcmlwdG9yc1tuYW1lXSA9IHtcblx0XHRcdGVudW1lcmFibGU6IGZhbHNlLFxuXHRcdFx0Y29uZmlndXJhYmxlOiBmYWxzZSxcblx0XHRcdHdyaXRhYmxlOiBmYWxzZSxcblx0XHRcdHZhbHVlOiBtZXRob2Rcblx0XHR9O1xuXHR9KTtcblxuXHRPYmplY3QuZGVmaW5lUHJvcGVydGllcyhzZWxmLnByb3RvdHlwZSwgcHJvcERlc2NyaXB0b3JzKTtcblx0cmV0dXJuIHNlbGY7XG59XG5cblxuZnVuY3Rpb24gZXh0ZW5kKHNlbGYsIG9iaiwgb25seUVudW1lcmFibGUpIHtcblx0dmFyIHByb3BEZXNjcmlwdG9ycyA9IHt9O1xuXG5cdF8uZWFjaEtleShvYmosIGZ1bmN0aW9uKHZhbHVlLCBwcm9wKSB7XG5cdFx0dmFyIGRlc2NyaXB0b3IgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG9iaiwgcHJvcCk7XG5cdFx0cHJvcERlc2NyaXB0b3JzW3Byb3BdID0gZGVzY3JpcHRvcjtcblx0fSwgdGhpcywgb25seUVudW1lcmFibGUpO1xuXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHNlbGYsIHByb3BEZXNjcmlwdG9ycyk7XG5cblx0cmV0dXJuIHNlbGY7XG59XG5cblxuZnVuY3Rpb24gY2xvbmUob2JqKSB7XG5cdHZhciBjbG9uZWRPYmplY3QgPSBPYmplY3QuY3JlYXRlKG9iai5jb25zdHJ1Y3Rvci5wcm90b3R5cGUpO1xuXHRfLmV4dGVuZChjbG9uZWRPYmplY3QsIG9iaik7XG5cdHJldHVybiBjbG9uZWRPYmplY3Q7XG59XG5cblxuZnVuY3Rpb24gY3JlYXRlU3ViY2xhc3ModGhpc0NsYXNzLCBuYW1lLCBhcHBseUNvbnN0cnVjdG9yKSB7XG5cdHZhciBzdWJjbGFzcztcblxuXHQvLyBuYW1lIGlzIG9wdGlvbmFsXG5cdG5hbWUgPSBuYW1lIHx8ICcnO1xuXG5cdC8vIGFwcGx5IHN1cGVyY2xhc3MgY29uc3RydWN0b3Jcblx0dmFyIGNvbnN0cnVjdG9yQ29kZSA9IGFwcGx5Q29uc3RydWN0b3IgPT09IGZhbHNlXG5cdFx0XHQ/ICcnXG5cdFx0XHQ6ICd0aGlzQ2xhc3MuYXBwbHkodGhpcywgYXJndW1lbnRzKTsnO1xuXG5cdGV2YWwoJ3N1YmNsYXNzID0gZnVuY3Rpb24gJyArIG5hbWUgKyAnKCl7ICcgKyBjb25zdHJ1Y3RvckNvZGUgKyAnIH0nKTtcblxuXHQvLyBwcHJvdG90eXBlIGNoYWluXG5cdHN1YmNsYXNzLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUodGhpc0NsYXNzLnByb3RvdHlwZSk7XG5cdC8vIHN1YmNsYXNzIGlkZW50aXR5XG5cdHN1YmNsYXNzLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IHN1YmNsYXNzO1xuXHQvLyBjb3B5IGNsYXNzIG1ldGhvZHNcblx0Ly8gLSBmb3IgdGhlbSB0byB3b3JrIGNvcnJlY3RseSB0aGV5IHNob3VsZCBub3QgZXhwbGljdGx5IHVzZSBzdXBlcmNsYXNzIG5hbWVcblx0Ly8gYW5kIHVzZSBcInRoaXNcIiBpbnN0ZWFkXG5cdF8uZXh0ZW5kKHN1YmNsYXNzLCB0aGlzQ2xhc3MsIHRydWUpO1xuXG5cdHJldHVybiBzdWJjbGFzcztcbn1cblxuXG5mdW5jdGlvbiBtYWtlU3ViY2xhc3ModGhpc0NsYXNzLCBTdXBlcmNsYXNzKSB7XG5cdHRoaXNDbGFzcy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFN1cGVyY2xhc3MucHJvdG90eXBlKTtcblx0dGhpc0NsYXNzLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IHRoaXNDbGFzcztcblx0cmV0dXJuIHRoaXNDbGFzcztcbn1cblxuXG5mdW5jdGlvbiBrZXlPZihzZWxmLCBzZWFyY2hFbGVtZW50LCBvbmx5RW51bWVyYWJsZSkge1xuXHR2YXIgcHJvcGVydGllcyA9IG9ubHlFbnVtZXJhYmxlIFxuXHRcdFx0XHRcdFx0PyBPYmplY3Qua2V5cyhzZWxmKVxuXHRcdFx0XHRcdFx0OiBfLmFsbEtleXMoc2VsZik7XG5cblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wZXJ0aWVzLmxlbmd0aDsgaSsrKVxuXHRcdGlmIChzZWFyY2hFbGVtZW50ID09PSBzZWxmW3Byb3BlcnRpZXNbaV1dKVxuXHRcdFx0cmV0dXJuIHByb3BlcnRpZXNbaV07XG5cdFxuXHRyZXR1cm4gdW5kZWZpbmVkO1xufVxuXG5cbmZ1bmN0aW9uIGFsbEtleXNPZihzZWxmLCBzZWFyY2hFbGVtZW50LCBvbmx5RW51bWVyYWJsZSkge1xuXHR2YXIgcHJvcGVydGllcyA9IG9ubHlFbnVtZXJhYmxlIFxuXHRcdFx0XHRcdFx0PyBPYmplY3Qua2V5cyhzZWxmKVxuXHRcdFx0XHRcdFx0OiBfLmFsbEtleXMoc2VsZik7XG5cblx0dmFyIGtleXMgPSBwcm9wZXJ0aWVzLmZpbHRlcihmdW5jdGlvbihwcm9wKSB7XG5cdFx0cmV0dXJuIHNlYXJjaEVsZW1lbnQgPT09IHNlbGZbcHJvcF07XG5cdH0pO1xuXG5cdHJldHVybiBrZXlzO1xufVxuXG5cbmZ1bmN0aW9uIGVhY2hLZXkoc2VsZiwgY2FsbGJhY2ssIHRoaXNBcmcsIG9ubHlFbnVtZXJhYmxlKSB7XG5cdHZhciBwcm9wZXJ0aWVzID0gb25seUVudW1lcmFibGUgXG5cdFx0XHRcdFx0XHQ/IE9iamVjdC5rZXlzKHNlbGYpXG5cdFx0XHRcdFx0XHQ6IF8uYWxsS2V5cyhzZWxmKTtcblxuXHRwcm9wZXJ0aWVzLmZvckVhY2goZnVuY3Rpb24ocHJvcCkge1xuXHRcdGNhbGxiYWNrLmNhbGwodGhpc0FyZywgc2VsZltwcm9wXSwgcHJvcCwgc2VsZik7XG5cdH0pO1xufVxuXG5cbmZ1bmN0aW9uIG1hcEtleXMoc2VsZiwgY2FsbGJhY2ssIHRoaXNBcmcsIG9ubHlFbnVtZXJhYmxlKSB7XG5cdHZhciBtYXBSZXN1bHQgPSB7fTtcblx0Xy5lYWNoS2V5KHNlbGYsIG1hcFByb3BlcnR5LCB0aGlzQXJnLCBvbmx5RW51bWVyYWJsZSk7XG5cdHJldHVybiBtYXBSZXN1bHQ7XG5cblx0ZnVuY3Rpb24gbWFwUHJvcGVydHkodmFsdWUsIGtleSkge1xuXHRcdHZhciBkZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihzZWxmLCBrZXkpO1xuXHRcdGlmIChkZXNjcmlwdG9yLmVudW1lcmFibGUgfHwgISBvbmx5RW51bWVyYWJsZSkge1xuXHRcdFx0ZGVzY3JpcHRvci52YWx1ZSA9IGNhbGxiYWNrLmNhbGwodGhpcywgdmFsdWUsIGtleSwgc2VsZik7XG5cdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkobWFwUmVzdWx0LCBrZXksIGRlc2NyaXB0b3IpO1xuXHRcdH1cblx0fVxufVxuXG5cbmZ1bmN0aW9uIGFwcGVuZEFycmF5KHNlbGYsIGFyclRvQXBwZW5kKSB7XG5cdGlmICghIGFyclRvQXBwZW5kLmxlbmd0aCkgcmV0dXJuIHNlbGY7XG5cbiAgICB2YXIgYXJncyA9IFtzZWxmLmxlbmd0aCwgMF0uY29uY2F0KGFyclRvQXBwZW5kKTtcbiAgICBBcnJheS5wcm90b3R5cGUuc3BsaWNlLmFwcGx5KHNlbGYsIGFyZ3MpO1xuXG4gICAgcmV0dXJuIHNlbGY7XG59XG5cblxuZnVuY3Rpb24gcHJlcGVuZEFycmF5KHNlbGYsIGFyclRvUHJlcGVuZCkge1xuXHRpZiAoISBhcnJUb1ByZXBlbmQubGVuZ3RoKSByZXR1cm4gc2VsZjtcblxuICAgIHZhciBhcmdzID0gWzAsIDBdLmNvbmNhdChhcnJUb1ByZXBlbmQpO1xuICAgIEFycmF5LnByb3RvdHlwZS5zcGxpY2UuYXBwbHkoc2VsZiwgYXJncyk7XG5cbiAgICByZXR1cm4gc2VsZjtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuZGVzY3JpYmUoJ21pbG8gYmluZGVyJywgZnVuY3Rpb24oKSB7XG4gICAgaXQoJ3Nob3VsZCBiaW5kIGNvbXBvbmVudHMgYmFzZWQgb24gbWwtYmluZCBhdHRyaWJ1dGUnLCBmdW5jdGlvbigpIHtcbiAgICBcdHZhciBtaWxvID0gcmVxdWlyZSgnLi4vLi4vbGliL21pbG8nKTtcblxuXHRcdGV4cGVjdCh7cDogMX0pLnByb3BlcnR5KCdwJywgMSk7XG5cbiAgICBcdHZhciBjb21wb25lbnRzID0gbWlsby5iaW5kZXIoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3ZpZXdUb0JpbmQnKSk7XG4gICAgXHRcblx0XHRjb25zb2xlLmxvZyhjb21wb25lbnRzKTtcbiAgICB9KTtcbn0pO1xuIl19
;