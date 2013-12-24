'use strict';

var Component = require('../c_class')
	, componentsRegistry = require('../c_registry')
	, doT = require('dot');


var MLSelect = Component.createComponentClass('MLSelect', {
	dom: undefined,
	data: undefined,
	events: undefined,
	model: {
		messages: {
			'***': onOptionsChange
		}
	}
});


componentsRegistry.add(MLSelect);

module.exports = MLSelect;


var optionsTemplateText = '\
	{{~ it.options :option }} \
		<option value="{{= option.value }}">{{= option.label }}</option> \
	{{~}} \
';

var optionsTemplate = doT.compile(optionsTemplateText);


function onOptionsChange(path, data) {
	var selectEl = this.scope.owner.el;
	selectEl.innerHTML = optionsTemplate(this.get());
}
