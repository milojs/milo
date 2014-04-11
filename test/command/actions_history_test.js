'use strict';


var ActionsHistory = require('../../lib/command/actions_history')
    , Command = require('../../lib/command')
    , assert = require('assert')
    , _ = require('mol-proto');


describe('ActionsHistory', function() {
    var executed, history;


    function commandFunc() {
        executed.push(_.toArray(arguments));
    }

    beforeEach(function() {
        history = new ActionsHistory;
        executed = [];

        for (var i = 1; i < 4; i++) {
            var cmd = new Command(context, commandFunc, i)
                , undoCmd = new Command(context, commandFunc, -i);
            cmd.setUndo(undoCmd);
            history.store(cmd);
        }
    });


    it('should define store and undo methods', function() {
        history.undo();

            assert.deepEqual(executed, [[-3]]);

        history.undo();
        history.undo();

            assert.deepEqual(executed, [[-3], [-2], [-1]]);
    });


    it('should define redo method', function() {
        history.undo();
        history.undo();
        history.undo();
        executed = [];

        history.redo();
            assert.deepEqual(executed, [[1]]);

        history.redo();
        history.redo();
            assert.deepEqual(executed, [[1], [2], [3]]);
    });


    it('should define each and eachReverse method', function() {
        history.each('execute');
        assert.deepEqual(executed, [[1], [2], [3]]);

        executed = [];

        history.eachReverse('undo');
        assert.deepEqual(executed, [[-3], [-2], [-1]]);
    });
});
