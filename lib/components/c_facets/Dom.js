'use strict';

var ComponentFacet = require('../c_facet')
	, facetsRegistry = require('./cf_registry')	
	, _ = require('mol-proto')
	, check = require('../../util/check')
	, Match = check.Match
	, binder = require('../../binder');


// data model connection facet
var Dom = _.createSubclass(ComponentFacet, 'Dom');

_.extendProto(Dom, {
	init: initDomFacet,

	show: showElement,
	hide: hideElement,
	remove: removeElement

	// _reattach: _reattachEventsOnElementChange
});

facetsRegistry.add(Dom);

module.exports = Dom;


function initDomFacet() {
	ComponentFacet.prototype.init.apply(this, arguments);

	if (this.config.cls)
		this.owner.el.classList.add(this.config.cls);
}


function showElement() {
	this.owner.el.style.display = 'block';
}

function hideElement() {
	this.owner.el.style.display = 'none';
}

function removeElement() {
	this.owner.el.parentNode.removeChild(this.owner.el);
}

