'use strict';


module.exports = {
	filterNodeListByType: filterNodeListByType
};

// type 1: html element, type 3: text
function filterNodeListByType(nodeList, type) {
	var filteredNodes = [];
	Array.prototype.forEach.call(nodeList, function (node) {
		if (node.nodeType == type)
			filteredNodes.push(node);
	});
	return filteredNodes;
}
