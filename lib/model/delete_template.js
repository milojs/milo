'use strict';
/* Only use this style of comments, not "//" */

{{## def.currProp:{{? currNode.interpolate }}[this._args[ {{= currNode.interpolate }} ]]{{??}}{{= currProp }}{{?}} #}}

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

{{## def.wasDefined: m.hasOwnProperty(
	{{? currNode.interpolate }}
		this._args[ {{= currNode.interpolate }} ]
	{{??}}
		'{{= it.getPathNodeKey(currNode) }}'
	{{?}}
) #}}


method = function del() {
	var m = {{# def.modelAccessPrefix }};
	var accessPath = '';
	var treeDoesNotExist;

	{{ 
		for (var i = 0, count = it.parsedPath.length-1; i < count; i++) { 
			var currNode = it.parsedPath[i];
			var currProp = currNode.property;
	}}
		if (! m || ! m.hasOwnProperty || ! {{# def.wasDefined}} )
			treeDoesNotExist = true;
		else {

			m = m{{# def.currProp }};
			{{# def.changeAccessPath }}

	{{ } /* for loop */

		var currNode = it.parsedPath[count];
		var currProp = currNode.property;

		while (count--) { /* closing braces for else's above */
	}}
		}
	{{ } /* while loop */ }}

	if (! treeDoesNotExist && m && m.hasOwnProperty && {{# def.wasDefined}}) {
		var old = m{{# def.currProp }};
		delete m{{# def.currProp }};
		{{# def.changeAccessPath }}
		var msg = { path: accessPath, type: 'deleted', oldValue: old };
		{{# def.modelPostMessageCode }}(accessPath, msg);

		var messages = [], messagesHash = {};

		addTreeChangesMessages(messages, messagesHash,
			accessPath, old, undefined); /* defined in the function that synthesizes ModelPath setter */

		messages.forEach(function(msg) {
			{{# def.modelPostMessageCode }}(msg.path, msg);
		}, this);
	}
};
