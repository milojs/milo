'use strict';


var fragmentUtils = milo.util.fragment
    , assert = require('assert')
    , fs = require('fs');


var html = fs.readFileSync(__dirname + '/fragment_test.html');


describe('util.fragment', function() {
    var root;


    beforeEach(function() {
        document.body.innerHTML = '';
        root = milo.Component.createOnElement(undefined, html);
        document.body.appendChild(root.el);
    });


    function rangeNode(id) {
        return document.getElementById(id).firstChild;
    }


    it('should define getState and createFromState', function(done) {
        var range = document.createRange();
        range.setStart(rangeNode('range-start'), 2);
        range.setEnd(rangeNode('range-end'), 3);

        fragmentUtils.getState(range, function(err, state) {
            assert(!err);

            fragmentUtils.createFromState(state, function(err, frag) {
                assert(!err);
                assert(frag instanceof DocumentFragment);
                done();
            });
        });
    });


    it('should return component to the same state when fragment is re-inserted', function(done) {
        var range = document.createRange();
        range.setStartBefore(document.getElementById('range-start'));
        range.setEndAfter(document.getElementById('range-end-full'));
    });
});
