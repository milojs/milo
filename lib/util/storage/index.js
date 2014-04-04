'use strict';


var DOMStorageError = require('../error').createClass('DomStorageError')
    , Messenger = require('../../messenger')
    , StorageMessageSource = require('./msg_src')
    , config = require('../../config')
    , jsonParse = require('../json_parse')
    , _ = require('mol-proto')
    , check = require('../check')
    , Match = check.Match;


module.exports = DOMStorage;


// shared keys stored by all instances, include key prefixes
var _storedKeys = {
    true: {}, // session storage
    false: {} // local storage
};


/**
 * DOMStorage class to simplify storage and retrieval of multiple items with types preservation to DOM storage (localStorage and sessionStorage).
 * Types will be stored in the key created from value keys with appended `milo.config.domStorage.typeSuffix`
 * 
 * @param {String} keyPrefix prefix that will be added to all keys followed by `milo.config.domStorage.prefixSeparator` ("/" by default).
 * @param {Boolean} sessionOnly true to use sessionStorage. localStorage will be used by default.
 * @param {Window} win window to work in
 */
function DOMStorage(keyPrefix, sessionOnly, win) {
    if (typeof window == 'undefined') return;
    win = win || window;

    keyPrefix = config.domStorage.root + 
                (keyPrefix
                    ? keyPrefix + config.domStorage.prefixSeparator
                    : '');

    _.defineProperties(this, {
        keyPrefix: keyPrefix,
        sessionOnly: !! sessionOnly,
        window: win,
        _storage: sessionOnly ? win.sessionStorage : win.localStorage,
        _typeSuffix: config.domStorage.typeSuffix,
        _keys: {}
    });
}


_.extendProto(DOMStorage, {
    get: DOMStorage$get,
    set: DOMStorage$set,
    remove: DOMStorage$remove,
    hasItem: DOMStorage$hasItem,
    getItem: DOMStorage$getItem,
    setItem: DOMStorage$setItem,
    removeItem: DOMStorage$removeItem,
    _storageKey: DOMStorage$_storageKey,
    _domStorageKey: DOMStorage$_domStorageKey,
    getAllKeys: DOMStorage$getAllKeys,
    getAllItems: DOMStorage$getAllItems,
    createMessenger: DOMStorage$createMessenger
});


var _sessionStorage = new DOMStorage('', true)
    , _localStorage = new DOMStorage('', false);

var _domStorage = {
        true: _sessionStorage,
        false: _localStorage
    };

_.extend(DOMStorage, {
    registerDataType: DOMStorage$$registerDataType,
    local: _localStorage,
    session: _sessionStorage,
    storage: _domStorage,
    _storedKeys: _storedKeys // exposed for testing
});


/**
 * Sets data to DOM storage. `this.keyPrefix` is prepended to keys.
 * 
 * @param {Object} data single object can be passed in which case keys will be used as keys in local storage.
 * @param {List} arguments alternatively just the list of arguments can be passed where arguments can be sequentially used as keys and values.
 */
function DOMStorage$set(data) { // or arguments
    if (typeof data == 'object')
        _.eachKey(data, function(value, key) {          
            this.setItem(key, value);
        }, this);
    else {
        var argsLen = arguments.length;
        if (argsLen % 2)
            throw new DomStorageError('DOMStorage: set should have even number of arguments or object');

        for (var i = 0; i < argsLen; i++) {
            var key = arguments[i]
                , value = arguments[++i];

            this.setItem(key, value);
        }
    }
}


/**
 * Gets data from DOM storage. `this.keyPrefix` is prepended to passed keys, but returned object will have keys without root keys.
 * 
 * @param {List} arguments keys can be passed as strings or arrays of strings
 * @returns {Object}
 */
function DOMStorage$get() { // , ... arguments
    var data = {};
    _.deepForEach(arguments, function(key) {
        data[key] = this.getItem(key);
    }, this);
    return data;
}


/**
 * Removes keys from DOM storage. `this.keyPrefix` is prepended to passed keys.
 * 
 * @param {List} arguments keys can be passed as strings or arrays of strings
 */
function DOMStorage$remove() { //, ... arguments
    _.deepForEach(arguments, function(key) {
        this.removeItem(key);
    }, this);
}


/**
 * Check for presence of single item in DOM storage. `this.keyPrefix` is prepended to passed key.
 * 
 * @param {String} key
 * @return {Boolean}
 */
function DOMStorage$hasItem(key) {
    var pKey = this._storageKey(key);
    return this._storage.getItem(pKey) != null;
}


/**
 * Gets single item from DOM storage prepending `this.keyPrefix` to passed key.
 * Reads type of the originally stored value from `key + this._typeSuffix` and converts data to the original type.
 * 
 * @param {String} key
 * @return {Any}
 */
function DOMStorage$getItem(key) {
    var pKey = this._storageKey(key);
    var dataType = _getKeyDataType.call(this, pKey);
    var valueStr = this._storage.getItem(pKey);
    var value = _parseData(valueStr, dataType);
    return value;
}


/**
 * Sets single item to DOM storage prepending `this.keyPrefix` to passed key.
 * Stores type of the stored value to `key + this._typeSuffix`.
 * 
 * @param {String} key
 * @return {Any}
 */
function DOMStorage$setItem(key, value) {
    var pKey = this._storageKey(key);
    var dataType = _setKeyDataType.call(this, pKey, value);
    var valueStr = _serializeData(value, dataType);
    this._storage.setItem(pKey, valueStr);
    this._keys[key] = true;
    _domStorage[this.sessionOnly]._keys[pKey] = true;
}


