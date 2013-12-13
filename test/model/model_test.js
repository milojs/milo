'use strict';


var Model = require('../../lib/model')
	, assert = require('assert');


describe('Model class', function() {
	it('should create instances return ModelPath objects', function() {
		var m = new Model();
		assert(m instanceof Model);

		var modelPath = m('.info.name');

		assert(modelPath.get instanceof Function, 'getter should be function');
		assert(modelPath.set instanceof Function, 'setter should be function');
	});


	it('should return ModelPath that has compiled getter "value()"', function() {
		var m = new Model();

		var modelPath = m('.info.name');

		// setting data directly, should not be done this way in application
		m._data.info = {
			name: 'Milo'
		};

			assert.equal(modelPath.get(), 'Milo');
			assert.equal(m('.info.name').get(), 'Milo');

		m._data.info = {
			name: 'Jason',
			DOB: {
				date: 1,
				month: 2,
				year: 1982
			}
		};
			assert.equal(modelPath.get(), 'Jason');
			assert.equal(m('.info.DOB.year').get(), 1982);

		assert.throws(function() {
			var id = m._data.info.person.id;
		}, 'direct access to property of undefined should throw')

		assert.doesNotThrow(function() {
			var id = m('.info.person.id').get();
		}, 'access to property of undefined should not throw');
		
			assert.equal(m('.info.person.id').get(), undefined,
				'access to property of undefined should return "undefined"');
	});


	it('should return ModelPath that has compiled setter "set()"', function() {
		var m = new Model();

		m('.info.name').set('Jason');
		m('.info.DOB.year').set(1982);

			// accessing model directly, should not be done this way in application
			assert.deepEqual(m._data, {
				info: {
					name: 'Jason',
					DOB: {
						year: 1982
					}
				}
			}, 'should correctly assign properties of undefined by defining them')

		m('.info.DOB.month').set(2);

			assert.deepEqual(m._data, {
				info: {
					name: 'Jason',
					DOB: {
						month: 2,
						year: 1982
					}
				}
			}, 'should correctly assign properties of undefined by defining them')


		m('.info.DOB').set({
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


	it('should support array syntax for property access paths for get() and set()', function() {
		var m = new Model();

		m('.list[0].info.name').set('Jason');
		m('.list[0].extra[0]').set('extra0');
		m('.list[0].extra[1]').set('extra1');
		m('.list[1].info.name').set('Evgeny');
		m('.list[1].added[1]').set(10);
		m('.list[1].added[2]').set(20);

			// accessing model directly, should not be done this way in application
			assert.deepEqual(m._data, {
				list: [
					{
						info: {
							name: 'Jason'
						},
			 			extra: ['extra0', 'extra1']
					},
					{
						info: {
							name: 'Evgeny'
						},
						added: [, 10, 20]
					},
				]
			}, 'should correctly assign properties of undefined by defining them');

			assert.equal(m('.list[0].info.name').get(), 'Jason', 'getter should return correct value');
			assert.equal(m('.list[0].extra[1]').get(), 'extra1', 'getter should return correct value');
			assert.deepEqual(m('.list[1].added').get(), [, 10, 20],
				'getter should return correct value for arrays in properties too');
	});


	it('should postMessage on model when properties are added', function() {
		var m = new Model()
			, posted = {};

		m.on(/.*/, function(message, data) {
			assert.equal(m, this, 'should set message handler context to model');
			posted[message] = data;
		});

		m('.list[0].info.name').set('Jason');

			assert.deepEqual(posted, {
				'.list': { type: 'added', newValue: [] },
				'.list[0]': { type: 'added', newValue: {} },
				'.list[0].info': { type: 'added', newValue: {} },
				'.list[0].info.name': { type: 'added', newValue: 'Jason' }
			}, 'should post messages on model when property added');

		var posted = {}

		m('.list[0].info.name').set('Evgeny');
		m('.list[0].info.surname').set('Poberezkin');

			assert.deepEqual(posted, {
				'.list[0].info.name': { type: 'changed', oldValue: 'Jason', newValue: 'Evgeny' },
				'.list[0].info.surname': { type: 'added', newValue: 'Poberezkin' }
			}, 'should post messages on model when property changed');

		var posted = {}

		m('.list[0].extra[0]').set('extra0');
		m('.list[0].extra[1]').set('extra1');

			assert.deepEqual(posted, {
				'.list[0].extra': { type: 'added', newValue: [] },
				'.list[0].extra[0]': { type: 'added', newValue: 'extra0' },
  				'.list[0].extra[1]': { type: 'added', newValue: 'extra1' }
			}, 'should not post messages on model when property traversed');
	});


	it('should allow message subsciption on model path with a depth indicated by stars', function() {
		var m = new Model()
			, posted = {};

		function postLogger(message, data) {
			assert.equal(m, this, 'should set message handler context to model');
			posted[message] = data;
		}

		m('.list').on('', postLogger);

		m('.list[0].info.name').set('Jason');

			assert.deepEqual(posted, {
				'.list': { type: 'added', newValue: [] },
			}, 'should post messages on model when property added');


		// m('.list').off('', postLogger);
	});


	it('should post message AFTER model was changed', function() {
		var m = new Model()
			, posted = {};

		function postLogger(message, data) {
			assert.equal(m, this, 'should set message handler context to model');

			// main thing in this test!
			assert.equal(m('.list[0].info.name').get(), 'Jason', 'should set model BEFORE posting message');
			posted[message] = data;
		}

		m('.list[0].info.name').set('Jason');
	});
});
