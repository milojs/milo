'use strict';

var milo = module.exports = {
	binder: require('./binder');
}

if (typeof window == 'object')
	window.milo = milo;
