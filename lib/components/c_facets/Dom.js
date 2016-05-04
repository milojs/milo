'use strict';


var ComponentFacet = require('../c_facet')
    , facetsRegistry = require('./cf_registry') 
    , miloCore = require('milo-core')
    , _ = miloCore.proto
    , check = miloCore.util.check
    , Match = check.Match
    , doT = miloCore.util.doT
    , binder = require('../../binder')
    , BindAttribute = require('../../attributes/a_bind')
    , domUtils = require('../../util/dom')
    , config = require('../../config');


/**
 * `milo.registry.facets.get('Dom')`
 * Facet with component related dom utils
 */
var Dom = _.createSubclass(ComponentFacet, 'Dom');

_.extend(Dom, {
    createElement: Dom$$createElement
});


/**
 * Facet class method
 * Creates an element from a passed configuation object
 * 
 * @param {Object} config with the properties `domConfig`, `content`, `template`
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
        _attachCssClasses(el, 'add', cssClasses);
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
    appendToScopeParent: appendToScopeParent,
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
    hasTextAfterSelection: hasTextAfterSelection,
});

facetsRegistry.add(Dom);

module.exports = Dom;


// start Dom facet
function start() {
    ComponentFacet.prototype.start.apply(this, arguments);
    var el = this.owner.el;
    _applyConfigToElement(el, this.config);
    var currentStyle = window.getComputedStyle(el);
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

    return doShow;
}


function _manageCssClasses(methodName, cssClasses, enforce) {
    _attachCssClasses(this.owner.el, methodName, cssClasses, enforce);
}


function _attachCssClasses(el, methodName, cssClasses, enforce) {
    var classList = el.classList
        , doToggle = methodName == 'toggle';

    if (Array.isArray(cssClasses))
        cssClasses.forEach(callMethod);
    else if (typeof cssClasses == 'string')
        callMethod(cssClasses);
    else
        throw new Error('unknown type of CSS classes parameter');

    function callMethod(cssCls) {
        if (doToggle) {
            // Only pass 'enforce' if a value has been provided (The 'toggle' function of the classList will treat undefined === false resulting in only allowing classes to be removed)
            if (enforce === undefined) classList[methodName](cssCls) 
            else classList[methodName](cssCls, enforce);
        } else
            classList[methodName](cssCls);
    }
}


function detach() {
    if (this.owner.el)  
        domUtils.detachComponent(this.owner.el);
}


function setStyle(property, value) {
    if (!this.owner.el) {
        throw new Error("Cannot call setStyle on owner with no element: " + this.owner.constructor.name);
    }
    this.owner.el.style[property] = value;
}

function setStyles(properties) {
    for (var property in properties)
        this.owner.el.style[property] = properties[property];
}


// create a copy of DOM element using facet config if set
function copy(isDeep) {
    return this.owner.el && this.owner.el.cloneNode(isDeep);
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
    this.owner.el.appendChild(el);
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


// appends component's element to scope parent. If it was alredy in DOM it will be moved
function appendToScopeParent() {
    var parent = this.owner.getScopeParent();
    if (parent) parent.el.appendChild(this.owner.el);
}


/**
 * Dom facet instance method
 * Returns the list of child elements of the component element
 *
 * @return {Array<Element>}
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
        throw new Error('incorrect find direction: ' + direction);

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
    
    var text = selection.focusNode && selection.focusNode.textContent;
    var startPos = text && text.charAt(0) == ' ' ? 1 : 0;
    if (selection.anchorOffset != startPos) return true;

    return isAdjacentText(this.owner.el, selection.anchorNode, 'prev');
}


// returns true if the element has text after selection
function hasTextAfterSelection() {
    var selection = window.getSelection();
    if (! selection.isCollapsed) return true;

    var text = selection.focusNode && selection.focusNode.textContent;
    var startPos = text && text.charAt(text.length-1) == ' ' ? selection.anchorNode.length-1 : selection.anchorNode.length;
    if (selection.anchorOffset < startPos) return true;

    return isAdjacentText(this.owner.el, selection.anchorNode, 'next');
}


// walk the DOM tree to check if there are text nodes after cursor
function isAdjacentText(el, startEl, direction) {
    var method = direction == 'next' ? 'nextNode' : 'previousNode';
    var treeWalker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    treeWalker.currentNode = startEl;
    var adjNode = treeWalker[method]();

    if (adjNode && adjNode.tagName === 'BR')
        var isText = true;
    else
        isText = adjNode ? adjNode.nodeValue
                            && adjNode.nodeValue.trim() !== ''
                          : false;
    return isText;
}
