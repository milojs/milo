'use strict';

var Facet = require('../facets/f_class')
	, messengerMixin = require('./messenger')
	, _ = require('proto');

var ComponentFacet = _.createSubclass(Facet, 'ComponentFacet');

module.exports = ComponentFacet;


_.extendProto(ComponentFacet, {
	init: initComponentFacet,
});

_.extendProto(ComponentFacet, messengerMixin);


function initComponentFacet() {
	this.initMessenger();
}
