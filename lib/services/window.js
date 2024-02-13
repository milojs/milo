'use strict';


var miloCore = require('milo-core')
    , Messenger = miloCore.Messenger
    , DOMEmitterSource = require('./dom_source')
    , _ = miloCore.proto;


var windowService = new Messenger;
var domEmitterSource = new DOMEmitterSource(windowService, { trigger: 'trigger' }, undefined, window);
windowService._setMessageSource(domEmitterSource);


module.exports = windowService;

_.extend(windowService, {
    isTop: windowService_isTop,
    getTop: windowService_getTop
});

/**
 * Gets the top window containing a milo instance.
 * It is not possible to use `window.top` if the application is contained
 * in an iframe being served from a different domain (Trying to access
 * properties of the top window in this case would breach the browser's 
 * cross-origin iframe policy)
 */
function windowService_getTop() {
  let topWindow = window;

  while (true) {
    try {
      const parentWindow = topWindow.parent;
      // Trying to access this property outside of the same domain will throw an error
      const milo = parentWindow.milo;
      if (!milo) return topWindow; // No more milo

      topWindow = parentWindow;
    } catch (_e) {
      return topWindow;
    }
  }
}

function windowService_isTop() {
    const topMiloWindow = windowService_getTop();
    return topMiloWindow == window.self || window.__karma__;
}
