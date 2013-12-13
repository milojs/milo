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


	it('should define getter "get()"', function() {
		var m = new Model;

		m._data = { info: { name: 'Milo' } };

		assert.deepEqual(m.get(), { info: { name: 'Milo' } }, 'should get correct value');
	});


	it('should return ModelPath that has compiled getter "get()"', function() {
		var m = new Model;

		var modelPath = m('.info.name');

		// setting data directly, should not be done this way in application
		m._data = { info: { name: 'Milo' } };

			assert.equal(modelPath.get(), 'Milo');
			assert.equal(m('.info.name').get(), 'Milo');

		m._data = { info: {
			name: 'Jason',
			DOB: {
				date: 1,
				month: 2,
				year: 1982
			}
		} };
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
				'': { path: '', type: 'added', newValue: { list: [ { info: { name: 'Jason' } } ] } },
				'.list': { path: '.list', type: 'added', newValue: [ { info: { name: 'Jason' } } ] },
				'.list[0]': { path: '.list[0]', type: 'added', newValue: { info: { name: 'Jason' } } },
				'.list[0].info': { path: '.list[0].info', type: 'added', newValue: { name: 'Jason' } },
				'.list[0].info.name': { path: '.list[0].info.name', type: 'added', newValue: 'Jason' }
			}, 'should post messages on model when property added');

		var posted = {}

		m('.list[0].info.name').set('Evgeny');
		m('.list[0].info.surname').set('Poberezkin');

			assert.deepEqual(posted, {
				'.list[0].info.name': { path: '.list[0].info.name', type: 'changed', oldValue: 'Jason', newValue: 'Evgeny' },
				'.list[0].info.surname': { path: '.list[0].info.surname', type: 'added', newValue: 'Poberezkin' }
			}, 'should post messages on model when property changed');

		var posted = {}

		m('.list[0].extra[0]').set('extra0');
		m('.list[0].extra[1]').set('extra1');

			assert.deepEqual(posted, {
				'.list[0].extra': { path: '.list[0].extra', type: 'added', newValue: ['extra0', 'extra1'] },
				'.list[0].extra[0]': { path: '.list[0].extra[0]', type: 'added', newValue: 'extra0' },
  				'.list[0].extra[1]': { path: '.list[0].extra[1]', type: 'added', newValue: 'extra1' }
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
				'.list': { path: '.list', type: 'added', newValue: [ { info: { name: 'Jason' } } ] },
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

		m('.list[0].info.name').on('', postLogger);

		m('.list[0].info.name').set('Jason');

		assert.deepEqual(posted, { '.list[0].info.name': { path: '.list[0].info.name', type: 'added', newValue: 'Jason' } },
			'should correctly post message');
	});


	it.skip('should define setter for model', function() {

	});


	it('should post "removed" messages for all properties of subtrees replaced with scalar values', function() {
		var m = new Model()
			, posted = {};

		m('[0][1].info.name').set('Jason');

			// just in case
			assert.deepEqual(m.get(), [ [ , { info: { name: 'Jason' } } ] ], 'should create array on top level');

		m.on(/.*/, function(message, data) {
			posted[message] = data;
		});

		m('[0][1]').set('subtree removed');

			assert.deepEqual(posted, {
				'[0][1]': { path: '[0][1]', type: 'changed', oldValue: { info: { name: 'Jason' } }, newValue: 'subtree removed' },
				'[0][1].info':  { path: '[0][1].info', type: 'removed', oldValue: { name: 'Jason' } },
  				'[0][1].info.name': { path: '[0][1].info.name', type: 'removed', oldValue: 'Jason' }
			});

	});


	it('should post "added" messages for all properties of subtrees that replace scalar values', function() {
		var m = new Model()
			, posted = {};

		m('[0][1]').set('scalar value');

			// just in case
			assert.deepEqual(m.get(), [ [ , 'scalar value' ] ], 'should create array on top level');

		m.on(/.*/, function(message, data) {
			posted[message] = data;
		});

		var shouldBePosted = {
			'[0][1]': { path: '[0][1]', type: 'changed', oldValue: 'scalar value', newValue: { info: { name: 'Jason', surname: 'Green' } } },
			'[0][1].info':  { path: '[0][1].info', type: 'added', newValue: { name: 'Jason', surname: 'Green' } },
			'[0][1].info.name': { path: '[0][1].info.name', type: 'added', newValue: 'Jason' },
			'[0][1].info.surname': { path: '[0][1].info.surname', type: 'added', newValue: 'Green' }
		};

		m('[0][1]').set({ info: { name: 'Jason', surname: 'Green' } });

			assert.deepEqual(posted, shouldBePosted);

		m('[0][1]').set('scalar value');
		posted = {};
		m('[0][1].info.name').set('Jason');

		var shouldBePosted = {
			'[0][1]': { path: '[0][1]', type: 'changed', oldValue: 'scalar value', newValue: { info: { name: 'Jason' } } },
			'[0][1].info':  { path: '[0][1].info', type: 'added', newValue: { name: 'Jason' } },
			'[0][1].info.name': { path: '[0][1].info.name', type: 'added', newValue: 'Jason' }
		}
			assert.deepEqual(posted, shouldBePosted);
	});


	it('should post "changed" messages for all properties of subtrees that replace subtrees', function() {
		var m = new Model()
			, posted = {};

		m('[0][1]').set({ info: { name: 'Jason', surname: 'Green', map: { data: 2 } } });

			// just in case
			assert.deepEqual(m.get(), [ [ , { info: { name: 'Jason', surname: 'Green', map: { data: 2 } } } ] ], 'should create array on top level');

		m.on(/.*/, function(message, data) {
			posted[message] = data;
		});

		var shouldBePosted = {
			'[0][1]':
				{ path: '[0][1]', type: 'changed',
				  oldValue: { info: { name: 'Jason', surname: 'Green', map: { data: 2 } } },
				  newValue: { info: { name: 'Evgeny', surname: 'Poberezkin', extra: { data: 1 } } } },
			'[0][1].info':
	  			{ path: '[0][1].info', type: 'changed',
	    		  newValue: { name: 'Evgeny', surname: 'Poberezkin', extra: { data: 1 } },
	    		  oldValue: { name: 'Jason', surname: 'Green', map: { data: 2 } } },
    		'[0][1].info.name':
				{ path: '[0][1].info.name', type: 'changed',
				  newValue: 'Evgeny',
				  oldValue: 'Jason' },
			'[0][1].info.surname':
				{ path: '[0][1].info.surname',
				  type: 'changed',
				  newValue: 'Poberezkin',
				  oldValue: 'Green' },
			'[0][1].info.extra':
				{ path: '[0][1].info.extra',
				  type: 'added',
				  newValue: { data: 1 } },
			'[0][1].info.extra.data':
				{ path: '[0][1].info.extra.data',
				  type: 'added',
				  newValue: 1 },
			'[0][1].info.map':
				{ path: '[0][1].info.map',
				  type: 'removed',
				  oldValue: { data: 2 } },
			'[0][1].info.map.data':
				{ path: '[0][1].info.map.data',
				  type: 'removed',
				  oldValue: 2 }
		};

		m('[0][1]').set({ info: { name: 'Evgeny', surname: 'Poberezkin', extra: { data: 1 } } });

			assert.deepEqual(posted, shouldBePosted);
	});
});
