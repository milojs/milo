'use strict';


var Transaction = require('../../lib/command/transaction')
    , Command = require('../../lib/command')
    , assert = require('assert')
    , _ = require('milo-core').proto;


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


    it('should define undo, redo, execute methods', function(done) {
        var callbackCalled;
        transaction.undo(testTransactionUndo);

        function testTransactionUndo() {
            callbackCalled = true;
            assert.deepEqual(executed, [[-3], [-2], [-1]]);
        }

        function testTransactionRedo() {
            callbackCalled = true;
            assert.deepEqual(executed, [[1], [2], [3]]);
        }

        _.deferTicks(function() {
            assert(callbackCalled);
            callbackCalled = false;
            assert.deepEqual(executed, [[-3], [-2], [-1]]);

            executed = [];

            transaction.undo();

            _.deferTicks(function() {
                assert.deepEqual(executed, []);

                executed = [];

                transaction.redo(testTransactionRedo);

                _.deferTicks(function() {
                    assert(callbackCalled);
                    assert.deepEqual(executed, [[1], [2], [3]]);

                    executed = [];

                    transaction.redo();

                    _.deferTicks(function() {
                        assert.deepEqual(executed, []);

                        transaction.execute();
        
                        _.deferTicks(function() {
                            assert.deepEqual(executed, [[1], [2], [3]]);
                            done();
                        }, 4);
                    }, 4);
                }, 4);
            }, 4);
        }, 4);
    });


    it('should define merge method', function(done) {
        var batch = createTestTransaction(4, 6);
        transaction.merge(batch);

        transaction.execute();

        _.deferTicks(function() {
            assert.deepEqual(executed, [[1], [2], [3], [4], [5]]);

            executed = [];

            transaction.undo();

            _.deferTicks(function() {
                assert.deepEqual(executed, [[-5], [-4], [-3], [-2], [-1]]);

                executed = [];

                transaction.undo();

                _.deferTicks(function() {
                    assert.deepEqual(executed, []);

                    executed = [];

                    transaction.redo();
            
                    _.deferTicks(function() {
                        assert.deepEqual(executed, [[1], [2], [3], [4], [5]]);

                        executed = [];

                        transaction.redo();

                        _.deferTicks(function() {
                            assert.deepEqual(executed, []);
                            done();
                        }, 6);
                    }, 6);
                }, 6);
            }, 6);
        }, 6);
    });
});
