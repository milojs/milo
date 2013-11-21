'use strict';

var ClassRegistry = require('../../registry')
	, Facet = require('../../f_class');

var facetsRegistry = module.exports = new ClassRegistry;

facetsRegistry.setClass(Facet);
facetsRegistry.add(Facet);

// TODO - refactor components registry test into a function
// that tests a registry with a given foundation class
// Make test for this registry based on this function