'use strict';

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
    , domUtils = miloUtil.dom
    , miloConfig = require('../../config');


var LIST_SAMPLE_CSS_CLASS = 'ml-list-item-sample';


// Data model connection facet
var List = _.createSubclass(ComponentFacet, 'List');

_.extendProto(List, {
    init: init,
    start: start,

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
}

function start() {
    // Fired by __binder__ when all children of component are bound
    this.owner.on('childrenbound', onChildrenBound);
}

function onChildrenBound() {
    // get items already in the list
    var children = this.dom.children()
        , items = this.list._listItems
        , itemsHash = this.list._listItemsHash;

    children && children.forEach(function(childEl) {
        var comp = Component.getComponent(childEl);
        if (comp && comp.item) {
            items.push(comp);
            itemsHash[comp.name] = comp;
            comp.item.list = this.list;
        }
    }, this);

    if (items.length) {
        var foundItem = items[0];
        items.splice(0, 1);
        delete itemsHash[foundItem.name];
        items.forEach(function(item, index) {
            item.item.setIndex(index);
        });
    }
    
    // Component must have one child with an Item facet 
    if (! foundItem) throw new ListError('No child component has Item facet');

    this.list.itemSample = foundItem;

    // After keeping a reference to the item sample, it must be hidden and removed from scope
    foundItem.dom.hide();
    foundItem.remove(true);
    foundItem.dom.removeCssClasses(LIST_SAMPLE_CSS_CLASS);

    // remove references to components from sample item
    foundItem.walkScopeTree(function(comp) {
        delete comp.el[miloConfig.componentRef];
    });

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
    this._listItems.splice(index, 0, component);
    this._listItemsHash[component.name] = component;
    component.item.list = this;
    component.item.setIndex(+index);
}

// Does the list contain a particular list item component
function contains(component) {
    return this._listItemsHash[component.name] == component;
}

// Add a new list item at a particular index
function addItem(index) {
    index = index || this.count();
    if (this.item(index))
        throw ListError('attempt to create item with ID of existing item');

    // Copy component
    var component = Component.copy(this.itemSample, true);
    var prevComponent = this._itemPreviousComponent(index);

    if (!prevComponent.el.parentNode)
        return logger.warn('list item sample was removed from DOM, probably caused by wrong data. Reset list data with array');

    // Add it to the DOM
    prevComponent.dom.insertAfter(component.el);

    // Add to list items
    this._setItem(index, component);

    // Show the list item component
    component.el.style.display = '';

    _updateItemsIndexes.call(this, index + 1);

    return component;
}


function _updateItemsIndexes(fromIndex, toIndex) {
    fromIndex = fromIndex || 0;
    toIndex = toIndex || this.count();
    for (var i = fromIndex; i < toIndex; i++) {
        var component = this._listItems[i];
        if (component)
            component.item.setIndex(i);
        else
            logger.warn('List: no item at position', i);
    }
}


/**
 * List facet instance method
 * Adds a given number of items using template rendering rather than adding elements one by one
 *
 * @param {Integer} count number of items to add
 * @param {[Integer]} index optional index of item after which to add
 */
function List$addItems(count, index) {
    check(count, Match.Integer);
    if (count < 0)
        throw new ListError('can\'t add negative number of items');

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
        var listLength = this.count();
        var spliceIndex = index < 0
                            ? 0
                            : typeof index == 'undefined' || index > listLength
                                ? listLength
                                : index;

        var prevComponent = spliceIndex == 0
                                ? this.itemSample
                                : this._listItems[spliceIndex - 1];

        var frag = document.createDocumentFragment()
            , newComponents = [];

        children.forEach(function(el, i) {
            var component = Component.getComponent(el);
            if (! component)
                return logger.error('List: element in new items is not a component');
            newComponents.push(component);
            this._setItem(spliceIndex++, component);
            frag.appendChild(el);
            el.style.display = '';
        }, this);

        _updateItemsIndexes.call(this, spliceIndex);

        if (!prevComponent.el.parentNode)
            return logger.warn('list item sample was removed from DOM, probably caused by wrong data. Reset list data with array');

        // Add it to the DOM
        prevComponent.dom.insertAfter(frag);

        _.deferMethod(newComponents, 'forEach', function(comp) {
            comp.broadcast('stateready');
        });
    }
}


// Remove item from a particular index
function removeItem(index) {
    var comp = this.item(index);

    if (! comp)
        return logger.warn('attempt to remove list item with id that does not exist');

    this._listItems[index] = undefined;
    delete this._listItemsHash[comp.name];
    comp.destroy();

    this._listItems.splice(index, 1);
    _updateItemsIndexes.call(this, index);
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
