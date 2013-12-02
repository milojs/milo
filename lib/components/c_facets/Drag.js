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
	this._ondragend = this.config.ondragstart;
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
		'dragstart': onDragStart
	});

	if (this._ondrag) eventsFacet.on('drag', this._ondrag)
	if (this._ondragend) eventsFacet.on('dragend', this._ondragend)


	var self = this;


	function onMouseDown(eventType, event) {
		console.log('listener on paragraph', this);
		self._target = event.target;
		if (targetInDragHandle(event))
			window.getSelection().empty();
	}


	function onMouseMovement(eventType, event) {
		var shouldBeDraggable = targetInDragHandle(event);
		self.owner.el.setAttribute('draggable', shouldBeDraggable);
	}


	function onDragStart(eventType, event) {
		console.log(self._dragHandle);
		console.log(self._target);

		if (targetInDragHandle(event)) {
			// event.dataTransfer.setData('text/plain', self.owner.el.innerHTML);
			event.dataTransfer.setData('text/html', self.owner.el.outerHTML);
			event.dataTransfer.setData('x-application/milo-component', self.owner);
			self._ondragstart && self._ondragstart(eventType, event);


			console.log(event.dataTransfer.getData('text/html'));
			console.log(event.dataTransfer.getData('x-application/milo-component'));
			console.log(event);
		} else {
			console.log('preventDefault');
			event.preventDefault();
		}
	}


	function targetInDragHandle(event) {
		return ! self._dragHandle || self._dragHandle.contains(self._target);
	}
}
