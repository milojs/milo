'use strict';


var assert = require('assert');


describe('DOMStorage', function() {
	var Model = milo.Model
		, DOMStorage = milo.Model.DOMStorage
		, m, ds;


	beforeEach(function() {
		window.localStorage.clear();
		m = new Model;
		ds = new DOMStorage('MiloTest')
	});


	function getLocalStorage() {
		var length = localStorage.length
			, keys = [];

		for (var i = 0; i < length; i++)
			keys.push(localStorage.key(i));

		var data = _.mapToObject(keys, function(key) {
			return localStorage.getItem(key);
		});

		return data;
	}


	function setLocalStorage(data) {
		_.eachKey(data, function(value, key) {
			localStorage.setItem(key, value);
		});
	}


	it('should define set method', function() {
		ds.set({
			name: 'milo',
			info: { test: 1 },
			list: [
				'item1',
				{ item: 'item2' },
				[ 'item3', 'item4' ]
			]
		});
		var data = getLocalStorage();

		console.log(data);

		assert.deepEqual(data, {
			'MiloTest.name': 'milo',
			'MiloTest.info.test': '1',
			'MiloTest.list[0]': 'item1',
			'MiloTest.list[1].item': 'item2',
			'MiloTest.list[2][0]': 'item3',
			'MiloTest.list[2][1]': 'item4',
		});
	});


	it.skip('should define get method', function() {
		setLocalStorage({
			'MiloTest.name': 'milo',
			'MiloTest.info.test': '1',
			'MiloTest.list[0]': 'item1',
			'MiloTest.list[1].item': 'item2',
			'MiloTest.list[2][0]': 'item3',
			'MiloTest.list[2][1]': 'item4',
		});

		var data = ds.get();

		assert.deepEqual(data, {
			name: 'milo',
			info: { test: 1 },
			list: [
				'item1',
				{ item: 'item2' },
				[ 'item3', 'item4' ]
			]
		});
	});
});
