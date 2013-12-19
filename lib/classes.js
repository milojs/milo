// <a name="classes"></a>
// milo.classes
// -----------

// This module contains foundation classes and class registries.

'use strict';

var classes = {
	Facet: require('./facets/f_class'),
	ComponentFacet: require('./components/c_facet'),
	ClassRegistry: require('./abstract/registry'),
	facetsRegistry: require('./components/c_facets/cf_registry'),
	componentsRegistry: require('./components/c_registry'),
};

module.exports = classes;
