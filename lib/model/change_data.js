'use strict';


var logger = require('../util/logger')
    , config = require('../config')
    , _ = require('mol-proto');

/**
 * Utility function to process "changedata" messages emitted by Connector object.
 */
module.exports = changeDataHandler;


/**
 * subscriber to "changedata" event emitted by [Connector](./connector.js.html) object to enable reactive connections
 * Used by Data facet, Model and ModelPath. Can be used by any object that implements get/set/del/splice api and sets data deeply to the whole tree.
 * Object should call `changeDataHandler.initialize.call(this)` in its constructor.
 * TODO: optimize messages list to avoid setting duplicate values down the tree
 *
 * @param {String} msg should be "changedata" here
 * @param {Object} data data change desciption object}
 * @param {Function} callback callback to call when the data is processed
 */
function changeDataHandler(message, data, callback) {
    if (! this._changesQueue.length)
        _.defer(processChangesFunc, this, callback);

    this._changesQueue.push(data);
}


/**
 * Initializes messages queue used by changeDataHandler
 */
changeDataHandler.initialize = function() {
    _.defineProperty(this, '_changesQueue', []);
};


// converts _processChanges to function that passes the first parameter as the context of the original function
var processChangesFunc = Function.prototype.call.bind(_processChanges);

// map of message types to methods
var CHANGE_TYPE_TO_METHOD_MAP = {
    'added':   'set',
    'changed': 'set',
    'deleted': 'del',
    'removed': 'del'
};

/**
 * Processes queued "changedata" messages.
 * Posts "changestarted" and "changecompleted" messages and calls callback
 *
 * @param {[Function]} callback optional callback that is called with `(null, false)` parameters before change processing starts and `(null, true)` after it's finished.
 */
function _processChanges(callback) {
    callback && callback(null, false);
    this.postMessage('changestarted');

    var batches = [[]]
        , currentBatch = batches[0];

    this._changesQueue.forEach(function(data) {
        if (data.type == 'finished')
            batches.push(currentBatch = []);
        else
            currentBatch.push(data);
    });

    batches.forEach(_processChangesBatch, this);

    this._changesQueue.length = 0;

    callback && callback(null, true);
    this.postMessage('changecompleted');
}


function _processChangesBatch(batch) {
    var splicedPaths
        , changedPaths = [];

    var hadSplice
        , exitIteration = {};

    try {
        batch.forEach(function(data, index) {
            // set the new data
            if (data.type == 'splice') {
                // var parentPathChanged = changedPaths.some(function(parentPath) {
                //     var pos = data.path.indexOf(parentPath);

                //     return pos == 0 && data.path.length > parentPath.length;
                // });

                // if (parentPathChanged) {
                //     return;
                // }

                var modelPath = this.path(data.path);
                if (! modelPath) return;

                var index = data.index
                    , howMany = data.removed.length
                    , spliceArgs = [index, howMany];

                spliceArgs = spliceArgs.concat(data.newValue.slice(index, index + data.addedCount));
                modelPath.splice.apply(modelPath, spliceArgs);

                if (! config.check) throw exitIteration;
                splicedPaths = splicedPaths || [];
                splicedPaths.push(data.path);
                hadSplice = true;
            } else {
                var parentPathSpliced = splicedPaths && splicedPaths.some(function(parentPath) {
                    var pos = data.path.indexOf(parentPath);
                    return pos == 0 && data.path[parentPath.length] == '[';
                });

                if (parentPathSpliced) return;
                if (hadSplice) logger.error('child change is executed after splice; probably data source did not emit message with data.type=="finished"');

                // var parentPathChanged = changedPaths.some(function(parentPath) {
                //     var pos = data.path.indexOf(parentPath)
                //     return pos == 0 && data.path.length > parentPath.length;
                // });

                // if (parentPathChanged) return;

                changedPaths.push(data.path);

                var modelPath = this.path(data.path);
                if (! modelPath) return;

                var methodName = CHANGE_TYPE_TO_METHOD_MAP[data.type];
                if (methodName)
                    modelPath[methodName](data.newValue);
                else
                    logger.error('unknown data change type');
            }
        }, this);
    } catch (e) {
        if (e != exitIteration) throw e;
    }
}
