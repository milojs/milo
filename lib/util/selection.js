'use strict';


var domUtil = require('./dom')
	, containingElement = domUtil.containingElement
	, setCaretPosition = domUtil.setCaretPosition
	, Component = require('../components/c_class');

module.exports = TextSelection;


/**
 * Text selection class.
 * Serves as a helper to manage current selection
 * The object cannot be reused, if the selection changes some of its properties may contain information related to previous selection
 *
 * @param {Window} win window in which text selection is processed
 */
function TextSelection(win) {
	if (! this instanceof TextSelection)
		return new TextSelection(win);
	this.window = win || window;
	this.init();
}


/**
 * TextSelection instance method
 * Returns selection start element
 *
 * @return {Element|null}
 */
var TextSelection$startElement = 
	_.partial(_getElement, '_startElement', 'startContainer');


/**
 * TextSelection instance method
 * Returns selection end element
 *
 * @return {Element|null}
 */
var TextSelection$endElement = 
	_.partial(_getElement, '_endElement', 'endContainer');


/**
 * TextSelection instance method
 * Returns selection start Component
 *
 * @return {Component}
 */
var TextSelection$startComponent = 
	_.partial(_getComponent, '_startComponent', 'startElement');


/**
 * TextSelection instance method
 * Returns selection end Component
 *
 * @return {Component}
 */
var TextSelection$endComponent = 
	_.partial(_getComponent, '_endComponent', 'endElement');



_.extendProto(TextSelection, {
	init: TextSelection$init,
	text: TextSelection$text,
	textNodes: TextSelection$textNodes,
	startElement: TextSelection$startElement,
	endElement: TextSelection$endElement,
	startComponent: TextSelection$startComponent,
	endComponent: TextSelection$endComponent,
	del: TextSelection$del
});


/**
 * TextSelection instance method
 * Initializes TextSelection from the current selection
 */
function TextSelection$init() {
	this.selection = this.window.getSelection();
	this.range = this.selection.getRangeAt(0);
	this.isCollapsed = this.selection.isCollapsed;
}


/**
 * TextSelection instance method
 * Retrieves and returns selection text
 *
 * @return {String}
 */
function TextSelection$text() {
	if (! this._text)
		this._text = this.range.toString();

	return this._text;
}


/**
 * TextSelection instance method
 * Retrieves and returns selection text nodes
 *
 * @return {Array[Node]}
 */
function TextSelection$textNodes() {
	if (! this._textNodes)
		_getTextNodes.call(this);
	return this._textNodes;
}


/**
 * Retrieves text and text nodes from selection saving them on properties of object
 *
 * @private
 * @param {TextSelection} this
 */
function _getTextNodes() {
	// list of selected text nodes
	this._textNodes = [];

	if (this.isCollapsed)
		return;

	// create TreeWalker to traverse the tree to select all text nodes
	var selStart = this.range.startContainer
		, selEnd = this.range.endContainer
		, rangeContainer = this.range.commonAncestorContainer;

	var treeWalker = this.window.document.createTreeWalker(rangeContainer, NodeFilter.SHOW_TEXT);
	var node = treeWalker.currentNode = selStart;

	// traverse DOM tree to collect all selected text nodes
	while (node && (! inEnd || selEnd.contains(node))) {
		this._textNodes.push(node);
		var inEnd = inEnd || selEnd.contains(node);
		node = treeWalker.nextNode();
	}
}


/**
 * Retrieves and returns start/end element from selection saving them on properties of object
 *
 * @private
 * @param {TextSelection} this
 * @return {Element|null}
 */
function _getElement(thisPropName, rangePropName) {
	if (typeof this[thisPropName] == 'undefined')
		this[thisPropName] = containingElement(this.range[rangePropName]);
	return this[thisPropName];
}


/**
 * Retrieves and returns start/end component from selection saving them on properties of object
 *
 * @private
 * @param {TextSelection} this
 * @return {Component}
 */
function _getComponent(thisPropName, elMethodName) {
	if (typeof this[thisPropName] == 'undefined')
		this[thisPropName] = Component.getContainingComponent(this[elMethodName]());
	return this[thisPropName];
}


/**
 * TextSelection instance method
 * Deletes the current selection and all components in it
 */
function TextSelection$del() {
	if (this.isCollapsed)
		return;

	var selStart = this.range.startContainer
		, selEnd = this.range.endContainer
		, rangeContainer = this.range.commonAncestorContainer;

	// remove middle components from scope
	if (selStart != selEnd) {
		var treeWalker = this.window.document.createTreeWalker(rangeContainer,
				NodeFilter.SHOW_ELEMENT);
		treeWalker.currentNode = this.startElement();
		var el = treeWalker.nextNode();

		// traverse DOM tree to remove middle components from scope
		while (el && ! el.contains(selEnd)) {
			var component = Component.getComponent(el);

			if (component)
				component.remove();

			el = treeWalker.nextNode();
		}
	}

	this.range.deleteContents();
}
