'use strict';

var config = require('../config')
    , uniqueId = require('./unique_id');

module.exports = zeroTimeout;


var callbacks = [];
var enabled = false;
var MESSAGE = config.messaging.zeroTimeoutMessage;


function zeroTimeout(fn) {
    if (!enabled) {
        window.addEventListener('message', handleMessage, true);
        enabled = true;
    }
    var id = uniqueId();
    callbacks.push({ id: id, fn: fn });
    window.postMessage(MESSAGE, '*');
    return id;
}


function handleMessage(event) {
    if (event.source == window && event.data == MESSAGE) {
        event.stopImmediatePropagation();
        if (callbacks.length) {
            var callback = callbacks.shift();
            callback.fn();
        }
    }
}


zeroTimeout.clear = function clearZeroTimeout(id) {
    var cbIndex = _.findIndex(callbacks, function(cb) {
        return cb.id == id;
    });
    if (cbIndex >= 0) callbacks.splice(cbIndex, 1);
}
