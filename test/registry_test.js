'use strict';

var ClassRegistry = require('../lib/registry.js')
	, _ = require('proto')
	, assert = require('assert');

describe('ClassRegistry class', function() {
	var registry = new ClassRegistry(Object);

	beforeEach(function() {
		registry.clean();
	});

	it('should have "add" and "get" methods', function() {
		var ComponentClass1 = function () { this.prop = 1; } // function name not specified
		function ComponentClass2() { this.prop = 2; }

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
		function ComponentClass1() { this.prop = 1; }

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

	it('should only allow to register class passed to registry constructor and its subclasses', function() {
		function MyClass() {}
		function AnotherClass() {}

		var MySubclass = _.createSubclass(MyClass, 'MySubclass');
		var MySubSubclass = _.createSubclass(MySubclass, 'MySubSubclass');

		var myRegistry = new ClassRegistry(MyClass);

		assert.doesNotThrow(function() {
			myRegistry.add(MyClass);
			myRegistry.add(MySubclass);
			myRegistry.add(MySubSubclass);
		}, 'should allow registering foundation class and its subclasses');

		assert.throws(function() {
			myRegistry.add(AnotherClass);
		}, 'should NOT allow registering classes that are not subclasses of foundation class');
	});
});
