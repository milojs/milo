// A minimalist browser framework that binds HTML elements to JS components and components to models.
'use strict';

// Main Modules
// ------------
// - .[loader](#loader) - loading subviews into page
// - .[binder](#binder) - components instantiation and binding of DOM elements to them
// - .[minder](#minder) - data reactivity, one or two way, shallow or deep, as you like it
// - .[mail](#mail) - applicaiton level messenger
// - .[config](#config) - milo configuration
// - .[utils](#utils) - logger, request, check, etc.
// - .[classes](#classes) - foundation classes and class registries

var milo = {
	loader: require('./loader'),
	binder: require('./binder'),
	mail: require('./mail'),
	config: require('./config'),
	util: require('./util'),
	classes: require('./classes')
}


// included facets
require('./components/c_facets/Dom');
require('./components/c_facets/Data');
require('./components/c_facets/Frame');
require('./components/c_facets/Events');
require('./components/c_facets/Template');
require('./components/c_facets/Container');
require('./components/c_facets/ModelFacet');
require('./components/c_facets/Drag');
require('./components/c_facets/Drop');
require('./components/c_facets/Editable');
require('./components/c_facets/Split');
require('./components/c_facets/List');
require('./components/c_facets/Item');

// included components
require('./components/classes/View');


// export for node/browserify
if (typeof module == 'object' && module.exports)	
	module.exports = milo;

// global milo for browser
if (typeof window == 'object')
	window.milo = milo;

// <a name="loader"></a>
// milo.loader
// -----------

// milo.loader loads subviews into the page. It scans the document inside rootElement looking for ml-load attribute that should contain URL of HTML fragment that will be loaded inside the element with this attribute.

// milo.loader returns the map of references to elements with their IDs used as keys.

// ### Example

// html

// ```html
// <body>
//     <div id="view1" ml-load="view1.html"></div>
//     <div>
//         <div id="view2" ml-load="view3.html"></div>
//     </div>
// </body>
// ```

// javascript

// ```javascript
// var views = milo.loader(); // document.body is used by default
// log(views);
// // {
// //     view1: div with id="view1"
// //     view2: div with id="view2"
// // }
// ```

'use strict';

var miloMail = require('./mail')
	, request = require('./util/request')
	, logger = require('./util/logger')
	, utilDom = require('./util/dom')
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
	if (utilDom.filterNodeListByType(el.childNodes, 1).length)
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


// <a name="binder"></a>
// milo.binder
// -----------

// milo.binder recursively scans the document tree inside scopeElement
// (document.body by default) looking for __ml-bind__ attribute that should
// contain the class, additional facets and the name of the component
// that should be created and bound to the element.

// Possible values of __ml-bind__ attribute:

// - :myView - only component name. An instance of Component class will be
//   created without any facets.
// - View:myView - class and component name. An instance of View class will be
//   created.
// - [Events, Data]:myView - facets and component name. An instance of Component
//   class will be created with the addition of facets Events and Data.
// - View[Events, Data]:myView - class, facet(s) and component name. An instance of
//   View class will be created with the addition of facets Events and Data.

// Created components will be returned as map with their names used as keys.
// Names within the scope should be therefore unique.

// If the component has _Scope_ facet, children of this element will be stored on the _Scope_ facet of this element as properties. Names of components within
// the scope whould be unique, but they can be the same as the names of components
// in outer scope (or some other).

'use strict';

var miloMail = require('./mail')
	, componentsRegistry = require('./components/c_registry')
	, facetsRegistry = require('./components/c_facets/cf_registry')
	, Component = componentsRegistry.get('Component')
	, ComponentInfo = require('./components/c_info')
	, Scope = require('./components/scope')
	, BindAttribute = require('./attribute/a_bind')
	, BinderError = require('./util/error').Binder
	, _ = require('mol-proto')
	, check = require('./util/check')
	, utilDom = require('./util/dom')
	, Match =  check.Match;


binder.scan = scan;
binder.create = create;
binder.twoPass = twoPass;


module.exports = binder;


function binder(scopeEl) {
	return createBinderScope(scopeEl, function(scope, el, attr) {
		var info = new ComponentInfo(scope, el, attr);
		return Component.create(info);
	});
}


// bind in two passes
function twoPass(scopeEl) {
	var scopeEl = scopeEl || document.body;
	var scanScope = binder.scan(scopeEl);
	return binder.create(scanScope);
}


// scan DOM for BindAttribute
function scan(scopeEl) {
	return createBinderScope(scopeEl, function(scope, el, attr) {
		return new ComponentInfo(scope, el, attr);
	});
}


// create bound components
function create(scanScope) {
	var scope = new Scope(scanScope._rootEl);

	scanScope._each(function(compInfo) {
		var aComponent = Component.create(compInfo);

		scope._add(aComponent, aComponent.name);
		if (aComponent.container)
			aComponent.container.scope = create(compInfo.container.scope);
	});

	return scope;
}


function createBinderScope(scopeEl, scopeObjectFactory) {
	var scopeEl = scopeEl || document.body
		, scope = new Scope(scopeEl);

	createScopeForElement(scope, scopeEl);
	
	return scope;


	function createScopeForElement(scope, el) {
		// get element's binding attribute (ml-bind by default)
		var attr = new BindAttribute(el);

		if (attr.node) {
			var scopeObject = scopeObjectFactory(scope, el, attr)
				, isContainer = typeof scopeObject != 'undefined' && scopeObject.container;
		}

		if (el.childNodes && el.childNodes.length) {
			var innerScope = createScopeForChildren(el);

			if (innerScope._length()) {
				// attach inner attributes to the current one (create a new scope) ...
				if (isContainer)
					scopeObject.container.scope = innerScope;
				else // or keep them in the current scope
					scope._copy(innerScope);;
			}
		}

		if (isContainer && ! scopeObject.container.scope)
			scopeObject.container.scope = new Scope(el);

		if (scopeObject)
			scope._add(scopeObject, attr.compName);

		postChildrenBoundMessage(el);

		return scopeObject;


		function postChildrenBoundMessage(el) {
			var elComp = Component.getComponent(el);
			if (elComp)
				elComp.postMessage('childrenbound');
		}
	}


	function createScopeForChildren(containerEl) {
		var scope = new Scope(containerEl);
		Array.prototype.forEach.call(utilDom.filterNodeListByType(containerEl.childNodes, 1), function(node) {
			createScopeForElement(scope, node);
		});
		return scope;
	}
}


// <a name="classes"></a>
// milo.classes
// -----------

// This module contains foundation classes and class registries.

'use strict';

var classes = {
	Facet: require('./facets/f_class'),
	Component: require('./components/c_class'),
	ComponentFacet: require('./components/c_facet'),
	ClassRegistry: require('./abstract/registry'),
	facetsRegistry: require('./components/c_facets/cf_registry'),
	componentsRegistry: require('./components/c_registry'),
	Model: require('./model')
};

module.exports = classes;


// <a name="config"></a>
// milo.config
// -----------

// It is the function that allows to change milo configurations and also
// access them on config's properties.

// ```javascript
// milo.config({
//     attrs: {
//         bind: 'ml-bind',
//         load: 'ml-load'
//     }
// });
// ```

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
	},
	componentRef: '___milo_component'
});


// <a name="minder"></a>
// milo.minder
// -----------

// This module will be used to create and manage reactive connections between 
// components and models (and, potentially, other models).

// It is not developed yet.

'use strict';

var Connector = require('./model/connector');


model.exports = minder;


// can accept array pf arrays to set up many
function minder(ds1, mode, ds2, options) {
	if (Array.isArray(ds1)) {
		var connDescriptions = ds1;
		var connectors = connDescriptions.map(function(descr) {
			return new Connector(descr[0], descr[1], descr[2], descr[3]);
		});
	} else
		return new Connector(ds1, mode, ds2, options);
}


// <a name="mail"></a>
// milo.mail
// -----------

// It is an application level messenger that is an instance of Messenger class.

// At the moment, in addition to application messages that you define, you can subscribe to __domready__ message that is guaranteed to fire once,
// even if DOM was ready at the time of the subscription.

// Messaging between frames is likely to be exposed via milo.mail.

// See Messenger.

'use strict';

var Messenger = require('../messenger')
	, MailMessageSource = require('./mail_source');


var mailMsgSource = new MailMessageSource();

var miloMail = new Messenger(undefined, undefined, mailMsgSource);

module.exports = miloMail;


// <a name="utils"></a>
// milo.utils
// -----------

'use strict';

var util = {
	logger: require('./logger'),
	request: require('./request'),
	check: require('./check'),
	error: require('./error'),
	count: require('./count'),
	dom: require('./dom')
};

module.exports = util;


