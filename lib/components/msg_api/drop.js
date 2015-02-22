'use strict';


var MessengerAPI = require('milo-core').classes.MessengerAPI;


var DropMsgAPI = _.createSubclass(MessengerAPI, 'DropMsgAPI', true);


_.extendProto(DropMsgAPI, {
    // implementing MessageSource interface
    translateToSourceMessage: translateToSourceMessage,
    filterSourceMessage: filterSourceMessage,
});


module.exports = DropMsgAPI;


var dropEventsMap = {
    'dragin': 'dragenter',
    'dragout': 'dragleave'
};


function translateToSourceMessage(message) {
    return dropEventsMap.hasOwnProperty(message)
            ? dropEventsMap[message]
            : message;
}

function resetFilterVars() {
    delete this._currentTarget;
    delete this._inside;
}

function filterSourceMessage(sourceMessage, message, data) { // data is DOM event object
    var ok = true;

    if (sourceMessage == 'dragenter' && message == 'dragin') {
        this._currentTarget = data.target;
        ok = !this._inside;
        this._inside = true;
    } else if (sourceMessage == 'dragleave' && message == 'dragout') {
        ok = this._currentTarget == data.target;
        if (ok) resetFilterVars.call(this);
    } else if (sourceMessage == 'drop') resetFilterVars.call(this);

    return ok;
}
