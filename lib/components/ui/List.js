'use strict';

var Component = require('../c_class')
	, componentsRegistry = require('../c_registry')
	, _ = require('mol-proto');

var LIST_CHANGE_MESSAGE = 'mllistchange';


var MLList = Component.createComponentClass('MLList', {
	dom: {
		cls: 'ml-ui-list'
	},
	data: {
		get: MLList_get,
		set: MLList_set,
		del: MLList_del,
		event: LIST_CHANGE_MESSAGE
	},
	events: undefined,
	model: {
		// messages: {
		// 	'***': onItemsChange
		// }
	},
	list: undefined
});


componentsRegistry.add(MLList);

module.exports = MLList;


_.extendProto(MLList, {
	init: MLList$init,
});


function MLList$init() {
	Component.prototype.init.apply(this, arguments);
	this.on('childrenbound', onChildrenBound);
}


function MLList_get() {
	return this.model.get();
}

function MLList_set(value) {
	this.model.set(value);
}

function MLList_del() {
	return this.model.set([]);
}


function onChildrenBound() {
	this.model.set([]);
	milo.minder(this.model, '<<<->>>', this.data);
	this.data.on('', {subscriber: onItemsChange, context: this});
}


function onItemsChange(path, data) {
	if (data.removed.length) return;
	var index = data.index;
	var newItem = this.list.item(index);
	var btn = newItem.container.scope.delete;
	btn.events.on('click', {subscriber: onItemDelete, context: newItem});
	//this.data.getMessageSource().dispatchMessage(LIST_CHANGE_MESSAGE);
}


function onItemDelete(msg, event) {
	var id = this.data.getKey();
	var parent = this.getScopeParent('list');
	var btn = this.container.scope.delete;
	btn.events.off('click', {subscriber: onItemDelete, context: this});

	parent.model.splice(id, 1);
	//this.data.getMessageSource().dispatchMessage(LIST_CHANGE_MESSAGE);
}
