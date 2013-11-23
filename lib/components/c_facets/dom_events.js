'use strict';

var _ = require('proto');

var eventTypes = {
	ClipboardEvent: ['copy', 'cut', 'paste', 'beforecopy', 'beforecut', 'beforepaste'],

};


// mock window and event constructors for testing
if (typeof window == 'undefined') {
	window = {};
	_.eachKey(eventTypes, function(eTypes, eventConstructorName) {
		var eventsConstructor;
		eval(
			'eventsConstructor = function ' + eventConstructorName + '(type, properties) { \
				this.type = type; \
				_.extend(this, properties); \
			};'
		);
		window[eventConstructorName] = eventsConstructor;
	});
}


var eventsConstructors = {};

_.eachKey(eventTypes, function(eTypes, eventConstructorName) {
	eTypes.forEach(function(type) {
		if (Object.hasOwnProperty(eventsConstructors, type))
			throw new Error('duplicate event type ' + type);

		eventsConstructors[type] = window[eventConstructorName];
	});
});

module.exports = eventsConstructors;
