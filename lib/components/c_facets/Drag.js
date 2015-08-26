'use strict';

// <a name="components-facets-drag"></a>
// ###drag facet

var ComponentFacet = require('../c_facet')
    , facetsRegistry = require('./cf_registry')
    , DOMEventsSource = require('../msg_src/dom_events')
    , Component = require('../c_class')
    , DragDrop = require('../../util/dragdrop')
    , miloCore = require('milo-core')
    , _ = miloCore.proto
    , logger = miloCore.util.logger;


/**
 * `milo.registry.facets.get('Drag')`
 * Facet for components that can be dragged
 * Drag facet supports the following configuration parameters:
 *
 *  - meta: object with properties
 *      - params: object of key-value pairs that will be passed in metadata data type (can also be function or method name that returns this object). See config.dragDrop.dataTypes.componentMetaTemplate
 *      - data: data that will be stored in the above meta data type (or function)
 *  - allowedEffects: string (or function) as specified here: https://developer.mozilla.org/en-US/docs/DragDrop/Drag_Operations#dragstart
 *  - dragImage:
 *      - url: path to image to display when dragging, instead of the owner element
 *      - x: x offset for the image
 *      - y: y offset for the image
 *  - dragCls: CSS class to apply to the component being dragged
 *  - dataTypes: map of additional data types the component will supply to data transfer object, key is data type, value is a function that returns it, component will be passed as the context to this function
 *
 * If function is specified in any parameter it will be called with the component as the context
 */
var Drag = _.createSubclass(ComponentFacet, 'Drag');

_.extendProto(Drag, {
    init: Drag$init,
    start: Drag$start,
    setHandle: Drag$setHandle
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
        return logger.warn('drag handle should be inside element to be dragged');
    this._dragHandle = handleEl;
}


function Drag$start() {
    ComponentFacet.prototype.start.apply(this, arguments);
    _addDragAttribute.call(this);
    _createDragImage.call(this);
    _toggleDragCls.call(this, false);

    this.onMessages({
        'mousedown': onMouseDown,
        'mouseenter mouseleave mousemove': onMouseMovement,
        'dragstart': onDragStart,
        'drag': onDragging,
        'dragend': onDragEnd
    });

    this.owner.onMessages({
        'getstatestarted':
            { subscriber: _removeDragAttribute, context: this },
        'getstatecompleted':
            { subscriber: _addDragAttribute, context: this }
    });
}


/**
 * Adds draggable attribute to component's element
 *
 * @private
 */
function _addDragAttribute() {
    if (this.owner.el)
        this.owner.el.setAttribute('draggable', true);
}


function _removeDragAttribute() {
    if (this.owner.el)
        this.owner.el.removeAttribute('draggable');
}


function _createDragImage() {
    var dragImage = this.config.dragImage;
    if (dragImage) {
        this._dragElement = new Image();
        this._dragElement.src = dragImage.url;
    }
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
    if (document.body.getAttribute('data-dragEnableEvent') != 'false')
        event.stopPropagation();
}


function onDragStart(eventType, event) {
    event.stopPropagation();

    if (this.config.off || ! targetInDragHandle.call(this)) {
        event.preventDefault();
        return;
    }

    var dragImage = this.config.dragImage;
    if (dragImage)
        event.dataTransfer.setDragImage(this._dragElement, dragImage.x || 0, dragImage.y || 0);

    var owner = this.owner;
    var dt = new DragDrop(event);

    this._dragData = dt.setComponentState(owner);
    setMeta.call(this);
    setAdditionalDataTypes.call(this);
    _setAllowedEffects.call(this, dt);

    _toggleDragCls.call(this, true);

    DragDrop.service.postMessageSync('dragdropstarted', {
        eventType: 'dragstart',
        dragDrop: dt,
        dragFacet: this
    });

    function setMeta() {
        var params = getMetaData.call(this, 'params')
            , data = getMetaData.call(this, 'data');

        this._dragMetaDataType = dt.setComponentMeta(owner, params, data);
        this._dragMetaData = data;
    }

    function getMetaData(property) {
        try { var func = this.config.meta[property]; } catch(e) {}
        if (typeof func == 'string') func = owner[func];
        return _.result(func, owner);
    }

    function setAdditionalDataTypes() {
        if (this.config.dataTypes) {
            this._dataTypesData = _.mapKeys(this.config.dataTypes, function (getDataFunc, dataType) {
                var data = getDataFunc.call(this.owner, dataType);
                if (typeof data == 'object') data = JSON.stringify(data);
                if (data) dt.setData(dataType, data);
                return data;
            }, this);
        }
    }
}


function onDragging(eventType, event) {
    if (_dragIsDisabled.call(this, event)) return;

    var dt = new DragDrop(event);
    dt.setComponentState(this.owner, this._dragData);
    dt.setData(this._dragMetaDataType, this._dragMetaData);
    if (this._dataTypesData) {
        _.eachKey(this._dataTypesData, function(data, dataType) {
            if (data) dt.setData(dataType, data);
        });
    }

    _setAllowedEffects.call(this, dt);
}


function onDragEnd(eventType, event) {
    if (_dragIsDisabled.call(this, event)) return;
    event.stopPropagation();

    _toggleDragCls.call(this, false);

    var dt = new DragDrop(event);
    DragDrop.service.postMessageSync('completedragdrop', {
        eventType: 'dragend',
        dragDrop: dt,
        dragFacet: this
    });
}


function _toggleDragCls(showHide) {
    if (this.config.dragCls)
        this.owner.el.classList.toggle(this.config.dragCls, showHide);
}


function _setAllowedEffects(DragDrop) {
    var effects = _.result(this.config.allowedEffects, this.owner);
    DragDrop.setAllowedEffects(effects);
}


function targetInDragHandle() {
    return ! this._dragHandle || this._dragHandle.contains(this.__mouseDownTarget);
}


function _dragIsDisabled(event) {
    if (this.config.off) {
        event.preventDefault();
        return true;
    }
    return false;
}
