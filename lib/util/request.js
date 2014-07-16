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


function onReady(req, callback, promise) {
    if (req.readyState == 4) {
        if (req.statusText.toUpperCase() == 'OK' ) {
            callback && callback(null, req.responseText, req);
            promise.setData(null, req.responseText);
            postMessage('success');
        } else {
            callback && callback(req.status, req.responseText, req);
            promise.setData(req.status, req.responseText);
            postMessage('error');
            postMessage('error' + req.status);
        }
    }

    function postMessage(msg) {
        if (_messenger) request.postMessageSync(msg,
            { status: req.status, response: req.responseText });
    }
}


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

    req.onreadystatechange = _.partial(onReady, req, callback, promise);
    req.send(JSON.stringify(opts.data));

    return promise;
}


_.extend(request, {
    get: request$get,
    post: request$post,
    json: request$json,
    jsonp: request$jsonp,
    file: request$file,
    useMessenger: request$useMessenger
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

    req.onreadystatechange = _.partial(onReady, req, callback, promise);

    req.send(formData);
}
