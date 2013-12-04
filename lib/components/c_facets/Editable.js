'use strict';

var ComponentFacet = require('../c_facet')
	, facetsRegistry = require('./cf_registry')
	, EditableEventsSource = require('../c_message_sources/editable_events_source')

	, _ = require('mol-proto');


// generic drag handler, should be overridden
var Editable = _.createSubclass(ComponentFacet, 'Editable');

_.extendProto(Editable, {
	init: initEditableFacet,
	start: startEditableFacet,
	makeEditable: makeEditable,
	require: ['Events'] // TODO implement facet dependencies

	// _reattach: _reattachEventsOnElementChange
});

facetsRegistry.add(Editable);

module.exports = Editable;


function initEditableFacet() {
	ComponentFacet.prototype.init.apply(this, arguments);

	this._createMessageSource(EditableEventsSource, {
		editableOnClick: this.config.editableOnClick,
		moveToAdjacentEditable: this.config.moveToAdjacentEditable
	});

	this._editable = typeof this.config.editable != 'undefined'
						? this.config.editable
						: true;
}


function makeEditable(editable) {
	this.owner.el.setAttribute('contenteditable', editable);
}


function startEditableFacet() {
	ComponentFacet.prototype.start.apply(this, arguments);
	
	if (this._editable) {
		this.makeEditable(true);
		this.postMessage('editstart');
	}
	
	this.onMessages({
		'editstart': onEditStart,
		'editend': onEditEnd,
		'previouseditable': makePreviousComponentEditable,
		'nexteditable': makePreviousComponentEditable
	});
}


function onEditStart(eventType, event) {
	this.makeEditable(true);
}


function onEditEnd(eventType, event) {
	this.makeEditable(false);
}


function makePreviousComponentEditable(eventType, event) {
	var el = this.owner.el
			, scope = this.owner.scope
			, treeWalker = document.createTreeWalker(scope._rootEl, NodeFilter.SHOW_ELEMENT);

	treeWalker.currentNode = el;
	var prevNode = treeWalker.previousNode();

	outer: while (prevNode) {
		var componentsNames = Object.keys(scope);

		for (var i = 0; i < componentsNames.length; i++) {
			var component = scope[componentsNames[i]];
			if (component.el == prevNode && component.editable) {
				var found = true;
				break outer;
			}
		}

		treeWalker.currentNode = prevNode;
		prevNode = treeWalker.previousNode();
	}

	if (found) {
		component.editable.postMessage('editstart');
		component.el.focus();
	}
}

