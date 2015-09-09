'use strict';

var miloCore = require('milo-core')
    , _ = miloCore.proto
    , check = miloCore.util.check
    , Match = check.Match
    , componentRegistry = require('../components/c_registry');


module.exports = createComponentClass;

/**
 * Utility function which creates and registers new milo component.  The component created will have
 * a reference to the super class used in its creation (Accessible using <ComponentClass>.super).
 *
 * @param {string} config.className - The name of the new component
 * @param {string} ['Component'] config.superClassName - The name of an existing component to be used as the new component's super class
 * @param {object=} config.facets - Facet configuration (Hash of facet name {string} to config {object})
 * @param {object=} config.methods - Methods of the new component (Hash of function name {string} to function {function})
 * @param {object=} config.staticMethods - Static methods of the new component (Hash of function name {string} to function {function})
 */
function createComponentClass(config) {
    check(config, {
        superClassName: Match.Optional(String),
        className: String,
        facets: Match.Optional(Object),
        methods: Match.Optional(Match.ObjectHash(Function)),
        staticMethods: Match.Optional(Match.ObjectHash(Function)),
    });
    var SuperClass = componentRegistry.get(config.superClassName || 'Component');
    var ComponentClass = SuperClass.createComponentClass(config.className, config.facets);

    if (config.methods) _.extendProto(ComponentClass, config.methods);

    if (config.staticMethods) {
        if (config.staticMethods.super !== undefined) throw '\'super\' is a reserved keyword';
        _.extend(ComponentClass, config.staticMethods);
    }

    ComponentClass.super = SuperClass.prototype;
    componentRegistry.add(ComponentClass);
    return ComponentClass;
}
