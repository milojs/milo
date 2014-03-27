'use strict';


var facetsRegistry = require('../components/c_facets/cf_registry')
    , logger = require('../util/logger')
    , config = require('../config')
    , _ = require('mol-proto');

/**
 * Utility function to process "changedata" messages emitted by Connector object.
 */
module.exports = changeDataHandler;


_.extend(changeDataHandler, {
    setTransactionFlag: setTransactionFlag,
    getTransactionFlag: getTransactionFlag,
    postTransactionFinished: postTransactionFinished
});


/**
 * Change data uses hidden property on accessor methods to pass flag that the accessor is executed as a part of change transaction.
 * Accessor methods are supposed to store this flag in a local variable and to clear it (because another accessor can be executed in or out of transaction) using `getTransactionFlag`
 *
 * @private
 * @param {Function} func accessor method reference
 * @param {Boolean} flag a flag to be set
 */
function setTransactionFlag(func, flag) {
    _.defineProperty(func, '__inChangeTransaction', flag, _.CONF | _.WRIT);
}


/**
 * Retrieves and clears transaction flag from accessor method
 *
 * @private
 * @param {Function} func accessor method reference
 * @return {Boolean}
 */
function getTransactionFlag(func) {
    var inChangeTransaction = func.__inChangeTransaction;
    delete func.__inChangeTransaction;
    return inChangeTransaction;
}


/**
 * Posts message on this to indicate the end of transaction unless `inChangeTransaction` is `true`.
 * 
 * @param  {Boolean} inChangeTransaction flag to prevent posting if inside change transaction
 */
function postTransactionFinished(inChangeTransaction) {
    if (! inChangeTransaction)
        this.postMessageSync('finished', { type: 'finished' });
}


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

var DataFacetClass;


/**
 * Processes queued "changedata" messages.
 * Posts "changestarted" and "changecompleted" messages and calls callback
 *
 * @param {[Function]} callback optional callback that is called with `(null, false)` parameters before change processing starts and `(null, true)` after it's finished.
 */
function processChanges(callback) {
    DataFacetClass = DataFacetClass || facetsRegistry.get('Data');

    notify.call(this, callback, false);
    splitToBatches(this._changesQueue, this)
        .map(validateBatch)
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
    //     logger.warn('changedata: no message with data.type=="finished" in the end of the queue', _.clone(queue), batches, { self: self });
    return batches;
}


/**
 * Checks that all messages from the batch come from the same source.
 * Hack: reverses the batch if it comes from the Data facet
 * Returns the reference to the batch (for chaining)
 * 
 * @param  {Array} batch batch of data changes
 * @return {Array} 
 */
function validateBatch(batch) {
    var source = batch[0].source
        , sameSource = true;

    if (batch.length > 1) {
        for (var i = 1, len = batch.length; i < len; i++)
            if (batch[i].source != source) {
                logger.error('changedata: changes from different sources in the same batch, sources:', batch[i].source.name, source.name);
                sameSource = false;
                source = batch[i].source;
            }

        if (sameSource && source.constructor == DataFacetClass)
            batch.reverse();
    }

    return batch;
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

        if (! config.debug) throw exitLoop;
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
    postTransactionFinished.call(this, false);


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
    setTransactionFlag(modelPath.splice, true);
    modelPath.splice.apply(modelPath, spliceArgs);
}


function executeMethod(modelPath, data) {
    var methodName = CHANGE_TYPE_TO_METHOD_MAP[data.type];
    if (methodName) {
        setTransactionFlag(modelPath[methodName], true);
        modelPath[methodName](data.newValue);
    } else
        logger.error('unknown data change type');
}
