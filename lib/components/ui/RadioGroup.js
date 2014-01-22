'use strict';

var Component = require('../c_class')
	, componentsRegistry = require('../c_registry');


var MLRadioGroup = Component.createComponentClass('MLRadioGroup', {
	data: {
		set: setGroupValue,
		get: getGroupValue,
		del: deleteGroupValue,
		splice: undefined
	},
	model: {
		messages: {
			'***': { subscriber: onOptionsChange, context: 'owner' }
		}
	},
	events: {
		messages: {
			'click': { subscriber: onGroupClick, context: 'owner' }
		}
	},
	container: undefined,
	dom: {
		cls: 'ml-ui-radio-group'
	},
	template: {
		template: '{{~ it.radioOptions :option }} \
						<input id="{{= option.name }}-{{= option.value }}" type="radio" value="{{= option.value }}" name="{{= option.name }}"> \
						<label for="{{= option.name }}-{{= option.value }}">{{= option.label }}</label> \
				   {{~}}'
	}
});

componentsRegistry.add(MLRadioGroup);

module.exports = MLRadioGroup;


_.extendProto(MLRadioGroup, {
	init: MLRadioGroup$init
});


/**
 * Component instance method
 * Initialize radio group and setup 
 */
function MLRadioGroup$init() {
	_.defineProperty(this, '_radioList', [], _.CONF);
	_.defineProperty(this, '_value', undefined, _.WRIT);
	Component.prototype.init.apply(this, arguments);
}


/**
 * Sets group value
 * Replaces the data set operation to deal with radio buttons
 *
 * @param {Mixed} value The value to be set
 */
function setGroupValue(value) {
	var oldValue = this._value;
	var newValue = undefined;
	if (this._radioList.length)
		this._radioList.forEach(function(radio) {
			if (radio.value == value){
				radio.checked = true;
				this._value = value;
			} else
				radio.checked = false;
		}, this);
	postDataChangeMessage.call(this, oldValue);
}


/**
 * Gets group value
 * Retrieves the selected value of the group
 *
 * @return {String}
 */
function getGroupValue() {
	var filtered = this._radioList.filter(function(radio) {
		return radio.checked;
	});
	return filtered[0] && filtered[0].value ? filtered[0].value : undefined;
}


/**
 * Deleted group value
 * Deletes the value of the group, setting it to empty
 */
function deleteGroupValue() {
	var oldValue = this._value;
	if (this._radioList.length)
		this._radioList.forEach(function(radio) {
			radio.checked = false;
			this._value = undefined;
		}, this);

	if (this._value != oldValue)
		this.data.postMessage('', { path: '', type: 'deleted', oldValue: oldValue });
}


/**
 * Manage radio children clicks
 */
function onGroupClick(eventType, event) {
	if (event.target.type == 'radio') {
		var oldValue = this._value;
		this._value = event.target.value;
		postDataChangeMessage.call(this, oldValue);
	}
}

// Post the data change
function postDataChangeMessage(oldValue) {
	if (this._value != oldValue){
		if (typeof oldValue == 'undefined')
			this.data.postMessage('', { path: '', type: 'added',
									newValue: this._value });
		else
			this.data.postMessage('', { path: '', type: 'changed',
									newValue: this._value, oldValue: oldValue });
	}
}


// Set radio button children on model change
function onOptionsChange(path, data) {
	this.template.render({ radioOptions: this.model.get() });

	var radioEls = this.el.querySelectorAll('input[type="radio"]');
	this._radioList.length = 0;
	for (var i = 0; i < radioEls.length; i++)
		this._radioList.push(radioEls[i]);
}
