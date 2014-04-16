'use strict';


var Component = require('../components/c_class')
    , BindAttribute = require('../attributes/a_bind')
    , binder = require('../binder')
    , domUtils = require('./dom')
    , logger = require('./logger')
    , check = require('./check')
    , _ = require('mol-proto')


var fragmentUtils = module.exports = {
    getState: fragment_getState,
    createFromState: fragment_createFromState
};


/**
 * Creates an object with the html and states of all components in the range, including partially selected.
 * This function will log error and return undefined if range has no common ancestor that has component with container facet
 * 
 * @param {Range} range DOM Range instance
 * @param {Function} callback result is passed via callback with any error as first parameter
 */
function fragment_getState(range, callback) {
    try {
        var rangeContainer = _getRangeContainer(range);
        if (! rangeContainer) {
            callback(new Error('fragment.getState: range has no common container'));
            return; // do NOT connect it to previous callback, getState should return undefined
        }

        var frag = range.cloneContents()
            , wrapper = _wrapFragmentInContainer(frag);

        _transferStates(rangeContainer, wrapper);
        _.defer(function() {
            wrapper.broadcast('stateready');
            _.defer(function() {
                _renameChildren(wrapper);
                var state = {
                    innerHTML: wrapper.el.innerHTML,
                    containerState: wrapper.container.getState(true)
                };
                callback(null, state);
            });
        });
    } catch (err) {
        callback(err);
    }
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
    return Component.getContainingComponent(el, true, 'container');
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
 * 
 * @param {Object} state state of the fragment, together with components states
 * @param {Boolean} returnWrapper optional true to return a wrapper component rather than the DocumentFragment
 * @return {Component|DocumentFragment}
 */
function fragment_createFromState(state, returnWrapper, callback) {
    if (typeof returnWrapper == 'function') {
        callback = returnWrapper;
        returnWrapper = false;
    }

    check(state, {
        innerHTML: String,
        containerState: Object
    });

    try {
        var wrapper = Component.createOnElement(undefined, state.innerHTML, undefined, ['container']);

        wrapper.container.setState(state.containerState);
        _.defer(function() {
            wrapper.broadcast('stateready');
            _.defer(function() {
                if (returnWrapper) return callback(null, wrapper);

                var frag = document.createDocumentFragment();
                domUtils.children(wrapper.el).forEach(function(childEl) {
                    frag.appendChild(childEl);
                });

                callback(null, frag);
            });
        });
    } catch(err) {
        callback(err);
    }
}
