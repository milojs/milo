'use strict';

var ConnectorError = require('../util/error').Connector
    , Messenger = require('../messenger')
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

    var self = this;
    if (this.depth1)
        this._link1 = linkDataSource('_link2', this.ds1, this.ds2, subscriptionPath, this.pathTranslation1, this.pathTranslation2, this.dataTranslation1, this.dataValidation1);
    if (this.depth2)
        this._link2 = linkDataSource('_link1', this.ds2, this.ds1, subscriptionPath, this.pathTranslation2, this.pathTranslation1, this.dataTranslation2, this.dataValidation2);

    this.isOn = true;
    this.postMessage('turnedon');


    function linkDataSource(reverseLink, linkToDS, linkedDS, subscriptionPath, pathTranslation, reversePathTranslation, dataTranslation, dataValidation) {
        var onData = function onData(message, data) {
            // store untranslated path
            var sourcePath = data.path
                , data = _.clone(data);

            data.source = linkedDS;

            if (data.type == 'finished')
                return propagateData();

            // translate path
            if (pathTranslation) {
                var translatedPath = pathTranslation[data.path];
                if (translatedPath)
                    data.path = translatedPath;
                else {
                    logger.warn('Connector: data message received that should not have been subscribed to')
                    return; // no translation -> no dispatch
                }
            }

            // translate data
            if (dataTranslation) {
                var translate = dataTranslation[sourcePath];
                if (translate && typeof translate == 'function') {
                    data.oldValue = translate(data.oldValue);
                    data.newValue = translate(data.newValue);
                }
            }

            // translate data
            if (dataValidation) {
                var validators = dataValidation[sourcePath]
                    , passedCount = 0
                    , alreadyFailed = false;

                if (validators)
                    validators.forEach(callValidator);
                else
                    propagateData();
            } else
                propagateData();


            function callValidator(validator) {
                validator(data.newValue, function(err, response) {
                    response.path = sourcePath;
                    if (! alreadyFailed && (err || response.valid) && ++passedCount == validators.length) {
                        propagateData();
                        linkedDS.postMessage('validated', response);
                    } else if (! response.valid) {
                        alreadyFailed = true;
                        linkedDS.postMessage('validated', response);
                    }
                });
            }

            function propagateData() {
                // prevent endless loop of updates for 2-way connection
                if (self[reverseLink])
                    var callback = subscriptionSwitch;

                // send data change instruction as message
                linkToDS.postMessage('changedata', data, callback);
            }

            function subscriptionSwitch(err, changeFinished) {
                if (err) return;
                var onOff = changeFinished ? 'onSync' : 'off';
                subscribeToDS(linkToDS, onOff, self[reverseLink], subscriptionPath, reversePathTranslation);

                var message = changeFinished ? 'changecompleted' : 'changestarted';
                self.postMessage(message, { source: linkedDS, target: linkToDS });
            }
        };

        subscribeToDS(linkedDS, 'onSync', onData, subscriptionPath, pathTranslation);

        return onData;
    }
}


/**
 * Subscribes and unsubscribes to/from datasource
 *
 * @private
 * @param {Object} dataSource data source object that has messenger with proxied on/off methods
 * @param {String} onOff 'onSync' or 'off'
 * @param {Function} subscriber
 * @param {String} subscriptionPath only used if there is no path translation
 * @param {Object[String]} pathTranslation paths translation map
 */
function subscribeToDS(dataSource, onOff, subscriber, subscriptionPath, pathTranslation) {
    if (! subscriber)
        return logger.warn('Connector: subscriber is undefined - caused by async messages');
    if (pathTranslation)
        _.eachKey(pathTranslation, function(translatedPath, path) {
            dataSource[onOff](path, subscriber);
        });
    else
        dataSource[onOff](subscriptionPath, subscriber);

    dataSource[onOff]('finished', subscriber);
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


    function unlinkDataSource(linkedDS, linkName, pathTranslation) {
        if (self[linkName]) {
            subscribeToDS(linkedDS, 'off', self[linkName], self._subscriptionPath, pathTranslation)
            // linkedDS.off(self._subscriptionPath, self[linkName]);
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
    _.eachKey(this, function(value, key) {
        delete this[key];
    }, this);
}
