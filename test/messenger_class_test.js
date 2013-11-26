'use strict';

var Messenger = require('../lib/messenger_class.js')
	, _ = require('mol-proto')
	, check = require('../lib/check')
	, Match = check.Match
	, assert = require('assert');

describe('Messenger class', function() {
    function getHostWithMessenger() {
        var host = {};
        var messenger = new Messenger(host, {
            init: 'init',
            on: 'on',
            off: 'off',
            onEvents: 'onMessages',
            offEvents: 'offMessages',
            post: 'postMessage',
            getListeners: 'getSubscribers'
        });
        return {host: host, messenger: messenger};
    }
    function getHostWithMessengerFail() {
        var HostFail = function(){};
        HostFail.prototype.on = function(){/*Fails*/};
        var hostFail = new HostFail();
        var messenger = new Messenger(hostFail, {init: 'init', on: 'on', off: 'off'});
        return hostFail;
    }

    var handler1 = function(){ }
    , handler2 = function(){ }
    , handler3 = function(){ };
	
	beforeEach(function() {
		
	});

    it('should create a new Messenger object on host object', function() {
        assert.doesNotThrow(function() {
            var host = getHostWithMessenger().host;
        }, 'create new messenger on host object');
        assert.throws(function() {
            var hostFail = getHostWithMessengerFail();
        }, 'create fails as proxy method already exists');
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

    it('should define on method', function() {
    	var result = getHostWithMessenger()
            , host = result.host
            , messenger = result.messenger
            , handler1 = function(){ }
            , handler2 = function(){ };

        assert(host.on('event1 event2', handler1), 'subscribe with string');
        assert(Match.test(messenger._messageSubscribers, {event1: [Function], event2: [Function]}),
                '_messageSubscribers hash has events');
        assert.equal( host.on('event1 event2', handler1), false, 'subscribe with string the second time');
        assert(host.on(/event1/, handler1), 'subscribe with regex');
        assert(Match.test(messenger._patternMessageSubscribers, {'/event1/': [Function]}),
                '_patternMessageSubscribers hash has events');
        assert.equal(host.on(/event1/, handler1), false, 'subscribe with regex a second time');
        assert(host.on(['event1', 'event3'], handler2), 'subscribe with array');
        assert.equal(host.on(['event3'], handler2), false, 'subscribe with array a second time');
        assert.equal(messenger._messageSubscribers.event1.length, 2, 'there are 2 subscribers for event 1');
        assert(Match.test(messenger._messageSubscribers, {event1: [Function], event2: [Function], event3: [Function]}),
                '_messageSubscribers hash has events');
    });

    it('should define off method', function() {
        var result = getHostWithMessenger()
            , host = result.host
            , messenger = result.messenger;

        host.on('event1 event2 event3', handler1);
        host.on('event2 event3 event4', handler2);
        host.on(['event1', 'event3', 'event5'], handler3);
        host.on(/test1/, handler1);
        host.on(/test1|test2/, handler2);

        assert(host.off('event2'), 'events removed from event2');
        assert(Match.test(messenger._messageSubscribers.event2, undefined), 'event2 property is undefined');
        assert.equal(host.off('event2'), false, 'events removed from event2 second time');

        assert(host.off('event3', handler3), 'handler3 removed from event3');
        assert.equal(messenger._messageSubscribers.event3.length, 2, 'event3 has 2 subscribers');
        assert.equal(host.off('event99'), false, 'event99 does not exist');

        assert.equal(host.off(['event1', 'event3'], handler1), true, 'handler1 removed from event1 and event3 with array');
        assert.equal(messenger._messageSubscribers.event1.length, 1, 'event1 has 1 subscriber');
        assert.equal(messenger._messageSubscribers.event3.length, 1, 'event3 has 1 subscriber');
        assert(host.off('event3', handler2), 'handler2 removed from event3');
        assert(Match.test(messenger._messageSubscribers.event3, undefined), 'event3 is undefined');
        
        assert(host.off(/test1/), 'remove pattern subscriber');
        assert(Match.test(messenger._patternMessageSubscribers['/test1/'], undefined), 'pattern event is undefined');
    });

    it('should define onEvents method', function() {
    	var result = getHostWithMessenger()
            , host = result.host
            , messenger = result.messenger
            , events = {
                'event1': handler1,
                'event1 event2': handler2,
                'event3': handler3
            };
        assert(host.onEvents(events), 'add subscribers with events hash');
    });

    it.skip('should define offEvents method', function() {
    	
    });

    it.skip('should define post method', function() {
        
    });

    it.skip('should define getListeners method', function() {
        
    });

    it.skip('should define _chooseSubscribersHash method on messenger', function() {
        //assert(Match.test(messenger._chooseSubscribersHash, Function), 
        //    '_chooseSubscribersHash method of messenger');
    });
});
