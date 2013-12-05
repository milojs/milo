'use strict';

var MessageSource = require('../messenger/message_source')
	, _ = require('mol-proto');


var ModelMessageSource = _.createSubclass(MessageSource, 'ModelMessageSource');

module.exports = ModelMessageSource;
