'use strict';
/* Only use this style of comments, not "//" */
method = function get() {
	var m = {{# def.modelAccessPrefix }};
	{{ var modelDataProperty = 'm'; }}
	return {{
		for (var i = 0, count = it.parsedPath.length - 1; i < count; i++) {
			modelDataProperty += it.parsedPath[i].property;
	}} {{= modelDataProperty }} && {{
		}
	}} {{= modelDataProperty }}{{= it.parsedPath[count].property }} ;
}
