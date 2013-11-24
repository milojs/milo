'use strict';

describe('milo binder', function() {
    it('should bind components based on ml-bind attribute', function() {
    	var milo = require('../../lib/milo');

		expect({p: 1}).property('p', 1);

    	var ctrl = milo.binder();

    	ctrl.articleButton.events.on('click', function(e) {
    		console.log('button clicked', e);
    	});

    	ctrl.articleIdInput.events.on('input', logEvent);

    	function logEvent(e) {
    		console.log(e);
    	}
    	
		console.log(ctrl);
    });
});