// <a name="utils-logger"></a>
// milo.utils.logger
// -----------

// Application logger that has error, warn, info and debug
// methods, that can be suppressed by setting log level.

'use strict';

var Logger = require('./logger_class');

var logger = new Logger({ level: 3 });

module.exports = logger;


// ### Logger Class

// Properties:

// - level

//   - 0 - error
//   - 1 - warn
//   - 2 - info
//   - 3 - debug (default)

// - enabled

//   true by default. Set to false to disable all logging in browser console.

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


// <a name="utils-count"></a>
// milo.utils.count
// ----------------

'use strict';

var count = 0;

function componentCount() {
	count++;
	return count;
}

componentCount.get = function() {
	return count;
}

module.exports = componentCount;


// <a name="utils-dom"></a>
// milo.utils.dom
// -----------

'use strict';


module.exports = {
	filterNodeListByType: filterNodeListByType
};

// type 1: html element, type 3: text
function filterNodeListByType(nodeList, type) {
	var filteredNodes = [];
	Array.prototype.forEach.call(nodeList, function (node) {
		if (node.nodeType == type)
			filteredNodes.push(node);
	});
	return filteredNodes;
}


// <a name="utils-error"></a>
// milo.utils.error
// -----------

'use strict';

var _ = require('mol-proto');


// module exports error classes for all names defined in this array
var errorClassNames = ['AbstractClass', 'Mixin', 'Messenger', 'ComponentDataSource',
					   'Attribute', 'Binder', 'Loader', 'MailMessageSource', 'Facet',
					   'Scope', 'EditableEventsSource', 'Model', 'DomFacet', 'EditableFacet',
					   'List', 'Connector'];

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


// <a name="utils-check"></a>
// milo.utils.check
// -----------

// Check is a module for parameters checking extracted from Meteor framework.

// It allows to both document and to check parameter types in your function
// making code both readable and stable.


// ### Usage

//     var check = milo.check
//         , Match = check.Match;

//     function My(name, obj, cb) {
//         // if any of checks fail an error will be thrown
//         check(name, String);
//         check(obj, Match.ObjectIncluding({ options: Object }));
//         check(cb, Function);

//         // ... your code
//     }

// See [Meteor docs](http://docs.meteor.com/#match) to see how it works


// ### Patterns

// All patterns and functions described in Meteor docs work.

// Unlike in Meteor, Object pattern matches instance of any class,
// not only plain object.

// In addition to patterns described in Meteor docs the following patterns are implemented

// * Match.__ObjectHash__(_pattern_)

//   Matches an object where all properties match a given pattern

// * Match.__Subclass__(_constructor_ [, _matchThisClassToo_])

//   Matches a class that is a subclass of a given class. If the second parameter
//   is true, it will also match the class itself.

//   Without this pattern to check if _MySubclass_ is a subclass of _MyClass_
//   you would have to use

//       check(MySubclass, Match.Where(function() {
//           return MySubclass.prototype instanceof MyClass;
//       });

'use strict';

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



// <a name="utils-request"></a>
// milo.utils.request
// -----------

// example

// ```javascript
// var request = milo.utils.request
//     , opts: { method: 'GET' };

// request(url, opts, function(err, data) {
//     log(data);
// });

// request.get(url, function(err, data) {
//     log(data);
// });
// ```

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


// <a name="facet-c"></a>
// facet class
// --------------

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


// <a name="facet-o"></a>
// facetted object class
// --------------

// Component class is based on an abstract ```FacetedObject``` class that can be
// applied to any domain where objects can be represented via collection of facets
// (a facet is an object of a certain class, it holds its own configuration,
// data and methods).

// In a way, facets pattern is an inversion of adapter pattern - while the latter
// allows finding a class/methods that has specific functionality, faceted object
// is simply constructed to have these functionalities. In this way it is possible
// to create a virtually unlimited number of component classes with a very limited
// number of building blocks without having any hierarchy of classes - all components
// inherit directly from Component class.

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


// <a name="components-facet-registry"></a>
// ###component facet registry

// An instance of ClassRegistry class that is used by milo to register and find facets.

'use strict';

var ClassRegistry = require('../../abstract/registry')
	, ComponentFacet = require('../c_facet');

var facetsRegistry = new ClassRegistry(ComponentFacet);

facetsRegistry.add(ComponentFacet);

module.exports = facetsRegistry;

// TODO - refactor components registry test into a function
// that tests a registry with a given foundation class
// Make test for this registry based on this function

// <a name="components-facets-container"></a>
// ###container facet

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


// <a name="components-facets-data"></a>
// ###data facet

'use strict';

var ComponentFacet = require('../c_facet')
	, facetsRegistry = require('./cf_registry')

	, Messenger = require('../../messenger')
	, ComponentDataSource = require('../c_message_sources/component_data_source')
	, pathUtils = require('../../model/path_utils')

	, _ = require('mol-proto')
	, logger = require('../../util/logger');


// data model connection facet
var Data = _.createSubclass(ComponentFacet, 'Data');

_.extendProto(Data, {
	init: init,
	get: get,
	set: set,
	path: path,
	_setScalarValue: _setScalarValue,
	_getScalarValue: _getScalarValue
});

facetsRegistry.add(Data);

module.exports = Data;


