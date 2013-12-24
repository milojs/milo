'use strict';

var Component = require('../c_class')
	, componentsRegistry = require('../c_registry');


var MLGroup = Component.createComponentClass('MLGroup', ['container', 'data']);

componentsRegistry.add(MLGroup);

module.exports = MLGroup;
