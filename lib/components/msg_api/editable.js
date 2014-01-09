'use strict';


var MessengerAPI = require('../../messenger/m_api')
	, _ = require('mol-proto')
	, check = require('../../util/check')
	, Match = check.Match;


// class to handle subscribtions to changes in DOM for UI (maybe also content editable) elements
var EditableMsgAPI = _.createSubclass(MessengerAPI, 'EditableMsgAPI', true);


_.extendProto(EditableMsgAPI, {
	// implementing MessageAPI interface
	init: init,
	translateToSourceMessage: translateToSourceMessage,
 	filterSourceMessage: filterSourceMessage,
});

module.exports = EditableMsgAPI;


function init(component, options) {
	MessengerAPI.prototype.init.apply(this, arguments);
	
	this.component = component;
	this.options = options;
}


var editableEventsMap = {
	'enterkey': 'keypress',
	'backspacekey': 'keydown',
	'deletekey': 'keydown',
	'editstart': 'mousedown',
	'editend': 'blur'
};

// TODO: this function should return relevant DOM event dependent on element tag
// Can also implement beforedatachanged event to allow preventing the change
// translate to DOM event
function translateToSourceMessage(message) {
	if (editableEventsMap.hasOwnProperty(message))
		return editableEventsMap[message];
	else
		return message;
}


var functionalKeys = {
	'enterkey': 13,
	'backspacekey': 8,
	'deletekey': 46
}
// filter editable message
function filterSourceMessage(eventType, message, data) {
	if (message in functionalKeys)
		return data.keyCode == functionalKeys[message];

	if (message == 'editstart' || message == 'editend')
		return this.options.editableOnClick;
	else
		return true;
}
