'use strict';

var fs = require('fs')
    , assert = require('assert')
    , Model = require('../../../lib/model');


describe('Data Model connection', function() {
    var testHtml = fs.readFileSync(__dirname + '/Data_test.html');
    var element, scope, myItem;

    var testData = {
            title: 'Title 1',
            desc: 'Description 1',
            info: { name: 'Jason', surname: 'Green' }
        };


    beforeEach(function() {
        var element = document.createElement('div');
        element.innerHTML = testHtml;

        // Bind the element
        scope = milo.binder(element);
        myItem = scope.myItem;
    });


    it('should propagate data from Model to Data', function(done) {
        var m = new Model;

        milo.minder(m, '<<<->>>', myItem.data);
        m.set(testData);

        _.defer(function() {
            assert.deepEqual(myItem.data.get(), testData);
            done();
        });
    });


    it('should propagate data from Data to Model', function(done) {
        var m = new Model;

        milo.minder(m, '<<<->>>', myItem.data);
        myItem.data.set(testData);

        _.deferTicks(function() {
            assert.deepEqual(m.get(), testData);

            var descField = myItem.data.path('.desc').owner;
            descField.el.value = 'New description';
            descField.data.dispatchSourceMessage('input');

            _.deferTicks(function() {
                assert.equal(m('.desc').get(), 'New description');
                done();
            }, 2);
        }, 2);
    });
});
