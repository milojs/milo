'use strict';

/**
 * `milo.utils.check`
 *
 * Check is a module for parameters checking extracted from [Meteor](http://docs.meteor.com/) framework.
 *
 * It allows to both document and to check parameter types in your function
 * making code both readable and stable.
 *
 *
 * ### Usage
 *```
 * var check = milo.check
 *     , Match = check.Match;
 *
 * function My(name, obj, cb) {
 *     // if any of checks fail an error will be thrown
 *     check(name, String);
 *     check(obj, Match.ObjectIncluding({ options: Object }));
 *     check(cb, Function);
 *
 *     // ... your code
 * }
 *```
 * See [Meteor docs](http://docs.meteor.com/#match) to see how it works
 *
 *
 * ### Patterns
 *
 * All patterns and functions described in Meteor docs work.
 *
 * Unlike in Meteor, Object pattern matches instance of any class,
 * not only plain object.
 *
 * In addition to patterns described in Meteor docs the following patterns are implemented
 *
 * * Match.__ObjectHash__(_pattern_)
 *
 *   Matches an object where all properties match a given pattern
 *
 * * Match.__Subclass__(_constructor_ [, _matchThisClassToo_])
 *
 *   Matches a class that is a subclass of a given class. If the second parameter
 *   is true, it will also match the class itself.
 *
 *   Without this pattern to check if _MySubclass_ is a subclass of _MyClass_
 *   you would have to use
 *
 *       check(MySubclass, Match.Where(function() {
 *           return MySubclass.prototype instanceof MyClass;
 *       });
 *
 *
 * Things we explicitly do NOT support:
 *    - heterogenous arrays
**/

var _ = require('mol-proto')
    , config = require('../config');

var check = function (value, pattern) {
    if (config.check === false)
        return;

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
    OneOf: function (/* arguments */) {
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

    // Matches string that is a valid identifier, will not allow javascript reserved words
    IdentifierString: /^[a-z_$][0-9a-z_$]*$/i,

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
    //     this.sanitizedError = new Meteor.Error(400, "Match failed");
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
    [Function, "function"],
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
        if (typeof value === 'number' && (value | 0) === value)
            return
        throw new Match.Error('Expected Integer, got '
                                + (value instanceof Object ? JSON.stringify(value) : value));
    }

    if (pattern === Match.IdentifierString) {
        if (typeof value === 'string' && Match.IdentifierString.test(value)
                && _jsKeywords.indexOf(key) == -1)
            return;
        throw new Match.Error('Expected identifier string, got '
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
    else if (!key.match(Match.IdentifierString) || _jsKeywords.indexOf(key) != -1)
        key = JSON.stringify([key]);

    if (base && base[0] !== "[")
        return key + '.' + base;
    return key + base;
};
