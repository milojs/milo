'use strict';

var Component = require('../c_class')
    , componentsRegistry = require('../c_registry')
    , _ = require('mol-proto');


var MLListItem = Component.createComponentClass('MLListItem', {
    container: undefined,
    dom: undefined,
    data: undefined,
    item: undefined
});

componentsRegistry.add(MLListItem);

module.exports = MLListItem;


_.extendProto(MLListItem, {
    init: MLListItem$init,
});


function MLListItem$init() {
    Component.prototype.init.apply(this, arguments);
    this.on('childrenbound', onChildrenBound);
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