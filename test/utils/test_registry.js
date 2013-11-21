'use strict';

var ClassRegistry = require('../../lib/registry')
	, assert = require('assert')
	, _ = require('proto');

module.exports = testRegistry;

function testRegistry(registry, FoundationClass) {
	it('should be a ClassRegistry instance', function() {
		assert(registry instanceof ClassRegistry);
	});

	it('should have foundation class (' + registry.name + ') set and registered', function() {
		assert.equal(registry.FoundationClass, FoundationClass);

		// TODO check if it is in the registry
	});

	if(FoundationClass != Object)
		it('should NOT allow registering classes that are not subclasses of ' + FoundationClass.name, function() {
			function MyClassQR2MRSMIEulp() {};

			assert.throws(function() {
				registry.add(MyClassQR2MRSMIEulp);
			});

			assert.equal(registry.get('MyClassQR2MRSMIEulp'), undefined);
		});

	it.skip('should NOT allow registering classes twice', function() {


		// TODO
	});

	it.skip('should NOT allow registering another class under the same name', function() {
		var MyClassQR2MRSMIEulp = _.createSubclass(FoundationClass);

		// registry.add(MyClassQR2MRSMIEulp);
		// TODO
	});
}
