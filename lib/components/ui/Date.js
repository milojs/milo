'use strict';

var Component = require('../c_class')
    , componentsRegistry = require('../c_registry');


var MLDate = Component.createComponentClass('MLDate', {
    events: undefined,
    data: undefined,
    dom: {
        cls: 'ml-ui-date'
    }
});

componentsRegistry.add(MLDate);

module.exports = MLDate;
