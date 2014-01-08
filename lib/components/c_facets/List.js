'use strict';

// <a name="components-facets-list"></a>
// ###list facet

var ComponentFacet = require('../c_facet')
    , Component = require('../c_class')
    , facetsRegistry = require('./cf_registry')
    , Model = require('../../model')
    , _ = require('mol-proto')
    , miloMail = require('../../mail')
    , binder = require('../../binder')
    , ListError = require('../../util/error').List
    , logger = require('../../util/logger');


// Data model connection facet
var List = _.createSubclass(ComponentFacet, 'List');

_.extendProto(List, {
    init: init,
    /* update: update, */
    require: ['Container', 'Dom', 'Data'],
    _itemPreviousComponent: _itemPreviousComponent,

    item: item,
    count: count,
    _setItem: _setItem,
    contains: contains,
    addItem: addItem,
    removeItem: removeItem,
    each: each
    /* _reattach: _reattachEventsOnElementChange */
});

facetsRegistry.add(List);

module.exports = List;


// Initialize List facet
function init() {
    ComponentFacet.prototype.init.apply(this, arguments);
    var model = new Model
        , self = this;

    _.defineProperties(this, {
        _listItems: [],
        _listItemsHash: {}
    });
    _.defineProperty(this, 'itemSample', null, _.WRIT);

    // Fired by __binder__ when all children of component are bound
    this.owner.on('childrenbound', onChildrenBound);
}


function onChildrenBound() {
    var foundItem;

    // `this` is a component here, as the message was dispatched on a component
    this.container.scope._each(function(childComp, name) {
        if (childComp.item) {
            if (foundItem) throw new ListError('More than one child component has ListItem Facet')
            foundItem = childComp;
        }
    });
    
    // Component must have one and only one child with a List facet 
    if (! foundItem) throw new ListError('No child component has ListItem Facet');

    this.list.itemSample = foundItem;

    // After keeping a reference to the item sample, it must be hidden and removed from scope
    this.list.itemSample.dom.hide();
    this.list.itemSample.remove();
}

// Return a list item by it's index
function item(index) {
    return this._listItems[index];
}

// Get total number of list items
function count() {
    return this._listItems.length;
}


function _setItem(index, component) {
    this._listItems[index] = component;
    this._listItemsHash[component.name] = component
    component.item.list = this;
    component.item.index = index;
}

// Does the list contain a particular list item component
function contains(component){
    return this._listItemsHash[component.name] == component;
}

// Add a new list item at a particular index
function addItem(index) {
    index = index || this.count();
    if (this.item(index))
        throw ListError('attempt to create item with ID of existing item');

    // Copy component
    var component = Component.copy(this.itemSample, true);

    // var tempComp = binder(component.el)[component.name]
    //     , innerScope = tempComp.container.scope;

    var compInfoScope = binder.scan(component.el)
        , compInfo = compInfoScope._any()
        , compInfos = compInfo.container.scope
        , innerScope = binder.create(compInfos);

    // Set reference to component container facet on scope
    innerScope._hostObject = component.container;

    // Copy bound scope to component
    component.container.scope = innerScope;

    // Add it to the DOM
    this._itemPreviousComponent(index).dom.insertAfter(component.el)

    // Add to list items
    this._setItem(index, component);

    // Show the list item component
    component.dom.show();

    return component;
}

// Remove item from a particular index,
// `doSplice` determines if the empty space should be removed
function removeItem(index, doSplice) {
    var comp = this.item(index);

    if (! comp)
        return logger.warn('attempt to remove list item with id that does not exist');

    this._listItems[index] = undefined;
    delete this._listItemsHash[comp.name];
    comp.dom.remove();
    comp.remove();

    if (doSplice)
        this._listItems.splice(index, 1);
}

// Returns the previous item component given an index
function _itemPreviousComponent(index) {
    while (index >= 0 && ! this._listItems[index])
        index--;

    return index >= 0
                ? this._listItems[index]
                : this.itemSample;
}

// Performs a callback on each list item
function each(callback, thisArg) {
    this._listItems.forEach(function(item) {
        if (item) callback.apply(this, arguments);
    }, thisArg || this);
}
