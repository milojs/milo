'use strict';

var ComponentFacet = require('../c_facet')
    , facetsRegistry = require('./cf_registry')
    , Model = require('../../model')

    , _ = require('mol-proto');


// generic drag handler, should be overridden
var Options = _.createSubclass(ComponentFacet, 'Options');

_.extendProto(Options, {
    init: Options$init,
    _createMessenger: Options$_createMessenger
});

facetsRegistry.add(Options);

module.exports = Options;


function Options$init() {
    this.m = new Model(this.config.options, this);
    ComponentFacet.prototype.init.apply(this, arguments);
    this.m.proxyMethods(this); // Creates model's methods directly on facet
}


function Options$_createMessenger() { // Called by inherited init
    this.m.proxyMessenger(this); // Creates messenger's methods directly on facet
}
