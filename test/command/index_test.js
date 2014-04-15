'use strict';


var Command = require('../../lib/command')
    , assert = require('assert')
    , _ = require('mol-proto');


describe('Command', function() {
    var args = [1, 2, 3]
        , executed;

    var command, undoCmd;


    function cmdFunc() {
        assert.equal(this, command);
        assert.deepEqual(_.toArray(arguments), args);
        executed = true;
    }

    function undoCmdFunc() {
        assert.equal(this, undoCmd);
        assert.deepEqual(_.toArray(arguments), args);
        executed = true;
    }


    beforeEach(function() {
        executed = false;
    });


    it('should define execute method', function() {
        command = new Command(cmdFunc, 1, 2, 3);
        command.execute();
        assert(executed);
    });


    it('should define create class method', function() {
        command = Command.create(cmdFunc, 1, 2, 3);
        command.execute();
        assert(executed);
    });


    it('should define setArguments method', function() {
        command = new Command(cmdFunc);
        command.setArguments(1, 2, 3);
        command.execute();
        assert(executed);
    });


    it('should define addArguments method', function() {
        command = new Command(cmdFunc, 1);
        command.addArguments(2, 3);
        command.execute();
        assert(executed);
    });


    it('should define setUndo and getUndo methods', function() {
        command = new Command(cmdFunc, 1, 2, 3);
        undoCmd = new Command(undoCmdFunc, -3, -2, -1); // just an example
        command.setUndo(undoCmd);
        assert.equal(command.getUndo(), undoCmd);
        assert.equal(undoCmd.getUndo(), command);
    });


    it('should define destroy method', function() {
        command = new Command(cmdFunc, 1, 2, 3);
        undoCmd = new Command(undoCmdFunc, -3, -2, -1); // just an example
        command.setUndo(undoCmd);

        command.execute();
        assert(executed);

        command.destroy();
        assert.equal(command.func, undefined);
        assert.equal(command.args, undefined);
        assert.throws(command.execute.bind(command));
        assert.equal(command.getUndo(), undefined);
        assert.equal(undoCmd.getUndo(), undefined);
    });
});
