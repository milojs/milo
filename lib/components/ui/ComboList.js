'use strict';

var Component = require('../c_class')
	, componentsRegistry = require('../c_registry')
	, _ = require('mol-proto');

var COMBO_LIST_CHANGE_MESSAGE = 'mlcombolistchange';


var MLComboList = Component.createComponentClass('MLComboList', {
	dom: {
		cls: 'ml-ui-combo-list'
	},
	data: {
		get: MLComboList_get,
		set: MLComboList_set,
		del: MLComboList_del,
		event: COMBO_LIST_CHANGE_MESSAGE
	},
	events: undefined,
	model: {
		// messages: {
		// 	'***': onItemsChange
		// }
	},
	template: {
		template: '<div ml-bind="MLList:list">\
			           <div ml-bind="[item]:item">\
			               <span ml-bind="[data]:label"></span>\
			               <button ml-bind="[events]:delete">x</button>\
			           </div>\
			       </div>\
			       <div ml-bind="MLSuperCombo:combo" style="width:250px; background-color: #ccc;"></div>'
	}
});


componentsRegistry.add(MLComboList);

module.exports = MLComboList;


_.extendProto(MLComboList, {
	init: MLComboList$init,
	setOptions: MLComboList$setOptions
});


function MLComboList$init() {
	Component.prototype.init.apply(this, arguments);
	
	this.on('childrenbound', onChildrenBound);
	
}


function MLComboList$setOptions(arr) {
	this._combo.setOptions(arr);
}


function onChildrenBound() {
	this.off('childrenbound', onChildrenBound);
	this.template.render().binder();
	componentSetup.call(this);
}

function componentSetup() {
	_.defineProperties(this, {
		'_combo': this.container.scope.combo,
		'_list': this.container.scope.list
	});

	this._combo.data.on('', {subscriber: onComboChange, context: this });    
}

function onComboChange(msg, data) {
	if (data.newValue)
		this._list.model.push(data.newValue);
	this._combo.data.del();
}

function MLComboList_get() {
	return this.model.get();
}

function MLComboList_set(value) {
	this.model.set(value);
}

function MLComboList_del() {
	return this.model.set([]);
}


