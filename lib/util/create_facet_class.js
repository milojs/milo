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
        methods: Match.Optional(Match.ObjectHash(Function))
    });

    var SuperClass = config.superClassName ? facetRegistry.get(config.superClassName) : FacetBaseClass;
    var FacetClass = _.createSubclass(SuperClass, config.className);

    if (config.methods) _.extendProto(FacetClass, config.methods);
    if (config.require) FacetClass.require = config.require;

    FacetClass.super = SuperClass.prototype;
    facetRegistry.add(FacetClass);
    return FacetClass;
}