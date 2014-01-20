'use strict';

var Component = require('../c_class')
, componentsRegistry = require('../c_registry');


var MLDatalist = Component.createComponentClass('MLDatalist', {
events: undefined,
dom: {
cls: 'ml-ui-datalist'
}
});

componentsRegistry.add(MLDatalist);

module.exports = MLDatalist;