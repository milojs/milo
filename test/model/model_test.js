'use strict';


var Model = require('../../lib/model')
	, assert = require('assert');


describe('Model class', function() {
	it('should create instances return ModelPath objects', function() {
		var m = new Model();
		assert(m instanceof Model);

		var modelPath = m('.info.name');

		assert(modelPath.value instanceof Function, 'getter should be function');
		assert(modelPath.setValue instanceof Function, 'setter should be function');
	});


	it('should return ModelPath that has compiled getter "value()"', function() {
		var m = new Model();

		var modelPath = m('.info.name');

		// setting data directly, should not be done this way in application
		m._data.info = {
			name: 'Milo'
		};

		assert.equal(modelPath.value(), 'Milo');
		assert.equal(m('.info.name').value(), 'Milo');

		m._data.info = {
			name: 'Jason',
			DOB: {
				date: 1,
				month: 2,
				year: 1982
			}
		};
		assert.equal(modelPath.value(), 'Jason');
		assert.equal(m('.info.DOB.year').value(), 1982);

		assert.throws(function() {
			var id = m._data.info.person.id;
		}, 'direct access to property of undefined should throw')

		assert.doesNotThrow(function() {
			var id = m('.info.person.id').value();
		}, 'access to property of undefined should not throw');
		
		assert.equal(m('.info.person.id').value(), undefined,
			'access to property of undefined should return "undefined"');
	});


	it('should return ModelPath that has compiled setter "setValue()"', function() {
		var m = new Model();

		m('.info.name').setValue('Jason');
		m('.info.DOB.year').setValue(1982);

		// accessing model directly, should not be done this way in application
		assert.deepEqual(m._data, {
			info: {
				name: 'Jason',
				DOB: {
					year: 1982
				}
			}
		}, 'should correctly assign properties of undefined by defining them')

		m('.info.DOB.month').setValue(2);

		assert.deepEqual(m._data, {
			info: {
				name: 'Jason',
				DOB: {
					month: 2,
					year: 1982
				}
			}
		}, 'should correctly assign properties of undefined by defining them')


		m('.info.DOB').setValue({
			date: 1,
			month: 2,
			year: 1982
		});

		assert.deepEqual(m._data, {
			info: {
				name: 'Jason',
				DOB: {
					date: 1,
					month: 2,
					year: 1982
				}
			}
		}, 'should correctly overwrite properties')
	});
});
