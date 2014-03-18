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
var processChangesFunc = Function.prototype.call.bind(processChanges);

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
function processChanges(callback) {
    notify.call(this, callback, false);
    var batches = splitToBatches(this._changesQueue);    
    batches.forEach(processChangesBatch, this);
    this._changesQueue.length = 0;
    notify.call(this, callback, true);
}

function notify(callback, changeFinished) {
    callback && callback(null, changeFinished);
    this.postMessage(changeFinished ? 'changecompleted' : 'changestarted');
}


function splitToBatches(queue) {
    var currentBatch = []
        , batches = [currentBatch];
    queue.forEach(function(data) {
        if (data.type == 'finished') {
            if (currentBatch.length)
                batches.push(currentBatch = []);
            else
                logger.warn('changedata: empty batch of changes');
        } else
            currentBatch.push(data);
    });
    return batches;
}

function processChangesBatch(batch) {
    var splicedPaths
        , changedPaths = []
        , hadSplice
        , exitLoop = {};

    batch = prepareAndValidateBatch(batch);

    try { batch.forEach(processChange, this); }
    catch (e) { if (e != exitLoop) throw e; }


    function processChange(data) {
        (data.type == 'splice' ? executeSplice : executeMethod)
            .call(this, data);
    }


    function executeSplice(data) {
        var parentPathChanged = changedPaths.some(function(parentPath) {
            var pos = data.path.indexOf(parentPath);
            return pos == 0 && data.path.length >= parentPath.length;
        });

        if (parentPathChanged) return;

        var modelPath = this.path(data.path);
        if (! modelPath) return;

        var index = data.index
            , howMany = data.removed.length
            , spliceArgs = [index, howMany];

        spliceArgs = spliceArgs.concat(data.newValue.slice(index, index + data.addedCount));
        modelPath.splice.apply(modelPath, spliceArgs);

        if (! config.check)
            throw exitLoop;
        splicedPaths = splicedPaths || [];
        splicedPaths.push(data.path);
        hadSplice = true;
    }


    function executeMethod(data) {
        var parentPathSpliced = splicedPaths && splicedPaths.some(function(parentPath) {
            var pos = data.path.indexOf(parentPath);
            return pos == 0 && data.path[parentPath.length] == '[';
        });

        if (parentPathSpliced) return;
        if (hadSplice) logger.error('changedata: child change is executed after splice; probably data source did not emit message with data.type=="finished"');

        var parentPathChanged = changedPaths.some(function(parentPath) {
            var pos = data.path.indexOf(parentPath);
            return pos == 0 && data.path.length > parentPath.length;
        });

        if (parentPathChanged) return;

        changedPaths.push(data.path);

        var modelPath = this.path(data.path);
        if (! modelPath) return;

        var methodName = CHANGE_TYPE_TO_METHOD_MAP[data.type];
        if (methodName)
            modelPath[methodName](data.newValue);
        else
            logger.error('unknown data change type');
    }
}


//TODO VALIDATE BATCHES
function prepareAndValidateBatch(batch) {
    return batch;
}
