'use strict';

// ###component iframe source

var Component = require('../c_class')
    , miloCore = require('milo-core')
    , MessageSource = miloCore.classes.MessageSource
    , _ = miloCore.proto
    , check = miloCore.util.check
    , logger = miloCore.util.logger;

var FrameMessageSource = _.createSubclass(MessageSource, 'FrameMessageSource', true);


_.extendProto(FrameMessageSource, {
    // implementing MessageSource interface
    init: init,
    addSourceSubscriber: addSourceSubscriber,
    removeSourceSubscriber: removeSourceSubscriber,
    trigger: trigger,

    //class specific methods
    frameWindow: frameWindow,
    handleEvent: handleEvent  // event dispatcher - as defined by Event DOM API
});

module.exports = FrameMessageSource;


function init(hostObject, proxyMethods, messengerAPIOrClass, component) {
    check(component, Component);
    this.component = component;

    if (component.el.tagName.toLowerCase() != 'iframe')
        throw new Error('component for FrameMessageSource can only be attached to iframe element');

    MessageSource.prototype.init.apply(this, arguments);
}


function frameWindow() {
    return this.component.el.contentWindow;
}


// addIFrameMessageListener
function addSourceSubscriber(sourceMessage) {
    var win = this.frameWindow();
    if (win) win.addEventListener('message', this, false);
    else logger.warn('FrameMessageSource: frame window is undefined');
}


// removeIFrameMessageListener
function removeSourceSubscriber(sourceMessage) {
    var win = this.frameWindow();
    if (win) win.removeEventListener('message', this, false);
    else logger.warn('FrameMessageSource: frame window is undefined');
}


function trigger(msgType, data) {
    data = data || {};
    data.type = msgType;

    this.frameWindow().postMessage(data, '*');
}


// TODO maybe refactor to FrameMsgAPI?
function handleEvent(event) {
    this.dispatchMessage(event.data.type, event);
}
