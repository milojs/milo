'use strict';

var Facet = require('../../lib/abstract/facet')
    , assert = require('assert')
    , _ = require('milo-core').proto;

describe('Facet class', function() {
    it('should initialize Facet objects', function() {
        var self = {}
        var aFacet = new Facet(self, { prop: 1 });

        assert.deepEqual(aFacet.owner, self, 'first parameter should be copied to .owner');
        assert.deepEqual(aFacet.config, { prop: 1 }, 'second parameter should be copied to .config');
    });


    it('should call init methods of Facet subclasses', function() {
        var MyFacet = _.createSubclass(Facet, 'MyFacet');
        
        assert(MyFacet.prototype instanceof Facet, 'MyFacet is subclass of Facet');

        _.extendProto(MyFacet, {
            init: function() { 
                this.initCalled = true;
            }
        });

        var self = {}
            , aFacet = new MyFacet;

        assert.equal(aFacet.initCalled, true, 'init function should be called');
    });
});
