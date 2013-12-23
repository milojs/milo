'use strict';

var Component = require('../c_class')
	, componentsRegistry = require('../c_registry');


var MLSelect = Component.createComponentClass('MLSelect', ['data', 'events']);

componentsRegistry.add(MLSelect);

module.exports = MLSelect;
