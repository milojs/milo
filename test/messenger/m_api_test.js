'use strict';

var MessengerAPI = require('../../lib/messenger/m_api')
    , MyMessageSource = require('./my_m_source')
    , Messenger = require('../../lib/messenger')
    , _ = require('mol-proto')
    , assert = require('assert');


// Messenger instance will be used as external source of messages
var sourceMsngr;

// instances that will be tested
var myMsgAPI, myMessageSource, messenger;


// subclass of MessengerAPI ...
var MyMsgAPI = _.createSubclass(MessengerAPI, 'MyMsgAPI');

//can implement any of these three methods
_.extendProto(MyMsgAPI, {
    translateToSourceMessage: translateToSourceMessage,
    translateToInternalMessages: translateToInternalMessages,
    createInternalData: createInternalData,
    filterSourceMessage: filterSourceMessage
});

// simple translation rule: 'messageXXX' (XXX is number) is translated to 'message',
// 'eventXXX' to 'event', etc.
function translateToSourceMessage(message) {
    // removes all digits in the end of message
    return message.replace(/[0-9]+$/, '');
}


// trivial implementation (same as in base class), changed in one of tests
function translateToInternalMessages(sourceMessage, sourceData) {
    return this.getInternalMessages(sourceMessage);
}


// simple rule: type property in sourceData is updated to match internal message that should be dispatched,
// which is determined by id property, which is then removed
// sourceMessage = 'event', { id: 25, ... } -> { type: 'event25', ... }
function createInternalData(sourceMessage, message, sourceData) {
    var internalData = _.clone(sourceData);
    internalData.type = sourceMessage + sourceData.id;
    delete internalData.id;
    return internalData;
}

// dispatched only message that matches type in internalData
function filterSourceMessage(sourceMessage, message, internalData) {
    return message == internalData.type;
}


// handlers used in tests
var handled = {}, host = {};
function handler1(msg, data) {
    assert.equal(this, host);
    handled[msg] = handled[msg] || [];
    handled[msg].push({ handler: 1, data: data });
}
function handler2(msg, data) {
    assert.equal(this, host);
    handled[msg] = handled[msg] || [];
    handled[msg].push({ handler: 2, data: data });
}


describe('MessengerAPI class', function() {
    beforeEach(function() {
        sourceMsngr = new Messenger;
        handled = {};

        myMsgAPI = new MyMsgAPI;
        myMessageSource = new MyMessageSource(host, undefined, myMsgAPI, sourceMsngr);
        messenger = new Messenger(host, undefined, myMessageSource);        
    });

    it('subclass should define translateToSourceMessage to translate internal messages to source messages', function() {
        // check that there are no subscription on source
        assert.equal(sourceMsngr.getSubscribers('event'), undefined);
        assert.equal(sourceMsngr.getSubscribers('message'), undefined);

        // subscribe to messenger
        messenger.onMessage('event12', handler1);

        // check subscription on source
        assert.equal(sourceMsngr.getSubscribers('event12'), undefined);
        assert.equal(sourceMsngr.getSubscribers('event').length, 1);

        // subscribe to messenger
        messenger.onMessage('event25', handler1);

        // check subscription on source
        assert.equal(sourceMsngr.getSubscribers('event25'), undefined);
        assert.equal(sourceMsngr.getSubscribers('event').length, 1);

        // subscribe to messenger
        messenger.onMessage('message33', handler1);
        messenger.onMessage('message33', handler2);

        // check subscription on source
        assert.equal(sourceMsngr.getSubscribers('message33'), undefined);
        assert.equal(sourceMsngr.getSubscribers('message').length, 1);
    });


    it('subclass should define createInternalData and filterSourceMessage used when message dispatched on source', function(done) {
        // check that there are no subscription on source
        assert.equal(sourceMsngr.getSubscribers('event'), undefined);
        assert.equal(sourceMsngr.getSubscribers('message'), undefined);

        // subscribe to messenger, should subscribe to source
        messenger.onMessage('event12', handler1);
        messenger.onMessage('event25', handler2);

        // dispatch on source
        sourceMsngr.postMessage('event', { id: 33, test: 1 });

        _.defer(function() {
            assert.deepEqual(handled, {});

            sourceMsngr.postMessage('event', { id: 12, test: 2 });

            _.defer(function() {
                assert.deepEqual(handled, { 'event12': [{ handler: 1, data: { type: 'event12', test: 2 } }] });

                handled = {};
                sourceMsngr.postMessage('event', { id: 25, test: 3 });

                _.defer(function(){
                    assert.deepEqual(handled, { 'event25': [{ handler: 2, data: { type: 'event25', test: 3 } }] });

                    // subscribe to messenger, should subscribe to source
                    messenger.onMessage('message33', handler1);
                    messenger.onMessage('message33', handler2);

                    // dispatch on source
                    handled = {}
                    sourceMsngr.postMessage('message', { id: 55, test: 4 });

                    _.defer(function() {
                        assert.deepEqual(handled, {});

                        sourceMsngr.postMessage('message', { id: 33, test: 5 });

                        _.defer(function() {
                            assert.deepEqual(handled, {
                                'message33': [
                                    { handler: 1, data: { type: 'message33', test: 5 } },
                                    { handler: 2, data: { type: 'message33', test: 5 } }
                                ]
                            }); 
                            done();
                        });
                    });
                });
            });
        });
    });


    it('should correctly unsubscribe from source when all handlers are unsubscribed from Messenger', function(done) {
        // check that there are no subscription on source
        assert.equal(sourceMsngr.getSubscribers('event'), undefined);

        // subscribe to messenger, should subscribe to source only once
        messenger.onMessage('event12', handler1);
        messenger.onMessage('event25', handler2);
        assert.deepEqual(sourceMsngr.getSubscribers('event').length, 1);
        assert.deepEqual(sourceMsngr.getSubscribers('event12'), undefined);
        assert.deepEqual(sourceMsngr.getSubscribers('event25'), undefined);

        // dispatch on source - should dispatch on messenger when id matches internal message
        sourceMsngr.postMessage('event', { id: 12, test: 2 });

        _.defer(function() {
            assert.deepEqual(handled, { 'event12': [{ handler: 1, data: { type: 'event12', test: 2 } }] });

            // now unsubscribe
            messenger.offMessages({
                'event12': handler1,
                'event25': handler2
            });

            // no subscription at source
            assert.deepEqual(sourceMsngr.getSubscribers('event'), undefined);

            // no dispatch on messenger when dispatched on source
            handled = {};
            sourceMsngr.postMessage('event', { id: 12, test: 3 });
            sourceMsngr.postMessage('event', { id: 25, test: 4 });

            _.defer(function() {
                assert.deepEqual(handled, {});
                done();
            });
        });
    });
});
