'use strict';

var Component = require('../c_class')
	, componentsRegistry = require('../c_registry');


var MLButton = Component.createComponentClass('MLButton', ['events']);

componentsRegistry.add(MLButton);

module.exports = MLButton;