// Initialize Data Facet
function init() {
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


// Set components DOM value
function set(value) {
	if (typeof value == 'object') {
		if (Array.isArray(value))
			value.forEach(function(item, index) {
				var childDataFacet = this.path('[' + index + ']', true); // true will create item in list
				if (childDataFacet)
					childDataFacet.set(item);
				else
					logger.warn('attempt to set data on path that does not exist: ' + '[' + index + ']');
			}, this);
		else
			_.eachKey(value, function(item, key) {
				var childDataFacet = this.path('.' + key);
				if (childDataFacet)
					childDataFacet.set(item);
				else
					logger.warn('attempt to set data on path that does not exist: ' + '.' + key);
			}, this);
	} else
		this._setScalarValue(value);
}


function _setScalarValue(value) {
	var el = this.owner.el
		, setter = tags[el.tagName.toLowerCase()];
	if (setter)
		setter(el, value);
	else
		el.innerHTML = value;
}


// get structured data from scope hierarchy
function get() {
	var comp = this.owner
		, scopeData;

	if (comp.list) {
		scopeData = [];
		comp.list.each(function(listItem, index) {
			scopeData[index] = listItem.data.get();
		});

		if (comp.container)
			comp.container.scope._each(function(scopeItem, name) {
				if (! comp.list.contains(scopeItem) && scopeItem.data)
					scopeData[name] = scopeItem.data.get();
			});
	} else if (comp.container) {
		scopeData = {};
		comp.container.scope._each(function(scopeItem, name) {
			scopeData[name] = scopeItem.data.get();
		});
	} else
		return this._getScalarValue();

	return scopeData;
}


function _getScalarValue() {
	var el = this.owner.el
		, getter = tags[el.tagName.toLowerCase()];
	return getter
			 ? getter(el)
			 : el.innerHTML;
}


// returns data facet of a child component (by scopes) corresponding to the path
function path(accessPath, createItem) {
	var parsedPath = pathUtils.parseAccessPath(accessPath)
		, currentComponent = this.owner;

	for (var i = 0, len = parsedPath.length; i < len; i++) {
		var pathNode = parsedPath[i]
			, nodeKey = pathUtils.getPathNodeKey(pathNode);
		if (pathNode.syntax == 'array' && currentComponent.list) {
			var itemComponent = currentComponent.list.item(nodeKey);
			if (! itemComponent && createItem)
				itemComponent = currentComponent.list.addItem(nodeKey);
			if (itemComponent)
				currentComponent = itemComponent;
		} else if (currentComponent.container)
			currentComponent = currentComponent.container.scope[nodeKey];

		if (! currentComponent || ! currentComponent.data)
			break;
	}

	return currentComponent && currentComponent.data;
}


// Set value rules
var tags = {
	'input': inputValue
}


// Set and get value of input
function inputValue(el, value) {
	if (value)
		el.value = value;
	else
		return el.value;
}


// <a name="components-facets-dom"></a>
// ###dom facet

'use strict';

var ComponentFacet = require('../c_facet')
	, facetsRegistry = require('./cf_registry')	
	, _ = require('mol-proto')
	, check = require('../../util/check')
	, Match = check.Match
	, binder = require('../../binder')
	, BindAttribute = require('../../attribute/a_bind')
	, DomFacetError = require('../../util/error').DomFacet;


// data model connection facet
var Dom = _.createSubclass(ComponentFacet, 'Dom');

_.extendProto(Dom, {
	init: init,
	start: start,

	show: show,
	hide: hide,
	remove: remove,
	append: append,
	prepend: prepend,
	appendChildren: appendChildren,
	prependChildren: prependChildren,
	insertAfter: insertAfter,
	insertBefore: insertBefore,
	setStyle: setStyle,
	copy: copy,

	find: find,
	hasTextBeforeSelection: hasTextBeforeSelection
	// _reattach: _reattachEventsOnElementChange
});

facetsRegistry.add(Dom);

module.exports = Dom;


// initialize Dom facet
function init() {
	ComponentFacet.prototype.init.apply(this, arguments);
}

// start Dom facet
function start() {
	if (this.config.cls)
		this.owner.el.classList.add(this.config.cls);
}

// show HTML element of component
function show() {
	this.owner.el.style.display = 'block';
}

// hide HTML element of component
function hide() {
	this.owner.el.style.display = 'none';
}

function setStyle(property, value) {
	this.owner.el.style[property] = value;
}


// create a copy of DOM element using facet config if set
function copy(isDeep) {
	var tagName = this.config.tagName;
	if (! this.config.tagName)
		return this.owner.el.cloneNode(isDeep);

	var newEl = document.createElement(tagName);

	var attributes = this.config.attributes;
	if (attributes)
		_.eachKey(attributes, function(attrValue, attrName) {
			newEl.setAttribute(attrName, attrValue);
		});

	return newEl;
}


// remove HTML element of component
function remove() {
	var thisEl = this.owner.el;
	thisEl.parentNode.removeChild(thisEl);
}

// append inside HTML element of component
function append(el) {
	this.owner.el.appendChild(el)
}

// prepend inside HTML element of component
function prepend(el) {
	var thisEl = this.owner.el
		, firstChild = thisEl.firstChild;
	if (firstChild)
		thisEl.insertBefore(el, firstChild);
	else
		thisEl.appendChild(el);
}

// appends children of element inside this component's element
function appendChildren(el) {
	while(el.childNodes.length)
		this.append(el.childNodes[0]);
}

// prepends children of element inside this component's element
function prependChildren(el) {
	while(el.childNodes.length)
		this.prepend(el.childNodes[el.childNodes.length - 1]);
}

function insertAfter(el) {
	var thisEl = this.owner.el
		, parent = thisEl.parentNode;
	parent.insertBefore(el, thisEl.nextSibling);
}

function insertBefore(el) {
	var thisEl = this.owner.el
		, parent = thisEl.parentNode;
	parent.insertBefore(el, thisEl);
}

var findDirections = {
	'up': 'previousNode',
	'down': 'nextNode'
};

// Finds component passing optional iterator's test
// in the same scope as the current component (this)
// by traversing DOM tree upwards (direction = "up")
// or downwards (direction = "down")
function find(direction, iterator) {
	if (! findDirections.hasOwnProperty(direction))
		throw new DomFacetError('incorrect find direction: ' + direction);

	var el = this.owner.el
		, scope = this.owner.scope
		, treeWalker = document.createTreeWalker(scope._rootEl, NodeFilter.SHOW_ELEMENT);

	treeWalker.currentNode = el;
	var nextNode = treeWalker[findDirections[direction]]()
		, componentsNames = Object.keys(scope)
		, found = false;

	while (nextNode) {
		var attr = new BindAttribute(nextNode);
		if (attr.node) {
			attr.parse().validate();
			if (scope.hasOwnProperty(attr.compName)) {
				var component = scope[attr.compName];
				if (! iterator || iterator(component)) {
					found = true;
					break;
				}
			}
		}
		treeWalker.currentNode = nextNode;
		nextNode = treeWalker[findDirections[direction]]();
	}

	if (found) return component;
}


// returns true if the element has text before selection
function hasTextBeforeSelection() {
	var selection = window.getSelection();
	if (! selection.isCollapsed) return true;
	if (selection.anchorOffset > 1) return true;

	// walk up the DOM tree to check if there are text nodes before cursor
	var treeWalker = document.createTreeWalker(this.owner.el, NodeFilter.SHOW_TEXT);
	return treeWalker.previousNode();
}



// <a name="components-facets-drag"></a>
// ###drag facet

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

	setHandle: setDragHandle,
	setDragData: setDragData
	// _reattach: _reattachEventsOnElementChange
});

facetsRegistry.add(Drag);

module.exports = Drag;


function initDragFacet() {
	ComponentFacet.prototype.init.apply(this, arguments);	
	this._createMessageSource(DOMEventsSource);
	this._dragData = {};
}


function setDragHandle(handleEl) {
	if (! this.owner.el.contains(handleEl))
		return logger.warn('drag handle should be inside element to be dragged')
	this._dragHandle = handleEl;
}

function setDragData(data) {
	this._dragData = data;
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
			dt.setData('x-application/milo-component', JSON.stringify(self._dragData));
		} else
			event.preventDefault();
	}

	function targetInDragHandle(event) {
		return ! self._dragHandle || self._dragHandle.contains(self._target);
	}
}


// <a name="components-facets-drop"></a>
// ###drop facet

'use strict';

var ComponentFacet = require('../c_facet')
	, facetsRegistry = require('./cf_registry')
	, DOMEventsSource = require('../c_message_sources/dom_events_source')

	, _ = require('mol-proto');


// generic drag handler, should be overridden
var Drop = _.createSubclass(ComponentFacet, 'Drop');

_.extendProto(Drop, {
	init: initDropFacet,
	start: startDropFacet
	// _reattach: _reattachEventsOnElementChange
});

facetsRegistry.add(Drop);

module.exports = Drop;


function initDropFacet() {
	ComponentFacet.prototype.init.apply(this, arguments);
	this._createMessageSource(DOMEventsSource);
}


function startDropFacet() {
	ComponentFacet.prototype.start.apply(this, arguments);
	this.on('dragenter dragover', onDragging);

	function onDragging(eventType, event) {
		var dataTypes = event.dataTransfer.types;
		if (dataTypes.indexOf('text/html') >= 0
				|| dataTypes.indexOf('x-application/milo-component') >= 0) {
			event.dataTransfer.dropEffect = 'move';
			event.preventDefault();
		}
	}
}

// <a name="components-facets-editable"></a>
// ###editable facet

'use strict';

var ComponentFacet = require('../c_facet')
	, Component = require('../c_class')
	, facetsRegistry = require('./cf_registry')
	, EditableEventsSource = require('../c_message_sources/editable_events_source')
	, logger = require('../../util/logger')
	, _ = require('mol-proto')
	, check = require('../../util').check
	, Match = check.Match;


// generic drag handler, should be overridden
var Editable = _.createSubclass(ComponentFacet, 'Editable');

_.extendProto(Editable, {
	init: init,
	start: start,
	makeEditable: makeEditable

	// _reattach: _reattachEventsOnElementChange
});

facetsRegistry.add(Editable);

module.exports = Editable;


// init Editable facets
function init() {
	ComponentFacet.prototype.init.apply(this, arguments);

	this._createMessageSource(EditableEventsSource, {
		editableOnClick: this.config.editableOnClick,
		moveToAdjacentEditable: this.config.moveToAdjacentEditable,
		allowMerge: this.config.allowMerge,
		acceptMerge: this.config.acceptMerge
	});

	this._editable = typeof this.config.editable != 'undefined'
						? this.config.editable
						: true;
}


function makeEditable(editable) {
	this.owner.el.setAttribute('contenteditable', editable);
}


// start Editable facet
function start() {
	ComponentFacet.prototype.start.apply(this, arguments);
	
	if (this._editable) {
		this.makeEditable(true);
		this.postMessage('editstart');
	}
	
	this.onMessages({
		'editstart': onEditStart,
		'editend': onEditEnd,
		// arrow keys events
		'previouseditable': makePreviousComponentEditable,
		'nexteditable': makeNextComponentEditable,
		// merge events
		'previousmerge': mergeToPreviousEditable,
		'nextmerge': mergeToNextEditable,
		'requestmerge': onRequestMerge,
		'mergeaccepted': onMergeAccepted,
		'performmerge': onPerformMerge,
		'mergeremove': onMergeRemove,
		// split events
		'enterkey': onEnterSplit
	});
}


function onEditStart(eventType, event) {
	this.makeEditable(true);
}


function onEditEnd(eventType, event) {
	this.makeEditable(false);
}

//
// Move caret to another editable
//
function makePreviousComponentEditable(eventType, event) {
	event.preventDefault();
	makeAdjacentComponentEditable(this.owner, 'up');
}

function makeNextComponentEditable(eventType, event) {
	event.preventDefault();
	makeAdjacentComponentEditable(this.owner, 'down');
}

