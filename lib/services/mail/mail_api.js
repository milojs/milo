'use strict';

var miloCore = require('milo-core')
    , MessengerAPI = miloCore.classes.MessengerAPI
    , _ = miloCore.proto;


var MailMsgAPI = _.createSubclass(MessengerAPI, 'MailMsgAPI', true);


_.extendProto(MailMsgAPI, {
    translateToSourceMessage: translateToSourceMessage,
    filterSourceMessage: filterSourceMessage
});

module.exports = MailMsgAPI;


// TODO: this function should return relevant DOM event dependent on element tag
// Can also implement beforedatachanged event to allow preventing the change
// translateToDomEvent
var windowMessageRegExp = /^message\:/
    , windowMessagePrefix = 'message:';

function translateToSourceMessage(message) {
    if (message == 'domready')
        return 'readystatechange';
    else if (windowMessageRegExp.test(message))
        return 'message';
}


// filterDataMessage
function filterSourceMessage(sourceMessage, msgType, msgData) {
    if (sourceMessage == 'readystatechange') {
        //return document.readyState == 'interactive';
        //  return false;
        // _.defineProperty(this, '_domReadyFired', true, _.WRIT);
        return true;
    } else if (sourceMessage == 'message')
        return windowMessagePrefix + msgData.data.type == msgType;
}
