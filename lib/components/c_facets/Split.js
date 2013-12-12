'use strict';

var ComponentFacet = require('../c_facet')
	, Component = require('../c_class')
	, facetsRegistry = require('./cf_registry');

var Split = _.createSubclass(ComponentFacet, 'Split');

_.extendProto(Split, {
	init: init,
	start: start,
	make: make,

	isSplittable: isSplittable,

	require: ['Dom']

	// _reattach: _reattachEventsOnElementChange
});

facetsRegistry.add(Split);

module.exports = Split;


// init Split facet
function init() {
	ComponentFacet.prototype.init.apply(this, arguments);

	this._splitSender = undefined;
}


// start Split facet
function start() {
	ComponentFacet.prototype.start.apply(this, arguments);
}


// performs the split on selection
function make() {
	if (! this.isSplittable())
		return;

	if (! this.owner.dom.hasTextBeforeSelection())
		return; // should simply create empty component before

	this._makeSplit();
}


function _makeSplit() {
	var thisComp = this.owner;

	// clone itself
	var newComp = Component.copy(thisComp); // TODO
	thisComp.dom.insertAfter(newComp.el);

	splitElement(thisComp.el, newComp.el);
}


function splitElement(thisEl, newEl) {
	var selection = window.getSelection()
		, selNode = selection.anchorNode
		, selFound = false;

	Array.prototype.forEach.call(thisEl.childNodes, function(childNode) {
		if (childNode.contains(selNode) || childNode == selNode) {
			var comp = Component.getComponent(childNode);
			if (comp)
				comp.split._makeSplit();
			else {
				var newChildEl = childNode.cloneNode(false);
				splitElement(childNode, newChildEl);
			}

			selFound = true;
		} else if (selFound)
			newEl.appendChild(childNode);
	});
}


function isSplittable() {
	var selection = window.getSelection()
		, el = selection.anchorNode;

	if (! this.owner.el.contains(el)) {
		logger.warn('selection is outside this component');
		return false;
	}

	while (el != this.owner.el) {
		var comp = Component.getComponent(el);
		if (comp && ! comp.split)
			return false;
		el = el.parent;
	}

	return true;
}
