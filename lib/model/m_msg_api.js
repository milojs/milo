'use strict';

var MessengerRegexpAPI = require('../messenger/m_api_rx')
    , pathUtils = require('./path_utils')
    , _ = require('mol-proto');


/**
 * Subclass of MessengerRegexpAPI that is used to translate messages of external messenger of Model to internal messenger of Model.
 */
var ModelMsgAPI = _.createSubclass(MessengerRegexpAPI, 'ModelMsgAPI');

module.exports = ModelMsgAPI;


/**
 * ####ModelMsgAPI instance methods####
 *
 * - [translateToSourceMessage](#translateToSourceMessage) - translates subscription paths with "*"s to regex, leaving other strings untouched
 */
_.extendProto(ModelMsgAPI, {
    translateToSourceMessage: translateToSourceMessage,
});


/**
 * ModelMsgAPI instance method
 * Translates subscription paths with "*"s to regex, leaving other strings untouched.
 *
 * @param {String} accessPath relative access path to be translated
 * @return {RegExp|String}
 */
function translateToSourceMessage(accessPath) {
    if (accessPath instanceof RegExp) return accessPath;

    return pathUtils.createRegexPath(accessPath);
}
