'use strict';
/* Only use this style of comments, not "//" */

{{## def.addMsg: addChangeMessage(messages, messagesHash, { path: #}}

method = function set(value) {
	var m = {{# def.modelAccessPrefix }};
	var messages = [], messagesHash = {};
	var wasDef = true;
	var old = m;

	if (! m) {
		{{ var emptyProp = it.parsedPath[0] && it.parsedPath[0].empty; }}
		m = {{# def.modelAccessPrefix }} = {{= emptyProp || 'value' }};
		wasDef = false;

		{{? emptyProp }}
			{{# def.addMsg }} "", type: "added",
				  newValue: m });
		{{?}}
	}

	{{  var modelDataProperty = "";
		for (var i = 0, count = it.parsedPath.length - 1; i < count; i++) {
			var currProp = it.parsedPath[i].property;
			var emptyProp = it.parsedPath[i + 1] && it.parsedPath[i + 1].empty;
	}}

			if (! m{{= modelDataProperty }}.hasOwnProperty("{{= getCleanProperty(currProp) }}")) { 

		{{ modelDataProperty += currProp; }} 
				m{{= modelDataProperty }} = {{= emptyProp }};

				{{# def.addMsg }} "{{= modelDataProperty }}", type: "added", 
					  newValue: m{{= modelDataProperty }} });

			} else if (typeof m{{= modelDataProperty }} != 'object') {
				var old = m{{= modelDataProperty }};
				m{{= modelDataProperty }} = {{= emptyProp }};

				{{# def.addMsg }} "{{= modelDataProperty }}", type: "changed", 
					  oldValue: old, newValue: m{{= modelDataProperty }} });
			}
	{{  }
		var lastProp = it.parsedPath[count] && it.parsedPath[count].property;
	}}

	{{? lastProp }}
		wasDef = m{{= modelDataProperty }}.hasOwnProperty("{{= getCleanProperty(lastProp) }}");
		{{ modelDataProperty += lastProp; }}
		var old = m{{= modelDataProperty }};
		m{{= modelDataProperty }} = value;
	{{?}}

	if (! wasDef)
		{{# def.addMsg }} "{{= modelDataProperty }}", type: "added",
			  newValue: value });
	else if (old != value)
		{{# def.addMsg }} "{{= modelDataProperty }}", type: "changed",
			  oldValue: old, newValue: value });

	if (! wasDef || old != value)	
		addTreeChangesMessages(messages, messagesHash,
			"{{= modelDataProperty }}", old, value); /* defined in the function that synthesizes ModelPath setter */

	messages.forEach(function(msg) {
		{{# def.modelPostMessageCode }}(msg.path, msg);
	}, this);


	{{
		function getCleanProperty(prop) {
			if (prop[0] == ".")
				return prop.slice(1);
			else
				return prop.slice(1, prop.length - 1);
		}
	}}
}
