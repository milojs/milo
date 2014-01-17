'use strict';

var Component = require('../c_class')
	, componentsRegistry = require('../c_registry');


var MLCheckbox = Component.createComponentClass('MLCheckbox', {
	events: undefined,
	dom: {
		cls: 'ml-ui-checkbox'
	}
});

componentsRegistry.add(MLCheckbox);

module.exports = MLCheckbox;