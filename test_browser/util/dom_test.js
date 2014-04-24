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


    it('should define treePathOf', function() {
        var treePathOf = domUtils.treePathOf;
        var p1 = document.getElementById('tree-index-1')
            , p2 = document.getElementById('tree-index-6')
            , p3 = document.getElementById('tree-index-11')
            , p4 = document.getElementById('tree-index-16');

        assert.deepEqual(treePathOf(root, p1), [0]);
        assert.deepEqual(treePathOf(root, p2), [2, 1]);
        assert.deepEqual(treePathOf(root, p3), [2, 3, 1]);
        assert.deepEqual(treePathOf(root, p4), [4]);
    });


    it('should define getNodeAtTreePath', function() {
        var getNodeAtTreePath = domUtils.getNodeAtTreePath;
        var p1 = document.getElementById('tree-index-1')
            , p2 = document.getElementById('tree-index-6')
            , p3 = document.getElementById('tree-index-11')
            , p4 = document.getElementById('tree-index-16');

        assert.equal(getNodeAtTreePath(root, [0]), p1, 'p1');
        assert.equal(getNodeAtTreePath(root, [2, 1]), p2, 'p2');
        assert.equal(getNodeAtTreePath(root, [2, 3, 1]), p3, 'p3');
        assert.equal(getNodeAtTreePath(root, [4]), p4, 'p4');        
    });


    it('getNodeAtTreePath should work with nearest paths', function() {
        var getNodeAtTreePath = domUtils.getNodeAtTreePath;
        var p1 = document.getElementById('tree-index-1')
            , p2 = document.getElementById('tree-index-6')
            , p3 = document.getElementById('tree-index-11')
            , p4 = document.getElementById('tree-index-16');

        assert.equal(getNodeAtTreePath(root, [5]), undefined, 'p4 false');
        assert.equal(getNodeAtTreePath(root, [5], true), p4, 'p4 true');

        var text1 = getNodeAtTreePath(root, [2, 4]);
        assert.equal(getNodeAtTreePath(root, [2, 5]), undefined, 'text1 false');
        assert.equal(getNodeAtTreePath(root, [2, 5], true), text1, 'text1 true');

        var text2 = getNodeAtTreePath(root, [2, 3, 2]);
        assert(text2 instanceof Text);
        assert.equal(getNodeAtTreePath(root, [2, 3, 3]), undefined, 'text2 false');
        assert.equal(getNodeAtTreePath(root, [2, 3, 3], true), text2, 'text2 true');
    });


    it('should define insertAtTreePath', function() {
        var treePathOf = domUtils.treePathOf
            , insertAtTreePath = domUtils.insertAtTreePath;
        var p = document.getElementById('tree-index-11')
            , path = treePathOf(root, p)
            , currentHTML = root.innerHTML;

        assert.deepEqual(path, [2, 3, 1]);

        p.parentNode.removeChild(p);

        insertAtTreePath(root, path, p);

        assert.deepEqual(treePathOf(root, p), [2, 3, 1]);
        assert.equal(currentHTML, root.innerHTML);
    });
});
