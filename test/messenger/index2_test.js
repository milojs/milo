'use strict';

var Messenger = require('../../lib/messenger')
    , messengerTests = require('./messenger');


describe('Messenger class with methods on host class prototype', function() {
    var MESSENGER_PROPERTY = '_messenger';

    // host class
    function Host() {
        this[MESSENGER_PROPERTY] = new Messenger(this);
    }

    Messenger.useWith(Host, MESSENGER_PROPERTY, {
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


    function getHostWithMessenger() {
        var host = new Host;
        return { host: host, messenger: host[MESSENGER_PROPERTY] };
    }


    messengerTests(getHostWithMessenger);
});
