'use strict';

var _ = require('mol_proto');

// an abstract class for dispatching external to internal events
var MessageSource = _.createSubclass(Mixin, 'MessageSource');


_.extendProto(MessageSource, {
	init: initMessageSource,
	subscriberAdded: toBeImplemented, // called by messenger to notify when the first subscriber was added
 	subscriberRemoved: toBeImplemented, // called by messenger to no
 	addSourceListener: toBeImplemented,
 	dispatchMessage: toBeImplemented,
});


function initMessageSource() {
	Object.defineProperties(this, {
 		_sourceMessages: { value: {} },
 		_patternMessageSubscribers: { value: {} },
 		_messageSource: { value: messageSource }
 	});
}
