'use strict';

// <a name="components-facets-list"></a>
// ###list facet

var ComponentFacet = require('../c_facet')
    , Component = require('../c_class')
    , facetsRegistry = require('./cf_registry')
    , Model = require('../../model')
    , _ = require('mol-proto')
    , miloMail = require('../../mail')
    , miloBinder = require('../../binder')
    , miloUtil = require('../../util')
    , ListError = miloUtil.error.List
    , logger = miloUtil.logger
    , doT = require('dot')
    , check = miloUtil.check
    , Match = check.Match
    , domUtils = miloUtil.dom;


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
    addItems: List$addItems,
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
    this.list.itemSample.remove(true);

    // create item template to insert many items at once
    var itemElCopy = foundItem.el.cloneNode(true);
    var attr = foundItem.componentInfo.attr;
    var attrCopy = _.clone(attr);
    attr.compName = '{{= it.componentName() }}';
    attr.el = itemElCopy;
    attr.decorate();

    var itemsTemplateStr = 
          '{{ var i = it.count; while(i--) { }}'
        + itemElCopy.outerHTML
        + '{{ } }}';

    this.list.itemsTemplate = doT.compile(itemsTemplateStr);
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

    // Add it to the DOM
    this._itemPreviousComponent(index).dom.insertAfter(component.el)

    // Add to list items
    this._setItem(index, component);

    // Show the list item component
    component.el.style.display = '';

    return component;
}


/**
 * List facet instance method
 * Adds a given number of items using template rendering rather than adding elements one by one
 *
 * @param {Integer} count number of items to add
 */
function List$addItems(count) {
    check(count, Match.Integer);
    if (count < 0)
        throw new ListError('can\'t add negative number of items')

    if (count == 0) return;

    var itemsHTML = this.itemsTemplate({
        componentName: miloUtil.componentName,
        count: count
    });

    var wrapEl = document.createElement('div');
    wrapEl.innerHTML = itemsHTML;

    miloBinder(wrapEl, this.owner.container.scope);
    var children = domUtils.children(wrapEl);

    if (count != children.length)
        logger.error('number of items added is different from requested');

    if (children && children.length) {
        var count = this.count();
        var prevComponent = count 
                                ? this._listItems[count - 1]
                                : this.itemSample;

        var frag = document.createDocumentFragment();
        children.forEach(function(el, index) {
            var component = Component.getComponent(el);
            if (! component)
                return logger.error('List: element in new items is not a component');
            this._listItems.push(component);
            this._listItemsHash[component.name] = component;
            frag.appendChild(el);
            el.style.display = '';
        }, this);

        // Add it to the DOM
        prevComponent.dom.insertAfter(frag);
    }
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
