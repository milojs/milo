'use strict';

var uniqueId = require('./unique_id')
    , config = require('../config')
    , prefix = config.componentPrefix;


module.exports = componentName;


function componentName() {
    return prefix + uniqueId();
}
