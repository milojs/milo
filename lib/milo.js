'use strict';

var milo = module.exports = {
	bind: require('./binder/bind')
}

if (typeof window == 'object')
	window.milo = milo;
