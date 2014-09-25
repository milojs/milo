'use strict';


var _ = require('mol-proto')
    , check = require('../../lib/util/check')
    , Match = check.Match
    , assert = require('assert');


var messengerTests = module.exports = function(getHostWithMessenger) {
    var handler1 = function(){}
        , handler2 = function(){}
        , handler3 = function(){};

    it('should create a new Messenger object on host object', function() {
        assert.doesNotThrow(function() {
            var host = getHostWithMessenger().host;
        }, 'create new messenger on host object');
    });


    it('should define proxy methods', function() {
        var host = getHostWithMessenger().host;
        assert(Match.test(host.init, Function), 'init method');
        assert(Match.test(host.on, Function), 'on method');
        assert(Match.test(host.off, Function), 'off method');
        assert(Match.test(host.onEvents, Function), 'onEvents method');
        assert(Match.test(host.offEvents, Function), 'offEvents method');
        assert(Match.test(host.post, Function), 'post method');
        assert(Match.test(host.getListeners, Function), 'getListeners method');
    });


    it('should define init method', function() {
        var result = getHostWithMessenger()
            , host = result.host
            , messenger = result.messenger;

        assert(Match.test(messenger._messageSubscribers, Object), '_messageSubscribers prop');
        assert(Match.test(messenger._patternMessageSubscribers, Object), '_patternMessageSubscribers prop');
        assert(Match.test(messenger._messageSource, undefined), '_messageSource prop');
    });


    it('should define onMessage method (proxied as on)', function() {
        var result = getHostWithMessenger()
            , host = result.host
            , messenger = result.messenger
            , handler1 = function(){}
            , handler2 = function(){};

        assert(host.on('event1 event2', handler1));
        assert(Match.test(messenger._messageSubscribers, {event1: [Object], event2: [Object]}),
                '_messageSubscribers hash has events');
        assert.equal( host.on('event1 event2', handler1), false, 'subscribe with string the second time');
        assert(host.on(/event1/, handler1), 'subscribe with regex');
        assert(Match.test(messenger._patternMessageSubscribers, {'/event1/': [Object]}),
                '_patternMessageSubscribers hash has events');
        assert.equal(host.on(/event1/, handler1), false, 'subscribe with regex a second time');
        assert(host.on(['event1', 'event3'], handler2), 'subscribe with array');
        assert.equal(host.on(['event3'], handler2), false, 'subscribe with array a second time');
        assert.equal(messenger._messageSubscribers.event1.length, 2, 'there are 2 subscribers for event 1');
        assert(Match.test(messenger._messageSubscribers, {event1: [Object], event2: [Object], event3: [Object]}),
                '_messageSubscribers hash has events');
    });


    it('should define offMessage method (proxied as off)', function() {
        var result = getHostWithMessenger()
            , host = result.host
            , messenger = result.messenger;

        host.on('event1 event2 event3', handler1);
        host.on('event2 event3 event4', handler2);
        host.on(['event1', 'event3', 'event5'], handler3);
        host.on(/test1/, handler1);
        host.on(/test1|test2/, handler2);

        assert(host.off('event2'), 'events removed from event2');
        assert(Match.test(messenger._messageSubscribers.event2, undefined), 'event2 has no subscribers');
        assert.equal(host.off('event2'), false, 'events removed from event2 second time');

        assert(host.off('event3', handler3), 'handler3 removed from event3');
        assert.equal(messenger._messageSubscribers.event3.length, 2, 'event3 has 2 subscribers');
        assert.equal(host.off('event99'), false, 'event99 does not exist');

        assert.equal(host.off(['event1', 'event3'], handler1), true, 'handler1 removed from event1 and event3 with array');
        assert.equal(messenger._messageSubscribers.event1.length, 1, 'event1 has 1 subscriber');
        assert.equal(messenger._messageSubscribers.event3.length, 1, 'event3 has 1 subscriber');
        assert(host.off('event3', handler2), 'handler2 removed from event3');
        assert(Match.test(messenger._messageSubscribers.event3, undefined), 'event3 has no subscribers');
        
        assert(host.off(/test1/), 'remove pattern subscriber');
        assert(Match.test(messenger._patternMessageSubscribers['/test1/'], undefined), 'pattern event is undefined');
    });


    it('should call subscribers with correct context', function() {
        var result = getHostWithMessenger()
            , host = result.host
            , messenger = result.messenger;

        function localHandler(message, data) {
            assert.equal(this, host, 'should pass correct context');
        }


        host.on('event', localHandler);
        host.on('event', handler1);
            var subscribers = host.getListeners('event');

            assert.deepEqual(subscribers, [
                { subscriber: localHandler, context: host },
                { subscriber: handler1, context: host }
            ]);

        host.post('event');

        host.off('event', localHandler);
            var subscribers = host.getListeners('event');
            assert.deepEqual(subscribers, [ { subscriber: handler1, context: host } ], 'should have 1 subscribers');
    });


    it('should define onMessages method (proxied as onEvents)', function() {
        var result = getHostWithMessenger()
            , host = result.host
            , messenger = result.messenger
            , events = {
                'event1': handler1,
                'event1 event2': handler2,
                'event3': handler3
            };

        assert.deepEqual(host.onEvents(events), {event1: true, 'event1 event2': true, event3: true}, 
            'add subscribers with events hash');
        assert(Match.test(messenger._messageSubscribers, Match.ObjectHash([Object])), '_messageSubscribers is set');
        assert.deepEqual(host.onEvents(events), {event1: false, 'event1 event2': false, event3: false}, 
            'add subscribers with events hash second time');
    });


    it('should define offMessages method (proxied as offEvents)', function(done) {
        var result = getHostWithMessenger()
            , host = result.host
            , messenger = result.messenger;

        function handler1(msg, data) { called['handler1'] = { msg: msg, data: data }; }
        function handler2(msg, data) { called['handler2'] = { msg: msg, data: data }; }
        function handler3(msg, data) { called['handler3'] = { msg: msg, data: data }; }

        var events = {
            'event1': handler1,
            'event1 event2': handler2,
            'event3': handler3
        };

        host.onEvents(events);

        var called = {}, postedData = { 'test': 1 };
        host.post('event1', postedData);

        _.defer(function() {
            assert.deepEqual(called, {
                'handler1': { msg: 'event1', data: { 'test': 1 } },
                'handler2': { msg: 'event1', data: { 'test': 1 } }
            });

            called = {}; postedData = { 'test': 2 };
            host.post('event3', postedData);

            _.defer(function() {
                assert.deepEqual(called, {
                    'handler3': { msg: 'event3', data: { 'test': 2 } }
                });

                var result = host.offEvents({
                    'event1': handler1,
                    'event2': handler2
                });

                    assert.deepEqual(result, { 'event1': true, 'event2': true });
                    assert.deepEqual(messenger._messageSubscribers, {
                        'event1': [{ subscriber: handler2, context: host }],
                        'event3': [{ subscriber: handler3, context: host }]
                    });

                var result = host.offEvents({
                    'event1': handler2,
                    'event2': handler2,
                    'event3': handler3
                });

                    assert.deepEqual(result, { 'event1': true, 'event2': false, 'event3': true });
                    assert.deepEqual(messenger._messageSubscribers, {});

                _.defer(function() {
                    var called = {}, postedData = { 'test': 3 };
                    host.post('event1', postedData);
                    host.post('event2', postedData);
                    host.post('event3', postedData);

                    _.defer(function() {
                        assert.deepEqual(called, {});
                        done();
                    });                 
                });
            })

        });

    });


    it('should define postMessage method (proxied as post)', function(done) {
        var result = getHostWithMessenger()
            , host = result.host
            , messenger = result.messenger
            , postedData = { test: 1 }
            , called = {};
        
        function handler(msg, data) {
            assert.equal(this, host);
            called['handler'] = { msg: msg, data: data };
        }

        function patternSubscriber(msg, data) {
            assert.equal(this, host);
            called['patternSubscriber'] = { msg: msg, data: data };
        }

        host.on('event1', handler);

        host.post('event1', postedData);

        _.defer(function() {
            assert.equal(called.handler.msg, 'event1');
            assert.equal(called.handler.data, postedData);

            host.on(/event.*/, patternSubscriber);

            called = {};
            host.post('event1', postedData);

            _.defer(function() {
                assert.deepEqual(called, {
                    handler: { msg: 'event1', data: { test: 1 } },
                    patternSubscriber: { msg: 'event1', data: { test: 1 } }
                });

                called = {};
                host.post(/event.*/, postedData);

                _.defer(function() {
                    assert.deepEqual(called, {
                        patternSubscriber: { msg: /event.*/, data: { test: 1 } }
                    });

                    done();
                });
            });
        }); 
    });


    it('should define getSubscribers method (proxied as getListeners)', function() {
        var result = getHostWithMessenger()
            , host = result.host
            , messenger = result.messenger;

        function handler1(msg, data) { }
        function handler2(msg, data) { }
        function handler3(msg, data) { }
        function handler3(msg, data) { }
        function patternSubscriber(msg, data) { }

        host.onEvents({
            'event1': handler1,
            'event2': handler2,
            'event3': handler3
        });

        host.on(/event[12]/, patternSubscriber);

        // pattern subscriber will be included
        var event1_Subscribers = host.getListeners('event1');

            assert.deepEqual(event1_Subscribers, [
                { subscriber: handler1, context: host },
                { subscriber: patternSubscriber, context: host }
            ]);
        
        // pattern subscriber will NOT be included
        var event1_Subscribers = host.getListeners('event1', false);

            assert.deepEqual(event1_Subscribers, [{ subscriber: handler1, context: host }]);
    });


    it('should subscribe/unsubscribe/dispatch messages for subscribers with context', function(done) {
        var result = getHostWithMessenger()
            , host = result.host
            , messenger = result.messenger
            , myContext = {}
            , posted = {};

        function localHandler(message, data) {
            assert.equal(this, myContext, 'should pass correct context');
            posted[message] = data;
        }

        host.on('event', { subscriber: localHandler, context: myContext });
        host.on('event', handler1);
            var subscribers = host.getListeners('event');

            assert.deepEqual(subscribers, [
                { subscriber: localHandler, context: myContext },
                { subscriber: handler1, context: host }
            ]);

        host.post('event', { test: 1 });

        _.defer(function() {
            assert.deepEqual(posted, { 'event': { test: 1 } });

            host.off('event', { subscriber: localHandler, context: myContext });
                var subscribers = host.getListeners('event');
                assert.deepEqual(subscribers, [{ subscriber: handler1, context: host }], 'should have 1 subscribers');

            done();
        });
    });


    it('should define once method to subscribe to message that will be dispatched only once', function(done) {
        var result = getHostWithMessenger()
            , host = result.host
            , messenger = result.messenger
            , posted = [];

        function localHandler(msg, data) {
            assert.equal(this, host);
            posted.push({ msg: msg, data: data });
        }

        host.once('event', localHandler);
        host.post('event', { test: 1 });
        host.post('event', { test: 2 });

        _.defer(function() {
            assert.deepEqual(posted, [{ msg: 'event', data: { test: 1 } }]);
            done();
        });
    });


    it('should define onSync and postMessageSync methods to subscribe/dispatch synchronously', function() {
        var result = getHostWithMessenger()
            , host = result.host
            , messenger = result.messenger
            , myContext = {}
            , posted = [];

        function localHandler(msg, data) {
            assert.equal(this, host);
            posted.push({ msg: msg, data: data });
        }

        host.onSync('event', localHandler);
        host.post('event', { test: 1 });

        assert.deepEqual(posted, [{ msg: 'event', data: { test: 1 } }]);

        posted = [];
        host.on('event2', localHandler);
        host.postMessageSync('event2', { test: 2 });

        assert.deepEqual(posted, [{ msg: 'event2', data: { test: 2 } }]);
    });


    it('should define onAsync method to subscribe asynchronously even if dispatch is synchronous', function(done) {
        var result = getHostWithMessenger()
            , host = result.host
            , messenger = result.messenger
            , posted = [];

        function localHandler(msg, data) {
            assert.equal(this, host);
            posted.push({ msg: msg, data: data });
        }

        host.onAsync('event', localHandler);
        host.postMessageSync('event', { test: 1 });

        assert.deepEqual(posted, []);

        _.defer(function() {
            assert.deepEqual(posted, [{ msg: 'event', data: { test: 1 } }]);
            done();
        });
    });
};
