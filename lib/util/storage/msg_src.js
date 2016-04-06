'use strict';


var miloCore = require('milo-core')
    , MessageSource = miloCore.classes.MessageSource
    , _ = miloCore.proto
    , config = require('../../config')
    , uniqueId = require('../../util/unique_id');

var StorageMessageSource = _.createSubclass(MessageSource, 'StorageMessageSource', true);


_.extendProto(StorageMessageSource, {
    // implementing MessageSource interface
    init: init,
    addSourceSubscriber: StorageMessageSource$addSourceSubscriber,
    removeSourceSubscriber: StorageMessageSource$removeSourceSubscriber,
    postMessage: StorageMessageSource$postMessage,
    trigger: StorageMessageSource$trigger,

    //class specific methods
    handleEvent: handleEvent  // event dispatcher - as defined by Event DOM API
});

module.exports = StorageMessageSource;


function init(hostObject, proxyMethods, messengerAPIOrClass) {
    if (hostObject.constructor.name != 'DOMStorage')
        throw new Error('hostObject should be an instance of DOMStorage');
    this.storage = hostObject;
    this.messageKey = config.domStorage.messageKey;
    this.window = hostObject.window;
    MessageSource.prototype.init.apply(this, arguments);
}


function StorageMessageSource$addSourceSubscriber(sourceMessage) {
    this.window.addEventListener('storage', this, false);
}


function StorageMessageSource$removeSourceSubscriber(sourceMessage) {
    this.window.removeEventListener('storage', this, false);
}


function StorageMessageSource$postMessage(message, data) {
    this.messenger.postMessageSync(message, data);
}


function StorageMessageSource$trigger(msgType, data) {
    var key = this.messageKey + msgType;
    data = data || {};
    data[config.domStorage.messageTimestamp] = uniqueId();
    _.deferMethod(this.storage, 'setItem', key, data);
}


function handleEvent(event) {
    if (event.storageArea != this.storage._storage) return;
    if (typeof event.key != 'string') return;
    var key = this.storage._domStorageKey(event.key);
    if (! key) return;
    var msgType = _.unPrefix(key, this.messageKey);
    if (! msgType) return;
    var data = this.storage.getItem(key);
    if (! data) return;
    this.dispatchMessage(msgType, data);
}
