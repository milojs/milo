// <a name="model-connector"></a>
// ### model connector

'use strict';

var ConnectorError = require('../util/error').Connector
	, _ = require('mol-proto')
	, logger = require('../util/logger');


module.exports = Connector;


var modePattern = /^(\<*)\-+(\>*)$/;


/**
 * Connector
 * Class that creates connector object for data connection between
 * two data-sources
 * Data-sources should implement the following API:
 * get() - get value from datasource or its path
 * set(value) - set value to datasource or to its path
 * on(path, subscriber) - subscription to data changes with "*" support
 * off(path, subscriber)
 * path(accessPath) - to return the object that gives reference to some part of datasource
 * and complies with that api too.
 * @param {Object} ds1 the first data source.
 * @param {String} mode the connection mode that defines the direction and the depth of connection. Possible values are '->', '<<-', '<<<->>>', etc.
 * @param {Object} ds2 the second data source
 * @param {Object} options not implemented yet
 * @return {Connector} when called with `new`, creates a Connector object.
 */
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


/**
 * on
 * Method of Connector that enables connection (if it was previously disabled)
 */
function on() {
	if (this.isOn)
		return logger.warn('data sources are already connected');

	var subscriptionPath = this._subscriptionPath =
		new Array(this.depth1 || this.depth2).join('*');

	var self = this;
	if (this.depth1)
		linkDataSource('_link1', '_link2', this.ds1, this.ds2, subscriptionPath);
	if (this.depth2)
		linkDataSource('_link2', '_link1',  this.ds2, this.ds1, subscriptionPath);

	this.isOn = true;


	function linkDataSource(linkName, stopLink, linkToDS, linkedDS, subscriptionPath) {
		var onData = function onData(path, data) {
			// prevents endless message loop for bi-directional connections
			if (onData.__stopLink) return;

			var dsPath = linkToDS.path(path);
			if (dsPath) {
				self[stopLink].__stopLink = true;
				dsPath.set(data.newValue);
				delete self[stopLink].__stopLink
			}
		};

		linkedDS.on(subscriptionPath, onData);

		self[linkName] = onData;
		return onData;
	}
}


/**
 * off
 * Method of Connector that disables connection (if it was previously enabled)
 */
function off() {
	if (! this.isOn)
		return logger.warn('data sources are already disconnected');

	var self = this;
	unlinkDataSource(this.ds1, '_link2');
	unlinkDataSource(this.ds2, '_link1');

	this.isOn = false;


	function unlinkDataSource(linkedDS, linkName) {
		if (self[linkName]) {
			linkedDS.off(self._subscriptionPath, self[linkName]);
			delete self[linkName];
		}
	}
}
