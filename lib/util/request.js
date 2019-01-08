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


var miloCore = require('milo-core')
    , _ = miloCore.proto
    , uniqueId = require('./unique_id')
    , config = require('../config')
    , logger = miloCore.util.logger
    , Messenger = miloCore.Messenger
    , cancelIdleCallback = window.cancelIdleCallback ||
        window.clearTimeout
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

var promiseThen = createPromiseOverride('then');
var promiseCatch = createPromiseOverride('catch');

/**
 * Creates a function which is used to override standard promise behaviour and allow promise instances
 * created to maintain a reference to the request object no matter if .then() or .catch() is called.
 */
function createPromiseOverride(functionName) {
    return function () {
        return addAbortAbility(
            Promise.prototype[functionName].apply(this, arguments),
            this.abort
        );
    };
}

function request(url, opts, callback) {
    var abort;

    opts.url = url;
    opts.contentType = opts.contentType || 'application/json;charset=UTF-8';

    if (_messenger) request.postMessageSync('request', { options: opts });

    return addAbortAbility(
        new Promise(function (resolve, reject) {
            var req = new XMLHttpRequest();
            req.open(opts.method, opts.url, (opts.sync ? false : true));
            req.setRequestHeader('Content-Type', opts.contentType);
            setRequestHeaders(req, opts.headers);

            if (!opts.sync) req.timeout = opts.timeout || config.request.defaults.timeout;

            req.onloadend = req.ontimeout = req.onabort = function (e) {
                abort = null;
                _onReady(e.type, req, callback, resolve, reject);
            };

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
            var ric = requestIdleCallback(
                function (deadline) {
                    ric = null;
                    try {
                        req.send(JSON.stringify(data));
                    } catch (e) {
                        console.error('Request Error: ', url, e, opts);
                    }
                },
                { timeout: req.timeout }
            );

            abort = function () {
                if (abort && !ric) {
                    req.abort();
                } else if (ric) {
                    cancelIdleCallback(ric);
                    ric = null;
                }
                abort = null;
            };

        }),
        abort
    );

}

// Ensures that the promise (and any promises created when calling .then/.catch) has a reference to the original request object
function addAbortAbility(promise, abort) {
    promise.abort = abort;
    promise.then = promiseThen;
    promise.catch = promiseCatch;
    return promise;
}


function setRequestHeaders(req, headers) {
    if (headers)
        _.eachKey(headers, function (value, key) {
            req.setRequestHeader(key, value);
        });
}

function _onReady(eventType, req, callback, resolve, reject) {
    if (req.readyState != 4) return;
    if (req[config.request.completedKey]) return;

    _.spliceItem(_pendingRequests, req);

    var error;
    try {
        if (req.status >= 200 && req.status < 400) {
            try {
                postMessage('success');
                callback && callback(null, req.responseText, req);
            } catch (e) { error = e; }
            resolve(req.responseText);
        }
        else {
            var errorReason = req.status || eventType;
            try {
                postMessage('error');
                postMessage('error' + errorReason);
                callback && callback(errorReason, req.responseText, req);
            } catch (e) { error = e; }
            reject({ reason: errorReason, response: req.responseText });
        }
    } catch (e) {
        error = error || e;
    } finally {
        req[config.request.completedKey] = true;
    }

    // not removing subscription creates memory leak, deleting property would not remove subscription
    req.onloadend = req.ontimeout = req.onabort = undefined;

    if (!_pendingRequests.length)
        postMessage('requestscompleted');

    if (error) {
        var errObj = new Error('Exception: ' + (error.message || error));
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
            .then(function (data) {
                callback(null, data);
            }, function (errData) {
                callback(errData.reason, errData.response);
            });

    return jsonPromise;
}


var jsonpOptions = { method: 'GET', jsonp: true };
function request$jsonp(url, callback) {
    var abort;
    return addAbortAbility(
        new Promise(function (resolve, reject) {
            var script = document.createElement('script'),
                head = window.document.head,
                uniqueCallback = config.request.jsonpCallbackPrefix + uniqueId();

            var opts = _.extend({ url: url }, jsonpOptions);
            if (_messenger) request.postMessageSync('request', { options: opts });

            if (!_.isEqual(_.omitKeys(opts, 'url'), jsonpOptions))
                logger.warn('Ignored not allowed request options change in JSONP request - only URL can be changed');

            var timeout = setTimeout(function () {
                var err = new Error('No JSONP response or no callback in response');
                _onResult(err);
            }, config.request.jsonpTimeout);

            window[uniqueCallback] = _.partial(_onResult, null);

            _pendingRequests.push(window[uniqueCallback]);

            script.type = 'text/javascript';
            script.src = opts.url + (opts.url.indexOf('?') == -1 ? '?' : '&') + 'callback=' + uniqueCallback;

            head.appendChild(script);

            function _onResult(err, result) {
                abort = null;
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
                catch (e) { error = e; }
                if (err) reject(err);
                else resolve(result);

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

            // there's no official way to drop a JSONP request
            // if not ignoring it and cleaning it up once it happens.
            abort = function () {
                if (abort) {
                    abort = null;
                    window[uniqueCallback] = cleanUp;
                }
            };

        }),
        abort
    );
}


function request$file(opts, fileData, callback, progress) {
    var abort;
    return addAbortAbility(
        new Promise(function (resolve, reject) {
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
            req.onloadend = req.ontimeout = req.onabort = function (e) {
                abort = null;
                if (progress) req.upload.onprogress = undefined;
                _onReady(e.type, req, callback, resolve, reject);
            };

            if (opts.binary)
                req.send(fileData);
            else {
                var formData = new FormData();
                formData.append('file', fileData);
                if (opts.data) {
                    Object.keys(opts.data).forEach(function(key) {
                        formData.append(key, opts.data[key])
                    });
                };
                req.send(formData);
            }

            req[config.request.optionsKey] = opts;

            if (opts.trackCompletion !== false) _pendingRequests.push(req);

            abort = function () {
                if (abort) {
                    abort = null;
                    req.abort();
                }
            };

        }),
        abort
    );
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
