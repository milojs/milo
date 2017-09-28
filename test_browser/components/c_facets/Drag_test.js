'use strict';

/* eslint-env browser, commonjs, node, mocha */

var assert = require('assert')
    , DragDrop = milo.util.dragDrop;

var EXPECTED_SERVICE_MESSAGES = ['dragdropstarted', 'dragdropcompleted', 'completedragdrop'];
var COMP_STATE = {"compName":"milo_1448036215160","compClass":"DragComponent","extraFacets":[],"facetsStates":{},"outerHTML":"<div ml-bind=\"DragComponent:milo_1448036215160\"><span>test</span></div>"};

var DATA_TYPES = {
    'x-application/milo/component': '{"compName":"milo_1448036215160","compClass":"DragComponent","extraFacets":[],"facetsStates":{},"outerHTML":"<div ml-bind=\"DragComponent:milo_1448036215160\"><span>test</span></div>"}', 
    'text/html': '<div ml-bind="DragComponent:milo_1448036215160" draggable="true"><span>test</span></div>', 
    'x-application/milo/component-meta/8ht62tu3dxpq0vvecnq78/dnmprvuz64u38e1g6cv34c9n64v30/fdyg': undefined
};


describe('Drag facet', function() {
    var ACTUAL_DATA_TYPES = {};
    var component;

    milo.createComponentClass({
        className: 'DragComponent',
        facets: {
            drag: undefined
        }
    });

    it('should initialise and collect state on drag', function (done) {
        component = milo.Component.createFromState(COMP_STATE);
        document.body.appendChild(component.el);

        var DDServiceMessages = [];
        DragDrop.service.on(/.*/, function (msg, data) {
            DDServiceMessages.push(msg);
        });

        createAndDispatchEvent(component, 'dragstart', 0);
        createAndDispatchEvent(component, 'drag', 30);
        createAndDispatchEvent(component, 'drag', 60);
        createAndDispatchEvent(component, 'dragend', 90);

        _.delay(function () {
            assert.deepEqual(DDServiceMessages, EXPECTED_SERVICE_MESSAGES);
            //assert.deepEqual(ACTUAL_DATA_TYPES, DATA_TYPES);
            done();
        }, 150);
    });

    function createAndDispatchEvent(comp, name, time) {
        var evt = new Event(name);
        evt.dataTransfer = { items: [] };
        evt.dataTransfer.setData = function getData(type, data) {
            assert(DATA_TYPES.hasOwnProperty(type));
            ACTUAL_DATA_TYPES[type] = data;
        };
        _.delay(function () {
            comp.el.dispatchEvent(evt);
        }, time);
    }
});
