'use strict';

var milo = {
	bind: require('./binder/bind')
}

if (typeof module == 'object' && module.exports)
	// export for node/browserify
	module.exports = milo;

if (typeof window == 'object')
	window.milo = milo;
