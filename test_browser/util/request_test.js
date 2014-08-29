'use strict';


var assert = require('assert')
    , request = milo.util.request;


require('../../mocks/xmlhttprequest');


var requests = {
    GET: {
        'http://example.com/test1': 'test1'
    },
    POST: {
        'http://example.com/test2': 'test2'
    }
};


describe('request', function() {
    before(function() {
        window.XMLHttpRequest.setMockRoutes(requests);
    });


    it('should send request', function(done) {
        var completed = doneTimes(2, done);

        var promise = request('http://example.com/test1', { method: 'GET' }, function(err, resp) {
            assert.equal(resp, 'test1');
            completed();
        });

        promise.then(function(err, data) {
            assert.equal(data, 'test1');
            completed();
        });
    });


    it('should define request.get', function(done) {
        request.get('http://example.com/test1', function(err, resp) {
            assert.equal(resp, 'test1');
            done();
        });
    });


    it.only('should define request.post', function(done) {
        request.post('http://example.com/test2', { data: 'test2'}, function(err, resp) {
            assert.equal(resp, 'test2 response');
            done();
        });
    });


    function doneTimes(counter, done) {
        return function () {
            if (!--counter) done();
        }
    }
});