function makeAdjacentComponentEditable(component, direction) {
	var adjacentComp = component.dom.find(direction, function(comp) {
		return comp.editable;
	});

	if (adjacentComp) {
		adjacentComp.editable.postMessage('editstart');
		adjacentComp.el.focus();
		
		var windowSelection = window.getSelection()
			, selectionRange = document.createRange();
		selectionRange.selectNodeContents(adjacentComp.el);
		if (direction == 'up')
			selectionRange.collapse(false);
		else
			selectionRange.collapse(true);
        windowSelection.removeAllRanges();
        windowSelection.addRange(selectionRange);
	}
}


//
// merge functionality
//
function mergeToPreviousEditable(eventType, event) {
	event.preventDefault();
	mergeToAdjacentEditable(this.owner, 'up');
}

function mergeToNextEditable(eventType, event) {
	mergeToAdjacentEditable(this.owner, 'down');
}

function mergeToAdjacentEditable(component, direction) {
	var adjacentComp = component.dom.find(direction, function(comp) {
		return comp.editable;
	});

	if (adjacentComp)
		adjacentComp.editable.postMessage('requestmerge', { sender: component });
}


// merge messages
function onRequestMerge(message, data) {
	check(data, Match.ObjectIncluding({ sender: Component }));

	var mergeComponent = data.sender;
	if (this.config.acceptMerge)
		mergeComponent.editable.postMessage('mergeaccepted', { sender: this.owner });
}

function onMergeAccepted(message, data) {
	check(data, Match.ObjectIncluding({ sender: Component }));

	var targetComponent = data.sender;

	this.owner.allFacets('clean');
	
	targetComponent.editable.postMessage('performmerge', { sender: this.owner });
}

function onPerformMerge(message, data) {
	check(data, Match.ObjectIncluding({ sender: Component }));
	if (! this.config.acceptMerge) {
		logger.error('performmerge message received by component that doesn\'t accept merge');
		return;
	}

	var mergeComponent = data.sender
		, windowSelection = window.getSelection()
		, selectionRange = document.createRange();

	// merge scopes
	this.owner.container.scope._merge(mergeComponent.container.scope);

	//Reference first element to be merged
	var firstMergeEl = mergeComponent.el.childNodes[0];

	// merge DOM
	this.owner.dom.appendChildren(mergeComponent.el);

	//Make the interface editable again like expected
	this.makeEditable(true);
	this.owner.el.focus();

	//Set the selection where it should be
	selectionRange.setStart(firstMergeEl);
	selectionRange.setEnd(firstMergeEl);
	windowSelection.removeAllRanges();
	windowSelection.addRange(selectionRange);

	// send remove message
	mergeComponent.editable.postMessage('mergeremove');
}


function onMergeRemove(message, data) {
	if (! this.config.allowMerge) {
		logger.error('mergeremove message received by component that doesn\'t allow merge');
		return;
	}

	this.owner.dom.remove();
	this.owner.remove();
}


function onEnterSplit(message, event) {
	var splitFacet = this.owner.split;
	if (splitFacet) {
		var newComp = splitFacet.make();
		event.preventDefault();
		newComp.editable.postMessage('editstart');
		newComp.el.focus();
	}
}


// <a name="components-facets-events"></a>
// ###events facet

'use strict';

var ComponentFacet = require('../c_facet')
	, facetsRegistry = require('./cf_registry')

	, Messenger = require('../../messenger')
	, DOMEventsSource = require('../c_message_sources/dom_events_source')

	, _ = require('mol-proto');


// events facet
var Events = _.createSubclass(ComponentFacet, 'Events');

_.extendProto(Events, {
	init: init,

	// _reattach: _reattachEventsOnElementChange
});

facetsRegistry.add(Events);

module.exports = Events;


// init Events facet
function init() {
	ComponentFacet.prototype.init.apply(this, arguments);

	var domEventsSource = new DOMEventsSource(this, { trigger: 'trigger' }, this.owner);

	this._setMessageSource(domEventsSource)

	Object.defineProperties(this, {
		_domEventsSource: { value: domEventsSource }
	});
}


// <a name="components-facets-frame"></a>
// ###frame facet

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

// <a name="components-facets-item"></a>
// ###item facet

'use strict';

var ComponentFacet = require('../c_facet')
    , facetsRegistry = require('./cf_registry')
    , Model = require('../../model')
    , _ = require('mol-proto')
    , miloMail = require('../../mail');


// data model connection facet
var ItemFacet = _.createSubclass(ComponentFacet, 'Item');

_.extendProto(ItemFacet, {
    require: ['Container', 'Dom', 'Data']
});

facetsRegistry.add(ItemFacet);

module.exports = ItemFacet;


// <a name="components-facets-list"></a>
// ###list facet

'use strict';

var ComponentFacet = require('../c_facet')
    , Component = require('../c_class')
    , facetsRegistry = require('./cf_registry')
    , Model = require('../../model')
    , _ = require('mol-proto')
    , miloMail = require('../../mail')
    , binder = require('../../binder')
    , ListError = require('../../util/error').List
    , logger = require('../../util/logger');


// data model connection facet
var List = _.createSubclass(ComponentFacet, 'List');

_.extendProto(List, {
    init: init,
    // update: update,
    require: ['Container', 'Dom', 'Data'],
    _itemPreviousComponent: _itemPreviousComponent,

    item: item,
    count: count,
    _setItem: _setItem,
    contains: contains,
    addItem: addItem,
    removeItem: removeItem,
    each: each
    // _reattach: _reattachEventsOnElementChange
});

facetsRegistry.add(List);

module.exports = List;


// initialize List facet
function init() {
    ComponentFacet.prototype.init.apply(this, arguments);
    var model = new Model()
        , self = this;

    _.defineProperties(this, {
        _listItems: [],
        _listItemsHash: {}
    });
    _.defineProperty(this, 'itemSample', null, false, false, true);

    this.owner.on('childrenbound', onChildrenBound);
}


//update list
// function update(eventType, data) {
//     var itemModels = data.newValue;

//     for (var i = 0; i < itemModels.length; i++) {
//         var itemModel = itemModels[i];

//         // Copy component
//         var component = Component.copy(this.listItemType, true);
        
//         // Bind contents of component
//         var temp = binder(component.el)[component.name];

//         // Set new component scope to bind result
//         component.container.scope = temp.container.scope;
        
//         // Set list item data of component
//         component.listItem.setData(itemModel);

//         // Add it to the dom
//         this.owner.dom.append(component.el);

//         // Add to list items hash
//         this.listItems[component.name] = component;

//         // Show the list item component
//         component.dom.show();
//     };
// }


function onChildrenBound() {
    var foundItem;

    // "this" is a component here, as a message dispatched on component
    this.container.scope._each(function(childComp, name) {
        if (childComp.item) {
            if (foundItem) throw new ListError('More than one child component has ListItem Facet')
            foundItem = childComp;
        }
    });

    if (! foundItem) throw new ListError('No child component has ListItem Facet');

    this.list.itemSample = foundItem;

    this.list.itemSample.dom.hide();
    this.list.itemSample.remove();
}


function item(index) {
    return this._listItems[index];
}


function count() {
    return this._listItems.length
}


function _setItem(index, component) {
    this._listItems[index] = component;
    this._listItemsHash[component.name] = component
}


function contains(component){
    return this._listItemsHash[component.name] == component;
}


function addItem(index) {
    index = index || this.count();
    if (this.item(index))
        throw ListError('attempt to create item with ID of existing item');

    // Copy component
    var component = Component.copy(this.itemSample, true);

    var tempComp = binder(component.el)[component.name]
        , innerScope = tempComp.container.scope;
    component.container.scope = innerScope;

    // Add it to the DOM
    this._itemPreviousComponent(index).dom.insertAfter(component.el)

    // Add to list items
    this._setItem(index, component);

    // Show the list item component
    component.dom.show();

    return component;
}


function removeItem(index, doSplice) {
    var comp = this.item(index);

    if (! comp)
        logger.warn('attempt to remove list item with id that does not exist');

    this._listItems[index] = undefined;
    delete this._listItemsHash[comp.name];
    comp.dom.remove();
    comp.remove();

    if (doSplice)
        this._listItems.splice(index, 1);
}


function _itemPreviousComponent(index) {
    while (index >= 0 && ! this._listItems[index])
        index--;

    return index >= 0
                ? this._listItems[index]
                : this.itemSample;
}


function each(callback, thisArg) {
    this._listItems.forEach(function(item) {
        if (item) callback.apply(this, arguments);
    }, thisArg || this);
}


// <a name="components-facets-model"></a>
// ###model facet

'use strict';

var ComponentFacet = require('../c_facet')
	, facetsRegistry = require('./cf_registry')
	, Model = require('../../model')

	, _ = require('mol-proto');


