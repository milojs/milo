'use strict';

var Facet = require('../../facets/f_class')
	, _ = require('proto')
	, facetsRegistry = require('./cf_registry');

// container facet
var Events = _.createSubclass(Facet, 'Events');

_.extendProto(Events, {
	init: initEvents,
	on: attachEvent,
	off: detachEvent,
	_reattach: reattachEventsOnElementChange
});

function initContainer() {
	this.children = {};
}

function _bindComponents() {
	// TODO
	// this function should re-bind rather than bind all internal elements
	this.children = binder(this.owner.el);
}

function addChildComponents(childComponents) {
	// TODO
	// this function should intelligently re-bind existing components to
	// new elements (if they changed) and re-bind previously bound events to the same
	// event handlers
	// or maybe not, if this function is only used by binder to add new elements...
	_.extend(this.children, childComponents);
}


facetsRegistry.add(Container);
