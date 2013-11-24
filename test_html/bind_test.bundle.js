;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var _ = require('proto')
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

},{"../check":4,"./error":2,"proto":19}],2:[function(require,module,exports){
'use strict';

var _ = require('proto');

function BindError(msg) {
	this.message = msg;
}

_.makeSubclass(BindError, Error);

module.exports = BindError;

},{"proto":19}],3:[function(require,module,exports){
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

},{"../check":4,"../components/c_registry":12,"./attribute":1,"./error":2,"proto":19}],4:[function(require,module,exports){
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
	, _ = require('proto')
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

	facetName = facetName || _.firstLowerCase(FacetClass.name);

	FacetedObject.prototype.addFacet.call(this, FacetClass, facetOpts, facetName);
}

},{"../check":4,"../facets/f_object":16,"./c_facet":6,"./c_facets/cf_registry":10,"./messenger":14,"proto":19}],6:[function(require,module,exports){
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
	, binder = require('../../binder')
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
	this.initMessenger();
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

},{"../../binder":3,"../c_facet":6,"./cf_registry":10,"proto":19}],8:[function(require,module,exports){
'use strict';

},{}],9:[function(require,module,exports){
'use strict';

var ComponentFacet = require('../c_facet')
	, FacetError = ComponentFacet.Error
	, _ = require('proto')
	, facetsRegistry = require('./cf_registry')
	, messengerMixin = require('../messenger')
	, domEventsConstructors = require('./dom_events')
	, check = require('../../check')
	, Match = check.Match;

var eventsSplitRegExp = /\s*(?:\,|\s)\s*/;


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
	_hasEventListeners: _hasEventListeners
	// _reattach: _reattachEventsOnElementChange
});

facetsRegistry.add(Events);


var useCaptureSuffix = '__capture'
	, wrongEventPattern = /__capture/;


function initEventsFacet() {
	// initialize listeners map
	Object.defineProperty(this, '_eventsListeners', {
		value: {}
	});
}


function getDomElement() {
	return this.owner.el;
}


function handleEvent(event) {
	var isCapturePhase = event.eventPhase == window.Event.CAPTURING_PHASE;

	var eventKey = event.type + (isCapturePhase ? useCaptureSuffix : '')
		, eventListeners = this._eventsListeners[eventKey];

	if (eventListeners)
		eventListeners.forEach(function(listener) {
			listener(event);
		});
}


