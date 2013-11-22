'use strict';

var _ = require('proto');

var BindError = _.createSubclass(Error, 'BindError');

module.exports = BindError;
