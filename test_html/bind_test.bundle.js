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
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2JpbmRlci9hdHRyaWJ1dGUuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2JpbmRlci9iaW5kLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9iaW5kZXIvZXJyb3IuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NoZWNrLmpzIiwiL1VzZXJzL2V2Z2VueXBvYmVyZXpraW4vV29yay9DQy9taWxvL2xpYi9jb21wb25lbnRzL2NfY2xhc3MuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2NvbXBvbmVudHMvY19yZWdpc3RyeS5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvZmFjZXRzL2ZfY2xhc3MuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbGliL2ZhY2V0cy9mX29iamVjdC5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvbWlsby5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby9saWIvcmVnaXN0cnkuanMiLCIvVXNlcnMvZXZnZW55cG9iZXJlemtpbi9Xb3JrL0NDL21pbG8vbm9kZV9tb2R1bGVzL3Byb3RvL2xpYi9wcm90by5qcyIsIi9Vc2Vycy9ldmdlbnlwb2JlcmV6a2luL1dvcmsvQ0MvbWlsby90ZXN0X2h0bWwvYmluZF90ZXN0L2JpbmRfdGVzdC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9JQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ3Byb3RvJylcblx0LCBjaGVjayA9IHJlcXVpcmUoJy4uL2NoZWNrJylcblx0LCBNYXRjaCA9IGNoZWNrLk1hdGNoXG5cdCwgQmluZEVycm9yID0gcmVxdWlyZSgnLi9lcnJvcicpO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gQXR0cmlidXRlO1xuXG5mdW5jdGlvbiBBdHRyaWJ1dGUoZWwsIG5hbWUpIHtcblx0dGhpcy5uYW1lID0gbmFtZTtcblx0dGhpcy5lbCA9IGVsO1xuXHR0aGlzLm5vZGUgPSBlbC5hdHRyaWJ1dGVzW25hbWVdO1xufVxuXG5fLmV4dGVuZFByb3RvKEF0dHJpYnV0ZSwge1xuXHRnZXQ6IGdldEF0dHJpYnV0ZVZhbHVlLFxuXHRzZXQ6IHNldEF0dHJpYnV0ZVZhbHVlLFxuXHRwYXJzZTogcGFyc2VBdHRyaWJ1dGUsXG5cdHZhbGlkYXRlOiB2YWxpZGF0ZUF0dHJpYnV0ZVxufSk7XG5cblxuZnVuY3Rpb24gZ2V0QXR0cmlidXRlVmFsdWUoKSB7XG5cdHJldHVybiB0aGlzLmVsLmdldEF0dHJpYnV0ZSh0aGlzLm5hbWUpO1xufVxuXG5mdW5jdGlvbiBzZXRBdHRyaWJ1dGVWYWx1ZSh2YWx1ZSkge1xuXHR0aGlzLmVsLnNldEF0dHJpYnV0ZSh0aGlzLm5hbWUsIHZhbHVlKTtcbn1cblxuZnVuY3Rpb24gcGFyc2VBdHRyaWJ1dGUoKSB7XG5cdGlmICghIHRoaXMubm9kZSkgcmV0dXJuO1xuXG5cdHZhciB2YWx1ZSA9IHRoaXMuZ2V0KCk7XG5cblx0aWYgKHZhbHVlKVxuXHRcdHZhciBiaW5kVG8gPSB2YWx1ZS5zcGxpdCgnOicpO1xuXG5cdHN3aXRjaCAoYmluZFRvICYmIGJpbmRUby5sZW5ndGgpIHtcblx0XHRjYXNlIDE6XG5cdFx0XHR0aGlzLmNvbXBOYW1lID0gYmluZFRvWzBdO1xuXHRcdFx0dGhpcy5jb21wQ2xhc3MgPSAnQ29tcG9uZW50Jztcblx0XHRcdHJldHVybiB0aGlzO1xuXG5cdFx0Y2FzZSAyOlxuXHRcdFx0dGhpcy5jb21wTmFtZSA9IGJpbmRUb1sxXTtcblx0XHRcdHRoaXMuY29tcENsYXNzID0gYmluZFRvWzBdO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cblx0XHRkZWZhdWx0OlxuXHRcdFx0dGhyb3cgbmV3IEJpbmRFcnJvcignaW52YWxpZCBiaW5kIGF0dHJpYnV0ZSAnICsgdmFsdWUpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHZhbGlkYXRlQXR0cmlidXRlKCkge1xuXHR2YXIgY29tcE5hbWUgPSB0aGlzLmNvbXBOYW1lO1xuXHRjaGVjayhjb21wTmFtZSwgTWF0Y2guV2hlcmUoZnVuY3Rpb24oKSB7XG4gIFx0XHRyZXR1cm4gdHlwZW9mIGNvbXBOYW1lID09ICdzdHJpbmcnICYmIGNvbXBOYW1lICE9ICcnO1xuXHR9KSwgJ2VtcHR5IGNvbXBvbmVudCBuYW1lJyk7XG5cblx0aWYgKCEgdGhpcy5jb21wQ2xhc3MpXG5cdFx0dGhyb3cgbmV3IEJpbmRFcnJvcignZW1wdHkgY29tcG9uZW50IGNsYXNzIG5hbWUgJyArIHRoaXMuY29tcENsYXNzKTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGNvbXBvbmVudHNSZWdpc3RyeSA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudHMvY19yZWdpc3RyeScpXG5cdCwgQ29tcG9uZW50ID0gY29tcG9uZW50c1JlZ2lzdHJ5LmdldCgnQ29tcG9uZW50Jylcblx0LCBBdHRyaWJ1dGUgPSByZXF1aXJlKCcuL2F0dHJpYnV0ZScpXG5cdCwgQmluZEVycm9yID0gcmVxdWlyZSgnLi9lcnJvcicpXG5cdCwgXyA9IHJlcXVpcmUoJ3Byb3RvJylcblx0LCBjaGVjayA9IHJlcXVpcmUoJy4uL2NoZWNrJylcblx0LCBNYXRjaCA9ICBjaGVjay5NYXRjaDtcblxuXG52YXIgb3B0cyA9IHtcblx0QklORF9BVFRSOiAnbWwtYmluZCdcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBiaW5kO1xuXG5mdW5jdGlvbiBiaW5kKHNjb3BlRWwpIHtcblx0dmFyIHNjb3BlRWwgPSBzY29wZUVsIHx8IGRvY3VtZW50LmJvZHlcblx0XHQsIGNvbXBvbmVudHMgPSB7fTtcblxuXHQvLyBpdGVyYXRlIGNoaWxkcmVuIG9mIHNjb3BlRWxcblx0QXJyYXkucHJvdG90eXBlLmZvckVhY2guY2FsbChzY29wZUVsLmNoaWxkcmVuLCBiaW5kRWxlbWVudCk7XG5cblx0cmV0dXJuIGNvbXBvbmVudHM7XG5cblx0ZnVuY3Rpb24gYmluZEVsZW1lbnQoZWwpe1xuXHRcdHZhciBhdHRyID0gbmV3IEF0dHJpYnV0ZShlbCwgb3B0cy5CSU5EX0FUVFIpO1xuXG5cdFx0dmFyIGFDb21wb25lbnQgPSBjcmVhdGVDb21wb25lbnQoZWwsIGF0dHIpO1xuXG5cdFx0Ly8gYmluZCBpbm5lciBlbGVtZW50cyB0byBjb21wb25lbnRzXG5cdFx0dmFyIGlubmVyQ29tcG9uZW50cyA9IGJpbmQoZWwpO1xuXG5cdFx0Ly8gYXR0YWNoIGlubmVyIGNvbXBvbmVudHMgdG8gdGhlIGN1cnJlbnQgb25lIChjcmVhdGUgYSBuZXcgc2NvcGUpIC4uLlxuXHRcdGlmICh0eXBlb2YgYUNvbXBvbmVudCAhPSAndW5kZWZpbmVkJyAmJiBhQ29tcG9uZW50LmNvbnRhaW5lcilcblx0XHRcdGFDb21wb25lbnQuY29udGFpbmVyLmFkZChpbm5lckNvbXBvbmVudHMpO1xuXHRcdGVsc2UgLy8gb3Iga2VlcCB0aGVtIGluIHRoZSBjdXJyZW50IHNjb3BlXG5cdFx0XHRfLmVhY2hLZXkoaW5uZXJDb21wb25lbnRzLCBzdG9yZUNvbXBvbmVudCk7XG5cblx0XHRpZiAoYUNvbXBvbmVudClcblx0XHRcdHN0b3JlQ29tcG9uZW50KGFDb21wb25lbnQsIGF0dHIubmFtZSk7XG5cdH1cblxuXHRmdW5jdGlvbiBjcmVhdGVDb21wb25lbnQoZWwsIGF0dHIpIHtcblx0XHRpZiAoYXR0ci5ub2RlKSB7IC8vIGVsZW1lbnQgd2lsbCBiZSBib3VuZCB0byBhIGNvbXBvbmVudFxuXHRcdFx0YXR0ci5wYXJzZSgpLnZhbGlkYXRlKCk7XG5cdFx0XG5cdFx0XHQvLyBnZXQgY29tcG9uZW50IGNsYXNzIGZyb20gcmVnaXN0cnkgYW5kIHZhbGlkYXRlXG5cdFx0XHR2YXIgQ29tcG9uZW50Q2xhc3MgPSBjb21wb25lbnRzUmVnaXN0cnkuZ2V0KGF0dHIuY29tcENsYXNzKTtcblx0XHRcdGlmICghIENvbXBvbmVudENsYXNzKVxuXHRcdFx0XHR0aHJvdyBuZXcgQmluZEVycm9yKCdjbGFzcyAnICsgYXR0ci5jb21wQ2xhc3MgKyAnIGlzIG5vdCByZWdpc3RlcmVkJyk7XG5cblx0XHRcdGNoZWNrKENvbXBvbmVudENsYXNzLCBNYXRjaC5TdWJjbGFzcyhDb21wb25lbnQsIHRydWUpKTtcblx0XG5cdFx0XHQvLyBjcmVhdGUgbmV3IGNvbXBvbmVudFxuXHRcdFx0cmV0dXJuIG5ldyBDb21wb25lbnRDbGFzcyh7fSwgZWwpO1xuXHRcdH1cblx0fVxuXG5cblx0ZnVuY3Rpb24gc3RvcmVDb21wb25lbnQoYUNvbXBvbmVudCwgbmFtZSkge1xuXHRcdGlmIChjb21wb25lbnRzW25hbWVdKVxuXHRcdFx0dGhyb3cgbmV3IEJpbmRFcnJvcignZHVwbGljYXRlIGNvbXBvbmVudCBuYW1lOiAnICsgbmFtZSk7XG5cblx0XHRjb21wb25lbnRzW25hbWVdID0gYUNvbXBvbmVudDtcblx0fVxufVxuXG5cbmJpbmQuY29uZmlnID0gZnVuY3Rpb24ob3B0aW9ucykge1xuXHRvcHRzLmV4dGVuZChvcHRpb25zKTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgncHJvdG8nKTtcblxudmFyIEJpbmRFcnJvciA9IF8uY3JlYXRlU3ViY2xhc3MoRXJyb3IsICdCaW5kRXJyb3InKTtcblxubW9kdWxlLmV4cG9ydHMgPSBCaW5kRXJyb3I7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8vIFhYWCBkb2NzXG5cbi8vIFRoaW5ncyB3ZSBleHBsaWNpdGx5IGRvIE5PVCBzdXBwb3J0OlxuLy8gICAgLSBoZXRlcm9nZW5vdXMgYXJyYXlzXG52YXIgXyA9IHJlcXVpcmUoJ3Byb3RvJyk7XG5cbnZhciBjaGVjayA9IGZ1bmN0aW9uICh2YWx1ZSwgcGF0dGVybikge1xuICAvLyBSZWNvcmQgdGhhdCBjaGVjayBnb3QgY2FsbGVkLCBpZiBzb21lYm9keSBjYXJlZC5cbiAgdHJ5IHtcbiAgICBjaGVja1N1YnRyZWUodmFsdWUsIHBhdHRlcm4pO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICBpZiAoKGVyciBpbnN0YW5jZW9mIE1hdGNoLkVycm9yKSAmJiBlcnIucGF0aClcbiAgICAgIGVyci5tZXNzYWdlICs9IFwiIGluIGZpZWxkIFwiICsgZXJyLnBhdGg7XG4gICAgdGhyb3cgZXJyO1xuICB9XG59O1xubW9kdWxlLmV4cG9ydHMgPSBjaGVjaztcblxudmFyIE1hdGNoID0gY2hlY2suTWF0Y2ggPSB7XG4gIE9wdGlvbmFsOiBmdW5jdGlvbiAocGF0dGVybikge1xuICAgIHJldHVybiBuZXcgT3B0aW9uYWwocGF0dGVybik7XG4gIH0sXG4gIE9uZU9mOiBmdW5jdGlvbiAoLyphcmd1bWVudHMqLykge1xuICAgIHJldHVybiBuZXcgT25lT2YoYXJndW1lbnRzKTtcbiAgfSxcbiAgQW55OiBbJ19fYW55X18nXSxcbiAgV2hlcmU6IGZ1bmN0aW9uIChjb25kaXRpb24pIHtcbiAgICByZXR1cm4gbmV3IFdoZXJlKGNvbmRpdGlvbik7XG4gIH0sXG4gIE9iamVjdEluY2x1ZGluZzogZnVuY3Rpb24gKHBhdHRlcm4pIHtcbiAgICByZXR1cm4gbmV3IE9iamVjdEluY2x1ZGluZyhwYXR0ZXJuKTtcbiAgfSxcbiAgLy8gTWF0Y2hlcyBvbmx5IHNpZ25lZCAzMi1iaXQgaW50ZWdlcnNcbiAgSW50ZWdlcjogWydfX2ludGVnZXJfXyddLFxuXG4gIC8vIE1hdGNoZXMgaGFzaCAob2JqZWN0KSB3aXRoIHZhbHVlcyBtYXRjaGluZyBwYXR0ZXJuXG4gIE9iamVjdEhhc2g6IGZ1bmN0aW9uKHBhdHRlcm4pIHtcbiAgICByZXR1cm4gbmV3IE9iamVjdEhhc2gocGF0dGVybik7XG4gIH0sXG5cbiAgU3ViY2xhc3M6IGZ1bmN0aW9uKFN1cGVyY2xhc3MsIG1hdGNoU3VwZXJjbGFzc1Rvbykge1xuICAgIHJldHVybiBuZXcgU3ViY2xhc3MoU3VwZXJjbGFzcywgbWF0Y2hTdXBlcmNsYXNzVG9vKTtcbiAgfSxcblxuICAvLyBYWFggbWF0Y2hlcnMgc2hvdWxkIGtub3cgaG93IHRvIGRlc2NyaWJlIHRoZW1zZWx2ZXMgZm9yIGVycm9yc1xuICBFcnJvcjogVHlwZUVycm9yLFxuXG4gIC8vIE1ldGVvci5tYWtlRXJyb3JUeXBlKFwiTWF0Y2guRXJyb3JcIiwgZnVuY3Rpb24gKG1zZykge1xuICAgIC8vIHRoaXMubWVzc2FnZSA9IFwiTWF0Y2ggZXJyb3I6IFwiICsgbXNnO1xuICAgIC8vIFRoZSBwYXRoIG9mIHRoZSB2YWx1ZSB0aGF0IGZhaWxlZCB0byBtYXRjaC4gSW5pdGlhbGx5IGVtcHR5LCB0aGlzIGdldHNcbiAgICAvLyBwb3B1bGF0ZWQgYnkgY2F0Y2hpbmcgYW5kIHJldGhyb3dpbmcgdGhlIGV4Y2VwdGlvbiBhcyBpdCBnb2VzIGJhY2sgdXAgdGhlXG4gICAgLy8gc3RhY2suXG4gICAgLy8gRS5nLjogXCJ2YWxzWzNdLmVudGl0eS5jcmVhdGVkXCJcbiAgICAvLyB0aGlzLnBhdGggPSBcIlwiO1xuICAgIC8vIElmIHRoaXMgZ2V0cyBzZW50IG92ZXIgRERQLCBkb24ndCBnaXZlIGZ1bGwgaW50ZXJuYWwgZGV0YWlscyBidXQgYXQgbGVhc3RcbiAgICAvLyBwcm92aWRlIHNvbWV0aGluZyBiZXR0ZXIgdGhhbiA1MDAgSW50ZXJuYWwgc2VydmVyIGVycm9yLlxuICAvLyAgIHRoaXMuc2FuaXRpemVkRXJyb3IgPSBuZXcgTWV0ZW9yLkVycm9yKDQwMCwgXCJNYXRjaCBmYWlsZWRcIik7XG4gIC8vIH0pLFxuXG4gIC8vIFRlc3RzIHRvIHNlZSBpZiB2YWx1ZSBtYXRjaGVzIHBhdHRlcm4uIFVubGlrZSBjaGVjaywgaXQgbWVyZWx5IHJldHVybnMgdHJ1ZVxuICAvLyBvciBmYWxzZSAodW5sZXNzIGFuIGVycm9yIG90aGVyIHRoYW4gTWF0Y2guRXJyb3Igd2FzIHRocm93bikuIEl0IGRvZXMgbm90XG4gIC8vIGludGVyYWN0IHdpdGggX2ZhaWxJZkFyZ3VtZW50c0FyZU5vdEFsbENoZWNrZWQuXG4gIC8vIFhYWCBtYXliZSBhbHNvIGltcGxlbWVudCBhIE1hdGNoLm1hdGNoIHdoaWNoIHJldHVybnMgbW9yZSBpbmZvcm1hdGlvbiBhYm91dFxuICAvLyAgICAgZmFpbHVyZXMgYnV0IHdpdGhvdXQgdXNpbmcgZXhjZXB0aW9uIGhhbmRsaW5nIG9yIGRvaW5nIHdoYXQgY2hlY2soKVxuICAvLyAgICAgZG9lcyB3aXRoIF9mYWlsSWZBcmd1bWVudHNBcmVOb3RBbGxDaGVja2VkIGFuZCBNZXRlb3IuRXJyb3IgY29udmVyc2lvblxuICB0ZXN0OiBmdW5jdGlvbiAodmFsdWUsIHBhdHRlcm4pIHtcbiAgICB0cnkge1xuICAgICAgY2hlY2tTdWJ0cmVlKHZhbHVlLCBwYXR0ZXJuKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChlIGluc3RhbmNlb2YgTWF0Y2guRXJyb3IpXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIC8vIFJldGhyb3cgb3RoZXIgZXJyb3JzLlxuICAgICAgdGhyb3cgZTtcbiAgICB9XG4gIH0sXG5cbiAgLy8gUnVucyBgZi5hcHBseShjb250ZXh0LCBhcmdzKWAuIElmIGNoZWNrKCkgaXMgbm90IGNhbGxlZCBvbiBldmVyeSBlbGVtZW50IG9mXG4gIC8vIGBhcmdzYCAoZWl0aGVyIGRpcmVjdGx5IG9yIGluIHRoZSBmaXJzdCBsZXZlbCBvZiBhbiBhcnJheSksIHRocm93cyBhbiBlcnJvclxuICAvLyAodXNpbmcgYGRlc2NyaXB0aW9uYCBpbiB0aGUgbWVzc2FnZSkuXG4gIC8vXG4gIF9mYWlsSWZBcmd1bWVudHNBcmVOb3RBbGxDaGVja2VkOiBmdW5jdGlvbiAoZiwgY29udGV4dCwgYXJncywgZGVzY3JpcHRpb24pIHtcbiAgICB2YXIgYXJnQ2hlY2tlciA9IG5ldyBBcmd1bWVudENoZWNrZXIoYXJncywgZGVzY3JpcHRpb24pO1xuICAgIHZhciByZXN1bHQgPSBjdXJyZW50QXJndW1lbnRDaGVja2VyLndpdGhWYWx1ZShhcmdDaGVja2VyLCBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gZi5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICB9KTtcbiAgICAvLyBJZiBmIGRpZG4ndCBpdHNlbGYgdGhyb3csIG1ha2Ugc3VyZSBpdCBjaGVja2VkIGFsbCBvZiBpdHMgYXJndW1lbnRzLlxuICAgIGFyZ0NoZWNrZXIudGhyb3dVbmxlc3NBbGxBcmd1bWVudHNIYXZlQmVlbkNoZWNrZWQoKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG59O1xuXG5mdW5jdGlvbiBPcHRpb25hbChwYXR0ZXJuKSB7XG4gIHRoaXMucGF0dGVybiA9IHBhdHRlcm47XG59O1xuXG5mdW5jdGlvbiBPbmVPZihjaG9pY2VzKSB7XG4gIGlmIChjaG9pY2VzLmxlbmd0aCA9PSAwKVxuICAgIHRocm93IG5ldyBFcnJvcihcIk11c3QgcHJvdmlkZSBhdCBsZWFzdCBvbmUgY2hvaWNlIHRvIE1hdGNoLk9uZU9mXCIpO1xuICB0aGlzLmNob2ljZXMgPSBjaG9pY2VzO1xufTtcblxuZnVuY3Rpb24gV2hlcmUoY29uZGl0aW9uKSB7XG4gIHRoaXMuY29uZGl0aW9uID0gY29uZGl0aW9uO1xufTtcblxuZnVuY3Rpb24gT2JqZWN0SW5jbHVkaW5nKHBhdHRlcm4pIHtcbiAgdGhpcy5wYXR0ZXJuID0gcGF0dGVybjtcbn07XG5cbmZ1bmN0aW9uIE9iamVjdEhhc2gocGF0dGVybikge1xuICB0aGlzLnBhdHRlcm4gPSBwYXR0ZXJuO1xufTtcblxuZnVuY3Rpb24gU3ViY2xhc3MoU3VwZXJjbGFzcywgbWF0Y2hTdXBlcmNsYXNzVG9vKSB7XG4gIHRoaXMuU3VwZXJjbGFzcyA9IFN1cGVyY2xhc3M7XG4gIHRoaXMubWF0Y2hTdXBlcmNsYXNzID0gbWF0Y2hTdXBlcmNsYXNzVG9vO1xufTtcblxudmFyIHR5cGVvZkNoZWNrcyA9IFtcbiAgW1N0cmluZywgXCJzdHJpbmdcIl0sXG4gIFtOdW1iZXIsIFwibnVtYmVyXCJdLFxuICBbQm9vbGVhbiwgXCJib29sZWFuXCJdLFxuICAvLyBXaGlsZSB3ZSBkb24ndCBhbGxvdyB1bmRlZmluZWQgaW4gRUpTT04sIHRoaXMgaXMgZ29vZCBmb3Igb3B0aW9uYWxcbiAgLy8gYXJndW1lbnRzIHdpdGggT25lT2YuXG4gIFt1bmRlZmluZWQsIFwidW5kZWZpbmVkXCJdXG5dO1xuXG5mdW5jdGlvbiBjaGVja1N1YnRyZWUodmFsdWUsIHBhdHRlcm4pIHtcbiAgLy8gTWF0Y2ggYW55dGhpbmchXG4gIGlmIChwYXR0ZXJuID09PSBNYXRjaC5BbnkpXG4gICAgcmV0dXJuO1xuXG4gIC8vIEJhc2ljIGF0b21pYyB0eXBlcy5cbiAgLy8gRG8gbm90IG1hdGNoIGJveGVkIG9iamVjdHMgKGUuZy4gU3RyaW5nLCBCb29sZWFuKVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHR5cGVvZkNoZWNrcy5sZW5ndGg7ICsraSkge1xuICAgIGlmIChwYXR0ZXJuID09PSB0eXBlb2ZDaGVja3NbaV1bMF0pIHtcbiAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09IHR5cGVvZkNoZWNrc1tpXVsxXSlcbiAgICAgICAgcmV0dXJuO1xuICAgICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgXCIgKyB0eXBlb2ZDaGVja3NbaV1bMV0gKyBcIiwgZ290IFwiICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlb2YgdmFsdWUpO1xuICAgIH1cbiAgfVxuICBpZiAocGF0dGVybiA9PT0gbnVsbCkge1xuICAgIGlmICh2YWx1ZSA9PT0gbnVsbClcbiAgICAgIHJldHVybjtcbiAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJFeHBlY3RlZCBudWxsLCBnb3QgXCIgKyBFSlNPTi5zdHJpbmdpZnkodmFsdWUpKTtcbiAgfVxuXG4gIC8vIE1hdGNoLkludGVnZXIgaXMgc3BlY2lhbCB0eXBlIGVuY29kZWQgd2l0aCBhcnJheVxuICBpZiAocGF0dGVybiA9PT0gTWF0Y2guSW50ZWdlcikge1xuICAgIC8vIFRoZXJlIGlzIG5vIGNvbnNpc3RlbnQgYW5kIHJlbGlhYmxlIHdheSB0byBjaGVjayBpZiB2YXJpYWJsZSBpcyBhIDY0LWJpdFxuICAgIC8vIGludGVnZXIuIE9uZSBvZiB0aGUgcG9wdWxhciBzb2x1dGlvbnMgaXMgdG8gZ2V0IHJlbWluZGVyIG9mIGRpdmlzaW9uIGJ5IDFcbiAgICAvLyBidXQgdGhpcyBtZXRob2QgZmFpbHMgb24gcmVhbGx5IGxhcmdlIGZsb2F0cyB3aXRoIGJpZyBwcmVjaXNpb24uXG4gICAgLy8gRS5nLjogMS4zNDgxOTIzMDg0OTE4MjRlKzIzICUgMSA9PT0gMCBpbiBWOFxuICAgIC8vIEJpdHdpc2Ugb3BlcmF0b3JzIHdvcmsgY29uc2lzdGFudGx5IGJ1dCBhbHdheXMgY2FzdCB2YXJpYWJsZSB0byAzMi1iaXRcbiAgICAvLyBzaWduZWQgaW50ZWdlciBhY2NvcmRpbmcgdG8gSmF2YVNjcmlwdCBzcGVjcy5cbiAgICBpZiAodHlwZW9mIHZhbHVlID09PSBcIm51bWJlclwiICYmICh2YWx1ZSB8IDApID09PSB2YWx1ZSlcbiAgICAgIHJldHVyblxuICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIkV4cGVjdGVkIEludGVnZXIsIGdvdCBcIlxuICAgICAgICAgICAgICAgICsgKHZhbHVlIGluc3RhbmNlb2YgT2JqZWN0ID8gRUpTT04uc3RyaW5naWZ5KHZhbHVlKSA6IHZhbHVlKSk7XG4gIH1cblxuICAvLyBcIk9iamVjdFwiIGlzIHNob3J0aGFuZCBmb3IgTWF0Y2guT2JqZWN0SW5jbHVkaW5nKHt9KTtcbiAgaWYgKHBhdHRlcm4gPT09IE9iamVjdClcbiAgICBwYXR0ZXJuID0gTWF0Y2guT2JqZWN0SW5jbHVkaW5nKHt9KTtcblxuICAvLyBBcnJheSAoY2hlY2tlZCBBRlRFUiBBbnksIHdoaWNoIGlzIGltcGxlbWVudGVkIGFzIGFuIEFycmF5KS5cbiAgaWYgKHBhdHRlcm4gaW5zdGFuY2VvZiBBcnJheSkge1xuICAgIGlmIChwYXR0ZXJuLmxlbmd0aCAhPT0gMSlcbiAgICAgIHRocm93IEVycm9yKFwiQmFkIHBhdHRlcm46IGFycmF5cyBtdXN0IGhhdmUgb25lIHR5cGUgZWxlbWVudFwiICtcbiAgICAgICAgICAgICAgICAgIEVKU09OLnN0cmluZ2lmeShwYXR0ZXJuKSk7XG4gICAgaWYgKCFfLmlzQXJyYXkodmFsdWUpICYmICFfLmlzQXJndW1lbnRzKHZhbHVlKSkge1xuICAgICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgYXJyYXksIGdvdCBcIiArIEVKU09OLnN0cmluZ2lmeSh2YWx1ZSkpO1xuICAgIH1cblxuICAgIF8uZWFjaCh2YWx1ZSwgZnVuY3Rpb24gKHZhbHVlRWxlbWVudCwgaW5kZXgpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNoZWNrU3VidHJlZSh2YWx1ZUVsZW1lbnQsIHBhdHRlcm5bMF0pO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIGlmIChlcnIgaW5zdGFuY2VvZiBNYXRjaC5FcnJvcikge1xuICAgICAgICAgIGVyci5wYXRoID0gX3ByZXBlbmRQYXRoKGluZGV4LCBlcnIucGF0aCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIEFyYml0cmFyeSB2YWxpZGF0aW9uIGNoZWNrcy4gVGhlIGNvbmRpdGlvbiBjYW4gcmV0dXJuIGZhbHNlIG9yIHRocm93IGFcbiAgLy8gTWF0Y2guRXJyb3IgKGllLCBpdCBjYW4gaW50ZXJuYWxseSB1c2UgY2hlY2soKSkgdG8gZmFpbC5cbiAgaWYgKHBhdHRlcm4gaW5zdGFuY2VvZiBXaGVyZSkge1xuICAgIGlmIChwYXR0ZXJuLmNvbmRpdGlvbih2YWx1ZSkpXG4gICAgICByZXR1cm47XG4gICAgLy8gWFhYIHRoaXMgZXJyb3IgaXMgdGVycmlibGVcbiAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJGYWlsZWQgTWF0Y2guV2hlcmUgdmFsaWRhdGlvblwiKTtcbiAgfVxuXG5cbiAgaWYgKHBhdHRlcm4gaW5zdGFuY2VvZiBPcHRpb25hbClcbiAgICBwYXR0ZXJuID0gTWF0Y2guT25lT2YodW5kZWZpbmVkLCBwYXR0ZXJuLnBhdHRlcm4pO1xuXG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgT25lT2YpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhdHRlcm4uY2hvaWNlcy5sZW5ndGg7ICsraSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY2hlY2tTdWJ0cmVlKHZhbHVlLCBwYXR0ZXJuLmNob2ljZXNbaV0pO1xuICAgICAgICAvLyBObyBlcnJvcj8gWWF5LCByZXR1cm4uXG4gICAgICAgIHJldHVybjtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAvLyBPdGhlciBlcnJvcnMgc2hvdWxkIGJlIHRocm93bi4gTWF0Y2ggZXJyb3JzIGp1c3QgbWVhbiB0cnkgYW5vdGhlclxuICAgICAgICAvLyBjaG9pY2UuXG4gICAgICAgIGlmICghKGVyciBpbnN0YW5jZW9mIE1hdGNoLkVycm9yKSlcbiAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIFhYWCB0aGlzIGVycm9yIGlzIHRlcnJpYmxlXG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRmFpbGVkIE1hdGNoLk9uZU9mIG9yIE1hdGNoLk9wdGlvbmFsIHZhbGlkYXRpb25cIik7XG4gIH1cblxuICAvLyBBIGZ1bmN0aW9uIHRoYXQgaXNuJ3Qgc29tZXRoaW5nIHdlIHNwZWNpYWwtY2FzZSBpcyBhc3N1bWVkIHRvIGJlIGFcbiAgLy8gY29uc3RydWN0b3IuXG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBwYXR0ZXJuKVxuICAgICAgcmV0dXJuO1xuICAgIC8vIFhYWCB3aGF0IGlmIC5uYW1lIGlzbid0IGRlZmluZWRcbiAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJFeHBlY3RlZCBcIiArIHBhdHRlcm4uY29uc3RydWN0b3IubmFtZSk7XG4gIH1cblxuICB2YXIgdW5rbm93bktleXNBbGxvd2VkID0gZmFsc2U7XG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgT2JqZWN0SW5jbHVkaW5nKSB7XG4gICAgdW5rbm93bktleXNBbGxvd2VkID0gdHJ1ZTtcbiAgICBwYXR0ZXJuID0gcGF0dGVybi5wYXR0ZXJuO1xuICB9XG5cbiAgaWYgKHBhdHRlcm4gaW5zdGFuY2VvZiBPYmplY3RIYXNoKSB7XG4gICAgdmFyIGtleVBhdHRlcm4gPSBwYXR0ZXJuLnBhdHRlcm47XG4gICAgdmFyIGVtcHR5SGFzaCA9IHRydWU7XG4gICAgZm9yICh2YXIga2V5IGluIHZhbHVlKSB7XG4gICAgICBlbXB0eUhhc2ggPSBmYWxzZTtcbiAgICAgIGNoZWNrKHZhbHVlW2tleV0sIGtleVBhdHRlcm4pO1xuICAgIH1cbiAgICBpZiAoZW1wdHlIYXNoKVxuICAgICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiRXhwZWN0ZWQgXCIgKyBwYXR0ZXJuLmNvbnN0cnVjdG9yLm5hbWUpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgU3ViY2xhc3MpIHtcbiAgICB2YXIgU3VwZXJjbGFzcyA9IHBhdHRlcm4uU3VwZXJjbGFzcztcbiAgICBpZiAocGF0dGVybi5tYXRjaFN1cGVyY2xhc3MgJiYgdmFsdWUgPT0gU3VwZXJjbGFzcylcbiAgICAgIHJldHVybjtcbiAgICBpZiAoISAodmFsdWUucHJvdG90eXBlIGluc3RhbmNlb2YgU3VwZXJjbGFzcykpXG4gICAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJFeHBlY3RlZCBcIiArIHBhdHRlcm4uY29uc3RydWN0b3IubmFtZSArIFwiIG9mIFwiICsgU3VwZXJjbGFzcy5uYW1lKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAodHlwZW9mIHBhdHRlcm4gIT09IFwib2JqZWN0XCIpXG4gICAgdGhyb3cgRXJyb3IoXCJCYWQgcGF0dGVybjogdW5rbm93biBwYXR0ZXJuIHR5cGVcIik7XG5cbiAgLy8gQW4gb2JqZWN0LCB3aXRoIHJlcXVpcmVkIGFuZCBvcHRpb25hbCBrZXlzLiBOb3RlIHRoYXQgdGhpcyBkb2VzIE5PVCBkb1xuICAvLyBzdHJ1Y3R1cmFsIG1hdGNoZXMgYWdhaW5zdCBvYmplY3RzIG9mIHNwZWNpYWwgdHlwZXMgdGhhdCBoYXBwZW4gdG8gbWF0Y2hcbiAgLy8gdGhlIHBhdHRlcm46IHRoaXMgcmVhbGx5IG5lZWRzIHRvIGJlIGEgcGxhaW4gb2xkIHtPYmplY3R9IVxuICBpZiAodHlwZW9mIHZhbHVlICE9PSAnb2JqZWN0JylcbiAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJFeHBlY3RlZCBvYmplY3QsIGdvdCBcIiArIHR5cGVvZiB2YWx1ZSk7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbClcbiAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJFeHBlY3RlZCBvYmplY3QsIGdvdCBudWxsXCIpO1xuICBpZiAodmFsdWUuY29uc3RydWN0b3IgIT09IE9iamVjdClcbiAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJFeHBlY3RlZCBwbGFpbiBvYmplY3RcIik7XG5cbiAgdmFyIHJlcXVpcmVkUGF0dGVybnMgPSB7fTtcbiAgdmFyIG9wdGlvbmFsUGF0dGVybnMgPSB7fTtcbiAgXy5lYWNoKHBhdHRlcm4sIGZ1bmN0aW9uIChzdWJQYXR0ZXJuLCBrZXkpIHtcbiAgICBpZiAoc3ViUGF0dGVybiBpbnN0YW5jZW9mIE9wdGlvbmFsKVxuICAgICAgb3B0aW9uYWxQYXR0ZXJuc1trZXldID0gc3ViUGF0dGVybi5wYXR0ZXJuO1xuICAgIGVsc2VcbiAgICAgIHJlcXVpcmVkUGF0dGVybnNba2V5XSA9IHN1YlBhdHRlcm47XG4gIH0pO1xuXG4gIF8uZWFjaCh2YWx1ZSwgZnVuY3Rpb24gKHN1YlZhbHVlLCBrZXkpIHtcbiAgICB0cnkge1xuICAgICAgaWYgKF8uaGFzKHJlcXVpcmVkUGF0dGVybnMsIGtleSkpIHtcbiAgICAgICAgY2hlY2tTdWJ0cmVlKHN1YlZhbHVlLCByZXF1aXJlZFBhdHRlcm5zW2tleV0pO1xuICAgICAgICBkZWxldGUgcmVxdWlyZWRQYXR0ZXJuc1trZXldO1xuICAgICAgfSBlbHNlIGlmIChfLmhhcyhvcHRpb25hbFBhdHRlcm5zLCBrZXkpKSB7XG4gICAgICAgIGNoZWNrU3VidHJlZShzdWJWYWx1ZSwgb3B0aW9uYWxQYXR0ZXJuc1trZXldKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICghdW5rbm93bktleXNBbGxvd2VkKVxuICAgICAgICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIlVua25vd24ga2V5XCIpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgaWYgKGVyciBpbnN0YW5jZW9mIE1hdGNoLkVycm9yKVxuICAgICAgICBlcnIucGF0aCA9IF9wcmVwZW5kUGF0aChrZXksIGVyci5wYXRoKTtcbiAgICAgIHRocm93IGVycjtcbiAgICB9XG4gIH0pO1xuXG4gIF8uZWFjaChyZXF1aXJlZFBhdHRlcm5zLCBmdW5jdGlvbiAoc3ViUGF0dGVybiwga2V5KSB7XG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiTWlzc2luZyBrZXkgJ1wiICsga2V5ICsgXCInXCIpO1xuICB9KTtcbn07XG5cbmZ1bmN0aW9uIEFyZ3VtZW50Q2hlY2tlcihhcmdzLCBkZXNjcmlwdGlvbikge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIC8vIE1ha2UgYSBTSEFMTE9XIGNvcHkgb2YgdGhlIGFyZ3VtZW50cy4gKFdlJ2xsIGJlIGRvaW5nIGlkZW50aXR5IGNoZWNrc1xuICAvLyBhZ2FpbnN0IGl0cyBjb250ZW50cy4pXG4gIHNlbGYuYXJncyA9IF8uY2xvbmUoYXJncyk7XG4gIC8vIFNpbmNlIHRoZSBjb21tb24gY2FzZSB3aWxsIGJlIHRvIGNoZWNrIGFyZ3VtZW50cyBpbiBvcmRlciwgYW5kIHdlIHNwbGljZVxuICAvLyBvdXQgYXJndW1lbnRzIHdoZW4gd2UgY2hlY2sgdGhlbSwgbWFrZSBpdCBzbyB3ZSBzcGxpY2Ugb3V0IGZyb20gdGhlIGVuZFxuICAvLyByYXRoZXIgdGhhbiB0aGUgYmVnaW5uaW5nLlxuICBzZWxmLmFyZ3MucmV2ZXJzZSgpO1xuICBzZWxmLmRlc2NyaXB0aW9uID0gZGVzY3JpcHRpb247XG59O1xuXG5fLmV4dGVuZFByb3RvKEFyZ3VtZW50Q2hlY2tlciwge1xuICBjaGVja2luZzogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLl9jaGVja2luZ09uZVZhbHVlKHZhbHVlKSlcbiAgICAgIHJldHVybjtcbiAgICAvLyBBbGxvdyBjaGVjayhhcmd1bWVudHMsIFtTdHJpbmddKSBvciBjaGVjayhhcmd1bWVudHMuc2xpY2UoMSksIFtTdHJpbmddKVxuICAgIC8vIG9yIGNoZWNrKFtmb28sIGJhcl0sIFtTdHJpbmddKSB0byBjb3VudC4uLiBidXQgb25seSBpZiB2YWx1ZSB3YXNuJ3RcbiAgICAvLyBpdHNlbGYgYW4gYXJndW1lbnQuXG4gICAgaWYgKF8uaXNBcnJheSh2YWx1ZSkgfHwgXy5pc0FyZ3VtZW50cyh2YWx1ZSkpIHtcbiAgICAgIF8uZWFjaCh2YWx1ZSwgXy5iaW5kKHNlbGYuX2NoZWNraW5nT25lVmFsdWUsIHNlbGYpKTtcbiAgICB9XG4gIH0sXG4gIF9jaGVja2luZ09uZVZhbHVlOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzZWxmLmFyZ3MubGVuZ3RoOyArK2kpIHtcbiAgICAgIC8vIElzIHRoaXMgdmFsdWUgb25lIG9mIHRoZSBhcmd1bWVudHM/IChUaGlzIGNhbiBoYXZlIGEgZmFsc2UgcG9zaXRpdmUgaWZcbiAgICAgIC8vIHRoZSBhcmd1bWVudCBpcyBhbiBpbnRlcm5lZCBwcmltaXRpdmUsIGJ1dCBpdCdzIHN0aWxsIGEgZ29vZCBlbm91Z2hcbiAgICAgIC8vIGNoZWNrLilcbiAgICAgIGlmICh2YWx1ZSA9PT0gc2VsZi5hcmdzW2ldKSB7XG4gICAgICAgIHNlbGYuYXJncy5zcGxpY2UoaSwgMSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0sXG4gIHRocm93VW5sZXNzQWxsQXJndW1lbnRzSGF2ZUJlZW5DaGVja2VkOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmICghXy5pc0VtcHR5KHNlbGYuYXJncykpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJEaWQgbm90IGNoZWNrKCkgYWxsIGFyZ3VtZW50cyBkdXJpbmcgXCIgK1xuICAgICAgICAgICAgICAgICAgICAgIHNlbGYuZGVzY3JpcHRpb24pO1xuICB9XG59KTtcblxudmFyIF9qc0tleXdvcmRzID0gW1wiZG9cIiwgXCJpZlwiLCBcImluXCIsIFwiZm9yXCIsIFwibGV0XCIsIFwibmV3XCIsIFwidHJ5XCIsIFwidmFyXCIsIFwiY2FzZVwiLFxuICBcImVsc2VcIiwgXCJlbnVtXCIsIFwiZXZhbFwiLCBcImZhbHNlXCIsIFwibnVsbFwiLCBcInRoaXNcIiwgXCJ0cnVlXCIsIFwidm9pZFwiLCBcIndpdGhcIixcbiAgXCJicmVha1wiLCBcImNhdGNoXCIsIFwiY2xhc3NcIiwgXCJjb25zdFwiLCBcInN1cGVyXCIsIFwidGhyb3dcIiwgXCJ3aGlsZVwiLCBcInlpZWxkXCIsXG4gIFwiZGVsZXRlXCIsIFwiZXhwb3J0XCIsIFwiaW1wb3J0XCIsIFwicHVibGljXCIsIFwicmV0dXJuXCIsIFwic3RhdGljXCIsIFwic3dpdGNoXCIsXG4gIFwidHlwZW9mXCIsIFwiZGVmYXVsdFwiLCBcImV4dGVuZHNcIiwgXCJmaW5hbGx5XCIsIFwicGFja2FnZVwiLCBcInByaXZhdGVcIiwgXCJjb250aW51ZVwiLFxuICBcImRlYnVnZ2VyXCIsIFwiZnVuY3Rpb25cIiwgXCJhcmd1bWVudHNcIiwgXCJpbnRlcmZhY2VcIiwgXCJwcm90ZWN0ZWRcIiwgXCJpbXBsZW1lbnRzXCIsXG4gIFwiaW5zdGFuY2VvZlwiXTtcblxuLy8gQXNzdW1lcyB0aGUgYmFzZSBvZiBwYXRoIGlzIGFscmVhZHkgZXNjYXBlZCBwcm9wZXJseVxuLy8gcmV0dXJucyBrZXkgKyBiYXNlXG5mdW5jdGlvbiBfcHJlcGVuZFBhdGgoa2V5LCBiYXNlKSB7XG4gIGlmICgodHlwZW9mIGtleSkgPT09IFwibnVtYmVyXCIgfHwga2V5Lm1hdGNoKC9eWzAtOV0rJC8pKVxuICAgIGtleSA9IFwiW1wiICsga2V5ICsgXCJdXCI7XG4gIGVsc2UgaWYgKCFrZXkubWF0Y2goL15bYS16XyRdWzAtOWEtel8kXSokL2kpIHx8IF8uY29udGFpbnMoX2pzS2V5d29yZHMsIGtleSkpXG4gICAga2V5ID0gSlNPTi5zdHJpbmdpZnkoW2tleV0pO1xuXG4gIGlmIChiYXNlICYmIGJhc2VbMF0gIT09IFwiW1wiKVxuICAgIHJldHVybiBrZXkgKyAnLicgKyBiYXNlO1xuICByZXR1cm4ga2V5ICsgYmFzZTtcbn07XG5cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIEZhY2V0ZWRPYmplY3QgPSByZXF1aXJlKCcuLi9mYWNldHMvZl9vYmplY3QnKVxuXHQsIF8gPSByZXF1aXJlKCdwcm90bycpO1xuXG52YXIgQ29tcG9uZW50ID0gbW9kdWxlLmV4cG9ydHMgPSBfLmNyZWF0ZVN1YmNsYXNzKEZhY2V0ZWRPYmplY3QsICdDb21wb25lbnQnLCB0cnVlKVxuXG5Db21wb25lbnQuY3JlYXRlQ29tcG9uZW50Q2xhc3MgPSBGYWNldGVkT2JqZWN0LmNyZWF0ZUZhY2V0ZWRDbGFzcztcbmRlbGV0ZSBDb21wb25lbnQuY3JlYXRlRmFjZXRlZENsYXNzO1xuXG5fLmV4dGVuZFByb3RvKENvbXBvbmVudCwge1xuXHRpbml0OiBpbml0Q29tcG9uZW50XG59KTtcblxuXG5mdW5jdGlvbiBpbml0Q29tcG9uZW50KGZhY2V0c09wdGlvbnMsIGVsZW1lbnQpIHtcblx0dGhpcy5lbCA9IGVsZW1lbnQ7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBDbGFzc1JlZ2lzdHJ5ID0gcmVxdWlyZSgnLi4vcmVnaXN0cnknKVxuXHQsIENvbXBvbmVudCA9IHJlcXVpcmUoJy4vY19jbGFzcycpO1xuXG52YXIgY29tcG9uZW50c1JlZ2lzdHJ5ID0gbmV3IENsYXNzUmVnaXN0cnkoQ29tcG9uZW50KTtcblxuY29tcG9uZW50c1JlZ2lzdHJ5LmFkZChDb21wb25lbnQpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNvbXBvbmVudHNSZWdpc3RyeTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCdwcm90bycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEZhY2V0O1xuXG5mdW5jdGlvbiBGYWNldChvd25lciwgb3B0aW9ucykge1xuXHR0aGlzLm93bmVyID0gb3duZXI7XG5cdHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG5cdHRoaXMuaW5pdCgpO1xufVxuXG5fLmV4dGVuZFByb3RvKEZhY2V0LCB7XG5cdGluaXQ6IEZ1bmN0aW9uKClcbn0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgRmFjZXQgPSByZXF1aXJlKCcuL2ZfY2xhc3MnKVxuXHQsIF8gPSByZXF1aXJlKCdwcm90bycpXG5cdCwgY2hlY2sgPSByZXF1aXJlKCcuLi9jaGVjaycpXG5cdCwgTWF0Y2ggPSBjaGVjay5NYXRjaDtcblxubW9kdWxlLmV4cG9ydHMgPSBGYWNldGVkT2JqZWN0O1xuXG4vLyBhYnN0cmFjdCBjbGFzcyBmb3IgZmFjZXRlZCBvYmplY3RcbmZ1bmN0aW9uIEZhY2V0ZWRPYmplY3QoZmFjZXRzT3B0aW9ucyAvKiwgb3RoZXIgYXJncyAtIHBhc3NlZCB0byBpbml0IG1ldGhvZCAqLykge1xuXHQvLyBUT0RPIGluc3RhbnRpYXRlIGZhY2V0cyBpZiBjb25maWd1cmF0aW9uIGlzbid0IHBhc3NlZFxuXHQvLyB3cml0ZSBhIHRlc3QgdG8gY2hlY2sgaXRcblx0ZmFjZXRzT3B0aW9ucyA9IGZhY2V0c09wdGlvbnMgPyBfLmNsb25lKGZhY2V0c09wdGlvbnMpIDoge307XG5cblx0dmFyIHRoaXNDbGFzcyA9IHRoaXMuY29uc3RydWN0b3Jcblx0XHQsIGZhY2V0cyA9IHt9O1xuXG5cdGlmICh0aGlzLmNvbnN0cnVjdG9yID09IEZhY2V0ZWRPYmplY3QpXHRcdFxuXHRcdHRocm93IG5ldyBFcnJvcignRmFjZXRlZE9iamVjdCBpcyBhbiBhYnN0cmFjdCBjbGFzcywgY2FuXFwndCBiZSBpbnN0YW50aWF0ZWQnKTtcblx0aWYgKCEgdGhpc0NsYXNzLnByb3RvdHlwZS5mYWNldHMpXG5cdFx0dGhyb3cgbmV3IEVycm9yKCdObyBmYWNldHMgZGVmaW5lZCBpbiBjbGFzcyAnICsgdGhpcy5jb25zdHJ1Y3Rvci5uYW1lKTtcblx0XG5cdC8vIF8uZWFjaEtleShmYWNldHNPcHRpb25zLCBpbnN0YW50aWF0ZUZhY2V0LCB0aGlzLCB0cnVlKTtcblxuXHRfLmVhY2hLZXkodGhpcy5mYWNldHMsIGluc3RhbnRpYXRlRmFjZXQsIHRoaXMsIHRydWUpO1xuXG5cdHZhciB1bnVzZWRGYWNldHNOYW1lcyA9IE9iamVjdC5rZXlzKGZhY2V0c09wdGlvbnMpO1xuXHRpZiAodW51c2VkRmFjZXRzTmFtZXMubGVuZ3RoKVxuXHRcdHRocm93IG5ldyBFcnJvcignQ29uZmlndXJhdGlvbiBmb3IgdW5rbm93biBmYWNldChzKSBwYXNzZWQ6ICcgKyB1bnVzZWRGYWNldHNOYW1lcy5qb2luKCcsICcpKTtcblxuXHRPYmplY3QuZGVmaW5lUHJvcGVydGllcyh0aGlzLCBmYWNldHMpO1xuXG5cdC8vIGNhbGxpbmcgaW5pdCBpZiBpdCBpcyBkZWZpbmVkIGluIHRoZSBjbGFzc1xuXHRpZiAodGhpcy5pbml0KVxuXHRcdHRoaXMuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG5cdGZ1bmN0aW9uIGluc3RhbnRpYXRlRmFjZXQoLyogZmFjZXRPcHRzICovIGZhY2V0Q2xhc3MsIGZjdCkge1xuXHRcdC8vIHZhciBmYWNldENsYXNzID0gdGhpcy5mYWNldHNbZmN0XTtcblx0XHR2YXIgZmFjZXRPcHRzID0gZmFjZXRzT3B0aW9uc1tmY3RdO1xuXHRcdGRlbGV0ZSBmYWNldHNPcHRpb25zW2ZjdF07XG5cblx0XHRmYWNldHNbZmN0XSA9IHtcblx0XHRcdGVudW1lcmFibGU6IGZhbHNlLFxuXHRcdFx0dmFsdWU6IG5ldyBmYWNldENsYXNzKHRoaXMsIGZhY2V0T3B0cylcblx0XHR9O1xuXHR9XG59XG5cblxuLy8gZmFjdG9yeSB0aGF0IGNyZWF0ZXMgY2xhc3NlcyAoY29uc3RydWN0b3JzKSBmcm9tIHRoZSBtYXAgb2YgZmFjZXRzXG4vLyB0aGVzZSBjbGFzc2VzIGluaGVyaXQgZnJvbSBGYWNldGVkT2JqZWN0XG5GYWNldGVkT2JqZWN0LmNyZWF0ZUZhY2V0ZWRDbGFzcyA9IGZ1bmN0aW9uIChuYW1lLCBmYWNldHNDbGFzc2VzKSB7XG5cdGNoZWNrKG5hbWUsIFN0cmluZyk7XG5cdGNoZWNrKGZhY2V0c0NsYXNzZXMsIE1hdGNoLk9iamVjdEhhc2goRnVuY3Rpb24gLyogTWF0Y2guU3ViY2xhc3MoRmFjZXQsIHRydWUpIFRPRE8gLSBmaXggKi8pKTtcblxuXHR2YXIgRmFjZXRlZENsYXNzID0gXy5jcmVhdGVTdWJjbGFzcyh0aGlzLCBuYW1lLCB0cnVlKTtcblxuXHRfLmV4dGVuZFByb3RvKEZhY2V0ZWRDbGFzcywge1xuXHRcdGZhY2V0czogZmFjZXRzQ2xhc3Nlc1xuXHR9KTtcblx0cmV0dXJuIEZhY2V0ZWRDbGFzcztcbn07XG5cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIG1pbG8gPSB7XG5cdGJpbmQ6IHJlcXVpcmUoJy4vYmluZGVyL2JpbmQnKVxufVxuXG5pZiAodHlwZW9mIG1vZHVsZSA9PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cylcblx0Ly8gZXhwb3J0IGZvciBub2RlL2Jyb3dzZXJpZnlcblx0bW9kdWxlLmV4cG9ydHMgPSBtaWxvO1xuXG5pZiAodHlwZW9mIHdpbmRvdyA9PSAnb2JqZWN0Jylcblx0d2luZG93Lm1pbG8gPSBtaWxvO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ3Byb3RvJylcblx0LCBjaGVjayA9IHJlcXVpcmUoJy4vY2hlY2snKVxuXHQsIE1hdGNoID0gY2hlY2suTWF0Y2g7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2xhc3NSZWdpc3RyeTtcblxuZnVuY3Rpb24gQ2xhc3NSZWdpc3RyeSAoRm91bmRhdGlvbkNsYXNzKSB7XG5cdGlmIChGb3VuZGF0aW9uQ2xhc3MpXG5cdFx0dGhpcy5zZXRDbGFzcyhGb3VuZGF0aW9uQ2xhc3MpO1xuXG5cdC8vIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnX19yZWdpc3RlcmVkQ2xhc3NlcycsIHtcblx0Ly8gXHRcdGVudW1lcmFibGU6IGZhbHNlLFxuXHQvLyBcdFx0d3JpdGFibGU6IHRydWUsXG5cdC8vIFx0XHRjb25maWd1cmFibGU6IHRydWUsXG5cdC8vIFx0XHR2YWx1ZToge31cblx0Ly8gfSk7XG5cblx0dGhpcy5fX3JlZ2lzdGVyZWRDbGFzc2VzID0ge307XG59XG5cbl8uZXh0ZW5kUHJvdG8oQ2xhc3NSZWdpc3RyeSwge1xuXHRhZGQ6IHJlZ2lzdGVyQ2xhc3MsXG5cdGdldDogZ2V0Q2xhc3MsXG5cdHJlbW92ZTogdW5yZWdpc3RlckNsYXNzLFxuXHRjbGVhbjogdW5yZWdpc3RlckFsbENsYXNzZXMsXG5cdHNldENsYXNzOiBzZXRGb3VuZGF0aW9uQ2xhc3Ncbn0pO1xuXG5cbmZ1bmN0aW9uIHNldEZvdW5kYXRpb25DbGFzcyhGb3VuZGF0aW9uQ2xhc3MpIHtcblx0Y2hlY2soRm91bmRhdGlvbkNsYXNzLCBGdW5jdGlvbik7XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnRm91bmRhdGlvbkNsYXNzJywge1xuXHRcdGVudW1lcmFibGU6IHRydWUsXG5cdFx0dmFsdWU6IEZvdW5kYXRpb25DbGFzc1xuXHR9KTtcbn1cblxuZnVuY3Rpb24gcmVnaXN0ZXJDbGFzcyhhQ2xhc3MsIG5hbWUpIHtcblx0bmFtZSA9IG5hbWUgfHwgYUNsYXNzLm5hbWU7XG5cblx0Y2hlY2sobmFtZSwgU3RyaW5nLCAnY2xhc3MgbmFtZSBtdXN0IGJlIHN0cmluZycpO1xuXHRjaGVjayhuYW1lLCBNYXRjaC5XaGVyZShmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gdHlwZW9mIG5hbWUgPT0gJ3N0cmluZycgJiYgbmFtZSAhPSAnJztcblx0fSksICdjbGFzcyBuYW1lIG11c3QgYmUgc3RyaW5nJyk7XG5cdGlmICh0aGlzLkZvdW5kYXRpb25DbGFzcykge1xuXHRcdGlmIChhQ2xhc3MgIT0gdGhpcy5Gb3VuZGF0aW9uQ2xhc3MpXG5cdFx0XHRjaGVjayhhQ2xhc3MsIE1hdGNoLlN1YmNsYXNzKHRoaXMuRm91bmRhdGlvbkNsYXNzKSwgJ2NsYXNzIG11c3QgYmUgYSBzdWIoY2xhc3MpIG9mIGEgZm91bmRhdGlvbiBjbGFzcycpO1xuXHR9IGVsc2Vcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdmb3VuZGF0aW9uIGNsYXNzIG11c3QgYmUgc2V0IGJlZm9yZSBhZGRpbmcgY2xhc3NlcyB0byByZWdpc3RyeScpO1xuXG5cdGlmICh0aGlzLl9fcmVnaXN0ZXJlZENsYXNzZXNbbmFtZV0pXG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignaXMgYWxyZWFkeSByZWdpc3RlcmVkJyk7XG5cblx0dGhpcy5fX3JlZ2lzdGVyZWRDbGFzc2VzW25hbWVdID0gYUNsYXNzO1xufTtcblxuXG5mdW5jdGlvbiBnZXRDbGFzcyhuYW1lKSB7XG5cdGNoZWNrKG5hbWUsIFN0cmluZywgJ2NsYXNzIG5hbWUgbXVzdCBiZSBzdHJpbmcnKTtcblx0cmV0dXJuIHRoaXMuX19yZWdpc3RlcmVkQ2xhc3Nlc1tuYW1lXTtcbn07XG5cblxuZnVuY3Rpb24gdW5yZWdpc3RlckNsYXNzKG5hbWVPckNsYXNzKSB7XG5cdGNoZWNrKG5hbWVPckNsYXNzLCBNYXRjaC5PbmVPZihTdHJpbmcsIEZ1bmN0aW9uKSwgJ2NsYXNzIG9yIG5hbWUgbXVzdCBiZSBzdXBwbGllZCcpO1xuXG5cdHZhciBuYW1lID0gdHlwZW9mIG5hbWVPckNsYXNzID09ICdzdHJpbmcnXG5cdFx0XHRcdFx0XHQ/IG5hbWVPckNsYXNzXG5cdFx0XHRcdFx0XHQ6IG5hbWVPckNsYXNzLm5hbWU7XG5cdFx0XHRcdFx0XHRcblx0aWYgKCEgdGhpcy5fX3JlZ2lzdGVyZWRDbGFzc2VzW25hbWVdKVxuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ2NsYXNzIGlzIG5vdCByZWdpc3RlcmVkJyk7XG5cblx0ZGVsZXRlIHRoaXMuX19yZWdpc3RlcmVkQ2xhc3Nlc1tuYW1lXTtcbn07XG5cblxuZnVuY3Rpb24gdW5yZWdpc3RlckFsbENsYXNzZXMoKSB7XG5cdHRoaXMuX19yZWdpc3RlcmVkQ2xhc3NlcyA9IHt9O1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIF87XG52YXIgcHJvdG8gPSBfID0ge1xuXHRleHRlbmRQcm90bzogZXh0ZW5kUHJvdG8sXG5cdGV4dGVuZDogZXh0ZW5kLFxuXHRjbG9uZTogY2xvbmUsXG5cdGNyZWF0ZVN1YmNsYXNzOiBjcmVhdGVTdWJjbGFzcyxcblx0YWxsS2V5czogT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMuYmluZChPYmplY3QpLFxuXHRrZXlPZjoga2V5T2YsXG5cdGFsbEtleXNPZjogYWxsS2V5c09mLFxuXHRlYWNoS2V5OiBlYWNoS2V5LFxuXHRtYXBLZXlzOiBtYXBLZXlzXG59O1xuXG5cbmlmICh0eXBlb2Ygd2luZG93ID09ICdvYmplY3QnKSB7XG5cdC8vIHByZXNlcnZlIGV4aXN0aW5nIF8gb2JqZWN0XG5cdGlmICh3aW5kb3cuXylcblx0XHRwcm90by51bmRlcnNjb3JlID0gd2luZG93Ll9cblxuXHQvLyBleHBvc2UgZ2xvYmFsIF9cblx0d2luZG93Ll8gPSBwcm90bztcbn1cblxuaWYgKHR5cGVvZiBtb2R1bGUgPT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpXG5cdC8vIGV4cG9ydCBmb3Igbm9kZS9icm93c2VyaWZ5XG5cdG1vZHVsZS5leHBvcnRzID0gcHJvdG87XG5cdFxuXG5mdW5jdGlvbiBleHRlbmRQcm90byhzZWxmLCBtZXRob2RzKSB7XG5cdHZhciBwcm9wRGVzY3JpcHRvcnMgPSB7fTtcblxuXHRfLmVhY2hLZXkobWV0aG9kcywgZnVuY3Rpb24obWV0aG9kLCBuYW1lKSB7XG5cdFx0cHJvcERlc2NyaXB0b3JzW25hbWVdID0ge1xuXHRcdFx0ZW51bWVyYWJsZTogZmFsc2UsXG5cdFx0XHRjb25maWd1cmFibGU6IGZhbHNlLFxuXHRcdFx0d3JpdGFibGU6IGZhbHNlLFxuXHRcdFx0dmFsdWU6IG1ldGhvZFxuXHRcdH07XG5cdH0pO1xuXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHNlbGYucHJvdG90eXBlLCBwcm9wRGVzY3JpcHRvcnMpO1xuXHRyZXR1cm4gc2VsZjtcbn1cblxuZnVuY3Rpb24gZXh0ZW5kKHNlbGYsIG9iaiwgb25seUVudW1lcmFibGUpIHtcblx0dmFyIHByb3BEZXNjcmlwdG9ycyA9IHt9O1xuXG5cdF8uZWFjaEtleShvYmosIGZ1bmN0aW9uKHZhbHVlLCBwcm9wKSB7XG5cdFx0dmFyIGRlc2NyaXB0b3IgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG9iaiwgcHJvcCk7XG5cdFx0cHJvcERlc2NyaXB0b3JzW3Byb3BdID0gZGVzY3JpcHRvcjtcblx0fSwgdGhpcywgb25seUVudW1lcmFibGUpO1xuXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHNlbGYsIHByb3BEZXNjcmlwdG9ycyk7XG5cblx0cmV0dXJuIHNlbGY7XG59XG5cbmZ1bmN0aW9uIGNsb25lKG9iaikge1xuXHR2YXIgY2xvbmVkT2JqZWN0ID0gT2JqZWN0LmNyZWF0ZShvYmouY29uc3RydWN0b3IucHJvdG90eXBlKTtcblxuXHRfLmV4dGVuZChjbG9uZWRPYmplY3QsIG9iaik7XG5cblx0cmV0dXJuIGNsb25lZE9iamVjdDtcbn1cblxuZnVuY3Rpb24gY3JlYXRlU3ViY2xhc3ModGhpc0NsYXNzLCBuYW1lLCBhcHBseUNvbnN0cnVjdG9yKSB7XG5cdHZhciBzdWJjbGFzcztcblxuXHQvLyBuYW1lIGlzIG9wdGlvbmFsXG5cdG5hbWUgPSBuYW1lIHx8ICcnO1xuXG5cdC8vIGFwcGx5IHN1cGVyY2xhc3MgY29uc3RydWN0b3Jcblx0dmFyIGNvbnN0cnVjdG9yQ29kZSA9IGFwcGx5Q29uc3RydWN0b3IgPT09IGZhbHNlXG5cdFx0XHQ/ICcnXG5cdFx0XHQ6ICd0aGlzQ2xhc3MuYXBwbHkodGhpcywgYXJndW1lbnRzKTsnO1xuXG5cdGV2YWwoJ3N1YmNsYXNzID0gZnVuY3Rpb24gJyArIG5hbWUgKyAnKCl7ICcgKyBjb25zdHJ1Y3RvckNvZGUgKyAnIH0nKTtcblxuXHQvLyBwcHJvdG90eXBlIGNoYWluXG5cdHN1YmNsYXNzLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUodGhpc0NsYXNzLnByb3RvdHlwZSk7XG5cdC8vIHN1YmNsYXNzIGlkZW50aXR5XG5cdHN1YmNsYXNzLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IHN1YmNsYXNzO1xuXHQvLyBjb3B5IGNsYXNzIG1ldGhvZHNcblx0Ly8gLSBmb3IgdGhlbSB0byB3b3JrIGNvcnJlY3RseSB0aGV5IHNob3VsZCBub3QgZXhwbGljdGx5IHVzZSBzdXBlcmNsYXNzIG5hbWVcblx0Ly8gYW5kIHVzZSBcInRoaXNcIiBpbnN0ZWFkXG5cdF8uZXh0ZW5kKHN1YmNsYXNzLCB0aGlzQ2xhc3MsIHRydWUpO1xuXG5cdHJldHVybiBzdWJjbGFzcztcbn1cblxuXG5mdW5jdGlvbiBrZXlPZihzZWxmLCBzZWFyY2hFbGVtZW50LCBvbmx5RW51bWVyYWJsZSkge1xuXHR2YXIgcHJvcGVydGllcyA9IG9ubHlFbnVtZXJhYmxlIFxuXHRcdFx0XHRcdFx0PyBPYmplY3Qua2V5cyhzZWxmKVxuXHRcdFx0XHRcdFx0OiBfLmFsbEtleXMoc2VsZik7XG5cblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wZXJ0aWVzLmxlbmd0aDsgaSsrKVxuXHRcdGlmIChzZWFyY2hFbGVtZW50ID09PSBzZWxmW3Byb3BlcnRpZXNbaV1dKVxuXHRcdFx0cmV0dXJuIHByb3BlcnRpZXNbaV07XG5cdFxuXHRyZXR1cm4gdW5kZWZpbmVkO1xufVxuXG5cbmZ1bmN0aW9uIGFsbEtleXNPZihzZWxmLCBzZWFyY2hFbGVtZW50LCBvbmx5RW51bWVyYWJsZSkge1xuXHR2YXIgcHJvcGVydGllcyA9IG9ubHlFbnVtZXJhYmxlIFxuXHRcdFx0XHRcdFx0PyBPYmplY3Qua2V5cyhzZWxmKVxuXHRcdFx0XHRcdFx0OiBfLmFsbEtleXMoc2VsZik7XG5cblx0dmFyIGtleXMgPSBwcm9wZXJ0aWVzLmZpbHRlcihmdW5jdGlvbihwcm9wKSB7XG5cdFx0cmV0dXJuIHNlYXJjaEVsZW1lbnQgPT09IHNlbGZbcHJvcF07XG5cdH0pO1xuXG5cdHJldHVybiBrZXlzO1xufVxuXG5cbmZ1bmN0aW9uIGVhY2hLZXkoc2VsZiwgY2FsbGJhY2ssIHRoaXNBcmcsIG9ubHlFbnVtZXJhYmxlKSB7XG5cdHZhciBwcm9wZXJ0aWVzID0gb25seUVudW1lcmFibGUgXG5cdFx0XHRcdFx0XHQ/IE9iamVjdC5rZXlzKHNlbGYpXG5cdFx0XHRcdFx0XHQ6IF8uYWxsS2V5cyhzZWxmKTtcblxuXHRwcm9wZXJ0aWVzLmZvckVhY2goZnVuY3Rpb24ocHJvcCkge1xuXHRcdGNhbGxiYWNrLmNhbGwodGhpc0FyZywgc2VsZltwcm9wXSwgcHJvcCwgc2VsZik7XG5cdH0pO1xufVxuXG5cbmZ1bmN0aW9uIG1hcEtleXMoc2VsZiwgY2FsbGJhY2ssIHRoaXNBcmcsIG9ubHlFbnVtZXJhYmxlKSB7XG5cdHZhciBtYXBSZXN1bHQgPSB7fTtcblx0Xy5lYWNoS2V5KHNlbGYsIG1hcFByb3BlcnR5LCB0aGlzQXJnLCBvbmx5RW51bWVyYWJsZSk7XG5cdHJldHVybiBtYXBSZXN1bHQ7XG5cblx0ZnVuY3Rpb24gbWFwUHJvcGVydHkodmFsdWUsIGtleSkge1xuXHRcdHZhciBkZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihzZWxmLCBrZXkpO1xuXHRcdGlmIChkZXNjcmlwdG9yLmVudW1lcmFibGUgfHwgISBvbmx5RW51bWVyYWJsZSkge1xuXHRcdFx0ZGVzY3JpcHRvci52YWx1ZSA9IGNhbGxiYWNrLmNhbGwodGhpcywgdmFsdWUsIGtleSwgc2VsZik7XG5cdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkobWFwUmVzdWx0LCBrZXksIGRlc2NyaXB0b3IpO1xuXHRcdH1cblx0fVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5kZXNjcmliZSgnbWlsbyBiaW5kZXInLCBmdW5jdGlvbigpIHtcbiAgICBpdCgnc2hvdWxkIGJpbmQgY29tcG9uZW50cyBiYXNlZCBvbiBtbC1iaW5kIGF0dHJpYnV0ZScsIGZ1bmN0aW9uKCkge1xuICAgIFx0dmFyIG1pbG8gPSByZXF1aXJlKCcuLi8uLi9saWIvbWlsbycpO1xuXG5cdFx0ZXhwZWN0KHtwOiAxfSkucHJvcGVydHkoJ3AnLCAxKTtcblxuICAgIFx0dmFyIGNvbXBvbmVudHMgPSBtaWxvLmJpbmQoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3ZpZXdUb0JpbmQnKSk7XG4gICAgXHRcblx0XHRjb25zb2xlLmxvZyhjb21wb25lbnRzKTtcbiAgICB9KTtcbn0pO1xuIl19
;