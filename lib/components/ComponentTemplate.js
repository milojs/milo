'use strict';

var Component = require('../c_class')
    , componentsRegistry = require('../c_registry')
    , _ = require('milo-core').proto;

var MyComponent = Component.createComponentClass('MyComponent', {
    container: undefined, // optional
    dom: undefined // optional
    // ,... other facets
});

componentsRegistry.add(MyComponent);

module.exports = MyComponent;


_.extendProto(MyComponent, {
    init: MyComponent$init
    // ...
});


function MyComponent$init() {
    Component.prototype.init.apply(this, arguments);
    // ...
}
