'use strict';

// <a name="components-facets-template"></a>
// ###template facet

// simplifies rendering of component element from template.
//   Any templating enging can be used that supports template compilation
//   (or you can mock this compilation easily by creating closure storing
//   template string in case your engine doesn't support compilation).
//   By default milo uses [doT](), the most versatile, conscise and at the
//   same time the fastest templating engine.
//   If you use milo in browser, it is the part of milo bundle and available
//   as global variable `doT`.

var ComponentFacet = require('../c_facet')
    , facetsRegistry = require('./cf_registry')
    , miloCore = require('milo-core')
    , _ = miloCore.proto
    , check = miloCore.util.check
    , logger = miloCore.util.logger
    , Match = check.Match
    , binder = require('../../binder');


// data model connection facet
var Template = _.createSubclass(ComponentFacet, 'Template');

_.extendProto(Template, {
    init: Template$init,
    start: Template$start,
    set: Template$set,
    getCompiled: Template$getCompiled,
    render: Template$render,
    binder: Template$binder

    // _reattach: _reattachEventsOnElementChange
});

facetsRegistry.add(Template);

module.exports = Template;


function Template$init() {
    ComponentFacet.prototype.init.apply(this, arguments);

    // templates are interpolated with default (doT) or configured engine (this.config.compile)
    // unless this.config.interpolate is false
    var compile = this.config.interpolate === false
                    ? undefined
                    : this.config.compile || milo.config.template.compile;

    this.set(this.config.template || '', compile, this.config.compileOptions);
}


function Template$start() {
    ComponentFacet.prototype.start.apply(this, arguments);
    if (this.config.autoRender) {
        this.render();
        if (this.config.autoBinder)
            this.binder();
    }
}


function Template$getCompiled() {
    return this._template;
}


function Template$set(templateStr, compile, compileOptions) {
    check(templateStr, Match.OneOf(String, Function));
    check(compile, Match.Optional(Function));

    if (typeof templateStr == 'function')
        this._template = templateStr;
    else {
        this._templateStr = templateStr;
        if (compile)
            this._compile = compile;
        else
            compile = this._compile;

        if (compile)
            this._template = compile(templateStr, compileOptions);
    }

    return this;
}


function Template$render(data) { // we need data only if use templating engine
    this.owner.el.innerHTML = this._template
                                ? this._template(data)
                                : this._templateStr;

    return this;
}


function Template$binder() {
    if (this.owner.container)
        return this.owner.container.binder();
    else
        logger.error('TemplateFacet: Binder called without container facet.');
}
