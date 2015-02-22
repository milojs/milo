'use strict';

var miloCore = require('milo-core')
    , MessageSource = miloCore.classes.MessageSource
    , domEventsConstructors = require('../de_constrs')
    , _ = miloCore.proto
    , check = miloCore.util.check
    , Match = check.Match;


var MailMessageSource = _.createSubclass(MessageSource, 'MailMessageSource', true);


_.extendProto(MailMessageSource, {
    // implementing MessageSource interface
    addSourceSubscriber: addSourceSubscriber,
    removeSourceSubscriber: removeSourceSubscriber,
    trigger: trigger,

    // class specific methods
    _windowSubscriberMethod: _windowSubscriberMethod,
    handleEvent: handleEvent,  // event dispatcher - as defined by Event DOM API
});


module.exports = MailMessageSource;


function addSourceSubscriber(sourceMessage) {
    if (isReadyStateChange(sourceMessage)) {
        if (document.readyState == 'loading')
            document.addEventListener('readystatechange', this, false);
        else {
            var EventConstructor = domEventsConstructors.readystatechange;
            var domEvent = new EventConstructor('readystatechange', { target: document });
            this.dispatchMessage('readystatechange', domEvent);
        }
    } else
        this._windowSubscriberMethod('addEventListener', sourceMessage);
}


function removeSourceSubscriber(sourceMessage) {
    if (isReadyStateChange(sourceMessage))
        document.removeEventListener('readystatechange', this, false);
    else 
        this._windowSubscriberMethod('removeEventListener', sourceMessage);
}


function isReadyStateChange(sourceMessage) {
    return sourceMessage == 'readystatechange' && typeof document == 'object';
}

function isWindowMessage(sourceMessage) {
    return sourceMessage == 'message' && typeof window == 'object';
}

function _windowSubscriberMethod(method, sourceMessage) {
    if (isWindowMessage(sourceMessage))
        window[method]('message', this, false);
}


// event dispatcher - as defined by Event DOM API
function handleEvent(event) {
    this.dispatchMessage(event.type, event);
}


function trigger(msgType, data) {
    data = data || {};
    data.type = 'message:' + msgType;
    
    if (typeof window == 'object')
        window.postMessage(data, '*')
}
