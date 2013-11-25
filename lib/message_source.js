'use strict';

var Mixin = require('./mixin')
	, _ = require('mol-proto');

// an abstract class for dispatching external to internal events
var MessageSource = _.createSubclass(Mixin, 'MessageSource');


_.extendProto(MessageSource, {
	// initializes messageSource - called by Mixin superclass
	init: initMessageSource,

	// called by Messenger to notify when the first subscriber for an internal message was added
	onSubscriberAdded: onSubscriberAdded,

	// called by Messenger to notify when the last subscriber for an internal message was removed
 	onSubscriberRemoved: onSubscriberRemoved, 
 	
	// converts internal message type to external message type - should be implemented in subclass
	translateToExternalMessage: toBeImplemented,

	// converts external message type to internal message type - should be implemented in subclass
	translateToInternalMessage: toBeImplemented,

 	// adds listener to external message - should be implemented by subclass
 	addExternalListener: toBeImplemented,

 	// removes listener from external message - should be implemented by subclass
 	removeExternalListener: toBeImplemented,

 	// dispatches external message - should be implemented by subclass
 	dispatchMessage: toBeImplemented,
});


function initMessageSource() {
	Object.defineProperty(this, '_externalToInternalMessagesMap', { value: {} });
}


function onSubscriberAdded() {

}


function onSubscriberRemoved() {
	
}


function toBeImplemented() {

}

