// <a name="utils-error"></a>
// milo.utils.error
// -----------

'use strict';

var _ = require('mol-proto');


// module exports error classes for all names defined in this array
var errorClassNames = ['AbstractClass', 'Mixin', 'Messenger',
					   'Attribute', 'Binder', 'Loader', 'MailMessageSource', 'Facet',
					   'Scope', 'Model', 'DomFacet', 'EditableFacet',
					   'List', 'Connector', 'Registry', 'FrameMessageSource'];

var error = {
	toBeImplemented: error$toBeImplemented,
	createClass: error$createClass
};

errorClassNames.forEach(function(name) {
	error[name] = error$createClass(name + 'Error');
});

module.exports = error;


function error$createClass(errorClassName) {
	var ErrorClass = _.makeFunction(errorClassName, 'message',
			'this.name = "' + errorClassName + '"; \
			this.message = message || "There was an  error";');
	_.makeSubclass(ErrorClass, Error);

	return ErrorClass;
}


function error$toBeImplemented() {
	throw new error.AbstractClass('calling the method of an absctract class');
}
