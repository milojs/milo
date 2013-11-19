var facets = require('../lib/facets')
	, assert = require('assert');

describe('facets', function() {
	it('should have a factory that create classes of faceted objects', function() {
		var factory = facets.createClass;
		assert.doesNotThrow(function() {
			var TestFacetedClass = factory('TestFacetedClass', {
				facet: facets.Facet
			});
		});
		assert.throws(function() { factory(); });

	})
});
