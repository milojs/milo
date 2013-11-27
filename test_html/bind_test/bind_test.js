'use strict';

describe('milo binder', function() {
    it('should bind components based on ml-bind attribute', function() {
    	var milo = require('../../lib/milo');

		expect({p: 1}).property('p', 1);

    	var ctrl = milo.binder();

    	ctrl.articleButton.events.on('click mouseenter', function(eType, evt) {
    		console.log('button', eType, evt);
    	});

    	ctrl.articleIdInput.data.on('datachanged', logData);

    	function logData(message, data) {
    		console.log(message, data);
    	}
    	
		console.log(ctrl);
    });
});
