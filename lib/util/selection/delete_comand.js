'use strict';


var Command = require('../../command')
    , commandsRegistry = require('../../command/cmd_registry')
    , _ = require('mol-proto');


var DeleteTextSelectionCommand = _.createSubclass(Command, 'DeleteTextSelectionCommand');