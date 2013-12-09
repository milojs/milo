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
	console.log(msg, ' : ', data);
}

m('.list[0].info.name').setValue('Clifton');
// logged:
// msg: .list , data: { type: 'added', newValue: [] }
// msg: .list[0] , data: { type: 'added', newValue: {} }
// msg: .list[0].info , data: { type: 'added', newValue: {} }
// msg: .list[0].info.name , data: { type: 'added', newValue: 'Clifton' }

m('.list[0].info.name').setValue('Clifton Cunnigham');
// logged:
// .list[0].info.name { type: 'changed',
//   oldValue: 'Clifton',
//   newValue: 'Clifton Cunnigham' }

var name = m('.list[0].info.name').value();
// 'Clifton Cunnigham'



console.log('\n', m('.list[0].info.name').value.toString());


console.log('\n', m('.list[0].info.name').setValue.toString());
