'use strict';


var assert = require('assert');


describe('util.zeroTimeout', function() {
    it('should schedule a delayed execution', function (done) {
        var executed;
        function execute() { executed = true; }
        milo.util.zeroTimeout(execute);
        setTimeout(function() {
            assert(executed);
            done();
        }, 10)
    });


    it('should schedule multiple delayed executions', function (done) {
        var executed1, executed2;
        function execute1() { executed1 = true; }
        function execute2() { executed2 = true; }
        milo.util.zeroTimeout(execute1);
        milo.util.zeroTimeout(execute2);
        setTimeout(function() {
            assert(executed1);
            assert(executed2);
            done();
        }, 10)
    });
});
