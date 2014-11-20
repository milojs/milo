'use strict';

var synthesize = require('./synthesize')
    , pathUtils = require('./path_utils')
    , changeDataHandler = require('./change_data')
    , Messenger = require('../messenger')
    , ModelPathMsgAPI = require('./path_msg_api')
    , MessengerMessageSource = require('../messenger/msngr_source')
    , _ = require('mol-proto')
    , check = require('../util/check')
    , Match = check.Match;


module.exports = ModelPath;


/**
 * `milo.Model.Path`
 * ModelPath object that allows access to any point inside [Model](./index.js.html) as defined by `accessPath`
 *
 * @constructor
 * @param {Model} model Model instance that ModelPath gives access to.
 * @param {String} accessPath string that defines path to access model.
 *  Path string consists of parts to define either property access (`".name"` to access property name) or array item access (`"[1]"` to access item with index 1).
 *  Access path can contain as many parts as necessary (e.g. `".list[0].name"` to access property `name` in the first element of array stored in property `list`.
 * @param {List} arguments additional arguments of this method can be used to create interpolated paths.
 *  E.g. `m.path("[$1].$2", id, prop)` returns ModelPath to access property with name `prop` in array item with index `id`. Although this ModelPath object will work exactly as `m("[" + id + "]." + prop)`, the interpolated is much more efficient as ModelPath with interpolation will not synthesize new getters and setters, while ModelPath with computed access path will synthesize new getters and setters for each pair of values of `id` and `prop`.
 * @return {ModelPath}
 */
function ModelPath(model, path) { // ,... - additional arguments for interpolation
    // check(model, Model);
    check(path, String);

    // `modelPath` will be returned by constructor instead of `this`. `modelPath`
    // (`modelPath_path` function) should also return a ModelPath object with "synthesized" methods
    // to get/set model properties, to subscribe to property changes, etc.
    // Additional arguments of modelPath can be used in the path using interpolation - see ModelPath below.
    var modelPath = function modelPath_path(accessPath) { // , ... arguments that will be interpolated
        return ModelPath$path.apply(modelPath, arguments);
    };
    modelPath.__proto__ = ModelPath.prototype;


    _.defineProperties(modelPath, {
        _model: model,
        _path: path,
        _args: _.slice(arguments, 1), // path will be the first element of this array
        _options: model._options
    });

    // parse access path
    var parsedPath = pathUtils.parseAccessPath(path);

    // compute access path string
    _.defineProperty(modelPath, '_accessPath', interpolateAccessPath(parsedPath, modelPath._args));

    if (modelPath._options.reactive !== false) {
        // messenger fails on "*" subscriptions
        modelPath._prepareMessenger();
        // subscribe to "changedata" message to enable reactive connections
        modelPath.onSync('changedata', changeDataHandler);
    }

    // compiling getter and setter
    var methods = synthesize(path, parsedPath);

    // adding methods to model path
    _.defineProperties(modelPath, methods);

    Object.freeze(modelPath);

    return modelPath;
}

ModelPath.prototype.__proto__ = ModelPath.__proto__;


/**
 * Interpolates path elements to compute real path
 *
 * @param {Array} parsedPath parsed path - array of path nodes
 * @param {Array} args path interpolation arguments, args[0] is path itself
 * @return {String}
 */
function interpolateAccessPath(parsedPath, args) {
    return parsedPath.reduce(function(accessPathStr, currNode, index) {
        var interpolate = currNode.interpolate;
        return accessPathStr +
                (interpolate
                    ? (currNode.syntax == 'array'
                        ? '[' + args[interpolate] + ']'
                        : '.' + args[interpolate])
                    : currNode.property);
    }, '');
}


/**
 * ####ModelPath instance methods####
 *
 * - [path](#ModelPath$path) - gives access to path inside ModelPath
 * - get - synthesized
 * - set - synthesized
 * - splice - splice model data (as array or pseudo-array), synthesized
 * - [len](#ModelPath$len) - returns length of array (or pseudo-array) in safe way, 0 if no length is set
 * - [push](#ModelPath$push) - add items to the end of array (or pseudo-array) in ModelPath
 * - [pop](#ModelPath$pop) - remove item from the end of array (or pseudo-array) in ModelPath
 * - [unshift](#ModelPath$unshift) - add items to the beginning of array (or pseudo-array) in ModelPath
 * - [shift](#ModelPath$shift) - remove item from the beginning of array (or pseudo-array) in ModelPath
 */
_.extendProto(ModelPath, {
    path: ModelPath$path,
    len: ModelPath$len,
    push: ModelPath$push,
    pop: ModelPath$pop,
    unshift: ModelPath$unshift,
    shift: ModelPath$shift,
    _prepareMessenger: _prepareMessenger,
    _getDefinition: _getDefinition,
    destroy: ModelPath$destroy
});


_.extend(ModelPath, {
    _createFromDefinition: _createFromDefinition
})


/**
 * Expose Messenger methods on Facet prototype
 */
