'use strict';


var _ = require('milo-core').proto;

module.exports = Facet;


/**
 * `milo.classes.Facet`
 * Base Facet class is an ancestor of [ComponentFacet](../components/c_facet.js.html) class, the main building block in milo.
 * 
 * @param {FacetedObject} owner an instance of FacetedObject subclass that stores the facet on its property  with the same name as `name` property of facet
 * @param {Object} config optional facet configuration, used in subclasses
 */
function Facet(owner, config) {
    this.name = _.firstLowerCase(this.constructor.name);
    this.owner = owner;
    this.config = config || {};
    this.init.apply(this, arguments);
}


/**
 * `init` method of subclass will be called by Facet constructor.
 */
_.extendProto(Facet, {
    init: function() {}
});
