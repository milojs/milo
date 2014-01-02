'use strict';

var Component = require('../c_class')
	, componentsRegistry = require('../c_registry');


var MLSelect = Component.createComponentClass('MLSelect', {
	dom: {
		cls: 'ml-ui-select'
	},
	data: undefined,
	events: undefined,
	model: {
		messages: {
			'***': onOptionsChange
		}
	},
	template: {
		template: '{{~ it.selectOptions :option }} \
						<option value="{{= option.value }}">{{= option.label }}</option> \
				   {{~}}'
	}
});


componentsRegistry.add(MLSelect);

module.exports = MLSelect;


function onOptionsChange(path, data) {
	var component = this.hostObject.owner;
	component.template.render({ selectOptions: this.get() });
}
