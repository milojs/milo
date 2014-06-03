'use strict';


var _ = require('mol-proto')
    , check = require('../util/check')
    , Match = check.Match
    , logger = require('../util/logger');


var UNDO_COMMAND = '_undoCommand';


module.exports = Command;


/**
 * Command class to implement "command pattern" - packaging ll information necessary for delayed method execution
 *
 * @constructor
 * @param {Function} func method name or function to be executed
 * @param {List} *arguments parameters to be passed to method or function
 */
function Command(func) { // , ... arguments
    this.init.apply(this, arguments);
}


/**
 * Command instance methods
 * 
 * - [init](#Command$execute) - initialize command, should be overwritten by subclasses
 * - [execute](#Command$execute) - execute command
 * - [setUndo](#Command$setUndo) - set undo command for this command
 * - [getUndo](#Command$getUndo) - get undo command of this command
 * - [setArguments](#Command$setArguments) - set commands arguments
 * - [addArguments](#Command$addArguments) - add arguments to command
 * - [destroy](#Command$destroy)
 */
_.extendProto(Command, {
    init: Command$init,
    execute: Command$execute,
    setUndo: Command$setUndo,
    getUndo: Command$getUndo,
    undo: Command$undo,
    redo: Command$execute, // same for command, different for transaction
    setArguments: Command$setArguments,
    addArguments: Command$addArguments,
    getArguments: Command$getArguments,
    changeArguments: Command$changeArguments,
    destroy: Command$destroy,

    setComment: Command$setComment,
    getDescription: Command$getDescription
});


/**
 * Command class methods
 *
 * - [create](#Command$$create) - commands factory
 */
_.extend(Command, {
    create: Command$$create,
    createWithUndo: Command$$createWithUndo
});


function Command$init(func) { // , ... arguments
    check(func, Match.Optional(Function));
    this.func = func || function(){};
    this.args = _.slice(arguments, 1);    
}


/**
 * Execute command making command object available via function property. 
 */
function Command$execute() {
    var result = this.func.apply(this, this.args);
    return result;
}


/**
 * Set undo command for this command. This command becomes undo command for undo command (so undo command can change this command during its execution).
 * 
 * @param {Command} undoCommand
 */
function Command$setUndo(undoCommand) {
    if (this[UNDO_COMMAND])
        logger.warn('Command setUndo: undo command is already set');

    this[UNDO_COMMAND] = undoCommand;
    undoCommand[UNDO_COMMAND] = this;
}


/**
 * Returns undo command of a given command
 *
 * @return {Command}
 */
function Command$getUndo() {
    return this[UNDO_COMMAND];
}


/**
 * Executes undo command of current command
 */
function Command$undo() {
    var undoCmd = this.getUndo();
    if (! undoCmd) return logger.error('Command undo called without undo command present');
    return undoCmd.execute();
}


/**
 * Set command's arguments. If arguments were set during command's creation, this method will overwrite arguments and log warning.
 *
 * @param {List} *arguments
 */
function Command$setArguments() { //, ... arguments
    if (this.args && this.args.length)
        logger.warn('Command setArguments: command arguments are already set');
    this.args = _.toArray(arguments);
}


function Command$getArguments() {
    return this.args;
}


function Command$changeArguments() { //, ... arguments
    this.args = _.toArray(arguments);
}


/**
 * Add (append) arguments to command
 *
 * @param {List} *arguments arguments list to be appended to command
 */
function Command$addArguments() { //, ... arguments
    if (! this.args) this.args = [];
    _.appendArray(this.args, arguments);
}


/**
 * Commands factory. Likely ot be overridden by subclasses to implement custom logic of command construction
 * 
 * @this {Function} Class of command
 * @param {Function} func method name or function to be executed
 * @param {List} *arguments parameters to be passed to method or function
 * @return {Command}
 */
function Command$$create(func) { // , ... arguments
    return _.newApply(this, arguments);
}


function Command$$createWithUndo() {
    throw new Error('createWithUndo should be implemented by subsclass');
}


/**
 * Destroy current command (to prevent potential memory leaks when commands point to DOM elements)
 */
function Command$destroy() {
    delete this.func;
    delete this.args;
    var undoCmd = this[UNDO_COMMAND];
    if (undoCmd) {
        delete this[UNDO_COMMAND][UNDO_COMMAND];
        delete this[UNDO_COMMAND];
        undoCmd.destroy();
    }
}


function Command$setComment(comment) {
    this.comment = comment;
}


function Command$getDescription() {
    return {
        func: this.func.name,
        comment: this.comment
    };
}
