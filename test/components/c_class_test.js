'use strict';

/* eslint-env browser, commonjs, node, mocha */

var Component = require('../../lib/components/c_class')
    , FacetedObject = require('../../lib/abstract/faceted_object')
    , Messenger = require('milo-core').Messenger
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

    it('should be able to be created without facet config', function() {
        assert(Component.createComponentClass('MyComponent') != null);
        assert(Component.createComponentClass('MyComponent', {}) != null);
    });

    it('removes event listeners on destroy', function(done) {
        const comp = new MyComponent(null, null, null, { destroy: () => {} });
        comp.on('event', () => { throw new Error(''); });
        comp.destroy();
        comp.postMessage('event');

        // Wait for the event to be emitted
        setTimeout(done, 4);
    });

    it('prevents calling event listeners on disposed elements', function(done) {
        const comp = new MyComponent(null, null, null, { destroy: () => {} });
        comp.on('event', () => { throw new Error(''); });
        comp.postMessage('event');
        // broadcast is asynchronous, if the component is destroyed in the mean time, it shouldn't throw
        comp.destroy();

        // Wait for the event to be emitted
        setTimeout(done, 4);
    });
});
