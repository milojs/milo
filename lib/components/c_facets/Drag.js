'use strict';

// <a name="components-facets-drag"></a>
// ###drag facet

var ComponentFacet = require('../c_facet')
	, facetsRegistry = require('./cf_registry')
	, DOMEventsSource = require('../msg_src/dom_events')
	, Component = require('../c_class')
	, _ = require('mol-proto');


/**
 * `milo.registry.facets.get('Drag')`
 * Facet for components that can be dragged
 */
var Drag = _.createSubclass(ComponentFacet, 'Drag');

_.extendProto(Drag, {
	init: Drag$init,
	start: Drag$start,

	setHandle: Drag$setHandle,
	setDragData: Drag$setDragData
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


function Drag$setDragData(data) {
	this._dragData = data;
}


function Drag$start() {
	ComponentFacet.prototype.start.apply(this, arguments);
	this.owner.el.setAttribute('draggable', true);

	this.on('mousedown', Drag_onMouseDown);
	this.on('mouseenter mouseleave mousemove', Drag_onMouseMovement);
	this.on('dragstart drag', Drag_onDragging);

	var self = this;

	function Drag_onMouseDown(eventType, event) {
		self._target = event.target;
		if (Drag_targetInDragHandle(event)) {
			window.getSelection().empty();
			event.stopPropagation();
		}
	}

	function Drag_onMouseMovement(eventType, event) {
		var shouldBeDraggable = Drag_targetInDragHandle(event);
		self.owner.el.setAttribute('draggable', shouldBeDraggable);
		event.stopPropagation();
	}

	function Drag_onDragging(eventType, event) {
		if (Drag_targetInDragHandle(event)) {
			var dt = event.dataTransfer;

			var dragData = Component.getTransferState(self.owner);

			var dataType = 'x-application/milo-component/' + dragData.compClass + '/'
							+ this._dataTypeInfo.call(this);

			dt.setData('text/html', self.owner.el.outerHTML);
			dt.setData('x-application/milo-component', JSON.stringify(self._dragData));

			dt.setData(dataType, JSON.stringify(dragData));
		} else
			event.preventDefault();
	}

	function Drag_targetInDragHandle(event) {
		return ! self._dragHandle || self._dragHandle.contains(self._target);
	}
}
