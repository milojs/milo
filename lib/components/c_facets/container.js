'use strict';

var Facet = require('../../facets/f_class')
	, bind = require('../../binder/bind')
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
	this.list = bind(el);
}

facetsRegistry.add(Container);
