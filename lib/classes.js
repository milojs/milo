'use strict';

// <a name="classes"></a>
// milo.classes
// -----------

// This module contains foundation classes and class registries.

var classes = {
	Facet: require('./abstract/facet'),
	FacetedObject: require('./abstract/faceted_object'),
	ClassRegistry: require('./abstract/registry'),
	Mixin: require('./abstract/Mixin'),
	MessageSource: require('./messenger/m_source'),
	MessengerAPI: require('./messenger/m_api')
};

module.exports = classes;
