'use strict';

var config = require('../config')
    , miloCore = require('milo-core')
    , check = miloCore.util.check
    , Match = check.Match
    , _ = miloCore.proto;


var componentUtils = module.exports = {
    isComponent: isComponent,
    getComponent: getComponent,
    getContainingComponent: getContainingComponent,
    _makeComponentConditionFunc: _makeComponentConditionFunc
};


/**
 * isComponent
 *
 * Checks if element has a component attached to it by
 * checking the presence of property difined in milo.config
 *
 * @param {Element} el DOM element
 * @return {Boolean} true, if it has milo component attached to it
 */
function isComponent(el) {
    return el.hasOwnProperty(config.componentRef);
}


/**
 * getComponent
 *
 * @param {Element} el DOM element
 * @return {Component} component attached to element
 */
function getComponent(el) {
    return el && el[config.componentRef];
}


/**
 * Returns the closest component which contains the specified element,
 * optionally, only component that passes `condition` test or contains specified facet
 *
 * Unless `returnCurrent` parameter is false, the function will return
 * the current component of the element (true by default).
 *
 * @param {Node} node DOM Element or text Node
 * @param {Boolean} returnCurrent optional boolean value indicating whether the component of the element can be returned. True by default, should be false to return only ancestors.
 * @param {Function|String} conditionOrFacet optional condition that component should pass (or facet name it should contain)
 * @return {Component} 
 */
function getContainingComponent(node, returnCurrent, conditionOrFacet) {
    // check(node, Node); - can't check tiype here as it is most likely coming from another frame
    check(returnCurrent, Match.Optional(Boolean));
    check(conditionOrFacet, Match.Optional(Match.OneOf(Function, String)));

    var conditionFunc = _makeComponentConditionFunc(conditionOrFacet);

    return _getContainingComponent(node, returnCurrent, conditionFunc);
}


function _makeComponentConditionFunc(conditionOrFacet) {
    if (typeof conditionOrFacet == 'function')
        return conditionOrFacet;
    else if (typeof conditionOrFacet == 'string') {
        var facetName = _.firstLowerCase(conditionOrFacet);
        return function (comp) {
           return comp.hasFacet(facetName);
        };
    }
}


function _getContainingComponent(el, returnCurrent, conditionFunc) {
    // Where the current element is a component it should be returned
    // if returnCurrent is true or undefined
    if (returnCurrent !== false) {
        var comp = getComponent(el);
        if (comp && (! conditionFunc || conditionFunc(comp)))
            return comp;
    }

    // Where there is no parent element, this function will return undefined
    // The parent element is checked recursively
    if (el.parentNode)
        return _getContainingComponent(el.parentNode, true, conditionFunc);
}
