'use strict';

var miloCore = require('milo-core')
    , _ = miloCore.proto
    , componentName = require('../util/component_name')
    , check = miloCore.util.check
    , Match = check.Match
    , logger = miloCore.util.logger;


/**
 * Scope class.
 * @param {Element} rootEl the root element of this scope
 * @param {Object} hostObject the host 
 * @return {Scope}
 */
function Scope(rootEl, hostObject) {
    _.defineProperties(this, {
        _rootEl: rootEl,
        _hostObject: hostObject
    }, _.WRIT); // writable
};

_.extendProto(Scope, {
    _add: Scope$_add,
    _safeAdd: Scope$_safeAdd,
    _copy: Scope$_copy,
    _each: Scope$_each,
    _move: Scope$_move,
    _merge: Scope$_merge,
    _length: Scope$_length,
    _any: Scope$_any,
    _remove: Scope$_remove,
    _clean: Scope$_clean,
    _detachElement: Scope$_detachElement,
    _has: Scope$_has,
    _filter: Scope$_filter
});


_.extend(Scope, {
    rename: Scope$$rename
});


module.exports = Scope;


var allowedNamePattern = /^[A-Za-z][A-Za-z0-9\_\$]*$/;


/**
 * Scope instance method.
 * Adds object to the scope, throwing if name is not unique
 * @param {Component|ComponentInfo} object component or component info to add to the scope
 * @param {String} name the name of the component to add
 */
function Scope$_add(object, name) {
    if (typeof name == 'string')
        object.name = name;
    else
        name = object.name;
    
    if (this.hasOwnProperty(name))
        throw new Error('duplicate object name: ' + name);

    checkName(name);
    __add.call(this, object, name);
}


/**
 * Scope instance method
 * Adds object to scope renaming it if name is not unique
 * @param {Component|ComponentInfo} object component or component info to add to the scope
 * @param {String} name the name of the component to add
 */
function Scope$_safeAdd(object, name) {
    if (typeof name == 'string')
        object.name = name;
    else
        name = object.name;

    var shouldRename = this.hasOwnProperty(name);
    if (shouldRename)
        logger.error('Scope: duplicate object name: ' + name);
    else {
        shouldRename = ! allowedNamePattern.test(name);
        if (shouldRename)
            logger.error('Scope: name should start from letter, this name is not allowed: ' + name);
    }

    if (shouldRename) {
        name = componentName();
        object.name = name;
    }

    __add.call(this, object, name);
}


function __add(object, name) {
    this[name] = object;
    object.scope = this;

    if (typeof object.postMessage === 'function')
        object.postMessage('addedtoscope'); 
}


/**
 * Instance method.
 * copies all objects from one scope to another,
 * throwing if some object is not unique
 * @param {Scope} aScope the scope to copy
 */
function Scope$_copy(aScope) {
    check(aScope, Scope);

    aScope._each(Scope$_add, this);
}


/**
 * Instance method.
 * Moves a component from this scope to another scope.
 * @param {Component} component the component to be moved
 * @param {Scope} otherScope the scope to copy the component to
 */
function Scope$_move(component, otherScope) {
    otherScope._add(component);
    this._remove(component.name);
    component.scope = otherScope;
}


/**
 * Instance method.
 * Merges one scope into this scope
 * @param {Scope} scope the scope to absorb
 */
function Scope$_merge(scope) {
    scope._each(function (comp) {
        this._add(comp, comp.name);
        scope._remove(comp.name);
    }, this);
}


/**
 * Instance method.
 * Enumerates each component in the scope
 * @param {Function} callback the function to execute for each component
 * @param {Object} thisArg the context
 */
function Scope$_each(callback, thisArg) {
    _.eachKey(this, callback, thisArg || this, true); // enumerates enumerable properties only
}


/**
 * Instance method.
 * Returns a filtered list of components based on a callback
 * @param {Function} callback the function to execute for each component
 * @param {Object} thisArg the context
 * @return {Array}
 */
function Scope$_filter(callback, thisArg) {
    return _.filterKeys(this, callback, thisArg || this, true);
}


/**
 * Checks the validity of a name.
 * @param {Function} callback the function to execute for each component
 */
function checkName(name) {
    if (! allowedNamePattern.test(name))
        throw new Error('name should start from letter, this name is not allowed: ' + name);
}


/**
 * Instance method.
 * Returns the number of objects in the scope
 * @return {Number}
 */
function Scope$_length() {
    return Object.keys(this).length;
}


/**
 * Instance method.
 * Returns a component from the scope. It may look like it returns the first component
 * but in reality given that scopes are hashes, there is no such thing.
 * @return {Component}
 */
function Scope$_any() {
    var key = Object.keys(this)[0];
    return key && this[key];
}


/**
 * Instance method.
 * Removes a component from the scope by it's name.
 * @param {String} name the name of the component to remove
 * @param {Boolean} quiet optional true to suppress the warning message if the component is not in scope
 */
function Scope$_remove(name, quiet) {
    if (! (name in this)) {
        if (!quiet) logger.warn('removing object that is not in scope');
        return;
    }

    var object = this[name];

    delete this[name];

    if (typeof object.postMessage === 'function')
        object.postMessage('removedfromscope');
}


/**
 * Instance method.
 * Removes all components from the scope.
 */
function Scope$_clean() {
    this._each(function(object, name) {
        delete this[name].scope;
        delete this[name];
    }, this);
}

function Scope$_detachElement() {
    this._rootEl = null;
}


/**
 * Checks if scope has object by object name
 * @param {Object} object
 * @return {Boolean}
 */
function Scope$_has(object) {
    return this.hasOwnProperty(object.name);
}


/**
 * Change object name, renaming it in scope unless renameInScope is false
 * @param {Object} obj
 * @param {String} name new name
 * @param {Boolean} renameInScope true by default
 */
function Scope$$rename(obj, name, renameInScope) {
    if (obj.scope && renameInScope !== false) {
        obj.scope._remove(obj.name);
        obj.scope._add(obj, name);
    } else
        obj.name = name;
}
