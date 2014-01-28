'use strict';

// <a name="components-facets-drag"></a>
// ###drag facet

var ComponentFacet = require('../c_facet')
	, facetsRegistry = require('./cf_registry')
	, DOMEventsSource = require('../msg_src/dom_events')
	, Component = require('../c_class')
	, _ = require('mol-proto')
	, logger = require('../../util/logger');


/**
 * `milo.registry.facets.get('Drag')`
 * Facet for components that can be dragged
 */
var Drag = _.createSubclass(ComponentFacet, 'Drag');

_.extendProto(Drag, {
	init: Drag$init,
	start: Drag$start,

	setHandle: Drag$setHandle,
	// _reattach: _reattachEventsOnElementChange
});

facetsRegistry.add(Drag);

module.exports = Drag;


function Drag$init() {
	ComponentFacet.prototype.init.apply(this, arguments);	
	this._createMessageSourceWithAPI(DOMEventsSource);
	this._dragData = {};

	var dataTypeInfo = this.config._dataTypeInfo || '';
	this._dataTypeInfo = typeof dataTypeInfo == 'function'
							? dataTypeInfo
							: function() { return dataTypeInfo; };
}


/**
 * Drag facet instance method
 * Sets the drag handle element of component. This element has to be dragged for the component to be dragged.
 *
 * @param {Element} handleEl
 */
function Drag$setHandle(handleEl) {
	if (! this.owner.el.contains(handleEl))
		return logger.warn('drag handle should be inside element to be dragged')
	this._dragHandle = handleEl;
}


function Drag$start() {
	ComponentFacet.prototype.start.apply(this, arguments);
	this.owner.el.setAttribute('draggable', true);

	this.onMessages({
		'mousedown': {
			context: this, subscriber: onMouseDown },
		'mouseenter mouseleave mousemove': {
			context: this, subscriber: onMouseMovement },
		'dragstart': {
			context: this, subscriber: onDragStart },
		'drag': {
			context: this, subscriber: onDragging }
	});
}


function onMouseDown(eventType, event) {
	this.__mouseDownTarget = event.target;
	if (targetInDragHandle.call(this)) {
		window.getSelection().empty();
		event.stopPropagation();
	}
}


function onMouseMovement(eventType, event) {
	var shouldBeDraggable = targetInDragHandle.call(this);
	this.owner.el.setAttribute('draggable', shouldBeDraggable);
	event.stopPropagation();
}


function onDragStart(eventType, event) {
	var transferState = this.owner.getTransferState();
	this.__dragData = JSON.stringify(transferState);
	this.__dataType = 'x-application/milo-component/' + transferState.compClass + '/'
						+ this._dataTypeInfo.call(this);
	setDragData.call(this, event);
}


function onDragging(eventType, event) {
	setDragData.call(this, event);
}


function setDragData(event) {
	if (targetInDragHandle.call(this)) {
		var dt = event.dataTransfer;
		dt.setData(this.__dataType, this.__dragData);
		// set html in case it is inserted elsewhere
		dt.setData('x-application/milo-component', null)
		dt.setData('text/html', this.owner.el.outerHTML);
	} else
		event.preventDefault();
}


function targetInDragHandle() {
	return ! this._dragHandle || this._dragHandle.contains(this.__mouseDownTarget);
}
