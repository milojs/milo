'use strict';


var Model = require('../../lib/model')
	, Connector = require('../../lib/model/connector')
	, assert = require('assert');


describe('Connector', function() {
	it('should connect two models', function(done) {
		var m1 = new Model
			, m2 = new Model
			, c = new Connector(m1, '<<->>', m2);

		m1('.info.name').set('milo');

		setTimeout(function() {
			assert.deepEqual(m2.get(), { info: { name: 'milo' } } );
			done();
		}, 10);
	});

	it('should allow path translation', function(done) {
		var m1 = new Model
			, m2 = new Model
			, c = new Connector(m1, '<<<->>>', m2, { pathTranslation: {
				'.info.name': '.myInfo.myName'
			} });

		m1('.info.name').set('milo');

		setTimeout(function() {
			assert.deepEqual(m2._data, { myInfo: { myName: 'milo' } } );

			m1._data = undefined;
			m2('.myInfo.myName').set('jason');

			setTimeout(function() {
				assert.deepEqual(m1._data, { info: { name: 'jason' } } );
				done();
			});
		}, 10);
	})
});
