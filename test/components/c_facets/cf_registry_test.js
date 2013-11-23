'use strict';

var facetsRegistry = require('../../../lib/components/c_facets/cf_registry')
	, ComponentFacet = require('../../../lib/components/c_facet')
	, testRegistry = require('../../utils/test_registry');;

describe('registry of components', function() {
	testRegistry(facetsRegistry, ComponentFacet);
});
