'use strict';

var fs = require('fs')
	, assert = require('assert');


describe('Data facet', function() {
	var testHtml = fs.readFileSync(__dirname + '/Data_test.html');;
	var element, scope;


	beforeEach(function() {
		var element = document.createElement('div');
		element.innerHTML = testHtml;

		// Bind the element
		scope = milo.binder(element);
	});


	it('should define methods get/set to access data in DOM', function() {
		// set data
		var valueSet = scope.myItem.data.set({ title: 'Title 1', desc: 'Description 1', unused: 'not used' });

			assert.deepEqual(valueSet, { title: 'Title 1', desc: 'Description 1' }
				, 'should return data that was set');

		// check the data directly on DOM
		var innerScope = scope.myItem.container.scope;
		
			assert.equal(innerScope.title.el.innerHTML, 'Title 1', 'should set innerHTML for span element');
			assert.equal(innerScope.desc.el.value, 'Description 1', 'should set value for input element');

		// get data
		var value = scope.myItem.data.get();

			assert.deepEqual(value, { title: 'Title 1', desc: 'Description 1', info: { name: '', surname: '' } }
				, 'should correctly retrieve data from DOM');
	});


	it('should define method path to traverse scope', function() {
		// set data
		var childData = scope.myItem.data.path('.title');

			assert.equal(childData.owner.name, 'title'
				, 'should find data facet of child component by path');
	});


	it('should post messages when data anywhere in scope chain changes', function() {
		var posted = {};

		scope.myItem.data.on(/.*/, function(path, data) {
			posted[path] = data;
		});

		scope.myItem.data.set({ title: 'Title 1', desc: 'Description 1' });

		delete posted['childdata']; // childdata used to dispatch messages up the scope tree

			assert.deepEqual(posted, {
				'.title': { path: '.title', type: 'changed', newValue: 'Title 1', oldValue: undefined },
				'.desc': { path: '.desc', type: 'changed', newValue: 'Description 1', oldValue: undefined },
				'': { path: '', type: 'changed', newValue: { title: 'Title 1', desc: 'Description 1'}, oldValue: undefined}
			}, 'should post messages for changes in data of component and in data of scope children');
	});


	it('should support "*" pattern subscriptions on data messages', function() {
		var posted = {};

		function logPosted(path, data) {
			posted[path] = data;
		};

		scope.myItem.data.on('*', logPosted);

		scope.myItem.data.set({ title: 'Title 1', desc: 'Description 1', info: { name: 'Jason', surname: 'Green' } });

			assert.deepEqual(posted, {
				'.title': { path: '.title', type: 'changed', newValue: 'Title 1', oldValue: undefined },
				'.desc': { path: '.desc', type: 'changed', newValue: 'Description 1', oldValue: undefined },
				'.info': { path: '.info', type: 'changed', newValue: { name: 'Jason', surname: 'Green' }, oldValue: undefined },
				'': { path: '', type: 'changed', newValue: { title: 'Title 1', desc: 'Description 1', info: { name: 'Jason', surname: 'Green' } }, oldValue: undefined}
			}, 'should post messages for changes in data of component and in data of scope children');

		scope.myItem.data.set({ title: '', desc: '2', info: { name: '', surname: '' } });

		// check the data directly on DOM
		var innerScope = scope.myItem.container.scope;
		assert.equal(innerScope.title.el.innerHTML, '', 'should set innerHTML for span element');

		// TODO can't set empty string on input element for some reason
		assert.equal(innerScope.desc.el.value, '2', 'should set value for input element');


		// subscription up to two levels
		var posted = {};

		scope.myItem.data.off('*', logPosted);

		scope.myItem.data.on('**', logPosted);

		scope.myItem.data.set({ title: 'Title 2', desc: 'Description 2', info: { name: 'Evgeny', surname: 'Poberezkin' } });

			assert.deepEqual(posted, {
				'.info.name': { path: '.info.name', type: 'changed', newValue: 'Evgeny', oldValue: '' },
				'.info.surname': { path: '.info.surname', type: 'changed', newValue: 'Poberezkin', oldValue: '' },
				'.title': { path: '.title', type: 'changed', newValue: 'Title 2', oldValue: '' },
				'.desc': { path: '.desc', type: 'changed', newValue: 'Description 2', oldValue: '2' },
				'.info': { path: '.info', type: 'changed', newValue: { name: 'Evgeny', surname: 'Poberezkin' }, oldValue: { name: '', surname: '' } },
				'': { path: '', type: 'changed', newValue: { title: 'Title 2', desc: 'Description 2', info: { name: 'Evgeny', surname: 'Poberezkin' } },
						oldValue: { title: '', desc: '2', info: { name: '', surname: '' } } }
			}, 'should post messages for changes in data of component and in data of scope children');
	});
});
