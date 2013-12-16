'use strict';

var ComponentFacet = require('../c_facet')
    , Component = require('../c_class')
    , facetsRegistry = require('./cf_registry')
    , Model = require('../../model')
    , _ = require('mol-proto')
    , miloMail = require('../../mail')
    , binder = require('../../binder')
    , ListError = require('../../util/error').List;


// data model connection facet
var List = _.createSubclass(ComponentFacet, 'List');

_.extendProto(List, {
    init: init,
    start: start,
    update: update,
    require: ['Container', 'Dom', 'Data'],
    childrenBound: childrenBound,
    _itemPreviousComponent: _itemPreviousComponent
    // _reattach: _reattachEventsOnElementChange
});

facetsRegistry.add(List);

module.exports = List;


// initialize List facet
function init() {
    ComponentFacet.prototype.init.apply(this, arguments);
    var model = new Model()
        , self = this;

    _.defineProperties(this, {
        _listItems: [],
        _listItemsHash: {}
    });
    _.defineProperty(this, 'listItemType', null, false, false, true);

    this.m.on(/.*/, function (eventType, data) {
        self.update(eventType, data);
    });
}


//start List facet
function start() {
    
}


function onChildrenBound(msgTtype, data) {

}


//update list
function update(eventType, data) {
    var itemModels = data.newValue;

    for (var i = 0; i < itemModels.length; i++) {
        var itemModel = itemModels[i];

        // Copy component
        var component = Component.copy(this.listItemType, true);
        
        // Bind contents of component
        var temp = binder(component.el)[component.name];

        // Set new component scope to bind result
        component.container.scope = temp.container.scope;
        
        // Set list item data of component
        component.listItem.setData(itemModel);

        // Add it to the dom
        this.owner.dom.append(component.el);

        // Add to list items hash
        this.listItems[component.name] = component;

        // Show the list item component
        component.dom.show();
    };
}


function childrenBound() {
    var foundItem;

    this.owner.container.scope._each(function(childComp, name) {
        if (childComp.listItem) {
            if (foundItem) throw new ListError('More than one child component has ListItem Facet')
            foundItem = childComp;
        }
    });

    if (! foundItem) throw new ListError('No child component has ListItem Facet');

    this.itemSample = foundItem;

    this.itemSample.dom.hide();
    this.itemSample.remove();
}


function item(itemNo) {
    return this._listItems[itemNo];
}


function addItem(itemNo) {
    itemNo = itemNo || this._listItems.length;
    if (this.item(itemNo))
        throw ListError('attempt to create item with id of existing item');

    // Copy component
    var component = Component.copy(this.itemSample, true);

    // Bind contents of component
    component = binder(component.el)[component.name];

    // Add it to the DOM
    this._itemPreviousComponent(itemNo).dom.insertAfter(component.el)

    // Add to list items hash
    this._listItems[itemNo] = component;

}


function _itemPreviousComponent(itemNo) {
    while (itemNo >= 0 && ! this._listItems[itemNo])
        itemNo--;

    return itemNo >= 0
                ? this._listItems[itemNo]
                : this.itemSample;
}


function each(callback, thisArg) {

}


function contains(comp) {

}
