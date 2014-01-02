'use strict';


/**
 * DOMStorage adapter complying with datasource API of [Connector](../connector.js.html)
 * It allows to persist [Model](../index.js.html)s to `window.localStorage` and `window.sessionStorage` using reactive connection to Model created with Connector/[milo.minder](../../minder.js.html).
 *
 * @constructor
 * @param {String} rootPath root path in the storage. Should be unique within the application.
 * @param {Boolean} sessionOnly optional parameter, if true connected Model will be stored to sessionStorage rather than to localStorage (default).
 * @return {DOMStorage}
 */
function DOMStorage(rootPath, sessionOnly) {
	if (typeof window == 'undefiend') return;

	this.rootPath = rootPath;

	_.defineProperties(this, {
		_storage: sessionOnly ? window.sessionStorage : window.localStorage,
		_messenger: new Messenger(model, Messenger.defaultMethods)
	});
}


_.extendProto(DOMStorage, {
	path: DOMStorage$path,
	get: DOMStorage$get,
	set: DOMStorage$set
});
