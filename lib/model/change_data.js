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
    splitToBatches(this._changesQueue, this)
        .map(prepareBatch)
        .forEach(processBatch, this);
    this._changesQueue.length = 0;
    notify.call(this, callback, true);
}

function notify(callback, changeFinished) {
    callback && callback(null, changeFinished);
    this.postMessage(changeFinished ? 'changecompleted' : 'changestarted');
}


function splitToBatches(queue, self) {
    var currentBatch = []
        , batches = [currentBatch];
    queue.forEach(function(data) {
        if (data.type == 'finished') {
            if (currentBatch.length)
                batches.push(currentBatch = []);
        } else
            currentBatch.push(data);
    });
    if (! currentBatch.length)
        batches.pop();
    // TODO Warning is disabled as Data facets sometimes fails to emit changedata message
    // Should be re-enabled when Data facet is fixed
    // else
    //     logger.warn('changedata: no message with data.type=="finished" in the end of the queue');
    return batches;
}


function prepareBatch(batch) {
    var todo = []
        , pathsToSplice
        , pathsToChange = []
        , hadSplice
        , exitLoop = {};


    try { batch.forEach(checkChange); }
    catch (e) { if (e != exitLoop) throw e; }

    return todo;


    function checkChange(data) {
        (data.type == 'splice' ? checkSplice : checkMethod)(data);
    }


    function checkSplice(data) {
        var parentPathChanged = pathsToChange.some(function(parentPath) {
            var pos = data.path.indexOf(parentPath);
            return pos == 0 && data.path.length >= parentPath.length;
        });

        if (parentPathChanged) return;

        todo.push(data);

        if (! config.check)
            throw exitLoop;
        pathsToSplice = pathsToSplice || [];
        pathsToSplice.push(data.path);
        hadSplice = true;
    }


    function checkMethod(data) {
        var parentPathSpliced = pathsToSplice && pathsToSplice.some(function(parentPath) {
            var pos = data.path.indexOf(parentPath);
            return pos == 0 && data.path[parentPath.length] == '[';
        });

        if (parentPathSpliced) return;
        if (hadSplice) logger.error('changedata: child change is executed after splice; probably data source did not emit message with data.type=="finished"');

        var parentPathChanged = pathsToChange.some(function(parentPath) {
            var pos = data.path.indexOf(parentPath);
            return pos == 0 && data.path.length > parentPath.length;
        });

        if (parentPathChanged) return;

        pathsToChange.push(data.path);

        todo.push(data);
    }
}


function processBatch(batch) {
    batch.forEach(processChange, this);

    function processChange(data) {
        var modelPath = this.path(data.path);
        if (! modelPath) return;
        (data.type == 'splice' ? executeSplice : executeMethod)(modelPath, data);
    }
}


function executeSplice(modelPath, data) {
    var index = data.index
        , howMany = data.removed.length
        , spliceArgs = [index, howMany];

    spliceArgs = spliceArgs.concat(data.newValue.slice(index, index + data.addedCount));
    modelPath.splice.apply(modelPath, spliceArgs);
}


function executeMethod(modelPath, data) {
    var methodName = CHANGE_TYPE_TO_METHOD_MAP[data.type];
    if (methodName)
        modelPath[methodName](data.newValue);
    else
        logger.error('unknown data change type');
}
