Milo
====

Browser/nodejs [reactive programming](http://en.wikipedia.org/wiki/Reactive_programming) and data driven DOM manipulation with modular components.

[![Build Status](https://travis-ci.org/MailOnline/milo.png?branch=master)](https://travis-ci.org/MailOnline/milo) [![Code Climate](https://codeclimate.com/github/MailOnline/milo/badges/gpa.svg)](https://codeclimate.com/github/MailOnline/milo)


Documentation: http://mailonline.github.io/milo/


Quick start
-----------

### Install

    npm install mol-milo

or

    bower intall milo


### Test

    npm install
    npm install -g grunt-cli
    grunt test

To run all tests, including browser tests:

    grunt tests


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
    <div ml-bind="[Data]:myCurrentValue"></div>
    <button ml-bind="[Events]:myTestButton">
    	Test
    </button>
    <div>
    	<span ml-bind=":myTestValue"></span>
    </div>
    <div>
      <h2>I am connected:</h2>
      <span ml-bind="[Data]:myTestValue2"></span>
    </div>
</body>
</html>
```

index.js
```javascript
// run when DOM is ready
milo(function () {
    // create and bind components with milo.binder
    var scope = milo.binder();

    // attach subscriber to data change event via data facet
    // of myField component
    scope.myField.data.on('', function(msg, data) {
    	scope.myCurrentValue.data.set(data.newValue);
      // alternatively:
      // scope.myCurrentValue.el.innerHTML = data.newValue;
    });

    // attach subscriber to click event via events facet
    // of myTestButton component
    scope.myTestButton.events.on('click', function(msg, event) {
    	scope.myTestValue.el.innerHTML = scope.myField.data.value();
    });

    // connect two components directly via their data facets
    // using milo.minder
    milo.minder(scope.myField.data, '->', scope.myTestValue2.data);
});
```


### Note on runtime parameter type checking

Milo uses check module (`milo.util.check` - forked from check package of [Meteor framework](https://www.meteor.com/)) for runtime checking of parameter types. It is highly recommended to switch off this checks using: `milo.config({ check: false })`.

Depending on your application, it can improve performance more than twice.


Samples/Tutorials
-----------------

### Getting started
[Introduction to binding](http://jsfiddle.net/jasoniangreen/63T6V/)

[Introduction to data facet](http://jsfiddle.net/jasoniangreen/xDFda/)

[Introduction to messengers](http://jsfiddle.net/jasoniangreen/5Hy5F/)

[Introduction to models](http://jsfiddle.net/jasoniangreen/225Bf/)

[Introduction to minder](https://github.com/MailOnline/milo/blob/master/examples/tutorials/5_minder.html)

[Introduction to lists](https://github.com/MailOnline/milo/blob/master/examples/tutorials/6_lists.html)

Article about creating milo [Rolling Your Own Framework](http://code.tutsplus.com/articles/rolling-your-own-framework--cms-21810) on tuts+


### TodoMVC

The more advanced sample is __Todos__ app in
[todomvc](https://github.com/MailOnline/milo/tree/master/examples/todomvc) folder.




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

Additionally you can setup grunt in your project to rebuild it whenever milo bundle changes.

Please make sure you run ```grunt tests``` before committing (not just ```grunt test``` that is run by TravisCI automatically) - it will run all tests, including browser tests.


Concepts
--------

### Modular design

Although __milo__ is packaged as one bundle, it has very modular structure. It consists of several independent modules that can be used together or separately and that are designed to simplify common application tasks rather than to create any particular application structure.

Some modules in __milo__ can be used only in browser ([Component](http://mailonline.github.io/milo/components/c_class.js.html), [ComponentFacet](http://mailonline.github.io/milo/components/c_facet.js.html), [milo.binder](http://mailonline.github.io/milo/binder.js.html)), some both in browser and in nodejs ([Messenger](http://mailonline.github.io/milo/messenger/index.js.html) and its related classes, [Model](http://mailonline.github.io/milo/model/index.js.html), [Connector](http://mailonline.github.io/milo/model/connector.js.html), [milo.minder](http://mailonline.github.io/milo/minder.js.html)).

Milo itself uses browserify to package bundle, but any modules system can be used in an app that uses __milo__ - __milo__ does not suggest any application structure.


### Component

Component is designed to simplify the management of DOM. Component is attached to a certain DOM element. Attaching several components to the same DOM element is usually an application (or milo) design mistake, so if it happens an error will be logged to console.

Components allow very easy creation of subclasses that are defined as a collection of configured "facets". For example, see the definition of [MLSelect](http://mailonline.github.io/milo/components/ui/Select.js.html) UI component.

There is a [Component template](https://github.com/MailOnline/milo/blob/master/lib/components/ComponentTemplate.js) to simplify creation of your own components.

See [Component documentation](http://mailonline.github.io/milo/components/c_class.js.html).


### Component facet

ComponentFacet is a base class, subclasses of which group methods related to behaviours of components.

You would rarely need to instantiate a facet - when a component is created it creates all its facets

There are the following facets defined in __milo__:

- [Container](http://mailonline.github.io/milo/components/c_facets/Container.js.html) - a special facet that creates a scope of components
- [Dom](http://mailonline.github.io/milo/components/c_facets/Dom.js.html) - a collection of helper methods simplifying DOM manipulation of component element
- [Events](http://mailonline.github.io/milo/components/c_facets/Events.js.html) - gives a convenient API to subscribe to DOM events
- [Data](http://mailonline.github.io/milo/components/c_facets/Data.js.html) - an api to manipulate DOM tree inside component element as data, allowing both getting/setting structured data from/to many DOM elements at once and creating reactive data connection of Models (see below) to DOM.
- [List](http://mailonline.github.io/milo/components/c_facets/List.js.html) and [Item](http://mailonline.github.io/milo/components/c_facets/Item.js.html) - allow creating lists in DOM from arays in your data. Component class using any of these facets require Data facet (will be added automatically) that should be used to get/set list data and to create reactive data connection.
- [Template](http://mailonline.github.io/milo/components/c_facets/Template.js.html) - simplifies rendering of component DOM element from template.
- [Frame](http://mailonline.github.io/milo/components/c_facets/Frame.js.html) - manages sending/receiveing messages to/from iframe.
- [Drag](http://mailonline.github.io/milo/components/c_facets/Drag.js.html) - allows easy management of draggable DOM elements.
- [Drop](http://mailonline.github.io/milo/components/c_facets/Drop.js.html) - helps creating drop targets.
- Editable - manages contenteditable DOM elements enabling splitting and merging of components (moved to app)
- Split - manages the process of splitting the component at the current selection point (moved to app)
- [Model](http://mailonline.github.io/milo/components/c_facets/ModelFacet.js.html) - simple wrapper for __milo__ Model (see below), helping to store data on component.

There is a [Component facet template](https://github.com/MailOnline/milo/blob/master/lib/components/c_facets/facet_template.js) to simplify creation of your own facets. All facets of components should be subclasses of [ComponentFacet](http://mailonline.github.io/milo/components/c_facet.js.html).


### DOM binding and creation of component instances

Instances of your components are usually created automatically when you call [milo.binder](http://mailonline.github.io/milo/binder.js.html) based on information about components classes, facets and component name in `ml-bind` attribute (can be changed via [milo.config](http://mailonline.github.io/milo/config.js.html)).

To make your components available to __milo__ their classes should be registered in components registry ([milo.registry.components](http://mailonline.github.io/milo/components/c_registry.js.html)). If you define new facets, their classes should also be registered (in [milo.registry.facets](http://mailonline.github.io/milo/components/c_facets/cf_registry.js.html)).

As registering of components and facets classes usually happens in the same module (file) that defines the class, you have to execute this module. If you use broserify for module management it is enough to use:
```
require('my_component');
```
in any other module that is executed or required.


### Messenger

__milo__ supplies internal messaging classes that can also be used for application needs. All facets in __milo__ have an instance of Messenger attached to them that defines messaging api specific to the facet, in most cases connecting to some external source (usually DOM events).

Messenger instances use instances of `MessageSource` subclasses to connect to external sources and instances of `MessengerAPI` subclasses to create higher level internal messages and transform message data. This architecture allows creating an advanced functionality in just a few lines of code.

See [Messenger documentation](http://mailonline.github.io/milo/messenger/index.js.html).


### Model

__milo__ defines Model to allow safe access to the data without the need to worry whether the data was set (it never throws when you access data when you get properties of undefined objects) and to enable possibility to subscribe to data changes similar to what experimental Object.observe and Array.observe APIs allow.

Using Model does not require these APIs, and unlike these APIs it allows subscribing to changes on properties of your Models to any depth.

See Model [demo](https://github.com/MailOnline/milo/blob/master/lib/model/demo.js) and [Model documentation](http://mailonline.github.io/milo/model/index.js.html).


### Connector

__milo__ defines this class to manage reactive connection between objects that implement data messaging API. Both instances of Data facet and of Model are such objects.

You can create one- or two-way connections, define the depth of your data structures you want to observe, turn these connections off, e.g. when you want to make many Model changes without causing DOM updates.

These connections do not have overhead of comparing data in the loop like `angularjs` does and do not cause any performance degradation when many connected objects exist.

Very soon Connector instances will support structure translation allowing creating reactive connections between models with fixed structures and DOM trees with flexible structures.

One or multiple reactive connections can be created with [milo.minder](http://mailonline.github.io/milo/minder.js.html).

See [Connector documentation](http://mailonline.github.io/milo/model/connector.js.html).


### Views and application management

- [milo.loader](http://mailonline.github.io/milo/loader.js.html) - loading subviews into page.
- [milo.mail](http://mailonline.github.io/milo/mail/index.js.html) - applicaiton level messenger that also defines `domready` event and simplifies routing of messages between iframes (see [Frame facet](http://mailonline.github.io/milo/components/c_facets/Frame.js.html)).
- [milo.config](http://mailonline.github.io/milo/config.js.html) - configuring __milo__ settings.


### Utilities

- [check](http://mailonline.github.io/milo/util/check.js.html) - check parameter types (forked from check package of Meteor framework).
- [logger](http://mailonline.github.io/milo/util/logger.js.html) - configurable logger with log levels.
- [request](http://mailonline.github.io/milo/util/request.js.html) - HTTP requests library.
- [dom](http://mailonline.github.io/milo/util/dom.js.html) - library to manipulate DOM elements.


Why Milo?
---------

__Milo__ name was chosen because of [Milo Minderbinder](http://en.wikipedia.org/wiki/Milo_Minderbinder), a war profiteer from Catch 22. Having started from managing mess operations, he expanded them into a profitable trading enterprise, that connected everybody with everything, and in that Milo and everybody else "has a share".

__Milo__ the framework has the module __binder__, that binds DOM elements to components (via special ml-bind attribute), and the module __minder__ that allows establishing live reactive connections between different data sources (Model and Data facet of components are such data sources).

Coincidentally, __Milo__ can be read as an acronym of [__MaIL Online__](http://dailymail.co.uk).


Aren't there enough browser frameworks?
---------------------------------------

All frameworks we could lay our hands on were either too primitive leaving us to write too much code of our own (jQuery, Backbone) or too limiting, with enough magic to build simple application really fast but with limited control over precise functioning of the framework (Angular, Ext).

What we always wanted was a framework that would allow

- developing applications in a __declarative__ way with __reactive__ bindings of models to views
- creating reactive data bindings between different models in application to manage data propagation in a declarative rather than in imperative style
- inserting __validators__ and __translators__ in these bindings, so we can bind views to data models rather than to view models like in AngularJS.
- __precise control__ over components linked to DOM elements.
- flexibility of views management allowing both to automatically __manipulate DOM__ on model changes and to re-render some sections using any __ templating engine__ in cases where rendering is more efficient than DOM manipulation
- ability to __dynamically create UI__
- being able to __hook into__ mechanisms behind data reactivity and to precisely control view updates and data flow
- being able to __extend functionality__ of components supplied by framework and to create new components.

We could not find such framework so we started developing __Milo__ in parallel with the application that uses it.


Architecture
------------

###Prototype based inheritance

__milo__ relies on JavaScript prototypes to build framework blocks.

JavaScript is a very dynamic language. It allows writing functions that create classes (```Component.createComponentClass```) which allowed to implement a composition pattern where each component class is created as collection of pre-defined blocks (facets) with configuration of a facet that is specific to a constructed class (it has some similarity to Ext components, although they are not created from blocks).


### Run-time code "generation"

JavaScript also allows to create constructor functions that create functions making possible a very expressive syntax for model objects and also run-time "compilation" of model access paths into functions.


### Faceted objects

Component class is based on an abstract ```FacetedObject``` class that can be applied to any domain where objects can be represented via collection of facets (a facet is an object of a certain class, it holds its own configuration, data and methods).

In a way, facets pattern is an inversion of adapter pattern - while the latter allows finding a class/methods that has specific functionality, faceted object is simply constructed to have these functionalities. In this way it is possible to create a virtually unlimited number of component classes with a very limited number of building blocks without having tall hierarchy of classes - most components inherit directly from Component class.

At the same time milo supports inheritance mechanism when subclass can add facets to those that are already in superclass and to redefine configuration of inherited facets.


### Mixins

We also use mixin pattern, but Mixin in __milo__ is implemented as a separate object that is stored on the property of the host object and can create proxy methods on the host object if required. Classes Messenger, MessageSource and DataSource are subclasses of Mixin abstract class.


### Registries: dependency inversion

Components and Facets register themselves in registries that allows to avoid requiring them from one module. It prevents circular dependencies between modules.


Dependencies
------------

The dependencies of Milo are [__Proto__](https://github.com/MailOnline/proto), an object manipulation library and [__doT__](http://olado.github.io/doT/index.html), a templating engine (both are included in milo bundle).


### No jQuery, Zepto, etc.

We do not use any DOM traversal library because:

- DOM API is much faster (in some cases 30 times faster)
- we do not want browser compatibility code to be part of the framework. If needed for some application, it can be implemented with polyfills. We may develop them for Milo if we need them, but feel free to contribute.
- application start time is noticably faster

Instead, Milo Components can have __Dom__ facet that includes several convenience functions to manipulate DOM elements and there is ```milo.util.dom``` - a similar collection of functions that can be used without components.


### No underscore, lo-dash, etc.

__milo__ uses library [__Proto__](https://github.com/MailOnline/proto) that has a grownig collection of utility functions for the manipulation of objects, prototypes, arrays, functions and strings. Please see [its repository](https://github.com/MailOnline/proto) for documentations and reasons behind the decision not to use third-party libraries.

It is bundled together with __milo__ and all its functions are available as properties of `_` object, you don't need to load it separately.


License
-------
http://opensource.org/licenses/BSD-2-Clause


Changes log
-----------

###0.1.10###
- `Messenger` performance improvement
- `MLSuperCombo` support for remote list of options
- `TransactionHistory` can emit messages
- `Model` can be used without messaging:
```
var m = new Model(data, hostObject, { reactive: false });
// data and hostObject can be undefined
```

###0.1.9###

- `MLFoldTree` - tree view UI component
- `MLSuperCombo` UI component improvements
- `milo.util.websocket` - client-side websockets (less than 150 loc)
- `Messenger` performance improvements


###0.1.8###

- Changes to `milo.util.request`

    - Handle timeout and abort events.
    - Separate timeout for `whenRequestsCompleted` method.


###0.1.7###

- Fixes and minor performance improvements


###0.1.6###

- Mixin abstract class: added methods to expose mixin subclass methods on host class prototype rather than on host object instance.
- Messenger methods are exposed on Component, facets, Model, and ModelPath using approach above
- Substantially improved performance


###0.1.5###

- `milo.util.request`

    - messaging support for jsonp and file requests.
    - `whenRequestsCompleted` method to call callback when all requests are completed
      (or if there are no pending requests)
    - tests

- `Drop` facet

    - `dragin` and `dragout` messages that only fire when mouse enters/leaves the component's element,
      ignoring enter/leave of child elements (`dragenter` and `dragleave` messages are still emitted as usual).
    - all messages are re-emitted on drag-drop service (`milo.util.dragDrop.service`).

- `milo.minder` 

    - `whenPropagationCompleted` method that calls passed callback when propagation is completed or
      when there is no data propagation. Using this function is better than subscription
      `milo.minder.once('propagationcompleted', callback)` because in the former case callback will always be called
      and in the latter only if there is propagation happening.
    - `isPropagating` method that allows to determine if data propagation is currently happening.

- Added mock for XMLHTTPRequest for testing.

- Fixed memory leaks, added `destroy` methods (`milo.destroy` and others).
  Calling `milo.destroy()` will make milo unusable, only useful inside iframe that has to be disposed of.


###0.1.4###

- Data propagation redesigned to avoid using model notification messages.
- Connector supports path translations with "*" patterns.
- Fragment utility allowing to get state of DOM fragment (including states of all components in it).
- New Frame facet method `milo` to access milo in the frame window. Can be used to call passed function when inner milo is ready even before frame is loaded (and before inner milo is available).
- Transfer facet supports multiple states.
- Sending messages via DOM storage using DOMStorage class.
- changeMode and deferChangeMode methods of connector allowing to change connection depth and/or direction.
- Command class iplementing "command pattern".
- util.request - messaging support (allows monitoring and modifying requests before they are sent), fixed listener leak.
- Minor fixes.


###0.1.3###

- Asynchronous messaging.

    - All subscribers that are now called on the next tick by default
    - If in some circumstances subscriber needs to be called synchronously, it can subscribe to the message using `onSync` method (instead of `on`).
    - If message sender needs the message to be dispatched synchronously to all subscribers it can be used with `postMessageSync` method (instead of `postMessage`).
    - Subscribers can subscribe using `onAsync` in which case ALL messages, even those emitted with `postMessageSync`, will be dispatched asynchronously.
    - DOM events are dispatched synchronously, so preventDefault etc. would work (the actual DOM event is passed as the second parameter of subscribers).

- List facet now allows multiple items already in DOM, but requires that all Items (components with Item facet) are immediate DOM children. The first item in the DOM is used as a sample for new items.


###0.1.2###

- Data propagation mechanism fixed to prevent duplication of splice changes
- Dragdrop redesigned to allow passing data via datatype during drag.


