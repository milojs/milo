'use strict';

var componentsRegistry = require('../../lib/components/c_registry')
    , Component = require('../../lib/components/c_class')
    , testRegistry = require('../utils/test_registry')
    , config = require('../../lib/config');

describe('registry of components', function() {
    before(function() {
        config({ check: true });
    });

    after(function() {
        config({ check: false });
    });

    testRegistry(componentsRegistry, Component);
});
