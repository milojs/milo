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
    , Promise = require('./promise');

module.exports = request;


// TODO add error statuses
var okStatuses = ['200', '304'];


function request(url, opts, callback) {
    var req = new XMLHttpRequest();
    req.open(opts.method, url, true); // what true means?
    req.setRequestHeader('Content-Type', opts.contentType || 'application/json;charset=UTF-8');

    var promise = new Promise(req);

    req.onreadystatechange = function () {
        if (req.readyState == 4) {
            if (req.statusText.toUpperCase() == 'OK' ) {
                callback && callback(null, req.responseText, req);
                promise.setData(null, req.responseText);
            } else {
                callback && callback(req.status, req.responseText, req);
                promise.setData(req.status, req.responseText);
            }
        }
    };
    req.send(JSON.stringify(opts.data));

    return promise;
}

_.extend(request, {
    get: request$get,
    post: request$post,
    json: request$json
});


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
