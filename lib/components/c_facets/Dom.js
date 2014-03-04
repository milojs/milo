'use strict';

// <a name="components-facets-dom"></a>
// ###dom facet

var ComponentFacet = require('../c_facet')
    , facetsRegistry = require('./cf_registry') 
    , _ = require('mol-proto')
    , check = require('../../util/check')
    , Match = check.Match
    , binder = require('../../binder')
    , BindAttribute = require('../../attributes/a_bind')
    , DomFacetError = require('../../util/error').DomFacet
    , domUtils = require('../../util/dom')
    , config = require('../../config')
    , doT = require('dot');


// data model connection facet
var Dom = _.createSubclass(ComponentFacet, 'Dom');

_.extend(Dom, {
    createElement: Dom$$createElement
});


/**
 * Facet class method
 * Creates an element from a passed configuation object
 * 
 * @param {Object} config with the properties `tagName`, `cssClasses`, `attributes`, `content`, `template`
 * @return {Element} an html element 
 */
function Dom$$createElement(config) {
    var domConfig = config.domConfig || {}
        , tagName = domConfig.tagName || 'div'
        , newEl = document.createElement(tagName)
        , content = config.content
        , template = config.template;

    // TODO it will be called again when/if component is instantiated
    // Should be someproperty on element to indicate it's been called?
    _applyConfigToElement(newEl, domConfig);

    if (typeof content == 'string') {
        if (template)
            newEl.innerHTML = doT.template(template)({content: content});
        else
            newEl.innerHTML = content;
    }
    return newEl;
}


function _applyConfigToElement(el, config) {
    var cssClasses = config && config.cls
        , configAttributes = config && config.attributes;

    if (configAttributes)
        _.eachKey(configAttributes, function(attrValue, attrName) {
            el.setAttribute(attrName, attrValue);
        });

    if (cssClasses)
        _attachCssClasses('add', cssClasses, el);
}


_.extendProto(Dom, {
    start: start,

    show: show,
    hide: hide,
    toggle: toggle,
    detach: detach,
    remove: remove,
    append: append,
    prepend: prepend,
    appendChildren: appendChildren,
    prependChildren: prependChildren,
    insertAfter: insertAfter,
    insertBefore: insertBefore,
    children: Dom$children,
    setStyle: setStyle,
    setStyles: setStyles,
    copy: copy,
    createElement: createElement,

    addCssClasses: _.partial(_manageCssClasses, 'add'),
    removeCssClasses: _.partial(_manageCssClasses, 'remove'),
    toggleCssClasses: _.partial(_manageCssClasses, 'toggle'),

    find: find,
    hasTextBeforeSelection: hasTextBeforeSelection,
    hasTextAfterSelection: hasTextAfterSelection
    // _reattach: _reattachEventsOnElementChange
});

facetsRegistry.add(Dom);

module.exports = Dom;


// start Dom facet
function start() {
    var el = this.owner.el;
    _applyConfigToElement(el, this.config);
    var currentStyle = window.getComputedStyle(el)
    this._visible = currentStyle && currentStyle.display != 'none';
}

// show HTML element of component
function show() {
    this.toggle(true);
}

// hide HTML element of component
function hide() {
    this.toggle(false);
}

// show/hide
function toggle(doShow) {
    doShow = typeof doShow == 'undefined'
                ? ! this._visible
                : !! doShow;

    this._visible = doShow;
    var el = this.owner.el;

    el.style.display = doShow ? 'block' : 'none';
}


function _manageCssClasses(methodName, cssClasses, enforce) {
    var el = this.owner.el;

    _attachCssClasses(methodName, cssClasses, el);
}


function _attachCssClasses(methodName, cssClasses, el) {
    var classList = el.classList
        , doToggle = methodName == 'toggle';

    if (Array.isArray(cssClasses))
        cssClasses.forEach(callMethod);
    else if (typeof cssClasses == 'string')
        callMethod(cssClasses);
    else
        throw new DomFacetError('unknown type of CSS classes parameter');

    function callMethod(cssCls) {
        doToggle
            ? classList[methodName](cssCls, enforce)
            : classList[methodName](cssCls);
    }
}


function detach() {
    if (this.owner.el)  
        domUtils.detachComponent(this.owner.el);
}


function setStyle(property, value) {
    this.owner.el.style[property] = value;
}

function setStyles(properties) {
    for (var property in properties)
        this.owner.el.style[property] = properties[property];
}


