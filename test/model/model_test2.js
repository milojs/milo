'use strict';


var Model = require('../../lib/model')
	, assert = require('assert');


describe('Model class', function() {
	it.skip('should not dispatch duplicate messages when several "*" subscriptions are present', function() {
		var m = new Model;
		m.on('*', logPost);
		m.on('**', logPost2);

		function logPost(msg, data) {
			posted.push({ msg: msg, data: data });
		}

		function logPost2(msg, data) {
			posted2.push({ msg: msg, data: data });
		}

		var posted = [];
		var posted2 = [];

		m('.name').set('milo');
		// cnsole.log(posted, posted2);

		assert.equal(posted.length, 2);
		assert.equal(posted2.length, 2);
	});
});
