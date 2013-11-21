'use strict';

var assert = require('assert')
    , exec = require('child_process').exec
    , async = require('async');

describe('console.log statements', function() {

    it('should be removed before committing', function(done) {
        async.each(['lib', 'test'], detectConsoleLog, done);
    });

    function detectConsoleLog(dir, next) {
        exec('grep -r -l "console.log" ' + dir, function(err, stdout, stderr) {
            var files = stdout.split('\n').filter(notExcluded);

            assert.ok(files.length == 0, 'console.log statements should be removed or excluded from the following files: ' + files);
            
            next();
        })
    };

    function notExcluded(file) {
        if (! file) return false;

        var exclusion = [/vendor/, /console_log_test/].some(function(pattern) {
            return pattern.test(file);
        });

        return ! exclusion;
    }
});
