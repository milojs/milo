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
	, domUtils = require('../../util/dom');


// data model connection facet
var Dom = _.createSubclass(ComponentFacet, 'Dom');

_.extendProto(Dom, {
	init: init,
	start: start,

	show: show,
	hide: hide,
	toggle: toggle,
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

	find: find,
	hasTextBeforeSelection: hasTextBeforeSelection,
	hasTextAfterSelection: hasTextAfterSelection
	// _reattach: _reattachEventsOnElementChange
});

facetsRegistry.add(Dom);

module.exports = Dom;


// initialize Dom facet
function init() {
	ComponentFacet.prototype.init.apply(this, arguments);
}

// start Dom facet
function start() {
	var cssClasses = this.config.cls
		, classList = this.owner.el.classList;
	if (Array.isArray(cssClasses))
		cssClasses.forEach(classList.add, classList);
	else if (typeof cssClasses == 'string')
		classList.add(cssClasses);
	else if (cssClasses)
		throw new DomFacetError('unknown type of "cls" configuration parameter');
}

// show HTML element of component
function show() {
	this.owner.el.style.display = 'block';
}

// hide HTML element of component
function hide() {
	this.owner.el.style.display = 'none';
}

// show/hide
function toggle(doShow) {
	Dom.prototype[doShow ? 'show' : 'hide'].call(this);
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


function newElement() {
	var tagName = this.config.tagName || 'DIV';
	var newEl = document.createElement(tagName);

	var attributes = this.config.attributes;
	if (attributes)
		_.eachKey(attributes, function(attrValue, attrName) {
			newEl.setAttribute(attrName, attrValue);
		});

	this.owner.el = newEl;

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
