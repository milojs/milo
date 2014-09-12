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

module.exports = MLListItem;


_.extendProto(MLListItem, {
    init: MLListItem$init,
    moveItem: MLListItem$moveItem
});


function MLListItem$init() {
    Component.prototype.init.apply(this, arguments);
    this.on('childrenbound', onChildrenBound);
}


function onChildrenBound() {
    var deleteBtn = this.container.scope.deleteBtn;
    deleteBtn.events.on('click', { subscriber: this.item.removeItem, context: this.item });
}


function MLListItem$moveItem(index) {
    var listOwner = this.item.list.owner;
    listOwner && listOwner.moveItem(this.item.index, index);
}


function onItemDrop(eventType, event) {
    var dt = new DragDrop(event);
    var meta = dt.getComponentMeta();
    var listOwner = this.item.list.owner;
    if (meta.compClass != 'MLListItem') return;
    
    var index = meta.params && meta.params.index;

    if (index)
        listOwner.moveItem(+index, this.item.index);
    
    this.dom.removeCssClasses('ml-drag-over');
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



