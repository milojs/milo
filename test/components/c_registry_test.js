'use strict';

var componentsRegistry = require('../../lib/components/c_registry')
	, Component = require('../../lib/components/c_class')
	, Facet = require('../../lib/facets/f_class')
	, assert = require('assert')
	, _ = require('proto')
	, testRegistry = require('../utils/test_registry');;

describe('registry of components', function() {
	testRegistry(componentsRegistry, Component);
});
