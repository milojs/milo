'use strict';


var _ = require('mol-proto')
    , logger = require('../util/logger');


module.exports = ActionsHistory;


/**
 * Stores list of commands or transactions
 *
 * @constructor
 * @param {Number} maxLength
 */
function ActionsHistory(maxLength) {
    this._maxLength = maxLength || Infinity;
    this.actions = [];
    this.position = 0;
}


_.extendProto(ActionsHistory, {
    store: ActionsHistory$store,
    undo: ActionsHistory$undo,
    redo: ActionsHistory$redo,
    undoAll: ActionsHistory$undoAll,
    redoAll: ActionsHistory$redoAll,
    undoAllAsync: ActionsHistory$undoAllAsync,
    redoAllAsync: ActionsHistory$redoAllAsync,
    each: ActionsHistory$each,
    eachReverse: ActionsHistory$eachReverse
});


function ActionsHistory$store(command) {
    _truncateToCurrentPosition.call(this);
    this.actions.push(command);

    if (this.actions.length > this._maxLength) {
        var act = this.actions.shift();
        act.destroy();
    }

    this.position = this.actions.length;
    return this.position - 1
}


function _truncateToCurrentPosition() {
    for (var i = this.position; i < this.actions.length; i++)
        this.actions[i].destroy();
    this.actions.length = this.position;
}


function ActionsHistory$undo() {
    if (this.position == 0) return; // nothing to undo
    var act = this.actions[--this.position];
    act.undo();
}


function ActionsHistory$redo() {
    if (this.position == this.actions.length) return; // nothing to redo
    var act = this.actions[this.position++];
    act.redo();
}


function ActionsHistory$undoAll() {
    while (this.position) this.undo();
}


function ActionsHistory$redoAll() {
    while (this.position < this.actions.length) this.redo();
}


function ActionsHistory$undoAllAsync() {
    if (this.position) {
        this.undo();
        if (this.position)
            _.deferMethod(this, 'undoAllAsync');
    }
}


function ActionsHistory$redoAllAsync() {
    if (this.position < this.actions.length) {
        this.redo();
        if (this.position < this.actions.length)
            _.deferMethod(this, 'redoAllAsync');
    }
}


function ActionsHistory$each(funcOrMethod, thisArg) {
    var func = typeof funcOrMethod == 'string'
                ? function(act) { act[funcOrMethod](); }
                : funcOrMethod;

    this.actions.forEach(func, thisArg || this);
}


function ActionsHistory$eachReverse(funcOrMethod, thisArg) {
    this.actions.reverse();
    this.each(funcOrMethod, thisArg);
    this.actions.reverse();
}
