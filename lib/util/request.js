'use strict';

// milo.utils.request
// -----------

// Convenience functions wrapping XMLHTTPRequest functionality.

// ```
// var request = milo.utils.request
//     , opts: { method: 'GET' };

// request(url, opts, function(err, data) {
//     logger.debug(data);
// });

// request.get(url, function(err, data) {
//     logger.debug(data);
// });
// ```

// Only generic request and get, json, post convenience methods are currently implemented.


var _ = require('mol-proto')
    , count = require('./count')
    , Promise = require('./promise')
    , config = require('../config')
    , logger = require('./logger')
    , Messenger = require('../messenger');

module.exports = request;


var _pendingRequests = [];


function request(url, opts, callback) {
    opts.url = url;
    opts.contentType = opts.contentType || 'application/json;charset=UTF-8';
    if (_messenger) request.postMessageSync('request', { options: opts });

    var req = new XMLHttpRequest();
    req.open(opts.method, url, true);
    req.setRequestHeader('Content-Type', opts.contentType);
    if (opts.headers)
        _.eachKey(opts.headers, function(value, key) {
            req.setRequestHeader(key, value);
        });

    var promise = new Promise(req);

    req.onreadystatechange = onReady;
    req.send(JSON.stringify(opts.data));
    req[config.request.optionsKey] = opts;

    _pendingRequests.push(req);

    return promise;


    function onReady() {
        _onReady(req, callback, promise);
    }
}


function _onReady(req, callback, promise) {
    if (req.readyState == 4) {
        _.spliceItem(_pendingRequests, req);

        var error;
        try {
            if (req.statusText.toUpperCase() == 'OK' ) {
                try { callback && callback(null, req.responseText, req); }
                catch(e) { error = e; }
                promise.setData(null, req.responseText);
                postMessage('success');
            }
            else if(req.status != 0) { // not canceled eg. with abort() method
                try { callback && callback(req.status, req.responseText, req); }
                catch(e) { error = e; }
                promise.setData(req.status, req.responseText);
                postMessage('error');
                postMessage('error' + req.status);
            }
        } catch(e) {
            error = error || e;
        }

        if (!_pendingRequests.length)
            postMessage('requestscompleted');

        // not removing subscription creates memory leak, deleting property would not remove subscription
        req.onreadystatechange = undefined;

        if (error) throw error;
    }

    function postMessage(msg) {
        if (_messenger) request.postMessageSync(msg,
            { status: req.status, response: req.responseText });
    }    
}


_.extend(request, {
    get: request$get,
    post: request$post,
    json: request$json,
    jsonp: request$jsonp,
    file: request$file,
    useMessenger: request$useMessenger,
    destroy: request$destroy,
    whenRequestsCompleted: whenRequestsCompleted
});


var _messenger;


function request$useMessenger() {
    _messenger = new Messenger(request, ['on', 'once', 'onSync', 'off', 'onMessages', 'offMessages', 'postMessageSync']);
}


function request$get(url, callback) {
    return request(url, { method: 'GET' }, callback);
}


function request$post(url, data, callback) {
    return request(url, { method: 'POST', data: data }, callback);
}


function request$json(url, callback) {
    var promise = request(url, { method: 'GET' });

    var jsonPromise = promise.transform(JSON.parse.bind(JSON));

    if (callback)
        jsonPromise.then(callback).error(callback);

    return jsonPromise;
}


function request$jsonp(url, callback) {
    var script = document.createElement('script'),
        promise = new Promise(script),
        head = window.document.head,
        uniqueCallback = 'ML_JSONP_' +  count();

    setTimeout(function() {
        if (window[uniqueCallback]) {
            callback && callback(new Error('No JSONP response or no callback in response'));
            logger.error('JSONP response after timeout');
            cleanUp();
        }
    }, config.request.jsonpTimeout * 1000);

    window[uniqueCallback] = function (result) {
        callback && callback(null, result);
        promise.setData(null, result);
        cleanUp();
    };

    script.type = 'text/javascript';
    script.src = url + (url.indexOf('?') == -1 ? '?' : '&') + 'callback=' + uniqueCallback;

    head.appendChild(script);

    return promise;


    function cleanUp() {
        head.removeChild(script);
        delete window[uniqueCallback];
    }
}


function request$file(url, data, callback) {
    var req = new XMLHttpRequest();
    req.open('POST', url, true);

    var promise = new Promise();

    var formData = new FormData();
    formData.append('file', data);

    req.onreadystatechange = onReady;

    req.send(formData);


    function onReady() {
        _onReady(req, callback, promise);
    }
}


function request$destroy() {
    if (_messenger) _messenger.destroy();
    request._destroyed = true;
}


function whenRequestsCompleted(options, callback) {
    if (typeof options == 'function') {
        callback = options;
        options = undefined;
    }
    var optionsKey = config.request.optionsKey;

    var somePending = _pendingRequests.length;
    if (options && somePending) {
        if (options.matchURL)
            somePending = _pendingRequests.some(matchPattern('matchURL'));

        if (options.ignoreURL && somePending)
            somePending = _pendingRequests.some(_.not(matchPattern('ignoreURL')));
    }

    if (somePending)
        _messenger.once('requestscompleted', callback);
    else
        _.defer(callback);


    function matchPattern(patternKey) {
        return function(req) {
            return options[patternKey].test(req[optionsKey].url);
        }
    }
}
