'use strict';


var MessageSource = require('../../messenger/m_source')
    , _ = require('mol-proto')
    , config = require('../../config')
    , StorageMessageSourceError = require('../../util/error').StorageMessageSource;

var StorageMessageSource = _.createSubclass(MessageSource, 'StorageMessageSource', true);


_.extendProto(StorageMessageSource, {
    // implementing MessageSource interface
    init: init,
    addSourceSubscriber: addSourceSubscriber,
    removeSourceSubscriber: removeSourceSubscriber,
    trigger: trigger,

    //class specific methods
    handleEvent: handleEvent  // event dispatcher - as defined by Event DOM API
});

module.exports = StorageMessageSource;


function init(hostObject, proxyMethods, messengerAPIOrClass) {
    if (hostObject.constructor.name != 'DOMStorage')
        throw new StorageMessageSourceError('hostObject should be an instance of DOMStorage');
    this.storage = hostObject;
    this.messageKey = config.domStorage.messageKey;
    this.window = hostObject.window;
    MessageSource.prototype.init.apply(this, arguments);
}


// addIFrameMessageListener
function addSourceSubscriber(sourceMessage) {
    this.window.addEventListener('storage', this, false);
}


// removeIFrameMessageListener
function removeSourceSubscriber(sourceMessage) {
    this.window.removeEventListener('storage', this, false);
}


function trigger(msgType, data) {
    _.deferMethod(this.storage, 'setItem', this.messageKey + msgType, data);
}


function handleEvent(event) {
    if (event.storageArea != this.storage._storage) return;
    var key = this.storage._domStorageKey(event.key);
    if (! key) return;
    var msgType = _.unPrefix(key, this.messageKey);
    if (! msgType) return;
    var data = this.storage.getItem(key);
    this.dispatchMessage(msgType, data);
}
