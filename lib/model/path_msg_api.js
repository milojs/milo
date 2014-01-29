'use strict';

var MessengerAPI = require('../messenger/m_api')
	, pathUtils = require('./path_utils')
	, logger = require('../util/logger')
	, _ = require('mol-proto');


/**
 * Subclass of MessengerAPI that is used to translate messages of Messenger on ModelPath to Messenger on Model.
 */
var ModelPathMsgAPI = _.createSubclass(MessengerAPI, 'ModelPathMsgAPI');

module.exports = ModelPathMsgAPI;


/**
 * ####ModelPathMsgAPI instance methods####
 *
 * - [init](#init) - initializes ModelPathMsgAPI
 * - [translateToSourceMessage](#translateToSourceMessage) - translates relative access paths of ModelPath to full path of Model
 * - [createInternalData](#createInternalData) - changes path in message on model to relative path and adds `fullPath` property to message data
 */
_.extendProto(ModelPathMsgAPI, {
	init: init,
	translateToSourceMessage: translateToSourceMessage,
	createInternalData: createInternalData,
});


/**
 * ModelPathMsgAPI instance method
 * Called by MessengerAPI constructor.
 *
 * @param {String} rootPath root path of model path
 */
function init(rootPath) {
	MessengerAPI.prototype.init.apply(this, arguments);
	this.rootPath = rootPath;
}

/**
 * ModelPathMsgAPI instance method
 * Translates relative access paths of ModelPath to full path of Model.
 *
 * @param {String} accessPath relative access path to be translated
 * @return {String}
 */
function translateToSourceMessage(message) {
	// TODO should prepend RegExes
	// TODO should not prepend something that is not a path???
	if (message instanceof RegExp) return message;
	return this.rootPath + message;
}


/**
 * ModelPathMsgAPI instance method
 * Changes path in message on model to relative path and adds `fullPath` property to message data.
 *
 * @param {String} fullSourceAccessPath full access path on Model
 * @param {String} accessPath relative access path on ModelPath
 * @param {Object} sourceData data received from Model, will be translated as described to be dispatched to ModelPath
 * @return {Object}
 */
function createInternalData(fullSourceAccessPath, accessPath, sourceData) {
	var internalData = _.clone(sourceData);
	var fullPath = internalData.path;
	internalData.fullPath = fullPath;
	if (fullPath.indexOf(this.rootPath) == 0)
		internalData.path = fullPath.replace(this.rootPath, '');
	else
		logger.warn('ModelPath message dispatched with wrong root path');

	return internalData;
}
