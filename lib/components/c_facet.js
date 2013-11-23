'use strict';

var Facet = require('../facets/f_class')
	, messengerMixin = require('./messenger')
	, _ = require('proto');

var ComponentFacet = _.createSubclass(Facet, 'ComponentFacet');

module.exports = ComponentFacet;


_.extendProto(ComponentFacet, {
	init: initComponentFacet,
	onMessage: messengerMixin.onMessage,
	offMessage: messengerMixin.offMessage,
	onMessages: messengerMixin.onMessages,
	offMessages: messengerMixin.offMessages,
	postMessage: messengerMixin.postMessage,
	getMessageSubscribers: messengerMixin.getMessageSubscribers
});

_.extendProto(ComponentFacet, messengerMixin);


function initComponentFacet() {
	// alias
	this.comp = this.owner;

	// initialize internal messenger between facets
	messengerMixin.initMessenger.call(this, '_facetMessagesSubscribers', [
		'onMessage',
		'offMessage',
		'onMessages',
		'offMessages',
		'postMessage',
		'getMessageSubscribers'
	]);
}
