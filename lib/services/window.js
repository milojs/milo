'use strict';


var Messenger = require('../messenger')
    , DOMEmitterSource = require('./dom_source');


var windowMessenger = new Messenger;
var domEmitterSource = new DOMEmitterSource(windowMessenger, { trigger: 'trigger' }, undefined, window);
windowMessenger._setMessageSource(domEmitterSource);


module.exports = windowMessenger;
