'use strict';


var config = require('../config')
    , miloCore = require('milo-core')
    , _ = miloCore.proto
    , logger = miloCore.util.logger;

var domUtils = {
    children: children,
    filterNodeListByType: filterNodeListByType,
    containingElement: containingElement,
    selectElementContents: selectElementContents,
    selectElementText: selectElementText,
    getElementOffset: getElementOffset,
    setCaretPosition: setCaretPosition,
    getSelectionDirection: getSelectionDirection,
    setSelection: setSelection,
    clearSelection: clearSelection,
    removeElement: removeElement,
    unwrapElement: unwrapElement,
    wrapInElement: wrapInElement,
    detachComponent: detachComponent,
    firstTextNode: firstTextNode,
    lastTextNode: lastTextNode,
    trimNodeRight: trimNodeRight,
    trimNodeLeft: trimNodeLeft,
    stripHtml: stripHtml,
    htmlEntities: htmlEntities,
    walkTree: walkTree,
    createTreeWalker: createTreeWalker,

    treePathOf: treePathOf,
    getNodeAtTreePath: getNodeAtTreePath,
    insertAtTreePath: insertAtTreePath,
    isTreePathBefore: isTreePathBefore,

    getNodeWindow: getNodeWindow,

    getComponentsFromRange: getComponentsFromRange,
    deleteRangeWithComponents: deleteRangeWithComponents,
    forEachNodesInRange: forEachNodesInRange,
    areRangesEqual: areRangesEqual,

    addDebugPoint: addDebugPoint
};

module.exports = domUtils;


/**
 * Returns the list of element children of DOM element
 *
 * @param {Element} el element to return the children of (only DOM elements)
 * @return {Array[Element]}
 */
 function children(el) {
    return filterNodeListByType(el.childNodes, Node.ELEMENT_NODE);
 }


/**
 * Filters the list of nodes by type
 *
 * @param {NodeList} nodeList the list of nodes, for example childNodes property of DOM element
 * @param {Integer} nodeType an integer constant [defined by DOM API](https://developer.mozilla.org/en-US/docs/Web/API/Node.nodeType), e.g. `Node.ELEMENT_NODE` or `Node.TEXT_NODE`
 * @return {Array[Node]}
 */
function filterNodeListByType(nodeList, nodeType) {
    return _.filter(nodeList, function (node) {
        return node.nodeType == nodeType;
    });
}


/**
 * Find nearest parent element for node.
 * If node is an element, it will be returned.
 *
 * @param {Node} node
 * @return {Element|null}
 */
function containingElement(node) {
    while (node) {
        if (node.nodeType == Node.ELEMENT_NODE)
            return node;
        node = node.parentNode;
    }
    return null;
}


/**
 * Selects inner contents of DOM element
 *
 * @param {Element} el DOM element
 */
function selectElementContents(el) {
    var doc = el.ownerDocument;
    if (! doc) return logger.error('selectElementContents: element has no document');
    var range = doc.createRange();
    range.selectNodeContents(el);
    var win = getNodeWindow(el)
        , sel = win.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
}


/**
 * Selects text inside element
 * @param {Element} el
 */
function selectElementText(el) {
    var fromNode = firstTextNode(el)
        , toNode = lastTextNode(el);

    if (fromNode && toNode)
        setSelection(fromNode, 0, toNode, toNode.textContent.length);
}


/**
 * Sets the caret position to the position in the node
 *
 * @param {Node} node DOM node
 * @param {Number} pos caret position
 */
function setCaretPosition(node, pos) {
    var doc = node.ownerDocument;
    if (! doc) return logger.error('setCaretPosition: element has no document');
    var range = doc.createRange();
    range.setStart(node, pos);
    var win = getNodeWindow(node)
        , sel = win.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
}

/**
 * get the direction of a selection
 *
 * 1 forward, -1 backward, 0 no direction, undefined one of the node is detached or in a different frame
 *
 * @param {sel} a selection object
 * @return {-1|0|1|undefined}
 */
function getSelectionDirection(sel){
    return _getDirection(sel.anchorNode, sel.anchorOffset, sel.focusNode, sel.focusOffset);
}

function _getDirection(fromNode, startOffset, toNode, endOffset){
    var docPosition = fromNode.compareDocumentPosition(toNode);
    if (docPosition & Node.DOCUMENT_POSITION_FOLLOWING){
        return 1;
    }
    else if (docPosition & Node.DOCUMENT_POSITION_PRECEDING){
        return -1;
    }
    else if (fromNode == toNode){
        if (startOffset < endOffset){
            return 1;
        }
        else if (startOffset > endOffset){
            return -1;
        }
        else {
            return 0;
        }
    }
}

