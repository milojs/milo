'use strict';


var FacetedObject = require('../abstract/faceted_object')
    , facetsRegistry = require('./c_facets/cf_registry')
    , ComponentFacet = facetsRegistry.get('ComponentFacet')
    , componentUtils = require('./c_utils')
    , miloCore = require('milo-core')
    , Messenger = miloCore.Messenger
    , _ = miloCore.proto
    , check = miloCore.util.check
    , Match = check.Match
    , config = require('../config')
    , miloComponentName = require('../util/component_name')
    , logger = miloCore.util.logger
    , domUtils = require('../util/dom')
    , BindAttribute = require('../attributes/a_bind')
    , Scope = require('./scope')
    , DOMStorage = require('../util/storage');


/**
 * `milo.Component`
 * Base Component class. Subclass of [FacetedObject](../abstract/faceted_object.js.html), but none of this class methods should be directly used with component.
 * Its constructor passes its parameters, including its [scope](./scope.js.html), DOM element and name to [`init`](#init) method.
 * The constructor of Component class rarely needs to be used directly, as [milo.binder](../binder.js.html) creates components when it scans DOM tree.
 * [`Component.createComponentClass`](#createComponentClass) should be used to create a subclass of Component class with configured facets.
 *
 *
 * ####Component instance properties####
 *
 * - el - DOM element that component is attached to. If the second component is attached to the same DOM element, the warning will be logged to console. To get component reference from DOM element use [Component.getComponent](./c_utils.js.html#getComponent) class method. To inspect component via element in browser check `___milo_component` property of element (property name be changed using `milo.config`).
 * - scope - parent scope object, an instance of [Scope](./scope.js.html) class. To get parent component use [getScopeParent](#Component$getScopeParent) instance method of component. The actual path to get parent of conponent is `component.scope._hostObject.owner`, where `_hostObject` refers to [Container](c_facets/Container.js.html) facet of parent component and `owner` to the parent itself. The children of component are accessible via the scope of its container facet: `component.container.scope`. The scope hierarchy can be the same or different as the DOM hierarchy - DOM children of the component will be on the same scope as component if it does not have `Container` facet and in the scope of its Container facet if it has it. See [Scope](./scope.js.html).
 * - name - the name of component, should be unique for the scope where component belongs. To find component in scope the component's name should be used as property of scope object. See [Scope](./scope.js.html).
 * - facets - map of references of all component's facets (facet names are lowercase in this map). All facets can be accessed directly as properties of component, this property can be used to iterate facets (it is used in this way in [allFacets](#Component$allFacets) component's instance method that allows to call method with the same name on all facets).
 * - extraFacets - an array of names of facets that are added to component and do not form the part of component's class.
 * - _messenger - the reference to component's [messenger](../messenger/index.js.html). Rarely needs to be used directly as all commonly used methods of mesenger are available directly on component.
 *
 *
 * ####Component events####
 *
 * - 'childrenbound' - synchronously dispatched when children of DOM element which compnent is connected to are connected to components. The event is dispatched when component is created with `milo.binder` (as is almost always the case, as all Component class methods that create/copy components use `milo.binder` internally - component constructor and Component.create methods are not used in framework outside of `milo.binder` and rarely if ever need to be used in aplication).
 * - 'addedtoscope' - synchronously dispatched when component is added to scope.
 * - 'stateready' - aynchronously dispatched when component (together with its scope children) is created with [Component.createFromState](#Component$$createFromState) (or `createFromDataTransfer`) method. Can be dispatched by application if the component's state is set with some other mechanism. This event is not used in `milo`, it can be used in application in particular subclasses of component.
 * - 'getstatestarted' - emitted synchronously just before getState executes so components and facets can clean up their state for serialization. 
 * - 'getstatecompleted' - emitted asynchronously after getState executes so components and facets can restore their state after serialization.
 *
 *
 * ####Component "lifecycle"####
 *
 * 1. Component constructor is called. Component's constructor simply calls constructor of [FacetedObject](../abstract/faceted_object.js.html) that is a superclass of Component. Subclasses of Component should not implement their own constructor, they can optionally implement `init` method, but most components do not need to do it.
 * 2. constructors and `init` methods of all facets are called in sequence. Same as components, facet do not implement their constructors, they can optionally implement `init` and `start` methods (see below). Inside `init` method there should be only general initialization code without any dependency on component itself (it is not ready yet) and other facets (as there is no specific facets creation order). If facet implements `init` method it MUST call inherited init with `ComponentFacet.prototype.init.apply(this, arguments)`.
 * 3. `init` method of component is called. At this point all facets are created but facets still can be not ready as they can have initialization code in `start` method. If component subclass implements `init` method it MUST call inherited method with `<Superclass>.prototype.init.apply(this, arguments)`, where <Superclass> is Component or another superclass the component is a subclass of.
 * 4. `check` method of all facets is called. This method adds facets that are not part of the component declaration (being part of the class or explicitely listed in bind attribute) but are required by facets that the compnent already has. Subclasses of [ComponentFacet](./c_facet.js.html) do not need to implement this method.
 * 5. `start` method of all facets is called. This method is usually implemented by ComponentFacet subclasses and it can have any initialization code that depends on component or on other facets that are the dependencies of a facet. Inherited `start` method should be called int he same way as written above.
 * 6. `starting` message fired on component. This is used by facets to create minder connections before any data has been set.
 * 7. `start` method of component is called. This component method can be implemented by subclasses if they need to have some initialization code that depends on some facets and requires that these facets are fully inialized. Often such code also depends on component's scope children as well so this code should be inside `'childrenbound'` method. `start` of scope parent is called BEFORE `start` of children.
 * 8. 'addedtoscope' event is dispatched when component is added to its parent's scope or to top level scope created by `milo.binder`.
 * 9. component's children are created (steps 1-6 above are followed for each child).
 * 10. `childrenBound` method is called and 'childrenbound' event is dispatched when all component's children are created and added to their scope (see event description below). `childrenBound` of scope parent is called AFTER `childrenBound` of all children.
 * 11. 'stateready' event is dispatched for component and all its children when component is create from state (see event description below).
 * 12. at this point component is in the "interactive" state when it and its facets will only respond to messages/events that they subscribed to during initialization.
 *
 *
 * @param {Scope} scope scope to which component will belong. It is usually a top level scope object returned by `milo.binder` or `scope` property of Container facet.
 * @param {Element} element DOM element that component is attached to
 * @param {String} name component name, should be unique in the scope of component
 * @param {ComponentInfo} componentInfo instance of ComponentInfo class that can be used to create a copy of component
 *  TODO try removing it
 * @return {Component}
 */
