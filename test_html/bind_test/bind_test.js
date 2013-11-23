'use strict';

describe('milo binder', function() {
    it('should bind components based on ml-bind attribute', function() {
    	var milo = require('../../lib/milo');

    	// used facets
    	require('../../lib/components/c_facets/Container');

    	// used components
    	require('../../lib/components/classes/View');

		expect({p: 1}).property('p', 1);

    	var components = milo.binder(document.getElementById('viewToBind'));
    	
		console.log(components);
    });
});
