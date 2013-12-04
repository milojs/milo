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
		editableOnClick: this.config.editableOnClick
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
		'editend': onEditEnd
	});

	var self = this;

	function onEditStart(eventType, event) {
		self.makeEditable(true);
	}

	function onEditEnd(eventType, event) {
		self.makeEditable(false);
	}
}
