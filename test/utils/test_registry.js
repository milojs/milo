'use strict';

/* eslint-env browser, commonjs, node, mocha */

var ClassRegistry = require('../../lib/abstract/registry')
    , assert = require('assert')
    , _ = require('milo-core').proto;

module.exports = testRegistry;

function testRegistry(registry, FoundationClass) {
    it('should be a ClassRegistry instance', function() {
        assert(registry instanceof ClassRegistry);
    });

    it('should have foundation class (' + registry.name + ') set and registered', function() {
        assert.equal(registry.FoundationClass, FoundationClass);
        assert.equal(registry.get(FoundationClass.name), FoundationClass);
    });

    if(FoundationClass != Object)
        it('should NOT allow registering classes that are not subclasses of ' + FoundationClass.name, function() {
            function MyClassQR2MRSMIEulp() {};

            assert.throws(function() {
                registry.add(MyClassQR2MRSMIEulp);
            });

            assert.equal(registry.get('MyClassQR2MRSMIEulp'), undefined);
        });

    it('should NOT allow registering another class under the same name', function() {
        var MyClass = _.createSubclass(FoundationClass, 'MyClass')
            , MyClass2 = _.createSubclass(FoundationClass, 'MyClass2');

        registry.add(MyClass, 'MyClass');
        
        assert.throws(function() {
            registry.add(MyClass2, 'MyClass');
        });
    });
}
