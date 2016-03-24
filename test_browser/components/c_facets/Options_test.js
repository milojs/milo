'use strict';

var assert = require('assert');
var HTML = '<div ml-bind="OptionsComponent:comp" ml-options="foo=bar&test=test321"></div>';

describe.only('Options facet', function() {
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

    var scope;
    var component;

    beforeEach(function() {
        var element = document.createElement('div');
        element.innerHTML = HTML;

        // Bind the element
        scope = milo.binder(element);
        component = scope.comp;
    });

    it('options attr values should extend component definition values', function() {
        assert.deepEqual(component.options.m.get(), { test: 'test321', foo: 'bar' });
    });
});
