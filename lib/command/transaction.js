'use strict';


var ActionsHistory = require('./actions_history')
    , _ = require('mol-proto');


module.exports = Transaction;


function Transaction() {
    this.commands = new ActionsHistory;
}


_.extendProto(Transaction, {
    execute: Transaction$execute,
    undo: Transaction$undo,
    redo: Transaction$redo,
    destroy: Transaction$destroy,
    storeCommand: Transaction$storeCommand,
    merge: Transaction$merge
});


function Transaction$execute() {
    this.commands.each('execute');
}


function Transaction$undo() {
    this.commands.undoAll();
}


function Transaction$redo() {
    this.commands.redoAll();
}


function Transaction$destroy() {
    this.commands.each('destroy');
}


function Transaction$storeCommand(command) {
    this.commands.store(command);
}


function Transaction$merge(transaction) {
    transaction.commands.each(function(cmd) {
        this.commands.store(cmd);
    }, this);
}
