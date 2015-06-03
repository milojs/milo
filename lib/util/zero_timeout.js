'use strict';

var config = require('../config');

module.exports = zeroTimeout;


var callbacks = [];
var enabled = false;
var MESSAGE = config.messaging.zeroTimeoutMessage;


function zeroTimeout(fn) {
    if (!enabled) {
        window.addEventListener('message', handleMessage, true);
        enabled = true;
    }
    var id = callbacks.push(fn) - 1;
    window.postMessage(MESSAGE, '*');
    return id;
}


function handleMessage(event) {
    if (event.source == window && event.data == MESSAGE) {
        event.stopImmediatePropagation();
        if (callbacks.length) {
            var fn = callbacks.shift();
            fn();
        }
    }
}



zeroTimeout.clear = function clearZeroTimeout(id) {
    callbacks.splice(id, 1);
}
