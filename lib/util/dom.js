'use strict';


module.exports = {
    children: children,
	filterNodeListByType: filterNodeListByType,
    containingElement: containingElement,
	selectElementContents: selectElementContents,
	getElementOffset: getElementOffset,
    setCaretPosition: setCaretPosition,
    setSelection: setSelection,
    removeElement: removeElement,
    unwrapElement: unwrapElement
};


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
 * selectElementContents
 * Selects inner contents of DOM element
 * @param {Element} el DOM element
 */
function selectElementContents(el) {
    var range = document.createRange();
    range.selectNodeContents(el);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
}


/**
 * Sets the caret position to the position in the node
 * @param {Node} node DOM node
 * @param {Number} pos caret position
 */
function setCaretPosition(node, pos) {
    var range = document.createRange();
    range.setStart(node, pos);
    var sel = window.getSelection();
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
    var range = document.createRange();
    range.setStart(fromNode, startOffset);
    range.setEnd(toNode, endOffset);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
}


/**
 * Calculates an element's total top and left offset from the document edge.
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
