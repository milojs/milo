'use strict';


var _ = require('milo-core').proto;


module.exports = DOMListeners;


function DOMListeners() {
    this.listeners = [];
}


_.extendProto(DOMListeners, {
    add: DOMListeners$add,
    remove: DOMListeners$remove,
    removeAll: DOMListeners$removeAll
});


function DOMListeners$add(target, eventType, handler) {
    this.listeners.push({
        target: target,
        eventType: eventType,
        handler: handler
    });
    target.addEventListener(eventType, handler);
}


function DOMListeners$remove(target, eventType, handler) {
    var listener = {
        target: target,
        eventType: eventType,
        handler: handler
    };
    var idx = _.findIndex(this.listeners, _.partial(_.isEqual, listener));

    if (idx > -1) {
        this.listeners.splice(idx, 1);
        _removeListener(listener);
    }
}


function DOMListeners$removeAll() {
    this.listeners.forEach(_removeListener);
    this.listeners = [];
}


function _removeListener(l) {
    l.target.removeEventListener(l.eventType, l.handler);
}