/**
 * Selects a range in a document
 *
 * @param {Node} fromNode DOM node to start selection in
 * @param {Number} startOffset
 * @param {Node} toNode DOM node to end selection in
 * @param {Number} endOffset
 */
function setSelection(fromNode, startOffset, toNode, endOffset) {
    var doc = fromNode.ownerDocument;
    if (! doc) return logger('setCaretPosition: element has no document');
    var backward = _getDirection(fromNode, startOffset, toNode, endOffset) == -1;
    var range = doc.createRange();
    var container, originalContentEditable;
    // does not work in non contentEditable items

    var win = getNodeWindow(fromNode)
        , sel = win.getSelection();


    if (backward){
        range.setStart(toNode, endOffset);
        range.setEnd(fromNode, startOffset);
        range.collapse(false);
    }
    else {
        range.setStart(fromNode, startOffset);
        range.setEnd(toNode, endOffset);
    }

    container = range.commonAncestorContainer == Node.ELEMENT_NODE ?
        range.commonAncestorContainer :
        range.commonAncestorContainer.parentElement;

    if (!container.isContentEditable){
        originalContentEditable = container.contentEditable; // false or inherit
        container.contentEditable = "true";
    }

    sel.removeAllRanges();
    sel.addRange(range);

    if (backward){
        sel.extend(toNode, endOffset);
    }

    if (originalContentEditable){
        // restoring contentEditable
        container.contentEditable = originalContentEditable;
    }
}

/**
 * Clears selection in a given window
 * @param {Window} win
 */
function clearSelection(win) {
    win = win || window;
    var sel = win.getSelection();
    sel.removeAllRanges();
}


/**
 * Calculates an element's total top and left offset from the document edge.
 *
 * @param {Element} el the element for which position needs to be returned
 * @param {includeBorder} if is to include the border width
 * @return {Object} vector object with properties topOffset and leftOffset
 */
function getElementOffset(el, includeBorder) {
    var yPos, xPos;

    yPos = el.offsetTop;
    xPos = el.offsetLeft;
    el = el.offsetParent;

    while (el) {
        yPos += el.offsetTop + getBorder(el, 'Height', includeBorder);
        xPos += el.offsetLeft + getBorder(el, 'Width', includeBorder);
        el = el.offsetParent;
    }

    return { topOffset: yPos, leftOffset: xPos };
}


function getBorder(el, type, includeBorder) {
    if (includeBorder) {
        var side = (type == 'Height') ? 'top' : 'left',
            styles = window.getComputedStyle(el),
            sideValue = parseInt(styles.getPropertyValue('border-' + side + '-width'), 10);

        if (sideValue) return sideValue;
    }
    return 0;
}


/**
 * Removes element from the document
 *
 * @param {Element} el the element to be removed
 */
function removeElement(el) {
    var parent = el.parentNode;
    if (parent){
        parent.removeChild(el);
        parent.normalize();
    }
}


/**
 * Returns the first child text node of an element
 *
 * @param {Element|Node} node the node to be searched, if the node is text node we return the node.
 * @return {TextNode}
 */
function firstTextNode(node) {
    if (node.nodeType == Node.TEXT_NODE) return node;
    var treeWalker = createTreeWalker(node, NodeFilter.SHOW_TEXT);
    return treeWalker.firstChild();
}


/**
 * Returns the last child text node of an element
 *
 * @param {Element|Node} node the node to be searched, if the node is text node we return the node.
 * @return {TextNode}
 */
function lastTextNode(node) {
    if (node.nodeType == Node.TEXT_NODE) return node;
    var treeWalker = createTreeWalker(node, NodeFilter.SHOW_TEXT);
    return treeWalker.lastChild();
}


/**
 * Removes element from the document putting its children in its place
 *
 * @param {Element} el the element to be "unwrapped"
 */
function unwrapElement(el) {
    var parent = el.parentNode;

    if (parent) {
        var frag = document.createDocumentFragment();
        // must be copied to avoid iterating a mutating list of childNodes
        var children = _.slice(el.childNodes);
        children.forEach(frag.appendChild, frag);
        parent.replaceChild(frag, el);
        parent.normalize();
    }
}


/**
 * Wraps an element in another element
 *
 * @param  {Element} wrapIntoEl
 * @param  {Element} el
 */
