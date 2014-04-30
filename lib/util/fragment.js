'use strict';


var Component = require('../components/c_class')
    , BindAttribute = require('../attributes/a_bind')
    , binder = require('../binder')
    , domUtils = require('./dom')
    , logger = require('./logger')
    , check = require('./check')
    , _ = require('mol-proto');


var createRangePaths = _createNodesAndPathsFunc(domUtils.treePathOf);
var createRangeNodes = _createNodesAndPathsFunc(domUtils.getNodeAtTreePath);


var fragmentUtils = module.exports = {
    getState: fragment_getState,
    getStateAsync: fragment_getStateAsync,

    expandRangeToSiblings: expandRangeToSiblings,
    getRangeSiblings: getRangeSiblings,
    createRangeFromSiblings: createRangeFromSiblings,
    createRangePaths: createRangePaths,
    createRangeNodes: createRangeNodes,
    createRangeFromNodes: createRangeFromNodes
};



/**
 * Creates an object with the state of wrapped range with components, including partially selected. The range will be cloned and wrapped in component with container facet before getting its state.
 * This function will log error and return undefined if range has no common ancestor that has component with container facet
 * 
 * @param {Range} range DOM Range instance
 * @param {Boolean} renameChildren optional parameter, `true` to rename fragment child components
 * @param {String} wrapperClassName optional parameter to wrap in a custom component class
 * @return {Object}
 */
function fragment_getState(range, renameChildren, wrapperClassName) {
    var rangeContainer = _getRangeContainer(range);
    if (! rangeContainer) {
        logger.error('fragment.getState: range has no common container');
        return;
    }

    var frag = range.cloneContents()
        , wrapper = _wrapFragmentInContainer(frag, wrapperClassName);

    _transferStates(rangeContainer, wrapper);
    if (renameChildren) _renameChildren(wrapper);
    var wrapperState = wrapper.getState();
    _.deferMethod(wrapper, 'destroy');
    return wrapperState;
}


/**
 * Creates an object with the state of wrapped range with components, including partially selected. The range will be cloned and wrapped in component with container facet before getting its state.
 * This function will return result and any error via callback.
 * 
 * @param {Range} range DOM Range instance
 * @param {Boolean} renameChildren optional parameter, `true` to rename fragment child components
 * @param {Function} callback always the last parameter, optional parameters can be dropped; result is passed via callback with any error as first parameter
 */
function fragment_getStateAsync(range, renameChildren, callback) {
    try {
        var rangeContainer = _getRangeContainer(range);
        if (! rangeContainer) {
            callback(new Error('fragment.getState: range has no common container'));
            return; // do NOT connect return to previous callback, getState should return undefined
        }

        if (typeof renameChildren == 'function') {
            callback = renameChildren;
            renameChildren = false;
        }

        var frag = range.cloneContents()
            , wrapper = _wrapFragmentInContainer(frag);

        _transferStates(rangeContainer, wrapper);
        _.defer(function() {
            wrapper.broadcast('stateready');
            _.defer(function() {
                if (renameChildren) _renameChildren(wrapper);
                var wrapperState = wrapper.getState();
                wrapper.destroy();
                callback(null, wrapperState);
            });
        });
    } catch (err) {
        callback(err);
    }
}


function _wrapFragmentInContainer(frag, wrapperClassName) {
    var wrapEl = document.createElement('div')
        , attr = new BindAttribute(wrapEl);

    _.extend(attr, {
        compClass: wrapperClassName || 'Component',
        compFacets: wrapperClassName ? [] : ['container'],
        compName: 'wrapper'
    });

    attr.decorate();

    wrapEl.appendChild(frag);
    var scope = binder(wrapEl);
    return scope.wrapper;
}


function _getRangeContainer(range) {
    var el = domUtils.containingElement(range.commonAncestorContainer);
    return Component.getContainingComponent(el, true, 'container');
}


function _transferStates(fromComp, toComp) {
    var fromScope = fromComp.container.scope;
    toComp.container.scope._each(function(toChildComp, name) {
        var fromChildComp = fromScope[name];
        if (! fromChildComp) return logger.error('fragment.getState: conponent', name, 'not found in range');
        var state = fromChildComp._getState(true);
        toChildComp.setState(state);
    });
}


function _renameChildren(comp) {
    comp.container.scope._each(function(child) {
        child.rename();
    });
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


