Milo
====

A minimalist browser framework that binds HTML elements to JS components and components to models.

[![Build Status](https://travis-ci.org/MailOnline/milo.png?branch=master)](https://travis-ci.org/MailOnline/milo)


Quick start
-----------

While __Milo__ is the work in progress that has just started, you can already do
quite a few things with it.

### Install

    npm install mol-milo

or

    bower intall milo


### Try

index.html
```html
<html>
<head>
	<script src="milo.bundle.js"></script>
	<script src="index.js"></script>
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
```

index.js
```javascript
var ctrl = milo.binder();

ctrl.myField.data.on('datachange', function(msg, data) {
	ctrl.myCurrentValue.el.innerHTML = data.newValue;
});

ctrl.myTestButton.events.on('click', function(msg, event) {
	ctrl.myTestValue.el.innerHTML = ctrl.myField.data.value();
});
```


Modules and classes
-------------------

### milo

- .__loader__ - loading subviews into page
- .__binder__ - components instantiation and binding of DOM elements to them
- .__minder__ - data reactivity, one or two way, shallow or deep, as you like it
- .__mail__ - applicaiton level messenger
- .__config__ - milo options
- .__utils__ - logger, request, error, etc.
- .__classes__ - foundation classes and class registries

### Facets

- __Dom__ - DOM manipulation
- __Data__ - Component data source and data messages
- __Events__ - DOM events
- __Template__ - template based rendering with any engine that can compile templates
- __Container__ - scope contained components to avoid namespace conflicts
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

We could not find such framework so we started developing __Milo__ in parallel with the application that uses this it.


Architecture
------------

###Prototype based inheritance

Unlike many frameworks, we rely on JavaScript prototypes to build framework blocks.

JavaScript is a very dynamic language. It allows writing functions that create classes (```Component.createComponentClass```) which allowed to implement a composition pattern where each component class is created as collection of pre-defined blocks
(facets) with configuration of a facet that is specific to a constructed class
(it has some similarity to Ext components, althouggh they are not created from blocks).

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
prototypes, arrays, functions and strings. Please see its repository
for documentations and reasons behind our decision not to use
third-party libraries.

It is bundled together with milo and all its functions are available as
properties of _ object.
