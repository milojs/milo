'use strict';

var Component = require('../c_class')
    , componentsRegistry = require('../c_registry');


var MLText = Component.createComponentClass('MLText', {
    container: undefined,
    data: undefined,
    events: undefined,
    dom: {
        cls: 'ml-ui-text'
    }
});

componentsRegistry.add(MLText);

module.exports = MLText;
