// <a name="components-facet"></a>
// ###component facet class

// The class fot the facet of component. When a component is created, it
// creates all its facets.

// See Facets section on information about available facets and on 
// how to create new facets classes.

// - Component - basic compponent class
// - ComponentFacet - basic 

'use strict';

var Facet = require('../facets/f_class')
	, Messenger = require('../messenger')
	, FacetError = require('../util/error').Facet
	//, componentsRegistry = require('./c_registry')
	//, Component = componentsRegistry.get('Component')
	, _ = require('mol-proto');

var ComponentFacet = _.createSubclass(Facet, 'ComponentFacet');

module.exports = ComponentFacet;


_.extendProto(ComponentFacet, {
	init: initComponentFacet,
	start: startComponentFacet,
	check: checkDependencies,
	domParent: domParent,
	postDomParent: postDomParent,
	_createMessenger: _createMessenger,
	_setMessageSource: _setMessageSource,
	_createMessageSource: _createMessageSource
});


function initComponentFacet() {
	this._createMessenger();
}


function _createMessenger(){
	var messenger = new Messenger(this, Messenger.defaultMethods, undefined /* no messageSource */);

	_.defineProperties(this, {
		_messenger: messenger
	});
}


function startComponentFacet() {
	if (this.config.messages)
		this.onMessages(this.config.messages);
}


function checkDependencies() {
	if (this.require) {
		this.require.forEach(function(reqFacet) {
			var facetName = _.firstLowerCase(reqFacet);
			if (! (this.owner[facetName] instanceof ComponentFacet))
				throw new FacetError('facet ' + this.constructor.name + ' requires facet ' + reqFacet);
		}, this);
	}
}


/**
 * domParent
 * @return {ComponentFacet} reference to the facet of the same class of the closest parent DOM element, that has a component with the same facet class attached to it. If such element doesn't exist, will return undefined.
 */
function domParent() {
	return Component.getContainingComponent(this.owner.el, false, this.name);
	if (parent)
		parent.toolbar.postMessage('childtoolbar', { visible: visibility });
}


/**
 * postDomParent
 * If facet has DOM parent, posts the message to it
 * @param {String} messageType
 * @param {Object} messageData
 */
function postDomParent(messageType, messageData) {
	var parent = this.domParent();
	if (parent)
		parent[this.name].postMessage(messageType, messageData);
}


function _setMessageSource(messageSource) {
	this._messenger._setMessageSource(messageSource);
}


function _createMessageSource(MessageSourceClass, options) {
	var messageSource = new MessageSourceClass(this, undefined, this.owner, options);
	this._setMessageSource(messageSource)

	_.defineProperty(this, '_messageSource', messageSource);
}