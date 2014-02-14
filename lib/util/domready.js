'use strict';


var _ = require('mol-proto');


module.exports = domReady;

function domReady(func) { // , arguments
	var self = this
		, args = _.slice(arguments, 1);
	if (isReady.call(this))
		callFunc();
	else
		document.addEventListener('readystatechange', _.once(callFunc));

	function callFunc() {
		func.apply(self, args);
	}
}

domReady.isReady = isReady;


function isReady() {
	var readyState = document.readyState;
	return readyState == 'loading' ? false : readyState;
}
