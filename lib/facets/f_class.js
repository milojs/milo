'use strict';

var _ = require('proto');

module.exports = Facet;

function Facet(owner, options) {
	this.owner = owner;
	this.options = options;
	this.init();
}

_.extendProto(Facet, {
	init: Function(),
});
