'use strict';

// <a name="components-facets-drag"></a>
// ###drag facet

var ComponentFacet = require('../c_facet')
    , facetsRegistry = require('./cf_registry')
    , DOMEventsSource = require('../msg_src/dom_events')
    , Component = require('../c_class')
    , DragDrop = require('../../util/dragdrop')
    , _ = require('mol-proto')
    , logger = require('../../util/logger');


/**
 * `milo.registry.facets.get('Drag')`
 * Facet for components that can be dragged
 * Drag facet supports the following configuration parameters:
 *
 *  - meta: object with properties
 *      - params: object of key-value pairs that will be converted in url-like query string in the end of data type for metadata data type (or function that returns this object). See config.dragDrop.dataTypes.componentMetaTemplate
 *          all values will converted to lowercase as datatype cannot store uppercase letters.
 *      - data: data that will be stored in the above meta data type (or function)
 *  - allowedEffects: string (or function) as specified here: https://developer.mozilla.org/en-US/docs/DragDrop/Drag_Operations#dragstart
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
        return logger.warn('drag handle should be inside element to be dragged')
    this._dragHandle = handleEl;
}


function Drag$start() {
    ComponentFacet.prototype.start.apply(this, arguments);
    _addDragAttribute.call(this);

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

    var owner = this.owner;
    var dt = new DragDrop(event);
    this._dragData = dt.setComponentState(owner);

    var metaConfig = this.config.meta
        , paramsConfig = metaConfig && metaConfig.params
        , metaDataConfig = metaConfig && metaConfig.data;

    var params = _.result(paramsConfig, owner)
        , data = _.result(metaDataConfig, owner);

    this._dragMetaDataType = dt.setComponentMeta(owner, params, data);
    this._dragMetaData = data;

    _setAllowedEffects.call(this, dt);

    DragDrop.service.postMessageSync('dragdropstarted', {
        eventType: 'dragstart',
        dragDrop: dt,
        dragFacet: this
    });
}


function onDragging(eventType, event) {
    if (_dragIsDisabled.call(this, event)) return;

    var dt = new DragDrop(event);
    dt.setComponentState(this.owner, this._dragData);
    dt.setData(this._dragMetaDataType, this._dragMetaData);
    _setAllowedEffects.call(this, dt);
}


function onDragEnd(eventType, event) {
    if (_dragIsDisabled.call(this, event)) return;

    event.stopPropagation();
    var dt = new DragDrop(event);
    DragDrop.service.postMessageSync('completedragdrop', {
        eventType: 'dragend',
        dragDrop: dt,
        dragFacet: this
    });
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
