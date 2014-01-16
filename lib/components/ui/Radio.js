'use strict';

var Component = require('../c_class')
	, componentsRegistry = require('../c_registry');


var MLRadio = Component.createComponentClass('MLRadio', {
	data: undefined,
	events: undefined,
	dom: {
		cls: 'ml-ui-radio'
	}
});

componentsRegistry.add(MLRadio);

module.exports = MLRadio;
