// <a name="minder"></a>
// milo.minder
// -----------

// This module will be used to create and manage reactive connections between 
// components and models (and, potentially, other models).

// It is not developed yet.

'use strict';

var Connector = require('./model/connector');


module.exports = minder;


// can accept array pf arrays to set up many
function minder(ds1, mode, ds2, options) {
	if (Array.isArray(ds1)) {
		var connDescriptions = ds1;
		var connectors = connDescriptions.map(function(descr) {
			return new Connector(descr[0], descr[1], descr[2], descr[3]);
		});
	} else
		return new Connector(ds1, mode, ds2, options);
}
