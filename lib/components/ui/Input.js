'use strict';

var Component = require('../c_class')
	, componentsRegistry = require('../c_registry');


var MLInput = Component.createComponentClass('MLInput', {
	data: undefined,
	events: undefined,
	dom: {
		cls: 'ml-ui-input'
	}
});

componentsRegistry.add(MLInput);

module.exports = MLInput;
