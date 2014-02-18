'use strict';

// <a name="loader"></a>
// milo.loader
// -----------

// milo.loader loads subviews into the page. It scans the document inside rootElement looking for ml-load attribute that should contain URL of HTML fragment that will be loaded inside the element with this attribute.

// milo.loader returns the map of references to elements with their IDs used as keys.

// ### Example

// html

// ```html
// <body>
//     <div id="view1" ml-load="view1.html"></div>
//     <div>
//         <div id="view2" ml-load="view3.html"></div>
//     </div>
// </body>
// ```

// javascript

// ```javascript
// var views = milo.loader(); // document.body is used by default
// log(views);
// // {
// //     view1: div with id="view1"
// //     view2: div with id="view2"
// // }
// ```


var miloMail = require('./mail')
    , request = require('./util/request')
    , logger = require('./util/logger')
    , utilDom = require('./util/dom')
    , config = require('./config')
    , LoadAttribute = require('./attributes/a_load')
    , LoaderError = require('./util/error').Loader;


module.exports = loader;


function loader(rootEl, callback) {
    milo(function() {
        _loader(rootEl, callback);
    });
}


function _loader(rootEl, callback) {
    if (typeof rootEl == 'function') {
        callback = rootEl;
        rootEl = undefined;
    }

    rootEl = rootEl || document.body;

    miloMail.postMessage('loader', { state: 'started' });
    _loadViewsInElement(rootEl, function(views) {
        miloMail.postMessage('loader', { 
            state: 'finished',
            views: views
        });
        callback(views);
    });
}


function _loadViewsInElement(rootEl, callback) {
    var loadElements = rootEl.querySelectorAll('[' + config.attrs.load + ']');

    var views = {}
        , totalCount = loadElements.length
        , loadedCount = 0;

    _.forEach(loadElements, function (el) {
        loadView(el, function(err) {
            views[el.id] = err || el;
            loadedCount++;
            if (loadedCount == totalCount)
                callback(views);
        });
    });
};


function loadView(el, callback) {
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
        callback(null);
    });
}
