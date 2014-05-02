'use strict';


var miloMail = require('./mail')
    , request = require('./util/request')
    , logger = require('./util/logger')
    , utilDom = require('./util/dom')
    , config = require('./config')
    , LoadAttribute = require('./attributes/a_load')
    , LoaderError = require('./util/error').Loader;


module.exports = loader;


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
};


function loadView(el, removeAttribute, callback) {
    if (utilDom.children(el).length)
        throw new LoaderError('can\'t load html into element that is not empty');

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
