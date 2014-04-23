'use strict';


var fragmentUtils = milo.util.fragment
    , Component = milo.Component
    , assert = require('assert')
    , fs = require('fs');


var html = fs.readFileSync(__dirname + '/fragment_test.html');


describe('util.fragment', function() {
    var root;


    beforeEach(function() {
        document.body.innerHTML = '';
        root = milo.Component.createOnElement(undefined, html, undefined, ['container']);
        document.body.appendChild(root.el);
    });


    function rangeNode(id) {
        return document.getElementById(id).firstChild;
    }


    it('should define getState and createFromState', function() {
        var range = document.createRange();
        range.setStart(rangeNode('range-start'), 2);
        range.setEnd(rangeNode('range-end'), 3);

        var state = fragmentUtils.getState(range);
        var wrapper = Component.createFromState(state); 
        assert(wrapper instanceof Component);
    });


    it('should return component to the same state when fragment is re-inserted', function() {
        var main = root.container.scope.body.container.scope.main
            , mainScope = main.container.scope;

        mainScope.testModel.model.set({ test: 1 });
        var originalState = main.container.getState(true)
            , originalHTML = main.el.innerHTML;

        var range = document.createRange();
        range.selectNodeContents(main.el);

        var state = fragmentUtils.getState(range, false);

        mainScope._each(function(child) {
            child.destroy();
        });

        main.el.innerHTML = '';
        assert.equal(mainScope._length(), 0);

        var wrapper = Component.createFromState(state);

        main.el.appendChild(wrapper.el);
        mainScope._add(wrapper);
        wrapper.container.unwrap(false);

        assert.equal(originalHTML, main.el.innerHTML);
        assert.deepEqual(main.container.getState(true), originalState);
    });
});
