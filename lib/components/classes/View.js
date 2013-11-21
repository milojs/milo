'use strict';

var Component = require('../c_class')
	, facetsRegistry = require('../c_facets/cf_registry')
	, componentsRegistry = require('../c_registry');

var View = Component.createComponentClass('View', {
	container: facetsRegistry.get('Container')
});

componentsRegistry.add(View);

module.exports = View;
