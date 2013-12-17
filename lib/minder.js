'use strict';


var Connector = require('./model/connector');


model.exports = minder;


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
