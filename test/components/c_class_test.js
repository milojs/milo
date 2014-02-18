'use strict';

var Component = require('../../lib/components/c_class')
    , ComponentFacet = require('../../lib/components/c_facet')
    , FacetedObject = require('../../lib/abstract/faceted_object')
    , Messenger = require('../../lib/messenger')
    , assert = require('assert');


var MyComponent = Component.createComponentClass('MyComponent', ['ComponentFacet']);

describe('Component class', function() {
    it('should be a subclass of FacetedObject class', function(){
        assert(Component.prototype instanceof FacetedObject);
        assert.equal(Component.name, 'Component');
    });


    it('should define a class method createComponentClass that creates subclasses', function() {
        assert(MyComponent.prototype instanceof Component, 'should create subclass of Component');
        var aComp = new MyComponent;

        assert(aComp instanceof MyComponent, '');
    });


    it('should have messengerMixin', function() {
        var aComp = new MyComponent;

        assert(aComp._messenger instanceof Messenger);
    });


    it.skip('should define "create" class method that creates Component from ComponentInfo', function() {

    });
});