'use strict';

var Component = require('../c_class')
    , componentsRegistry = require('../c_registry')
    , _ = require('mol-proto');


var MLInput = Component.createComponentClass('MLInput', {
    data: undefined,
    events: undefined,
    dom: {
        cls: 'ml-ui-input'
    }
});

componentsRegistry.add(MLInput);

module.exports = MLInput;

_.extendProto(MLInput, {
    disable: MLInput$disable,
    setMaxLength: MLInput$setMaxLength
});


function MLInput$disable(disable) {
    this.el.disabled = disable;
}

function MLInput$setMaxLength(length) {
    this._input.el.setAttribute('maxlength', length);
}
