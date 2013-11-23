'use strict';

describe('milo binder', function() {
    it('should bind components based on ml-bind attribute', function() {
    	var milo = require('../../lib/milo');

		expect({p: 1}).property('p', 1);

    	var components = milo.binder(document.getElementById('viewToBind'));
    	
		console.log(components);
    });
});
