'use strict';

var Component = require('../c_class')
    , componentsRegistry = require('../c_registry');


var MLButton = Component.createComponentClass('MLButton', {
    events: undefined,
    dom: {
        cls: 'ml-ui-button'
    }
});

componentsRegistry.add(MLButton);

module.exports = MLButton;

_.extendProto(MLButton, {
    disable: MLButton$disable
});


function MLButton$disable(disable) {
    this.el.disabled = disable;
}

