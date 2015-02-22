'use strict';

var coreClasses = require('milo-core').classes;

// <a name="classes"></a>
// milo.classes
// -----------

// This module contains foundation classes and class registries.

var classes = {
    Facet: require('./abstract/facet'),
    FacetedObject: require('./abstract/faceted_object'),
    Scope: require('./components/scope'),
    ClassRegistry: require('./abstract/registry'),
    Mixin: coreClasses.Mixin,
    MessageSource: coreClasses.MessageSource,
    MessengerMessageSource: coreClasses.MessengerMessageSource,
    MessengerAPI: coreClasses.MessengerAPI,
    DOMEventsSource: require('./components/msg_src/dom_events'),
    Transaction: require('./command/transaction'),
    TransactionHistory: require('./command/transaction_history')
};

module.exports = classes;
