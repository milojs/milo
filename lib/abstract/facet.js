'use strict';

// <a name="facet-c"></a>
// facet class
// --------------

var _ = require('mol-proto');

module.exports = Facet;


/**
 * 
 */
function Facet(owner, config) {
	this.name = _.firstLowerCase(this.constructor.name);
	this.owner = owner;
	this.config = config || {};
	this.init.apply(this, arguments);
}

_.extendProto(Facet, {
	init: function() {}
});
