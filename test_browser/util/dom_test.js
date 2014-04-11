'use strict';


var domUtils = milo.util.dom
    , assert = require('assert')
    , fs = require('fs');


var html = fs.readFileSync(__dirname + '/dom_test.html');


describe('DOM utils', function() {
    var root;


    beforeEach(function() {
        document.body.innerHTML = '';
        root = document.createElement('div');
        root.innerHTML = html;
        document.body.appendChild(root);
    });


    it('should define treeIndexOf', function() {
        var treeIndexOf = domUtils.treeIndexOf;
        var p1 = document.getElementById('tree-index-1')
            , p2 = document.getElementById('tree-index-6')
            , p3 = document.getElementById('tree-index-11')
            , p4 = document.getElementById('tree-index-16');

        assert.equal(treeIndexOf(root, p1), 1);
        assert.equal(treeIndexOf(root, p2), 6);
        assert.equal(treeIndexOf(root, p3), 11);
        assert.equal(treeIndexOf(root, p4), 16);
    });


    it('should define getNodeAtTreeIndex', function() {
        var getNodeAtTreeIndex = domUtils.getNodeAtTreeIndex;
        var p1 = document.getElementById('tree-index-1')
            , p2 = document.getElementById('tree-index-6')
            , p3 = document.getElementById('tree-index-11')
            , p4 = document.getElementById('tree-index-16');

        assert.equal(getNodeAtTreeIndex(root, 1), p1, 'p1');
        assert.equal(getNodeAtTreeIndex(root, 6), p2, 'p2');
        assert.equal(getNodeAtTreeIndex(root, 11), p3, 'p3');
        assert.equal(getNodeAtTreeIndex(root, 16), p4, 'p4');
    });


    it('should define insertAtTreeIndex', function() {
        var treeIndexOf = domUtils.treeIndexOf
            , insertAtTreeIndex = domUtils.insertAtTreeIndex;
        var p = document.getElementById('tree-index-11')
            , index = treeIndexOf(root, p)
            , currentHTML = root.innerHTML;

        assert.equal(index, 11);

        p.parentNode.removeChild(p);

        insertAtTreeIndex(root, index, p);

        assert.equal(treeIndexOf(root, p), 11);
        assert.equal(currentHTML, root.innerHTML);
    });
});
