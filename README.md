Milo
====

A minimalist browser framework that binds HTML elements to JS components and components to models.

[![Build Status](https://travis-ci.org/MailOnline/milo.png?branch=master)](https://travis-ci.org/MailOnline/milo)


Quick start
-----------

While __Milo__ is the work in progress that has only recently started,
you can already do quite a few things with it.


### Install

    npm install mol-milo

or

    bower intall milo

### Test

    npm install
    npm install -g grunt-cli
    grunt test

To test in browser, open:

[bind_test.html](https://github.com/MailOnline/milo/blob/master/test_html/bind_test.html)

### Try

index.html
```html
<html>
<head>
    <title>Binding example</title>
    <script src="milo.bundle.js"></script>
    <script src="index.js"></script>
</head>
<body>
    <input type="text" ml-bind="[Data]:myField">
    <div ml-bind=":myCurrentValue"></div>
    <button ml-bind="[Events]:myTestButton">
    	Test
    </button>
    <div>
    	<span ml-bind=":myTestValue"></span>
    </div>
</body>
</html>
```

index.js
```javascript
milo.mail.on('domready', function () {
    var ctrl = milo.binder();

    ctrl.myField.data.on('datachanged', function(msg, data) {
    	ctrl.myCurrentValue.el.innerHTML = data.newValue;
    });

    ctrl.myTestButton.events.on('click', function(msg, event) {
    	ctrl.myTestValue.el.innerHTML = ctrl.myField.data.value();
    });
}
```

### Contribute

```shell
cd $MILO_FOLDER
npm link

cd $MY_PROJECT
rm -R -f -d node_modules/mol-milo
npm link mol-milo # link milo to your current project to use with browserify

cd $MILO_FOLDER
grunt # rebuild milo bundle every time you change any .js file
```

Additionally you can setup grunt in your project to rebuild it whenever
milo bundle changes


Modules and classes
-------------------

### milo

- .[__loader__](#miloloader-rootelement) - loading subviews into page
- .[__binder__](#milobinder-scopeelement) - components instantiation and binding of DOM elements to them
- .[__minder__](#milominder) - data reactivity, one or two way, shallow or deep, as you like it
- .[__mail__](#milomail) - applicaiton level messenger
- .[__config__](#miloconfig) - milo configuration
- .[__utils__](#miloutils) - [logger](#miloutilslogger),
[request](#miloutilsrequest), [check](#miloutilscheck), etc.
- .[__classes__](#miloutilsclasses) - foundation classes and class registries

### Facets

- __Dom__ - DOM manipulation
- __Data__ - Component data source and data messages
- __Events__ - DOM events
- __Template__ - template based rendering with any engine that can compile templates
- __Scope__ - scope contains other components to avoid namespace conflicts
- __Drag__ - make element draggable
- __Drop__ - make element a drop target
- __Editable__ - contenteditable
- Create your own facets

### Component

- .__createComponentClass__
- .__addfacet__


Why Milo?
---------

__Milo__ name was chosen because of [Milo Minderbinder](http://en.wikipedia.org/wiki/Milo_Minderbinder), a war profiteer from Catch 22. Having started from managing mess operations, he expanded them into a profitable trading enterprise, that connected everybody with everything, and in that Milo and everybody else "has a share".

__Milo__ the framework has the module __binder__, that binds DOM elements to 
components (via special ml-bind attribute), and will have the module __minder__
that would allow establishing live reactive connections between different data
sources (all models and some components, such as input field, e.g., are data 
sources).

Coincidentally, __Milo__ can be read as an acronym of [__MaIL Online__](http://dailymail.co.uk).


Aren't there enough browser frameworks?
---------------------------------------

All frameworks we could lay our hands on were either too primitive leaving us
to write too much code of our own (jQuery, Backbone) or too limiting, with enough
magic to build simple application really fast but with limited control over
precise functioning of the framework (Angular, Ext).

What we always wanted was a framework that would allow

- developing applications in a __declarative__ way with __reactive__ bindings of models to views
- inserting __validators__ and __translators__ in these bindings, so we can bind views to data models rather than to view models like in AngularJS.
- __precise control__ over components linked to DOM elements.
- flexibility of views management allowing both to automatically __manipulate DOM__ on model changes and to re-render some sections using any __templating engine__
in cases where rendering is more efficient than DOM manipulation
- being able to __hook into__ mechanisms behind data reactivity and to precisely
control view updates and data flow
- being able to __extend functionality__ of components supplied by framework
and to create new components

We could not find such framework so we started developing __Milo__ in parallel with the application that uses it.


Architecture
------------

###Prototype based inheritance

Unlike many frameworks, we rely on JavaScript prototypes to build framework blocks.

JavaScript is a very dynamic language. It allows writing functions that create classes (```Component.createComponentClass```) which allowed to implement a composition pattern where each component class is created as collection of
pre-defined blocks (facets) with configuration of a facet that is
specific to a constructed class (it has some similarity to Ext components,
although they are not created from blocks).

### Run-time "compilation"

JavaScript also allows to create constructor functions that create
functions making possible a very expressive syntax for model objects
and also run-time "compilation" of model access paths into functions.

### Faceted objects

Component class is based on an abstract ```FacetedObject``` class that can be
applied to any domain where objects can be represented via collection of facets
(a facet is an object of a certain class, it holds its own configuration,
data and methods).

In a way, facets pattern is an inversion of adapter pattern - while the latter
allows finding a class/methods that has specific functionality, faceted object
is simply constructed to have these functionalities. In this way it is possible
to create a virtually unlimited number of component classes with a very limited
number of building blocks without having any hierarchy of classes - all components
inherit directly from Component class.

###Mixins

We also use Mixin pattern, but Mixin in milo is implemented as a separate object
that is stored on the property of the host object and can create proxy methods on
the host object if required. Classes Messenger, MessageSource and DataSource are
subclasses of Mixin abstract class.

### Registries: dependency inversion

Components and Facets register themselves in registries that allows to avoid requiring them from one module. It prevents circular dependencies between modules.


Dependencies
------------

The only dependency of Milo is [__Proto__](https://github.com/MailOnline/proto),
an object manipulation library.

### No jQuery, Zepto, etc.

We do not use any DOM traversal library because:

- DOM API is much faster (in some cases 30 times faster)
- we do not want browser compatibility code to be part of the framework.
If needed for some application, it can be implemented with polyfills.
We may develop them for Milo if we need them, but feel free to contribute.
- application start time is noticably faster

Instead, Milo Components can have __Dom__ facet that includes several convenience functions to manipulate DOM elements.

### No underscore, lo-dash, etc.

We have our own library [__Proto__](https://github.com/MailOnline/proto) that has
a grownig collection of utility functions for the manipulation of objects,
prototypes, arrays, functions and strings. Please see [its repository](https://github.com/MailOnline/proto) for documentations and reasons
behind our decision not to use third-party libraries.

It is bundled together with milo and all its functions are available as
properties of _ object, you don't need to load it separately.


Modules and classes reference
-----------------------------

### milo.__loader__ (_rootElement_)

milo.loader loads subviews into the page. It scans the document inside
_rootElement_ looking for __ml-load__ attribute that should contain URL of HTML
fragment that will be loaded inside the element with this attribute.

milo.loader returns the map of references to elements with their IDs used as keys.


index.html:

```html
<body>
    <div id="view1" ml-load="view1.html"></div>
    <div>
        <div id="view2" ml-load="view3.html"></div>
    </div>
</body>
```

```javascript
var views = milo.loader(); // document.body is used by default

console.log(views);
// {
//     view1: div with id="view1"
//     view2: div with id="view2"
// }
```


### milo.__binder__ (_scopeElement_)

milo.binder recursively scans the document tree inside scopeElement
(document.body by default) looking for __ml-bind__ attribute that should
contain the class, additional facets and the name of the component
that should be created and bound to the element.

Possible values of __ml-bind__ attribute:

- :myView - only component name. An instance of Component class will be
  created without any facets.
- View:myView - class and component name. An instance of View class will be
  created.
- [Events, Data]:myView - facets and component name. An instance of Component
  class will be created with the addition of facets Events and Data.
- View[Events, Data]:myView - class, facet(s) and component name. An instance of
  View class will be created with the addition of facets Events and Data.

Created omponents will be returned as map with their names used as keys.
Names within the scope should be therefore unique.

If the component has _Scope_ facet, children of this element will be stored on the _Scope_ facet of this element as properties. Names of components within
the scope whould be unique, but they can be the same as the names of components
in outer scope (or some other).


### milo.__minder__

This module will be used to create and manage reactive connections between 
components and models (and, potentially, other models).

It is not developed yet.


### milo.__mail__

It is an application level messenger that is an instance of Messenger class.

At the moment, in addition to application messages that you define, you can subscribe to __domready__ message that is guaranteed to fire once,
even if DOM was ready at the time of the subscription.

Messaging between frames is likely to be exposed via milo.mail.

See Messenger.


### milo.__config__

It is the function that allows to change milo configurations and also
access them on config's properties.

```javascript
milo.config({
    attrs: {
        bind: 'ml-bind',
        load: 'ml-load'
    }
});
```


### milo.__utils__

#### milo.utils.__logger__

Application logger that has error, warn, info and debug
methods, that can be suppressed by setting log level.

Properties:

- level

  - 0 - error
  - 1 - warn
  - 2 - info
  - 3 - debug (default)

- enabled

  true by default. Set to false to disable all logging in browser console.


#### milo.utils.__request__

Convenience functions wrapping XMLHTTPRequest functionality.

```javascript
var request = milo.utils.request
    , opts: { method: 'GET' };

request(url, opts, function(err, data) {
    console.log(data);
});

request.get(url, function(err, data) {
    console.log(data);
});
```

Only generic request and get convenience method are currently implemented.


#### milo.utils.__check__

Check is a module for parameters checking extracted from Meteor framework.

It allows to both document and to check parameter types in your function
making code both readable and stable.


##### Usage

    var check = milo.check
        , Match = check.Match;

    function My(name, obj, cb) {
        // if any of checks fail an error will be thrown
        check(name, String);
        check(obj, Match.ObjectIncluding({ options: Object }));
        check(cb, Function);

        // ... your code
    }

See [Meteor docs](http://docs.meteor.com/#match) to see how it works


##### Patterns

All patterns and functions described in Meteor docs work.

Unlike in Meteor, Object pattern matches instance of any class,
not only plain object.

In addition to patterns described in Meteor docs the following patterns are implemented

* Match.__ObjectHash__(_pattern_)

  Matches an object where all properties match a given pattern

* Match.__Subclass__(_constructor_ [, _matchThisClassToo_])

  Matches a class that is a subclass of a given class. If the second parameter
  is true, it will also match the class itself.

  Without this pattern to check if _MySubclass_ is a subclass of _MyClass_
  you would have to use

      check(MySubclass, Match.Where(function() {
          return MySubclass.prototype instanceof MyClass;
      });


#### milo.utils.__classes__

This module contains foundation classes and class registries.


##### milo.utils.classes.__Component__

Basic component class.

It's constructor accepts DOM element and component name as paramenters.

You do not need to use its constructor directly as binder module creates
components when it scans DOM tree.

You should use Component.createComponentClass method when you want to create
a new component class from facets and their configuration.


##### milo.utils.classes.__ComponentFacet__

The class fot the facet of component. When a component is created, it
creates all its facets.

See Facets section on information about available facets and on 
how to create new facets classes.

- Component - basic compponent class
- ComponentFacet - basic 
    ClassRegistry: require('./abstract/registry'),


##### milo.utils.classes.__facetsRegistry__

An instance of ClassRegistry class that is used by milo to register and find
facets.

See ClassRegistry.


##### milo.utils.classes.__componentsRegistry__

An instance of ClassRegistry class that is used by milo to register and find
components.

See ClassRegistry.
