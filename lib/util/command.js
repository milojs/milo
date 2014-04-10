'use strict';


var _ = require('mol-proto');


var CURRENT_COMMAND = '___currentCommand';


module.exports = Command;


function Command(context, methodOrFunc) { // , ... arguments
    this.context = context;
    this.func = typeof methodOrFunc == 'function'
                    ? methodOrFunc
                    : context[methodOrFunc];
    this.args = _.slice(arguments, 2);
    this.init.apply(this, arguments);
}


_.extendProto(Command, {
    init: function() {},
    execute: Command$execute,
    setUndo: Command$setUndo,
    getUndo: Command$getUndo,
    setArguments: Command$setArguments,
    addArguments: Command$addArguments,
    setCurrentCommand: Command$setCurrentCommand,
    clearCurrentCommand: Command$clearCurrentCommand,
    destroy: Command$destroy
});


_.extend(Command, {
    getCurrentCommand: Command$$getCurrentCommand
});


function Command$execute() {
    this.setCurrentCommand();
    var result = this.func.apply(this.context, this.args);
    this.clearCurrentCommand();
}


function Command$setUndo(undoCommand) {
    if (this._undoCommand)
        logger.warn('Command setUndo: undo command is already set');

    this._undoCommand = undoCommand;
}


function Command$getUndo() {
    return this._undoCommand;
}


function Command$setArguments() { //, ... arguments
    if (this.args && this.args.length)
        logger.warn('Command setArguments: command arguments are already set');
    this.args = _.toArray(arguments);
}


function Command$addArguments() { //, ... arguments
    if (! this.args) this.args = [];
    _.appendToArray(this.args, arguments);
    this.args = this.args.concat(_.toArray(arguments));
}


function Command$setCurrentCommand() {
    if (this.func[CURRENT_COMMAND])
        logger.warn('Command setCurrentCommand: command is already set');
    this.func[CURRENT_COMMAND] = this;
}


function Command$clearCurrentCommand() {
    delete this.func[CURRENT_COMMAND];
}


function Command$$getCurrentCommand(func) {
    var command = func[CURRENT_COMMAND];
    delete func[CURRENT_COMMAND];
    return command;
}


function Command$destroy() {
    delete this.context;
    delete this.func;
    delete this.args;
}
