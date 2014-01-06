'use strict';

var ComponentFacet = require('../c_facet')
	, facetsRegistry = require('./cf_registry')
	, logger = require('../../util/logger')
	, AngularError = require('../../util/error').Angular
	, _ = require('mol-proto');


// data model connection facet
var Angular = _.createSubclass(ComponentFacet, 'Angular');

_.extendProto(Angular, {
	init: init,
	bootstrap: bootstrap,
	ngScope: ngScope

	// _reattach: _reattachEventsOnElementChange
});

facetsRegistry.add(Angular);

module.exports = Angular;


function init() {
	ComponentFacet.prototype.init.apply(this, arguments);
	createMiloService();
}


function bootstrap(angularModules) {
	checkAngular();
	angular.bootstrap(this.owner.el, angularModules);
}


function ngScope(scopeName) {
	return _angularScopes[scopeName];
}


var miloServiceCreated;
function createMiloService() {
	checkAngular();

	angular.module('miloScopeService', [])
		.factory('$miloScope', function() {
			return registerAngularScope;
		});

	miloServiceCreated = true;
}


function checkAngular() {
	if (typeof window.angular == 'undefined') 
		throw new AngularError('angular is not loaded');
}


var _angularScopes = {};
function registerAngularScope(scopeName, $scope) {
	_angularScopes[scopeName] = $scope;
}
