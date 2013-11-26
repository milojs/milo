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
            , messenger = result.messenger;
        var handler = function(){ };

        assert(host.on('event1 event2', handler), 'subscribe with string');
        assert(Match.test(messenger._messageSubscribers, {event1: [Function], event2: [Function]}),
                '_messageSubscribers hash has events');
        assert.equal( host.on('event1 event2', handler), false, 'subscribe with string the second time');
        assert(host.on(/event1/, handler), 'subscribe with regex');
        assert(Match.test(messenger._patternMessageSubscribers, {'/event1/': [Function]}),
                '_patternMessageSubscribers hash has events');
        assert.equal(host.on(/event1/, handler), false, 'subscribe with regex a second time');
        assert(host.on(['event1', 'event3'], handler), 'subscribe with array');
        assert.equal(host.on(['event1', 'event3'], handler), false, 'subscribe with array a second time');
    });

    it.skip('should define off method', function() {
    	
    });

    it.skip('should define onEvents method', function() {
    	
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
