'use strict';

var facetsRegistry = require('../../../lib/components/c_facets/cf_registry')
	, ComponentFacet = require('../../../lib/components/c_facet')
	, testRegistry = require('../../utils/test_registry');;

describe('registry of facets', function() {
	testRegistry(facetsRegistry, ComponentFacet);
});
