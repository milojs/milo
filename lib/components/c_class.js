'use strict';

var FacetedObject = require('../facets/f_object')
	, _ = require('proto');

var Component = module.exports = _.createSubclass(FacetedObject, 'Component', true)

Component.createComponentClass = FacetedObject.createFacetedClass;
delete Component.createFacetedClass;

_.extendProto(Component, {
	init: initComponent
});


function initComponent(facetsOptions, element) {
	this.el = element;
}
