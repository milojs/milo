Check
=====

Check is a module for parameters checking extracted from Meteor framework.

Why
---

It allows to both document and to check parameter types in your function
making code both readable and stable.

Use
---

    var check = milo.check
    	, Match = check.Match;

    function My(name, obj, cb) {
    	// if any of checks fail an error will be thrown
    	check(name, String);
    	check(obj, Match.ObjectIncluding({ options: Object }));
    	check(cb, Function);

    	// ... your code
    }

See Meteor docs to see how it works

Patterns
--------

All patterns and functions described in Meteor docs work.

In addition to patterns described in Meteor docs the following patterns are implemented

* Match.__ObjectHash__(_pattern_)

  Matches an object where all properties match a given pattern

* Match.__Subclass__(_constructor_)

  Matches a class that is a subclass of a given class

  Without this pattern to check if _MySubclass_ is a subclass of _MyClass_
  you would have to use

      check(MySubclass, Match.Where(function() {
          return MySubclass.prototype instanceof MyClass;
      });

Changes to existing pattern
---------------------------

Object match can be any instance.
