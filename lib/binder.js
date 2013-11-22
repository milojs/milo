'use strict';

require('proto');
var registry = require('./components/c_registry');

var opts = {
	BIND_ATTR: 'ml-bind'
}

module.exports = binder;

function binder(scopeEl) {
	var scopeEl = scopeEl || document.body
		, components = {};

	// iterate children of scopeEl
	scopeEl.children.forEach(function(el){
		var attr = parseBindAttribute(el);

		if (attr) { // element should be bound to a component
			validateBindAttr(view, attr);
		
			// get component class from registry and validate
			var ComponentClass = componentsRegistry.get(attr.cls);
			if (! ComponentClass)
				throw new BindError('class ' + attr.cls + ' is not registered');
			check(ComponentClass, Match.Subclass(Component));
	
			// create new component
			var aComponent = new ComponentClass({}, el);
		}

		// bind inner elements to components
		var innerComponents = binder(el);

		// attach inner components to the current one (create a new scope) ...
		if (aComponent && aComponent.container)
			aComponent.container.add(innerComponents);
		else // or keep them in the current scope
			_.eachKey(innerComponents, storeComponent);

		if (aComponent)
			storeComponent(aComponent, attr.name);

		function storeComponent(aComponent, name) {
			if (components[name])
				throw new BindError('duplicate component name: ' + name);

			components[name] = aComponent;
		}

		function parseBindAttribute(el) {
			var attr = el.getAttribute(opts.BNDR_ATTR);

			if (! attr) return;

			var bindTo = attr.split(':');
			switch (bindTo.length) {
				case 1:
					return {
						name: bindTo[0],
						cls: 'Component'
					};
				case 2:
					return {
						name: bindTo[1],
						cls: bindTo[0]
					};
				default:
					throw new BindError('invalid bind attribute ' + attr);
			}
		}

		function validateBindAttr(view, attr) {
			check(name, Match.Where(function() {
		  		return typeof name == 'string' && name != '';
			}), 'empty component name');

			if (! attr.cls)
				throw new BindError('empty component class name');
		}
	});
}


binder.config = function(options) {
	opts.extend(options);
};
