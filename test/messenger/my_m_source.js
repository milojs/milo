'use strict';

var MessageSource = require('../../lib/messenger/m_source')
    , _ = require('mol-proto');

// Although it is made for the test only, this MessageSource subclass uses
// another Messenger as its source. Can be used somewhere in app to chain messengers.

// Subclass of MessageSource
var MyMessageSource = _.createSubclass(MessageSource, 'MyMessageSource');

module.exports = MyMessageSource;


// MessageSource subclass should implement at least two methods, init is optional
_.extendProto(MyMessageSource, {
    init: init,
    addSourceSubscriber: addSourceSubscriber,
    removeSourceSubscriber: removeSourceSubscriber,
});

function init(hostObject, proxyMethods, messengerAPI, sourceMessenger) {
    MessageSource.prototype.init.apply(this, arguments);
    this.sourceMessenger = sourceMessenger;
}

function addSourceSubscriber(message) {
    this.sourceMessenger.onSync(message, handleSourceMessage(this, message));
}

function removeSourceSubscriber(message) {
    this.sourceMessenger.off(message, handleSourceMessage(this, message));
}


// returns and caches functions that call dispatchMessage on the context
// because functions are cached, they can be used to unsubscribe from message
var _sourceMessages = {};
function handleSourceMessage(context, message) {
    var messageFuncs = _sourceMessages[message] =
        _sourceMessages[message] || { contexts: [], funcs: [] };

    var funcIndex = messageFuncs.contexts.indexOf(context);

    if (funcIndex >= 0)
        return messageFuncs.funcs[funcIndex];
    else {
        var func = function(sourceMessage, sourceData) {
            context.dispatchMessage(sourceMessage, sourceData)
        };
        messageFuncs.contexts.push(context);
        messageFuncs.funcs.push(func);
        return func;
    }
}
