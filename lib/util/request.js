'use strict';

// milo.utils.request
// -----------

// Convenience functions wrapping XMLHttpRequest functionality.

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


var miloCore = require('milo-core')
    , Dodgy = require('dodgy').Promise
    , _ = miloCore.proto
    , uniqueId = require('./unique_id')
    , config = require('../config')
    , logger = miloCore.util.logger
    , Messenger = miloCore.Messenger
    , requestIdleCallback = window.requestIdleCallback ||
                            function (cb) {
                                var start = Date.now();
                                return setTimeout(function () {
                                    cb({
                                        didTimeout: false,
                                        timeRemaining: function () {
                                            return Math.max(0, 50 - (Date.now() - start));
                                        }
                                    });
                                }, 1);
                            };

module.exports = request;


var _pendingRequests = [];

function request(url, opts, callback) {
    opts.url = url;
    opts.contentType = opts.contentType || 'application/json;charset=UTF-8';

    if (_messenger) request.postMessageSync('request', { options: opts });

    var req = new XMLHttpRequest();
    req.open(opts.method, opts.url, (opts.sync ? false : true));
    req.setRequestHeader('Content-Type', opts.contentType);
    setRequestHeaders(req, opts.headers);

    if (!opts.sync) req.timeout = opts.timeout || config.request.defaults.timeout;
    req.onloadend = req.ontimeout = req.onabort = onReady;

    var xPromise = _createXPromise(req);

    req[config.request.optionsKey] = opts;

    if (opts.trackCompletion !== false) _pendingRequests.push(req);

    /**
     * There are cases where the cached response
     * might trigger faster than a chained Promise
     * through its `.then()` callback.
     * In these cases it makes sense to return
     * the Promise first and trigger
     * the request after, whenever the CPU
     * is not busy but also never later than
     * specified request timeout.
     */
    var data = opts.data;
    requestIdleCallback(
        function (deadline) {
            req.send(JSON.stringify(data));
        },
        {timeout: req.timeout}
    );

    return abortable(xPromise);

    function onReady(e) {
        _onReady(req, callback, xPromise, e.type);
    }
}


function _createXPromise(hosted) {
    return new Dodgy(
        function (k, n, onAbort) {
            onAbort(function () {
                // only if the hosted object has an abort
                // example: if it's a script, don't call it
                if (hosted.abort) hosted.abort();
            });
        },
        true
    );
}

function abortable(dodgy) {
    // in order to keep the resolvable Promise
    // in this module scope, pass a regular
    // promise able to abort the request
    var promise = Promise.resolve(dodgy);
    promise.abort = dodgy.abort;
    return promise;
}


function setRequestHeaders(req, headers) {
    if (headers)
        _.eachKey(headers, function(value, key) {
            req.setRequestHeader(key, value);
        });
}

function _onReady(req, callback, xPromise, eventType) {
    if (req.readyState != 4) return;
    if (req[config.request.completedKey]) return;

    _.spliceItem(_pendingRequests, req);

    var error;
    try {
        if ( req.status >= 200 && req.status < 400 ) {
            try {
                postMessage('success');
                callback && callback(null, req.responseText, req);
            } catch(e) { error = e; }
            xPromise.resolve(req.responseText);
        }
        else {
            var errorReason = req.status || eventType;
            try {
                postMessage('error');
                postMessage('error' + errorReason);
                callback && callback(errorReason, req.responseText, req);
            } catch(e) { error = e; }
            xPromise.reject({ reason: errorReason, response: req.responseText });
        }
    } catch(e) {
        error = error || e;
    } finally {
        req[config.request.completedKey] = true;
    }

    // not removing subscription creates memory leak, deleting property would not remove subscription
    req.onloadend = req.ontimeout = req.onabort = undefined;

    if (!_pendingRequests.length)
        postMessage('requestscompleted');

    if (error) {
        var errObj = new Error('Exception: ' + error);
        logger.error(error.stack);
        throw errObj;
    }

    function postMessage(msg) {
        if (_messenger) request.postMessage(msg,
            { status: status, response: req.responseText });
    }
}


_.extend(request, {
    get: request$get,
    post: request$post,
    put: request$put,
    delete: request$delete,
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


function request$put(url, data, callback) {
    return request(url, { method: 'PUT', data: data }, callback);
}


function request$delete(url, data, callback) {
    return request(url, { method: 'DELETE', data: data }, callback);
}


function request$json(url, callback) {
    var promise = request(url, { method: 'GET' });

    var jsonPromise = promise.then(JSON.parse);

    if (callback)
        jsonPromise
        .then(function(data) {
            callback(null, data);
        }, function(errData) {
            callback(errData.reason, errData.response);
        });

    return jsonPromise;
}


var jsonpOptions = { method: 'GET', jsonp: true };
function request$jsonp(url, callback) {
    var script = document.createElement('script'),
        xPromise = _createXPromise(script),
        head = window.document.head,
        uniqueCallback = config.request.jsonpCallbackPrefix + uniqueId();

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

    return abortable(xPromise);


    function _onResult(err, result) {
        _.spliceItem(_pendingRequests, window[uniqueCallback]);
        var error;
        try {
            postMessage(err ? 'error' : 'success', err, result);
            if (err) {
                logger.error('No JSONP response or timeout');
                postMessage('errorjsonptimeout', err);
            }
            callback && callback(err, result);
        }
        catch(e) { error = e; }
        if (err) xPromise.reject(err);
        else xPromise.resolve(result);

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


function request$file(opts, fileData, callback, progress) {
    if (typeof opts == 'string')
        opts = { method: 'POST', url: opts };

    opts.method = opts.method || 'POST';
    opts.file = true;

    if (_messenger) request.postMessageSync('request', { options: opts });

    var req = new XMLHttpRequest();
    if (progress) req.upload.onprogress = progress;

    req.open(opts.method, opts.url, true);
    setRequestHeaders(req, opts.headers);

    req.timeout = opts.timeout || config.request.defaults.timeout;
    req.onloadend = req.ontimeout = req.onabort = onReady;

    var xPromise = _createXPromise(req);

    if (opts.binary)
        req.send(fileData);
    else {
        var formData = new FormData();
        formData.append('file', fileData);
        req.send(formData);
    }

    req[config.request.optionsKey] = opts;

    if (opts.trackCompletion !== false) _pendingRequests.push(req);

    return abortable(xPromise);

    function onReady(e) {
        if (progress) req.upload.onprogress = undefined;
        _onReady(req, callback, xPromise, e.type);
    }
}


function request$destroy() {
    if (_messenger) _messenger.destroy();
    request._destroyed = true;
}


function whenRequestsCompleted(callback, timeout) {
    callback = _.once(callback);
    if (timeout)
        _.delay(callback, timeout, 'timeout');

    if (_pendingRequests.length)
        _messenger.once('requestscompleted', callback);
    else
        _.defer(callback);
}
