'use strict';

/* eslint-env browser, commonjs, node, mocha */

var OptionsAttribute = require('../../lib/attributes/a_options')
    , assert = require('assert')
    , config = require('../../lib/config');


describe('OptionsAttribute class', function() {
    before(function() {
        config({ check: true });
    });

    after(function() {
        config({ check: false });
    });

    it('should have parse and render methods', function() {
        var elMock = {
            attributes: {
                'ml-options': {}
            }
        };

        var attr = new OptionsAttribute(elMock);
        elMock.getAttribute = function(name) { return 'foo=bar&yo=test%20it'; }
        elMock.setAttribute = function(name, value) { elMock.attributes[name] = value; }

        attr.parse();
        assert.deepEqual(attr.options, { foo: 'bar', yo: 'test it' }, 'options should be defined');

        attr.options.foo = 'barbar';
        attr.decorate();
        assert.equal(elMock.attributes['ml-options'], 'foo=barbar&yo=test%20it');

        elMock.getAttribute = function(name) { return null; }
        delete elMock.attributes['ml-options'];
        var attr2 = new OptionsAttribute(elMock);
        attr2.parse();
        assert(typeof attr2.options == 'undefined', 'should be no options object');
    });
});
