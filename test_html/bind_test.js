describe('milo binder', function() {
    it('should bind components based on ml-bind attribute', function(done) {
    	window.onload = function() {
	    	var components = milo.bind(document.getElementById('viewToBind'));
			console.log(components);
			done();
		}
    });
});
