'use strict';


var assert = require('assert')
    , request = milo.util.request
    , count = milo.util.count;


require('../../mocks/xmlhttprequest');


var currentTestResponse;
function testResponse(data) {
    return currentTestResponse(data);
}


var requests = {
    GET: {
        'http://example.com/test1': 'test1',
        'http://example.com/test3': '{"data": "test3"}'
    },
    POST: {
        'http://example.com/test2': testResponse,
        'http://example.com/test4': testResponse
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


    it('should define request.post', function(done) {
        var testData = { data: 'test2' };
        currentTestResponse = function(data) {
            assert.deepEqual(JSON.parse(data), testData)
            return 'test2 response';
        };

        request.post('http://example.com/test2', testData, function(err, resp) {
            assert.equal(resp, 'test2 response');
            done();
        });
    });


    it('should define request.json', function(done) {
        request.jsonp('http://example.com/test3', function(err, resp) {
            assert.deepEqual(resp, {"data": "test3"});
            done();
        });

        window['___milo_callback_' + count.get()]({"data": "test3"});
    });


    it('should define request.jsonp', function(done) {
        request.jsonp('http://example.com/test3', function(err, resp) {
            assert.deepEqual(resp, {"data": "test3"});
            done();
        });

        window['___milo_callback_' + count.get()]({"data": "test3"});
    });


    it('should define request.file', function(done) {
        currentTestResponse = function(data) {
            return 'test4 uploaded'
        };

        request.file('http://example.com/test4', 'file data', function(err, resp) {
            assert.equal(resp, 'test4 uploaded');
            done();
        });
    });


    function doneTimes(counter, done) {
        return function () {
            if (!--counter) done();
        }
    }
});
