var FacetedObject = require('../../lib/facets/object')
	, Facet = require('../../lib/facets/class')
	, assert = require('assert');

describe('FacetedObject', function() {
	it('should have a factory that creates classes of faceted objects', function() {
		var factory = FacetedObject.createFacetedClass;
		var facetsClasses = {
				facet: Facet
			}
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
});
