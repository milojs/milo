'use strict';

var Connector = require('./model/connector')
	, Messenger = require('./messenger')
	, _ = require('mol-proto')
	, logger = require('./util/logger');


module.exports = minder;


/**
 * This function creates one or many Connector objects that
 * create live reactive connection between objects implementing
 * dataSource interface:
 * Objects should emit messages when any part of their data changes,
 * methods `on` and `off` should be implemented to subscribe/unsubscribe
 * to change notification messages, methods `set` and `get` should be implemented to get/set data
 * on path objects, pointing to particular parts of the object, method `path`
 * should return path object for a given path string (see path utils for path string syntax).
 * Both Model and Data facet are such data sources, they can be linked by Connector object.
 *
 * @param {Object} ds1 the first data source. Instead of the first data source an array can be passed with arrays of Connection objects parameters in each array element.
 * @param {String} mode the connection mode that defines the direction and the depth of connection. Possible values are '->', '<<-', '<<<->>>', etc.
 * @param {Object} ds2 the second data source
 * @param {Object} options not implemented yet
 */
function minder(ds1, mode, ds2, options) {
	if (Array.isArray(ds1)) {
		var connDescriptions = ds1;
		var connectors = connDescriptions.map(function(descr) {
			return new Connector(descr[0], descr[1], descr[2], descr[3]);
		});
		connectors.forEach(_addConnector);
		return connectors;
	} else {
		var cnct = new Connector(ds1, mode, ds2, options);
		_addConnector(cnct);
		return cnct;
	}
}


/**
 * messenger of minder where it emits events related to all connectors
 * @type {Messenger}
 */
var _messenger = new Messenger(minder, Messenger.defaultMethods);


var _connectors = []
	, _receivedMessages = []
	, _idleCheckDeferred = false;


_.extend(minder, {
	getConnectors: minder_getConnectors,
	destroyConnector: minder_destroyConnector
});


function _addConnector(cnct) {
	cnct.___minder_id = _connectors.push(cnct) - 1;
	cnct.on(/.*/, onConnectorMessage);
	minder.postMessage('added', { connector: cnct });
	minder.postMessage('turnedon', { connector: cnct });
}


function onConnectorMessage(msg, data) {
	var data = data ? _.clone(data) : {};
	_.extend(data, {
		id: this.___minder_id,
		connector: this
	});
	minder.postMessage(msg, data);
	if (! _receivedMessages.length && ! _idleCheckDeferred) {
		_.defer(_idleCheck);
		_idleCheckDeferred = true;
	}

	_receivedMessages.push({ msg: msg, data: data });
}


function _idleCheck() {
	if (_receivedMessages.length) {
		_receivedMessages.length = 0;
		_.defer(_idleCheck);
		minder.postMessage('propagationticked');
	} else {
		_idleCheckDeferred = false;
		minder.postMessage('propagationcompleted');
	}
}


function minder_getConnectors() {
	return _connectors;
}


function minder_destroyConnector(cnct) {
	cnct.destroy();
	var index = _connectors.indexOf(cnct);
	if (index >= 0)
		delete _connectors[index];
	else
		logger.warn('minder: connector destroyed that is not registered in minder');
}
