'use strict';

var MessengerAPI = require('../messenger/m_api')
	, _ = require('mol-proto');


/**
 * Subclass of MessengerAPI that is used to translate messages of Messenger on ModelPath to Messenger on Model.
 */
var ModelMsgAPI = _.createSubclass(MessengerAPI, 'ModelMsgAPI');

module.exports = ModelMsgAPI;


/**
 * ####ModelMsgAPI instance methods####
 *
 * - [init](#init) - initializes MessengerAPI
 * - [translateToSourceMessage](#translateToSourceMessage) - converts internal message type to source (external) message type
 * - [createInternalData](#createInternalData) - converts source message data received via MessageSource to internal message data
 * - [filterSourceMessage](#filterSourceMessage) - filters source message based on the data of the message and the corresponding internal message that is about to be sent on Messenger
 */
_.extendProto(ModelMsgAPI, {
	init: init,
	translateToSourceMessage: translateToSourceMessage,
	createInternalData: createInternalData,
});


/**
 * ModelMsgAPI instance method
 * Called by MessengerAPI constructor.
 */
function init(rootPath) {
	MessengerAPI.prototype.init.apply(this, arguments);
	this.rootPath = rootPath;
}

/**
 * ModelMsgAPI instance method
 * Translates relative access paths of ModelPath to full path of Model.
 *
 * @param {String} accessPath relative access path to be translated
 * @return {String}
 */
function translateToSourceMessage(accessPath) {
	if (accessPath instanceof RegExp) return accessPath;
	return this.rootPath + accessPath;
}


/**
 * ModelMsgAPI instance method
 * Changes path in message on model to relative path and adds `fullPath` property to message data.
 *
 * @param {String} fullSourceAccessPath full access path on Model
 * @param {String} accessPath relative access path on ModelPath
 * @param {Object} sourceData data received from Model, will be translated as described to be dispatched to ModelPath
 * @return {Object}
 */
function createInternalData(fullSourceAccessPath, accessPath, sourceData) {
	var internalData = _.clone(sourceData);
	internalData.fullPath = fullSourceAccessPath;
	internalData.path = accessPath;
	return internalData;
}
