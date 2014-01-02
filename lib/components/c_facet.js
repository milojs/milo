'use strict';

// <a name="components-facet"></a>
// ###component facet class

// The class fot the facet of component. When a component is created, it
// creates all its facets.

// See Facets section on information about available facets and on 
// how to create new facets classes.

// - Component - basic compponent class
// - ComponentFacet - basic 


var Facet = require('../abstract/facet')
	, Messenger = require('../messenger')
	, FacetError = require('../util/error').Facet
	, componentUtils = require('./c_utils')
	, _ = require('mol-proto');

var ComponentFacet = _.createSubclass(Facet, 'ComponentFacet');

module.exports = ComponentFacet;


/**
 * postDomParent
 *
 * If facet has DOM parent facet (see `domParent` method), posts the message to this facet.
 *
 * @param {String} messageType
 * @param {Object} messageData
 */
var postDomParent = _.partial(_postParent, domParent);

/**
 * postScopeParent
 *
 * If facet has scope parent facet (see `scopeParent` method), posts the message to this facet.
 *
 * @param {String} messageType
 * @param {Object} messageData
 */
var postScopeParent = _.partial(_postParent, scopeParent);


_.extendProto(ComponentFacet, {
	init: ComponentFacet$init,
	start: ComponentFacet$start,
	check: ComponentFacet$check,
	domParent: domParent,
	postDomParent: postDomParent,
	scopeParent: scopeParent,
	postScopeParent: postScopeParent,
	_createMessenger: _createMessenger,
	_setMessageSource: _setMessageSource,
	_createMessageSource: _createMessageSource,
	_createMessageSourceWithAPI: _createMessageSourceWithAPI
});


// initComponentFacet
function ComponentFacet$init() {
	this._createMessenger();
}


function _createMessenger(){
	var messenger = new Messenger(this, Messenger.defaultMethods, undefined /* no messageSource */);

	_.defineProperties(this, {
		_messenger: messenger
	});
}


// startComponentFacet
function ComponentFacet$start() {
	if (this.config.messages)
		_.eachKey(this.config.messages, function(subscriber, message) {
			this.on(message, subscriber);
		}, this);
}


// checkDependencies
function ComponentFacet$check() {
	if (this.require) {
		this.require.forEach(function(reqFacet) {
			var facetName = _.firstLowerCase(reqFacet)
				, facet = this.owner[facetName];
			if (! facet)
				this.owner.addFacet(facetName);
			else if (! facet instanceof ComponentFacet)
				throw new FacetError('facet ' + this.constructor.name + ' requires facet ' + reqFacet + ' but this property name is already used');
		}, this);
	}
}


/**
 * domParent
 * 
 * @return {ComponentFacet} reference to the facet of the same class of the closest parent DOM element, that has a component with the same facet class attached to it. If such element doesn't exist method will return undefined.
 */
function domParent() {
	var parentComponent = componentUtils.getContainingComponent(this.owner.el, false, this.name);
	return parentComponent && parentComponent[this.name];
}


/**
 * scopeParent
 * 
 * @return {ComponentFacet} reference to the facet of the same class as `this` facet of the closest scope parent (i.e., the component that has the scope of the current component in its container facet).
 */
function scopeParent() {
	var parentComponent = this.owner.getScopeParent(this.name);
	return parentComponent && parentComponent[this.name];
}


function _postParent(getParentMethod, messageType, messageData) {
	var parentFacet = getParentMethod.call(this);
	if (parentFacet)
		parentFacet.postMessage(messageType, messageData);
}


function _setMessageSource(messageSource) {
	this._messenger._setMessageSource(messageSource);
}


function _createMessageSource(MessageSourceClass, options) {
	var messageSource = new MessageSourceClass(this, undefined, this.owner, options);
	this._setMessageSource(messageSource)

	_.defineProperty(this, '_messageSource', messageSource);
}


function _createMessageSourceWithAPI(MessageSourceClass, messengerAPIOrClass, options) {
	var messageSource = new MessageSourceClass(this, undefined, messengerAPIOrClass, this.owner, options);
	this._setMessageSource(messageSource)

	_.defineProperty(this, '_messageSource', messageSource);
}
