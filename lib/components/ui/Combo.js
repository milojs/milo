'use strict';

var Component = require('../c_class')
, componentsRegistry = require('../c_registry');


var MLCombo = Component.createComponentClass('MLCombo', {
	events: undefined,
	data: {
		get: MLCombo_get,
		set: MLCombo_set,
		del: MLCombo_del,
		splice: undefined
	},
	dom: {
		cls: 'ml-ui-datalist'
	},
	container: undefined
});

componentsRegistry.add(MLCombo);

module.exports = MLCombo;


function MLCombo_get() {

}

function MLCombo_set() {
	
}

function MLCombo_del() {
	
}
