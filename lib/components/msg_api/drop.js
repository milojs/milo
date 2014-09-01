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
    switch (sourceMessage) {
        case 'dragenter':
            if (message == 'dragin') {
                this._currentTarget = data.target;
                ok = !this._inside;
                this._inside = true;
            }
            break;
        case 'dragleave':
            if (message == 'dragout') {
                ok = this._currentTarget == data.target;
                if (ok) {
                    delete this._currentTarget;
                    delete this._inside;
                }
            }
            break;
    }

    return ok;
}
