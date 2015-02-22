'use strict';

var ComponentFacet = require('../c_facet')
    , facetsRegistry = require('./cf_registry')
    , _ = require('milo-core').proto;


var <FacetClass> = _.createSubclass(ComponentFacet, '<FacetClass>');

_.extendProto(<FacetClass>, {
    init: <FacetClass>$init,
});

facetsRegistry.add(<FacetClass>);

module.exports = <FacetClass>;


function <FacetClass>$init() {
    ComponentFacet.prototype.init.apply(this, arguments);
    // .. initialization code
}
