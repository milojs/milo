'use strict';

var Component = require('../c_class')
    , componentsRegistry = require('../c_registry')
    , _ = require('mol-proto');


var LISTITEM_CHANGE_MESSAGE = 'mllistitemchange'

var MLListItem = Component.createComponentClass('MLListItem', {
    container: undefined,
    dom: undefined,
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
    init: MLListItem$init
});


function MLListItem$init() {
    Component.prototype.init.apply(this, arguments);
    this.on('childrenbound', onChildrenBound);
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


function onChildrenBound() {
    var deleteBtn = this.container.scope.deleteBtn;
    deleteBtn.events.on('click', { subscriber: deleteItem, context: this });
}


function deleteItem() {
    var itemFacet = this.item
        , listComp = itemFacet.list.owner;
    
    listComp.data.splice(itemFacet.index, 1);
}
