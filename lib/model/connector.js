// <a name="model-connector"></a>
// ### model connector

'use strict';

var ConnectorError = require('../util/error').Connector
	, _ = require('mol-proto')
	, logger = require('../util/logger');


module.exports = Connector;


// Class that creates connector object for data connection between
// two data-sources
// Data-sources should implement the following API:
// get() - get value
// set(value) - set value
// on(path, subscriber) - subscription to data changes with "*" support
// off(path, subscriber)
// path(accessPath) - to return the object that complies with that api too


var modePattern = /^(\<*)\-+(\>*)$/;

function Connector(ds1, mode, ds2, options) {
	var parsedMode = mode.match(modePattern);

	if (! parsedMode)
		modeParseError();

	var depth1 = parsedMode[1].length
		, depth2 = parsedMode[2].length;

	if (depth1 && depth2 && depth1 != depth2)
		modeParseError();

	if (! depth1 && ! depth2)
		modeParseError();

	_.extend(this, {
		ds1: ds1,
		ds2: ds2,
		mode: mode,
		depth1: depth1,
		depth2: depth2,
		isOn: false	
	});

	this.on();

	function modeParseError() {
		throw new ConnectorError('invalid Connector mode: ' + mode);
	}
}


_.extendProto(Connector, {
	on: on,
	off: off
});


// create connection
function on() {
	if (this.isOn)
		return logger.warn('data sources are already connected');

	var subscriptionPath = this._subscriptionPath =
		new Array(this.depth1 || this.depth2).join('*');

	if (this.depth1)
		this._link1 = linkDataSource(this.ds1, this.ds2, subscriptionPath);
	if (this.depth2)
		this._link2 = linkDataSource(this.ds2, this.ds1, subscriptionPath);

	this.isOn = true;


	function linkDataSource(linkTo, linked, subscriptionPath) {
		var onData = function(path, data) {
			var dsPath = linkTo.path(path);
			if (dsPath)
				dsPath.set(data.newValue);
		};

		linked.on(subscriptionPath, onData);

		return onData;
	}
}


function off() {
	if (! this.isOn)
		return logger.warn('data sources are already disconnected');

	if (this._link1)
		this.ds2.off(this._subscriptionPath, this._link1);

	if (this._link2)
		this.ds2.off(this._subscriptionPath, this._link2);

	this.isOn = false;
}
