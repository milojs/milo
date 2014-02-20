'use strict';

// <a name="components-facets-drop"></a>
// ###drop facet

var ComponentFacet = require('../c_facet')
    , facetsRegistry = require('./cf_registry')
    , DOMEventsSource = require('../msg_src/dom_events')
    , DragDrop = require('../../util/dragdrop')
    , DropError = require('../../util/error').Drop
    , _ = require('mol-proto');


/**
 * `milo.registry.facets.get('Drop')`
 * Facet for components that can accept drops
 * Drop facet supports the following configuration parameters:
 *
 *  - allow - an object that will define allowed data types during drag (`dragenter` and `dragover` events) with these properties:
 *      - components: `true` by default (all components will be accepted)
 *                        OR string with allowed component class
 *                        OR list of allowed components classes (strings)
 *                        OR map with allowed classes in keys and `true`/test functions in values
 *                        OR test function that will be passed object defined below
 *                        OR `false` to NOT accept components
 *      - dataTypes:  `false` by default (no other data types will be accepted)
 *                        OR string with allowed data type
 *                        OR list of additional data types that a drop target would accept
 *                        OR test function that will be passed DragDrop object
 *                        OR `true` to accept all data types
 *      If test functions are used, they should return boolean. Each test function can also set drop effect as defined here:
 *      https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer#dropEffect.28.29
 *      Setting drop effect that is not allowed by dragged object will prevent drop.
 *      Test functions for components will be passed the owner of Drop facet as context, the object with the following possible properties as the first parameter:
 *          compClass - name of component class as stored in registry
 *          compName - name of component (all lowercase)
 *          params - parameters as encoded in dataType, passed to `milo.util.dragDrop.setComponentMeta` by Drag facet
 *          metaDataType - data type of the data that has compClass, compName and params encoded
 *
 *      ... and DragDrop instance as the second parameter
 *
 *      Test function for other data types will be passed the owner of Drop facet as context and DragDrop instance as the first parameter
 *
 * ####Events####
 *
 * In addition to configuring allowed components and data types, components classes should subscribe to events.
 * At the very least, they should subscribe to `drop` event.
 */
var Drop = _.createSubclass(ComponentFacet, 'Drop');


_.extendProto(Drop, {
    init: Drop$init,
    start: Drop$start
    // _reattach: _reattachEventsOnElementChange
});

facetsRegistry.add(Drop);

module.exports = Drop;


function Drop$init() {
    ComponentFacet.prototype.init.apply(this, arguments);
    this._createMessageSourceWithAPI(DOMEventsSource);
}


function Drop$start() {
    ComponentFacet.prototype.start.apply(this, arguments);
    this.owner.el.classList.add('cc-module-relative');
    this.onMessages({
        'dragenter dragover': onDragging,
        'drop': onDrop
    });
}


function onDragging(eventType, event) {
    var dt = new DragDrop(event);

    event.stopPropagation();
    if (_isDropAllowed.call(this, dt))
        event.preventDefault();
    else
        dt.setDropEffect('none')
}


function onDrop(eventType, event) {
    event.stopPropagation();
    var dt = new DragDrop(event);
    DragDrop.service.postMessage('dragdropcompleted', {
        eventType: 'drop',
        dragDrop: dt,
        dropFacet: this
    });
}


/**
 * Checks if drop is allowed based on facet configuration (see above)
 * 
 * @param {DragDrop} dt
 * @return {Boolean}
 */
function _isDropAllowed(dt) {
    var allow = this.config.allow;

    if (dt.isComponent()) {
        var allowComps = allow && allow.components
            , meta = dt.getComponentMeta();

        switch (typeof allowComps) {
            case 'undefined':
                return true;
            case 'boolean':
                return allowComps;
            // component class
            case 'string':
                return meta.compClass == allowComps;
            // test function
            case 'function':
                return allowComps.call(this.owner, meta, dt);
            case 'object':
                if (Array.isArray(allowComps))
                    // list of allowed classes
                    return allowComps.indexOf(meta.compClass) >= 0;
                else {
                    // map of class: boolean|test function
                    var test = allowComps[meta.compClass];
                    return !! _.result(test, this.owner, meta, dt);
                }
            default:
                throw new DropError('Incorrect allowed components in config');
        }
    }

    // TODO test for other data types
}
