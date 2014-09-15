'use strict';

var fs = require('fs')
    , assert = require('assert');

describe('Foldtree UI', function() {
    var testHtml = fs.readFileSync(__dirname + '/FoldTree_test.html');
    var element, scope,
        testData = { items: [
            { label: 'Jason Green', id: '001', items:
                [
                    { label: 'child01', id: '005', items: 
                        [
                            { label: 'subchild01', id: '006', item: []}
                        ]
                    }
                ]
            },
            { label: 'Luis Fetzner', id: '002'},
            { label: 'Tom Burnell', id: '003', items:
                [
                    { label: 'child02', id: '007', items: 
                        [
                            { label: 'subchild02', id: '008', item: []}
                        ]
                    }
                ]
            },
            { label: 'Evgeny Poberezkin', id: '004'}
        ] };

    beforeEach(function() {
        var element = document.createElement('div');
        element.innerHTML = testHtml;

        // Bind the element
        scope = milo.binder(element);
    });

    it('should render in DOM', function() {
        scope.myTree.renderTree(testData);
        var liEls = scope.myTree.el.getElementsByTagName('li');
        assert.equal(liEls.length, 8);
    });
});