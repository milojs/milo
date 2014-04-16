'use strict';


var ComponentFacet = require('../c_facet')
    , miloBinder = require('../../binder')
    , Scope = require('../scope')
    , _ = require('mol-proto')
    , facetsRegistry = require('./cf_registry')
    , domUtils = require('../../util/dom')
    , logger = require('../../util/logger');


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
    getState: Container$getState,
    setState: Container$setState,
    binder: Container$binder,
    destroy: Container$destroy,
    unwrap: Container$unwrap
});

facetsRegistry.add(Container);

module.exports = Container;


/**
 * Component instance method.
 * Scans DOM, creates components and adds to scope children of component element.
 */
function Container$binder() {
    return miloBinder(this.owner.el, this.scope, false);
}


/**
 * Component instance method.
 * Setup empty scope object on start
 */
function Container$start() {
    ComponentFacet.prototype.start.apply(this, arguments);
    this.scope = new Scope(this.owner.el, this);
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
            logger.warn('component "' + compName + '" does not exist on scope', compData);
    }, this);
}

function Container$destroy() {
    ComponentFacet.prototype.destroy.apply(this, arguments);
    this.scope._detachElement();
}


/**
 * Container instance method
 * Moves all of the contents of the owner into the parent scope
 * 
 * @param {Boolean} destroy If true, the component will be destroyed at the end.
 * @param {Boolean} renameChildren pass false to not rename scope children (default is true)
 */
function Container$unwrap(destroy, renameChildren) {
    domUtils.unwrapElement(this.owner.el);
    this.scope && this.scope._each(function (child) {
        child.remove();
        if (renameChildren !== false) child.rename(undefined, false);
        this.owner.scope && this.owner.scope._add(child);
    }, this);
    if (destroy === true) this.owner.destroy();
}
