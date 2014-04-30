'use strict';


var config = require('../config')
    , _ = require('mol-proto');

var createRangePaths = _createNodesAndPathsFunc(treePathOf);
var createRangeNodes = _createNodesAndPathsFunc(getNodeAtTreePath);

var domUtils = {
    children: children,
    filterNodeListByType: filterNodeListByType,
    containingElement: containingElement,
    selectElementContents: selectElementContents,
    getElementOffset: getElementOffset,
    setCaretPosition: setCaretPosition,
    setSelection: setSelection,
    removeElement: removeElement,
    unwrapElement: unwrapElement,
    wrapInElement: wrapInElement,
    detachComponent: detachComponent,
    firstTextNode: firstTextNode,
    lastTextNode: lastTextNode,
    trimNodeRight: trimNodeRight,
    trimNodeLeft: trimNodeLeft,
    stripHtml: stripHtml,
    walkTree: walkTree,
    createTreeWalker: createTreeWalker,

    treeIndexOf: treeIndexOf, // deprecated
    getNodeAtTreeIndex: getNodeAtTreeIndex, // deprecated
    insertAtTreeIndex: insertAtTreeIndex, // deprecated

    treePathOf: treePathOf,
    getNodeAtTreePath: getNodeAtTreePath,
    insertAtTreePath: insertAtTreePath,
    isTreePathBefore: isTreePathBefore,

    getNodeWindow: getNodeWindow,

    expandRangeToSiblings: expandRangeToSiblings,
    getRangeSiblings: getRangeSiblings,
    createRangeFromSiblings: createRangeFromSiblings,
    createRangePaths: createRangePaths,
    createRangeNodes: createRangeNodes,
    createRangeFromNodes: createRangeFromNodes
};

module.exports = domUtils;


/**
 * Returns the list of element children of DOM element
 *
 * @param {Element} el element to return the children of (only DOM elements)
 * @return {Array[Element]}
 */
 function children(el) {
    return filterNodeListByType(el.childNodes, Node.ELEMENT_NODE)
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
    if (! doc) return logger('selectElementContents: element has no document')
    var range = doc.createRange();
    range.selectNodeContents(el);
    var win = getNodeWindow(el)
        , sel = win.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
}


/**
 * Sets the caret position to the position in the node
 * 
 * @param {Node} node DOM node
 * @param {Number} pos caret position
 */
function setCaretPosition(node, pos) {
    var doc = node.ownerDocument;
    if (! doc) return logger('setCaretPosition: element has no document')
    var range = doc.createRange();
    range.setStart(node, pos);
    var win = getNodeWindow(node)
        , sel = win.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
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
    if (! doc) return logger('setCaretPosition: element has no document')
    var range = doc.createRange();
    range.setStart(fromNode, startOffset);
    range.setEnd(toNode, endOffset);
    var win = getNodeWindow(fromNode)
        , sel = win.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
}


/**
 * Calculates an element's total top and left offset from the document edge.
 * 
 * @param {Element} el the element for which position needs to be returned
 * @return {Object} vector object with properties topOffset and leftOffset
 */
function getElementOffset(el) {
    var yPos, xPos;     

    yPos = el.offsetTop;
    xPos = el.offsetLeft;
    el = el.offsetParent;

    while (el != null) {
        yPos += el.offsetTop;
        xPos += el.offsetLeft;
        el = el.offsetParent;
    }  

    return { topOffset: yPos, leftOffset: xPos };
}


/**
 * Removes element from the document
 *
 * @param {Element} el the element to be removed
 */
function removeElement(el) {
    var parent = el.parentNode;
    if (parent)
        parent.removeChild(el);
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
    var lengthBefore = node.length;
    node.textContent = node.textContent.trimRight();
    var lengthAfter = node.length;

    return lengthBefore !== lengthAfter;
}


/**
 * Trims a text node of leading spaces, and returns true if a trim was performed.
 * 
 * @param  {TextNode} node
 * @return {Boolean}
 */