function wrapInElement(wrapIntoEl, el) {
    var parent = el.parentNode;

    if (parent) {
        parent.insertBefore(wrapIntoEl, el);
        wrapIntoEl.appendChild(el);
    }
}


/**
 * Trims a text node of trailing spaces, and returns true if a trim was performed.
 *
 * @param  {TextNode} node
 * @return {Boolean}
 */
function trimNodeRight(node) {
    return _trimNode(node, 'trimRight');
}


/**
 * Trims a text node of leading spaces, and returns true if a trim was performed.
 *
 * @param  {TextNode} node
 * @return {Boolean}
 */
function trimNodeLeft(node) {
    return _trimNode(node, 'trimLeft');
}


function _trimNode(node, methodName) {
    var len = node.length;
    node.textContent = node.textContent[methodName]();
    return len !== node.length;
}


/**
 * Removes the reference to component from element
 *
 * @param  {Element} el
 */
function detachComponent(el) {
    delete el[config.componentRef];
}


/**
 * Retrieves the content of a html string
 * @param  {String} str Any string
 * @return {String} returns the string cleaned of any html content.
 */
function stripHtml(str) {
    var div = document.createElement('DIV');
    div.innerHTML = str;
    return div.textContent || '';
}


/**
 * Convenience wrapper for native TreeWalker that automatically walks the tree and calls an iterator function.
 * This will not iterate the root element.
 * @param  {HTMLElement} root The containing root element to be walked. Will not be iterated.
 * @param  {NodeFiler} filter A NodeFilter constant, see https://developer.mozilla.org/en/docs/Web/API/TreeWalker
 * @param  {Function} iterator A function to be called on each node. Returning 'false' will break.
 * @param  {Object} context An optional context to passed, defaults to root.
 */
function walkTree(root, filter, iterator, context) {
    var tw = document.createTreeWalker(root, filter);
    while(tw.nextNode()) {
        var result = iterator.call(context || root, tw.currentNode);
        if (result === false) break;
    }
}


/**
 * Returns array of child indexes of element path inside root element in DOM tree using breadth first tree traversal.
 * Returns undefined if the element is not inside root element, 0 if the root element itself is passed.
 *
 * @param  {Element} rootEl element to search
 * @param  {Element} el element to find the index of
 * @return {Array[Number]}
 */
function treePathOf(rootEl, el) {
    if (! (rootEl && rootEl.contains(el))) return;

    var treePath = []
        , node = rootEl;

    while (node != el) {
        var nodeIndex = _.findIndex(node.childNodes, containsEl);
        treePath.push(nodeIndex);
        node = node.childNodes[nodeIndex];
    }

    return treePath;

    function containsEl(child) {
        return child.contains(el);
    }
}


/**
 * Returns element at given tree path
 *
 * @param {Element} rootEl
 * @param {Array[Number]} treePath
 * @param {Boolean} nearest return nearest possible node if exact node does not exist
 * @return {Node}
 */
function getNodeAtTreePath(rootEl, treePath, nearest) {
    if (!treePath) return;

    var len = treePath.length;
    if (len === 0) return rootEl;

    var node = rootEl;

    for (var i = 0; i < len; i++) {
        var children = node.childNodes;
        if (! children) {
            if (! nearest) node = undefined;
            break;
        }
        var childIndex = treePath[i]
            , child = children[childIndex];
        if (! child) {
            node = nearest
                    ? children[children.length - 1]
                    : undefined;
            break;
        }
        node = child;
    }

    return node;
}


/**
 * Inserts an element inside root at a given path in tree (that has the same meaning as the index returned by `treePathOf` function). If element is already in the root's tree, it will be removed first and then moved to the passed treeIndex
 * Insertion at index 0 is not possible and will return undefined as it would mean replacing the root element.
 *
 * @param {Element} rootEl element into which to insert
 * @param {Number} treeIndex index in DOM tree inside root element (see treePathOf)
 * @param {Element} el element to be inserted
 * @return {Boolean} true if was successfully inserted
 */
function insertAtTreePath(rootEl, treePath, el, nearest) {
    var toNormalize = el.nodeType == Node.TEXT_NODE;
    if (rootEl.contains(el))
        removeElement(el); // can't use removeChild as rootEl here is not an immediate parent

    if (treePath.length == 0) return;

    var parent = getNodeAtTreePath(rootEl, treePath.slice(0, -1), nearest)
        , children = parent.childNodes;

    if (! children) {
        if (nearest) {
            parent = parent.parentNode;
            children = parent.childNodes;
        } else return;
    }

    var childIndex = treePath[treePath.length - 1]
        , child = children[childIndex];

    if (child) {
        parent.insertBefore(el, child);
        if (toNormalize) parent.normalize();
        return true;
    } else if (children.length === 0 && (childIndex === 0 || nearest)) {
        parent.appendChild(el);
        if (toNormalize) parent.normalize();
        return true;
    } else {
        child = children[childIndex - 1];
        if (child || nearest) {
            parent.appendChild(el);
            if (toNormalize) parent.normalize();
            return true;
        }
    }
}


