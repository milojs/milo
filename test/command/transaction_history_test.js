'use strict';


var TransactionHistory = require('../../lib/command/transaction_history')
    , Command = require('../../lib/command')
    , assert = require('assert')
    , _ = require('mol-proto');


describe('TransactionHistory', function() {
    var history, executed;

    function commandFunc() {
        executed.push(_.toArray(arguments));
    }

    beforeEach(function() {
        history = new TransactionHistory;
        executed = [];
    });


    function createTestTransaction(from, to) {
        var trans = new Transaction;
        for (var i = from; i < to; i++) {
            var cmd = createTestCommand(i);
            trans.storeCommand(cmd);
        }
        return trans;
    }


    function createTestCommand(id) {
        var cmd = new Command(context, commandFunc, id)
            , undoCmd = new Command(context, commandFunc, -id);
        cmd.setUndo(undoCmd);
        return cmd;
    }


    it('should define storeCommand method', function(done) {
        history.storeCommand(createTestCommand(1));
        history.storeCommand(createTestCommand(2));

        _.defer(function() {
            assert(history.inTransaction());
            history.storeCommand(createTestCommand(3));

            _.defer(function() {
                assert(history.inTransaction());

                _.defer(function() {
                    assert.equal(history.inTransaction(), false);

                    history.undo();

                        assert.deepEqual(executed, [[-3], [-2], [-1]]);

                    executed = [];

                    history.undo();

                        assert.deepEqual(executed, []);

                    executed = [];

                    history.redo();

                        assert.deepEqual(executed, [[1], [2], [3]]);

                    executed = [];

                    history.redo();

                        assert.deepEqual(executed, []);

                    executed = [];

                    done();
                });
            });
        });
    });


    it('should manage multiple transactions', function(done) {
        history.storeCommand(createTestCommand(1));
        history.storeCommand(createTestCommand(2));

        _.defer(function() {
            history.storeCommand(createTestCommand(3));

            _.deferTicks(function() {
                assert.equal(history.inTransaction(), false);

                history.storeCommand(createTestCommand(4));
                history.storeCommand(createTestCommand(5));
                _.deferTicks(function() {
                    assert.equal(history.inTransaction(), false);

                    history.undo();
                        assert.deepEqual(executed, [[-5], [-4]]);

                    executed = [];

                    history.undo();
                        assert.deepEqual(executed, [[-3], [-2], [-1]]);

                    done();
                }, 2);
            }, 2);
        });
    });
});
