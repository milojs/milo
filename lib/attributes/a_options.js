'use strict';

var Attribute = require('./a_class')
    , config = require('../config')
    , _ = require('milo-core').proto
    , qs = require('querystringparser');


/**
 * `milo.attributes.load`
 * OptionsAttribute class parses/validates/etc. an attribute that extends an options facet config.
 * Attribute value should be valid url string params.
 * See [Options facet](../componets/c_facets/Options.js.html) for more information.
 */
var OptionsAttribute = _.createSubclass(Attribute, 'OptionsAttribute', true);


/**
 * ####OptionsAttribute instance methods####
 *
 * - [attrName](#attrName)
 * - [parse](#parse)
 * - [validate](#validate)
 * - [render](#render)
 */
_.extendProto(OptionsAttribute, {
    attrName: attrName,
    parse: parse,
    validate: validate,
    render: render
});

module.exports = OptionsAttribute;


/**
 * BindAttribute instance method that returns attribute name, by default - `'ml-options'`.
 * To configure options attribute name use:
 * ```
 * milo.config({ attrs: { load: 'cc-load' } }); // will set attribute to 'cc-load'
 * ```
 *
 * @return {String}
 */
function attrName() {
    return config.attrs.options;
}


/**
 * OptionsAttribute instance method that parses options attribute if it is present on the element.
 * It defines property `optionsString` on OptionsAttribute instance.
 * Returns the instance for method chaining.
 *
 * @return {OptionsAttribute}
 */
function parse() {
    if (! this.node) return;

    this.optionsString = this.get();
    this.options = qs.parse(this.optionsString);
    return this;
}


/**
 * OptionsAttribute instance method that should validate load attribute and throw if it has an invalid value.
 * TODO - implement query string validation.
 * Returns the instance for method chaining.
 *
 * @return {OptionsAttribute}
 */
function validate() {
    // TODO query string validation
    return this;
}


/**
 * OptionsAttribute instance method - returns URL
 *
 * @return {String}
 */
function render() {
    return qs.stringify(this.options);
}
