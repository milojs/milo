'use strict';

var miloCore = require('milo-core')
    , MessengerAPI = miloCore.classes.MessengerAPI
    , _ = miloCore.proto
    , check = miloCore.util.check
    , Match = check.Match;


var WSMsgAPI = _.createSubclass(MessengerAPI, 'WSMsgAPI', true);


_.extendProto(WSMsgAPI, {
    translateToSourceMessage: translateToSourceMessage,
    filterSourceMessage: filterSourceMessage,
    createInternalData: createInternalData
});

module.exports = WSMsgAPI;


var SOCKET_MESSAGES = ['open', 'close', 'error', 'message'];

function translateToSourceMessage(message) {
    return SOCKET_MESSAGES.indexOf(message) >= 0
            ? message
            : 'message';
}


function filterSourceMessage(sourceMessage, message, msgData) {
    if (SOCKET_MESSAGES.indexOf(message) >= 0) return true; // internal message is one of external messages
    if (sourceMessage == 'message') {
        var msgType = msgData && msgData.type;
        return msgType == message; // type equals internal message
    }
};


function createInternalData(sourceMessage, message, event) {
    var internalData = sourceMessage == 'message'
                        ? _.jsonParse(event.data) || event.data
                        : event;
    return internalData;
}
