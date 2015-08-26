'use strict';

var ComponentFacet = require('../c_facet')
    , facetsRegistry = require('./cf_registry')
    , miloCore = require('milo-core')
    , Messenger = miloCore.Messenger
    , DOMEventsSource = require('../msg_src/dom_events')
    , _ = miloCore.proto;


/**
 * `milo.registry.facets.get('Events')`
 * Component facet that manages subscriptions to DOM events using [Messenger](../../messenger/index.js.html) with [DOMEventsSource](../msg_src/dom_events.js.html).
 * All public methods of Messenger and `trigger` method of [DOMEventsSource](../msg_src/dom_events.js.html) are proxied directly to this facet.
 * For example, to subscribe to `click` event use:
 * ```
 * component.frame.on('click', function() {
 *     // ...
 * });
 * ```
 * See [Messenger](../../messenger/index.js.html)
 */
var Events = _.createSubclass(ComponentFacet, 'Events');


/**
 * ####Events facet instance methods####
 *
 * - [init](#Events$init) - called by constructor automatically
 */
_.extendProto(Events, {
    init: Events$init
    // _reattach: _reattachEventsOnElementChange
});

facetsRegistry.add(Events);

module.exports = Events;


/**
 * Expose DOMEventsSource trigger method on Events prototype
 */
var MSG_SOURCE_KEY = '_domEventsSource';
DOMEventsSource.useWith(Events, MSG_SOURCE_KEY, ['trigger']);


/**
 * Events facet instance method
 * Initialzes facet, connects DOMEventsSource to facet's messenger
 */
function Events$init() {
    ComponentFacet.prototype.init.apply(this, arguments);

    var domEventsSource = new DOMEventsSource(this, undefined, undefined, this.owner);
    this._setMessageSource(domEventsSource);
    _.defineProperty(this, MSG_SOURCE_KEY, domEventsSource);
}
