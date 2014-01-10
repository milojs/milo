'use strict';

var Component = require('../c_class')
	, componentsRegistry = require('../c_registry');


var MLTextarea = Component.createComponentClass('MLTextarea', {
	data: undefined,
	events: undefined,
	dom: {
		cls: 'ml-ui-textarea'
	}
});

componentsRegistry.add(MLTextarea);

module.exports = MLTextarea;
