'use strict';

var Component = require('../c_class')
	, componentsRegistry = require('../c_registry');


var MLWrapper = Component.createComponentClass('MLWrapper', {
	container: undefined,
	data: undefined,
	events: undefined,
	dom: {
		cls: 'ml-ui-wrapper'
	}
});

componentsRegistry.add(MLWrapper);

module.exports = MLWrapper;
