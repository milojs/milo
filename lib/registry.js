'use strict';

/**
 * Registries of facets and of components
 *
 * - [facets](./components/c_facets/cf_registry.js.html)
 * - [components](./components/c_registry.js.html)
 */
var registry = module.exports = {
    facets: require('./components/c_facets/cf_registry'),
    components: require('./components/c_registry'),
    commands: require('./command/cmd_registry')
};
