'use strict';

require('proto');
var registry = require('../components/c_registry')
	, Attribute = require('./attribute')
	, BindError = require('./error');


var opts = {
	BIND_ATTR: 'ml-bind'
}

module.exports = bind;

function bind(scopeEl) {
	var scopeEl = scopeEl || document.body
		, components = {};

	// iterate children of scopeEl
	Array.prototype.forEach.call(scopeEl.children, function(el){
		attr = new Attribute(el, opts.BIND_ATTR);

		bindComponent(attr);

		// bind inner elements to components
		var innerComponents = bind(el);

		// attach inner components to the current one (create a new scope) ...
		if (aComponent && aComponent.container)
			aComponent.container.add(innerComponents);
		else // or keep them in the current scope
			_.eachKey(innerComponents, storeComponent);

		if (aComponent)
			storeComponent(aComponent, attr.name);


		function bindComponent(attr) {
			if (attr.node) { // element will be bound to a component
				attr.parse().validate();
			
				// get component class from registry and validate
				var ComponentClass = componentsRegistry.get(attr.compClass);
				if (! ComponentClass)
					throw new BindError('class ' + attr.compClass + ' is not registered');
				check(ComponentClass, Match.Subclass(Component));
		
				// create new component
				var aComponent = new ComponentClass({}, el);
			}
		}


		function storeComponent(aComponent, name) {
			if (components[name])
				throw new BindError('duplicate component name: ' + name);

			components[name] = aComponent;
		}
	});
}


bind.config = function(options) {
	opts.extend(options);
};