var Component = _.createSubclass(FacetedObject, 'Component', true);

module.exports = Component;

_registerWithDomStorage('Component');


/**
 * ####Component class methods####
 *
 * - [createComponentClass](#Component$$createComponentClass)
 * - [create](#Component$$create)
 * - [copy](#Component$$copy)
 * - [createOnElement](#Component$$createOnElement)
 * - [isComponent](c_utils.js.html#isComponent)
 * - [getComponent](c_utils.js.html#getComponent)
 * - [getContainingComponent](c_utils.js.html#getContainingComponent)
 * - [createFromState](#Component$$createFromState)
 * - [createFromDataTransfer](#Component$$createFromDataTransfer)
 */
_.extend(Component, {
    createComponentClass: Component$$createComponentClass,
    create: Component$$create,
    copy: Component$$copy,
    createOnElement: Component$$createOnElement,
    isComponent: componentUtils.isComponent,
    getComponent: componentUtils.getComponent,
    getContainingComponent: componentUtils.getContainingComponent,
    createFromState: Component$$createFromState,
    createFromDataTransfer: Component$$createFromDataTransfer
});
delete Component.createFacetedClass;


/**
 * ####Component instance methods####
 *
 * - [init](#Component$init)
 * - [createElement](#Component$createElement)
 * - [hasFacet](#Component$hasFacet)
 * - [addFacet](#Component$addFacet)
 * - [allFacets](#Component$allFacets)
 * - [rename](#Component$rename)
 * - [remove](#Component$remove)
 * - [getState](#Component$getState)
 * - [getTransferState](#Component$getTransferState)
 * - [setState](#Component$setState)
 * - [getScopeParent](#Component$getScopeParent)
 * - [getTopScopeParent](#Component$getTopScopeParent)
 * - [getScopeParentWithClass](#Component$getScopeParentWithClass)
 * - [getTopScopeParentWithClass](#Component$getTopScopeParentWithClass)
 * - [walkScopeTree](#Component$walkScopeTree)
 * - [broadcast](#Component$broadcast)
 * - [destroy](#Component$destroy)
 * - [isDestroyed](#Component$isDestroyed)
 *
 *
 * #####[Messenger](../messenger/index.js.html) methods available on component#####
 *
 * - [on](../messenger/index.js.html#Messenger$on) - single subscribe
 * - [off](../messenger/index.js.html#Messenger$off) - single unsubscribe
 * - [onMessages](../messenger/index.js.html#Messenger$onMessages) - multiple subscribe
 * - [offMessages](../messenger/index.js.html#Messenger$offMessages) - multiple unsubscribe
 * - [postMessage](../messenger/index.js.html#Messenger$postMessage) - post message on component
 * - [getSubscribers](../messenger/index.js.html#Messenger$getSubscribers) - get subscribers for a given message
 */
