'use strict';

var Component = require('../c_class')
    , DragDrop = require('../../util/dragdrop')
    , componentsRegistry = require('../c_registry')
    , _ = require('mol-proto');


var LISTITEM_CHANGE_MESSAGE = 'mllistitemchange'

var MLListItem = Component.createComponentClass('MLListItem', {
    container: undefined,
    dom: undefined,
    drag: {
        meta: {
            params: getMetaData
        }
    },
    drop: {
        messages: {
            'dragenter': { subscriber: onDragHover, context: 'owner' },
            'dragover': { subscriber: onDragHover, context: 'owner' },
            'dragleave': { subscriber: onDragOut, context: 'owner' },
            'drop': { subscriber: onItemDrop, context: 'owner' }
        },
        allow: {
            components: isComponentAllowed
        }
    },
    data: {
        get: MLListItem_get,
        set: MLListItem_set,
        del: MLListItem_del,
        event: LISTITEM_CHANGE_MESSAGE
    },
    model: undefined,
    item: undefined
});

componentsRegistry.add(MLListItem);

var MLListItem = module.exports = MLListItem;


_.extendProto(MLListItem, {
    init: MLListItem$init,
    moveItem: MLListItem$moveItem,
    removeItem: MLListItem$removeItem,
    isDropAllowed: MLListItem$isDropAllowed
});


function MLListItem$init() {
    Component.prototype.init.apply(this, arguments);
    this.on('childrenbound', onChildrenBound);
}


function onChildrenBound() {
    var deleteBtn = this.container.scope.deleteBtn;
    deleteBtn && deleteBtn.events.on('click', { subscriber: this.removeItem, context: this });
}


function MLListItem$removeItem() {
    try { var listOwner = this.item.list.owner; } catch(e) {}
    listOwner && listOwner.removeItem(this.item.index);
}


function MLListItem$moveItem(index) {
    var listOwner = this.item.list.owner;
    listOwner && listOwner.moveItem(this.item.index, index);
}


function MLListItem$isDropAllowed(meta, dragDrop){
    return meta.params && meta.params.index && meta.compClass == 'MLListItem';
}


function isComponentAllowed() {
    return this.isDropAllowed.apply(this, arguments);
}


function onItemDrop(eventType, event) {
    onDragOut.call(this);
    var dt = new DragDrop(event);
    var meta = dt.getComponentMeta();
    var state = dt.getComponentState();
    var listOwner = this.item.list.owner;
    var index = meta.params && meta.params.index;

    listOwner.moveItem(+index, this.item.index, state);
}


function onDragHover(eventType, event) {
    this.dom.addCssClasses('ml-drag-over');
}


function onDragOut(eventType, event) {
    this.dom.removeCssClasses('ml-drag-over');
}


function getMetaData() {
    return {
        index: this.item.index
    }
}


function MLListItem_get() {
    var value = this.model.get();
    return typeof value == 'object' ? _.clone(value) : value;
}


function MLListItem_set(value) {
    if (typeof value == 'object')
        this.data._set(value);
    this.model.set(value);
    _sendChangeMessage.call(this);
    return value;
}


function MLListItem_del() {
    this.data._del();
    this.model.del();
    _sendChangeMessage.call(this);    
}


function _sendChangeMessage() {
    this.data.dispatchSourceMessage(LISTITEM_CHANGE_MESSAGE);
}



