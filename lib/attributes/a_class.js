'use strict';

var miloCore = require('milo-core')
    , _ = miloCore.proto
    , check = miloCore.util.check
    , Match = check.Match;


module.exports = Attribute;


/**
 * An absctract class for parsing and validation of element attributes.
 * Subclasses should define methods `attrName`, `parse`, `validate` and `render`.
 *
 * @param {Element} el DOM element where attribute is attached
 * @param {String} name Optional name of the attribute, usually supplied by subclass via `attrName` method
 */
function Attribute(el, name) {
    this.name = name || this.attrName();
    this.el = el;

    // attribute node
    this.node = el.attributes[this.name];
}


_.extend(Attribute, {
    remove: Attribute$$remove
});


/**
 * ####Attribute instance methods####
 *
 * - [get](#Attribute$get)
 * - [set](#Attribute$set)
 * - [decorate](#Attribute$decorate)
 *
 * The following instance methods should be defined by subclass
 *
 * - attrName - should return attribute name
 * - parse - should parse attribute value
 * - validate - should validate attribute value, throwing exception if it is incorrect 
 * - render - should return attribute value for a given attribute state (other properties, as defined in subclass)
 */
_.extendProto(Attribute, {
    get: Attribute$get,
    set: Attribute$set,
    remove: Attribute$remove,
    decorate: Attribute$decorate,

    destroy: Attribute$destroy,

    // should be defined in subclass
    attrName: toBeImplemented,
    parse: toBeImplemented,
    validate: toBeImplemented,
    render: toBeImplemented
});


function Attribute$$remove(el, deep) {
    var name = this.prototype.attrName();
    el.removeAttribute(name);

    if (deep) {
        var selector = '[' + name + ']';
        var children = el.querySelectorAll(selector);
        _.forEach(children, function(childEl) {
            childEl.removeAttribute(name);
        });
    }
}


function Attribute$remove() {
    delete this.node;
}


function Attribute$destroy() {
    delete this.el;
    delete this.node;
}

/**
 * Attribute instance method that returns attribute value as string.
 *
 * @return {String}
 */
function Attribute$get() {
    return this.el.getAttribute(this.name);
}


/**
 * Attribute instance method that sets attribute value.
 *
 * @param {String} value
 */
function Attribute$set(value) {
    this.el.setAttribute(this.name, value);
}


/**
 * Attribute instance method that decorates element with its rendered value.
 * Uses `render` method that should be defiend in subclass.
 */
function Attribute$decorate() {
    this.set(this.render());
}


function toBeImplemented() {
    throw new Error('calling the method of an absctract class');
}
