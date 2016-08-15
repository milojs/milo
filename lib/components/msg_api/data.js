'use strict';


var getElementDataAccess = require('./de_data')
    , miloCore = require('milo-core')
    , MessengerAPI = miloCore.classes.MessengerAPI
    , _ = miloCore.proto;


// class to handle subscribtions to changes in DOM for UI (maybe also content editable) elements

/**
 * A class
 */
var DataMsgAPI = _.createSubclass(MessengerAPI, 'DataMsgAPI', true);


_.extendProto(DataMsgAPI, {
    // implementing MessageSource interface
    init: DataMsgAPI$init,
    translateToSourceMessage: translateToSourceMessage,
    filterSourceMessage: filterSourceMessage,
    createInternalData: createInternalData,

    // class specific methods
    value: DataMsgAPI$value
});

module.exports = DataMsgAPI;


function DataMsgAPI$init(component) {
    MessengerAPI.prototype.init.apply(this, arguments);

    this.component = component;
    this.elData = getElementDataAccess(component.el);
}


// getDomElementDataValue
function DataMsgAPI$value() { // value method
    var componentGetter = this.component.data.config.get;
    var newValue = typeof componentGetter == 'function'
                    ? componentGetter.call(this.component)
                    : this.elData.get(this.component.el);

    this.component.data._value = newValue;

    return newValue;
}


// TODO: this function should return relevant DOM event dependent on element tag
// Can also implement beforedatachanged event to allow preventing the change
// translateToDomEvent
function translateToSourceMessage(message) {
    var componentEvent = this.component.data.config.event;
    var event = componentEvent || this.elData.event(this.component.el);

    if (message === '' && event)
        return event;  // this.tagEvent;
}


// filterDataMessage
function filterSourceMessage(sourceMessage, message, data) {
    return data.newValue != data.oldValue;
}


function createInternalData(sourceMessage, message, data) {
    var oldValue = this.component.data._value
        , newValue = this.value();

    var internalData = { 
        path: '',
        type: 'changed',
        oldValue: oldValue,
        newValue: newValue
    };
    return internalData;
}