/**
 * Returns `true` if the first tree path points to a node which is before the other in the document order.
 * @param  {Array}  path1   A treepath array
 * @param  {Array}  path2   A treepath array
 * @return {Boolean}
 */
function isTreePathBefore(path1, path2) {
    var i = 0
        , isBefore;
    if (!Array.isArray(path1) && Array.isArray(path2))
        return logger.error('isTreePathBefore: One or both paths are not valid treepath arrays.');

    for (i; i < path1.length; i++) {
        if (path1[i] < path2[i]) {
            isBefore = true;
            break;
        } else if (path1[i] > path2[i]) {
            isBefore = false;
            break;
        }
    }

    if (typeof isBefore == 'undefined')
        if (path1.length < path2.length)
            logger.warn('isTreePathBefore: One node is inside another');

    return isBefore || false;
}


/**
 * Converts non latin characters to HTML entity codes.
 * @param  {String} str the string to convert
 * @return {String}     the string with html entities
 */
function htmlEntities(str) {
    return str.replace(/[\u00A0-\u99999<>\&]/gim, function(i) {
        return '&#'+i.charCodeAt(0)+';';
    });
}


function createTreeWalker(el, whatToShow) {
    whatToShow = whatToShow || (NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    return document.createTreeWalker(el, whatToShow);
}


/**
 * Returns the reference to the window the node is in
 *
 * @param {Node} node
 * @return {Window}
 */
function getNodeWindow(node) {
    var doc = node.ownerDocument;
    return doc && (doc.defaultView || doc.parentWindow);
}



/**
 * do something for each nodes contained in a range
 *
 * @param {range} a range
 * @param {cb} a function taking a node as argument

 */
function forEachNodesInRange(range, cb){
    var rangeContainer = range.commonAncestorContainer
        , doc = rangeContainer.ownerDocument;

    function isNodeInsideRange(node){
        var nodeRange = document.createRange();
        var isInside = false;
        nodeRange.selectNode(node);

        if (nodeRange.compareBoundaryPoints(window.Range.START_TO_START, range) != -1
            && nodeRange.compareBoundaryPoints(window.Range.END_TO_END, range) != 1){
            isInside = true;
        }
        nodeRange.detach();
        return isInside;
    }

    var treeWalker = doc.createTreeWalker(rangeContainer,
            NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);

    var currentNode;
    while (currentNode = treeWalker.nextNode()){ // should be assignment
        if (isNodeInsideRange(currentNode)){
            cb(currentNode);
        }
    }
}

/**
 * get all components contained in a range
 *
 * @param {range} a DOM range.
 */
function getComponentsFromRange(range) {
    var win = getNodeWindow(range.startContainer)
        , Component = win.milo.Component;

    var components = [];
    forEachNodesInRange(range, function (node){
        if (node.nodeType != Node.TEXT_NODE) {
            var comp = Component.getComponent(node);
            if (comp)
                components.push(comp);
        }
    });

    return components;
}

/**
 * delete a range
 *
 * @param {range} delete a DOM range and all the components inside
 */
function deleteRangeWithComponents(range) {
    var components = getComponentsFromRange(range);

    components.forEach(function(comp) {
        comp.destroy(true);
    });

    range.deleteContents();
}

/**
 * check if two ranges are equivalent
 *
 * @param {range} range1
 * @param {range} range2
 * @return {Boolean} are the two ranges equivalent
 */
function areRangesEqual(range1, range2){
    return range1.compareBoundaryPoints(window.Range.START_TO_START, range2) == 0 && range1.compareBoundaryPoints(window.Range.END_TO_END, range2) == 0;
}


/**
 * Adds a single pixel div to the body at a given x and y position. Useful for debugging position specific code.
 * @param {Number} x
 * @param {Number} y
 */
function addDebugPoint(x, y) {
    var dbEl = document.createElement('div');
    dbEl.setAttribute('style', 'width: 1px; height: 1px; position:fixed; left:'+x+'px; top:'+y+'px; background-color:red; z-index: 100');
    setTimeout(function() {document.body.appendChild(dbEl);}, 200);
}
