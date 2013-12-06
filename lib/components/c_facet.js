'use strict';

var Facet = require('../facets/f_class')
	, Messenger = require('../messenger')
	, FacetError = require('../util/error').Facet
	, _ = require('mol-proto');

var ComponentFacet = _.createSubclass(Facet, 'ComponentFacet');

module.exports = ComponentFacet;


_.extendProto(ComponentFacet, {
	init: initComponentFacet,
	start: startComponentFacet,
	check: checkDependencies,
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


function _setMessageSource(messageSource) {
	this._messenger._setMessageSource(messageSource);
}


function _createMessageSource(MessageSourceClass, options) {
	var messageSource = new MessageSourceClass(this, undefined, this.owner, options);
	this._setMessageSource(messageSource)

	_.defineProperty(this, '_messageSource', messageSource);
}