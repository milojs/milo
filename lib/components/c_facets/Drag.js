'use strict';

var ComponentFacet = require('../c_facet')
	, facetsRegistry = require('./cf_registry')
	, DOMEventsSource = require('../c_message_sources/dom_events_source')

	, _ = require('mol-proto');


// generic drag handler, should be overridden
var Drag = _.createSubclass(ComponentFacet, 'Drag');

_.extendProto(Drag, {
	init: initDragFacet,
	start: startDragFacet,

	setHandle: setDragHandle
	// _reattach: _reattachEventsOnElementChange
});

facetsRegistry.add(Drag);

module.exports = Drag;


function initDragFacet() {
	ComponentFacet.prototype.init.apply(this, arguments);	
	this._createMessageSource(DOMEventsSource);
}


function setDragHandle(handleEl) {
	if (! this.owner.el.contains(handleEl))
		return logger.warn('drag handle should be inside element to be dragged')
	this._dragHandle = handleEl;
}


function startDragFacet() {
	ComponentFacet.prototype.start.apply(this, arguments);
	this.owner.el.setAttribute('draggable', true);

	this.on('mousedown', onMouseDown);
	this.on('mouseenter mouseleave mousemove', onMouseMovement);
	this.on('dragstart drag', onDragging);

	var self = this;

	function onMouseDown(eventType, event) {
		self._target = event.target;
		if (targetInDragHandle(event))
			window.getSelection().empty();
	}

	function onMouseMovement(eventType, event) {
		var shouldBeDraggable = targetInDragHandle(event);
		self.owner.el.setAttribute('draggable', shouldBeDraggable);
	}

	function onDragging(eventType, event) {
		if (targetInDragHandle(event)) {
			var dt = event.dataTransfer;
			dt.setData('text/html', self.owner.el.outerHTML);
			dt.setData('x-application/milo-component', self.owner);
		} else
			event.preventDefault();
	}

	function targetInDragHandle(event) {
		return ! self._dragHandle || self._dragHandle.contains(self._target);
	}
}
