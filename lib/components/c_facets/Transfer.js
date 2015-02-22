'use strict';

var ComponentFacet = require('../c_facet')
    , facetsRegistry = require('./cf_registry')
    , _ = require('milo-core').proto;


/**
 * Transfer facet is designed for components to be able to represent other components
 * If a [Component](../c_class.js.html) has Transfer facet, when `Component.getState` is called for this componet it returns previously saved data, possibly from another component.
 * For example, a list of documents can use this facet so that each item in the list can store actual document component on it.
 */
var Transfer = _.createSubclass(ComponentFacet, 'Transfer');

_.extendProto(Transfer, {
    init: Transfer$init,
    getState: Transfer$getState,
    setState: Transfer$setState,
    setActiveState: Transfer$setActiveState,
    setStateWithKey: Transfer$setStateWithKey,
    getStateWithKey: Transfer$getStateWithKey,
    getComponentMeta: Transfer$getComponentMeta
});

facetsRegistry.add(Transfer);

module.exports = Transfer;


function Transfer$init() {
    ComponentFacet.prototype.init.apply(this, arguments);
    this._activeState = '';
    this._defaultKey = '';
    this._state = {};
}


/**
 * Transfer facet instance method
 * Returns transfer state for component. Can be obtained from another component by using `Component.getState`
 *
 * @return {Object}
 */
function Transfer$getState() {
    return this._state[this._activeState] || this._state[this._defaultKey];
}


/**
 * Transfer facet instance method
 * Sets transfer state for component. Can be obtained from another component by using `Component.getState`
 *
 * @param {Object} state
 */
function Transfer$setState(state) {
    this._state[''] = state;
    this.setActiveState('');
}

/**
 * Transfer facet instance method
 * Sets the active state (used by getState)
 * @param {[type]} key [description]
 */
function Transfer$setActiveState(key) {
    this._activeState = key;
}

/**
 * Transfer facet instance method
 * Sets transfer state for component without default key. Can be obtained from another component by using `Component.getState`
 * When the active state is set to the expected key
 * @param {[type]} key   [description]
 * @param {[type]} state [description]
 * @param {Boolean} isDefaultKey (Optional)
 */
function Transfer$setStateWithKey(key, state, isDefaultKey) {
    if (!key) throw new Error('Transfer$setStateWithKey: no key');

    if (isDefaultKey)
        this._defaultKey = key;
    else
        this._defaultKey = this._defaultKey || key;

    this._state[key] = state;
    this.setActiveState(key);
}


function Transfer$getStateWithKey(key) {
    return typeof key == 'string' && this._state[key];
}


function Transfer$getComponentMeta() {
    var state = this.getState();
    return {
        compName: state && state.compName,
        compClass: state && state.compClass
    };
}
