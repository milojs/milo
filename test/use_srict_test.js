'use strict';

var assert = require('assert')
    , exec = require('child_process').exec
    , async = require('async');

describe('\'use strict\'; statements', function() {

    it('should be added before committing', function(done) {
        async.each(['lib', 'test'], detectConsoleLog, done);
    });

    function detectConsoleLog(dir, next) {
        exec('grep -r --regexp="^\'use strict\';" --files-without-match ' + dir, function(err, stdout, stderr) {
            var files = stdout.split('\n').filter(JSfiles);

            assert.ok(files.length == 0, '\'use strict\'; statements should be added to the first line of the following files: ' + files);
            
            next();
        })
    };

    function JSfiles(file) {
        return /\.js$/.test(file);
    }
});
