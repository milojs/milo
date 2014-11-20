'use strict';
/* Only use this style of comments, not "//" */

{{# def.include_defines }}
{{# def.include_traverse_tree }}

method = function del() {
    {{# def.initVars:'del' }}

    {{? it.parsedPath.length }}
        {{# def.traverseTree }}

        {{
            var currNode = it.parsedPath[count];
            var currProp = currNode.property;       
        }}

        if (! treeDoesNotExist && m && m.hasOwnProperty && {{# def.wasDefined}}) {
            var old = m{{# def.currProp }};
            delete m{{# def.currProp }};
            {{# def.changeAccessPath }}
            var didDelete = true;
        }
    {{??}}
        if (typeof m != 'undefined') {
            var old = m;
            {{# def.modelAccessPrefix }} = undefined;
            var didDelete = true;
        }
    {{?}}

    if (didDelete && this._options.reactive !== false) {
        {{# def.addMsg }} accessPath, type: 'deleted', oldValue: old });

        addTreeChangesMessages(messages, messagesHash,
            accessPath, old, undefined); /* defined in the function that synthesizes ModelPath setter */

        {{ /* post all stored messages */ }}
        {{# def.postMessages }}
    }
};
