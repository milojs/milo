'use strict';

var Model = require('milo-core').Model
    , createFacetClass = require('../../util/create_facet_class')
    , OptionsAttribute = require('../../attributes/a_options');

var Options = module.exports = createFacetClass({
    className: 'Options',
    superClassName: 'ComponentFacet',
    methods: {
        init: Options$init,
        start: Options$start,
        _createMessenger: Options$_createMessenger,
        destroy: Options$destroy
    }
});

function Options$init() {
    this.m = new Model(this.config.options, this);
    Options.super.init.apply(this, arguments);
    this.m.proxyMethods(this);
}

function Options$start() {
    Options.super.start.apply(this, arguments);
    var attr = new OptionsAttribute(this.owner.el);
    attr.parse();
    if (attr.options) {
        if (this.config.coerceTypes) { // Only works for top level
            _.eachKey(attr.options, function (val, key) {
                if (val == 'true') return attr.options[key] = true;
                if (val == 'false') return attr.options[key] = false;
                if (_.isNumeric(val)) return attr.options[key] = +val;
            });
        }
        var current = _.deepClone(this.m.get() || {});
        _.deepExtend(current, attr.options);
        this.m.set(current);
    }
}

function Options$_createMessenger() { // Called by inherited init
    this._messenger = this.m._messenger;
}

function Options$destroy() {
    this.m.destroy();
    Options.super.destroy.apply(this, arguments);
}
