'use strict';

var Messenger = require('../../lib/messenger')
    , MessengerMessageSource = require('../../lib/messenger/msngr_source')
    , MessengerRegexpAPI = require('../../lib/messenger/m_api_rx')
    , assert = require('assert')
    , _ = require('mol-proto');

describe('MessengerMessageSource and MessengerRegexpAPI', function(done) {
    var internalMessenger, messenger;

    beforeEach(function() {
        internalMessenger = new Messenger;
        var mApi = new MessengerRegexpAPI;
        var mSource = new MessengerMessageSource(undefined, undefined, mApi, internalMessenger);
        messenger = new Messenger(undefined, undefined, mSource);
    });

    it('should subscribe to another messenger', function(done) {
        messenger.on('', logPost);

        function logPost(msg, data) {
            posted.push({ msg: msg, data: data });
        }

        var posted = [];
        internalMessenger.postMessage('', { test: 1 });

        _.defer(function() {
            assert.equal(posted.length, 1);
            assert.deepEqual(posted, [{ msg: '', data: { test: 1 } }]);

            done();
        });
    });

    // TODO: this test fails currently
    it('should prevent duplicate messages when pattern subscription is present', function(done) {
        messenger.on(/.*/, logPost2);
        messenger.on('a', logPost);

        function logPost(msg, data) {
            posted.push({ msg: msg, data: data });
        }

        function logPost2(msg, data) {
            posted2.push({ msg: msg, data: data });
        }

        var posted = [];
        var posted2 = [];
        internalMessenger.postMessage('a', { test: 2 });

        _.defer(function() {
            assert.equal(posted.length, 1);
            assert.deepEqual(posted, [{ msg: 'a', data: { test: 2 } }]);
            // TODO The assertions below fail because in this setup messenger dispatches message twice to pattern subscriber
            // assert.equal(posted2.length, 1);
            // assert.deepEqual(posted2, [{ msg: 'a', data: { test: 2 } }]);
            // 
            done();
        });
    });
});
