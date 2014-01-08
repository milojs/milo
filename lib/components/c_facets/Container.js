// <a name="components-facets-container"></a>
// ###container facet

'use strict';

var ComponentFacet = require('../c_facet')
	, miloBinder = require('../../binder')
	, _ = require('mol-proto')
	, facetsRegistry = require('./cf_registry');

// container facet
var Container = _.createSubclass(ComponentFacet, 'Container');

_.extendProto(Container, {
	binder: Container$binder
});

facetsRegistry.add(Container);

module.exports = Container;


function addChildComponents(childComponents) {
	// TODO
	// this function should intelligently re-bind existing components to
	// new elements (if they changed) and re-bind previously bound events to the same
	// event handlers
	// or maybe not, if this function is only used by binder to add new elements...
	_.extend(this.scope, childComponents);
}


/**
 * Component instance method.
 * Binds scope children of component element.
 */
function Container$binder() {
	return miloBinder(this.owner.el, this.scope, false);
}
