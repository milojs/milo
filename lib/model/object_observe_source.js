'use strict';

var MessageSource = require('./message_source')
	, Component = require('./components/c_class')

	, _ = require('mol-proto')
	, check = require('./util/check')
	, Match = check.Match;


var ObjectObserveSource = _.createSubclass(MessageSource, 'ObjectObserveSource', true);


_.extendProto(DOMEventsSource, {
	// implementing MessageSource interface
	init: initObjectObserveSource,
	translateToSourceMessage: translateToObjectReference, // ???
 	addSourceListener: addObjectObserver,
 	removeSourceListener: removeObjectObserver,
 	filterSourceMessage: filterObjectNotification,

 	// 
});

module.exports = ObjectObserveSource;


function initObjectObserveSource(hostObject, proxyMethods, model) {
	MessageSource.prototype.init.apply(this, arguments);

	this.model = model;
}


function translateToObjectReference (modelPath) {

}
