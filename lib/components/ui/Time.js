'use strict';

var Component = require('../c_class')
    , componentsRegistry = require('../c_registry');


var MLTime = Component.createComponentClass('MLTime', {
    events: undefined,
    data: undefined,
    dom: {
        cls: 'ml-ui-time'
    }
});

componentsRegistry.add(MLTime);

module.exports = MLTime;
