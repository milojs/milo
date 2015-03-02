'use strict';


var miloCore = require('milo-core')
    , MessageSource = miloCore.classes.MessageSource
    , _ = miloCore.proto
    , logger = miloCore.util.logger
    , uniqueId = require('../../util/unique_id')
    , config = require('../../config')
    , check = miloCore.util.check
    , Match = check.Match;


var WSMessageSource = _.createSubclass(MessageSource, 'WSMessageSource', true);


_.extendProto(WSMessageSource, {
    // implementing MessageSource interface
    addSourceSubscriber: addSourceSubscriber,
    removeSourceSubscriber: removeSourceSubscriber,
    
    // class specific methods
    handleEvent: WSMessageSource$handleEvent,
    connect: WSMessageSource$connect,
    trigger: WSMessageSource$trigger
});


module.exports = WSMessageSource;


function WSMessageSource$connect(options) {
    this._options = options = options || {};

    var host = options.host || window.location.host.replace(/:.*/, '')
        , port = options.port || '8080';

    var self = this;

    if (this._ws) {
        // TODO should unsubscribe differently
        this._ws.onopen = this.ws.onmessage = this.ws.onclose = this.ws.onerror = undefined;
        this._ws.close();
    }

    this._ws = new WebSocket('ws://' + host + ':' + port);

    // TODO reconnect
}



function addSourceSubscriber (sourceMessage) {
    _wsSubscriberMethod.call(this, 'addEventListener', sourceMessage);
}


function removeSourceSubscriber (sourceMessage) {
    _wsSubscriberMethod.call(this, 'removeEventListener', sourceMessage);
}


function _wsSubscriberMethod (method, sourceMessage) {    
    if (!this._ws) return logger.error('websocket is not created');
    this._ws[method](sourceMessage, this);
}


// event dispatcher - as defined by Event DOM API
function WSMessageSource$handleEvent (event) {
    this.dispatchMessage(event.type, event);
}


function WSMessageSource$trigger (msg, data, callback) {
    if (!this._ws) return logger.error('websocket is not created');

    data = data || {};
    data.type = msg;

    var self = this;
    
    if (callback) {
        data.callbackCorrId = uniqueId();
        var interval = _.delay(onTimeout, config.websocket.rpc.timeout);
        toggleRpcSubscription('once', data.callbackCorrId);
    }    

    this._ws.send(JSON.stringify(data));


    function onTimeout() {
        toggleRpcSubscription('off', data.callbackCorrId);
        callback(new Error('websocket rpc: timeout'));
    }

    function onResponse(msg, msgData) {
        clearInterval(interval);
        if (typeof msgData == 'object') {
            var err = msgData.error ? new Error(msgData.error) : null;
            callback(err, msgData.data)
        } else
            callback(new Error('websocket rpc: invalid response data'), msgData);
    }

    function toggleRpcSubscription(onOff, corrId) {
        self.messenger[onOff](config.websocket.rpc.responsePrefix + corrId, onResponse);
    }
}
