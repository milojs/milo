'use strict';

var Model = require('milo-core').Model,
    createFacetClass = require('../../util/create_facet_class');

var Options = module.exports = createFacetClass({
    className: 'Options',
    superClassName: 'ComponentFacet',
    methods: {
        init: Options$init,
        _createMessenger: Options$_createMessenger,
        destroy: Options$destroy
    }
});

function Options$init() {
    this.m = new Model(this.config.options, this);
    Options.super.init.apply(this, arguments);
    this.m.proxyMethods(this);
}

function Options$_createMessenger() { // Called by inherited init
    this._messenger = this.m._messenger;
}

function Options$destroy() {
    this.m.destroy();
    Options.super.destroy.apply(this, arguments);
}
