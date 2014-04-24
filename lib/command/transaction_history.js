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
    storeTransaction: TransactionHistory$storeTransaction,
    undo: TransactionHistory$undo,
    redo: TransactionHistory$redo,
    inTransaction: TransactionHistory$inTransaction
});


function TransactionHistory$storeCommand(command) {
    if (! this.currentBatch) this.currentBatch = new Transaction;
    this.currentBatch.storeCommand(command);
    if (! this[SCHEDULED]) {
        this[SCHEDULED] = true;
        _.deferMethod(this, _storeTransaction);
    }
}


function _storeTransaction() {
    if (this.currentBatch) {
        if (! this.currentTransaction) this.currentTransaction = new Transaction;
        this.currentTransaction.merge(this.currentBatch);
        this.currentBatch = undefined;
        _.deferMethod(this, _storeTransaction);

    } else {
        if (this.currentTransaction) {
            this.transactions.store(this.currentTransaction);
            this.currentTransaction = undefined;
        } else
            logger.error('TransactionHistory: no current transaction');
        this[SCHEDULED] = false;
    }
}


function TransactionHistory$storeTransaction(transaction) {
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
