'use strict';


var miloCore = require('milo-core')
    , MessageSource = miloCore.classes.MessageSource
    , Component = require('../components/c_class')
    , domEventsConstructors = require('./de_constrs') // TODO merge with DOMEventSource ??
    , _ = miloCore.proto
    , check = miloCore.util.check
    , Match = check.Match;

var DOMEmitterSource = _.createSubclass(MessageSource, 'DOMEmitterSource', true);


_.extendProto(DOMEmitterSource, {
    // implementing MessageSource interface
    init: init,
    destroy: DOMEmitterSource$destroy,
    addSourceSubscriber: _.partial(sourceSubscriberMethod, 'addEventListener'),
    removeSourceSubscriber: _.partial(sourceSubscriberMethod, 'removeEventListener'),
    postMessage: DOMEmitterSource$postMessage,
    trigger: trigger,

    // class specific methods
    emitter: emitter,
    handleEvent: handleEvent,  // event dispatcher - as defined by Event DOM API
});

module.exports = DOMEmitterSource;


var useCapturePattern = /__capture$/
    , useCapturePostfix = '__capture';


// init DOM event source
function init(hostObject, proxyMethods, messengerAPIOrClass, eventEmitter) {
    this.eventEmitter = eventEmitter;
    MessageSource.prototype.init.apply(this, arguments);
}


function DOMEmitterSource$destroy() {
    MessageSource.prototype.destroy.apply(this, arguments);
    delete this.eventEmitter;
}


// get DOM element of component
function emitter() {
    return this.eventEmitter;
}


function sourceSubscriberMethod(method, eventType) {
    if (! (eventType && typeof eventType == 'string')) return;
    var capture = useCapturePattern.test(eventType);
    if (capture) eventType = eventType.replace(useCapturePattern, '');
    this.emitter()[method](eventType, this, capture);
}


// event dispatcher - as defined by Event DOM API
function handleEvent(event) {
    var isCapturePhase;
    if (typeof window != 'undefined')
        isCapturePhase = event.eventPhase == window.Event.CAPTURING_PHASE;

    var msg = event.type + (isCapturePhase ? useCapturePostfix : '');

    this.dispatchMessage(msg, event);
}


function DOMEmitterSource$postMessage(message, data) {
    this.messenger.postMessageSync(message, data);
}


function trigger(eventType, properties) {
    check(eventType, String);
    check(properties, Match.Optional(Object));

    eventType = eventType.replace(useCapturePattern, '');
    var EventConstructor = domEventsConstructors[eventType];

    if (typeof EventConstructor != 'function')
        throw new Error('unsupported event type');

    // check if it is correct
    if (typeof properties != 'undefined')
        properties.type = eventType;

    var domEvent = new EventConstructor(eventType, properties);
    var notCancelled = this.emitter().dispatchEvent(domEvent);
    return notCancelled;
}
