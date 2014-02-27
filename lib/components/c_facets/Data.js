'use strict';

var Mixin = require('../../abstract/mixin')
    , ComponentFacet = require('../c_facet')
    , facetsRegistry = require('./cf_registry')

    , Messenger = require('../../messenger')
    , DOMEventsSource = require('../msg_src/dom_events')
    , DataMsgAPI = require('../msg_api/data')
    , getElementDataAccess = require('../msg_api/de_data')
    , pathUtils = require('../../model/path_utils')
    , modelUtils = require('../../model/model_utils')
    , changeDataHandler = require('../../model/change_data')

    , _ = require('mol-proto')
    , logger = require('../../util/logger');


/**
 * `milo.registry.facets.get('Data')`
 * Facet to give access to DOM data
 */
var Data = _.createSubclass(ComponentFacet, 'Data');


/**
 * Data facet instance methods
 *
 * - [start](#Data$start) - start Data facet
 * - [get](#Data$get) - get DOM data from DOM tree
 * - [set](#Data$set) - set DOM data to DOM tree
 * - [path](#Data$path) - get reference to Data facet by path
 */
_.extendProto(Data, {
    start: Data$start,
    getState: Data$getState,
    setState: Data$setState,

    get: Data$get,
    set: Data$set,
    del: Data$del,
    splice: Data$splice,
    path: Data$path,
    getPath: Data$getPath,
    getKey: Data$getKey,

    _get: Data$_get,
    _set: Data$_set,
    _del: Data$_del,
    _splice: Data$_splice,

    _setScalarValue: Data$_setScalarValue,
    _getScalarValue: Data$_getScalarValue,
    _postDataChanged: Data$_postDataChanged,
    _prepareMessageSource: _prepareMessageSource,
});

facetsRegistry.add(Data);

module.exports = Data;


// these methods will be wrapped to support "*" pattern subscriptions
var proxyDataSourceMethods = {
        // value: 'value',
        trigger: 'trigger'
    };


/**
 * Data facet instance method
 * Starts Data facet
 * Called by component after component is initialized.
 */
function Data$start() {
    ComponentFacet.prototype.start.apply(this, arguments);

    // get/set methods to set data of element
    this.elData = getElementDataAccess(this.owner.el);

    // initializes queue of "changedata" messages
    changeDataHandler.initialize.call(this);

    this._prepareMessageSource();

    // store facet data path
    this._path = '.' + this.owner.name;

    // current value
    this._value = this.get();

    // change messenger methods to work with "*" subscriptions (like Model class)
    pathUtils.wrapMessengerMethods.call(this);

    // prepare internal and external messengers
    // this._prepareMessengers();

    // if (this.config.subscribeToComponent)
    //  var subscribeObj = this.owner;
    // else
    //  var subscribeObj = this;

    // subscribe to DOM event
    this.on('', onDataChange);

    // subscribe to changes in scope children with Data facet
    this.on('childdata', onChildData);

    // subscribe to "changedata" event to enable reactive connections
    this.on('changedata', changeDataHandler)
}


/**
 * Data facet instance method
 * Create and connect internal and external messengers of Data facet.
 * External messenger's methods are proxied on the Data facet and they allows "*" subscriptions.
 */
function _prepareMessengers() {
    // model will post all its changes on internal messenger
    var internalMessenger = new Messenger(this);

    // message source to connect internal messenger to external
    var internalMessengerSource = new MessengerMessageSource(this, undefined, new ModelMsgAPI, internalMessenger);

    // external messenger to which all model users will subscribe,
    // that will allow "*" subscriptions and support "changedata" message api.
    var externalMessenger = new Messenger(this, Messenger.defaultMethods, internalMessengerSource);

    _.defineProperties(this, {
        _messenger: externalMessenger,
        _internalMessenger: internalMessenger
    });
}

/**
 * Data facet instance method
 * Initializes DOMEventsSource and connects it to Data facet messenger
 *
 * @private
 */
function _prepareMessageSource() {
    var dataAPI = new DataMsgAPI(this.owner)
        , dataEventsSource = new DOMEventsSource(this, proxyDataSourceMethods, dataAPI, this.owner);
    this._setMessageSource(dataEventsSource);

    _.defineProperty(this, '_dataEventsSource', dataEventsSource);

    // make value method of DataMsgAPI available on Data facet
    // this is a private method, get() should be used to get data.
    Mixin.prototype._createProxyMethod.call(dataAPI, 'value', 'value', this);
}


/**
 * Subscriber to data change event
 *
 * @private
 * @param {String} msgType in this instance will be ''
 * @param {Object} data data change information
 */
function onDataChange(msgType, data) {
    this._postDataChanged(data);
}


/**
 * Subscriber to data change event in child Data facet
 *
 * @private
 * @param {String} msgType
 * @param {Obejct} data data change information
 */
function onChildData(msgType, data) {
    this.postMessage(data.path, data);
    this._postDataChanged(data);
}


