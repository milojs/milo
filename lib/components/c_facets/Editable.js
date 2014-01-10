'use strict';

// <a name="components-facets-editable"></a>
// ###editable facet

var ComponentFacet = require('../c_facet')
	, Component = require('../c_class')
	, facetsRegistry = require('./cf_registry')
	, DOMEventsSource = require('../msg_src/dom_events')
	, EditableMsgAPI = require('../msg_api/editable')
	, logger = require('../../util/logger')
	, domUtils = require('../../util/dom')
	, _ = require('mol-proto')
	, check = require('../../util').check
	, Match = check.Match;


var Editable = _.createSubclass(ComponentFacet, 'Editable');

_.extendProto(Editable, {
	start: start,
	makeEditable: makeEditable,
	require: ['Dom']

	// _reattach: _reattachEventsOnElementChange
});

facetsRegistry.add(Editable);

module.exports = Editable;


// init Editable facets
function makeEditable(editable) {
	this.owner.el.setAttribute('contenteditable', editable);
}


// start Editable facet
function start() {
	ComponentFacet.prototype.start.apply(this, arguments);
	
	var editableAPIoptions = {
		editableOnClick: this.config.editableOnClick,
		moveToAdjacentEditable: this.config.moveToAdjacentEditable,
		allowMerge: this.config.allowMerge,
		acceptMerge: this.config.acceptMerge
	};
	var editableAPI = new EditableMsgAPI(this.owner, editableAPIoptions);

	this._createMessageSourceWithAPI(DOMEventsSource, editableAPI);

	this._editable = typeof this.config.editable != 'undefined'
						? this.config.editable
						: true;

	this.makeEditable(this._editable);
	if (this._editable)
		this.postMessage('editstart');

	if (this.config.showOutline === false)
		this.owner.el.style.outline = 'none';

	this.onMessages({
		'editstart': onEditStart,
		'editend': onEditEnd,
		// arrow keys events
		// 'previouseditable': makePreviousComponentEditable,
		// 'nexteditable': makeNextComponentEditable,
		// merge events
		'previousmerge': mergeToPreviousEditable,
		'nextmerge': mergeToNextEditable,

		'requestmerge': onRequestMerge,
		'mergeaccepted': onMergeAccepted,
		'performmerge': onPerformMerge,
		'mergeremove': onMergeRemove,
		// functional key events
		'backspacekey': _.partial(dispatchOnSelection, onBackspace),
		'deletekey': _.partial(dispatchOnSelection, onDelete),
		'enterkey': _.partial(dispatchOnSelection, onEnterSplit)
	});
}


function onEditStart(eventType, event) {
	this.makeEditable(true);
}


function onEditEnd(eventType, event) {
	this.makeEditable(false);
}

//
// Move caret to another editable
//
function makePreviousComponentEditable(eventType, event) {
	event.preventDefault();
	makeAdjacentComponentEditable(this.owner, 'up');
}

function makeNextComponentEditable(eventType, event) {
	event.preventDefault();
	makeAdjacentComponentEditable(this.owner, 'down');
}

function makeAdjacentComponentEditable(component, direction) {
	var adjacentComp = component.dom.find(direction, function(comp) {
		return comp.editable;
	});

	if (adjacentComp) {
		adjacentComp.editable.postMessage('editstart');
		adjacentComp.el.focus();
		
		var windowSelection = window.getSelection()
			, selectionRange = document.createRange();
		selectionRange.selectNodeContents(adjacentComp.el);
		if (direction == 'up')
			selectionRange.collapse(false);
		else
			selectionRange.collapse(true);
        windowSelection.removeAllRanges();
        windowSelection.addRange(selectionRange);
	}
}


//
// merge functionality
//
function mergeToPreviousEditable(eventType, event) {
	event.preventDefault();
	mergeToAdjacentEditable(this.owner, 'up');
}

function mergeToNextEditable(eventType, event) {
	event.preventDefault();
	mergeToAdjacentEditable(this.owner, 'down');
}

function mergeToAdjacentEditable(component, direction) {
	var adjacentComp = component.dom.find(direction, function(comp) {
		return comp.editable;
	});

	if (adjacentComp)
		adjacentComp.editable.postMessage('requestmerge', { sender: component });
}


// merge messages
function onRequestMerge(message, data) {
	check(data, Match.ObjectIncluding({ sender: Component }));

	var mergeComponent = data.sender;
	if (this.config.acceptMerge)
		mergeComponent.editable.postMessage('mergeaccepted', { sender: this.owner });
}

function onMergeAccepted(message, data) {
	check(data, Match.ObjectIncluding({ sender: Component }));

	var targetComponent = data.sender;

	this.owner.allFacets('clean');
	
	targetComponent.editable.postMessage('performmerge', { sender: this.owner });
}

function onPerformMerge(message, data) {
	check(data, Match.ObjectIncluding({ sender: Component }));
	if (! this.config.acceptMerge) {
		logger.error('performmerge message received by component that doesn\'t accept merge');
		return;
	}

	var mergeComponent = data.sender
		, windowSelection = window.getSelection()
		, selectionRange = document.createRange();

	// merge scopes
	this.owner.container.scope._merge(mergeComponent.container.scope);

	//Reference first element to be merged
	var firstMergeEl = mergeComponent.el.childNodes[0];

	// merge DOM
	this.owner.dom.appendChildren(mergeComponent.el);

	//Make the interface editable again like expected
	this.makeEditable(true);
	this.owner.el.focus();

	//Set the selection where it should be
	selectionRange.setStart(firstMergeEl);
	selectionRange.setEnd(firstMergeEl);
	windowSelection.removeAllRanges();
	windowSelection.addRange(selectionRange);

	// send remove message
	mergeComponent.editable.postMessage('mergeremove');
}


function onMergeRemove(message, data) {
	if (! this.config.allowMerge) {
		logger.error('mergeremove message received by component that doesn\'t allow merge');
		return;
	}

	this.owner.dom.remove();
	this.owner.remove();
}


function onEnterSplit(message, event) {
	var splitFacet = this.owner.split;
	if (splitFacet) {
		var newComp = splitFacet.make();
		event.preventDefault();
		newComp.editable.postMessage('editstart');
		newComp.el.focus();
	}
}


function onBackspace(message, event) {
	if (this.config.allowMerge && noTextBeforeSelection(this.owner)) {
		this.postMessage('previousmerge', event);
		this.postMessage('adjacentmerge', event);
	}
}


function onDelete(message, event) {
	if (this.config.allowMerge && noTextAfterSelection(this.owner)) {
		this.postMessage('nextmerge', event);
		this.postMessage('adjacentmerge', event);
	}
}


function dispatchOnSelection(method, message, event) {
	var sel = window.getSelection()
		, node = sel.anchorNode
		, comp = Component.getContainingComponent(node, true, 'editable');

	if (comp != this.owner) {
		comp.editable.postMessage(message, event);
		event.preventDefault();
	} else
		method && method.call(this, message, event);
}


function noTextBeforeSelection(component) {
	return ! component.dom.hasTextBeforeSelection();
}

function noTextAfterSelection(component) {
	// return ! component.dom.hasTextAfterSelection();
	var sel = window.getSelection();
	return sel.anchorNode
			&& sel.anchorOffset == sel.anchorNode.length
			&& ! sel.anchorNode.nextSibling;
}

