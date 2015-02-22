'use strict';

var _ = require('milo-core').proto
    , assert = require('assert')
    , check = require('milo-core').util.check
    , Match = check.Match;

describe('check module', function() {
    var notDefined
        , nullVar = null
        , obj = {prop: 'test'}
        , arr = [1, 2, 3]
        , func = function(){}
        , myDate = new Date();

    var toTest = [
        [func, Function, 'function'],
        [myDate, Date, 'constructor'],
        ['test', String, 'string'],
        [8.5, Number, 'number'],
        [NaN, Number, 'NaN number'],
        [Infinity, Number, 'Infinity number'],
        [obj, Object, 'object'],
        [false, Boolean, 'boolean'],
        [4, Match.Integer, 'Match.Integer'],
        [notDefined, undefined, 'undefined'],
        [nullVar, null, 'null'],
        [arr, Array, 'Array']
    ];
    var failValues = [
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        String,
        undefined,
        undefined
    ];

    it('should match.test for different data types', function() {
        toTest.forEach(function(val, i) {
            assert(Match.test(val[0], val[1]), 'match.test ' + val[2]);
            assert.equal(Match.test(val[0], failValues[i]), false, 'match.test fails ' + val[2]);
        });
    });

    it('should check test for different data types', function() {
        toTest.forEach(function(val, i) {
            assert.doesNotThrow(function() {
                check(val[0], val[1]);
            }, 'check ' + val[2]);
            assert.throws(function() {
                check(val[0], failValues[i]);
            }, 'check ' + val[2]);
        });
    });

    it('should match.test and check using Match.Any pattern', function() {
        toTest.forEach(function(val) {
            assert(Match.test(val[0], Match.Any), 
                'match.test ' + val[2] + ' with Match.Any');
            assert.doesNotThrow(
                function() {check(val[0], Match.Any)}, 
                'check ' + val[2] + ' with Match.Any'
            );
        });
    });

    it('should match.test and check using Match.Optional pattern', function() {
        toTest.forEach(function(val) {
            assert(Match.test(val[0], Match.Optional(val[1])), 
                'match.test ' + val[2] + ' with Match.Optional');
            assert(Match.test(notDefined, Match.Optional(val[1])), 
                'match.test ' + val[2] + ' with Match.Optional');

            assert.doesNotThrow(
                function() { check(val[0], Match.Optional(val[1])); }, 
                'check ' + val[2] + ' with Match.Optional'
            );
            assert.doesNotThrow(
                function() { check(notDefined, Match.Optional(val[1])); },
                'check an undefined against a string'
            );
        });
        assert.equal(Match.test(34, Match.Optional(String)), false,
                'match.test number with Match.Optional string');
        assert.doesNotThrow(
            function() { check(func, Match.Optional(Function)); }, 
            'check function with with Match.Optional'
        );
        assert.throws(
            function() { check(34, Match.Optional(String)); },
            'check a number against a string'
        );
    });

    it('should match.test and check using Array [pattern]', function() {
        assert(Match.test(['test1', 'test2', 'test3'], [String]), 
            'match.test array of strings with Array [pattern]');
        assert.doesNotThrow(
            function() { check(['test1', 'test2', 'test3'], [String]); }, 
            'check array of strings with Array [pattern]'
        );
        assert.equal(Match.test(['test1', 'test2', 34], [String]), false,
            'match.test array of strings with Array [pattern] fails');
        assert.throws(
            function() { check(['test1', 'test2', 34], [String]); }, 
            'check array of strings with Array [pattern] throws'
        );
    });

    it('should match.test and check using Object {key: pattern}', function() {
        assert(Match.test({key1: 'test', key2: 6}, {key1: String, key2: Match.Integer}), 
            'match.test array of strings with Object {key: pattern}');
        assert.doesNotThrow(
            function() { check({key1: 'test', key2: 6}, {key1: String, key2: Match.Integer}); }, 
            'check array of strings with Object {key: pattern}'
        );
        assert.equal(Match.test({key1: 'test'}, {key1: String, key2: Match.Integer}), false,
            'match.test array of strings with Object {key: pattern} fails');
        assert.throws(
            function() { check({key1: 'test'}, {key1: String, key2: Match.Integer}); }, 
            'check array of strings with Object {key: pattern} throws'
        );
    });

    it('should match.test and check using Match.ObjectIncluding', function() {
        assert(Match.test({key1: 'test', key2: 6, key3:null, key4: ['hello']}, Match.ObjectIncluding({key1: String, key2: Match.Integer})), 
            'match.test array of strings with ObjectIncluding');
        assert.doesNotThrow(
            function() { check({key1: 'test', key2: 6, key3:null, key4: ['hello']}, Match.ObjectIncluding({key1: String, key2: Match.Integer})); }, 
            'check array of strings with ObjectIncluding'
        );
        assert.equal(Match.test({key1: 'test', key3:null, key4: ['hello']}, Match.ObjectIncluding({key1: String, key2: Match.Integer})), false,
            'match.test array of strings with ObjectIncluding fails');
        assert.throws(
            function() { check({key1: 'test', key3:null, key4: ['hello']}, Match.ObjectIncluding({key1: String, key2: Match.Integer})); }, 
            'check array of strings with ObjectIncluding throws'
        );
    });

    it('should match.test and check using Match.OneOf', function() {
        assert(Match.test('test', Match.OneOf(null, Number, String)),
            'match.test string against number of types');
        assert.equal(Match.test([], Match.OneOf(null, Number, String)), false,
            'match.test array against number of types fails');
        assert.doesNotThrow(
            function() { check('test', Match.OneOf(null, Number, String)) },
            'check string against number of types');
        assert.throws(
            function() { check([], Match.OneOf(null, Number, String)) },
            'check array against number of types fails');
    });

    it('should match.test and check using Match.Where', function() {
        var NonEmptyString = Match.Where(function (x) {
            check(x, String);
            return x.length > 0;
        });
        assert(Match.test('test', NonEmptyString),
            'match.test string against Match.Where');
        assert.equal(Match.test('', NonEmptyString), false,
            'match.test array against Match.Where fails');
        assert.doesNotThrow(
            function() { check('test', NonEmptyString) },
            'check string against Match.Where');
        assert.throws(
            function() { check('', NonEmptyString) },
            'check array against Match.Where throws');
    });

    it('should match.test and check with Match.ObjectHash pattern', function() {
        var objPass = { prop1: function() {}, prop2: function() {} };
        var objFail = { prop1: function() {}, prop2: 'test' };

        assert(Match.test(objPass, Match.ObjectHash(Function)),
            'match.test object against Match.ObjectHash');
        assert.equal(Match.test(objFail, Match.ObjectHash(Function)), false,
            'match.test object against Match.ObjectHash fails');
        assert.doesNotThrow(function() {
            check(objPass, Match.ObjectHash(Function));
        }, 'should NOT throw if all properties of object are Functions');
        assert.throws(function() {
            check(objFail, Match.ObjectHash(Function));
        }, 'should fail if one property is a string');
    });

    it('should match.test and check using Match.Subclass', function() {
        var Parent = function(name) { this.name = name; };
        var Child = _.createSubclass(Parent, 'Child', true);
        
        assert(Match.test(Child, Match.Subclass(Parent)),
            'match.test instance with Match.Subclass including superclass');
        assert.equal(Match.test(Child, Match.Subclass(Array)), false,
            'match.test instance with Match.Subclass including superclass fails');
        assert.doesNotThrow(function() { 
            check(Child, Match.Subclass(Parent)) 
        }, 'check instance with Match.Subclass including superclass');
        assert.throws(function() { 
            check(Child, Match.Subclass(Array)) 
        }, 'check instance with Match.Subclass including superclass throws');
    });

});
