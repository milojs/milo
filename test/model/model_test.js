'use strict';


var Model = require('../../lib/model')
    , assert = require('assert')
    , _ = require('mol-proto');


describe('Model class', function() {
    it('should create instances return ModelPath objects', function() {
        var m = new Model();
        assert(m instanceof Model);

        var modelPath = m('.info.name');

        assert(modelPath.get instanceof Function, 'getter should be function');
        assert(modelPath.set instanceof Function, 'setter should be function');
    });


    it('should define getter "get()"', function() {
        var m = new Model;

        m._data = { info: { name: 'Milo' } };

        assert.deepEqual(m.get(), { info: { name: 'Milo' } }, 'should get correct value');
    });


    it('should return ModelPath that has compiled getter "get()"', function() {
        var m = new Model;

        var modelPath = m('.info.name');

        // setting data directly, should not be done this way in application
        m._data = { info: { name: 'Milo' } };

            assert.equal(modelPath.get(), 'Milo');
            assert.equal(m('.info.name').get(), 'Milo');

        m._data = { info: {
            name: 'Jason',
            DOB: {
                date: 1,
                month: 2,
                year: 1982
            }
        } };
            assert.equal(modelPath.get(), 'Jason');
            assert.equal(m('.info.DOB.year').get(), 1982);

        assert.throws(function() {
            var id = m._data.info.person.id;
        }, 'direct access to property of undefined should throw')

        assert.doesNotThrow(function() {
            var id = m('.info.person.id').get();
        }, 'access to property of undefined should not throw');
        
            assert.equal(m('.info.person.id').get(), undefined,
                'access to property of undefined should return "undefined"');
    });


    it('should return ModelPath that has compiled setter "set()"', function() {
        var m = new Model();

        m('.info.name').set('Jason');
        m('.info.DOB.year').set(1982);

            // accessing model directly, should not be done this way in application
            assert.deepEqual(m._data, {
                info: {
                    name: 'Jason',
                    DOB: {
                        year: 1982
                    }
                }
            }, 'should correctly assign properties of undefined by defining them')

        m('.info.DOB.month').set(2);

            assert.deepEqual(m._data, {
                info: {
                    name: 'Jason',
                    DOB: {
                        month: 2,
                        year: 1982
                    }
                }
            }, 'should correctly assign properties of undefined by defining them')


        m('.info.DOB').set({
            date: 1,
            month: 2,
            year: 1982
        });

            assert.deepEqual(m._data, {
                info: {
                    name: 'Jason',
                    DOB: {
                        date: 1,
                        month: 2,
                        year: 1982
                    }
                }
            }, 'should correctly overwrite properties')
    });


    it('should support array syntax for property access paths for get() and set()', function() {
        var m = new Model();

        m('.list[0].info.name').set('Jason');
        m('.list[0].extra[0]').set('extra0');
        m('.list[0].extra[1]').set('extra1');
        m('.list[1].info.name').set('Evgeny');
        m('.list[1].added[1]').set(10);
        m('.list[1].added[2]').set(20);

            // accessing model directly, should not be done this way in application
            assert.deepEqual(m._data, {
                list: [
                    {
                        info: {
                            name: 'Jason'
                        },
                        extra: ['extra0', 'extra1']
                    },
                    {
                        info: {
                            name: 'Evgeny'
                        },
                        added: [, 10, 20]
                    },
                ]
            }, 'should correctly assign properties of undefined by defining them');

            assert.equal(m('.list[0].info.name').get(), 'Jason', 'getter should return correct value');
            assert.equal(m('.list[0].extra[1]').get(), 'extra1', 'getter should return correct value');
            assert.deepEqual(m('.list[1].added').get(), [, 10, 20],
                'getter should return correct value for arrays in properties too');
    });


    it('should postMessage on model when properties are added', function(done) {
        var m = new Model
            , posted = {};

        m.on(/.*/, function(message, data) {
            assert.equal(m, this, 'should set message handler context to model');
            if (data.type == 'finished') return;
            posted[data.path] = data;
        });

        m('.list[0].info.name').set('Jason');

        _.defer(function() {
            assert.deepEqual(posted, {
                '': { path: '', type: 'added', newValue: { list: [ { info: { name: 'Jason' } } ] } },
                '.list': { path: '.list', type: 'added', newValue: [ { info: { name: 'Jason' } } ] },
                '.list[0]': { path: '.list[0]', type: 'added', newValue: { info: { name: 'Jason' } } },
                '.list[0].info': { path: '.list[0].info', type: 'added', newValue: { name: 'Jason' } },
                '.list[0].info.name': { path: '.list[0].info.name', type: 'added', newValue: 'Jason' }
            });

            posted = {}

            m('.list[0].info.name').set('Evgeny');
            m('.list[0].info.surname').set('Poberezkin');

            _.defer(function() {
                assert.deepEqual(posted, {
                    '.list[0].info.name': { path: '.list[0].info.name', type: 'changed', oldValue: 'Jason', newValue: 'Evgeny' },
                    '.list[0].info.surname': { path: '.list[0].info.surname', type: 'added', newValue: 'Poberezkin' }
                }, 'should post messages on model when property changed');

                posted = {}

                m('.list[0].extra[0]').set('extra0');
                m('.list[0].extra[1]').set('extra1');

                _.defer(function() {
                    assert.deepEqual(posted, {
                        '.list[0].extra': { path: '.list[0].extra', type: 'added', newValue: ['extra0', 'extra1'] },
                        '.list[0].extra[0]': { path: '.list[0].extra[0]', type: 'added', newValue: 'extra0' },
                        '.list[0].extra[1]': { path: '.list[0].extra[1]', type: 'added', newValue: 'extra1' }
                    }, 'should not post messages on model when property traversed');

                    done();
                });
            });
        });
    });


    it('should allow message subsciption on model path', function(done) {
        var m = new Model()
            , posted = {};

        function postLogger(message, data) {
            if (data.type == 'finished') return;
            posted[data.path] = data;
        }

        m('.list').on('', postLogger);

        m('.list[0].info.name').set('Jason');

        _.defer(function() {
            assert.deepEqual(posted, {
                '': { path: '', fullPath: '.list', type: 'added', newValue: [ { info: { name: 'Jason' } } ] },
            }, 'should post messages on model when property added');

            done();
        });
    });


    it('should post message AFTER model was changed', function(done) {
        var m = new Model()
            , posted = {};

        function postLogger(message, data) {
            // main thing in this test!
            assert.equal(m('.list[0].info.name').get(), 'Jason', 'should set model BEFORE posting message');
            if (data.type == 'finished') return;
            posted[data.path] = data;
        }

        m('.list[0].info.name').on('', postLogger);

        m('.list[0].info.name').set('Jason');

        _.defer(function() {
            assert.deepEqual(posted, { '': { path: '', fullPath: '.list[0].info.name', type: 'added', newValue: 'Jason' } },
                'should correctly post message');
            done();
        });
    });


    it('should define setter for model', function() {
        var m = new Model;
        var m2 = new Model;

        m.set({ info: { name: 'Milo' } });

        assert.deepEqual(m.get(), { info: { name: 'Milo' } });

        m2.set([{name: 'test', desc: 'desc'}, {name: 'test2', desc: 'desc2'}]);

        assert.deepEqual(m2('[1]').get(), {name: 'test2', desc: 'desc2'});
    });


    it('should postMessage when model is set', function(done) {
        var m = new Model
            , posted = {};

        m.on(/.*/, function(path, message) {
            var accessPath = message.path;
            assert(typeof posted[accessPath] == 'undefined');
            if (message.type == 'finished') return;
            posted[accessPath] = message;
        });

        m.set({ info: { name: 'Milo' } });

            assert.deepEqual(m.get(), { info: { name: 'Milo' } });

            _.defer(function() {
                assert.deepEqual(posted, {
                    '': { path: '', type: 'added', newValue: { info: { name: 'Milo' } } },
                    '.info': { path: '.info', type: 'added', newValue: { name: 'Milo' } },
                    '.info.name': { path: '.info.name', type: 'added', newValue: 'Milo' } 
                });

                done();
            });
    });


    it('should post "removed" messages for all properties of subtrees replaced with scalar values', function(done) {
        var m = new Model()
            , posted = {};

        m('[0][1].info.name').set('Jason');

            // just in case
            assert.deepEqual(m.get(), [ [ , { info: { name: 'Jason' } } ] ], 'should create array on top level');

        m.on(/.*/, function(message, data) {
            if (data.type == 'finished') return;
            posted[data.path] = data;
        });

        m('[0][1]').set('subtree removed');

        _.defer(function() {
            assert.deepEqual(posted, {
                '[0][1]': { path: '[0][1]', type: 'changed', oldValue: { info: { name: 'Jason' } }, newValue: 'subtree removed' },
                '[0][1].info':  { path: '[0][1].info', type: 'removed', oldValue: { name: 'Jason' } },
                '[0][1].info.name': { path: '[0][1].info.name', type: 'removed', oldValue: 'Jason' }
            });
            done();
        });
    });


    it('should post "added" messages for all properties of subtrees that replace scalar values', function(done) {
        var m = new Model()
            , posted = {};

        m('[0][1]').set('scalar value');

            // just in case
            assert.deepEqual(m.get(), [ [ , 'scalar value' ] ], 'should create array on top level');

        m.on(/.*/, function(message, data) {
            if (data.type == 'finished') return;
            posted[data.path] = data;
        });

        var shouldBePosted = {
            '[0][1]': { path: '[0][1]', type: 'changed', oldValue: 'scalar value', newValue: { info: { name: 'Jason', surname: 'Green' } } },
            '[0][1].info':  { path: '[0][1].info', type: 'added', newValue: { name: 'Jason', surname: 'Green' } },
            '[0][1].info.name': { path: '[0][1].info.name', type: 'added', newValue: 'Jason' },
            '[0][1].info.surname': { path: '[0][1].info.surname', type: 'added', newValue: 'Green' }
        };

        m('[0][1]').set({ info: { name: 'Jason', surname: 'Green' } });

        _.defer(function() {
            assert.deepEqual(posted, shouldBePosted);

            m('[0][1]').set('scalar value');

            _.defer(function() {
                posted = {};
                m('[0][1].info.name').set('Jason');

                shouldBePosted = {
                    '[0][1]': { path: '[0][1]', type: 'changed', oldValue: 'scalar value', newValue: { info: { name: 'Jason' } } },
                    '[0][1].info':  { path: '[0][1].info', type: 'added', newValue: { name: 'Jason' } },
                    '[0][1].info.name': { path: '[0][1].info.name', type: 'added', newValue: 'Jason' }
                }

                _.defer(function() {
                    assert.deepEqual(posted, shouldBePosted);
                    done();
                });
            });
        });
    });


    it('should post "added" messages for all properties of subtrees that are set for previously undefined properties', function(done) {
        var m = new Model()
            , posted = {};

        m.on(/.*/, function(message, data) {
            if (data.type == 'finished') return;
            posted[data.path] = data;
        });

        var shouldBePosted = {


            '': { path: '', type: 'added', newValue: [ [ , { info: { name: 'Jason', surname: 'Green' } } ] ] },
            '[0]': { path: '[0]', type: 'added', newValue: [ , { info: { name: 'Jason', surname: 'Green' } } ] },
            '[0][1]': { path: '[0][1]', type: 'added', newValue: { info: { name: 'Jason', surname: 'Green' } } },
            '[0][1].info':  { path: '[0][1].info', type: 'added', newValue: { name: 'Jason', surname: 'Green' } },
            '[0][1].info.name': { path: '[0][1].info.name', type: 'added', newValue: 'Jason' },
            '[0][1].info.surname': { path: '[0][1].info.surname', type: 'added', newValue: 'Green' }
        };

        m('[0][1]').set({ info: { name: 'Jason', surname: 'Green' } });

        _.defer(function() {
            assert.deepEqual(posted, shouldBePosted);
            done();
        });
    });


    it('should post "changed" messages for all properties of subtrees that replace subtrees', function(done) {
        var m = new Model()
            , posted = {};

        m('[0][1]').set({ info: { name: 'Jason', surname: 'Green', map: { data: 2 } } });

            // just in case
            assert.deepEqual(m.get(), [ [ , { info: { name: 'Jason', surname: 'Green', map: { data: 2 } } } ] ], 'should create array on top level');

        m.on(/.*/, function(message, data) {
            if (data.type == 'finished') return;
            posted[data.path] = data;
        });

        var shouldBePosted = {
            '[0][1]':
                { path: '[0][1]', type: 'changed',
                  oldValue: { info: { name: 'Jason', surname: 'Green', map: { data: 2 } } },
                  newValue: { info: { name: 'Evgeny', surname: 'Poberezkin', extra: { data: 1 } } } },
            '[0][1].info':
                { path: '[0][1].info', type: 'changed',
                  newValue: { name: 'Evgeny', surname: 'Poberezkin', extra: { data: 1 } },
                  oldValue: { name: 'Jason', surname: 'Green', map: { data: 2 } } },
            '[0][1].info.name':
                { path: '[0][1].info.name', type: 'changed',
                  newValue: 'Evgeny',
                  oldValue: 'Jason' },
            '[0][1].info.surname':
                { path: '[0][1].info.surname',
                  type: 'changed',
                  newValue: 'Poberezkin',
                  oldValue: 'Green' },
            '[0][1].info.extra':
                { path: '[0][1].info.extra',
                  type: 'added',
                  newValue: { data: 1 } },
            '[0][1].info.extra.data':
                { path: '[0][1].info.extra.data',
                  type: 'added',
                  newValue: 1 },
            '[0][1].info.map':
                { path: '[0][1].info.map',
                  type: 'removed',
                  oldValue: { data: 2 } },
            '[0][1].info.map.data':
                { path: '[0][1].info.map.data',
                  type: 'removed',
                  oldValue: 2 }
        };

        m('[0][1]').set({ info: { name: 'Evgeny', surname: 'Poberezkin', extra: { data: 1 } } });

        _.defer(function() {
            assert.deepEqual(posted, shouldBePosted);
            done();
        });
    });


    it('should support subscriptions with "*" syntax for paths', function(done) {
        var m = new Model()
            , posted = {};

        // should dispatch property change one level deep for both array and property syntax
        m.on('[0]*', function(message, data) {
            if (data.type == 'finished') return;
            posted[data.path] = data;
        }); 

        m('[0][1]').set({ info: { name: 'Jason', surname: 'Green' } });

        _.defer(function() {
            assert.deepEqual(posted, {
                '[0]': { path: '[0]', type: 'added', newValue: [ , { info: { name: 'Jason', surname: 'Green' } } ] },
                '[0][1]': { path: '[0][1]', type: 'added', newValue: { info: { name: 'Jason', surname: 'Green' } } }
            });


            var m = new Model();
            posted = {};

            // should dispatch property change up to one level deep for property syntax only
            m.on('[0].*', function(message, data) {
                if (data.type == 'finished') return;
                posted[data.path] = data;
            }); 

            m('[0][1]').set({ info: { name: 'Jason', surname: 'Green' } });

            _.defer(function() {
                assert.deepEqual(posted, {
                    '[0]': { path: '[0]', type: 'added', newValue: [ , { info: { name: 'Jason', surname: 'Green' } } ] }
                });

                var m = new Model();
                posted = {};

                // should dispatch property change up to one level deep for array syntax only
                m.on('[0][*]', function(message, data) {
                    if (data.type == 'finished') return;
                    posted[data.path] = data;
                }); 

                m('[0][1]').set({ info: { name: 'Jason', surname: 'Green' } });

                _.defer(function() {
                    assert.deepEqual(posted, {
                        '[0]': { path: '[0]', type: 'added', newValue: [ , { info: { name: 'Jason', surname: 'Green' } } ] },
                        '[0][1]': { path: '[0][1]', type: 'added', newValue: { info: { name: 'Jason', surname: 'Green' } } }
                    });

                    var m = new Model()
                    posted = {};

                    // should dispatch property change up to two levels deep for both array and property syntax
                    m.on('[0]**', function(message, data) {
                        if (data.type == 'finished') return;
                        posted[data.path] = data;
                    }); 

                    m('[0][1]').set({ info: { name: 'Jason', surname: 'Green' } });

                    _.defer(function() {
                        assert.deepEqual(posted, {
                            '[0]': { path: '[0]', type: 'added', newValue: [ , { info: { name: 'Jason', surname: 'Green' } } ] },
                            '[0][1]': { path: '[0][1]', type: 'added', newValue: { info: { name: 'Jason', surname: 'Green' } } },
                            '[0][1].info': { path: '[0][1].info', type: 'added', newValue: { name: 'Jason', surname: 'Green' } }
                        });

                        var m = new Model();
                        posted = {};

                        // should dispatch property change up to two levels deep for strict array/property syntax
                        m.on('[0][*].*', function(message, data) {
                            if (data.type == 'finished') return;
                            posted[data.path] = data;
                        }); 

                        m('[0][1]').set({ info: { name: 'Jason', surname: 'Green' } });

                        _.defer(function() {
                            assert.deepEqual(posted, {
                                '[0]': { path: '[0]', type: 'added', newValue: [ , { info: { name: 'Jason', surname: 'Green' } } ] },
                                '[0][1]': { path: '[0][1]', type: 'added', newValue: { info: { name: 'Jason', surname: 'Green' } } },
                                '[0][1].info': { path: '[0][1].info', type: 'added', newValue: { name: 'Jason', surname: 'Green' } }
                            });

                            var m = new Model();
                            posted = {};

                            // should NOT dispatch property change up to two levels deep for incorrect strict array/property syntax
                            m.on('[0].*.*', function(message, data) {
                                if (data.type == 'finished') return;
                                posted[data.path] = data;
                            }); 

                            m('[0][1]').set({ info: { name: 'Jason', surname: 'Green' } });

                            _.defer(function() {
                                assert.deepEqual(posted, {
                                    '[0]': { path: '[0]', type: 'added', newValue: [ , { info: { name: 'Jason', surname: 'Green' } } ] }
                                });

                                var m = new Model();
                                posted = {};

                                // should dispatch property change up to two levels deep for both array and property syntax
                                m.on('[0]***', function(message, data) {
                                    if (data.type == 'finished') return;
                                    posted[data.path] = data;
                                }); 

                                m('[0][1]').set({ info: { name: 'Jason', surname: 'Green' } });

                                _.defer(function() {
                                    assert.deepEqual(posted, {
                                        '[0]': { path: '[0]', type: 'added', newValue: [ , { info: { name: 'Jason', surname: 'Green' } } ] },
                                        '[0][1]': { path: '[0][1]', type: 'added', newValue: { info: { name: 'Jason', surname: 'Green' } } },
                                        '[0][1].info': { path: '[0][1].info', type: 'added', newValue: { name: 'Jason', surname: 'Green' } },
                                        '[0][1].info.name': { path: '[0][1].info.name', type: 'added', newValue: 'Jason' },
                                        '[0][1].info.surname': { path: '[0][1].info.surname', type: 'added', newValue: 'Green' }
                                    });

                                    done();
                                });
                            });
                        });
                    });
                });
            });
        });
    });


    it('should allow interpolated properties in getters', function() {
        var m = new Model;

        var modelPath = m('.$1.$2', 'info', 'name');

        // setting data directly, should not be done this way in application
        m._data = { info: { name: 'Milo' } };

            assert.equal(modelPath.get(), 'Milo');
            assert.equal(m('.$1.$2', 'info', 'name').get(), 'Milo');

        m._data = { info: {
            name: 'Jason',
            DOB: {
                date: 1,
                month: 2,
                year: 1982
            }
        } };
            assert.equal(modelPath.get(), 'Jason');
            assert.equal(m('.$1.DOB.$2', 'info', 'year').get(), 1982);

        m._data = [ { name: 'Milo' }, { name: 'Jason' } ];

            assert.equal(m('[$1].name', 0).get(), 'Milo');
            assert.equal(m('[$1].name', 1).get(), 'Jason');
    });


    it('should allow interpolated properties in setters', function() {
        var m = new Model;

        m('.$1.$2', 'info', 'name').set('Jason');
        m('.info.$1.year', 'DOB').set(1982);

            // accessing model directly, should not be done this way in application
            assert.deepEqual(m._data, {
                info: {
                    name: 'Jason',
                    DOB: {
                        year: 1982
                    }
                }
            });

        var m = new Model;

        m('[$1].name', 0).set('Milo');
        m('[$1].name', 1).set('Jason');
        m('[$1].$3.$2', 1, 'year', 'DOB').set(1982);

            assert.deepEqual(m._data, [ { name: 'Milo' }, { name: 'Jason', DOB: { year: 1982 } } ]);
    });


    it('should support subscriptions for path with interpolation', function(done) {
        var m = new Model;
        var posted = [];

        m('.$1.$2', 'info', 'name').on('***', logPosted);

        function logPosted(msg, data) {
            posted.push(data);
        }

        m('.info.name').set('milo');

        _.defer(function() {
            assert.deepEqual(posted, [ { path: '', type: 'added', newValue: 'milo', fullPath: '.info.name' } ]);
            done();
        });
    });


    it('should define "path" instance method of ModelPath', function() {
        var m = new Model;

        m('.info').path('.name').set('Jason');
        m('.info').path('.$1', 'DOB').path('.year').set(1982);

            // accessing model directly, should not be done this way in application
            assert.deepEqual(m._data, {
                info: {
                    name: 'Jason',
                    DOB: {
                        year: 1982
                    }
                }
            });

        var m = new Model;

        var ModelPath = m('[$1]', 0).path('.$1', 'name');

        m('[$1]', 0).path('.$1', 'name').set('Milo');
        m('[$1]', 1).path('.$1', 'name').set('Jason');
        m('[$1]', 1).path('.$2.$1', 'year', 'DOB').set(1982);

            assert.deepEqual(m._data, [ { name: 'Milo' }, { name: 'Jason', DOB: { year: 1982 } } ]);

        m('[$1].$2', 1, 'DOB').path('.$1', 'year').set(1972);

            assert.equal(m('[1].DOB.year').get(), 1972);
    });


    it('should define "push" instance method of Model and of ModelPath', function(done) {
        var m = new Model
            , posted = {};

        function logPosted(path, data) {
            if (data.type == 'finished') return;
            posted[data.path] = data;
        }

        m.on('***', logPosted);

        m.push({ name: 'Milo' }, { name: 'Jason', DOB: { year: 1982 } });

            assert.deepEqual(m._data, [ { name: 'Milo' }, { name: 'Jason', DOB: { year: 1982 } } ]);

        _.defer(function() {
            assert.deepEqual(posted, {
                '': { path: '', type: 'splice', index: 0, removed: [], addedCount: 2,
                        newValue: [ { name: 'Milo' }, { name: 'Jason', DOB: { year: 1982 } } ] },
                '[0]': { path: '[0]', type: 'added', newValue: { name: 'Milo' } },
                '[0].name': { path: '[0].name', type: 'added', newValue: 'Milo' },
                '[1]':  { path: '[1]', type: 'added', newValue: { name: 'Jason', DOB: { year: 1982 } } },
                '[1].name': { path: '[1].name', type: 'added', newValue: 'Jason' },
                '[1].DOB': { path: '[1].DOB', type: 'added', newValue: { year: 1982 } },
                '[1].DOB.year': { path: '[1].DOB.year', type: 'added', newValue: 1982 }
            });


            var m = new Model;

            m('.list').push({ name: 'Milo' });
            m('.list').push({ name: 'Jason' });

                assert.deepEqual(m._data, { list: [ { name: 'Milo' }, { name: 'Jason'} ] });

            done();
        });
    });


    it('should define "del" instance method for ModelPath', function() {
        var m = new Model({ test: 1 });

            assert(m._data.hasOwnProperty('test'));
            assert.equal(m._data.test, 1);

        m('.test').del();

            assert.equal(m._data.hasOwnProperty('test'), false);
            assert.equal(m._data.test, undefined);

        var m = new Model({ list: [ { name: 'Milo' } ] });

            assert(m._data.list[0].hasOwnProperty('name'));
            assert.equal(m._data.list[0].name, 'Milo');

        m('.list[0].name').del();

            assert.equal(m._data.list[0].hasOwnProperty('name'), false);
            assert.equal(m._data.list[0].name, undefined);
    });


    it('should allow "del" with interpolation', function() {
        var m = new Model({ list: [ , { name: 'Milo' } ] });

            assert(m._data.list[1].hasOwnProperty('name'));
            assert.equal(m._data.list[1].name, 'Milo');

        m('.list[$1].$2', 1, 'name').del();

            assert.equal(m._data.list[1].hasOwnProperty('name'), false);
            assert.equal(m._data.list[1].name, undefined);
    });


    it('should post "deleted" message when property is deleted', function(done) {
        var m = new Model({ list: [ , { name: 'Milo' } ] });

            assert(m._data.list[1].hasOwnProperty('name'));
            assert.equal(m._data.list[1].name, 'Milo');

        var posted = {};
        m.on(/.*/, function(accessPath,  data) {
            if (data.type == 'finished') return;
            posted[data.path] = data;
        });

        m('.list[$1].$2', 1, 'name').del();

        _.defer(function() {
            assert.deepEqual(posted, {
                '.list[1].name': { path: '.list[1].name', type: 'deleted', oldValue: 'Milo' }
            });
            done();
        });
    });


    it('should post "removed" message for subproperties when property-object is deleted', function(done) {
        var m = new Model({ list: [ { info: { name: 'Milo', test: 1 } } ] });

            assert(m._data.list[0].hasOwnProperty('info'));
            assert.deepEqual(m._data.list[0], { info: { name: 'Milo', test: 1 } });

        var posted = {};
        m.on(/.*/, function(accessPath,  data) {
            if (data.type == 'finished') return;
            posted[data.path] = data;
        });

        m('.list[$1]', 0).del();

        _.defer(function() {
            assert.deepEqual(posted, {
                '.list[0]': { path: '.list[0]', type: 'deleted',
                              oldValue: { info: { name: 'Milo', test: 1} } },
                '.list[0].info': { path: '.list[0].info', type: 'removed',
                              oldValue: { name: 'Milo', test: 1} },
                '.list[0].info.name': { path: '.list[0].info.name', type: 'removed',
                              oldValue: 'Milo' },
                '.list[0].info.test': { path: '.list[0].info.test', type: 'removed',
                              oldValue: 1 },
            });

            done();
        });
    });


    it('should define "splice" instance method for Model and ModelPath', function(done) {
        var m = new Model;
        var posted = [];

        m.on(/.*/, function(path, data) {
            if (data.type == 'finished') return;
            posted.push(data);
        });

        var removed = m.splice(0, 0, { test: 'item1' }, 'item2');

            assert.deepEqual(m._data, [ { test: 'item1' }, 'item2']);
            assert.deepEqual(removed, []);

        _.defer(function() {
            assert.deepEqual(posted, [
                { path: '', type: 'splice', index: 0, removed: [], addedCount: 2,
                        newValue: [ { test: 'item1' }, 'item2'] },
                { path: '[0]', type: 'added', newValue: { test: 'item1' } },
                { path: '[0].test', type: 'added', newValue: 'item1' },
                { path: '[1]', type: 'added', newValue: 'item2' }
            ]);

            m._data = { 0: 'item1', 1: 'item2', length: 2 };
            posted = [];

            removed = m.splice(0, 1, 'item3', 'item4');

                assert.deepEqual(m._data, { 0: 'item3', 1: 'item4', 2: 'item2', length: 3 });
                assert.deepEqual(removed, ['item1']);

            _.defer(function() {
                assert.deepEqual(posted, [
                    { path: '', type: 'splice', index: 0, removed: [ 'item1' ], addedCount: 2,
                            newValue: { 0: 'item3', 1: 'item4', 2: 'item2', length: 3 } },
                    { path: '[0]', type: 'removed', oldValue: 'item1' },
                    { path: '[0]', type: 'added', newValue: 'item3' },
                    { path: '[1]', type: 'added', newValue: 'item4' }
                ]);

                m._data = undefined;
                posted = [];

                removed = m('.list').splice(2, 1);

                    assert.equal(m._data, undefined);
                    assert.deepEqual(removed, []);

                _.defer(function() {
                    assert.deepEqual(posted, []);

                    removed = m('.info[0].list').splice(0, 0, 'item1', 'item2');

                        assert.deepEqual(m._data, { info: [ { list: ['item1', 'item2'] } ] });
                        assert.deepEqual(removed, []);
                        
                    _.defer(function() {
                        assert.deepEqual(posted, [
                            { path: '', type: 'added', newValue: { info: [ { list: ['item1', 'item2'] } ] } },
                            { path: '.info', type: 'added', newValue: [ { list: ['item1', 'item2'] } ] },
                            { path: '.info[0]', type: 'added', newValue: { list: ['item1', 'item2'] } },
                            { path: '.info[0].list', type: 'added', newValue: [ 'item1', 'item2' ] },
                            { path: '.info[0].list', type: 'splice', index: 0, removed: [], addedCount: 2,
                                    newValue: ['item1', 'item2'] },
                            { path: '.info[0].list[0]', type: 'added', newValue: 'item1' },
                            { path: '.info[0].list[1]', type: 'added', newValue: 'item2' }
                        ]);

                        var m = new Model;

                        removed = m('.list').splice(2, 0, 'item1', 'item2');

                            assert.deepEqual(m._data, { list: ['item1', 'item2'] });
                            assert.deepEqual(removed, []);

                        // samples from Mozilla site
                        m = new Model([ { fish: ['angel', 'clown', 'mandarin', 'surgeon'] } ]);

                        removed = m('[0].fish').splice(2, 0, "drum");

                            assert.deepEqual(m._data, [ { fish: ['angel', 'clown', 'drum', 'mandarin', 'surgeon'] } ]);
                            assert.deepEqual(removed, []);

                        removed = m('[0].fish').splice(3, 1);

                            assert.deepEqual(m._data, [ { fish: ['angel', 'clown', 'drum', 'surgeon'] } ]);
                            assert.deepEqual(removed, ['mandarin']);

                        removed = m('[$1].$2', 0, 'fish').splice(2, 1, 'trumpet');

                            assert.deepEqual(m._data, [ { fish: ['angel', 'clown', 'trumpet', 'surgeon'] } ]);
                            assert.deepEqual(removed, ['drum']);

                        removed = m('[$1]', 0).path('.$1', 'fish').splice(0, 2, 'parrot', 'anemone', 'blue');

                            assert.deepEqual(m._data, [ { fish: ['parrot', 'anemone', 'blue', 'trumpet', 'surgeon'] } ]);
                            assert.deepEqual(removed, ['angel', 'clown']);

                        removed = m('[$1].fish', 0).splice(3, Number.MAX_VALUE);

                            assert.deepEqual(m._data, [ { fish: ['parrot', 'anemone', 'blue'] } ]);
                            assert.deepEqual(removed, ['trumpet', 'surgeon']);

                        done();
                    });
                });
            });
        });
    });


    it('should define "pop" instance method for Model and ModelPath', function(done) {
        var m = new Model([ { item: 'item1'}, { item: 'item2' } ]);

        m.on(/.*/, function(path, data) {
            if (data.type == 'finished') return;
            posted.push(data);
        })

        var posted = [];
        var last = m.pop();

            assert.deepEqual(last, { item: 'item2' });
            assert.deepEqual(m._data, [ { item: 'item1'} ]);

        _.defer(function() {
            assert.deepEqual(posted, [
                { path: '', type: 'splice', index: 1, removed: [ { item: 'item2' } ],
                    addedCount: 0, newValue: [ { item: 'item1'} ] },
                { path: '[1]', type: 'removed', oldValue: { item: 'item2' } },
                { path: '[1].item', type: 'removed', oldValue: 'item2' }
            ]);

            var m = new Model({ list: [ { item: 'item1'}, { item: 'item2' } ] });

            m('.list').on('***', function(path, data) {
                posted.push(data);
            })

            posted = [];
            var last = m('.list').pop();

                assert.deepEqual(last, { item: 'item2' });
                assert.deepEqual(m._data, { list: [ { item: 'item1'} ] });

            _.defer(function() {
                assert.deepEqual(posted, [
                    { path: '', type: 'splice', index: 1, removed: [ { item: 'item2' } ],
                        addedCount: 0, newValue: [ { item: 'item1'} ], fullPath: '.list' },
                    { path: '[1]', type: 'removed', oldValue: { item: 'item2' }, fullPath: '.list[1]' },
                    { path: '[1].item', type: 'removed', oldValue: 'item2', fullPath: '.list[1].item' }
                ]);
                done();
            });
        });
    });


    it('should define "unshift" instance method for Model and ModelPath', function(done) {
        var m = new Model(['item1', 'item2'])
            , posted = [];

        function logPosted(path, data) {
            if (data.type == 'finished') return;
            posted.push(data);
        }

        m.on('***', logPosted);

        m.unshift({ name: 'Milo' }, { name: 'Jason', DOB: { year: 1982 } });

            assert.deepEqual(m._data, [ { name: 'Milo' }, { name: 'Jason', DOB: { year: 1982 } }, 'item1', 'item2' ]);

        _.defer(function() {
            assert.deepEqual(posted, [
                { path: '', type: 'splice', index: 0, removed: [], addedCount: 2,
                        newValue: [ { name: 'Milo' }, { name: 'Jason', DOB: { year: 1982 } }, 'item1', 'item2' ] },
                { path: '[0]', type: 'added', newValue: { name: 'Milo' } },
                { path: '[0].name', type: 'added', newValue: 'Milo' },
                { path: '[1]', type: 'added', newValue: { name: 'Jason', DOB: { year: 1982 } } },
                { path: '[1].name', type: 'added', newValue: 'Jason' },
                { path: '[1].DOB', type: 'added', newValue: { year: 1982 } },
                { path: '[1].DOB.year', type: 'added', newValue: 1982 }
            ]);

            var m = new Model({ list: ['item1', 'item2'] });

            m('.$1', 'list').unshift({ name: 'Milo' }, { name: 'Jason' });

                assert.deepEqual(m._data, { list: [ { name: 'Milo' }, { name: 'Jason'}, 'item1', 'item2' ] });

            done();
        });
    });


    it('should define "shift" instance method for Model and ModelPath', function(done) {
        var m = new Model([ { item: 'item1'}, { item: 'item2' } ]);

        m.on(/.*/, function(path, data) {
            if (data.type == 'finished') return;
            posted.push(data);
        })

        var posted = [];
        var first = m.shift();

            assert.deepEqual(first, { item: 'item1' });
            assert.deepEqual(m._data, [ { item: 'item2'} ]);

        _.defer(function() {
            assert.deepEqual(posted, [
                { path: '', type: 'splice', index: 0, removed: [ { item: 'item1' } ],
                    addedCount: 0, newValue: [ { item: 'item2'} ] },
                { path: '[0]', type: 'removed', oldValue: { item: 'item1' } },
                { path: '[0].item', type: 'removed', oldValue: 'item1' }
            ]);

            var m = new Model({ list: [ { item: 'item1'}, { item: 'item2' } ] });

            m('.list').on('***', function(path, data) {
                posted.push(data);
            })

            posted = [];
            var first = m('.list').shift();

                assert.deepEqual(first, { item: 'item1' });
                assert.deepEqual(m._data, { list: [ { item: 'item2'} ] });

            _.defer(function() {
                assert.deepEqual(posted, [
                    { path: '', type: 'splice', index: 0, removed: [ { item: 'item1' } ],
                        addedCount: 0, newValue: [ { item: 'item2'} ], fullPath: '.list' },
                    { path: '[0]', type: 'removed', oldValue: { item: 'item1' }, fullPath: '.list[0]' },
                    { path: '[0].item', type: 'removed', oldValue: 'item1', fullPath: '.list[0].item' }
                ]);

                done();
            });
        });
    });


    it('should change its data when "changedata" message is dispatched', function(done) {
        var m= new Model;

        m.postMessage('changedata', { path: '.info.name', type: 'added', newValue: 'milo' });
        m.postMessage('changedata', { type: 'finished' });

        setTimeout(function() {
            assert.deepEqual(m._data, { info: {name: 'milo'} } );       
            m.postMessage('changedata', { path: '.list', type: 'splice', index: 0, removed: [], addedCount: 2, newValue: ['item1', 'item2'] });
            m.postMessage('changedata', { type: 'finished' });

            setTimeout(function() {
                assert.deepEqual(m('.list').get(), ['item1', 'item2'] );
                m.postMessage('changedata', { path: '.list', type: 'splice', index: 1, removed: ['item2'], addedCount: 1, newValue: ['item1', 'item3'] });
                m.postMessage('changedata', { type: 'finished' });

                setTimeout(function() {
                    assert.deepEqual(m('.list').get(), ['item1', 'item3'] );
                    done();
                }, 10);
            }, 10);
        }, 10);
    });


    it('should return Model when empty path is passed to get ModelPath from Model', function() {
        var m = new Model;

        m('').set({ test: 1 });

        assert.deepEqual(m._data, { test: 1 });
    });


    it('should reset model when the whole value is set', function() {
        var m = new Model;
        m.set({ test: 1 });
        assert.deepEqual(m._data, { test: 1 });
        m.set({ test: 2 });
        assert.deepEqual(m._data, { test: 2 });
    });


    it('should return ModelPath that is also callable to get further path', function() {
        var m = new Model
            , mPath = m('.info');

        mPath('.test').set(1);

        assert.deepEqual(m.get(), { info: { test: 1 } });
    });


    it('should not dispatch duplicate messages when different "*" subscriptions are present', function(done) {
        var m = new Model;
        m.on('*', logPost);
        m.on('**', logPost2);

        function logPost(msg, data) {
            if (data.type == 'finished') return;
            posted.push({ msg: msg, data: data });
        }

        function logPost2(msg, data) {
            if (data.type == 'finished') return;
            posted2.push({ msg: msg, data: data });
        }

        var posted = [];
        var posted2 = [];

        m('.name').set('milo');

        _.defer(function() {
            assert.equal(posted.length, 2);
            assert.equal(posted2.length, 2);
            done();
        });
    });


    it('should define del method for models', function() {
        var m = new Model;
        m.set({ name: 'milo' });
        assert.deepEqual(m.get(), { name: 'milo' });

        m.del();
        assert.equal(m.get(), undefined);
    });


    it('should dispatch messages when model is deleted', function() {
        var m = new Model;
        m.set({ name: 'milo', DOB: { year: 1972 } });

        function logPost(msg, data) {
            if (data.type == 'finished') return;
            posted.push(data);
        }

        m.on(/.*/, logPost);
        var posted = [];

        m.del();

            assert.equal(m.get(), undefined);
            assert.deepEqual(posted,  [
                { path: '', type: 'deleted', oldValue: { name: 'milo', DOB: { year: 1972 } } },
                { path: '.name', type: 'removed', oldValue: 'milo' },
                { path: '.DOB', type: 'removed', oldValue: { year: 1972 } },
                { path: '.DOB.year', type: 'removed', oldValue: 1972 }
            ]);
    });

});
