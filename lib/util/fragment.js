'use strict';


var Component = require('../components/c_class')
    , BindAttribute = require('../attributes/a_bind')
    , domUtils = require('./dom')
    , logger = require('./logger')
    , check = require('./check')


module.exports = {
    getState: fragment_getState,
    createFromState: fragment_createFromState
};


/**
 * Creates an object with the html and states of all components in the range, including partially selected.
 * This function will log error and return undefined if range has no common ancestor that has component with container facet
 * 
 * @param {Range} range DOM Range instance
 * @param {Bolean} markBalancedNodes should be `true` to mark all elements that were balanced when range was cloned
 * @return {Object}
 */
function fragment_getState(range, markBalancedNodes) {
    var rangeContainer = _getRangeContainer(range);
    if (! rangeContainer) return logger.error('fragment.getState: range has no common container');

    if (markBalancedNodes) range = _insertRangeMarkers(range);
    var frag = range.cloneContents()
        , wrapper = _wrapFragmentInContainer(frag);

    _transferStates(rangeContainer, wrapper);
    _renameChildren(wrapper);
}


function _insertRangeMarkers(range) {

}


function _wrapFragmentInContainer(frag) {
    var wrapEl = document.createElement('div')
        , attr = new BindAttribute(wrapEl);

    _.extend(attr, {
        compClass: 'Component',
        compFacets: ['container'],
        compName: 'wrapper'
    });

    attr.decorate();

    wrapEl.appendChild(frag);
    var scope = binder(wrapEl);
    return scope.wrapper;
}


function _getRangeContainer(range) {
    var el = domUtils.containingElement(range.commonAncestorContainer);
    return getContainingComponent(el, true, 'container');
}


function _transferStates(fromComp, toComp) {
    var fromScope = fromComp.container.scope;
    toComp.container.scope._each(function(toChildComp, name) {
        var fromChildComp = fromScope[name];
        if (! fromChildComp) return logger.error('fragment.getState: conponent', name, 'not found in range');
        var state = fromChildComp._getState(true);
        toChildComp.setState(true);
    });
}


function _renameChildren(comp) {
    comp.container.scope._each(function(child) {
        child.rename();
    });
}


/**
 * Creates DOM fragment from state
 * @param  {Object} state state of the fragment, together with components states
 * @return {DocumentFragment}
 */
function fragment_createFromState(state) {
    check(state, {
        html: String,
        childrenStates: Array
    });
}
