'use strict';


var TransactionHistory = require('../../lib/command/transaction_history')
    , Command = require('../../lib/command')
    , assert = require('assert')
    , _ = require('milo-core').proto;


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
        var cmd = new Command(commandFunc, id)
            , undoCmd = new Command(commandFunc, -id);
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

                    _.deferTicks(function() {
                        assert.deepEqual(executed, [[-3], [-2], [-1]]);

                        executed = [];

                        history.undo();

                        _.deferTicks(function() {
                            assert.deepEqual(executed, []);

                            executed = [];

                            history.redo();

                            _.deferTicks(function() {

                                assert.deepEqual(executed, [[1], [2], [3]]);

                                executed = [];

                                history.redo();

                                _.deferTicks(function() {

                                    assert.deepEqual(executed, []);

                                    executed = [];

                                    done();
                                }, 4);
                            }, 4);
                        }, 4);
                    }, 4);
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
                    
                    _.deferTicks(function() {
                        assert.deepEqual(executed, [[-5], [-4]]);

                        executed = [];

                        history.undo();

                        _.deferTicks(function() {
                            assert.deepEqual(executed, [[-3], [-2], [-1]]);

                            done();
                        }, 4);
                    }, 3);
                }, 2);
            }, 2);
        });
    });


    it('should emit messages', function(done) {
        var messages = [];
        history.useMessenger();
        history.onSync(/.*/, function(msg, data) {
            messages.push({ msg: msg, data: data });
        });

        history.storeCommand(createTestCommand(1));
        history.storeCommand(createTestCommand(2));

        _.defer(function() {
            history.storeCommand(createTestCommand(3));

            assert.equal(messages.length, 0);

            _.deferTicks(function() {
                assert.equal(history.inTransaction(), false);

                assert.equal(messages.length, 1);
                assert.equal(messages[0].msg, 'stored');

                history.storeCommand(createTestCommand(4), true);

                _.deferTicks(function() {
                    assert.equal(history.inTransaction(), false);

                    assert.equal(messages.length, 2);
                    assert.equal(messages[1].msg, 'appended');
    
                    var t = history.undo();

                    _.defer(function() {
                        assert.equal(history.inTransaction(), false);
                        assert.equal(messages.length, 3);
                        assert.equal(messages[2].msg, 'undone');
                        assert(messages[2].data.transaction == t);
                        done();
                    });
                }, 2);
            }, 2);
        });
    });
});
