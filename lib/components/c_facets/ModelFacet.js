'use strict';

// <a name="components-facets-model"></a>
// ###model facet

var ComponentFacet = require('../c_facet')
	, facetsRegistry = require('./cf_registry')
	, Model = require('../../model')

	, _ = require('mol-proto');


// generic drag handler, should be overridden
var ModelFacet = _.createSubclass(ComponentFacet, 'Model');

_.extendProto(ModelFacet, {
	init: ModelFacet$init,
	getState: ModelFacet$getState,
	setState: ModelFacet$setState,
	_createMessenger: ModelFacet$_createMessenger
	// _reattach: _reattachEventsOnElementChange
});

facetsRegistry.add(ModelFacet);

module.exports = ModelFacet;


function ModelFacet$init() {
	this.m = new Model(undefined, this);
	ComponentFacet.prototype.init.apply(this, arguments);
}


/**
 * ModelFacet instance method
 * Called by `Component.prototype.getState` to get facet's state
 * Simply returns model data
 *
 * @return {Object}
 */
function ModelFacet$getState() {
	return this.m.get();
}


/**
 * ModelFacet instance method
 * Called by `Component.prototype.setState` to set facet's state
 * Simply sets model data
 *
 * @param {Object} data data to set on facet's model
 */
function ModelFacet$setState() {
	return this.m.set(data);
}


function ModelFacet$_createMessenger() { // Called by inherited init
	this.m.proxyMessenger(this); // Creates messenger's methods directly on facet
	this.m.proxyMethods(this); // Creates model's methods directly on facet
}
