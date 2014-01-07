'use strict';

var fs = require('fs')
	, assert = require('assert');


describe('milo.binder', function() {
	var testHTML = fs.readFileSync(__dirname + '/binder_test.html');
	var element;

	beforeEach(function() {
		element = document.createElement('div');
		element.innerHTML = testHTML;
	});

	function testScope(scope) {
		assert(scope.body instanceof milo.Component);
		assert(scope.articleIdInput instanceof milo.Component);
		assert(scope.articleIdInput.data instanceof milo.ComponentFacet);

		assert(scope.articleButton instanceof milo.Component);
		assert(scope.articleButton.events instanceof milo.ComponentFacet);
		assert.equal(scope.articleButton.data, undefined);

		assert(scope.infoView instanceof milo.Component);
		assert(scope.infoView.container instanceof milo.ComponentFacet);

		var innerScope = scope.infoView.container.scope;
		assert(innerScope.para1 instanceof milo.Component);
		assert(innerScope.para2 instanceof milo.Component);
	};

	function testScopeBackLinks(scope) {
		var innerScope = scope.infoView.container.scope;

		var containerFacet1 = innerScope.para1.scope._hostObject
			, containerFacet2 = innerScope.para2.scope._hostObject
		assert(containerFacet1 instanceof milo.ComponentFacet);
		assert(containerFacet2 instanceof milo.ComponentFacet);

		assert.equal(containerFacet1.owner, scope.infoView);
		assert.equal(containerFacet2.owner, scope.infoView);
	}


	it('should instantiate components based on bind attribute (ml-bind by default)', function() {
		var scope = milo.binder(element);
		testScope(scope);
	});


	it('should instantiate components when bound in two passes', function() {
		var scope = milo.binder.twoPass(element);
		testScope(scope);
	});


	it('should correctly create back links of container/scopes to traverse up the scope tree', function() {
		var scope = milo.binder(element);
		testScopeBackLinks(scope);
	});


	it('should correctly create back links in two-pass binding', function() {
		var scope = milo.binder.twoPass(element);
		testScopeBackLinks(scope);
	});
});
