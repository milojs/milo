'use strict';

var Component = require('../../lib/components/c_class')
	, assert = require('assert');

module.exports = testComponent;

function testComponent(componentsRegistry, ComponentClass, facetsRegistry, facetsList) {
	it('should be a subclass of Component class', function(){
		assert(ComponentClass.prototype instanceof Component);
	});

	it('should be registered under its own name', function() {
		var name = ComponentClass.name;

		assert.equal(ComponentClass, componentsRegistry.get(name));
	});
};
