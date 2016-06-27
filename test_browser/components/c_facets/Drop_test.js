'use strict';

var assert = require('assert')
    , async = require('async')
    , DragDrop = milo.util.dragDrop;

var ENCODED_TYPE = 'x-application/milo/component-meta/9n4n6x31dtj62wk4/dnmprvuz64u38dhr6cr30dhm6gvk8/fch76x3tdhjq68hubdxj4tvjdxuq08hu49tpjvk7dhjj4b12d5j24eh264uk28hc49q62vb548x24u3mdnp5ywved5r70tbmbxtpjvk7dhjj4zax5gh6jwucd5v6a8hueht7atbx';
var COMP_META = {"compClass":"MIStandard","compName":"milo_1446830064474","params":{"styles":[{"group":"single","id":"151","name":"html_snippet_single"}],"isLive":true},"metaDataType": ENCODED_TYPE,"metaData":{"blah":"yo"}};
var SERVICE_MESSAGES = ['dragenter', 'dragin', 'dragover', 'dragover', 'dragover', 'dragover', 'dragover', 'dragdropcompleted', 'drop'];


describe('Drop facet', function() {
    var component;
    var parentComponent;
    var enterCount = 0;
    var overCount = 0;
    var leaveCount = 0;
    var dropCount = 0;

    var ComponentClass = createComponent('DropComponent', { components: true, checkParent: true });
    var ComponentClassArray = createComponent('DropComponentArray', { components: ['SomeOtherComp', 'AndAnother'] });
    var ComponentClassObj = createComponent('DropComponentObj', { components: { 'SomeOtherComp': true, 'MIStandard': false } });

    var ParentClass = milo.createComponentClass({
        className: 'ParentDropComponent',
        facets: {
            container: undefined,
            drop: { 
                allow: { components: function () { return false; } } 
            } 
        }
    });

    function createComponent(name, allowConfig) {
        return milo.createComponentClass({
            className: name,
            facets: {
                drop: {
                    messages: {
                        'dragenter': onDragEnter,
                        'dragover': onDragOver,
                        'dragleave': onDragLeave,
                        'drop': onDrop
                    },
                    allow: allowConfig
                }
            }
        });
    }

    function onDragEnter(eventType, event) {
        var dt = new DragDrop(event);
        assert.deepEqual(dt.getComponentMeta(), COMP_META);
        enterCount++;
    }

    function onDragOver(eventType, event) {
        var dt = new DragDrop(event);
        assert.deepEqual(dt.getComponentMeta(), COMP_META);
        overCount++;
    }

    function onDragLeave(eventType, event) {
        var dt = new DragDrop(event);
        assert.deepEqual(dt.getComponentMeta(), COMP_META);
        leaveCount++;
    }

    function onDrop(eventType, event) {
        var dt = new DragDrop(event);
        assert.deepEqual(dt.getComponentMeta(), COMP_META);
        dropCount++;
    }

    beforeEach(function() {

    });

    afterEach(function() {
        component && component.destroy();
        component = undefined;
        parentComponent && parentComponent.destroy();
        parentComponent = undefined;
        enterCount = 0;
        overCount = 0;
        leaveCount = 0;
        dropCount = 0;
        DragDrop.service.offAll();
    })


    it('should proxy native events to facet events', function (done) {
        component = ComponentClass.createOnElement();
        document.body.appendChild(component.el);

        var DDServiceMessages = [];
        DragDrop.service.on(/.*/, function (msg, data) {
            DDServiceMessages.push(msg);
        });
        createAndDispatchEvent(component, 'dragenter', 0);
        createAndDispatchEvent(component, 'dragover', 25);
        createAndDispatchEvent(component, 'dragover', 30);
        createAndDispatchEvent(component, 'dragover', 35);
        createAndDispatchEvent(component, 'dragover', 40);
        createAndDispatchEvent(component, 'dragover', 50);
        createAndDispatchEvent(component, 'drop', 75);

        _.delay(function () {
            assert.equal(enterCount, 1);
            assert.equal(overCount, 5);
            assert.equal(leaveCount, 0);
            assert.equal(dropCount, 1);
            assert.deepEqual(DDServiceMessages, SERVICE_MESSAGES);
            done();
        }, 400);
    });


    it('should not allow drop when check parent and parent returns false', function (done) {
        parentComponent = ParentClass.createOnElement();
        document.body.appendChild(parentComponent.el);
        component = ComponentClass.createOnElement();
        parentComponent.container.append(component);
        runAllowedTest(component, false, done);
    });

    it('should not allow drop dragged comp is not pressent in allowed array', function (done) {
        component = ComponentClassArray.createOnElement();
        document.body.appendChild(component.el);
        runAllowedTest(component, false, done);
    });

    it('should not allow drop dragged comp is false in allowed hash', function (done) {
        component = ComponentClassObj.createOnElement();
        document.body.appendChild(component.el);
        runAllowedTest(component, false, done);
    });

});

function runAllowedTest(component, isAllowed, cb) {
    DragDrop.service.once('dragenter', function (msg, data) {
        assert.equal(data.event.dataTransfer.dropEffect, isAllowed ? undefined : 'none');
        cb();
    });
    createAndDispatchEvent(component, 'dragenter', 0);
}

function createAndDispatchEvent(comp, name, time) {
    var evt = new Event(name);
    evt.dataTransfer = {
        items: [],
        types: ['text/html', 'x-application/milo/component', ENCODED_TYPE]
    };
    evt.dataTransfer.getData = function getData(dataType) {
        return {blah: 'yo'};
    };
    _.delay(function () {
        comp.el.dispatchEvent(evt);
    }, time);
}