/**
 * Data facet instance method
 * Sets data in DOM hierarchy recursively.
 * Returns the object with the data actually set (can be different, if components matching some properties are missing).
 *
 * @param {Object|String|Number} value value to be set. If the value if scalar, it will be set on component's element, if the value is object - on DOM tree inside component 
 * @return {Object|String|Number}
 */
 function Data$set(value) {
    var componentSetter = this.config.set;
    if (typeof componentSetter == 'function')
        return componentSetter.call(this.owner, value);

    var oldValue = this._value
        , newValue = this._set(value);

    // this message triggers onDataChange, as well as actuall DOM change
    // so the parent gets notified
    this.postMessage('', { path: '', type: 'changed',
                            newValue: newValue, oldValue: oldValue });

    return newValue;
}


function Data$_set(value) {
    var valueSet;
    if (value != null && typeof value == 'object') {
        if (Array.isArray(value)) {
            valueSet = [];

            var listFacet = this.owner.list;
            if (listFacet){
                var listLength = listFacet.count()
                    , newItemsCount = value.length - listLength;
                if (newItemsCount >= 3) {
                    listFacet.addItems(newItemsCount);
                    // It's not clear why it was in defer - it seems not to break anything when it is removed
                    // _.defer(_updataDataPaths, listFacet, listLength, listFacet.count());
                    _updataDataPaths(listFacet, listLength, listFacet.count());
                }

                value.forEach(function(childValue, index) {
                    setChildData.call(this, valueSet, childValue, index, '[$$]');
                }, this);
            } else
                logger.warn('Data: setting array data without List facet');
        } else {
            valueSet = {};
            _.eachKey(value, function(childValue, key) {
                setChildData.call(this, valueSet, childValue, key, '.$$');
            }, this);
        }

        var listFacet = this.owner.list
            , listCount = listFacet && listFacet.count()
            , removeCount = listCount - value.length;

        while (removeCount-- > 0)
            listFacet.removeItem(value.length);
    } else
        valueSet = this._setScalarValue(value);

    this._value = valueSet;
    
    return valueSet;


    function setChildData(valueSet, childValue, key, pathSyntax) {
        var childPath = pathSyntax.replace('$$', key);
        var childDataFacet = this.path(childPath, true);
        if (childDataFacet)
            valueSet[key] = childDataFacet.set(childValue);
        // else
        //  logger.warn('attempt to set data on path that does not exist: ' + childPath);
    }    
}


/**
 * Data facet instance method
 * Deletes component from view and scope, only in case it has Item facet on it
 *
 * @param {String|Number} value value to set to DOM element
 */
function Data$del() {
    var componentDelete = this.config.del;
    if (typeof componentDelete == 'function')
        return componentDelete.call(this.owner);

    var oldValue = this._value

    this._del();

    // this message triggers onDataChange, as well as actuall DOM change
    // so the parent gets notified
    this.postMessage('', { path: '', type: 'deleted', oldValue: oldValue });
}


function Data$_del() {
    this.set();
}


/**
 * Data facet instance method
 * Sets scalar value to DOM element
 *
 * @private
 * @param {String|Number} value value to set to DOM element
 */
function Data$_setScalarValue(value) {
    return this.elData.set(this.owner.el, value);
}


/**
 * Data facet instance method
 * Sends data `message` to DOM parent
 *
 * @private
 * @param {Object} msgData data change message
 */
function Data$_postDataChanged(msgData) {
    var parentData = this.scopeParent();

    if (parentData) {
        var parentMsg = _.clone(msgData);
        parentMsg.path = (this._path || ('.' + thisComp.name))  + parentMsg.path;
        parentData.postMessage('childdata', parentMsg);
    }
}


/**
 * Data facet instance method
 * Get structured data from DOM hierarchy recursively
 * Returns DOM data
 *
 * @param {Boolean} deepGet true by default
 * @return {Object}
 */
function Data$get(deepGet) {
    var componentGetter = this.config.get;
    if (typeof componentGetter == 'function')
        return componentGetter.call(this.owner, deepGet);

    return this._get(deepGet);
}

function Data$_get(deepGet) {
    if (deepGet === false) // a hack to enable getting shallow state
        return;

    var comp = this.owner
        , scopeData;

    if (comp.list) {
        scopeData = [];
        comp.list.each(function(listItem, index) {
            scopeData[index] = listItem.data.get();
        });

        if (comp.container)
            comp.container.scope._each(function(scopeItem, name) {
                if (! comp.list.contains(scopeItem) && scopeItem.data)
                    scopeData[name] = scopeItem.data.get();
            });
    } else if (comp.container) {
        scopeData = {};
        comp.container.scope._each(function(scopeItem, name) {
            if (scopeItem.data)
                scopeData[name] = scopeItem.data.get();
        });
    } else
        scopeData = this._getScalarValue();

    this._value = scopeData;

    return scopeData;    
}


/**
 * Data facet instance method
 * Gets scalar data from DOM element
 *
 * @private
 */
function Data$_getScalarValue() {
    return this.elData.get(this.owner.el);
}


