'use strict';

var count = require('./count')
	, config = require('../config')
	, prefix = config.componentPrefix;


module.exports = componentName;

function componentName() {
	return prefix + count();
}
