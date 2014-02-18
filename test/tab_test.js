'use strict';

var assert = require('assert')
    , exec = require('child_process').exec
    , async = require('async');

describe('tab characters', function() {

    it('should be replaced with 4 spaces before committing', function(done) {
        async.each(['lib', 'test'], detectTabs, done);
    });

    function detectTabs(dir, next) {
        exec('grep -R -l --include=*.{js,scss,html,dot} "\t" ' + dir, function(err, stdout, stderr) {
            var files = stdout.split('\n').filter(notExcluded);

            assert.ok(files.length == 0, 'tab characters should be replaced with 4 spaces (use ./expandTabs) in the following files: ' + files);
            
            next();
        })
    };

    function notExcluded(file) {
        if (! file) return false;

        var exclusion = [/vendor/].some(function(pattern) {
            return pattern.test(file);
        });

        return ! exclusion;
    }
});