// generic drag handler, should be overridden
var ModelFacet = _.createSubclass(ComponentFacet, 'Model');

_.extendProto(ModelFacet, {
	init: initModelFacet,
	_createMessenger: _createMessenger
	// _reattach: _reattachEventsOnElementChange
});

facetsRegistry.add(ModelFacet);

module.exports = ModelFacet;


function initModelFacet() {
	this.m = new Model(this);

	ComponentFacet.prototype.init.apply(this, arguments);
}

function _createMessenger() { // Called by inherited init
	this.m.proxyMessenger(this); // Creates messenger's methods directly on facet
}


// <a name="components-facets-split"></a>
// ###split facet

'use strict';

var ComponentFacet = require('../c_facet')
	, Component = require('../c_class')
	, facetsRegistry = require('./cf_registry');

var Split = _.createSubclass(ComponentFacet, 'Split');

_.extendProto(Split, {
	init: init,
	start: start,
	make: make,

	isSplittable: isSplittable,
	_makeSplit: _makeSplit,

	require: ['Dom']

	// _reattach: _reattachEventsOnElementChange
});

facetsRegistry.add(Split);

module.exports = Split;


// init Split facet
function init() {
	ComponentFacet.prototype.init.apply(this, arguments);

	this._splitSender = undefined;
}


// start Split facet
function start() {
	ComponentFacet.prototype.start.apply(this, arguments);
}


// performs the split on selection
function make() {
	if (! this.isSplittable())
		return;

	if (! this.owner.dom.hasTextBeforeSelection())
		return; // should simply create empty component before

	return this._makeSplit();
}


function _makeSplit() {
	var thisComp = this.owner;

	// clone itself
	var newComp = Component.copy(thisComp);
	thisComp.dom.insertAfter(newComp.el);

	splitElement(thisComp.el, newComp.el);

	return newComp;
}


function splitElement(thisEl, newEl) {
	var selection = window.getSelection()
		, selNode = selection.anchorNode
		, selFound = false;

	Array.prototype.forEach.call(thisEl.childNodes, function(childNode) {
		if (childNode.contains(selNode) || childNode == selNode) {
			var comp = Component.getComponent(childNode);
			if (comp)
				comp.split._makeSplit();
			else {
				if (childNode.nodeType == Node.TEXT_NODE) {
					var selPos = selection.anchorOffset;
					var newText = childNode.splitText(selPos);
					newEl.appendChild(newText);
				} else {
					var newChildEl = childNode.cloneNode(false);
					newEl.appendChild(newChildEl);
					splitElement(childNode, newChildEl);
				}
			}

			selFound = true;
		} else if (selFound)
			newEl.appendChild(childNode);
	});
}


function isSplittable() {
	var selection = window.getSelection()
		, el = selection.anchorNode;

	if (! this.owner.el.contains(el)) {
		logger.warn('selection is outside this component');
		return false;
	}

	while (el != this.owner.el) {
		var comp = Component.getComponent(el);
		if (comp && ! comp.split)
			return false;
		el = el.parentNode;
	}

	return true;
}


// <a name="components-facets-template"></a>
// ###template facet

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
}


// <a name="components"></a>
// component class
// --------------

// Basic component class.

// It's constructor accepts DOM element and component name as paramenters.

// You do not need to use its constructor directly as binder module creates
// components when it scans DOM tree.

// You should use Component.createComponentClass method when you want to create
// a new component class from facets and their configuration.

'use strict';

var FacetedObject = require('../facets/f_object')
	, facetsRegistry = require('./c_facets/cf_registry')
	, ComponentFacet = require('./c_facet')
	, Messenger = require('../messenger')
	, _ = require('mol-proto')
	, check = require('../util/check')
	, Match = check.Match
	, config = require('../config')
	, miloCount = require('../util/count');


var Component = _.createSubclass(FacetedObject, 'Component', true);

module.exports = Component;


Component.createComponentClass = createComponentClass;
delete Component.createFacetedClass;


// class methods
_.extend(Component, {
	create: create,
	copy: copy,
	isComponent: isComponent,
	getComponent: getComponent,
	getContainingComponent: getContainingComponent
});

// instance methods
_.extendProto(Component, {
	init: init,
	addFacet: addFacet,
	allFacets: allFacets,
	remove: remove
});


//
// class methods
//

// create component from ComponentInfo
function create(info) {
	var ComponentClass = info.ComponentClass;
	var aComponent = new ComponentClass(info.scope, info.el, info.name, info);

	if (info.extraFacetsClasses)
		_.eachKey(info.extraFacetsClasses, function(FacetClass) {
			aComponent.addFacet(FacetClass);
		});

	return aComponent;
}


// creates a new instance with the same state but different element
function copy(component, deepCopyDOM) {
	var ComponentClass = component.constructor
		, newName = 'milo_' + miloCount()
		, newEl = component.dom 
					? component.dom.copy(deepCopyDOM)
					: component.el.cloneNode(deepCopyDOM)
		, newInfo = _.clone(component.componentInfo)
		, attr = _.clone(newInfo.attr);

	_.extend(attr, {
		el: newEl,
		compName: newName
	});

	attr.decorate();

	_.extend(newInfo, {
		el: newEl,
		name: newName,
		attr: attr
	});

	var aComponent = Component.create(newInfo);
	component.scope._add(aComponent, aComponent.name);

	return aComponent;
}


// checks if element is bound to a component
function isComponent(element) {
	return config.componentRef in element;
}

// gets the element bound the component
function getComponent(element) {
	return element && element[config.componentRef];
}

/**
 * Returns the closest component which contains the specified node
 *
 * This will return the current component of the node if it is a component.
 * 
 * @param {Node} node DOM Node
 * @return {Component|null}
 */
function getContainingComponent(node) {
	// Where the current node is a component it's component should be returned
	if (isComponent(node)) {
		return getComponent(node);
	}

	// Where there is no parent node, this function will return null
	if (!node.parentNode) {
		return null;
	}

	// The parent node is checked recursively
	return getContainingComponent(node.parentNode);
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

// initializes component
// Automatically called by inherited constructor of FacetedObject
// Subclasses should call inherited init methods:
// Component.prototype.init.apply(this, arguments)
function init(scope, element, name, componentInfo) {
	this.el = element;
	if (element)
		element[config.componentRef] = this;

	_.defineProperties(this, {
		name: name,
		scope: scope,
		componentInfo: componentInfo
	}, true);

	var messenger = new Messenger(this, Messenger.defaultMethods, undefined /* no messageSource */);

	_.defineProperty(this, '_messenger', messenger);

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

// envoke given method with optional parameters on all facets
function allFacets(method /* , ... */) {
	var args = Array.prototype.slice.call(arguments, 1);

	_.eachKey(this.facets, function(facet, fctName) {
		if (facet && typeof facet[method] == 'function')
			facet[method].apply(facet, args);
	});
}

// remove component from it's scope
function remove() {
	if (this.scope)
		delete this.scope[this.name];
}


// <a name="components-facet"></a>
// ###component facet class

// The class fot the facet of component. When a component is created, it
// creates all its facets.

// See Facets section on information about available facets and on 
// how to create new facets classes.

// - Component - basic compponent class
// - ComponentFacet - basic 

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
	_createMessenger: _createMessenger,
	_setMessageSource: _setMessageSource,
	_createMessageSource: _createMessageSource
});


function initComponentFacet() {
	this._createMessenger();
}