/**
 * Data facet instance method
 * Splices List items. Requires List facet to be present on component. Works in the same way as array splice.
 * Returns data retrieved from removed items
 *
 * @param {Integer} spliceIndex index to delete/insert at
 * @param {Integer} spliceHowMany number of items to delete
 * @param {List} arguments optional items to insert
 * @return {Array}
 */
function Data$splice(spliceIndex, spliceHowMany) { //, ... arguments
    var componentSplice = this.config.splice;
    if (typeof componentSplice == 'function')
        return componentSplice.apply(this.owner, arguments);

    var result = this._splice.apply(this, arguments);

    this.postMessage('', { path: '', type: 'splice',
                        index: result.spliceIndex,
                        removed: result.removed,
                        addedCount: result.addedCount,
                        newValue: this._value });

    return result.removed;
}


function Data$_splice(spliceIndex, spliceHowMany) { //, ... arguments
    var listFacet = this.owner.list;
    if (! listFacet)
        return logger.warn('Data: cannot use splice method without List facet');

    var removed = [];

    var listLength = listFacet.count();
    arguments[0] = spliceIndex =
        modelUtils.normalizeSpliceIndex(spliceIndex, listLength);

    if (spliceHowMany > 0 && listLength > 0) {
        for (var i = spliceIndex; i < spliceIndex + spliceHowMany; i++) {
            var item = listFacet.item(spliceIndex);
            if (item) {
                var itemData = item.data.get();
                listFacet.removeItem(spliceIndex);
            } else
                logger.warn('Data: no item for index', i);

            removed.push(itemData);
        }

        _updataDataPaths(listFacet, spliceIndex, listFacet.count());
    }

    var added = [];

    var argsLen = arguments.length
        , addItems = argsLen > 2
        , addedCount = argsLen - 2;
    if (addItems) {
        listFacet.addItems(addedCount, spliceIndex);
        for (var i = 2, j = spliceIndex; i < argsLen; i++, j++) {
            var item = listFacet.item(j);
            if (item)
                var itemData = item.data.set(arguments[i]);
            else
                logger.warn('Data: no item for index', j);

            added.push(itemData);
        }

        // change paths of items that were added and items after them
        _updataDataPaths(listFacet, spliceIndex, listFacet.count());
    }

    if (Array.isArray(this._value)) {
        _.prependArray(added, [spliceIndex, spliceHowMany]);
        Array.prototype.splice.apply(this._value, added);
    } else
        this._value = this.get();

    return {
        spliceIndex: spliceIndex,
        removed: removed,
        addedCount: addItems ? addedCount : 0
    }
}


// toIndex is not included
// no range checking is made
function _updataDataPaths(listFacet, fromIndex, toIndex) {
    for (var i = fromIndex; i < toIndex; i++) {
        var item = listFacet.item(i);
        if (item)
            item.data._path = '[' + i + ']';
        else
            logger.warn('Data: no item for index', j);      
    }       
}


/**
 * Data facet instance method
 * Returns data facet of a child component (by scopes) corresponding to the path
 * @param {String} accessPath data access path
 */
function Data$path(accessPath, createItem) {
    // hack
    createItem = true;

    if (! accessPath)
        return this;

    var parsedPath = pathUtils.parseAccessPath(accessPath)
        , currentComponent = this.owner;

    for (var i = 0, len = parsedPath.length; i < len; i++) {
        var pathNode = parsedPath[i]
            , nodeKey = pathUtils.getPathNodeKey(pathNode);
        if (pathNode.syntax == 'array' && currentComponent.list) {
            var itemComponent = currentComponent.list.item(nodeKey);
            if (! itemComponent && createItem) {
                itemComponent = currentComponent.list.addItem(nodeKey);
                itemComponent.data._path = pathNode.property;
            }
            if (itemComponent)
                currentComponent = itemComponent;
        } else if (currentComponent.container)
            currentComponent = currentComponent.container.scope[nodeKey];

        var currentDataFacet = currentComponent && currentComponent.data;
        if (! currentDataFacet)
            break;
    }

    return currentDataFacet;
}


/**
 * Data facet instance method
 * Returns path to access this data facet from parent (using path method)
 *
 * @return {String}
 */
function Data$getPath() {
    return this._path;
}



/**
 * Data facet instance method
 * Returns key to access the value related to this data facet on the value related to parent data facet.
 * If component has List facet, returns index
 *
 * @return {String|Integer}
 */
function Data$getKey() {
    var path = this._path;
    return path[0] == '['
            ? +path.slice(1, -1) // remove "[" and "]"
            : path.slice(1) // remove leading "."
}


/**
 * Data facet instance method
 * Called by `Component.prototype.getState` to get facet's state
 * Returns DOM data
 *
 * @param {Boolean} deepState, true by default
 * @return {Object}
 */
function Data$getState(deepState) {
    return { state: this.get(deepState) };
}


/**
 * Data facet instance method
 * Called by `Component.prototype.setState` to set facet's state
 * Simply sets model data
 *
 * @param {Object} state data to set on facet's model
 */
function Data$setState(state) {
    return this.set(state.state);
}
