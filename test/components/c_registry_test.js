'use strict';

var componentsRegistry = require('../../lib/components/c_registry')
	, Component = require('../../lib/components/c_class')
	, testRegistry = require('../utils/test_registry');;

describe('registry of components', function() {
	testRegistry(componentsRegistry, Component);
});
