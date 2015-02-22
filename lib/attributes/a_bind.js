'use strict';

var Attribute = require('./a_class')
    , config = require('../config')
    , miloCore = require('milo-core')
    , _ = miloCore.proto
    , check = miloCore.util.check
    , Match = check.Match;


var ATTRIBUTE_REGEXP= /^([^\:\[\]]*)(?:\[([^\:\[\]]*)\])?\:?([^:]*)$/
    , FACETS_SPLIT_REGEXP = /\s*(?:\,|\s)\s*/
    , ATTRIBUTE_TEMPLATE = '%compClass%compFacets:%compName';


/**
 * `milo.attributes.bind`
 * BindAttribute class parses/validates/etc. an attribute that binds DOM elements to milo components.
 * Possible attribute values are:
 *
 * - `:myView` - only component name
 * - `View:myView` - class and component name
 * - `[Events, Data]:myView` - facets and component name
 * - `View[Events]:myView` - class, facet(s) and component name
 *
 * See [binder](../binder.js.html) for more information.
 */
var BindAttribute = _.createSubclass(Attribute, 'BindAttribute', true);


/**
 * ####BindAttribute instance methods####
 *
 * - [attrName](#attrName)
 * - [parse](#parse)
 * - [validate](#validate)
 * - [render](#render)
 */
_.extendProto(BindAttribute, {
    attrName: attrName,
    parse: parse,
    validate: validate,
    render: render
});


/**
 * BindAttribute class methods
 *
 * - [setInfo](#BindAttribute$$setInfo)
 */
_.extend(BindAttribute, {
    setInfo: BindAttribute$$setInfo
});


module.exports = BindAttribute;


/**
 * BindAttribute instance method that returns attribute name, by default - `'ml-bind'`.
 * To configure bind attribute name use:
 * ```
 * milo.config({ attrs: { bind: 'cc-bind' } }); // will set bind attribute to 'cc-bind'
 * ```
 *
 * @return {String}
 */
function attrName() {
    return config.attrs.bind;
}


/**
 * BindAttribute instance method that parses bind attribute if it is present on the element.
 * It defines properties `compClass`, `compFacets` and `compName` on BindAttribute instance.
 * Returns the instance for method chaining.
 *
 * @return {BindAttribute}
 */
 function parse() {
    if (! this.node) return;

    var value = this.get();

    if (value)
        var bindTo = value.match(ATTRIBUTE_REGEXP);

    if (! bindTo)
        throw new Error('invalid bind attribute ' + value);

    this.compClass = bindTo[1] || 'Component';
    this.compFacets = (bindTo[2] && bindTo[2].split(FACETS_SPLIT_REGEXP)) || undefined;
    this.compName = bindTo[3] || undefined; // undefined is not same as ''

    return this;
}


/**
 * BindAttribute instance method that validates bind attribute, throws if it has an invalid value.
 * Returns the instance for method chaining.
 *
 * @return {BindAttribute}
 */
function validate() {
    check(this.compName, Match.IdentifierString);

    if (! this.compClass)
        throw new Error('empty component class name ' + this.compClass);

    return this;
}


/**
 * BindAttribute instance method that returns the attribute value for given values of properties `compClass`, `compName` and `compFacets`.
 * If `this.compName` is not set it will be generated automatically.
 *
 * @return {String}
 */
function render() {
    this.compName = this.compName || milo.util.componentName();
    return ATTRIBUTE_TEMPLATE
                .replace('%compClass', this.compClass || '')
                .replace('%compFacets', this.compFacets && this.compFacets.length
                                            ? '[' + this.compFacets.join(', ') + ']'
                                            : '')
                .replace('%compName', this.compName);
}


/**
 * BindAttribute class method
 * @param {Element} el
 * @param {String} componentClass optional class name
 * @param {String} componentName optional
 * @param {Array<String>} componentFacets optional extra facet to add to the class
 */
function BindAttribute$$setInfo(el, componentClass, componentName, componentFacets) {
    var attr = new BindAttribute(el);
    _.extend(attr, {
        compClass: componentClass,
        compName: componentName,
        compFacets: componentFacets
    });
    attr.decorate();
}
