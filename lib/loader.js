'use strict';

var request = require('./request')
	, logger = require('./logger')
	, config = require('./config')
	, LoadAttribute = require('./attribute/a_load')
	, LoaderError = require('./error').Loader;


module.exports = loader;


function loader(rootEl /* optional */, callback) {
	if (document.readyState == 'loading')
		document.addEventListener('readystatechange', loadWhenReady);
	else
		loadWhenReady();

	function loadWhenReady() {
		document.removeEventListener('readystatechange', loadWhenReady);
		_loader.call(null, rootEl, callback);
	}
}


function _loader(rootEl /* optional */, callback) {
	if (typeof rootEl == 'function') {
		callback = rootEl;
		rootEl = undefined;
	}

	rootEl = rootEl || document.body;
	
	var views = {};

	var loadElements = rootEl.querySelectorAll('[' + config.attrs.load + ']');

	var results = {}
		, totalCount = loadElements.length
		, loadedCount = 0;

	Array.prototype.forEach.call(loadElements, function (el) {
		loadView(el, function(err) {
			results[el.id] = err || el;
			loadedCount++;
			if (loadedCount == totalCount)
				callback(results);
		});
	});
};


function loadView(el, callback) {
	if (el.children.length)
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
