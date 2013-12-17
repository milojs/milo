// <a name="utils-count"></a>
// milo.utils.count
// ----------------

'use strict';

var count = 0;

function componentCount() {
	count++;
	return count;
}

componentCount.get = function() {
	return count;
}

module.exports = componentCount;
