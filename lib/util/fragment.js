'use strict';


var Component = require('../components/c_class')
    , BindAttribute = require('../attributes/a_bind')
    , binder = require('../binder')
    , domUtils = require('./dom')
    , logger = require('./logger')
    , check = require('./check')
    , _ = require('mol-proto')


var fragmentUtils = module.exports = {
    getState: fragment_getState
};


/**
 * Creates an object with the state of wrapped range with components, including partially selected. The range will be cloned and wrapped in component with container facet before getting its state.
 * This function will log error and return undefined if range has no common ancestor that has component with container facet
 * 
 * @param {Range} range DOM Range instance
 * @param {Boolean} renameChildren optional parameter, `true` to rename fragment child components
 * @param {Function} callback always the last parameter, optional parameters can be dropped; result is passed via callback with any error as first parameter
 */
function fragment_getState(range, renameChildren, callback) {
    try {
        var rangeContainer = _getRangeContainer(range);
        if (! rangeContainer) {
            callback(new Error('fragment.getState: range has no common container'));
            return; // do NOT connect it to previous callback, getState should return undefined
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
                callback(null, wrapper.getState());
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
        toChildComp.setState(state);
    });
}


function _renameChildren(comp) {
    comp.container.scope._each(function(child) {
        child.rename();
    });
}
