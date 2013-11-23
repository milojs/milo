'use strict';

var Component = require('../../lib/components/c_class')
	, Facet = require('../../lib/facets/f_class')
	, FacetedObject = require('../../lib/facets/f_object')
	, assert = require('assert');

describe('Component class', function() {
	it('should be a subclass of FacetedObject class', function(){
		assert(Component.prototype instanceof FacetedObject);
		assert.equal(Component.name, 'Component');
	});


	it('should have a class method createComponentClass that creates subclasses', function() {
		var MyComponent = Component.createComponentClass('MyComponent', {
			facet: Facet
		});

		assert(MyComponent.prototype instanceof Component, 'should create subclass of Component');
		var aComp = new MyComponent;

		assert(aComp instanceof MyComponent, '');
	});


	it.skip('should have messengerMixin', function() {

	});
});