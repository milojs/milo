'use strict';

var assert = require('assert')
    , async = require('async');

describe.only('Drop facet', function() {
    milo.config.check = true; // Enable 'check' library so that inputs to the Css facet are validated
    var component;

    var ComponentClass = milo.createComponentClass({
        className: 'DropComponent',
        facets: {
            drop: {
                messages: {
                    'dragenter': onDragEnter,
                    'dragover': onDragOver,
                    'dragleave': onDragLeave,
                    'drop': onDrop
                },
                allow: {
                    components: true
                }
            }
        }
    });

    function onDragEnter(msg, data) {
        console.log('DRAG ENTER!!!!');
    }

    function onDragOver(msg, data) {

    }

    function onDragLeave(msg, data) {

    }

    function onDrop(msg, data) {

    }

    beforeEach(function() {
        component = ComponentClass.createOnElement();
    });


    it('should proxy native events to facet events', function (done) {
        var evt = new Event('dragenter');
        component.el.dispatchEvent(evt);
    });

});