// A minimalist browser framework that binds HTML elements to JS components and components to models.
'use strict';

// Main Modules
// ------------
// - .[loader](#loader) - loading subviews into page
// - .[binder](#binder) - components instantiation and binding of DOM elements to them
// - .[minder](#minder) - data reactivity, one or two way, shallow or deep, as you like it
// - .[mail](#mail) - applicaiton level messenger
// - .[config](#config) - milo configuration
// - .[utils](#utils) - logger, request, check, etc.
// - .[classes](#classes) - foundation classes and class registries

var milo = {
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
	Model: require('./model')
};


// included facets
require('./components/c_facets/Dom');
require('./components/c_facets/Data');
require('./components/c_facets/Frame');
require('./components/c_facets/Events');
require('./components/c_facets/Template');
require('./components/c_facets/Container');
require('./components/c_facets/ModelFacet');
require('./components/c_facets/Drag');
require('./components/c_facets/Drop');
require('./components/c_facets/Editable');
require('./components/c_facets/Split');
require('./components/c_facets/List');
require('./components/c_facets/Item');

// included components
require('./components/classes/View');


// export for node/browserify
if (typeof module == 'object' && module.exports)	
	module.exports = milo;

// global milo for browser
if (typeof window == 'object')
	window.milo = milo;
