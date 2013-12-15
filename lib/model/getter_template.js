'use strict';
/* Only use this style of comments, not "//" */
method = function get() {
	var m = {{# def.modelAccessPrefix }};
	{{ var modelDataProperty = 'm'; }}
	return m {{~ it.parsedPath :pathNode }}
		&& {{= modelDataProperty += pathNode.property }} {{~}};
}
