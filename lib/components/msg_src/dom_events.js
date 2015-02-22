'use strict';


var DOMEmitterSource = require('../../services/dom_source')
    , miloCore = require('milo-core')
    , MessageSource = miloCore.classes.MessageSource
    , Component = require('../c_class')
    , _ = miloCore.proto
    , check = miloCore.util.check
    , Match = check.Match;

var DOMEventsSource = _.createSubclass(DOMEmitterSource, 'DOMEventsSource', true);


_.extendProto(DOMEventsSource, {
    init: init,
    destroy: DOMEventsSource$destroy,
    emitter: emitter
});

module.exports = DOMEventsSource;


var useCapturePattern = /__capture$/
    , useCapturePostfix = '__capture';


// init DOM event source
function init(hostObject, proxyMethods, messengerAPIOrClass, component) {
    check(component, Component);
    this.component = component;
    MessageSource.prototype.init.apply(this, arguments);
}


function DOMEventsSource$destroy() {
    MessageSource.prototype.destroy.apply(this, arguments);
    delete this.component;
}


// get DOM element of component
function emitter() {
    return this.component.el;
}
