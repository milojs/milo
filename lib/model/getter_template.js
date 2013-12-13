'use strict';
/* Only use this style of comments, not "//" */
method = function get() {
	var m = {{# def.modelAccessPrefix }};
	{{ var modelDataProperty = 'm'; }}
	return m {{
		for (var i = 0, len = it.parsedPath.length; i < len; i++) {
			modelDataProperty += it.parsedPath[i].property;
	}} && {{= modelDataProperty }} {{
		}
	}};
}