// create a copy of DOM element using facet config if set
// TODO: reconsider deep copy as it wont work with a tagName
function copy(isDeep) {
    var tagName = this.config.tagName;
    if (! this.config.tagName)
        return this.owner.el.cloneNode(isDeep);

    var newEl = document.createElement(tagName);

    var configAttributes = this.config.attributes;
    if (configAttributes)
        _.eachKey(configAttributes, function(attrValue, attrName) {
            newEl.setAttribute(attrName, attrValue);
        });

    var attributes = this.owner.el.attributes;
    if (attributes)
        for (var i = 0; i<attributes.length; i++) {
            var attr = attributes[i];
            if (attr.name == 'id') continue;
            newEl.setAttribute(attr.name, attr.value);
        }

    return newEl;
}


function createElement() {
    var newEl = Dom.createElement(this.config);
    return newEl;
}


// remove HTML element of component
function remove() {
    domUtils.removeElement(this.owner.el);
}

// append inside HTML element of component
function append(el) {
    this.owner.el.appendChild(el)
}

// prepend inside HTML element of component
function prepend(el) {
    var thisEl = this.owner.el
        , firstChild = thisEl.firstChild;
    if (firstChild)
        thisEl.insertBefore(el, firstChild);
    else
        thisEl.appendChild(el);
}

// appends children of element inside this component's element
function appendChildren(el) {
    while(el.childNodes.length)
        this.append(el.childNodes[0]);
}

// prepends children of element inside this component's element
function prependChildren(el) {
    while(el.childNodes.length)
        this.prepend(el.childNodes[el.childNodes.length - 1]);
}

function insertAfter(el) {
    var thisEl = this.owner.el
        , parent = thisEl.parentNode;
    parent.insertBefore(el, thisEl.nextSibling);
}

function insertBefore(el) {
    var thisEl = this.owner.el
        , parent = thisEl.parentNode;
    parent.insertBefore(el, thisEl);
}


/**
 * Dom facet instacne method
 * Returns the list of child elements of the component element
 *
 * @return {Array[Element]}
 */
function Dom$children() {
    return domUtils.children(this.owner.el);
}


var findDirections = {
    'up': 'previousNode',
    'down': 'nextNode'
};

// Finds component passing optional iterator's test
// in the same scope as the current component (this)
// by traversing DOM tree upwards (direction = "up")
// or downwards (direction = "down")
function find(direction, iterator) {
    if (! findDirections.hasOwnProperty(direction))
        throw new DomFacetError('incorrect find direction: ' + direction);

    var el = this.owner.el
        , scope = this.owner.scope
        , treeWalker = document.createTreeWalker(scope._rootEl, NodeFilter.SHOW_ELEMENT);

    treeWalker.currentNode = el;
    var nextNode = treeWalker[findDirections[direction]]()
        , componentsNames = Object.keys(scope)
        , found = false;

    while (nextNode) {
        var attr = new BindAttribute(nextNode);
        if (attr.node) {
            attr.parse().validate();
            if (scope.hasOwnProperty(attr.compName)) {
                var component = scope[attr.compName];
                if (! iterator || iterator(component)) {
                    found = true;
                    break;
                }
            }
        }
        treeWalker.currentNode = nextNode;
        nextNode = treeWalker[findDirections[direction]]();
    }

    if (found) return component;
}


// returns true if the element has text before selection
function hasTextBeforeSelection() {
    var selection = window.getSelection();
    if (! selection.isCollapsed) return true;
    if (selection.anchorOffset) return true;

    // walk up the DOM tree to check if there are text nodes before cursor
    var treeWalker = document.createTreeWalker(this.owner.el, NodeFilter.SHOW_TEXT);
    return treeWalker.previousNode();
}


function hasTextAfterSelection() {
    var selection = window.getSelection();
    if (! selection.isCollapsed) return true;
    if (selection.anchorOffset < selection.anchorNode.length) return true;

    // walk up the DOM tree to check if there are text nodes after cursor
    var treeWalker = document.createTreeWalker(this.owner.el, NodeFilter.SHOW_TEXT);
    treeWalker.currentNode = selection.anchorNode;
    var nextNode = treeWalker.nextNode();
    
    //To capture when treewalker gives us an empty text node (unknown reason)
    var isText = nextNode ? !nextNode.nodeValue == '' : false;

    return isText;
}
