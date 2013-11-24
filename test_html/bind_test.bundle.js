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
	//if (! thisClass.prototype.facets)
	//	throw new Error('No facets defined in class ' + this.constructor.name);
	
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
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2JpbmRlci9hdHRyaWJ1dGUuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2JpbmRlci9iaW5kZXIuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2JpbmRlci9lcnJvci5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY2hlY2suanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19jbGFzcy5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX2ZhY2V0LmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfZmFjZXRzL0NvbnRhaW5lci5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX2ZhY2V0cy9FdmVudHMuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19mYWNldHMvTW9kZWwuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19mYWNldHMvY2ZfcmVnaXN0cnkuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19mYWNldHMvZG9tX2V2ZW50cy5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX3JlZ2lzdHJ5LmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NsYXNzZXMvVmlldy5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9tZXNzZW5nZXIuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2ZhY2V0cy9mX2NsYXNzLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9mYWNldHMvZl9vYmplY3QuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL21pbG8uanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL3JlZ2lzdHJ5LmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL25vZGVfbW9kdWxlcy9wcm90by9saWIvcHJvdG8uanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vdGVzdF9odG1sL2JpbmRfdGVzdC9iaW5kX3Rlc3QuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDblhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0xBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgncHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vY2hlY2snKVxuXHQsIE1hdGNoID0gY2hlY2suTWF0Y2hcblx0LCBCaW5kRXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yJyk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBBdHRyaWJ1dGU7XG5cbmZ1bmN0aW9uIEF0dHJpYnV0ZShlbCwgbmFtZSkge1xuXHR0aGlzLm5hbWUgPSBuYW1lO1xuXHR0aGlzLmVsID0gZWw7XG5cdHRoaXMubm9kZSA9IGVsLmF0dHJpYnV0ZXNbbmFtZV07XG59XG5cbl8uZXh0ZW5kUHJvdG8oQXR0cmlidXRlLCB7XG5cdGdldDogZ2V0QXR0cmlidXRlVmFsdWUsXG5cdHNldDogc2V0QXR0cmlidXRlVmFsdWUsXG5cdHBhcnNlOiBwYXJzZUF0dHJpYnV0ZSxcblx0dmFsaWRhdGU6IHZhbGlkYXRlQXR0cmlidXRlXG59KTtcblxuXG5mdW5jdGlvbiBnZXRBdHRyaWJ1dGVWYWx1ZSgpIHtcblx0cmV0dXJuIHRoaXMuZWwuZ2V0QXR0cmlidXRlKHRoaXMubmFtZSk7XG59XG5cbmZ1bmN0aW9uIHNldEF0dHJpYnV0ZVZhbHVlKHZhbHVlKSB7XG5cdHRoaXMuZWwuc2V0QXR0cmlidXRlKHRoaXMubmFtZSwgdmFsdWUpO1xufVxuXG5mdW5jdGlvbiBwYXJzZUF0dHJpYnV0ZSgpIHtcblx0aWYgKCEgdGhpcy5ub2RlKSByZXR1cm47XG5cblx0dmFyIHZhbHVlID0gdGhpcy5nZXQoKTtcblxuXHRpZiAodmFsdWUpXG5cdFx0dmFyIGJpbmRUbyA9IHZhbHVlLnNwbGl0KCc6Jyk7XG5cblx0c3dpdGNoIChiaW5kVG8gJiYgYmluZFRvLmxlbmd0aCkge1xuXHRcdGNhc2UgMTpcblx0XHRcdHRoaXMuY29tcE5hbWUgPSBiaW5kVG9bMF07XG5cdFx0XHR0aGlzLmNvbXBDbGFzcyA9ICdDb21wb25lbnQnO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cblx0XHRjYXNlIDI6XG5cdFx0XHR0aGlzLmNvbXBOYW1lID0gYmluZFRvWzFdO1xuXHRcdFx0dGhpcy5jb21wQ2xhc3MgPSBiaW5kVG9bMF07XG5cdFx0XHRyZXR1cm4gdGhpcztcblxuXHRcdGRlZmF1bHQ6XG5cdFx0XHR0aHJvdyBuZXcgQmluZEVycm9yKCdpbnZhbGlkIGJpbmQgYXR0cmlidXRlICcgKyB2YWx1ZSk7XG5cdH1cbn1cblxuZnVuY3Rpb24gdmFsaWRhdGVBdHRyaWJ1dGUoKSB7XG5cdHZhciBjb21wTmFtZSA9IHRoaXMuY29tcE5hbWU7XG5cdGNoZWNrKGNvbXBOYW1lLCBNYXRjaC5XaGVyZShmdW5jdGlvbigpIHtcbiAgXHRcdHJldHVybiB0eXBlb2YgY29tcE5hbWUgPT0gJ3N0cmluZycgJiYgY29tcE5hbWUgIT0gJyc7XG5cdH0pLCAnZW1wdHkgY29tcG9uZW50IG5hbWUnKTtcblxuXHRpZiAoISB0aGlzLmNvbXBDbGFzcylcblx0XHR0aHJvdyBuZXcgQmluZEVycm9yKCdlbXB0eSBjb21wb25lbnQgY2xhc3MgbmFtZSAnICsgdGhpcy5jb21wQ2xhc3MpO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgY29tcG9uZW50c1JlZ2lzdHJ5ID0gcmVxdWlyZSgnLi4vY29tcG9uZW50cy9jX3JlZ2lzdHJ5Jylcblx0LCBDb21wb25lbnQgPSBjb21wb25lbnRzUmVnaXN0cnkuZ2V0KCdDb21wb25lbnQnKVxuXHQsIEF0dHJpYnV0ZSA9IHJlcXVpcmUoJy4vYXR0cmlidXRlJylcblx0LCBCaW5kRXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yJylcblx0LCBfID0gcmVxdWlyZSgncHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vY2hlY2snKVxuXHQsIE1hdGNoID0gIGNoZWNrLk1hdGNoO1xuXG5cbnZhciBvcHRzID0ge1xuXHRCSU5EX0FUVFI6ICdtbC1iaW5kJ1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGJpbmRlcjtcblxuZnVuY3Rpb24gYmluZGVyKHNjb3BlRWwsIGJpbmRTY29wZUVsKSB7XG5cdHZhciBzY29wZUVsID0gc2NvcGVFbCAvLyB8fCBkb2N1bWVudC5ib2R5XG5cdFx0LCBjb21wb25lbnRzID0ge307XG5cblx0Ly8gaXRlcmF0ZSBjaGlsZHJlbiBvZiBzY29wZUVsXG5cdEFycmF5LnByb3RvdHlwZS5mb3JFYWNoLmNhbGwoc2NvcGVFbC5jaGlsZHJlbiwgYmluZEVsZW1lbnQpO1xuXG5cdHJldHVybiBjb21wb25lbnRzO1xuXG5cdGZ1bmN0aW9uIGJpbmRFbGVtZW50KGVsKXtcblx0XHR2YXIgYXR0ciA9IG5ldyBBdHRyaWJ1dGUoZWwsIG9wdHMuQklORF9BVFRSKTtcblxuXHRcdHZhciBhQ29tcG9uZW50ID0gY3JlYXRlQ29tcG9uZW50KGVsLCBhdHRyKTtcblxuXHRcdC8vIGJpbmQgaW5uZXIgZWxlbWVudHMgdG8gY29tcG9uZW50c1xuXHRcdGlmIChlbC5jaGlsZHJlbiAmJiBlbC5jaGlsZHJlbi5sZW5ndGgpIHtcblx0XHRcdHZhciBpbm5lckNvbXBvbmVudHMgPSBiaW5kZXIoZWwpO1xuXG5cdFx0XHRpZiAoT2JqZWN0LmtleXMoaW5uZXJDb21wb25lbnRzKS5sZW5ndGgpIHtcblx0XHRcdFx0Ly8gYXR0YWNoIGlubmVyIGNvbXBvbmVudHMgdG8gdGhlIGN1cnJlbnQgb25lIChjcmVhdGUgYSBuZXcgc2NvcGUpIC4uLlxuXHRcdFx0XHRpZiAodHlwZW9mIGFDb21wb25lbnQgIT0gJ3VuZGVmaW5lZCcgJiYgYUNvbXBvbmVudC5jb250YWluZXIpXG5cdFx0XHRcdFx0YUNvbXBvbmVudC5jb250YWluZXIuYWRkKGlubmVyQ29tcG9uZW50cyk7XG5cdFx0XHRcdGVsc2UgLy8gb3Iga2VlcCB0aGVtIGluIHRoZSBjdXJyZW50IHNjb3BlXG5cdFx0XHRcdFx0Xy5lYWNoS2V5KGlubmVyQ29tcG9uZW50cywgc3RvcmVDb21wb25lbnQpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmIChhQ29tcG9uZW50KVxuXHRcdFx0c3RvcmVDb21wb25lbnQoYUNvbXBvbmVudCwgYXR0ci5uYW1lKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGNyZWF0ZUNvbXBvbmVudChlbCwgYXR0cikge1xuXHRcdGlmIChhdHRyLm5vZGUpIHsgLy8gZWxlbWVudCB3aWxsIGJlIGJvdW5kIHRvIGEgY29tcG9uZW50XG5cdFx0XHRhdHRyLnBhcnNlKCkudmFsaWRhdGUoKTtcblxuXHRcdFx0Ly8gZ2V0IGNvbXBvbmVudCBjbGFzcyBmcm9tIHJlZ2lzdHJ5IGFuZCB2YWxpZGF0ZVxuXHRcdFx0dmFyIENvbXBvbmVudENsYXNzID0gY29tcG9uZW50c1JlZ2lzdHJ5LmdldChhdHRyLmNvbXBDbGFzcyk7XG5cblx0XHRcdGlmICghIENvbXBvbmVudENsYXNzKVxuXHRcdFx0XHR0aHJvdyBuZXcgQmluZEVycm9yKCdjbGFzcyAnICsgYXR0ci5jb21wQ2xhc3MgKyAnIGlzIG5vdCByZWdpc3RlcmVkJyk7XG5cblx0XHRcdGNoZWNrKENvbXBvbmVudENsYXNzLCBNYXRjaC5TdWJjbGFzcyhDb21wb25lbnQsIHRydWUpKTtcblx0XG5cdFx0XHQvLyBjcmVhdGUgbmV3IGNvbXBvbmVudFxuXHRcdFx0cmV0dXJuIG5ldyBDb21wb25lbnRDbGFzcyh7fSwgZWwpO1xuXHRcdH1cblx0fVxuXG5cblx0ZnVuY3Rpb24gc3RvcmVDb21wb25lbnQoYUNvbXBvbmVudCwgbmFtZSkge1xuXHRcdGlmIChjb21wb25lbnRzW25hbWVdKVxuXHRcdFx0dGhyb3cgbmV3IEJpbmRFcnJvcignZHVwbGljYXRlIGNvbXBvbmVudCBuYW1lOiAnICsgbmFtZSk7XG5cblx0XHRjb21wb25lbnRzW25hbWVdID0gYUNvbXBvbmVudDtcblx0fVxufVxuXG5cbmJpbmRlci5jb25maWcgPSBmdW5jdGlvbihvcHRpb25zKSB7XG5cdG9wdHMuZXh0ZW5kKG9wdGlvbnMpO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCdwcm90bycpO1xuXG5mdW5jdGlvbiBCaW5kRXJyb3IobXNnKSB7XG5cdHRoaXMubWVzc2FnZSA9IG1zZztcbn1cblxuXy5tYWtlU3ViY2xhc3MoQmluZEVycm9yLCBFcnJvcik7XG5cbm1vZHVsZS5leHBvcnRzID0gQmluZEVycm9yO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyBYWFggZG9jc1xuXG4vLyBUaGluZ3Mgd2UgZXhwbGljaXRseSBkbyBOT1Qgc3VwcG9ydDpcbi8vICAgIC0gaGV0ZXJvZ2Vub3VzIGFycmF5c1xudmFyIF8gPSByZXF1aXJlKCdwcm90bycpO1xuXG52YXIgY2hlY2sgPSBmdW5jdGlvbiAodmFsdWUsIHBhdHRlcm4pIHtcbiAgLy8gUmVjb3JkIHRoYXQgY2hlY2sgZ290IGNhbGxlZCwgaWYgc29tZWJvZHkgY2FyZWQuXG4gIHRyeSB7XG4gICAgY2hlY2tTdWJ0cmVlKHZhbHVlLCBwYXR0ZXJuKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgaWYgKChlcnIgaW5zdGFuY2VvZiBNYXRjaC5FcnJvcikgJiYgZXJyLnBhdGgpXG4gICAgICBlcnIubWVzc2FnZSArPSBcIiBpbiBmaWVsZCBcIiArIGVyci5wYXRoO1xuICAgIHRocm93IGVycjtcbiAgfVxufTtcbm1vZHVsZS5leHBvcnRzID0gY2hlY2s7XG5cbnZhciBNYXRjaCA9IGNoZWNrLk1hdGNoID0ge1xuICBPcHRpb25hbDogZnVuY3Rpb24gKHBhdHRlcm4pIHtcbiAgICByZXR1cm4gbmV3IE9wdGlvbmFsKHBhdHRlcm4pO1xuICB9LFxuICBPbmVPZjogZnVuY3Rpb24gKC8qYXJndW1lbnRzKi8pIHtcbiAgICByZXR1cm4gbmV3IE9uZU9mKGFyZ3VtZW50cyk7XG4gIH0sXG4gIEFueTogWydfX2FueV9fJ10sXG4gIFdoZXJlOiBmdW5jdGlvbiAoY29uZGl0aW9uKSB7XG4gICAgcmV0dXJuIG5ldyBXaGVyZShjb25kaXRpb24pO1xuICB9LFxuICBPYmplY3RJbmNsdWRpbmc6IGZ1bmN0aW9uIChwYXR0ZXJuKSB7XG4gICAgcmV0dXJuIG5ldyBPYmplY3RJbmNsdWRpbmcocGF0dGVybik7XG4gIH0sXG4gIC8vIE1hdGNoZXMgb25seSBzaWduZWQgMzItYml0IGludGVnZXJzXG4gIEludGVnZXI6IFsnX19pbnRlZ2VyX18nXSxcblxuICAvLyBNYXRjaGVzIGhhc2ggKG9iamVjdCkgd2l0aCB2YWx1ZXMgbWF0Y2hpbmcgcGF0dGVyblxuICBPYmplY3RIYXNoOiBmdW5jdGlvbihwYXR0ZXJuKSB7XG4gICAgcmV0dXJuIG5ldyBPYmplY3RIYXNoKHBhdHRlcm4pO1xuICB9LFxuXG4gIFN1YmNsYXNzOiBmdW5jdGlvbihTdXBlcmNsYXNzLCBtYXRjaFN1cGVyY2xhc3NUb28pIHtcbiAgICByZXR1cm4gbmV3IFN1YmNsYXNzKFN1cGVyY2xhc3MsIG1hdGNoU3VwZXJjbGFzc1Rvbyk7XG4gIH0sXG5cbiAgLy8gWFhYIG1hdGNoZXJzIHNob3VsZCBrbm93IGhvdyB0byBkZXNjcmliZSB0aGVtc2VsdmVzIGZvciBlcnJvcnNcbiAgRXJyb3I6IFR5cGVFcnJvcixcblxuICAvLyBNZXRlb3IubWFrZUVycm9yVHlwZShcIk1hdGNoLkVycm9yXCIsIGZ1bmN0aW9uIChtc2cpIHtcbiAgICAvLyB0aGlzLm1lc3NhZ2UgPSBcIk1hdGNoIGVycm9yOiBcIiArIG1zZztcbiAgICAvLyBUaGUgcGF0aCBvZiB0aGUgdmFsdWUgdGhhdCBmYWlsZWQgdG8gbWF0Y2guIEluaXRpYWxseSBlbXB0eSwgdGhpcyBnZXRzXG4gICAgLy8gcG9wdWxhdGVkIGJ5IGNhdGNoaW5nIGFuZCByZXRocm93aW5nIHRoZSBleGNlcHRpb24gYXMgaXQgZ29lcyBiYWNrIHVwIHRoZVxuICAgIC8vIHN0YWNrLlxuICAgIC8vIEUuZy46IFwidmFsc1szXS5lbnRpdHkuY3JlYXRlZFwiXG4gICAgLy8gdGhpcy5wYXRoID0gXCJcIjtcbiAgICAvLyBJZiB0aGlzIGdldHMgc2VudCBvdmVyIEREUCwgZG9uJ3QgZ2l2ZSBmdWxsIGludGVybmFsIGRldGFpbHMgYnV0IGF0IGxlYXN0XG4gICAgLy8gcHJvdmlkZSBzb21ldGhpbmcgYmV0dGVyIHRoYW4gNTAwIEludGVybmFsIHNlcnZlciBlcnJvci5cbiAgLy8gICB0aGlzLnNhbml0aXplZEVycm9yID0gbmV3IE1ldGVvci5FcnJvcig0MDAsIFwiTWF0Y2ggZmFpbGVkXCIpO1xuICAvLyB9KSxcblxuICAvLyBUZXN0cyB0byBzZWUgaWYgdmFsdWUgbWF0Y2hlcyBwYXR0ZXJuLiBVbmxpa2UgY2hlY2ssIGl0IG1lcmVseSByZXR1cm5zIHRydWVcbiAgLy8gb3IgZmFsc2UgKHVubGVzcyBhbiBlcnJvciBvdGhlciB0aGFuIE1hdGNoLkVycm9yIHdhcyB0aHJvd24pLiBJdCBkb2VzIG5vdFxuICAvLyBpbnRlcmFjdCB3aXRoIF9mYWlsSWZBcmd1bWVudHNBcmVOb3RBbGxDaGVja2VkLlxuICAvLyBYWFggbWF5YmUgYWxzbyBpbXBsZW1lbnQgYSBNYXRjaC5tYXRjaCB3aGljaCByZXR1cm5zIG1vcmUgaW5mb3JtYXRpb24gYWJvdXRcbiAgLy8gICAgIGZhaWx1cmVzIGJ1dCB3aXRob3V0IHVzaW5nIGV4Y2VwdGlvbiBoYW5kbGluZyBvciBkb2luZyB3aGF0IGNoZWNrKClcbiAgLy8gICAgIGRvZXMgd2l0aCBfZmFpbElmQXJndW1lbnRzQXJlTm90QWxsQ2hlY2tlZCBhbmQgTWV0ZW9yLkVycm9yIGNvbnZlcnNpb25cbiAgdGVzdDogZnVuY3Rpb24gKHZhbHVlLCBwYXR0ZXJuKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNoZWNrU3VidHJlZSh2YWx1ZSwgcGF0dGVybik7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoZSBpbnN0YW5jZW9mIE1hdGNoLkVycm9yKVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAvLyBSZXRocm93IG90aGVyIGVycm9ycy5cbiAgICAgIHRocm93IGU7XG4gICAgfVxuICB9LFxuXG4gIC8vIFJ1bnMgYGYuYXBwbHkoY29udGV4dCwgYXJncylgLiBJZiBjaGVjaygpIGlzIG5vdCBjYWxsZWQgb24gZXZlcnkgZWxlbWVudCBvZlxuICAvLyBgYXJnc2AgKGVpdGhlciBkaXJlY3RseSBvciBpbiB0aGUgZmlyc3QgbGV2ZWwgb2YgYW4gYXJyYXkpLCB0aHJvd3MgYW4gZXJyb3JcbiAgLy8gKHVzaW5nIGBkZXNjcmlwdGlvbmAgaW4gdGhlIG1lc3NhZ2UpLlxuICAvL1xuICBfZmFpbElmQXJndW1lbnRzQXJlTm90QWxsQ2hlY2tlZDogZnVuY3Rpb24gKGYsIGNvbnRleHQsIGFyZ3MsIGRlc2NyaXB0aW9uKSB7XG4gICAgdmFyIGFyZ0NoZWNrZXIgPSBuZXcgQXJndW1lbnRDaGVja2VyKGFyZ3MsIGRlc2NyaXB0aW9uKTtcbiAgICB2YXIgcmVzdWx0ID0gY3VycmVudEFyZ3VtZW50Q2hlY2tlci53aXRoVmFsdWUoYXJnQ2hlY2tlciwgZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIGYuYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgfSk7XG4gICAgLy8gSWYgZiBkaWRuJ3QgaXRzZWxmIHRocm93LCBtYWtlIHN1cmUgaXQgY2hlY2tlZCBhbGwgb2YgaXRzIGFyZ3VtZW50cy5cbiAgICBhcmdDaGVja2VyLnRocm93VW5sZXNzQWxsQXJndW1lbnRzSGF2ZUJlZW5DaGVja2VkKCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxufTtcblxuZnVuY3Rpb24gT3B0aW9uYWwocGF0dGVybikge1xuICB0aGlzLnBhdHRlcm4gPSBwYXR0ZXJuO1xufTtcblxuZnVuY3Rpb24gT25lT2YoY2hvaWNlcykge1xuICBpZiAoY2hvaWNlcy5sZW5ndGggPT0gMClcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJNdXN0IHByb3ZpZGUgYXQgbGVhc3Qgb25lIGNob2ljZSB0byBNYXRjaC5PbmVPZlwiKTtcbiAgdGhpcy5jaG9pY2VzID0gY2hvaWNlcztcbn07XG5cbmZ1bmN0aW9uIFdoZXJlKGNvbmRpdGlvbikge1xuICB0aGlzLmNvbmRpdGlvbiA9IGNvbmRpdGlvbjtcbn07XG5cbmZ1bmN0aW9uIE9iamVjdEluY2x1ZGluZyhwYXR0ZXJuKSB7XG4gIHRoaXMucGF0dGVybiA9IHBhdHRlcm47XG59O1xuXG5mdW5jdGlvbiBPYmplY3RIYXNoKHBhdHRlcm4pIHtcbiAgdGhpcy5wYXR0ZXJuID0gcGF0dGVybjtcbn07XG5cbmZ1bmN0aW9uIFN1YmNsYXNzKFN1cGVyY2xhc3MsIG1hdGNoU3VwZXJjbGFzc1Rvbykge1xuICB0aGlzLlN1cGVyY2xhc3MgPSBTdXBlcmNsYXNzO1xuICB0aGlzLm1hdGNoU3VwZXJjbGFzcyA9IG1hdGNoU3VwZXJjbGFzc1Rvbztcbn07XG5cbnZhciB0eXBlb2ZDaGVja3MgPSBbXG4gIFtTdHJpbmcsIFwic3RyaW5nXCJdLFxuICBbTnVtYmVyLCBcIm51bWJlclwiXSxcbiAgW0Jvb2xlYW4sIFwiYm9vbGVhblwiXSxcbiAgLy8gV2hpbGUgd2UgZG9uJ3QgYWxsb3cgdW5kZWZpbmVkIGluIEVKU09OLCB0aGlzIGlzIGdvb2QgZm9yIG9wdGlvbmFsXG4gIC8vIGFyZ3VtZW50cyB3aXRoIE9uZU9mLlxuICBbdW5kZWZpbmVkLCBcInVuZGVmaW5lZFwiXVxuXTtcblxuZnVuY3Rpb24gY2hlY2tTdWJ0cmVlKHZhbHVlLCBwYXR0ZXJuKSB7XG4gIC8vIE1hdGNoIGFueXRoaW5nIVxuICBpZiAocGF0dGVybiA9PT0gTWF0Y2guQW55KVxuICAgIHJldHVybjtcblxuICAvLyBCYXNpYyBhdG9taWMgdHlwZXMuXG4gIC8vIERvIG5vdCBtYXRjaCBib3hlZCBvYmplY3RzIChlLmcuIFN0cmluZywgQm9vbGVhbilcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0eXBlb2ZDaGVja3MubGVuZ3RoOyArK2kpIHtcbiAgICBpZiAocGF0dGVybiA9PT0gdHlwZW9mQ2hlY2tzW2ldWzBdKSB7XG4gICAgICBpZiAodHlwZW9mIHZhbHVlID09PSB0eXBlb2ZDaGVja3NbaV1bMV0pXG4gICAgICAgIHJldHVybjtcbiAgICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIFwiICsgdHlwZW9mQ2hlY2tzW2ldWzFdICsgXCIsIGdvdCBcIiArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZW9mIHZhbHVlKTtcbiAgICB9XG4gIH1cbiAgaWYgKHBhdHRlcm4gPT09IG51bGwpIHtcbiAgICBpZiAodmFsdWUgPT09IG51bGwpXG4gICAgICByZXR1cm47XG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgbnVsbCwgZ290IFwiICsgRUpTT04uc3RyaW5naWZ5KHZhbHVlKSk7XG4gIH1cblxuICAvLyBNYXRjaC5JbnRlZ2VyIGlzIHNwZWNpYWwgdHlwZSBlbmNvZGVkIHdpdGggYXJyYXlcbiAgaWYgKHBhdHRlcm4gPT09IE1hdGNoLkludGVnZXIpIHtcbiAgICAvLyBUaGVyZSBpcyBubyBjb25zaXN0ZW50IGFuZCByZWxpYWJsZSB3YXkgdG8gY2hlY2sgaWYgdmFyaWFibGUgaXMgYSA2NC1iaXRcbiAgICAvLyBpbnRlZ2VyLiBPbmUgb2YgdGhlIHBvcHVsYXIgc29sdXRpb25zIGlzIHRvIGdldCByZW1pbmRlciBvZiBkaXZpc2lvbiBieSAxXG4gICAgLy8gYnV0IHRoaXMgbWV0aG9kIGZhaWxzIG9uIHJlYWxseSBsYXJnZSBmbG9hdHMgd2l0aCBiaWcgcHJlY2lzaW9uLlxuICAgIC8vIEUuZy46IDEuMzQ4MTkyMzA4NDkxODI0ZSsyMyAlIDEgPT09IDAgaW4gVjhcbiAgICAvLyBCaXR3aXNlIG9wZXJhdG9ycyB3b3JrIGNvbnNpc3RhbnRseSBidXQgYWx3YXlzIGNhc3QgdmFyaWFibGUgdG8gMzItYml0XG4gICAgLy8gc2lnbmVkIGludGVnZXIgYWNjb3JkaW5nIHRvIEphdmFTY3JpcHQgc3BlY3MuXG4gICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJudW1iZXJcIiAmJiAodmFsdWUgfCAwKSA9PT0gdmFsdWUpXG4gICAgICByZXR1cm5cbiAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJFeHBlY3RlZCBJbnRlZ2VyLCBnb3QgXCJcbiAgICAgICAgICAgICAgICArICh2YWx1ZSBpbnN0YW5jZW9mIE9iamVjdCA/IEVKU09OLnN0cmluZ2lmeSh2YWx1ZSkgOiB2YWx1ZSkpO1xuICB9XG5cbiAgLy8gXCJPYmplY3RcIiBpcyBzaG9ydGhhbmQgZm9yIE1hdGNoLk9iamVjdEluY2x1ZGluZyh7fSk7XG4gIGlmIChwYXR0ZXJuID09PSBPYmplY3QpXG4gICAgcGF0dGVybiA9IE1hdGNoLk9iamVjdEluY2x1ZGluZyh7fSk7XG5cbiAgLy8gQXJyYXkgKGNoZWNrZWQgQUZURVIgQW55LCB3aGljaCBpcyBpbXBsZW1lbnRlZCBhcyBhbiBBcnJheSkuXG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICBpZiAocGF0dGVybi5sZW5ndGggIT09IDEpXG4gICAgICB0aHJvdyBFcnJvcihcIkJhZCBwYXR0ZXJuOiBhcnJheXMgbXVzdCBoYXZlIG9uZSB0eXBlIGVsZW1lbnRcIiArXG4gICAgICAgICAgICAgICAgICBFSlNPTi5zdHJpbmdpZnkocGF0dGVybikpO1xuICAgIGlmICghXy5pc0FycmF5KHZhbHVlKSAmJiAhXy5pc0FyZ3VtZW50cyh2YWx1ZSkpIHtcbiAgICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIGFycmF5LCBnb3QgXCIgKyBFSlNPTi5zdHJpbmdpZnkodmFsdWUpKTtcbiAgICB9XG5cbiAgICBfLmVhY2godmFsdWUsIGZ1bmN0aW9uICh2YWx1ZUVsZW1lbnQsIGluZGV4KSB7XG4gICAgICB0cnkge1xuICAgICAgICBjaGVja1N1YnRyZWUodmFsdWVFbGVtZW50LCBwYXR0ZXJuWzBdKTtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICBpZiAoZXJyIGluc3RhbmNlb2YgTWF0Y2guRXJyb3IpIHtcbiAgICAgICAgICBlcnIucGF0aCA9IF9wcmVwZW5kUGF0aChpbmRleCwgZXJyLnBhdGgpO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IGVycjtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBBcmJpdHJhcnkgdmFsaWRhdGlvbiBjaGVja3MuIFRoZSBjb25kaXRpb24gY2FuIHJldHVybiBmYWxzZSBvciB0aHJvdyBhXG4gIC8vIE1hdGNoLkVycm9yIChpZSwgaXQgY2FuIGludGVybmFsbHkgdXNlIGNoZWNrKCkpIHRvIGZhaWwuXG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgV2hlcmUpIHtcbiAgICBpZiAocGF0dGVybi5jb25kaXRpb24odmFsdWUpKVxuICAgICAgcmV0dXJuO1xuICAgIC8vIFhYWCB0aGlzIGVycm9yIGlzIHRlcnJpYmxlXG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRmFpbGVkIE1hdGNoLldoZXJlIHZhbGlkYXRpb25cIik7XG4gIH1cblxuXG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgT3B0aW9uYWwpXG4gICAgcGF0dGVybiA9IE1hdGNoLk9uZU9mKHVuZGVmaW5lZCwgcGF0dGVybi5wYXR0ZXJuKTtcblxuICBpZiAocGF0dGVybiBpbnN0YW5jZW9mIE9uZU9mKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXR0ZXJuLmNob2ljZXMubGVuZ3RoOyArK2kpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNoZWNrU3VidHJlZSh2YWx1ZSwgcGF0dGVybi5jaG9pY2VzW2ldKTtcbiAgICAgICAgLy8gTm8gZXJyb3I/IFlheSwgcmV0dXJuLlxuICAgICAgICByZXR1cm47XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgLy8gT3RoZXIgZXJyb3JzIHNob3VsZCBiZSB0aHJvd24uIE1hdGNoIGVycm9ycyBqdXN0IG1lYW4gdHJ5IGFub3RoZXJcbiAgICAgICAgLy8gY2hvaWNlLlxuICAgICAgICBpZiAoIShlcnIgaW5zdGFuY2VvZiBNYXRjaC5FcnJvcikpXG4gICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBYWFggdGhpcyBlcnJvciBpcyB0ZXJyaWJsZVxuICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkZhaWxlZCBNYXRjaC5PbmVPZiBvciBNYXRjaC5PcHRpb25hbCB2YWxpZGF0aW9uXCIpO1xuICB9XG5cbiAgLy8gQSBmdW5jdGlvbiB0aGF0IGlzbid0IHNvbWV0aGluZyB3ZSBzcGVjaWFsLWNhc2UgaXMgYXNzdW1lZCB0byBiZSBhXG4gIC8vIGNvbnN0cnVjdG9yLlxuICBpZiAocGF0dGVybiBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgcGF0dGVybilcbiAgICAgIHJldHVybjtcbiAgICAvLyBYWFggd2hhdCBpZiAubmFtZSBpc24ndCBkZWZpbmVkXG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgXCIgKyBwYXR0ZXJuLmNvbnN0cnVjdG9yLm5hbWUpO1xuICB9XG5cbiAgdmFyIHVua25vd25LZXlzQWxsb3dlZCA9IGZhbHNlO1xuICBpZiAocGF0dGVybiBpbnN0YW5jZW9mIE9iamVjdEluY2x1ZGluZykge1xuICAgIHVua25vd25LZXlzQWxsb3dlZCA9IHRydWU7XG4gICAgcGF0dGVybiA9IHBhdHRlcm4ucGF0dGVybjtcbiAgfVxuXG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgT2JqZWN0SGFzaCkge1xuICAgIHZhciBrZXlQYXR0ZXJuID0gcGF0dGVybi5wYXR0ZXJuO1xuICAgIHZhciBlbXB0eUhhc2ggPSB0cnVlO1xuICAgIGZvciAodmFyIGtleSBpbiB2YWx1ZSkge1xuICAgICAgZW1wdHlIYXNoID0gZmFsc2U7XG4gICAgICBjaGVjayh2YWx1ZVtrZXldLCBrZXlQYXR0ZXJuKTtcbiAgICB9XG4gICAgaWYgKGVtcHR5SGFzaClcbiAgICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIFwiICsgcGF0dGVybi5jb25zdHJ1Y3Rvci5uYW1lKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAocGF0dGVybiBpbnN0YW5jZW9mIFN1YmNsYXNzKSB7XG4gICAgdmFyIFN1cGVyY2xhc3MgPSBwYXR0ZXJuLlN1cGVyY2xhc3M7XG4gICAgaWYgKHBhdHRlcm4ubWF0Y2hTdXBlcmNsYXNzICYmIHZhbHVlID09IFN1cGVyY2xhc3MpXG4gICAgICByZXR1cm47XG4gICAgaWYgKCEgKHZhbHVlLnByb3RvdHlwZSBpbnN0YW5jZW9mIFN1cGVyY2xhc3MpKVxuICAgICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgXCIgKyBwYXR0ZXJuLmNvbnN0cnVjdG9yLm5hbWUgKyBcIiBvZiBcIiArIFN1cGVyY2xhc3MubmFtZSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBwYXR0ZXJuICE9PSBcIm9iamVjdFwiKVxuICAgIHRocm93IEVycm9yKFwiQmFkIHBhdHRlcm46IHVua25vd24gcGF0dGVybiB0eXBlXCIpO1xuXG4gIC8vIEFuIG9iamVjdCwgd2l0aCByZXF1aXJlZCBhbmQgb3B0aW9uYWwga2V5cy4gTm90ZSB0aGF0IHRoaXMgZG9lcyBOT1QgZG9cbiAgLy8gc3RydWN0dXJhbCBtYXRjaGVzIGFnYWluc3Qgb2JqZWN0cyBvZiBzcGVjaWFsIHR5cGVzIHRoYXQgaGFwcGVuIHRvIG1hdGNoXG4gIC8vIHRoZSBwYXR0ZXJuOiB0aGlzIHJlYWxseSBuZWVkcyB0byBiZSBhIHBsYWluIG9sZCB7T2JqZWN0fSFcbiAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ29iamVjdCcpXG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgb2JqZWN0LCBnb3QgXCIgKyB0eXBlb2YgdmFsdWUpO1xuICBpZiAodmFsdWUgPT09IG51bGwpXG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgb2JqZWN0LCBnb3QgbnVsbFwiKTtcbiAgaWYgKHZhbHVlLmNvbnN0cnVjdG9yICE9PSBPYmplY3QpXG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgcGxhaW4gb2JqZWN0XCIpO1xuXG4gIHZhciByZXF1aXJlZFBhdHRlcm5zID0ge307XG4gIHZhciBvcHRpb25hbFBhdHRlcm5zID0ge307XG5cbiAgT2JqZWN0LmtleXMocGF0dGVybikuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICB2YXIgc3ViUGF0dGVybiA9IHBhdHRlcm5ba2V5XTtcbiAgICBpZiAocGF0dGVybltrZXldIGluc3RhbmNlb2YgT3B0aW9uYWwpXG4gICAgICBvcHRpb25hbFBhdHRlcm5zW2tleV0gPSBwYXR0ZXJuW2tleV0ucGF0dGVybjtcbiAgICBlbHNlXG4gICAgICByZXF1aXJlZFBhdHRlcm5zW2tleV0gPSBwYXR0ZXJuW2tleV07XG4gIH0pO1xuXG4gIE9iamVjdC5rZXlzKHZhbHVlKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIHZhciBzdWJWYWx1ZSA9IHZhbHVlW2tleV07XG4gICAgdHJ5IHtcbiAgICAgIGlmIChyZXF1aXJlZFBhdHRlcm5zLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgY2hlY2tTdWJ0cmVlKHN1YlZhbHVlLCByZXF1aXJlZFBhdHRlcm5zW2tleV0pO1xuICAgICAgICBkZWxldGUgcmVxdWlyZWRQYXR0ZXJuc1trZXldO1xuICAgICAgfSBlbHNlIGlmIChvcHRpb25hbFBhdHRlcm5zLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgY2hlY2tTdWJ0cmVlKHN1YlZhbHVlLCBvcHRpb25hbFBhdHRlcm5zW2tleV0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKCF1bmtub3duS2V5c0FsbG93ZWQpXG4gICAgICAgICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiVW5rbm93biBrZXlcIik7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBpZiAoZXJyIGluc3RhbmNlb2YgTWF0Y2guRXJyb3IpXG4gICAgICAgIGVyci5wYXRoID0gX3ByZXBlbmRQYXRoKGtleSwgZXJyLnBhdGgpO1xuICAgICAgdGhyb3cgZXJyO1xuICAgIH1cbiAgfSk7XG5cbiAgT2JqZWN0LmtleXMocmVxdWlyZWRQYXR0ZXJucykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJNaXNzaW5nIGtleSAnXCIgKyBrZXkgKyBcIidcIik7XG4gIH0pO1xufTtcblxuZnVuY3Rpb24gQXJndW1lbnRDaGVja2VyKGFyZ3MsIGRlc2NyaXB0aW9uKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgLy8gTWFrZSBhIFNIQUxMT1cgY29weSBvZiB0aGUgYXJndW1lbnRzLiAoV2UnbGwgYmUgZG9pbmcgaWRlbnRpdHkgY2hlY2tzXG4gIC8vIGFnYWluc3QgaXRzIGNvbnRlbnRzLilcbiAgc2VsZi5hcmdzID0gXy5jbG9uZShhcmdzKTtcbiAgLy8gU2luY2UgdGhlIGNvbW1vbiBjYXNlIHdpbGwgYmUgdG8gY2hlY2sgYXJndW1lbnRzIGluIG9yZGVyLCBhbmQgd2Ugc3BsaWNlXG4gIC8vIG91dCBhcmd1bWVudHMgd2hlbiB3ZSBjaGVjayB0aGVtLCBtYWtlIGl0IHNvIHdlIHNwbGljZSBvdXQgZnJvbSB0aGUgZW5kXG4gIC8vIHJhdGhlciB0aGFuIHRoZSBiZWdpbm5pbmcuXG4gIHNlbGYuYXJncy5yZXZlcnNlKCk7XG4gIHNlbGYuZGVzY3JpcHRpb24gPSBkZXNjcmlwdGlvbjtcbn07XG5cbl8uZXh0ZW5kUHJvdG8oQXJndW1lbnRDaGVja2VyLCB7XG4gIGNoZWNraW5nOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKHNlbGYuX2NoZWNraW5nT25lVmFsdWUodmFsdWUpKVxuICAgICAgcmV0dXJuO1xuICAgIC8vIEFsbG93IGNoZWNrKGFyZ3VtZW50cywgW1N0cmluZ10pIG9yIGNoZWNrKGFyZ3VtZW50cy5zbGljZSgxKSwgW1N0cmluZ10pXG4gICAgLy8gb3IgY2hlY2soW2ZvbywgYmFyXSwgW1N0cmluZ10pIHRvIGNvdW50Li4uIGJ1dCBvbmx5IGlmIHZhbHVlIHdhc24ndFxuICAgIC8vIGl0c2VsZiBhbiBhcmd1bWVudC5cbiAgICBpZiAoXy5pc0FycmF5KHZhbHVlKSB8fCBfLmlzQXJndW1lbnRzKHZhbHVlKSkge1xuICAgICAgXy5lYWNoKHZhbHVlLCBfLmJpbmQoc2VsZi5fY2hlY2tpbmdPbmVWYWx1ZSwgc2VsZikpO1xuICAgIH1cbiAgfSxcbiAgX2NoZWNraW5nT25lVmFsdWU6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNlbGYuYXJncy5sZW5ndGg7ICsraSkge1xuICAgICAgLy8gSXMgdGhpcyB2YWx1ZSBvbmUgb2YgdGhlIGFyZ3VtZW50cz8gKFRoaXMgY2FuIGhhdmUgYSBmYWxzZSBwb3NpdGl2ZSBpZlxuICAgICAgLy8gdGhlIGFyZ3VtZW50IGlzIGFuIGludGVybmVkIHByaW1pdGl2ZSwgYnV0IGl0J3Mgc3RpbGwgYSBnb29kIGVub3VnaFxuICAgICAgLy8gY2hlY2suKVxuICAgICAgaWYgKHZhbHVlID09PSBzZWxmLmFyZ3NbaV0pIHtcbiAgICAgICAgc2VsZi5hcmdzLnNwbGljZShpLCAxKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfSxcbiAgdGhyb3dVbmxlc3NBbGxBcmd1bWVudHNIYXZlQmVlbkNoZWNrZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKCFfLmlzRW1wdHkoc2VsZi5hcmdzKSlcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkRpZCBub3QgY2hlY2soKSBhbGwgYXJndW1lbnRzIGR1cmluZyBcIiArXG4gICAgICAgICAgICAgICAgICAgICAgc2VsZi5kZXNjcmlwdGlvbik7XG4gIH1cbn0pO1xuXG52YXIgX2pzS2V5d29yZHMgPSBbXCJkb1wiLCBcImlmXCIsIFwiaW5cIiwgXCJmb3JcIiwgXCJsZXRcIiwgXCJuZXdcIiwgXCJ0cnlcIiwgXCJ2YXJcIiwgXCJjYXNlXCIsXG4gIFwiZWxzZVwiLCBcImVudW1cIiwgXCJldmFsXCIsIFwiZmFsc2VcIiwgXCJudWxsXCIsIFwidGhpc1wiLCBcInRydWVcIiwgXCJ2b2lkXCIsIFwid2l0aFwiLFxuICBcImJyZWFrXCIsIFwiY2F0Y2hcIiwgXCJjbGFzc1wiLCBcImNvbnN0XCIsIFwic3VwZXJcIiwgXCJ0aHJvd1wiLCBcIndoaWxlXCIsIFwieWllbGRcIixcbiAgXCJkZWxldGVcIiwgXCJleHBvcnRcIiwgXCJpbXBvcnRcIiwgXCJwdWJsaWNcIiwgXCJyZXR1cm5cIiwgXCJzdGF0aWNcIiwgXCJzd2l0Y2hcIixcbiAgXCJ0eXBlb2ZcIiwgXCJkZWZhdWx0XCIsIFwiZXh0ZW5kc1wiLCBcImZpbmFsbHlcIiwgXCJwYWNrYWdlXCIsIFwicHJpdmF0ZVwiLCBcImNvbnRpbnVlXCIsXG4gIFwiZGVidWdnZXJcIiwgXCJmdW5jdGlvblwiLCBcImFyZ3VtZW50c1wiLCBcImludGVyZmFjZVwiLCBcInByb3RlY3RlZFwiLCBcImltcGxlbWVudHNcIixcbiAgXCJpbnN0YW5jZW9mXCJdO1xuXG4vLyBBc3N1bWVzIHRoZSBiYXNlIG9mIHBhdGggaXMgYWxyZWFkeSBlc2NhcGVkIHByb3Blcmx5XG4vLyByZXR1cm5zIGtleSArIGJhc2VcbmZ1bmN0aW9uIF9wcmVwZW5kUGF0aChrZXksIGJhc2UpIHtcbiAgaWYgKCh0eXBlb2Yga2V5KSA9PT0gXCJudW1iZXJcIiB8fCBrZXkubWF0Y2goL15bMC05XSskLykpXG4gICAga2V5ID0gXCJbXCIgKyBrZXkgKyBcIl1cIjtcbiAgZWxzZSBpZiAoIWtleS5tYXRjaCgvXlthLXpfJF1bMC05YS16XyRdKiQvaSkgfHwgX2pzS2V5d29yZHMuaW5kZXhPZihrZXkpICE9IC0xKS8vXy5jb250YWlucyhfanNLZXl3b3Jkcywga2V5KSlcbiAgICBrZXkgPSBKU09OLnN0cmluZ2lmeShba2V5XSk7XG5cbiAgaWYgKGJhc2UgJiYgYmFzZVswXSAhPT0gXCJbXCIpXG4gICAgcmV0dXJuIGtleSArICcuJyArIGJhc2U7XG4gIHJldHVybiBrZXkgKyBiYXNlO1xufTtcblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgRmFjZXRlZE9iamVjdCA9IHJlcXVpcmUoJy4uL2ZhY2V0cy9mX29iamVjdCcpXG5cdCwgbWVzc2VuZ2VyTWl4aW4gPSByZXF1aXJlKCcuL21lc3NlbmdlcicpXG5cdCwgXyA9IHJlcXVpcmUoJ3Byb3RvJyk7XG5cbnZhciBDb21wb25lbnQgPSBfLmNyZWF0ZVN1YmNsYXNzKEZhY2V0ZWRPYmplY3QsICdDb21wb25lbnQnLCB0cnVlKTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb25lbnQ7XG5cblxuQ29tcG9uZW50LmNyZWF0ZUNvbXBvbmVudENsYXNzID0gRmFjZXRlZE9iamVjdC5jcmVhdGVGYWNldGVkQ2xhc3M7XG5kZWxldGUgQ29tcG9uZW50LmNyZWF0ZUZhY2V0ZWRDbGFzcztcblxuXy5leHRlbmRQcm90byhDb21wb25lbnQsIHtcblx0aW5pdDogaW5pdENvbXBvbmVudFxufSk7XG5cbl8uZXh0ZW5kUHJvdG8oQ29tcG9uZW50LCBtZXNzZW5nZXJNaXhpbik7XG5cbmZ1bmN0aW9uIGluaXRDb21wb25lbnQoZmFjZXRzT3B0aW9ucywgZWxlbWVudCkge1xuXHR0aGlzLmVsID0gZWxlbWVudDtcblx0dGhpcy5pbml0TWVzc2VuZ2VyKCk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBGYWNldCA9IHJlcXVpcmUoJy4uL2ZhY2V0cy9mX2NsYXNzJylcblx0LCBtZXNzZW5nZXJNaXhpbiA9IHJlcXVpcmUoJy4vbWVzc2VuZ2VyJylcblx0LCBfID0gcmVxdWlyZSgncHJvdG8nKTtcblxudmFyIENvbXBvbmVudEZhY2V0ID0gXy5jcmVhdGVTdWJjbGFzcyhGYWNldCwgJ0NvbXBvbmVudEZhY2V0Jyk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ29tcG9uZW50RmFjZXQ7XG5cblxuXy5leHRlbmRQcm90byhDb21wb25lbnRGYWNldCwge1xuXHRpbml0OiBpbml0Q29tcG9uZW50RmFjZXQsXG59KTtcblxuXy5leHRlbmRQcm90byhDb21wb25lbnRGYWNldCwgbWVzc2VuZ2VyTWl4aW4pO1xuXG5cbmZ1bmN0aW9uIGluaXRDb21wb25lbnRGYWNldCgpIHtcblx0dGhpcy5pbml0TWVzc2VuZ2VyKCk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBDb21wb25lbnRGYWNldCA9IHJlcXVpcmUoJy4uL2NfZmFjZXQnKVxuXHQsIGJpbmRlciA9IHJlcXVpcmUoJy4uLy4uL2JpbmRlci9iaW5kZXInKVxuXHQsIF8gPSByZXF1aXJlKCdwcm90bycpXG5cdCwgZmFjZXRzUmVnaXN0cnkgPSByZXF1aXJlKCcuL2NmX3JlZ2lzdHJ5Jyk7XG5cbi8vIGNvbnRhaW5lciBmYWNldFxudmFyIENvbnRhaW5lciA9IF8uY3JlYXRlU3ViY2xhc3MoQ29tcG9uZW50RmFjZXQsICdDb250YWluZXInKTtcblxuXy5leHRlbmRQcm90byhDb250YWluZXIsIHtcblx0aW5pdDogaW5pdENvbnRhaW5lcixcblx0X2JpbmQ6IF9iaW5kQ29tcG9uZW50cyxcblx0YWRkOiBhZGRDaGlsZENvbXBvbmVudHNcbn0pO1xuXG5mYWNldHNSZWdpc3RyeS5hZGQoQ29udGFpbmVyKTtcblxuXG5mdW5jdGlvbiBpbml0Q29udGFpbmVyKCkge1xuXHR0aGlzLmNoaWxkcmVuID0ge307XG59XG5cblxuZnVuY3Rpb24gX2JpbmRDb21wb25lbnRzKCkge1xuXHQvLyBUT0RPXG5cdC8vIHRoaXMgZnVuY3Rpb24gc2hvdWxkIHJlLWJpbmQgcmF0aGVyIHRoYW4gYmluZCBhbGwgaW50ZXJuYWwgZWxlbWVudHNcblx0dGhpcy5jaGlsZHJlbiA9IGJpbmRlcih0aGlzLm93bmVyLmVsKTtcbn1cblxuXG5mdW5jdGlvbiBhZGRDaGlsZENvbXBvbmVudHMoY2hpbGRDb21wb25lbnRzKSB7XG5cdC8vIFRPRE9cblx0Ly8gdGhpcyBmdW5jdGlvbiBzaG91bGQgaW50ZWxsaWdlbnRseSByZS1iaW5kIGV4aXN0aW5nIGNvbXBvbmVudHMgdG9cblx0Ly8gbmV3IGVsZW1lbnRzIChpZiB0aGV5IGNoYW5nZWQpIGFuZCByZS1iaW5kIHByZXZpb3VzbHkgYm91bmQgZXZlbnRzIHRvIHRoZSBzYW1lXG5cdC8vIGV2ZW50IGhhbmRsZXJzXG5cdC8vIG9yIG1heWJlIG5vdCwgaWYgdGhpcyBmdW5jdGlvbiBpcyBvbmx5IHVzZWQgYnkgYmluZGVyIHRvIGFkZCBuZXcgZWxlbWVudHMuLi5cblx0Xy5leHRlbmQodGhpcy5jaGlsZHJlbiwgY2hpbGRDb21wb25lbnRzKTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIENvbXBvbmVudEZhY2V0ID0gcmVxdWlyZSgnLi4vY19mYWNldCcpXG5cdCwgRmFjZXRFcnJvciA9IENvbXBvbmVudEZhY2V0LkVycm9yXG5cdCwgXyA9IHJlcXVpcmUoJ3Byb3RvJylcblx0LCBmYWNldHNSZWdpc3RyeSA9IHJlcXVpcmUoJy4vY2ZfcmVnaXN0cnknKVxuXHQsIG1lc3Nlbmdlck1peGluID0gcmVxdWlyZSgnLi4vbWVzc2VuZ2VyJylcblx0LCBkb21FdmVudHNDb25zdHJ1Y3RvcnMgPSByZXF1aXJlKCcuL2RvbV9ldmVudHMnKTtcblxuLy8gZXZlbnRzIGZhY2V0XG52YXIgRXZlbnRzID0gXy5jcmVhdGVTdWJjbGFzcyhDb21wb25lbnRGYWNldCwgJ0V2ZW50cycpO1xuXG5fLmV4dGVuZFByb3RvKEV2ZW50cywge1xuXHRpbml0OiBpbml0RXZlbnRzRmFjZXQsXG5cdGRvbTogZ2V0RG9tRWxlbWVudCxcblx0aGFuZGxlRXZlbnQ6IGhhbmRsZUV2ZW50LCAvLyBldmVudCBkaXNwYXRjaGVyIC0gYXMgZGVmaW5lZCBieSBFdmVudCBET00gQVBJXG5cdG9uOiBhZGRMaXN0ZW5lcixcblx0b2ZmOiByZW1vdmVMaXN0ZW5lcixcblx0b25FdmVudHM6IGFkZExpc3RlbmVyc1RvRXZlbnRzLFxuXHRvZmZFdmVudHM6IHJlbW92ZUxpc3RlbmVyc0Zyb21FdmVudHMsXG5cdHRyaWdnZXI6IHRyaWdnZXJFdmVudCxcblx0Z2V0TGlzdGVuZXJzOiBnZXRMaXN0ZW5lcnMsXG5cdC8vIF9yZWF0dGFjaDogX3JlYXR0YWNoRXZlbnRzT25FbGVtZW50Q2hhbmdlXG59KTtcblxuZmFjZXRzUmVnaXN0cnkuYWRkKEV2ZW50cyk7XG5cblxudmFyIHVzZUNhcHR1cmVTdWZmaXggPSAnX19jYXB0dXJlJ1xuXHQsIHdyb25nRXZlbnRQYXR0ZXJuID0gL19fY2FwdHVyZS87XG5cblxuZnVuY3Rpb24gaW5pdEV2ZW50c0ZhY2V0KCkge1xuXHQvLyBkZXBlbmRlbmN5XG5cdGlmICghIHRoaXMub3duZXIuZmFjZXRzLkVsKVxuXHRcdHRocm93IG5ldyBGYWNldEVycm9yKCdFdmVudHMgZmFjZXQgcmVxdWlyZSBFbCBmYWNldCcpO1xuXG5cdC8vIGluaXRpYWxpemUgbGlzdGVuZXJzIG1hcFxuXHR0aGlzLl9ldmVudHNMaXN0ZW5lcnMgPSB7fTtcbn1cblxuXG5mdW5jdGlvbiBnZXREb21FbGVtZW50KCkge1xuXHRyZXR1cm4gdGhpcy5vd25lci5FbC5kb207XG59XG5cblxuZnVuY3Rpb24gaGFuZGxlRXZlbnQoZXZlbnQpIHtcblx0aXNDYXB0dXJlUGhhc2UgPSBldmVudC5ldmVudFBoYXNlID09IHdpbmRvdy5FdmVudC5DQVBUVVJJTkdfUEhBU0U7XG5cblx0dmFyIGV2ZW50S2V5ID0gZXZlbnQudHlwZSArIChpc0NhcHR1cmVQaGFzZSA/IHVzZUNhcHR1cmVTdWZmaXggOiAnJylcblx0XHQsIGV2ZW50TGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzTGlzdGVuZXJzW2V2ZW50S2V5XTtcblxuXHRpZiAoZXZlbnRMaXN0ZW5lcnMpXG5cdFx0ZXZlbnRMaXN0ZW5lcnMuZm9yRWFjaChmdW5jdGlvbihsaXN0ZW5lcikge1xuXHRcdFx0bGlzdGVuZXIoZXZlbnQpO1xuXHRcdH0pO1xufVxuXG5cbmZ1bmN0aW9uIGFkZExpc3RlbmVyKGV2ZW50VHlwZXMsIGxpc3RlbmVyLCB1c2VDYXB0dXJlKSB7XG5cdGNoZWNrKGV2ZW50cywgU3RyaW5nKTtcblx0Y2hlY2sobGlzdGVuZXIsIEZ1bmN0aW9uKTtcblxuXHR2YXIgZXZlbnRzQXJyYXkgPSBldmVudFR5cGVzLnNwbGl0KC9cXHMqXFwsP1xccyovKVxuXHRcdCwgd2FzQXR0YWNoZWQgPSBmYWxzZTtcblxuXHRldmVudHNBcnJheS5mb3JFYWNoKGZ1bmN0aW9uKGV2ZW50VHlwZSkge1xuXHRcdGlmICh3cm9uZ0V2ZW50UGF0dGVybi50ZXN0KGV2ZW50VHlwZSkpXG5cdFx0XHR0aHJvdyBuZXcgUmFuZ2VFcnJvcignZXZlbnQgdHlwZSBjYW5ub3QgY29udGFpbiAnICsgdXNlQ2FwdHVyZVN1ZmZpeCk7XG5cblx0XHR2YXIgZXZlbnRLZXkgPSBldmVudFR5cGUgKyAodXNlQ2FwdHVyZSA/IHVzZUNhcHR1cmVTdWZmaXggOiAnJylcblx0XHRcdCwgZXZlbnRMaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNMaXN0ZW5lcnNbZXZlbnRLZXldXG5cdFx0XHRcdD0gdGhpcy5fZXZlbnRzTGlzdGVuZXJzW2V2ZW50S2V5XSB8fCBbXTtcblxuXHRcdGlmICghIF9oYXNFdmVudExpc3RlbmVycyhldmVudEtleSkpIHtcblx0XHRcdC8vIHRydWUgPSB1c2UgY2FwdHVyZSwgZm9yIHBhcnRpY3VsYXIgbGlzdGVuZXIgaXQgaXMgZGV0ZXJtaW5lZCBpbiBoYW5kbGVFdmVudFxuXHRcdFx0dGhpcy5kb20oKS5hZGRFdmVudExpc3RlbmVyKGV2ZW50S2V5LCB0aGlzLCB0cnVlKTtcblx0XHRcdHZhciBub3RZZXRBdHRhY2hlZCA9IHRydWU7XG5cdFx0fSBlbHNlXG5cdFx0XHRub3RZZXRBdHRhY2hlZCA9IGV2ZW50TGlzdGVuZXJzLmluZGV4T2YobGlzdGVuZXIpID09IC0xO1xuXG5cdFx0aWYgKG5vdFlldEF0dGFjaGVkKSB7XG5cdFx0XHR3YXNBdHRhY2hlZCA9IHRydWU7XG5cdFx0XHRldmVudExpc3RlbmVycy5wdXNoKGxpc3RlbmVyKTtcblx0XHR9XG5cdH0pO1xuXG5cdHJldHVybiB3YXNBdHRhY2hlZDtcbn1cblxuXG5mdW5jdGlvbiBhZGRMaXN0ZW5lcnNUb0V2ZW50cyhldmVudHNMaXN0ZW5lcnMsIHVzZUNhcHR1cmUpIHtcblx0Y2hlY2soZXZlbnRzTGlzdGVuZXJzLCBNYXRjaC5PYmplY3QpO1xuXG5cdHZhciB3YXNBdHRhY2hlZE1hcCA9IF8ubWFwS2V5cyhldmVudHNMaXN0ZW5lcnMsIGZ1bmN0aW9uKGxpc3RlbmVyLCBldmVudFR5cGVzKSB7XG5cdFx0cmV0dXJuIHRoaXMuYWRkTGlzdGVuZXIoZXZlbnRUeXBlcywgbGlzdGVuZXIsIHVzZUNhcHR1cmUpXG5cdH0sIHRoaXMpO1xuXG5cdHJldHVybiB3YXNBdHRhY2hlZE1hcDtcdFxufVxuXG5cbmZ1bmN0aW9uIHJlbW92ZUxpc3RlbmVyKGV2ZW50VHlwZXMsIGxpc3RlbmVyLCB1c2VDYXB0dXJlKSB7XG5cdGNoZWNrKGV2ZW50VHlwZXMsIFN0cmluZyk7XG5cdGNoZWNrKGxpc3RlbmVyLCBGdW5jdGlvbik7XG5cblx0dmFyIGV2ZW50c0FycmF5ID0gZXZlbnRUeXBlcy5zcGxpdCgvXFxzKlxcLD9cXHMqLylcblx0XHQsIHdhc1JlbW92ZWQgPSBmYWxzZTtcblxuXHRldmVudHNBcnJheS5mb3JFYWNoKGZ1bmN0aW9uKGV2ZW50VHlwZSkge1xuXHRcdGlmICh3cm9uZ0V2ZW50UGF0dGVybi50ZXN0KGV2ZW50VHlwZSkpXG5cdFx0XHR0aHJvdyBuZXcgUmFuZ2VFcnJvcignZXZlbnQgdHlwZSBjYW5ub3QgY29udGFpbiAnICsgdXNlQ2FwdHVyZVN1ZmZpeCk7XG5cblx0XHR2YXIgZXZlbnRLZXkgPSBldmVudFR5cGUgKyAodXNlQ2FwdHVyZSA/IHVzZUNhcHR1cmVTdWZmaXggOiAnJylcblx0XHRcdCwgZXZlbnRMaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNMaXN0ZW5lcnNbZXZlbnRLZXldO1xuXG5cdFx0aWYgKCEgKGV2ZW50TGlzdGVuZXJzICYmIGV2ZW50TGlzdGVuZXJzLmxlbmd0aCkpIHJldHVybjtcblxuXHRcdGlmIChsaXN0ZW5lcikge1xuXHRcdFx0bGlzdGVuZXJJbmRleCA9IGV2ZW50TGlzdGVuZXJzLmluZGV4T2YobGlzdGVuZXIpO1xuXHRcdFx0aWYgKGxpc3RlbmVySW5kZXggPT0gLTEpXG5cdFx0XHRcdHJldHVybjtcblx0XHRcdGV2ZW50TGlzdGVuZXJzLnNwbGljZShsaXN0ZW5lckluZGV4LCAxKTtcblx0XHRcdGlmICghIGV2ZW50TGlzdGVuZXJzLmxlbmd0aClcblx0XHRcdFx0ZGVsZXRlIHRoaXMuX2V2ZW50c0xpc3RlbmVyc1tldmVudEtleV07XG5cdFx0fSBlbHNlXG5cdFx0XHRkZWxldGUgdGhpcy5fZXZlbnRzTGlzdGVuZXJzW2V2ZW50S2V5XTtcblxuXHRcdHdhc1JlbW92ZWQgPSB0cnVlO1xuXG5cdFx0aWYgKCEgX2hhc0V2ZW50TGlzdGVuZXJzKGV2ZW50VHlwZSkpXG5cdFx0XHQvLyB0cnVlID0gdXNlIGNhcHR1cmUsIGZvciBwYXJ0aWN1bGFyIGxpc3RlbmVyIGl0IGlzIGRldGVybWluZWQgaW4gaGFuZGxlRXZlbnRcblx0XHRcdHRoaXMuZG9tKCkucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudFR5cGUsIHRoaXMsIHRydWUpO1xuXHR9KTtcblxuXHRyZXR1cm4gd2FzUmVtb3ZlZDtcbn1cblxuXG5mdW5jdGlvbiByZW1vdmVMaXN0ZW5lcnNGcm9tRXZlbnRzKGV2ZW50c0xpc3RlbmVycywgdXNlQ2FwdHVyZSkge1xuXHRjaGVjayhldmVudHNMaXN0ZW5lcnMsIE1hdGNoLk9iamVjdCk7XG5cblx0dmFyIHdhc1JlbW92ZWRNYXAgPSBfLm1hcEtleXMoZXZlbnRzTGlzdGVuZXJzLCBmdW5jdGlvbihsaXN0ZW5lciwgZXZlbnRUeXBlcykge1xuXHRcdHJldHVybiB0aGlzLnJlbW92ZUxpc3RlbmVyKGV2ZW50VHlwZXMsIGxpc3RlbmVyLCB1c2VDYXB0dXJlKTtcblx0fSwgdGhpcyk7XG5cblx0cmV0dXJuIHdhc1JlbW92ZWRNYXA7XG59XG5cblxuZnVuY3Rpb24gdHJpZ2dlckV2ZW50KGV2ZW50VHlwZSwgcHJvcGVydGllcykge1xuXHRjaGVjayhldmVudFR5cGUsIFN0cmluZyk7XG5cblx0dmFyIEV2ZW50Q29uc3RydWN0b3IgPSBkb21FdmVudHNDb25zdHJ1Y3RvcnNbZXZlbnRUeXBlXTtcblxuXHRpZiAodHlwZW9mIGV2ZW50Q29uc3RydWN0b3IgIT0gJ2Z1bmN0aW9uJylcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ3Vuc3VwcG9ydGVkIGV2ZW50IHR5cGUnKTtcblxuXHR2YXIgZG9tRXZlbnQgPSBFdmVudENvbnN0cnVjdG9yKGV2ZW50VHlwZSwgcHJvcGVydGllcyk7XG5cdC8vID8/PyBwcm9wZXJ0aWVzLnR5cGUgPSBldmVudFR5cGU7XG5cdC8vID8/PyBFdmVudENvbnN0cnVjdG9yKHByb3BlcnRpZXMpO1xuXHR2YXIgbm90Q2FuY2VsbGVkID0gdGhpcy5kb20oKS5kaXNwYXRjaEV2ZW50KGRvbUV2ZW50KTtcblxuXHRyZXR1cm4gbm90Q2FuY2VsbGVkO1xufVxuXG5cbmZ1bmN0aW9uIGdldExpc3RlbmVycyhldmVudFR5cGUsIHVzZUNhcHR1cmUpIHtcblx0Y2hlY2soZXZlbnRUeXBlLCBTdHJpbmcpO1xuXG5cdHZhciBldmVudEtleSA9IGV2ZW50VHlwZSArICh1c2VDYXB0dXJlID8gdXNlQ2FwdHVyZVN1ZmZpeCA6ICcnKVxuXHRcdCwgZXZlbnRMaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNMaXN0ZW5lcnNbZXZlbnRLZXldO1xuXG5cdHJldHVybiBldmVudExpc3RlbmVycyAmJiBldmVudExpc3RlbmVycy5sZW5ndGhcblx0XHRcdFx0ID8gW10uY29uY2F0KGV2ZW50TGlzdGVuZXJzKVxuXHRcdFx0XHQgOiB1bmRlZmluZWQ7XG59XG5cblxuZnVuY3Rpb24gX2hhc0V2ZW50TGlzdGVuZXJzKGV2ZW50VHlwZSkge1xuXHR2YXIgbm90Q2FwdHVyZWRFdmVudHMgPSB0aGlzLl9ldmVudHNMaXN0ZW5lcnNbZXZlbnRUeXBlXVxuXHRcdCwgY2FwdHVyZWRFdmVudHMgPSB0aGlzLl9ldmVudHNMaXN0ZW5lcnNbZXZlbnRUeXBlICsgdXNlQ2FwdHVyZVN1ZmZpeF07XG5cblx0cmV0dXJuIChub3RDYXB0dXJlZEV2ZW50cyAmJiBub3RDYXB0dXJlZEV2ZW50cy5sZW5ndGgpXG5cdFx0ICAgIHx8IChjYXB0dXJlZEV2ZW50cyAmJiBjYXB0dXJlZEV2ZW50cy5sZW5ndGgpO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ2xhc3NSZWdpc3RyeSA9IHJlcXVpcmUoJy4uLy4uL3JlZ2lzdHJ5Jylcblx0LCBDb21wb25lbnRGYWNldCA9IHJlcXVpcmUoJy4uL2NfZmFjZXQnKTtcblxudmFyIGZhY2V0c1JlZ2lzdHJ5ID0gbmV3IENsYXNzUmVnaXN0cnkoQ29tcG9uZW50RmFjZXQpO1xuXG5mYWNldHNSZWdpc3RyeS5hZGQoQ29tcG9uZW50RmFjZXQpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZhY2V0c1JlZ2lzdHJ5O1xuXG4vLyBUT0RPIC0gcmVmYWN0b3IgY29tcG9uZW50cyByZWdpc3RyeSB0ZXN0IGludG8gYSBmdW5jdGlvblxuLy8gdGhhdCB0ZXN0cyBhIHJlZ2lzdHJ5IHdpdGggYSBnaXZlbiBmb3VuZGF0aW9uIGNsYXNzXG4vLyBNYWtlIHRlc3QgZm9yIHRoaXMgcmVnaXN0cnkgYmFzZWQgb24gdGhpcyBmdW5jdGlvbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCdwcm90bycpO1xuXG5cbi8vIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL1JlZmVyZW5jZS9FdmVudHNcblxudmFyIGV2ZW50VHlwZXMgPSB7XG5cdENsaXBib2FyZEV2ZW50OiBbJ2NvcHknLCAnY3V0JywgJ3Bhc3RlJywgJ2JlZm9yZWNvcHknLCAnYmVmb3JlY3V0JywgJ2JlZm9yZXBhc3RlJ10sXG5cdEV2ZW50OiBbJ2lucHV0J10sXG5cdEZvY3VzRXZlbnQ6IFsnZm9jdXMnLCAnYmx1cicsICdmb2N1c2luJywgJ2ZvY3Vzb3V0J10sXG5cdEtleWJvYXJkRXZlbnQ6IFsna2V5ZG93bicsICdrZXlwcmVzcycsICAna2V5dXAnXSxcblx0TW91c2VFdmVudDogWydjbGljaycsICdjb250ZXh0bWVudScsICdkYmxjbGljaycsICdtb3VzZWRvd24nLCAnbW91c2V1cCcsXG5cdFx0XHRcdCAnbW91c2VlbnRlcicsICdtb3VzZWxlYXZlJywgJ21vdXNlbW92ZScsICdtb3VzZW91dCcsICdtb3VzZW92ZXInLFxuXHRcdFx0XHQgJ3Nob3cnIC8qIGNvbnRleHQgbWVudSAqL10sXG5cdFRvdWNoRXZlbnQ6IFsndG91Y2hzdGFydCcsICd0b3VjaGVuZCcsICd0b3VjaG1vdmUnLCAndG91Y2hlbnRlcicsICd0b3VjaGxlYXZlJywgJ3RvdWNoY2FuY2VsJ10sXG59O1xuXG5cbi8vIG1vY2sgd2luZG93IGFuZCBldmVudCBjb25zdHJ1Y3RvcnMgZm9yIHRlc3RpbmdcbmlmICh0eXBlb2Ygd2luZG93ICE9ICd1bmRlZmluZWQnKVxuXHR2YXIgZ2xvYmFsID0gd2luZG93O1xuZWxzZSB7XG5cdGdsb2JhbCA9IHt9O1xuXHRfLmVhY2hLZXkoZXZlbnRUeXBlcywgZnVuY3Rpb24oZVR5cGVzLCBldmVudENvbnN0cnVjdG9yTmFtZSkge1xuXHRcdHZhciBldmVudHNDb25zdHJ1Y3Rvcjtcblx0XHRldmFsKFxuXHRcdFx0J2V2ZW50c0NvbnN0cnVjdG9yID0gZnVuY3Rpb24gJyArIGV2ZW50Q29uc3RydWN0b3JOYW1lICsgJyh0eXBlLCBwcm9wZXJ0aWVzKSB7IFxcXG5cdFx0XHRcdHRoaXMudHlwZSA9IHR5cGU7IFxcXG5cdFx0XHRcdF8uZXh0ZW5kKHRoaXMsIHByb3BlcnRpZXMpOyBcXFxuXHRcdFx0fTsnXG5cdFx0KTtcblx0XHRnbG9iYWxbZXZlbnRDb25zdHJ1Y3Rvck5hbWVdID0gZXZlbnRzQ29uc3RydWN0b3I7XG5cdH0pO1xufVxuXG5cbnZhciBkb21FdmVudHNDb25zdHJ1Y3RvcnMgPSB7fTtcblxuXy5lYWNoS2V5KGV2ZW50VHlwZXMsIGZ1bmN0aW9uKGVUeXBlcywgZXZlbnRDb25zdHJ1Y3Rvck5hbWUpIHtcblx0ZVR5cGVzLmZvckVhY2goZnVuY3Rpb24odHlwZSkge1xuXHRcdGlmIChPYmplY3QuaGFzT3duUHJvcGVydHkoZG9tRXZlbnRzQ29uc3RydWN0b3JzLCB0eXBlKSlcblx0XHRcdHRocm93IG5ldyBFcnJvcignZHVwbGljYXRlIGV2ZW50IHR5cGUgJyArIHR5cGUpO1xuXG5cdFx0ZG9tRXZlbnRzQ29uc3RydWN0b3JzW3R5cGVdID0gZ2xvYmFsW2V2ZW50Q29uc3RydWN0b3JOYW1lXTtcblx0fSk7XG59KTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGRvbUV2ZW50c0NvbnN0cnVjdG9ycztcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIENsYXNzUmVnaXN0cnkgPSByZXF1aXJlKCcuLi9yZWdpc3RyeScpXG5cdCwgQ29tcG9uZW50ID0gcmVxdWlyZSgnLi9jX2NsYXNzJyk7XG5cbnZhciBjb21wb25lbnRzUmVnaXN0cnkgPSBuZXcgQ2xhc3NSZWdpc3RyeShDb21wb25lbnQpO1xuXG5jb21wb25lbnRzUmVnaXN0cnkuYWRkKENvbXBvbmVudCk7XG5cbm1vZHVsZS5leHBvcnRzID0gY29tcG9uZW50c1JlZ2lzdHJ5O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ29tcG9uZW50ID0gcmVxdWlyZSgnLi4vY19jbGFzcycpXG5cdCwgZmFjZXRzUmVnaXN0cnkgPSByZXF1aXJlKCcuLi9jX2ZhY2V0cy9jZl9yZWdpc3RyeScpXG5cdCwgY29tcG9uZW50c1JlZ2lzdHJ5ID0gcmVxdWlyZSgnLi4vY19yZWdpc3RyeScpO1xuXG5cbnZhciBWaWV3ID0gQ29tcG9uZW50LmNyZWF0ZUNvbXBvbmVudENsYXNzKCdWaWV3Jywge1xuXHRjb250YWluZXI6IGZhY2V0c1JlZ2lzdHJ5LmdldCgnQ29udGFpbmVyJylcbn0pO1xuXG5jb21wb25lbnRzUmVnaXN0cnkuYWRkKFZpZXcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZpZXc7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgncHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vY2hlY2snKVxuXHQsIE1hdGNoID0gY2hlY2suTWF0Y2g7XG5cbnZhciBtZXNzZW5nZXJNaXhpbiA9ICB7XG5cdGluaXRNZXNzZW5nZXI6IGluaXRNZXNzZW5nZXIsXG5cdG9uTWVzc2FnZTogcmVnaXN0ZXJTdWJzY3JpYmVyLFxuXHRvZmZNZXNzYWdlOiByZW1vdmVTdWJzY3JpYmVyLFxuXHRvbk1lc3NhZ2VzOiByZWdpc3RlclN1YnNjcmliZXJzLFxuXHRvZmZNZXNzYWdlczogcmVtb3ZlU3Vic2NyaWJlcnMsXG5cdHBvc3RNZXNzYWdlOiBwb3N0TWVzc2FnZSxcblx0Z2V0TWVzc2FnZVN1YnNjcmliZXJzOiBnZXRNZXNzYWdlU3Vic2NyaWJlcnMsXG5cdF9jaG9vc2VTdWJzY3JpYmVyc0hhc2g6IF9jaG9vc2VTdWJzY3JpYmVyc0hhc2hcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gbWVzc2VuZ2VyTWl4aW47XG5cblxuZnVuY3Rpb24gaW5pdE1lc3NlbmdlcigpIHtcblx0dGhpcy5fbWVzc2FnZVN1YnNjcmliZXJzID0ge307XG5cdHRoaXMuX3BhdHRlcm5NZXNzYWdlU3Vic2NyaWJlcnMgPSB7fTtcbn1cblxuXG5mdW5jdGlvbiByZWdpc3RlclN1YnNjcmliZXIobWVzc2FnZSwgc3Vic2NyaWJlcikge1xuXHRjaGVjayhtZXNzYWdlLCBNYXRjaC5PbmVPZihTdHJpbmcsIFJlZ0V4cCkpO1xuXHRjaGVjayhzdWJzY3JpYmVyLCBGdW5jdGlvbik7IFxuXG5cdHZhciBzdWJzY3JpYmVyc0hhc2ggPSB0aGlzLl9jaG9vc2VTdWJzY3JpYmVyc0hhc2gobWVzc2FnZSk7XG5cdHZhciBtc2dTdWJzY3JpYmVycyA9IHN1YnNjcmliZXJzSGFzaFttZXNzYWdlXSA9IHN1YnNjcmliZXJzSGFzaFttZXNzYWdlXSB8fCBbXTtcblx0dmFyIG5vdFlldFJlZ2lzdGVyZWQgPSBtc2dTdWJzY3JpYmVycy5pbmRleE9mKHN1YnNjcmliZXIpID09IC0xO1xuXG5cdGlmIChub3RZZXRSZWdpc3RlcmVkKVxuXHRcdG1zZ1N1YnNjcmliZXJzLnB1c2goc3Vic2NyaWJlcik7XG5cblx0cmV0dXJuIG5vdFlldFJlZ2lzdGVyZWQ7XG59XG5cblxuZnVuY3Rpb24gcmVnaXN0ZXJTdWJzY3JpYmVycyhtZXNzYWdlU3Vic2NyaWJlcnMpIHtcblx0Y2hlY2sobWVzc2FnZVN1YnNjcmliZXJzLCBNYXRjaC5PYmplY3QpO1xuXG5cdHZhciBub3RZZXRSZWdpc3RlcmVkTWFwID0gXy5tYXBLZXlzKG1lc3NhZ2VTdWJzY3JpYmVycywgZnVuY3Rpb24oc3Vic2NyaWJlciwgbWVzc2FnZSkge1xuXHRcdHJldHVybiB0aGlzLnJlZ2lzdGVyU3Vic2NyaWJlcihtZXNzYWdlLCBzdWJzY3JpYmVyKVxuXHR9LCB0aGlzKTtcblxuXHRyZXR1cm4gbm90WWV0UmVnaXN0ZXJlZE1hcDtcbn1cblxuXG4vLyByZW1vdmVzIGFsbCBzdWJzY3JpYmVycyBmb3IgdGhlIG1lc3NhZ2UgaWYgc3Vic2NyaWJlciBpc24ndCBzdXBwbGllZFxuZnVuY3Rpb24gcmVtb3ZlU3Vic2NyaWJlcihtZXNzYWdlLCBzdWJzY3JpYmVyKSB7XG5cdGNoZWNrKG1lc3NhZ2UsIE1hdGNoLk9uZU9mKFN0cmluZywgUmVnRXhwKSk7XG5cdGNoZWNrKHN1YnNjcmliZXIsIE1hdGNoLk9wdGlvbmFsKEZ1bmN0aW9uKSk7IFxuXG5cdHZhciBzdWJzY3JpYmVyc0hhc2ggPSB0aGlzLl9jaG9vc2VTdWJzY3JpYmVyc0hhc2gobWVzc2FnZSk7XG5cdHZhciBtc2dTdWJzY3JpYmVycyA9IHN1YnNjcmliZXJzSGFzaFttZXNzYWdlXTtcblx0aWYgKCEgbXNnU3Vic2NyaWJlcnMgfHwgISBtc2dTdWJzY3JpYmVycy5sZW5ndGgpIHJldHVybiBmYWxzZTtcblxuXHRpZiAoc3Vic2NyaWJlcikge1xuXHRcdHN1YnNjcmliZXJJbmRleCA9IG1zZ1N1YnNjcmliZXJzLmluZGV4T2Yoc3Vic2NyaWJlcik7XG5cdFx0aWYgKHN1YnNjcmliZXJJbmRleCA9PSAtMSkgcmV0dXJuIGZhbHNlO1xuXHRcdG1zZ1N1YnNjcmliZXJzLnNwbGljZShzdWJzY3JpYmVySW5kZXgsIDEpO1xuXHRcdGlmICghIG1zZ1N1YnNjcmliZXJzLmxlbmd0aClcblx0XHRcdGRlbGV0ZSBzdWJzY3JpYmVyc0hhc2hbbWVzc2FnZV07XG5cdH0gZWxzZVxuXHRcdGRlbGV0ZSBzdWJzY3JpYmVyc0hhc2hbbWVzc2FnZV07XG5cblx0cmV0dXJuIHRydWU7IC8vIHN1YnNjcmliZXIocykgcmVtb3ZlZFxufVxuXG5cbmZ1bmN0aW9uIHJlbW92ZVN1YnNjcmliZXJzKG1lc3NhZ2VTdWJzY3JpYmVycykge1xuXHRjaGVjayhtZXNzYWdlU3Vic2NyaWJlcnMsIE1hdGNoLk9iamVjdCk7XG5cblx0dmFyIHN1YnNjcmliZXJSZW1vdmVkTWFwID0gXy5tYXBLZXlzKG1lc3NhZ2VTdWJzY3JpYmVycywgZnVuY3Rpb24oc3Vic2NyaWJlciwgbWVzc2FnZSkge1xuXHRcdHJldHVybiB0aGlzLnJlZ2lzdGVyU3Vic2NyaWJlcihtZXNzYWdlLCBzdWJzY3JpYmVyKVxuXHR9LCB0aGlzKTtcblxuXHRyZXR1cm4gc3Vic2NyaWJlclJlbW92ZWRNYXA7XHRcbn1cblxuXG5mdW5jdGlvbiBwb3N0TWVzc2FnZShtZXNzYWdlLCBkYXRhKSB7XG5cdGNoZWNrKG1lc3NhZ2UsIE1hdGNoLk9uZU9mKFN0cmluZywgUmVnRXhwKSk7XG5cblx0dmFyIHN1YnNjcmliZXJzSGFzaCA9IHRoaXMuX2Nob29zZVN1YnNjcmliZXJzSGFzaChtZXNzYWdlKTtcblx0dmFyIG1zZ1N1YnNjcmliZXJzID0gc3Vic2NyaWJlcnNIYXNoW21lc3NhZ2VdO1xuXG5cdGNhbGxTdWJzY3JpYmVycyhtc2dTdWJzY3JpYmVycyk7XG5cblx0aWYgKG1lc3NhZ2UgaW5zdGFuY2VvZiBTdHJpbmcpIHtcblx0XHRfLmVhY2hLZXkodGhpcy5fcGF0dGVybk1lc3NhZ2VTdWJzY3JpYmVycywgXG5cdFx0XHRmdW5jdGlvbihwYXR0ZXJuU3Vic2NyaWJlcnMsIHBhdHRlcm4pIHtcblx0XHRcdFx0aWYgKHBhdHRlcm4udGVzdChtZXNzYWdlKSlcblx0XHRcdFx0XHRjYWxsU3Vic2NyaWJlcnMocGF0dGVyblN1YnNjcmliZXJzKTtcblx0XHRcdH1cblx0XHQpO1xuXHR9XG5cblx0ZnVuY3Rpb24gY2FsbFN1YnNjcmliZXJzKG1zZ1N1YnNjcmliZXJzKSB7XG5cdFx0bXNnU3Vic2NyaWJlcnMuZm9yRWFjaChmdW5jdGlvbihzdWJzY3JpYmVyKSB7XG5cdFx0XHRzdWJzY3JpYmVyKG1lc3NhZ2UsIGRhdGEpO1xuXHRcdH0pO1xuXHR9XG59XG5cblxuZnVuY3Rpb24gZ2V0TWVzc2FnZVN1YnNjcmliZXJzKG1lc3NhZ2UsIGluY2x1ZGVQYXR0ZXJuU3Vic2NyaWJlcnMpIHtcblx0Y2hlY2sobWVzc2FnZSwgTWF0Y2guT25lT2YoU3RyaW5nLCBSZWdFeHApKTtcblxuXHR2YXIgc3Vic2NyaWJlcnNIYXNoID0gdGhpcy5fY2hvb3NlU3Vic2NyaWJlcnNIYXNoKG1lc3NhZ2UpO1xuXHR2YXIgbXNnU3Vic2NyaWJlcnMgPSBtc2dTdWJzY3JpYmVyc1xuXHRcdFx0XHRcdFx0XHQ/IFtdLmNvbmNhdChzdWJzY3JpYmVyc0hhc2hbbWVzc2FnZV0pXG5cdFx0XHRcdFx0XHRcdDogW107XG5cblx0Ly8gcGF0dGVybiBzdWJzY3JpYmVycyBhcmUgaW5jdWRlZCBieSBkZWZhdWx0XG5cdGlmIChpbmNsdWRlUGF0dGVyblN1YnNjcmliZXJzICE9IGZhbHNlICYmIG1lc3NhZ2UgaW5zdGFuY2VvZiBTdHJpbmcpIHtcblx0XHRfLmVhY2hLZXkodGhpcy5fcGF0dGVybk1lc3NhZ2VTdWJzY3JpYmVycywgXG5cdFx0XHRmdW5jdGlvbihwYXR0ZXJuU3Vic2NyaWJlcnMsIHBhdHRlcm4pIHtcblx0XHRcdFx0aWYgKHBhdHRlcm5TdWJzY3JpYmVycyAmJiBwYXR0ZXJuU3Vic2NyaWJlcnMubGVuZ3RoXG5cdFx0XHRcdFx0XHQmJiBwYXR0ZXJuLnRlc3QobWVzc2FnZSkpXG5cdFx0XHRcdFx0Xy5hcHBlbmRBcnJheShtc2dTdWJzY3JpYmVycywgcGF0dGVyblN1YnNjcmliZXJzKTtcblx0XHRcdH1cblx0XHQpO1xuXHR9XG5cblx0cmV0dXJuIG1zZ1N1YnNjcmliZXJzLmxlbmd0aFxuXHRcdFx0XHQ/IG1zZ1N1YnNjcmliZXJzXG5cdFx0XHRcdDogdW5kZWZpbmVkO1xufVxuXG5cbmZ1bmN0aW9uIF9jaG9vc2VTdWJzY3JpYmVyc0hhc2gobWVzc2FnZSkge1xuXHRyZXR1cm4gbWVzc2FnZSBpbnN0YW5jZW9mIFJlZ0V4cFxuXHRcdFx0XHQ/IHRoaXMuX3BhdHRlcm5NZXNzYWdlU3Vic2NyaWJlcnNcblx0XHRcdFx0OiB0aGlzLl9tZXNzYWdlU3Vic2NyaWJlcnM7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgncHJvdG8nKTtcblxubW9kdWxlLmV4cG9ydHMgPSBGYWNldDtcblxuZnVuY3Rpb24gRmFjZXQob3duZXIsIG9wdGlvbnMpIHtcblx0dGhpcy5vd25lciA9IG93bmVyO1xuXHR0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuXHR0aGlzLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn1cblxuXy5leHRlbmRQcm90byhGYWNldCwge1xuXHRpbml0OiBmdW5jdGlvbigpIHt9XG59KTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIEZhY2V0ID0gcmVxdWlyZSgnLi9mX2NsYXNzJylcblx0LCBfID0gcmVxdWlyZSgncHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vY2hlY2snKVxuXHQsIE1hdGNoID0gY2hlY2suTWF0Y2g7XG5cbm1vZHVsZS5leHBvcnRzID0gRmFjZXRlZE9iamVjdDtcblxuLy8gYWJzdHJhY3QgY2xhc3MgZm9yIGZhY2V0ZWQgb2JqZWN0XG5mdW5jdGlvbiBGYWNldGVkT2JqZWN0KGZhY2V0c09wdGlvbnMgLyosIG90aGVyIGFyZ3MgLSBwYXNzZWQgdG8gaW5pdCBtZXRob2QgKi8pIHtcblx0Ly8gVE9ETyBpbnN0YW50aWF0ZSBmYWNldHMgaWYgY29uZmlndXJhdGlvbiBpc24ndCBwYXNzZWRcblx0Ly8gd3JpdGUgYSB0ZXN0IHRvIGNoZWNrIGl0XG5cdGZhY2V0c09wdGlvbnMgPSBmYWNldHNPcHRpb25zID8gXy5jbG9uZShmYWNldHNPcHRpb25zKSA6IHt9O1xuXG5cdHZhciB0aGlzQ2xhc3MgPSB0aGlzLmNvbnN0cnVjdG9yXG5cdFx0LCBmYWNldHMgPSB7fTtcblxuXHRpZiAodGhpcy5jb25zdHJ1Y3RvciA9PSBGYWNldGVkT2JqZWN0KVx0XHRcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ0ZhY2V0ZWRPYmplY3QgaXMgYW4gYWJzdHJhY3QgY2xhc3MsIGNhblxcJ3QgYmUgaW5zdGFudGlhdGVkJyk7XG5cdC8vaWYgKCEgdGhpc0NsYXNzLnByb3RvdHlwZS5mYWNldHMpXG5cdC8vXHR0aHJvdyBuZXcgRXJyb3IoJ05vIGZhY2V0cyBkZWZpbmVkIGluIGNsYXNzICcgKyB0aGlzLmNvbnN0cnVjdG9yLm5hbWUpO1xuXHRcblx0Ly8gXy5lYWNoS2V5KGZhY2V0c09wdGlvbnMsIGluc3RhbnRpYXRlRmFjZXQsIHRoaXMsIHRydWUpO1xuXG5cdF8uZWFjaEtleSh0aGlzLmZhY2V0cywgaW5zdGFudGlhdGVGYWNldCwgdGhpcywgdHJ1ZSk7XG5cblx0dmFyIHVudXNlZEZhY2V0c05hbWVzID0gT2JqZWN0LmtleXMoZmFjZXRzT3B0aW9ucyk7XG5cdGlmICh1bnVzZWRGYWNldHNOYW1lcy5sZW5ndGgpXG5cdFx0dGhyb3cgbmV3IEVycm9yKCdDb25maWd1cmF0aW9uIGZvciB1bmtub3duIGZhY2V0KHMpIHBhc3NlZDogJyArIHVudXNlZEZhY2V0c05hbWVzLmpvaW4oJywgJykpO1xuXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRoaXMsIGZhY2V0cyk7XG5cblx0Ly8gY2FsbGluZyBpbml0IGlmIGl0IGlzIGRlZmluZWQgaW4gdGhlIGNsYXNzXG5cdGlmICh0aGlzLmluaXQpXG5cdFx0dGhpcy5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cblx0ZnVuY3Rpb24gaW5zdGFudGlhdGVGYWNldCgvKiBmYWNldE9wdHMgKi8gZmFjZXRDbGFzcywgZmN0KSB7XG5cdFx0Ly8gdmFyIGZhY2V0Q2xhc3MgPSB0aGlzLmZhY2V0c1tmY3RdO1xuXHRcdHZhciBmYWNldE9wdHMgPSBmYWNldHNPcHRpb25zW2ZjdF07XG5cdFx0ZGVsZXRlIGZhY2V0c09wdGlvbnNbZmN0XTtcblxuXHRcdGZhY2V0c1tmY3RdID0ge1xuXHRcdFx0ZW51bWVyYWJsZTogZmFsc2UsXG5cdFx0XHR2YWx1ZTogbmV3IGZhY2V0Q2xhc3ModGhpcywgZmFjZXRPcHRzKVxuXHRcdH07XG5cdH1cbn1cblxuXG4vLyBmYWN0b3J5IHRoYXQgY3JlYXRlcyBjbGFzc2VzIChjb25zdHJ1Y3RvcnMpIGZyb20gdGhlIG1hcCBvZiBmYWNldHNcbi8vIHRoZXNlIGNsYXNzZXMgaW5oZXJpdCBmcm9tIEZhY2V0ZWRPYmplY3RcbkZhY2V0ZWRPYmplY3QuY3JlYXRlRmFjZXRlZENsYXNzID0gZnVuY3Rpb24gKG5hbWUsIGZhY2V0c0NsYXNzZXMpIHtcblx0Y2hlY2sobmFtZSwgU3RyaW5nKTtcblx0Y2hlY2soZmFjZXRzQ2xhc3NlcywgTWF0Y2guT2JqZWN0SGFzaChGdW5jdGlvbiAvKiBNYXRjaC5TdWJjbGFzcyhGYWNldCwgdHJ1ZSkgVE9ETyAtIGZpeCAqLykpO1xuXG5cdHZhciBGYWNldGVkQ2xhc3MgPSBfLmNyZWF0ZVN1YmNsYXNzKHRoaXMsIG5hbWUsIHRydWUpO1xuXG5cdF8uZXh0ZW5kUHJvdG8oRmFjZXRlZENsYXNzLCB7XG5cdFx0ZmFjZXRzOiBmYWNldHNDbGFzc2VzXG5cdH0pO1xuXHRyZXR1cm4gRmFjZXRlZENsYXNzO1xufTtcblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgbWlsbyA9IHtcblx0YmluZGVyOiByZXF1aXJlKCcuL2JpbmRlci9iaW5kZXInKVxufVxuXG5cbi8vIHVzZWQgZmFjZXRzXG5yZXF1aXJlKCcuL2NvbXBvbmVudHMvY19mYWNldHMvQ29udGFpbmVyJyk7XG5yZXF1aXJlKCcuL2NvbXBvbmVudHMvY19mYWNldHMvRXZlbnRzJyk7XG5yZXF1aXJlKCcuL2NvbXBvbmVudHMvY19mYWNldHMvTW9kZWwnKTtcblxuLy8gdXNlZCBjb21wb25lbnRzXG5yZXF1aXJlKCcuL2NvbXBvbmVudHMvY2xhc3Nlcy9WaWV3Jyk7XG5cblxuaWYgKHR5cGVvZiBtb2R1bGUgPT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpXG5cdC8vIGV4cG9ydCBmb3Igbm9kZS9icm93c2VyaWZ5XG5cdG1vZHVsZS5leHBvcnRzID0gbWlsbztcblxuaWYgKHR5cGVvZiB3aW5kb3cgPT0gJ29iamVjdCcpXG5cdHdpbmRvdy5taWxvID0gbWlsbztcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCdwcm90bycpXG5cdCwgY2hlY2sgPSByZXF1aXJlKCcuL2NoZWNrJylcblx0LCBNYXRjaCA9IGNoZWNrLk1hdGNoO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENsYXNzUmVnaXN0cnk7XG5cbmZ1bmN0aW9uIENsYXNzUmVnaXN0cnkgKEZvdW5kYXRpb25DbGFzcykge1xuXHRpZiAoRm91bmRhdGlvbkNsYXNzKVxuXHRcdHRoaXMuc2V0Q2xhc3MoRm91bmRhdGlvbkNsYXNzKTtcblxuXHQvLyBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ19fcmVnaXN0ZXJlZENsYXNzZXMnLCB7XG5cdC8vIFx0XHRlbnVtZXJhYmxlOiBmYWxzZSxcblx0Ly8gXHRcdHdyaXRhYmxlOiB0cnVlLFxuXHQvLyBcdFx0Y29uZmlndXJhYmxlOiB0cnVlLFxuXHQvLyBcdFx0dmFsdWU6IHt9XG5cdC8vIH0pO1xuXG5cdHRoaXMuX19yZWdpc3RlcmVkQ2xhc3NlcyA9IHt9O1xufVxuXG5fLmV4dGVuZFByb3RvKENsYXNzUmVnaXN0cnksIHtcblx0YWRkOiByZWdpc3RlckNsYXNzLFxuXHRnZXQ6IGdldENsYXNzLFxuXHRyZW1vdmU6IHVucmVnaXN0ZXJDbGFzcyxcblx0Y2xlYW46IHVucmVnaXN0ZXJBbGxDbGFzc2VzLFxuXHRzZXRDbGFzczogc2V0Rm91bmRhdGlvbkNsYXNzXG59KTtcblxuXG5mdW5jdGlvbiBzZXRGb3VuZGF0aW9uQ2xhc3MoRm91bmRhdGlvbkNsYXNzKSB7XG5cdGNoZWNrKEZvdW5kYXRpb25DbGFzcywgRnVuY3Rpb24pO1xuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ0ZvdW5kYXRpb25DbGFzcycsIHtcblx0XHRlbnVtZXJhYmxlOiB0cnVlLFxuXHRcdHZhbHVlOiBGb3VuZGF0aW9uQ2xhc3Ncblx0fSk7XG59XG5cbmZ1bmN0aW9uIHJlZ2lzdGVyQ2xhc3MoYUNsYXNzLCBuYW1lKSB7XG5cdG5hbWUgPSBuYW1lIHx8IGFDbGFzcy5uYW1lO1xuXG5cdGNoZWNrKG5hbWUsIFN0cmluZywgJ2NsYXNzIG5hbWUgbXVzdCBiZSBzdHJpbmcnKTtcblx0Y2hlY2sobmFtZSwgTWF0Y2guV2hlcmUoZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHR5cGVvZiBuYW1lID09ICdzdHJpbmcnICYmIG5hbWUgIT0gJyc7XG5cdH0pLCAnY2xhc3MgbmFtZSBtdXN0IGJlIHN0cmluZycpO1xuXHRpZiAodGhpcy5Gb3VuZGF0aW9uQ2xhc3MpIHtcblx0XHRpZiAoYUNsYXNzICE9IHRoaXMuRm91bmRhdGlvbkNsYXNzKVxuXHRcdFx0Y2hlY2soYUNsYXNzLCBNYXRjaC5TdWJjbGFzcyh0aGlzLkZvdW5kYXRpb25DbGFzcyksICdjbGFzcyBtdXN0IGJlIGEgc3ViKGNsYXNzKSBvZiBhIGZvdW5kYXRpb24gY2xhc3MnKTtcblx0fSBlbHNlXG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignZm91bmRhdGlvbiBjbGFzcyBtdXN0IGJlIHNldCBiZWZvcmUgYWRkaW5nIGNsYXNzZXMgdG8gcmVnaXN0cnknKTtcblxuXHRpZiAodGhpcy5fX3JlZ2lzdGVyZWRDbGFzc2VzW25hbWVdKVxuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ2lzIGFscmVhZHkgcmVnaXN0ZXJlZCcpO1xuXG5cdHRoaXMuX19yZWdpc3RlcmVkQ2xhc3Nlc1tuYW1lXSA9IGFDbGFzcztcbn07XG5cblxuZnVuY3Rpb24gZ2V0Q2xhc3MobmFtZSkge1xuXHRjaGVjayhuYW1lLCBTdHJpbmcsICdjbGFzcyBuYW1lIG11c3QgYmUgc3RyaW5nJyk7XG5cdHJldHVybiB0aGlzLl9fcmVnaXN0ZXJlZENsYXNzZXNbbmFtZV07XG59O1xuXG5cbmZ1bmN0aW9uIHVucmVnaXN0ZXJDbGFzcyhuYW1lT3JDbGFzcykge1xuXHRjaGVjayhuYW1lT3JDbGFzcywgTWF0Y2guT25lT2YoU3RyaW5nLCBGdW5jdGlvbiksICdjbGFzcyBvciBuYW1lIG11c3QgYmUgc3VwcGxpZWQnKTtcblxuXHR2YXIgbmFtZSA9IHR5cGVvZiBuYW1lT3JDbGFzcyA9PSAnc3RyaW5nJ1xuXHRcdFx0XHRcdFx0PyBuYW1lT3JDbGFzc1xuXHRcdFx0XHRcdFx0OiBuYW1lT3JDbGFzcy5uYW1lO1xuXHRcdFx0XHRcdFx0XG5cdGlmICghIHRoaXMuX19yZWdpc3RlcmVkQ2xhc3Nlc1tuYW1lXSlcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdjbGFzcyBpcyBub3QgcmVnaXN0ZXJlZCcpO1xuXG5cdGRlbGV0ZSB0aGlzLl9fcmVnaXN0ZXJlZENsYXNzZXNbbmFtZV07XG59O1xuXG5cbmZ1bmN0aW9uIHVucmVnaXN0ZXJBbGxDbGFzc2VzKCkge1xuXHR0aGlzLl9fcmVnaXN0ZXJlZENsYXNzZXMgPSB7fTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfO1xudmFyIHByb3RvID0gXyA9IHtcblx0ZXh0ZW5kUHJvdG86IGV4dGVuZFByb3RvLFxuXHRleHRlbmQ6IGV4dGVuZCxcblx0Y2xvbmU6IGNsb25lLFxuXHRjcmVhdGVTdWJjbGFzczogY3JlYXRlU3ViY2xhc3MsXG5cdG1ha2VTdWJjbGFzczogbWFrZVN1YmNsYXNzLFxuXHRhbGxLZXlzOiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcy5iaW5kKE9iamVjdCksXG5cdGtleU9mOiBrZXlPZixcblx0YWxsS2V5c09mOiBhbGxLZXlzT2YsXG5cdGVhY2hLZXk6IGVhY2hLZXksXG5cdG1hcEtleXM6IG1hcEtleXMsXG5cdGFwcGVuZEFycmF5OiBhcHBlbmRBcnJheSxcblx0cHJlcGVuZEFycmF5OiBwcmVwZW5kQXJyYXlcbn07XG5cblxuaWYgKHR5cGVvZiB3aW5kb3cgPT0gJ29iamVjdCcpIHtcblx0Ly8gcHJlc2VydmUgZXhpc3RpbmcgXyBvYmplY3Rcblx0aWYgKHdpbmRvdy5fKVxuXHRcdHByb3RvLnVuZGVyc2NvcmUgPSB3aW5kb3cuX1xuXG5cdC8vIGV4cG9zZSBnbG9iYWwgX1xuXHR3aW5kb3cuXyA9IHByb3RvO1xufVxuXG5pZiAodHlwZW9mIG1vZHVsZSA9PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cylcblx0Ly8gZXhwb3J0IGZvciBub2RlL2Jyb3dzZXJpZnlcblx0bW9kdWxlLmV4cG9ydHMgPSBwcm90bztcblx0XG5cbmZ1bmN0aW9uIGV4dGVuZFByb3RvKHNlbGYsIG1ldGhvZHMpIHtcblx0dmFyIHByb3BEZXNjcmlwdG9ycyA9IHt9O1xuXG5cdF8uZWFjaEtleShtZXRob2RzLCBmdW5jdGlvbihtZXRob2QsIG5hbWUpIHtcblx0XHRwcm9wRGVzY3JpcHRvcnNbbmFtZV0gPSB7XG5cdFx0XHRlbnVtZXJhYmxlOiBmYWxzZSxcblx0XHRcdGNvbmZpZ3VyYWJsZTogZmFsc2UsXG5cdFx0XHR3cml0YWJsZTogZmFsc2UsXG5cdFx0XHR2YWx1ZTogbWV0aG9kXG5cdFx0fTtcblx0fSk7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnRpZXMoc2VsZi5wcm90b3R5cGUsIHByb3BEZXNjcmlwdG9ycyk7XG5cdHJldHVybiBzZWxmO1xufVxuXG5cbmZ1bmN0aW9uIGV4dGVuZChzZWxmLCBvYmosIG9ubHlFbnVtZXJhYmxlKSB7XG5cdHZhciBwcm9wRGVzY3JpcHRvcnMgPSB7fTtcblxuXHRfLmVhY2hLZXkob2JqLCBmdW5jdGlvbih2YWx1ZSwgcHJvcCkge1xuXHRcdHZhciBkZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmosIHByb3ApO1xuXHRcdHByb3BEZXNjcmlwdG9yc1twcm9wXSA9IGRlc2NyaXB0b3I7XG5cdH0sIHRoaXMsIG9ubHlFbnVtZXJhYmxlKTtcblxuXHRPYmplY3QuZGVmaW5lUHJvcGVydGllcyhzZWxmLCBwcm9wRGVzY3JpcHRvcnMpO1xuXG5cdHJldHVybiBzZWxmO1xufVxuXG5cbmZ1bmN0aW9uIGNsb25lKG9iaikge1xuXHR2YXIgY2xvbmVkT2JqZWN0ID0gT2JqZWN0LmNyZWF0ZShvYmouY29uc3RydWN0b3IucHJvdG90eXBlKTtcblx0Xy5leHRlbmQoY2xvbmVkT2JqZWN0LCBvYmopO1xuXHRyZXR1cm4gY2xvbmVkT2JqZWN0O1xufVxuXG5cbmZ1bmN0aW9uIGNyZWF0ZVN1YmNsYXNzKHRoaXNDbGFzcywgbmFtZSwgYXBwbHlDb25zdHJ1Y3Rvcikge1xuXHR2YXIgc3ViY2xhc3M7XG5cblx0Ly8gbmFtZSBpcyBvcHRpb25hbFxuXHRuYW1lID0gbmFtZSB8fCAnJztcblxuXHQvLyBhcHBseSBzdXBlcmNsYXNzIGNvbnN0cnVjdG9yXG5cdHZhciBjb25zdHJ1Y3RvckNvZGUgPSBhcHBseUNvbnN0cnVjdG9yID09PSBmYWxzZVxuXHRcdFx0PyAnJ1xuXHRcdFx0OiAndGhpc0NsYXNzLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7JztcblxuXHRldmFsKCdzdWJjbGFzcyA9IGZ1bmN0aW9uICcgKyBuYW1lICsgJygpeyAnICsgY29uc3RydWN0b3JDb2RlICsgJyB9Jyk7XG5cblx0Ly8gcHByb3RvdHlwZSBjaGFpblxuXHRzdWJjbGFzcy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHRoaXNDbGFzcy5wcm90b3R5cGUpO1xuXHQvLyBzdWJjbGFzcyBpZGVudGl0eVxuXHRzdWJjbGFzcy5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBzdWJjbGFzcztcblx0Ly8gY29weSBjbGFzcyBtZXRob2RzXG5cdC8vIC0gZm9yIHRoZW0gdG8gd29yayBjb3JyZWN0bHkgdGhleSBzaG91bGQgbm90IGV4cGxpY3RseSB1c2Ugc3VwZXJjbGFzcyBuYW1lXG5cdC8vIGFuZCB1c2UgXCJ0aGlzXCIgaW5zdGVhZFxuXHRfLmV4dGVuZChzdWJjbGFzcywgdGhpc0NsYXNzLCB0cnVlKTtcblxuXHRyZXR1cm4gc3ViY2xhc3M7XG59XG5cblxuZnVuY3Rpb24gbWFrZVN1YmNsYXNzKHRoaXNDbGFzcywgU3VwZXJjbGFzcykge1xuXHR0aGlzQ2xhc3MucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShTdXBlcmNsYXNzLnByb3RvdHlwZSk7XG5cdHRoaXNDbGFzcy5wcm90b3R5cGUuY29uc3RydWN0b3IgPSB0aGlzQ2xhc3M7XG5cdHJldHVybiB0aGlzQ2xhc3M7XG59XG5cblxuZnVuY3Rpb24ga2V5T2Yoc2VsZiwgc2VhcmNoRWxlbWVudCwgb25seUVudW1lcmFibGUpIHtcblx0dmFyIHByb3BlcnRpZXMgPSBvbmx5RW51bWVyYWJsZSBcblx0XHRcdFx0XHRcdD8gT2JqZWN0LmtleXMoc2VsZilcblx0XHRcdFx0XHRcdDogXy5hbGxLZXlzKHNlbGYpO1xuXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgcHJvcGVydGllcy5sZW5ndGg7IGkrKylcblx0XHRpZiAoc2VhcmNoRWxlbWVudCA9PT0gc2VsZltwcm9wZXJ0aWVzW2ldXSlcblx0XHRcdHJldHVybiBwcm9wZXJ0aWVzW2ldO1xuXHRcblx0cmV0dXJuIHVuZGVmaW5lZDtcbn1cblxuXG5mdW5jdGlvbiBhbGxLZXlzT2Yoc2VsZiwgc2VhcmNoRWxlbWVudCwgb25seUVudW1lcmFibGUpIHtcblx0dmFyIHByb3BlcnRpZXMgPSBvbmx5RW51bWVyYWJsZSBcblx0XHRcdFx0XHRcdD8gT2JqZWN0LmtleXMoc2VsZilcblx0XHRcdFx0XHRcdDogXy5hbGxLZXlzKHNlbGYpO1xuXG5cdHZhciBrZXlzID0gcHJvcGVydGllcy5maWx0ZXIoZnVuY3Rpb24ocHJvcCkge1xuXHRcdHJldHVybiBzZWFyY2hFbGVtZW50ID09PSBzZWxmW3Byb3BdO1xuXHR9KTtcblxuXHRyZXR1cm4ga2V5cztcbn1cblxuXG5mdW5jdGlvbiBlYWNoS2V5KHNlbGYsIGNhbGxiYWNrLCB0aGlzQXJnLCBvbmx5RW51bWVyYWJsZSkge1xuXHR2YXIgcHJvcGVydGllcyA9IG9ubHlFbnVtZXJhYmxlIFxuXHRcdFx0XHRcdFx0PyBPYmplY3Qua2V5cyhzZWxmKVxuXHRcdFx0XHRcdFx0OiBfLmFsbEtleXMoc2VsZik7XG5cblx0cHJvcGVydGllcy5mb3JFYWNoKGZ1bmN0aW9uKHByb3ApIHtcblx0XHRjYWxsYmFjay5jYWxsKHRoaXNBcmcsIHNlbGZbcHJvcF0sIHByb3AsIHNlbGYpO1xuXHR9KTtcbn1cblxuXG5mdW5jdGlvbiBtYXBLZXlzKHNlbGYsIGNhbGxiYWNrLCB0aGlzQXJnLCBvbmx5RW51bWVyYWJsZSkge1xuXHR2YXIgbWFwUmVzdWx0ID0ge307XG5cdF8uZWFjaEtleShzZWxmLCBtYXBQcm9wZXJ0eSwgdGhpc0FyZywgb25seUVudW1lcmFibGUpO1xuXHRyZXR1cm4gbWFwUmVzdWx0O1xuXG5cdGZ1bmN0aW9uIG1hcFByb3BlcnR5KHZhbHVlLCBrZXkpIHtcblx0XHR2YXIgZGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Ioc2VsZiwga2V5KTtcblx0XHRpZiAoZGVzY3JpcHRvci5lbnVtZXJhYmxlIHx8ICEgb25seUVudW1lcmFibGUpIHtcblx0XHRcdGRlc2NyaXB0b3IudmFsdWUgPSBjYWxsYmFjay5jYWxsKHRoaXMsIHZhbHVlLCBrZXksIHNlbGYpO1xuXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KG1hcFJlc3VsdCwga2V5LCBkZXNjcmlwdG9yKTtcblx0XHR9XG5cdH1cbn1cblxuXG5mdW5jdGlvbiBhcHBlbmRBcnJheShzZWxmLCBhcnJheVRvQXBwZW5kKSB7XG5cdGlmICghIGFycmF5VG9BcHBlbmQubGVuZ3RoKSByZXR1cm4gc2VsZjtcblxuICAgIHZhciBhcmdzID0gW3NlbGYubGVuZ3RoLCAwXS5jb25jYXQoYXJyYXlUb0FwcGVuZCk7XG4gICAgQXJyYXkucHJvdG90eXBlLnNwbGljZS5hcHBseShzZWxmLCBhcmdzKTtcblxuICAgIHJldHVybiBzZWxmO1xufVxuXG5cbmZ1bmN0aW9uIHByZXBlbmRBcnJheShzZWxmLCBhcnJheVRvUHJlcGVuZCkge1xuXHRpZiAoISBhcnJheVRvUHJlcGVuZC5sZW5ndGgpIHJldHVybiBzZWxmO1xuXG4gICAgdmFyIGFyZ3MgPSBbMCwgMF0uY29uY2F0KGFycmF5VG9QcmVwZW5kKTtcbiAgICBBcnJheS5wcm90b3R5cGUuc3BsaWNlLmFwcGx5KHNlbGYsIGFyZ3MpO1xuXG4gICAgcmV0dXJuIHNlbGY7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmRlc2NyaWJlKCdtaWxvIGJpbmRlcicsIGZ1bmN0aW9uKCkge1xuICAgIGl0KCdzaG91bGQgYmluZCBjb21wb25lbnRzIGJhc2VkIG9uIG1sLWJpbmQgYXR0cmlidXRlJywgZnVuY3Rpb24oKSB7XG4gICAgXHR2YXIgbWlsbyA9IHJlcXVpcmUoJy4uLy4uL2xpYi9taWxvJyk7XG5cblx0XHRleHBlY3Qoe3A6IDF9KS5wcm9wZXJ0eSgncCcsIDEpO1xuXG4gICAgXHR2YXIgY29tcG9uZW50cyA9IG1pbG8uYmluZGVyKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd2aWV3VG9CaW5kJykpO1xuICAgIFx0XG5cdFx0Y29uc29sZS5sb2coY29tcG9uZW50cyk7XG4gICAgfSk7XG59KTtcbiJdfQ==
;