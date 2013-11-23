'use strict';

var FacetedObject = require('../facets/f_object')
	, messengerMixin = require('./messenger')
	, _ = require('proto');

var Component = _.createSubclass(FacetedObject, 'Component', true);

module.exports = Component;


Component.createComponentClass = FacetedObject.createFacetedClass;
delete Component.createFacetedClass;

_.extendProto(Component, {
	init: initComponent
});

_.extendProto(Component, messengerMixin);

function initComponent(facetsOptions, element) {
	this.el = element;
	this.initMessenger();
}