function trimNodeLeft(node) {
    var lengthBefore = node.length;
    node.textContent = node.textContent.trimLeft();
    var lengthAfter = node.length;

    return lengthBefore !== lengthAfter;
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
 * Returns sequential index of element inside root element in DOM tree as traversed by TreeWalker.
 * Returns -1 if the element is not inside root element, 0 if the root element itself is passed.
 * 
 * @param  {Element} rootEl element to search
 * @param  {Element} el element to find the index of
 * @return {Number}
 */
function treeIndexOf(rootEl, el) {
    if (! (rootEl && rootEl.contains(el))) return -1;
    if (rootEl == el) return 0;

    var treeWalker = createTreeWalker(rootEl);
    treeWalker.currentNode = rootEl;
    var nextNode = treeWalker.nextNode()
        , index = 1;

    while (nextNode && nextNode != el) {
        index++;
        nextNode = treeWalker.nextNode();
    }

    return index;
}


/**
 * Returns element at given tree index
 * 
 * @param {Element} rootEl 
 * @param {Number} treeIndex
 * @return {Node}
 */
function getNodeAtTreeIndex(rootEl, treeIndex) {
    if (treeIndex == 0) return rootEl;
    if (! (treeIndex > 0) || treeIndex == Infinity) return; // not same as "<="

    var treeWalker = createTreeWalker(rootEl);

    var count = treeIndex;
    do {
        var node = treeWalker.nextNode();
    } while (--count && node); // same number of times as treeIndex (if not out of bounds)

    return node;
}


/**
 * Inserts an element inside root at a given index in tree (that has the same meaning as the index returned by `treeIndexOf` function). If element is already in the root's tree, it will be removed first and then moved to the passed treeIndex
 * Insertion at index 0 is not possible and will return undefined as it would mean replacing the root element.
 * 
 * @param {Element} rootEl element into which to insert
 * @param {Number} treeIndex index in DOM tree inside root element (see treeIndexOf)
 * @param {Element} el element to be inserted
 * @return {Boolean} true if was successfully inserted
 */
function insertAtTreeIndex(rootEl, treeIndex, el) {
    if (rootEl.contains(el))
        removeElement(el); // can't use removeChild as rootEl here is not an immediate parent

    if (! (treeIndex > 0)) return; // not same as "<="

    var node = getNodeAtTreeIndex(rootEl, treeIndex)
        , parent = node && node.parentNode || rootEl;
    parent.insertBefore(el, node);
    return true;
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
        var nodeIndex = _.findIndex(node.childNodes, function(child) {
            return child.contains(el);
        });
        treePath.push(nodeIndex);
        node = node.childNodes[nodeIndex];
    }

    return treePath;
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
 * Inserts an element inside root at a given path in tree (that has the same meaning as the index returned by `treeIndexOf` function). If element is already in the root's tree, it will be removed first and then moved to the passed treeIndex
 * Insertion at index 0 is not possible and will return undefined as it would mean replacing the root element.
 * 
 * @param {Element} rootEl element into which to insert
 * @param {Number} treeIndex index in DOM tree inside root element (see treeIndexOf)
 * @param {Element} el element to be inserted
 * @return {Boolean} true if was successfully inserted
 */
function insertAtTreePath(rootEl, treePath, el, nearest) {
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
        return true;    
    } else {
        child = children[childIndex - 1];
        if (child || nearest) {
            parent.appendChild(el);
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


function expandRangeToSiblings(range) {
    var siblings = getRangeSiblings(range);
    var range = createRangeFromSiblings(siblings);
    return range;
}

function createRangeFromSiblings(nodes) {
    var range = document.createRange();
    if (nodes.siblings) {
        range.setStartBefore(nodes.start);
        range.setEndAfter(nodes.end);
    } else
        range.selectNode(nodes.start);
    return range;
}

function getRangeSiblings(range) {
    var containerNode = range.commonAncestorContainer
        , startNode = range.startContainer
        , endNode = range.endContainer;

    if (startNode == endNode) {
        if (startNode != containerNode) logger.error('deleteSelectionCommand logical error: start==end, but container is different');
        return { siblings: false, start: startNode };
    }

    if (startNode == containerNode || endNode == containerNode)
        return { siblings: false, start: containerNode };

    var startSibling = _findContainingChild(containerNode, startNode);
    var endSibling = _findContainingChild(containerNode, endNode);

    if (startSibling && endSibling) {
        if (startSibling == endSibling) {
            logger.error('deleteSelectionCommand logical error: same siblings');
            return { siblings: false, start: startSibling };
        } else
            return { siblings: true, start: startSibling, end: endSibling };
    }
}



function createRangeFromNodes(nodes) {
    var range = document.createRange();
    if (nodes.siblings) {
        range.setStartBefore(nodes.start);
        range.setEndAfter(nodes.end);
    } else
        range.selectNode(nodes.start);
    return range;
}



function _findContainingChild(containerNode, selNode) {
    return _.find(containerNode.childNodes, function(node) {
        return node.contains(selNode);
    });
}




function _createNodesAndPathsFunc(func) {
    return function(rootEl, fromObj) {
        var toObj = {
            siblings: fromObj.siblings,
            start: func(rootEl, fromObj.start)
        };
        if (toObj.siblings)
            toObj.end = func(rootEl, fromObj.end);
        return toObj;
    }
}
