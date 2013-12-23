'use strict';

var ComponentFacet = require('../c_facet')
	, facetsRegistry = require('./cf_registry')

	, _ = require('mol-proto');


// data model connection facet
var <FacetClass> = _.createSubclass(ComponentFacet, '<FacetClass>');

_.extendProto(<FacetClass>, {
	init: init<FacetClass>Facet,

	// _reattach: _reattachEventsOnElementChange
});

facetsRegistry.add(<FacetClass>);

module.exports = <FacetClass>;


function init<FacetClass>Facet() {
	ComponentFacet.prototype.init.apply(this, arguments);
}
