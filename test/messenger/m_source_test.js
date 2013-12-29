'use strict';

var MessageSource = require('../../lib/messenger/m_source')
	, Messenger = require('../../lib/messenger')
	, _ = require('mol-proto')
	, assert = require('assert');


// Messenger instance will be used as external source of messages
var MockSource;


// Subclass of MessageSource should implement at least two methods
var MyMessageSource = _.createSubclass(MessageSource, 'MyMessageSource');

_.extendProto(MyMessageSource, {
	addSourceSubscriber: addSourceSubscriber,
	removeSourceSubscriber: removeSourceSubscriber,
});


function addSourceSubscriber(message) {
	MockSource.onMessage(message, handleSourceMessage(this, message));
}

function removeSourceSubscriber(message) {
	MockSource.offMessage(message, handleSourceMessage(this, message));
}


// returns and caches functions that call dispatchMessage on the context
// because functions are cached, they can be used to unsubscribe from message
var _sourceMessages = {};
function handleSourceMessage(context, message) {
	var messageFuncs = _sourceMessages[message] =
		_sourceMessages[message] || { contexts: [], funcs: [] };

	var funcIndex = messageFuncs.contexts.indexOf(context);

	if (funcIndex >= 0)
		return messageFuncs.funcs[funcIndex];
	else {
		var func = function(sourceMessage, sourceData) {
			context.dispatchMessage(sourceMessage, sourceData)
		};
		messageFuncs.contexts.push(context);
		messageFuncs.funcs.push(func);
		return func;
	}
}


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


describe('MessageSource', function() {
	beforeEach(function() {
		MockSource = new Messenger;
		handled = {};
	});

	it('should subscribe to source when first handler subscribed to Messenger', function() {
		var myMessageSource = new MyMessageSource(host)
			, messenger = new Messenger(host, undefined, myMessageSource);

		// check that there are no subscription on source
		assert.equal(MockSource.getSubscribers('event1'), undefined);

		// subscribe to messenger
		messenger.onMessage('event1', handler1);
		assert.deepEqual(messenger.getSubscribers('event1'), [ handler1 ]);

		// check subscription on source
		assert.equal(MockSource.getSubscribers('event1').length, 1);

		// subscribe another handler to same message
		messenger.onMessage('event1', handler2);
		assert.deepEqual(messenger.getSubscribers('event1'), [ handler1, handler2 ]);

		// check subscription on source - should not change
		assert.equal(MockSource.getSubscribers('event1').length, 1);
	});


	it('should dispatch on Messenger when dispatched on source', function() {
		var myMessageSource = new MyMessageSource(host)
			, messenger = new Messenger(host, undefined, myMessageSource);

		// check that there are no subscription on source
		assert.equal(MockSource.getSubscribers('event1'), undefined);

		// subscribe to messenger, should subscribe to source
		messenger.onMessage('event1', handler1);

		// dispatch on source
		MockSource.postMessage('event1', { test: 1 });

			assert.deepEqual(handled, { event1: { handler: 1, data: { test: 1 } } });

		// subscribe to messenger another handler, should subscribe to source
		messenger.onMessage('event2', handler2);

		handled = {};

		// dispatch on source
		MockSource.postMessage('event1', { test: 1 });
		MockSource.postMessage('event2', { test: 2 });

			assert.deepEqual(handled, {
				'event1': { handler: 1, data: { test: 1 } },
				'event2': { handler: 2, data: { test: 2 } }
			});
	});


	it('should unsubscribe from source when all handlers are unsubscribed from Messenger', function() {
		var myMessageSource = new MyMessageSource(host)
			, messenger = new Messenger(host, undefined, myMessageSource);

		// check that there are no subscription on source
		assert.equal(MockSource.getSubscribers('event3'), undefined);

		// subscribe to messenger
		messenger.onMessage('event3', handler1);
		messenger.onMessage('event3', handler2);
		assert.deepEqual(messenger.getSubscribers('event3'), [ handler1, handler2 ]);

		// check subscription on source - should not change
		assert.equal(MockSource.getSubscribers('event3').length, 1);

		// unsubscribe one handler
		messenger.offMessage('event3', handler2);

		// check subscription on source - still subscribed
		assert.equal(MockSource.getSubscribers('event3').length, 1);
		assert.deepEqual(handled, {});

		// dispatch on source
		MockSource.postMessage('event3', { test: 3 });

			assert.deepEqual(handled, { event3: { handler: 1, data: { test: 3 } } });

		// unsubscribe all handlers
		messenger.offMessage('event3', handler1);

		// check subscription on source - should be unsubscribed
		assert.equal(MockSource.getSubscribers('event3'), undefined);

		handled = {};
		// dispatch on source
		MockSource.postMessage('event3', { test: 4 });

			// should not be dispatched on messenger
			assert.deepEqual(handled, {});
	});
});
