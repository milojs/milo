'use strict';


var MessengerAPI = require('../../messenger/m_api')


var DropMsgAPI = _.createSubclass(MessengerAPI, 'DropMsgAPI', true);


_.extendProto(DropMsgAPI, {
    // implementing MessageSource interface
    translateToSourceMessage: translateToSourceMessage,
    filterSourceMessage: filterSourceMessage,
});


var dropEventsMap = {
    'dragin': 'dragenter',
    'dragout': 'dragleave'
};


function translateToSourceMessage(message) {
    return dropEventsMap.hasOwnProperty(message)
            ? dropEventsMap[message]
            : message;
}


function filterSourceMessage(sourceMessage, message, data) { // data is DOM event object
    var ok = true;

    if (sourceMessage == 'dragenter' && message == 'dragin') {
        this._currentTarget = data.target;
        ok = !this._inside;
        this._inside = true;
    } else if (sourceMessage == 'dragleave' && message == 'dragout') {
        ok = this._currentTarget == data.target;
        if (ok) {
            delete this._currentTarget;
            delete this._inside;
        }
    }

    console.log(sourceMessage, message, ok);
    return ok;
}
