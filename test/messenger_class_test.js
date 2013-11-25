'use strict';

var Messenger = require('../lib/messenger_class.js')
	, _ = require('mol-proto')
	, check = require('../lib/check')
	, Match = check.Match
	, assert = require('assert');

describe('Messenger class', function() {
	var hostInstance = new (function() {
		this.name = 'test';
	})();

	var messenger = new Messenger(hostInstance, /*undefined,*/{
		on: 'on',
		off: 'off',
		onEvents: 'onMessages',
		offEvents: 'offMessages',
		getListeners: 'getSubscribers'
	});


	beforeEach(function() {
		
	});

    it('should define on method', function() {
    	assert(Match.test(hostInstance.on, Function), 'on method');
    });

    it('should define off method', function() {
    	assert(Match.test(hostInstance.off, Function), 'off method');
    });

    it('should define onEvents method', function() {
    	assert(Match.test(hostInstance.onEvents, Function), 'onEvents method');
    });

    it('should define offEvents method', function() {
    	assert(Match.test(hostInstance.offEvents, Function), 'offEvents method');
    });

    it.skip('should define postMessage method', function() {

    });

    it.skip('should define getMessageSubscribers method', function() {

    });

    it.skip('should define _chooseSubscribersHash method', function() {

    });
});
