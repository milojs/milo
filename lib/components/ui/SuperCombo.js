'use strict';

var Component = require('../c_class')
	, componentsRegistry = require('../c_registry')
	, _ = require('mol-proto')
	, doT = require('dot');


var COMBO_CHANGE_MESSAGE = 'mlsupercombochange';

var OPTIONS_TEMPLATE = '{{~ it.comboOptions :option:index }}\
							<div data-value="{{= index }}">{{= option.label }}</div>\
						{{~}}';

var MAX_RENDERED = 100;
var BUFFER = 25;

var MLSuperCombo = Component.createComponentClass('MLSuperCombo', {
	events: {
		messages: {
			'mouseleave': {subscriber: onMouseLeave, context: 'owner'}
		}
	},
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
	template: {
		template: '<input ml-bind="[data, events]:input" class="form-control ml-ui-input">\
		           <button ml-bind="[events]:openBtn">+</button>\
		           <div ml-bind="[dom, events]:list" class="ml-ui-supercombo-dropdown">\
		               <div ml-bind="[dom]:before"></div>\
		               <div ml-bind="[template, dom, events]:options"></div>\
		               <div ml-bind="[dom]:after"></div>\
		           </div>'
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


function onChildrenBound() {
	this.off('childrenbound', onChildrenBound);
	this.template.render().binder();
	componentSetup.call(this);
}

function componentSetup() {
	_.defineProperties(this, {
		'_comboInput': this.container.scope.input,
		'_comboList': this.container.scope.list,
		'_comboOptions': this.container.scope.options,
		'_comboBefore': this.container.scope.before,
		'_comboAfter': this.container.scope.after,
		'_comboOpenBtn': this.container.scope.openBtn,
		'_optionTemplate': doT.compile(OPTIONS_TEMPLATE)
	});

	_.defineProperties(this, {
		'_startIndex': 0,
		'_endIndex': MAX_RENDERED,
		'_hidden': false,
		'_elementHeight': 0,
		'_total': 0,
		'_optionsHeight': 200,
		'_lastScrollPos': 0,
		'_currentValue': null
	}, _.WRIT);

	// Component Setup
	this.dom.setStyles({ position: 'relative' });
	setupComboList(this._comboList, this._comboOptions, this);
	setupComboInput(this._comboInput, this);
	setupComboBtn(this._comboOpenBtn, this);
}


function MLSuperCombo$toggleOptions(show) {
	this._hidden = !show;
	this._comboList.dom.toggle(show);
}

function MLSuperCombo$showOptions() {
	this._hidden = false;
	this._comboList.dom.toggle(true);
}

function MLSuperCombo$hideOptions() {
	this._hidden = true;
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
	var wasHidden = this._hidden;
	if (wasHidden)
		this.showOptions();

	var arrToShow = this._filteredOptionsData.slice(this._startIndex, this._endIndex);
	
	this._comboOptions.template.render({
		comboOptions: arrToShow
	});

	var firstEl = this._comboOptions.el.firstChild;
	this._elementHeight = firstEl ? firstEl.offsetHeight : this._elementHeight;

	if (wasHidden)
		this.hideOptions();

	var beforeHeight = this._startIndex * this._elementHeight;
	var afterHeight = (this._total - this._endIndex) * this._elementHeight;
	this._comboBefore.el.style.height = beforeHeight + 'px';
	this._comboAfter.el.style.height = afterHeight > 0 ? afterHeight + 'px' : '0px';
}


function setupComboList(list, options, self) {
	options.template.set(OPTIONS_TEMPLATE);
	// var xPos = self._comboInput.el.clientLeft;
	// var yPos = self._comboInput.el.clientTop + self._comboInput.el.offsetHeight;
	
	list.dom.setStyles({
		overflow: 'scroll',
		height: self._optionsHeight + 'px',
		width: '100%',
		position: 'absolute',
		zIndex: 10
		// top: yPos + 'px',
		// left: xPos + 'px',
	});

	self.hideOptions();
	list.events.onMessages({
		'click': {subscriber: onListClick, context: self},
		'scroll': {subscriber: onListScroll, context: self}
	});
}

function setupComboInput(input, self) {
	input.data.on('', { subscriber: onDataChange, context: self });
	input.events.on('click', {subscriber: onInputClick, context: self });
}

function setupComboBtn(btn, self) {
	btn.events.on('click', { subscriber: onAddBtn, context: self });
}

/* Data Facet */
function MLSuperCombo_get() {
	return this._currentValue;
}

function MLSuperCombo_set(obj) {
	this._currentValue = obj;
	this._comboInput.data.set(obj.label);
}

function MLSuperCombo_del() {
	this._currentValue = null;
	this._comboInput.data.set('');
}


// Post the data change
function onDataChange(msg, data) {
	var text = data.newValue;
	var filteredArr = _.filter(this._optionsData, function(option) {
		var label = option.label.toLowerCase();
		text = text.toLowerCase();
		return label.indexOf(text) != -1;
	});
	this.showOptions();
	this.setFilteredOptions(filteredArr);
	this._comboList.el.scrollTop = 0;
}

function onMouseLeave(type, event) {
	this.hideOptions();
}


function onInputClick(type, event) {
	this.showOptions();
}


function onAddBtn (type, event) {
	
}


function onListClick (type, event) {
	this.hideOptions();
	this._comboInput.data.off('', { subscriber: onDataChange, context: this });

	var index = Number(event.target.getAttribute('data-value')) + this._startIndex;
	var data = this._filteredOptionsData[index];
	this.data.set(data);
	this.data.getMessageSource().dispatchMessage(COMBO_CHANGE_MESSAGE);

	this._comboInput.data.on('', { subscriber: onDataChange, context: this });
}


function onListScroll (type, event) {
	var scrollPos = event.target.scrollTop
		, direction = scrollPos > this._lastScrollPos ? 'down' : 'up'
		, firstChild = this._comboOptions.el.lastChild
		, lastChild = this._comboOptions.el.firstChild
		, lastElPosition = firstChild ? firstChild.offsetTop : 0
		, firstElPosition = lastChild ? lastChild.offsetTop : 0
		, distFromLastEl = lastElPosition - scrollPos - this._optionsHeight + this._elementHeight
		, distFromFirstEl = scrollPos - firstElPosition
		, elsFromStart = Math.floor(distFromFirstEl / this._elementHeight)
		, elsToTheEnd = Math.floor(distFromLastEl / this._elementHeight)
		, totalElementsBefore = Math.floor(scrollPos / this._elementHeight) - BUFFER;
		
		this._startIndex = totalElementsBefore > 0 ? totalElementsBefore : 0;
		this._endIndex = totalElementsBefore + MAX_RENDERED;

	if ((direction == 'down' && elsToTheEnd < BUFFER) 
	 	 || (direction == 'up' && elsFromStart < BUFFER)) {
		this.update();
	}
	this._lastScrollPos = scrollPos;
}
