'use strict';

// <a name="classes"></a>
// milo.classes
// -----------

// This module contains foundation classes and class registries.

var classes = {
	Facet: require('./facets/f_class'),
	ComponentFacet: require('./components/c_facet'),
	ClassRegistry: require('./abstract/registry'),
	Mixin: require('./abstract/Mixin'),
	MessageSource: require('./messenger/message_source'),
	MessengerAPI: require('./messenger/m_api')
	// facetsRegistry: require('./components/c_facets/cf_registry'),
	// componentsRegistry: require('./components/c_registry'),
};

module.exports = classes;
