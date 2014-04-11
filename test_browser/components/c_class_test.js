'use strict';


var Component = milo.Component
    , fs = require('fs')
    , assert = require('assert');


var html = fs.readFileSync(__dirname + '/c_class_test.html');


describe('Component', function() {
    var scope, root;

    beforeEach(function() {
        document.body.innerHTML = '';
        var div = document.createElement('div');
        div.innerHTML = html;
        document.body.appendChild(div);
        scope = milo.binder(div);
        root = scope.root;
    });


    it('should define treeIndexOf and getComponentAtTreeIndex', function() {
        assert.equal(root.treeIndexOf(scope.articleButton), 9);
        assert.equal(root.getComponentAtTreeIndex(9), scope.articleButton, 'articleButton');
    });

    it('should define remove, setScopeParentFromDOM', function() {
        var infoView = scope.infoView
            , para1 = infoView.container.scope.para1;
        para1.remove(); // removes from scope
            assert.equal(para1.scope, undefined);
            assert.equal(infoView.container.scope.para1, undefined);

        para1.setScopeParentFromDOM();
            assert.equal(para1.scope, infoView.container.scope, 'para1.scope');
            assert.equal(infoView.container.scope[para1.name], para1, 'para1 in scope');
    });

    it('should define insertAtTreeIndex', function() {
        var infoView = scope.infoView
            , para1 = infoView.container.scope.para1
            , treeIndex = root.treeIndexOf(para1)
            , currentHTML = root.el.innerHTML;

        para1.remove(); // removes from scope
        para1.dom.remove(); // and from DOM

        root.insertAtTreeIndex(treeIndex, para1)
        para1.rename('para1');
            assert.equal(currentHTML, root.el.innerHTML);
            assert.equal(para1.scope, infoView.container.scope, 'para1.scope');
            assert.equal(infoView.container.scope.para1, para1, 'para1 in scope');
    });
});
