'use strict';

var Facet = require('../../facets/f_class')
	, binder = require('../../binder')
	, _ = require('proto')
	, facetsRegistry = require('./cf_registry');

// container facet
var Container = _.createSubclass(Facet, 'Container');

_.extendProto(Container, {
	init: initContainer,
	_bind: _bindComponents
});

function initContainer() {
	this.list = {};
	this._bind(this.owner.el);
}

function _bindComponents(el) {
	this.list = binder(el);
}

facetsRegistry.add(Container);
