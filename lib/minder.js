'use strict';

var Connector = require('./model/connector')
    , Messenger = require('./messenger')
    , _ = require('mol-proto')
    , logger = require('./util/logger');


module.exports = minder;


/**
 * This function creates one or many Connector objects that
 * create live reactive connection between objects implementing
 * dataSource interface:
 * Objects should emit messages when any part of their data changes,
 * methods `on` and `off` should be implemented to subscribe/unsubscribe
 * to change notification messages, methods `set` and `get` should be implemented to get/set data
 * on path objects, pointing to particular parts of the object, method `path`
 * should return path object for a given path string (see path utils for path string syntax).
 * Both Model and Data facet are such data sources, they can be linked by Connector object.
 *
 * @param {Object} ds1 the first data source. Instead of the first data source an array can be passed with arrays of Connection objects parameters in each array element.
 * @param {String} mode the connection mode that defines the direction and the depth of connection. Possible values are '->', '<<-', '<<<->>>', etc.
 * @param {Object} ds2 the second data source
 * @param {Object} options not implemented yet
 */
function minder(ds1, mode, ds2, options) {
    if (Array.isArray(ds1)) {
        var connDescriptions = ds1;
        var connectors = connDescriptions.map(function(descr) {
            return new Connector(descr[0], descr[1], descr[2], descr[3]);
        });
        connectors.forEach(_addConnector);
        return connectors;
    } else {
        var cnct = new Connector(ds1, mode, ds2, options);
        _addConnector(cnct);
        return cnct;
    }
}


/**
 * messenger of minder where it emits events related to all connectors
 * @type {Messenger}
 */
var _messenger = new Messenger(minder, Messenger.defaultMethods);


var _connectors = []
    , _receivedMessages = []
    , _isPropagating = false;


_.extend(minder, {
    getConnectors: minder_getConnectors,
    getExpandedConnections: minder_getExpandedConnections,
    isPropagating: minder_isPropagating,
    whenPropagationCompleted: minder_whenPropagationCompleted,
    destroyConnector: minder_destroyConnector,
    destroy: minder_destroy
});


function _addConnector(cnct) {
    cnct.___minder_id = _connectors.push(cnct) - 1;
    cnct.on(/.*/, onConnectorMessage);
    minder.postMessage('added', { connector: cnct });
    minder.postMessage('turnedon', { connector: cnct });
}


function onConnectorMessage(msg, data) {
    var data = data ? _.clone(data) : {};
    _.extend(data, {
        id: this.___minder_id,
        connector: this
    });
    minder.postMessage(msg, data);
    if (! _receivedMessages.length && ! _isPropagating) {
        _.defer(_idleCheck);
        _isPropagating = true;
    }

    _receivedMessages.push({ msg: msg, data: data });
}


function _idleCheck() {
    if (_receivedMessages.length) {
        _receivedMessages.length = 0;
        _.defer(_idleCheck);
        minder.postMessage('propagationticked');
    } else {
        _isPropagating = false;
        minder.postMessage('propagationcompleted');
    }
}


function minder_isPropagating() {
    return _isPropagating;
}


function minder_whenPropagationCompleted(callback) {
    if (_isPropagating)
        minder.once('propagationcompleted', executeCallback);
    else
        _.defer(executeCallback);

    function executeCallback() {
        if (_isPropagating)
            minder.once('propagationcompleted', executeCallback);
        else
            callback();
    }
}


function minder_getConnectors(onOff) {
    if (typeof onOff == 'undefined')
        return _connectors;

    return _connectors.filter(function(cnct) {
        return cnct.isOn === onOff;
    });
}


function minder_destroyConnector(cnct) {
    cnct.destroy();
    var index = _connectors.indexOf(cnct);
    if (index >= 0)
        delete _connectors[index];
    else
        logger.warn('minder: connector destroyed that is not registered in minder');
}


function minder_getExpandedConnections(onOff, searchStr) {
    var connectors = minder.getConnectors(onOff);
    var connections =  connectors.map(function(cnct) {
        var connection = {
            leftSource: _getExpandedSource(cnct.ds1),
            rightSource: _getExpandedSource(cnct.ds2),
            mode: cnct.mode,
            isOn: cnct.isOn
        };
        
        if (cnct.options)
            connection.options = cnct.options;

        return connection;
    });

    if (searchStr)
        connections = connections.filter(function(cnctn) {
            return _sourceMatchesString(cnctn.leftSource, searchStr)
                    || _sourceMatchesString(cnctn.rightSource, searchStr);
        });

    return connections;
}


function _getExpandedSource(ds) {
    var source = [];
    if (typeof ds == 'function') {
        if (ds._model && ds._accessPath) {
            source.unshift(ds._accessPath);
            ds = ds._model;
        }

        source.unshift(ds);
        ds = ds._hostObject;
    }

    if (typeof ds == 'object') {
        source.unshift(ds);

        if (ds.owner)
            source.unshift(ds.owner);
    }

    return source;
}


function _sourceMatchesString(source, matchStr) {
    return source.some(function(srcNode) {
        var className = srcNode.constructor && srcNode.constructor.name;
        return _stringMatch(className, matchStr)
                || _stringMatch(srcNode.name, matchStr)
                || _stringMatch(srcNode, matchStr);
    });
}


function _stringMatch(str, substr) {
    return str && typeof str == 'string' && str.indexOf(substr) >= 0;
}


function minder_destroy() {
    _connectors.forEach(function(cnct) {
        destroyDS(cnct.ds1);
        destroyDS(cnct.ds2);
        cnct.destroy();
    });
    _messenger.destroy();
    minder._destroyed = true;

    function destroyDS(ds) {
        if (ds && !ds._destroyed) ds.destroy();
    }
}