_.extendProto(Component, {
    init: Component$init,
    start: Component$start,
    childrenBound: Component$childrenBound,
    createElement: Component$createElement,
    hasFacet: Component$hasFacet,
    addFacet: Component$addFacet,
    allFacets: Component$allFacets,
    rename: Component$rename,
    remove: Component$remove,
    insertInto: Component$insertInto,

    getState: Component$getState,
    getTransferState: Component$getTransferState,
    _getState: Component$_getState,
    setState: Component$setState,
    
    getScopeParent: Component$getScopeParent,
    getTopScopeParent: Component$getTopScopeParent,
    getScopeParentWithClass: Component$getScopeParentWithClass,
    getTopScopeParentWithClass: Component$getTopScopeParentWithClass,

    setScopeParentFromDOM: Component$setScopeParentFromDOM,

    walkScopeTree: Component$walkScopeTree,

    treePathOf: Component$treePathOf,
    getComponentAtTreePath: Component$getComponentAtTreePath,
    insertAtTreePath: Component$insertAtTreePath,

    broadcast: Component$broadcast,
    destroy: Component$destroy,
    isDestroyed: Component$isDestroyed
});


/**
 * Expose Messenger methods on Component prototype
 */
var MESSENGER_PROPERTY = '_messenger';
Messenger.useWith(Component, MESSENGER_PROPERTY, Messenger.defaultMethods);


var COMPONENT_DATA_TYPE_REGEX = /x-application\/milo-component\/([a-z_$][0-9a-z_$]*)(?:\/())/i;

/**
 * Component class method
 * Creates a subclass of component from the map of configured facets.
 * This method wraps and replaces [`createFacetedClass`](../abstract/faceted_object.js.html#createFacetedClass) class method of FacetedObject.
 * Unlike createFacetedClass, this method take facet classes from registry by their name, so only map of facets configuration needs to be passed. All facets classes should be subclasses of [ComponentFacet](./c_facet.js.html)
 *
 * @param {String} name class name
 * @param {Object<Object> | Array<String>} facetsConfig map of facets configuration.
 *  If some facet does not require configuration, `undefined` should be passed as the configuration for the facet.
 *  If no facet requires configuration, the array of facets names can be passed.
 * @return {Subclass<Component>}
 */
function Component$$createComponentClass(name, facetsConfig) {
    // convert array of facet names to map of empty facets configurations
    if (Array.isArray(facetsConfig)) {
        var configMap = {};
        facetsConfig.forEach(function(fct) {
            var fctName = _.firstLowerCase(fct);
            configMap[fctName] = {};
        });
        facetsConfig = configMap;
    }

    // construct map of facets classes from facetRegistry
    var facetsClasses;
    if (typeof facetsConfig == 'object' && _.keys(facetsConfig).length) {
        facetsClasses = {};
        _.eachKey(facetsConfig, function(fctConfig, fct) {
            var fctName = _.firstLowerCase(fct);
            var fctClassName = _.firstUpperCase(fct);
            facetsClasses[fctName] = facetsRegistry.get(fctClassName);
        });
    }

    // create subclass of Component using method of FacetedObject
    var ComponentClass = FacetedObject.createFacetedClass.call(this, name, facetsClasses, facetsConfig);
    
    _registerWithDomStorage(name);

    return ComponentClass;
}


function _registerWithDomStorage(className) {
    DOMStorage.registerDataType(className, Component_domStorageSerializer, Component_domStorageParser);
}


function Component_domStorageSerializer(component) {
    var state = component.getState();
    return JSON.stringify(state);   
}


function Component_domStorageParser(compStr, compClassName) {
    var state = _.jsonParse(compStr);
    if (state)
        return Component.createFromState(state);
}


