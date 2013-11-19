var facets = require('../lib/facets')
	, assert = require('assert');

describe('facets', function() {
	it('should have a factory that create classes of faceted objects', function() {
		var factory = facets.createFacetedObjectClass
			, facetsClasses = {
				facet: facets.Facet
			}
			, TestFacetedClass;
		assert.doesNotThrow(function() {
			TestFacetedClass = factory('TestFacetedClass', facetsClasses);
		});
		assert.equal(TestFacetedClass.prototype.facets, facetsClasses);
		assert(TestFacetedClass.prototype instanceof facets.Object);

		var aTestFacetedObject;
		assert.doesNotThrow(function() {
			aTestFacetedObject = new TestFacetedClass();
		});
		assert(aTestFacetedObject instanceof TestFacetedClass);
		assert(aTestFacetedObject instanceof facets.Object);

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
		assert.throws(function() { factory('name', {facet: 1}); });
		assert.throws(function() { factory('name'); });
	});
});
