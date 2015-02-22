'use strict';

/**
 * `milo.Component.Facet`
 *
 * The class fot the facet of component. When a component is created, it
 * creates all its facets.
 *
 * See Facets section on information about available facets and on
 * how to create new facets classes.
 *
 * - Component - basic compponent class
 * - ComponentFacet - basic
 */

var Facet = require('../abstract/facet')
    , miloCore = require('milo-core')
    , Messenger = miloCore.Messenger
    , componentUtils = require('./c_utils')
    , _ = miloCore.proto;

var ComponentFacet = _.createSubclass(Facet, 'ComponentFacet');

module.exports = ComponentFacet;


/**
 * postDomParent
 *
 * If facet has DOM parent facet (see `domParent` method), posts the message to this facet.
 *
 * @param {String} messageType
 * @param {Object} messageData
 */
var postDomParent = _.partial(_postParent, domParent);

/**
 * postScopeParent
 *
 * If facet has scope parent facet (see `scopeParent` method), posts the message to this facet.
 *
 * @param {String} messageType
 * @param {Object} messageData
 */
var postScopeParent = _.partial(_postParent, scopeParent);


_.extendProto(ComponentFacet, {
    init: ComponentFacet$init,
    start: ComponentFacet$start,
    check: ComponentFacet$check,
    destroy: ComponentFacet$destroy,
    onConfigMessages: ComponentFacet$onConfigMessages,
    domParent: domParent,
    postDomParent: postDomParent,
    scopeParent: scopeParent,
    postScopeParent: postScopeParent,
    getMessageSource: getMessageSource,
    dispatchSourceMessage: dispatchSourceMessage,
    _createMessenger: _createMessenger,
    _setMessageSource: _setMessageSource,
    _createMessageSource: _createMessageSource,
    _createMessageSourceWithAPI: _createMessageSourceWithAPI
});

_.extend(ComponentFacet, {
    requiresFacet: requiresFacet
});


/**
 * Expose Messenger methods on Facet prototype
 */
var MESSENGER_PROPERTY = '_messenger';
Messenger.useWith(ComponentFacet, MESSENGER_PROPERTY, Messenger.defaultMethods);


// initComponentFacet
function ComponentFacet$init() {
    this._createMessenger();
}


// some subclasses (e.g. ModelFacet) overrride this method and do not create their own messenger
function _createMessenger(){
    _.defineProperty(this, MESSENGER_PROPERTY, new Messenger(this));
}


// startComponentFacet
function ComponentFacet$start() {
    if (this.config.messages)
        this.onConfigMessages(this.config.messages);
}


function ComponentFacet$onConfigMessages(messageSubscribers) {
    var notYetRegisteredMap = _.mapKeys(messageSubscribers, function(subscriber, messages) {
        var subscriberType = typeof subscriber;
        if (subscriberType == 'function')
            return this.on(messages, subscriber);

        if (subscriberType == 'object') {
            var contextType = typeof subscriber.context;
            if (contextType == 'object')
                return this.on(messages, subscriber);

            if (contextType == 'string') {
                if (subscriber.context == this.name || subscriber.context == 'facet')
                    subscriber = {
                        subscriber: subscriber.subscriber,
                        context: this
                    };
                else if (subscriber.context == 'owner')
                    subscriber = {
                        subscriber: subscriber.subscriber,
                        context: this.owner
                    };
                else
                    throw new Error('unknown subscriber context in configuration: ' + subscriber.context);

                return this.on(messages, subscriber);
            }

            throw new Error('unknown subscriber context type in configuration: ' + contextType);
        }

        throw new Error('unknown subscriber type in configuration: ' + subscriberType);
    }, this);

    return notYetRegisteredMap;
}


// checkDependencies
function ComponentFacet$check() {
    if (this.require) {
        this.require.forEach(function(reqFacet) {
            if (! this.owner.hasFacet(reqFacet))
                this.owner.addFacet(reqFacet);
        }, this);
    }
}


// destroys facet
function ComponentFacet$destroy() {
    if (this[MESSENGER_PROPERTY]) this[MESSENGER_PROPERTY].destroy();
    this._destroyed = true;
}


/**
 * domParent
 *
 * @return {ComponentFacet} reference to the facet of the same class of the closest parent DOM element, that has a component with the same facet class attached to it. If such element doesn't exist method will return undefined.
 */
function domParent() {
    var parentComponent = componentUtils.getContainingComponent(this.owner.el, false, this.name);
    return parentComponent && parentComponent[this.name];
}


/**
 * scopeParent
 *
 * @return {ComponentFacet} reference to the facet of the same class as `this` facet of the closest scope parent (i.e., the component that has the scope of the current component in its container facet).
 */
function scopeParent() {
    var parentComponent = this.owner.getScopeParent(this.name);
    return parentComponent && parentComponent[this.name];
}


function _postParent(getParentMethod, messageType, messageData) {
    var parentFacet = getParentMethod.call(this);
    if (parentFacet)
        parentFacet.postMessage(messageType, messageData);
}


function _setMessageSource(messageSource) {
    this[MESSENGER_PROPERTY]._setMessageSource(messageSource);
}


function getMessageSource() {
    return this[MESSENGER_PROPERTY].getMessageSource();
}


function dispatchSourceMessage(message, data) {
    return this.getMessageSource().dispatchMessage(message, data);
}


function _createMessageSource(MessageSourceClass, options) {
    var messageSource = new MessageSourceClass(this, undefined, undefined, this.owner, options);
    this._setMessageSource(messageSource)

    _.defineProperty(this, '_messageSource', messageSource);
}


function _createMessageSourceWithAPI(MessageSourceClass, messengerAPIOrClass, options) {
    var messageSource = new MessageSourceClass(this, undefined, messengerAPIOrClass, this.owner, options);
    this._setMessageSource(messageSource)

    _.defineProperty(this, '_messageSource', messageSource);
}


function requiresFacet(facetName) {
    // 'this' refers to the Facet Class
    var facetRequire = this.prototype.require;

    return facetRequire && (facetRequire.indexOf(_.firstUpperCase(facetName)) >= 0
                        || facetRequire.indexOf(_.firstLowerCase(facetName)) >= 0);
}
