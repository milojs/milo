'use strict';


var Component = milo.Component
    , fs = require('fs')
    , assert = require('assert');

var html = fs.readFileSync(__dirname + '/c_class_test.html');


var childDestroyCalled;
createMyClass();


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

    it('should define treePathOf and getComponentAtTreePath', function() {
        assert.deepEqual(root.treePathOf(scope.articleButton), [1, 5]);
        assert.equal(root.getComponentAtTreePath([1, 5]), scope.articleButton, 'articleButton');
    });

    it('should define insertAtTreePath', function() {
        var infoView = scope.infoView
            , para1 = infoView.container.scope.para1
            , treePath = root.treePathOf(para1)
            , currentHTML = root.el.innerHTML;

        para1.remove(); // removes from scope
        para1.dom.remove(); // and from DOM

        root.insertAtTreePath(treePath, para1)
        para1.rename('para1');
            assert.equal(currentHTML, root.el.innerHTML);
            assert.equal(para1.scope, infoView.container.scope, 'para1.scope');
            assert.equal(infoView.container.scope.para1, para1, 'para1 in scope');
    });


    it('should define destroy method that recurcively destroys all child components', function() {
        var parent = scope.parent
            , child = parent.container.scope.child
            , parentEl = parent.el
            , childEl = child.el;
        childDestroyCalled = false;
        parent.destroy();
        assert(childDestroyCalled);
        testDestroyed(parent, parentEl);
        testDestroyed(child, childEl);
    });
});


function createMyClass() {
    var MyClass = _.createSubclass(Component, 'MyClass');
    _.extendProto(MyClass, {
        destroy: function() {
            childDestroyCalled = true;
            Component.prototype.destroy.apply(this, arguments);
        }
    });
    milo.registry.components.add(MyClass);
}


function testDestroyed(component, el) {
    assert(component.isDestroyed);
    assert.equal(component.el, undefined);
    assert.equal(el.parentNode, undefined);
    assert.equal(Component.getComponent(el), undefined);
    assert.equal(component.container.scope._length(), 0);
}
