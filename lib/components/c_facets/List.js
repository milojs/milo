'use strict';

var ComponentFacet = require('../c_facet')
    , Component = require('../c_class')
    , facetsRegistry = require('./cf_registry')
    , miloCore = require('milo-core')
    , _ = miloCore.proto
    , miloMail = require('../../services/mail')
    , miloBinder = require('../../binder')
    , logger = miloCore.util.logger
    , doT = miloCore.util.doT
    , check = miloCore.util.check
    , Match = check.Match
    , domUtils = require('../../util/dom')
    , componentName = require('../../util/component_name')
    , miloConfig = require('../../config');


var LIST_SAMPLE_CSS_CLASS = 'ml-list-item-sample';

/**
 * `milo.registry.facets.get('List')`
 * Facet enabling list functionality
 */
var List = _.createSubclass(ComponentFacet, 'List');

_.extendProto(List, {
    init: List$init,
    start: List$start,
    destroy: List$destroy,

    require: ['Container', 'Dom', 'Data'],
    _itemPreviousComponent: _itemPreviousComponent,

    item: List$item,
    count: List$count,
    contains: List$contains,
    addItem: List$addItem,
    addItems: List$addItems,
    replaceItem: List$replaceItem,
    removeItem: List$removeItem,
    extractItem: List$extractItem,
    each: List$each,
    _setItem: List$_setItem,
    _removeItem: List$_removeItem,
    _addItem: List$_addItem,
    _addItems: List$_addItems,
    _createCacheTemplate: List$_createCacheTemplate,
    _updateDataPaths: List$_updateDataPaths
});

facetsRegistry.add(List);

module.exports = List;


/**
 * Facet instance method
 * Initialized List facet instance and sets up item properties.
 */
function List$init() {
    ComponentFacet.prototype.init.apply(this, arguments);
    var self = this;

    _.defineProperties(this, {
        _listItems: [],
        _listItemsHash: {}
    });
    _.defineProperty(this, 'itemSample', null, _.WRIT);
}


/**
 * Facet instance method
 * Starts the List facet instance, finds child with Item facet.
 */
function List$start() {
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
    if (! foundItem) throw new Error('No child component has Item facet');

    this.list.itemSample = foundItem;

    // After keeping a reference to the item sample, it must be hidden and removed from scope
    foundItem.dom.hide();
    foundItem.remove(true);
    foundItem.dom.removeCssClasses(LIST_SAMPLE_CSS_CLASS);

    // remove references to components from sample item
    foundItem.walkScopeTree(function(comp) {
        delete comp.el[miloConfig.componentRef];
    });

    this.list._createCacheTemplate();
}


function List$_createCacheTemplate() {
    if (!this.itemSample) return false;
    
    var itemSample = this.itemSample;

    // create item template to insert many items at once
    var itemElCopy = itemSample.el.cloneNode(true);
    var attr = itemSample.componentInfo.attr;
    var attrCopy = _.clone(attr);
    attr.compName = '{{= it.componentName() }}';
    attr.el = itemElCopy;
    attr.decorate();

    var itemsTemplateStr = 
          '{{ var i = it.count; while(i--) { }}'
        + itemElCopy.outerHTML
        + '{{ } }}';

    this.itemsTemplate = doT.compile(itemsTemplateStr);
}


/**
 * Facet instance method
 * Retrieve a particular child item by index
 * @param {Integer} index The index of the child item to get.
 * @return {Component} The component found
 */
function List$item(index) {
    return this._listItems[index];
}


/**
 * Facet instance method
 * Gets the total number of child items
 * @return {Integer} The total
 */
function List$count() {
    return this._listItems.length;
}


function List$_setItem(index, component) {
    this._listItems.splice(index, 0, component);
    this._listItemsHash[component.name] = component;
    component.item.list = this;
    component.item.setIndex(+index);
}


/**
 * Facet instance method
 * Returns true if a particular child item exists in the list
 * @param {Component} component The component to look for.
 * @return {Boolean}
 */
function List$contains(component) {
    return this._listItemsHash[component.name] == component;
}


