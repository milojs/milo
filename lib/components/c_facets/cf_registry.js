'use strict';

var ClassRegistry = require('../../registry')
	, Facet = require('../../facets/f_class');

var facetsRegistry = new ClassRegistry(Facet);

facetsRegistry.add(Facet);

module.exports = facetsRegistry;

// TODO - refactor components registry test into a function
// that tests a registry with a given foundation class
// Make test for this registry based on this function