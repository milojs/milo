'use strict';


var zeroTimeout = require('../../lib/util/zero_timeout')
    , assert = require('assert');


describe('util.zeroTimeout', function() {
    it('should schedule a delayed execution', function (done) {
        var executed;
        function execute() { executed = true; }
        zeroTimeout(execute);
        _.delay(function() {
            assert(executed);
            done();
        }, 10)
    });
});
