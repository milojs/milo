'use strict';

var ComponentFacet = require('../c_facet')
	, Component = require('../c_class')
	, facetsRegistry = require('./cf_registry');

var Split = _.createSubclass(ComponentFacet, 'Split');

_.extendProto(Events, {
	init: init,
	start: start,
	make: make,

	isSplittable: isSplittable

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
	if (! this.isSplittable() || )
		return;

	if (! this.owner.dom.hasTextBeforeSelection())
		return; // should simply create empty component before

	// clone itself
	var newComp = Component.copy(this.owner); // TODO
	this.owner.el.parentNode.insertAfter(comp.el);

	var selection = window.getSelection()
		, selNode = selection.anchorNode;

	Array.prototype.forEach.call(this.owner.el.childNodes, function(childNode) {
		if (childNode.contains(selNode) || childNode == selNode) {
			var comp = Component.getComponent(childNode);
			if (comp)
				comp.split();
			else
				splitElement(childNode)
		}
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