/**
 * Component class method
 * Creates component from [ComponentInfo](./c_info.js.html) (used by [milo.binder](../binder.js.html) and to copy component)
 * Component of any registered class (see [componentsRegistry](./c_registry.js.html)) with any additional registered facets (see [facetsRegistry](./c_facets/cf_registry.js.html)) can be created using this method.
 *
 * @param {ComponentInfo} info
 * @param {Boolean} throwOnErrors If set to false, then errors will only be logged to console. True by default.
 @ @return {Component}
 */
function Component$$create(info, throwOnErrors) {
    var ComponentClass = info.ComponentClass;

    if (typeof ComponentClass != 'function') {
        var message = 'create: component class should be function, "' + typeof ComponentClass + '" passed'; 
        if (throwOnErrors === false) {
            logger.error('Component', message, ';using base Component class instead');
            ComponentClass = Component;
        } else
            throw new Error(message);
    }

    var aComponent = new ComponentClass(info.scope, info.el, info.name, info);

    if (info.extraFacetsClasses)
        _.eachKey(info.extraFacetsClasses, function(FacetClass) {
            if (! aComponent.hasFacet(FacetClass))
                aComponent.addFacet(FacetClass, undefined, undefined, throwOnErrors);
        });

    return aComponent;
}


/**
 * Component class method
 * Create a copy of component, including a copy of DOM element. Returns a copy of `component` (of the same class) with new DOM element (not inserted into page).
 * Component is added to the same scope as the original component.
 *
 * @param {Component} component an instance of Component class or subclass
 * @param {Boolean} deepCopy optional `true` to make deep copy of DOM element, otherwise only element without children is copied
 * @return {Component}
 */
function Component$$copy(component, deepCopy) {
    check(component, Component);
    check(deepCopy, Match.Optional(Boolean));

    if (deepCopy && !component.container) 
        throw new Error('Cannot deep copy component without container facet');

    // copy DOM element, using Dom facet if it is available
    var newEl = component.dom 
                    ? component.dom.copy(deepCopy)
                    : component.el.cloneNode(deepCopy);

    var ComponentClass = component.constructor;

    // create component of the same class on the element
    var aComponent = ComponentClass.createOnElement(newEl, undefined, component.scope, component.extraFacets);
    var state = component._getState(deepCopy || false);
    aComponent.setState(state);
    _.deferMethod(aComponent, 'broadcast', 'stateready');
    return aComponent;
}


/**
 * Component class method
 * Creates an instance of component atached to element. All subclasses of component inherit this method.
 * Returns the component of the class this method is used with (thecontext of the method call).
 *
 * @param {Element} el optional element to attach component to. If element is not passed, it will be created
 * @param {String} innerHTML optional inner html to insert in element before binding.
 * @param {Scope} rootScope optional scope to put component in. If not passed, component will be attached to the scope that contains the element. If such scope does not exist, new scope will be created.
 * @param {Array<String>} extraFacets list of extra facet to add to component
 * @return {Subclass<Component>}
 */
function Component$$createOnElement(el, innerHTML, rootScope, extraFacets) {
    check(innerHTML, Match.Optional(String));
    check(rootScope, Match.Optional(Scope));
    check(extraFacets, Match.Optional([String]));

    // "this" refers to the class of component here, as this is a class method
    if (el && innerHTML) el.innerHTML = innerHTML;
    el = el || _createComponentElement.call(this, innerHTML);
    rootScope = rootScope || _findOrCreateComponentRootScope(el);
    var aComponent = _addAttributeAndBindComponent.call(this, el, rootScope, extraFacets);
    aComponent.broadcast('stateready');
    return aComponent;
}

function _createComponentElement(innerHTML) {
    // "this" refers to the class of component here, as this is a class method
    var Dom = facetsRegistry.get('Dom')
        , domFacetConfig = this.getFacetConfig('dom')
        , templateFacetConfig = this.getFacetConfig('template')
        , template = templateFacetConfig && templateFacetConfig.template;

    var elConfig = {
        domConfig: domFacetConfig,
        template: template,
        content: innerHTML
    };

    return Dom.createElement(elConfig);
}

function _findOrCreateComponentRootScope(el) {
    var parent = Component.getContainingComponent(el, false, 'Container');
    return parent ? parent.container.scope : new Scope(el);
}

function _addAttributeAndBindComponent(el, rootScope, extraFacets) {
    // add bind attribute to element
    var attr = new BindAttribute(el);
    // "this" refers to the class of component here, as this is a class method
    attr.compClass = this.name;
    attr.compFacets = extraFacets;
    attr.decorate();

    // should be required here to resolve circular dependency
    var miloBinder = require('../binder');
    miloBinder(el, rootScope);

    return rootScope[attr.compName];
}