/**
 * Removes single item from DOM storage prepending `this.keyPrefix` to passed key.
 * Type of the stored value (in `key + this._typeSuffix` key) is also removed.
 * 
 * @param {String} key
 * @return {Any}
 */
function DOMStorage$removeItem(key) {
    var pKey = this._storageKey(key);
    this._storage.removeItem(pKey);
    _removeKeyDataType.call(this, pKey)
    delete this._keys[key];
    delete _domStorage[this.sessionOnly]._keys[pKey];
}


/**
 * Returns the array of all keys stored by this instance of DOMStorage
 *
 * @return {Array} 
 */
function DOMStorage$getAllKeys() {
    var storedKeys = Object.keys(this._keys);
    var keysInStorage = storedKeys.filter(function(key) {
        if (this.hasItem(key)) return true;
        else delete this._keys[key];
    }, this);
    return keysInStorage;
}


/**
 * Returns the map with all keys and values (deserialized) stored using this instance of DOMStorage
 * 
 * @return {Object}
 */
function DOMStorage$getAllItems() {
    return this.get(this.getAllKeys());
}


/**
 * Returns prefixed key for DOM storage for given unprefixed key.
 * 
 * @param {String} key
 * @return {String}
 */
function DOMStorage$_storageKey(key) {
    return this.keyPrefix + key;
}


/**
 * Returns unprefixed key to be used with this instance of DOMStorage fir given actual key in storage
 * If key has different prefix from the keyPrefix returns undefined
 * 
 * @param {String} storageKey actual key in local/session storage
 * @return {String}
 */
function DOMStorage$_domStorageKey(storageKey) {
    if (storageKey.indexOf(this._typeSuffix) >= 0) return;
    return _.unPrefix(storageKey, this.keyPrefix);
}


/**
 * Gets originally stored data type for given (prefixed) `key`.
 *
 * @param  {String} pKey prefixed key of stored value
 * @return {String}
 */
function _getKeyDataType(pKey) {
    pKey = _dataTypeKey.call(this, pKey);
    return this._storage.getItem(pKey);
}


/**
 * Stores data type for given (prefixed) `key` and `value`.
 * Returns data type for `value`.
 * 
 * @param {String} pKey prefixed key of stored value
 * @param {Any} value
 * @return {String}
 */
function _setKeyDataType(pKey, value) {
    var dataType = _getValueType(value);
    pKey = _dataTypeKey.call(this, pKey);
    this._storage.setItem(pKey, dataType);
    return dataType;
}


/**
 * Removes stored data type for given (prefixed) `key`.
 * 
 * @param  {String} pKey prefixed key of stored value
 */
function _removeKeyDataType(pKey) {
    pKey = _dataTypeKey.call(this, pKey);
    this._storage.removeItem(pKey);
}


/**
 * Returns the key to store data type for given (prefixed) `key`.
 * 
 * @param  {String} pKey prefixed key of stored value
 * @return {String}
 */
function _dataTypeKey(pKey) {
    return pKey + this._typeSuffix;
}


/**
 * Returns type of value as string. Class name returned for objects ('null' for null).
 * @param  {Any} value
 * @return {String}
 */
function _getValueType(value) {
    var valueType = typeof value
        , className = value && value.constructor.name
        , dataType = valuesDataTypes[className];
    return dataType || (
            valueType != 'object'
                ? valueType
                : value == null
                    ? 'null'
                    : value.constructor.name);
}
var valuesDataTypes = {
    // can be registered with `registerDataType`
}


/**
 * Serializes value to be stored in DOM storage.
 * 
 * @param  {Any} value value to be serialized
 * @param  {String} valueType optional data type to define serializer, _getValueType is used if not passed.
 * @return {String}
 */
function _serializeData(value, valueType) {
    valueType = valueType || _getValueType(value);
    var serializer = dataSerializers[valueType];
    return serializer
            ? serializer(value, valueType)
            : value && value.toString == Object.prototype.toString
                ? JSON.stringify(value)
                : '' + value;
}
var dataSerializers = {
    'Array': JSON.stringify
}


/**
 * Parses string retrieved from DOM storage.
 * 
 * @param  {String} valueStr
 * @param  {String} valueType data type that defines parser. Original sring will be returned if parser is not defined.
 * @return {Any}
 */
function _parseData(valueStr, valueType) {
    var parser = dataParsers[valueType];
    return parser
            ? parser(valueStr, valueType)
            : valueStr;
}
var dataParsers = {
    Object: jsonParse,
    Array: jsonParse,
    Date: function(valStr) { return new Date(valStr); },
    boolean: function(valStr) { return valStr == 'true'; },
    number: function(valStr) { return Number(valStr); },
    function: function(valStr) { return _.toFunction(valStr); },
    RegExp: function(valStr) { return _.toRegExp(valStr); }
};


/**
 * Registers data type to be saved in DOM storage. Class name can be used or result of `typeof` operator for non-objects to override default conversions.
 * 
 * @param {String} valueType class (constructor) name or the string returned by typeof.
 * @param {Function} serializer optional serializer for this type
 * @param {Function} parser optional parser for this type
 * @param {[String]} storeAsDataType optional name of stored data type if different from valueType
 */
function DOMStorage$$registerDataType(valueType, serializer, parser, storeAsDataType) {
    if (serializer) dataSerializers[valueType] = serializer;
    if (parser) dataParsers[valueType] = parser;
    valuesDataTypes[valueType] = storeAsDataType || valueType;
}


function DOMStorage$createMessenger() {
    var storageMessageSource = new StorageMessageSource(this, ['trigger']);
    var messenger = new Messenger(this, Messenger.defaultMethods, storageMessageSource);
    _.defineProperty(this, '_messenger', messenger, _.WRIT);
}
