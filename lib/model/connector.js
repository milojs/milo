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

	var pathTranslation = options && options.pathTranslation;
	if (pathTranslation)
		_.extend(this, {
			pathTranslation1: reverseTranslationRules(pathTranslation),
			pathTranslation2: pathTranslation
		});

	this.turnOn();

	function modeParseError() {
		throw new ConnectorError('invalid Connector mode: ' + mode);
	}
}


_.extendProto(Connector, {
	turnOn: turnOn,
	turnOff: turnOff
});


/**
 * Function that reverses translation rules for paths of connected odata sources
 *
 * @param {Object[String]} rules map of paths defining the translation rules
 * @return {Object[String]}
 */
function reverseTranslationRules(rules) {
	var reverseRules = {};
	_.eachKey(rules, function(path2_value, path1_key) {
		reverseRules[path2_value] = path1_key;
	});
	return reverseRules;
}


/**
 * turnOn
 * Method of Connector that enables connection (if it was previously disabled)
 */
function turnOn() {
	if (this.isOn)
		return logger.warn('data sources are already connected');

	var subscriptionPath = this._subscriptionPath =
		new Array(this.depth1 || this.depth2).join('*');

	var self = this;
	if (this.depth1)
		linkDataSource('_link1', '_link2', this.ds1, this.ds2, subscriptionPath, this.pathTranslation1);
	if (this.depth2)
		linkDataSource('_link2', '_link1',  this.ds2, this.ds1, subscriptionPath, this.pathTranslation2);

	this.isOn = true;


	function linkDataSource(linkName, stopLink, linkToDS, linkedDS, subscriptionPath, pathTranslation) {
		var onData = function onData(message, data) {
			// prevent endless loop of updates for 2-way connection
			if (self[stopLink]) {
				linkToDS.on('changedatastarted', stopSubscription);
				linkToDS.on('changedatafinished', startSubscription);
			}

			// translated
			if (pathTranslation) {
				data = _.clone(data);
				var translatedPath = pathTranslation[data.path];
				if (translatedPath)
					data.path = translatedPath;
			}

			// send data change instruction as message
			linkToDS.postMessage('changedata', data);


			function stopSubscription() {
				linkToDS.off(subscriptionPath, self[stopLink]);
			}

			function startSubscription() {
				linkToDS.off('changedatastarted', stopSubscription);
				linkToDS.off('changedatafinished', startSubscription);
				linkToDS.on(subscriptionPath, self[stopLink]);
			}
		};

		linkedDS.on(subscriptionPath, onData);

		self[linkName] = onData;
		return onData;
	}
}


/**
 * turnOff
 * Method of Connector that disables connection (if it was previously enabled)
 */
function turnOff() {
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
