'use strict';

/* eslint-env browser, commonjs, node, mocha */

var assert = require('assert');
var HTML = '<div ml-bind="OptionsComponent:comp" ml-options="foo=bar&test=test321"></div>'
         + '<div ml-bind="OptionsComponent:comp2"></div>';

var HTML_COERCE = '<div ml-bind="OptionsComponentCoerce:comp" ml-options="bool1=true&bool2=false&num=34&float1=34.5&float2=0.034&addr=32 green st"></div>';

describe('Options facet', function() {
    milo.config.check = true; // Enable 'check' library so that inputs to the Css facet are validated

    milo.createComponentClass({
        className: 'OptionsComponent',
        facets: {
            options: {
                options: {
                    'test': 'test123'
                }
            }
        }
    });

    milo.createComponentClass({
        className: 'OptionsComponentCoerce',
        facets: {
            options: {
                coerceTypes: true
            }
        }
    });

    it('options attr values should extend component definition values', function() {
        var element = document.createElement('div');
        element.innerHTML = HTML;

        // Bind the element
        var scope = milo.binder(element);
        var component = scope.comp;
        var component2 = scope.comp2;

        assert.deepEqual(component.options.m.get(), { test: 'test321', foo: 'bar' });
        assert.deepEqual(component2.options.m.get(), { test: 'test123' });
    });

    it('coerce types config should make implicit type coersions', function() {
        var element = document.createElement('div');
        element.innerHTML = HTML_COERCE;

        // Bind the element
        var scope = milo.binder(element);
        var component = scope.comp;

        assert.deepEqual(component.options.m.get(), {
            bool1: true,
            bool2: false,
            num: 34,
            float1: 34.5,
            float2: 0.034,
            addr: '32 green st'
        });
    });


});
