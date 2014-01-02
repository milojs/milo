// <a name="components-facets-template"></a>
// ###template facet

'use strict';

var ComponentFacet = require('../c_facet')
	, facetsRegistry = require('./cf_registry')	
	, _ = require('mol-proto')
	, check = require('../../util/check')
	, Match = check.Match
	, binder = require('../../binder');


// data model connection facet
var Template = _.createSubclass(ComponentFacet, 'Template');

_.extendProto(Template, {
	init: Template$init,
	set: Template$set,
	render: Template$render,
	binder: Template$binder,
	require: ['Container']

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

	this.set(this.config.template || '', compile);
}


function Template$set(templateStr, compile) {
	check(templateStr, String);
	check(compile, Match.Optional(Function));

	this._templateStr = templateStr;
	if (compile)
		this._compile = compile

	compile = compile || this._compile;

	if (compile)
		this._template = compile(templateStr);

	return this;
}


function Template$render(data) { // we need data only if use templating engine
	this.owner.el.innerHTML = this._template
								? this._template(data)
								: this._templateStr;

	return this;
}


function Template$binder() {
	var thisScope = binder(this.owner.el);

	// TODO should be changed to reconcillation of existing children with new
	this.owner.container.scope = thisScope[this.owner.name].container.scope;
}
