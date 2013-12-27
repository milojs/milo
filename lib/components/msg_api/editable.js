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
	'editstart': 'mousedown',
	'editend': 'blur',
	// move events
	'nexteditable': 'keydown',
	'previouseditable': 'keydown',	
	'adjacenteditable': 'keydown',
	// merge events
	'nextmerge': 'keydown',
	'previousmerge': 'keydown',
	'adjacentmerge': 'keydown',
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


// filter editable message
function filterSourceMessage(eventType, message, data) {
	var self = this;

	switch (message) {
		case 'enterkey':
		 	return data.keyCode == 13;

		// move to adjacent editable events
		case 'previouseditable':
			return this.options.moveToAdjacentEditable
				&& movedToPrevious(data);
		case 'nexteditable':
			return this.options.moveToAdjacentEditable
				&& movedToNext(data);
		case 'adjacenteditable':
			return this.options.moveToAdjacentEditable
				&& (movedToPrevious(data) || movedToNext(data));

		// merge adjacent editable events
		case 'previousmerge': // merge current one into previous on backspace key
			return this.options.allowMerge && mergeToPrevious(data)
		case 'nextmerge': // merge current one into previous on backspace key
			return this.options.allowMerge && mergeToNext(data)
		case 'adjacentmerge':
			return this.options.allowMerge
				&& (mergeToPrevious(data) || mergeToNext(data));

		case 'editstart':
		case 'editend':
			return this.options.editableOnClick;
		default:
			return true;
	}

	function movedToPrevious(data) {
		return (data.keyCode == 37 || data.keyCode == 38) // up and left
			&& noTextBeforeSelection(self.component);
	}

	function movedToNext(data) {
		return (data.keyCode == 39 || data.keyCode == 40) // down and right
			&& noTextAfterSelection(self.component);
	} 

	function mergeToPrevious(data) {
		return data.keyCode == 8 // backspace
			&& noTextBeforeSelection(self.component);
	}

	function mergeToNext(data) {
		return data.keyCode == 46 // delete
			&& noTextAfterSelection(self.component);
	}

	function noTextBeforeSelection(component) {
		return ! component.dom.hasTextBeforeSelection();
	};

	function noTextAfterSelection(component) {
		var sel = window.getSelection();
		if (sel.anchorOffset == sel.anchorNode.length) {
			if (sel.anchorNode.nextSibling) {
				return false;
			} else {
				return true;
			}
		}
	}
}