var MESSENGER_PROPERTY = '_messenger';
Messenger.useWith(ModelPath, MESSENGER_PROPERTY, Messenger.defaultMethods);


/**
 * ModelPath instance method
 * Gives access to path inside ModelPath. Method works similarly to [path method](#Model$path) of model, using relative paths.
 *
 * @param {String} accessPath string that defines path to access model.
 *  Path string consists of parts to define either property access (`".name"` to access property name) or array item access (`"[1]"` to access item with index 1).
 *  Access path can contain as many parts as necessary (e.g. `".list[0].name"` to access property `name` in the first element of array stored in property `list`.
 * @param {List} arguments additional arguments of this method can be used to create interpolated paths.
 *  E.g. `m.path("[$1].$2", id, prop)` returns ModelPath to access property with name `prop` in array item with index `id`. Although this ModelPath object will work exactly as `m("[" + id + "]." + prop)`, the interpolated is much more efficient as ModelPath with interpolation will not synthesize new getters and setters, while ModelPath with computed access path will synthesize new getters and setters for each pair of values of `id` and `prop`.
 * @return {ModelPath}
 */
function ModelPath$path(accessPath) {  // , ... arguments that will be interpolated
    if (! accessPath) return this;

    var thisPathArgsCount = this._args.length - 1;

    if (thisPathArgsCount > 0) {// this path has interpolated arguments too
        accessPath = accessPath.replace(/\$[1-9][0-9]*/g, function(str) {
            return '$' + (+str.slice(1) + thisPathArgsCount);
        });
    }

    var newPath = this._path + accessPath;

    // this._model is added in front of all arguments as the first parameter
    // of ModelPath constructor
    var args = [this._model, newPath]
                .concat(this._args.slice(1)) // remove old path from _args, as it is 1 based
                .concat(_.slice(arguments, 1)); // add new interpolation arguments

    // calling ModelPath constructor with new and the list of arguments: this (model), accessPath, ...
    return _.newApply(ModelPath, args);
}


/**
 * ModelPath and Model instance method
 * Returns length property and sets it to 0 if it wasn't set.
 *
 * @return {Any}
 */
function ModelPath$len() {
    return this.path('.length').get() || 0;
}


/**
 * ModelPath and Model instance method
 * Adds items to the end of array (or pseudo-array). Returns new length.
 *
 * @param {List} arguments list of items that will be added to array (pseudo array)
 * @return {Integer}
 */
function ModelPath$push() { // arguments
    var length = this.len();
    var newLength = length + arguments.length;

    _.splice(arguments, 0, 0, length, 0);
    this.splice.apply(this, arguments);

    return newLength;
}


/**
 * ModelPath and Model instance method
 * Removes item from the end of array (or pseudo-array). Returns this item.
 *
 * @return {Any}
 */
function ModelPath$pop() {
    return this.splice(this.len() - 1, 1)[0];
}


/**
 * ModelPath and Model instance method
 * Inserts items to the beginning of the array. Returns new length.
 *
 * @param {List} arguments items to be inserted in the beginning of array
 * @return {Integer}
 */
function ModelPath$unshift() { // arguments
    var length = this.len();
    length += arguments.length;

    _.splice(arguments, 0, 0, 0, 0);
    this.splice.apply(this, arguments);

    return length;
}


/**
 * ModelPath and Model instance method
 * Removes the item from the beginning of array (or pseudo-array). Returns this item.
 *
 * @return {Any}
 */
function ModelPath$shift() { // arguments
    return this.splice(0, 1)[0];
}


/**
 * ModelPath instance method
 * Initializes ModelPath mesenger with Model's messenger as its source ([MessengerMessageSource](../messenger/msngr_source.js.html)) and [ModelPathMsgAPI](./path_msg_api.js.html) as [MessengerAPI](../messenger/m_api.js.html)
 */
function _prepareMessenger() {
    var mPathAPI = new ModelPathMsgAPI(this._accessPath);

    // create MessengerMessageSource connected to Model's messenger
    var modelMessageSource = new MessengerMessageSource(this, undefined, mPathAPI, this._model);

    // create messenger with model passed as hostObject (default message dispatch context)
    // and without proxying methods (we don't want to proxy them to Model)
    var mPathMessenger = new Messenger(this, undefined, modelMessageSource);

    // store messenger on ModelPath instance
    _.defineProperty(this, MESSENGER_PROPERTY, mPathMessenger);
}


/**
 * Returns the object allowing to recreate model path
 *
 * @return {Object}
 */
function _getDefinition() {
    return {
        model: this._model,
        path: this._path,
        args: this._args
    };
}


/**
 * Class method
 * Creates modelPath object from definition created by _getDefinition
 *
 * @param  {Object} definition
 * @return {ModelPath}
 */
function _createFromDefinition(definition) {
    check(definition, {
        model: Function, // Model
        path: String,
        args: Array
    });

    var m = definition.model;

    return m.apply(m, definition.args);
}


function ModelPath$destroy() {
    this[MESSENGER_PROPERTY].destroy();
}
