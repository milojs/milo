'use strict';

var facetsRegistry = require('../../../lib/components/c_facets/cf_registry')
    , ComponentFacet = require('../../../lib/components/c_facet')
    , testRegistry = require('../../utils/test_registry')
    , config = require('../../../lib/config');

describe('registry of facets', function() {
    before(function() {
        config({ check: true });
    });

    after(function() {
        config({ check: false });
    });

    testRegistry(facetsRegistry, ComponentFacet);
});
