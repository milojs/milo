'use strict';
/* Only use this style of comments, not "//" */

method = function setValue(value) {
	var m = {{# def.modelAccessPrefix }};
	{{  var modelDataProperty = "";
		for (var i = 0, count = it.parsedPath.length - 1; i < count; i++) {
			var currProp = it.parsedPath[i].property;
			var emptyProp = it.parsedPath[i + 1].empty;
	}}
			if (! m{{= modelDataProperty }}.hasOwnProperty("{{= getCleanProperty(currProp) }}")) { 
		{{ modelDataProperty += currProp; }} 
				m{{= modelDataProperty }} = {{= emptyProp }};
				{{# def.modelPostMessageCode }}( "{{= modelDataProperty }}",
					{ type: "added", newValue: {{= emptyProp }} } );
			}
	{{  }
		var lastProp = it.parsedPath[count].property;
	}}
	var wasDef = m{{= modelDataProperty }}.hasOwnProperty("{{= getCleanProperty(lastProp) }}");
	{{ modelDataProperty += lastProp; }}
	var old = m{{= modelDataProperty }};
	m{{= modelDataProperty }} = value;
	if (! wasDef)
		{{# def.modelPostMessageCode }}( "{{= modelDataProperty }}",
			{ type: "added", newValue: value } );
	else if (old != value)
		{{# def.modelPostMessageCode }}( "{{= modelDataProperty }}",
			{ type: "changed", oldValue: old, newValue: value} );

	{{
		function getCleanProperty(prop) {
			if (prop[0] == ".")
				return prop.slice(1);
			else
				return prop.slice(1, prop.length - 1);
		}
	}}
}
