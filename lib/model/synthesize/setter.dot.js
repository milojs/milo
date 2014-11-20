'use strict';
/* Only use this style of comments, not "//" */

{{# def.include_defines }}
{{# def.include_create_tree }}


/**
 * Template that synthesizes setter for Model and for ModelPath
 */
method = function set(value) {
    {{# def.initVars:'set' }}

    {{# def.createTree:'set' }}

    {{
        currNode = nextNode;
        currProp = currNode && currNode.property;
    }}

    {{ /* assign value to the last property */ }}
    {{? currProp }}
        wasDef = {{# def.wasDefined}};
        {{# def.changeAccessPath }}

        var old = m{{# def.currProp }};

        {{ /* clone value to prevent same reference in linked models */ }}
        m{{# def.currProp }} = cloneTree(value);
    {{?}}

    {{ /* add message related to the last property change */ }}
    if (this._options.reactive !== false) {
        if (! wasDef)
            {{# def.addMsg }} accessPath, type: 'added',
                newValue: value });
        else if (old != value)
            {{# def.addMsg }} accessPath, type: 'changed',
                oldValue: old, newValue: value });

        {{ /* add message related to changes in (sub)properties inside removed and assigned value */ }}
        if (! wasDef || old != value)
            addTreeChangesMessages(messages, messagesHash,
                accessPath, old, value); /* defined in the function that synthesizes ModelPath setter */

        {{ /* post all stored messages */ }}
        {{# def.postMessages }}
    }
};
