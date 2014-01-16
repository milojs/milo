'use strict';


var ComponentFacet = require('../c_facet')
	, miloBinder = require('../../binder')
	, _ = require('mol-proto')
	, facetsRegistry = require('./cf_registry')
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
	binder: Container$binder,
	getState: Container$getState,
	setState: Container$setState
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
 * Container instance method
 * Called by `Component.prototype.getState` to get facet's state
 * Returns the state of components in the scope
 *
 * @return {Object}
 */
function Container$getState() {
	var state = { scope: {} };
	this.scope._each(function(component, compName) {
		state.scope[compName] = component.getState();
	})
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
			logger.warn('component does not exist on scope');
	}, this);
}

