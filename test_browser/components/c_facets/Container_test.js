'use strict';


var assert = require('assert')
    , Component = milo.Component;

describe('Container', function() {
    it('should have path method', function() {
        var innerHTML = '<div ml-bind="[container]:child"><div ml-bind=":subchild" data="this is it"></div></div>'
        var comp = milo.Component.createOnElement(undefined, innerHTML, undefined, ['container']);
        var subchild = comp.container.path('.child.subchild');
        assert(subchild instanceof Component);
        assert.equal(subchild.el.getAttribute('data'), 'this is it');

        var noSuchChild = comp.container.path('.child.another');
        assert.equal(noSuchChild, undefined);

        var noSuchChild = comp.container.path('.child.subchild.deeper');
        assert.equal(noSuchChild, undefined);
    });
});