/**
 * Component class method
 * Creates component from component state, that includes information about its class, extra facets, facets data and all scope children.
 * This is used to save/load, copy/paste and drag/drop component
 *
 * @param {Object} state state from which component will be created
 * @param {Scope} rootScope scope to which component will be added
 * @param {Boolean} newUniqueName optional `true` to create component with the name different from the original one. `False` by default.
 * @param {Boolean} throwOnErrors If set to false, then errors will only be logged to console. True by default.
 * @return {Component} component
 */
function Component$$createFromState(state, rootScope, newUniqueName, throwOnErrors) {
    check(state, Match.ObjectIncluding({
        compName: Match.Optional(String),
        compClass: Match.Optional(String),
        extraFacets: Match.Optional([String]),
        facetsStates: Match.Optional(Object),
        outerHTML: String
    }));

    var miloBinder = require('../binder');

    // create wrapper element optionally renaming component
    var wrapEl = _createComponentWrapElement(state, newUniqueName);

    // instantiate all components from HTML
    var scope = miloBinder(wrapEl, undefined, undefined, throwOnErrors);

    // as there should only be one component, call to _any will return it
    var component = scope._any();

    // set component's scope
    if (rootScope) {
        component.scope = rootScope;
        rootScope._add(component);
    }

    // restore component state
    component.setState(state);
    _.deferMethod(component, 'broadcast', 'stateready');

    return component;   
}


// used by Component$$createFromState
function _createComponentWrapElement(state, newUniqueName) {
    var wrapEl = document.createElement('div');
    wrapEl.innerHTML = state.outerHTML;

    var children = domUtils.children(wrapEl);
    if (children.length != 1)
        throw new Error('cannot create component: incorrect HTML, elements number: ' + children.length + ' (should be 1)');
    var compEl = children[0];
    var attr = new BindAttribute(compEl);
    attr.compName = newUniqueName ? miloComponentName() : state.compName;
    attr.compClass = state.compClass;
    attr.compFacets = state.extraFacets;
    attr.decorate();

    return wrapEl;
}

/**
 * Creates a component from a DataTransfer object (if possible)
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer
 * @param {DataTransfer} dataTransfer Data transfer
 */
function Component$$createFromDataTransfer(dataTransfer) {
    var dataType = _.find(dataTransfer.types, function (type) {
        return COMPONENT_DATA_TYPE_REGEX.test(type);
    });
    if (!dataType) return;

    var state = _.jsonParse(dataTransfer.getData(dataType));
    if (!state) return;

    return Component.createFromState(state, undefined, true);
}


/**
 * Component instance method.
 * Initializes component. Automatically called by inherited constructor of FacetedObject.
 * Subclasses should call inherited init methods:
 * ```
 * Component.prototype.init.apply(this, arguments)
 * ```
 *
 * @param {Scope} scope scope to which component will belong. It is usually a top level scope object returned by `milo.binder` or `scope` property of Container facet.
 * @param {Element} element DOM element that component is attached to
 * @param {String} name component name, should be unique in the scope of component
 * @param {ComponentInfo} componentInfo instance of ComponentInfo class that can be used to create a copy of component
 *  TODO try removing it
 */
function Component$init(scope, element, name, componentInfo) {
    // flag ASAP as not ready
    this.isReady = false;

    // create DOM element if it wasn't passed to Constructor
    this.el = element || this.createElement();

    // store reference to component on DOM element
    if (this.el) {
        // check that element does not have a component already atached
        var elComp = this.el[config.componentRef];
        if (elComp)
            logger.warn('component ' + name + ' attached to element that already has component ' + elComp.name);

        this.el[config.componentRef] = this;
    }

    _.defineProperties(this, {
        componentInfo: componentInfo,
        extraFacets: []
    }, _.ENUM);

    this.name = name;
    this.scope = scope;

    // create component messenger
    var messenger = new Messenger(this);
    _.defineProperty(this, MESSENGER_PROPERTY, messenger);

    // check all facets dependencies (required facets)
    this.allFacets('check');

    // start all facets
    this.allFacets('start');

    // call start method if it's defined in subclass
    this.postMessageSync('starting');
    if (this.start) this.start();
}


/**
 * This is a stub to avoid confusion whether the method of superclass should be called in subclasses
 * start method of subclass instance is called once all the facets are created, initialized and started (see above)
 * start method of scope parent is called BEFORE the same method of the child
 */
function Component$start() {}

