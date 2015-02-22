'use strict';

var fs = require('fs')
    , assert = require('assert')
    , Model = milo.Model;


describe('List facet', function() {
    this.timeout(10000);

    var testHtml = fs.readFileSync(__dirname + '/List_test.html');
    var element, scope,
        testData = [
            { name: 'Jason', surname: 'Green', contact: '07123123'},
            { name: 'Luis', surname: 'Fetzner', contact: '07123124'},
            { name: 'Tom', surname: 'Burnell', contact: '07123125'},
            { name: 'Evgeny', surname: 'Poberezkin', contact: '07123126'}
        ];


    beforeEach(function() {
        var element = document.createElement('div');
        element.innerHTML = testHtml;

        // Bind the element
        scope = milo.binder(element);
    });

    it('should define methods get/set to access data in DOM', function() {

        // set data
        var valueSet = scope.myList1.data.set(testData.slice());
        assert.deepEqual(valueSet, testData.slice(), 'should return data that was set');

        // check the data directly on DOM
        scope.myList1.list.each(function(listItem, index) {
            var innerScope = listItem.container.scope;
            assert.equal(innerScope.name.el.innerHTML, testData[index].name, 'should set name innerHTML span element');
            assert.equal(innerScope.surname.el.innerHTML, testData[index].surname, 'should set surname innerHTML div element');
            assert.equal(innerScope.contact.el.value, testData[index].contact, 'should set value for input element');
        });

        // get data
        var value = scope.myList1.data.get();
        assert.deepEqual(value, testData.slice(), 'should correctly retrieve data from DOM');
    });

    it('modelPath shouldn\'t duplicate when list is empty', function(done) {
        // var m1 = new Model({hello:[]});
        var m1 = new Model;
        milo.minder(m1('.hello'), '<<<->>>', scope.myList1.data);
        var valueSet = m1('.hello').push(testData[0]);
        _.deferTicks(function() {
            assert.deepEqual(m1('.hello').get(), scope.myList1.data.get(), 'should return data that was set');
            done();
        }, 10);
    });

    it('should propagate data from Model to Data into 2 lists', function(done) {

        var m = new Model;

        milo.minder(m, '<<<->>>', scope.myList1.data);
        milo.minder(m, '<<<->>>', scope.myList2.data);

        m.set(testData.slice());
        
        _.defer(function() {
            assert.deepEqual(scope.myList1.data.get(), testData.slice());
            assert.deepEqual(scope.myList2.data.get(), testData.slice());
            done();
        });
    });

    it('should propagate data from Model to Model and Data and populate DOM in to 2 lists', function(done) {

        var cloneTest = testData.slice();

        var mainModel = new Model;
        var list1Model = new Model;
        var list2Model = new Model;

        var listsComponents = [scope.myList1, scope.myList2];

        milo.minder(mainModel, '<<<->>>', list1Model);
        milo.minder(mainModel, '<<<->>>', list2Model);

        milo.minder(list1Model, '<<<->>>', scope.myList1.data);
        milo.minder(list2Model, '<<<->>>', scope.myList2.data);

        //set data
        list1Model.set(cloneTest.slice());

        _.deferTicks(function () {
            testEqualData();

            //use splice to add a new data
            var newData = [
                { name: 'Chris', surname: 'Flook', contact: '07123127' },
                { name: 'Manju', surname: 'Mohanan', contact: '07123128' }
            ];

            newData.forEach(function (newRow) {
                cloneTest.push(newRow);
                list1Model.push(newRow);
            });
           
            _.deferTicks(function() {
                testEqualData();
                
                done();
            }, 3);
        }, 3);

        function testEqualData() {
            //get data
            var clone = cloneTest.slice();
            assert.deepEqual(scope.myList1.data.get().slice(), clone);
            assert.deepEqual(scope.myList2.data.get().slice(), clone);
            assert.deepEqual(list1Model.get().slice(), clone);
            assert.deepEqual(list2Model.get().slice(), clone);
            assert.deepEqual(mainModel.get().slice(), clone);

            // check the data directly on DOM
            listsComponents.forEach(function (listComponent) {
                listComponent.list.each(function(listItem, index) {
                    var innerScope = listItem.container.scope;                    
                    assert.equal(innerScope.name.el.innerHTML, cloneTest[index].name, 'should set name innerHTML span element');
                    assert.equal(innerScope.surname.el.innerHTML, cloneTest[index].surname, 'should set surname innerHTML div element');
                    assert.equal(innerScope.contact.el.value, cloneTest[index].contact, 'should set value for input element');
                });
            });
        }
    });
});
