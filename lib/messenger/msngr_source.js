'use strict';


var MessageSource = require('./m_source')
    , _ = require('mol-proto')
    , check = require('../util/check');


/**
 * Subclass of MessageSource that allows to connect Messenger to another Messenger using it as external source.
 */
var MessengerMessageSource = _.createSubclass(MessageSource, 'MessengerMessageSource');

module.exports = MessengerMessageSource;


/**
 * ####MessengerMessageSource instance methods####
 */
_.extendProto(MessengerMessageSource, {
    init: init,
    addSourceSubscriber: addSourceSubscriber,
    removeSourceSubscriber: removeSourceSubscriber,
    postMessage: MessengerMessageSource$postMessage
});

/**
 * Initializes MessengerMessageSource
 * Defines one parameter in addition to [MessageSource](./m_source.js.html) parameters
 *
 * @param {Messenger} sourceMessenger messenger this message source connects to
 */
function init(hostObject, proxyMethods, messengerAPI, sourceMessenger) {
    MessageSource.prototype.init.apply(this, arguments);
    this.sourceMessenger = sourceMessenger;
}


/**
 * Subscribes to source message. See [MessageSource](./m_source.js.html) docs.
 *
 * @param {String|Regex} sourceMessage source message to subscribe to
 */
function addSourceSubscriber(sourceMessage) {
    this.sourceMessenger.onSync(sourceMessage, { context: this, subscriber: this.dispatchMessage });
}


/**
 * Unsubscribes from source message. See [MessageSource](./m_source.js.html) docs.
 *
 * @param {String|Regex} sourceMessage source message to unsubscribe from
 */
function removeSourceSubscriber(sourceMessage) {
    this.sourceMessenger.off(sourceMessage, { context: this, subscriber: this.dispatchMessage });
}


/**
 * Overrides defalut message source to dispatch messages synchronously
 * 
 * @param {String} message
 * @param {Object} data
 */
function MessengerMessageSource$postMessage(message, data) {
    this.messenger.postMessageSync(message, data);
}
