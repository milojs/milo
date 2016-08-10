'use strict';


var miloMail = require('./services/mail')
    , request = require('./util/request')
    , miloCore = require('milo-core')
    , _ = miloCore.proto
    , utilDom = require('./util/dom')
    , config = require('./config')
    , LoadAttribute = require('./attributes/a_load');


module.exports = loader;

/**
 * `milo.loader`
 * 
 * Recursively scans the document tree inside `rootEl` (document.body by default) looking for __ml-load__ @attribute.
 * One level load is executed. No additional loader get called on inside __ml-load__ attributes. 
 *
 * Possible usages:
 * - milo.loader([myRootEl,][myRemoveAttribute,]myCallback)
 * 
 * @param  {Element}  rootEl          Root element inside which DOM will be scanned (document.body by default).
 * @param  {Boolean}  removeAttribute If set to true, then the __ml-load__ attribute will be removed once loader has been executed (False by default).
 * @param  {Function} callback        Callback to call after all elements get loaded (Required).
 */
function loader(rootEl, removeAttribute, callback) {
    milo(function() {
        _loader(rootEl, removeAttribute, callback);
    });
}


function _loader(rootEl, removeAttribute, callback) {
    if (typeof rootEl == 'function') {
        callback = rootEl;
        rootEl = undefined;
        removeAttribute = false;
    }

    if (typeof removeAttribute == 'function') {
        callback = removeAttribute;
        removeAttribute = false;
    }

    rootEl = rootEl || document.body;

    miloMail.postMessage('loader', { state: 'started' });
    _loadViewsInElement(rootEl, removeAttribute, function(views) {
        miloMail.postMessage('loader', { 
            state: 'finished',
            views: views
        });
        callback(views);
    });
}


function _loadViewsInElement(rootEl, removeAttribute, callback) {
    var loadElements = rootEl.getAttribute(config.attrs.load)
                        ? [rootEl]
                        : rootEl.querySelectorAll('[' + config.attrs.load + ']');

    var views = {}
        , totalCount = loadElements.length
        , loadedCount = 0;

    _.forEach(loadElements, function (el) {
        loadView(el, removeAttribute, function(err) {
            views[el.id] = err || el;
            loadedCount++;
            if (loadedCount == totalCount)
                callback(views);
        });
    });
}


function loadView(el, removeAttribute, callback) {
    if (utilDom.children(el).length)
        throw new Error('can\'t load html into element that is not empty');

    var attr = new LoadAttribute(el);

    attr.parse().validate();

    request.get(attr.loadUrl, function(err, html) {
        if (err) {
            err.message = err.message || 'can\'t load file ' + attr.loadUrl;
            // logger.error(err.message);
            callback(err);
            return;
        }

        el.innerHTML = html;
        if (removeAttribute) LoadAttribute.remove(el);
        callback(null);
    });
}
