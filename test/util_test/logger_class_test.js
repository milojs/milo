'use strict';

var Logger = require('../../lib/util/logger_class')
    , assert = require('assert');

var logger = new Logger();

describe('Logger', function() {
    it('should define logger methods when instantiated', function() {
        ['log', 'error', 'warn', 'info', 'debug'].forEach(function(level) {
            assert(typeof (logger[level]) == 'function', 'should define logger methods');
        });
    });
});
