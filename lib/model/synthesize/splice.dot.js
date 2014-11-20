'use strict';
/* Only use this style of comments, not "//" */

{{# def.include_defines }}
{{# def.include_create_tree }}
{{# def.include_traverse_tree }}

method = function splice(spliceIndex, spliceHowMany) { /* ,... - extra arguments to splice into array */
    {{# def.initVars:'splice' }}

    var argsLen = arguments.length;
    var addItems = argsLen > 2;

    if (addItems) {
        {{ /* only create model tree if items are inserted in array */ }}

        {{ /* if model is undefined it will be set to an empty array */ }}  
        var value = [];
        {{# def.createTree:'splice' }}

        {{? nextNode }}
            {{
                var currNode = nextNode;
                var currProp = currNode.property;
                var emptyProp = '[]';
            }}

            {{# def.createTreeStep }}
        {{?}}

    } else if (spliceHowMany > 0) {
        {{ /* if items are not inserted, only traverse model tree if items are deleted from array */ }}
        {{? it.parsedPath.length }}
            {{# def.traverseTree }}

            {{
                var currNode = it.parsedPath[count];
                var currProp = currNode.property;       
            }}

            {{ /* extra brace closes 'else' in def.traverseTreeStep */ }}
            {{# def.traverseTreeStep }} }
        {{?}}
    }

    {{ /* splice items */ }}
    if (addItems || (! treeDoesNotExist && m
            && m.length > spliceIndex ) ) {
        var oldLength = m.length = m.length || 0;

        arguments[0] = spliceIndex = normalizeSpliceIndex(spliceIndex, m.length);

        {{ /* clone added arguments to prevent same references in linked models */ }}
        if (addItems)
            for (var i = 2; i < argsLen; i++)
                arguments[i] = cloneTree(arguments[i]);

        {{ /* actual splice call */ }}
        var removed = Array.prototype.splice.apply(m, arguments);

        if (this._options.reactive !== false) {
            {{# def.addMsg }} accessPath, type: 'splice',
                    index: spliceIndex, removed: removed, addedCount: addItems ? argsLen - 2 : 0,
                    newValue: m });

            if (removed && removed.length)
                removed.forEach(function(item, index) {
                    var itemPath = accessPath + '[' + (spliceIndex + index) + ']';
                    {{# def.addMsg }} itemPath, type: 'removed', oldValue: item });

                    if (valueIsTree(item))
                        addMessages(messages, messagesHash, itemPath, item, 'removed', 'oldValue');
                });

            if (addItems)
                for (var i = 2; i < argsLen; i++) {
                    var item = arguments[i];
                    var itemPath = accessPath + '[' + (spliceIndex + i - 2) + ']';
                    {{# def.addMsg }} itemPath, type: 'added', newValue: item });

                    if (valueIsTree(item))
                        addMessages(messages, messagesHash, itemPath, item, 'added', 'newValue');
                }

            {{ /* post all stored messages */ }}
            {{# def.postMessages }}
        }
    }

    return removed || [];
}
