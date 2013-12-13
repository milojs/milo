'use strict';
/* Only use this style of comments, not "//" */

method = function set(value) {
	var m = {{# def.modelAccessPrefix }};
	var messages = [], messagesHash = {};
	if (! m) {
		{{ var emptyProp = it.parsedPath[0].empty; }}
		m = {{# def.modelAccessPrefix }} = {{= emptyProp }};

		addChangeMessage(messages, messagesHash,
			{ path: "", type: "added", newValue: m });
	}

	{{  var modelDataProperty = "";
		for (var i = 0, count = it.parsedPath.length - 1; i < count; i++) {
			var currProp = it.parsedPath[i].property;
			var emptyProp = it.parsedPath[i + 1].empty;
	}}

			if (! m{{= modelDataProperty }}.hasOwnProperty("{{= getCleanProperty(currProp) }}")) { 

		{{ modelDataProperty += currProp; }} 
				m{{= modelDataProperty }} = {{= emptyProp }};

				addChangeMessage(messages, messagesHash,
					{ path: "{{= modelDataProperty }}", type: "added", 
					  newValue: m{{= modelDataProperty }} });

			} else if (typeof m{{= modelDataProperty }} != 'object') {
				var old = m{{= modelDataProperty }};
				m{{= modelDataProperty }} = {{= emptyProp }};

				addChangeMessage(messages, messagesHash,
					{ path: "{{= modelDataProperty }}", type: "changed", 
					  oldValue: old, newValue: m{{= modelDataProperty }} });
			}
	{{  }
		var lastProp = it.parsedPath[count].property;
	}}

	var wasDef = m{{= modelDataProperty }}.hasOwnProperty("{{= getCleanProperty(lastProp) }}");
	{{ modelDataProperty += lastProp; }}
	var old = m{{= modelDataProperty }};
	m{{= modelDataProperty }} = value;
	if (! wasDef)
		addChangeMessage(messages, messagesHash,
			{ path: "{{= modelDataProperty }}", type: "added",
			  newValue: value });
	else if (old != value) {
		addChangeMessage(messages, messagesHash,
			{ path: "{{= modelDataProperty }}", type: "changed",
			  oldValue: old, newValue: value });

		addTreeChangesMessages(messages, messagesHash,
			"{{= modelDataProperty }}", old, value); /* defined in the function that synthesizes ModelPath setter */
	}

	postMessages.call(this, messages); /* as above */

	{{
		function getCleanProperty(prop) {
			if (prop[0] == ".")
				return prop.slice(1);
			else
				return prop.slice(1, prop.length - 1);
		}
	}}
}
