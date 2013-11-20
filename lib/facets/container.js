'use strict';

var facets = require('../facets');

// conteiner facet
var Container = facets.createFacetClass({
	init: initContainer
	_bind: _bindComponents
});

function initContainer() {
	this.list = {};
	this._bind(this.owner.el);
}

function _bindComponents(el) {

}