function addListener(eventTypes, listener, useCapture) {
	check(eventTypes, String);
	check(listener, Function);

	var eventsArray = eventTypes.split(eventsSplitRegExp)
		, wasAttached = false;

	eventsArray.forEach(function(eventType) {
		_addListener.call(this, eventType, listener, useCapture);
	}, this);

	return wasAttached;


	function _addListener(eventType, listener, useCapture) {
		if (wrongEventPattern.test(eventType))
			throw new RangeError('event type cannot contain ' + useCaptureSuffix);

		var eventKey = eventType + (useCapture ? useCaptureSuffix : '')
			, eventListeners = this._eventsListeners[eventKey]
				= this._eventsListeners[eventKey] || [];

		if (! this._hasEventListeners(eventKey)) {
			// true = use capture, for particular listener it is determined in handleEvent
			this.dom().addEventListener(eventKey, this, true);
			var notYetAttached = true;
		} else
			notYetAttached = eventListeners.indexOf(listener) == -1;

		if (notYetAttached) {
			wasAttached = true;
			eventListeners.push(listener);
		}
	}
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

	var eventsArray = eventTypes.split(eventsSplitRegExp)
		, wasRemoved = false;

	eventsArray.forEach(function(eventType) {
		_removeListener.call(this, eventType, listener, useCapture);
	}, this);

	return wasRemoved;


	function _removeListener(eventType, listener, useCapture) {
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

		if (! this._hasEventListeners(eventType))
			// true = use capture, for particular listener it is determined in handleEvent
			this.dom().removeEventListener(eventType, this, true);
	}
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

},{"../../check":4,"../c_facet":6,"../messenger":14,"./cf_registry":10,"./dom_events":11,"proto":19}],10:[function(require,module,exports){
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
			value: {}
		},
		_patternMessageSubscribers: {
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


},{"../check":4,"./f_class":15,"proto":19}],17:[function(require,module,exports){
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

},{"./binder":3,"./components/c_facets/Container":7,"./components/c_facets/Data":8,"./components/c_facets/Events":9,"./components/classes/View":13}],18:[function(require,module,exports){
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

    	var ctrl = milo.binder();

    	ctrl.articleButton.events.on('click', function(e) {
    		console.log('button clicked', e);
    	});

    	ctrl.articleIdInput.events.on('input', logEvent);

    	function logEvent(e) {
    		console.log(e);
    	}
    	
		console.log(ctrl);
    });
});

},{"../../lib/milo":17}]},{},[20])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2JpbmRlci9hdHRyaWJ1dGUuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2JpbmRlci9lcnJvci5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvYmluZGVyL2luZGV4LmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jaGVjay5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jX2NsYXNzLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfZmFjZXQuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19mYWNldHMvQ29udGFpbmVyLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfZmFjZXRzL0RhdGEuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19mYWNldHMvRXZlbnRzLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfZmFjZXRzL2NmX3JlZ2lzdHJ5LmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfZmFjZXRzL2RvbV9ldmVudHMuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19yZWdpc3RyeS5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvY29tcG9uZW50cy9jbGFzc2VzL1ZpZXcuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvbWVzc2VuZ2VyLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9mYWNldHMvZl9jbGFzcy5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvZmFjZXRzL2Zfb2JqZWN0LmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9taWxvLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9yZWdpc3RyeS5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9ub2RlX21vZHVsZXMvcHJvdG8vbGliL3Byb3RvLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL3Rlc3RfaHRtbC9iaW5kX3Rlc3QvYmluZF90ZXN0LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDblhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDek1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCdwcm90bycpXG5cdCwgY2hlY2sgPSByZXF1aXJlKCcuLi9jaGVjaycpXG5cdCwgTWF0Y2ggPSBjaGVjay5NYXRjaFxuXHQsIEJpbmRFcnJvciA9IHJlcXVpcmUoJy4vZXJyb3InKTtcblxuLy8gTWF0Y2hlcztcbi8vIDpteVZpZXcgLSBvbmx5IGNvbXBvbmVudCBuYW1lXG4vLyBWaWV3Om15VmlldyAtIGNsYXNzIGFuZCBjb21wb25lbnQgbmFtZVxuLy8gW0V2ZW50cywgRGF0YV06bXlWaWV3IC0gZmFjZXRzIGFuZCBjb21wb25lbnQgbmFtZVxuLy8gVmlld1tFdmVudHNdOm15VmlldyAtIGNsYXNzLCBmYWNldChzKSBhbmQgY29tcG9uZW50IG5hbWVcbnZhciBhdHRyUmVnRXhwPSAvXihbXlxcOlxcW1xcXV0qKSg/OlxcWyhbXlxcOlxcW1xcXV0qKVxcXSk/XFw6PyhbXjpdKikkL1xuXHQsIGZhY2V0c1NwbGl0UmVnRXhwID0gL1xccyooPzpcXCx8XFxzKVxccyovO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gQXR0cmlidXRlO1xuXG5mdW5jdGlvbiBBdHRyaWJ1dGUoZWwsIG5hbWUpIHtcblx0dGhpcy5uYW1lID0gbmFtZTtcblx0dGhpcy5lbCA9IGVsO1xuXHR0aGlzLm5vZGUgPSBlbC5hdHRyaWJ1dGVzW25hbWVdO1xufVxuXG5fLmV4dGVuZFByb3RvKEF0dHJpYnV0ZSwge1xuXHRnZXQ6IGdldEF0dHJpYnV0ZVZhbHVlLFxuXHRzZXQ6IHNldEF0dHJpYnV0ZVZhbHVlLFxuXHRwYXJzZTogcGFyc2VBdHRyaWJ1dGUsXG5cdHZhbGlkYXRlOiB2YWxpZGF0ZUF0dHJpYnV0ZVxufSk7XG5cblxuZnVuY3Rpb24gZ2V0QXR0cmlidXRlVmFsdWUoKSB7XG5cdHJldHVybiB0aGlzLmVsLmdldEF0dHJpYnV0ZSh0aGlzLm5hbWUpO1xufVxuXG5mdW5jdGlvbiBzZXRBdHRyaWJ1dGVWYWx1ZSh2YWx1ZSkge1xuXHR0aGlzLmVsLnNldEF0dHJpYnV0ZSh0aGlzLm5hbWUsIHZhbHVlKTtcbn1cblxuZnVuY3Rpb24gcGFyc2VBdHRyaWJ1dGUoKSB7XG5cdGlmICghIHRoaXMubm9kZSkgcmV0dXJuO1xuXG5cdHZhciB2YWx1ZSA9IHRoaXMuZ2V0KCk7XG5cblx0aWYgKHZhbHVlKVxuXHRcdHZhciBiaW5kVG8gPSB2YWx1ZS5tYXRjaChhdHRyUmVnRXhwKTtcblxuXHRpZiAoISBiaW5kVG8pXG5cdFx0dGhyb3cgbmV3IEJpbmRFcnJvcignaW52YWxpZCBiaW5kIGF0dHJpYnV0ZSAnICsgdmFsdWUpO1xuXG5cdHRoaXMuY29tcENsYXNzID0gYmluZFRvWzFdIHx8ICdDb21wb25lbnQnO1xuXHR0aGlzLmNvbXBGYWNldHMgPSAoYmluZFRvWzJdICYmIGJpbmRUb1syXS5zcGxpdChmYWNldHNTcGxpdFJlZ0V4cCkpIHx8IHVuZGVmaW5lZDtcblx0dGhpcy5jb21wTmFtZSA9IGJpbmRUb1szXSB8fCB1bmRlZmluZWQ7XG5cblx0cmV0dXJuIHRoaXM7XG59XG5cbmZ1bmN0aW9uIHZhbGlkYXRlQXR0cmlidXRlKCkge1xuXHR2YXIgY29tcE5hbWUgPSB0aGlzLmNvbXBOYW1lO1xuXHRjaGVjayhjb21wTmFtZSwgTWF0Y2guV2hlcmUoZnVuY3Rpb24oKSB7XG4gIFx0XHRyZXR1cm4gdHlwZW9mIGNvbXBOYW1lID09ICdzdHJpbmcnICYmIGNvbXBOYW1lICE9ICcnO1xuXHR9KSwgJ2VtcHR5IGNvbXBvbmVudCBuYW1lJyk7XG5cblx0aWYgKCEgdGhpcy5jb21wQ2xhc3MpXG5cdFx0dGhyb3cgbmV3IEJpbmRFcnJvcignZW1wdHkgY29tcG9uZW50IGNsYXNzIG5hbWUgJyArIHRoaXMuY29tcENsYXNzKTtcblxuXHRyZXR1cm4gdGhpcztcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCdwcm90bycpO1xuXG5mdW5jdGlvbiBCaW5kRXJyb3IobXNnKSB7XG5cdHRoaXMubWVzc2FnZSA9IG1zZztcbn1cblxuXy5tYWtlU3ViY2xhc3MoQmluZEVycm9yLCBFcnJvcik7XG5cbm1vZHVsZS5leHBvcnRzID0gQmluZEVycm9yO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgY29tcG9uZW50c1JlZ2lzdHJ5ID0gcmVxdWlyZSgnLi4vY29tcG9uZW50cy9jX3JlZ2lzdHJ5Jylcblx0LCBDb21wb25lbnQgPSBjb21wb25lbnRzUmVnaXN0cnkuZ2V0KCdDb21wb25lbnQnKVxuXHQsIEF0dHJpYnV0ZSA9IHJlcXVpcmUoJy4vYXR0cmlidXRlJylcblx0LCBCaW5kRXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yJylcblx0LCBfID0gcmVxdWlyZSgncHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vY2hlY2snKVxuXHQsIE1hdGNoID0gIGNoZWNrLk1hdGNoO1xuXG5cbnZhciBvcHRzID0ge1xuXHRCSU5EX0FUVFI6ICdtbC1iaW5kJ1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGJpbmRlcjtcblxuZnVuY3Rpb24gYmluZGVyKHNjb3BlRWwsIGJpbmRTY29wZUVsKSB7XG5cdHZhciBzY29wZUVsID0gc2NvcGVFbCB8fCBkb2N1bWVudC5ib2R5XG5cdFx0LCBjb21wb25lbnRzID0ge307XG5cblx0Ly8gaXRlcmF0ZSBjaGlsZHJlbiBvZiBzY29wZUVsXG5cdEFycmF5LnByb3RvdHlwZS5mb3JFYWNoLmNhbGwoc2NvcGVFbC5jaGlsZHJlbiwgYmluZEVsZW1lbnQpO1xuXG5cdHJldHVybiBjb21wb25lbnRzO1xuXG5cdGZ1bmN0aW9uIGJpbmRFbGVtZW50KGVsKXtcblx0XHR2YXIgYXR0ciA9IG5ldyBBdHRyaWJ1dGUoZWwsIG9wdHMuQklORF9BVFRSKTtcblxuXHRcdHZhciBhQ29tcG9uZW50ID0gY3JlYXRlQ29tcG9uZW50KGVsLCBhdHRyKTtcblxuXHRcdC8vIGJpbmQgaW5uZXIgZWxlbWVudHMgdG8gY29tcG9uZW50c1xuXHRcdGlmIChlbC5jaGlsZHJlbiAmJiBlbC5jaGlsZHJlbi5sZW5ndGgpIHtcblx0XHRcdHZhciBpbm5lckNvbXBvbmVudHMgPSBiaW5kZXIoZWwpO1xuXG5cdFx0XHRpZiAoT2JqZWN0LmtleXMoaW5uZXJDb21wb25lbnRzKS5sZW5ndGgpIHtcblx0XHRcdFx0Ly8gYXR0YWNoIGlubmVyIGNvbXBvbmVudHMgdG8gdGhlIGN1cnJlbnQgb25lIChjcmVhdGUgYSBuZXcgc2NvcGUpIC4uLlxuXHRcdFx0XHRpZiAodHlwZW9mIGFDb21wb25lbnQgIT0gJ3VuZGVmaW5lZCcgJiYgYUNvbXBvbmVudC5jb250YWluZXIpXG5cdFx0XHRcdFx0YUNvbXBvbmVudC5jb250YWluZXIuYWRkKGlubmVyQ29tcG9uZW50cyk7XG5cdFx0XHRcdGVsc2UgLy8gb3Iga2VlcCB0aGVtIGluIHRoZSBjdXJyZW50IHNjb3BlXG5cdFx0XHRcdFx0Xy5lYWNoS2V5KGlubmVyQ29tcG9uZW50cywgc3RvcmVDb21wb25lbnQpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmIChhQ29tcG9uZW50KVxuXHRcdFx0c3RvcmVDb21wb25lbnQoYUNvbXBvbmVudCwgYXR0ci5jb21wTmFtZSk7XG5cdH1cblxuXHRmdW5jdGlvbiBjcmVhdGVDb21wb25lbnQoZWwsIGF0dHIpIHtcblx0XHRpZiAoYXR0ci5ub2RlKSB7IC8vIGVsZW1lbnQgd2lsbCBiZSBib3VuZCB0byBhIGNvbXBvbmVudFxuXHRcdFx0YXR0ci5wYXJzZSgpLnZhbGlkYXRlKCk7XG5cblx0XHRcdC8vIGdldCBjb21wb25lbnQgY2xhc3MgZnJvbSByZWdpc3RyeSBhbmQgdmFsaWRhdGVcblx0XHRcdHZhciBDb21wb25lbnRDbGFzcyA9IGNvbXBvbmVudHNSZWdpc3RyeS5nZXQoYXR0ci5jb21wQ2xhc3MpO1xuXG5cdFx0XHRpZiAoISBDb21wb25lbnRDbGFzcylcblx0XHRcdFx0dGhyb3cgbmV3IEJpbmRFcnJvcignY2xhc3MgJyArIGF0dHIuY29tcENsYXNzICsgJyBpcyBub3QgcmVnaXN0ZXJlZCcpO1xuXG5cdFx0XHRjaGVjayhDb21wb25lbnRDbGFzcywgTWF0Y2guU3ViY2xhc3MoQ29tcG9uZW50LCB0cnVlKSk7XG5cdFxuXHRcdFx0Ly8gY3JlYXRlIG5ldyBjb21wb25lbnRcblx0XHRcdHZhciBhQ29tcG9uZW50ID0gbmV3IENvbXBvbmVudENsYXNzKHt9LCBlbCk7XG5cblx0XHRcdC8vIGFkZCBleHRyYSBmYWNldHNcblx0XHRcdHZhciBmYWNldHMgPSBhdHRyLmNvbXBGYWNldHM7XG5cdFx0XHRpZiAoZmFjZXRzKVxuXHRcdFx0XHRmYWNldHMuZm9yRWFjaChmdW5jdGlvbihmY3QpIHtcblx0XHRcdFx0XHRhQ29tcG9uZW50LmFkZEZhY2V0KGZjdCk7XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRyZXR1cm4gYUNvbXBvbmVudDtcblx0XHR9XG5cdH1cblxuXG5cdGZ1bmN0aW9uIHN0b3JlQ29tcG9uZW50KGFDb21wb25lbnQsIG5hbWUpIHtcblx0XHRpZiAoY29tcG9uZW50c1tuYW1lXSlcblx0XHRcdHRocm93IG5ldyBCaW5kRXJyb3IoJ2R1cGxpY2F0ZSBjb21wb25lbnQgbmFtZTogJyArIG5hbWUpO1xuXG5cdFx0Y29tcG9uZW50c1tuYW1lXSA9IGFDb21wb25lbnQ7XG5cdH1cbn1cblxuXG5iaW5kZXIuY29uZmlnID0gZnVuY3Rpb24ob3B0aW9ucykge1xuXHRvcHRzLmV4dGVuZChvcHRpb25zKTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbi8vIFhYWCBkb2NzXG5cbi8vIFRoaW5ncyB3ZSBleHBsaWNpdGx5IGRvIE5PVCBzdXBwb3J0OlxuLy8gICAgLSBoZXRlcm9nZW5vdXMgYXJyYXlzXG52YXIgXyA9IHJlcXVpcmUoJ3Byb3RvJyk7XG5cbnZhciBjaGVjayA9IGZ1bmN0aW9uICh2YWx1ZSwgcGF0dGVybikge1xuICAvLyBSZWNvcmQgdGhhdCBjaGVjayBnb3QgY2FsbGVkLCBpZiBzb21lYm9keSBjYXJlZC5cbiAgdHJ5IHtcbiAgICBjaGVja1N1YnRyZWUodmFsdWUsIHBhdHRlcm4pO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICBpZiAoKGVyciBpbnN0YW5jZW9mIE1hdGNoLkVycm9yKSAmJiBlcnIucGF0aClcbiAgICAgIGVyci5tZXNzYWdlICs9IFwiIGluIGZpZWxkIFwiICsgZXJyLnBhdGg7XG4gICAgdGhyb3cgZXJyO1xuICB9XG59O1xubW9kdWxlLmV4cG9ydHMgPSBjaGVjaztcblxudmFyIE1hdGNoID0gY2hlY2suTWF0Y2ggPSB7XG4gIE9wdGlvbmFsOiBmdW5jdGlvbiAocGF0dGVybikge1xuICAgIHJldHVybiBuZXcgT3B0aW9uYWwocGF0dGVybik7XG4gIH0sXG4gIE9uZU9mOiBmdW5jdGlvbiAoLyphcmd1bWVudHMqLykge1xuICAgIHJldHVybiBuZXcgT25lT2YoYXJndW1lbnRzKTtcbiAgfSxcbiAgQW55OiBbJ19fYW55X18nXSxcbiAgV2hlcmU6IGZ1bmN0aW9uIChjb25kaXRpb24pIHtcbiAgICByZXR1cm4gbmV3IFdoZXJlKGNvbmRpdGlvbik7XG4gIH0sXG4gIE9iamVjdEluY2x1ZGluZzogZnVuY3Rpb24gKHBhdHRlcm4pIHtcbiAgICByZXR1cm4gbmV3IE9iamVjdEluY2x1ZGluZyhwYXR0ZXJuKTtcbiAgfSxcbiAgLy8gTWF0Y2hlcyBvbmx5IHNpZ25lZCAzMi1iaXQgaW50ZWdlcnNcbiAgSW50ZWdlcjogWydfX2ludGVnZXJfXyddLFxuXG4gIC8vIE1hdGNoZXMgaGFzaCAob2JqZWN0KSB3aXRoIHZhbHVlcyBtYXRjaGluZyBwYXR0ZXJuXG4gIE9iamVjdEhhc2g6IGZ1bmN0aW9uKHBhdHRlcm4pIHtcbiAgICByZXR1cm4gbmV3IE9iamVjdEhhc2gocGF0dGVybik7XG4gIH0sXG5cbiAgU3ViY2xhc3M6IGZ1bmN0aW9uKFN1cGVyY2xhc3MsIG1hdGNoU3VwZXJjbGFzc1Rvbykge1xuICAgIHJldHVybiBuZXcgU3ViY2xhc3MoU3VwZXJjbGFzcywgbWF0Y2hTdXBlcmNsYXNzVG9vKTtcbiAgfSxcblxuICAvLyBYWFggbWF0Y2hlcnMgc2hvdWxkIGtub3cgaG93IHRvIGRlc2NyaWJlIHRoZW1zZWx2ZXMgZm9yIGVycm9yc1xuICBFcnJvcjogVHlwZUVycm9yLFxuXG4gIC8vIE1ldGVvci5tYWtlRXJyb3JUeXBlKFwiTWF0Y2guRXJyb3JcIiwgZnVuY3Rpb24gKG1zZykge1xuICAgIC8vIHRoaXMubWVzc2FnZSA9IFwiTWF0Y2ggZXJyb3I6IFwiICsgbXNnO1xuICAgIC8vIFRoZSBwYXRoIG9mIHRoZSB2YWx1ZSB0aGF0IGZhaWxlZCB0byBtYXRjaC4gSW5pdGlhbGx5IGVtcHR5LCB0aGlzIGdldHNcbiAgICAvLyBwb3B1bGF0ZWQgYnkgY2F0Y2hpbmcgYW5kIHJldGhyb3dpbmcgdGhlIGV4Y2VwdGlvbiBhcyBpdCBnb2VzIGJhY2sgdXAgdGhlXG4gICAgLy8gc3RhY2suXG4gICAgLy8gRS5nLjogXCJ2YWxzWzNdLmVudGl0eS5jcmVhdGVkXCJcbiAgICAvLyB0aGlzLnBhdGggPSBcIlwiO1xuICAgIC8vIElmIHRoaXMgZ2V0cyBzZW50IG92ZXIgRERQLCBkb24ndCBnaXZlIGZ1bGwgaW50ZXJuYWwgZGV0YWlscyBidXQgYXQgbGVhc3RcbiAgICAvLyBwcm92aWRlIHNvbWV0aGluZyBiZXR0ZXIgdGhhbiA1MDAgSW50ZXJuYWwgc2VydmVyIGVycm9yLlxuICAvLyAgIHRoaXMuc2FuaXRpemVkRXJyb3IgPSBuZXcgTWV0ZW9yLkVycm9yKDQwMCwgXCJNYXRjaCBmYWlsZWRcIik7XG4gIC8vIH0pLFxuXG4gIC8vIFRlc3RzIHRvIHNlZSBpZiB2YWx1ZSBtYXRjaGVzIHBhdHRlcm4uIFVubGlrZSBjaGVjaywgaXQgbWVyZWx5IHJldHVybnMgdHJ1ZVxuICAvLyBvciBmYWxzZSAodW5sZXNzIGFuIGVycm9yIG90aGVyIHRoYW4gTWF0Y2guRXJyb3Igd2FzIHRocm93bikuIEl0IGRvZXMgbm90XG4gIC8vIGludGVyYWN0IHdpdGggX2ZhaWxJZkFyZ3VtZW50c0FyZU5vdEFsbENoZWNrZWQuXG4gIC8vIFhYWCBtYXliZSBhbHNvIGltcGxlbWVudCBhIE1hdGNoLm1hdGNoIHdoaWNoIHJldHVybnMgbW9yZSBpbmZvcm1hdGlvbiBhYm91dFxuICAvLyAgICAgZmFpbHVyZXMgYnV0IHdpdGhvdXQgdXNpbmcgZXhjZXB0aW9uIGhhbmRsaW5nIG9yIGRvaW5nIHdoYXQgY2hlY2soKVxuICAvLyAgICAgZG9lcyB3aXRoIF9mYWlsSWZBcmd1bWVudHNBcmVOb3RBbGxDaGVja2VkIGFuZCBNZXRlb3IuRXJyb3IgY29udmVyc2lvblxuICB0ZXN0OiBmdW5jdGlvbiAodmFsdWUsIHBhdHRlcm4pIHtcbiAgICB0cnkge1xuICAgICAgY2hlY2tTdWJ0cmVlKHZhbHVlLCBwYXR0ZXJuKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChlIGluc3RhbmNlb2YgTWF0Y2guRXJyb3IpXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIC8vIFJldGhyb3cgb3RoZXIgZXJyb3JzLlxuICAgICAgdGhyb3cgZTtcbiAgICB9XG4gIH0sXG5cbiAgLy8gUnVucyBgZi5hcHBseShjb250ZXh0LCBhcmdzKWAuIElmIGNoZWNrKCkgaXMgbm90IGNhbGxlZCBvbiBldmVyeSBlbGVtZW50IG9mXG4gIC8vIGBhcmdzYCAoZWl0aGVyIGRpcmVjdGx5IG9yIGluIHRoZSBmaXJzdCBsZXZlbCBvZiBhbiBhcnJheSksIHRocm93cyBhbiBlcnJvclxuICAvLyAodXNpbmcgYGRlc2NyaXB0aW9uYCBpbiB0aGUgbWVzc2FnZSkuXG4gIC8vXG4gIF9mYWlsSWZBcmd1bWVudHNBcmVOb3RBbGxDaGVja2VkOiBmdW5jdGlvbiAoZiwgY29udGV4dCwgYXJncywgZGVzY3JpcHRpb24pIHtcbiAgICB2YXIgYXJnQ2hlY2tlciA9IG5ldyBBcmd1bWVudENoZWNrZXIoYXJncywgZGVzY3JpcHRpb24pO1xuICAgIHZhciByZXN1bHQgPSBjdXJyZW50QXJndW1lbnRDaGVja2VyLndpdGhWYWx1ZShhcmdDaGVja2VyLCBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gZi5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICB9KTtcbiAgICAvLyBJZiBmIGRpZG4ndCBpdHNlbGYgdGhyb3csIG1ha2Ugc3VyZSBpdCBjaGVja2VkIGFsbCBvZiBpdHMgYXJndW1lbnRzLlxuICAgIGFyZ0NoZWNrZXIudGhyb3dVbmxlc3NBbGxBcmd1bWVudHNIYXZlQmVlbkNoZWNrZWQoKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG59O1xuXG5mdW5jdGlvbiBPcHRpb25hbChwYXR0ZXJuKSB7XG4gIHRoaXMucGF0dGVybiA9IHBhdHRlcm47XG59O1xuXG5mdW5jdGlvbiBPbmVPZihjaG9pY2VzKSB7XG4gIGlmIChjaG9pY2VzLmxlbmd0aCA9PSAwKVxuICAgIHRocm93IG5ldyBFcnJvcihcIk11c3QgcHJvdmlkZSBhdCBsZWFzdCBvbmUgY2hvaWNlIHRvIE1hdGNoLk9uZU9mXCIpO1xuICB0aGlzLmNob2ljZXMgPSBjaG9pY2VzO1xufTtcblxuZnVuY3Rpb24gV2hlcmUoY29uZGl0aW9uKSB7XG4gIHRoaXMuY29uZGl0aW9uID0gY29uZGl0aW9uO1xufTtcblxuZnVuY3Rpb24gT2JqZWN0SW5jbHVkaW5nKHBhdHRlcm4pIHtcbiAgdGhpcy5wYXR0ZXJuID0gcGF0dGVybjtcbn07XG5cbmZ1bmN0aW9uIE9iamVjdEhhc2gocGF0dGVybikge1xuICB0aGlzLnBhdHRlcm4gPSBwYXR0ZXJuO1xufTtcblxuZnVuY3Rpb24gU3ViY2xhc3MoU3VwZXJjbGFzcywgbWF0Y2hTdXBlcmNsYXNzVG9vKSB7XG4gIHRoaXMuU3VwZXJjbGFzcyA9IFN1cGVyY2xhc3M7XG4gIHRoaXMubWF0Y2hTdXBlcmNsYXNzID0gbWF0Y2hTdXBlcmNsYXNzVG9vO1xufTtcblxudmFyIHR5cGVvZkNoZWNrcyA9IFtcbiAgW1N0cmluZywgXCJzdHJpbmdcIl0sXG4gIFtOdW1iZXIsIFwibnVtYmVyXCJdLFxuICBbQm9vbGVhbiwgXCJib29sZWFuXCJdLFxuICAvLyBXaGlsZSB3ZSBkb24ndCBhbGxvdyB1bmRlZmluZWQgaW4gRUpTT04sIHRoaXMgaXMgZ29vZCBmb3Igb3B0aW9uYWxcbiAgLy8gYXJndW1lbnRzIHdpdGggT25lT2YuXG4gIFt1bmRlZmluZWQsIFwidW5kZWZpbmVkXCJdXG5dO1xuXG5mdW5jdGlvbiBjaGVja1N1YnRyZWUodmFsdWUsIHBhdHRlcm4pIHtcbiAgLy8gTWF0Y2ggYW55dGhpbmchXG4gIGlmIChwYXR0ZXJuID09PSBNYXRjaC5BbnkpXG4gICAgcmV0dXJuO1xuXG4gIC8vIEJhc2ljIGF0b21pYyB0eXBlcy5cbiAgLy8gRG8gbm90IG1hdGNoIGJveGVkIG9iamVjdHMgKGUuZy4gU3RyaW5nLCBCb29sZWFuKVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHR5cGVvZkNoZWNrcy5sZW5ndGg7ICsraSkge1xuICAgIGlmIChwYXR0ZXJuID09PSB0eXBlb2ZDaGVja3NbaV1bMF0pIHtcbiAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09IHR5cGVvZkNoZWNrc1tpXVsxXSlcbiAgICAgICAgcmV0dXJuO1xuICAgICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgXCIgKyB0eXBlb2ZDaGVja3NbaV1bMV0gKyBcIiwgZ290IFwiICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlb2YgdmFsdWUpO1xuICAgIH1cbiAgfVxuICBpZiAocGF0dGVybiA9PT0gbnVsbCkge1xuICAgIGlmICh2YWx1ZSA9PT0gbnVsbClcbiAgICAgIHJldHVybjtcbiAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJFeHBlY3RlZCBudWxsLCBnb3QgXCIgKyBFSlNPTi5zdHJpbmdpZnkodmFsdWUpKTtcbiAgfVxuXG4gIC8vIE1hdGNoLkludGVnZXIgaXMgc3BlY2lhbCB0eXBlIGVuY29kZWQgd2l0aCBhcnJheVxuICBpZiAocGF0dGVybiA9PT0gTWF0Y2guSW50ZWdlcikge1xuICAgIC8vIFRoZXJlIGlzIG5vIGNvbnNpc3RlbnQgYW5kIHJlbGlhYmxlIHdheSB0byBjaGVjayBpZiB2YXJpYWJsZSBpcyBhIDY0LWJpdFxuICAgIC8vIGludGVnZXIuIE9uZSBvZiB0aGUgcG9wdWxhciBzb2x1dGlvbnMgaXMgdG8gZ2V0IHJlbWluZGVyIG9mIGRpdmlzaW9uIGJ5IDFcbiAgICAvLyBidXQgdGhpcyBtZXRob2QgZmFpbHMgb24gcmVhbGx5IGxhcmdlIGZsb2F0cyB3aXRoIGJpZyBwcmVjaXNpb24uXG4gICAgLy8gRS5nLjogMS4zNDgxOTIzMDg0OTE4MjRlKzIzICUgMSA9PT0gMCBpbiBWOFxuICAgIC8vIEJpdHdpc2Ugb3BlcmF0b3JzIHdvcmsgY29uc2lzdGFudGx5IGJ1dCBhbHdheXMgY2FzdCB2YXJpYWJsZSB0byAzMi1iaXRcbiAgICAvLyBzaWduZWQgaW50ZWdlciBhY2NvcmRpbmcgdG8gSmF2YVNjcmlwdCBzcGVjcy5cbiAgICBpZiAodHlwZW9mIHZhbHVlID09PSBcIm51bWJlclwiICYmICh2YWx1ZSB8IDApID09PSB2YWx1ZSlcbiAgICAgIHJldHVyblxuICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIEludGVnZXIsIGdvdCBcIlxuICAgICAgICAgICAgICAgICsgKHZhbHVlIGluc3RhbmNlb2YgT2JqZWN0ID8gRUpTT04uc3RyaW5naWZ5KHZhbHVlKSA6IHZhbHVlKSk7XG4gIH1cblxuICAvLyBcIk9iamVjdFwiIGlzIHNob3J0aGFuZCBmb3IgTWF0Y2guT2JqZWN0SW5jbHVkaW5nKHt9KTtcbiAgaWYgKHBhdHRlcm4gPT09IE9iamVjdClcbiAgICBwYXR0ZXJuID0gTWF0Y2guT2JqZWN0SW5jbHVkaW5nKHt9KTtcblxuICAvLyBBcnJheSAoY2hlY2tlZCBBRlRFUiBBbnksIHdoaWNoIGlzIGltcGxlbWVudGVkIGFzIGFuIEFycmF5KS5cbiAgaWYgKHBhdHRlcm4gaW5zdGFuY2VvZiBBcnJheSkge1xuICAgIGlmIChwYXR0ZXJuLmxlbmd0aCAhPT0gMSlcbiAgICAgIHRocm93IEVycm9yKFwiQmFkIHBhdHRlcm46IGFycmF5cyBtdXN0IGhhdmUgb25lIHR5cGUgZWxlbWVudFwiICtcbiAgICAgICAgICAgICAgICAgIEVKU09OLnN0cmluZ2lmeShwYXR0ZXJuKSk7XG4gICAgaWYgKCFfLmlzQXJyYXkodmFsdWUpICYmICFfLmlzQXJndW1lbnRzKHZhbHVlKSkge1xuICAgICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgYXJyYXksIGdvdCBcIiArIEVKU09OLnN0cmluZ2lmeSh2YWx1ZSkpO1xuICAgIH1cblxuICAgIF8uZWFjaCh2YWx1ZSwgZnVuY3Rpb24gKHZhbHVlRWxlbWVudCwgaW5kZXgpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNoZWNrU3VidHJlZSh2YWx1ZUVsZW1lbnQsIHBhdHRlcm5bMF0pO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIGlmIChlcnIgaW5zdGFuY2VvZiBNYXRjaC5FcnJvcikge1xuICAgICAgICAgIGVyci5wYXRoID0gX3ByZXBlbmRQYXRoKGluZGV4LCBlcnIucGF0aCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIEFyYml0cmFyeSB2YWxpZGF0aW9uIGNoZWNrcy4gVGhlIGNvbmRpdGlvbiBjYW4gcmV0dXJuIGZhbHNlIG9yIHRocm93IGFcbiAgLy8gTWF0Y2guRXJyb3IgKGllLCBpdCBjYW4gaW50ZXJuYWxseSB1c2UgY2hlY2soKSkgdG8gZmFpbC5cbiAgaWYgKHBhdHRlcm4gaW5zdGFuY2VvZiBXaGVyZSkge1xuICAgIGlmIChwYXR0ZXJuLmNvbmRpdGlvbih2YWx1ZSkpXG4gICAgICByZXR1cm47XG4gICAgLy8gWFhYIHRoaXMgZXJyb3IgaXMgdGVycmlibGVcbiAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJGYWlsZWQgTWF0Y2guV2hlcmUgdmFsaWRhdGlvblwiKTtcbiAgfVxuXG5cbiAgaWYgKHBhdHRlcm4gaW5zdGFuY2VvZiBPcHRpb25hbClcbiAgICBwYXR0ZXJuID0gTWF0Y2guT25lT2YodW5kZWZpbmVkLCBwYXR0ZXJuLnBhdHRlcm4pO1xuXG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgT25lT2YpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhdHRlcm4uY2hvaWNlcy5sZW5ndGg7ICsraSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY2hlY2tTdWJ0cmVlKHZhbHVlLCBwYXR0ZXJuLmNob2ljZXNbaV0pO1xuICAgICAgICAvLyBObyBlcnJvcj8gWWF5LCByZXR1cm4uXG4gICAgICAgIHJldHVybjtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAvLyBPdGhlciBlcnJvcnMgc2hvdWxkIGJlIHRocm93bi4gTWF0Y2ggZXJyb3JzIGp1c3QgbWVhbiB0cnkgYW5vdGhlclxuICAgICAgICAvLyBjaG9pY2UuXG4gICAgICAgIGlmICghKGVyciBpbnN0YW5jZW9mIE1hdGNoLkVycm9yKSlcbiAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIFhYWCB0aGlzIGVycm9yIGlzIHRlcnJpYmxlXG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRmFpbGVkIE1hdGNoLk9uZU9mIG9yIE1hdGNoLk9wdGlvbmFsIHZhbGlkYXRpb25cIik7XG4gIH1cblxuICAvLyBBIGZ1bmN0aW9uIHRoYXQgaXNuJ3Qgc29tZXRoaW5nIHdlIHNwZWNpYWwtY2FzZSBpcyBhc3N1bWVkIHRvIGJlIGFcbiAgLy8gY29uc3RydWN0b3IuXG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBwYXR0ZXJuKVxuICAgICAgcmV0dXJuO1xuICAgIC8vIFhYWCB3aGF0IGlmIC5uYW1lIGlzbid0IGRlZmluZWRcbiAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJFeHBlY3RlZCBcIiArIHBhdHRlcm4uY29uc3RydWN0b3IubmFtZSk7XG4gIH1cblxuICB2YXIgdW5rbm93bktleXNBbGxvd2VkID0gZmFsc2U7XG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgT2JqZWN0SW5jbHVkaW5nKSB7XG4gICAgdW5rbm93bktleXNBbGxvd2VkID0gdHJ1ZTtcbiAgICBwYXR0ZXJuID0gcGF0dGVybi5wYXR0ZXJuO1xuICB9XG5cbiAgaWYgKHBhdHRlcm4gaW5zdGFuY2VvZiBPYmplY3RIYXNoKSB7XG4gICAgdmFyIGtleVBhdHRlcm4gPSBwYXR0ZXJuLnBhdHRlcm47XG4gICAgdmFyIGVtcHR5SGFzaCA9IHRydWU7XG4gICAgZm9yICh2YXIga2V5IGluIHZhbHVlKSB7XG4gICAgICBlbXB0eUhhc2ggPSBmYWxzZTtcbiAgICAgIGNoZWNrKHZhbHVlW2tleV0sIGtleVBhdHRlcm4pO1xuICAgIH1cbiAgICBpZiAoZW1wdHlIYXNoKVxuICAgICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgXCIgKyBwYXR0ZXJuLmNvbnN0cnVjdG9yLm5hbWUpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgU3ViY2xhc3MpIHtcbiAgICB2YXIgU3VwZXJjbGFzcyA9IHBhdHRlcm4uU3VwZXJjbGFzcztcbiAgICBpZiAocGF0dGVybi5tYXRjaFN1cGVyY2xhc3MgJiYgdmFsdWUgPT0gU3VwZXJjbGFzcylcbiAgICAgIHJldHVybjtcbiAgICBpZiAoISAodmFsdWUucHJvdG90eXBlIGluc3RhbmNlb2YgU3VwZXJjbGFzcykpXG4gICAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJFeHBlY3RlZCBcIiArIHBhdHRlcm4uY29uc3RydWN0b3IubmFtZSArIFwiIG9mIFwiICsgU3VwZXJjbGFzcy5uYW1lKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAodHlwZW9mIHBhdHRlcm4gIT09IFwib2JqZWN0XCIpXG4gICAgdGhyb3cgRXJyb3IoXCJCYWQgcGF0dGVybjogdW5rbm93biBwYXR0ZXJuIHR5cGVcIik7XG5cbiAgLy8gQW4gb2JqZWN0LCB3aXRoIHJlcXVpcmVkIGFuZCBvcHRpb25hbCBrZXlzLiBOb3RlIHRoYXQgdGhpcyBkb2VzIE5PVCBkb1xuICAvLyBzdHJ1Y3R1cmFsIG1hdGNoZXMgYWdhaW5zdCBvYmplY3RzIG9mIHNwZWNpYWwgdHlwZXMgdGhhdCBoYXBwZW4gdG8gbWF0Y2hcbiAgLy8gdGhlIHBhdHRlcm46IHRoaXMgcmVhbGx5IG5lZWRzIHRvIGJlIGEgcGxhaW4gb2xkIHtPYmplY3R9IVxuICBpZiAodHlwZW9mIHZhbHVlICE9PSAnb2JqZWN0JylcbiAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJFeHBlY3RlZCBvYmplY3QsIGdvdCBcIiArIHR5cGVvZiB2YWx1ZSk7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbClcbiAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJFeHBlY3RlZCBvYmplY3QsIGdvdCBudWxsXCIpO1xuICBpZiAodmFsdWUuY29uc3RydWN0b3IgIT09IE9iamVjdClcbiAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJFeHBlY3RlZCBwbGFpbiBvYmplY3RcIik7XG5cbiAgdmFyIHJlcXVpcmVkUGF0dGVybnMgPSB7fTtcbiAgdmFyIG9wdGlvbmFsUGF0dGVybnMgPSB7fTtcblxuICBPYmplY3Qua2V5cyhwYXR0ZXJuKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIHZhciBzdWJQYXR0ZXJuID0gcGF0dGVybltrZXldO1xuICAgIGlmIChwYXR0ZXJuW2tleV0gaW5zdGFuY2VvZiBPcHRpb25hbClcbiAgICAgIG9wdGlvbmFsUGF0dGVybnNba2V5XSA9IHBhdHRlcm5ba2V5XS5wYXR0ZXJuO1xuICAgIGVsc2VcbiAgICAgIHJlcXVpcmVkUGF0dGVybnNba2V5XSA9IHBhdHRlcm5ba2V5XTtcbiAgfSk7XG5cbiAgT2JqZWN0LmtleXModmFsdWUpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgdmFyIHN1YlZhbHVlID0gdmFsdWVba2V5XTtcbiAgICB0cnkge1xuICAgICAgaWYgKHJlcXVpcmVkUGF0dGVybnMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICBjaGVja1N1YnRyZWUoc3ViVmFsdWUsIHJlcXVpcmVkUGF0dGVybnNba2V5XSk7XG4gICAgICAgIGRlbGV0ZSByZXF1aXJlZFBhdHRlcm5zW2tleV07XG4gICAgICB9IGVsc2UgaWYgKG9wdGlvbmFsUGF0dGVybnMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICBjaGVja1N1YnRyZWUoc3ViVmFsdWUsIG9wdGlvbmFsUGF0dGVybnNba2V5XSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoIXVua25vd25LZXlzQWxsb3dlZClcbiAgICAgICAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJVbmtub3duIGtleVwiKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGlmIChlcnIgaW5zdGFuY2VvZiBNYXRjaC5FcnJvcilcbiAgICAgICAgZXJyLnBhdGggPSBfcHJlcGVuZFBhdGgoa2V5LCBlcnIucGF0aCk7XG4gICAgICB0aHJvdyBlcnI7XG4gICAgfVxuICB9KTtcblxuICBPYmplY3Qua2V5cyhyZXF1aXJlZFBhdHRlcm5zKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIk1pc3Npbmcga2V5ICdcIiArIGtleSArIFwiJ1wiKTtcbiAgfSk7XG59O1xuXG5mdW5jdGlvbiBBcmd1bWVudENoZWNrZXIoYXJncywgZGVzY3JpcHRpb24pIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICAvLyBNYWtlIGEgU0hBTExPVyBjb3B5IG9mIHRoZSBhcmd1bWVudHMuIChXZSdsbCBiZSBkb2luZyBpZGVudGl0eSBjaGVja3NcbiAgLy8gYWdhaW5zdCBpdHMgY29udGVudHMuKVxuICBzZWxmLmFyZ3MgPSBfLmNsb25lKGFyZ3MpO1xuICAvLyBTaW5jZSB0aGUgY29tbW9uIGNhc2Ugd2lsbCBiZSB0byBjaGVjayBhcmd1bWVudHMgaW4gb3JkZXIsIGFuZCB3ZSBzcGxpY2VcbiAgLy8gb3V0IGFyZ3VtZW50cyB3aGVuIHdlIGNoZWNrIHRoZW0sIG1ha2UgaXQgc28gd2Ugc3BsaWNlIG91dCBmcm9tIHRoZSBlbmRcbiAgLy8gcmF0aGVyIHRoYW4gdGhlIGJlZ2lubmluZy5cbiAgc2VsZi5hcmdzLnJldmVyc2UoKTtcbiAgc2VsZi5kZXNjcmlwdGlvbiA9IGRlc2NyaXB0aW9uO1xufTtcblxuXy5leHRlbmRQcm90byhBcmd1bWVudENoZWNrZXIsIHtcbiAgY2hlY2tpbmc6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoc2VsZi5fY2hlY2tpbmdPbmVWYWx1ZSh2YWx1ZSkpXG4gICAgICByZXR1cm47XG4gICAgLy8gQWxsb3cgY2hlY2soYXJndW1lbnRzLCBbU3RyaW5nXSkgb3IgY2hlY2soYXJndW1lbnRzLnNsaWNlKDEpLCBbU3RyaW5nXSlcbiAgICAvLyBvciBjaGVjayhbZm9vLCBiYXJdLCBbU3RyaW5nXSkgdG8gY291bnQuLi4gYnV0IG9ubHkgaWYgdmFsdWUgd2Fzbid0XG4gICAgLy8gaXRzZWxmIGFuIGFyZ3VtZW50LlxuICAgIGlmIChfLmlzQXJyYXkodmFsdWUpIHx8IF8uaXNBcmd1bWVudHModmFsdWUpKSB7XG4gICAgICBfLmVhY2godmFsdWUsIF8uYmluZChzZWxmLl9jaGVja2luZ09uZVZhbHVlLCBzZWxmKSk7XG4gICAgfVxuICB9LFxuICBfY2hlY2tpbmdPbmVWYWx1ZTogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZi5hcmdzLmxlbmd0aDsgKytpKSB7XG4gICAgICAvLyBJcyB0aGlzIHZhbHVlIG9uZSBvZiB0aGUgYXJndW1lbnRzPyAoVGhpcyBjYW4gaGF2ZSBhIGZhbHNlIHBvc2l0aXZlIGlmXG4gICAgICAvLyB0aGUgYXJndW1lbnQgaXMgYW4gaW50ZXJuZWQgcHJpbWl0aXZlLCBidXQgaXQncyBzdGlsbCBhIGdvb2QgZW5vdWdoXG4gICAgICAvLyBjaGVjay4pXG4gICAgICBpZiAodmFsdWUgPT09IHNlbGYuYXJnc1tpXSkge1xuICAgICAgICBzZWxmLmFyZ3Muc3BsaWNlKGksIDEpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9LFxuICB0aHJvd1VubGVzc0FsbEFyZ3VtZW50c0hhdmVCZWVuQ2hlY2tlZDogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoIV8uaXNFbXB0eShzZWxmLmFyZ3MpKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRGlkIG5vdCBjaGVjaygpIGFsbCBhcmd1bWVudHMgZHVyaW5nIFwiICtcbiAgICAgICAgICAgICAgICAgICAgICBzZWxmLmRlc2NyaXB0aW9uKTtcbiAgfVxufSk7XG5cbnZhciBfanNLZXl3b3JkcyA9IFtcImRvXCIsIFwiaWZcIiwgXCJpblwiLCBcImZvclwiLCBcImxldFwiLCBcIm5ld1wiLCBcInRyeVwiLCBcInZhclwiLCBcImNhc2VcIixcbiAgXCJlbHNlXCIsIFwiZW51bVwiLCBcImV2YWxcIiwgXCJmYWxzZVwiLCBcIm51bGxcIiwgXCJ0aGlzXCIsIFwidHJ1ZVwiLCBcInZvaWRcIiwgXCJ3aXRoXCIsXG4gIFwiYnJlYWtcIiwgXCJjYXRjaFwiLCBcImNsYXNzXCIsIFwiY29uc3RcIiwgXCJzdXBlclwiLCBcInRocm93XCIsIFwid2hpbGVcIiwgXCJ5aWVsZFwiLFxuICBcImRlbGV0ZVwiLCBcImV4cG9ydFwiLCBcImltcG9ydFwiLCBcInB1YmxpY1wiLCBcInJldHVyblwiLCBcInN0YXRpY1wiLCBcInN3aXRjaFwiLFxuICBcInR5cGVvZlwiLCBcImRlZmF1bHRcIiwgXCJleHRlbmRzXCIsIFwiZmluYWxseVwiLCBcInBhY2thZ2VcIiwgXCJwcml2YXRlXCIsIFwiY29udGludWVcIixcbiAgXCJkZWJ1Z2dlclwiLCBcImZ1bmN0aW9uXCIsIFwiYXJndW1lbnRzXCIsIFwiaW50ZXJmYWNlXCIsIFwicHJvdGVjdGVkXCIsIFwiaW1wbGVtZW50c1wiLFxuICBcImluc3RhbmNlb2ZcIl07XG5cbi8vIEFzc3VtZXMgdGhlIGJhc2Ugb2YgcGF0aCBpcyBhbHJlYWR5IGVzY2FwZWQgcHJvcGVybHlcbi8vIHJldHVybnMga2V5ICsgYmFzZVxuZnVuY3Rpb24gX3ByZXBlbmRQYXRoKGtleSwgYmFzZSkge1xuICBpZiAoKHR5cGVvZiBrZXkpID09PSBcIm51bWJlclwiIHx8IGtleS5tYXRjaCgvXlswLTldKyQvKSlcbiAgICBrZXkgPSBcIltcIiArIGtleSArIFwiXVwiO1xuICBlbHNlIGlmICgha2V5Lm1hdGNoKC9eW2Etel8kXVswLTlhLXpfJF0qJC9pKSB8fCBfanNLZXl3b3Jkcy5pbmRleE9mKGtleSkgIT0gLTEpLy9fLmNvbnRhaW5zKF9qc0tleXdvcmRzLCBrZXkpKVxuICAgIGtleSA9IEpTT04uc3RyaW5naWZ5KFtrZXldKTtcblxuICBpZiAoYmFzZSAmJiBiYXNlWzBdICE9PSBcIltcIilcbiAgICByZXR1cm4ga2V5ICsgJy4nICsgYmFzZTtcbiAgcmV0dXJuIGtleSArIGJhc2U7XG59O1xuXG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBGYWNldGVkT2JqZWN0ID0gcmVxdWlyZSgnLi4vZmFjZXRzL2Zfb2JqZWN0Jylcblx0LCBmYWNldHNSZWdpc3RyeSA9IHJlcXVpcmUoJy4vY19mYWNldHMvY2ZfcmVnaXN0cnknKVxuXHQsIENvbXBvbmVudEZhY2V0ID0gcmVxdWlyZSgnLi9jX2ZhY2V0Jylcblx0LCBtZXNzZW5nZXJNaXhpbiA9IHJlcXVpcmUoJy4vbWVzc2VuZ2VyJylcblx0LCBfID0gcmVxdWlyZSgncHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vY2hlY2snKVxuXHQsIE1hdGNoID0gY2hlY2suTWF0Y2g7XG5cbnZhciBDb21wb25lbnQgPSBfLmNyZWF0ZVN1YmNsYXNzKEZhY2V0ZWRPYmplY3QsICdDb21wb25lbnQnLCB0cnVlKTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb25lbnQ7XG5cblxuQ29tcG9uZW50LmNyZWF0ZUNvbXBvbmVudENsYXNzID0gZnVuY3Rpb24obmFtZSwgZmFjZXRzKSB7XG5cdHZhciBmYWNldHNDbGFzc2VzID0ge307XG5cblx0ZmFjZXRzLmZvckVhY2goZnVuY3Rpb24oZmN0KSB7XG5cdFx0dmFyIGZjdE5hbWUgPSBfLmZpcnN0TG93ZXJDYXNlKGZjdCk7XG5cdFx0dmFyIGZjdENsYXNzTmFtZSA9IF8uZmlyc3RVcHBlckNhc2UoZmN0KTtcblx0XHRmYWNldHNDbGFzc2VzW2ZjdE5hbWVdID0gZmFjZXRzUmVnaXN0cnkuZ2V0KGZjdENsYXNzTmFtZSlcblx0fSk7XG5cblx0cmV0dXJuIEZhY2V0ZWRPYmplY3QuY3JlYXRlRmFjZXRlZENsYXNzLmNhbGwodGhpcywgbmFtZSwgZmFjZXRzQ2xhc3Nlcyk7XG59O1xuXG5kZWxldGUgQ29tcG9uZW50LmNyZWF0ZUZhY2V0ZWRDbGFzcztcblxuXG5fLmV4dGVuZFByb3RvKENvbXBvbmVudCwge1xuXHRpbml0OiBpbml0Q29tcG9uZW50LFxuXHRhZGRGYWNldDogYWRkRmFjZXRcbn0pO1xuXG5fLmV4dGVuZFByb3RvKENvbXBvbmVudCwgbWVzc2VuZ2VyTWl4aW4pO1xuXG5cbmZ1bmN0aW9uIGluaXRDb21wb25lbnQoZmFjZXRzT3B0aW9ucywgZWxlbWVudCkge1xuXHR0aGlzLmVsID0gZWxlbWVudDtcblx0dGhpcy5pbml0TWVzc2VuZ2VyKCk7XG59XG5cblxuZnVuY3Rpb24gYWRkRmFjZXQoZmFjZXROYW1lT3JDbGFzcywgZmFjZXRPcHRzLCBmYWNldE5hbWUpIHtcblx0Y2hlY2soZmFjZXROYW1lT3JDbGFzcywgTWF0Y2guT25lT2YoU3RyaW5nLCBNYXRjaC5TdWJjbGFzcyhDb21wb25lbnRGYWNldCkpKTtcblx0Y2hlY2soZmFjZXRPcHRzLCBNYXRjaC5PcHRpb25hbChPYmplY3QpKTtcblx0Y2hlY2soZmFjZXROYW1lLCBNYXRjaC5PcHRpb25hbChTdHJpbmcpKTtcblxuXHRpZiAodHlwZW9mIGZhY2V0TmFtZU9yQ2xhc3MgPT0gJ3N0cmluZycpIHtcblx0XHR2YXIgZmFjZXRDbGFzc05hbWUgPSBfLmZpcnN0VXBwZXJDYXNlKGZhY2V0TmFtZU9yQ2xhc3MpO1xuXHRcdHZhciBGYWNldENsYXNzID0gZmFjZXRzUmVnaXN0cnkuZ2V0KGZhY2V0Q2xhc3NOYW1lKTtcblx0fSBlbHNlIFxuXHRcdEZhY2V0Q2xhc3MgPSBmYWNldE5hbWVPckNsYXNzO1xuXG5cdGZhY2V0TmFtZSA9IGZhY2V0TmFtZSB8fCBfLmZpcnN0TG93ZXJDYXNlKEZhY2V0Q2xhc3MubmFtZSk7XG5cblx0RmFjZXRlZE9iamVjdC5wcm90b3R5cGUuYWRkRmFjZXQuY2FsbCh0aGlzLCBGYWNldENsYXNzLCBmYWNldE9wdHMsIGZhY2V0TmFtZSk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBGYWNldCA9IHJlcXVpcmUoJy4uL2ZhY2V0cy9mX2NsYXNzJylcblx0LCBtZXNzZW5nZXJNaXhpbiA9IHJlcXVpcmUoJy4vbWVzc2VuZ2VyJylcblx0LCBfID0gcmVxdWlyZSgncHJvdG8nKTtcblxudmFyIENvbXBvbmVudEZhY2V0ID0gXy5jcmVhdGVTdWJjbGFzcyhGYWNldCwgJ0NvbXBvbmVudEZhY2V0Jyk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ29tcG9uZW50RmFjZXQ7XG5cblxuXy5leHRlbmRQcm90byhDb21wb25lbnRGYWNldCwge1xuXHRpbml0OiBpbml0Q29tcG9uZW50RmFjZXQsXG59KTtcblxuXy5leHRlbmRQcm90byhDb21wb25lbnRGYWNldCwgbWVzc2VuZ2VyTWl4aW4pO1xuXG5cbmZ1bmN0aW9uIGluaXRDb21wb25lbnRGYWNldCgpIHtcblx0dGhpcy5pbml0TWVzc2VuZ2VyKCk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBDb21wb25lbnRGYWNldCA9IHJlcXVpcmUoJy4uL2NfZmFjZXQnKVxuXHQsIGJpbmRlciA9IHJlcXVpcmUoJy4uLy4uL2JpbmRlcicpXG5cdCwgXyA9IHJlcXVpcmUoJ3Byb3RvJylcblx0LCBmYWNldHNSZWdpc3RyeSA9IHJlcXVpcmUoJy4vY2ZfcmVnaXN0cnknKTtcblxuLy8gY29udGFpbmVyIGZhY2V0XG52YXIgQ29udGFpbmVyID0gXy5jcmVhdGVTdWJjbGFzcyhDb21wb25lbnRGYWNldCwgJ0NvbnRhaW5lcicpO1xuXG5fLmV4dGVuZFByb3RvKENvbnRhaW5lciwge1xuXHRpbml0OiBpbml0Q29udGFpbmVyLFxuXHRfYmluZDogX2JpbmRDb21wb25lbnRzLFxuXHRhZGQ6IGFkZENoaWxkQ29tcG9uZW50c1xufSk7XG5cbmZhY2V0c1JlZ2lzdHJ5LmFkZChDb250YWluZXIpO1xuXG5cbmZ1bmN0aW9uIGluaXRDb250YWluZXIoKSB7XG5cdHRoaXMuaW5pdE1lc3NlbmdlcigpO1xuXHR0aGlzLmNoaWxkcmVuID0ge307XG59XG5cblxuZnVuY3Rpb24gX2JpbmRDb21wb25lbnRzKCkge1xuXHQvLyBUT0RPXG5cdC8vIHRoaXMgZnVuY3Rpb24gc2hvdWxkIHJlLWJpbmQgcmF0aGVyIHRoYW4gYmluZCBhbGwgaW50ZXJuYWwgZWxlbWVudHNcblx0dGhpcy5jaGlsZHJlbiA9IGJpbmRlcih0aGlzLm93bmVyLmVsKTtcbn1cblxuXG5mdW5jdGlvbiBhZGRDaGlsZENvbXBvbmVudHMoY2hpbGRDb21wb25lbnRzKSB7XG5cdC8vIFRPRE9cblx0Ly8gdGhpcyBmdW5jdGlvbiBzaG91bGQgaW50ZWxsaWdlbnRseSByZS1iaW5kIGV4aXN0aW5nIGNvbXBvbmVudHMgdG9cblx0Ly8gbmV3IGVsZW1lbnRzIChpZiB0aGV5IGNoYW5nZWQpIGFuZCByZS1iaW5kIHByZXZpb3VzbHkgYm91bmQgZXZlbnRzIHRvIHRoZSBzYW1lXG5cdC8vIGV2ZW50IGhhbmRsZXJzXG5cdC8vIG9yIG1heWJlIG5vdCwgaWYgdGhpcyBmdW5jdGlvbiBpcyBvbmx5IHVzZWQgYnkgYmluZGVyIHRvIGFkZCBuZXcgZWxlbWVudHMuLi5cblx0Xy5leHRlbmQodGhpcy5jaGlsZHJlbiwgY2hpbGRDb21wb25lbnRzKTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIENvbXBvbmVudEZhY2V0ID0gcmVxdWlyZSgnLi4vY19mYWNldCcpXG5cdCwgRmFjZXRFcnJvciA9IENvbXBvbmVudEZhY2V0LkVycm9yXG5cdCwgXyA9IHJlcXVpcmUoJ3Byb3RvJylcblx0LCBmYWNldHNSZWdpc3RyeSA9IHJlcXVpcmUoJy4vY2ZfcmVnaXN0cnknKVxuXHQsIG1lc3Nlbmdlck1peGluID0gcmVxdWlyZSgnLi4vbWVzc2VuZ2VyJylcblx0LCBkb21FdmVudHNDb25zdHJ1Y3RvcnMgPSByZXF1aXJlKCcuL2RvbV9ldmVudHMnKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vLi4vY2hlY2snKVxuXHQsIE1hdGNoID0gY2hlY2suTWF0Y2g7XG5cbnZhciBldmVudHNTcGxpdFJlZ0V4cCA9IC9cXHMqKD86XFwsfFxccylcXHMqLztcblxuXG4vLyBldmVudHMgZmFjZXRcbnZhciBFdmVudHMgPSBfLmNyZWF0ZVN1YmNsYXNzKENvbXBvbmVudEZhY2V0LCAnRXZlbnRzJyk7XG5cbl8uZXh0ZW5kUHJvdG8oRXZlbnRzLCB7XG5cdGluaXQ6IGluaXRFdmVudHNGYWNldCxcblx0ZG9tOiBnZXREb21FbGVtZW50LFxuXHRoYW5kbGVFdmVudDogaGFuZGxlRXZlbnQsIC8vIGV2ZW50IGRpc3BhdGNoZXIgLSBhcyBkZWZpbmVkIGJ5IEV2ZW50IERPTSBBUElcblx0b246IGFkZExpc3RlbmVyLFxuXHRvZmY6IHJlbW92ZUxpc3RlbmVyLFxuXHRvbkV2ZW50czogYWRkTGlzdGVuZXJzVG9FdmVudHMsXG5cdG9mZkV2ZW50czogcmVtb3ZlTGlzdGVuZXJzRnJvbUV2ZW50cyxcblx0dHJpZ2dlcjogdHJpZ2dlckV2ZW50LFxuXHRnZXRMaXN0ZW5lcnM6IGdldExpc3RlbmVycyxcblx0X2hhc0V2ZW50TGlzdGVuZXJzOiBfaGFzRXZlbnRMaXN0ZW5lcnNcblx0Ly8gX3JlYXR0YWNoOiBfcmVhdHRhY2hFdmVudHNPbkVsZW1lbnRDaGFuZ2Vcbn0pO1xuXG5mYWNldHNSZWdpc3RyeS5hZGQoRXZlbnRzKTtcblxuXG52YXIgdXNlQ2FwdHVyZVN1ZmZpeCA9ICdfX2NhcHR1cmUnXG5cdCwgd3JvbmdFdmVudFBhdHRlcm4gPSAvX19jYXB0dXJlLztcblxuXG5mdW5jdGlvbiBpbml0RXZlbnRzRmFjZXQoKSB7XG5cdC8vIGluaXRpYWxpemUgbGlzdGVuZXJzIG1hcFxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ19ldmVudHNMaXN0ZW5lcnMnLCB7XG5cdFx0dmFsdWU6IHt9XG5cdH0pO1xufVxuXG5cbmZ1bmN0aW9uIGdldERvbUVsZW1lbnQoKSB7XG5cdHJldHVybiB0aGlzLm93bmVyLmVsO1xufVxuXG5cbmZ1bmN0aW9uIGhhbmRsZUV2ZW50KGV2ZW50KSB7XG5cdHZhciBpc0NhcHR1cmVQaGFzZSA9IGV2ZW50LmV2ZW50UGhhc2UgPT0gd2luZG93LkV2ZW50LkNBUFRVUklOR19QSEFTRTtcblxuXHR2YXIgZXZlbnRLZXkgPSBldmVudC50eXBlICsgKGlzQ2FwdHVyZVBoYXNlID8gdXNlQ2FwdHVyZVN1ZmZpeCA6ICcnKVxuXHRcdCwgZXZlbnRMaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNMaXN0ZW5lcnNbZXZlbnRLZXldO1xuXG5cdGlmIChldmVudExpc3RlbmVycylcblx0XHRldmVudExpc3RlbmVycy5mb3JFYWNoKGZ1bmN0aW9uKGxpc3RlbmVyKSB7XG5cdFx0XHRsaXN0ZW5lcihldmVudCk7XG5cdFx0fSk7XG59XG5cblxuZnVuY3Rpb24gYWRkTGlzdGVuZXIoZXZlbnRUeXBlcywgbGlzdGVuZXIsIHVzZUNhcHR1cmUpIHtcblx0Y2hlY2soZXZlbnRUeXBlcywgU3RyaW5nKTtcblx0Y2hlY2sobGlzdGVuZXIsIEZ1bmN0aW9uKTtcblxuXHR2YXIgZXZlbnRzQXJyYXkgPSBldmVudFR5cGVzLnNwbGl0KGV2ZW50c1NwbGl0UmVnRXhwKVxuXHRcdCwgd2FzQXR0YWNoZWQgPSBmYWxzZTtcblxuXHRldmVudHNBcnJheS5mb3JFYWNoKGZ1bmN0aW9uKGV2ZW50VHlwZSkge1xuXHRcdF9hZGRMaXN0ZW5lci5jYWxsKHRoaXMsIGV2ZW50VHlwZSwgbGlzdGVuZXIsIHVzZUNhcHR1cmUpO1xuXHR9LCB0aGlzKTtcblxuXHRyZXR1cm4gd2FzQXR0YWNoZWQ7XG5cblxuXHRmdW5jdGlvbiBfYWRkTGlzdGVuZXIoZXZlbnRUeXBlLCBsaXN0ZW5lciwgdXNlQ2FwdHVyZSkge1xuXHRcdGlmICh3cm9uZ0V2ZW50UGF0dGVybi50ZXN0KGV2ZW50VHlwZSkpXG5cdFx0XHR0aHJvdyBuZXcgUmFuZ2VFcnJvcignZXZlbnQgdHlwZSBjYW5ub3QgY29udGFpbiAnICsgdXNlQ2FwdHVyZVN1ZmZpeCk7XG5cblx0XHR2YXIgZXZlbnRLZXkgPSBldmVudFR5cGUgKyAodXNlQ2FwdHVyZSA/IHVzZUNhcHR1cmVTdWZmaXggOiAnJylcblx0XHRcdCwgZXZlbnRMaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNMaXN0ZW5lcnNbZXZlbnRLZXldXG5cdFx0XHRcdD0gdGhpcy5fZXZlbnRzTGlzdGVuZXJzW2V2ZW50S2V5XSB8fCBbXTtcblxuXHRcdGlmICghIHRoaXMuX2hhc0V2ZW50TGlzdGVuZXJzKGV2ZW50S2V5KSkge1xuXHRcdFx0Ly8gdHJ1ZSA9IHVzZSBjYXB0dXJlLCBmb3IgcGFydGljdWxhciBsaXN0ZW5lciBpdCBpcyBkZXRlcm1pbmVkIGluIGhhbmRsZUV2ZW50XG5cdFx0XHR0aGlzLmRvbSgpLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRLZXksIHRoaXMsIHRydWUpO1xuXHRcdFx0dmFyIG5vdFlldEF0dGFjaGVkID0gdHJ1ZTtcblx0XHR9IGVsc2Vcblx0XHRcdG5vdFlldEF0dGFjaGVkID0gZXZlbnRMaXN0ZW5lcnMuaW5kZXhPZihsaXN0ZW5lcikgPT0gLTE7XG5cblx0XHRpZiAobm90WWV0QXR0YWNoZWQpIHtcblx0XHRcdHdhc0F0dGFjaGVkID0gdHJ1ZTtcblx0XHRcdGV2ZW50TGlzdGVuZXJzLnB1c2gobGlzdGVuZXIpO1xuXHRcdH1cblx0fVxufVxuXG5cbmZ1bmN0aW9uIGFkZExpc3RlbmVyc1RvRXZlbnRzKGV2ZW50c0xpc3RlbmVycywgdXNlQ2FwdHVyZSkge1xuXHRjaGVjayhldmVudHNMaXN0ZW5lcnMsIE1hdGNoLk9iamVjdCk7XG5cblx0dmFyIHdhc0F0dGFjaGVkTWFwID0gXy5tYXBLZXlzKGV2ZW50c0xpc3RlbmVycywgZnVuY3Rpb24obGlzdGVuZXIsIGV2ZW50VHlwZXMpIHtcblx0XHRyZXR1cm4gdGhpcy5hZGRMaXN0ZW5lcihldmVudFR5cGVzLCBsaXN0ZW5lciwgdXNlQ2FwdHVyZSlcblx0fSwgdGhpcyk7XG5cblx0cmV0dXJuIHdhc0F0dGFjaGVkTWFwO1x0XG59XG5cblxuZnVuY3Rpb24gcmVtb3ZlTGlzdGVuZXIoZXZlbnRUeXBlcywgbGlzdGVuZXIsIHVzZUNhcHR1cmUpIHtcblx0Y2hlY2soZXZlbnRUeXBlcywgU3RyaW5nKTtcblx0Y2hlY2sobGlzdGVuZXIsIEZ1bmN0aW9uKTtcblxuXHR2YXIgZXZlbnRzQXJyYXkgPSBldmVudFR5cGVzLnNwbGl0KGV2ZW50c1NwbGl0UmVnRXhwKVxuXHRcdCwgd2FzUmVtb3ZlZCA9IGZhbHNlO1xuXG5cdGV2ZW50c0FycmF5LmZvckVhY2goZnVuY3Rpb24oZXZlbnRUeXBlKSB7XG5cdFx0X3JlbW92ZUxpc3RlbmVyLmNhbGwodGhpcywgZXZlbnRUeXBlLCBsaXN0ZW5lciwgdXNlQ2FwdHVyZSk7XG5cdH0sIHRoaXMpO1xuXG5cdHJldHVybiB3YXNSZW1vdmVkO1xuXG5cblx0ZnVuY3Rpb24gX3JlbW92ZUxpc3RlbmVyKGV2ZW50VHlwZSwgbGlzdGVuZXIsIHVzZUNhcHR1cmUpIHtcblx0XHRpZiAod3JvbmdFdmVudFBhdHRlcm4udGVzdChldmVudFR5cGUpKVxuXHRcdFx0dGhyb3cgbmV3IFJhbmdlRXJyb3IoJ2V2ZW50IHR5cGUgY2Fubm90IGNvbnRhaW4gJyArIHVzZUNhcHR1cmVTdWZmaXgpO1xuXG5cdFx0dmFyIGV2ZW50S2V5ID0gZXZlbnRUeXBlICsgKHVzZUNhcHR1cmUgPyB1c2VDYXB0dXJlU3VmZml4IDogJycpXG5cdFx0XHQsIGV2ZW50TGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzTGlzdGVuZXJzW2V2ZW50S2V5XTtcblxuXHRcdGlmICghIChldmVudExpc3RlbmVycyAmJiBldmVudExpc3RlbmVycy5sZW5ndGgpKSByZXR1cm47XG5cblx0XHRpZiAobGlzdGVuZXIpIHtcblx0XHRcdGxpc3RlbmVySW5kZXggPSBldmVudExpc3RlbmVycy5pbmRleE9mKGxpc3RlbmVyKTtcblx0XHRcdGlmIChsaXN0ZW5lckluZGV4ID09IC0xKVxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHRldmVudExpc3RlbmVycy5zcGxpY2UobGlzdGVuZXJJbmRleCwgMSk7XG5cdFx0XHRpZiAoISBldmVudExpc3RlbmVycy5sZW5ndGgpXG5cdFx0XHRcdGRlbGV0ZSB0aGlzLl9ldmVudHNMaXN0ZW5lcnNbZXZlbnRLZXldO1xuXHRcdH0gZWxzZVxuXHRcdFx0ZGVsZXRlIHRoaXMuX2V2ZW50c0xpc3RlbmVyc1tldmVudEtleV07XG5cblx0XHR3YXNSZW1vdmVkID0gdHJ1ZTtcblxuXHRcdGlmICghIHRoaXMuX2hhc0V2ZW50TGlzdGVuZXJzKGV2ZW50VHlwZSkpXG5cdFx0XHQvLyB0cnVlID0gdXNlIGNhcHR1cmUsIGZvciBwYXJ0aWN1bGFyIGxpc3RlbmVyIGl0IGlzIGRldGVybWluZWQgaW4gaGFuZGxlRXZlbnRcblx0XHRcdHRoaXMuZG9tKCkucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudFR5cGUsIHRoaXMsIHRydWUpO1xuXHR9XG59XG5cblxuZnVuY3Rpb24gcmVtb3ZlTGlzdGVuZXJzRnJvbUV2ZW50cyhldmVudHNMaXN0ZW5lcnMsIHVzZUNhcHR1cmUpIHtcblx0Y2hlY2soZXZlbnRzTGlzdGVuZXJzLCBNYXRjaC5PYmplY3QpO1xuXG5cdHZhciB3YXNSZW1vdmVkTWFwID0gXy5tYXBLZXlzKGV2ZW50c0xpc3RlbmVycywgZnVuY3Rpb24obGlzdGVuZXIsIGV2ZW50VHlwZXMpIHtcblx0XHRyZXR1cm4gdGhpcy5yZW1vdmVMaXN0ZW5lcihldmVudFR5cGVzLCBsaXN0ZW5lciwgdXNlQ2FwdHVyZSk7XG5cdH0sIHRoaXMpO1xuXG5cdHJldHVybiB3YXNSZW1vdmVkTWFwO1xufVxuXG5cbmZ1bmN0aW9uIHRyaWdnZXJFdmVudChldmVudFR5cGUsIHByb3BlcnRpZXMpIHtcblx0Y2hlY2soZXZlbnRUeXBlLCBTdHJpbmcpO1xuXG5cdHZhciBFdmVudENvbnN0cnVjdG9yID0gZG9tRXZlbnRzQ29uc3RydWN0b3JzW2V2ZW50VHlwZV07XG5cblx0aWYgKHR5cGVvZiBldmVudENvbnN0cnVjdG9yICE9ICdmdW5jdGlvbicpXG5cdFx0dGhyb3cgbmV3IEVycm9yKCd1bnN1cHBvcnRlZCBldmVudCB0eXBlJyk7XG5cblx0dmFyIGRvbUV2ZW50ID0gRXZlbnRDb25zdHJ1Y3RvcihldmVudFR5cGUsIHByb3BlcnRpZXMpO1xuXHQvLyA/Pz8gcHJvcGVydGllcy50eXBlID0gZXZlbnRUeXBlO1xuXHQvLyA/Pz8gRXZlbnRDb25zdHJ1Y3Rvcihwcm9wZXJ0aWVzKTtcblx0dmFyIG5vdENhbmNlbGxlZCA9IHRoaXMuZG9tKCkuZGlzcGF0Y2hFdmVudChkb21FdmVudCk7XG5cblx0cmV0dXJuIG5vdENhbmNlbGxlZDtcbn1cblxuXG5mdW5jdGlvbiBnZXRMaXN0ZW5lcnMoZXZlbnRUeXBlLCB1c2VDYXB0dXJlKSB7XG5cdGNoZWNrKGV2ZW50VHlwZSwgU3RyaW5nKTtcblxuXHR2YXIgZXZlbnRLZXkgPSBldmVudFR5cGUgKyAodXNlQ2FwdHVyZSA/IHVzZUNhcHR1cmVTdWZmaXggOiAnJylcblx0XHQsIGV2ZW50TGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzTGlzdGVuZXJzW2V2ZW50S2V5XTtcblxuXHRyZXR1cm4gZXZlbnRMaXN0ZW5lcnMgJiYgZXZlbnRMaXN0ZW5lcnMubGVuZ3RoXG5cdFx0XHRcdCA/IFtdLmNvbmNhdChldmVudExpc3RlbmVycylcblx0XHRcdFx0IDogdW5kZWZpbmVkO1xufVxuXG5cbmZ1bmN0aW9uIF9oYXNFdmVudExpc3RlbmVycyhldmVudFR5cGUpIHtcblx0dmFyIG5vdENhcHR1cmVkRXZlbnRzID0gdGhpcy5fZXZlbnRzTGlzdGVuZXJzW2V2ZW50VHlwZV1cblx0XHQsIGNhcHR1cmVkRXZlbnRzID0gdGhpcy5fZXZlbnRzTGlzdGVuZXJzW2V2ZW50VHlwZSArIHVzZUNhcHR1cmVTdWZmaXhdO1xuXG5cdHJldHVybiAobm90Q2FwdHVyZWRFdmVudHMgJiYgbm90Q2FwdHVyZWRFdmVudHMubGVuZ3RoKVxuXHRcdCAgICB8fCAoY2FwdHVyZWRFdmVudHMgJiYgY2FwdHVyZWRFdmVudHMubGVuZ3RoKTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIENsYXNzUmVnaXN0cnkgPSByZXF1aXJlKCcuLi8uLi9yZWdpc3RyeScpXG5cdCwgQ29tcG9uZW50RmFjZXQgPSByZXF1aXJlKCcuLi9jX2ZhY2V0Jyk7XG5cbnZhciBmYWNldHNSZWdpc3RyeSA9IG5ldyBDbGFzc1JlZ2lzdHJ5KENvbXBvbmVudEZhY2V0KTtcblxuZmFjZXRzUmVnaXN0cnkuYWRkKENvbXBvbmVudEZhY2V0KTtcblxubW9kdWxlLmV4cG9ydHMgPSBmYWNldHNSZWdpc3RyeTtcblxuLy8gVE9ETyAtIHJlZmFjdG9yIGNvbXBvbmVudHMgcmVnaXN0cnkgdGVzdCBpbnRvIGEgZnVuY3Rpb25cbi8vIHRoYXQgdGVzdHMgYSByZWdpc3RyeSB3aXRoIGEgZ2l2ZW4gZm91bmRhdGlvbiBjbGFzc1xuLy8gTWFrZSB0ZXN0IGZvciB0aGlzIHJlZ2lzdHJ5IGJhc2VkIG9uIHRoaXMgZnVuY3Rpb24iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgncHJvdG8nKTtcblxuXG4vLyBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9SZWZlcmVuY2UvRXZlbnRzXG5cbnZhciBldmVudFR5cGVzID0ge1xuXHRDbGlwYm9hcmRFdmVudDogWydjb3B5JywgJ2N1dCcsICdwYXN0ZScsICdiZWZvcmVjb3B5JywgJ2JlZm9yZWN1dCcsICdiZWZvcmVwYXN0ZSddLFxuXHRFdmVudDogWydpbnB1dCddLFxuXHRGb2N1c0V2ZW50OiBbJ2ZvY3VzJywgJ2JsdXInLCAnZm9jdXNpbicsICdmb2N1c291dCddLFxuXHRLZXlib2FyZEV2ZW50OiBbJ2tleWRvd24nLCAna2V5cHJlc3MnLCAgJ2tleXVwJ10sXG5cdE1vdXNlRXZlbnQ6IFsnY2xpY2snLCAnY29udGV4dG1lbnUnLCAnZGJsY2xpY2snLCAnbW91c2Vkb3duJywgJ21vdXNldXAnLFxuXHRcdFx0XHQgJ21vdXNlZW50ZXInLCAnbW91c2VsZWF2ZScsICdtb3VzZW1vdmUnLCAnbW91c2VvdXQnLCAnbW91c2VvdmVyJyxcblx0XHRcdFx0ICdzaG93JyAvKiBjb250ZXh0IG1lbnUgKi9dLFxuXHRUb3VjaEV2ZW50OiBbJ3RvdWNoc3RhcnQnLCAndG91Y2hlbmQnLCAndG91Y2htb3ZlJywgJ3RvdWNoZW50ZXInLCAndG91Y2hsZWF2ZScsICd0b3VjaGNhbmNlbCddLFxufTtcblxuXG4vLyBtb2NrIHdpbmRvdyBhbmQgZXZlbnQgY29uc3RydWN0b3JzIGZvciB0ZXN0aW5nXG5pZiAodHlwZW9mIHdpbmRvdyAhPSAndW5kZWZpbmVkJylcblx0dmFyIGdsb2JhbCA9IHdpbmRvdztcbmVsc2Uge1xuXHRnbG9iYWwgPSB7fTtcblx0Xy5lYWNoS2V5KGV2ZW50VHlwZXMsIGZ1bmN0aW9uKGVUeXBlcywgZXZlbnRDb25zdHJ1Y3Rvck5hbWUpIHtcblx0XHR2YXIgZXZlbnRzQ29uc3RydWN0b3I7XG5cdFx0ZXZhbChcblx0XHRcdCdldmVudHNDb25zdHJ1Y3RvciA9IGZ1bmN0aW9uICcgKyBldmVudENvbnN0cnVjdG9yTmFtZSArICcodHlwZSwgcHJvcGVydGllcykgeyBcXFxuXHRcdFx0XHR0aGlzLnR5cGUgPSB0eXBlOyBcXFxuXHRcdFx0XHRfLmV4dGVuZCh0aGlzLCBwcm9wZXJ0aWVzKTsgXFxcblx0XHRcdH07J1xuXHRcdCk7XG5cdFx0Z2xvYmFsW2V2ZW50Q29uc3RydWN0b3JOYW1lXSA9IGV2ZW50c0NvbnN0cnVjdG9yO1xuXHR9KTtcbn1cblxuXG52YXIgZG9tRXZlbnRzQ29uc3RydWN0b3JzID0ge307XG5cbl8uZWFjaEtleShldmVudFR5cGVzLCBmdW5jdGlvbihlVHlwZXMsIGV2ZW50Q29uc3RydWN0b3JOYW1lKSB7XG5cdGVUeXBlcy5mb3JFYWNoKGZ1bmN0aW9uKHR5cGUpIHtcblx0XHRpZiAoT2JqZWN0Lmhhc093blByb3BlcnR5KGRvbUV2ZW50c0NvbnN0cnVjdG9ycywgdHlwZSkpXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ2R1cGxpY2F0ZSBldmVudCB0eXBlICcgKyB0eXBlKTtcblxuXHRcdGRvbUV2ZW50c0NvbnN0cnVjdG9yc1t0eXBlXSA9IGdsb2JhbFtldmVudENvbnN0cnVjdG9yTmFtZV07XG5cdH0pO1xufSk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBkb21FdmVudHNDb25zdHJ1Y3RvcnM7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBDbGFzc1JlZ2lzdHJ5ID0gcmVxdWlyZSgnLi4vcmVnaXN0cnknKVxuXHQsIENvbXBvbmVudCA9IHJlcXVpcmUoJy4vY19jbGFzcycpO1xuXG52YXIgY29tcG9uZW50c1JlZ2lzdHJ5ID0gbmV3IENsYXNzUmVnaXN0cnkoQ29tcG9uZW50KTtcblxuY29tcG9uZW50c1JlZ2lzdHJ5LmFkZChDb21wb25lbnQpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNvbXBvbmVudHNSZWdpc3RyeTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIENvbXBvbmVudCA9IHJlcXVpcmUoJy4uL2NfY2xhc3MnKVxuXHQsIGNvbXBvbmVudHNSZWdpc3RyeSA9IHJlcXVpcmUoJy4uL2NfcmVnaXN0cnknKTtcblxuXG52YXIgVmlldyA9IENvbXBvbmVudC5jcmVhdGVDb21wb25lbnRDbGFzcygnVmlldycsIFsnY29udGFpbmVyJ10pO1xuXG5jb21wb25lbnRzUmVnaXN0cnkuYWRkKFZpZXcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZpZXc7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgncHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vY2hlY2snKVxuXHQsIE1hdGNoID0gY2hlY2suTWF0Y2g7XG5cbnZhciBtZXNzZW5nZXJNaXhpbiA9ICB7XG5cdGluaXRNZXNzZW5nZXI6IGluaXRNZXNzZW5nZXIsXG5cdG9uTWVzc2FnZTogcmVnaXN0ZXJTdWJzY3JpYmVyLFxuXHRvZmZNZXNzYWdlOiByZW1vdmVTdWJzY3JpYmVyLFxuXHRvbk1lc3NhZ2VzOiByZWdpc3RlclN1YnNjcmliZXJzLFxuXHRvZmZNZXNzYWdlczogcmVtb3ZlU3Vic2NyaWJlcnMsXG5cdHBvc3RNZXNzYWdlOiBwb3N0TWVzc2FnZSxcblx0Z2V0TWVzc2FnZVN1YnNjcmliZXJzOiBnZXRNZXNzYWdlU3Vic2NyaWJlcnMsXG5cdF9jaG9vc2VTdWJzY3JpYmVyc0hhc2g6IF9jaG9vc2VTdWJzY3JpYmVyc0hhc2hcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gbWVzc2VuZ2VyTWl4aW47XG5cblxuZnVuY3Rpb24gaW5pdE1lc3NlbmdlcigpIHtcblx0T2JqZWN0LmRlZmluZVByb3BlcnRpZXModGhpcywge1xuXHRcdF9tZXNzYWdlU3Vic2NyaWJlcnM6IHtcblx0XHRcdHZhbHVlOiB7fVxuXHRcdH0sXG5cdFx0X3BhdHRlcm5NZXNzYWdlU3Vic2NyaWJlcnM6IHtcblx0XHRcdHZhbHVlOiB7fVxuXHRcdH1cblx0fSk7XG59XG5cblxuZnVuY3Rpb24gcmVnaXN0ZXJTdWJzY3JpYmVyKG1lc3NhZ2UsIHN1YnNjcmliZXIpIHtcblx0Y2hlY2sobWVzc2FnZSwgTWF0Y2guT25lT2YoU3RyaW5nLCBSZWdFeHApKTtcblx0Y2hlY2soc3Vic2NyaWJlciwgRnVuY3Rpb24pOyBcblxuXHR2YXIgc3Vic2NyaWJlcnNIYXNoID0gdGhpcy5fY2hvb3NlU3Vic2NyaWJlcnNIYXNoKG1lc3NhZ2UpO1xuXHR2YXIgbXNnU3Vic2NyaWJlcnMgPSBzdWJzY3JpYmVyc0hhc2hbbWVzc2FnZV0gPSBzdWJzY3JpYmVyc0hhc2hbbWVzc2FnZV0gfHwgW107XG5cdHZhciBub3RZZXRSZWdpc3RlcmVkID0gbXNnU3Vic2NyaWJlcnMuaW5kZXhPZihzdWJzY3JpYmVyKSA9PSAtMTtcblxuXHRpZiAobm90WWV0UmVnaXN0ZXJlZClcblx0XHRtc2dTdWJzY3JpYmVycy5wdXNoKHN1YnNjcmliZXIpO1xuXG5cdHJldHVybiBub3RZZXRSZWdpc3RlcmVkO1xufVxuXG5cbmZ1bmN0aW9uIHJlZ2lzdGVyU3Vic2NyaWJlcnMobWVzc2FnZVN1YnNjcmliZXJzKSB7XG5cdGNoZWNrKG1lc3NhZ2VTdWJzY3JpYmVycywgTWF0Y2guT2JqZWN0KTtcblxuXHR2YXIgbm90WWV0UmVnaXN0ZXJlZE1hcCA9IF8ubWFwS2V5cyhtZXNzYWdlU3Vic2NyaWJlcnMsIGZ1bmN0aW9uKHN1YnNjcmliZXIsIG1lc3NhZ2UpIHtcblx0XHRyZXR1cm4gdGhpcy5yZWdpc3RlclN1YnNjcmliZXIobWVzc2FnZSwgc3Vic2NyaWJlcilcblx0fSwgdGhpcyk7XG5cblx0cmV0dXJuIG5vdFlldFJlZ2lzdGVyZWRNYXA7XG59XG5cblxuLy8gcmVtb3ZlcyBhbGwgc3Vic2NyaWJlcnMgZm9yIHRoZSBtZXNzYWdlIGlmIHN1YnNjcmliZXIgaXNuJ3Qgc3VwcGxpZWRcbmZ1bmN0aW9uIHJlbW92ZVN1YnNjcmliZXIobWVzc2FnZSwgc3Vic2NyaWJlcikge1xuXHRjaGVjayhtZXNzYWdlLCBNYXRjaC5PbmVPZihTdHJpbmcsIFJlZ0V4cCkpO1xuXHRjaGVjayhzdWJzY3JpYmVyLCBNYXRjaC5PcHRpb25hbChGdW5jdGlvbikpOyBcblxuXHR2YXIgc3Vic2NyaWJlcnNIYXNoID0gdGhpcy5fY2hvb3NlU3Vic2NyaWJlcnNIYXNoKG1lc3NhZ2UpO1xuXHR2YXIgbXNnU3Vic2NyaWJlcnMgPSBzdWJzY3JpYmVyc0hhc2hbbWVzc2FnZV07XG5cdGlmICghIG1zZ1N1YnNjcmliZXJzIHx8ICEgbXNnU3Vic2NyaWJlcnMubGVuZ3RoKSByZXR1cm4gZmFsc2U7XG5cblx0aWYgKHN1YnNjcmliZXIpIHtcblx0XHRzdWJzY3JpYmVySW5kZXggPSBtc2dTdWJzY3JpYmVycy5pbmRleE9mKHN1YnNjcmliZXIpO1xuXHRcdGlmIChzdWJzY3JpYmVySW5kZXggPT0gLTEpIHJldHVybiBmYWxzZTtcblx0XHRtc2dTdWJzY3JpYmVycy5zcGxpY2Uoc3Vic2NyaWJlckluZGV4LCAxKTtcblx0XHRpZiAoISBtc2dTdWJzY3JpYmVycy5sZW5ndGgpXG5cdFx0XHRkZWxldGUgc3Vic2NyaWJlcnNIYXNoW21lc3NhZ2VdO1xuXHR9IGVsc2Vcblx0XHRkZWxldGUgc3Vic2NyaWJlcnNIYXNoW21lc3NhZ2VdO1xuXG5cdHJldHVybiB0cnVlOyAvLyBzdWJzY3JpYmVyKHMpIHJlbW92ZWRcbn1cblxuXG5mdW5jdGlvbiByZW1vdmVTdWJzY3JpYmVycyhtZXNzYWdlU3Vic2NyaWJlcnMpIHtcblx0Y2hlY2sobWVzc2FnZVN1YnNjcmliZXJzLCBNYXRjaC5PYmplY3QpO1xuXG5cdHZhciBzdWJzY3JpYmVyUmVtb3ZlZE1hcCA9IF8ubWFwS2V5cyhtZXNzYWdlU3Vic2NyaWJlcnMsIGZ1bmN0aW9uKHN1YnNjcmliZXIsIG1lc3NhZ2UpIHtcblx0XHRyZXR1cm4gdGhpcy5yZWdpc3RlclN1YnNjcmliZXIobWVzc2FnZSwgc3Vic2NyaWJlcilcblx0fSwgdGhpcyk7XG5cblx0cmV0dXJuIHN1YnNjcmliZXJSZW1vdmVkTWFwO1x0XG59XG5cblxuZnVuY3Rpb24gcG9zdE1lc3NhZ2UobWVzc2FnZSwgZGF0YSkge1xuXHRjaGVjayhtZXNzYWdlLCBNYXRjaC5PbmVPZihTdHJpbmcsIFJlZ0V4cCkpO1xuXG5cdHZhciBzdWJzY3JpYmVyc0hhc2ggPSB0aGlzLl9jaG9vc2VTdWJzY3JpYmVyc0hhc2gobWVzc2FnZSk7XG5cdHZhciBtc2dTdWJzY3JpYmVycyA9IHN1YnNjcmliZXJzSGFzaFttZXNzYWdlXTtcblxuXHRjYWxsU3Vic2NyaWJlcnMobXNnU3Vic2NyaWJlcnMpO1xuXG5cdGlmIChtZXNzYWdlIGluc3RhbmNlb2YgU3RyaW5nKSB7XG5cdFx0Xy5lYWNoS2V5KHRoaXMuX3BhdHRlcm5NZXNzYWdlU3Vic2NyaWJlcnMsIFxuXHRcdFx0ZnVuY3Rpb24ocGF0dGVyblN1YnNjcmliZXJzLCBwYXR0ZXJuKSB7XG5cdFx0XHRcdGlmIChwYXR0ZXJuLnRlc3QobWVzc2FnZSkpXG5cdFx0XHRcdFx0Y2FsbFN1YnNjcmliZXJzKHBhdHRlcm5TdWJzY3JpYmVycyk7XG5cdFx0XHR9XG5cdFx0KTtcblx0fVxuXG5cdGZ1bmN0aW9uIGNhbGxTdWJzY3JpYmVycyhtc2dTdWJzY3JpYmVycykge1xuXHRcdG1zZ1N1YnNjcmliZXJzLmZvckVhY2goZnVuY3Rpb24oc3Vic2NyaWJlcikge1xuXHRcdFx0c3Vic2NyaWJlcihtZXNzYWdlLCBkYXRhKTtcblx0XHR9KTtcblx0fVxufVxuXG5cbmZ1bmN0aW9uIGdldE1lc3NhZ2VTdWJzY3JpYmVycyhtZXNzYWdlLCBpbmNsdWRlUGF0dGVyblN1YnNjcmliZXJzKSB7XG5cdGNoZWNrKG1lc3NhZ2UsIE1hdGNoLk9uZU9mKFN0cmluZywgUmVnRXhwKSk7XG5cblx0dmFyIHN1YnNjcmliZXJzSGFzaCA9IHRoaXMuX2Nob29zZVN1YnNjcmliZXJzSGFzaChtZXNzYWdlKTtcblx0dmFyIG1zZ1N1YnNjcmliZXJzID0gbXNnU3Vic2NyaWJlcnNcblx0XHRcdFx0XHRcdFx0PyBbXS5jb25jYXQoc3Vic2NyaWJlcnNIYXNoW21lc3NhZ2VdKVxuXHRcdFx0XHRcdFx0XHQ6IFtdO1xuXG5cdC8vIHBhdHRlcm4gc3Vic2NyaWJlcnMgYXJlIGluY3VkZWQgYnkgZGVmYXVsdFxuXHRpZiAoaW5jbHVkZVBhdHRlcm5TdWJzY3JpYmVycyAhPSBmYWxzZSAmJiBtZXNzYWdlIGluc3RhbmNlb2YgU3RyaW5nKSB7XG5cdFx0Xy5lYWNoS2V5KHRoaXMuX3BhdHRlcm5NZXNzYWdlU3Vic2NyaWJlcnMsIFxuXHRcdFx0ZnVuY3Rpb24ocGF0dGVyblN1YnNjcmliZXJzLCBwYXR0ZXJuKSB7XG5cdFx0XHRcdGlmIChwYXR0ZXJuU3Vic2NyaWJlcnMgJiYgcGF0dGVyblN1YnNjcmliZXJzLmxlbmd0aFxuXHRcdFx0XHRcdFx0JiYgcGF0dGVybi50ZXN0KG1lc3NhZ2UpKVxuXHRcdFx0XHRcdF8uYXBwZW5kQXJyYXkobXNnU3Vic2NyaWJlcnMsIHBhdHRlcm5TdWJzY3JpYmVycyk7XG5cdFx0XHR9XG5cdFx0KTtcblx0fVxuXG5cdHJldHVybiBtc2dTdWJzY3JpYmVycy5sZW5ndGhcblx0XHRcdFx0PyBtc2dTdWJzY3JpYmVyc1xuXHRcdFx0XHQ6IHVuZGVmaW5lZDtcbn1cblxuXG5mdW5jdGlvbiBfY2hvb3NlU3Vic2NyaWJlcnNIYXNoKG1lc3NhZ2UpIHtcblx0cmV0dXJuIG1lc3NhZ2UgaW5zdGFuY2VvZiBSZWdFeHBcblx0XHRcdFx0PyB0aGlzLl9wYXR0ZXJuTWVzc2FnZVN1YnNjcmliZXJzXG5cdFx0XHRcdDogdGhpcy5fbWVzc2FnZVN1YnNjcmliZXJzO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ3Byb3RvJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gRmFjZXQ7XG5cbmZ1bmN0aW9uIEZhY2V0KG93bmVyLCBvcHRpb25zKSB7XG5cdHRoaXMub3duZXIgPSBvd25lcjtcblx0dGhpcy5vcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblx0dGhpcy5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59XG5cbl8uZXh0ZW5kUHJvdG8oRmFjZXQsIHtcblx0aW5pdDogZnVuY3Rpb24oKSB7fVxufSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBGYWNldCA9IHJlcXVpcmUoJy4vZl9jbGFzcycpXG5cdCwgXyA9IHJlcXVpcmUoJ3Byb3RvJylcblx0LCBjaGVjayA9IHJlcXVpcmUoJy4uL2NoZWNrJylcblx0LCBNYXRjaCA9IGNoZWNrLk1hdGNoO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEZhY2V0ZWRPYmplY3Q7XG5cbi8vIGFic3RyYWN0IGNsYXNzIGZvciBmYWNldGVkIG9iamVjdFxuZnVuY3Rpb24gRmFjZXRlZE9iamVjdChmYWNldHNPcHRpb25zIC8qLCBvdGhlciBhcmdzIC0gcGFzc2VkIHRvIGluaXQgbWV0aG9kICovKSB7XG5cdC8vIFRPRE8gaW5zdGFudGlhdGUgZmFjZXRzIGlmIGNvbmZpZ3VyYXRpb24gaXNuJ3QgcGFzc2VkXG5cdC8vIHdyaXRlIGEgdGVzdCB0byBjaGVjayBpdFxuXHRmYWNldHNPcHRpb25zID0gZmFjZXRzT3B0aW9ucyA/IF8uY2xvbmUoZmFjZXRzT3B0aW9ucykgOiB7fTtcblxuXHR2YXIgdGhpc0NsYXNzID0gdGhpcy5jb25zdHJ1Y3RvclxuXHRcdCwgZmFjZXRzID0ge307XG5cblx0aWYgKHRoaXMuY29uc3RydWN0b3IgPT0gRmFjZXRlZE9iamVjdClcdFx0XG5cdFx0dGhyb3cgbmV3IEVycm9yKCdGYWNldGVkT2JqZWN0IGlzIGFuIGFic3RyYWN0IGNsYXNzLCBjYW5cXCd0IGJlIGluc3RhbnRpYXRlZCcpO1xuXHQvL2lmICghIHRoaXNDbGFzcy5wcm90b3R5cGUuZmFjZXRzKVxuXHQvL1x0dGhyb3cgbmV3IEVycm9yKCdObyBmYWNldHMgZGVmaW5lZCBpbiBjbGFzcyAnICsgdGhpcy5jb25zdHJ1Y3Rvci5uYW1lKTtcblx0XG5cdC8vIF8uZWFjaEtleShmYWNldHNPcHRpb25zLCBpbnN0YW50aWF0ZUZhY2V0LCB0aGlzLCB0cnVlKTtcblxuXHRpZiAodGhpcy5mYWNldHMpXG5cdFx0Xy5lYWNoS2V5KHRoaXMuZmFjZXRzLCBpbnN0YW50aWF0ZUZhY2V0LCB0aGlzLCB0cnVlKTtcblxuXHR2YXIgdW51c2VkRmFjZXRzTmFtZXMgPSBPYmplY3Qua2V5cyhmYWNldHNPcHRpb25zKTtcblx0aWYgKHVudXNlZEZhY2V0c05hbWVzLmxlbmd0aClcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ0NvbmZpZ3VyYXRpb24gZm9yIHVua25vd24gZmFjZXQocykgcGFzc2VkOiAnICsgdW51c2VkRmFjZXRzTmFtZXMuam9pbignLCAnKSk7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnRpZXModGhpcywgZmFjZXRzKTtcblxuXHQvLyBjYWxsaW5nIGluaXQgaWYgaXQgaXMgZGVmaW5lZCBpbiB0aGUgY2xhc3Ncblx0aWYgKHRoaXMuaW5pdClcblx0XHR0aGlzLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuXHRmdW5jdGlvbiBpbnN0YW50aWF0ZUZhY2V0KC8qIGZhY2V0T3B0cyAqLyBGYWNldENsYXNzLCBmY3QpIHtcblx0XHQvLyB2YXIgRmFjZXRDbGFzcyA9IHRoaXMuZmFjZXRzW2ZjdF07XG5cdFx0dmFyIGZhY2V0T3B0cyA9IGZhY2V0c09wdGlvbnNbZmN0XTtcblx0XHRkZWxldGUgZmFjZXRzT3B0aW9uc1tmY3RdO1xuXG5cdFx0ZmFjZXRzW2ZjdF0gPSB7XG5cdFx0XHRlbnVtZXJhYmxlOiBmYWxzZSxcblx0XHRcdHZhbHVlOiBuZXcgRmFjZXRDbGFzcyh0aGlzLCBmYWNldE9wdHMpXG5cdFx0fTtcblx0fVxufVxuXG5cbl8uZXh0ZW5kUHJvdG8oRmFjZXRlZE9iamVjdCwge1xuXHRhZGRGYWNldDogYWRkRmFjZXRcbn0pO1xuXG5cbmZ1bmN0aW9uIGFkZEZhY2V0KEZhY2V0Q2xhc3MsIGZhY2V0T3B0cywgZmFjZXROYW1lKSB7XG5cdGNoZWNrKEZhY2V0Q2xhc3MsIEZ1bmN0aW9uKTtcblx0Y2hlY2soZmFjZXROYW1lLCBNYXRjaC5PcHRpb25hbChTdHJpbmcpKTtcblxuXHRmYWNldE5hbWUgPSBfLmZpcnN0TG93ZXJDYXNlKGZhY2V0TmFtZSB8fCBGYWNldENsYXNzLm5hbWUpO1xuXG5cdHZhciBwcm90b0ZhY2V0cyA9IHRoaXMuY29uc3RydWN0b3IucHJvdG90eXBlLmZhY2V0cztcblxuXHRpZiAocHJvdG9GYWNldHMgJiYgcHJvdG9GYWNldHNbZmFjZXROYW1lXSlcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ2ZhY2V0ICcgKyBmYWNldE5hbWUgKyAnIGlzIGFscmVhZHkgcGFydCBvZiB0aGUgY2xhc3MgJyArIHRoaXMuY29uc3RydWN0b3IubmFtZSk7XG5cblx0aWYgKHRoaXNbZmFjZXROYW1lXSlcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ2ZhY2V0ICcgKyBmYWNldE5hbWUgKyAnIGlzIGFscmVhZHkgcHJlc2VudCBpbiBvYmplY3QnKTtcblxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgZmFjZXROYW1lLCB7XG5cdFx0ZW51bWVyYWJsZTogZmFsc2UsXG5cdFx0dmFsdWU6IG5ldyBGYWNldENsYXNzKHRoaXMsIGZhY2V0T3B0cylcblx0fSk7XG59XG5cblxuLy8gZmFjdG9yeSB0aGF0IGNyZWF0ZXMgY2xhc3NlcyAoY29uc3RydWN0b3JzKSBmcm9tIHRoZSBtYXAgb2YgZmFjZXRzXG4vLyB0aGVzZSBjbGFzc2VzIGluaGVyaXQgZnJvbSBGYWNldGVkT2JqZWN0XG5GYWNldGVkT2JqZWN0LmNyZWF0ZUZhY2V0ZWRDbGFzcyA9IGZ1bmN0aW9uIChuYW1lLCBmYWNldHNDbGFzc2VzKSB7XG5cdGNoZWNrKG5hbWUsIFN0cmluZyk7XG5cdGNoZWNrKGZhY2V0c0NsYXNzZXMsIE1hdGNoLk9iamVjdEhhc2goRnVuY3Rpb24gLyogTWF0Y2guU3ViY2xhc3MoRmFjZXQsIHRydWUpIFRPRE8gLSBmaXggKi8pKTtcblxuXHR2YXIgRmFjZXRlZENsYXNzID0gXy5jcmVhdGVTdWJjbGFzcyh0aGlzLCBuYW1lLCB0cnVlKTtcblxuXHRfLmV4dGVuZFByb3RvKEZhY2V0ZWRDbGFzcywge1xuXHRcdGZhY2V0czogZmFjZXRzQ2xhc3Nlc1xuXHR9KTtcblx0cmV0dXJuIEZhY2V0ZWRDbGFzcztcbn07XG5cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIG1pbG8gPSB7XG5cdGJpbmRlcjogcmVxdWlyZSgnLi9iaW5kZXInKVxufVxuXG5cbi8vIHVzZWQgZmFjZXRzXG5yZXF1aXJlKCcuL2NvbXBvbmVudHMvY19mYWNldHMvQ29udGFpbmVyJyk7XG5yZXF1aXJlKCcuL2NvbXBvbmVudHMvY19mYWNldHMvRXZlbnRzJyk7XG5yZXF1aXJlKCcuL2NvbXBvbmVudHMvY19mYWNldHMvRGF0YScpO1xuXG4vLyB1c2VkIGNvbXBvbmVudHNcbnJlcXVpcmUoJy4vY29tcG9uZW50cy9jbGFzc2VzL1ZpZXcnKTtcblxuXG5pZiAodHlwZW9mIG1vZHVsZSA9PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cylcblx0Ly8gZXhwb3J0IGZvciBub2RlL2Jyb3dzZXJpZnlcblx0bW9kdWxlLmV4cG9ydHMgPSBtaWxvO1xuXG5pZiAodHlwZW9mIHdpbmRvdyA9PSAnb2JqZWN0Jylcblx0d2luZG93Lm1pbG8gPSBtaWxvO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ3Byb3RvJylcblx0LCBjaGVjayA9IHJlcXVpcmUoJy4vY2hlY2snKVxuXHQsIE1hdGNoID0gY2hlY2suTWF0Y2g7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2xhc3NSZWdpc3RyeTtcblxuZnVuY3Rpb24gQ2xhc3NSZWdpc3RyeSAoRm91bmRhdGlvbkNsYXNzKSB7XG5cdGlmIChGb3VuZGF0aW9uQ2xhc3MpXG5cdFx0dGhpcy5zZXRDbGFzcyhGb3VuZGF0aW9uQ2xhc3MpO1xuXG5cdC8vIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnX19yZWdpc3RlcmVkQ2xhc3NlcycsIHtcblx0Ly8gXHRcdGVudW1lcmFibGU6IGZhbHNlLFxuXHQvLyBcdFx0d3JpdGFibGU6IHRydWUsXG5cdC8vIFx0XHRjb25maWd1cmFibGU6IHRydWUsXG5cdC8vIFx0XHR2YWx1ZToge31cblx0Ly8gfSk7XG5cblx0dGhpcy5fX3JlZ2lzdGVyZWRDbGFzc2VzID0ge307XG59XG5cbl8uZXh0ZW5kUHJvdG8oQ2xhc3NSZWdpc3RyeSwge1xuXHRhZGQ6IHJlZ2lzdGVyQ2xhc3MsXG5cdGdldDogZ2V0Q2xhc3MsXG5cdHJlbW92ZTogdW5yZWdpc3RlckNsYXNzLFxuXHRjbGVhbjogdW5yZWdpc3RlckFsbENsYXNzZXMsXG5cdHNldENsYXNzOiBzZXRGb3VuZGF0aW9uQ2xhc3Ncbn0pO1xuXG5cbmZ1bmN0aW9uIHNldEZvdW5kYXRpb25DbGFzcyhGb3VuZGF0aW9uQ2xhc3MpIHtcblx0Y2hlY2soRm91bmRhdGlvbkNsYXNzLCBGdW5jdGlvbik7XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnRm91bmRhdGlvbkNsYXNzJywge1xuXHRcdGVudW1lcmFibGU6IHRydWUsXG5cdFx0dmFsdWU6IEZvdW5kYXRpb25DbGFzc1xuXHR9KTtcbn1cblxuZnVuY3Rpb24gcmVnaXN0ZXJDbGFzcyhhQ2xhc3MsIG5hbWUpIHtcblx0bmFtZSA9IG5hbWUgfHwgYUNsYXNzLm5hbWU7XG5cblx0Y2hlY2sobmFtZSwgU3RyaW5nLCAnY2xhc3MgbmFtZSBtdXN0IGJlIHN0cmluZycpO1xuXHRjaGVjayhuYW1lLCBNYXRjaC5XaGVyZShmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gdHlwZW9mIG5hbWUgPT0gJ3N0cmluZycgJiYgbmFtZSAhPSAnJztcblx0fSksICdjbGFzcyBuYW1lIG11c3QgYmUgc3RyaW5nJyk7XG5cdGlmICh0aGlzLkZvdW5kYXRpb25DbGFzcykge1xuXHRcdGlmIChhQ2xhc3MgIT0gdGhpcy5Gb3VuZGF0aW9uQ2xhc3MpXG5cdFx0XHRjaGVjayhhQ2xhc3MsIE1hdGNoLlN1YmNsYXNzKHRoaXMuRm91bmRhdGlvbkNsYXNzKSwgJ2NsYXNzIG11c3QgYmUgYSBzdWIoY2xhc3MpIG9mIGEgZm91bmRhdGlvbiBjbGFzcycpO1xuXHR9IGVsc2Vcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdmb3VuZGF0aW9uIGNsYXNzIG11c3QgYmUgc2V0IGJlZm9yZSBhZGRpbmcgY2xhc3NlcyB0byByZWdpc3RyeScpO1xuXG5cdGlmICh0aGlzLl9fcmVnaXN0ZXJlZENsYXNzZXNbbmFtZV0pXG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignaXMgYWxyZWFkeSByZWdpc3RlcmVkJyk7XG5cblx0dGhpcy5fX3JlZ2lzdGVyZWRDbGFzc2VzW25hbWVdID0gYUNsYXNzO1xufTtcblxuXG5mdW5jdGlvbiBnZXRDbGFzcyhuYW1lKSB7XG5cdGNoZWNrKG5hbWUsIFN0cmluZywgJ2NsYXNzIG5hbWUgbXVzdCBiZSBzdHJpbmcnKTtcblx0cmV0dXJuIHRoaXMuX19yZWdpc3RlcmVkQ2xhc3Nlc1tuYW1lXTtcbn07XG5cblxuZnVuY3Rpb24gdW5yZWdpc3RlckNsYXNzKG5hbWVPckNsYXNzKSB7XG5cdGNoZWNrKG5hbWVPckNsYXNzLCBNYXRjaC5PbmVPZihTdHJpbmcsIEZ1bmN0aW9uKSwgJ2NsYXNzIG9yIG5hbWUgbXVzdCBiZSBzdXBwbGllZCcpO1xuXG5cdHZhciBuYW1lID0gdHlwZW9mIG5hbWVPckNsYXNzID09ICdzdHJpbmcnXG5cdFx0XHRcdFx0XHQ/IG5hbWVPckNsYXNzXG5cdFx0XHRcdFx0XHQ6IG5hbWVPckNsYXNzLm5hbWU7XG5cdFx0XHRcdFx0XHRcblx0aWYgKCEgdGhpcy5fX3JlZ2lzdGVyZWRDbGFzc2VzW25hbWVdKVxuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ2NsYXNzIGlzIG5vdCByZWdpc3RlcmVkJyk7XG5cblx0ZGVsZXRlIHRoaXMuX19yZWdpc3RlcmVkQ2xhc3Nlc1tuYW1lXTtcbn07XG5cblxuZnVuY3Rpb24gdW5yZWdpc3RlckFsbENsYXNzZXMoKSB7XG5cdHRoaXMuX19yZWdpc3RlcmVkQ2xhc3NlcyA9IHt9O1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIF87XG52YXIgcHJvdG8gPSBfID0ge1xuXHRleHRlbmRQcm90bzogZXh0ZW5kUHJvdG8sXG5cdGV4dGVuZDogZXh0ZW5kLFxuXHRjbG9uZTogY2xvbmUsXG5cdGNyZWF0ZVN1YmNsYXNzOiBjcmVhdGVTdWJjbGFzcyxcblx0bWFrZVN1YmNsYXNzOiBtYWtlU3ViY2xhc3MsXG5cdGFsbEtleXM6IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzLmJpbmQoT2JqZWN0KSxcblx0a2V5T2Y6IGtleU9mLFxuXHRhbGxLZXlzT2Y6IGFsbEtleXNPZixcblx0ZWFjaEtleTogZWFjaEtleSxcblx0bWFwS2V5czogbWFwS2V5cyxcblx0YXBwZW5kQXJyYXk6IGFwcGVuZEFycmF5LFxuXHRwcmVwZW5kQXJyYXk6IHByZXBlbmRBcnJheSxcblx0Zmlyc3RVcHBlckNhc2U6IGZpcnN0VXBwZXJDYXNlLFxuXHRmaXJzdExvd2VyQ2FzZTogZmlyc3RMb3dlckNhc2Vcbn07XG5cblxuaWYgKHR5cGVvZiB3aW5kb3cgPT0gJ29iamVjdCcpIHtcblx0Ly8gcHJlc2VydmUgZXhpc3RpbmcgXyBvYmplY3Rcblx0aWYgKHdpbmRvdy5fKVxuXHRcdHByb3RvLnVuZGVyc2NvcmUgPSB3aW5kb3cuX1xuXG5cdC8vIGV4cG9zZSBnbG9iYWwgX1xuXHR3aW5kb3cuXyA9IHByb3RvO1xufVxuXG5pZiAodHlwZW9mIG1vZHVsZSA9PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cylcblx0Ly8gZXhwb3J0IGZvciBub2RlL2Jyb3dzZXJpZnlcblx0bW9kdWxlLmV4cG9ydHMgPSBwcm90bztcblx0XG5cbmZ1bmN0aW9uIGV4dGVuZFByb3RvKHNlbGYsIG1ldGhvZHMpIHtcblx0dmFyIHByb3BEZXNjcmlwdG9ycyA9IHt9O1xuXG5cdF8uZWFjaEtleShtZXRob2RzLCBmdW5jdGlvbihtZXRob2QsIG5hbWUpIHtcblx0XHRwcm9wRGVzY3JpcHRvcnNbbmFtZV0gPSB7XG5cdFx0XHRlbnVtZXJhYmxlOiBmYWxzZSxcblx0XHRcdGNvbmZpZ3VyYWJsZTogZmFsc2UsXG5cdFx0XHR3cml0YWJsZTogZmFsc2UsXG5cdFx0XHR2YWx1ZTogbWV0aG9kXG5cdFx0fTtcblx0fSk7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnRpZXMoc2VsZi5wcm90b3R5cGUsIHByb3BEZXNjcmlwdG9ycyk7XG5cdHJldHVybiBzZWxmO1xufVxuXG5cbmZ1bmN0aW9uIGV4dGVuZChzZWxmLCBvYmosIG9ubHlFbnVtZXJhYmxlKSB7XG5cdHZhciBwcm9wRGVzY3JpcHRvcnMgPSB7fTtcblxuXHRfLmVhY2hLZXkob2JqLCBmdW5jdGlvbih2YWx1ZSwgcHJvcCkge1xuXHRcdHZhciBkZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmosIHByb3ApO1xuXHRcdHByb3BEZXNjcmlwdG9yc1twcm9wXSA9IGRlc2NyaXB0b3I7XG5cdH0sIHRoaXMsIG9ubHlFbnVtZXJhYmxlKTtcblxuXHRPYmplY3QuZGVmaW5lUHJvcGVydGllcyhzZWxmLCBwcm9wRGVzY3JpcHRvcnMpO1xuXG5cdHJldHVybiBzZWxmO1xufVxuXG5cbmZ1bmN0aW9uIGNsb25lKG9iaikge1xuXHR2YXIgY2xvbmVkT2JqZWN0ID0gT2JqZWN0LmNyZWF0ZShvYmouY29uc3RydWN0b3IucHJvdG90eXBlKTtcblx0Xy5leHRlbmQoY2xvbmVkT2JqZWN0LCBvYmopO1xuXHRyZXR1cm4gY2xvbmVkT2JqZWN0O1xufVxuXG5cbmZ1bmN0aW9uIGNyZWF0ZVN1YmNsYXNzKHRoaXNDbGFzcywgbmFtZSwgYXBwbHlDb25zdHJ1Y3Rvcikge1xuXHR2YXIgc3ViY2xhc3M7XG5cblx0Ly8gbmFtZSBpcyBvcHRpb25hbFxuXHRuYW1lID0gbmFtZSB8fCAnJztcblxuXHQvLyBhcHBseSBzdXBlcmNsYXNzIGNvbnN0cnVjdG9yXG5cdHZhciBjb25zdHJ1Y3RvckNvZGUgPSBhcHBseUNvbnN0cnVjdG9yID09PSBmYWxzZVxuXHRcdFx0PyAnJ1xuXHRcdFx0OiAndGhpc0NsYXNzLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7JztcblxuXHRldmFsKCdzdWJjbGFzcyA9IGZ1bmN0aW9uICcgKyBuYW1lICsgJygpeyAnICsgY29uc3RydWN0b3JDb2RlICsgJyB9Jyk7XG5cblx0Ly8gcHByb3RvdHlwZSBjaGFpblxuXHRzdWJjbGFzcy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHRoaXNDbGFzcy5wcm90b3R5cGUpO1xuXHRcblx0Ly8gc3ViY2xhc3MgaWRlbnRpdHlcblx0Xy5leHRlbmRQcm90byhzdWJjbGFzcywge1xuXHRcdGNvbnN0cnVjdG9yOiBzdWJjbGFzc1xuXHR9KTtcblxuXHQvLyBjb3B5IGNsYXNzIG1ldGhvZHNcblx0Ly8gLSBmb3IgdGhlbSB0byB3b3JrIGNvcnJlY3RseSB0aGV5IHNob3VsZCBub3QgZXhwbGljdGx5IHVzZSBzdXBlcmNsYXNzIG5hbWVcblx0Ly8gYW5kIHVzZSBcInRoaXNcIiBpbnN0ZWFkXG5cdF8uZXh0ZW5kKHN1YmNsYXNzLCB0aGlzQ2xhc3MsIHRydWUpO1xuXG5cdHJldHVybiBzdWJjbGFzcztcbn1cblxuXG5mdW5jdGlvbiBtYWtlU3ViY2xhc3ModGhpc0NsYXNzLCBTdXBlcmNsYXNzKSB7XG5cdHRoaXNDbGFzcy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFN1cGVyY2xhc3MucHJvdG90eXBlKTtcblx0dGhpc0NsYXNzLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IHRoaXNDbGFzcztcblx0cmV0dXJuIHRoaXNDbGFzcztcbn1cblxuXG5mdW5jdGlvbiBrZXlPZihzZWxmLCBzZWFyY2hFbGVtZW50LCBvbmx5RW51bWVyYWJsZSkge1xuXHR2YXIgcHJvcGVydGllcyA9IG9ubHlFbnVtZXJhYmxlIFxuXHRcdFx0XHRcdFx0PyBPYmplY3Qua2V5cyhzZWxmKVxuXHRcdFx0XHRcdFx0OiBfLmFsbEtleXMoc2VsZik7XG5cblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wZXJ0aWVzLmxlbmd0aDsgaSsrKVxuXHRcdGlmIChzZWFyY2hFbGVtZW50ID09PSBzZWxmW3Byb3BlcnRpZXNbaV1dKVxuXHRcdFx0cmV0dXJuIHByb3BlcnRpZXNbaV07XG5cdFxuXHRyZXR1cm4gdW5kZWZpbmVkO1xufVxuXG5cbmZ1bmN0aW9uIGFsbEtleXNPZihzZWxmLCBzZWFyY2hFbGVtZW50LCBvbmx5RW51bWVyYWJsZSkge1xuXHR2YXIgcHJvcGVydGllcyA9IG9ubHlFbnVtZXJhYmxlIFxuXHRcdFx0XHRcdFx0PyBPYmplY3Qua2V5cyhzZWxmKVxuXHRcdFx0XHRcdFx0OiBfLmFsbEtleXMoc2VsZik7XG5cblx0dmFyIGtleXMgPSBwcm9wZXJ0aWVzLmZpbHRlcihmdW5jdGlvbihwcm9wKSB7XG5cdFx0cmV0dXJuIHNlYXJjaEVsZW1lbnQgPT09IHNlbGZbcHJvcF07XG5cdH0pO1xuXG5cdHJldHVybiBrZXlzO1xufVxuXG5cbmZ1bmN0aW9uIGVhY2hLZXkoc2VsZiwgY2FsbGJhY2ssIHRoaXNBcmcsIG9ubHlFbnVtZXJhYmxlKSB7XG5cdHZhciBwcm9wZXJ0aWVzID0gb25seUVudW1lcmFibGUgXG5cdFx0XHRcdFx0XHQ/IE9iamVjdC5rZXlzKHNlbGYpXG5cdFx0XHRcdFx0XHQ6IF8uYWxsS2V5cyhzZWxmKTtcblxuXHRwcm9wZXJ0aWVzLmZvckVhY2goZnVuY3Rpb24ocHJvcCkge1xuXHRcdGNhbGxiYWNrLmNhbGwodGhpc0FyZywgc2VsZltwcm9wXSwgcHJvcCwgc2VsZik7XG5cdH0pO1xufVxuXG5cbmZ1bmN0aW9uIG1hcEtleXMoc2VsZiwgY2FsbGJhY2ssIHRoaXNBcmcsIG9ubHlFbnVtZXJhYmxlKSB7XG5cdHZhciBtYXBSZXN1bHQgPSB7fTtcblx0Xy5lYWNoS2V5KHNlbGYsIG1hcFByb3BlcnR5LCB0aGlzQXJnLCBvbmx5RW51bWVyYWJsZSk7XG5cdHJldHVybiBtYXBSZXN1bHQ7XG5cblx0ZnVuY3Rpb24gbWFwUHJvcGVydHkodmFsdWUsIGtleSkge1xuXHRcdHZhciBkZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihzZWxmLCBrZXkpO1xuXHRcdGlmIChkZXNjcmlwdG9yLmVudW1lcmFibGUgfHwgISBvbmx5RW51bWVyYWJsZSkge1xuXHRcdFx0ZGVzY3JpcHRvci52YWx1ZSA9IGNhbGxiYWNrLmNhbGwodGhpcywgdmFsdWUsIGtleSwgc2VsZik7XG5cdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkobWFwUmVzdWx0LCBrZXksIGRlc2NyaXB0b3IpO1xuXHRcdH1cblx0fVxufVxuXG5cbmZ1bmN0aW9uIGFwcGVuZEFycmF5KHNlbGYsIGFycmF5VG9BcHBlbmQpIHtcblx0aWYgKCEgYXJyYXlUb0FwcGVuZC5sZW5ndGgpIHJldHVybiBzZWxmO1xuXG4gICAgdmFyIGFyZ3MgPSBbc2VsZi5sZW5ndGgsIDBdLmNvbmNhdChhcnJheVRvQXBwZW5kKTtcbiAgICBBcnJheS5wcm90b3R5cGUuc3BsaWNlLmFwcGx5KHNlbGYsIGFyZ3MpO1xuXG4gICAgcmV0dXJuIHNlbGY7XG59XG5cblxuZnVuY3Rpb24gcHJlcGVuZEFycmF5KHNlbGYsIGFycmF5VG9QcmVwZW5kKSB7XG5cdGlmICghIGFycmF5VG9QcmVwZW5kLmxlbmd0aCkgcmV0dXJuIHNlbGY7XG5cbiAgICB2YXIgYXJncyA9IFswLCAwXS5jb25jYXQoYXJyYXlUb1ByZXBlbmQpO1xuICAgIEFycmF5LnByb3RvdHlwZS5zcGxpY2UuYXBwbHkoc2VsZiwgYXJncyk7XG5cbiAgICByZXR1cm4gc2VsZjtcbn1cblxuXG5mdW5jdGlvbiBmaXJzdFVwcGVyQ2FzZShzdHIpIHtcblx0cmV0dXJuIHN0clswXS50b1VwcGVyQ2FzZSgpICsgc3RyLnNsaWNlKDEpO1xufVxuXG5cbmZ1bmN0aW9uIGZpcnN0TG93ZXJDYXNlKHN0cikge1xuXHRyZXR1cm4gc3RyWzBdLnRvTG93ZXJDYXNlKCkgKyBzdHIuc2xpY2UoMSk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmRlc2NyaWJlKCdtaWxvIGJpbmRlcicsIGZ1bmN0aW9uKCkge1xuICAgIGl0KCdzaG91bGQgYmluZCBjb21wb25lbnRzIGJhc2VkIG9uIG1sLWJpbmQgYXR0cmlidXRlJywgZnVuY3Rpb24oKSB7XG4gICAgXHR2YXIgbWlsbyA9IHJlcXVpcmUoJy4uLy4uL2xpYi9taWxvJyk7XG5cblx0XHRleHBlY3Qoe3A6IDF9KS5wcm9wZXJ0eSgncCcsIDEpO1xuXG4gICAgXHR2YXIgY3RybCA9IG1pbG8uYmluZGVyKCk7XG5cbiAgICBcdGN0cmwuYXJ0aWNsZUJ1dHRvbi5ldmVudHMub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgIFx0XHRjb25zb2xlLmxvZygnYnV0dG9uIGNsaWNrZWQnLCBlKTtcbiAgICBcdH0pO1xuXG4gICAgXHRjdHJsLmFydGljbGVJZElucHV0LmV2ZW50cy5vbignaW5wdXQnLCBsb2dFdmVudCk7XG5cbiAgICBcdGZ1bmN0aW9uIGxvZ0V2ZW50KGUpIHtcbiAgICBcdFx0Y29uc29sZS5sb2coZSk7XG4gICAgXHR9XG4gICAgXHRcblx0XHRjb25zb2xlLmxvZyhjdHJsKTtcbiAgICB9KTtcbn0pO1xuIl19
;