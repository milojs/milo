'use strict';

var config = require('../config')
    , uniqueId = require('./unique_id');

module.exports = zeroTimeout;


var callbacks, enabled;
var MESSAGE = config.messaging.zeroTimeoutMessage;


function zeroTimeout(fn, wait) {
    if (wait) return setTimeout(fn, wait);
    if (!enabled) {
        console.info('enabling zeroTimeout');
        window.addEventListener('message', handleMessage, true);
        callbacks = [];
        enabled = true;
    }
    callbacks.push(fn);
    window.postMessage(MESSAGE, '*');
}


function handleMessage(event) {
    if (event.source == window && event.data == MESSAGE) {
        event.stopPropagation();
        event.stopImmediatePropagation();
        if (callbacks.length) {
            var fn = callbacks.shift();
            fn();
        }
    }
}
