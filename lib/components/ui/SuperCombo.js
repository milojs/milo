'use strict';

var Component = require('../c_class')
	, componentsRegistry = require('../c_registry')
	, _ = require('mol-proto');


var COMBO_CHANGE_MESSAGE = 'mlsupercombochange';

var OPTIONS_TEMPLATE = '{{~ it.comboOptions :option }}\
							<div data-value="{{= option.value }}">{{= option.label }}</div>\
						{{~}}';

var MAX_RENDERED = 100;
var BUFFER = 50;

var MLSuperCombo = Component.createComponentClass('MLSuperCombo', {
	events: undefined,
	data: {
		get: MLSuperCombo_get,
		set: MLSuperCombo_set,
		del: MLSuperCombo_del,
		splice: undefined,
		event: COMBO_CHANGE_MESSAGE
	},
	dom: {
		cls: 'ml-ui-supercombo'
	},
	container: undefined
});

componentsRegistry.add(MLSuperCombo);

module.exports = MLSuperCombo;


_.extendProto(MLSuperCombo, {
	init: MLSuperCombo$init,
	showOptions: MLSuperCombo$showOptions,
	hideOptions: MLSuperCombo$hideOptions,
	toggleOptions: MLSuperCombo$toggleOptions,
	setOptions: MLSuperCombo$setOptions,
	setFilteredOptions: MLSuperCombo$setFilteredOptions,
	update: MLSuperCombo$update
});


function MLSuperCombo$init() {
	Component.prototype.init.apply(this, arguments);
	this.on('childrenbound', onChildrenBound);
	_.defineProperties(this, {
		_optionsData: [],
		_filteredOptionsData: []
	}, _.WRIT);
}

function MLSuperCombo$toggleOptions(show) {
	this._comboList.dom.toggle(show);
}

function MLSuperCombo$showOptions() {
	this._comboList.dom.toggle(true);
}

function MLSuperCombo$hideOptions() {
	this._comboList.dom.toggle(false);
}

function MLSuperCombo$setOptions(arr) {
	this._optionsData = arr;
	this.setFilteredOptions(arr);
}

function MLSuperCombo$setFilteredOptions(arr) {
	this._filteredOptionsData = arr;
	this._total = arr.length;
	this.update();
}

function MLSuperCombo$update() {
	// var wasHidden = this._isHidden
	// if (wasHidden)
	// 	this.showOptions();

	var arrToShow = this._filteredOptionsData.slice(this._startIndex, this._endIndex);
	this._comboOptions.template.render({
		comboOptions: arrToShow
	});

	var firstEl = this._comboOptions.el.firstChild;
	this._elementHeight = firstEl ? firstEl.offsetHeight : 0;

	// if (wasHidden)
	// 	this.hideOptions();

	var beforeHeight = this._startIndex * this._elementHeight;
	var afterHeight = (this._total - this._endIndex) * this._elementHeight;
	var optionsHeight = this._comboOptions.el.childNodes.length * this._elementHeight;

	this._comboOptions.el.style.height = optionsHeight + 'px';
	this._comboBefore.el.style.height = beforeHeight + 'px';
	this._comboAfter.el.style.height = afterHeight > 0 ? afterHeight + 'px' : '0px';
}

function onChildrenBound() {
	_.defineProperties(this, {
		'_comboInput': this.container.scope.input,
		'_comboList': this.container.scope.list,
		'_comboOptions': this.container.scope.options,
		'_comboBefore': this.container.scope.before,
		'_comboAfter': this.container.scope.after,
		'_comboOpenBtn': this.container.scope.openBtn
	});

	_.defineProperties(this, {
		'_startIndex': 0,
		'_endIndex': MAX_RENDERED,
		'_hidden': false,
		'_elementHeight': 0,
		'_total': 0
	}, _.WRIT);

	// Component Setup
	this.dom.setStyles({ position: 'relative' });

	setupComboList(this._comboList, this._comboOptions, this);
	setupComboInput(this._comboInput, this);
	setupComboBtn(this._comboOpenBtn, this);
}

function setupComboList(list, options, self) {
	options.template.set(OPTIONS_TEMPLATE);
	var xPos = self._comboInput.el.clientLeft;
	var yPos = self._comboInput.el.clientTop + self._comboInput.el.offsetHeight + 4;
	
	list.dom.setStyles({
		overflow: 'scroll',
		height: '200px',
		width: '100%',
		position: 'absolute',
		top: yPos + 'px',
		left: xPos + 'px',
		backgroundColor: '#FFFFFF'
	});

	//list.dom.hide();
	var scrollHandler = _.throttle(onListScroll, 50);
	list.events.onMessages({
		'click': {subscriber: onListClick, context: self},
		'scroll': {subscriber: scrollHandler, context: self}
	});
}

function setupComboInput(input, self) {
	input.data.on('', { subscriber: onDataChange, context: self });
}

function setupComboBtn(btn, self) {
	btn.events.on('click', { subscriber: onBtnClick, context: self });
}

/* Data Facet */
function MLSuperCombo_get() {
	// if (! this._comboInput) return;
	// return this._comboInput.data.get();
}

function MLSuperCombo_set(value) {
	// return changeComboData.call(this, 'set', value);
}

function MLSuperCombo_del() {
	// return changeComboData.call(this, 'del', value);
}


// Post the data change
function onDataChange(msg, data) {
	var text = data.newValue;
	var filteredArr = _.filter(this._optionsData, function(option) {
		return option.label.indexOf(text) != -1;
	});
	this.setFilteredOptions(filteredArr);
	this._comboList.el.scrollTop = 0;

	//this.data.getMessageSource().dispatchMessage(COMBO_CHANGE_MESSAGE);
}

function onBtnClick (type, event) {
	this._hidden = !this._hidden;
	this.toggleOptions(this._hidden);
}

function onListClick (type, event) {
	//cnsole.log('value: ', event.target.getAttribute('data-value'));
}

function onListScroll (type, event) {
	var scrollPos = event.target.scrollTop;
	var totalElementsBefore = Math.floor(scrollPos / this._elementHeight) - BUFFER;

	this._startIndex = totalElementsBefore > 0 ? totalElementsBefore : 0;
	this._endIndex = totalElementsBefore + MAX_RENDERED;
	this.update();
}






