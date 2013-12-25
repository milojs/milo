'use strict';

var _ = require('mol-proto');

// A minimalist browser framework that binds HTML elements to JS components and components to models.

// Main Modules
// ------------
// - .[loader](#loader) - loading subviews into page
// - .[binder](#binder) - components instantiation and binding of DOM elements to them
// - .[minder](#minder) - data reactivity, one or two way, shallow or deep, as you like it
// - .[mail](#mail) - applicaiton level messenger
// - .[config](#config) - milo configuration
// - .[utils](#utils) - logger, request, check, etc.
// - .[classes](#classes) - foundation classes and class registries
function milo(func) {
	milo.mail.on('domready', func);
}

_.extend(milo, {
	loader: require('./loader'),
	binder: require('./binder'),
	minder: require('./minder'),
	mail: require('./mail'),
	config: require('./config'),
	util: require('./util'),
	classes: require('./classes'),
	attributes: require('./attributes'),
	Component: require('./components/c_class'),
	Messenger: require('./messenger'),
	Model: require('./model'),
	registry: {
		facets: require('./components/c_facets/cf_registry'),
		components: require('./components/c_registry')
	}
});


// included facets
require('./use_facets');

// included components
require('./use_components');


// export for node/browserify
if (typeof module == 'object' && module.exports)	
	module.exports = milo;

// global milo for browser
if (typeof window == 'object')
	window.milo = milo;
