'use strict';

var miloCore = require('milo-core')
    , _ = miloCore.proto
    , check = miloCore.util.check
    , Match = check.Match
    , FacetBaseClass = require('../components/c_facet')
    , facetRegistry = require('../components/c_facets/cf_registry');

module.exports = createFacetClass;

function createFacetClass(config) {
    check(config, {
        className: String,
        superClassName: Match.Optional(String),
        require: Match.Optional(Array),
        methods: Match.Optional(Match.ObjectHash(Function)),
        staticMethods: Match.Optional(Match.ObjectHash(Function)),
        configSchema: Match.Optional(Object)
    });

    var SuperClass = config.superClassName ? facetRegistry.get(config.superClassName) : FacetBaseClass;
    var FacetClass = _.createSubclass(SuperClass, config.className);

    if (config.methods) _.extendProto(FacetClass, config.methods);
    if (config.require) _.extendProto(FacetClass, { require: config.require });
    if (config.configSchema) _.extendProto(FacetClass, { configSchema: config.configSchema });

    if (config.staticMethods) {
        if (config.staticMethods.super !== undefined) throw '\'super\' is a reserved keyword';
        _.extend(FacetClass, config.staticMethods);
    }

    FacetClass.super = SuperClass.prototype;
    facetRegistry.add(FacetClass);
    return FacetClass;
}