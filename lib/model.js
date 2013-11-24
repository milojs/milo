'use strict';

var DataFacet = require('./components/c_facets/Data')
	, messengerMixin = require('./components/messenger')
	, _ = require('proto');

module.exports = Model;


function Model() {
	this.data = {};
}


_.extendProto(Model, {
	observe: observeProperty
	unobserve: unobserveProperty
});

_.extendProto(Model, messengerMixin);


function observeProperty(property) {
	check(property, Match.Optional(String));

	var data = property ? this.data[property] : this.data
		, self = this

	if (property) {
		var data = this.data[property];
		var message = 'data.' + property;
	} else {
		data = this.data;
		var message = 'data';
	}

	check(data, Object);

	Object.observe(data, function() {
		self.postMessage('data' + (property ? '.' : ''), data);
	});
}

