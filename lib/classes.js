'use strict';

// <a name="classes"></a>
// milo.classes
// -----------

// This module contains foundation classes and class registries.

var classes = {
    Facet: require('./abstract/facet'),
    FacetedObject: require('./abstract/faceted_object'),
    ClassRegistry: require('./abstract/registry'),
    Mixin: require('./abstract/mixin'),
    MessageSource: require('./messenger/m_source'),
    MessengerAPI: require('./messenger/m_api'),
    DOMEventsSource: require('./components/msg_src/dom_events'),
    TransactionHistory: require('./command/transaction_history')
};

module.exports = classes;
