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
	_createMessenger: ModelFacet$_createMessenger
	// _reattach: _reattachEventsOnElementChange
});

facetsRegistry.add(ModelFacet);

module.exports = ModelFacet;


function ModelFacet$init() {
	this.m = new Model(undefined, this);
	ComponentFacet.prototype.init.apply(this, arguments);
}

function ModelFacet$_createMessenger() { // Called by inherited init
	this.m.proxyMessenger(this); // Creates messenger's methods directly on facet
	this.m.proxyMethods(this); // Creates model's methods directly on facet
}
