'use strict';

var assert = require('assert');


describe('milo.mail', function() {
    it('should trigger message on Window', function(done) {
        // both mail.trigger and mail.on prepend "message:" to the the original message
        milo.mail.on('message:message:test', function(msg, data) {
            var received = data.data;
            assert.deepEqual(received, { a: 'b', type: 'message:test'});
            done();
        });

        milo.mail.trigger('test', { a: 'b' });
    })
});
