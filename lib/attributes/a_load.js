'use strict';

var Attribute = require('./a_class')
    , config = require('../config')
    , _ = require('milo-core').proto;


/**
 * `milo.attributes.load`
 * LoadAttribute class parses/validates/etc. an attribute that loads sub-views into the page.
 * Attribute value should be URL of the file to load subview from.
 * See [loader](../loader.js.html) for more information.
 */
var LoadAttribute = _.createSubclass(Attribute, 'LoadAttribute', true);


/**
 * ####LoadAttribute instance methods####
 *
 * - [attrName](#attrName)
 * - [parse](#parse)
 * - [validate](#validate)
 * - [render](#render)
 */
_.extendProto(LoadAttribute, {
    attrName: attrName,
    parse: parse,
    validate: validate,
    render: render
});

module.exports = LoadAttribute;


/**
 * BindAttribute instance method that returns attribute name, by default - `'ml-load'`.
 * To configure load attribute name use:
 * ```
 * milo.config({ attrs: { load: 'cc-load' } }); // will set bind attribute to 'cc-load'
 * ```
 *
 * @return {String}
 */
function attrName() {
    return config.attrs.load;
}


/**
 * LoadAttribute instance method that parses load attribute if it is present on the element.
 * It defines property `loadUrl` on LoadAttribute instance.
 * Returns the instance for method chaining.
 *
 * @return {LoadAttribute}
 */
function parse() {
    if (! this.node) return;

    this.loadUrl = this.get();
    return this;
}


/**
 * LoadAttribute instance method that should validate load attribute and throw if it has an invalid value.
 * TODO - implement url validation.
 * Returns the instance for method chaining.
 *
 * @return {LoadAttribute}
 */
function validate() {
    // TODO url validation
    return this;
}


/**
 * LoadAttribute instance method - returns URL
 *
 * @return {String}
 */
function render() {
    return this.loadUrl;
}
