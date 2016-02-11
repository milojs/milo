'use strict';


var ActionsHistory = require('./actions_history')
    , Transaction = require('./transaction')
    , miloCore = require('milo-core')
    , logger = miloCore.util.logger
    , Messenger = miloCore.Messenger
    , _ = miloCore.proto;


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
    deleteLastTransaction: TransactionHistory$deleteLastTransaction,
    undo: TransactionHistory$undo,
    redo: TransactionHistory$redo,
    inTransaction: TransactionHistory$inTransaction,

    getDescription: TransactionHistory$getDescription,
    useMessenger: TransactionHistory$useMessenger,
    destroy: TransactionHistory$destroy
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
        _postTransactionMessage.call(this, 'appended', transaction);
        return transaction;
    }

    if (! this.currentBatch) this.currentBatch = new Transaction;
    this.currentBatch.storeCommand(command);
    if (! this[SCHEDULED]) {
        this[SCHEDULED] = true;
        _.deferMethod(this, _storeTransaction);
    }
    return this.currentBatch;
}


function TransactionHistory$deleteLastTransaction() {
    if (this.currentBatch || this.currentTransaction) {
        this.currentBatch = undefined;
        this.currentTransaction = undefined;
    } else {
        this.transactions.deleteLast();
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
        var t = this.currentTransaction;
        this.transactions.store(t);
        _postTransactionMessage.call(this, 'stored', t);

        this.currentTransaction = undefined;
    }
}


function TransactionHistory$storeTransaction(transaction) {
    this.endTransaction();

    this.transactions.store(transaction);
    _postTransactionMessage.call(this, 'stored', transaction);
}


function _postTransactionMessage(msg, transaction) {
    if (this._messenger)
        this._messenger.postMessage(msg, { transaction: transaction });
}


function _postTransactionMessageSync(msg, transaction) {
    if (this._messenger)
        this._messenger.postMessageSync(msg, { transaction: transaction });
}


function TransactionHistory$undo(cb) {
    var t = this.transactions.nextUndoAction();
    if (!t) return;
    _postTransactionMessageSync.call(this, 'undoing', t);
    var self = this;
    this.transactions.undo(function() {
        _postTransactionMessage.call(self, 'undone', t);
        cb && cb();
    });
    return t;
}


function TransactionHistory$redo(cb) {
    var t = this.transactions.nextRedoAction();
    if (!t) return;
    _postTransactionMessageSync.call(this, 'redoing', t);
    var self = this;
    this.transactions.redo(function() {
        _postTransactionMessage.call(self, 'redone', t);
        cb && cb();
    });
    return t;
}


function TransactionHistory$inTransaction() {
    return this[SCHEDULED];
}


function TransactionHistory$getDescription() {
    return this.transactions.getDescription();
}


function TransactionHistory$useMessenger() {
    this._messenger = new Messenger(this, Messenger.defaultMethods);
    return this._messenger
}


function TransactionHistory$destroy() {
    if (this._messenger) this._messenger.destroy();
    delete this.transactions;
}