/**
 * This is a stub to avoid confusion whether the method of superclass should be called in subclasses
 * childrenBound method of subclass instance is called once all the scope children are created, initialized, started and bound (see above)
 * childrenBound method of scope parent is called AFTER childrenBound method of the child
 */
function Component$childrenBound() {}

/**
 * Component instance method.
 * Initializes the element which this component is bound to
 *
 * This method is called when a component is instantiated outside the DOM and
 * will generate a new element for the component.
 * 
 * @return {Element}
 */
function Component$createElement() {
    if (typeof document == 'undefined')
        return;

    this.el = this.dom
                ? this.dom.createElement()
                : document.createElement('DIV');

    return this.el;
}


/**
 * Component instance method
 * Returns true if component has facet
 *
 * @param {Function|String} facetNameOrClass
 * @return {Boolean}
 */
function Component$hasFacet(facetNameOrClass) {
    var facetName = _.firstLowerCase(typeof facetNameOrClass == 'function'
                                        ? facetNameOrClass.name
                                        : facetNameOrClass);

    var facet = this[facetName];
    if (! facet instanceof ComponentFacet)
        logger.warn('expected facet', facetName, 'but this property name is used for something else');

    return !! facet;
}


/**
 * Component instance method.
 * Adds facet with given name or class to the instance of Component (or its subclass).
 * 
 * @param {String|Subclass<Component>} facetNameOrClass name of facet class or the class itself. If name is passed, the class will be retireved from facetsRegistry
 * @param {Object} facetConfig optional facet configuration
 * @param {String} facetName optional facet name. Allows to add facet under a name different from the class name supplied.
 * @param {Boolean} throwOnErrors If set to false, then errors will only be logged to console. True by default.
 * @return Subclass<Component> The created facet
 */
function Component$addFacet(facetNameOrClass, facetConfig, facetName, throwOnErrors) {
    check(facetNameOrClass, Match.OneOf(String, Match.Subclass(ComponentFacet)));
    check(facetConfig, Match.Optional(Object));
    check(facetName, Match.Optional(String));

    var FacetClass;
    // if only name passed, retrieve facet class from registry
    if (typeof facetNameOrClass == 'string') {
        var facetClassName = _.firstUpperCase(facetNameOrClass);
        FacetClass = facetsRegistry.get(facetClassName);
    } else 
        FacetClass = facetNameOrClass;

    if (!facetName)
        facetName = _.firstLowerCase(FacetClass.name);

    this.extraFacets.push(facetName);

    // add facet using method of FacetedObject
    var newFacet = FacetedObject.prototype.addFacet.call(this, FacetClass, facetConfig, facetName, throwOnErrors);

    // check depenedencies and start facet
    if (newFacet.check) newFacet.check();
    if (newFacet.start) newFacet.start();

    return newFacet;
}


/**
 * Component instance method.
 * Envoke given method with optional parameters on all facets.
 * Returns the map of values returned by all facets. If the facet doesn't have the method it is simply not called and the value in the map will be undefined.
 *
 * @param {String} method method name to envoke on the facet
 * @return {Object}
 */
function Component$allFacets(method) { // ,... arguments
    var args = _.slice(arguments, 1);

    return _.mapKeys(this.facets, function(facet, fctName) {
        if (facet && typeof facet[method] == 'function')
            return facet[method].apply(facet, args);
    });
}


/**
 * Component instance method.
 * 
 * @param {String} [name] optional new name of component, 
 * @param {Boolean} [renameInScope] optional false to not rename ComponentInfo object in its scope, true by default
 */
function Component$rename(name, renameInScope) {
    name = name || miloComponentName();
    this.componentInfo.rename(name, false);
    Scope.rename(this, name, renameInScope);
}


/**
 * Component instance method.
 * Removes component from its scope.
 *
 * @param {Boolean} preserveScopeProperty true not to delete scope property of component
 * @param {Boolean} quiet optional true to suppress the warning message if the component is not in scope
 */
function Component$remove(preserveScopeProperty, quiet) {
    if (this.scope) {
        this.scope._remove(this.name, quiet);
        if (! preserveScopeProperty)
            delete this.scope;
    }
}


/**
 * Component instance method.
 * Inserts the component into the DOM and attempts to adjust the scope tree accordingly.
 * @param {HTMLElement} parentEl    The element into which the component should be inserted.
 * @param {HTMLElement} referenceEl (optional) The reference element it should be inserted before.
 */
