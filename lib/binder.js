'use strict';

var componentsRegistry = require('./components/c_registry')
    , Component = componentsRegistry.get('Component')
    , ComponentInfo = require('./components/c_info')
    , Scope = require('./components/scope')
    , BindAttribute = require('./attributes/a_bind')
    , miloCore = require('milo-core')
    , _ = miloCore.proto
    , utilDom = require('./util/dom');


binder.scan = scan;
binder.create = create;
binder.twoPass = twoPass;


module.exports = binder;


/**
 * `milo.binder`
 *
 * Recursively scans the document tree inside `scopeEl` (document.body by default) looking for __ml-bind__ attribute that should contain the class, additional facets and the name of the component that should be created and bound to the element.
 *
 * Possible values of __ml-bind__ attribute:
 *
 * - `:myView` - only component name. An instance of Component class will be created without any facets.
 * - `View:myView` - class and component name. An instance of View class will be created.
 * - `[Events, Data]:myView` - facets and component name. An instance of Component class will be created with the addition of facets Events and Data.
 * - `View[Events, Data]:myView` - class, facet(s) and component name. An instance of View class will be created with the addition of facets Events and Data.
 *
 * Function returns an instance of [`Scope`](./components/scope.js.html) class containing all components created as a result of scanning DOM.
 *
 * If the component has [`Container`](./components/c_facets/Container.js) facet, children of this element will be stored in the `scope` object, available as scope property on the Container facet of this component. Names of components within the scope should be unique, but they can be the same as the names of components in outer scope (or some other scope).
 *
 * @param {Element} scopeEl root element inside which DOM will be scanned and bound
 * @param {Scope} rootScope Optional Root scope object where top level components will be saved.
 * @param {Boolean} bindRootElement If set to false, then the root element will not be bound. True by default.
 * @param {Boolean} throwOnErrors If set to false, then errors will only be logged to console. True by default.
 * @return {Scope}
 */
function binder(scopeEl, rootScope, bindRootElement, throwOnErrors) {
    return createBinderScope(scopeEl, function(scope, el, attr, throwOnErrors) {
        var info = new ComponentInfo(scope, el, attr, throwOnErrors);
        attr.decorate();
        return Component.create(info, throwOnErrors);
    }, rootScope, bindRootElement, throwOnErrors);
}


// bind in two passes
function twoPass(scopeEl, rootScope, bindRootElement, throwOnErrors) {
    var scanScope = binder.scan(scopeEl, rootScope, bindRootElement, throwOnErrors);
    return binder.create(scanScope, undefined, throwOnErrors);
}


// scan DOM for BindAttribute
function scan(scopeEl, rootScope, bindRootElement, throwOnErrors) {
    return createBinderScope(scopeEl, function(scope, el, attr, throwOnErrors) {
        return new ComponentInfo(scope, el, attr, throwOnErrors);
    }, rootScope, bindRootElement, throwOnErrors);
}


// create bound components
function create(scanScope, hostObject, throwOnErrors) {
    var scope = new Scope(scanScope._rootEl, hostObject)
        , addMethod = throwOnErrors === false ? '_safeAdd' : '_add';

    scanScope._each(function(compInfo) {
        // set correct component's scope
        var info = _.clone(compInfo);
        info.scope = scope;

        // create component
        var aComponent = Component.create(info, throwOnErrors);

        scope[addMethod](aComponent, aComponent.name);
        if (aComponent.container)
            aComponent.container.scope = create(compInfo.container.scope, aComponent.container, throwOnErrors);
    });

    return scope;
}

/**
 * `createBinderScope`
 * @param  {Element} scopeEl             scopeEl root element inside which DOM will be scanned and bound (document.body by default).
 * @param  {Function} scopeObjectFactory See [binder](#milo.binder)
 * @param  {Scope} rootScope             Optional Root scope object where top level components will be saved.
 * @param  {Boolean} bindRootElement     If set to false, then the root element will not be bound. True by default.
 * @param  {Boolean} throwOnErrors       If set to false, then errors will only be logged to console. True by default.
 * @return {Scope}                       [description]
 */
function createBinderScope(scopeEl, scopeObjectFactory, rootScope, bindRootElement, throwOnErrors) {
    scopeEl = scopeEl || document.body;
    var scope = rootScope || new Scope(scopeEl)
        , addMethod = throwOnErrors === false ? '_safeAdd' : '_add';

    createScopeForElement(scope, scopeEl, bindRootElement);

    return scope;


    function createScopeForElement(scope, el, bindRootElement) {
        // get element's binding attribute (ml-bind by default)
        var attr = new BindAttribute(el);

        // if element has bind attribute crate scope object (Component or ComponentInfo)
        if (attr.node && bindRootElement !== false) {
            var scopedObject = scopeObjectFactory(scope, el, attr, throwOnErrors)
                , isContainer = typeof scopedObject != 'undefined' && scopedObject.container;
        }

        // if there are childNodes add children to new scope if this element has component with Container facet
        // otherwise create a new scope
        if (el.childNodes && el.childNodes.length) {
            if (isContainer) {
                var innerScope = new Scope(el);
                scopedObject.container.scope = innerScope;
                innerScope._hostObject = scopedObject.container;
            }

            createScopeForChildren(el, isContainer ? innerScope : scope);
        }

        // if scope wasn't previously created on container facet, create empty scope anyway
        if (isContainer && ! scopedObject.container.scope)
            scopedObject.container.scope = new Scope(el);


        // TODO condition after && is a hack, should not be used!
        if (scopedObject)
            scope[addMethod](scopedObject, attr.compName);

        // _.defer(postChildrenBoundMessage, el);
        postChildrenBoundMessage(el);

        return scopedObject;


        function postChildrenBoundMessage(el) {
            var elComp = Component.getComponent(el);

            if (elComp) {
                elComp.postMessageSync('childrenbound');
                elComp.childrenBound();
            }
        }
    }


    function createScopeForChildren(containerEl, scope) {
        var children = utilDom.children(containerEl);

        _.forEach(children, function(node) {
            createScopeForElement(scope, node, true);
        });
        return scope;
    }
}
