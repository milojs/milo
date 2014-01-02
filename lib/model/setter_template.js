'use strict';
/* Only use this style of comments, not "//" */

{{## def.addMsg: addChangeMessage(messages, messagesHash, { path: #}}

{{## def.currProp:{{? currNode.interpolate }}[this._args[ {{= currNode.interpolate }} ]]{{??}}{{= currProp }}{{?}} #}}

{{## def.wasDefined: m.hasOwnProperty(
	{{? currNode.interpolate }}
		this._args[ {{= currNode.interpolate }} ]
	{{??}}
		'{{= it.getPathNodeKey(currNode) }}'
	{{?}}
) #}}

{{## def.changeAccessPath:
	accessPath += {{? currNode.interpolate }}
		{{? currNode.syntax == 'array' }}
			'[' + this._args[ {{= currNode.interpolate }} ] + ']';
		{{??}}
			'.' + this._args[ {{= currNode.interpolate }} ];
		{{?}}
	{{??}}
		'{{= currProp }}';
	{{?}}
#}}

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
			{{# def.addMsg }} '', type: 'added',
				  newValue: m });
		{{?}}
	}

	var accessPath = '';
	{{  var modelDataProperty = '';
		var nextNode = it.parsedPath[0];
		for (var i = 0, count = it.parsedPath.length - 1; i < count; i++) {
			var currNode = nextNode;
			var currProp = currNode.property;
			nextNode = it.parsedPath[i + 1];
			var emptyProp = nextNode && nextNode.empty;
	}}

			{{# def.changeAccessPath }}

			if (! {{# def.wasDefined}}) { 

				m = m{{# def.currProp }} = {{= emptyProp }};

				{{# def.addMsg }} accessPath, type: 'added', 
					  newValue: m });

			} else if (typeof m{{# def.currProp }} != 'object') {
				var old = m{{# def.currProp }};
				m = m{{# def.currProp }} = {{= emptyProp }};

				{{# def.addMsg }} accessPath, type: 'changed', 
					  oldValue: old, newValue: m });

			} else
				m = m{{# def.currProp }};

	{{  } /* for loop */
		currNode = nextNode;
		currProp = currNode && currNode.property;
	}}

	{{? currProp }}
		wasDef = {{# def.wasDefined}};
		{{# def.changeAccessPath }}

		var old = m{{# def.currProp }};
		m{{# def.currProp }} = value;
	{{?}}

	if (! wasDef)
		{{# def.addMsg }} accessPath, type: 'added',
			  newValue: value });
	else if (old != value)
		{{# def.addMsg }} accessPath, type: 'changed',
			  oldValue: old, newValue: value });

	if (! wasDef || old != value)	
		addTreeChangesMessages(messages, messagesHash,
			accessPath, old, value); /* defined in the function that synthesizes ModelPath setter */

	messages.forEach(function(msg) {
		{{# def.modelPostMessageCode }}(msg.path, msg);
	}, this);
};
