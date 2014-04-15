'use strict';


var Transaction = require('../../lib/command/transaction')
    , Command = require('../../lib/command')
    , assert = require('assert')
    , _ = require('mol-proto');


describe('Transaction', function() {
    var executed, transaction;


    function commandFunc() {
        executed.push(_.toArray(arguments));
    }

    beforeEach(function() {
        transaction = createTestTransaction(1, 4);
        executed = [];
    });


    function createTestTransaction(from, to) {
        var trans = new Transaction;
        for (var i = from; i < to; i++) {
            var cmd = new Command(commandFunc, i)
                , undoCmd = new Command(commandFunc, -i);
            cmd.setUndo(undoCmd);
            trans.storeCommand(cmd);
        }
        return trans;
    }


    it('should define undo, redo, execute methods', function() {
        transaction.undo();
            assert.deepEqual(executed, [[-3], [-2], [-1]]);

        executed = [];

        transaction.undo();
            assert.deepEqual(executed, []);

        executed = [];

        transaction.redo();
            assert.deepEqual(executed, [[1], [2], [3]]);

        executed = [];

        transaction.redo();
            assert.deepEqual(executed, []);

        transaction.execute();
            assert.deepEqual(executed, [[1], [2], [3]]);
    });


    it('should define merge method', function() {
        var batch = createTestTransaction(4, 6);
        transaction.merge(batch);

        transaction.execute();
            assert.deepEqual(executed, [[1], [2], [3], [4], [5]]);

        executed = [];

        transaction.undo();
            assert.deepEqual(executed, [[-5], [-4], [-3], [-2], [-1]]);

        executed = [];

        transaction.undo();
            assert.deepEqual(executed, []);

        executed = [];

        transaction.redo();
            assert.deepEqual(executed, [[1], [2], [3], [4], [5]]);

        executed = [];

        transaction.redo();
            assert.deepEqual(executed, []);
    });
});
