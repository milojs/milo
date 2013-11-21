'use strict';

var facet = require('../facets/f_class')
	, FacetedObject = require('../facets/f_object')
	, componentsRegistry = require('./c_registry')
	, _ = require('proto');

var Component = module.exports = _.createSubclass(FacetedObject, 'Component', true)

Component.createComponentClass = FacetedObject.createFacetedClass;
delete Component.createFacetedClass;

componentsRegistry.setClass(Component);
componentsRegistry.add(Component);


// TODO fix