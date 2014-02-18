'use strict';

var Component = require('../c_class')
    , componentsRegistry = require('../c_registry');


var MyComponent = Component.createComponentClass('MyComponent', {
    container: undefined, // optional
    dom: undefined // optional
    // ,... other facets
});

componentsRegistry.add(MyComponent);

module.exports = MyComponent;
