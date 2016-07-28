'use strict';

var assert = require('assert')
    , async = require('async');

describe('Css facet', function() {
    milo.config.check = true; // Enable 'check' library so that inputs to the Css facet are validated

    var ComponentClass = milo.createComponentClass({
        className: 'CssComponent',
        facets: {
            css: {
                classes: {
                    // Used for simple tests
                    '.modelPath1': 'css-class-1',

                    // Used for object value lookup tests
                    '.modelPath2': {
                        'black': 'black-css-class',
                        'red': 'red-css-class',
                        'orange': '$-css-class'
                    },

                    // Used for function tests
                    '.modelPath3': function(data) {
                        return data ? data + '-class' : null;
                    },

                    // Used for template tests
                    '.modelPath4': '$-class',

                    // Used to test nested props
                    '.nested.property': 'nested-example'
                }
            }
        }
    });

    var component;
    var dataSource;
    var connector;

    beforeEach(function() {
        component = ComponentClass.createOnElement();
        dataSource = new milo.Model();
        connector && milo.minder.destroyConnector(connector);
        connector = milo.minder(dataSource, '->>>>>>', component.css);
    });

    it('should apply css class regardless of model path structure', function (done) {
        runTests.call(this, done, [
            test('.nested.property', true, ['nested-example']), // Add class
            test('.nested.property', false, []), // Remove class
            test('.nested.property', {}, ['nested-example']), // Add class (truthy value, not boolean true)
            test('.nested.property', '', []) // Remove class (falsey value, not boolean false)
        ]);
    });

    it('should apply css classes based on truthy values', function(done) {
        runTests.call(this, done, [
            test('.modelPath1', true, ['css-class-1']), // Add class
            test('.modelPath1', false, []), // Remove class
            test('.modelPath1', {}, ['css-class-1']), // Add class (truthy value, not boolean true)
            test('.modelPath1', '', []) // Remove class (falsey value, not boolean false)
        ]);
    });

    it('should apply css classes to element supplied with getClassList', function(done) {
        var TestClass = milo.createComponentClass({
            className: 'TestClass',
            facets: {
                css: {
                    getClassList: function () {return this.owner.el.querySelector('.inner').classList;},
                    classes: {'.test': 'test'}
                }
            }
        });

        var comp = TestClass.createOnElement(null, '<strong class="inner"></strong>');
        var m = new milo.Model();

        milo.minder(m, '->>', comp.css);

        comp.css.once('changed', function() {
            var innerClassList = comp.el.querySelector('.inner').classList;
            assert(innerClassList.contains('test'));
            done();
        });
        m('.test').set(true);
    });

    it('should apply classes based on model values in a lookup table', function(done) {
        runTests.call(this, done, [
            test('.modelPath2', 'black', ['black-css-class']), // Add
            test('.modelPath2', 'red', ['red-css-class']), // Replace
            test('.modelPath2', 'orange', ['orange-css-class']), // Replace (and is templated)
            test('.modelPath2', null, []), // Remove
            test('.modelPath2', 'green', []) // Not in lookup
        ]);
    });

    it('should apply classes based on the result of function calls', function(done) {
        runTests.call(this, done, [
            test('.modelPath3', 'apple', ['apple-class']), // Add
            test('.modelPath3', 'banana', ['banana-class']), // Replace
            test('.modelPath3', null, []), // Remove
        ]);
    });

    it('should template class names', function(done) {
        runTests.call(this, done, [
            test('.modelPath4', 'dog', ['dog-class']), // Add
            test('.modelPath4', 'cat', ['cat-class']), // Replace
            test('.modelPath4', null, [])
        ]);
    });

    it('should only remove classes when no other model value is applying the same class', function(done) {
        runTests.call(this, done, [
            test('.modelPath2', 'black', ['black-css-class']), // Add
            test('.modelPath3', 'black-css', ['black-css-class']), // Add same class (different model path)
            test('.modelPath4', 'black-css', ['black-css-class']), // Add same class (different model path
            test('.modelPath3', null, ['black-css-class']), // Null model value (class still applied due to other model values)
            test('.modelPath4', null, ['black-css-class']), // Null model value (class still applied due to other model values)
            test('.modelPath2', null, []) // Finally removed as no other model values result in the class being applied
        ]);
    });

    it('should allow model data to be set directly', function(done) {
        // Set directly
        component.css.set({
            '.modelPath1': true,
            '.modelPath2': 'red',
            '.modelPath3': 'pear',
            '.modelPath4': 'pig'
        });

        assertCssExists('css-class-1'); // modelPath1
        assertCssExists('red-css-class'); // modelPath2
        assertCssExists('pear-class'); // modelPath3
        assertCssExists('pig-class'); // modelPath4

        // Set via milo.binder connection
        dataSource.set({
            modelPath1: true,
            modelPath2: 'black',
            modelPath3: 'lemon',
            modelPath4: 'bear'
        });

        component.css.onSync('changedata', function() {
            assertCssExists('css-class-1'); // modelPath1
            assertCssExists('black-css-class'); // modelPath2
            assertCssExists('lemon-class'); // modelPath3
            assertCssExists('bear-class'); // modelPath4

            done();
        });

        function assertCssExists(className) {
            assert(component.el.classList.contains(className), 'Expected ' + className + ' css class to exist');
        }
    });

    it('should delete all classes when data is set to null/undefined', function() {
        testWith(null);
        testWith(undefined);

        function testWith(data) {
            component.css.set({
                '.modelPath1': true,
                '.modelPath2': 'red',
                '.modelPath3': 'pear',
                '.modelPath4': 'pig'
            });

            assertCssExists('css-class-1'); // modelPath1
            assertCssExists('red-css-class'); // modelPath2
            assertCssExists('pear-class'); // modelPath3
            assertCssExists('pig-class'); // modelPath4

            component.css.set(data);

            assert.equal(component.el.classList.length, 0, 'Expected all Css classes to have been removed');
        }

        function assertCssExists(className) {
            assert(component.el.classList.contains(className), 'Expected ' + className + ' css class to exist');
        }
    });

    it('should throw exception if supplied with invalid data', function() {
        // Valid inputs
        trySet({}, true);
        trySet(null, true);
        trySet(undefined, true);

        // Invalid inputs
        trySet(true, false);
        trySet(false, false);
        trySet('Hello world', false);
        trySet(1, false);

        function trySet(data, isValidInput) {
            var exceptionThrown = false;
            var message = (isValidInput ? 'Unexpected' : 'Expected') + ' exception when setting data type ' + typeof data;

            try {
               component.css.set(data);
            } catch(e) {
               exceptionThrown = true;
            }

            assert(isValidInput != exceptionThrown, message);
        }
    });

    function runTests(next, testSpecs) {
        this.timeout(10000);

        async.forEachSeries(testSpecs, runTest, next);

        function runTest(testSpec, next) {
            // Listen for the CSS facet to let us know it has updated the css classes
            component.css.onceSync('changed', onCssClassesChanged);

            // Update the model as per the test spec
            dataSource(testSpec.modelPath).set(testSpec.modelValue);

            function onCssClassesChanged(msg, data) {
                try {
                    assert.equal(testSpec.modelPath, data.modelPath);
                    assert.equal(testSpec.modelValue, data.modelValue);

                    var classList = component.el.classList;
                    var expectedClassList = testSpec.expectedCssClasses;

                    assert.equal(classList.length, expectedClassList.length,
                        'Class list mismatch.  Expected "' + expectedClassList.join(' ') + '" but got "' + classList.toString() + '"');

                    expectedClassList.forEach(function(cssClass) {
                        assert(classList.contains(cssClass),
                            'Missing expected class: ' + cssClass + '. ClassList was "' + classList.toString() + '"');
                    });

                    next();
                } catch(e) {
                    next(e);
                }
            }
        }
    }

    function test(modelPath, modelValue, expectedCssClasses) {
        return {
            modelPath: modelPath,
            modelValue: modelValue,
            expectedCssClasses: expectedCssClasses
        };
    }
});