function _createMessenger(){
	var messenger = new Messenger(this, Messenger.defaultMethods, undefined /* no messageSource */);

	_.defineProperties(this, {
		_messenger: messenger
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


function _createMessageSource(MessageSourceClass, options) {
	var messageSource = new MessageSourceClass(this, undefined, this.owner, options);
	this._setMessageSource(messageSource)

	_.defineProperty(this, '_messageSource', messageSource);
}

// <a name="components-info"></a>
// ###component info class

'use strict';

var componentsRegistry = require('./c_registry')
	, facetsRegistry = require('./c_facets/cf_registry')
	, BinderError = require('../util/error').Binder;


module.exports = ComponentInfo;

// 
// Component information class
//
function ComponentInfo(scope, el, attr) {
	attr.parse().validate();

	this.scope = scope;
	this.el = el;
	this.attr = attr;
	this.name = attr.compName;
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


// <a name="components-registry"></a>
// ###component registry class

// An instance of ClassRegistry class that is used by milo to register and find components.

'use strict';

var ClassRegistry = require('../abstract/registry')
	, Component = require('./c_class');

var componentsRegistry = new ClassRegistry(Component);

componentsRegistry.add(Component);

module.exports = componentsRegistry;


// <a name="scope"></a>
// scope class
// -----------

'use strict';

var _ = require('mol-proto')
	, check = require('../util/check')
	, Match = check.Match
	, ScopeError = require('../util/error').Scope;


// Scope class
function Scope(rootEl) {
	Object.defineProperties(this, {
		_rootEl: { value: rootEl }
	})
};

_.extendProto(Scope, {
	_add: _add,
	_copy: _copy,
	_each: _each,
	_addNew: _addNew,
	_merge: _merge,
	_length: _length
});

module.exports = Scope;


var allowedNamePattern = /^[A-Za-z][A-Za-z0-9\_\$]*$/;


// adds object to scope throwing if name is notyunique
function _add(object, name) {
	if (this[name])
		throw new ScopeError('duplicate object name: ' + name);

	checkName(name);

	this[name] = object;
}




// copies all objects from one scope to another,
// throwing if some object is not unique
function _copy(aScope) {
	check(aScope, Scope);

	aScope._each(_add, this);
}


function _addNew(object, name) {
// TODO
}


function _merge(scope) {
// TODO
}


function _each(callback, thisArg) {
	_.eachKey(this, callback, thisArg || this, true); // enumerates enumerable properties only
}


function checkName(name) {
	if (! allowedNamePattern.test(name))
		throw new ScopeError('name should start from letter, this name is not allowed: ' + name);
}


// returns the number of objects in scope
function _length() {
	return Object.keys(this).length;
}


// <a name="components-source-data"></a>
// ###component data source

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


// <a name="components-source-dom"></a>
// ###component dom events source

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
	init: init,
	translateToSourceMessage: translateToSourceMessage,
 	addSourceListener: addSourceListener,
 	removeSourceListener: removeSourceListener,
 	filterSourceMessage: filterCapturedDomEvent,

 	// class specific methods
 	dom: dom,
 	handleEvent: handleEvent,  // event dispatcher - as defined by Event DOM API
 	trigger: triggerDomEvent
});

module.exports = DOMEventsSource;


var useCapturePattern = /__capture$/;


// init DOM event source
function init(hostObject, proxyMethods, component) {
	check(component, Component);
	MessageSource.prototype.init.apply(this, arguments);

	this.component = component;

	// this.messenger is set by Messenger class
}


// get DOM element of component
function dom() {
	return this.component.el;
}


// translate to DOM event
function translateToSourceMessage(message) {
	if (useCapturePattern.test(message))
		message = message.replace(useCapturePattern, '');
	return message;
}


// add listener to DOM event
function addSourceListener(eventType) {
	this.dom().addEventListener(eventType, this, false);
}


// remove listener from DOM event
function removeSourceListener(eventType) {
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

// <a name="components-dom-constructors"></a>
// ###dom events constructors

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


// <a name="components-source-editable"></a>
// ###component editable events source

'use strict';

var DOMEventsSource = require('./dom_events_source')
	, Component = require('../c_class')
	, EditableEventsSourceError = require('../../util/error').EditableEventsSource
	, _ = require('mol-proto')
	, check = require('../../util/check')
	, Match = check.Match;


// class to handle subscribtions to changes in DOM for UI (maybe also content editable) elements
var EditableEventsSource = _.createSubclass(DOMEventsSource, 'EditableEventsSource', true);


_.extendProto(EditableEventsSource, {
	// implementing MessageSource interface
	init: initEditableEventsSource,
	translateToSourceMessage: translateToDomEvent,
 	addSourceListener: addDomEventListener,
 	removeSourceListener: removeDomEventListener,
 	filterSourceMessage: filterEditableMessage,

 	// class specific methods
 	// dom: implemented in DOMEventsSource
 	handleEvent: handleEvent,  // event dispatcher - as defined by Event DOM API
 	trigger: triggerEditableEvent // redefines method of superclass DOMEventsSource
});

module.exports = EditableEventsSource;


function initEditableEventsSource(hostObject, proxyMethods, component, options) {
	DOMEventsSource.prototype.init.apply(this, arguments);
	this.options = options;
}


var editableEventsMap = {
	'enterkey': 'keypress',
	'editstart': 'mousedown',
	'editend': 'blur',
	// move events
	'nexteditable': 'keydown',
	'previouseditable': 'keydown',	
	'adjacenteditable': 'keydown',
	// merge events
	'nextmerge': 'keydown',
	'previousmerge': 'keydown',
	'adjacentmerge': 'keydown',
};

// TODO: this function should return relevant DOM event dependent on element tag
// Can also implement beforedatachanged event to allow preventing the change
function translateToDomEvent(message) {
	if (editableEventsMap.hasOwnProperty(message))
		return editableEventsMap[message];
	else
		return DOMEventsSource.prototype.translateToSourceMessage.call(this, message);
}


function addDomEventListener(eventType) {
	this.dom().addEventListener(eventType, this, false); // no capturing
}


function removeDomEventListener(eventType) {
	this.dom().removeEventListener(eventType, this, false); // no capturing
}


function filterEditableMessage(eventType, message, data) {
	var self = this;

	switch (message) {
		case 'enterkey':
		 	return data.keyCode == 13;

		// move to adjacent editable events
		case 'previouseditable':
			return this.options.moveToAdjacentEditable
				&& movedToPrevious(data);
		case 'nexteditable':
			return this.options.moveToAdjacentEditable
				&& movedToNext(data);
		case 'adjacenteditable':
			return this.options.moveToAdjacentEditable
				&& (movedToPrevious(data) || movedToNext(data));

		// merge adjacent editable events
		case 'previousmerge': // merge current one into previous on backspace key
			return this.options.allowMerge && mergeToPrevious(data)
		case 'nextmerge': // merge current one into previous on backspace key
			return this.options.allowMerge && mergeToNext(data)
		case 'adjacentmerge':
			return this.options.allowMerge
				&& (mergeToPrevious(data) || mergeToNext(data));

		case 'editstart':
		case 'editend':
			return this.options.editableOnClick;
		default:
			return true;
	}

	function movedToPrevious(data) {
		return (data.keyCode == 37 || data.keyCode == 38) // up and left
			&& noTextBeforeSelection(self.component);
	}

	function movedToNext(data) {
		return (data.keyCode == 39 || data.keyCode == 40) // down and right
			&& noTextAfterSelection(self.component);
	} 

	function mergeToPrevious(data) {
		return data.keyCode == 8 // backspace
			&& noTextBeforeSelection(self.component);
	}

	function mergeToNext(data) {
		return data.keyCode == 46 // delete
			&& noTextAfterSelection(self.component);
	}

	function noTextBeforeSelection(component) {
		return ! component.dom.hasTextBeforeSelection();
	};

	function noTextAfterSelection(component) {
		var sel = window.getSelection();
		if (sel.anchorOffset == sel.anchorNode.length) {
			if (sel.anchorNode.nextSibling) {
				return false;
			} else {
				return true;
			}
		}
	}
}


 // event dispatcher - as defined by Event DOM API
function handleEvent(event) {
	this.dispatchMessage(event.type, event);
}


function triggerEditableEvent(message, data) {
	// TODO - opposite translation + event trigger 
}


// <a name="components-source-iframe"></a>
// ###component iframe source

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


// <a name="model"></a>
// milo model
// -----------

'use strict';

var pathUtils = require('./path_utils')
	, Messenger = require('../messenger')
	, ModelError = require('../util/error').Model
	, Mixin = require('../abstract/mixin')
	, doT = require('dot')
	, _ = require('mol-proto')
	, check = require('../util/check')
	, Match = check.Match
	, fs = require('fs');

module.exports = Model;


function Model(scope, schema, name, data) {
	// modelPath should return a ModelPath object with "compiled" methods
	// to get/set model properties, to subscribe to property changes, etc.
	// "it" parameter is the object which properties can be referenced in path.
	// These references will be evaluated at run rather than at compile time
	var model = function modelPath(path, it) {
		return new ModelPath(model, path, it);
	}
	model.__proto__ = Model.prototype;

	var messenger = new Messenger(model, Messenger.defaultMethods);

	_.defineProperties(model, {
		scope: scope,
		name: name,
		_schema: schema,
		_messenger: messenger,
		__pathsCache: {}
	});

	model._wrapMessengerMethods();

	model._data = data;

	return model;
}

Model.prototype.__proto__ = Model.__proto__;


// cache of compiled ModelPath methods
var __synthesizedPathsMethods = {};

var dotDef = {
	modelAccessPrefix: 'this._model._data',
	modelPostMessageCode: 'this._model.postMessage',
	getPathNodeKey: pathUtils.getPathNodeKey
};

var modelSetterDotDef = {
	modelAccessPrefix: 'this._data',
	modelPostMessageCode: 'this.postMessage',
	getPathNodeKey: pathUtils.getPathNodeKey
};

var getterTemplate = fs.readFileSync(__dirname + '/getter_template.js')
	, setterTemplate = fs.readFileSync(__dirname + '/setter_template.js');

doT.templateSettings.strip = false;

var getterSynthesizer = doT.compile(getterTemplate, dotDef)
	, setterSynthesizer = doT.compile(setterTemplate, dotDef)
	, modelSetterSynthesizer = doT.compile(setterTemplate, modelSetterDotDef);


_.extendProto(Model, {
	get: get,
	set: synthesizeMethod(modelSetterSynthesizer, '', []),
	path: path,
	proxyMessenger: proxyMessenger,
	_wrapMessengerMethods: _wrapMessengerMethods
});

function get() {
	return this._data;
}

// returns ModelPath object
function path(accessPath) {
	return this(accessPath);
}


function proxyMessenger(modelHostObject) {
	Mixin.prototype._createProxyMethods.call(this._messenger, Messenger.defaultMethods, modelHostObject);
}


// TODO allow for multiple messages in a string
var modelMethodsToWrap = ['on', 'off', 'onMessages', 'offMessages'];
function _wrapMessengerMethods() {
	modelMethodsToWrap.forEach(function(methodName) {
		var origMethod = this[methodName];
		// replacing message subsribe/unsubscribe/etc. to convert "*" message patterns to regexps
		this[methodName] = function(path, subscriber) {
			var regexPath = pathUtils.createRegexPath(path);
			origMethod.call(this, regexPath, subscriber);
		};
	}, this);
}


_.extend(Model, {
	Path: ModelPath
});

function ModelPath(model, path, it) {
	check(model, Model);
	check(path, String);
	check(it, Match.Optional(Object));

	_.defineProperties(this, {
		_model: model,
		_path: path,
		_it: it
	});

	// compiling getter and setter
	var methods = synthesizePathMethods(path);

	// adding methods to model path
	_.defineProperties(this, methods);

	Object.freeze(this);
}


// adding messaging methods to ModelPath prototype
var modelPathMethodsMap = {};

modelMethodsToWrap.forEach(function(methodName) {
	// creating subscribe/unsubscribe/etc. methods for ModelPath class
	modelPathMethodsMap[methodName] = function(path, subscriber) {
		this._model[methodName](this._path + path, subscriber);
	};
})

_.extendProto(ModelPath, modelPathMethodsMap);


function synthesizePathMethods(path) {
	if (__synthesizedPathsMethods.hasOwnProperty(path))
		return __synthesizedPathsMethods[path];

	var parsedPath = pathUtils.parseAccessPath(path);

	var methods = {
		get: synthesizeMethod(getterSynthesizer, path, parsedPath),
		set: synthesizeMethod(setterSynthesizer, path, parsedPath)
	};

	__synthesizedPathsMethods[path] = methods;

	return methods;
}


function synthesizeMethod(synthesizer, path, parsedPath) {
	var method
		, methodCode = synthesizer({ parsedPath: parsedPath });

	try {
		eval(methodCode);
	} catch (e) {
		throw ModelError('ModelPath method compilation error; path: ' + path + ', code: ' + methodCode);
	}

	return method;


	// functions used by ModelPath setter (synthesized by template)
	function addChangeMessage(messages, messagesHash, msg) {
		messages.push(msg);
		messagesHash[msg.path] = msg;
	}

	function addTreeChangesMessages(messages, messagesHash, rootPath, oldValue, newValue) {
		var oldIsTree = valueIsTree(oldValue)
			, newIsTree = valueIsTree(newValue);

		if (newIsTree)
			addMessages(rootPath, newValue, 'added', 'newValue');
		
		if (oldIsTree)
			addMessages(rootPath, oldValue, 'removed', 'oldValue');


		function addMessages(rootPath, obj, msgType, valueProp) {
			if (Array.isArray(obj)) {
				var pathSyntax = rootPath + '[$$]';
				obj.forEach(function(value, index) {
					addMessage(value, index, pathSyntax);
				});
			} else {
				var pathSyntax = rootPath + '.$$';
				_.eachKey(obj, function(value, key) {
					addMessage(value, key, pathSyntax);
				});
			}


			function addMessage(value, key, pathSyntax) {
				var path = pathSyntax.replace('$$', key)
					, existingMsg = messagesHash[path];

				if (existingMsg) {
					if (existingMsg.type == msgType)
						logger.error('setter error: same message type posted on the same path')
					else {
						existingMsg.type = 'changed';
						existingMsg[valueProp] = value;
					}
				} else {
					var msg = { path: path, type: msgType };
					msg[valueProp] = value;
					addChangeMessage(messages, messagesHash, msg)
				}

				if (valueIsTree(value))
					addMessages(path, value, msgType, valueProp);
			}
		}
	}

	function valueIsTree(value) {
		return typeof value == "object" && Object.keys(value).length;
	}
}


// <a name="model-connector"></a>
// ### model connector

'use strict';

var ConnectorError = require('../util/error').Connector
	, _ = require('mol-proto')
	, logger = require('../util/logger');

// Class that creates connector object for data connection between
// two data-sources
// Data-sources should implement the following API:
// get() - get value
// set(value) - set value
// on(path, subscriber) - subscription to data changes with "*" support
// off(path, subscriber)
// path(accessPath) - to return the object that complies with that api too


var modePattern = /^(\<*)\-+(\>*)$/;

function Connector(ds1, mode, ds2, options) {
	var parsedMode = mode.match(modePattern);

	if (! parsedMode)
		modeParseError();

	var depth1 = parsedMode[1].length
		, depth2 = parsedMode[2].length;

	if (depth1 && depth2 && depth1 != depth2)
		modeParseError();

	if (! depth1 && ! depth2)
		modeParseError();

	_.extend(this, {
		ds1: ds1,
		ds2: ds2,
		mode: mode,
		depth1: depth1,
		depth2: depth2,
		isOn: false	
	});

	this.on();

	function modeParseError() {
		throw new ConnectorError('invalid Connector mode: ' + mode);
	}
}


_.extendProto(Connector, {
	on: on,
	off: off
});


// create connection
function on() {
	if (this.isOn)
		return logger.warn('data sources are already connected');

	var subscriptionPath = this._subscriptionPath =
		new Array((this.depth1 || this.depth2) + 1).join('*');

	if (this.depth1)
		this._link1 = linkDataSource(this.ds1, this.ds2, subscriptionPath);
	if (this.depth2)
		this._link2 = linkDataSource(this.ds2, this.ds1, subscriptionPath);

	this.isOn = true;


	function linkDataSource(linkTo, linked, subscriptionPath) {
		var onData = function(path, data) {
			linkTo.path(path).set(data.newValue);
		};

		linked.on(subscriptionPath, onData);

		return onData;
	}
}


function off() {
	if (! this.isOn)
		return logger.warn('data sources are already connected');

	if (this._link1)
		this.ds2.off(this._subscriptionPath, this._link1);

	if (this._link2)
		this.ds2.off(this._subscriptionPath, this._link2);

	this.isOn = false;
}


// <a name="model-demo"></a>
// ### model demo

'use strict';
var Model = require('./index');


var m = new Model;

var year = m('.info.DOB.year').get();
// undefined, but doesn't fail, like in Angular

m('.info.DOB.year').set(1982);

var year = m('.info.DOB.year').get();
// 1982

var data = m('.info').get();
// { DOB: { year: 1982 } }

var mData = m.get();
// { info: { DOB: { year: 1982 } } }



var m = new Model;

m.on(/.*/, onChange);

function onChange(msg, data) {
	// should be replaced with console if this demo is used
	logger.log(msg, ' : ', data);
}

m('.list[0].info.name').set('Clifton');
// logged:
// .list  :  { type: 'added', newValue: [] }
// .list[0]  :  { type: 'added', newValue: {} }
// .list[0].info  :  { type: 'added', newValue: {} }
// .list[0].info.name  :  { type: 'added', newValue: 'Clifton' }

m('.list[0].info.name').set('Clifton Cunnigham');
// logged:
// .list[0].info.name  :  { type: 'changed',
//   oldValue: 'Clifton',
//   newValue: 'Clifton Cunnigham' }

var name = m('.list[0].info.name').get();
// 'Clifton Cunnigham'



// m('.list[0].info.name').get.toString() :

function get() {
	var m = this._model._data;
	return m.list && m.list[0] && m.list[0].info && m.list[0].info.name;
}


// m('.list[0].info.name').set.toString() :

function set(value) {
	var m = this._model._data;
	if (! m.list) {
		m.list = [];
		this._model.postMessage(".list", { type: "added", newValue: [] } );
	}
	if (! m.list[0]) {
		m.list[0] = {};
		this._model.postMessage( ".list[0]", { type: "added", newValue: {} } );
	}
	if (! m.list[0].info) {
		m.list[0].info = {};
		this._model.postMessage(".list[0].info", { type: "added", newValue: {} } );
	} 
	var wasDef = m.list[0].info.hasOwnProperty("name");
	var old = m.list[0].info.name;
	m.list[0].info.name = value;
	if (! wasDef)
		this._model.postMessage(".list[0].info.name",
			{ type: "added", newValue: value } );
	else if (old != value)
		this._model.postMessage( ".list[0].info.name",
			{ type: "changed", oldValue: old, newValue: value} );
}


// <a name="model-path"></a>
// ### model path utils

'use strict';


var check = require('../util/check')
	, Match = check.Match
	, _ = require('mol-proto');

var pathUtils = module.exports = {
	parseAccessPath: parseAccessPath,
	createRegexPath: createRegexPath,
	getPathNodeKey: getPathNodeKey
};


var pathParsePattern = /\.[A-Za-z][A-Za-z0-9_]*|\[[0-9]+\]/g
	, patternPathParsePattern = /\.[A-Za-z][A-Za-z0-9_]*|\[[0-9]+\]|\.\*|\[\*\]|\*/g
	, pathNodeTypes = {
		'.': { syntax: 'object', empty: '{}' },
		'[': { syntax: 'array', empty: '[]'},
		'*': { syntax: 'star', empty: '{}'}
	};

function parseAccessPath(path, nodeParsePattern) {
	nodeParsePattern = nodeParsePattern || pathParsePattern;

	var parsedPath = [];

	if (! path)
		return parsedPath;

	var unparsed = path.replace(nodeParsePattern, function(nodeStr) {
		var pathNode = { property: nodeStr };
		_.extend(pathNode, pathNodeTypes[nodeStr[0]]); // TODO maybe do some default value if not in map
		parsedPath.push(pathNode);
		return '';
	});
	if (unparsed)
		throw new ModelError('incorrect model path: ' + path);

	return parsedPath;
}


var nodeRegex = {
	'.*': '\\.[A-Za-z][A-Za-z0-9_]*',
	'[*]': '\\[[0-9]+\\]'
};
nodeRegex['*'] = nodeRegex['.*'] + '|' + nodeRegex['[*]'];
function createRegexPath(path) {
	check(path, Match.OneOf(String, RegExp));

	if (path instanceof RegExp || path.indexOf('*') == -1)
		return path;

	var parsedPath = pathUtils.parseAccessPath(path, patternPathParsePattern)
		, regexStr = '^'
		, regexStrEnd = ''
		, patternsStarted = false;

	parsedPath.forEach(function(pathNode) {
		var prop = pathNode.property
			, regex = nodeRegex[prop];
		
		if (regex) {
			// regexStr += '(' + regex;
			// regexStrEnd += '|)';
			regexStr += '(' + regex + '|)';
			// regexStrEnd += '|)';
			patternsStarted = true;
		} else {
			if (patternsStarted)
				throw new ModelError('"*" path segment cannot be in the middle of the path: ' + path);
			regexStr += prop.replace(/(\.|\[|\])/g, '\\$1');
		}
	});

	regexStr += /* regexStrEnd + */ '$';

	try {
		return new RegExp(regexStr);
	} catch (e) {
		throw new ModelError('can\'t construct regex for path pattern: ' + path);
	}
}


function getPathNodeKey(pathNode) {
	var prop = pathNode.property;
	return pathNode.syntax == 'array'
		? prop.slice(1, prop.length - 1)
		: prop.slice(1);
}


// <a name="messenger"></a>
// milo messenger
// --------------

'use strict';

var Mixin = require('../abstract/mixin')
	, MessageSource = require('./message_source')
	, _ = require('mol-proto')
	, check = require('../util/check')
	, Match = check.Match
	, MessengerError = require('../util/error').Messenger;


var Messenger = _.createSubclass(Mixin, 'Messenger');

var messagesSplitRegExp = Messenger.messagesSplitRegExp = /\s*(?:\,|\s)\s*/;


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
		messages = messages.split(messagesSplitRegExp);

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
		if (message instanceof RegExp)
			subscribersHash[message].pattern = message;
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
		return this.onMessage(messages, subscriber);
	}, this);

	return notYetRegisteredMap;
}


