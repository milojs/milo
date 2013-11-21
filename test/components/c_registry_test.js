'use strict';

var registry = require('../../lib/components/c_registry')
	, Component = require('../../lib/components/c_class')
	, Facet = require('../../lib/facets/f_class')
	, assert = require('assert')
	, _ = require('proto');

describe('registry of components', function() {
	beforeEach(function() {
		registry.clean();
	});

	it('should have "add" and "get" methods', function() {
		var ComponentClass1 = Component.createComponentClass('', {
			facet1: Facet
		});
		var ComponentClass2 = Component.createComponentClass('ComponentClass2', {
			facet2: Facet
		});

		assert.throws(registry.add, 'should fail if name or constructor not specified');
		assert.throws(function() {
			registry.add(ComponentClass1, '');
		}, 'should fail if name not specified');
		assert.throws(function() {
			registry.add(undefined, 'Class1');
		}, 'should fail if constructor not specified');

		registry.add(ComponentClass1, 'Class1');
		registry.add(ComponentClass2);

		var CompCls1 = registry.get('Class1');

			assert.equal(CompCls1, ComponentClass1);
			assert.equal(registry.get('ComponentClass2'), ComponentClass2);

		
		var comp1 = new CompCls1;

			assert(comp1 instanceof ComponentClass1);

		assert.doesNotThrow(function() {
			registry.add(ComponentClass1, 'ComponentClass1');
		}, 'should NOT fail if same component registered under different name')
		assert.throws(function() {
			registry.add(ComponentClass2);
		}, 'should fail if component registered under same name')
	});

	it('should have "remove" method', function() {
		var ComponentClass1 = Component.createComponentClass('ComponentClass1', {
			facet1: Facet
		});

		assert.throws(registry.remove, 'should fail if name or class is not supplied');
		assert.throws(function() {
			registry.remove(1);
		}, 'should fail if not name or class is NOT supplied');

		registry.add(ComponentClass1);
		assert.throws(function() {
			registry.add(ComponentClass1);
		}, 'cant register component with the same name');

		registry.remove('ComponentClass1');
		
		// now you can add it again
		registry.add(ComponentClass1);

		// also can delete by supplying function
		registry.remove(ComponentClass1);

		assert.throws(function() {
			registry.remove(ComponentClass1);
		}, 'should fail if component is not registered');
	});
});
