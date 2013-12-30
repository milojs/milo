'use strict';

var FacetedObject = require('../../lib/abstract/faceted_object')
	, Facet = require('../../lib/abstract/facet')
	, assert = require('assert')
	, _ = require('mol-proto');

describe('FacetedObject class', function() {
	var factory = FacetedObject.createFacetedClass.bind(FacetedObject);

	var facetsClasses = {
			facet: Facet
		};

	var MyFacet = _.createSubclass(Facet, 'MyFacet');

	it('should define a factory createFacetedClass that creates classes of faceted objects', function() {
		var TestFacetedClass = factory('TestFacetedClass', facetsClasses, {
			facet: {
				prop: 1
			}
		});

			assert.equal(TestFacetedClass.prototype.facetsClasses, facetsClasses);
			assert(TestFacetedClass.prototype instanceof FacetedObject);

		var aTestFacetedObject = new TestFacetedClass();

			assert(aTestFacetedObject instanceof TestFacetedClass);
			assert(aTestFacetedObject instanceof FacetedObject);
			assert.deepEqual(aTestFacetedObject.facet.config, { prop: 1 });


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


	it('should define addFacet instance method', function() {
		var TestFacetedClass = factory('TestFacetedClass', facetsClasses);
		var aTestFacetedObject = new TestFacetedClass;

			assert(aTestFacetedObject.facet instanceof Facet);
			assert.equal(aTestFacetedObject.myFacet, undefined);

		aTestFacetedObject.addFacet(MyFacet);

			assert(aTestFacetedObject.myFacet instanceof MyFacet);
	});


	it('should define hasFacet class method', function() {
		var TestFacetedClass = factory('TestFacetedClass', facetsClasses);

			assert(TestFacetedClass.hasFacet('facet'));
			assert.equal(TestFacetedClass.hasFacet('noSuchFacet'), undefined);
	});
});
