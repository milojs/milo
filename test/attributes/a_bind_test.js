'use strict';

var BindAttribute = require('../../lib/attributes/a_bind')
    , assert = require('assert');


describe('BindAttribute class', function() {
    it('should have parse and validate methods', function() {
        var elMock = {
            attributes: {
                'ml-bind': {}
            }
        };

        var attr = new BindAttribute(elMock, 'ml-bind');
        elMock.getAttribute = function(name) { return ''; }

            assert.throws(attr.parse.bind(attr), 
                'attribute ' + attr.name + ' can\'t be empty');
            assert.equal(attr.compClass, undefined, 'comp class should be undefined');
            assert.equal(attr.compFacets, undefined, 'comp facets should be undefined');
            assert.equal(attr.compName, undefined, 'comp name should be undefined');
            assert.throws(attr.validate.bind(attr),
                'attribute ' + attr.name + ' can\'t be empty');

        attr = new BindAttribute(elMock, 'ml-bind');
        elMock.getAttribute = function(name) { return ':myButton'; }

            attr.parse();
            assert.equal(attr.compClass, 'Component', 'comp class and name should be parsed correctly');
            assert.equal(attr.compName, 'myButton', 'comp class and name should be parsed correctly');
            assert.doesNotThrow(attr.validate.bind(attr),
                'attribute ' + attr.name + ' may contain only component name');

        attr = new BindAttribute(elMock, 'ml-bind');
        elMock.getAttribute = function(name) { return 'Button:myButton'; }

            attr.parse();
            assert.equal(attr.compClass, 'Button', 'comp class and name should be parsed correctly');
            assert.equal(attr.compName, 'myButton', 'comp class and name should be parsed correctly');
            assert.doesNotThrow(attr.validate.bind(attr),
                'attribute ' + attr.name + ' may contain component class and name separated with :');

        attr = new BindAttribute(elMock, 'ml-bind');
        elMock.getAttribute = function(name) { return 'Button:myButton:shmuck'; }

            assert.throws(attr.parse.bind(attr), 
                'attribute ' + attr.name + ' can\'t contain more than 2 elements');

            assert.equal(attr.compClass, undefined, 'comp class and name should be undefined');
            assert.equal(attr.compName, undefined, 'comp class and name should be undefined');
            assert.throws(attr.validate.bind(attr),
                'attribute ' + attr.name + ' can\'t contain more than 2 elements');

        attr = new BindAttribute(elMock, 'ml-bind');
        elMock.getAttribute = function(name) { return 'Button:'; }

            attr.parse();
            assert.equal(attr.compClass, 'Button', 'comp class should be Button');
            assert.equal(attr.compName, undefined, 'comp name should be undefined');
            assert.throws(attr.validate.bind(attr),
                'attribute ' + attr.name + ' can\'t contain empty name');

        attr = new BindAttribute(elMock, 'ml-bind');
        elMock.getAttribute = function(name) { return 'myButton'; }

            attr.parse();
            assert.equal(attr.compClass, 'myButton', 'comp class should be myButton');
            assert.equal(attr.compName, undefined, 'comp name should be undefined');
            assert.throws(attr.validate.bind(attr),
                'attribute ' + attr.name + ' can\'t contain empty name');

        attr = new BindAttribute(elMock, 'ml-bind');
        elMock.getAttribute = function(name) { return 'View[Events, Data]:myView'; }

            attr.parse();
            assert.equal(attr.compClass, 'View', 'comp class should be View');
            assert.deepEqual(attr.compFacets, ['Events', 'Data'], 'comp facets should be parsed');
            assert.equal(attr.compName, 'myView', 'comp name should be myView');
            assert.doesNotThrow(attr.validate.bind(attr),
                'attribute ' + attr.name + ' should contain optional class, optional facets, and name');

        attr = new BindAttribute(elMock, 'ml-bind');
        elMock.getAttribute = function(name) { return '[Events]:myView'; }

            attr.parse();
            assert.equal(attr.compClass, 'Component', 'comp class should be View');
            assert.deepEqual(attr.compFacets, ['Events'], 'comp facets should be parsed');
            assert.equal(attr.compName, 'myView', 'comp name should be myView');
            assert.doesNotThrow(attr.validate.bind(attr),
                'attribute ' + attr.name + ' should contain optional class, optional facets, and name');
    });
});
