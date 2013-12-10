'use strict';
/* Only use this style of comments, not "//" */

method = function setValue(value) {
	var m = {{# def.modelAccessPrefix }};
	{{  var modelDataProperty = "";
		for (var i = 0, count = it.parsedPath.length - 1; i < count; i++) {
			modelDataProperty += it.parsedPath[i].property;
			var emptyProp = it.parsedPath[i + 1].empty;
	}}
			if (! m{{= modelDataProperty }}) {
				m{{= modelDataProperty }} = {{= emptyProp }};
				{{# def.modelPostMessageCode }}( "{{= modelDataProperty }}",
					{ type: "added", newValue: {{= emptyProp }} } );
			}
	{{  }
		var lastProp = it.parsedPath[count].property;
	}}
	var wasDef = m{{= modelDataProperty }}.hasOwnProperty("{{= lastProp.slice(1) }}");
	{{ modelDataProperty += lastProp; }}
	var old = m{{= modelDataProperty }};
	m{{= modelDataProperty }} = value;
	if (! wasDef)
		{{# def.modelPostMessageCode }}( "{{= modelDataProperty }}",
			{ type: "added", newValue: value } );
	else if (old != value)
		{{# def.modelPostMessageCode }}( "{{= modelDataProperty }}",
			{ type: "changed", oldValue: old, newValue: value} );
}
