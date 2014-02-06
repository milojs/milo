'use strict';


var Messenger = require('../../messenger')
	, _ = require('mol-proto');

module.exports = DOMStorage;


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
		_messenger: new Messenger(this, Messenger.defaultMethods)
	});
}


_.extendProto(DOMStorage, {
	path: DOMStorage$path,
	get: DOMStorage$get,
	set: DOMStorage$set,
	del: DOMStorage$del,
	splice: DOMStorage$splice
});


function DOMStorage$path() {

}


function DOMStorage$get() {

}


function DOMStorage$set(value) {
	_setTree(this._storage, this.rootPath, value);
}


function _setTree(storage, path, obj) {
	if (Array.isArray(obj)) {
		var pathSyntax = path + '[$$]';
		obj.forEach(function(value, index) {
			_setItem(value, index, pathSyntax);
		});
	} else if (typeof obj == 'object' && obj != null) {
		var pathSyntax = path + '.$$';
		_.eachKey(obj, function(value, key) {
			_setItem(value, key, pathSyntax);
		});
	} else
		storage.setItem(path, obj);

	function _setItem(value, key) {
		var nextPath = pathSyntax.replace('$$', key);
		_setTree(storage, nextPath, value);		
	}
}




function DOMStorage$del() {

}


function DOMStorage$splice() {

}
