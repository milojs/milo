'use strict';

var ConnectorError = require('../util/error').Connector
    , Messenger = require('../messenger')
    , pathUtils = require('./path_utils')
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
 *
 * ####Events####
 *
 * - 'turnedon' - connector was turned on
 * - 'turnedoff' - connector was turned off
 * - 'changestarted' - change on connected datasource is started
 * - 'changecompleted' - change on connected datasource is completed
 * - 'destroyed' - connector was destroyed
 * 
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
        isOn: false,
        _changesQueue1: [],
        _changesQueue2: [],
        _messenger: new Messenger(this, Messenger.defaultMethods)
    });

    if (options) {
        this.options = options;

        var pathTranslation = options.pathTranslation;
        if (pathTranslation)
            _.extend(this, {
                pathTranslation1: reverseTranslationRules(pathTranslation),
                pathTranslation2: pathTranslation
            });

        var dataTranslation = options.dataTranslation;
        if (dataTranslation)
            _.extend(this, {
                dataTranslation1: dataTranslation['<-'],
                dataTranslation2: dataTranslation['->']
            });

        var dataValidation = options.dataValidation;
        if (dataValidation)
            _.extend(this, {
                dataValidation1: dataValidation['<-'],
                dataValidation2: dataValidation['->']
            });
    }

    this.turnOn();

    function modeParseError() {
        throw new ConnectorError('invalid Connector mode: ' + mode);
    }
}


_.extendProto(Connector, {
    turnOn: Connector$turnOn,
    turnOff: Connector$turnOff,
    destroy: Connector$destroy
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
function Connector$turnOn() {
    if (this.isOn)
        return logger.warn('data sources are already connected');

    var subscriptionPath = this._subscriptionPath =
        new Array(this.depth1 || this.depth2).join('*');

    var subscriptionPattern = pathUtils.createRegexPath(subscriptionPath);

    var self = this;
    if (this.depth1)
        this._link1 = linkDataSource('_link2', this.ds2, this.ds1, this._changesQueue1, this.pathTranslation1, this.dataTranslation1, this.dataValidation1);
    if (this.depth2)
        this._link2 = linkDataSource('_link1', this.ds1, this.ds2, this._changesQueue2, this.pathTranslation2, this.dataTranslation2, this.dataValidation2);

    this.isOn = true;
    this.postMessage('turnedon');


    function linkDataSource(reverseLink, fromDS, toDS, changesQueue, pathTranslation, dataTranslation, dataValidation) {
        fromDS.onSync('datachanges', onData);
        return onData;

        function onData(message, batch) {
            var sendData = {
                changes: [],
                transaction: batch.transaction
            }

            batch.changes.forEach(function(change) {
                var sourcePath = change.path
                    , targetPath = translatePath(sourcePath);

                if (typeof targetPath == 'undefined') return;

                var change = _.clone(change);
                _.extend(change, {
                    source: fromDS,
                    path: targetPath
                });

                translateData(sourcePath, change);
                validateData(sourcePath, change);
            });

            if (! changesQueue.length)
                _.defer(postChangeData);

            changesQueue.push(sendData);


            function translatePath(sourcePath) {
                if (pathTranslation) {
                    var translatedPath = pathTranslation[sourcePath];
                    if (! translatedPath) return;
                } else if (! ((subscriptionPattern instanceof RegExp
                                 && subscriptionPattern.test(sourcePath))
                              || subscriptionPattern == sourcePath)) return;

                return translatedPath || sourcePath;
            }


            function translateData(sourcePath, change) {
                if (dataTranslation) {
                    var translate = dataTranslation[sourcePath];
                    if (translate && typeof translate == 'function') {
                        change.oldValue = translate(change.oldValue);
                        change.newValue = translate(change.newValue);
                    }
                }
            }

             
            function validateData(sourcePath, change) {
                if (dataValidation) {
                    var validators = dataValidation[sourcePath]
                        , passedCount = 0
                        , alreadyFailed = false;

                    if (validators)
                        validators.forEach(callValidator);
                    else
                        propagateData(change);
                } else
                    propagateData(change);


                function callValidator(validator) {
                    validator(change.newValue, function(err, response) {
                        response.path = sourcePath;
                        if (! alreadyFailed && (err || response.valid) && ++passedCount == validators.length) {
                            propagateData(change);
                            fromDS.postMessage('validated', response);
                        } else if (! response.valid) {
                            alreadyFailed = true;
                            fromDS.postMessage('validated', response);
                        }
                    });
                }
            }


            function propagateData(change) {
                sendData.changes.push(change);
            }


            function postChangeData() {
                // prevent endless loop of updates for 2-way connection
                if (self[reverseLink]) var callback = subscriptionSwitch;

                var transactions = mergeTransactions(changesQueue);
                changesQueue.length = 0;
                transactions.forEach(function(transaction) {
                    // send data change instruction as message
                    toDS.postMessageSync('changedata', { changes: transaction }, callback);
                });
            }


            function subscriptionSwitch(err, changeFinished) {
                if (err) return;
                var onOff = changeFinished ? 'onSync' : 'off';
                toDS[onOff]('datachanges', self[reverseLink]);

                var message = changeFinished ? 'changecompleted' : 'changestarted';
                self.postMessage(message, { source: fromDS, target: toDS });
            }


            function mergeTransactions(batches) {
                var transactions = []
                    , currentTransaction;

                batches.forEach(function(batch) {
                    if (! batch.transaction) currentTransaction = undefined;
                    if (! batch.changes.length) return;

                    if (batch.transaction) {
                        if (currentTransaction)
                            _.appendArray(currentTransaction, batch.changes);
                        else {
                            currentTransaction = _.clone(batch.changes);
                            transactions.push(currentTransaction);
                        }
                    } else
                        transactions.push(batch.changes);
                });

                return transactions;
            }
        }
    }
}


/**
 * turnOff
 * Method of Connector that disables connection (if it was previously enabled)
 */
function Connector$turnOff() {
    if (! this.isOn)
        return logger.warn('data sources are already disconnected');

    var self = this;
    unlinkDataSource(this.ds1, '_link2', this.pathTranslation2);
    unlinkDataSource(this.ds2, '_link1', this.pathTranslation1);

    this.isOn = false;
    this.postMessage('turnedoff');


    function unlinkDataSource(fromDS, linkName, pathTranslation) {
        if (self[linkName]) {
            fromDS.off('datachanges', self[linkName]);
            delete self[linkName];
        }
    }
}


/**
 * Destroys connector object by turning it off and removing references to connected sources
 */
function Connector$destroy() {
    this.turnOff();
    this.postMessage('destroyed');
    this._messenger.destroy();
    delete this.ds1;
    delete this.ds2;
}
