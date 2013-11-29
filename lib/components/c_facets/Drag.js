'use strict';

var ComponentFacet = require('../c_facet')
	, facetsRegistry = require('./cf_registry')

	, _ = require('mol-proto');


// data model connection facet
var Drag = _.createSubclass(ComponentFacet, 'Drag');

_.extendProto(Drag, {
	init: initDragFacet,
	start: startDragFacet,
	require: ['Events'] // TODO implement facet dependencies

	// _reattach: _reattachEventsOnElementChange
});

facetsRegistry.add(Drag);

module.exports = Drag;


function initDragFacet() {
	ComponentFacet.prototype.init.apply(this, arguments);
}

function startDragFacet() {

}
