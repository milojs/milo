var facets = require('../facets');

// conteiner facet
var Container = facets.createFacetClass({
	init: initContainer
	_bind: _bindComponents
});

function initContainer() {
	check(this.options, Match.objectIncluding({el: Object}));
	this.list = {};
	this._bind(el);
}

function _bindComponents(el) {

}