// removes all subscribers for the message if subscriber isn't supplied
function removeSubscriber(messages, subscriber) {
	check(messages, Match.OneOf(String, [String], RegExp));
	check(subscriber, Match.Optional(Function)); 

	if (typeof messages == 'string')
		messages = messages.split(messagesSplitRegExp);

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
		return this.offMessages(messages, subscriber);
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


var regexpFlagsPattern = /\/((?:g|i|m|y)*)$/;
function _callPatternSubscribers(message, data) {
	_.eachKey(this._patternMessageSubscribers, 
		function(patternSubscribers) {
			var pattern = patternSubscribers.pattern;
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



// <a name="messenger-source"></a>
// ###messenger source

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


// <a name="messenger-message"></a>
// ###messenger message class

// Not currently used

'use strict';

var check = require('../util/check')
	, Match = check.Match;

module.exports = Message;

function Message(message) {
	check(message, Object);
	check(message.type, Match.Where(IsNonEmptyString));
	check(message.sender, Match.Optional(Object));
	check(message.stack, Match.Optional([Object]));
	check(message.data, Match.Optional(Object));
	check(message.reciever, Match.Optional(Object));
	check(message.event, Match.Optional(Object));

	this.type = message.type;
	this.sender = message.sender;
	this.stack = message.stack;
	this.data = message.data;
	this.reciever = message.reciever;
	this.event = message.event;
}

function IsNonEmptyString(str) {
	check(str, String);
	return str.length > 0;
}

// <a name="attribute"></a>
// attribute class
// ---------

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
	get: get,
	set: set,

	// should be defined in subclass
	attrName: toBeImplemented,
	parse: toBeImplemented,
	validate: toBeImplemented,
	render: toBeImplemented,
	decorate: decorate
});

// get attribute value
function get() {
	return this.el.getAttribute(this.name);
}

// set attribute value
function set(value) {
	this.el.setAttribute(this.name, value);
}

function decorate() {
	this.set(this.render());
}


// <a name="attribute-bind"></a>
// ###bind attribute class

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
	, facetsSplitRegExp = /\s*(?:\,|\s)\s*/
	, attrTemplate = '%compClass%compFacets:%compName';


var BindAttribute = _.createSubclass(Attribute, 'BindAttribute', true);

_.extendProto(BindAttribute, {
	attrName: attrName,
	parse: parse,
	validate: validate,
	render: render
});


module.exports = BindAttribute;


// get attribute name
function attrName() {
	return config.attrs['bind'];
}


// parse attribute
function parse() {
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


// validate attribute
function validate() {
	var compName = this.compName;
	check(compName, Match.Where(function() {
  		return typeof compName == 'string' && compName != '';
	}), 'empty component name');

	if (! this.compClass)
		throw new AttributeError('empty component class name ' + this.compClass);

	return this;
}


function render() {
	return attrTemplate
				.replace('%compClass', this.compClass)
				.replace('%compFacets', this.compFacets
											? '[' + this.compFacets.join(', ') + ']'
											: '')
				.replace('%compName', this.compName);
}


// <a name="attribute-load"></a>
// ###load attribute class

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

// <a name="mixin"></a>
// mixin abstract class
// --------------

'use strict';

var _ = require('mol-proto')
	, check = require('../util/check')
	, Match = check.Match
	, MixinError = require('../util/error').Mixin;


module.exports = Mixin;

// an abstract class for mixin pattern - adding proxy methods to host objects
function Mixin(hostObject, proxyMethods /*, other args - passed to init method */) {
	// TODO - moce checks from Messenger here
	check(hostObject, Match.Optional(Match.OneOf(Object, Function)));
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


function _createProxyMethod(mixinMethodName, proxyMethodName, hostObject) {
	hostObject = hostObject || this._hostObject;

	if (hostObject[proxyMethodName])
		throw new MixinError('method ' + proxyMethodName +
								 ' already defined in host object');

	check(this[mixinMethodName], Function);

	// Bind proxied messenger's method to messenger
	var boundMethod = this[mixinMethodName].bind(this);

	Object.defineProperty(hostObject, proxyMethodName,
		{ value: boundMethod, writable: true });
}


function _createProxyMethods(proxyMethods, hostObject) {
	// creating and binding proxy methods on the host object
	_.eachKey(proxyMethods, function(mixinMethodName, proxyMethodName) {
		this._createProxyMethod(mixinMethodName, proxyMethodName, hostObject);
	}, this);
}


// <a name="registry"></a>
// registry abstract class
// --------------

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
