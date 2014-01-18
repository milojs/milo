'use strict';

var ComponentFacet = require('../c_facet')
	, facetsRegistry = require('./cf_registry')

	, _ = require('mol-proto');


/**
 * Transfer facet is designed for components to be able to represent other components
 * If a [Component](../c_class.js.html) has Transfer facet, when `Component.getState` is called for this componet it returns previously saved data, possibly from another component.
 * For example, a list of documents can use this facet so that each item in the list can store actual document component on it.
 */
var Transfer = _.createSubclass(ComponentFacet, 'Transfer');

_.extendProto(Transfer, {
	init: Transfer$init,
	getState: Transfer$getState,
	setState: Transfer$setState
});

facetsRegistry.add(Transfer);

module.exports = Transfer;


function Transfer$init() {
	ComponentFacet.prototype.init.apply(this, arguments);
	this._state = undefined;
}


/**
 * Transfer facet instance method
 * Returns transfer state for component. Can be obtained from another component by using `Component.getState`
 *
 * @return {Object}
 */
 function Transfer$getState() {
 	return this._state;
 }


/**
 * Transfer facet instance method
 * Sets transfer state for component. Can be obtained from another component by using `Component.getState`
 *
 * @param {Object} state
 */
 function Transfer$setState(state) {
 	this._state = state;
 }
