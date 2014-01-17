'use strict';

var Component = require('../c_class')
	, componentsRegistry = require('../c_registry')
	, _ = require('mol-proto');


var MLList = Component.createComponentClass('MLList', {
	dom: {
		cls: 'ml-ui-list'
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


componentsRegistry.add(MLList);

module.exports = MLList;


_.extendProto(MLList, {
	disable: MLList$disable
});


function MLList$disable(disable) {
	this.el.disabled = disable;
}


function onOptionsChange(path, data) {
	var component = this._hostObject.owner;
	component.template.render({ selectOptions: this.get() });
}
