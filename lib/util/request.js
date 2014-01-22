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

// Only generic request and get convenience method are currently implemented.


var _ = require('mol-proto');

module.exports = request;


// TODO add error statuses
var okStatuses = ['200', '304'];


function request(url, opts, callback) {
	var req = new XMLHttpRequest();
	req.open(opts.method, url, true); // what true means?
	req.setRequestHeader('Content-Type', opts.contentType || 'application/json;charset=UTF-8');

	req.onreadystatechange = function () {
		if (req.readyState == 4 && req.statusText.toUpperCase() == 'OK' )
			callback(null, req.responseText, req);
		// else
		// 	callback(req.status, req.responseText, req);
	};
	req.send(JSON.stringify(opts.data));
}

_.extend(request, {
	get: request$get,
	post: request$post,
	json: request$json
});


function request$get(url, callback) {
	request(url, { method: 'GET' }, callback);
}

function request$post(url, data, callback) {
	request(url, { method: 'POST', data: data }, callback);
}

function request$json(url, callback) {
	request(url, { method: 'GET' }, function(err, text) {
		if (err) return callback(err);
		try {
			var data = JSON.parse(text);
		} catch (e) {
			callback(e);
			return;
		}

		callback(null, data);
	});
}
