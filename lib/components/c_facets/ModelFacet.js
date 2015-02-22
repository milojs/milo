'use strict';

var ComponentFacet = require('../c_facet')
    , facetsRegistry = require('./cf_registry')
    , miloCore = require('milo-core')
    , Model = miloCore.Model
    , Mixin = miloCore.classes.Mixin
    , _ = miloCore.proto;


// generic drag handler, should be overridden
var ModelFacet = _.createSubclass(ComponentFacet, 'Model');

_.extendProto(ModelFacet, {
    init: ModelFacet$init,
    getState: ModelFacet$getState,
    setState: ModelFacet$setState,
    _createMessenger: ModelFacet$_createMessenger,
    destroy: ModelFacet$destroy
});

facetsRegistry.add(ModelFacet);

module.exports = ModelFacet;


/**
 * Expose Model class methods on ModelFacet
 */
Model.useWith(ModelFacet, 'm');


function ModelFacet$init() {
    this.m = new Model(this.config.data, this);
    ComponentFacet.prototype.init.apply(this, arguments);
    // this.m.proxyMethods(this); // Creates model's methods directly on facet
}


/**
 * ModelFacet instance method
 * Called by `Component.prototype.getState` to get facet's state
 * Simply returns model data
 *
 * @return {Object}
 */
function ModelFacet$getState() {
    var modelValue = this.m.get();
    if (typeof modelValue == 'object')
        modelValue = _.deepClone(modelValue);
    return { state: modelValue };
}


/**
 * ModelFacet instance method
 * Called by `Component.prototype.setState` to set facet's state
 * Simply sets model data
 *
 * @param {Object} state data to set on facet's model
 */
function ModelFacet$setState(state) {
    return this.m.set(state.state);
}


function ModelFacet$_createMessenger() { // Called by inherited init
    this._messenger = this.m._messenger;
}


function ModelFacet$destroy() {
    this.m.destroy();
    ComponentFacet.prototype.destroy.apply(this, arguments);
}
