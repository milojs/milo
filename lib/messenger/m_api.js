'use strict';

var _ = require('mol-proto')
    , logger = require('../util/logger');


module.exports = MessengerAPI;


/**
 * `milo.classes.MessengerAPI`
 * Base class, subclasses of which can supplement the functionality of [MessageSource](./m_source.js.html) by implementing three methods:
 *
 * - `translateToSourceMessage` to translate source messages (recieved from external source via `MessageSOurce`) to internal messages (that are dispatched on Messenger), allowing to make internal messages more detailed than source messages. For example, [Data facet](../components/c_facets/Data.js.html) uses [DataMsgAPI](../components/msg_api/data.js.html) to define several internal messages related to the change of state in contenteditable DOM element.
 * - `createInternalData` to modify message data received from source to some more meaningful or more detailed message data that will be dispatched on Messenger. For example, [Data facet](../components/c_facets/Data.js.html) uses [DataMsgAPI](../components/msg_api/data.js.html) (subclass of MessengerAPI) to translate DOM messages to data change messages.
 * - `filterSourceMessage` to enable/disable message dispatch based on some conditions in data.
 *
 * If `MessageSource` constructor is not passed an instance of some subclass of `MessengerAPI`, it automatically creates an instance of MessengerAPI that defines all 3 of those methods in a trivial way. See these methods below for their signatures.
 *
 * @constructor
 * @this {MessengerAPI}
 * @return {MessengerAPI}
 */
function MessengerAPI() {
    if (this.init)
        this.init.apply(this, arguments);
}


/**
 * ####MessengerAPI instance methods####
 *
 * - [init](#init) - initializes MessengerAPI
 * - [addInternalMessage](#addInternalMessage) - adds internal message
 * - [removeInternalMessage](#removeInternalMessage) - removes internal message
 * - [getInternalMessages](#getInternalMessages) - returns the list of internal messages for given source message
 *
 * These methods should be redefined by subclass:
 *
 * - [translateToSourceMessage](#translateToSourceMessage) - converts internal message type to source (external) message type
 * - [createInternalData](#createInternalData) - converts source message data received via MessageSource to internal message data
 * - [filterSourceMessage](#filterSourceMessage) - filters source message based on the data of the message and the corresponding internal message that is about to be sent on Messenger
 */
_.extendProto(MessengerAPI, {
    init: init,
    destroy: MessengerAPI$destroy,
    addInternalMessage: addInternalMessage,
    removeInternalMessage: removeInternalMessage,
    getInternalMessages: getInternalMessages,

    // should be redefined by subclass
    translateToSourceMessage: translateToSourceMessage,
    createInternalData: createInternalData,
    filterSourceMessage: filterSourceMessage
});


/**
 * MessengerAPI instance method
 * Called by MessengerAPI constructor. Subclasses that re-implement `init` method should call this method using: `MessengerAPI.prototype.init.apply(this, arguments)`
 */
function init() {
    _.defineProperty(this, '_internalMessages', {});
}


/**
 * Destroys messenger API
 */
function MessengerAPI$destroy() {

}


/**
 * MessengerAPI instance method
 * Translates internal `message` to source message, adds internal `message` to the list, making sure the same `message` wasn't passed before (it would indicate Messenger error).
 * Returns source message if it is used first time (so that `MessageSource` subcribes to this source message) or `undefined`.
 *
 * @param {String} message internal message to be translated and added
 * @return {String|undefined}
 */
function addInternalMessage(message) {
    var internalMsgs
        , sourceMessage = this.translateToSourceMessage(message);

    if (typeof sourceMessage == 'undefined') return;

    if (this._internalMessages.hasOwnProperty(sourceMessage)) {
        internalMsgs = this._internalMessages[sourceMessage];
        if (internalMsgs.indexOf(message) == -1)
            internalMsgs.push(message);
        else
            logger.warn('Duplicate addInternalMessage call for internal message ' + message);
    } else {
        internalMsgs = this._internalMessages[sourceMessage] = [];
        internalMsgs.push(message);
        return sourceMessage;
    }
}


/**
 * MessengerAPI instance method
 * Removes internal `message` from the list connected to corresponding source message (`translateToSourceMessage` is used for translation).
 * Returns source message, if the last internal message was removed (so that `MessageSource` can unsubscribe from this source message), or `undefined`.
 *
 * @param {String} message internal message to be translated and removed
 * @return {String|undefined}
 */
function removeInternalMessage(message) {
    var sourceMessage = this.translateToSourceMessage(message);

    if (typeof sourceMessage == 'undefined') return;

    var internalMsgs = this._internalMessages[sourceMessage];

    if (internalMsgs && internalMsgs.length) {
        var messageIndex = internalMsgs.indexOf(message);
        if (messageIndex >= 0) {
            internalMsgs.splice(messageIndex, 1);
            if (internalMsgs.length == 0) {
                delete this._internalMessages[sourceMessage];
                return sourceMessage;
            }
        } else
            unexpectedNotificationWarning();
    } else
        unexpectedNotificationWarning();


    function unexpectedNotificationWarning() {
        logger.warn('notification received: un-subscribe from internal message ' + message
                     + ' without previous subscription notification');
    }
}


/**
 * MessengerAPI instance method
 * Returns the array of internal messages that were translated to given `sourceMessage`.
 * This method is used by `MessageSource` to dispatch source message on the `Mesenger`.
 *
 * @param {String} sourceMessage source message
 * @return {Array[String]}
 */
function getInternalMessages(sourceMessage) {
    return this._internalMessages[sourceMessage];
}


/**
 * MessengerAPI instance method
 * Subclasses should re-implement this method to define the rule for translation of internal `message` to source message. This class simply returns the same `message`.
 *
 * @param {String} message internal message to be translated
 * @return {String}
 */
function translateToSourceMessage(message) {
    return message
}


/**
 * MessengerAPI instance method
 * Subclasses should re-implement this method to define the rule for translation of source message data to internal message data. This class simply returns the same `sourceData`.
 * This method is used in [dispatchMessage](./m_source.js.html#dispatchMessage) method of `MessageSource`.
 *
 * @param {String} sourceMessage source message, can be used in translation rule
 * @param {String} message internal message, can be used in translation rule
 * @param {Object} sourceData data received from source that has to be translated to data that will be sent to internal Messenger subscriber
 * @return {Object}
 */
function createInternalData(sourceMessage, message, sourceData) {
    return sourceData;
}


/**
 * MessengerAPI instance method
 * Subclasses should re-implement this method to define the dispatch filter for internal messages. This method should return `true` to allow and `false` to prevent internal message dispatch. This class always returns `true`.
 * This method is used in [dispatchMessage](./m_source.js.html#dispatchMessage) method of `MessageSource`.
 *
 * @param {String} sourceMessage source message, can be used in filter rule
 * @param {String} message internal message, can be used in filter rule
 * @param {Object} internalData data translated by `createInternalData` method from source data, can be used in filter rule
 * @return {Boolean}
 */
function filterSourceMessage(sourceMessage, message, internalData) {
    return true;
}
