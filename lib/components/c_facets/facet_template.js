'use strict';

var ComponentFacet = require('../c_facet')
	, facetsRegistry = require('./cf_registry')

	, _ = require('mol-proto');


var <FacetClass> = _.createSubclass(ComponentFacet, '<FacetClass>');

_.extendProto(<FacetClass>, {
	init: init<FacetClass>Facet,
});

facetsRegistry.add(<FacetClass>);

module.exports = <FacetClass>;


function init<FacetClass>Facet() {
	ComponentFacet.prototype.init.apply(this, arguments);
	// .. initialization code
}
