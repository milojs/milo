'use strict';

var milo = {
	loader: require('./loader'),
	binder: require('./binder'),
	mail: require('./mail'),
	config: require('./config'),
	util: require('./util')
}


// used facets
require('./components/c_facets/Data');
require('./components/c_facets/Events');
require('./components/c_facets/Template');
require('./components/c_facets/Container');

// used components
require('./components/classes/View');


if (typeof module == 'object' && module.exports)
	// export for node/browserify
	module.exports = milo;

if (typeof window == 'object')
	window.milo = milo;
