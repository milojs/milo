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
    req.open(opts.method, opts.url, true);
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

    req._delayedCall = _.delay(function(){
        req.onreadystatechange = undefined;
        req.abort();
        onReady();
    }, opts.timeout || config.request.defaults.timeout);

    return promise;


    function onReady() {
        _onReady(req, callback, promise);
    }
}


function _onReady(req, callback, promise) {
    if (req.readyState != 4) return;

    clearTimeout(req._delayedCall);
    _.spliceItem(_pendingRequests, req);

    var error;
    try {
        if (req.statusText.toUpperCase() == 'OK' ) {
            try { callback && callback(null, req.responseText, req); }
            catch(e) { error = e; }
            promise.setData(null, req.responseText);
            postMessage('success');
        }
        else {
            req.status == req.status || 'timeout'; // request was aborted in case of timeout
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

    function postMessage(msg) {
        if (_messenger) request.postMessage(msg,
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
    _messenger = new Messenger(request, ['on', 'once', 'onSync', 'off', 'onMessages', 'offMessages', 'postMessage', 'postMessageSync']);
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


var jsonpOptions = { method: 'GET', jsonp: true };
function request$jsonp(url, callback) {
    var script = document.createElement('script'),
        promise = new Promise(script),
        head = window.document.head,
        uniqueCallback = config.request.jsonpCallbackPrefix + count();

    var opts = _.extend({ url: url }, jsonpOptions);
    if (_messenger) request.postMessageSync('request', { options: opts });

    if (! _.isEqual(_.omitKeys(opts, 'url'), jsonpOptions))
        logger.warn('Ignored not allowed request options change in JSONP request - only URL can be changed');

    var timeout = setTimeout(function() {
        var err = new Error('No JSONP response or no callback in response');
        _onResult(err);
    }, config.request.jsonpTimeout);

    window[uniqueCallback] = _.partial(_onResult, null);

    _pendingRequests.push(window[uniqueCallback]);

    script.type = 'text/javascript';
    script.src = opts.url + (opts.url.indexOf('?') == -1 ? '?' : '&') + 'callback=' + uniqueCallback;

    head.appendChild(script);

    return promise;


    function _onResult(err, result) {
        _.spliceItem(_pendingRequests, window[uniqueCallback]);
        try { callback && callback(err, result); }
        catch(e) { var error = e; }
        promise.setData(err, result);

        postMessage(err ? 'error' : 'success', err, result);
        if (err) {
            logger.error('No JSONP response or timeout');
            postMessage('errorjsonptimeout', err);
        }
        cleanUp();
        if (!_pendingRequests.length)
            postMessage('requestscompleted');

        if (error) throw error;
    }


    function cleanUp() {
        clearTimeout(timeout);
        head.removeChild(script);
        delete window[uniqueCallback];
    }


    function postMessage(msg, status, result) {
        if (_messenger) request.postMessage(msg,
            { status: status, response: result });
    }
}


function request$file(url, data, callback) {
    var opts = { method: 'POST', url: url, file: true };
    if (_messenger) request.postMessageSync('request', { options: opts });

    var req = new XMLHttpRequest();
    req.open('POST', opts.url, true);
    if (opts.headers)
        _.eachKey(opts.headers, function(value, key) {
            req.setRequestHeader(key, value);
        });

    var promise = new Promise();

    var formData = new FormData();
    formData.append('file', data);

    req.onreadystatechange = onReady;
    req.send(formData);
    _pendingRequests.push(req);

    return promise;

    function onReady() {
        _onReady(req, callback, promise);
    }
}


function request$destroy() {
    if (_messenger) _messenger.destroy();
    request._destroyed = true;
}


function whenRequestsCompleted(callback, timeout) {
    if (_pendingRequests.length)
        _messenger.once('requestscompleted', callback);
    else
        _.defer(callback);
}
