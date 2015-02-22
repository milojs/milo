'use strict';


var ActionsHistory = require('./actions_history')
    , _ = require('milo-core').proto;


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
    merge: Transaction$merge,

    setComment: Transaction$setComment,
    getDescription: Transaction$getDescription
});


function Transaction$execute() {
    this.commands.each('execute');
}


function Transaction$undo(cb) {
    this.commands.undoAllAsync(cb);
}


function Transaction$redo(cb) {
    this.commands.redoAllAsync(cb);
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


function Transaction$setComment(comment) {
    this.comment = comment
}


function Transaction$getDescription() {
    var commands = this.commands.getDescription();
    return {
        commands: commands.actions,
        comment: this.comment
    }
}
