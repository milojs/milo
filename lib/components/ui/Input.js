'use strict';

var Component = require('../c_class')
	, componentsRegistry = require('../c_registry');


var MLInput = Component.createComponentClass('MLInput', ['data', 'events']);

componentsRegistry.add(MLInput);

module.exports = MLInput;
