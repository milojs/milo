'use strict';


var ComponentFacet = require('../c_facet')
    , facetsRegistry = require('./cf_registry')
    , Model = require('../../model')
    , _ = require('mol-proto')
    , miloMail = require('../../services/mail');


var ItemFacet = _.createSubclass(ComponentFacet, 'Item');

_.extendProto(ItemFacet, {
    getState: ItemFacet$getState,
    setState: ItemFacet$setState,
    getIndex: ItemFacet$getIndex,
    setIndex: ItemFacet$setIndex,
    removeItem: ItemFacet$removeItem,
    require: ['Container', 'Dom', 'Data']
});

facetsRegistry.add(ItemFacet);

module.exports = ItemFacet;


function ItemFacet$getState() {
    return { state: {
        index: this.getIndex()
    }};
}


function ItemFacet$setState(state) {
    this.setIndex(state.state.index);
}


function ItemFacet$getIndex() {
    return this.index;
}


function ItemFacet$setIndex(index) {
    this.index = index;
}


/**
 * ItemFacet instance method
 * Removes component from the list
 */
function ItemFacet$removeItem(useData) {
    // this.list and this.index are set by the list when the item is added
    this.list.removeItem(this.index, useData);
}
