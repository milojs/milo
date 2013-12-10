'use strict';
var Model = require('./index');


var m = new Model;

var year = m('.info.DOB.year').value();
// undefined, but doesn't fail, like in Angular

m('.info.DOB.year').setValue(1982);

var year = m('.info.DOB.year').value();
// 1982

var data = m('.info').value();
// { DOB: { year: 1982 } }

var mData = m.value();
// { info: { DOB: { year: 1982 } } }



var m = new Model;

m.on(/.*/, onChange);

function onChange(msg, data) {
	// should be replaced with console if this demo is used
	logger.log(msg, ' : ', data);
}

m('.list[0].info.name').setValue('Clifton');
// logged:
// .list  :  { type: 'added', newValue: [] }
// .list[0]  :  { type: 'added', newValue: {} }
// .list[0].info  :  { type: 'added', newValue: {} }
// .list[0].info.name  :  { type: 'added', newValue: 'Clifton' }

m('.list[0].info.name').setValue('Clifton Cunnigham');
// logged:
// .list[0].info.name  :  { type: 'changed',
//   oldValue: 'Clifton',
//   newValue: 'Clifton Cunnigham' }

var name = m('.list[0].info.name').value();
// 'Clifton Cunnigham'



// m('.list[0].info.name').value.toString() :

function value() {
	var m = this._model._data;
	return m.list && m.list[0] && m.list[0].info && m.list[0].info.name;
}


// m('.list[0].info.name').setValue.toString() :

function setValue(value) {
	var m = this._model._data;
	if (! m.list) {
		m.list = [];
		this._model.postMessage(".list", { type: "added", newValue: [] } );
	}
	if (! m.list[0]) {
		m.list[0] = {};
		this._model.postMessage( ".list[0]", { type: "added", newValue: {} } );
	}
	if (! m.list[0].info) {
		m.list[0].info = {};
		this._model.postMessage(".list[0].info", { type: "added", newValue: {} } );
	} 
	var wasDef = m.list[0].info.hasOwnProperty("name");
	var old = m.list[0].info.name;
	m.list[0].info.name = value;
	if (! wasDef)
		this._model.postMessage(".list[0].info.name",
			{ type: "added", newValue: value } );
	else if (old != value)
		this._model.postMessage( ".list[0].info.name",
			{ type: "changed", oldValue: old, newValue: value} );
}
