'use strict';

var Messenger = require('../../lib/messenger')
    , messengerTests = require('./messenger')
    , assert = require('assert');

describe('Messenger class', function() {
    function getHostWithMessenger() {
        var host = {};
        var messenger = new Messenger(host, {
            init: 'init',
            on: 'on',
            once: 'once',
            onSync: 'onSync',
            onAsync: 'onAsync',
            off: 'off',
            onEvents: 'onMessages',
            offEvents: 'offMessages',
            post: 'postMessage',
            postMessageSync: 'postMessageSync',
            getListeners: 'getSubscribers'
        });
        return {host: host, messenger: messenger};
    }


    messengerTests(getHostWithMessenger);


    function getHostWithMessengerFail() {
        var HostFail = function(){};
        HostFail.prototype.on = function(){/*Fails*/};
        var hostFail = new HostFail();
        var messenger = new Messenger(hostFail, {init: 'init', on: 'onMessage', off: 'offMessage'});
        return hostFail;
    }

    it('should fail to create a new Messenger object on host object', function() {
        assert.throws(function() {
            var hostFail = getHostWithMessengerFail();
        }, 'create fails as proxy method already exists');
    });
});
