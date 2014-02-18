'use strict';

// <a name="components-facets-drop"></a>
// ###drop facet

var ComponentFacet = require('../c_facet')
    , facetsRegistry = require('./cf_registry')
    , DOMEventsSource = require('../msg_src/dom_events')

    , _ = require('mol-proto');


// generic drop handler, should be overridden
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

    var allowDropTest = this.config.allowDropTest;

    function onDragging(eventType, event) {
        //TODO: manage not-allowed drops, maybe with config.
        event.stopPropagation();
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
}