function Component$insertInto(parentEl, referenceEl) {
    parentEl.insertBefore(this.el, referenceEl);
    this.setScopeParentFromDOM();
}


/**
 * Component instance method
 * Retrieves all component state, including information about its class, extra facets, facets data and all scope children.
 * This information is used to save/load, copy/paste and drag/drop component 
 * Returns component state
 *
 * @this {Component} component which state will be saved
 * @return {Object}
 */
function Component$getState() {
    this.broadcast('getstatestarted', { rootComponent: this }, undefined, true);
    var state = this._getState(true);
    state.outerHTML = this.el.outerHTML;
    _.deferMethod(this, 'broadcast', 'getstatecompleted', { rootComponent: this }, undefined, true);
    return state;
}


/**
 * Component instance method
 * Retrieves all component state, including information about its class, extra facets, facets data and all scope children.
 * This information is used to save/load, copy/paste and drag/drop component 
 * If component has [Transfer](./c_facets/Transfer.js.html) facet on it, this method retrieves state from this facet
 * Returns component state
 *
 * @this {Component} component which state will be saved
 * @param {Object} options can be used by subclasses. 
 * @return {Object}
 */
function Component$getTransferState(options) {
    return this.transfer
            ? this.transfer.getState(options)
            : this.getState(options);
}


/**
 * Component instance method
 * Returns the state of component
 * Used by class method `Component.getState` and by [Container](./c_facets/Container.js.html) facet.
 *
 * @private
 * @param {Boolean} deepState false to get shallow state from all facets (true by default)
 * @return {Object}
 */
function Component$_getState(deepState){

    var facetsStates = this.allFacets('getState', deepState === false ? false : true);
    facetsStates = _.filterKeys(facetsStates, function(fctState) {
        return !! fctState;
    });

    return {
        compName: this.name,
        compClass: this.constructor.name,
        extraFacets: this.extraFacets,
        facetsStates: facetsStates
    };
}


/**
 * Component instance method
 * Sets the state of component.
 * Used by class method `Component.createFromState` and by [Container](./c_facets/Container.js.html) facet.
 *
 * @private
 * @param {Object} state state to set the component
 */
function Component$setState(state) {
    if (state.facetsStates)
        _.eachKey(state.facetsStates, function(fctState, fctName) {
            var facet = this[fctName] || tryCreateFacet(this, fctName);

            if (facet && typeof facet.setState == 'function') {
                facet.setState(fctState);
            }
        }, this);
}


function tryCreateFacet(comp, facetName) {
    try {
        return comp.addFacet(facetName);
    } catch (e) {
        logger.error('Facet "' + facetName + '" could not be restored from state. ' + e);
    }
}

/**
 * Component instance method.
 * Returns the scope parent of a component.
 * If `conditionOrFacet` parameter is not specified, an immediate parent will be returned, otherwise the closest ancestor with a specified facet or passing condition test.
 *
 * @param {Function|String} conditionOrFacet optional condition that component should pass (or facet name it should contain)
 * @return {Component|undefined}
 */
function Component$getScopeParent(conditionOrFacet) {
    return _callGetScopeParent.call(this, _getScopeParent, conditionOrFacet);
}

function _callGetScopeParent(_getScopeParentFunc, conditionOrFacet) {
    check(conditionOrFacet, Match.Optional(Match.OneOf(Function, String)));
    var conditionFunc = componentUtils._makeComponentConditionFunc(conditionOrFacet);
    return _getScopeParentFunc.call(this, conditionFunc);   
}

function _getScopeParent(conditionFunc) {
    var parent;
    try { parent = this.scope._hostObject.owner; } catch(e) {}

    // Where there is no parent, this function will return undefined
    // The parent component is checked recursively
    if (parent) {
        if (! conditionFunc || conditionFunc(parent) )
            return parent;
        else
            return _getScopeParent.call(parent, conditionFunc);
    }
}


/**
 * Component instance method
 * Returns scope parent with a given class, with same class if not specified
 *
 * @param {Function|String} [ComponentClass] component class or name that the parent should have, same class by default
 * @return {Component}
 */
function Component$getScopeParentWithClass(ComponentClass) {
    if (typeof ComponentClass === 'string')
        ComponentClass = milo.registry.components.get(ComponentClass);
    ComponentClass = ComponentClass || this.constructor;
    return _getScopeParent.call(this, function(comp) {
        return comp instanceof ComponentClass;
    });
}


