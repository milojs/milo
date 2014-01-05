'use strict';/* Only use this style of comments, not "//" */

{{# def.include_defines }}
{{# def.include_create_tree }}
{{# def.include_traverse_tree }}

method = function splice(spliceIndex, spliceHowMany) { /* ,... - extra arguments to splice into array */
	{{# def.initVars }}

	if (arguments.length > 2) {
		{{ /* only create model tree if items are inserted in array */ }}

		{{ /* if model is undefined it will be set to an empty array */ }}	
		var value = [];
		{{# def.createTree }}

		{{? nextNode }}
			{{
				var currNode = nextNode;
				var currProp = currNode.property;
				var emptyProp = '[]';
			}}

			{{# def.createTreeStep }}
		{{?}}

	} else if (spliceHowMany > 0) {
		{{ /* if items are not inserted, only traverse model tree if items are deleted from array */ }}
		{{? it.parsedPath.length }}
			{{# def.traverseTree }}

			{{
				var currNode = it.parsedPath[count];
				var currProp = currNode.property;		
			}}

			{{ /* extra brace closes 'else' in def.traverseTreeStep */ }}
			{{# def.traverseTreeStep }} }
		{{?}}
	}

	{{ /* splice items */ }}
	if (arguments.length > 2 || (! treeDoesNotExist && m
		&& m.length > spliceIndex ) ) {
		var removed = Array.prototype.splice.apply(m, arguments);
	}

	return removed || [];
}
