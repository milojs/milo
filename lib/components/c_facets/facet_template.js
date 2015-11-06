'use strict';

var ComponentFacet = require('../c_facet')
    , facetsRegistry = require('./cf_registry')
    , _ = require('milo-core').proto;


var MyFacetClass = _.createSubclass(ComponentFacet, 'MyFacetClass');

_.extendProto(MyFacetClass, {
    init: MyFacetClass$init,
});

facetsRegistry.add(MyFacetClass);

module.exports = MyFacetClass;


function MyFacetClass$init() {
    ComponentFacet.prototype.init.apply(this, arguments);
    // .. initialization code
}
