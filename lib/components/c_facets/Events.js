'use strict';

var ComponentFacet = require('../c_facet')
	, _ = require('proto')
	, facetsRegistry = require('./cf_registry')
	, messengerMixin = require('./messenger');

// events facet
var Events = _.createSubclass(ComponentFacet, 'Events');

_.extendProto(Events, {
	init: initEventsFacet,
	on: messengerMixin.onMessage,
	off: messengerMixin.offMessage,
	onEvents: messengerMixin.onMessages,
	offEvents: messengerMixin.offMessages,
	trigger: messengerMixin.postMessage,
	getListeners: messengerMixin.getMessageSubscribers,
	_reattach: _reattachEventsOnElementChange
});

function initEventsFacet() {
	messengerMixin.initMessenger.call(this, '_eventsSubscribers', [
		'on', // attaches event listener
		'off', // detaches a particular listener or all listeners for event
		'onEvents', // attaches listeners to many events passed as a map
		'offEvents', // detaches ... , to detach all listeners from en event pass true
		'trigger', // trigger event listeners (pattern listeners will be triggered too)
		'getListeners' // returns array of listeners for a given event,
					   // pass false as the second parameter not to include pattern listeners
	], true /* handle DOM events attachment/detachment - only one such messenger per class/object */);

	// create partials bound to the current instance to use _eventsSubscribers
	['on', 'off', 'onEvents', 'offEvents', 'trigger', 'getListeners']
		.forEach(function(method) {
			Object.defineProperty(this, method, {
				enumerable: false,
				value: this[method].bind(this, '_eventsSubscribers');
			});
		}, this);
}


facetsRegistry.add(Events);
