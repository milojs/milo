'use strict';


var ComponentFacet = require('../c_facet')
    , miloBinder = require('../../binder')
    , Scope = require('../scope')
    , miloCore = require('milo-core')
    , _ = miloCore.proto
    , logger = miloCore.util.logger
    , facetsRegistry = require('./cf_registry')
    , domUtils = require('../../util/dom');


/**
 * `milo.registry.facets.get('Container')`
 * A special component facet that makes component create its own inner scope.
 * When [milo.binder](../../binder.js.html) binds DOM tree and creates components, if components are inside component WITH Container facet, they are put on the `scope` of it (component.container.scope - see [Scope](../scope.js.html)), otherwise they are put on the same scope even though they may be deeper in DOM tree.
 * It allows creating namespaces avoiding components names conflicts, at the same time creating more shallow components tree than the DOM tree.
 * To create components for elements inside the current component use:
 * ```
 * component.container.binder();
 * ```
 * See [milo.binder](../../binder.js.html)
 */
var Container = _.createSubclass(ComponentFacet, 'Container');


/**
 * ####Container facet instance methods####
 *
 * - [binder](#Container$binder) - create components from DOM inside the current one
 */
_.extendProto(Container, {
    start: Container$start,
    path: Container$path,
    getState: Container$getState,
    setState: Container$setState,
    binder: Container$binder,
    destroy: Container$destroy,
    unwrap: Container$unwrap,

    append: Container$append,
    insertBefore: Container$insertBefore,
    remove: Container$remove
});

facetsRegistry.add(Container);

module.exports = Container;


/**
 * Container instance method.
 * Scans DOM, creates components and adds to scope children of component element.
 */
function Container$binder() {
    return miloBinder(this.owner.el, this.scope, false);
}


/**
 * Container instance method.
 * Setup empty scope object on start
 */
function Container$start() {
    ComponentFacet.prototype.start.apply(this, arguments);
    this.scope = new Scope(this.owner.el, this);
}


var allowedNamePattern = /^[A-Za-z][A-Za-z0-9\_\$]*$/;
/**
 * Container instance method.
 * Safely traverses component scope
 * Returns component in scope for a given path
 * If path is invalid the method will throw, if there is no component at a given path or some of the components along the path does not have Container facet the method will return undefined, 
 * 
 * @param {String} path path of child component in scope, each name should be prefixed with '.', e.g.: '.child.subchild'
 * @return {Component}
 */
function Container$path(path) {
    path = path.split('.');
    var len = path.length;
    if (path[0] || len < 2) throwInvalidPath();
    var comp = this.owner;
    for (var i = 1; i < len; i++) {
        var name = path[i];
        if (!allowedNamePattern.test(name)) throwInvalidPath();
        if (!comp.container) return;
        comp = comp.container.scope[name];
        if (!comp) return;
    }
    return comp;

    function throwInvalidPath() {
        throw new Error('path ' + path + ' is invalid');
    }
}


/**
 * Container instance method
 * Called by `Component.prototype.getState` to get facet's state
 * Returns the state of components in the scope
 *
 * @param {Boolean} deepCopy true by default
 * @return {Object}
 */
function Container$getState(deepCopy) {
    var state = { scope: {} };
    if (deepCopy !== false)
        this.scope._each(function(component, compName) {
            state.scope[compName] = component._getState();
        });
    return state;
}


/**
 * Container instance method
 * Called by `Component.prototype.setState` to set facet's state
 * Sets the state of components in the scope
 *
 * @param {Object} data data to set on facet's model
 */
function Container$setState(state) {
    _.eachKey(state.scope, function(compData, compName) {
        var component = this.scope[compName];
        if (component)
            component.setState(compData);
        else
            logger.warn('component "' + compName + '" does not exist on scope');
    }, this);
}

function Container$destroy() {
    this.scope._each(function(component) {
        component.destroy();
    });
    this.scope._detachElement();
    ComponentFacet.prototype.destroy.apply(this, arguments);
}


/**
 * Container instance method
 * Moves all of the contents of the owner into the parent scope
 * 
 * @param {Boolean} renameChildren pass false to not rename scope children (default is true)
 * @param {Boolean} destroy If not false, the component will be destroyed at the end (default is true).
 */
function Container$unwrap(renameChildren, destroy) {
    domUtils.unwrapElement(this.owner.el);
    this.scope && this.scope._each(function (child) {
        child.remove();
        if (renameChildren !== false) child.rename(undefined, false);
        this.owner.scope && this.owner.scope._add(child);
    }, this);
    if (destroy !== false) this.owner.destroy();
}


/**
 * Container instance method
 * Append component to DOM and to scope
 * @param {Component} comp component that will be appended
 */
function Container$append(comp) {
    this.scope._add(comp);
    this.owner.el.appendChild(comp.el);
}


/**
 * Container instance method
 * Insert component to DOM and to scope before another component
 * @param {Component} comp component that will be inserted
 * @param {Component} sibling component before which component will be appended
 */
function Container$insertBefore(comp, sibling) {
    this.scope._add(comp);
    this.el.insertBefore(comp.el, sibling && sibling.el);
}

function Container$remove(comp) {
    this.scope._remove(comp);
    this.owner.el.removeChild(comp.el);
}
