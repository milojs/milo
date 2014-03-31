'use strict';

var pathUtils = require('../path_utils')
    , modelUtils = require('../model_utils')
    , logger = require('../../util/logger')
    , miloCount = require('../../util/count')
    , fs = require('fs')
    , doT = require('dot')
    , _ = require('mol-proto')
    , changeDataHandler = require('../change_data')
    , getTransactionFlag = changeDataHandler.getTransactionFlag
    , postTransactionFinished = changeDataHandler.postTransactionFinished;


/**
 * Templates to synthesize model getters and setters
 */
var templates = {
    get: fs.readFileSync(__dirname + '/getter.dot.js'),
    set: fs.readFileSync(__dirname + '/setter.dot.js'),
    del: fs.readFileSync(__dirname + '/delete.dot.js'),
    splice: fs.readFileSync(__dirname + '/splice.dot.js')
};

var include_defines = fs.readFileSync(__dirname + '/defines.dot.js')
    , include_create_tree = fs.readFileSync(__dirname + '/create_tree.dot.js')
    , include_traverse_tree = fs.readFileSync(__dirname + '/traverse_tree.dot.js');

var dotDef = {
    include_defines: include_defines,
    include_create_tree: include_create_tree,
    include_traverse_tree: include_traverse_tree,
    getPathNodeKey: pathUtils.getPathNodeKey,
    modelAccessPrefix: 'this._model._data',
    modelPostMessageCode: 'this._model._internalMessenger.postMessage',
    modelPostBatchCode: 'this._model.postMessageSync',
    internalMessenger: 'this._model._internalMessenger'
};

var modelDotDef = _(dotDef).clone().extend({
    modelAccessPrefix: 'this._data',
    modelPostMessageCode: 'this._internalMessenger.postMessage',
    modelPostBatchCode: 'this.postMessageSync',
    internalMessenger: 'this._internalMessenger'
})._();


var dotSettings = _.clone(doT.templateSettings)
dotSettings.strip = false;

var synthesizers = _.mapKeys(templates, function(tmpl) {
    return doT.template(tmpl, dotSettings, dotDef); 
});


var modelSynthesizers = _.mapToObject(['set', 'del', 'splice'], function(methodName) {
    return doT.template(templates[methodName], dotSettings, modelDotDef);
});


/**
 * Function that synthesizes accessor methods.
 * Function is memoized so accessors are cached (up to 1000).
 *
 * @param {String} path Model/ModelPath access path
 * @param {Array} parsedPath array of path nodes
 * @return {Object[Function]}
 */
var synthesizePathMethods = _.memoize(_synthesizePathMethods, undefined, 1000);

function _synthesizePathMethods(path, parsedPath) {
    var methods = _.mapKeys(synthesizers, function(synthszr) {
        return _synthesize(synthszr, path, parsedPath)
    });
    return methods;
}


var normalizeSpliceIndex = modelUtils.normalizeSpliceIndex; // used in splice.dot.js


function _synthesize(synthesizer, path, parsedPath) {
    var method
        , methodCode = synthesizer({
            parsedPath: parsedPath,
            getPathNodeKey: pathUtils.getPathNodeKey
        });

    try {
        eval(methodCode);
    } catch (e) {
        throw ModelError('ModelPath method compilation error; path: ' + path + ', code: ' + methodCode);
    }

    return method;


    // functions used by methods `set`, `delete` and `splice` (synthesized by template)
    function addChangeMessage(messages, messagesHash, msg) {
        messages.push(msg);
        messagesHash[msg.path] = msg;
    }

    function addTreeChangesMessages(messages, messagesHash, rootPath, oldValue, newValue) {
        var oldIsTree = valueIsTree(oldValue)
            , newIsTree = valueIsTree(newValue);

        if (newIsTree)
            addMessages(messages, messagesHash, rootPath, newValue, 'added', 'newValue');
        
        if (oldIsTree)
            addMessages(messages, messagesHash, rootPath, oldValue, 'removed', 'oldValue');
    }

    function addMessages(messages, messagesHash, rootPath, obj, msgType, valueProp) {
        _addMessages(rootPath, obj);


        function _addMessages(rootPath, obj) {
            if (Array.isArray(obj)) {
                var pathSyntax = rootPath + '[$$]';
                obj.forEach(function(value, index) {
                    addMessage(value, index, pathSyntax);
                });
            } else {
                var pathSyntax = rootPath + '.$$';
                _.eachKey(obj, function(value, key) {
                    addMessage(value, key, pathSyntax);
                });
            }
        }

        function addMessage(value, key, pathSyntax) {
            var path = pathSyntax.replace('$$', key)
                , existingMsg = messagesHash[path];

            if (existingMsg) {
                if (existingMsg.type == msgType)
                    logger.error('setter error: same message type posted on the same path')
                else {
                    existingMsg.type = 'changed';
                    existingMsg[valueProp] = value;
                }
            } else {
                var msg = { path: path, type: msgType };
                msg[valueProp] = value;
                addChangeMessage(messages, messagesHash, msg)
            }

            if (valueIsTree(value))
                _addMessages(path, value);
        }
    }

    function cloneTree(value) {
        return ! valueIsNormalObject(value)
                ? value
                : Array.isArray(value)
                    ? value.slice()
                    : _.clone(value);
    }

    function protectValue(value) {
        return ! valueIsNormalObject(value)
                ? value
                : Array.isArray(value)
                    ? value.slice()
                    : Object.create(value);
    }

    function valueIsTree(value) {
        return valueIsNormalObject(value)
                && Object.keys(value).length;
    }

    function valueIsNormalObject(value) {
        return value != null
                && typeof value == "object"
                && ! (value instanceof Date)
                && ! (value instanceof RegExp);
    }

    function addBatchIdsToMessage(msg, batchId, msgId) {
        _.defineProperties(msg, {
            __batch_id: batchId,
            __msg_id: msgId
        });
    }
}


/**
 * Exports `synthesize` function with the following:
 *
 * - .modelMethods.set - `set` method for Model
 * - .modelMethods.del - `del` method for Model
 * - .modelMethods.splice - `splice` method for Model
 */
module.exports = synthesizePathMethods;

var modelMethods = _.mapKeys(modelSynthesizers, function(synthesizer) {
    return _synthesize(synthesizer, '', []);
});

synthesizePathMethods.modelMethods = modelMethods;
