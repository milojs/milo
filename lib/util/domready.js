'use strict';


module.exports = domReady;

function domReady(func) { // , arguments
	var self = this
		, args = _.slice(arguments, 1);
	if (isReadyFunc.call(this))
		callFunc();
	else
		this.on(event, callFunc);

	function callFunc() {
		func.apply(self, args);
	}
}