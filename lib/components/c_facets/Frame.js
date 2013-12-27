'use strict';

// <a name="components-facets-frame"></a>
// ###frame facet

// TODO: The message source for this facet needs to be completely refactored

var ComponentFacet = require('../c_facet')
	, facetsRegistry = require('./cf_registry')
	, Messenger = require('../../messenger')
	, FrameMessageSource = require('../msg_src/frame')
	, _ = require('mol-proto');


// data model connection facet
var Frame = _.createSubclass(ComponentFacet, 'Frame');

_.extendProto(Frame, {
	init: init

	// _reattach: _reattachEventsOnElementChange
});


facetsRegistry.add(Frame);

module.exports = Frame;


// initFrameFacet
function init() {
	ComponentFacet.prototype.init.apply(this, arguments);
	
	var messageSource = new FrameMessageSource(this, { trigger: 'trigger' }, undefined, this.owner);
	this._setMessageSource(messageSource);

	_.defineProperty(this, '_messageSource', messageSource);
}
