'use strict';

var messengerMixin = require('./messenger')
	, _ = require('proto');

var ComponentFacet = _.createSubclass(Facet, 'ComponentFacet');

module.exports = ComponentFacet;


_.extendProto(ComponentFacet, {
	init: initComponentFacet,
});

_.extendProto(ComponentFacet, messengerMixin);


function initComponentFacet() {
	// alias
	this.comp = this.owner;
	this.initMessenger();
}
