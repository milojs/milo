'use strict';

var ClassRegistry = require('../abstract/registry')
    , Command = require('./index');

/**
 * `milo.registry.components`
 * An instance of [ClassRegistry](../abstract/registry.js.html) class that is used by milo to register and find components.
 */
var commandsRegistry = new ClassRegistry(Command);

// add common ancestor to all components to the registry.
commandsRegistry.add(Command);

module.exports = commandsRegistry;
