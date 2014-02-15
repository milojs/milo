'use strict';


var Component = require('../c_class')
    , componentsRegistry = require('../c_registry');


var MLDropTarget = Component.createComponentClass('MLDropTarget', ['drop']);


componentsRegistry.add(MLDropTarget);

module.exports = MLDropTarget;
