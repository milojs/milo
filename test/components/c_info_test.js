'use strict';

var ComponentInfo = require('../../lib/components/c_info')
    , BindAttribute = require('../../lib/attributes/a_bind')
    , Component = require('../../lib/components/c_class')
    , componentsRegistry = require('../../lib/components/c_registry')
    , facetsRegistry = require('../../lib/components/c_facets/cf_registry')
    , assert = require('assert');

require('../../lib/components/c_facets/Container');
require('../../lib/components/c_facets/Events');
require('../../lib/components/c_facets/Data');
require('../../lib/components/classes/View');


describe('ComponentInfo', function() {
    var elMock = {
        attributes: {
            'ml-bind': {}
        },
        getAttribute: function(name) { return 'View[Events, Data]:myView'; }
    };
    var scope = {};
    var attr = new BindAttribute(elMock);


    it('should create instance from attribute', function() {
        var info = new ComponentInfo(scope, elMock, attr);

        assert.equal(info.name, 'myView');

        assert(info.ComponentClass.prototype instanceof Component);
        assert.equal(info.ComponentClass, componentsRegistry.get('View'));
        assert.deepEqual(info.extraFacetsClasses, {
            Events: facetsRegistry.get('Events'),
            Data: facetsRegistry.get('Data'),
        });
        assert.deepEqual(info.container, {});
    });
});
