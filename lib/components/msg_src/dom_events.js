'use strict';

// <a name="components-source-dom"></a>
// ###component dom events source

var MessageSource = require('../../messenger/m_source')
    , Component = require('../c_class')
    , domEventsConstructors = require('./de_constrs') // TODO merge with DOMEventSource ??
    , _ = require('mol-proto')
    , check = require('../../util/check')
    , Match = check.Match;

var DOMEventsSource = _.createSubclass(MessageSource, 'DOMMessageSource', true);


_.extendProto(DOMEventsSource, {
    // implementing MessageSource interface
    init: init,
    destroy: DOMEventsSource$destroy,
    addSourceSubscriber: _.partial(sourceSubscriberMethod, 'addEventListener'),
    removeSourceSubscriber: _.partial(sourceSubscriberMethod, 'removeEventListener'),
    trigger: trigger,

    // class specific methods
    dom: dom,
    handleEvent: handleEvent,  // event dispatcher - as defined by Event DOM API
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
function dom() {
    return this.component.el;
}


function sourceSubscriberMethod(method, eventType) {
    if (! (eventType && typeof eventType == 'string')) return;
    var capture = useCapturePattern.test(eventType);
    eventType = eventType.replace(useCapturePattern, '');
    this.dom()[method](eventType, this, capture);
}


// event dispatcher - as defined by Event DOM API
function handleEvent(event) {
    var isCapturePhase;
    if (typeof window != 'undefined')
        isCapturePhase = event.eventPhase == window.Event.CAPTURING_PHASE;

    if (isCapturePhase)
        event += useCapturePostfix;

    this.dispatchMessage(event.type, event);
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
    var notCancelled = this.dom().dispatchEvent(domEvent);
    return notCancelled;
}
