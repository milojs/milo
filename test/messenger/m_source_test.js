'use strict';

var MyMessageSource = require('./my_m_source')
    , Messenger = require('../../lib/messenger')
    , _ = require('mol-proto')
    , assert = require('assert');


// Messenger instance will be used as external source of messages
var sourceMsngr;

// instances that will be tested
var myMessageSource, messenger;


// handlers used in tests
var handled = {}, host = {};
function handler1(msg, data) {
    assert.equal(this, host);
    handled[msg] = { handler: 1, data: data };
}
function handler2(msg, data) {
    assert.equal(this, host);
    handled[msg] = { handler: 2, data: data };
}


describe('MessageSource class', function() {
    beforeEach(function() {
        sourceMsngr = new Messenger;
        handled = {};

        myMessageSource = new MyMessageSource(host, undefined, undefined, sourceMsngr);
        messenger = new Messenger(host, undefined, myMessageSource);
    });

    it('should subscribe to source when first handler subscribed to Messenger', function() {
        // check that there are no subscription on source
        assert.equal(sourceMsngr.getSubscribers('event1'), undefined);

        // subscribe to messenger
        messenger.onMessage('event1', handler1);
        assert.deepEqual(messenger.getSubscribers('event1'), [ { subscriber: handler1, context: messenger } ]);

        // check subscription on source
        assert.equal(sourceMsngr.getSubscribers('event1').length, 1);

        // subscribe another handler to same message
        messenger.onMessage('event1', handler2);
        assert.deepEqual(messenger.getSubscribers('event1'), [
            { subscriber: handler1, context: messenger },
            { subscriber: handler2, context: messenger }
        ]);

        // check subscription on source - should not change
        assert.equal(sourceMsngr.getSubscribers('event1').length, 1);
    });


    it('should dispatch on Messenger when dispatched on source', function(done) {
        // check that there are no subscription on source
        assert.equal(sourceMsngr.getSubscribers('event1'), undefined);

        // subscribe to messenger, should subscribe to source
        messenger.onMessage('event1', handler1);

        // dispatch on source
        sourceMsngr.postMessage('event1', { test: 1 });

        _.defer(function() {
            assert.deepEqual(handled, { event1: { handler: 1, data: { test: 1 } } });

            // subscribe to messenger another handler, should subscribe to source
            messenger.onMessage('event2', handler2);

            handled = {};

            // dispatch on source
            sourceMsngr.postMessage('event1', { test: 1 });
            sourceMsngr.postMessage('event2', { test: 2 });

            _.defer(function() {
                assert.deepEqual(handled, {
                    'event1': { handler: 1, data: { test: 1 } },
                    'event2': { handler: 2, data: { test: 2 } }
                });

                done();
            });
        });
    });


    it('should unsubscribe from source when all handlers are unsubscribed from Messenger', function(done) {
        // check that there are no subscription on source
        assert.equal(sourceMsngr.getSubscribers('event3'), undefined);

        // subscribe to messenger
        messenger.onMessage('event3', handler1);
        messenger.onMessage('event3', handler2);
        assert.deepEqual(messenger.getSubscribers('event3'), [
            { subscriber: handler1, context: messenger },
            { subscriber: handler2, context: messenger }
        ]);

        // check subscription on source - should not change
        assert.equal(sourceMsngr.getSubscribers('event3').length, 1);

        // unsubscribe one handler
        messenger.offMessage('event3', handler2);

        // check subscription on source - still subscribed
        assert.equal(sourceMsngr.getSubscribers('event3').length, 1);
        assert.deepEqual(handled, {});

        // dispatch on source
        sourceMsngr.postMessage('event3', { test: 3 });

        _.defer(function() {
                assert.deepEqual(handled, { event3: { handler: 1, data: { test: 3 } } });

            // unsubscribe all handlers
            messenger.offMessage('event3', handler1);

            // check subscription on source - should be unsubscribed
            assert.equal(sourceMsngr.getSubscribers('event3'), undefined);

            handled = {};
            // dispatch on source
            sourceMsngr.postMessage('event3', { test: 4 });

            _.defer(function() {
                // should not be dispatched on messenger
                assert.deepEqual(handled, {});

                done();
            });
        });
    });
});
