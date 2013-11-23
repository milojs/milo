'use strict';

var milo = {
	binder: require('./binder/binder')
}

if (typeof module == 'object' && module.exports)
	// export for node/browserify
	module.exports = milo;

if (typeof window == 'object')
	window.milo = milo;
