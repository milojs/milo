'use strict';

var ClassRegistry = require('../../abstract/registry')
    , ComponentFacet = require('../c_facet');


/**
 * `milo.registry.facets`
 * Component facets registry. An instance of [ClassRegistry](../../abstract/registry.js.html) class that is used by milo to register and find facets.
 */
 var facetsRegistry = new ClassRegistry(ComponentFacet);


// Adds common ancestor to all facets of components to the registry.
facetsRegistry.add(ComponentFacet);

module.exports = facetsRegistry;
