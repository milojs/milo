'use strict';


var Model = require('../../lib/model')
    , Connector = require('../../lib/model/connector')
    , assert = require('assert')
    , _ = require('mol-proto');


describe('Connector', function() {
    it('should connect two models', function(done) {
        var m1 = new Model
            , m2 = new Model
            , c = new Connector(m1, '<<->>', m2);

        m1('.info.name').set('milo');

        _.defer(function() {
            assert.deepEqual(m2.get(), { info: { name: 'milo' } } );
            done();
        });
    });

    it('should allow path translation', function(done) {
        var m1 = new Model
            , m2 = new Model
            , c = new Connector(m1, '<<<->>>', m2, { pathTranslation: {
                '.info.name': '.myInfo.myName'
            } });

        m1('.info.name').set('milo');

        _.defer(function() {
            assert.deepEqual(m2._data, { myInfo: { myName: 'milo' } } );

            m1._data = undefined;
            m2('.myInfo.myName').set('jason');

            _.defer(function() {
                assert.deepEqual(m1._data, { info: { name: 'jason' } } );
                done();
            });
        });
    });

    it('should support splice method', function(done) {
        var m1 = new Model
            , m2 = new Model
            , c = new Connector(m1, '<<->>', m2);

        m1.set([1,2,3]);

        _.defer(function() {
            assert.deepEqual(m2.get(), [1,2,3] );

            m1.splice(1,1);

            _.defer(function() {
                assert.deepEqual(m2.get(), [1,3] );
                done();
            });
        });
    });

    it.skip('should connect model paths', function(done) {
        var m1 = new Model
            , m2 = new Model
            , c = new Connector(m1('.path1'), '<<->>', m2('.path2'));

        m1('.path1.info.name').set('milo');

        _.defer(function() {
            assert.deepEqual(m2('.path2').get(), { info: { name: 'milo' } } );
            done();
        });
    });
});
