'use strict';


var domUtils = require('../dom')
    , containingElement = domUtils.containingElement
    , setCaretPosition = domUtils.setCaretPosition
    , logger = require('../logger')
    , Component = require('../../components/c_class')
    , _ = require('mol-proto');

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
 * Returns selection end element
 *
 * @return {Element|null}
 */
var TextSelection$containingElement = 
    _.partial(_getElement, '_containingElement', 'commonAncestorContainer');


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


/**
 * TextSelection instance method
 * Returns selection end Component
 *
 * @return {Component}
 */
var TextSelection$containingComponent = 
    _.partial(_getComponent, '_containingComponent', 'containingElement');


_.extendProto(TextSelection, {
    init: TextSelection$init,
    text: TextSelection$text,
    textNodes: TextSelection$textNodes,

    startElement: TextSelection$startElement,
    endElement: TextSelection$endElement,
    containingElement: TextSelection$containingElement,

    startComponent: TextSelection$startComponent,
    endComponent: TextSelection$endComponent,
    containingComponent: TextSelection$containingComponent,

    containedComponents: TextSelection$containedComponents,
    eachContainedComponent: TextSelection$eachContainedComponent,
    del: TextSelection$del,
    _getPostDeleteSelectionPoint: _getPostDeleteSelectionPoint,
    _selectAfterDelete: _selectAfterDelete,

    getRange: TextSelection$getRange,
    getState: TextSelection$getState,
});


_.extend(TextSelection, {
    createFromRange: TextSelection$$createFromRange,
    createFromState: TextSelection$$createFromState
});


/**
 * TextSelection instance method
 * Initializes TextSelection from the current selection
 */
function TextSelection$init() {
    this.selection = this.window.getSelection();
    if (this.selection.rangeCount)
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
    if (! this.range) return undefined;

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
    if (! this.range) return undefined;

    if (! this._textNodes)
        this._textNodes = _getTextNodes.call(this);
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
    var textNodes = [];

    if (this.isCollapsed)
        return textNodes;

    // create TreeWalker to traverse the tree to select all text nodes
    var selStart = this.range.startContainer
        , selEnd = this.range.endContainer
        , rangeContainer = this.range.commonAncestorContainer;

    var treeWalker = this.window.document.createTreeWalker(rangeContainer, NodeFilter.SHOW_TEXT);
    var node = treeWalker.currentNode = selStart;

    // traverse DOM tree to collect all selected text nodes
    while (node && (! inEnd || selEnd.contains(node))) {
        textNodes.push(node);
        var inEnd = inEnd || selEnd.contains(node);
        node = treeWalker.nextNode();
    }
    return textNodes;
}


/**
 * Retrieves and returns start/end element from selection saving them on properties of object
 *
 * @private
 * @param {TextSelection} this
 * @return {Element|null}
 */
function _getElement(thisPropName, rangePropName) {
    if (! this.range) return undefined;

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
    if (! this.range) return undefined;

    if (typeof this[thisPropName] == 'undefined')
        this[thisPropName] = Component.getContainingComponent(this[elMethodName]());
    return this[thisPropName];
}


function TextSelection$containedComponents() {
    if (this._containedComponents)
        return this._containedComponents;

    var components = this._containedComponents = [];

    if (this.isCollapsed || ! this.range) return components;

    var selStart = this.range.startContainer
        , selEnd = this.range.endContainer
        , rangeContainer = this.range.commonAncestorContainer;

    if (selStart != selEnd) {
        var treeWalker = this.window.document.createTreeWalker(rangeContainer,
                NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);

        treeWalker.currentNode = selStart;
        var node = treeWalker.nextNode(); // first node after selected text node

        while (node && node != selEnd) {
            if (node.nodeType != Node.TEXT_NODE) {
                var comp = Component.getComponent(node);
                if (comp && !comp.el.contains(selEnd))
                    components.push(comp);
            }
            node = treeWalker.nextNode();
        }
    }
    return components;
}


function TextSelection$eachContainedComponent(callback, thisArg) {
    if (this.isCollapsed || ! this.range) return;

    var components = this.containedComponents();

    components.forEach(callback, thisArg);
}


/**
 * TextSelection instance method
 * Deletes the current selection and all components in it
 * 
 * @param {Boolean} selectEndContainer set to true if the end container should be selected after deletion
 */
function TextSelection$del(selectEndContainer) {
    if (this.isCollapsed || ! this.range) return;

    this.eachContainedComponent(function(comp) {
        comp.destroy();
    });

    var selPoint = this._getPostDeleteSelectionPoint(selectEndContainer);

    this.range.deleteContents();

    this._selectAfterDelete(selPoint);
}


function _getPostDeleteSelectionPoint(selectEndContainer) {
    var selNode = this.range.startContainer;
    var selOffset = this.range.startOffset;
    if (selectEndContainer && this.range.startContainer != this.range.endContainer) {
        selNode = this.range.endContainer;
        selOffset = 0;
    }
    return { node: selNode, offset: selOffset };
}


function _selectAfterDelete(selPoint) {
    var selNode = selPoint.node
        , selOffset = selPoint.offset;
    selNode.textContent = selNode.textContent.trimRight();
    if (selNode && !selNode.nodeValue)
        selNode.nodeValue = '\u00A0'; //non-breaking space, \u200B for zero width space;
    
    var position = selOffset > selNode.length ? selNode.length : selOffset;
    setCaretPosition(selNode, position);
}


/**
 * Returns selection range
 *
 * @return {Range}
 */
function TextSelection$getRange() {
    return this.range;
}


/**
 * Stores selection window, nodes and offsets in object
 */
function TextSelection$getState(rootEl) {
    var r = this.range;
    return {
        window: this.window,
        rootEl: rootEl,
        start: _getSelectionPointState(rootEl, r.startContainer, r.startOffset),
        end: _getSelectionPointState(rootEl, r.endContainer, r.endOffset)
    };
}


function _getSelectionPointState(rootEl, node, offset) {
    var treeIndex = domUtils.treeIndexOf(rootEl, node);
    if (treeIndex == -1) logger.error('Selection point is outside of root element');
    return {
        treeIndex: treeIndex,
        offset: offset
    };
}


/**
 * Restores actual selection to the stored range
 */
function TextSelection$$createFromState(state) {
    var setSelection = state.window.milo.util.dom.setSelection;
    var startNode = _selectionNodeFromState(state.rootEl, state.start)
        , endNode = _selectionNodeFromState(state.rootEl, state.end);

    try {
        setSelection(startNode, state.start.offset, endNode, state.end.offset);
        return new TextSelection(state.window);
    } catch(e) {
        logger.error('Text selection: can\'t create selection', e, e.message);
    }
}


function _selectionNodeFromState(rootEl, pointState) {
    var node = domUtils.getNodeAtTreeIndex(rootEl, pointState.treeIndex);
    if (! node) logger.error('TextSelection createFromState: no node at treeIndex');
    return node;
}


/**
 * Creates selection from passed range
 * 
 * @param {Range} range
 * @return {TextSelection}
 */
function TextSelection$$createFromRange(range) {
    var win = range.startContainer.ownerDocument.defaultView
        , sel = win.getSelection();

    sel.removeAllRanges();
    sel.addRange(range);
    return new TextSelection(win);
}

