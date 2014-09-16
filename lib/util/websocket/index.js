'use strict';

/**
 * `milo.util.websocket` 
**/


var Messenger = require('../../messenger')
    , WSMessageSource = require('./msg_src')
    , WSMsgAPI = require('./msg_api');


function websocket() {
    var wsMessenger = new Messenger;
    var wsMsgSource = new WSMessageSource(wsMessenger, { send: 'trigger', connect: 'connect' }, new WSMsgAPI);
    wsMessenger._setMessageSource(wsMsgSource);
    return wsMessenger;
}


module.exports = websocket;
