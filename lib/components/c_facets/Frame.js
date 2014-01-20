'use strict';


var ComponentFacet = require('../c_facet')
	, facetsRegistry = require('./cf_registry')
	, Messenger = require('../../messenger')
	, FrameMessageSource = require('../msg_src/frame')
	, domEventsConstructors = require('../msg_src/de_constrs')
	, _ = require('mol-proto');


/**
 * `milo.registry.facets.get('Frame')`
 * Component facet that simplifies sending window messages to iframe and subscribing to messages on inner window of iframe.
 * All public methods of Messenger and `trigger` method of [FrameMessageSource](../msg_src/frame.js.html) are proxied directly to this facet.
 * For example, to send custom message to iframe window use:
 * ```
 * iframeComponent.frame.trigger('mymessage', myData);
 * ```
 * To subscribe to this messages inside frame use (with milo - see [milo.mail](../../mail/index.js.html)):
 * ```
 * milo.mail.on('message:mymessage', function(msgType, msgData) {
 *	   // data is inside of window message data
 *     // msgType == 'message:mymessage'
 *     var myData = msgData.data;
 *     // ... app logic here
 * });
 * ```
 * or without milo:
 * ```
 * window.attachEventListener('message', function(message) {
 *     var msgType = message.type; // e.g., 'mymessage'
 *     var myData = message.data;
 *     // ... message routing and code here
 * });
 * ```
 * Milo does routing based on sent message type automatically.
 * See [Messenger](../../messenger/index.js.html) and [milo.mail](../../mail/index.js.html).
 */
 var Frame = _.createSubclass(ComponentFacet, 'Frame');


/**
 * ####Events facet instance methods####
 *
 * - [init](#Frame$init) - called by constructor automatically
 */
_.extendProto(Frame, {
	init: Frame$init,
	start: Frame$start,
	getWindow: Frame$getWindow,
	isReady: Frame$isReady
	// _reattach: _reattachEventsOnElementChange
});


facetsRegistry.add(Frame);

module.exports = Frame;


/**
 * Frame facet instance method
 * Initialzes facet, connects FrameMessageSource to facet's messenger
 */
function Frame$init() {
	ComponentFacet.prototype.init.apply(this, arguments);
	
	var messageSource = new FrameMessageSource(this, { trigger: 'trigger' }, undefined, this.owner);
	this._setMessageSource(messageSource);

	_.defineProperty(this, '_messageSource', messageSource);
}


/**
 * Frame facet instance method
 * Emits frameloaded event when ready.
 */
function Frame$start() {
	ComponentFacet.prototype.start.apply(this, arguments);
	var self = this;
	var doc = this.getWindow().document;
	if (doc.readyState == 'loading') {
		doc.addEventListener('readystatechange', function(event) {
			self.postMessage('domready', event);
		});
	} else {
		var EventConstructor = domEventsConstructors.readystatechange;
		var domEvent = new EventConstructor('readystatechange', { target: doc });
		this.postMessage('domready', domEvent);
	}
}


/**
 * Frame facet instance method
 * Retrieves the internal window of the frame 
 *
 * @param {Window}
 */
function Frame$getWindow() {
	return this.owner.el.contentWindow;
}


/**
 * Frame facet instance method
 * Returns document.readyState if frame doument state is 'interactive' or 'complete', false otherwise
 *
 * @return {String|Boolean}
 */
function Frame$isReady() {
	var readyState = this.getWindow().document.readyState;
	return  readyState != 'loading' ? readyState : false;
}