/**
 * Component instance method.
 * Returns the topmost scope parent of a component.
 * If `conditionOrFacet` parameter is not specified, the topmost scope parent will be returned, otherwise the topmost ancestor with a specified facet or passing condition test.
 *
 * @param {Function|String} conditionOrFacet optional condition that component should pass (or facet name it should contain)
 * @return {Component|undefined}
 */
function Component$getTopScopeParent(conditionOrFacet) {
    return _callGetScopeParent.call(this, _getTopScopeParent, conditionOrFacet);
}

function _getTopScopeParent(conditionFunc) {
    var topParent
        , parent = this;
    do {
        parent = _getScopeParent.call(parent, conditionFunc);
        if (parent)
            topParent = parent;
    } while (parent);

    return topParent;
}


/**
 * Component instance method
 * Returns scope parent with a given class, with same class if not specified
 *
 * @param {Function} [ComponentClass] component class that the parent should have, same class by default
 * @return {Component}
 */
function Component$getTopScopeParentWithClass(ComponentClass) {
    ComponentClass = ComponentClass || this.constructor;
    return _getTopScopeParent.call(this, function(comp) {
        return comp instanceof ComponentClass;
    });
}


/**
 * Component instance method
 * Finds scope parent of component using DOM tree (unlike getScopeParent that simply goes up the scope tree).
 * While getScopeParent is faster it may fail if scope chain is not setup yet (e.g., when component has been just inserted).
 * The scope property of component will be changed to point to scope object of container facet of that parent.
 * Returned scope parent of the component will be undefined (as well as component's scope property) if no parent in the DOM tree has container facet.
 * TODO Method will not bind DOM children correctly if component has no container facet.
 *
 * @return {Component}
 */
function Component$setScopeParentFromDOM() {
    var parentEl = this.el.parentNode;

    var parent, foundParent;
    while (parentEl && ! foundParent) {
        parent = Component.getComponent(parentEl);
        foundParent = parent && parent.container;
        parentEl = parentEl.parentNode;
    }

    this.remove(); // remove component from its current scope (if it is defined)
    if (foundParent) {
        this.rename(undefined, false);
        parent.container.scope._add(this);
        return parent;
    }        
}


/**
 * Walks component tree, calling provided callback on each component
 *
 * @param callback
 * @param thisArg
 */
function Component$walkScopeTree(callback, thisArg) {
    callback.call(thisArg, this);
    if (!this.container) return;
    this.container.scope._each(function(component) {
        component.walkScopeTree(callback, thisArg);
    });
}


function Component$treePathOf(component) {
    return domUtils.treePathOf(this.el, component.el);
}


function Component$getComponentAtTreePath(treePath, nearest) {
    var node = domUtils.getNodeAtTreePath(this.el, treePath, nearest);
    return Component.getComponent(node);
}


function Component$insertAtTreePath(treePath, component, nearest) {
    var wasInserted = domUtils.insertAtTreePath(this.el, treePath, component.el, nearest);
    if (wasInserted) component.setScopeParentFromDOM();
    return wasInserted;
}


/**
 * Broadcast message to component and to all its scope children
 *
 * @param {String|RegExp} msg message to be sent
 * @param {Any} [data] optional message data
 * @param {Function} [callback] optional callback
 * @param {Boolean} [synchronously] if it should use postMessageSync
 */
function Component$broadcast(msg, data, callback, synchronously) {
    var postMethod = synchronously ? 'postMessageSync' : 'postMessage';
    this.walkScopeTree(function(component) {
        if (msg === 'stateready' && !component._destroyed) {
            component.isReady = true;
        }
        component[postMethod](msg, data, callback);
    });
}


/**
 * Destroy component: removes component from DOM, removes it from scope, deletes all references to DOM nodes and unsubscribes from all messages both component and all facets
 */
function Component$destroy(opts) {
    this.isReady = undefined;
    if (typeof opts == 'boolean') opts = { quiet: opts };
    else if (!opts) opts = {};

    if (this._destroyed) {
        if (!opts.quiet) logger.warn('Component destroy: component is already destroyed');
        return;
    }
    this.remove(false, opts.quiet);
    this.allFacets('destroy', opts);
    this[MESSENGER_PROPERTY].destroy();
    if (this.el) {
        domUtils.detachComponent(this.el);
        domUtils.removeElement(this.el);
        delete this.el;
    }
    this.componentInfo.destroy();
    this._destroyed = true;
}


/**
 * Returns true if component was destroyed
 *
 * @return {Boolean}
 */
function Component$isDestroyed() {
    return !!this._destroyed;
}
