'use strict';

var _ = require('mol-proto');

// A minimalist framework that binds DOM elements to JS components and components to models.

// Main Modules
// ------------
// - .[loader](#loader) - loading subviews into page
// - .[binder](#binder) - components instantiation and binding of DOM elements to them
// - .[minder](#minder) - data reactivity, one or two way, shallow or deep, as you like it
// - .[mail](#mail) - applicaiton level messenger
// - .[config](#config) - milo configuration
// - .[utils](#utils) - logger, request, check, etc.
// - .[classes](#classes) - foundation classes and class registries

/**
 * `milo`
 *
 * milo is available as global object in the browser.
 * At the moment it is not possiible to require it with browserify to have it bundled with the app because of the way [brfs](https://github.com/substack/brfs) browserify plugin is implemented.
 * It is possible though to require `milo` with node to use universal parts of the framework (abstract classes, Messenger, Model, etc.):
 * ```
 * var milo = require('mol-milo');
 * ```
 * 
 * `milo` itself is a function that can be used to delay execution until DOM is ready.
 */
function milo(func) {
	milo.mail.on('domready', func);
}


/**
 * ####Milo packages####
 *
 * - [loader](./loader.js.html) - loading subviews into page
 * - [binder](./binder.js.html) - components instantiation and binding of DOM elements to them
 * - [minder](./minder.js.html) - data reactivity, one or two way, shallow or deep, as you like it
 * - [mail](./mail/index.js.html) - applicaiton level messenger, also connects to messages from other windows dispatched with `window.postMessage`.
 * - [config](./config.js.html) - milo configuration
 * - [util](./util/index.js.html) - logger, request, dom, check, error, etc.
 * - [classes](./classes.js.html) - abstract and base classes
 * - [attributes](./attributes/index.js.html) - classes that wrap DOM elements attributes recognized by milo
 * - [Component](./components/c_class.js.html) - base Component class
 * - [Messenger](./messenger/index.js.html) - generic Messenger used in most other milo classes, can be mixed into app classes too.
 * - [Model](./model/index.js.html) - Model class that emits messages on changes to any depth without timer based watching
 * - [registry](./registry.js.html) - registries of fasets and components classes
 */
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
	registry: require('./registry')
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
