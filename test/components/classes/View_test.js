'use strict';

/* eslint-env browser, commonjs, node, mocha */

var componentsRegistry = require('../../../lib/components/c_registry')
    , facetsRegistry = require('../../../lib/components/c_facets/cf_registry')
    , testComponent = require('../../utils/test_component');

// used facets
require('../../../lib/components/c_facets/Container');

var View = require('../../../lib/components/classes/View')

describe('View class', function(){
    testComponent(componentsRegistry, View, facetsRegistry, ['Container']);
});
