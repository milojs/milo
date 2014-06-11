'use strict';


var domUtils = require('../dom')
    , containingElement = domUtils.containingElement
    , setCaretPosition = domUtils.setCaretPosition
    , getComponentsFromRange = domUtils.getComponentsFromRange
    , deleteRangeWithComponents = domUtils.deleteRangeWithComponents
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
    clear: TextSelection$clear,

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
    getNormalizedRange: TextSelection$$getNormalizedRange,
    getDirection: TextSelection$$getDirection
});


_.extend(TextSelection, {
    createFromRange: TextSelection$$createFromRange,
    createFromState: TextSelection$$createFromState,
    createStateObject: TextSelection$$createStateObject
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


function TextSelection$clear() {
    this.selection.removeAllRanges();
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

    return getComponentsFromRange(this.range);
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

    var selPoint = this._getPostDeleteSelectionPoint(selectEndContainer);

    deleteRangeWithComponents(this.range);

    this._selectAfterDelete(selPoint);
    selPoint.node.parentNode.normalize();
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
    var doc = rootEl.ownerDocument
        , win = doc.defaultView || doc.parentWindow;
    if (!r) return { window: win };
    return TextSelection.createStateObject(rootEl, r.startContainer, r.startOffset, r.endContainer, r.endOffset);
}


function TextSelection$$createStateObject(rootEl, startContainer, startOffset, endContainer, endOffset) {
    endContainer = endContainer || startContainer;
    endOffset = endOffset || startOffset;
    var doc = rootEl.ownerDocument
        , win = doc.defaultView || doc.parentWindow;
    return {
        window: win,
        rootEl: rootEl,
        start: _getSelectionPointState(rootEl, startContainer, startOffset),
        end: _getSelectionPointState(rootEl, endContainer, endOffset)
    };
}


function _getSelectionPointState(rootEl, node, offset) {
    var treePath = domUtils.treePathOf(rootEl, node);
    if (! treePath) logger.error('Selection point is outside of root element');
    return {
        treePath: treePath,
        offset: offset
    };
}


/**
 * Restores actual selection to the stored range
 */
function TextSelection$$createFromState(state) {
    var domUtils = state.window.milo.util.dom;

    if (state.rootEl && state.start && state.end) {
        var startNode = _selectionNodeFromState(state.rootEl, state.start)
            , endNode = _selectionNodeFromState(state.rootEl, state.end);

        try {
            domUtils.setSelection(startNode, state.start.offset, endNode, state.end.offset);
            return new TextSelection(state.window);
        } catch(e) {
            logger.error('Text selection: can\'t create selection', e, e.message);
        }
    } else {
        domUtils.clearSelection(state.window);
        return new TextSelection(state.window);
    }
}


function _selectionNodeFromState(rootEl, pointState) {
    var node = domUtils.getNodeAtTreePath(rootEl, pointState.treePath);
    if (! node) logger.error('TextSelection createFromState: no node at treePath');
    return node;
}


/**
 * Creates selection from passed range
 * 
 * @param {Range} range
 * @param {Boolean} backward
 *
 * @return {TextSelection}
 */
function TextSelection$$createFromRange(range, backward) {
    var win = range.startContainer.ownerDocument.defaultView
        , sel = win.getSelection()
        , endRange;

    sel.removeAllRanges();

    if (backward){
        endRange = range.cloneRange();
        endRange.collapse(false);

        sel.addRange(endRange);
        sel.extend(range.startContainer, range.startOffset)        
    }
    else {
        sel.addRange(range);
    }

    return new TextSelection(win);
}

/**
 * Returns a normalized copy of the range
 * If you triple click an item, the end of the range is positioned at the beginning of the NEXT node.
 * this function returns a range with the end positioned at the end of the last textnode contained 
 * inside a component with the "editable" facet
 * 
 * @return {range}
 */
function TextSelection$$getNormalizedRange(){
    var doc = this.range.commonAncestorContainer.ownerDocument
        , tw, previousNode
        , newRange = this.range.cloneRange();

    if (newRange.endContainer.nodeType !== Node.TEXT_NODE) {
        tw = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
        tw.currentNode = newRange.endContainer;
        previousNode = tw.previousNode();
        newRange.setEnd(previousNode, previousNode.length);
    }

    return newRange;
}

/**
 * get the direction of a selection
 *
 * 1 forward, -1 backward, 0 no direction, undefined one of the node is detached or in a different frame
 *
 * @return {-1|0|1|undefined}
 */
function TextSelection$$getDirection(){
    return domUtils.getSelectionDirection(this.selection);    
}

