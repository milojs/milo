'use strict';

var miloCore = require('milo-core')
    , _ = miloCore.proto
    , check = miloCore.util.check
    , Match = check.Match
    , modelUtils = miloCore.Model._utils
    , createFacetClass = require('../../util/create_facet_class');

/**
 * Css Facet facilitates the binding of model values to the css classes being applied to the element owned by a milo
 * component.
 *
 * Facet configuration looks like:
 *
 * ```
 * css: {
 *     binding: {
 *         facetName: 'model', // Can use this or dataSource or both
 *         getDataSource: function () { return this._someModel },
 *         depth: '->>' // defaults to '->>'
 *     },
 *     classes: {
 *        '.someModelProp': 'some-css-class' | Array<string>, // Apply css class if the value of '.someModelProp' is truthy
 *        '.someOtherModelProp': {
 *            'value-1': 'some-css-class' | Array<string>, // Apply if the value of '.someOtherModelProp' == 'value-1'
 *            'value-2: 'some-other-css-class' | Array<string> // etc
 *        },
 *        '.anotherModelProp': function getCssClass(modelValue) { return ... } // Apply result of function
 *        '.oneMoreModelProp': 'my-$-class' | Array<string> // Template value of '.oneMoreModelProp' (By replacing $ character)
 *     }
 * }
 * ```
 *
 * To bind a data source to the facet, use milo binder:
 *
 * ```
 * milo.binder(someDataSource, '->>', myComponent.css);
 * ```
 *
 * Or else, set data directly on the facet like so:
 *
 * ```
 * component.css.set({
 *     '.someModelProp': 'milo',
 *     '.someOtherModelProp': 'is-cool'
 * });
 */
var CssFacet = module.exports = createFacetClass({
    className: 'Css',
    methods: {
        start: CssFacet$start,
        set: CssFacet$set,
        del: CssFacet$del,
        path: CssFacet$path,
        update: CssFacet$update,
        destroy: CssFacet$destroy
    }
});

// Config data type to update function
var updateHandlers = {
    string: updateSimple,
    object: updateByObject,
    function: updateByFunction
};

function CssFacet$start() {
    CssFacet.super.start.apply(this, arguments);
    setupClassList.call(this);
    this.owner.on('starting', { subscriber: setupBinding, context: this });
    modelUtils.path.wrapMessengerMethods.call(this);
    this.onSync('changedata', modelUtils.changeDataHandler); // Listen for changes to data source
    this.activeModelPaths = {}; // Key-Value object: Css classes (key) set by what model paths (value)
}

function setupClassList() {
    var getClassList = this.config.getClassList;
    this._classList = (getClassList && getClassList.call(this)) || this.owner.el.classList;
}

function setupBinding() {
    var bindingConfig = this.config.binding;
    if (!bindingConfig) return;

    check(bindingConfig, {
        facetName: Match.Optional(String),
        getDataSource: Match.Optional(Function),
        depth: Match.Optional(String)
    });

    var facetName = bindingConfig.facetName;
    var getDataSource = bindingConfig.getDataSource;
    var depth = bindingConfig.depth;

    if (facetName) {
        var facet = this.owner[facetName];
        var facetDs = facetName == 'data' ? facet : facet.m;
        this._facetBinding = milo.minder(facetDs, depth || '->>', this);
    }

    if (getDataSource) {
        var ds = getDataSource.call(this.owner);
        this._dataSourceBinding = milo.minder(ds, depth || '->>', this);
    }
}

function CssFacet$set(data) {
    check(data, Match.OneOf(Object, null, undefined));
    if(data) {
        var self = this;
        _processProperties('', data);
    } else {
        this.del();
    }

    function _processProperties(path, data) {
        _.eachKey(data, function (value, prop) {
            var modelPath = path + (prop.charAt(0) !== '.' ? '.' + prop : prop);
            self.update(modelPath, value);
            if (typeof value === 'object' && value !== null && Object.keys(value).length > 0)
                _processProperties(modelPath, value);
        });
    }
}

function CssFacet$del() {
    var classList = this._classList;
    
    _.eachKey(this.activeModelPaths, function(modelPaths, cssClass) {
        modelPaths.clear();
        classList.remove(...cssClass.split(','));
    });
}

function CssFacet$path(modelPath) {
    if (!modelPath) return this; // No model path (or '') means the root object

    // Otherwise the modelPath has to exist in the facet configuration
    return this.config.classes && this.config.classes[modelPath] ? new Path(this, modelPath) : null;
}

function CssFacet$update(modelPath, value) {
    var cssConfig = this.config.classes[modelPath];

    if (cssConfig) {
        var handler = updateHandlers[typeof cssConfig];

        handler.call(this, modelPath, cssConfig, value);
        this.postMessageSync('changed', {
            modelPath: modelPath,
            modelValue: value
        });
    }
}

function CssFacet$destroy() {
    CssFacet.super.destroy.apply(this, arguments);
    if (this._dataSourceBinding)
        milo.minder.destroyConnector(this._dataSourceBinding);
    if (this._facetBinding)
        milo.minder.destroyConnector(this._facetBinding);

    delete this._dataSourceBinding;
    delete this._facetBinding;
}

function updateSimple(modelPath, cssClass, data) {
    var classList = this._classList;
    // Remove any css class set via this model path
    _.eachKey(this.activeModelPaths, function(modelPaths, cssClass) {
        if (modelPaths.has(modelPath)) {
            modelPaths.delete(modelPath);

            if (modelPaths.size === 0) // Only remove the class(es) if no other model path is applying it
                classList.remove(...cssClass.split(','));
        }
    });

    // Apply new css class (cssClass / data can be null if this is a remove only operation)
    if (cssClass && data) {
        cssClass = data ? [].concat(cssClass).map(cls => cls.replace(/\$/g, data)) : cssClass; // Process any template characters ($) in class name

        var modelPaths = this.activeModelPaths[cssClass] || (this.activeModelPaths[cssClass] = new Set());

        modelPaths.add(modelPath);
        classList.add(...[].concat(cssClass));
    }
}

function updateByObject(modelPath, cssClasses, value) {
    // Apply new css class
    var cssClass = cssClasses[value];

    updateSimple.call(this, modelPath, cssClass, value);
}

function updateByFunction(modelPath, getCssClassFn, data) {
    var cssClass = getCssClassFn.call(this, data);

    updateSimple.call(this, modelPath, cssClass, true);
}

// Path class

function Path(cssFacet, modelPath) {
    this.cssFacet = cssFacet;
    this.modelPath = modelPath;
}

Path.prototype.set = function(value) {
    this.cssFacet.update(this.modelPath, value);
};

Path.prototype.del = function() {
    this.set(null);
};
