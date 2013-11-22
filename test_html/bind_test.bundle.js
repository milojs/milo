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

},{"../check":4,"./error":3,"proto":11}],2:[function(require,module,exports){
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

module.exports = bind;

function bind(scopeEl) {
	var scopeEl = scopeEl || document.body
		, components = {};

	// iterate children of scopeEl
	Array.prototype.forEach.call(scopeEl.children, bindElement);

	return components;

	function bindElement(el){
		var attr = new Attribute(el, opts.BIND_ATTR);

		var aComponent = createComponent(el, attr);

		// bind inner elements to components
		var innerComponents = bind(el);

		// attach inner components to the current one (create a new scope) ...
		if (typeof aComponent != 'undefined' && aComponent.container)
			aComponent.container.add(innerComponents);
		else // or keep them in the current scope
			_.eachKey(innerComponents, storeComponent);

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
			console.log(ComponentClass);
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


bind.config = function(options) {
	opts.extend(options);
};

},{"../check":4,"../components/c_registry":6,"./attribute":1,"./error":3,"proto":11}],3:[function(require,module,exports){
'use strict';

var _ = require('proto');

var BindError = _.createSubclass(Error, 'BindError');

module.exports = BindError;

},{"proto":11}],4:[function(require,module,exports){
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


},{"proto":11}],5:[function(require,module,exports){
'use strict';

var FacetedObject = require('../facets/f_object')
	, _ = require('proto');

var Component = module.exports = _.createSubclass(FacetedObject, 'Component', true)

Component.createComponentClass = FacetedObject.createFacetedClass;
delete Component.createFacetedClass;

_.extendProto(Component, {
	init: initComponent
});


function initComponent(facetsOptions, element) {
	this.el = element;
}

},{"../facets/f_object":8,"proto":11}],6:[function(require,module,exports){
'use strict';

var ClassRegistry = require('../registry')
	, Component = require('./c_class');

var componentsRegistry = new ClassRegistry(Component);

componentsRegistry.add(Component);

module.exports = componentsRegistry;

},{"../registry":10,"./c_class":5}],7:[function(require,module,exports){
'use strict';

var _ = require('proto');

module.exports = Facet;

function Facet(owner, options) {
	this.owner = owner;
	this.options = options;
	this.init();
}

_.extendProto(Facet, {
	init: Function()
});

},{"proto":11}],8:[function(require,module,exports){
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
	
	_.eachKey(facetsOptions, instantiateFacet, this, true);

	// _.eachKey(this.facets, instantiateFacet, this, true);

	var unusedFacetsNames = Object.keys(facetsOptions);
	if (unusedFacetsNames.length)
		throw new Error('Configuration for unknown facet(s) passed: ' + unusedFacetsNames.join(', '));

	Object.defineProperties(this, facets);

	// calling init if it is defined in the class
	if (this.init)
		this.init.apply(this, arguments);

	function instantiateFacet(facetOpts /* facetClass */, fct) {
		var facetClass = this.facets[fct];
		// var facetOpts = facetsOptions[fct];
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


},{"../check":4,"./f_class":7,"proto":11}],9:[function(require,module,exports){
'use strict';

var milo = {
	bind: require('./binder/bind')
}

if (typeof module == 'object' && module.exports)
	// export for node/browserify
	module.exports = milo;

if (typeof window == 'object')
	window.milo = milo;

},{"./binder/bind":2}],10:[function(require,module,exports){
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

},{"./check":4,"proto":11}],11:[function(require,module,exports){
'use strict';

var _;
var proto = _ = {
	extendProto: extendProto,
	extend: extend,
	clone: clone,
	createSubclass: createSubclass,
	allKeys: Object.getOwnPropertyNames.bind(Object),
	keyOf: keyOf,
	allKeysOf: allKeysOf,
	eachKey: eachKey,
	mapKeys: mapKeys
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

},{}],12:[function(require,module,exports){
'use strict';

describe('milo binder', function() {
    it('should bind components based on ml-bind attribute', function() {
    	var milo = require('../../lib/milo');

		expect({p: 1}).property('p', 1);

    	var components = milo.bind(document.getElementById('viewToBind'));
    	
		console.log(components);
    });
});

},{"../../lib/milo":9}]},{},[12])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2JpbmRlci9hdHRyaWJ1dGUuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2JpbmRlci9iaW5kLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9iaW5kZXIvZXJyb3IuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NoZWNrLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfY2xhc3MuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19yZWdpc3RyeS5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvZmFjZXRzL2ZfY2xhc3MuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2ZhY2V0cy9mX29iamVjdC5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvbWlsby5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvcmVnaXN0cnkuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbm9kZV9tb2R1bGVzL3Byb3RvL2xpYi9wcm90by5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby90ZXN0X2h0bWwvYmluZF90ZXN0L2JpbmRfdGVzdC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9JQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ3Byb3RvJylcblx0LCBjaGVjayA9IHJlcXVpcmUoJy4uL2NoZWNrJylcblx0LCBNYXRjaCA9IGNoZWNrLk1hdGNoXG5cdCwgQmluZEVycm9yID0gcmVxdWlyZSgnLi9lcnJvcicpO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gQXR0cmlidXRlO1xuXG5mdW5jdGlvbiBBdHRyaWJ1dGUoZWwsIG5hbWUpIHtcblx0dGhpcy5uYW1lID0gbmFtZTtcblx0dGhpcy5lbCA9IGVsO1xuXHR0aGlzLm5vZGUgPSBlbC5hdHRyaWJ1dGVzW25hbWVdO1xufVxuXG5fLmV4dGVuZFByb3RvKEF0dHJpYnV0ZSwge1xuXHRnZXQ6IGdldEF0dHJpYnV0ZVZhbHVlLFxuXHRzZXQ6IHNldEF0dHJpYnV0ZVZhbHVlLFxuXHRwYXJzZTogcGFyc2VBdHRyaWJ1dGUsXG5cdHZhbGlkYXRlOiB2YWxpZGF0ZUF0dHJpYnV0ZVxufSk7XG5cblxuZnVuY3Rpb24gZ2V0QXR0cmlidXRlVmFsdWUoKSB7XG5cdHJldHVybiB0aGlzLmVsLmdldEF0dHJpYnV0ZSh0aGlzLm5hbWUpO1xufVxuXG5mdW5jdGlvbiBzZXRBdHRyaWJ1dGVWYWx1ZSh2YWx1ZSkge1xuXHR0aGlzLmVsLnNldEF0dHJpYnV0ZSh0aGlzLm5hbWUsIHZhbHVlKTtcbn1cblxuZnVuY3Rpb24gcGFyc2VBdHRyaWJ1dGUoKSB7XG5cdGlmICghIHRoaXMubm9kZSkgcmV0dXJuO1xuXG5cdHZhciB2YWx1ZSA9IHRoaXMuZ2V0KCk7XG5cblx0aWYgKHZhbHVlKVxuXHRcdHZhciBiaW5kVG8gPSB2YWx1ZS5zcGxpdCgnOicpO1xuXG5cdHN3aXRjaCAoYmluZFRvICYmIGJpbmRUby5sZW5ndGgpIHtcblx0XHRjYXNlIDE6XG5cdFx0XHR0aGlzLmNvbXBOYW1lID0gYmluZFRvWzBdO1xuXHRcdFx0dGhpcy5jb21wQ2xhc3MgPSAnQ29tcG9uZW50Jztcblx0XHRcdHJldHVybiB0aGlzO1xuXG5cdFx0Y2FzZSAyOlxuXHRcdFx0dGhpcy5jb21wTmFtZSA9IGJpbmRUb1sxXTtcblx0XHRcdHRoaXMuY29tcENsYXNzID0gYmluZFRvWzBdO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cblx0XHRkZWZhdWx0OlxuXHRcdFx0dGhyb3cgbmV3IEJpbmRFcnJvcignaW52YWxpZCBiaW5kIGF0dHJpYnV0ZSAnICsgdmFsdWUpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHZhbGlkYXRlQXR0cmlidXRlKCkge1xuXHR2YXIgY29tcE5hbWUgPSB0aGlzLmNvbXBOYW1lO1xuXHRjaGVjayhjb21wTmFtZSwgTWF0Y2guV2hlcmUoZnVuY3Rpb24oKSB7XG4gIFx0XHRyZXR1cm4gdHlwZW9mIGNvbXBOYW1lID09ICdzdHJpbmcnICYmIGNvbXBOYW1lICE9ICcnO1xuXHR9KSwgJ2VtcHR5IGNvbXBvbmVudCBuYW1lJyk7XG5cblx0aWYgKCEgdGhpcy5jb21wQ2xhc3MpXG5cdFx0dGhyb3cgbmV3IEJpbmRFcnJvcignZW1wdHkgY29tcG9uZW50IGNsYXNzIG5hbWUgJyArIHRoaXMuY29tcENsYXNzKTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGNvbXBvbmVudHNSZWdpc3RyeSA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudHMvY19yZWdpc3RyeScpXG5cdCwgQ29tcG9uZW50ID0gY29tcG9uZW50c1JlZ2lzdHJ5LmdldCgnQ29tcG9uZW50Jylcblx0LCBBdHRyaWJ1dGUgPSByZXF1aXJlKCcuL2F0dHJpYnV0ZScpXG5cdCwgQmluZEVycm9yID0gcmVxdWlyZSgnLi9lcnJvcicpXG5cdCwgXyA9IHJlcXVpcmUoJ3Byb3RvJylcblx0LCBjaGVjayA9IHJlcXVpcmUoJy4uL2NoZWNrJylcblx0LCBNYXRjaCA9ICBjaGVjay5NYXRjaDtcblxuXG52YXIgb3B0cyA9IHtcblx0QklORF9BVFRSOiAnbWwtYmluZCdcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBiaW5kO1xuXG5mdW5jdGlvbiBiaW5kKHNjb3BlRWwpIHtcblx0dmFyIHNjb3BlRWwgPSBzY29wZUVsIHx8IGRvY3VtZW50LmJvZHlcblx0XHQsIGNvbXBvbmVudHMgPSB7fTtcblxuXHQvLyBpdGVyYXRlIGNoaWxkcmVuIG9mIHNjb3BlRWxcblx0QXJyYXkucHJvdG90eXBlLmZvckVhY2guY2FsbChzY29wZUVsLmNoaWxkcmVuLCBiaW5kRWxlbWVudCk7XG5cblx0cmV0dXJuIGNvbXBvbmVudHM7XG5cblx0ZnVuY3Rpb24gYmluZEVsZW1lbnQoZWwpe1xuXHRcdHZhciBhdHRyID0gbmV3IEF0dHJpYnV0ZShlbCwgb3B0cy5CSU5EX0FUVFIpO1xuXG5cdFx0dmFyIGFDb21wb25lbnQgPSBjcmVhdGVDb21wb25lbnQoZWwsIGF0dHIpO1xuXG5cdFx0Ly8gYmluZCBpbm5lciBlbGVtZW50cyB0byBjb21wb25lbnRzXG5cdFx0dmFyIGlubmVyQ29tcG9uZW50cyA9IGJpbmQoZWwpO1xuXG5cdFx0Ly8gYXR0YWNoIGlubmVyIGNvbXBvbmVudHMgdG8gdGhlIGN1cnJlbnQgb25lIChjcmVhdGUgYSBuZXcgc2NvcGUpIC4uLlxuXHRcdGlmICh0eXBlb2YgYUNvbXBvbmVudCAhPSAndW5kZWZpbmVkJyAmJiBhQ29tcG9uZW50LmNvbnRhaW5lcilcblx0XHRcdGFDb21wb25lbnQuY29udGFpbmVyLmFkZChpbm5lckNvbXBvbmVudHMpO1xuXHRcdGVsc2UgLy8gb3Iga2VlcCB0aGVtIGluIHRoZSBjdXJyZW50IHNjb3BlXG5cdFx0XHRfLmVhY2hLZXkoaW5uZXJDb21wb25lbnRzLCBzdG9yZUNvbXBvbmVudCk7XG5cblx0XHRpZiAoYUNvbXBvbmVudClcblx0XHRcdHN0b3JlQ29tcG9uZW50KGFDb21wb25lbnQsIGF0dHIubmFtZSk7XG5cdH1cblxuXHRmdW5jdGlvbiBjcmVhdGVDb21wb25lbnQoZWwsIGF0dHIpIHtcblx0XHRpZiAoYXR0ci5ub2RlKSB7IC8vIGVsZW1lbnQgd2lsbCBiZSBib3VuZCB0byBhIGNvbXBvbmVudFxuXHRcdFx0YXR0ci5wYXJzZSgpLnZhbGlkYXRlKCk7XG5cdFx0XG5cdFx0XHQvLyBnZXQgY29tcG9uZW50IGNsYXNzIGZyb20gcmVnaXN0cnkgYW5kIHZhbGlkYXRlXG5cdFx0XHR2YXIgQ29tcG9uZW50Q2xhc3MgPSBjb21wb25lbnRzUmVnaXN0cnkuZ2V0KGF0dHIuY29tcENsYXNzKTtcblx0XHRcdGlmICghIENvbXBvbmVudENsYXNzKVxuXHRcdFx0XHR0aHJvdyBuZXcgQmluZEVycm9yKCdjbGFzcyAnICsgYXR0ci5jb21wQ2xhc3MgKyAnIGlzIG5vdCByZWdpc3RlcmVkJyk7XG5cdFx0XHRjb25zb2xlLmxvZyhDb21wb25lbnRDbGFzcyk7XG5cdFx0XHRjaGVjayhDb21wb25lbnRDbGFzcywgTWF0Y2guU3ViY2xhc3MoQ29tcG9uZW50LCB0cnVlKSk7XG5cdFxuXHRcdFx0Ly8gY3JlYXRlIG5ldyBjb21wb25lbnRcblx0XHRcdHJldHVybiBuZXcgQ29tcG9uZW50Q2xhc3Moe30sIGVsKTtcblx0XHR9XG5cdH1cblxuXG5cdGZ1bmN0aW9uIHN0b3JlQ29tcG9uZW50KGFDb21wb25lbnQsIG5hbWUpIHtcblx0XHRpZiAoY29tcG9uZW50c1tuYW1lXSlcblx0XHRcdHRocm93IG5ldyBCaW5kRXJyb3IoJ2R1cGxpY2F0ZSBjb21wb25lbnQgbmFtZTogJyArIG5hbWUpO1xuXG5cdFx0Y29tcG9uZW50c1tuYW1lXSA9IGFDb21wb25lbnQ7XG5cdH1cbn1cblxuXG5iaW5kLmNvbmZpZyA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblx0b3B0cy5leHRlbmQob3B0aW9ucyk7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ3Byb3RvJyk7XG5cbnZhciBCaW5kRXJyb3IgPSBfLmNyZWF0ZVN1YmNsYXNzKEVycm9yLCAnQmluZEVycm9yJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gQmluZEVycm9yO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyBYWFggZG9jc1xuXG4vLyBUaGluZ3Mgd2UgZXhwbGljaXRseSBkbyBOT1Qgc3VwcG9ydDpcbi8vICAgIC0gaGV0ZXJvZ2Vub3VzIGFycmF5c1xudmFyIF8gPSByZXF1aXJlKCdwcm90bycpO1xuXG52YXIgY2hlY2sgPSBmdW5jdGlvbiAodmFsdWUsIHBhdHRlcm4pIHtcbiAgLy8gUmVjb3JkIHRoYXQgY2hlY2sgZ290IGNhbGxlZCwgaWYgc29tZWJvZHkgY2FyZWQuXG4gIHRyeSB7XG4gICAgY2hlY2tTdWJ0cmVlKHZhbHVlLCBwYXR0ZXJuKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgaWYgKChlcnIgaW5zdGFuY2VvZiBNYXRjaC5FcnJvcikgJiYgZXJyLnBhdGgpXG4gICAgICBlcnIubWVzc2FnZSArPSBcIiBpbiBmaWVsZCBcIiArIGVyci5wYXRoO1xuICAgIHRocm93IGVycjtcbiAgfVxufTtcbm1vZHVsZS5leHBvcnRzID0gY2hlY2s7XG5cbnZhciBNYXRjaCA9IGNoZWNrLk1hdGNoID0ge1xuICBPcHRpb25hbDogZnVuY3Rpb24gKHBhdHRlcm4pIHtcbiAgICByZXR1cm4gbmV3IE9wdGlvbmFsKHBhdHRlcm4pO1xuICB9LFxuICBPbmVPZjogZnVuY3Rpb24gKC8qYXJndW1lbnRzKi8pIHtcbiAgICByZXR1cm4gbmV3IE9uZU9mKGFyZ3VtZW50cyk7XG4gIH0sXG4gIEFueTogWydfX2FueV9fJ10sXG4gIFdoZXJlOiBmdW5jdGlvbiAoY29uZGl0aW9uKSB7XG4gICAgcmV0dXJuIG5ldyBXaGVyZShjb25kaXRpb24pO1xuICB9LFxuICBPYmplY3RJbmNsdWRpbmc6IGZ1bmN0aW9uIChwYXR0ZXJuKSB7XG4gICAgcmV0dXJuIG5ldyBPYmplY3RJbmNsdWRpbmcocGF0dGVybik7XG4gIH0sXG4gIC8vIE1hdGNoZXMgb25seSBzaWduZWQgMzItYml0IGludGVnZXJzXG4gIEludGVnZXI6IFsnX19pbnRlZ2VyX18nXSxcblxuICAvLyBNYXRjaGVzIGhhc2ggKG9iamVjdCkgd2l0aCB2YWx1ZXMgbWF0Y2hpbmcgcGF0dGVyblxuICBPYmplY3RIYXNoOiBmdW5jdGlvbihwYXR0ZXJuKSB7XG4gICAgcmV0dXJuIG5ldyBPYmplY3RIYXNoKHBhdHRlcm4pO1xuICB9LFxuXG4gIFN1YmNsYXNzOiBmdW5jdGlvbihTdXBlcmNsYXNzLCBtYXRjaFN1cGVyY2xhc3NUb28pIHtcbiAgICByZXR1cm4gbmV3IFN1YmNsYXNzKFN1cGVyY2xhc3MsIG1hdGNoU3VwZXJjbGFzc1Rvbyk7XG4gIH0sXG5cbiAgLy8gWFhYIG1hdGNoZXJzIHNob3VsZCBrbm93IGhvdyB0byBkZXNjcmliZSB0aGVtc2VsdmVzIGZvciBlcnJvcnNcbiAgRXJyb3I6IFR5cGVFcnJvcixcblxuICAvLyBNZXRlb3IubWFrZUVycm9yVHlwZShcIk1hdGNoLkVycm9yXCIsIGZ1bmN0aW9uIChtc2cpIHtcbiAgICAvLyB0aGlzLm1lc3NhZ2UgPSBcIk1hdGNoIGVycm9yOiBcIiArIG1zZztcbiAgICAvLyBUaGUgcGF0aCBvZiB0aGUgdmFsdWUgdGhhdCBmYWlsZWQgdG8gbWF0Y2guIEluaXRpYWxseSBlbXB0eSwgdGhpcyBnZXRzXG4gICAgLy8gcG9wdWxhdGVkIGJ5IGNhdGNoaW5nIGFuZCByZXRocm93aW5nIHRoZSBleGNlcHRpb24gYXMgaXQgZ29lcyBiYWNrIHVwIHRoZVxuICAgIC8vIHN0YWNrLlxuICAgIC8vIEUuZy46IFwidmFsc1szXS5lbnRpdHkuY3JlYXRlZFwiXG4gICAgLy8gdGhpcy5wYXRoID0gXCJcIjtcbiAgICAvLyBJZiB0aGlzIGdldHMgc2VudCBvdmVyIEREUCwgZG9uJ3QgZ2l2ZSBmdWxsIGludGVybmFsIGRldGFpbHMgYnV0IGF0IGxlYXN0XG4gICAgLy8gcHJvdmlkZSBzb21ldGhpbmcgYmV0dGVyIHRoYW4gNTAwIEludGVybmFsIHNlcnZlciBlcnJvci5cbiAgLy8gICB0aGlzLnNhbml0aXplZEVycm9yID0gbmV3IE1ldGVvci5FcnJvcig0MDAsIFwiTWF0Y2ggZmFpbGVkXCIpO1xuICAvLyB9KSxcblxuICAvLyBUZXN0cyB0byBzZWUgaWYgdmFsdWUgbWF0Y2hlcyBwYXR0ZXJuLiBVbmxpa2UgY2hlY2ssIGl0IG1lcmVseSByZXR1cm5zIHRydWVcbiAgLy8gb3IgZmFsc2UgKHVubGVzcyBhbiBlcnJvciBvdGhlciB0aGFuIE1hdGNoLkVycm9yIHdhcyB0aHJvd24pLiBJdCBkb2VzIG5vdFxuICAvLyBpbnRlcmFjdCB3aXRoIF9mYWlsSWZBcmd1bWVudHNBcmVOb3RBbGxDaGVja2VkLlxuICAvLyBYWFggbWF5YmUgYWxzbyBpbXBsZW1lbnQgYSBNYXRjaC5tYXRjaCB3aGljaCByZXR1cm5zIG1vcmUgaW5mb3JtYXRpb24gYWJvdXRcbiAgLy8gICAgIGZhaWx1cmVzIGJ1dCB3aXRob3V0IHVzaW5nIGV4Y2VwdGlvbiBoYW5kbGluZyBvciBkb2luZyB3aGF0IGNoZWNrKClcbiAgLy8gICAgIGRvZXMgd2l0aCBfZmFpbElmQXJndW1lbnRzQXJlTm90QWxsQ2hlY2tlZCBhbmQgTWV0ZW9yLkVycm9yIGNvbnZlcnNpb25cbiAgdGVzdDogZnVuY3Rpb24gKHZhbHVlLCBwYXR0ZXJuKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNoZWNrU3VidHJlZSh2YWx1ZSwgcGF0dGVybik7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoZSBpbnN0YW5jZW9mIE1hdGNoLkVycm9yKVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAvLyBSZXRocm93IG90aGVyIGVycm9ycy5cbiAgICAgIHRocm93IGU7XG4gICAgfVxuICB9LFxuXG4gIC8vIFJ1bnMgYGYuYXBwbHkoY29udGV4dCwgYXJncylgLiBJZiBjaGVjaygpIGlzIG5vdCBjYWxsZWQgb24gZXZlcnkgZWxlbWVudCBvZlxuICAvLyBgYXJnc2AgKGVpdGhlciBkaXJlY3RseSBvciBpbiB0aGUgZmlyc3QgbGV2ZWwgb2YgYW4gYXJyYXkpLCB0aHJvd3MgYW4gZXJyb3JcbiAgLy8gKHVzaW5nIGBkZXNjcmlwdGlvbmAgaW4gdGhlIG1lc3NhZ2UpLlxuICAvL1xuICBfZmFpbElmQXJndW1lbnRzQXJlTm90QWxsQ2hlY2tlZDogZnVuY3Rpb24gKGYsIGNvbnRleHQsIGFyZ3MsIGRlc2NyaXB0aW9uKSB7XG4gICAgdmFyIGFyZ0NoZWNrZXIgPSBuZXcgQXJndW1lbnRDaGVja2VyKGFyZ3MsIGRlc2NyaXB0aW9uKTtcbiAgICB2YXIgcmVzdWx0ID0gY3VycmVudEFyZ3VtZW50Q2hlY2tlci53aXRoVmFsdWUoYXJnQ2hlY2tlciwgZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIGYuYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgfSk7XG4gICAgLy8gSWYgZiBkaWRuJ3QgaXRzZWxmIHRocm93LCBtYWtlIHN1cmUgaXQgY2hlY2tlZCBhbGwgb2YgaXRzIGFyZ3VtZW50cy5cbiAgICBhcmdDaGVja2VyLnRocm93VW5sZXNzQWxsQXJndW1lbnRzSGF2ZUJlZW5DaGVja2VkKCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxufTtcblxuZnVuY3Rpb24gT3B0aW9uYWwocGF0dGVybikge1xuICB0aGlzLnBhdHRlcm4gPSBwYXR0ZXJuO1xufTtcblxuZnVuY3Rpb24gT25lT2YoY2hvaWNlcykge1xuICBpZiAoY2hvaWNlcy5sZW5ndGggPT0gMClcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJNdXN0IHByb3ZpZGUgYXQgbGVhc3Qgb25lIGNob2ljZSB0byBNYXRjaC5PbmVPZlwiKTtcbiAgdGhpcy5jaG9pY2VzID0gY2hvaWNlcztcbn07XG5cbmZ1bmN0aW9uIFdoZXJlKGNvbmRpdGlvbikge1xuICB0aGlzLmNvbmRpdGlvbiA9IGNvbmRpdGlvbjtcbn07XG5cbmZ1bmN0aW9uIE9iamVjdEluY2x1ZGluZyhwYXR0ZXJuKSB7XG4gIHRoaXMucGF0dGVybiA9IHBhdHRlcm47XG59O1xuXG5mdW5jdGlvbiBPYmplY3RIYXNoKHBhdHRlcm4pIHtcbiAgdGhpcy5wYXR0ZXJuID0gcGF0dGVybjtcbn07XG5cbmZ1bmN0aW9uIFN1YmNsYXNzKFN1cGVyY2xhc3MsIG1hdGNoU3VwZXJjbGFzc1Rvbykge1xuICB0aGlzLlN1cGVyY2xhc3MgPSBTdXBlcmNsYXNzO1xuICB0aGlzLm1hdGNoU3VwZXJjbGFzcyA9IG1hdGNoU3VwZXJjbGFzc1Rvbztcbn07XG5cbnZhciB0eXBlb2ZDaGVja3MgPSBbXG4gIFtTdHJpbmcsIFwic3RyaW5nXCJdLFxuICBbTnVtYmVyLCBcIm51bWJlclwiXSxcbiAgW0Jvb2xlYW4sIFwiYm9vbGVhblwiXSxcbiAgLy8gV2hpbGUgd2UgZG9uJ3QgYWxsb3cgdW5kZWZpbmVkIGluIEVKU09OLCB0aGlzIGlzIGdvb2QgZm9yIG9wdGlvbmFsXG4gIC8vIGFyZ3VtZW50cyB3aXRoIE9uZU9mLlxuICBbdW5kZWZpbmVkLCBcInVuZGVmaW5lZFwiXVxuXTtcblxuZnVuY3Rpb24gY2hlY2tTdWJ0cmVlKHZhbHVlLCBwYXR0ZXJuKSB7XG4gIC8vIE1hdGNoIGFueXRoaW5nIVxuICBpZiAocGF0dGVybiA9PT0gTWF0Y2guQW55KVxuICAgIHJldHVybjtcblxuICAvLyBCYXNpYyBhdG9taWMgdHlwZXMuXG4gIC8vIERvIG5vdCBtYXRjaCBib3hlZCBvYmplY3RzIChlLmcuIFN0cmluZywgQm9vbGVhbilcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0eXBlb2ZDaGVja3MubGVuZ3RoOyArK2kpIHtcbiAgICBpZiAocGF0dGVybiA9PT0gdHlwZW9mQ2hlY2tzW2ldWzBdKSB7XG4gICAgICBpZiAodHlwZW9mIHZhbHVlID09PSB0eXBlb2ZDaGVja3NbaV1bMV0pXG4gICAgICAgIHJldHVybjtcbiAgICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIFwiICsgdHlwZW9mQ2hlY2tzW2ldWzFdICsgXCIsIGdvdCBcIiArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZW9mIHZhbHVlKTtcbiAgICB9XG4gIH1cbiAgaWYgKHBhdHRlcm4gPT09IG51bGwpIHtcbiAgICBpZiAodmFsdWUgPT09IG51bGwpXG4gICAgICByZXR1cm47XG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgbnVsbCwgZ290IFwiICsgRUpTT04uc3RyaW5naWZ5KHZhbHVlKSk7XG4gIH1cblxuICAvLyBNYXRjaC5JbnRlZ2VyIGlzIHNwZWNpYWwgdHlwZSBlbmNvZGVkIHdpdGggYXJyYXlcbiAgaWYgKHBhdHRlcm4gPT09IE1hdGNoLkludGVnZXIpIHtcbiAgICAvLyBUaGVyZSBpcyBubyBjb25zaXN0ZW50IGFuZCByZWxpYWJsZSB3YXkgdG8gY2hlY2sgaWYgdmFyaWFibGUgaXMgYSA2NC1iaXRcbiAgICAvLyBpbnRlZ2VyLiBPbmUgb2YgdGhlIHBvcHVsYXIgc29sdXRpb25zIGlzIHRvIGdldCByZW1pbmRlciBvZiBkaXZpc2lvbiBieSAxXG4gICAgLy8gYnV0IHRoaXMgbWV0aG9kIGZhaWxzIG9uIHJlYWxseSBsYXJnZSBmbG9hdHMgd2l0aCBiaWcgcHJlY2lzaW9uLlxuICAgIC8vIEUuZy46IDEuMzQ4MTkyMzA4NDkxODI0ZSsyMyAlIDEgPT09IDAgaW4gVjhcbiAgICAvLyBCaXR3aXNlIG9wZXJhdG9ycyB3b3JrIGNvbnNpc3RhbnRseSBidXQgYWx3YXlzIGNhc3QgdmFyaWFibGUgdG8gMzItYml0XG4gICAgLy8gc2lnbmVkIGludGVnZXIgYWNjb3JkaW5nIHRvIEphdmFTY3JpcHQgc3BlY3MuXG4gICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJudW1iZXJcIiAmJiAodmFsdWUgfCAwKSA9PT0gdmFsdWUpXG4gICAgICByZXR1cm5cbiAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJFeHBlY3RlZCBJbnRlZ2VyLCBnb3QgXCJcbiAgICAgICAgICAgICAgICArICh2YWx1ZSBpbnN0YW5jZW9mIE9iamVjdCA/IEVKU09OLnN0cmluZ2lmeSh2YWx1ZSkgOiB2YWx1ZSkpO1xuICB9XG5cbiAgLy8gXCJPYmplY3RcIiBpcyBzaG9ydGhhbmQgZm9yIE1hdGNoLk9iamVjdEluY2x1ZGluZyh7fSk7XG4gIGlmIChwYXR0ZXJuID09PSBPYmplY3QpXG4gICAgcGF0dGVybiA9IE1hdGNoLk9iamVjdEluY2x1ZGluZyh7fSk7XG5cbiAgLy8gQXJyYXkgKGNoZWNrZWQgQUZURVIgQW55LCB3aGljaCBpcyBpbXBsZW1lbnRlZCBhcyBhbiBBcnJheSkuXG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICBpZiAocGF0dGVybi5sZW5ndGggIT09IDEpXG4gICAgICB0aHJvdyBFcnJvcihcIkJhZCBwYXR0ZXJuOiBhcnJheXMgbXVzdCBoYXZlIG9uZSB0eXBlIGVsZW1lbnRcIiArXG4gICAgICAgICAgICAgICAgICBFSlNPTi5zdHJpbmdpZnkocGF0dGVybikpO1xuICAgIGlmICghXy5pc0FycmF5KHZhbHVlKSAmJiAhXy5pc0FyZ3VtZW50cyh2YWx1ZSkpIHtcbiAgICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIGFycmF5LCBnb3QgXCIgKyBFSlNPTi5zdHJpbmdpZnkodmFsdWUpKTtcbiAgICB9XG5cbiAgICBfLmVhY2godmFsdWUsIGZ1bmN0aW9uICh2YWx1ZUVsZW1lbnQsIGluZGV4KSB7XG4gICAgICB0cnkge1xuICAgICAgICBjaGVja1N1YnRyZWUodmFsdWVFbGVtZW50LCBwYXR0ZXJuWzBdKTtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICBpZiAoZXJyIGluc3RhbmNlb2YgTWF0Y2guRXJyb3IpIHtcbiAgICAgICAgICBlcnIucGF0aCA9IF9wcmVwZW5kUGF0aChpbmRleCwgZXJyLnBhdGgpO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IGVycjtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBBcmJpdHJhcnkgdmFsaWRhdGlvbiBjaGVja3MuIFRoZSBjb25kaXRpb24gY2FuIHJldHVybiBmYWxzZSBvciB0aHJvdyBhXG4gIC8vIE1hdGNoLkVycm9yIChpZSwgaXQgY2FuIGludGVybmFsbHkgdXNlIGNoZWNrKCkpIHRvIGZhaWwuXG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgV2hlcmUpIHtcbiAgICBpZiAocGF0dGVybi5jb25kaXRpb24odmFsdWUpKVxuICAgICAgcmV0dXJuO1xuICAgIC8vIFhYWCB0aGlzIGVycm9yIGlzIHRlcnJpYmxlXG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRmFpbGVkIE1hdGNoLldoZXJlIHZhbGlkYXRpb25cIik7XG4gIH1cblxuXG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgT3B0aW9uYWwpXG4gICAgcGF0dGVybiA9IE1hdGNoLk9uZU9mKHVuZGVmaW5lZCwgcGF0dGVybi5wYXR0ZXJuKTtcblxuICBpZiAocGF0dGVybiBpbnN0YW5jZW9mIE9uZU9mKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXR0ZXJuLmNob2ljZXMubGVuZ3RoOyArK2kpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNoZWNrU3VidHJlZSh2YWx1ZSwgcGF0dGVybi5jaG9pY2VzW2ldKTtcbiAgICAgICAgLy8gTm8gZXJyb3I/IFlheSwgcmV0dXJuLlxuICAgICAgICByZXR1cm47XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgLy8gT3RoZXIgZXJyb3JzIHNob3VsZCBiZSB0aHJvd24uIE1hdGNoIGVycm9ycyBqdXN0IG1lYW4gdHJ5IGFub3RoZXJcbiAgICAgICAgLy8gY2hvaWNlLlxuICAgICAgICBpZiAoIShlcnIgaW5zdGFuY2VvZiBNYXRjaC5FcnJvcikpXG4gICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBYWFggdGhpcyBlcnJvciBpcyB0ZXJyaWJsZVxuICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkZhaWxlZCBNYXRjaC5PbmVPZiBvciBNYXRjaC5PcHRpb25hbCB2YWxpZGF0aW9uXCIpO1xuICB9XG5cbiAgLy8gQSBmdW5jdGlvbiB0aGF0IGlzbid0IHNvbWV0aGluZyB3ZSBzcGVjaWFsLWNhc2UgaXMgYXNzdW1lZCB0byBiZSBhXG4gIC8vIGNvbnN0cnVjdG9yLlxuICBpZiAocGF0dGVybiBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgcGF0dGVybilcbiAgICAgIHJldHVybjtcbiAgICAvLyBYWFggd2hhdCBpZiAubmFtZSBpc24ndCBkZWZpbmVkXG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgXCIgKyBwYXR0ZXJuLmNvbnN0cnVjdG9yLm5hbWUpO1xuICB9XG5cbiAgdmFyIHVua25vd25LZXlzQWxsb3dlZCA9IGZhbHNlO1xuICBpZiAocGF0dGVybiBpbnN0YW5jZW9mIE9iamVjdEluY2x1ZGluZykge1xuICAgIHVua25vd25LZXlzQWxsb3dlZCA9IHRydWU7XG4gICAgcGF0dGVybiA9IHBhdHRlcm4ucGF0dGVybjtcbiAgfVxuXG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgT2JqZWN0SGFzaCkge1xuICAgIHZhciBrZXlQYXR0ZXJuID0gcGF0dGVybi5wYXR0ZXJuO1xuICAgIHZhciBlbXB0eUhhc2ggPSB0cnVlO1xuICAgIGZvciAodmFyIGtleSBpbiB2YWx1ZSkge1xuICAgICAgZW1wdHlIYXNoID0gZmFsc2U7XG4gICAgICBjaGVjayh2YWx1ZVtrZXldLCBrZXlQYXR0ZXJuKTtcbiAgICB9XG4gICAgaWYgKGVtcHR5SGFzaClcbiAgICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIFwiICsgcGF0dGVybi5jb25zdHJ1Y3Rvci5uYW1lKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAocGF0dGVybiBpbnN0YW5jZW9mIFN1YmNsYXNzKSB7XG4gICAgdmFyIFN1cGVyY2xhc3MgPSBwYXR0ZXJuLlN1cGVyY2xhc3M7XG4gICAgaWYgKHBhdHRlcm4ubWF0Y2hTdXBlcmNsYXNzICYmIHZhbHVlID09IFN1cGVyY2xhc3MpXG4gICAgICByZXR1cm47XG4gICAgaWYgKCEgKHZhbHVlLnByb3RvdHlwZSBpbnN0YW5jZW9mIFN1cGVyY2xhc3MpKVxuICAgICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgXCIgKyBwYXR0ZXJuLmNvbnN0cnVjdG9yLm5hbWUgKyBcIiBvZiBcIiArIFN1cGVyY2xhc3MubmFtZSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBwYXR0ZXJuICE9PSBcIm9iamVjdFwiKVxuICAgIHRocm93IEVycm9yKFwiQmFkIHBhdHRlcm46IHVua25vd24gcGF0dGVybiB0eXBlXCIpO1xuXG4gIC8vIEFuIG9iamVjdCwgd2l0aCByZXF1aXJlZCBhbmQgb3B0aW9uYWwga2V5cy4gTm90ZSB0aGF0IHRoaXMgZG9lcyBOT1QgZG9cbiAgLy8gc3RydWN0dXJhbCBtYXRjaGVzIGFnYWluc3Qgb2JqZWN0cyBvZiBzcGVjaWFsIHR5cGVzIHRoYXQgaGFwcGVuIHRvIG1hdGNoXG4gIC8vIHRoZSBwYXR0ZXJuOiB0aGlzIHJlYWxseSBuZWVkcyB0byBiZSBhIHBsYWluIG9sZCB7T2JqZWN0fSFcbiAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ29iamVjdCcpXG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgb2JqZWN0LCBnb3QgXCIgKyB0eXBlb2YgdmFsdWUpO1xuICBpZiAodmFsdWUgPT09IG51bGwpXG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgb2JqZWN0LCBnb3QgbnVsbFwiKTtcbiAgaWYgKHZhbHVlLmNvbnN0cnVjdG9yICE9PSBPYmplY3QpXG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgcGxhaW4gb2JqZWN0XCIpO1xuXG4gIHZhciByZXF1aXJlZFBhdHRlcm5zID0ge307XG4gIHZhciBvcHRpb25hbFBhdHRlcm5zID0ge307XG4gIF8uZWFjaChwYXR0ZXJuLCBmdW5jdGlvbiAoc3ViUGF0dGVybiwga2V5KSB7XG4gICAgaWYgKHN1YlBhdHRlcm4gaW5zdGFuY2VvZiBPcHRpb25hbClcbiAgICAgIG9wdGlvbmFsUGF0dGVybnNba2V5XSA9IHN1YlBhdHRlcm4ucGF0dGVybjtcbiAgICBlbHNlXG4gICAgICByZXF1aXJlZFBhdHRlcm5zW2tleV0gPSBzdWJQYXR0ZXJuO1xuICB9KTtcblxuICBfLmVhY2godmFsdWUsIGZ1bmN0aW9uIChzdWJWYWx1ZSwga2V5KSB7XG4gICAgdHJ5IHtcbiAgICAgIGlmIChfLmhhcyhyZXF1aXJlZFBhdHRlcm5zLCBrZXkpKSB7XG4gICAgICAgIGNoZWNrU3VidHJlZShzdWJWYWx1ZSwgcmVxdWlyZWRQYXR0ZXJuc1trZXldKTtcbiAgICAgICAgZGVsZXRlIHJlcXVpcmVkUGF0dGVybnNba2V5XTtcbiAgICAgIH0gZWxzZSBpZiAoXy5oYXMob3B0aW9uYWxQYXR0ZXJucywga2V5KSkge1xuICAgICAgICBjaGVja1N1YnRyZWUoc3ViVmFsdWUsIG9wdGlvbmFsUGF0dGVybnNba2V5XSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoIXVua25vd25LZXlzQWxsb3dlZClcbiAgICAgICAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJVbmtub3duIGtleVwiKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGlmIChlcnIgaW5zdGFuY2VvZiBNYXRjaC5FcnJvcilcbiAgICAgICAgZXJyLnBhdGggPSBfcHJlcGVuZFBhdGgoa2V5LCBlcnIucGF0aCk7XG4gICAgICB0aHJvdyBlcnI7XG4gICAgfVxuICB9KTtcblxuICBfLmVhY2gocmVxdWlyZWRQYXR0ZXJucywgZnVuY3Rpb24gKHN1YlBhdHRlcm4sIGtleSkge1xuICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIk1pc3Npbmcga2V5ICdcIiArIGtleSArIFwiJ1wiKTtcbiAgfSk7XG59O1xuXG5mdW5jdGlvbiBBcmd1bWVudENoZWNrZXIoYXJncywgZGVzY3JpcHRpb24pIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICAvLyBNYWtlIGEgU0hBTExPVyBjb3B5IG9mIHRoZSBhcmd1bWVudHMuIChXZSdsbCBiZSBkb2luZyBpZGVudGl0eSBjaGVja3NcbiAgLy8gYWdhaW5zdCBpdHMgY29udGVudHMuKVxuICBzZWxmLmFyZ3MgPSBfLmNsb25lKGFyZ3MpO1xuICAvLyBTaW5jZSB0aGUgY29tbW9uIGNhc2Ugd2lsbCBiZSB0byBjaGVjayBhcmd1bWVudHMgaW4gb3JkZXIsIGFuZCB3ZSBzcGxpY2VcbiAgLy8gb3V0IGFyZ3VtZW50cyB3aGVuIHdlIGNoZWNrIHRoZW0sIG1ha2UgaXQgc28gd2Ugc3BsaWNlIG91dCBmcm9tIHRoZSBlbmRcbiAgLy8gcmF0aGVyIHRoYW4gdGhlIGJlZ2lubmluZy5cbiAgc2VsZi5hcmdzLnJldmVyc2UoKTtcbiAgc2VsZi5kZXNjcmlwdGlvbiA9IGRlc2NyaXB0aW9uO1xufTtcblxuXy5leHRlbmRQcm90byhBcmd1bWVudENoZWNrZXIsIHtcbiAgY2hlY2tpbmc6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoc2VsZi5fY2hlY2tpbmdPbmVWYWx1ZSh2YWx1ZSkpXG4gICAgICByZXR1cm47XG4gICAgLy8gQWxsb3cgY2hlY2soYXJndW1lbnRzLCBbU3RyaW5nXSkgb3IgY2hlY2soYXJndW1lbnRzLnNsaWNlKDEpLCBbU3RyaW5nXSlcbiAgICAvLyBvciBjaGVjayhbZm9vLCBiYXJdLCBbU3RyaW5nXSkgdG8gY291bnQuLi4gYnV0IG9ubHkgaWYgdmFsdWUgd2Fzbid0XG4gICAgLy8gaXRzZWxmIGFuIGFyZ3VtZW50LlxuICAgIGlmIChfLmlzQXJyYXkodmFsdWUpIHx8IF8uaXNBcmd1bWVudHModmFsdWUpKSB7XG4gICAgICBfLmVhY2godmFsdWUsIF8uYmluZChzZWxmLl9jaGVja2luZ09uZVZhbHVlLCBzZWxmKSk7XG4gICAgfVxuICB9LFxuICBfY2hlY2tpbmdPbmVWYWx1ZTogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZi5hcmdzLmxlbmd0aDsgKytpKSB7XG4gICAgICAvLyBJcyB0aGlzIHZhbHVlIG9uZSBvZiB0aGUgYXJndW1lbnRzPyAoVGhpcyBjYW4gaGF2ZSBhIGZhbHNlIHBvc2l0aXZlIGlmXG4gICAgICAvLyB0aGUgYXJndW1lbnQgaXMgYW4gaW50ZXJuZWQgcHJpbWl0aXZlLCBidXQgaXQncyBzdGlsbCBhIGdvb2QgZW5vdWdoXG4gICAgICAvLyBjaGVjay4pXG4gICAgICBpZiAodmFsdWUgPT09IHNlbGYuYXJnc1tpXSkge1xuICAgICAgICBzZWxmLmFyZ3Muc3BsaWNlKGksIDEpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9LFxuICB0aHJvd1VubGVzc0FsbEFyZ3VtZW50c0hhdmVCZWVuQ2hlY2tlZDogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoIV8uaXNFbXB0eShzZWxmLmFyZ3MpKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRGlkIG5vdCBjaGVjaygpIGFsbCBhcmd1bWVudHMgZHVyaW5nIFwiICtcbiAgICAgICAgICAgICAgICAgICAgICBzZWxmLmRlc2NyaXB0aW9uKTtcbiAgfVxufSk7XG5cbnZhciBfanNLZXl3b3JkcyA9IFtcImRvXCIsIFwiaWZcIiwgXCJpblwiLCBcImZvclwiLCBcImxldFwiLCBcIm5ld1wiLCBcInRyeVwiLCBcInZhclwiLCBcImNhc2VcIixcbiAgXCJlbHNlXCIsIFwiZW51bVwiLCBcImV2YWxcIiwgXCJmYWxzZVwiLCBcIm51bGxcIiwgXCJ0aGlzXCIsIFwidHJ1ZVwiLCBcInZvaWRcIiwgXCJ3aXRoXCIsXG4gIFwiYnJlYWtcIiwgXCJjYXRjaFwiLCBcImNsYXNzXCIsIFwiY29uc3RcIiwgXCJzdXBlclwiLCBcInRocm93XCIsIFwid2hpbGVcIiwgXCJ5aWVsZFwiLFxuICBcImRlbGV0ZVwiLCBcImV4cG9ydFwiLCBcImltcG9ydFwiLCBcInB1YmxpY1wiLCBcInJldHVyblwiLCBcInN0YXRpY1wiLCBcInN3aXRjaFwiLFxuICBcInR5cGVvZlwiLCBcImRlZmF1bHRcIiwgXCJleHRlbmRzXCIsIFwiZmluYWxseVwiLCBcInBhY2thZ2VcIiwgXCJwcml2YXRlXCIsIFwiY29udGludWVcIixcbiAgXCJkZWJ1Z2dlclwiLCBcImZ1bmN0aW9uXCIsIFwiYXJndW1lbnRzXCIsIFwiaW50ZXJmYWNlXCIsIFwicHJvdGVjdGVkXCIsIFwiaW1wbGVtZW50c1wiLFxuICBcImluc3RhbmNlb2ZcIl07XG5cbi8vIEFzc3VtZXMgdGhlIGJhc2Ugb2YgcGF0aCBpcyBhbHJlYWR5IGVzY2FwZWQgcHJvcGVybHlcbi8vIHJldHVybnMga2V5ICsgYmFzZVxuZnVuY3Rpb24gX3ByZXBlbmRQYXRoKGtleSwgYmFzZSkge1xuICBpZiAoKHR5cGVvZiBrZXkpID09PSBcIm51bWJlclwiIHx8IGtleS5tYXRjaCgvXlswLTldKyQvKSlcbiAgICBrZXkgPSBcIltcIiArIGtleSArIFwiXVwiO1xuICBlbHNlIGlmICgha2V5Lm1hdGNoKC9eW2Etel8kXVswLTlhLXpfJF0qJC9pKSB8fCBfLmNvbnRhaW5zKF9qc0tleXdvcmRzLCBrZXkpKVxuICAgIGtleSA9IEpTT04uc3RyaW5naWZ5KFtrZXldKTtcblxuICBpZiAoYmFzZSAmJiBiYXNlWzBdICE9PSBcIltcIilcbiAgICByZXR1cm4ga2V5ICsgJy4nICsgYmFzZTtcbiAgcmV0dXJuIGtleSArIGJhc2U7XG59O1xuXG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBGYWNldGVkT2JqZWN0ID0gcmVxdWlyZSgnLi4vZmFjZXRzL2Zfb2JqZWN0Jylcblx0LCBfID0gcmVxdWlyZSgncHJvdG8nKTtcblxudmFyIENvbXBvbmVudCA9IG1vZHVsZS5leHBvcnRzID0gXy5jcmVhdGVTdWJjbGFzcyhGYWNldGVkT2JqZWN0LCAnQ29tcG9uZW50JywgdHJ1ZSlcblxuQ29tcG9uZW50LmNyZWF0ZUNvbXBvbmVudENsYXNzID0gRmFjZXRlZE9iamVjdC5jcmVhdGVGYWNldGVkQ2xhc3M7XG5kZWxldGUgQ29tcG9uZW50LmNyZWF0ZUZhY2V0ZWRDbGFzcztcblxuXy5leHRlbmRQcm90byhDb21wb25lbnQsIHtcblx0aW5pdDogaW5pdENvbXBvbmVudFxufSk7XG5cblxuZnVuY3Rpb24gaW5pdENvbXBvbmVudChmYWNldHNPcHRpb25zLCBlbGVtZW50KSB7XG5cdHRoaXMuZWwgPSBlbGVtZW50O1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ2xhc3NSZWdpc3RyeSA9IHJlcXVpcmUoJy4uL3JlZ2lzdHJ5Jylcblx0LCBDb21wb25lbnQgPSByZXF1aXJlKCcuL2NfY2xhc3MnKTtcblxudmFyIGNvbXBvbmVudHNSZWdpc3RyeSA9IG5ldyBDbGFzc1JlZ2lzdHJ5KENvbXBvbmVudCk7XG5cbmNvbXBvbmVudHNSZWdpc3RyeS5hZGQoQ29tcG9uZW50KTtcblxubW9kdWxlLmV4cG9ydHMgPSBjb21wb25lbnRzUmVnaXN0cnk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgncHJvdG8nKTtcblxubW9kdWxlLmV4cG9ydHMgPSBGYWNldDtcblxuZnVuY3Rpb24gRmFjZXQob3duZXIsIG9wdGlvbnMpIHtcblx0dGhpcy5vd25lciA9IG93bmVyO1xuXHR0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuXHR0aGlzLmluaXQoKTtcbn1cblxuXy5leHRlbmRQcm90byhGYWNldCwge1xuXHRpbml0OiBGdW5jdGlvbigpXG59KTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIEZhY2V0ID0gcmVxdWlyZSgnLi9mX2NsYXNzJylcblx0LCBfID0gcmVxdWlyZSgncHJvdG8nKVxuXHQsIGNoZWNrID0gcmVxdWlyZSgnLi4vY2hlY2snKVxuXHQsIE1hdGNoID0gY2hlY2suTWF0Y2g7XG5cbm1vZHVsZS5leHBvcnRzID0gRmFjZXRlZE9iamVjdDtcblxuLy8gYWJzdHJhY3QgY2xhc3MgZm9yIGZhY2V0ZWQgb2JqZWN0XG5mdW5jdGlvbiBGYWNldGVkT2JqZWN0KGZhY2V0c09wdGlvbnMgLyosIG90aGVyIGFyZ3MgLSBwYXNzZWQgdG8gaW5pdCBtZXRob2QgKi8pIHtcblx0Ly8gVE9ETyBpbnN0YW50aWF0ZSBmYWNldHMgaWYgY29uZmlndXJhdGlvbiBpc24ndCBwYXNzZWRcblx0Ly8gd3JpdGUgYSB0ZXN0IHRvIGNoZWNrIGl0XG5cdGZhY2V0c09wdGlvbnMgPSBmYWNldHNPcHRpb25zID8gXy5jbG9uZShmYWNldHNPcHRpb25zKSA6IHt9O1xuXG5cdHZhciB0aGlzQ2xhc3MgPSB0aGlzLmNvbnN0cnVjdG9yXG5cdFx0LCBmYWNldHMgPSB7fTtcblxuXHRpZiAodGhpcy5jb25zdHJ1Y3RvciA9PSBGYWNldGVkT2JqZWN0KVx0XHRcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ0ZhY2V0ZWRPYmplY3QgaXMgYW4gYWJzdHJhY3QgY2xhc3MsIGNhblxcJ3QgYmUgaW5zdGFudGlhdGVkJyk7XG5cdGlmICghIHRoaXNDbGFzcy5wcm90b3R5cGUuZmFjZXRzKVxuXHRcdHRocm93IG5ldyBFcnJvcignTm8gZmFjZXRzIGRlZmluZWQgaW4gY2xhc3MgJyArIHRoaXMuY29uc3RydWN0b3IubmFtZSk7XG5cdFxuXHRfLmVhY2hLZXkoZmFjZXRzT3B0aW9ucywgaW5zdGFudGlhdGVGYWNldCwgdGhpcywgdHJ1ZSk7XG5cblx0Ly8gXy5lYWNoS2V5KHRoaXMuZmFjZXRzLCBpbnN0YW50aWF0ZUZhY2V0LCB0aGlzLCB0cnVlKTtcblxuXHR2YXIgdW51c2VkRmFjZXRzTmFtZXMgPSBPYmplY3Qua2V5cyhmYWNldHNPcHRpb25zKTtcblx0aWYgKHVudXNlZEZhY2V0c05hbWVzLmxlbmd0aClcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ0NvbmZpZ3VyYXRpb24gZm9yIHVua25vd24gZmFjZXQocykgcGFzc2VkOiAnICsgdW51c2VkRmFjZXRzTmFtZXMuam9pbignLCAnKSk7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnRpZXModGhpcywgZmFjZXRzKTtcblxuXHQvLyBjYWxsaW5nIGluaXQgaWYgaXQgaXMgZGVmaW5lZCBpbiB0aGUgY2xhc3Ncblx0aWYgKHRoaXMuaW5pdClcblx0XHR0aGlzLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuXHRmdW5jdGlvbiBpbnN0YW50aWF0ZUZhY2V0KGZhY2V0T3B0cyAvKiBmYWNldENsYXNzICovLCBmY3QpIHtcblx0XHR2YXIgZmFjZXRDbGFzcyA9IHRoaXMuZmFjZXRzW2ZjdF07XG5cdFx0Ly8gdmFyIGZhY2V0T3B0cyA9IGZhY2V0c09wdGlvbnNbZmN0XTtcblx0XHRkZWxldGUgZmFjZXRzT3B0aW9uc1tmY3RdO1xuXG5cdFx0ZmFjZXRzW2ZjdF0gPSB7XG5cdFx0XHRlbnVtZXJhYmxlOiBmYWxzZSxcblx0XHRcdHZhbHVlOiBuZXcgZmFjZXRDbGFzcyh0aGlzLCBmYWNldE9wdHMpXG5cdFx0fTtcblx0fVxufVxuXG5cbi8vIGZhY3RvcnkgdGhhdCBjcmVhdGVzIGNsYXNzZXMgKGNvbnN0cnVjdG9ycykgZnJvbSB0aGUgbWFwIG9mIGZhY2V0c1xuLy8gdGhlc2UgY2xhc3NlcyBpbmhlcml0IGZyb20gRmFjZXRlZE9iamVjdFxuRmFjZXRlZE9iamVjdC5jcmVhdGVGYWNldGVkQ2xhc3MgPSBmdW5jdGlvbiAobmFtZSwgZmFjZXRzQ2xhc3Nlcykge1xuXHRjaGVjayhuYW1lLCBTdHJpbmcpO1xuXHRjaGVjayhmYWNldHNDbGFzc2VzLCBNYXRjaC5PYmplY3RIYXNoKEZ1bmN0aW9uIC8qIE1hdGNoLlN1YmNsYXNzKEZhY2V0LCB0cnVlKSBUT0RPIC0gZml4ICovKSk7XG5cblx0dmFyIEZhY2V0ZWRDbGFzcyA9IF8uY3JlYXRlU3ViY2xhc3ModGhpcywgbmFtZSwgdHJ1ZSk7XG5cblx0Xy5leHRlbmRQcm90byhGYWNldGVkQ2xhc3MsIHtcblx0XHRmYWNldHM6IGZhY2V0c0NsYXNzZXNcblx0fSk7XG5cdHJldHVybiBGYWNldGVkQ2xhc3M7XG59O1xuXG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBtaWxvID0ge1xuXHRiaW5kOiByZXF1aXJlKCcuL2JpbmRlci9iaW5kJylcbn1cblxuaWYgKHR5cGVvZiBtb2R1bGUgPT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpXG5cdC8vIGV4cG9ydCBmb3Igbm9kZS9icm93c2VyaWZ5XG5cdG1vZHVsZS5leHBvcnRzID0gbWlsbztcblxuaWYgKHR5cGVvZiB3aW5kb3cgPT0gJ29iamVjdCcpXG5cdHdpbmRvdy5taWxvID0gbWlsbztcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCdwcm90bycpXG5cdCwgY2hlY2sgPSByZXF1aXJlKCcuL2NoZWNrJylcblx0LCBNYXRjaCA9IGNoZWNrLk1hdGNoO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENsYXNzUmVnaXN0cnk7XG5cbmZ1bmN0aW9uIENsYXNzUmVnaXN0cnkgKEZvdW5kYXRpb25DbGFzcykge1xuXHRpZiAoRm91bmRhdGlvbkNsYXNzKVxuXHRcdHRoaXMuc2V0Q2xhc3MoRm91bmRhdGlvbkNsYXNzKTtcblxuXHQvLyBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ19fcmVnaXN0ZXJlZENsYXNzZXMnLCB7XG5cdC8vIFx0XHRlbnVtZXJhYmxlOiBmYWxzZSxcblx0Ly8gXHRcdHdyaXRhYmxlOiB0cnVlLFxuXHQvLyBcdFx0Y29uZmlndXJhYmxlOiB0cnVlLFxuXHQvLyBcdFx0dmFsdWU6IHt9XG5cdC8vIH0pO1xuXG5cdHRoaXMuX19yZWdpc3RlcmVkQ2xhc3NlcyA9IHt9O1xufVxuXG5fLmV4dGVuZFByb3RvKENsYXNzUmVnaXN0cnksIHtcblx0YWRkOiByZWdpc3RlckNsYXNzLFxuXHRnZXQ6IGdldENsYXNzLFxuXHRyZW1vdmU6IHVucmVnaXN0ZXJDbGFzcyxcblx0Y2xlYW46IHVucmVnaXN0ZXJBbGxDbGFzc2VzLFxuXHRzZXRDbGFzczogc2V0Rm91bmRhdGlvbkNsYXNzXG59KTtcblxuXG5mdW5jdGlvbiBzZXRGb3VuZGF0aW9uQ2xhc3MoRm91bmRhdGlvbkNsYXNzKSB7XG5cdGNoZWNrKEZvdW5kYXRpb25DbGFzcywgRnVuY3Rpb24pO1xuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ0ZvdW5kYXRpb25DbGFzcycsIHtcblx0XHRlbnVtZXJhYmxlOiB0cnVlLFxuXHRcdHZhbHVlOiBGb3VuZGF0aW9uQ2xhc3Ncblx0fSk7XG59XG5cbmZ1bmN0aW9uIHJlZ2lzdGVyQ2xhc3MoYUNsYXNzLCBuYW1lKSB7XG5cdG5hbWUgPSBuYW1lIHx8IGFDbGFzcy5uYW1lO1xuXG5cdGNoZWNrKG5hbWUsIFN0cmluZywgJ2NsYXNzIG5hbWUgbXVzdCBiZSBzdHJpbmcnKTtcblx0Y2hlY2sobmFtZSwgTWF0Y2guV2hlcmUoZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHR5cGVvZiBuYW1lID09ICdzdHJpbmcnICYmIG5hbWUgIT0gJyc7XG5cdH0pLCAnY2xhc3MgbmFtZSBtdXN0IGJlIHN0cmluZycpO1xuXHRpZiAodGhpcy5Gb3VuZGF0aW9uQ2xhc3MpIHtcblx0XHRpZiAoYUNsYXNzICE9IHRoaXMuRm91bmRhdGlvbkNsYXNzKVxuXHRcdFx0Y2hlY2soYUNsYXNzLCBNYXRjaC5TdWJjbGFzcyh0aGlzLkZvdW5kYXRpb25DbGFzcyksICdjbGFzcyBtdXN0IGJlIGEgc3ViKGNsYXNzKSBvZiBhIGZvdW5kYXRpb24gY2xhc3MnKTtcblx0fSBlbHNlXG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignZm91bmRhdGlvbiBjbGFzcyBtdXN0IGJlIHNldCBiZWZvcmUgYWRkaW5nIGNsYXNzZXMgdG8gcmVnaXN0cnknKTtcblxuXHRpZiAodGhpcy5fX3JlZ2lzdGVyZWRDbGFzc2VzW25hbWVdKVxuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ2lzIGFscmVhZHkgcmVnaXN0ZXJlZCcpO1xuXG5cdHRoaXMuX19yZWdpc3RlcmVkQ2xhc3Nlc1tuYW1lXSA9IGFDbGFzcztcbn07XG5cblxuZnVuY3Rpb24gZ2V0Q2xhc3MobmFtZSkge1xuXHRjaGVjayhuYW1lLCBTdHJpbmcsICdjbGFzcyBuYW1lIG11c3QgYmUgc3RyaW5nJyk7XG5cdHJldHVybiB0aGlzLl9fcmVnaXN0ZXJlZENsYXNzZXNbbmFtZV07XG59O1xuXG5cbmZ1bmN0aW9uIHVucmVnaXN0ZXJDbGFzcyhuYW1lT3JDbGFzcykge1xuXHRjaGVjayhuYW1lT3JDbGFzcywgTWF0Y2guT25lT2YoU3RyaW5nLCBGdW5jdGlvbiksICdjbGFzcyBvciBuYW1lIG11c3QgYmUgc3VwcGxpZWQnKTtcblxuXHR2YXIgbmFtZSA9IHR5cGVvZiBuYW1lT3JDbGFzcyA9PSAnc3RyaW5nJ1xuXHRcdFx0XHRcdFx0PyBuYW1lT3JDbGFzc1xuXHRcdFx0XHRcdFx0OiBuYW1lT3JDbGFzcy5uYW1lO1xuXHRcdFx0XHRcdFx0XG5cdGlmICghIHRoaXMuX19yZWdpc3RlcmVkQ2xhc3Nlc1tuYW1lXSlcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdjbGFzcyBpcyBub3QgcmVnaXN0ZXJlZCcpO1xuXG5cdGRlbGV0ZSB0aGlzLl9fcmVnaXN0ZXJlZENsYXNzZXNbbmFtZV07XG59O1xuXG5cbmZ1bmN0aW9uIHVucmVnaXN0ZXJBbGxDbGFzc2VzKCkge1xuXHR0aGlzLl9fcmVnaXN0ZXJlZENsYXNzZXMgPSB7fTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfO1xudmFyIHByb3RvID0gXyA9IHtcblx0ZXh0ZW5kUHJvdG86IGV4dGVuZFByb3RvLFxuXHRleHRlbmQ6IGV4dGVuZCxcblx0Y2xvbmU6IGNsb25lLFxuXHRjcmVhdGVTdWJjbGFzczogY3JlYXRlU3ViY2xhc3MsXG5cdGFsbEtleXM6IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzLmJpbmQoT2JqZWN0KSxcblx0a2V5T2Y6IGtleU9mLFxuXHRhbGxLZXlzT2Y6IGFsbEtleXNPZixcblx0ZWFjaEtleTogZWFjaEtleSxcblx0bWFwS2V5czogbWFwS2V5c1xufTtcblxuXG5pZiAodHlwZW9mIHdpbmRvdyA9PSAnb2JqZWN0Jykge1xuXHQvLyBwcmVzZXJ2ZSBleGlzdGluZyBfIG9iamVjdFxuXHRpZiAod2luZG93Ll8pXG5cdFx0cHJvdG8udW5kZXJzY29yZSA9IHdpbmRvdy5fXG5cblx0Ly8gZXhwb3NlIGdsb2JhbCBfXG5cdHdpbmRvdy5fID0gcHJvdG87XG59XG5cbmlmICh0eXBlb2YgbW9kdWxlID09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKVxuXHQvLyBleHBvcnQgZm9yIG5vZGUvYnJvd3NlcmlmeVxuXHRtb2R1bGUuZXhwb3J0cyA9IHByb3RvO1xuXHRcblxuZnVuY3Rpb24gZXh0ZW5kUHJvdG8oc2VsZiwgbWV0aG9kcykge1xuXHR2YXIgcHJvcERlc2NyaXB0b3JzID0ge307XG5cblx0Xy5lYWNoS2V5KG1ldGhvZHMsIGZ1bmN0aW9uKG1ldGhvZCwgbmFtZSkge1xuXHRcdHByb3BEZXNjcmlwdG9yc1tuYW1lXSA9IHtcblx0XHRcdGVudW1lcmFibGU6IGZhbHNlLFxuXHRcdFx0Y29uZmlndXJhYmxlOiBmYWxzZSxcblx0XHRcdHdyaXRhYmxlOiBmYWxzZSxcblx0XHRcdHZhbHVlOiBtZXRob2Rcblx0XHR9O1xuXHR9KTtcblxuXHRPYmplY3QuZGVmaW5lUHJvcGVydGllcyhzZWxmLnByb3RvdHlwZSwgcHJvcERlc2NyaXB0b3JzKTtcblx0cmV0dXJuIHNlbGY7XG59XG5cbmZ1bmN0aW9uIGV4dGVuZChzZWxmLCBvYmosIG9ubHlFbnVtZXJhYmxlKSB7XG5cdHZhciBwcm9wRGVzY3JpcHRvcnMgPSB7fTtcblxuXHRfLmVhY2hLZXkob2JqLCBmdW5jdGlvbih2YWx1ZSwgcHJvcCkge1xuXHRcdHZhciBkZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmosIHByb3ApO1xuXHRcdHByb3BEZXNjcmlwdG9yc1twcm9wXSA9IGRlc2NyaXB0b3I7XG5cdH0sIHRoaXMsIG9ubHlFbnVtZXJhYmxlKTtcblxuXHRPYmplY3QuZGVmaW5lUHJvcGVydGllcyhzZWxmLCBwcm9wRGVzY3JpcHRvcnMpO1xuXG5cdHJldHVybiBzZWxmO1xufVxuXG5mdW5jdGlvbiBjbG9uZShvYmopIHtcblx0dmFyIGNsb25lZE9iamVjdCA9IE9iamVjdC5jcmVhdGUob2JqLmNvbnN0cnVjdG9yLnByb3RvdHlwZSk7XG5cblx0Xy5leHRlbmQoY2xvbmVkT2JqZWN0LCBvYmopO1xuXG5cdHJldHVybiBjbG9uZWRPYmplY3Q7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVN1YmNsYXNzKHRoaXNDbGFzcywgbmFtZSwgYXBwbHlDb25zdHJ1Y3Rvcikge1xuXHR2YXIgc3ViY2xhc3M7XG5cblx0Ly8gbmFtZSBpcyBvcHRpb25hbFxuXHRuYW1lID0gbmFtZSB8fCAnJztcblxuXHQvLyBhcHBseSBzdXBlcmNsYXNzIGNvbnN0cnVjdG9yXG5cdHZhciBjb25zdHJ1Y3RvckNvZGUgPSBhcHBseUNvbnN0cnVjdG9yID09PSBmYWxzZVxuXHRcdFx0PyAnJ1xuXHRcdFx0OiAndGhpc0NsYXNzLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7JztcblxuXHRldmFsKCdzdWJjbGFzcyA9IGZ1bmN0aW9uICcgKyBuYW1lICsgJygpeyAnICsgY29uc3RydWN0b3JDb2RlICsgJyB9Jyk7XG5cblx0Ly8gcHByb3RvdHlwZSBjaGFpblxuXHRzdWJjbGFzcy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHRoaXNDbGFzcy5wcm90b3R5cGUpO1xuXHQvLyBzdWJjbGFzcyBpZGVudGl0eVxuXHRzdWJjbGFzcy5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBzdWJjbGFzcztcblx0Ly8gY29weSBjbGFzcyBtZXRob2RzXG5cdC8vIC0gZm9yIHRoZW0gdG8gd29yayBjb3JyZWN0bHkgdGhleSBzaG91bGQgbm90IGV4cGxpY3RseSB1c2Ugc3VwZXJjbGFzcyBuYW1lXG5cdC8vIGFuZCB1c2UgXCJ0aGlzXCIgaW5zdGVhZFxuXHRfLmV4dGVuZChzdWJjbGFzcywgdGhpc0NsYXNzLCB0cnVlKTtcblxuXHRyZXR1cm4gc3ViY2xhc3M7XG59XG5cblxuZnVuY3Rpb24ga2V5T2Yoc2VsZiwgc2VhcmNoRWxlbWVudCwgb25seUVudW1lcmFibGUpIHtcblx0dmFyIHByb3BlcnRpZXMgPSBvbmx5RW51bWVyYWJsZSBcblx0XHRcdFx0XHRcdD8gT2JqZWN0LmtleXMoc2VsZilcblx0XHRcdFx0XHRcdDogXy5hbGxLZXlzKHNlbGYpO1xuXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgcHJvcGVydGllcy5sZW5ndGg7IGkrKylcblx0XHRpZiAoc2VhcmNoRWxlbWVudCA9PT0gc2VsZltwcm9wZXJ0aWVzW2ldXSlcblx0XHRcdHJldHVybiBwcm9wZXJ0aWVzW2ldO1xuXHRcblx0cmV0dXJuIHVuZGVmaW5lZDtcbn1cblxuXG5mdW5jdGlvbiBhbGxLZXlzT2Yoc2VsZiwgc2VhcmNoRWxlbWVudCwgb25seUVudW1lcmFibGUpIHtcblx0dmFyIHByb3BlcnRpZXMgPSBvbmx5RW51bWVyYWJsZSBcblx0XHRcdFx0XHRcdD8gT2JqZWN0LmtleXMoc2VsZilcblx0XHRcdFx0XHRcdDogXy5hbGxLZXlzKHNlbGYpO1xuXG5cdHZhciBrZXlzID0gcHJvcGVydGllcy5maWx0ZXIoZnVuY3Rpb24ocHJvcCkge1xuXHRcdHJldHVybiBzZWFyY2hFbGVtZW50ID09PSBzZWxmW3Byb3BdO1xuXHR9KTtcblxuXHRyZXR1cm4ga2V5cztcbn1cblxuXG5mdW5jdGlvbiBlYWNoS2V5KHNlbGYsIGNhbGxiYWNrLCB0aGlzQXJnLCBvbmx5RW51bWVyYWJsZSkge1xuXHR2YXIgcHJvcGVydGllcyA9IG9ubHlFbnVtZXJhYmxlIFxuXHRcdFx0XHRcdFx0PyBPYmplY3Qua2V5cyhzZWxmKVxuXHRcdFx0XHRcdFx0OiBfLmFsbEtleXMoc2VsZik7XG5cblx0cHJvcGVydGllcy5mb3JFYWNoKGZ1bmN0aW9uKHByb3ApIHtcblx0XHRjYWxsYmFjay5jYWxsKHRoaXNBcmcsIHNlbGZbcHJvcF0sIHByb3AsIHNlbGYpO1xuXHR9KTtcbn1cblxuXG5mdW5jdGlvbiBtYXBLZXlzKHNlbGYsIGNhbGxiYWNrLCB0aGlzQXJnLCBvbmx5RW51bWVyYWJsZSkge1xuXHR2YXIgbWFwUmVzdWx0ID0ge307XG5cdF8uZWFjaEtleShzZWxmLCBtYXBQcm9wZXJ0eSwgdGhpc0FyZywgb25seUVudW1lcmFibGUpO1xuXHRyZXR1cm4gbWFwUmVzdWx0O1xuXG5cdGZ1bmN0aW9uIG1hcFByb3BlcnR5KHZhbHVlLCBrZXkpIHtcblx0XHR2YXIgZGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Ioc2VsZiwga2V5KTtcblx0XHRpZiAoZGVzY3JpcHRvci5lbnVtZXJhYmxlIHx8ICEgb25seUVudW1lcmFibGUpIHtcblx0XHRcdGRlc2NyaXB0b3IudmFsdWUgPSBjYWxsYmFjay5jYWxsKHRoaXMsIHZhbHVlLCBrZXksIHNlbGYpO1xuXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KG1hcFJlc3VsdCwga2V5LCBkZXNjcmlwdG9yKTtcblx0XHR9XG5cdH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuZGVzY3JpYmUoJ21pbG8gYmluZGVyJywgZnVuY3Rpb24oKSB7XG4gICAgaXQoJ3Nob3VsZCBiaW5kIGNvbXBvbmVudHMgYmFzZWQgb24gbWwtYmluZCBhdHRyaWJ1dGUnLCBmdW5jdGlvbigpIHtcbiAgICBcdHZhciBtaWxvID0gcmVxdWlyZSgnLi4vLi4vbGliL21pbG8nKTtcblxuXHRcdGV4cGVjdCh7cDogMX0pLnByb3BlcnR5KCdwJywgMSk7XG5cbiAgICBcdHZhciBjb21wb25lbnRzID0gbWlsby5iaW5kKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd2aWV3VG9CaW5kJykpO1xuICAgIFx0XG5cdFx0Y29uc29sZS5sb2coY29tcG9uZW50cyk7XG4gICAgfSk7XG59KTtcbiJdfQ==
;