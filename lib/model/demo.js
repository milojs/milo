'use strict';


var Model = require('./index');


var m = new Model;

var year = m('.info.DOB.year').get();
// undefined, but doesn't fail, like in Angular

m('.info.DOB.year').set(1982);

var year = m('.info.DOB.year').get();
// 1982

var data = m('.info').get();
// { DOB: { year: 1982 } }

var mData = m.get();
// { info: { DOB: { year: 1982 } } }



var m = new Model;

m.on(/.*/, onChange);

function onChange(msg, data) {
    // should be replaced with console if this demo is used
    logger.log(msg, ' : ', data);
}

m('.list[0].info.name').set('Clifton');
// logged:
// .list  :  { type: 'added', newValue: [] }
// .list[0]  :  { type: 'added', newValue: {} }
// .list[0].info  :  { type: 'added', newValue: {} }
// .list[0].info.name  :  { type: 'added', newValue: 'Clifton' }

m('.list[0].info.name').set('Clifton Cunnigham');
// logged:
// .list[0].info.name  :  { type: 'changed',
//   oldValue: 'Clifton',
//   newValue: 'Clifton Cunnigham' }

var name = m('.list[0].info.name').get();
// 'Clifton Cunnigham'