/**
 * Facet instance method
 * Adds a new child component at a particular index and returns the new component.
 * This method uses data facet, so notification will be emitted on data facet.
 * @param {Integer} index The index to add at
 * @return {Component} The newly created component
 */
function List$addItem(index, itemData) {
    index = index || this.count();
    this.owner.data.splice(index, 0, itemData || {});
    return this.item(index);
}


/**
 * Facet instance method
 * Adds a new child component at a particular index and returns the new component
 * @param {Integer} index The index to add at
 * @return {Component} The newly created component
 */
function List$_addItem(index) {
    index = index || this.count();
    if (this.item(index))
        throw Error('attempt to create item with ID of existing item');

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


function List$addItems(count, index) { // ,... items data
    var itemsData = _.slice(arguments, 2);
    if (itemsData.length < count) 
        itemsData.concat(_.repeat(count - itemsData.length, {}));
    var spliceArgs = [index, 0].concat(itemsData);
    var dataFacet = this.owner.data;
    dataFacet.splice.apply(dataFacet, spliceArgs);
}


/**
 * List facet instance method
 * Adds a given number of items using template rendering rather than adding elements one by one
 *
 * @param {Integer} count number of items to add
 * @param {[Integer]} index optional index of item after which to add
 */
function List$_addItems(count, index) {
    check(count, Match.Integer);
    if (count < 0)
        throw new Error('can\'t add negative number of items');

    if (count == 0) return;

    var itemsHTML = this.itemsTemplate({
        componentName: componentName,
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


/**
 * List facet instance method
 * @param {Integer} index The index of the item to remove
 * @return {Array[Object]} The spliced data
 */
function List$removeItem(index) {
    return this.owner.data.splice(index, 1);
}


/**
 * List facet instance method
 * @param {Integer} index The index of the item to extract
 * @return {Component} The extracted item
 */
function List$extractItem(index) {
    var itemComp = this._removeItem(index, false);
    this._updateDataPaths(index, this.count());
    return itemComp;
}


/**
 * List facet instance method
 * Removes item, returns the removed item that is destroyed by default.
 * 
 * @param  {Number} index item index
 * @param  {Boolean} doDestroyItem optional false to prevent item destruction, true by default
 * @return {Component}
 */
function List$_removeItem(index, doDestroyItem) {
    var comp = this.item(index);

    if (! comp)
        return logger.warn('attempt to remove list item with id that does not exist');

    this._listItems[index] = undefined;
    delete this._listItemsHash[comp.name];
    if (doDestroyItem !== false) comp.destroy();
    else {
        comp.remove();
        comp.dom.remove();
    }

    this._listItems.splice(index, 1);
    _updateItemsIndexes.call(this, index);

    return comp;
}


function List$replaceItem(index, newItem){
    var oldItem = this.item(index);
    oldItem.dom.insertAfter(newItem.el);
    this._removeItem(index);
    this._setItem(index, newItem);
}


// Returns the previous item component given an index
function _itemPreviousComponent(index) {
    while (index >= 0 && ! this._listItems[index])
        index--;

    return index >= 0
                ? this._listItems[index]
                : this.itemSample;
}


// toIndex is not included
// no range checking is made
function List$_updateDataPaths(fromIndex, toIndex) {
    for (var i = fromIndex; i < toIndex; i++) {
        var item = this.item(i);
        if (item)
            item.data._path = '[' + i + ']';
        else
            logger.warn('Data: no item for index', j);
    }
}


/**
 * Facet instance method
 * Similar to forEach method of Array, iterates each of the child items.
 * @param {Function} callback An iterator function to be called on each child item.
 * @param {[type]}   thisArg  Context to set `this`.
 */
function List$each(callback, thisArg) {
    this._listItems.forEach(function(item, index) {
        if (item) callback.apply(this, arguments); // passes item, index to callback
        else logger.warn('List$each: item', index, 'is undefined');
    }, thisArg || this);
}


/**
 * Facet instance method
 * Destroys the list
 */
function List$destroy() {
    if (this.itemSample) this.itemSample.destroy(true);
    ComponentFacet.prototype.destroy.apply(this, arguments);
}
