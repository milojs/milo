'use strict';

var ComponentFacet = require('../c_facet')
	, facetsRegistry = require('./cf_registry')

	, _ = require('mol-proto');


// generic drag handler, should be overridden
var Drag = _.createSubclass(ComponentFacet, 'Drag');

_.extendProto(Drag, {
	init: initDragFacet,
	start: startDragFacet,
	require: ['Events'], // TODO implement facet dependencies

	setHandle: setDragHandle
	// _reattach: _reattachEventsOnElementChange
});

facetsRegistry.add(Drag);

module.exports = Drag;


function initDragFacet() {
	ComponentFacet.prototype.init.apply(this, arguments);
	this._ondragstart = this.config.ondragstart;
	this._ondrag = this.config.ondrag;
	this._ondragend = this.config.ondragend;
}


function setDragHandle(handleEl) {
	if (! this.owner.el.contains(handleEl))
		return logger.warn('drag handle should be inside element to be dragged')
	this._dragHandle = handleEl;
}


function startDragFacet() {
	this.owner.el.setAttribute('draggable', true);

	var eventsFacet = this.owner.events;
	eventsFacet.onEvents({
		'mousedown': onMouseDown,
		'mouseenter mouseleave mousemove': onMouseMovement,
		'dragstart drag': onDragging,
		'dragstart drag dragend': callConfiguredHandler
	});


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
			event.dataTransfer.setData('text/html', self.owner.el.outerHTML);
			event.dataTransfer.setData('x-application/milo-component', self.owner);
		} else
			event.preventDefault();
	}


	function callConfiguredHandler(eventType, event) {
		var handlerProperty = '_on' + eventType
			, handler = self[handlerProperty];
		if (handler)
			handler.call(self.owner, eventType, event);
	}


	function targetInDragHandle(event) {
		return ! self._dragHandle || self._dragHandle.contains(self._target);
	}
}
