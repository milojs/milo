'use strict';


var fs = require('fs')
    , assert = require('assert')
    , Model = require('../../../lib/model');


function getInputComponent(scope) {
    return scope.inputList.container.scope.input;
}

function getButtonComponent(scope) {
    return scope.inputList.container.scope.button;
}

function getListComponent(scope) {
    return scope.inputList.container.scope.list;
}

function getListComponentList(scope) {
    return getListComponent(scope).list;
}


describe('InputList UI', function() {
    this.timeout(10000);

    var testHtml = fs.readFileSync(__dirname + '/InputList_test.html');
    var element, scope,
        testData = [
            { label: 'Jason Green', contact: '07123123'},
            { label: 'Luis Fetzner', contact: '07123124'},
            { label: 'Tom Burnell', contact: '07123125'},
            { label: 'Evgeny Poberezkin', contact: '07123126'}
        ];


    beforeEach(function() {
        var element = document.createElement('div');
        element.innerHTML = testHtml;

        // Bind the element
        scope = milo.binder(element);
    });

    it('should define methods get/set to access data in DOM', function(done) {
        // set data
        scope.inputList.model.set(testData.slice());
        assert.deepEqual(scope.inputList.model.get(), testData.slice(), 'should return data that was set');

        var list = getListComponentList(scope);

        _.deferTicks(function() {

            // check the data directly on DOM
            list.each(function(listItem, index) {
                var innerScope = listItem.container.scope;
                assert.equal(innerScope.label.el.innerHTML, testData[index].label, 'should set name innerHTML span element');
            });

            done();
        }, 2);
    });

    it('should add a new item when press the add button', function(done) {

        var addIndex = [2, 1, 3, 0];

        // set data
        scope.inputList.setAsync(function (value, callback) {
            var index = _.findIndex(testData, function (item) {
                return item.label == value || item.contact == value;
            });
            callback(testData[index].label, testData[index]);
        });
        
        var input = getInputComponent(scope);
        var button = getButtonComponent(scope);
        var list = getListComponentList(scope);

        addIndex.forEach(function (value, index) {
            input.el.value = testData[value][ (index % 2 ? 'contact' : 'label') ];
            button.el.dispatchEvent(new Event('click'));
        });

        _.deferTicks(function() {

            list.each(function(listItem, index) {
                var innerScope = listItem.container.scope;
                assert.equal(innerScope.label.el.innerHTML, testData[addIndex[index]].label, 'should set name innerHTML span element');
            });

            done();
        }, 2);
    });

    it('should delete item when delete is pressed', function(done) {

        var cloneTest = testData.slice();

        var itemsToDelete = [2, 1];

        // set data
        scope.inputList.model.set(cloneTest.slice());

        var list = getListComponentList(scope);

        _.deferTicks(function() {

            itemsToDelete.forEach(function(value) {
                var deleteBtn = list.item(value).container.scope.deleteBtn;
                deleteBtn.el.dispatchEvent(new Event('click'));
                cloneTest.splice(value, 1);
            });
            

            _.deferTicks(function() {

                assert.equal(list.count(), testData.length - itemsToDelete.length, 'list count should have ' + itemsToDelete.length + ' less element');

                list.each(function(listItem, index) {
                    var innerScope = listItem.container.scope;
                    assert.equal(innerScope.label.el.innerHTML, cloneTest[index].label, 'should set name innerHTML span element');
                });

                done();
            }, 2);
        }, 2);
    });

    it('should propagate data from Model to Data into 2 lists', function(done) {

        var m = new Model;

        milo.minder(m, '<<<->>>', scope.inputList.model);
        milo.minder(m, '<<<->>>', scope.myList.data);

        // set data
        m.set(testData.slice());

        var lists = [
            getListComponent(scope),
            scope.myList
        ];
        
        _.deferTicks(function() {
            //get data
            assert.deepEqual(scope.inputList.model.get(), testData.slice());
            assert.deepEqual(scope.myList.data.get(), testData.slice());

            // check the data directly on DOM
            lists.forEach(function (listComponent) {
                listComponent.list.each(function(listItem, index) {
                    var innerScope = listItem.container.scope;
                    assert.equal(innerScope.label.el.innerHTML, testData[index].label, 'should set name innerHTML span element');
                });
            });

            done();
        }, 4);
    });

    it('should propagate data from Model to Model and Data and populate DOM in to 2 lists', function(done) {

        var cloneTest = testData.slice();

        var mainModel = new Model;
        var listModel = new Model;

        var lists = [
            getListComponent(scope),
            scope.myList
        ];

        milo.minder(mainModel, '<<<->>>', scope.inputList.model);
        milo.minder(mainModel, '<<<->>>', listModel);

        milo.minder(listModel, '<<<->>>', scope.myList.data);

        //set data
        listModel.set(cloneTest.slice());

        _.deferTicks(function () {
            testEqualData();

            //use splice to add a new data
            var newData = [
                { label: 'Chris Flook', contact: '07123127' },
                { label: 'Manju Mohanan', contact: '07123128' }
            ];

            newData.forEach(function (newRow) {
                cloneTest.push(newRow);
                scope.inputList.model.push(newRow);
            });
           
            _.deferTicks(function() {
                testEqualData();

                done();
            }, 4);
        }, 4);

        function testEqualData() {
            //get data
            assert.deepEqual(scope.inputList.model.get(), cloneTest.slice());
            assert.deepEqual(scope.myList.data.get(), cloneTest.slice());

            // check the data directly on DOM
            lists.forEach(function (listComponent) {
                listComponent.list.each(function(listItem, index) {
                    var innerScope = listItem.container.scope;
                    assert.equal(innerScope.label.el.innerHTML, cloneTest[index].label, 'should set name innerHTML span element');
                });
            });
        }
    });
});
