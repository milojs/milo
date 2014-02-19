'use strict';

// <a name="components-facets-drop"></a>
// ###drop facet

var ComponentFacet = require('../c_facet')
    , facetsRegistry = require('./cf_registry')
    , DOMEventsSource = require('../msg_src/dom_events')

    , _ = require('mol-proto');


/**
 * `milo.registry.facets.get('Drop')`
 * Facet for components that can accept drops
 * Drop facet supports the following configuration parameters:
 *
 *  - components: true by default OR list of allowed components classes (strings) OR false to NOT accept components
 *  - dataTypes: list of data types that a drop target would accept in addition to components
 *  
 *  - metaParams: object of key-value pairs that will be converted in url-like query string in the end of data type for metadata data type (or function that returns this object). See config.dragDrop.dataTypes.componentMetaTemplate
 *  - metaData: data that will be stored in the above meta data type (or function)
 *  - dropEffect: string (or function) as specified here: https://developer.mozilla.org/en-US/docs/DragDrop/Drag_Operations#dragstart
 *
 * If function is specified in any parameter it will be called with the component as the context
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
    this.on('dragenter dragover', onDragging);
}


function onDragging(eventType, event) {
    //TODO: manage not-allowed drops, maybe with config.
    var allowDropTest = this.config.allowDropTest;

    event.stopPropagation();
    event.preventDefault();
    var dt = event.dataTransfer
        , dataTypes = dt.types
        , hasHtml = dataTypes.indexOf('text/html') >= 0
        , hasMiloData = dataTypes.indexOf('x-application/milo-component') >= 0;

    if (dataTypes && (hasHtml || hasMiloData)) {
        var canDrop = allowDropTest ? allowDropTest(event, hasMiloData) : 'move';
        event.dataTransfer.dropEffect = canDrop;
        event.preventDefault();
    }
}
