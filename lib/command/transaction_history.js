'use strict';


var ActionsHistory = require('./actions_history')
    , Transaction = require('./transaction')
    , logger = require('../util/logger')
    , _ = require('mol-proto');


module.exports = TransactionHistory;


var SCHEDULED = '_scheduled';


function TransactionHistory(maxLength) {
    this.transactions = new ActionsHistory(maxLength);
    this.currentBatch = undefined;
    this.currentTransaction = undefined;
    this[SCHEDULED] = false;
}


_.extendProto(TransactionHistory, {
    storeCommand: TransactionHistory$storeCommand,
    endTransaction: TransactionHistory$endTransaction,
    storeTransaction: TransactionHistory$storeTransaction,
    undo: TransactionHistory$undo,
    redo: TransactionHistory$redo,
    inTransaction: TransactionHistory$inTransaction,

    getDescription: TransactionHistory$getDescription
});


/**
 * Stores command in the history. 
 * @param {Command} command           
 * @param {Boolean} appendTransaction If `true`, appends to the current or previous transaction if there is no current transaction.
 */
function TransactionHistory$storeCommand(command, appendTransaction) {
    if (appendTransaction && !(this.currentTransaction || this.currentBatch)) {
        var transaction = this.transactions.getLastAction();
        transaction.storeCommand(command);
        return;
    }

    if (! this.currentBatch) this.currentBatch = new Transaction;
    this.currentBatch.storeCommand(command);
    if (! this[SCHEDULED]) {
        this[SCHEDULED] = true;
        _.deferMethod(this, _storeTransaction);
    }
}


function _storeTransaction() {
    if (this.currentBatch) {
        _addBatchToTransaction.call(this);
        _.deferMethod(this, _storeTransaction);
    } else {
        _storeCurrentTransaction.call(this);
        this[SCHEDULED] = false;
    }
}


function TransactionHistory$endTransaction() {
    _addBatchToTransaction.call(this);
    _storeCurrentTransaction.call(this);
}


function _addBatchToTransaction() {
    if (this.currentBatch) {
        if (! this.currentTransaction) this.currentTransaction = new Transaction;
        this.currentTransaction.merge(this.currentBatch);
        this.currentBatch = undefined;
    } 
}


function _storeCurrentTransaction() {
    if (this.currentTransaction) {
        this.transactions.store(this.currentTransaction);
        this.currentTransaction = undefined;
    }
}


function TransactionHistory$storeTransaction(transaction) {
    this.endTransaction();
    this.transactions.store(transaction);
}


function TransactionHistory$undo() {
    this.transactions.undo();
}


function TransactionHistory$redo() {
    this.transactions.redo();
}


function TransactionHistory$inTransaction() {
    return this[SCHEDULED];
}


function TransactionHistory$getDescription() {
    return this.transactions.getDescription();
}
