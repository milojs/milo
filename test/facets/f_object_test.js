'use strict';

var FacetedObject = require('../../lib/facets/f_object')
	, Facet = require('../../lib/facets/f_class')
	, assert = require('assert')
	, _ = require('proto');

describe('FacetedObject class', function() {
	var factory = FacetedObject.createFacetedClass.bind(FacetedObject);

	var facetsClasses = {
			facet: Facet
		}

	it('should have a factory that creates classes of faceted objects', function() {
		var TestFacetedClass = factory('TestFacetedClass', facetsClasses);

			assert.equal(TestFacetedClass.prototype.facets, facetsClasses);
			assert(TestFacetedClass.prototype instanceof FacetedObject);

		var aTestFacetedObject = new TestFacetedClass();

			assert(aTestFacetedObject instanceof TestFacetedClass);
			assert(aTestFacetedObject instanceof FacetedObject);

		assert.doesNotThrow(function() {
			aTestFacetedObject = new TestFacetedClass({
				facet: { /* facet options */ }
			});
		});

		assert.throws(function() {
			aTestFacetedObject = new TestFacetedClass({
				unknownFacet: { /* facet options */ }
			});
		});

		assert.throws(function() { factory(); });
		assert.throws(function() { factory('name'); });
		assert.throws(function() { factory('name', {facet: 1}); });
	});


	it('should call init method defined in Subclass when instantiated', function() {
		var TestFacetedClass = factory('TestFacetedClass', facetsClasses);

		var result;
		_.extendProto(TestFacetedClass, {
			init: function() { result = 'initCalled'; }
		})

		var aTestFacetedObject = new TestFacetedClass;

		assert.equal(result, 'initCalled');
	});


	it.skip('should define addFacet method', function() {

	});
});
