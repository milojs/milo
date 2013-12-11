'use strict';

var ComponentFacet = require('../c_facet')
	, Component = require('../c_class')
	, facetsRegistry = require('./cf_registry')
	, EditableEventsSource = require('../c_message_sources/editable_events_source')
	, logger = require('../../util/logger')
	, _ = require('mol-proto')
	, check = require('../../util').check
	, Match = check.Match;


// generic drag handler, should be overridden
var Editable = _.createSubclass(ComponentFacet, 'Editable');

_.extendProto(Editable, {
	init: init,
	start: start,
	makeEditable: makeEditable

	// _reattach: _reattachEventsOnElementChange
});

facetsRegistry.add(Editable);

module.exports = Editable;


// init Editable facets
function init() {
	ComponentFacet.prototype.init.apply(this, arguments);

	this._createMessageSource(EditableEventsSource, {
		editableOnClick: this.config.editableOnClick,
		moveToAdjacentEditable: this.config.moveToAdjacentEditable,
		allowMerge: this.config.allowMerge,
		acceptMerge: this.config.acceptMerge
	});

	this._editable = typeof this.config.editable != 'undefined'
						? this.config.editable
						: true;
}


function makeEditable(editable) {
	this.owner.el.setAttribute('contenteditable', editable);
}


// start Editable facet
function start() {
	ComponentFacet.prototype.start.apply(this, arguments);
	
	if (this._editable) {
		this.makeEditable(true);
		this.postMessage('editstart');
	}
	
	this.onMessages({
		'editstart': onEditStart,
		'editend': onEditEnd,
		'previouseditable': makePreviousComponentEditable,
		'nexteditable': makeNextComponentEditable,
		'previousmerge': mergeToPreviousEditable,
		'nextmerge': mergeToNextEditable,
		'requestmerge': onRequestMerge,
		'mergeaccepted': onMergeAccepted,
		'performmerge': onPerformMerge,
		'mergeremove': onMergeRemove
	});
}


function onEditStart(eventType, event) {
	this.makeEditable(true);
}


function onEditEnd(eventType, event) {
	this.makeEditable(false);
}


function makePreviousComponentEditable(eventType, event) {
	makeAdjacentComponentEditable(this.owner, 'up');
}

function makeNextComponentEditable(eventType, event) {
	makeAdjacentComponentEditable(this.owner, 'down');
}

function makeAdjacentComponentEditable(component, direction) {
	var adjacentComp = component.dom.find(direction, function(comp) {
		return comp.editable;
	});

	if (adjacentComp) {
		adjacentComp.editable.postMessage('editstart');
		adjacentComp.el.focus();
	}
}


//
// merge functionality
//
function mergeToPreviousEditable(eventType, event) {
	mergeToAdjacentEditable(this.owner, 'up');
}

function mergeToNextEditable(eventType, event) {
	mergeToAdjacentEditable(this.owner, 'down');
}

function mergeToAdjacentEditable(component, direction) {
	var adjacentComp = component.dom.find(direction, function(comp) {
		return comp.editable;
	});

	if (adjacentComp)
		adjacentComp.editable.postMessage('requestmerge', { sender: component });
}

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

	var mergeComponent = data.sender;

	// merge scopes
	this.owner.container.scope.merge(mergeComponent.container.scope);

	// merge DOM
	this.owner.dom.appendChildren(mergeComponent.el);

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
