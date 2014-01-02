'use strict';

var Component = require('../c_class')
	, componentsRegistry = require('../c_registry');


var MLGroup = Component.createComponentClass('MLGroup', {
	container: undefined,
	data: undefined,
	events: undefined,
	dom: {
		cls: 'ml-ui-group'
	}
});

componentsRegistry.add(MLGroup);

module.exports = MLGroup;
