'use strict';


var Messenger = require('../messenger')
    , DOMEmitterSource = require('./dom_source');


var windowService = new Messenger;
var domEmitterSource = new DOMEmitterSource(windowService, { trigger: 'trigger' }, undefined, window);
windowService._setMessageSource(domEmitterSource);


module.exports = windowService;


_.extend(windowService, {
    isTop: windowService_isTop
});


function windowService_isTop() {
    return window.top == window.self || window.__karma__;
}
