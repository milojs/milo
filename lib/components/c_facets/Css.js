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
 *     classes: {
 *        '.someModelProp': 'some-css-class', // Apply css class if the value of '.someModelProp' is truthy
 *        '.someOtherModelProp': {
 *            'value-1': 'some-css-class', // Apply if the value of '.someOtherModelProp' == 'value-1'
 *            'value-2: 'some-other-css-class' // etc
 *        },
 *        '.anotherModelProp': function getCssClass(modelValue) { return ... } // Apply result of function
 *        '.oneMoreModelProp': 'my-$-class' // Template value of '.oneMoreModelProp' (By replacing $ character)
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
        update: CssFacet$update
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

    modelUtils.path.wrapMessengerMethods.call(this);

    this.onSync('changedata', modelUtils.changeDataHandler); // Listen for changes to data source
    this.activeModelPaths = {}; // Key-Value object: Css classes (key) set by what model paths (value)
}

function CssFacet$set(data) {
    check(data, Match.OneOf(Object, null, undefined));

    if(data) {
        var self = this;

        _.eachKey(data, function (value, prop) {
            var modelPath = prop.charAt(0) !== '.' ? '.' + prop : prop;

            self.update(modelPath, value);
        });
    } else {
        this.del();
    }
}

function CssFacet$del() {
    var classList = this.owner.el.classList;
    
    _.eachKey(this.activeModelPaths, function(modelPaths, cssClass) {
        modelPaths.clear();

        classList.remove(cssClass);
    });
}

function CssFacet$path(modelPath) {
    var pathAccessor = this.config.classes && this.config.classes[modelPath] ? new Path(this, modelPath) : null;

    return modelPath ? pathAccessor : this;
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

function updateSimple(modelPath, cssClass, data) {
    var classList = this.owner.el.classList;

    // Remove any css class set via this model path
    _.eachKey(this.activeModelPaths, function(modelPaths, cssClass) {
        if (modelPaths.has(modelPath)) {
            modelPaths.delete(modelPath);

            if (modelPaths.size === 0) // Only remove the class if no other model path is applying it
                classList.remove(cssClass);
        }
    });

    // Apply new css class (cssClass / data can be null if this is a remove only operation)
    if (cssClass && data) {
        cssClass = data ? cssClass.replace(/\$/g, data) : cssClass; // Process any template characters ($) in class name

        var modelPaths = this.activeModelPaths[cssClass] || (this.activeModelPaths[cssClass] = new Set());

        modelPaths.add(modelPath);
        classList.add(cssClass);
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
