'use strict';

// <a name="utils-request"></a>
// milo.utils.request
// -----------

// example

// ```javascript
// var request = milo.utils.request
//     , opts: { method: 'GET' };

// request(url, opts, function(err, data) {
//     log(data);
// });

// request.get(url, function(err, data) {
//     log(data);
// });
// ```



var _ = require('mol-proto');

module.exports = request;


// TODO add error statuses
var okStatuses = ['200', '304'];


function request(url, opts, callback) {
	var req = new XMLHttpRequest();
	req.open(opts.method, url, true); // what true means?
	req.onreadystatechange = function () {
		if (req.readyState == 4 && req.statusText.toUpperCase() == 'OK' )
			callback(null, req.responseText, req);
		// else
		// 	callback(req.status, req.responseText, req);
	};
	req.send(null);
}

_.extend(request, {
	get: request$get,
	json: request$json
});


function request$get(url, callback) {
	request(url, { method: 'GET' }, callback);
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
